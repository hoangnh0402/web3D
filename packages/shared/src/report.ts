import { z } from 'zod';
import type { SkillCode } from './domain.js';

export type AssessmentStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface EvidenceDto {
  seq: number | null;
  quote: string;
}

export interface SkillScoreDto {
  skill: SkillCode;
  /** 1 đến 4. null là chưa đủ dữ liệu (FR-RPT-04) */
  level: number | null;
  rationale: string | null;
  /** Dẫn chứng đã đối chiếu với transcript (FR-RPT-06) */
  evidence: EvidenceDto[];
  /** Có dẫn chứng bị loại vì không khớp transcript, cần giảng viên xem lại */
  needsReview: boolean;
  lecturerLevel: number | null;
  lecturerNote: string | null;
}

export interface ReportDto {
  sessionId: string;
  status: AssessmentStatus;
  caseTitle: string;
  clientName: string;
  startedAt: string;
  endedAt: string | null;
  studentTurns: number;
  /** Có lượt nhận dạng giọng nói độ tin cậy thấp (FR-RPT-09) */
  hasLowConfidence: boolean;
  summary: string | null;
  scores: SkillScoreDto[];
  strengths: string[];
  improvements: { point: string; alternativePhrase?: string }[];
  reflectionQuestions: string[];
  practiceGoals: string[];
  limitationNote: string | null;
  lecturerComment: string | null;
}

/** Câu hỏi phản tư mặc định khi báo cáo chưa có hoặc không trả câu hỏi */
export const DEFAULT_REFLECTION_QUESTIONS = [
  'Điều gì bạn thấy mình làm tốt nhất trong phiên này?',
  'Có lúc nào bạn thấy lúng túng không? Khi đó bạn có thể làm khác đi thế nào?',
  'Thân chủ có thể đã cảm thấy thế nào sau buổi trò chuyện?',
];

export const REFLECTION_MAX_LENGTH = 4000;

/** Lưu nháp hoặc hoàn thành phản tư (FR-REF-01). Hoàn thành thì phải trả lời đủ. */
export const reflectionSchema = z
  .object({
    answers: z.array(z.string().max(REFLECTION_MAX_LENGTH)).max(10),
    nextGoal: z.string().max(REFLECTION_MAX_LENGTH).default(''),
    submit: z.boolean().default(false),
  })
  .refine((v) => !v.submit || (v.answers.length > 0 && v.answers.every((a) => a.trim()) && v.nextGoal.trim()), {
    path: ['answers'],
    message: 'Hãy trả lời đủ các câu hỏi và mục tiêu lần sau trước khi hoàn thành',
  });
export type ReflectionInput = z.input<typeof reflectionSchema>;

export interface ReflectionDto {
  questions: string[];
  answers: string[];
  nextGoal: string;
  submittedAt: string | null;
}
