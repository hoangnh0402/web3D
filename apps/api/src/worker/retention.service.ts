import { Injectable, Logger } from '@nestjs/common';
import { AUDIT, AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

/** Chuyển các phiên quá hạn từ Đang hiệu lực sang Đã lưu trữ (docs/srs/04 mục 3, quy tắc 2) */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async archiveExpired(now = new Date()) {
    const expired = await this.prisma.practiceSession.findMany({
      where: { recordStatus: 'ACTIVE', retentionUntil: { lt: now } },
      select: { id: true },
    });
    for (const { id } of expired) {
      await this.prisma.practiceSession.update({ where: { id }, data: { recordStatus: 'ARCHIVED' } });
      await this.audit.record({
        action: AUDIT.SESSION_ARCHIVED,
        entityType: 'practice_session',
        entityId: id,
        before: { recordStatus: 'ACTIVE' },
        after: { recordStatus: 'ARCHIVED' },
      });
    }
    this.logger.log({ count: expired.length }, 'Đã lưu trữ các phiên quá hạn');
    return expired.length;
  }
}
