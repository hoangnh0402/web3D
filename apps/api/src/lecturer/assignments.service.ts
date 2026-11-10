import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AssignmentProgress,
  CreateAssignmentInput,
  LecturerAssignment,
  MyAssignment,
  ProgressRow,
} from '@lab-fourt/shared';
import { AUDIT, AuditService } from '../audit/audit.service';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { readProfile } from '../cases/case-profile';
import { LecturerScopeService } from './lecturer-scope.service';

const forLecturer = {
  caseVersion: { include: { case: true } },
  targets: { include: { class: { include: { members: { where: { memberRole: 'STUDENT' }, include: { user: true } } } } } },
  submissions: { include: { session: { include: { assessment: { select: { reviewedAt: true } } } } } },
} satisfies Prisma.AssignmentInclude;
type LoadedAssignment = Prisma.AssignmentGetPayload<{ include: typeof forLecturer }>;

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: LecturerScopeService,
    private readonly audit: AuditService,
  ) {}

  /** Bài được giao của sinh viên, qua lớp hoặc trực tiếp (FR-ASG-02) */
  async mine(userId: string): Promise<MyAssignment[]> {
    const rows = await this.prisma.assignment.findMany({
      where: {
        status: { in: ['OPEN', 'CLOSED'] },
        targets: { some: { OR: [{ userId }, { class: { members: { some: { userId, memberRole: 'STUDENT' } } } }] } },
      },
      include: {
        caseVersion: { include: { case: true } },
        submissions: { where: { studentId: userId, status: 'SUBMITTED' }, take: 1 },
      },
      orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
    });
    return rows.map((a) => {
      const sub = a.submissions[0];
      return {
        id: a.id,
        title: a.title,
        dueAt: a.dueAt?.toISOString() ?? null,
        status: a.status,
        caseId: a.caseVersion.caseId,
        caseTitle: a.caseVersion.case.title,
        clientName: readProfile(a.caseVersion.profile).clientName,
        maxDurationMin: a.caseVersion.maxDurationMin,
        submission: sub
          ? { sessionId: sub.sessionId, status: sub.status, isLate: sub.isLate, submittedAt: sub.submittedAt.toISOString() }
          : null,
      };
    });
  }

  /** Giao ca đang xuất bản cho lớp hoặc sinh viên trong phạm vi (FR-ASG-01) */
  async create(lecturerId: string, input: CreateAssignmentInput & { classIds: string[]; studentIds: string[] }) {
    const classes = await this.scope.classIds(lecturerId);
    if (input.classIds.some((id) => !classes.includes(id))) throw new BadRequestException('Có lớp không thuộc phạm vi của bạn');
    const students = await this.scope.studentIds(lecturerId);
    if (input.studentIds.some((id) => !students.includes(id))) {
      throw new BadRequestException('Có sinh viên không thuộc lớp bạn phụ trách');
    }
    const c = await this.prisma.case.findFirst({
      where: { id: input.caseId, status: 'PUBLISHED', currentVersion: { publishedAt: { not: null } } },
      select: { currentVersionId: true },
    });
    if (!c?.currentVersionId) throw new BadRequestException('Chỉ giao được ca đã xuất bản');
    const a = await this.prisma.assignment.create({
      data: {
        caseVersionId: c.currentVersionId,
        createdById: lecturerId,
        title: input.title,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        targets: {
          create: [
            ...input.classIds.map((classId) => ({ targetType: 'CLASS' as const, classId })),
            ...input.studentIds.map((userId) => ({ targetType: 'USER' as const, userId })),
          ],
        },
      },
    });
    await this.audit.record({ actorId: lecturerId, action: AUDIT.ASSIGNMENT_CREATED, entityType: 'assignment', entityId: a.id });
    return { id: a.id };
  }

  async list(lecturerId: string): Promise<LecturerAssignment[]> {
    const rows = await this.prisma.assignment.findMany({
      where: { createdById: lecturerId, status: { not: 'ARCHIVED' } },
      include: forLecturer,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((a) => this.summary(a, this.targetIds(a)));
  }

  /** Tiến độ từng sinh viên của một bài (FR-LEC-01) */
  async progress(lecturerId: string, assignmentId: string): Promise<AssignmentProgress> {
    const a = await this.prisma.assignment.findFirst({ where: { id: assignmentId, createdById: lecturerId }, include: forLecturer });
    if (!a) throw new NotFoundException('Không tìm thấy bài được giao');
    const ids = this.targetIds(a);
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, fullName: true, username: true },
      orderBy: { fullName: 'asc' },
    });
    const sessions = await this.prisma.practiceSession.findMany({
      where: { assignmentId, userId: { in: ids }, recordStatus: { not: 'DELETED' } },
      select: { userId: true, status: true },
    });
    const rows: ProgressRow[] = users.map((u) => {
      const sub = a.submissions.find((s) => s.studentId === u.id && s.status === 'SUBMITTED')
        ?? a.submissions.find((s) => s.studentId === u.id);
      const mine = sessions.filter((s) => s.userId === u.id);
      const state: ProgressRow['state'] = sub
        ? sub.status
        : mine.some((s) => s.status !== 'ENDED')
          ? 'IN_PROGRESS'
          : mine.length
            ? 'NOT_SUBMITTED'
            : 'NOT_STARTED';
      return {
        userId: u.id,
        fullName: u.fullName,
        username: u.username,
        state,
        isLate: sub?.isLate ?? false,
        submittedAt: sub?.submittedAt.toISOString() ?? null,
        submissionId: sub?.status === 'SUBMITTED' ? sub.id : null,
        reviewed: !!sub?.session.assessment?.reviewedAt,
      };
    });
    return { ...this.summary(a, ids), rows };
  }

  async setStatus(lecturerId: string, assignmentId: string, status: 'OPEN' | 'CLOSED') {
    const r = await this.prisma.assignment.updateMany({ where: { id: assignmentId, createdById: lecturerId }, data: { status } });
    if (!r.count) throw new NotFoundException('Không tìm thấy bài được giao');
    await this.audit.record({
      actorId: lecturerId,
      action: AUDIT.ASSIGNMENT_STATUS,
      entityType: 'assignment',
      entityId: assignmentId,
      after: { status },
    });
  }

  /** Sinh viên được giao: giao trực tiếp cộng sinh viên của các lớp được giao */
  private targetIds(a: LoadedAssignment) {
    const ids = new Set<string>();
    for (const t of a.targets) {
      if (t.userId) ids.add(t.userId);
      for (const m of t.class?.members ?? []) ids.add(m.userId);
    }
    return [...ids];
  }

  private summary(a: LoadedAssignment, targets: string[]): LecturerAssignment {
    const submitted = a.submissions.filter((s) => s.status === 'SUBMITTED' && targets.includes(s.studentId));
    return {
      id: a.id,
      title: a.title,
      dueAt: a.dueAt?.toISOString() ?? null,
      status: a.status,
      caseTitle: a.caseVersion.case.title,
      targetCount: targets.length,
      submittedCount: submitted.length,
      lateCount: submitted.filter((s) => s.isLate).length,
      awaitingReview: submitted.filter((s) => !s.session.assessment?.reviewedAt).length,
      createdAt: a.createdAt.toISOString(),
    };
  }
}
