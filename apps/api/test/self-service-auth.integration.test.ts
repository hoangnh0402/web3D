import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createApp, createUser, CSRF, login, PASSWORD, TEST_DB } from './helpers';

// Mỗi tệp dựng ứng dụng riêng nên bộ đếm giới hạn tần suất cũng riêng: tệp này gọi đăng nhập 9 lần
// (giới hạn 10 mỗi phút), đăng ký 5 lần và quên mật khẩu 5 lần (giới hạn 5 mỗi 10 phút).

const REGISTRATION = {
  fullName: 'Nguyễn Văn Đăng Ký',
  username: 'SV.DangKy',
  note: 'Lớp CTXH K68, mã 2201234',
  password: 'MatKhau2026',
  confirmPassword: 'MatKhau2026',
};

/** Tự đăng ký chờ duyệt (D-12), quên mật khẩu gửi quản trị viên (FR-AUTH-04), ghi nhớ đăng nhập */
describe.skipIf(!TEST_DB)('Đăng ký, quên mật khẩu, ghi nhớ đăng nhập (tích hợp)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: TestAgent;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const ctx = await createApp();
    app = ctx.app;
    prisma = ctx.prisma;
    await createUser(prisma, ctx.passwords, 'qtv_tudv', 'ADMIN');
    await createUser(prisma, ctx.passwords, 'sv_quenmk', 'STUDENT');
    await createUser(prisma, ctx.passwords, 'sv_ghinho', 'STUDENT');
    await createUser(prisma, ctx.passwords, 'sv_nho', 'STUDENT');
    admin = (await login(app, 'qtv_tudv')).agent;
  });

  afterAll(async () => {
    // Trả cấu hình về mặc định cho các tệp kiểm thử khác
    await prisma.systemSetting.deleteMany({
      where: { key: { in: ['auth.registrationEnabled', 'auth.rememberDays'] } },
    });
    await app?.close();
  });

  it('trang đăng nhập đọc được tùy chọn công khai', async () => {
    const res = await http().get('/api/auth/options').expect(200);
    expect(res.body).toEqual({ registrationEnabled: true, rememberDays: 30 });
  });

  it('đăng ký tạo tài khoản sinh viên Chờ duyệt, chưa đăng nhập được cho tới khi được duyệt', async () => {
    // Thiếu ghi chú xác minh, mật khẩu yếu, nhập lại không khớp
    const bad = await http()
      .post('/api/auth/register')
      .set(CSRF)
      .send({ ...REGISTRATION, note: '', password: 'abc', confirmPassword: 'xyz' })
      .expect(400);
    expect(Object.keys(bad.body.fields)).toEqual(expect.arrayContaining(['note', 'password', 'confirmPassword']));

    await http().post('/api/auth/register').set(CSRF).send(REGISTRATION).expect(201);
    const user = await prisma.user.findUniqueOrThrow({ where: { username: 'sv.dangky' } });
    expect(user).toMatchObject({ role: 'STUDENT', status: 'PENDING', selfRegistered: true, mustChangePassword: false });
    expect(user.registrationNote).toBe(REGISTRATION.note);

    // Trùng tên đăng nhập thì báo đúng trường
    const dup = await http().post('/api/auth/register').set(CSRF).send(REGISTRATION).expect(409);
    expect(dup.body.fields.username).toMatch(/đã được dùng/);

    // Sai mật khẩu vẫn chỉ báo chung; đúng mật khẩu mới báo đang chờ duyệt
    await http().post('/api/auth/login').set(CSRF).send({ username: 'sv.dangky', password: 'SaiMatKhau1' }).expect(401);
    const pending = await http()
      .post('/api/auth/login')
      .set(CSRF)
      .send({ username: 'sv.dangky', password: REGISTRATION.password })
      .expect(403);
    expect(pending.body.message).toMatch(/chờ quản trị viên duyệt/);

    // Quản trị viên thấy và duyệt
    const listed = (await admin.get('/api/admin/users?q=sv.dangky').expect(200)).body[0];
    expect(listed).toMatchObject({ status: 'PENDING', selfRegistered: true, registrationNote: REGISTRATION.note });
    await admin.patch(`/api/admin/users/${user.id}`).set(CSRF).send({ status: 'ACTIVE' }).expect(200);
    expect(await prisma.auditLog.count({ where: { action: 'user.approved', entityId: user.id } })).toBe(1);

    const ok = await http()
      .post('/api/auth/login')
      .set(CSRF)
      .send({ username: 'sv.dangky', password: REGISTRATION.password })
      .expect(200);
    expect(ok.body).toMatchObject({ role: 'STUDENT', mustChangePassword: false });
  });

  it('từ chối đăng ký thì tài khoản bị vô hiệu hóa và có nhật ký', async () => {
    await http()
      .post('/api/auth/register')
      .set(CSRF)
      .send({ ...REGISTRATION, username: 'sv.tuchoi' })
      .expect(201);
    const user = await prisma.user.findUniqueOrThrow({ where: { username: 'sv.tuchoi' } });
    await admin.patch(`/api/admin/users/${user.id}`).set(CSRF).send({ status: 'DISABLED' }).expect(200);
    expect(await prisma.auditLog.count({ where: { action: 'user.rejected', entityId: user.id } })).toBe(1);
    const res = await http()
      .post('/api/auth/login')
      .set(CSRF)
      .send({ username: 'sv.tuchoi', password: REGISTRATION.password })
      .expect(403);
    expect(res.body.message).toMatch(/bị khóa/);
  });

  it('quản trị viên tắt đăng ký thì không đăng ký được', async () => {
    await admin.put('/api/admin/settings').set(CSRF).send({ 'auth.registrationEnabled': false }).expect(200);
    expect((await http().get('/api/auth/options').expect(200)).body.registrationEnabled).toBe(false);
    await http()
      .post('/api/auth/register')
      .set(CSRF)
      .send({ ...REGISTRATION, username: 'sv.khongduoc' })
      .expect(403);
    expect(await prisma.user.count({ where: { username: 'sv.khongduoc' } })).toBe(0);
    await admin.put('/api/admin/settings').set(CSRF).send({ 'auth.registrationEnabled': true }).expect(200);
  });

  it('quên mật khẩu: phản hồi như nhau dù tên có tồn tại hay không, không tạo yêu cầu trùng', async () => {
    const a = await http()
      .post('/api/auth/forgot-password')
      .set(CSRF)
      .send({ username: 'sv_quenmk', note: 'Em ở lớp K68' })
      .expect(202);
    const b = await http().post('/api/auth/forgot-password').set(CSRF).send({ username: 'khong.ton.tai' }).expect(202);
    expect(a.body).toEqual(b.body);
    await http().post('/api/auth/forgot-password').set(CSRF).send({ username: 'SV_QUENMK' }).expect(202);

    const user = await prisma.user.findUniqueOrThrow({ where: { username: 'sv_quenmk' } });
    expect(await prisma.passwordRequest.count({ where: { userId: user.id, status: 'OPEN' } })).toBe(1);

    const rows = (await admin.get('/api/admin/password-requests').expect(200)).body;
    const row = rows.find((r: { userId: string }) => r.userId === user.id);
    expect(row).toMatchObject({ username: 'sv_quenmk', note: 'Em ở lớp K68' });

    // Sinh viên không xem được danh sách yêu cầu
    const { agent: student } = await login(app, 'sv_ghinho');
    await student.get('/api/admin/password-requests').expect(403);

    // Xử lý: cấp mật khẩu tạm, bắt đổi mật khẩu, yêu cầu chuyển Đã xử lý
    const issued = (await admin.post(`/api/admin/password-requests/${row.id}/resolve`).set(CSRF).expect(200)).body;
    expect(issued).toMatchObject({ userId: user.id, username: 'sv_quenmk' });
    const relogin = await http()
      .post('/api/auth/login')
      .set(CSRF)
      .send({ username: 'sv_quenmk', password: issued.temporaryPassword })
      .expect(200);
    expect(relogin.body.mustChangePassword).toBe(true);
    expect((await prisma.passwordRequest.findUniqueOrThrow({ where: { id: row.id } })).status).toBe('RESOLVED');
    await admin.post(`/api/admin/password-requests/${row.id}/resolve`).set(CSRF).expect(409);
  });

  it('bỏ qua yêu cầu quên mật khẩu; đặt lại mật khẩu trực tiếp cũng đóng yêu cầu đang chờ', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { username: 'sv_ghinho' } });
    await http().post('/api/auth/forgot-password').set(CSRF).send({ username: 'sv_ghinho' }).expect(202);
    const first = await prisma.passwordRequest.findFirstOrThrow({ where: { userId: user.id, status: 'OPEN' } });
    await admin.post(`/api/admin/password-requests/${first.id}/dismiss`).set(CSRF).expect(204);
    expect((await prisma.passwordRequest.findUniqueOrThrow({ where: { id: first.id } })).status).toBe('DISMISSED');
    expect(await prisma.auditLog.count({ where: { action: 'password.request.dismissed', entityId: first.id } })).toBe(
      1,
    );

    await http().post('/api/auth/forgot-password').set(CSRF).send({ username: 'sv_ghinho' }).expect(202);
    const second = await prisma.passwordRequest.findFirstOrThrow({ where: { userId: user.id, status: 'OPEN' } });
    await admin.post(`/api/admin/users/${user.id}/reset-password`).set(CSRF).expect(200);
    expect((await prisma.passwordRequest.findUniqueOrThrow({ where: { id: second.id } })).status).toBe('RESOLVED');
  });

  it('ghi nhớ đăng nhập: cookie và phiên giữ theo số ngày cấu hình; không ghi nhớ thì là cookie phiên', async () => {
    const plain = await http()
      .post('/api/auth/login')
      .set(CSRF)
      .send({ username: 'sv_nho', password: PASSWORD })
      .expect(200);
    const plainCookie = String(plain.headers['set-cookie']);
    expect(plainCookie).not.toMatch(/Expires=/i);

    await admin.put('/api/admin/settings').set(CSRF).send({ 'auth.rememberDays': 7 }).expect(200);
    const before = Date.now();
    const remembered = await http()
      .post('/api/auth/login')
      .set(CSRF)
      .send({ username: 'sv_nho', password: PASSWORD, remember: true })
      .expect(200);
    const cookie = String(remembered.headers['set-cookie']);
    const expires = Date.parse(/Expires=([^;]+)/i.exec(cookie)?.[1] ?? '');
    expect(expires - before).toBeGreaterThan(6.9 * 86_400_000);
    expect(expires - before).toBeLessThan(7.1 * 86_400_000);
    expect(cookie).toMatch(/HttpOnly/);

    const sessions = await prisma.authSession.findMany({
      where: { user: { username: 'sv_nho' } },
      orderBy: { createdAt: 'asc' },
    });
    expect(sessions).toHaveLength(2);
    // Không ghi nhớ: phiên ở máy chủ vẫn hết hạn theo SESSION_TTL_HOURS
    expect(sessions[0]!.expiresAt.getTime() - sessions[0]!.createdAt.getTime()).toBeLessThan(86_400_000);
    expect(sessions[1]!.expiresAt.getTime() - sessions[1]!.createdAt.getTime()).toBeGreaterThan(6.9 * 86_400_000);
  });
});
