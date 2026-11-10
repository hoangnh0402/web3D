import type { MessageDto } from '@lab-fourt/shared';
import type { Message } from '../generated/prisma/client';

/** Ngưỡng độ tin cậy nhận dạng thấp (FR-RPT-09) */
export const LOW_CONFIDENCE = 0.8;

export const toMessageDto = (m: Message): MessageDto => ({
  id: m.id,
  seq: m.seq,
  speaker: m.speaker,
  content: m.content,
  inputMode: m.inputMode,
  sttConfidence: m.sttConfidence,
  sttEdited: m.sttEdited,
  emotion: m.emotion,
  clientTurnId: m.clientTurnId,
  createdAt: m.createdAt.toISOString(),
});
