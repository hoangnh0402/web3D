import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
} from '@lab-fourt/shared';
import { ENV, type Env } from '../config/env';
import { AllowPendingPasswordChange, CurrentUser, Public } from '../common/decorators';
import { clientIp, SESSION_COOKIE, type SessionUser } from '../common/request';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService, toCurrentUser } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private cookie(expires?: Date) {
    return { httpOnly: true, secure: this.env.COOKIE_SECURE, sameSite: 'lax' as const, path: '/', expires };
  }

  /** Giới hạn 10 lần mỗi phút cho mỗi địa chỉ IP (NFR-SEC-05) */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { session, user } = await this.auth.login(body, { ip: clientIp(req), userAgent: req.get('user-agent') });
    // Không ghi nhớ thì dùng cookie phiên: đóng trình duyệt là mất đăng nhập
    res.cookie(SESSION_COOKIE, session.token, this.cookie(session.persistent ? session.expiresAt : undefined));
    return user;
  }

  /** Trang đăng nhập cần biết có mở đăng ký không và số ngày ghi nhớ */
  @Public()
  @Get('options')
  options() {
    return this.auth.options();
  }

  /** Tự đăng ký, chờ duyệt (D-12). Giới hạn 5 lần mỗi 10 phút cho mỗi địa chỉ IP. */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @Post('register')
  @HttpCode(201)
  register(@Body(new ZodValidationPipe(registerSchema)) body: RegisterInput, @Req() req: Request) {
    return this.auth.register(body, clientIp(req));
  }

  /** Quên mật khẩu: gửi yêu cầu cho quản trị viên. Giới hạn 5 lần mỗi 10 phút cho mỗi địa chỉ IP. */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @Post('forgot-password')
  @HttpCode(202)
  forgotPassword(@Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordInput, @Req() req: Request) {
    return this.auth.requestPasswordReset(body, clientIp(req));
  }

  @AllowPendingPasswordChange()
  @Post('logout')
  @HttpCode(204)
  async logout(@CurrentUser() user: SessionUser, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(user, clientIp(req));
    res.clearCookie(SESSION_COOKIE, this.cookie());
  }

  @AllowPendingPasswordChange()
  @Get('me')
  me(@CurrentUser() user: SessionUser) {
    return toCurrentUser(user);
  }

  @AllowPendingPasswordChange()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('change-password')
  @HttpCode(200)
  changePassword(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput,
    @Req() req: Request,
  ) {
    return this.auth.changePassword(user, body, clientIp(req));
  }
}
