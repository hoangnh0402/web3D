import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AdminClass,
  AdminSessionRow,
  AdminSettings,
  AuditRow,
  ClassInput,
  Page,
  RecordStatusInput,
  SystemSettings,
  SystemStatus,
} from '@lab-fourt/shared';
import { AI_GATEWAY, type AiGateway } from '../ai-gateway/ai-gateway.types';
import { AUDIT, AuditService } from '../audit/audit.service';
import { ENV, type Env } from '../config/env';
import type { Prisma, RecordStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_SETTINGS, type SettingKey } from '../settings/settings.service';

/** Lớp, dữ liệu phiên, cấu hình, trạng thái và nhật ký cho quản trị viên */
@Injectable()
export class AdminDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(AI_GATEWAY) private readonly ai: AiGateway,
    @Inject(ENV) private readonly env: Env,
  ) {}

  // ---------- Lớp (FR-USR-03, FR-USR-04) ----------

  async classes(): Promise<AdminClass[]> {
    const rows = await this.prisma.class.findMany({
      include: { members: { include: { user: { select: { id: true, fullName: true, username: true } } } } },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      term: c.term,
      status: c.status,
      lecturers: c.members.filter((m) => m.memberRole === 'LECTURER').map((m) => ({ userId: m.user.id, fullName: m.user.fullName })),
      students: c.members
        .filter((m) => m.memberRole === 'STUDENT')
        .map((m) => ({ userId: m.user.id, fullName: m.user.fullName, username: m.user.username }))
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi')),
    }));
  }

  async saveClass(actorId: string, input: ClassInput & { term: string }, classId?: string) {
    const data = { name: input.name, term: input.term || null };
    const c = classId ? await this.prisma.class.update({ where: { id: classId }, data }) : await this.prisma.class.create({ data });
    await this.audit.record({ actorId, action: AUDIT.CLASS_SAVED, entityType: 'class', entityId: c.id, after: data });
    return c.id;
  }

  async setClassStatus(actorId: string, classId: string, status: 'ACTIVE' | 'ARCHIVED') {
    await this.prisma.class.update({ where: { id: classId }, data: { status } });
    await this.audit.record({ actorId, action: AUDIT.CLASS_SAVED, entityType: 'class', entityId: classId, after: { status } });
  }

  /** Gán giảng viên phụ trách (thay danh sách) và thêm sinh viên theo tên đăng nhập */
  async setMembers(actorId: string, classId: string, input: { lecturerIds?: string[]; studentUsernames?: string[] }) {
    if (!(await this.prisma.class.findUnique({ where: { id: classId } }))) throw new NotFoundException('Không tìm thấy lớp');
    if (input.lecturerIds) {
      const lecturers = await this.prisma.user.findMany({ where: { id: { in: input.lecturerIds }, role: 'LECTURER' } });
      if (lecturers.length !== input.lecturerIds.length) throw new BadRequestException('Có người được chọn không phải giảng viên');
      await this.prisma.$transaction([
        this.prisma.classMember.deleteMany({ where: { classId, memberRole: 'LECTURER', userId: { notIn: input.lecturerIds } } }),
        ...input.lecturerIds.map((userId) =>
          this.prisma.classMember.upsert({
            where: { classId_userId: { classId, userId } },
            update: { memberRole: 'LECTURER' },
            create: { classId, userId, memberRole: 'LECTURER' },
          }),
        ),
      ]);
    }
    const missing: string[] = [];
    for (const username of input.studentUsernames ?? []) {
      const u = await this.prisma.user.findUnique({ where: { username } });
      if (!u || u.role !== 'STUDENT') {
        missing.push(username);
        continue;
      }
      await this.prisma.classMember.upsert({
        where: { classId_userId: { classId, userId: u.id } },
        update: {},
        create: { classId, userId: u.id, memberRole: 'STUDENT' },
      });
    }
    await this.audit.record({ actorId, action: AUDIT.CLASS_SAVED, entityType: 'class', entityId: classId, after: { members: true } });
    return { missing };
  }

  async removeMember(actorId: string, classId: string, userId: string) {
    const r = await this.prisma.classMember.deleteMany({ where: { classId, userId } });
    if (!r.count) throw new NotFoundException('Người này không có trong lớp');
    await this.audit.record({ actorId, action: AUDIT.CLASS_MEMBER_REMOVED, entityType: 'class', entityId: classId, before: { userId } });
  }

  // ---------- Dữ liệu phiên (FR-DATA-04, FR-DATA-06) ----------

  async sessions(filter: { recordStatus?: RecordStatus; q?: string }): Promise<AdminSessionRow[]> {
    const q = filter.q?.trim();
    const rows = await this.prisma.practiceSession.findMany({
      where: {
        ...(filter.recordStatus ? { recordStatus: filter.recordStatus } : {}),
        ...(q
          ? {
              OR: [
                { user: { username: { contains: q, mode: 'insensitive' } } },
                { user: { fullName: { contains: q, mode: 'insensitive' } } },
                { caseVersion: { case: { title: { contains: q, mode: 'insensitive' } } } },
              ],
            }
          : {}),
      },
      include: {
        user: { select: { fullName: true, username: true } },
        caseVersion: { include: { case: { select: { title: true } } } },
        assessment: { select: { status: true } },
        submission: { select: { status: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 300,
    });
    return rows.map((s) => ({
      id: s.id,
      studentName: s.user.fullName,
      username: s.user.username,
      caseTitle: s.caseVersion.case.title,
      status: s.status,
      recordStatus: s.recordStatus,
      assessmentStatus: s.assessment?.status ?? null,
      submitted: s.submission?.status === 'SUBMITTED',
      startedAt: s.startedAt.toISOString(),
      retentionUntil: s.retentionUntil?.toISOString() ?? null,
    }));
  }

  /** Đổi trạng thái bản ghi, kể cả khôi phục. Mọi lần đổi được ghi nhật ký kèm trước và sau. */
  async setRecordStatus(actorId: string, sessionId: string, input: RecordStatusInput) {
    const s = await this.prisma.practiceSession.findUnique({ where: { id: sessionId } });
    if (!s) throw new NotFoundException('Không tìm thấy phiên');
    const now = new Date();
    const data: Prisma.PracticeSessionUpdateInput =
      input.recordStatus === 'ACTIVE'
        ? { recordStatus: 'ACTIVE', retentionUntil: new Date(input.retentionUntil!), deletedAt: null, deletedBy: { disconnect: true } }
        : input.recordStatus === 'DELETED'
          ? { recordStatus: 'DELETED', deletedAt: now, deletedBy: { connect: { id: actorId } } }
          : { recordStatus: 'ARCHIVED' };
    await this.prisma.practiceSession.update({ where: { id: sessionId }, data });
    if (input.recordStatus === 'DELETED') {
      await this.prisma.submission.updateMany({ where: { sessionId, status: 'SUBMITTED' }, data: { status: 'WITHDRAWN' } });
    }
    await this.audit.record({
      actorId,
      action: AUDIT.SESSION_STATUS,
      entityType: 'practice_session',
      entityId: sessionId,
      before: { recordStatus: s.recordStatus, retentionUntil: s.retentionUntil?.toISOString() ?? null },
      after: { recordStatus: input.recordStatus, retentionUntil: input.retentionUntil ?? s.retentionUntil?.toISOString() ?? null },
    });
  }

  // ---------- Cấu hình (FR-ADM-02, FR-ADM-06, FR-DATA-05, FR-SAFE-02) ----------

  async settings(): Promise<AdminSettings> {
    const rows = await this.prisma.systemSetting.findMany({ where: { key: { in: Object.keys(DEFAULT_SETTINGS) } } });
    const values = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
    for (const r of rows) values[r.key] = r.value;
    return {
      values: values as SystemSettings,
      services: { aiProvider: this.env.AI_PROVIDER, aiConfigured: this.env.AI_PROVIDER === 'mock' || (!!this.env.AI_BASE_URL && !!this.env.AI_API_KEY) },
    };
  }

  async updateSettings(actorId: string, patch: Partial<SystemSettings>) {
    const before = (await this.settings()).values;
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      await this.prisma.systemSetting.upsert({
        where: { key },
        update: { value, updatedById: actorId },
        create: { key, value, updatedById: actorId },
      });
    }
    const changed = Object.keys(patch) as SettingKey[];
    await this.audit.record({
      actorId,
      action: AUDIT.SETTINGS_UPDATED,
      entityType: 'system_settings',
      before: Object.fromEntries(changed.map((k) => [k, before[k]])),
      after: patch as Prisma.InputJsonValue,
    });
    return this.settings();
  }

  // ---------- Trạng thái và mức dùng AI (FR-ADM-03, FR-ADM-04) ----------

  async status(): Promise<SystemStatus> {
    let database: 'ok' | 'error' = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'error';
    }
    const [ai, stt] = await Promise.all(
      [this.ai.health(), this.ai.sttHealth()].map((p) =>
        p.then(
          (h) => h.status,
          () => 'error' as const,
        ),
      ),
    );
    const since = new Date(Date.now() - 7 * 86_400_000);
    const [pending, failed, openSafetyEvents, backup, usage] = await Promise.all([
      this.prisma.assessment.count({ where: { status: { in: ['PENDING', 'PROCESSING'] } } }),
      this.prisma.assessment.count({ where: { status: 'FAILED' } }),
      this.prisma.safetyEvent.count({ where: { handlingStatus: 'NEW' } }),
      this.prisma.systemSetting.findUnique({ where: { key: 'backup.lastAt' } }),
      this.prisma.$queryRaw<{ day: string; kind: 'CONVERSATION' | 'ASSESSMENT' | 'STT'; calls: bigint; errors: bigint; avg_latency: number | null; tokens: bigint | null }[]>`
        SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') AS day,
               kind::text AS kind,
               count(*) AS calls,
               count(*) FILTER (WHERE outcome <> 'SUCCESS') AS errors,
               avg(latency_ms)::float AS avg_latency,
               sum(coalesce(input_tokens, 0) + coalesce(output_tokens, 0)) AS tokens
        FROM ai_usage WHERE created_at >= ${since}
        GROUP BY 1, 2 ORDER BY 1 DESC, 2`,
    ]);
    return {
      api: 'ok',
      database,
      ai: ai!,
      stt: stt!,
      aiProvider: this.env.AI_PROVIDER,
      assessments: { pending, failed },
      openSafetyEvents,
      lastBackupAt: typeof backup?.value === 'string' ? backup.value : null,
      usage: usage.map((u) => ({
        day: u.day,
        kind: u.kind,
        calls: Number(u.calls),
        errors: Number(u.errors),
        avgLatencyMs: Math.round(u.avg_latency ?? 0),
        tokens: Number(u.tokens ?? 0),
      })),
    };
  }

  // ---------- Nhật ký (FR-ADM-05) ----------

  async auditLog(filter: { action?: string; actor?: string; from?: string; to?: string; page?: number }): Promise<Page<AuditRow>> {
    const pageSize = 50;
    const page = Math.max(1, filter.page ?? 1);
    const where: Prisma.AuditLogWhereInput = {
      ...(filter.action ? { action: { startsWith: filter.action } } : {}),
      ...(filter.actor
        ? {
            actor: {
              OR: [
                { username: { contains: filter.actor, mode: 'insensitive' } },
                { fullName: { contains: filter.actor, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
      ...(filter.from || filter.to
        ? { createdAt: { ...(filter.from ? { gte: new Date(filter.from) } : {}), ...(filter.to ? { lte: new Date(filter.to) } : {}) } }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: { actor: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      total,
      page,
      pageSize,
      items: rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        actorName: r.actor?.fullName ?? null,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        before: r.before,
        after: r.after,
        ip: r.ip,
      })),
    };
  }
}
