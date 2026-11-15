import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createApp, createUser, CSRF, PASSWORD, TEST_DB } from './helpers';

/** Trang đăng nhập riêng cho từng vai trò: /login, /login/giang-vien, /login/quan-tri */
describe.skipIf(!TEST_DB)('Đăng nhập theo vai trò (tích hợp)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const ctx = await createApp();
    app = ctx.app;
    prisma = ctx.prisma;
    await createUser(prisma, ctx.passwords, 'qtv_cong', 'ADMIN');
    await createUser(prisma, ctx.passwords, 'gv_cong', 'LECTURER');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('đăng nhập ở trang của vai trò khác thì bị từ chối, không tạo phiên, có đường dẫn tới đúng trang', async () => {
    const before = await prisma.authSession.count({ where: { user: { username: 'qtv_cong' } } });
    const res = await http()
      .post('/api/auth/login')
      .set(CSRF)
      .send({ username: 'qtv_cong', password: PASSWORD, portal: 'STUDENT' })
      .expect(403);
    expect(res.body).toMatchObject({ portal: '/login/quan-tri' });
    expect(res.body.message).toMatch(/quản trị viên/);
    expect(await prisma.authSession.count({ where: { user: { username: 'qtv_cong' } } })).toBe(before);
    // Sai mật khẩu ở trang khác vai trò vẫn chỉ báo chung, không lộ vai trò
    const wrong = await http()
      .post('/api/auth/login')
      .set(CSRF)
      .send({ username: 'qtv_cong', password: 'SaiMatKhau1', portal: 'STUDENT' })
      .expect(401);
    expect(wrong.body.portal).toBeUndefined();
  });

  it('đúng trang vai trò thì đăng nhập bình thường', async () => {
    await http()
      .post('/api/auth/login')
      .set(CSRF)
      .send({ username: 'gv_cong', password: PASSWORD, portal: 'LECTURER' })
      .expect(200);
    const res = await http()
      .post('/api/auth/login')
      .set(CSRF)
      .send({ username: 'gv_cong', password: PASSWORD, portal: 'ADMIN' })
      .expect(403);
    expect(res.body.portal).toBe('/login/giang-vien');
  });
});
