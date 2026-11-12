import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { SKILL_CODES, skillCodeSchema, type SkillCode } from '@lab-fourt/shared';
import { AI_GATEWAY, retryDelay, type AiGateway, type AssessmentResult } from '../ai-gateway/ai-gateway.types';
import { AUDIT, AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { verifyEvidence } from './evidence';

/** Theo docs/srs/07 mục 7: chờ tối đa 180 giây, thử 3 lần (giá trị đề xuất, chờ thống nhất) */
export const ASSESS_LIMITS = { timeoutMs: 180_000, attempts: 3, backoffMs: 2_000 };

const levelSchema = z.number().int().min(1).max(4).nullable();
const resultSchema = z.object({
  summary: z.string().default(''),
  scores: z
    .array(
      z.object({
        skill: z.string(),
        level: levelSchema,
        rationale: z.string().default(''),
        evidence: z.array(z.object({ seq: z.number().int(), quote: z.string() })).default([]),
      }),
    )
    .default([]),
  strengths: z.array(z.string()).default([]),
  improvements: z.array(z.object({ point: z.string(), alternativePhrase: z.string().optional() })).default([]),
  reflectionQuestions: z.array(z.string()).default([]),
  practiceGoals: z.array(z.string()).default([]),
  limitationNote: z.string().optional(),
  usage: z.object({ model: z.string().optional() }).optional(),
});

/**
 * Tạo báo cáo sau phiên ở nền (FR-RPT-01 đến FR-RPT-06): gọi dịch vụ đánh giá, kiểm tra cấu trúc,
 * đối chiếu từng dẫn chứng với transcript, loại dẫn chứng không khớp và đánh dấu kỹ năng cần xem lại.
 */
@Injectable()
export class AssessmentService {
  private readonly logger = new Logger(AssessmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(AI_GATEWAY) private readonly ai: AiGateway,
  ) {}

  /** Trả trạng thái cuối cùng, hoặc null nếu báo cáo không ở trạng thái chờ (đã có worker khác nhận) */
  async generate(sessionId: string): Promise<'READY' | 'FAILED' | null> {
    // Nhận việc một cách nguyên tử để hai worker không cùng xử lý một báo cáo
    const claimed = await this.prisma.assessment.updateMany({
      where: { sessionId, status: 'PENDING' },
      data: { status: 'PROCESSING' },
    });
    if (!claimed.count) return null;

    const session = await this.prisma.practiceSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: { caseVersion: true, messages: { orderBy: { seq: 'asc' } }, assessment: true },
    });
    const assessmentId = session.assessment!.id;
    const transcript = session.messages
      .filter((m) => m.speaker !== 'SYSTEM')
      .map((m) => ({
        seq: m.seq,
        speaker: m.speaker as 'STUDENT' | 'CLIENT',
        content: m.content,
        ...(m.inputMode ? { inputMode: m.inputMode } : {}),
        ...(m.sttConfidence !== null ? { sttConfidence: m.sttConfidence } : {}),
      }));
    const request = {
      requestId: randomUUID(),
      sessionId,
      caseProfile: session.caseVersion.profile,
      rubric: { skills: [...SKILL_CODES], levels: [1, 2, 3, 4] },
      transcript,
    };

    const started = Date.now();
    let result: z.infer<typeof resultSchema> | undefined;
    let lastError: unknown;
    for (let attempt = 1; attempt <= ASSESS_LIMITS.attempts && !result; attempt++) {
      try {
        const raw: AssessmentResult = await this.ai.assess(request, AbortSignal.timeout(ASSESS_LIMITS.timeoutMs));
        result = resultSchema.parse(raw);
      } catch (err) {
        lastError = err;
        this.logger.warn({ sessionId, attempt, err: err instanceof Error ? err.message : err }, 'Tạo báo cáo chưa thành công');
        // 400, 401 không thử lại; 429 chờ theo Retry-After (docs/srs/07 mục 7)
        const delay = retryDelay(err, ASSESS_LIMITS.backoffMs * attempt);
        if (delay === null) break;
        if (attempt < ASSESS_LIMITS.attempts) await new Promise((r) => setTimeout(r, delay));
      }
    }

    if (!result) {
      await this.prisma.assessment.update({ where: { id: assessmentId }, data: { status: 'FAILED' } });
      await this.prisma.aiUsage.create({
        data: { sessionId, kind: 'ASSESSMENT', latencyMs: Date.now() - started, outcome: 'ERROR' },
      });
      await this.audit.record({
        action: AUDIT.ASSESSMENT_FAILED,
        entityType: 'practice_session',
        entityId: sessionId,
        after: { reason: lastError instanceof Error ? lastError.message.slice(0, 200) : 'unknown' },
      });
      return 'FAILED';
    }

    const byseq = new Map(session.messages.map((m) => [m.seq, { id: m.id, content: m.content }]));
    const scores = SKILL_CODES.map((skill) => {
      const s = result.scores.find((x) => skillCodeSchema.safeParse(x.skill).success && x.skill === skill);
      const verified = (s?.evidence ?? []).map((e) => verifyEvidence(e, byseq)).filter((e) => e !== null);
      const rejected = (s?.evidence.length ?? 0) - verified.length;
      // Mức khác null phải có ít nhất một dẫn chứng thật; thiếu thì đánh dấu cần xem lại
      const needsReview = rejected > 0 || (s?.level != null && verified.length === 0);
      return { skill: skill as SkillCode, level: s?.level ?? null, rationale: s?.rationale ?? 'Chưa đủ dữ liệu', verified, needsReview };
    });

    await this.prisma.$transaction(async (tx) => {
      // Chạy lại thì thay toàn bộ phần đánh giá của AI cũ
      await tx.assessmentEvidence.deleteMany({ where: { score: { assessmentId } } });
      await tx.assessmentScore.deleteMany({ where: { assessmentId } });
      for (const s of scores) {
        await tx.assessmentScore.create({
          data: {
            assessmentId,
            skillCode: s.skill,
            aiLevel: s.level,
            aiRationale: s.rationale,
            needsReview: s.needsReview,
            evidence: { create: s.verified.map((e) => ({ messageId: e.messageId, quote: e.quote, verified: true })) },
          },
        });
      }
      await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'READY',
          summary: result.summary,
          strengths: result.strengths.slice(0, 3),
          improvements: result.improvements.slice(0, 3),
          reflectionQuestions: result.reflectionQuestions,
          practiceGoals: result.practiceGoals,
          limitationNote: result.limitationNote ?? null,
          aiVersion: result.usage?.model ?? null,
        },
      });
    });
    await this.prisma.aiUsage.create({
      data: { sessionId, kind: 'ASSESSMENT', model: result.usage?.model ?? null, latencyMs: Date.now() - started, outcome: 'SUCCESS' },
    });
    return 'READY';
  }

  /** Quản trị viên chạy lại báo cáo lỗi (FR-RPT-02). Trả false nếu báo cáo không ở trạng thái lỗi. */
  async resetFailed(sessionId: string, actorId: string) {
    const r = await this.prisma.assessment.updateMany({ where: { sessionId, status: 'FAILED' }, data: { status: 'PENDING' } });
    if (r.count) {
      await this.audit.record({ actorId, action: AUDIT.ASSESSMENT_RERUN, entityType: 'practice_session', entityId: sessionId });
    }
    return r.count > 0;
  }
}
