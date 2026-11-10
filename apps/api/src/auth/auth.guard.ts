import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_PASSWORD_CHANGE_PENDING, IS_PUBLIC } from '../common/decorators';
import { SESSION_COOKIE, type AuthedRequest } from '../common/request';
import { SessionService } from './session.service';

export const PASSWORD_CHANGE_REQUIRED = 'Bạn cần đổi mật khẩu trước khi tiếp tục';

/** Mọi route mặc định phải đăng nhập (FR-AUTH-01). Mở ngoại lệ bằng @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    const user = typeof token === 'string' && token ? await this.sessions.resolve(token) : null;
    if (!user) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
    req.user = user;

    // Chưa đổi mật khẩu lần đầu thì chỉ được gọi các route cho phép (FR-AUTH-03)
    if (user.mustChangePassword && !this.reflector.getAllAndOverride<boolean>(ALLOW_PASSWORD_CHANGE_PENDING, targets)) {
      throw new ForbiddenException(PASSWORD_CHANGE_REQUIRED);
    }
    return true;
  }
}
