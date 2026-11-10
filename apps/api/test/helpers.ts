import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { loadEnv } from '../src/config/env';
import { PasswordService } from '../src/auth/password.service';
import { PrismaService } from '../src/prisma/prisma.service';
import type { Role } from '../src/generated/prisma/client';

try {
  process.loadEnvFile();
} catch {
  // Không có .env
}

export const TEST_DB = process.env.TEST_DATABASE_URL;
export const CSRF = { 'x-requested-with': 'lab-fourt' };
export const PASSWORD = 'BanDau2026';

/** Dựng ứng dụng NestJS thật trên CSDL kiểm thử */
export const createApp = async () => {
  Object.assign(process.env, { DATABASE_URL: TEST_DB, COOKIE_SECURE: 'false', LOG_LEVEL: 'error', NODE_ENV: 'test' });
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app, loadEnv());
  await app.init();
  return { app, prisma: app.get(PrismaService), passwords: app.get(PasswordService) };
};

export const createUser = async (
  prisma: PrismaService,
  passwords: PasswordService,
  username: string,
  role: Role,
  mustChangePassword = false,
) =>
  prisma.user.upsert({
    where: { username },
    update: {},
    create: { username, fullName: username, role, passwordHash: await passwords.hash(PASSWORD), mustChangePassword },
  });

export const login = async (app: INestApplication, username: string, password = PASSWORD) => {
  const agent = request.agent(app.getHttpServer());
  const res = await agent.post('/api/auth/login').set(CSRF).send({ username, password });
  return { agent, res };
};

/** Chờ điều kiện đúng, dùng cho phần thân chủ AI trả lời ở nền */
export const until = async <T>(fn: () => Promise<T | null | undefined | false>, timeoutMs = 15_000): Promise<T> => {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error('Hết thời gian chờ');
    await new Promise((r) => setTimeout(r, 100));
  }
};
