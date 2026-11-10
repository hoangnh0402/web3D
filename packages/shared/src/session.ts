import { z } from 'zod';
import type { AvatarKey, Emotion, SkillCode } from './domain.js';

/** Độ dài tối đa một lượt nói của sinh viên */
export const TURN_MAX_LENGTH = 2000;

export const INPUT_MODES = ['TEXT', 'VOICE'] as const;
export type InputMode = (typeof INPUT_MODES)[number];

export const RENDER_MODES = ['THREE_D', 'LITE_2D'] as const;
export type RenderMode = (typeof RENDER_MODES)[number];

/** Bắt đầu phiên: phải xác nhận đã đọc quy tắc mô phỏng (FR-SES-01) */
export const startSessionSchema = z.object({
  caseId: z.string().uuid(),
  acceptedRules: z.literal(true, { error: 'Bạn cần xác nhận đã đọc quy tắc mô phỏng' }),
  renderMode: z.enum(RENDER_MODES).default('THREE_D'),
  /** Thực hành theo bài được giao. Bỏ trống là luyện tự do (FR-ASG-03). */
  assignmentId: z.string().uuid().optional(),
});
export type StartSessionInput = z.input<typeof startSessionSchema>;

/** Một lượt của sinh viên. clientTurnId do trình duyệt sinh để gửi lại không tạo lượt trùng (FR-CONV-08). */
export const turnSchema = z.object({
  clientTurnId: z.string().uuid(),
  content: z.string().trim().min(1, 'Hãy nhập nội dung trước khi gửi').max(TURN_MAX_LENGTH),
  inputMode: z.enum(INPUT_MODES),
  sttConfidence: z.number().min(0).max(1).optional(),
  sttEdited: z.boolean().optional(),
});
export type TurnInput = z.infer<typeof turnSchema>;

export const renderModeSchema = z.object({ renderMode: z.enum(RENDER_MODES) });

export type PracticeStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PRACTICED';
export type SessionStatus = 'IN_PROGRESS' | 'ENDED' | 'ABANDONED';

/** Thẻ ca trong thư viện (FR-CASE-01) */
export interface CaseSummary {
  id: string;
  title: string;
  summary: string;
  clientName: string;
  avatarKey: AvatarKey;
  difficulty: number;
  skills: SkillCode[];
  maxDurationMin: number;
  /** Đã đối chiếu giáo trình hay chưa (FR-CASE-10) */
  contentReviewed: boolean;
  practiceStatus: PracticeStatus;
}

/** Trang chuẩn bị (FR-CASE-03). Không chứa thông tin ẩn, tính cách hay ranh giới dành cho AI. */
export interface CaseDetail extends CaseSummary {
  versionNo: number;
  clientAge: number | null;
  background: string;
  mainIssue: string;
  learningObjectives: string[];
}

export interface MessageDto {
  id: string;
  seq: number;
  speaker: 'STUDENT' | 'CLIENT' | 'SYSTEM';
  content: string;
  inputMode: InputMode | null;
  sttConfidence: number | null;
  sttEdited: boolean;
  emotion: Emotion | null;
  clientTurnId: string | null;
  createdAt: string;
}

export interface SessionDetail {
  id: string;
  status: SessionStatus;
  renderMode: RenderMode;
  startedAt: string;
  endedAt: string | null;
  /** Thời điểm hết giờ theo cấu hình ca (FR-SES-07) */
  deadline: string;
  /** Thân chủ đang soạn câu trả lời cho lượt cuối */
  aiBusy: boolean;
  /** Lượt cuối của sinh viên chưa có phản hồi và không còn đang xử lý: cần Thử lại */
  awaitingRetry: boolean;
  case: Pick<CaseDetail, 'id' | 'title' | 'clientName' | 'avatarKey' | 'maxDurationMin'>;
  /** Bài được giao gắn với phiên, null là luyện tự do */
  assignment: { id: string; title: string; dueAt: string | null } | null;
  submission: { status: 'SUBMITTED' | 'WITHDRAWN'; isLate: boolean; submittedAt: string } | null;
  messages: MessageDto[];
}

export interface SessionListItem {
  id: string;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  caseTitle: string;
  clientName: string;
  studentTurns: number;
  retentionUntil: string | null;
  assignmentTitle: string | null;
  submissionStatus: 'SUBMITTED' | 'WITHDRAWN' | null;
}

/** Sự kiện đẩy qua SSE tại GET /api/sessions/:id/events */
export type SessionEvent =
  /** reset: dịch vụ AI được gọi lại, xóa phần chữ đã hiện trước đó */
  | { type: 'delta'; text: string; reset?: boolean }
  | { type: 'message'; message: MessageDto }
  | { type: 'busy'; busy: boolean }
  | { type: 'turn-error'; message: string }
  | { type: 'safety'; guidance: string }
  | { type: 'ended'; reason: 'USER' | 'TIMEOUT' };

export const SESSION_EVENT_TYPES = ['delta', 'message', 'busy', 'turn-error', 'safety', 'ended'] as const;
