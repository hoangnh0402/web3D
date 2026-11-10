import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type TestAgent from 'supertest/lib/agent';
import { AssessmentService } from '../src/assessment/assessment.service';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createApp, createUser, CSRF, login, TEST_DB } from './helpers';

/** Giao bài, nộp bài, xem xét của giảng viên (docs/srs/08 AT-15) */
describe.skipIf(!TEST_DB)('Giao bài và giảng viên (tích hợp)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let lecturer: TestAgent;
  let otherLecturer: TestAgent;
  let student: TestAgent;
  let classId: string;
  let otherClassId: string;
  let caseId: string;
  let studentId: string;
  let assignmentId: string;
  let sessionId: string;
  let submissionId: string;

  beforeAll(async () => {
    const ctx = await createApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const gv = await createUser(prisma, ctx.passwords, 'gv_lec', 'LECTURER');
    const gv2 = await createUser(prisma, ctx.passwords, 'gv_lec2', 'LECTURER');
    studentId = (await createUser(prisma, ctx.passwords, 'sv_lec', 'STUDENT')).id;
    await createUser(prisma, ctx.passwords, 'sv_lec_moi', 'STUDENT');
    const cls = await prisma.class.create({
      data: {
        name: 'Lớp A',
        members: { create: [{ userId: gv.id, memberRole: 'LECTURER' }, { userId: studentId, memberRole: 'STUDENT' }] },
      },
    });
    const other = await prisma.class.create({ data: { name: 'Lớp B', members: { create: [{ userId: gv2.id, memberRole: 'LECTURER' }] } } });
    classId = cls.id;
    otherClassId = other.id;
    const c = await prisma.case.create({ data: { title: 'Ca giao bài', ownerId: gv.id, status: 'PUBLISHED' } });
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
    await prisma.case.update({ where: { id: c.id }, data: { currentVersionId: v.id } });
    caseId = c.id;
    lecturer = (await login(app, 'gv_lec')).agent;
    otherLecturer = (await login(app, 'gv_lec2')).agent;
    student = (await login(app, 'sv_lec')).agent;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('giảng viên chỉ giao bài cho lớp mình phụ trách', async () => {
    await lecturer
      .post('/api/lecturer/assignments')
      .set(CSRF)
      .send({ caseId, title: 'Bài sai lớp', classIds: [otherClassId] })
      .expect(400);
    const res = await lecturer
      .post('/api/lecturer/assignments')
      .set(CSRF)
      .send({ caseId, title: 'Bài 1', dueAt: new Date(Date.now() + 86_400_000).toISOString(), classIds: [classId] })
      .expect(201);
    assignmentId = res.body.id;
    await student.get('/api/lecturer/assignments').expect(403);
  });

  it('sinh viên thấy bài được giao và thực hành theo bài', async () => {
    const mine = (await student.get('/api/assignments/mine').expect(200)).body;
    expect(mine[0]).toMatchObject({ id: assignmentId, caseId, submission: null });
    const s = await student.post('/api/sessions').set(CSRF).send({ caseId, acceptedRules: true, assignmentId }).expect(201);
    sessionId = s.body.id;
    await student.post(`/api/sessions/${sessionId}/end`).set(CSRF).expect(200);
  });

  it('chưa có phản tư thì chưa nộp được (FR-REF-02), có rồi thì nộp được và giảng viên thấy tiến độ', async () => {
    await student.post(`/api/sessions/${sessionId}/submit`).set(CSRF).send({ assignmentId }).expect(409);
    await app.get(AssessmentService).generate(sessionId);
    await student
      .put(`/api/sessions/${sessionId}/reflection`)
      .set(CSRF)
      .send({ answers: ['Một', 'Hai', 'Ba'], nextGoal: 'Tóm tắt', submit: true })
      .expect(200);
    const res = await student.post(`/api/sessions/${sessionId}/submit`).set(CSRF).send({ assignmentId }).expect(200);
    expect(res.body.submission).toMatchObject({ status: 'SUBMITTED', isLate: false });

    const progress = (await lecturer.get(`/api/lecturer/assignments/${assignmentId}`).expect(200)).body;
    expect(progress).toMatchObject({ targetCount: 1, submittedCount: 1, awaitingReview: 1 });
    expect(progress.rows[0]).toMatchObject({ username: 'sv_lec', state: 'SUBMITTED' });
    submissionId = progress.rows[0].submissionId;
  });

  it('giảng viên ngoài phạm vi không mở được bài nộp', async () => {
    await otherLecturer.get(`/api/lecturer/submissions/${submissionId}`).expect(404);
    await otherLecturer.get(`/api/lecturer/assignments/${assignmentId}`).expect(404);
  });

  it('đánh giá của giảng viên lưu riêng, không ghi đè AI; sinh viên thấy nhận xét (FR-LEC-03, FR-LEC-04)', async () => {
    const detail = (await lecturer.get(`/api/lecturer/submissions/${submissionId}`).expect(200)).body;
    const aiBefore = detail.report.scores.find((s: { skill: string }) => s.skill === 'ACTIVE_LISTENING')?.level ?? null;
    expect(detail.reflection.answers).toEqual(['Một', 'Hai', 'Ba']);
    const saved = await lecturer
      .put(`/api/lecturer/submissions/${submissionId}/review`)
      .set(CSRF)
      .send({ comment: 'Mở đầu tốt', scores: [{ skill: 'ACTIVE_LISTENING', level: 2, note: 'Cần phản hồi sâu hơn' }] })
      .expect(200);
    expect(saved.body.reviewedAt).not.toBeNull();
    const score = saved.body.report.scores.find((s: { skill: string }) => s.skill === 'ACTIVE_LISTENING');
    expect(score).toMatchObject({ level: aiBefore, lecturerLevel: 2, lecturerNote: 'Cần phản hồi sâu hơn' });
    const report = (await student.get(`/api/sessions/${sessionId}/report`).expect(200)).body;
    expect(report.lecturerComment).toBe('Mở đầu tốt');
  });

  it('thống kê kỹ năng của lớp chỉ dành cho giảng viên phụ trách', async () => {
    const stats = (await lecturer.get(`/api/lecturer/classes/${classId}/stats`).expect(200)).body;
    expect(stats.sessionCount).toBe(1);
    expect(stats.skills).toHaveLength(6);
    await otherLecturer.get(`/api/lecturer/classes/${classId}/stats`).expect(403);
  });

  it('giảng viên thêm, bớt sinh viên trong lớp mình (FR-USR-04)', async () => {
    const after = (await lecturer.post(`/api/lecturer/classes/${classId}/students`).set(CSRF).send({ username: 'sv_lec_moi' }).expect(200))
      .body;
    expect(after.map((m: { username: string }) => m.username)).toContain('sv_lec_moi');
    const moi = after.find((m: { username: string }) => m.username === 'sv_lec_moi');
    await lecturer.delete(`/api/lecturer/classes/${classId}/students/${moi.userId}`).set(CSRF).expect(204);
    await otherLecturer.post(`/api/lecturer/classes/${classId}/students`).set(CSRF).send({ username: 'sv_lec_moi' }).expect(403);
  });

  it('xuất báo cáo tổng hợp trong phạm vi, có ghi nhật ký, không chứa nội dung hội thoại (FR-LEC-06)', async () => {
    const res = await lecturer.get(`/api/lecturer/assignments/${assignmentId}/export`).expect(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('tien-do-bai-1.csv');
    // Bỏ ký tự BOM ở đầu tệp rồi tách theo CRLF
    const text = res.text.charCodeAt(0) === 0xfeff ? res.text.slice(1) : res.text;
    const lines = text.trim().split(String.fromCharCode(13, 10));
    expect(lines[0]).toContain('Họ tên,Tên đăng nhập,Trạng thái');
    expect(lines[1]).toContain('sv_lec');
    expect(lines[1]).toContain('Đã nộp');
    expect(res.text).not.toContain('Một');
    const stats = await lecturer.get(`/api/lecturer/classes/${classId}/export`).expect(200);
    expect(stats.text).toContain('Lắng nghe chủ động');
    expect(await prisma.auditLog.count({ where: { action: 'report.exported' } })).toBe(2);
    await otherLecturer.get(`/api/lecturer/assignments/${assignmentId}/export`).expect(404);
    await otherLecturer.get(`/api/lecturer/classes/${classId}/export`).expect(403);
    await student.get(`/api/lecturer/classes/${classId}/export`).expect(403);
  });

  it('sinh viên xóa phiên đã nộp thì bài chuyển sang rút, giảng viên không mở được nữa (OI-12)', async () => {
    await student.delete(`/api/sessions/${sessionId}`).set(CSRF).expect(204);
    const row = await prisma.submission.findUniqueOrThrow({ where: { id: submissionId } });
    expect(row.status).toBe('WITHDRAWN');
    await lecturer.get(`/api/lecturer/submissions/${submissionId}`).expect(404);
    const progress = (await lecturer.get(`/api/lecturer/assignments/${assignmentId}`).expect(200)).body;
    expect(progress.rows[0].state).toBe('WITHDRAWN');
    await student.get(`/api/sessions/${sessionId}`).expect(404);
  });
});
