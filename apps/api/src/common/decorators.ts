import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '@lab-fourt/shared';
import type { AuthedRequest, SessionUser } from './request';

export const IS_PUBLIC = 'isPublic';
/** Route không cần đăng nhập. Mặc định mọi route đều cần. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES_KEY = 'roles';
/** Chỉ các vai trò này được gọi route (docs/srs/02 mục 14) */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const ALLOW_PASSWORD_CHANGE_PENDING = 'allowPasswordChangePending';
/** Route vẫn gọi được khi người dùng chưa đổi mật khẩu lần đầu */
export const AllowPendingPasswordChange = () => SetMetadata(ALLOW_PASSWORD_CHANGE_PENDING, true);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): SessionUser => {
  return ctx.switchToHttp().getRequest<AuthedRequest>().user!;
});
