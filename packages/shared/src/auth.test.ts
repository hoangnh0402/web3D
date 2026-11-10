import { describe, expect, it } from 'vitest';
import { changePasswordSchema, loginSchema } from './auth.js';

describe('loginSchema', () => {
  it('cắt khoảng trắng ở tên đăng nhập', () => {
    expect(loginSchema.parse({ username: '  linh ', password: 'x' }).username).toBe('linh');
  });
  it('báo lỗi khi bỏ trống', () => {
    expect(loginSchema.safeParse({ username: '', password: '' }).success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  const base = { currentPassword: 'Cu12345678', newPassword: 'Moi12345678', confirmPassword: 'Moi12345678' };
  it('chấp nhận mật khẩu hợp lệ', () => {
    expect(changePasswordSchema.safeParse(base).success).toBe(true);
  });
  it('từ chối mật khẩu ngắn hoặc thiếu chữ số', () => {
    expect(changePasswordSchema.safeParse({ ...base, newPassword: 'abc', confirmPassword: 'abc' }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ ...base, newPassword: 'abcdefghij', confirmPassword: 'abcdefghij' }).success).toBe(false);
  });
  it('từ chối khi nhập lại không khớp hoặc trùng mật khẩu cũ', () => {
    expect(changePasswordSchema.safeParse({ ...base, confirmPassword: 'khac123456' }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ ...base, newPassword: base.currentPassword, confirmPassword: base.currentPassword }).success).toBe(false);
  });
});
