import { BadGatewayException, BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AI_GATEWAY, type AiGateway } from '../ai-gateway/ai-gateway.types';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionUser } from '../common/request';
import { SessionAccessService } from './session-access.service';

/** Định dạng trình duyệt ghi được (docs/srs/06 mục 5.3) */
const ACCEPTED = /^audio\/(webm|mp4|ogg|wav|x-m4a|mpeg)(;.*)?$/;
export const AUDIO_MAX_BYTES = 10 * 1024 * 1024;
const STT_TIMEOUT_MS = 15_000;

export interface UploadedAudio {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

/**
 * Chuyển tiếp âm thanh sang dịch vụ STT và trả văn bản để sinh viên sửa trước khi gửi (FR-CONV-04).
 * Âm thanh chỉ nằm trong bộ nhớ của yêu cầu, không ghi ra đĩa hay CSDL (FR-CONV-09).
 */
@Injectable()
export class SpeechService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: SessionAccessService,
    @Inject(AI_GATEWAY) private readonly ai: AiGateway,
  ) {}

  async transcribe(sessionId: string, user: SessionUser, file: UploadedAudio | undefined) {
    const session = await this.access.loadOwned(sessionId, user);
    if (session.status !== 'IN_PROGRESS') throw new ConflictException('Phiên này đã kết thúc');
    if (!file?.size) throw new BadRequestException('Không nhận được âm thanh, hãy thử nói lại');
    if (!ACCEPTED.test(file.mimetype)) throw new BadRequestException('Định dạng âm thanh không được hỗ trợ');

    const started = Date.now();
    const signal = AbortSignal.timeout(STT_TIMEOUT_MS);
    try {
      const result = await this.ai.transcribe(
        { requestId: randomUUID(), sessionId, audio: file.buffer, mimeType: file.mimetype },
        signal,
      );
      await this.prisma.aiUsage.create({
        data: {
          sessionId,
          kind: 'STT',
          model: result.usage?.model ?? null,
          audioSeconds: result.durationSeconds ?? null,
          latencyMs: Date.now() - started,
          outcome: 'SUCCESS',
        },
      });
      return { text: result.text, confidence: result.confidence ?? null };
    } catch {
      await this.prisma.aiUsage.create({
        data: { sessionId, kind: 'STT', latencyMs: Date.now() - started, outcome: signal.aborted ? 'TIMEOUT' : 'ERROR' },
      });
      throw new BadGatewayException('Chưa nhận dạng được giọng nói. Hãy nói lại hoặc nhập văn bản.');
    } finally {
      // Xóa tham chiếu tới âm thanh ngay sau khi xử lý
      file.buffer = Buffer.alloc(0);
    }
  }
}
