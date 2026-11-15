import { Inject, Injectable, Logger } from '@nestjs/common';
import { emotionSchema, type Emotion } from '@lab-fourt/shared';
import { ENV, type Env } from '../config/env';
import { SimpleAiGateway } from './simple-ai.gateway';
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

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type RecordValue = Record<string, unknown>;

const asRecord = (value: unknown): RecordValue => (value && typeof value === 'object' ? (value as RecordValue) : {});
const textOf = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
/** Nội dung delta phải giữ nguyên khoảng trắng đầu/cuối để ghép token chính xác. */
const deltaTextOf = (value: unknown) => (typeof value === 'string' ? value : '');
const RISK_WORDS = /tự tử|không muốn sống|tự làm hại|kết thúc cuộc sống|chết đi/i;
const waitSignal = (signal?: AbortSignal) => signal?.aborted === true;

/** Adapter mỏng cho OpenAI Chat Completions, giữ nguyên hợp đồng AiGateway của web3D. */
@Injectable()
export class OpenAiAiGateway implements AiGateway {
  private readonly logger = new Logger(OpenAiAiGateway.name);
  private readonly base: string;
  private readonly key: string;
  private readonly model: string;

  constructor(@Inject(ENV) env: Env, private readonly local: SimpleAiGateway) {
    // XGENI proxy được ưu tiên; AI_* vẫn được hỗ trợ cho các môi trường cũ.
    this.base = (env.PROXY_BASE_URL ?? env.AI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
    this.key = env.PROXY_API_KEY ?? env.AI_API_KEY ?? '';
    this.model = env.AI_MODEL;
    if (!this.key) throw new Error('AI_PROVIDER=http với AI_PROTOCOL=openai cần PROXY_API_KEY hoặc AI_API_KEY');
  }

  async clientTurn(req: ClientTurnRequest, onDelta?: (text: string) => void, signal?: AbortSignal): Promise<ClientTurnDone> {
    const profile = JSON.stringify(req.caseProfile);
    const state = JSON.stringify(req.clientState ?? null);
    const history: ChatMessage[] = req.history.map((line) => ({
      role: line.speaker === 'CLIENT' ? 'assistant' : 'user',
      content: line.content,
    }));
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: [
          'Bạn là thân chủ AI trong một bài mô phỏng luyện kỹ năng tham vấn tâm lý.',
          'Chỉ trả lời bằng tiếng Việt, ở ngôi thứ nhất, 1 đến 3 câu ngắn.',
          'Không làm người tư vấn, không chẩn đoán, không đưa lời khuyên chuyên môn và không nói mình là AI.',
          'Giữ đúng hồ sơ ca, cảm xúc và thông tin đã được mở khóa. Không tự ý tiết lộ hiddenInformation.',
          `Hồ sơ ca: ${profile}`,
          `Trạng thái lượt trước: ${state}`,
        ].join('\n'),
      },
      ...history,
      { role: 'user', content: req.utterance.content },
    ];
    const body = { model: this.model, messages, stream: true, temperature: 0.7 };
    const res = await this.call('/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' }, body: JSON.stringify(body), signal }, signal);
    const result = await this.readStream(res, onDelta, signal);
    const student = req.utterance.content;
    return {
      text: result.text,
      emotion: this.emotion(student, result.text),
      clientState: { ...asRecord(req.clientState), turn: req.history.filter((line) => line.speaker === 'CLIENT').length + 1 },
      riskFlag: RISK_WORDS.test(student) ? { level: 'HIGH', reason: 'Người học nhắc tới nguy cơ tự hại hoặc không muốn sống' } : null,
      usage: { model: this.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens },
    };
  }

  /** Bản đầu dùng đánh giá local để không chặn luồng chat khi chưa có prompt đánh giá riêng. */
  assess(req: AssessmentRequest): Promise<AssessmentResult> {
    return this.local.assess(req);
  }

  async transcribe(req: SttRequest, signal?: AbortSignal): Promise<SttResult> {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(req.audio)], { type: req.mimeType }), 'audio.webm');
    form.append('model', 'whisper-1');
    form.append('language', 'vi');
    const res = await this.call('/audio/transcriptions', { method: 'POST', headers: { Accept: 'application/json' }, body: form, signal }, signal);
    const json = (await res.json()) as { text?: unknown };
    const text = textOf(json.text);
    if (!text) throw new AiServiceError('OpenAI trả về transcript rỗng', res.status, true);
    return { text, usage: { model: 'whisper-1' } };
  }

  async health(): Promise<AiHealth> {
    try {
      // XGENI proxy exposes the OpenAI-compatible collection endpoint; it does
      // not guarantee the optional /models/:id route.
      const res = await this.call('/models', { method: 'GET', signal: AbortSignal.timeout(5_000) }, AbortSignal.timeout(5_000));
      if (!res.ok) return { status: 'error' };
      return { status: 'ok', version: 'openai-compatible', model: this.model };
    } catch {
      return { status: 'error' };
    }
  }

  sttHealth(): Promise<AiHealth> {
    return this.health();
  }

  private async call(path: string, init: RequestInit, signal?: AbortSignal): Promise<Response> {
    if (waitSignal(signal)) throw new Error('aborted');
    let res: Response;
    try {
      res = await fetch(`${this.base}${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${this.key}` } });
    } catch (err) {
      if (signal?.aborted) throw err;
      throw new AiServiceError(`Không kết nối được OpenAI ${path}`, null, true);
    }
    if (res.ok) return res;
    await res.body?.cancel().catch(() => undefined);
    const retryable = res.status === 408 || res.status === 429 || res.status >= 500;
    if (res.status === 401 || res.status === 403) this.logger.error({ path, status: res.status }, 'Proxy AI từ chối API key');
    throw new AiServiceError(`Proxy AI trả lỗi (${res.status})`, res.status, retryable);
  }

  private async readStream(res: Response, onDelta?: (text: string) => void, signal?: AbortSignal) {
    if (!res.body) throw new AiServiceError('OpenAI không trả về luồng', res.status, true);
    const decoder = new TextDecoder();
    let buffer = '';
    let text = '';
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    for await (const chunk of res.body) {
      if (waitSignal(signal)) throw new Error('aborted');
      buffer += decoder.decode(chunk, { stream: true }).replace(/\r\n?/g, '\n');
      let end: number;
      while ((end = buffer.indexOf('\n\n')) >= 0) {
        const event = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const data = event
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())
          .join('');
        if (!data || data === '[DONE]') continue;
        let parsed: RecordValue;
        try {
          parsed = JSON.parse(data) as RecordValue;
        } catch {
          throw new AiServiceError('OpenAI trả về SSE sai cấu trúc', res.status, true);
        }
        const choices = Array.isArray(parsed.choices) ? parsed.choices : [];
        const delta = deltaTextOf(asRecord(choices[0]).delta && asRecord(asRecord(choices[0]).delta).content);
        if (delta) {
          text += delta;
          onDelta?.(delta);
        }
        const usage = asRecord(parsed.usage);
        if (typeof usage.prompt_tokens === 'number') inputTokens = usage.prompt_tokens;
        if (typeof usage.completion_tokens === 'number') outputTokens = usage.completion_tokens;
      }
    }
    if (!text.trim()) throw new AiServiceError('OpenAI trả về nội dung rỗng', res.status, true);
    return { text: text.trim(), inputTokens, outputTokens };
  }

  private emotion(student: string, answer: string): Emotion {
    if (RISK_WORDS.test(student)) return 'SAD';
    const parsed = emotionSchema.safeParse(asRecord(answer).emotion);
    if (parsed.success) return parsed.data;
    if (/nhẹ|yên tâm|đỡ hơn/i.test(answer)) return 'RELIEVED';
    if (/sợ|lo|áp lực|bế tắc/i.test(`${student} ${answer}`)) return 'ANXIOUS';
    return 'NEUTRAL';
  }
}
