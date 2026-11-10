import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

export const CSRF_HEADER = 'x-requested-with';
export const CSRF_VALUE = 'lab-fourt';
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Chống CSRF (NFR-SEC-03): mọi yêu cầu thay đổi dữ liệu phải có header tự đặt.
 * Trang web khác không gửi được header này mà không qua CORS, và API không bật CORS.
 * Cookie SameSite=Lax là lớp bảo vệ thứ hai.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (SAFE.has(req.method)) return true;
    if (req.get(CSRF_HEADER) === CSRF_VALUE) return true;
    throw new ForbiddenException('Yêu cầu bị từ chối');
  }
}
