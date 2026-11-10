import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { ENV, type Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionUser } from '../common/request';

const sha256 = (token: string) => createHash('sha256').update(token).digest('hex');

/** Phiên đăng nhập lưu trong CSDL. Cookie chỉ giữ token ngẫu nhiên, CSDL chỉ giữ mã băm của token. */
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  get ttlMs() {
    return this.env.SESSION_TTL_HOURS * 3600_000;
  }

  async create(userId: string, meta: { ip: string | null; userAgent?: string }) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.ttlMs);
    await this.prisma.authSession.create({
      data: { userId, tokenHash: sha256(token), expiresAt, ip: meta.ip, userAgent: meta.userAgent?.slice(0, 300) },
    });
    return { token, expiresAt };
  }

  /** Trả về người dùng nếu phiên còn hiệu lực và tài khoản đang hoạt động */
  async resolve(token: string): Promise<SessionUser | null> {
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
    const { user } = session;
    // Tài khoản bị khóa hoặc vô hiệu hóa thì mất đăng nhập ngay (FR-AUTH-05)
    if (user.status !== 'ACTIVE') return null;
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      sessionId: session.id,
    };
  }

  revoke(sessionId: string) {
    return this.prisma.authSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Thu hồi mọi phiên của người dùng, có thể giữ lại phiên hiện tại */
  revokeAllForUser(userId: string, exceptSessionId?: string) {
    return this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
      data: { revokedAt: new Date() },
    });
  }
}
