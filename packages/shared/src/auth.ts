import { z } from 'zod';
import { roleSchema } from './roles.js';

/** Độ dài tối thiểu của mật khẩu. docs/srs/03 chưa nêu con số nên tạm dùng 8 ký tự. */
export const PASSWORD_MIN_LENGTH = 8;

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Vui lòng nhập tên đăng nhập').max(64),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu').max(256),
  /** Ghi nhớ đăng nhập: phiên giữ theo số ngày ở trang Cấu hình, không thì hết khi đóng trình duyệt */
  remember: z.boolean().optional(),
  /** Trang đăng nhập theo vai trò. Có thì máy chủ từ chối tài khoản khác vai trò. */
  portal: roleSchema.optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Mật khẩu cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự`)
  .max(256)
  .regex(/[A-Za-zÀ-ỹ]/, 'Mật khẩu cần có chữ cái')
  .regex(/\d/, 'Mật khẩu cần có chữ số');

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại không khớp',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** Tên đăng nhập: chữ thường không dấu, số, dấu chấm, gạch dưới, gạch ngang */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Tên đăng nhập cần ít nhất 3 ký tự')
  .max(64)
  .regex(/^[a-z0-9._-]+$/, 'Chỉ dùng chữ thường không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang');

/** Tự đăng ký tài khoản sinh viên, chờ quản trị viên duyệt (D-12) */
export const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên').max(120),
    username: usernameSchema,
    note: z.string().trim().min(1, 'Ghi lớp hoặc mã sinh viên để quản trị viên xác minh').max(200),
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại không khớp',
  });
export type RegisterInput = z.infer<typeof registerSchema>;

/** Gửi yêu cầu đặt lại mật khẩu cho quản trị viên. Hệ thống chạy local nên không dùng email (FR-AUTH-04). */
export const forgotPasswordSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, 'Vui lòng nhập tên đăng nhập').max(64),
  note: z.string().trim().max(200).optional(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** Tùy chọn công khai cho trang đăng nhập */
export interface AuthOptions {
  registrationEnabled: boolean;
  rememberDays: number;
}

/** Người dùng đang đăng nhập, trả về từ GET /api/auth/me */
export const currentUserSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  fullName: z.string(),
  role: roleSchema,
  mustChangePassword: z.boolean(),
});
export type CurrentUser = z.infer<typeof currentUserSchema>;

/** Dạng lỗi chung mà API trả về */
export const apiErrorSchema = z.object({
  statusCode: z.number(),
  message: z.string(),
  fields: z.record(z.string(), z.string()).optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
