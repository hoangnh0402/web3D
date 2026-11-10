import { z } from 'zod';

/** Ba vai trò của hệ thống (docs/srs/02 mục 14) */
export const ROLES = ['STUDENT', 'LECTURER', 'ADMIN'] as const;
export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;

export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: 'Sinh viên',
  LECTURER: 'Giảng viên',
  ADMIN: 'Quản trị viên',
};

/** Trang chủ mặc định của từng vai trò */
export const ROLE_HOME: Record<Role, string> = {
  STUDENT: '/student',
  LECTURER: '/lecturer',
  ADMIN: '/admin',
};
