import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type TestAgent from 'supertest/lib/agent';
import { MOCK_FAIL_ONCE } from '../src/ai-gateway/mock-ai.gateway';
import type { PrismaService } from '../src/prisma/prisma.service';
import { SessionLifecycleService } from '../src/sessions/session-lifecycle.service';
import { createApp, createUser, CSRF, login, TEST_DB, until } from './helpers';

/** Phiên thực hành và hội thoại với CSDL thật và dịch vụ AI giả lập (docs/srs/08) */
describe.skipIf(!TEST_DB)('Phiên thực hành (tích hợp)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let student: TestAgent;
  let other: TestAgent;
  let caseId: string;

  beforeAll(async () => {
    const ctx = await createApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const owner = await createUser(prisma, ctx.passwords, 'gv_ses', 'LECTURER');
    await createUser(prisma, ctx.passwords, 'sv_ses', 'STUDENT');
    await createUser(prisma, ctx.passwords, 'sv_khac', 'STUDENT');
    await createUser(prisma, ctx.passwords, 'qtv_ses', 'ADMIN');
    const c = await prisma.case.create({ data: { title: 'Ca kiểm thử', ownerId: owner.id, status: 'PUBLISHED' } });
    const v = await prisma.caseVersion.create({
      data: {
        caseId: c.id,
        versionNo: 1,
        profile: {
          clientName: 'Hà Linh',
          summary: 'Tóm tắt',
          hiddenInformation: [{ id: 'h1', content: 'BÍ MẬT CỦA THÂN CHỦ' }],
          opening: { text: 'Dạ, em chào anh chị.', emotion: 'HESITANT' },
        },
        rubric: {},
        difficulty: 1,
        skills: ['EMPATHY'],
        maxDurationMin: 25,
        avatarKey: 'a',
        publishedAt: new Date(),
      },
    });
    await prisma.case.update({ where: { id: c.id }, data: { currentVersionId: v.id } });
    caseId = c.id;
    student = (await login(app, 'sv_ses')).agent;
    other = (await login(app, 'sv_khac')).agent;
  });

  afterAll(async () => {
    await app?.close();
  });

  const turn = (agent: TestAgent, id: string, content: string, clientTurnId = randomUUID()) =>
    agent.post(`/api/sessions/${id}/turns`).set(CSRF).send({ clientTurnId, content, inputMode: 'TEXT' });
  const clientReplies = (id: string) => prisma.message.count({ where: { sessionId: id, speaker: 'CLIENT' } });

  it('thư viện chỉ có ca đã xuất bản và không lộ thông tin ẩn của thân chủ', async () => {
    const list = await student.get('/api/cases').expect(200);
    expect(list.body.map((c: { id: string }) => c.id)).toContain(caseId);
    const detail = await student.get(`/api/cases/${caseId}`).expect(200);
    expect(detail.body).toMatchObject({ clientName: 'Hà Linh', practiceStatus: 'NOT_STARTED' });
    expect(JSON.stringify(detail.body)).not.toContain('BÍ MẬT');
  });

  it('quản trị viên không được thực hành ca', async () => {
    const { agent } = await login(app, 'qtv_ses');
    await agent.post('/api/sessions').set(CSRF).send({ caseId, acceptedRules: true }).expect(403);
  });

  let sessionId: string;

  it('phải xác nhận quy tắc mô phỏng trước khi bắt đầu (FR-SES-01)', async () => {
    const res = await student.post('/api/sessions').set(CSRF).send({ caseId }).expect(400);
    expect(res.body.fields.acceptedRules).toBeTruthy();
  });

  it('bắt đầu phiên với câu mở đầu của thân chủ, và chỉ có một phiên đang chạy (FR-SES-09)', async () => {
    const res = await student.post('/api/sessions').set(CSRF).send({ caseId, acceptedRules: true }).expect(201);
    sessionId = res.body.id;
    const again = await student.post('/api/sessions').set(CSRF).send({ caseId, acceptedRules: true }).expect(409);
    expect(again.body.sessionId).toBe(sessionId);
    const detail = await student.get(`/api/sessions/${sessionId}`).expect(200);
    expect(detail.body.messages).toHaveLength(1);
    expect(detail.body.messages[0]).toMatchObject({ seq: 1, speaker: 'CLIENT', emotion: 'HESITANT' });
    expect((await student.get('/api/sessions/active').expect(200)).body.session.id).toBe(sessionId);
  });

  it('sinh viên khác không mở được phiên và bị ghi nhật ký (AT-09)', async () => {
    await other.get(`/api/sessions/${sessionId}`).expect(404);
    await turn(other, sessionId, 'Chào em').expect(404);
    expect(await prisma.auditLog.count({ where: { action: 'access.denied', entityId: sessionId } })).toBeGreaterThan(0);
  });

  it('lưu lời sinh viên ngay, thân chủ trả lời ở nền; gửi lại cùng mã lượt không tạo lượt trùng', async () => {
    const id = randomUUID();
    const first = await turn(student, sessionId, 'Chào em, hôm nay em muốn chia sẻ điều gì?', id).expect(202);
    expect(first.body).toMatchObject({ seq: 2, speaker: 'STUDENT', inputMode: 'TEXT' });
    // Không gửi được lượt mới khi thân chủ đang trả lời (FR-CONV-11)
    await turn(student, sessionId, 'Lượt chen ngang').expect(409);
    const dup = await turn(student, sessionId, 'Nội dung khác', id).expect(202);
    expect(dup.body.id).toBe(first.body.id);
    await until(async () => (await clientReplies(sessionId)) === 2);
    expect(await prisma.message.count({ where: { sessionId, speaker: 'STUDENT' } })).toBe(1);
    const usage = await prisma.aiUsage.findFirst({ where: { sessionId, kind: 'CONVERSATION' } });
    expect(usage?.outcome).toBe('SUCCESS');
  });

  it('dịch vụ AI lỗi thì giữ lời sinh viên, Thử lại bằng cùng mã lượt thì có phản hồi (FR-CONV-08)', async () => {
    const id = randomUUID();
    await turn(student, sessionId, `Em kể thêm được không ${MOCK_FAIL_ONCE}`, id).expect(202);
    const failed = await until(async () => {
      const d = await student.get(`/api/sessions/${sessionId}`);
      return d.body.awaitingRetry ? d.body : null;
    });
    expect(failed.messages.at(-1).speaker).toBe('STUDENT');
    await turn(student, sessionId, 'Lượt mới khi chưa thử lại').expect(409);
    await turn(student, sessionId, `Em kể thêm được không ${MOCK_FAIL_ONCE}`, id).expect(202);
    await until(async () => (await clientReplies(sessionId)) === 3);
    expect(await prisma.aiUsage.count({ where: { sessionId, outcome: 'ERROR' } })).toBe(1);
  });

  it('tín hiệu nguy cơ được ghi thành sự kiện an toàn gắn với lượt (FR-SAFE-01)', async () => {
    await turn(student, sessionId, 'Em có từng nghĩ đến chuyện tự làm hại bản thân không?').expect(202);
    const event = await until(() => prisma.safetyEvent.findFirst({ where: { sessionId }, include: { message: true } }));
    expect(event.level).toBe('HIGH');
    expect(event.message?.speaker).toBe('CLIENT');
  });

  it('kết thúc phiên: đặt hạn lưu 14 ngày, xếp hàng báo cáo, không gửi thêm được', async () => {
    await until(async () => !(await student.get(`/api/sessions/${sessionId}`)).body.aiBusy);
    const res = await student.post(`/api/sessions/${sessionId}/end`).set(CSRF).expect(200);
    expect(res.body.status).toBe('ENDED');
    const row = await prisma.practiceSession.findUniqueOrThrow({ where: { id: sessionId }, include: { assessment: true } });
    const days = (row.retentionUntil!.getTime() - row.endedAt!.getTime()) / 86_400_000;
    expect(Math.round(days)).toBe(14);
    expect(row.assessment?.status).toBe('PENDING');
    await turn(student, sessionId, 'Còn gửi được không?').expect(409);
    const list = await student.get('/api/sessions').expect(200);
    expect(list.body[0]).toMatchObject({ id: sessionId, status: 'ENDED', caseTitle: 'Ca kiểm thử' });
  });

  it('nhận dạng giọng nói trả văn bản, không lưu âm thanh và kiểm tra định dạng', async () => {
    const res = await student.post('/api/sessions').set(CSRF).send({ caseId, acceptedRules: true }).expect(201);
    const id = res.body.id;
    const ok = await student
      .post(`/api/sessions/${id}/speech`)
      .set(CSRF)
      .attach('audio', Buffer.from('am-thanh-gia'), { filename: 'a.webm', contentType: 'audio/webm' })
      .expect(200);
    expect(ok.body.text.length).toBeGreaterThan(0);
    await student
      .post(`/api/sessions/${id}/speech`)
      .set(CSRF)
      .attach('audio', Buffer.from('x'), { filename: 'a.txt', contentType: 'text/plain' })
      .expect(400);
    expect(await prisma.aiUsage.count({ where: { sessionId: id, kind: 'STT' } })).toBe(1);
    await student.post(`/api/sessions/${id}/end`).set(CSRF).expect(200);
  });

  it('phiên quá giờ được tự kết thúc, phiên lâu không hoạt động chuyển sang Bỏ dở (FR-SES-07, FR-SES-08)', async () => {
    const lifecycle = app.get(SessionLifecycleService);
    const sv = await prisma.user.findUniqueOrThrow({ where: { username: 'sv_khac' } });
    const version = await prisma.caseVersion.findFirstOrThrow({ where: { caseId } });
    const overdue = await prisma.practiceSession.create({
      data: { userId: sv.id, caseVersionId: version.id, startedAt: new Date(Date.now() - 60 * 60_000) },
    });
    const idle = await prisma.practiceSession.create({
      data: { userId: sv.id, caseVersionId: version.id, lastActivityAt: new Date(Date.now() - 30 * 60_000) },
    });
    const r = await lifecycle.sweep();
    expect(r.ended).toBeGreaterThanOrEqual(1);
    const [a, b] = await Promise.all([
      prisma.practiceSession.findUniqueOrThrow({ where: { id: overdue.id } }),
      prisma.practiceSession.findUniqueOrThrow({ where: { id: idle.id } }),
    ]);
    expect(a.status).toBe('ENDED');
    expect(b.status).toBe('ABANDONED');
    expect(b.retentionUntil).not.toBeNull();
  });
});
