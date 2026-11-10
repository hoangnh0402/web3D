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
/** Lời sinh viên chứa cụm này thì lượt đầu tiên báo lỗi, để thử nút Thử lại khi phát triển và kiểm thử */
export const MOCK_FAIL_ONCE = '[giả lập lỗi]';
/** Lần đánh giá đầu tiên của phiên báo lỗi, lần chạy lại thành công (AT-05) */
export const MOCK_ASSESS_FAIL = '[giả lập lỗi báo cáo]';
/** Đánh giá trả một dẫn chứng không có trong hội thoại (AT-11) */
export const MOCK_FAKE_EVIDENCE = '[giả lập dẫn chứng sai]';

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
  /** Lượt đã báo lỗi giả lập, theo phiên và số thứ tự lượt */
  private readonly failed = new Set<string>();

  async clientTurn(
    req: ClientTurnRequest,
    onDelta?: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<ClientTurnDone> {
    const key = `${req.sessionId}:${req.utterance.seq}`;
    if (req.utterance.content.includes(MOCK_FAIL_ONCE) && !this.failed.has(`${key}:done`)) {
      // Lỗi cả 3 lần gọi của lượt đầu (1 lần + 2 lần tự thử lại), thành công khi sinh viên bấm Thử lại
      const n = Number([...this.failed].filter((k) => k.startsWith(key)).length);
      this.failed.add(`${key}:${n}`);
      if (n >= 2) this.failed.add(`${key}:done`);
      await wait(20, signal);
      throw new Error('Giả lập: dịch vụ AI lỗi');
    }
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

  /** Phiên đã báo lỗi đánh giá giả lập, để lần chạy lại của quản trị viên thành công */
  private readonly failedAssessments = new Set<string>();

  async assess(req: AssessmentRequest): Promise<AssessmentResult> {
    const said = req.transcript.filter((t) => t.speaker === 'STUDENT');
    const all = said.map((t) => t.content).join(' ');
    if (all.includes(MOCK_ASSESS_FAIL) && !this.failedAssessments.has(req.sessionId)) {
      this.failedAssessments.add(req.sessionId);
      throw new Error('Giả lập: dịch vụ đánh giá lỗi');
    }
    const quote = (i: number) => {
      const t = said[i];
      return t ? [{ seq: t.seq, quote: t.content.split(/\s+/).slice(0, 8).join(' ') }] : [];
    };
    const questions = said.filter((t) => t.content.includes('?'));
    const evidence = {
      ACTIVE_LISTENING: quote(0),
      OPEN_QUESTIONS: questions[0] ? [{ seq: questions[0].seq, quote: questions[0].content.slice(0, 60) }] : [],
      EMPATHY: quote(1),
    } as Partial<Record<(typeof SKILL_CODES)[number], { seq: number; quote: string }[]>>;
    // AT-11: dẫn chứng không có thật phải bị máy chủ loại
    if (all.includes(MOCK_FAKE_EVIDENCE)) evidence.EMPATHY = [{ seq: said[0]?.seq ?? 1, quote: 'Câu này không hề có trong hội thoại' }];
    return {
      summary:
        said.length > 0
          ? `Bản giả lập: người tham vấn có ${said.length} lượt trao đổi, mở đầu thân thiện và khuyến khích thân chủ chia sẻ.`
          : 'Bản giả lập: phiên kết thúc trước khi người tham vấn trao đổi.',
      scores: SKILL_CODES.map((skill) => {
        const ev = evidence[skill] ?? [];
        return ev.length
          ? { skill, level: skill === 'ACTIVE_LISTENING' ? 3 : 2, rationale: 'Giả lập: có lượt thể hiện kỹ năng này', evidence: ev }
          : { skill, level: null, rationale: 'Chưa đủ dữ liệu', evidence: [] };
      }),
      strengths: ['Mở đầu phiên thân thiện, tạo cảm giác an toàn', 'Để thân chủ có thời gian chia sẻ'],
      improvements: [
        { point: 'Phản hồi cảm xúc rõ hơn trước khi hỏi tiếp', alternativePhrase: 'Nghe em kể, có vẻ em đang rất lo. Em có thể kể thêm không?' },
        { point: 'Tóm tắt lại vấn đề trước khi kết thúc', alternativePhrase: 'Anh chị nghe em nói em đang chịu áp lực từ việc học, có đúng không?' },
      ],
      reflectionQuestions: [
        'Ở lượt nào bạn thấy thân chủ bắt đầu mở lòng hơn? Điều gì đã giúp?',
        'Nếu được làm lại, bạn sẽ phản hồi cảm xúc của thân chủ thế nào?',
        'Bạn đã tôn trọng quyền tự quyết của thân chủ ra sao?',
      ],
      practiceGoals: ['Tóm tắt lại vấn đề của thân chủ trước khi kết thúc', 'Dùng thêm câu hỏi mở'],
      limitationNote: 'Đây là kết quả của dịch vụ giả lập. Phiên ngắn nên một số kỹ năng chưa đủ dữ liệu.',
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
