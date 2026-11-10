import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import {
  createUserSchema,
  ROLES,
  type AdminUser,
  type CreateUserInput,
  type ImportResult,
  type IssuedPassword,
  type UpdateUserInput,
} from '@lab-fourt/shared';
import { AUDIT, AuditService } from '../audit/audit.service';
import { PasswordService } from '../auth/password.service';
import { SessionService } from '../auth/session.service';
import type { User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Bỏ các ký tự dễ nhầm (0/O, 1/l/I) để đọc mật khẩu tạm qua điện thoại hay giấy */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
export const temporaryPassword = () => {
  let p = '';
  for (let i = 0; i < 10; i++) p += ALPHABET[randomInt(ALPHABET.length)];
  // Đảm bảo có chữ và số theo quy tắc mật khẩu
  return `${p}${randomInt(10)}`;
};

const toAdminUser = (u: User): AdminUser => ({
  id: u.id,
  username: u.username,
  fullName: u.fullName,
  role: u.role,
  status: u.status,
  mustChangePassword: u.mustChangePassword,
  temporarilyLocked: !!u.lockedUntil && u.lockedUntil > new Date(),
  lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
  createdAt: u.createdAt.toISOString(),
});

/** Quản lý tài khoản của quản trị viên (FR-USR-01, FR-USR-02, FR-AUTH-02, FR-AUTH-04) */
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
  ) {}

  async list(q?: string): Promise<AdminUser[]> {
    const term = q?.trim();
    const rows = await this.prisma.user.findMany({
      where: term
        ? { OR: [{ username: { contains: term, mode: 'insensitive' } }, { fullName: { contains: term, mode: 'insensitive' } }] }
        : undefined,
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
      take: 500,
    });
    return rows.map(toAdminUser);
  }

  /** Tạo tài khoản với mật khẩu tạm, buộc đổi ở lần đăng nhập đầu (FR-AUTH-03) */
  async create(actorId: string, input: CreateUserInput): Promise<IssuedPassword> {
    if (await this.prisma.user.findUnique({ where: { username: input.username } })) {
      throw new ConflictException('Tên đăng nhập đã tồn tại');
    }
    const temp = temporaryPassword();
    const u = await this.prisma.user.create({
      data: { ...input, passwordHash: await this.passwords.hash(temp), mustChangePassword: true },
    });
    await this.audit.record({ actorId, action: AUDIT.USER_CREATED, entityType: 'user', entityId: u.id, after: { role: u.role } });
    return { userId: u.id, username: u.username, temporaryPassword: temp };
  }

  /** Sửa, khóa hoặc vô hiệu hóa. Khóa thì mất đăng nhập ngay (FR-AUTH-05). */
  async update(actorId: string, userId: string, input: UpdateUserInput) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException('Không tìm thấy tài khoản');
    if (userId === actorId && ((input.status && input.status !== 'ACTIVE') || (input.role && input.role !== 'ADMIN'))) {
      throw new BadRequestException('Không thể tự khóa hoặc tự bỏ quyền quản trị của chính mình');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...input,
        // Mở khóa thì xóa luôn khóa tạm do nhập sai
        ...(input.status === 'ACTIVE' ? { lockedUntil: null, failedLoginCount: 0 } : {}),
      },
    });
    if (input.status && input.status !== 'ACTIVE') await this.sessions.revokeAllForUser(userId);
    if (input.role && input.role !== u.role) await this.sessions.revokeAllForUser(userId);
    await this.audit.record({
      actorId,
      action: AUDIT.USER_UPDATED,
      entityType: 'user',
      entityId: userId,
      before: { fullName: u.fullName, role: u.role, status: u.status },
      after: { fullName: updated.fullName, role: updated.role, status: updated.status },
    });
    return toAdminUser(updated);
  }

  /** Đặt lại mật khẩu không cần email vì hệ thống chạy local (FR-AUTH-04) */
  async resetPassword(actorId: string, userId: string): Promise<IssuedPassword> {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException('Không tìm thấy tài khoản');
    const temp = temporaryPassword();
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await this.passwords.hash(temp), mustChangePassword: true, lockedUntil: null, failedLoginCount: 0 },
    });
    await this.sessions.revokeAllForUser(userId);
    await this.audit.record({ actorId, action: AUDIT.USER_PASSWORD_RESET, entityType: 'user', entityId: userId });
    return { userId, username: u.username, temporaryPassword: temp };
  }

  /** Nhập CSV, báo lỗi theo từng dòng; dòng hợp lệ vẫn được tạo (FR-USR-02) */
  async importCsv(actorId: string, csv: string): Promise<ImportResult> {
    const result: ImportResult = { created: [], errors: [] };
    // Bỏ ký tự BOM mà Excel thêm vào đầu tệp CSV UTF-8
    const BOM = String.fromCharCode(0xfeff);
    // Tách theo xuống dòng; ký tự CR của tệp Windows bị bỏ khi trim từng dòng và từng ô
    const lines = (csv.startsWith(BOM) ? csv.slice(1) : csv).split(String.fromCharCode(10));
    const seen = new Set<string>();
    for (const [i, raw] of lines.entries()) {
      const line = i + 1;
      if (!raw.trim()) continue;
      const cells = raw.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ''));
      // Bỏ qua dòng tiêu đề
      if (line === 1 && /^(username|tên đăng nhập|ten dang nhap)$/i.test(cells[0] ?? '')) continue;
      const role = (cells[2] ?? 'STUDENT').toUpperCase();
      const parsed = createUserSchema.safeParse({ username: cells[0]?.toLowerCase(), fullName: cells[1], role });
      if (!parsed.success) {
        const msg = parsed.error.issues[0]?.path[0] === 'role' ? `Vai trò phải là ${ROLES.join(', ')}` : parsed.error.issues[0]?.message;
        result.errors.push({ line, message: msg ?? 'Dòng không hợp lệ' });
        continue;
      }
      if (seen.has(parsed.data.username)) {
        result.errors.push({ line, message: 'Trùng tên đăng nhập trong tệp' });
        continue;
      }
      seen.add(parsed.data.username);
      try {
        result.created.push(await this.create(actorId, parsed.data));
      } catch (err) {
        result.errors.push({ line, message: err instanceof ConflictException ? 'Tên đăng nhập đã tồn tại' : 'Không tạo được tài khoản' });
      }
    }
    return result;
  }
}
