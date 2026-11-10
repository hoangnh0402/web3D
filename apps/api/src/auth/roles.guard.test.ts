import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import type { Role } from '@lab-fourt/shared';
import { Roles } from '../common/decorators';
import { RolesGuard } from './roles.guard';

class Target {
  @Roles('ADMIN')
  adminOnly() {}

  open() {}
}

const ctx = (handler: () => void, role?: Role) =>
  ({
    getHandler: () => handler,
    getClass: () => Target,
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  it('cho qua route không giới hạn vai trò', () => {
    expect(guard.canActivate(ctx(Target.prototype.open, 'STUDENT'))).toBe(true);
  });

  it('cho qua đúng vai trò', () => {
    expect(guard.canActivate(ctx(Target.prototype.adminOnly, 'ADMIN'))).toBe(true);
  });

  it('chặn sai vai trò bằng 403', () => {
    expect(() => guard.canActivate(ctx(Target.prototype.adminOnly, 'STUDENT'))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx(Target.prototype.adminOnly, 'LECTURER'))).toThrow(ForbiddenException);
  });
});
