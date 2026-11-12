import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadEnv, type Env } from '../config/env';
import { AiServiceError, retryDelay, type ClientTurnRequest } from './ai-gateway.types';
import { HttpAiGateway } from './http-ai.gateway';

/** Dịch vụ AI giả qua HTTP thật, để kiểm tra adapter theo đúng hợp đồng docs/srs/07 */
type Handler = (req: IncomingMessage, body: Buffer, res: ServerResponse) => void;
let handler: Handler;
let seen: { method?: string; url?: string; auth?: string; type?: string; body: Buffer }[] = [];
let server: Server;
let base: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      seen.push({ method: req.method, url: req.url, auth: req.headers.authorization, type: req.headers['content-type'], body });
      handler(req, body, res);
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

beforeEach(() => {
  seen = [];
});

const env = (extra: Record<string, string> = {}): Env =>
  loadEnv({ DATABASE_URL: 'postgresql://x', AI_PROVIDER: 'http', AI_BASE_URL: `${base}/`, AI_API_KEY: 'khoa-ai', ...extra });

const json = (res: ServerResponse, status: number, data: unknown, headers: Record<string, string> = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(data));
};

const turn: ClientTurnRequest = {
  requestId: 'req-1',
  sessionId: 'ses-1',
  caseProfile: { clientName: 'Hà Linh' },
  clientState: null,
  history: [],
  utterance: { seq: 2, content: 'Chào em', inputMode: 'TEXT' },
};

