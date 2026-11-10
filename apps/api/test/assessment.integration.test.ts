import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type TestAgent from 'supertest/lib/agent';
import { MOCK_ASSESS_FAIL, MOCK_FAKE_EVIDENCE } from '../src/ai-gateway/mock-ai.gateway';
import { ASSESS_LIMITS, AssessmentService } from '../src/assessment/assessment.service';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createApp, createUser, CSRF, login, TEST_DB } from './helpers';

/** Báo cáo sau phiên và phản tư (docs/srs/08 AT-01, AT-05, AT-11) */
describe.skipIf(!TEST_DB)('Báo cáo và phản tư (tích hợp)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let assessments: AssessmentService;
  let student: TestAgent;
  let studentId: string;
  let versionId: string;

  beforeAll(async () => {
    ASSESS_LIMITS.backoffMs = 10;
    const ctx = await createApp();
    app = ctx.app;
    prisma = ctx.prisma;
    assessments = app.get(AssessmentService);
    const owner = await createUser(prisma, ctx.passwords, 'gv_rpt', 'LECTURER');
    studentId = (await createUser(prisma, ctx.passwords, 'sv_rpt', 'STUDENT')).id;
    await createUser(prisma, ctx.passwords, 'sv_rpt_khac', 'STUDENT');
    await createUser(prisma, ctx.passwords, 'qtv_rpt', 'ADMIN');
    const c = await prisma.case.create({ data: { title: 'Ca báo cáo', ownerId: owner.id, status: 'PUBLISHED' } });
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
    student = (await login(app, 'sv_rpt')).agent;
  });

  afterAll(async () => {
    await app?.close();
  });

  /** Phiên đã kết thúc với các lời cho trước, báo cáo ở trạng thái chờ */
  const endedSession = async (lines: string[]) => {
    const s = await prisma.practiceSession.create({
      data: {
        userId: studentId,
        caseVersionId: versionId,
        status: 'ENDED',
        endedAt: new Date(),
        retentionUntil: new Date(Date.now() + 14 * 86_400_000),
        messages: {
          create: [
            { seq: 1, speaker: 'CLIENT', content: 'Dạ, em chào anh chị.' },
            ...lines.flatMap((content, i) => [
              { seq: i * 2 + 2, speaker: 'STUDENT' as const, content, inputMode: 'TEXT' as const },
              { seq: i * 2 + 3, speaker: 'CLIENT' as const, content: 'Dạ vâng.' },
            ]),
          ],
        },
        assessment: { create: { status: 'PENDING' } },
      },
    });
    return s.id;
  };

  it('tạo báo cáo đủ 6 kỹ năng, dẫn chứng khớp transcript, kỹ năng thiếu dữ liệu không gán mức', async () => {
    const id = await endedSession(['Chào em, hôm nay em muốn chia sẻ điều gì?', 'Nghe em kể, có vẻ em đang rất lo lắng.']);
    expect(await assessments.generate(id)).toBe('READY');
    // Gọi lại khi đã xong thì không làm gì
    expect(await assessments.generate(id)).toBeNull();
    const report = (await student.get(`/api/sessions/${id}/report`).expect(200)).body;
    expect(report.status).toBe('READY');
    expect(report.scores).toHaveLength(6);
    const listening = report.scores.find((s: { skill: string }) => s.skill === 'ACTIVE_LISTENING');
    expect(listening.level).toBe(3);
    expect(listening.evidence[0].seq).toBe(2);
    const autonomy = report.scores.find((s: { skill: string }) => s.skill === 'AUTONOMY');
    expect(autonomy).toMatchObject({ level: null, evidence: [] });
    expect(report.strengths.length).toBeGreaterThanOrEqual(2);
    expect(report.reflectionQuestions.length).toBeGreaterThan(0);
  });

  it('loại dẫn chứng không có thật và đánh dấu kỹ năng cần xem lại (AT-11)', async () => {
    const id = await endedSession([`Chào em ${MOCK_FAKE_EVIDENCE}`, 'Em có thể kể thêm không?']);
    await assessments.generate(id);
    const report = (await student.get(`/api/sessions/${id}/report`).expect(200)).body;
    const empathy = report.scores.find((s: { skill: string }) => s.skill === 'EMPATHY');
    expect(empathy.needsReview).toBe(true);
    expect(empathy.evidence).toHaveLength(0);
  });

  it('báo cáo lỗi được ghi trạng thái lỗi, chỉ quản trị viên chạy lại được (AT-05, FR-RPT-02)', async () => {
    const id = await endedSession([`Chào em ${MOCK_ASSESS_FAIL}`]);
    expect(await assessments.generate(id)).toBe('FAILED');
    expect((await student.get(`/api/sessions/${id}/report`).expect(200)).body.status).toBe('FAILED');
    await student.post(`/api/assessments/${id}/rerun`).set(CSRF).expect(403);
    const { agent: admin } = await login(app, 'qtv_rpt');
    await admin.post(`/api/assessments/${id}/rerun`).set(CSRF).expect(202);
    await admin.post(`/api/assessments/${id}/rerun`).set(CSRF).expect(409);
    expect(await assessments.generate(id)).toBe('READY');
    expect(await prisma.auditLog.count({ where: { action: 'assessment.rerun', entityId: id } })).toBe(1);
  });

  it('sinh viên khác không xem được báo cáo; phiên chưa kết thúc chưa có báo cáo', async () => {
    const id = await endedSession(['Chào em']);
    const { agent: other } = await login(app, 'sv_rpt_khac');
    await other.get(`/api/sessions/${id}/report`).expect(404);
    const running = await prisma.practiceSession.create({ data: { userId: studentId, caseVersionId: versionId } });
    await student.get(`/api/sessions/${running.id}/report`).expect(409);
    await prisma.practiceSession.update({ where: { id: running.id }, data: { status: 'ENDED' } });
  });

  it('phản tư: lưu nháp, không hoàn thành được khi thiếu câu trả lời, hoàn thành thì ghi thời điểm (FR-REF-01)', async () => {
    const id = await endedSession(['Chào em, hôm nay em muốn chia sẻ điều gì?']);
    await assessments.generate(id);
    const empty = (await student.get(`/api/sessions/${id}/reflection`).expect(200)).body;
    expect(empty.questions).toHaveLength(3);
    expect(empty.submittedAt).toBeNull();

    const draft = await student
      .put(`/api/sessions/${id}/reflection`)
      .set(CSRF)
      .send({ answers: ['Câu một', ''], nextGoal: '' })
      .expect(200);
    expect(draft.body.answers).toEqual(['Câu một', '', '']);
    expect(draft.body.submittedAt).toBeNull();

    await student.put(`/api/sessions/${id}/reflection`).set(CSRF).send({ answers: ['Câu một', ''], nextGoal: '', submit: true }).expect(400);
    const done = await student
      .put(`/api/sessions/${id}/reflection`)
      .set(CSRF)
      .send({ answers: ['Một', 'Hai', 'Ba'], nextGoal: 'Tóm tắt trước khi kết thúc', submit: true })
      .expect(200);
    expect(done.body.submittedAt).not.toBeNull();
  });
});
