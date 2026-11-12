import { z } from 'zod';
import { roleSchema, type Role } from './roles.js';

export type UserStatus = 'ACTIVE' | 'LOCKED' | 'DISABLED';
export type RecordStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';

const username = z
  .string()
  .trim()
  .min(3, 'Tên đăng nhập cần ít nhất 3 ký tự')
  .max(64)
  .regex(/^[a-z0-9._-]+$/, 'Chỉ dùng chữ thường không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang');

// ---------- Tài khoản (FR-USR-01, FR-USR-02, FR-AUTH-04) ----------

export const createUserSchema = z.object({
  username,
  fullName: z.string().trim().min(1, 'Nhập họ tên').max(120),
  role: roleSchema,
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(1, 'Nhập họ tên').max(120).optional(),
  role: roleSchema.optional(),
  status: z.enum(['ACTIVE', 'LOCKED', 'DISABLED']).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/** Nhập CSV: mỗi dòng "tên đăng nhập,họ tên,vai trò". Vai trò ghi STUDENT, LECTURER hoặc ADMIN. */
export const importUsersSchema = z.object({ csv: z.string().min(1, 'Tệp trống').max(200_000) });

export interface AdminUser {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  status: UserStatus;
  mustChangePassword: boolean;
  /** Đang bị khóa tạm do nhập sai nhiều lần */
  temporarilyLocked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

/** Mật khẩu tạm chỉ trả về một lần ngay khi tạo hoặc đặt lại, không lưu dạng đọc được */
export interface IssuedPassword {
  userId: string;
  username: string;
  temporaryPassword: string;
}

export interface ImportResult {
  created: IssuedPassword[];
  errors: { line: number; message: string }[];
}

// ---------- Lớp (FR-USR-03, FR-USR-04) ----------

export const classSchema = z.object({
  name: z.string().trim().min(1, 'Nhập tên lớp').max(120),
  term: z.string().trim().max(120).default(''),
});
export type ClassInput = z.input<typeof classSchema>;

export const classStatusSchema = z.object({ status: z.enum(['ACTIVE', 'ARCHIVED']) });
export const classMembersSchema = z.object({
  lecturerIds: z.array(z.string().uuid()).optional(),
  studentUsernames: z.array(username).optional(),
});

export interface AdminClass {
  id: string;
  name: string;
  term: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  lecturers: { userId: string; fullName: string }[];
  students: { userId: string; fullName: string; username: string }[];
}

// ---------- Dữ liệu phiên (FR-DATA-04) ----------

/** Khôi phục bắt buộc đặt hạn lưu mới, nếu không tác vụ định kỳ sẽ lưu trữ lại ngay (docs/srs/04 mục 3, quy tắc 3) */
export const recordStatusSchema = z
  .object({
    recordStatus: z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']),
    retentionUntil: z.string().datetime({ offset: true }).optional(),
  })
  .refine((v) => v.recordStatus !== 'ACTIVE' || (v.retentionUntil && new Date(v.retentionUntil) > new Date()), {
    path: ['retentionUntil'],
    message: 'Khôi phục cần đặt hạn lưu mới ở tương lai',
  });
export type RecordStatusInput = z.infer<typeof recordStatusSchema>;

export interface AdminSessionRow {
  id: string;
  studentName: string;
  username: string;
  caseTitle: string;
  status: 'IN_PROGRESS' | 'ENDED' | 'ABANDONED';
  recordStatus: RecordStatus;
  assessmentStatus: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | null;
  submitted: boolean;
  startedAt: string;
  retentionUntil: string | null;
}

// ---------- Cấu hình (FR-ADM-02, FR-ADM-06, FR-DATA-05, FR-SAFE-02) ----------

export const settingsSchema = z.object({
  'auth.maxFailedLogins': z.number().int().min(3).max(20),
  'auth.lockMinutes': z.number().int().min(1).max(1440),
  'retention.days': z.number().int().min(1).max(365),
  'session.defaultDurationMin': z.number().int().min(5).max(90),
  'session.idleTimeoutMin': z.number().int().min(5).max(120),
  'safety.guidance': z.string().trim().min(20, 'Hướng dẫn an toàn quá ngắn').max(4000),
});
export type SystemSettings = z.infer<typeof settingsSchema>;
export const updateSettingsSchema = settingsSchema.partial();

export interface AdminSettings {
  values: SystemSettings;
  /** Chỉ cho biết đã cấu hình hay chưa. Địa chỉ và khóa bí mật không trả về trình duyệt (FR-ADM-02). */
  services: { aiProvider: 'mock' | 'http'; aiConfigured: boolean };
}

// ---------- Trạng thái hệ thống (FR-ADM-03, FR-ADM-04) ----------

export interface SystemStatus {
  api: 'ok';
  database: 'ok' | 'error';
  ai: 'ok' | 'error';
  stt: 'ok' | 'error';
  aiProvider: 'mock' | 'http';
  assessments: { pending: number; failed: number };
  openSafetyEvents: number;
  lastBackupAt: string | null;
  usage: { day: string; kind: 'CONVERSATION' | 'ASSESSMENT' | 'STT'; calls: number; errors: number; avgLatencyMs: number; tokens: number }[];
}

// ---------- Nhật ký (FR-ADM-05) ----------

export interface AuditRow {
  id: string;
  createdAt: string;
  actorName: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Tên tiếng Việt của các sự kiện kiểm toán */
export const AUDIT_LABELS: Record<string, string> = {
  'auth.login.success': 'Đăng nhập',
  'auth.login.failed': 'Đăng nhập sai',
  'auth.login.locked': 'Khóa tạm do nhập sai',
  'auth.logout': 'Đăng xuất',
  'auth.password.changed': 'Đổi mật khẩu',
  'session.started': 'Bắt đầu phiên',
  'session.ended': 'Kết thúc phiên',
  'session.abandoned': 'Phiên bỏ dở',
  'safety.flagged': 'Tín hiệu an toàn',
  'access.denied': 'Truy cập bị từ chối',
  'assessment.failed': 'Tạo báo cáo lỗi',
  'assessment.rerun': 'Chạy lại báo cáo',
  'reflection.submitted': 'Hoàn thành phản tư',
  'submission.created': 'Nộp bài',
  'data.session.deleted': 'Xóa phiên',
  'data.session.archived': 'Lưu trữ phiên',
  'data.session.status': 'Đổi trạng thái phiên',
  'assignment.created': 'Giao bài',
  'assignment.status': 'Đổi trạng thái bài',
  'review.saved': 'Nhận xét bài nộp',
  'class.member.added': 'Thêm vào lớp',
  'class.member.removed': 'Bớt khỏi lớp',
  'class.saved': 'Lưu lớp',
  'case.saved': 'Lưu ca',
  'case.published': 'Xuất bản ca',
  'case.status': 'Đổi trạng thái ca',
  'user.created': 'Tạo tài khoản',
  'user.updated': 'Sửa tài khoản',
  'user.password.reset': 'Đặt lại mật khẩu',
  'settings.updated': 'Đổi cấu hình',
  'report.exported': 'Xuất báo cáo',
};
