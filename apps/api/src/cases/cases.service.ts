import { Injectable, NotFoundException } from '@nestjs/common';
import type { AvatarKey, CaseDetail, CaseSummary, PracticeStatus } from '@lab-fourt/shared';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { readProfile } from './case-profile';

const withVersion = { currentVersion: true } satisfies Prisma.CaseInclude;
type CaseWithVersion = Prisma.CaseGetPayload<{ include: typeof withVersion }>;

@Injectable()
export class CasesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ca đã xuất bản, kèm trạng thái thực hành của người dùng (FR-CASE-01, FR-CASE-07) */
  async listPublished(userId: string): Promise<CaseSummary[]> {
    const cases = await this.prisma.case.findMany({
      where: { status: 'PUBLISHED', currentVersion: { publishedAt: { not: null } } },
      include: withVersion,
      orderBy: { createdAt: 'asc' },
    });
    const sessions = await this.prisma.practiceSession.findMany({
      where: { userId, recordStatus: 'ACTIVE', caseVersion: { caseId: { in: cases.map((c) => c.id) } } },
      select: { status: true, caseVersion: { select: { caseId: true } } },
    });
    const statusOf = (caseId: string): PracticeStatus => {
      const mine = sessions.filter((s) => s.caseVersion.caseId === caseId);
      if (mine.some((s) => s.status === 'IN_PROGRESS')) return 'IN_PROGRESS';
      return mine.length ? 'PRACTICED' : 'NOT_STARTED';
    };
    return cases.map((c) => this.toSummary(c, statusOf(c.id)));
  }

  /** Trang chuẩn bị. Không trả thông tin ẩn, tính cách hay ranh giới dành cho dịch vụ AI. */
  async getPublished(caseId: string, userId: string): Promise<CaseDetail> {
    const c = await this.prisma.case.findFirst({
      where: { id: caseId, status: 'PUBLISHED', currentVersion: { publishedAt: { not: null } } },
      include: withVersion,
    });
    if (!c?.currentVersion) throw new NotFoundException('Không tìm thấy ca hoặc ca chưa được xuất bản');
    const active = await this.prisma.practiceSession.findFirst({
      where: { userId, recordStatus: 'ACTIVE', caseVersion: { caseId } },
      orderBy: { startedAt: 'desc' },
      select: { status: true },
    });
    const status: PracticeStatus = !active ? 'NOT_STARTED' : active.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PRACTICED';
    const profile = readProfile(c.currentVersion.profile);
    return {
      ...this.toSummary(c, status),
      versionNo: c.currentVersion.versionNo,
      clientAge: profile.clientAge ?? null,
      background: profile.background,
      mainIssue: profile.mainIssue,
      learningObjectives: profile.learningObjectives,
    };
  }

  private toSummary(c: CaseWithVersion, practiceStatus: PracticeStatus): CaseSummary {
    const v = c.currentVersion!;
    const profile = readProfile(v.profile);
    return {
      id: c.id,
      title: c.title,
      summary: profile.summary,
      clientName: profile.clientName,
      avatarKey: v.avatarKey as AvatarKey,
      difficulty: v.difficulty,
      skills: v.skills,
      maxDurationMin: v.maxDurationMin,
      contentReviewed: v.contentReviewStatus === 'APPROVED',
      practiceStatus,
    };
  }
}
