import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { MessageDto, TurnInput } from '@lab-fourt/shared';
import { AI_GATEWAY, retryDelay, type AiGateway, type ClientTurnDone, type TranscriptLine } from '../ai-gateway/ai-gateway.types';
import { AUDIT, AuditService } from '../audit/audit.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import type { SessionUser } from '../common/request';
import { SessionAccessService, type LoadedSession } from './session-access.service';
import { SessionEventsService } from './session-events.service';
import { SessionLifecycleService } from './session-lifecycle.service';
import { toMessageDto } from './session.mapper';

/** Thời gian chờ và số lần thử lại theo docs/srs/07 mục 7 (giá trị đề xuất, chờ thống nhất với đầu mối AI) */
export const AI_LIMITS = { firstTokenMs: 15_000, totalMs: 60_000, retries: 2, backoffMs: 1_000 };

class AiTimeout extends Error {}

const json = (v: unknown) => (v === null || v === undefined ? Prisma.DbNull : (v as Prisma.InputJsonValue));

/**
 * Xử lý một lượt hội thoại (docs/srs/05 mục 4):
 * lưu lời sinh viên ngay, trả về cho trình duyệt, rồi gọi dịch vụ AI ở nền và đẩy từng phần qua SSE.
 */
@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);
  /** Phiên đang chờ thân chủ trả lời. Một tiến trình API nên giữ trong bộ nhớ là đủ. */
  private readonly running = new Map<string, AbortController>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: SessionAccessService,
    private readonly events: SessionEventsService,
    private readonly lifecycle: SessionLifecycleService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
    @Inject(AI_GATEWAY) private readonly ai: AiGateway,
  ) {}

  isBusy(sessionId: string) {
    return this.running.has(sessionId);
  }

  cancel(sessionId: string) {
    this.running.get(sessionId)?.abort();
    this.running.delete(sessionId);
  }

  /**
   * Gửi lượt mới. Gửi lại cùng clientTurnId không tạo lượt trùng: nếu lượt đó chưa có phản hồi
   * và không còn đang xử lý thì gọi lại dịch vụ AI (FR-CONV-08).
   */
  async submit(sessionId: string, user: SessionUser, input: TurnInput): Promise<MessageDto> {
    const session = await this.access.loadOwned(sessionId, user);
    if (session.status !== 'IN_PROGRESS') throw new ConflictException('Phiên này đã kết thúc, không gửi thêm được');
    if (this.lifecycle.isOverdue(session.startedAt, session.caseVersion.maxDurationMin)) {
      this.cancel(sessionId);
      if (await this.lifecycle.end(sessionId, 'TIMEOUT', user.id)) this.events.emit(sessionId, { type: 'ended', reason: 'TIMEOUT' });
      throw new ConflictException('Phiên đã hết thời gian và được lưu lại');
    }

    const existing = session.messages.find((m) => m.clientTurnId === input.clientTurnId);
    if (existing) {
      if (this.isUnanswered(session, existing.seq) && !this.isBusy(sessionId)) this.generate(sessionId);
      return toMessageDto(existing);
    }

    const last = session.messages.at(-1);
    if (this.isBusy(sessionId)) throw new ConflictException('Thân chủ đang trả lời, hãy chờ một chút');
    if (last?.speaker === 'STUDENT') {
      throw new ConflictException('Lượt trước chưa có phản hồi. Hãy bấm Thử lại trước khi gửi lượt mới.');
    }

    const message = await this.prisma.$transaction(async (tx) => {
      // Khóa dòng phiên để hai yêu cầu cùng lúc không lấy trùng số thứ tự lượt
      await tx.$queryRaw`SELECT id FROM practice_sessions WHERE id = ${sessionId}::uuid FOR UPDATE`;
      const dup = await tx.message.findUnique({
        where: { sessionId_clientTurnId: { sessionId, clientTurnId: input.clientTurnId } },
      });
      if (dup) return dup;
      const max = await tx.message.aggregate({ where: { sessionId }, _max: { seq: true } });
      const created = await tx.message.create({
        data: {
          sessionId,
          seq: (max._max.seq ?? 0) + 1,
          speaker: 'STUDENT',
          content: input.content,
          inputMode: input.inputMode,
          sttConfidence: input.inputMode === 'VOICE' ? (input.sttConfidence ?? null) : null,
          sttEdited: input.inputMode === 'VOICE' ? (input.sttEdited ?? false) : false,
          clientTurnId: input.clientTurnId,
        },
      });
      await tx.practiceSession.update({ where: { id: sessionId }, data: { lastActivityAt: new Date() } });
      return created;
    });

    const dto = toMessageDto(message);
    this.events.emit(sessionId, { type: 'message', message: dto });
    this.generate(sessionId);
    return dto;
  }

  private isUnanswered(session: LoadedSession, seq: number) {
    return !session.messages.some((m) => m.seq > seq && m.speaker === 'CLIENT');
  }

  /** Gọi dịch vụ AI ở nền. Lỗi được báo qua SSE, lời sinh viên vẫn được giữ. */
  private generate(sessionId: string) {
    const controller = new AbortController();
    this.running.set(sessionId, controller);
    this.events.emit(sessionId, { type: 'busy', busy: true });
    void this.run(sessionId, controller)
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        this.logger.warn({ sessionId, err: err instanceof Error ? err.message : err }, 'Thân chủ AI không trả lời được');
        this.events.emit(sessionId, {
          type: 'turn-error',
          message:
            err instanceof AiTimeout
              ? 'Thân chủ phản hồi quá lâu. Lời của bạn đã được lưu, hãy bấm Thử lại.'
              : 'Thân chủ chưa trả lời được. Lời của bạn đã được lưu, hãy bấm Thử lại.',
        });
      })
      .finally(() => {
        if (this.running.get(sessionId) === controller) this.running.delete(sessionId);
        this.events.emit(sessionId, { type: 'busy', busy: false });
      });
  }

  private async run(sessionId: string, controller: AbortController) {
    const session = await this.prisma.practiceSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: { caseVersion: true, messages: { orderBy: { seq: 'asc' } } },
    });
    const last = session.messages.at(-1);
    if (!last || last.speaker !== 'STUDENT') return;

    const history: TranscriptLine[] = session.messages
      .filter((m) => m.speaker !== 'SYSTEM' && m.seq < last.seq)
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
      clientState: session.clientState,
      history,
      utterance: { seq: last.seq, content: last.content, inputMode: last.inputMode ?? 'TEXT' },
    };

    const started = Date.now();
    let done: ClientTurnDone | undefined;
    let lastError: unknown;
    let waitMs = 0;
    for (let attempt = 0; attempt <= AI_LIMITS.retries && !done; attempt++) {
      if (attempt > 0) {
        // Thử lại toàn bộ lượt với cùng requestId, xóa phần chữ đã hiện (docs/srs/07 mục 7)
        this.events.emit(sessionId, { type: 'delta', text: '', reset: true });
        await new Promise((r) => setTimeout(r, waitMs));
        if (controller.signal.aborted) return;
      }
      try {
        done = await this.callWithTimeouts(request, sessionId, controller);
      } catch (err) {
        if (controller.signal.aborted) return;
        lastError = err;
        // 400, 401 không thử lại; 429 chờ theo Retry-After
        const delay = retryDelay(err, AI_LIMITS.backoffMs * (attempt + 1));
        if (delay === null) break;
        waitMs = delay;
      }
    }
    if (!done) {
      await this.recordUsage(sessionId, null, Date.now() - started, lastError instanceof AiTimeout ? 'TIMEOUT' : 'ERROR');
      throw lastError;
    }
    if (controller.signal.aborted) return;

    const reply = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM practice_sessions WHERE id = ${sessionId}::uuid FOR UPDATE`;
      const max = await tx.message.aggregate({ where: { sessionId }, _max: { seq: true } });
      const created = await tx.message.create({
        data: { sessionId, seq: (max._max.seq ?? 0) + 1, speaker: 'CLIENT', content: done.text, emotion: done.emotion ?? null },
      });
      await tx.practiceSession.update({
        where: { id: sessionId },
        data: { clientState: json(done.clientState), lastActivityAt: new Date() },
      });
      return created;
    });
    this.events.emit(sessionId, { type: 'message', message: toMessageDto(reply) });
    await this.recordUsage(sessionId, done, Date.now() - started, 'SUCCESS');

    if (done.riskFlag) {
      // FR-SAFE-01: ghi sự kiện an toàn gắn với lượt hội thoại và hiện hướng dẫn cấu hình được
      await this.prisma.safetyEvent.create({ data: { sessionId, messageId: reply.id, level: done.riskFlag.level } });
      await this.audit.record({
        action: AUDIT.SAFETY_FLAGGED,
        entityType: 'practice_session',
        entityId: sessionId,
        after: { level: done.riskFlag.level, messageSeq: reply.seq },
      });
      this.events.emit(sessionId, { type: 'safety', guidance: await this.settings.getString('safety.guidance') });
    }
  }

  private async callWithTimeouts(
    request: Parameters<AiGateway['clientTurn']>[0],
    sessionId: string,
    parent: AbortController,
  ): Promise<ClientTurnDone> {
    const attempt = new AbortController();
    const abort = () => attempt.abort();
    parent.signal.addEventListener('abort', abort);
    let timedOut = false;
    const fail = () => {
      timedOut = true;
      attempt.abort();
    };
    // Chưa có chữ đầu tiên sau firstTokenMs, hoặc cả lượt quá totalMs, thì coi là quá thời gian
    let firstToken: NodeJS.Timeout | undefined = setTimeout(fail, AI_LIMITS.firstTokenMs);
    const total = setTimeout(fail, AI_LIMITS.totalMs);
    try {
      return await this.ai.clientTurn(
        request,
        (text) => {
          if (firstToken) {
            clearTimeout(firstToken);
            firstToken = undefined;
          }
          if (!attempt.signal.aborted) this.events.emit(sessionId, { type: 'delta', text });
        },
        attempt.signal,
      );
    } catch (err) {
      throw timedOut ? new AiTimeout('Quá thời gian chờ dịch vụ AI') : err;
    } finally {
      clearTimeout(firstToken);
      clearTimeout(total);
      parent.signal.removeEventListener('abort', abort);
    }
  }

  private async recordUsage(sessionId: string, done: ClientTurnDone | null, latencyMs: number, outcome: 'SUCCESS' | 'ERROR' | 'TIMEOUT') {
    await this.prisma.aiUsage.create({
      data: {
        sessionId,
        kind: 'CONVERSATION',
        model: done?.usage?.model ?? null,
        inputTokens: done?.usage?.inputTokens ?? null,
        outputTokens: done?.usage?.outputTokens ?? null,
        latencyMs,
        outcome,
      },
    });
  }
}
