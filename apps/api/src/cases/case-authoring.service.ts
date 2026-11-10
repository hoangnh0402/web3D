import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  caseEditorSchema,
  missingForPublish,
  SKILL_CODES,
  type AuthoringCase,
  type AuthoringCaseRow,
  type CaseEditorData,
} from '@lab-fourt/shared';
import { AUDIT, AuditService } from '../audit/audit.service';
import type { CaseVersion, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** Dữ liệu biểu mẫu thành hồ sơ ca theo docs/srs/04 mục 5, gửi nguyên cho dịch vụ AI */
export const toProfile = (d: CaseEditorData): Prisma.InputJsonValue => ({
  clientName: d.clientName,
  ...(d.clientAge !== null ? { clientAge: d.clientAge } : {}),
  summary: d.summary,
  background: d.background,
  mainIssue: d.mainIssue,
  learningObjectives: d.learningObjectives.filter(Boolean),
  persona: { traits: d.traits.filter(Boolean), speechStyle: d.speechStyle },
  hiddenInformation: d.hiddenInformation
    .filter((h) => h.content)
    .map((h, i) => ({ id: `h${i + 1}`, content: h.content, unlockCondition: h.unlockCondition })),
  emotionalArc: d.emotionalArc,
  safetyBoundaries: d.safetyBoundaries.filter(Boolean),
  assessmentCriteria: d.assessmentCriteria
    .map((c) => ({ skill: c.skill, observableBehaviors: c.observableBehaviors.filter(Boolean) }))
    .filter((c) => c.observableBehaviors.length),
  ...(d.openingText ? { opening: { text: d.openingText, emotion: d.openingEmotion } } : {}),
});

/** Hồ sơ ca đã lưu thành dữ liệu biểu mẫu. Hồ sơ cũ thiếu trường thì để trống. */
export const fromVersion = (title: string, v: CaseVersion): CaseEditorData => {
  const p = (v.profile ?? {}) as Record<string, unknown>;
  const persona = (p.persona ?? {}) as Record<string, unknown>;
  const opening = (p.opening ?? {}) as Record<string, unknown>;
  return caseEditorSchema.parse({
    title,
    clientName: str(p.clientName),
    clientAge: typeof p.clientAge === 'number' ? p.clientAge : null,
    summary: str(p.summary),
    avatarKey: ['a', 'b', 'c'].includes(v.avatarKey) ? v.avatarKey : 'a',
    difficulty: Math.min(3, Math.max(1, v.difficulty)),
    maxDurationMin: v.maxDurationMin,
    skills: v.skills,
    openingText: str(opening.text),
    openingEmotion: typeof opening.emotion === 'string' ? opening.emotion : 'NEUTRAL',
    background: str(p.background),
    mainIssue: str(p.mainIssue),
    learningObjectives: strings(p.learningObjectives),
    traits: strings(persona.traits),
    speechStyle: str(persona.speechStyle),
    hiddenInformation: (Array.isArray(p.hiddenInformation) ? p.hiddenInformation : []).map((h: Record<string, unknown>) => ({
      content: str(h.content),
      unlockCondition: str(h.unlockCondition),
    })),
    emotionalArc: str(p.emotionalArc),
    safetyBoundaries: strings(p.safetyBoundaries),
    assessmentCriteria: (Array.isArray(p.assessmentCriteria) ? p.assessmentCriteria : [])
      .filter((c: Record<string, unknown>) => SKILL_CODES.includes(c.skill as never))
      .map((c: Record<string, unknown>) => ({ skill: c.skill, observableBehaviors: strings(c.observableBehaviors) })),
    contentReviewed: v.contentReviewStatus === 'APPROVED',
  });
};

const versionData = (d: CaseEditorData) => ({
  profile: toProfile(d),
  rubric: { skills: [...SKILL_CODES], levels: [1, 2, 3, 4] },
  difficulty: d.difficulty,
  skills: d.skills,
  maxDurationMin: d.maxDurationMin,
  avatarKey: d.avatarKey,
  contentReviewStatus: d.contentReviewed ? ('APPROVED' as const) : ('PENDING' as const),
});

/**
 * Soạn ca của giảng viên (FR-CASE-04 đến FR-CASE-08).
 * Phiên bản đã xuất bản không bao giờ bị sửa: sửa ca đã xuất bản sẽ tạo bản nháp phiên bản mới,
 * nên phiên cũ luôn gắn với đúng phiên bản đã dùng.
 */
@Injectable()
export class CaseAuthoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async load(caseId: string) {
    const c = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: { currentVersion: true, versions: { orderBy: { versionNo: 'desc' }, take: 1 } },
    });
    if (!c) throw new NotFoundException('Không tìm thấy ca');
    const latest = c.versions[0]!;
    const draft = latest.publishedAt ? null : latest;
    return { c, latest, draft };
  }

  async list(): Promise<AuthoringCaseRow[]> {
    const rows = await this.prisma.case.findMany({
      include: {
        owner: { select: { fullName: true } },
        currentVersion: true,
        versions: { orderBy: { versionNo: 'desc' }, take: 1 },
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });
    return rows.map((c) => {
      const latest = c.versions[0];
      const shown = latest ?? c.currentVersion;
      return {
        id: c.id,
        title: c.title,
        status: c.status,
        difficulty: shown?.difficulty ?? 1,
        publishedVersionNo: c.currentVersion?.publishedAt ? c.currentVersion.versionNo : null,
        hasDraft: !!latest && !latest.publishedAt,
        contentReviewed: shown?.contentReviewStatus === 'APPROVED',
        ownerName: c.owner.fullName,
        updatedAt: (latest?.updatedAt ?? c.updatedAt).toISOString(),
      };
    });
  }

  async get(caseId: string): Promise<AuthoringCase> {
    const { c, latest, draft } = await this.load(caseId);
    const data = fromVersion(c.title, latest);
    return {
      id: c.id,
      status: c.status,
      publishedVersionNo: c.currentVersion?.publishedAt ? c.currentVersion.versionNo : null,
      draftVersionNo: draft?.versionNo ?? null,
      publishedAt: c.currentVersion?.publishedAt?.toISOString() ?? null,
      data,
      missing: missingForPublish(data),
    };
  }

  async create(lecturerId: string, data: CaseEditorData) {
    const c = await this.prisma.case.create({
      data: { title: data.title, ownerId: lecturerId, status: 'DRAFT', versions: { create: { versionNo: 1, ...versionData(data) } } },
    });
    await this.audit.record({ actorId: lecturerId, action: AUDIT.CASE_SAVED, entityType: 'case', entityId: c.id, after: { versionNo: 1 } });
    return this.get(c.id);
  }

  /** Lưu nháp. Ca đã xuất bản thì tạo phiên bản nháp mới thay vì sửa bản đang dùng. */
  async save(lecturerId: string, caseId: string, data: CaseEditorData) {
    const { c, latest, draft } = await this.load(caseId);
    if (c.status === 'ARCHIVED') throw new ConflictException('Ca đã lưu trữ, hãy khôi phục trước khi sửa');
    if (draft) {
      await this.prisma.caseVersion.update({ where: { id: draft.id }, data: versionData(data) });
    } else {
      await this.prisma.caseVersion.create({ data: { caseId, versionNo: latest.versionNo + 1, ...versionData(data) } });
    }
    await this.prisma.case.update({ where: { id: caseId }, data: { title: data.title } });
    await this.audit.record({
      actorId: lecturerId,
      action: AUDIT.CASE_SAVED,
      entityType: 'case',
      entityId: caseId,
      after: { versionNo: draft?.versionNo ?? latest.versionNo + 1 },
    });
    return this.get(caseId);
  }

  /** Xuất bản bản nháp thành phiên bản không đổi (FR-CASE-08). Phải đủ 8 thành phần. */
  async publish(lecturerId: string, caseId: string) {
    const { c, draft } = await this.load(caseId);
    if (c.status === 'ARCHIVED') throw new ConflictException('Ca đã lưu trữ, hãy khôi phục trước khi xuất bản');
    if (!draft) throw new ConflictException('Không có thay đổi nào cần xuất bản');
    const missing = missingForPublish(fromVersion(c.title, draft));
    if (missing.length) {
      throw new BadRequestException({ statusCode: 400, message: `Còn thiếu: ${missing.join(', ')}`, fields: { missing: missing.join(', ') } });
    }
    await this.prisma.$transaction([
      this.prisma.caseVersion.update({ where: { id: draft.id }, data: { publishedAt: new Date() } }),
      this.prisma.case.update({ where: { id: caseId }, data: { currentVersionId: draft.id, status: 'PUBLISHED' } }),
    ]);
    await this.audit.record({
      actorId: lecturerId,
      action: AUDIT.CASE_PUBLISHED,
      entityType: 'case',
      entityId: caseId,
      after: { versionNo: draft.versionNo },
    });
    return this.get(caseId);
  }

  /** Sao chép thành ca nháp mới của người sao chép */
  async copy(lecturerId: string, caseId: string) {
    const { c, latest } = await this.load(caseId);
    const data = { ...fromVersion(c.title, latest), title: `${c.title} (bản sao)`.slice(0, 200), contentReviewed: false };
    return this.create(lecturerId, data);
  }

  async setArchived(lecturerId: string, caseId: string, archived: boolean) {
    const { c } = await this.load(caseId);
    const status = archived ? 'ARCHIVED' : c.currentVersion?.publishedAt ? 'PUBLISHED' : 'DRAFT';
    await this.prisma.case.update({ where: { id: caseId }, data: { status } });
    await this.audit.record({
      actorId: lecturerId,
      action: AUDIT.CASE_STATUS,
      entityType: 'case',
      entityId: caseId,
      before: { status: c.status },
      after: { status },
    });
    return this.get(caseId);
  }
}
