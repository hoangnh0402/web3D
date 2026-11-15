import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadEnv } from '../config/env';
import { SimpleAiGateway } from './simple-ai.gateway';
import { OpenAiAiGateway } from './openai-ai.gateway';

describe('OpenAiAiGateway', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('giữ khoảng trắng giữa các delta khi ghép câu trả lời stream', async () => {
    const env = loadEnv({
      DATABASE_URL: 'postgresql://test',
      AI_PROVIDER: 'http',
      AI_PROTOCOL: 'openai',
      AI_BASE_URL: 'http://proxy.test/v1',
      AI_API_KEY: 'proxy-test-key',
      AI_MODEL: 'xgeni-router/gpt-6-luna',
    });
    const chunks = ['Xin', ' chào', ' bạn'];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          chunks.map((content) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`).join('') + 'data: [DONE]\n\n',
          { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
        ),
      ),
    );

    const deltas: string[] = [];
    const done = await new OpenAiAiGateway(env, new SimpleAiGateway()).clientTurn(
      {
        requestId: 'request-1',
        sessionId: 'session-1',
        caseProfile: { mainIssue: 'synthetic' },
        clientState: null,
        history: [],
        utterance: { seq: 1, content: 'Xin chào', inputMode: 'TEXT' },
      },
      (text) => deltas.push(text),
    );

    expect(deltas).toEqual(chunks);
    expect(done.text).toBe('Xin chào bạn');
  });
});
