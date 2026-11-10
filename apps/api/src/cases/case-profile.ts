import { emotionSchema } from '@lab-fourt/shared';
import { z } from 'zod';

/**
 * Hồ sơ ca lưu trong case_versions.profile (docs/srs/04 mục 5).
 * Chỉ kiểm tra các trường phần web cần đọc; phần còn lại gửi nguyên vẹn cho dịch vụ AI.
 */
export const caseProfileSchema = z
  .object({
    clientName: z.string(),
    clientAge: z.number().int().optional(),
    summary: z.string().default(''),
    background: z.string().default(''),
    mainIssue: z.string().default(''),
    learningObjectives: z.array(z.string()).default([]),
    /** Câu mở đầu của thân chủ, hiện ngay khi vào phòng */
    opening: z.object({ text: z.string(), emotion: emotionSchema.optional() }).optional(),
  })
  .passthrough();

export type CaseProfile = z.infer<typeof caseProfileSchema>;

export const readProfile = (value: unknown): CaseProfile => {
  const parsed = caseProfileSchema.safeParse(value);
  return parsed.success ? parsed.data : { clientName: 'Thân chủ', summary: '', background: '', mainIssue: '', learningObjectives: [] };
};