describe('HttpAiGateway', () => {
  it('đọc luồng SSE: trả dần từng phần, kết thúc bằng done, gửi kèm khóa dịch vụ', async () => {
    handler = (_req, _body, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      // Sự kiện bị cắt giữa chừng và dùng CRLF vẫn phải ghép đúng
      res.write(': giữ kết nối\r\n\r\nevent: delta\r\ndata: {"text":"Dạ, "}\r\n\r\nevent: del');
      res.write('ta\ndata: {"text":"em mệt lắm."}\n\n');
      res.end(
        `event: done\ndata: ${JSON.stringify({ text: 'Dạ, em mệt lắm.', emotion: 'ANXIOUS', clientState: { turn: 1 }, riskFlag: null, usage: { model: 'm', inputTokens: 10, outputTokens: 4 } })}\n\n`,
      );
    };
    const deltas: string[] = [];
    const done = await new HttpAiGateway(env()).clientTurn(turn, (t) => deltas.push(t));
    expect(deltas).toEqual(['Dạ, ', 'em mệt lắm.']);
    expect(done).toMatchObject({ text: 'Dạ, em mệt lắm.', emotion: 'ANXIOUS', clientState: { turn: 1 }, riskFlag: null });
    expect(seen[0]).toMatchObject({ method: 'POST', url: '/v1/client-turns', auth: 'Bearer khoa-ai' });
    expect(JSON.parse(seen[0]!.body.toString())).toMatchObject({ requestId: 'req-1', sessionId: 'ses-1' });
  });

  it('nhận phản hồi JSON một lần; cảm xúc lạ bị bỏ, thiếu riskFlag coi như không có nguy cơ', async () => {
    handler = (_req, _body, res) => json(res, 200, { text: 'Dạ vâng.', emotion: 'HAPPY', clientState: { a: 1 } });
    const done = await new HttpAiGateway(env()).clientTurn(turn);
    expect(done).toMatchObject({ text: 'Dạ vâng.', emotion: undefined, riskFlag: null });
  });

  it('sự kiện error giữa luồng và luồng thiếu done đều là lỗi được thử lại', async () => {
    handler = (_req, _body, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.end('event: delta\ndata: {"text":"Dạ"}\n\nevent: error\ndata: {"message":"lỗi"}\n\n');
    };
    const gw = new HttpAiGateway(env());
    const err1 = await gw.clientTurn(turn).catch((e: unknown) => e);
    expect(err1).toBeInstanceOf(AiServiceError);
    expect((err1 as AiServiceError).retryable).toBe(true);

    handler = (_req, _body, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.end('event: delta\ndata: {"text":"Dạ"}\n\n');
    };
    expect(((await gw.clientTurn(turn).catch((e: unknown) => e)) as AiServiceError).retryable).toBe(true);
  });

  it('phân loại lỗi HTTP theo docs/srs/07 mục 7', async () => {
    const gw = new HttpAiGateway(env());
    const statusOf = async (status: number, headers: Record<string, string> = {}) => {
      handler = (_req, _body, res) => json(res, status, { error: 'x' }, headers);
      return (await gw.clientTurn(turn).catch((e: unknown) => e)) as AiServiceError;
    };
    expect((await statusOf(400)).retryable).toBe(false);
    expect((await statusOf(401)).retryable).toBe(false);
    expect((await statusOf(408)).retryable).toBe(true);
    expect((await statusOf(503)).retryable).toBe(true);
    const busy = await statusOf(429, { 'Retry-After': '3' });
    expect(busy).toMatchObject({ status: 429, retryable: true, retryAfterMs: 3000 });
    // Thông điệp lỗi không chứa nội dung phản hồi
    expect(busy.message).not.toContain('error');

    expect(retryDelay(await statusOf(400), 1000)).toBeNull();
    expect(retryDelay(busy, 1000)).toBe(3000);
    expect(retryDelay(new Error('khác'), 1000)).toBe(1000);
  });

  it('không kết nối được dịch vụ là lỗi được thử lại', async () => {
    const gw = new HttpAiGateway(env({ AI_BASE_URL: 'http://127.0.0.1:1' }));
    const err = (await gw.clientTurn(turn).catch((e: unknown) => e)) as AiServiceError;
    expect(err).toMatchObject({ status: null, retryable: true });
  });

  it('đánh giá: bỏ kỹ năng ngoài rubric, phản hồi sai cấu trúc là lỗi', async () => {
    handler = (_req, _body, res) =>
      json(res, 200, {
        summary: 'Tóm tắt',
        scores: [
          { skill: 'EMPATHY', level: 3, rationale: 'Có', evidence: [{ seq: 2, quote: 'Chào em' }] },
          { skill: 'KY_NANG_LA', level: 2, rationale: 'Lạ', evidence: [] },
        ],
      });
    const gw = new HttpAiGateway(env());
    const req = { requestId: 'r', sessionId: 's', caseProfile: {}, rubric: { skills: [], levels: [1, 2, 3, 4] }, transcript: [] };
    const result = await gw.assess(req);
    expect(result.scores.map((s) => s.skill)).toEqual(['EMPATHY']);
    expect(seen[0]?.url).toBe('/v1/assessments');

    handler = (_req, _body, res) => json(res, 200, { scores: 'sai' });
    expect(await gw.assess(req).catch((e: unknown) => e)).toBeInstanceOf(AiServiceError);
  });

  it('STT gửi multipart tới địa chỉ STT riêng với khóa riêng', async () => {
    handler = (_req, _body, res) => json(res, 200, { text: 'Mình nghe đây.', confidence: 0.9, durationSeconds: 2.5 });
    const gw = new HttpAiGateway(env({ STT_BASE_URL: `${base}/stt-host`, STT_API_KEY: 'khoa-stt' }));
    const result = await gw.transcribe({ requestId: 'r', sessionId: 's', audio: Buffer.from('am-thanh'), mimeType: 'audio/webm;codecs=opus' });
    expect(result).toMatchObject({ text: 'Mình nghe đây.', confidence: 0.9 });
    expect(seen[0]).toMatchObject({ url: '/stt-host/v1/stt', auth: 'Bearer khoa-stt' });
    expect(seen[0]?.type).toMatch(/^multipart\/form-data/);
    const body = seen[0]!.body.toString();
    expect(body).toContain('name="language"');
    expect(body).toContain('filename="audio.webm"');
    expect(body).toContain('am-thanh');
  });

  it('kiểm tra trạng thái: ok, lỗi; STT dùng chung địa chỉ thì kiểm tra cùng điểm cuối /health', async () => {
    handler = (_req, _body, res) => json(res, 200, { status: 'ok', version: '1.0.0' });
    const gw = new HttpAiGateway(env());
    expect(await gw.health()).toMatchObject({ status: 'ok', version: '1.0.0' });
    expect(await gw.sttHealth()).toMatchObject({ status: 'ok' });
    expect(seen.map((s) => s.url)).toEqual(['/health', '/health']);

    handler = (_req, _body, res) => json(res, 503, {});
    expect(await gw.health()).toEqual({ status: 'error' });
  });

  it('chọn http mà thiếu địa chỉ hoặc khóa thì báo lỗi cấu hình ngay lúc khởi động', () => {
    expect(() => loadEnv({ DATABASE_URL: 'x', AI_PROVIDER: 'http' })).toThrow(/AI_BASE_URL.*AI_API_KEY/);
    // Biến để trống như trong Compose được coi như chưa đặt
    expect(loadEnv({ DATABASE_URL: 'x', AI_PROVIDER: 'mock', AI_BASE_URL: '', STT_API_KEY: '' }).AI_BASE_URL).toBeUndefined();
  });
});
