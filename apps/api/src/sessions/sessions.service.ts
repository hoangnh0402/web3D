import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AvatarKey, RenderMode, SessionDetail, SessionListItem, StartSessionInput } from '@lab-fourt/shared';
import { AUDIT, AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionUser } from '../common/request';
import { readProfile } from '../cases/case-profile';
import { ConversationService } from './conversation.service';
import { SessionAccessService, sessionInclude, type LoadedSession } from './session-access.service';
import { SessionEventsService } from './session-events.service';
import { deadlineOf, SessionLifecycleService } from './session-lifecycle.service';
import { toMessageDto } from './session.mapper';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: SessionAccessService,
    private readonly lifecycle: SessionLifecycleService,
    private readonly conversation: ConversationService,
    private readonly events: SessionEventsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Bắt đầu phiên với phiên bản ca đang xuất bản (FR-CASE-08).
   * Mỗi người chỉ có một phiên đang chạy (FR-SES-09): nếu còn phiên cũ thì trả 409 kèm mã phiên để quay lại.
   */
  async start(user: SessionUser, input: StartSessionInput & { acceptedRules: true }) {
    const running = await this.findActive(user.id);
    if (running) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Bạn đang có một phiên chưa kết thúc. Hãy quay lại hoặc kết thúc phiên đó trước.',
        sessionId: running.id,
      });
    }
    const c = await this.prisma.case.findFirst({
      where: { id: input.caseId, status: 'PUBLISHED', currentVersion: { publishedAt: { not: null } } },
      include: { currentVersion: true },
    });
    if (!c?.currentVersion) throw new NotFoundException('Không tìm thấy ca hoặc ca chưa được xuất bản');
    const version = c.currentVersion;
    const opening = readProfile(version.profile).opening;
    if (input.assignmentId) await this.assertAssigned(user.id, input.assignmentId, c.id);

    const session = await this.prisma.practiceSession.create({
      data: {
        userId: user.id,
        caseVersionId: version.id,
        renderMode: input.renderMode ?? 'THREE_D',
        assignmentId: input.assignmentId ?? null,
        // Câu mở đầu của thân chủ là lượt đầu tiên trong transcript
        messages: opening
          ? { create: { seq: 1, speaker: 'CLIENT', content: opening.text, emotion: opening.emotion ?? null } }
          : undefined,
      },
    });
    await this.audit.record({
      actorId: user.id,
      action: AUDIT.SESSION_STARTED,
      entityType: 'practice_session',
      entityId: session.id,
      after: { caseId: c.id, versionNo: version.versionNo },
    });
    return { id: session.id };
  }

  /** Bài phải đang mở, đúng ca, và được giao cho người dùng qua lớp hoặc trực tiếp */
  async assertAssigned(userId: string, assignmentId: string, caseId: string) {
    const a = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        status: 'OPEN',
        caseVersion: { caseId },
        targets: { some: { OR: [{ userId }, { class: { members: { some: { userId, memberRole: 'STUDENT' } } } }] } },
      },
      select: { id: true, dueAt: true },
    });
    if (!a) throw new BadRequestException('Bài được giao không hợp lệ hoặc đã đóng');
    return a;
  }

  /** Phiên chưa kết thúc của người dùng, gồm cả phiên bị bỏ dở để quay lại và kết thúc */
  findActive(userId: string) {
    return this.prisma.practiceSession.findFirst({
      where: { userId, recordStatus: 'ACTIVE', status: { in: ['IN_PROGRESS', 'ABANDONED'] } },
      orderBy: { startedAt: 'desc' },
      select: { id: true },
    });
  }

  async list(user: SessionUser): Promise<SessionListItem[]> {
    const sessions = await this.prisma.practiceSession.findMany({
      where: { userId: user.id, recordStatus: 'ACTIVE' },
      orderBy: { startedAt: 'desc' },
      include: {
        caseVersion: { include: { case: true } },
        assignment: { select: { title: true } },
        submission: { select: { status: true } },
        _count: { select: { messages: { where: { speaker: 'STUDENT' } } } },
      },
    });
    return sessions.map((s) => ({
      id: s.id,
      status: s.status,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt?.toISOString() ?? null,
      caseTitle: s.caseVersion.case.title,
      clientName: readProfile(s.caseVersion.profile).clientName,
      studentTurns: s._count.messages,
      retentionUntil: s.retentionUntil?.toISOString() ?? null,
      assignmentTitle: s.assignment?.title ?? null,
      submissionStatus: s.submission?.status ?? null,
    }));
  }

  /** Chi tiết phiên để khôi phục khi tải lại trang (FR-SES-06). Phiên quá giờ được kết thúc ngay khi mở. */
  async get(sessionId: string, user: SessionUser, ip: string | null): Promise<SessionDetail> {
    let session = await this.access.loadOwned(sessionId, user, ip);
    if (session.status === 'IN_PROGRESS' && this.lifecycle.isOverdue(session.startedAt, session.caseVersion.maxDurationMin)) {
      await this.end(sessionId, user, 'TIMEOUT');
      session = await this.access.loadOwned(sessionId, user, ip);
    }
    return this.toDetail(session);
  }

  async end(sessionId: string, user: SessionUser, reason: 'USER' | 'TIMEOUT' = 'USER') {
    await this.access.loadOwned(sessionId, user);
    this.conversation.cancel(sessionId);
    if (await this.lifecycle.end(sessionId, reason, user.id)) this.events.emit(sessionId, { type: 'ended', reason });
    const fresh = await this.prisma.practiceSession.findUniqueOrThrow({ where: { id: sessionId }, include: sessionInclude });
    return this.toDetail(fresh);
  }

  /**
   * Nộp phiên đã kết thúc cho bài được giao (FR-ASG-04). Phải có phản tư trước (FR-REF-02).
   * Nộp sau hạn vẫn được và bị đánh dấu trễ (FR-ASG-05). Mỗi bài chỉ có một bài nộp đang hiệu lực.
   */
  async submit(sessionId: string, user: SessionUser, assignmentId: string) {
    const s = await this.access.loadOwned(sessionId, user);
    if (s.status !== 'ENDED') throw new ConflictException('Chỉ nộp được phiên đã kết thúc');
    const a = await this.assertAssigned(user.id, assignmentId, s.caseVersion.caseId);
    const reflection = await this.prisma.reflection.findUnique({ where: { sessionId }, select: { submittedAt: true } });
    if (!reflection?.submittedAt) throw new ConflictException('Hãy hoàn thành phản tư trước khi nộp bài');
    const active = await this.prisma.submission.findFirst({
      where: { assignmentId, studentId: user.id, status: 'SUBMITTED' },
      select: { sessionId: true },
    });
    if (active && active.sessionId !== sessionId) throw new ConflictException('Bạn đã nộp một phiên khác cho bài này');
    const now = new Date();
    const isLate = !!a.dueAt && now > a.dueAt;
    await this.prisma.$transaction([
      this.prisma.submission.upsert({
        where: { sessionId },
        update: { assignmentId, status: 'SUBMITTED', isLate, submittedAt: now },
        create: { assignmentId, sessionId, studentId: user.id, isLate, submittedAt: now },
      }),
      this.prisma.practiceSession.update({ where: { id: sessionId }, data: { assignmentId } }),
    ]);
    await this.audit.record({
      actorId: user.id,
      action: AUDIT.SUBMISSION_CREATED,
      entityType: 'practice_session',
      entityId: sessionId,
      after: { assignmentId, isLate },
    });
    return this.get(sessionId, user, null);
  }

  /**
   * Sinh viên xóa mềm phiên của mình khi còn Đang hiệu lực (FR-DATA-02).
   * Phiên đã nộp thì bài chuyển sang Đã rút (OI-12).
   */
  async remove(sessionId: string, user: SessionUser) {
    const s = await this.access.loadOwned(sessionId, user);
    if (s.status === 'IN_PROGRESS') throw new ConflictException('Hãy kết thúc phiên trước khi xóa');
    await this.prisma.$transaction([
      this.prisma.practiceSession.update({
        where: { id: sessionId },
        data: { recordStatus: 'DELETED', deletedAt: new Date(), deletedById: user.id },
      }),
      this.prisma.submission.updateMany({ where: { sessionId, status: 'SUBMITTED' }, data: { status: 'WITHDRAWN' } }),
    ]);
    await this.audit.record({
      actorId: user.id,
      action: AUDIT.SESSION_DELETED,
      entityType: 'practice_session',
      entityId: sessionId,
      before: { recordStatus: 'ACTIVE' },
      after: { recordStatus: 'DELETED', withdrawn: s.submission?.status === 'SUBMITTED' },
    });
  }

  /** Ghi lại chế độ hiển thị khi sinh viên đổi giữa 3D và 2D (FR-3D-09) */
  async setRenderMode(sessionId: string, user: SessionUser, renderMode: RenderMode) {
    await this.access.loadOwned(sessionId, user);
    await this.prisma.practiceSession.update({ where: { id: sessionId }, data: { renderMode } });
  }

  private toDetail(s: LoadedSession): SessionDetail {
    const v = s.caseVersion;
    const profile = readProfile(v.profile);
    const last = s.messages.at(-1);
    const aiBusy = this.conversation.isBusy(s.id);
    return {
      id: s.id,
      status: s.status,
      renderMode: s.renderMode,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt?.toISOString() ?? null,
      deadline: deadlineOf(s.startedAt, v.maxDurationMin).toISOString(),
      aiBusy,
      awaitingRetry: s.status === 'IN_PROGRESS' && last?.speaker === 'STUDENT' && !aiBusy,
      case: {
        id: v.case.id,
        title: v.case.title,
        clientName: profile.clientName,
        avatarKey: v.avatarKey as AvatarKey,
        maxDurationMin: v.maxDurationMin,
      },
      assignment: s.assignment
        ? { id: s.assignment.id, title: s.assignment.title, dueAt: s.assignment.dueAt?.toISOString() ?? null }
        : null,
      submission: s.submission
        ? { status: s.submission.status, isLate: s.submission.isLate, submittedAt: s.submission.submittedAt.toISOString() }
        : null,
      messages: s.messages.map(toMessageDto),
    };
  }
}
