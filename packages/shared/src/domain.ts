import { z } from 'zod';

/** Mã kỹ năng trong rubric (docs/srs/04 mục 2.1) */
export const SKILL_CODES = [
  'ACTIVE_LISTENING',
  'OPEN_QUESTIONS',
  'EMPATHY',
  'SUMMARIZING',
  'AUTONOMY',
  'ETHICS_SAFETY',
] as const;
export const skillCodeSchema = z.enum(SKILL_CODES);
export type SkillCode = z.infer<typeof skillCodeSchema>;

export const SKILL_LABELS: Record<SkillCode, string> = {
  ACTIVE_LISTENING: 'Lắng nghe chủ động',
  OPEN_QUESTIONS: 'Câu hỏi mở và làm rõ',
  EMPATHY: 'Thấu cảm và phản hồi cảm xúc',
  SUMMARIZING: 'Tóm tắt và xác định vấn đề',
  AUTONOMY: 'Tôn trọng quyền tự quyết',
  ETHICS_SAFETY: 'Đạo đức và an toàn',
};

/** Thang mức 1 đến 4. null nghĩa là chưa đủ dữ liệu. */
export const SKILL_LEVELS = {
  1: 'Chưa thể hiện',
  2: 'Đang hình thành',
  3: 'Đạt yêu cầu',
  4: 'Thể hiện linh hoạt trong mô phỏng',
} as const;

/** Cảm xúc thân chủ, điều khiển tư thế và nét mặt trong phòng 3D */
export const EMOTIONS = ['NEUTRAL', 'ANXIOUS', 'SAD', 'TENSE', 'RELIEVED', 'HESITANT'] as const;
export const emotionSchema = z.enum(EMOTIONS);
export type Emotion = z.infer<typeof emotionSchema>;

export const EMOTION_LABELS: Record<Emotion, string> = {
  NEUTRAL: 'Bình thường',
  ANXIOUS: 'Lo lắng',
  SAD: 'Buồn',
  TENSE: 'Căng thẳng',
  RELIEVED: 'Nhẹ nhõm',
  HESITANT: 'Do dự',
};

/** Nhân vật thân chủ trong phòng 3D */
export const AVATAR_KEYS = ['a', 'b', 'c'] as const;
export const avatarKeySchema = z.enum(AVATAR_KEYS);
export type AvatarKey = z.infer<typeof avatarKeySchema>;
