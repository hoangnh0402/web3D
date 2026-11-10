import { HttpException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import type { PasswordService } from './password.service';
import type { SessionService } from './session.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { SettingsService } from '../settings/settings.service';
import type { AuditService } from '../audit/audit.service';

/** Kiểm tra quy tắc khóa tạm tài khoản (FR-AUTH-06) mà không cần CSDL */
describe('AuthService.login khóa tài khoản', () => {
  let user: Record<string, unknown>;
  let service: AuthService;
  const update = vi.fn(async ({ data }: { data: Record<string, unknown> }) => Object.assign(user, data));
  const meta = { ip: '127.0.0.1' };

  beforeEach(() => {
    user = {
      id: 'u1',
      username: 'sv',
      fullName: 'Sinh viên',
      role: 'STUDENT',
      status: 'ACTIVE',
      mustChangePassword: false,
      passwordHash: 'hash',
      failedLoginCount: 0,
      lockedUntil: null,
    };
    update.mockClear();
    const prisma = { user: { findUnique: vi.fn(async () => user), update } } as unknown as PrismaService;
    const passwords = {
      verify: vi.fn(async (_h: string, p: string) => p === 'dung'),
      burn: vi.fn(),
    } as unknown as PasswordService;
    const sessions = { create: vi.fn(async () => ({ token: 't', expiresAt: new Date() })) } as unknown as SessionService;
    const settings = {
      getNumber: vi.fn(async (k: string) => (k === 'auth.maxFailedLogins' ? 3 : 15)),
    } as unknown as SettingsService;
    const audit = { record: vi.fn() } as unknown as AuditService;
    service = new AuthService(prisma, passwords, sessions, settings, audit);
  });

  it('đếm số lần sai và khóa tạm khi đạt ngưỡng', async () => {
    await expect(service.login({ username: 'sv', password: 'sai' }, meta)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.login({ username: 'sv', password: 'sai' }, meta)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(user.failedLoginCount).toBe(2);
    const third = await service.login({ username: 'sv', password: 'sai' }, meta).catch((e: unknown) => e);
    expect(third).toBeInstanceOf(HttpException);
    expect((third as HttpException).getStatus()).toBe(423);
    expect(user.lockedUntil).toBeInstanceOf(Date);
  });

  it('từ chối cả mật khẩu đúng khi đang khóa tạm', async () => {
    user.lockedUntil = new Date(Date.now() + 60_000);
    const err = await service.login({ username: 'sv', password: 'dung' }, meta).catch((e: unknown) => e);
    expect((err as HttpException).getStatus()).toBe(423);
  });

  it('đăng nhập đúng thì đặt lại bộ đếm', async () => {
    user.failedLoginCount = 2;
    const res = await service.login({ username: 'sv', password: 'dung' }, meta);
    expect(res.user.username).toBe('sv');
    expect(user.failedLoginCount).toBe(0);
    expect(user.lockedUntil).toBeNull();
  });

  it('tài khoản bị khóa bởi quản trị viên thì không đăng nhập được', async () => {
    user.status = 'LOCKED';
    await expect(service.login({ username: 'sv', password: 'dung' }, meta)).rejects.toMatchObject({ status: 403 });
  });
});
