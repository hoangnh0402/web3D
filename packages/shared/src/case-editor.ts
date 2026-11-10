import { z } from 'zod';
import { AVATAR_KEYS, EMOTIONS, SKILL_CODES } from './domain.js';

const text = (max = 4000) => z.string().trim().max(max).default('');
const lines = z.array(z.string().trim().max(1000)).max(30).default([]);

/**
 * Dữ liệu biểu mẫu soạn ca (SCR-12). Bản nháp được lưu khi chưa đủ (FR-CASE-04),
 * chỉ khi xuất bản mới bắt buộc đủ 8 thành phần (FR-CASE-05) và các cấu hình (FR-CASE-06).
 */
export const caseEditorSchema = z.object({
  title: z.string().trim().min(1, 'Hãy đặt tên ca').max(200),
  clientName: text(100),
  clientAge: z.number().int().min(10).max(100).nullable().default(null),
  summary: text(500),
  avatarKey: z.enum(AVATAR_KEYS).default('a'),
  difficulty: z.number().int().min(1).max(3).default(1),
  maxDurationMin: z.number().int().min(5, 'Tối thiểu 5 phút').max(90, 'Tối đa 90 phút').default(25),
  skills: z.array(z.enum(SKILL_CODES)).max(6).default([]),
  openingText: text(500),
  openingEmotion: z.enum(EMOTIONS).default('NEUTRAL'),
  // 8 thành phần của hồ sơ ca
  background: text(),
  mainIssue: text(),
  learningObjectives: lines,
  traits: lines,
  speechStyle: text(500),
  hiddenInformation: z
    .array(z.object({ content: z.string().trim().max(1000), unlockCondition: z.string().trim().max(500).default('') }))
    .max(20)
    .default([]),
  emotionalArc: text(),
  safetyBoundaries: lines,
  assessmentCriteria: z
    .array(z.object({ skill: z.enum(SKILL_CODES), observableBehaviors: lines }))
    .max(6)
    .default([]),
  /** Giảng viên xác nhận đã đối chiếu nội dung với giáo trình (FR-CASE-10, OI-02) */
  contentReviewed: z.boolean().default(false),
});

export type CaseEditorInput = z.input<typeof caseEditorSchema>;
export type CaseEditorData = z.output<typeof caseEditorSchema>;

/** Tên 8 thành phần, dùng cho bước soạn và thông báo thiếu */
export const CASE_COMPONENTS = [
  { key: 'background', label: 'Bối cảnh', help: 'Thông tin nền cần thiết để hiểu hoàn cảnh của thân chủ.' },
  { key: 'mainIssue', label: 'Vấn đề chính', help: 'Điều khiến thân chủ tìm kiếm hỗ trợ.' },
  { key: 'learningObjectives', label: 'Mục tiêu học tập', help: 'Mỗi dòng một kỹ năng sinh viên cần luyện.' },
  { key: 'traits', label: 'Tính cách và giao tiếp', help: 'Mỗi dòng một nét tính cách, kèm cách nói chuyện.' },
  { key: 'hiddenInformation', label: 'Thông tin chưa chia sẻ', help: 'Chi tiết chỉ xuất hiện khi hội thoại có điều kiện phù hợp.' },
  { key: 'emotionalArc', label: 'Diễn biến cảm xúc', help: 'Cách cảm xúc và mức độ sẵn sàng chia sẻ thay đổi.' },
  { key: 'safetyBoundaries', label: 'Ranh giới và an toàn', help: 'Điều AI không được tự suy diễn, cách xử lý nguy cơ. Mỗi dòng một ý.' },
  { key: 'assessmentCriteria', label: 'Tiêu chí đánh giá', help: 'Hành vi quan sát được cho từng kỹ năng.' },
] as const;

/** Danh sách mục còn thiếu để xuất bản. Rỗng là đủ điều kiện. */
export const missingForPublish = (d: CaseEditorData): string[] => {
  const missing: string[] = [];
  if (!d.clientName) missing.push('Tên thân chủ');
  if (!d.summary) missing.push('Mô tả ngắn');
  if (!d.skills.length) missing.push('Kỹ năng trọng tâm');
  if (!d.openingText) missing.push('Câu mở đầu của thân chủ');
  const filled: Record<(typeof CASE_COMPONENTS)[number]['key'], boolean> = {
    background: !!d.background,
    mainIssue: !!d.mainIssue,
    learningObjectives: d.learningObjectives.some((x) => x),
    traits: d.traits.some((x) => x) || !!d.speechStyle,
    hiddenInformation: d.hiddenInformation.some((h) => h.content),
    emotionalArc: !!d.emotionalArc,
    safetyBoundaries: d.safetyBoundaries.some((x) => x),
    assessmentCriteria: d.assessmentCriteria.some((c) => c.observableBehaviors.some((x) => x)),
  };
  for (const c of CASE_COMPONENTS) if (!filled[c.key]) missing.push(c.label);
  return missing;
};

export type CaseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface AuthoringCaseRow {
  id: string;
  title: string;
  status: CaseStatus;
  difficulty: number;
  /** Số phiên bản đang dùng cho sinh viên, null là chưa xuất bản lần nào */
  publishedVersionNo: number | null;
  /** Có bản nháp mới hơn bản đang xuất bản */
  hasDraft: boolean;
  contentReviewed: boolean;
  ownerName: string;
  updatedAt: string;
}

export interface AuthoringCase {
  id: string;
  status: CaseStatus;
  publishedVersionNo: number | null;
  draftVersionNo: number | null;
  publishedAt: string | null;
  data: CaseEditorData;
  missing: string[];
}

