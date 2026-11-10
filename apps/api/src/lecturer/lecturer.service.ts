import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  SKILL_CODES,
  type ClassMember,
  type ClassSkillStats,
  type LecturerClass,
  type ReviewInput,
  type SubmissionReview,
} from '@lab-fourt/shared';
import { AUDIT, AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReportService } from '../assessment/report.service';
import { sessionInclude } from '../sessions/session-access.service';
import { toMessageDto } from '../sessions/session.mapper';
import { LecturerScopeService } from './lecturer-scope.service';

@Injectable()
export class LecturerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: LecturerScopeService,
    private readonly reports: ReportService,
    private readonly audit: AuditService,
  ) {}

  async classes(lecturerId: string): Promise<LecturerClass[]> {
    const rows = await this.prisma.class.findMany({
      where: { id: { in: await this.scope.classIds(lecturerId) } },
      include: { _count: { select: { members: { where: { memberRole: 'STUDENT' } } } } },
      orderBy: { name: 'asc' },
    });
    return rows.map((c) => ({ id: c.id, name: c.name, term: c.term, studentCount: c._count.members }));
  }

  async members(lecturerId: string, classId: string): Promise<ClassMember[]> {
    await this.scope.assertClass(lecturerId, classId);
    const rows = await this.prisma.classMember.findMany({
      where: { classId, memberRole: 'STUDENT' },
      include: { user: { select: { id: true, username: true, fullName: true } } },
      orderBy: { user: { fullName: 'asc' } },
    });
    return rows.map((m) => ({ userId: m.user.id, username: m.user.username, fullName: m.user.fullName }));
  }

  /** Giảng viên thêm sinh viên đã có tài khoản vào lớp mình phụ trách (FR-USR-04) */
  async addStudent(lecturerId: string, classId: string, username: string) {
    await this.scope.assertClass(lecturerId, classId);
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || user.role !== 'STUDENT' || user.status === 'DISABLED') {
      throw new BadRequestException('Không tìm thấy sinh viên có tên đăng nhập này');
    }
    await this.prisma.classMember.upsert({
      where: { classId_userId: { classId, userId: user.id } },
      update: {},
      create: { classId, userId: user.id, memberRole: 'STUDENT' },
    });
    await this.audit.record({
      actorId: lecturerId,
      action: AUDIT.CLASS_MEMBER_ADDED,
      entityType: 'class',
      entityId: classId,
      after: { userId: user.id },
    });
    return this.members(lecturerId, classId);
  }

  async removeStudent(lecturerId: string, classId: string, userId: string) {
    await this.scope.assertClass(lecturerId, classId);
    const r = await this.prisma.classMember.deleteMany({ where: { classId, userId, memberRole: 'STUDENT' } });
    if (!r.count) throw new NotFoundException('Sinh viên không có trong lớp');
    await this.audit.record({
      actorId: lecturerId,
      action: AUDIT.CLASS_MEMBER_REMOVED,
      entityType: 'class',
      entityId: classId,
      before: { userId },
    });
  }

  /**
   * Bài nộp trong phạm vi (FR-LEC-02): bài do giảng viên giao hoặc giao cho lớp mình phụ trách,
   * và phiên còn Đang hiệu lực. Phiên luyện tự do không bao giờ mở được ở đây (OI-11).
   */
  private async loadSubmission(lecturerId: string, submissionId: string) {
    const classes = await this.scope.classIds(lecturerId);
    const sub = await this.prisma.submission.findFirst({
      where: {
        id: submissionId,
        status: 'SUBMITTED',
        session: { recordStatus: 'ACTIVE' },
        assignment: { OR: [{ createdById: lecturerId }, { targets: { some: { classId: { in: classes } } } }] },
      },
      include: { assignment: true, student: { select: { fullName: true } }, session: { include: sessionInclude } },
    });
    if (!sub) throw new NotFoundException('Không tìm thấy bài nộp trong phạm vi của bạn');
    return sub;
  }

  async submission(lecturerId: string, submissionId: string): Promise<SubmissionReview> {
    const sub = await this.loadSubmission(lecturerId, submissionId);
    const assessment = await this.prisma.assessment.findUnique({
      where: { sessionId: sub.sessionId },
      include: { reviewedBy: { select: { fullName: true } } },
    });
    const reflection = await this.reports.reflectionOf(sub.sessionId);
    return {
      submissionId: sub.id,
      sessionId: sub.sessionId,
      studentName: sub.student.fullName,
      assignmentTitle: sub.assignment.title,
      isLate: sub.isLate,
      submittedAt: sub.submittedAt.toISOString(),
      report: await this.reports.build(sub.session),
      messages: sub.session.messages.map(toMessageDto),
      reflection: reflection.submittedAt ? reflection : null,
      reviewedBy: assessment?.reviewedBy?.fullName ?? null,
      reviewedAt: assessment?.reviewedAt?.toISOString() ?? null,
    };
  }

  /** Đánh giá của giảng viên lưu ở cột riêng, không ghi đè đề xuất của AI (FR-LEC-03) */
  async review(lecturerId: string, submissionId: string, input: ReviewInput & { comment: string }) {
    const sub = await this.loadSubmission(lecturerId, submissionId);
    const assessment = await this.prisma.assessment.findUnique({ where: { sessionId: sub.sessionId }, include: { scores: true } });
    if (assessment?.status !== 'READY') throw new ConflictException('Báo cáo của phiên chưa sẵn sàng để đánh giá');
    await this.prisma.$transaction([
      ...(input.scores ?? []).map((s) =>
        this.prisma.assessmentScore.updateMany({
          where: { assessmentId: assessment.id, skillCode: s.skill },
          data: { lecturerLevel: s.level, lecturerNote: s.note?.trim() || null },
        }),
      ),
      this.prisma.assessment.update({
        where: { id: assessment.id },
        data: { lecturerComment: input.comment || null, reviewedById: lecturerId, reviewedAt: new Date() },
      }),
    ]);
    await this.audit.record({ actorId: lecturerId, action: AUDIT.REVIEW_SAVED, entityType: 'submission', entityId: submissionId });
    return this.submission(lecturerId, submissionId);
  }

  /**
   * Thống kê mức theo kỹ năng của lớp (FR-LEC-05), tính theo đề xuất của AI.
   * Gồm cả phiên luyện tự do và phiên Đã lưu trữ ở dạng tổng hợp (OI-11, FR-DATA-07), bỏ phiên Đã xóa.
   */
  async stats(lecturerId: string, classId: string): Promise<ClassSkillStats> {
    await this.scope.assertClass(lecturerId, classId);
    const cls = await this.prisma.class.findUniqueOrThrow({ where: { id: classId }, select: { name: true } });
    const studentIds = (await this.prisma.classMember.findMany({ where: { classId, memberRole: 'STUDENT' }, select: { userId: true } })).map(
      (m) => m.userId,
    );
    const where = { status: 'READY' as const, session: { userId: { in: studentIds }, recordStatus: { not: 'DELETED' as const } } };
    const [sessionCount, groups] = await Promise.all([
      this.prisma.assessment.count({ where }),
      this.prisma.assessmentScore.groupBy({ by: ['skillCode', 'aiLevel'], where: { assessment: where }, _count: { _all: true } }),
    ]);
    return {
      classId,
      className: cls.name,
      sessionCount,
      skills: SKILL_CODES.map((skill) => {
        const counts: [number, number, number, number, number] = [0, 0, 0, 0, 0];
        for (const g of groups.filter((x) => x.skillCode === skill)) counts[g.aiLevel ?? 0] += g._count._all;
        return { skill, counts };
      }),
    };
  }
}
