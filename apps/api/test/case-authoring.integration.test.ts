import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type TestAgent from 'supertest/lib/agent';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createApp, createUser, CSRF, login, TEST_DB } from './helpers';

const FULL = {
  title: 'Ca soạn thử',
  clientName: 'Tuấn Kiệt',
  summary: 'Mâu thuẫn trong mối quan hệ',
  skills: ['EMPATHY'],
  openingText: 'Chào anh chị.',
  background: 'Vừa chia tay',
  mainIssue: 'Thấy bị bỏ rơi',
  learningObjectives: ['Thấu cảm'],
  traits: ['phòng thủ'],
  hiddenInformation: [{ content: 'Tự trách', unlockCondition: 'Khi được hỏi mở' }],
  emotionalArc: 'Phòng thủ sang cởi mở',
  safetyBoundaries: ['Không phán xét'],
  assessmentCriteria: [{ skill: 'EMPATHY', observableBehaviors: ['Ghi nhận cảm xúc'] }],
};

/** Soạn ca và phiên bản (FR-CASE-04 đến FR-CASE-08) */
describe.skipIf(!TEST_DB)('Soạn ca (tích hợp)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let lecturer: TestAgent;
  let student: TestAgent;
  let caseId: string;

  beforeAll(async () => {
    const ctx = await createApp();
    app = ctx.app;
    prisma = ctx.prisma;
    await createUser(prisma, ctx.passwords, 'gv_case', 'LECTURER');
    await createUser(prisma, ctx.passwords, 'sv_case', 'STUDENT');
    lecturer = (await login(app, 'gv_case')).agent;
    student = (await login(app, 'sv_case')).agent;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('sinh viên không soạn được ca', async () => {
    await student.get('/api/lecturer/cases').expect(403);
    await student.post('/api/lecturer/cases').set(CSRF).send({ title: 'x' }).expect(403);
  });

  it('lưu nháp khi chưa đủ, xuất bản bị từ chối và nêu mục thiếu', async () => {
    const res = await lecturer.post('/api/lecturer/cases').set(CSRF).send({ title: 'Ca soạn thử' }).expect(201);
    caseId = res.body.id;
    expect(res.body).toMatchObject({ status: 'DRAFT', draftVersionNo: 1, publishedVersionNo: null });
    expect(res.body.missing).toContain('Bối cảnh');
    const refused = await lecturer.post(`/api/lecturer/cases/${caseId}/publish`).set(CSRF).expect(400);
    expect(refused.body.message).toContain('Bối cảnh');
    // Ca nháp không xuất hiện với sinh viên (FR-CASE-07)
    const list = (await student.get('/api/cases').expect(200)).body as { id: string }[];
    expect(list.some((c) => c.id === caseId)).toBe(false);
  });

  it('xuất bản tạo phiên bản không đổi; sửa sau đó tạo bản nháp mới, phiên cũ giữ phiên bản cũ (FR-CASE-08)', async () => {
    await lecturer.put(`/api/lecturer/cases/${caseId}`).set(CSRF).send(FULL).expect(200);
    const pub = await lecturer.post(`/api/lecturer/cases/${caseId}/publish`).set(CSRF).expect(200);
    expect(pub.body).toMatchObject({ status: 'PUBLISHED', publishedVersionNo: 1, draftVersionNo: null });
    const v1 = await prisma.caseVersion.findFirstOrThrow({ where: { caseId, versionNo: 1 } });

    const s = await student.post('/api/sessions').set(CSRF).send({ caseId, acceptedRules: true }).expect(201);
    const edited = await lecturer.put(`/api/lecturer/cases/${caseId}`).set(CSRF).send({ ...FULL, background: 'Bối cảnh mới' }).expect(200);
    expect(edited.body).toMatchObject({ publishedVersionNo: 1, draftVersionNo: 2 });
    const v1After = await prisma.caseVersion.findUniqueOrThrow({ where: { id: v1.id } });
    expect((v1After.profile as { background: string }).background).toBe('Vừa chia tay');

    await lecturer.post(`/api/lecturer/cases/${caseId}/publish`).set(CSRF).expect(200);
    const session = await prisma.practiceSession.findUniqueOrThrow({ where: { id: s.body.id } });
    expect(session.caseVersionId).toBe(v1.id);
    await student.post(`/api/sessions/${s.body.id}/end`).set(CSRF).expect(200);
  });

  it('sao chép thành ca nháp mới; lưu trữ thì sinh viên không thấy nữa', async () => {
    const copy = await lecturer.post(`/api/lecturer/cases/${caseId}/copy`).set(CSRF).expect(201);
    expect(copy.body).toMatchObject({ status: 'DRAFT', draftVersionNo: 1 });
    expect(copy.body.data.title).toContain('(bản sao)');
    await lecturer.post(`/api/lecturer/cases/${caseId}/archive`).set(CSRF).expect(200);
    const list = (await student.get('/api/cases').expect(200)).body as { id: string }[];
    expect(list.some((c) => c.id === caseId)).toBe(false);
    await lecturer.put(`/api/lecturer/cases/${caseId}`).set(CSRF).send(FULL).expect(409);
    const restored = await lecturer.post(`/api/lecturer/cases/${caseId}/restore`).set(CSRF).expect(200);
    expect(restored.body.status).toBe('PUBLISHED');
  });
});
