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
  SESSION_STARTED: 'session.started',
  SESSION_ENDED: 'session.ended',
  SESSION_ABANDONED: 'session.abandoned',
  SAFETY_FLAGGED: 'safety.flagged',
  /** Truy cập bản ghi không thuộc quyền (docs/srs/08 AT-09) */
  ACCESS_DENIED: 'access.denied',
  ASSESSMENT_FAILED: 'assessment.failed',
  ASSESSMENT_RERUN: 'assessment.rerun',
  REFLECTION_SUBMITTED: 'reflection.submitted',
  SUBMISSION_CREATED: 'submission.created',
  SESSION_DELETED: 'data.session.deleted',
  ASSIGNMENT_CREATED: 'assignment.created',
  ASSIGNMENT_STATUS: 'assignment.status',
  REVIEW_SAVED: 'review.saved',
  CASE_SAVED: 'case.saved',
  CASE_PUBLISHED: 'case.published',
  CASE_STATUS: 'case.status',
  CLASS_SAVED: 'class.saved',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_PASSWORD_RESET: 'user.password.reset',
  /** Tự đăng ký và duyệt đăng ký (D-12) */
  USER_REGISTERED: 'user.registered',
  USER_APPROVED: 'user.approved',
  USER_REJECTED: 'user.rejected',
  /** Yêu cầu quên mật khẩu gửi quản trị viên (FR-AUTH-04) */
  PASSWORD_REQUEST_CREATED: 'password.request.created',
  PASSWORD_REQUEST_DISMISSED: 'password.request.dismissed',
  SESSION_STATUS: 'data.session.status',
  SETTINGS_UPDATED: 'settings.updated',
  /** Xuất báo cáo tổng hợp (FR-LEC-06) */
  REPORT_EXPORTED: 'report.exported',
  CLASS_MEMBER_ADDED: 'class.member.added',
  CLASS_MEMBER_REMOVED: 'class.member.removed',
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
