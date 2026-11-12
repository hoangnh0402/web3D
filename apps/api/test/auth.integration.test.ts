import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { loadEnv } from '../src/config/env';
import { PasswordService } from '../src/auth/password.service';
import { PrismaService } from '../src/prisma/prisma.service';

try {
  process.loadEnvFile();
} catch {
  // Không có .env
}
const url = process.env.TEST_DATABASE_URL;
const CSRF = { 'x-requested-with': 'lab-fourt' };

/** Luồng đăng nhập chạy với PostgreSQL thật (docs/srs/08 AT-25) */
describe.skipIf(!url)('Xác thực và phân quyền (tích hợp)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    Object.assign(process.env, { DATABASE_URL: url, COOKIE_SECURE: 'false', LOG_LEVEL: 'error', NODE_ENV: 'test' });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app, loadEnv());
    await app.init();
    prisma = app.get(PrismaService);
    const passwords = app.get(PasswordService);
    const hash = await passwords.hash('BanDau2026');
    await prisma.user.createMany({
      data: [
        { username: 'sv_moi', fullName: 'Sinh viên mới', role: 'STUDENT', passwordHash: hash, mustChangePassword: true },
        { username: 'sv', fullName: 'Sinh viên', role: 'STUDENT', passwordHash: hash, mustChangePassword: false },
        { username: 'qtv', fullName: 'Quản trị viên', role: 'ADMIN', passwordHash: hash, mustChangePassword: false },
      ],
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  const login = async (username: string, password = 'BanDau2026') => {
    const agent = request.agent(app.getHttpServer());
    const res = await agent.post('/api/auth/login').set(CSRF).send({ username, password });
    return { agent, res };
  };

  it('chưa đăng nhập thì nhận 401', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    await request(app.getHttpServer()).get('/api/users').expect(401);
  });

  it('yêu cầu thay đổi dữ liệu thiếu header chống CSRF thì nhận 403', async () => {
    await request(app.getHttpServer()).post('/api/auth/login').send({ username: 'sv', password: 'BanDau2026' }).expect(403);
  });

  it('dữ liệu sai lược đồ thì nhận 400 kèm lỗi từng trường', async () => {
    const res = await request(app.getHttpServer()).post('/api/auth/login').set(CSRF).send({ username: '' }).expect(400);
    expect(res.body.fields.username).toBeTruthy();
  });

  it('đăng nhập đặt cookie HttpOnly, SameSite=Lax và trả thông tin người dùng', async () => {
    const { res } = await login('sv');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ username: 'sv', role: 'STUDENT', mustChangePassword: false });
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/lf_session=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    const session = await prisma.authSession.findFirst({ where: { user: { username: 'sv' } } });
    expect(session?.tokenHash).toHaveLength(64);
    expect(cookie).not.toContain(session!.tokenHash);
  });

  it('sai mật khẩu nhận 401 và được ghi nhật ký', async () => {
    const { res } = await login('sv', 'SaiMatKhau1');
    expect(res.status).toBe(401);
    expect(await prisma.auditLog.count({ where: { action: 'auth.login.failed' } })).toBeGreaterThan(0);
  });

  it('người dùng mới phải đổi mật khẩu trước khi dùng chức năng khác', async () => {
    const { agent, res } = await login('sv_moi');
    expect(res.body.mustChangePassword).toBe(true);
    await agent.get('/api/auth/me').expect(200);
    await agent.get('/api/users').expect(403);
    await agent
      .post('/api/auth/change-password')
      .set(CSRF)
      .send({ currentPassword: 'sai', newPassword: 'MatKhauMoi2026', confirmPassword: 'MatKhauMoi2026' })
      .expect(400);
    const changed = await agent
      .post('/api/auth/change-password')
      .set(CSRF)
      .send({ currentPassword: 'BanDau2026', newPassword: 'MatKhauMoi2026', confirmPassword: 'MatKhauMoi2026' })
      .expect(200);
    expect(changed.body.mustChangePassword).toBe(false);
    // Sau khi đổi, chức năng của sinh viên dùng được; chức năng của quản trị viên vẫn bị chặn theo vai trò
    const denied = await agent.get('/api/users').expect(403);
    expect(denied.body.message).toBe('Bạn không có quyền thực hiện thao tác này');
  });

  it('quản trị viên xem được danh sách tài khoản, không lộ mã băm mật khẩu', async () => {
    const { agent } = await login('qtv');
    const res = await agent.get('/api/users').expect(200);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
    expect(JSON.stringify(res.body)).not.toContain('argon2');
  });

  it('đăng xuất thu hồi phiên ngay', async () => {
    const { agent } = await login('sv');
    await agent.get('/api/auth/me').expect(200);
    await agent.post('/api/auth/logout').set(CSRF).expect(204);
    await agent.get('/api/auth/me').expect(401);
  });

  it('khóa tài khoản làm mất đăng nhập ngay (FR-AUTH-05)', async () => {
    const { agent } = await login('sv');
    await agent.get('/api/auth/me').expect(200);
    await prisma.user.update({ where: { username: 'sv' }, data: { status: 'LOCKED' } });
    await agent.get('/api/auth/me').expect(401);
    await prisma.user.update({ where: { username: 'sv' }, data: { status: 'ACTIVE' } });
  });

  it('kiểm tra sức khỏe không cần đăng nhập', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', database: 'ok', ai: 'ok', stt: 'ok' });
  });
});
