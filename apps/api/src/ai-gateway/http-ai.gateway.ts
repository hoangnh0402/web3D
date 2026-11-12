import { Inject, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { emotionSchema, SKILL_CODES } from '@lab-fourt/shared';
import { ENV, type Env } from '../config/env';
import {
  AiServiceError,
  type AiGateway,
  type AiHealth,
  type AssessmentRequest,
  type AssessmentResult,
  type ClientTurnDone,
  type ClientTurnRequest,
  type SttRequest,
  type SttResult,
} from './ai-gateway.types';

const HEALTH_TIMEOUT_MS = 5_000;

const usageSchema = z
  .object({ model: z.string().optional(), inputTokens: z.number().optional(), outputTokens: z.number().optional() })
  .optional()
  .catch(undefined);

/** Nội dung sự kiện done, hoặc phản hồi JSON một lần (docs/srs/07 mục 3) */
const doneSchema = z.object({
  text: z.string().min(1),
  // Cảm xúc lạ thì bỏ qua để nhân vật về trạng thái trung tính (FR-3D-04)
  emotion: emotionSchema.optional().catch(undefined),
  clientState: z.unknown().transform((v) => v ?? null),
  riskFlag: z.object({ level: z.literal('HIGH'), reason: z.string() }).nullable().default(null),
  usage: usageSchema,
});

const deltaSchema = z.object({ text: z.string() });

/** Kiểm tra sơ bộ; AssessmentService kiểm tra kỹ và đối chiếu dẫn chứng sau */
const assessmentSchema = z.object({
  summary: z.string(),
  scores: z
    .array(
      z.object({
        skill: z.string(),
        level: z.number().int().min(1).max(4).nullable(),
        rationale: z.string().default(''),
        evidence: z.array(z.object({ seq: z.number().int(), quote: z.string() })).default([]),
      }),
    )
    // Kỹ năng ngoài rubric thì bỏ, không làm hỏng cả báo cáo
    .transform((scores) =>
      scores.flatMap((s) => {
        const skill = SKILL_CODES.find((c) => c === s.skill);
        return skill ? [{ ...s, skill }] : [];
      }),
    ),
  strengths: z.array(z.string()).default([]),
  improvements: z.array(z.object({ point: z.string(), alternativePhrase: z.string().optional() })).default([]),
  reflectionQuestions: z.array(z.string()).default([]),
  practiceGoals: z.array(z.string()).default([]),
  limitationNote: z.string().optional(),
  usage: usageSchema,
});

const sttSchema = z.object({
  text: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  durationSeconds: z.number().nonnegative().optional(),
  usage: usageSchema,
});

const healthSchema = z.object({ status: z.string(), version: z.string().optional(), model: z.string().optional() });

/** Đổi giá trị Retry-After (số giây hoặc ngày giờ HTTP) sang mili giây */
const parseRetryAfter = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
};

const AUDIO_EXT: Record<string, string> = { webm: 'webm', mp4: 'm4a', 'x-m4a': 'm4a', ogg: 'ogg', wav: 'wav', mpeg: 'mp3' };

/**
 * Adapter gọi dịch vụ AI và STT thật qua HTTP theo hợp đồng docs/srs/07.
 * Không ghi log nội dung hội thoại, âm thanh hay khóa dịch vụ.
 */
@Injectable()
export class HttpAiGateway implements AiGateway {
  private readonly logger = new Logger(HttpAiGateway.name);
  private readonly ai: { base: string; key: string };
  private readonly stt: { base: string; key: string };

  constructor(@Inject(ENV) env: Env) {
    if (!env.AI_BASE_URL || !env.AI_API_KEY) throw new Error('AI_PROVIDER=http cần AI_BASE_URL và AI_API_KEY');
    const trim = (url: string) => url.replace(/\/+$/, '');
    this.ai = { base: trim(env.AI_BASE_URL), key: env.AI_API_KEY };
    this.stt = { base: trim(env.STT_BASE_URL ?? env.AI_BASE_URL), key: env.STT_API_KEY ?? env.AI_API_KEY };
  }

