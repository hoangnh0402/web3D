import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  DEFAULT_REFLECTION_QUESTIONS,
  type ReflectionDto,
  type ReflectionInput,
  type ReportDto,
  type SkillCode,
} from '@lab-fourt/shared';
import { AUDIT, AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { readProfile } from '../cases/case-profile';
import type { SessionUser } from '../common/request';
import { LOW_CONFIDENCE } from '../sessions/session.mapper';
import { SessionAccessService, type LoadedSession } from '../sessions/session-access.service';
import { ASSESSMENT_QUEUE, type AssessmentQueue } from '../queue/queues';
import { AssessmentService } from './assessment.service';

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: SessionAccessService,
    private readonly assessments: AssessmentService,
    private readonly audit: AuditService,
    @Inject(ASSESSMENT_QUEUE) private readonly queue: AssessmentQueue,
  ) {}

  /** Báo cáo của chính sinh viên (SCR-07). Phiên chưa kết thúc thì chưa có báo cáo. */
  async report(sessionId: string, user: SessionUser): Promise<ReportDto> {
    const s = await this.access.loadOwned(sessionId, user);
    if (s.status !== 'ENDED') throw new ConflictException('Phiên chưa kết thúc nên chưa có báo cáo');
    return this.build(s);
  }

  /** Dựng báo cáo từ phiên đã tải và đã kiểm tra quyền. Giảng viên dùng lại khi xem bài nộp. */
  async build(s: LoadedSession): Promise<ReportDto> {
    const sessionId = s.id;
    const a = await this.prisma.assessment.findUnique({
      where: { sessionId },
      include: { scores: { include: { evidence: { include: { message: { select: { seq: true } } } } } } },
    });
    const profile = readProfile(s.caseVersion.profile);
    const ready = a?.status === 'READY';
    const order = (code: SkillCode) => ['ACTIVE_LISTENING', 'OPEN_QUESTIONS', 'EMPATHY', 'SUMMARIZING', 'AUTONOMY', 'ETHICS_SAFETY'].indexOf(code);
    return {
      sessionId,
      status: a?.status ?? 'PENDING',
      caseTitle: s.caseVersion.case.title,
      clientName: profile.clientName,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt?.toISOString() ?? null,
      studentTurns: s.messages.filter((m) => m.speaker === 'STUDENT').length,
      hasLowConfidence: s.messages.some((m) => m.sttConfidence !== null && m.sttConfidence < LOW_CONFIDENCE),
      summary: ready ? a.summary : null,
      scores: ready
        ? [...a.scores]
            .sort((x, y) => order(x.skillCode) - order(y.skillCode))
            .map((sc) => ({
              skill: sc.skillCode,
              level: sc.aiLevel,
              rationale: sc.aiRationale,
              evidence: sc.evidence.filter((e) => e.verified).map((e) => ({ seq: e.message?.seq ?? null, quote: e.quote })),
              needsReview: sc.needsReview,
              lecturerLevel: sc.lecturerLevel,
              lecturerNote: sc.lecturerNote,
            }))
        : [],
      strengths: ready ? strings(a.strengths) : [],
      improvements: ready && Array.isArray(a.improvements) ? (a.improvements as ReportDto['improvements']) : [],
      reflectionQuestions: ready ? strings(a.reflectionQuestions) : [],
      practiceGoals: ready ? strings(a.practiceGoals) : [],
      limitationNote: ready ? a.limitationNote : null,
      lecturerComment: a?.lecturerComment ?? null,
    };
  }

  private async questionsFor(sessionId: string) {
    const a = await this.prisma.assessment.findUnique({ where: { sessionId }, select: { status: true, reflectionQuestions: true } });
    const fromReport = a?.status === 'READY' ? strings(a.reflectionQuestions) : [];
    return fromReport.length ? fromReport.slice(0, 5) : DEFAULT_REFLECTION_QUESTIONS;
  }

  async getReflection(sessionId: string, user: SessionUser): Promise<ReflectionDto> {
    const s = await this.access.loadOwned(sessionId, user);
    if (s.status !== 'ENDED') throw new ConflictException('Phiên chưa kết thúc');
    return this.reflectionOf(sessionId);
  }

  async reflectionOf(sessionId: string): Promise<ReflectionDto> {
    const r = await this.prisma.reflection.findUnique({ where: { sessionId } });
    return {
      questions: await this.questionsFor(sessionId),
      answers: strings(r?.answers),
      nextGoal: r?.nextGoal ?? '',
      submittedAt: r?.submittedAt?.toISOString() ?? null,
    };
  }

  /** Lưu nháp hoặc hoàn thành phản tư (FR-REF-01). Nộp bài được giao làm ở nhiệm vụ giao bài. */
  async saveReflection(sessionId: string, user: SessionUser, input: ReflectionInput & { submit: boolean; nextGoal: string }) {
    const s = await this.access.loadOwned(sessionId, user);
    if (s.status !== 'ENDED') throw new ConflictException('Phiên chưa kết thúc');
    const questions = await this.questionsFor(sessionId);
    const answers = questions.map((_, i) => input.answers[i] ?? '');
    const existing = await this.prisma.reflection.findUnique({ where: { sessionId } });
    const submittedAt = existing?.submittedAt ?? (input.submit ? new Date() : null);
    await this.prisma.reflection.upsert({
      where: { sessionId },
      update: { answers, nextGoal: input.nextGoal, submittedAt },
      create: { sessionId, answers, nextGoal: input.nextGoal, submittedAt },
    });
    if (input.submit && !existing?.submittedAt) {
      await this.audit.record({ actorId: user.id, action: AUDIT.REFLECTION_SUBMITTED, entityType: 'practice_session', entityId: sessionId });
    }
    return this.getReflection(sessionId, user);
  }

  /** FR-RPT-02: quản trị viên chạy lại báo cáo bị lỗi */
  async rerun(sessionId: string, actorId: string) {
    const exists = await this.prisma.assessment.findUnique({ where: { sessionId }, select: { status: true } });
    if (!exists) throw new NotFoundException('Không tìm thấy báo cáo của phiên này');
    if (!(await this.assessments.resetFailed(sessionId, actorId))) {
      throw new ConflictException('Chỉ chạy lại được báo cáo đang ở trạng thái lỗi');
    }
    await this.queue.enqueue(sessionId);
    return { status: 'PENDING' as const };
  }
}
