import { describe, expect, it } from 'vitest';
import { SimpleAiGateway } from './simple-ai.gateway';

describe('SimpleAiGateway', () => {
  it('không lặp dấu chấm khi vấn đề chính trong hồ sơ ca đã kết thúc bằng dấu chấm', async () => {
    const ai = new SimpleAiGateway();
    const done = await ai.clientTurn({
      requestId: 'r1',
      sessionId: 's1',
      caseProfile: { mainIssue: 'Linh mất ngủ và sợ gia đình thất vọng.', hiddenInformation: [] },
      clientState: { revealed: [] },
      history: [{ seq: 1, speaker: 'CLIENT', content: 'Dạ, em chào anh chị.' }],
      utterance: { seq: 2, content: 'Điều gì khiến em lo nhất?', inputMode: 'TEXT' },
    });
    expect(done.text).toContain('thất vọng.');
    expect(done.text).not.toContain('..');
  });
});
