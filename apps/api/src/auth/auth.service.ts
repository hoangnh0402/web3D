import { ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ROLE_LABELS, ROLE_LOGIN } from '@lab-fourt/shared';
import type {
  AuthOptions,
  ChangePasswordInput,
  CurrentUser,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
} from '@lab-fourt/shared';
import { AUDIT, AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import type { SessionUser } from '../common/request';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

const INVALID = 'Tên đăng nhập hoặc mật khẩu không đúng';

/** Lý do không đăng nhập được, chỉ báo khi mật khẩu đã đúng để không lộ tài khoản nào tồn tại */
const BLOCKED: Record<'LOCKED' | 'DISABLED' | 'PENDING', string> = {
  LOCKED: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
  DISABLED: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
  PENDING: 'Tài khoản đang chờ quản trị viên duyệt. Bạn đăng nhập được sau khi được duyệt.',
};

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

    // Chỉ báo tài khoản bị khóa hoặc chờ duyệt khi mật khẩu đúng, để không lộ tài khoản nào tồn tại
    if (user.status !== 'ACTIVE') throw new ForbiddenException(BLOCKED[user.status]);
    // Đăng nhập sai trang vai trò: không tạo phiên, chỉ đường tới đúng trang
    if (input.portal && input.portal !== user.role) {
      throw new HttpException(
        {
          statusCode: 403,
          message: `Đây là tài khoản ${ROLE_LABELS[user.role].toLowerCase()}. Hãy đăng nhập ở trang dành cho ${ROLE_LABELS[user.role].toLowerCase()}.`,
          portal: ROLE_LOGIN[user.role],
        },
        HttpStatus.FORBIDDEN,
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
    });
    // Ghi nhớ đăng nhập thì giữ phiên theo số ngày cấu hình, không thì theo SESSION_TTL_HOURS
    const rememberMs = input.remember ? (await this.settings.getNumber('auth.rememberDays')) * 86_400_000 : undefined;
    const session = await this.sessions.create(user.id, meta, rememberMs);
    await this.audit.record({
      actorId: user.id,
      action: AUDIT.LOGIN_SUCCESS,
      entityType: 'user',
      entityId: user.id,
      ip: meta.ip,
      after: { remember: !!input.remember },
    });
    const current: CurrentUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };
    return { session: { ...session, persistent: !!input.remember }, user: current };
  }

  async options(): Promise<AuthOptions> {
    return {
      registrationEnabled: await this.settings.getBoolean('auth.registrationEnabled'),
      rememberDays: await this.settings.getNumber('auth.rememberDays'),
    };
  }

  /**
   * Sinh viên tự đăng ký (D-12). Tài khoản ở trạng thái Chờ duyệt, chưa đăng nhập được
   * cho đến khi quản trị viên duyệt. Người đăng ký tự đặt mật khẩu nên không phải đổi lần đầu.
   */
  async register(input: RegisterInput, ip: string | null) {
    if (!(await this.settings.getBoolean('auth.registrationEnabled'))) {
      throw new ForbiddenException('Hệ thống đang tạm dừng nhận đăng ký. Vui lòng liên hệ quản trị viên.');
    }
    if (await this.prisma.user.findUnique({ where: { username: input.username }, select: { id: true } })) {
      throw new HttpException(
        { statusCode: 409, message: 'Dữ liệu không hợp lệ', fields: { username: 'Tên đăng nhập đã được dùng, hãy chọn tên khác' } },
        HttpStatus.CONFLICT,
      );
    }
    const user = await this.prisma.user.create({
      data: {
        username: input.username,
        fullName: input.fullName,
        role: 'STUDENT',
        status: 'PENDING',
        passwordHash: await this.passwords.hash(input.password),
        mustChangePassword: false,
        selfRegistered: true,
        registrationNote: input.note,
      },
    });
    await this.audit.record({ actorId: user.id, action: AUDIT.USER_REGISTERED, entityType: 'user', entityId: user.id, ip });
    return { status: 'PENDING' as const };
  }

  /**
   * Gửi yêu cầu đặt lại mật khẩu cho quản trị viên (FR-AUTH-04, không có email).
   * Luôn trả cùng một kết quả để không lộ tên đăng nhập nào tồn tại.
   */
  async requestPasswordReset(input: ForgotPasswordInput, ip: string | null) {
    const user = await this.prisma.user.findUnique({ where: { username: input.username } });
    if (user && (user.status === 'ACTIVE' || user.status === 'LOCKED')) {
      const open = await this.prisma.passwordRequest.findFirst({ where: { userId: user.id, status: 'OPEN' }, select: { id: true } });
      if (!open) {
        const req = await this.prisma.passwordRequest.create({ data: { userId: user.id, note: input.note || null, ip } });
        await this.audit.record({ action: AUDIT.PASSWORD_REQUEST_CREATED, entityType: 'password_request', entityId: req.id, ip });
      }
    }
    return { accepted: true as const };
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
