/**
 * Đặt lại tài khoản dùng cho kiểm thử đầu cuối (apps/web/e2e) về trạng thái phải đổi mật khẩu lần đầu.
 * Chỉ chạy ngoài production. Dùng: npx tsx test/e2e-user.ts
 */
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client';

try {
  process.loadEnvFile();
} catch {
  // Không có .env
}
if (process.env.NODE_ENV === 'production') throw new Error('Không chạy script kiểm thử trên production');

export const E2E_USER = { username: 'e2e_sv', password: 'E2eBanDau2026' };

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const passwordHash = await argon2.hash(E2E_USER.password, { type: argon2.argon2id });
  const data = {
    passwordHash,
    mustChangePassword: true,
    status: 'ACTIVE' as const,
    failedLoginCount: 0,
    lockedUntil: null,
  };
  const user = await prisma.user.upsert({
    where: { username: E2E_USER.username },
    update: data,
    create: { ...data, username: E2E_USER.username, fullName: 'Sinh viên kiểm thử', role: 'STUDENT' },
  });
  await prisma.authSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
}

main().finally(() => prisma.$disconnect());
