import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type TestAgent from 'supertest/lib/agent';
import { AuditService } from '../src/audit/audit.service';
import type { PrismaService } from '../src/prisma/prisma.service';
import { RetentionService } from '../src/worker/retention.service';
import { createApp, createUser, CSRF, login, TEST_DB } from './helpers';

const DAY = 86_400_000;

/** Vòng đời dữ liệu phiên và phạm vi đọc của giảng viên (docs/srs/08 AT-10, AT-13, AT-14) */
describe.skipIf(!TEST_DB)('Vòng đời dữ liệu phiên (tích hợp)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let retention: RetentionService;
  let student: TestAgent;
  let lecturer: TestAgent;
  let admin: TestAgent;
  let studentId: string;
  let versionId: string;

  beforeAll(async () => {
    const ctx = await createApp();
    app = ctx.app;
    prisma = ctx.prisma;
    // Worker chạy trong tiến trình riêng nên dựng dịch vụ lưu trữ trực tiếp trên CSDL kiểm thử
    retention = new RetentionService(prisma, app.get(AuditService));
    const gv = await createUser(prisma, ctx.passwords, 'gv_data', 'LECTURER');
    studentId = (await createUser(prisma, ctx.passwords, 'sv_data', 'STUDENT')).id;
    await createUser(prisma, ctx.passwords, 'qtv_data', 'ADMIN');
    // Giảng viên phụ trách đúng lớp của sinh viên, để kiểm tra luyện tự do vẫn bị chặn
    await prisma.class.create({
      data: {
        name: 'Lớp dữ liệu',
        members: { create: [{ userId: gv.id, memberRole: 'LECTURER' }, { userId: studentId, memberRole: 'STUDENT' }] },
      },
    });
    const c = await prisma.case.create({ data: { title: 'Ca vòng đời dữ liệu', ownerId: gv.id, status: 'PUBLISHED' } });
    const v = await prisma.caseVersion.create({
      data: {
        caseId: c.id,
        versionNo: 1,
        profile: { clientName: 'Hà Linh' },
        rubric: {},
        difficulty: 1,
        skills: ['EMPATHY'],
        maxDurationMin: 25,
        avatarKey: 'a',
        publishedAt: new Date(),
      },
    });
    versionId = v.id;
    student = (await login(app, 'sv_data')).agent;
    lecturer = (await login(app, 'gv_data')).agent;
    admin = (await login(app, 'qtv_data')).agent;
  });

  afterAll(async () => {
    await app?.close();
  });

  /** Phiên luyện tự do đã kết thúc, có transcript và báo cáo */
  const endedSession = (retentionUntil: Date) =>
    prisma.practiceSession.create({
      data: {
        userId: studentId,
        caseVersionId: versionId,
        status: 'ENDED',
        endedAt: new Date(),
        retentionUntil,
        messages: {
          create: [
            { seq: 1, speaker: 'CLIENT', content: 'Dạ, em chào anh chị.' },
            { seq: 2, speaker: 'STUDENT', content: 'Chào em, hôm nay em muốn chia sẻ điều gì?', inputMode: 'TEXT' },
          ],
        },
        assessment: { create: { status: 'READY', summary: 'Tóm tắt thử' } },
      },
    });

  const listedIds = async () => (await student.get('/api/sessions').expect(200)).body.map((s: { id: string }) => s.id);

  it('giảng viên phụ trách lớp vẫn không mở được phiên luyện tự do của sinh viên (AT-10, OI-11)', async () => {
    const s = await endedSession(new Date(Date.now() + 14 * DAY));
    await lecturer.get(`/api/sessions/${s.id}`).expect(404);
    await lecturer.get(`/api/sessions/${s.id}/report`).expect(404);
    await lecturer.get(`/api/sessions/${s.id}/reflection`).expect(404);
    expect(await prisma.auditLog.count({ where: { action: 'access.denied', entityId: s.id } })).toBeGreaterThan(0);
  });

  it('sinh viên xóa phiên thì phiên ẩn nhưng còn nguyên trong CSDL; quản trị viên khôi phục được (AT-13)', async () => {
    const s = await endedSession(new Date(Date.now() + 14 * DAY));
    expect(await listedIds()).toContain(s.id);

    await student.delete(`/api/sessions/${s.id}`).set(CSRF).expect(204);
    expect(await listedIds()).not.toContain(s.id);
    await student.get(`/api/sessions/${s.id}`).expect(404);
    await student.get(`/api/sessions/${s.id}/report`).expect(404);

    // Xóa mềm: transcript và báo cáo vẫn còn
    const kept = await prisma.practiceSession.findUniqueOrThrow({
      where: { id: s.id },
      include: { messages: true, assessment: true },
    });
    expect(kept).toMatchObject({ recordStatus: 'DELETED', deletedById: studentId });
    expect(kept.deletedAt).not.toBeNull();
    expect(kept.messages).toHaveLength(2);
    expect(kept.assessment?.status).toBe('READY');
    expect(await prisma.auditLog.count({ where: { action: 'data.session.deleted', entityId: s.id } })).toBe(1);

    // Quản trị viên thấy phiên ở trạng thái Đã xóa và khôi phục kèm hạn mới
    const deleted = (await admin.get('/api/admin/sessions?recordStatus=DELETED').expect(200)).body;
    expect(deleted.map((r: { id: string }) => r.id)).toContain(s.id);
    const until = new Date(Date.now() + 7 * DAY).toISOString();
    await admin.patch(`/api/admin/sessions/${s.id}/record-status`).set(CSRF).send({ recordStatus: 'ACTIVE', retentionUntil: until }).expect(204);

    expect(await listedIds()).toContain(s.id);
    const report = (await student.get(`/api/sessions/${s.id}/report`).expect(200)).body;
    expect(report.status).toBe('READY');
    const restored = await prisma.practiceSession.findUniqueOrThrow({ where: { id: s.id } });
    expect(restored).toMatchObject({ recordStatus: 'ACTIVE', deletedAt: null, deletedById: null });
    expect(restored.retentionUntil?.toISOString()).toBe(until);
    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: 'data.session.status', entityId: s.id } });
    expect(log.before).toMatchObject({ recordStatus: 'DELETED' });
    expect(log.after).toMatchObject({ recordStatus: 'ACTIVE' });
  });

  it('quá hạn 14 ngày thì phiên chuyển Đã lưu trữ, dữ liệu còn nguyên, phiên còn hạn không bị đụng tới (AT-14)', async () => {
    const now = new Date();
    const expired = await endedSession(new Date(now.getTime() - DAY));
    const fresh = await endedSession(new Date(now.getTime() + DAY));
    // Giả lập thời điểm phiên còn hạn vừa hết hạn. Không đẩy xa hơn để khỏi lưu trữ phiên
    // hạn 14 ngày của các tệp kiểm thử khác chạy song song trên cùng CSDL
    const later = new Date(now.getTime() + 2 * DAY);

    await retention.archiveExpired(now);
    expect((await prisma.practiceSession.findUniqueOrThrow({ where: { id: expired.id } })).recordStatus).toBe('ARCHIVED');
    expect((await prisma.practiceSession.findUniqueOrThrow({ where: { id: fresh.id } })).recordStatus).toBe('ACTIVE');
    expect(await listedIds()).not.toContain(expired.id);
    expect(await listedIds()).toContain(fresh.id);
    await student.get(`/api/sessions/${expired.id}`).expect(404);

    const archived = await prisma.practiceSession.findUniqueOrThrow({
      where: { id: expired.id },
      include: { messages: true, assessment: true },
    });
    expect(archived.messages).toHaveLength(2);
    expect(archived.assessment?.status).toBe('READY');
    expect(await prisma.auditLog.count({ where: { action: 'data.session.archived', entityId: expired.id } })).toBe(1);

    // Chạy lại không lưu trữ lần nữa; tới khi phiên còn hạn quá hạn thì mới lưu trữ phiên đó
    await retention.archiveExpired(now);
    expect(await prisma.auditLog.count({ where: { action: 'data.session.archived', entityId: expired.id } })).toBe(1);
    await retention.archiveExpired(later);
    expect((await prisma.practiceSession.findUniqueOrThrow({ where: { id: fresh.id } })).recordStatus).toBe('ARCHIVED');
  });
});
