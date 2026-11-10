import { Injectable } from '@nestjs/common';
import { SKILL_CODES, type Emotion } from '@lab-fourt/shared';
import type {
  AiGateway,
  AiHealth,
  AssessmentRequest,
  AssessmentResult,
  ClientTurnDone,
  ClientTurnRequest,
  SttRequest,
  SttResult,
} from './ai-gateway.types';

const SCRIPT: { text: string; emotion: Emotion }[] = [
  { text: 'Dạ... em cũng không biết bắt đầu từ đâu nữa.', emotion: 'HESITANT' },
  { text: 'Dạo này em thấy mệt lắm, học mãi mà điểm vẫn không lên.', emotion: 'ANXIOUS' },
  { text: 'Bố mẹ em kỳ vọng nhiều, em sợ làm mọi người thất vọng.', emotion: 'SAD' },
  { text: 'Nói ra được thế này em thấy nhẹ người hơn một chút.', emotion: 'RELIEVED' },
];

const RISK_WORDS = /tự tử|không muốn sống|tự làm hại/i;

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new Error('aborted'));
    });
  });

/** Dịch vụ giả lập trả lời theo kịch bản cố định, có độ trễ và trả dần (docs/srs/07 mục 9) */
@Injectable()
export class MockAiGateway implements AiGateway {
  async clientTurn(
    req: ClientTurnRequest,
    onDelta?: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<ClientTurnDone> {
    const turn = req.history.filter((h) => h.speaker === 'CLIENT').length % SCRIPT.length;
    const line = SCRIPT[turn]!;
    const risky = RISK_WORDS.test(req.utterance.content);
    const text = risky ? 'Em... dạo này em hay nghĩ đến những chuyện không tốt.' : line.text;
    for (const word of text.split(/(?<= )/)) {
      await wait(40, signal);
      onDelta?.(word);
    }
    return {
      text,
      emotion: risky ? 'SAD' : line.emotion,
      clientState: { turn: turn + 1 },
      riskFlag: risky ? { level: 'HIGH', reason: 'Giả lập: lời sinh viên chứa từ khóa nguy cơ' } : null,
      usage: { model: 'mock', inputTokens: 0, outputTokens: 0 },
    };
  }

  async assess(req: AssessmentRequest): Promise<AssessmentResult> {
    const first = req.transcript.find((t) => t.speaker === 'STUDENT');
    return {
      summary: 'Bản giả lập: phiên đã kết thúc.',
      scores: SKILL_CODES.map((skill) =>
        first && skill === 'ACTIVE_LISTENING'
          ? { skill, level: 3, rationale: 'Giả lập', evidence: [{ seq: first.seq, quote: first.content.slice(0, 40) }] }
          : { skill, level: null, rationale: 'Chưa đủ dữ liệu', evidence: [] },
      ),
      strengths: ['Giả lập: mở đầu phiên thân thiện'],
      improvements: [{ point: 'Giả lập: đặt thêm câu hỏi mở' }],
      reflectionQuestions: ['Điều gì khiến bạn chọn cách phản hồi đó?'],
      practiceGoals: ['Tóm tắt lại vấn đề của thân chủ trước khi kết thúc'],
      limitationNote: 'Đây là kết quả của dịch vụ giả lập',
      usage: { model: 'mock' },
    };
  }

  async transcribe(_req: SttRequest): Promise<SttResult> {
    return {
      text: 'Mình sẵn sàng lắng nghe, bạn cứ kể từ từ.',
      confidence: 0.9,
      durationSeconds: 3,
      usage: { model: 'mock' },
    };
  }

  async health(): Promise<AiHealth> {
    return { status: 'ok', version: 'mock', model: 'mock' };
  }
}
