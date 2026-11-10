import { z } from 'zod';
import type { SkillCode } from './domain.js';
import type { ReflectionDto, ReportDto } from './report.js';
import type { MessageDto } from './session.js';
import { skillCodeSchema } from './domain.js';

export type AssignmentStatus = 'OPEN' | 'CLOSED' | 'ARCHIVED';
export type SubmissionStatus = 'SUBMITTED' | 'WITHDRAWN';

/** Giao bài cho lớp hoặc từng sinh viên (FR-ASG-01) */
export const createAssignmentSchema = z.object({
  caseId: z.string().uuid(),
  title: z.string().trim().min(1, 'Hãy đặt tên bài').max(200),
  dueAt: z.string().datetime({ offset: true }).nullable().default(null),
  classIds: z.array(z.string().uuid()).default([]),
  studentIds: z.array(z.string().uuid()).default([]),
}).refine((v) => v.classIds.length + v.studentIds.length > 0, {
  path: ['classIds'],
  message: 'Hãy chọn ít nhất một lớp hoặc một sinh viên',
});
export type CreateAssignmentInput = z.input<typeof createAssignmentSchema>;

export const assignmentStatusSchema = z.object({ status: z.enum(['OPEN', 'CLOSED']) });

/** Nộp một phiên đã hoàn thành cho bài được giao (FR-ASG-04) */
export const submitSchema = z.object({ assignmentId: z.string().uuid() });

/** Đánh giá riêng của giảng viên, lưu tách khỏi đề xuất của AI (FR-LEC-03) */
export const reviewSchema = z.object({
  comment: z.string().trim().max(4000).default(''),
  scores: z
    .array(
      z.object({
        skill: skillCodeSchema,
        level: z.number().int().min(1).max(4).nullable(),
        note: z.string().trim().max(1000).default(''),
      }),
    )
    .default([]),
});
export type ReviewInput = z.input<typeof reviewSchema>;

/** Giảng viên thêm sinh viên vào lớp mình phụ trách bằng tên đăng nhập (FR-USR-04) */
export const addStudentSchema = z.object({ username: z.string().trim().min(1, 'Nhập tên đăng nhập của sinh viên').max(64) });

/** Bài được giao, nhìn từ phía sinh viên (FR-ASG-02) */
export interface MyAssignment {
  id: string;
  title: string;
  dueAt: string | null;
  status: AssignmentStatus;
  caseId: string;
  caseTitle: string;
  clientName: string;
  maxDurationMin: number;
  submission: { sessionId: string; status: SubmissionStatus; isLate: boolean; submittedAt: string } | null;
}

export interface LecturerClass {
  id: string;
  name: string;
  term: string | null;
  studentCount: number;
}

export interface ClassMember {
  userId: string;
  username: string;
  fullName: string;
}

export interface LecturerAssignment {
  id: string;
  title: string;
  dueAt: string | null;
  status: AssignmentStatus;
  caseTitle: string;
  targetCount: number;
  submittedCount: number;
  lateCount: number;
  awaitingReview: number;
  createdAt: string;
}

/** Tiến độ từng sinh viên trong một bài (FR-LEC-01) */
export type ProgressState = 'NOT_STARTED' | 'IN_PROGRESS' | 'NOT_SUBMITTED' | 'SUBMITTED' | 'WITHDRAWN';

export interface ProgressRow {
  userId: string;
  fullName: string;
  username: string;
  state: ProgressState;
  isLate: boolean;
  submittedAt: string | null;
  submissionId: string | null;
  reviewed: boolean;
}

export interface AssignmentProgress extends LecturerAssignment {
  rows: ProgressRow[];
}

/** Thống kê kỹ năng của lớp (FR-LEC-05). counts[0] là chưa đủ dữ liệu, counts[1..4] là số lượt đạt từng mức. */
export interface ClassSkillStats {
  classId: string;
  className: string;
  sessionCount: number;
  skills: { skill: SkillCode; counts: [number, number, number, number, number] }[];
}

/** Màn hình xem xét bài nộp (SCR-15): transcript, đánh giá AI và đánh giá giảng viên đặt cạnh nhau */
export interface SubmissionReview {
  submissionId: string;
  sessionId: string;
  studentName: string;
  assignmentTitle: string;
  isLate: boolean;
  submittedAt: string;
  report: ReportDto;
  messages: MessageDto[];
  reflection: ReflectionDto | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
}
