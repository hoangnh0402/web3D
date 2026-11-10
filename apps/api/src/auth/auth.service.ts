import { ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ChangePasswordInput, CurrentUser, LoginInput } from '@lab-fourt/shared';
import { AUDIT, AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import type { SessionUser } from '../common/request';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

const INVALID = 'Tên đăng nhập hoặc mật khẩu không đúng';

export const toCurrentUser = (u: SessionUser): CurrentUser => ({
  id: u.id,
  username: u.username,
  fullName: u.fullName,
  role: u.role,
  mustChangePassword: u.mustChangePassword,
});

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  async login(input: LoginInput, meta: { ip: string | null; userAgent?: string }) {
    const user = await this.prisma.user.findUnique({ where: { username: input.username } });
    if (!user) {
      await this.passwords.burn(input.password);
      await this.audit.record({ action: AUDIT.LOGIN_FAILED, after: { username: input.username }, ip: meta.ip });
      throw new UnauthorizedException(INVALID);
    }

    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60_000);
      throw new HttpException(
        `Tài khoản đang tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau ${minutes} phút.`,
        HttpStatus.LOCKED,
      );
    }

    const ok = await this.passwords.verify(user.passwordHash, input.password);
    if (!ok) {
      const max = await this.settings.getNumber('auth.maxFailedLogins');
      const failed = user.failedLoginCount + 1;
      if (failed >= max) {
        const lockMinutes = await this.settings.getNumber('auth.lockMinutes');
        await this.prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: new Date(now.getTime() + lockMinutes * 60_000) },
        });
        await this.audit.record({ actorId: user.id, action: AUDIT.LOGIN_LOCKED, entityType: 'user', entityId: user.id, ip: meta.ip });
        throw new HttpException(
          `Bạn đã nhập sai ${max} lần liên tiếp. Tài khoản tạm khóa ${lockMinutes} phút.`,
          HttpStatus.LOCKED,
        );
      }
      await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: failed } });
      await this.audit.record({ actorId: user.id, action: AUDIT.LOGIN_FAILED, entityType: 'user', entityId: user.id, ip: meta.ip });
      throw new UnauthorizedException(INVALID);
    }

    // Chỉ báo tài khoản bị khóa khi mật khẩu đúng, để không lộ tài khoản nào tồn tại
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
    });
    const session = await this.sessions.create(user.id, meta);
    await this.audit.record({ actorId: user.id, action: AUDIT.LOGIN_SUCCESS, entityType: 'user', entityId: user.id, ip: meta.ip });
    const current: CurrentUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };
    return { session, user: current };
  }

  async logout(user: SessionUser, ip: string | null) {
    await this.sessions.revoke(user.sessionId);
    await this.audit.record({ actorId: user.id, action: AUDIT.LOGOUT, entityType: 'user', entityId: user.id, ip });
  }

  async changePassword(user: SessionUser, input: ChangePasswordInput, ip: string | null) {
    const row = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await this.passwords.verify(row.passwordHash, input.currentPassword))) {
      throw new HttpException(
        { statusCode: 400, message: 'Dữ liệu không hợp lệ', fields: { currentPassword: 'Mật khẩu hiện tại không đúng' } },
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await this.passwords.hash(input.newPassword), mustChangePassword: false },
    });
    // Đổi mật khẩu thì đăng xuất mọi thiết bị khác
    await this.sessions.revokeAllForUser(user.id, user.sessionId);
    await this.audit.record({ actorId: user.id, action: AUDIT.PASSWORD_CHANGED, entityType: 'user', entityId: user.id, ip });
    return toCurrentUser({ ...user, mustChangePassword: false });
  }
}
