import { Injectable } from '@nestjs/common';
import { SKILL_CODES, SKILL_LABELS, type ProgressState } from '@lab-fourt/shared';
import { AUDIT, AuditService } from '../audit/audit.service';
import { toCsv } from '../common/csv';
import { PrismaService } from '../prisma/prisma.service';
import { AssignmentsService } from './assignments.service';
import { LecturerService } from './lecturer.service';

const STATE: Record<ProgressState, string> = {
  NOT_STARTED: 'Chưa bắt đầu',
  IN_PROGRESS: 'Đang thực hành',
  NOT_SUBMITTED: 'Chưa nộp',
  SUBMITTED: 'Đã nộp',
  WITHDRAWN: 'Đã rút bài',
};
const LEVEL = (n: number | null | undefined) => (n === null || n === undefined ? 'Chưa đủ dữ liệu' : String(n));
const time = (iso: string | null) => (iso ? new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '');
/** Tên tệp chỉ gồm chữ không dấu để trình duyệt nào cũng lưu đúng */
const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'bao-cao';

export interface ExportFile {
  filename: string;
  content: string;
}

/**
 * Xuất báo cáo tổng hợp trong phạm vi giảng viên (FR-LEC-06). Thao tác xuất được ghi nhật ký.
 * Tệp chỉ chứa số liệu và mức đánh giá, không chứa nội dung hội thoại hay phản tư.
 */
@Injectable()
export class ExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignments: AssignmentsService,
    private readonly lecturer: LecturerService,
    private readonly audit: AuditService,
  ) {}

  /** Tiến độ một bài được giao, kèm mức AI và mức giảng viên của từng kỹ năng với bài đã nộp */
  async assignment(lecturerId: string, assignmentId: string, ip: string | null): Promise<ExportFile> {
    const p = await this.assignments.progress(lecturerId, assignmentId);
    const submissionIds = p.rows.map((r) => r.submissionId).filter((x): x is string => !!x);
    const scores = await this.prisma.assessmentScore.findMany({
      where: { assessment: { status: 'READY', session: { submission: { id: { in: submissionIds } } } } },
      select: { skillCode: true, aiLevel: true, lecturerLevel: true, assessment: { select: { session: { select: { submission: { select: { id: true } } } } } } },
    });
    const bySubmission = new Map<string, Map<string, { ai: number | null; lecturer: number | null }>>();
    for (const s of scores) {
      const id = s.assessment.session.submission?.id;
      if (!id) continue;
      if (!bySubmission.has(id)) bySubmission.set(id, new Map());
      bySubmission.get(id)!.set(s.skillCode, { ai: s.aiLevel, lecturer: s.lecturerLevel });
    }
    const header = [
      'Họ tên',
      'Tên đăng nhập',
      'Trạng thái',
      'Nộp lúc',
      'Trễ hạn',
      'Đã xem xét',
      ...SKILL_CODES.flatMap((k) => [`${SKILL_LABELS[k]} (AI)`, `${SKILL_LABELS[k]} (giảng viên)`]),
    ];
    const rows = p.rows.map((r) => {
      const levels = r.submissionId ? bySubmission.get(r.submissionId) : undefined;
      return [
        r.fullName,
        r.username,
        STATE[r.state],
        time(r.submittedAt),
        r.state === 'SUBMITTED' ? (r.isLate ? 'Có' : 'Không') : '',
        r.state === 'SUBMITTED' ? (r.reviewed ? 'Có' : 'Chưa') : '',
        ...SKILL_CODES.flatMap((k) => {
          const l = levels?.get(k);
          return levels ? [LEVEL(l?.ai), l?.lecturer ? String(l.lecturer) : ''] : ['', ''];
        }),
      ];
    });
    await this.audit.record({
      actorId: lecturerId,
      action: AUDIT.REPORT_EXPORTED,
      entityType: 'assignment',
      entityId: assignmentId,
      after: { rows: rows.length },
      ip,
    });
    return { filename: `tien-do-${slug(p.title)}.csv`, content: toCsv(header, rows) };
  }

  /** Phân bố mức theo kỹ năng của lớp, tính theo đề xuất của AI */
  async classStats(lecturerId: string, classId: string, ip: string | null): Promise<ExportFile> {
    const s = await this.lecturer.stats(lecturerId, classId);
    const header = ['Kỹ năng', 'Mức 1', 'Mức 2', 'Mức 3', 'Mức 4', 'Chưa đủ dữ liệu', 'Tổng số phiên'];
    const rows = s.skills.map((k) => [SKILL_LABELS[k.skill], k.counts[1], k.counts[2], k.counts[3], k.counts[4], k.counts[0], s.sessionCount]);
    await this.audit.record({
      actorId: lecturerId,
      action: AUDIT.REPORT_EXPORTED,
      entityType: 'class',
      entityId: classId,
      after: { sessions: s.sessionCount },
      ip,
    });
    return { filename: `thong-ke-${slug(s.className)}.csv`, content: toCsv(header, rows) };
  }
}
