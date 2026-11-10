import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type TestAgent from 'supertest/lib/agent';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createApp, createUser, CSRF, login, TEST_DB } from './helpers';

/** Quản trị: tài khoản, lớp, trạng thái dữ liệu, cấu hình, nhật ký (docs/srs/08 AT-25 và FR-ADM) */
describe.skipIf(!TEST_DB)('Quản trị (tích hợp)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: TestAgent;
  let adminId: string;

  beforeAll(async () => {
    const ctx = await createApp();
    app = ctx.app;
    prisma = ctx.prisma;
    adminId = (await createUser(prisma, ctx.passwords, 'qtv_adm', 'ADMIN')).id;
    await createUser(prisma, ctx.passwords, 'gv_adm', 'LECTURER');
    admin = (await login(app, 'qtv_adm')).agent;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('tạo tài khoản với mật khẩu tạm, người dùng phải đổi mật khẩu; khóa thì mất đăng nhập ngay (AT-25)', async () => {
    const created = (await admin.post('/api/admin/users').set(CSRF).send({ username: 'sv.moi', fullName: 'Sinh viên mới', role: 'STUDENT' }).expect(201))
      .body;
    expect(created.temporaryPassword).toMatch(/^[A-Za-z0-9]{11}$/);
    await admin.post('/api/admin/users').set(CSRF).send({ username: 'sv.moi', fullName: 'Trùng', role: 'STUDENT' }).expect(409);

    const { agent, res } = await login(app, 'sv.moi', created.temporaryPassword);
    expect(res.body.mustChangePassword).toBe(true);
    await admin.patch(`/api/admin/users/${created.userId}`).set(CSRF).send({ status: 'LOCKED' }).expect(200);
    await agent.get('/api/auth/me').expect(401);

    await admin.patch(`/api/admin/users/${created.userId}`).set(CSRF).send({ status: 'ACTIVE' }).expect(200);
    const reset = (await admin.post(`/api/admin/users/${created.userId}/reset-password`).set(CSRF).expect(200)).body;
    expect((await login(app, 'sv.moi', reset.temporaryPassword)).res.status).toBe(200);
    expect((await login(app, 'sv.moi', created.temporaryPassword)).res.status).toBe(401);
  });

  it('không tự khóa hay tự bỏ quyền quản trị của chính mình', async () => {
    await admin.patch(`/api/admin/users/${adminId}`).set(CSRF).send({ status: 'DISABLED' }).expect(400);
  });

  it('nhập CSV báo lỗi theo từng dòng, dòng hợp lệ vẫn được tạo (FR-USR-02)', async () => {
    const csv = ['username,fullName,role', 'sv.csv1,Nguyễn An,STUDENT', 'SAI TEN,Lỗi,STUDENT', 'sv.csv2,Trần Bình,KHONG', 'sv.csv1,Trùng,STUDENT'].join('\n');
    const r = (await admin.post('/api/admin/users/import').set(CSRF).send({ csv }).expect(200)).body;
    expect(r.created.map((c: { username: string }) => c.username)).toEqual(['sv.csv1']);
    expect(r.errors.map((e: { line: number }) => e.line)).toEqual([3, 4, 5]);
  });

  it('tạo lớp, gán giảng viên, thêm sinh viên (FR-USR-03, FR-USR-04)', async () => {
    const { id } = (await admin.post('/api/admin/classes').set(CSRF).send({ name: 'Lớp quản trị', term: 'HK1' }).expect(201)).body;
    const gv = await prisma.user.findUniqueOrThrow({ where: { username: 'gv_adm' } });
    const r = await admin
      .post(`/api/admin/classes/${id}/members`)
      .set(CSRF)
      .send({ lecturerIds: [gv.id], studentUsernames: ['sv.csv1', 'khong.ton.tai'] })
      .expect(200);
    expect(r.body.missing).toEqual(['khong.ton.tai']);
    const cls = (await admin.get('/api/admin/classes').expect(200)).body.find((c: { id: string }) => c.id === id);
    expect(cls.lecturers.map((l: { fullName: string }) => l.fullName)).toEqual(['gv_adm']);
    expect(cls.students).toHaveLength(1);
  });

  it('đổi trạng thái bản ghi, khôi phục phải đặt hạn mới, ghi nhật ký trước và sau (FR-DATA-04, FR-DATA-06)', async () => {
    const owner = await prisma.user.findUniqueOrThrow({ where: { username: 'gv_adm' } });
    const c = await prisma.case.create({ data: { title: 'Ca dữ liệu', ownerId: owner.id } });
    const v = await prisma.caseVersion.create({
      data: { caseId: c.id, versionNo: 1, profile: {}, rubric: {}, difficulty: 1, skills: [], maxDurationMin: 25, avatarKey: 'a' },
    });
    const sv = await prisma.user.findUniqueOrThrow({ where: { username: 'sv.csv1' } });
    const s = await prisma.practiceSession.create({ data: { userId: sv.id, caseVersionId: v.id, status: 'ENDED', recordStatus: 'ARCHIVED' } });
    await admin.patch(`/api/admin/sessions/${s.id}/record-status`).set(CSRF).send({ recordStatus: 'ACTIVE' }).expect(400);
    const until = new Date(Date.now() + 7 * 86_400_000).toISOString();
    await admin.patch(`/api/admin/sessions/${s.id}/record-status`).set(CSRF).send({ recordStatus: 'ACTIVE', retentionUntil: until }).expect(204);
    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: 'data.session.status', entityId: s.id } });
    expect(log.before).toMatchObject({ recordStatus: 'ARCHIVED' });
    expect(log.after).toMatchObject({ recordStatus: 'ACTIVE' });
    const rows = (await admin.get('/api/admin/sessions?recordStatus=ACTIVE&q=Ca%20d%E1%BB%AF%20li%E1%BB%87u').expect(200)).body;
    expect(rows.map((r: { id: string }) => r.id)).toContain(s.id);
  });

  it('cấu hình được kiểm tra theo lược đồ, không trả khóa bí mật, đổi cấu hình được ghi nhật ký', async () => {
    const before = (await admin.get('/api/admin/settings').expect(200)).body;
    expect(before.values['retention.days']).toBe(14);
    expect(JSON.stringify(before)).not.toMatch(/AI_API_KEY|apiKey/i);
    await admin.put('/api/admin/settings').set(CSRF).send({ 'retention.days': 0 }).expect(400);
    const after = (await admin.put('/api/admin/settings').set(CSRF).send({ 'retention.days': 21 }).expect(200)).body;
    expect(after.values['retention.days']).toBe(21);
    await admin.put('/api/admin/settings').set(CSRF).send({ 'retention.days': 14 }).expect(200);
    expect(await prisma.auditLog.count({ where: { action: 'settings.updated' } })).toBeGreaterThanOrEqual(2);
  });

  it('trạng thái hệ thống và nhật ký có lọc, phân trang (FR-ADM-03, FR-ADM-05)', async () => {
    const status = (await admin.get('/api/admin/status').expect(200)).body;
    expect(status).toMatchObject({ api: 'ok', database: 'ok', ai: 'ok' });
    const page = (await admin.get('/api/admin/audit?action=user.&actor=qtv_adm').expect(200)).body;
    expect(page.total).toBeGreaterThan(0);
    expect(page.items.every((i: { action: string }) => i.action.startsWith('user.'))).toBe(true);
  });

  it('người không phải quản trị viên bị chặn', async () => {
    const { agent } = await login(app, 'gv_adm');
    await agent.get('/api/admin/users').expect(403);
    await agent.get('/api/admin/audit').expect(403);
  });
});
