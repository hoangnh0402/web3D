import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Tên sự kiện ghi nhật ký kiểm toán */
export const AUDIT = {
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILED: 'auth.login.failed',
  LOGIN_LOCKED: 'auth.login.locked',
  LOGOUT: 'auth.logout',
  PASSWORD_CHANGED: 'auth.password.changed',
  SESSION_ARCHIVED: 'data.session.archived',
} as const;

export interface AuditEntry {
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  ip?: string | null;
}

/** Nhật ký kiểm toán chỉ ghi thêm (NFR-SEC-10). Không được chứa mật khẩu, token hay nội dung hội thoại. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry) {
    try {
      await this.prisma.auditLog.create({ data: { ...entry, ip: entry.ip ?? null } });
    } catch (err) {
      // Lỗi ghi nhật ký không được làm hỏng thao tác chính, nhưng phải để lại dấu vết
      this.logger.error({ err, action: entry.action }, 'Không ghi được nhật ký kiểm toán');
    }
  }
}