  async clientTurn(req: ClientTurnRequest, onDelta?: (text: string) => void, signal?: AbortSignal): Promise<ClientTurnDone> {
    const res = await this.call(this.ai, '/v1/client-turns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream, application/json' },
      body: JSON.stringify(req),
      signal,
    });
    if ((res.headers.get('content-type') ?? '').includes('text/event-stream')) return this.readTurnStream(res, onDelta);
    return this.parse(doneSchema, await this.json(res), 'client-turns');
  }

  async assess(req: AssessmentRequest, signal?: AbortSignal): Promise<AssessmentResult> {
    const res = await this.call(this.ai, '/v1/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(req),
      signal,
    });
    return this.parse(assessmentSchema, await this.json(res), 'assessments');
  }

  async transcribe(req: SttRequest, signal?: AbortSignal): Promise<SttResult> {
    const form = new FormData();
    const subtype = /^audio\/([\w-]+)/.exec(req.mimeType)?.[1] ?? 'webm';
    form.append('audio', new Blob([new Uint8Array(req.audio)], { type: req.mimeType }), `audio.${AUDIO_EXT[subtype] ?? 'webm'}`);
    form.append('language', 'vi');
    form.append('requestId', req.requestId);
    form.append('sessionId', req.sessionId);
    const res = await this.call(this.stt, '/v1/stt', { method: 'POST', headers: { Accept: 'application/json' }, body: form, signal });
    return this.parse(sttSchema, await this.json(res), 'stt');
  }

  health(): Promise<AiHealth> {
    return this.checkHealth(this.ai);
  }

  sttHealth(): Promise<AiHealth> {
    return this.stt.base === this.ai.base ? this.health() : this.checkHealth(this.stt);
  }

  private async checkHealth(target: { base: string; key: string }): Promise<AiHealth> {
    try {
      const res = await this.call(target, '/health', { method: 'GET', signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });
      const h = healthSchema.parse(await res.json());
      return { status: h.status === 'ok' ? 'ok' : 'error', version: h.version, model: h.model };
    } catch {
      return { status: 'error' };
    }
  }

  /** Gọi dịch vụ kèm khóa, đổi lỗi kết nối và mã HTTP lỗi sang AiServiceError */
  private async call(target: { base: string; key: string }, path: string, init: RequestInit): Promise<Response> {
    let res: Response;
    try {
      res = await fetch(`${target.base}${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${target.key}` } });
    } catch (err) {
      // Bị hủy hoặc quá thời gian thì để nơi gọi tự xử lý
      if (init.signal?.aborted) throw err;
      throw new AiServiceError(`Không kết nối được dịch vụ ${path}`, null, true);
    }
    if (res.ok) return res;
    await res.body?.cancel().catch(() => undefined);
    const status = res.status;
    if (status === 401 || status === 403) {
      this.logger.error({ path, status }, 'Dịch vụ từ chối khóa. Quản trị viên cần kiểm tra AI_API_KEY hoặc STT_API_KEY');
      throw new AiServiceError(`Dịch vụ từ chối khóa (${status})`, status, false);
    }
    if (status === 429) {
      throw new AiServiceError('Dịch vụ đang quá tải (429)', status, true, parseRetryAfter(res.headers.get('retry-after')));
    }
    if (status === 408 || status >= 500) throw new AiServiceError(`Dịch vụ lỗi (${status})`, status, true);
    this.logger.warn({ path, status }, 'Dịch vụ từ chối yêu cầu');
    throw new AiServiceError(`Yêu cầu bị từ chối (${status})`, status, false);
  }

  private async json(res: Response): Promise<unknown> {
    try {
      return await res.json();
    } catch {
      throw new AiServiceError('Phản hồi không phải JSON hợp lệ', res.status, true);
    }
  }

  private parse<T extends z.ZodType>(schema: T, data: unknown, what: string): z.infer<T> {
    const parsed = schema.safeParse(data);
    if (parsed.success) return parsed.data;
    // Chỉ ghi đường dẫn trường sai, không ghi giá trị
    this.logger.warn({ what, fields: parsed.error.issues.map((i) => i.path.join('.')) }, 'Phản hồi sai cấu trúc');
    throw new AiServiceError(`Phản hồi ${what} sai cấu trúc`, null, true);
  }

  /** Đọc luồng text/event-stream: delta trả dần, done kết thúc lượt, error báo lỗi để thử lại cả lượt */
  private async readTurnStream(res: Response, onDelta?: (text: string) => void): Promise<ClientTurnDone> {
    if (!res.body) throw new AiServiceError('Luồng phản hồi rỗng', res.status, true);
    const decoder = new TextDecoder();
    let buffer = '';
    for await (const chunk of res.body) {
      buffer += decoder.decode(chunk, { stream: true }).replace(/\r\n?/g, '\n');
      let end: number;
      while ((end = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const event = this.parseEvent(block);
        if (!event) continue;
        if (event.name === 'delta') {
          const d = deltaSchema.safeParse(this.parseData(event.data));
          if (d.success && d.data.text) onDelta?.(d.data.text);
        } else if (event.name === 'done') {
          await res.body.cancel().catch(() => undefined);
          return this.parse(doneSchema, this.parseData(event.data), 'client-turns');
        } else if (event.name === 'error') {
          throw new AiServiceError('Dịch vụ báo lỗi giữa luồng', res.status, true);
        }
      }
    }
    throw new AiServiceError('Luồng kết thúc khi chưa có sự kiện done', res.status, true);
  }

  private parseEvent(block: string): { name: string; data: string } | null {
    let name = 'message';
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (!line || line.startsWith(':')) continue;
      const colon = line.indexOf(':');
      const field = colon < 0 ? line : line.slice(0, colon);
      const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '');
      if (field === 'event') name = value;
      else if (field === 'data') data.push(value);
    }
    return data.length ? { name, data: data.join('\n') } : null;
  }

  private parseData(data: string): unknown {
    try {
      return JSON.parse(data);
    } catch {
      return undefined;
    }
  }
}
