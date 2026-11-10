import { Inject, Injectable, Optional } from '@nestjs/common';
import { AUDIT, AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { ASSESSMENT_QUEUE, type AssessmentQueue } from '../queue/queues';

export type EndReason = 'USER' | 'TIMEOUT';

/** Hết giờ thì cho thêm ít giây để lượt đang gửi kịp lưu */
const GRACE_MS = 5_000;

export const deadlineOf = (startedAt: Date, maxDurationMin: number) => new Date(startedAt.getTime() + maxDurationMin * 60_000);

/**
 * Chuyển trạng thái phiên (docs/srs/04 mục 4.1), dùng chung cho API và worker.
 * Khi phiên kết thúc hoặc bị bỏ dở, đặt thời hạn lưu (docs/srs/04 mục 3, quy tắc 1).
 */
@Injectable()
export class SessionLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
    // API gửi việc tạo báo cáo ngay. Worker không cung cấp, vì lần quét mỗi phút đã xếp các báo cáo còn chờ.
    @Optional() @Inject(ASSESSMENT_QUEUE) private readonly queue?: AssessmentQueue,
  ) {}

  private async retentionUntil(from: Date) {
    const days = await this.settings.getNumber('retention.days');
    return new Date(from.getTime() + days * 86_400_000);
  }

  /** Kết thúc phiên đang chạy hoặc bị bỏ dở. Trả false nếu phiên đã kết thúc từ trước. */
  async end(sessionId: string, reason: EndReason, actorId: string | null) {
    const now = new Date();
    const retentionUntil = await this.retentionUntil(now);
    const updated = await this.prisma.practiceSession.updateMany({
      where: { id: sessionId, status: { in: ['IN_PROGRESS', 'ABANDONED'] } },
      data: { status: 'ENDED', endedAt: now, retentionUntil },
    });
    if (!updated.count) return false;
    // Báo cáo được tạo ở nền bởi worker (FR-RPT-01)
    await this.prisma.assessment.upsert({ where: { sessionId }, update: {}, create: { sessionId, status: 'PENDING' } });
    await this.queue?.enqueue(sessionId);
    await this.audit.record({
      actorId,
      action: AUDIT.SESSION_ENDED,
      entityType: 'practice_session',
      entityId: sessionId,
      after: { status: 'ENDED', reason },
    });
    return true;
  }

  /** Phiên quá giờ thì tự kết thúc (FR-SES-07) */
  isOverdue(startedAt: Date, maxDurationMin: number, now = new Date()) {
    return now.getTime() > deadlineOf(startedAt, maxDurationMin).getTime() + GRACE_MS;
  }

  /** Chuyển các phiên quá giờ sang Đã kết thúc và các phiên không hoạt động sang Bỏ dở (FR-SES-07, FR-SES-08) */
  async sweep(now = new Date()) {
    const running = await this.prisma.practiceSession.findMany({
      where: { status: 'IN_PROGRESS' },
      select: { id: true, startedAt: true, lastActivityAt: true, caseVersion: { select: { maxDurationMin: true } } },
    });
    const idleMin = await this.settings.getNumber('session.idleTimeoutMin');
    let ended = 0;
    let abandoned = 0;
    for (const s of running) {
      if (this.isOverdue(s.startedAt, s.caseVersion.maxDurationMin, now)) {
        if (await this.end(s.id, 'TIMEOUT', null)) ended++;
      } else if (now.getTime() - s.lastActivityAt.getTime() > idleMin * 60_000) {
        const r = await this.prisma.practiceSession.updateMany({
          where: { id: s.id, status: 'IN_PROGRESS' },
          data: { status: 'ABANDONED', retentionUntil: await this.retentionUntil(now) },
        });
        if (r.count) {
          abandoned++;
          await this.audit.record({
            action: AUDIT.SESSION_ABANDONED,
            entityType: 'practice_session',
            entityId: s.id,
            after: { status: 'ABANDONED' },
          });
        }
      }
    }
    return { ended, abandoned };
  }
}
