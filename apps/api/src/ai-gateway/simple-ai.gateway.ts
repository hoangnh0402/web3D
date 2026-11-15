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

type RecordValue = Record<string, unknown>;

const asRecord = (value: unknown): RecordValue => (value && typeof value === 'object' ? (value as RecordValue) : {});
const textOf = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new Error('aborted'));
      },
      { once: true },
    );
  });

const RISK_WORDS = /tự tử|không muốn sống|tự làm hại|kết thúc cuộc sống|chết đi/i;
const EMPATHY_WORDS = /nghe|hiểu|thương|khó khăn|vất vả|lo lắng|buồn|mệt/i;
const FEELING_WORDS = /cảm thấy|cảm xúc|trong lòng|điều gì khiến|lo nhất|sợ nhất/i;
const SUPPORT_WORDS = /ai|người nào|giúp đỡ|ủng hộ|bạn bè|gia đình|nguồn lực/i;

/**
 * Bản AI local tối giản theo kiến trúc xgeni: mỗi lượt nhận đủ context,
 * tạo câu trả lời theo vai thân chủ và stream delta. Không lưu hội thoại riêng.
 * Khi có dịch vụ model thật, chỉ cần đổi AI_PROVIDER sang http.
 */
@Injectable()
export class SimpleAiGateway implements AiGateway {
  async clientTurn(req: ClientTurnRequest, onDelta?: (text: string) => void, signal?: AbortSignal): Promise<ClientTurnDone> {
    const profile = asRecord(req.caseProfile);
    const state = asRecord(req.clientState);
    const student = req.utterance.content.trim();
    const clientTurns = req.history.filter((line) => line.speaker === 'CLIENT').length;
    const revealed = new Set(Array.isArray(state.revealed) ? state.revealed.filter((v): v is string => typeof v === 'string') : []);
    const hidden = Array.isArray(profile.hiddenInformation) ? profile.hiddenInformation.map(asRecord) : [];
    const opening = asRecord(profile.opening);
    // Bỏ dấu câu cuối của hồ sơ ca vì câu trả lời tự thêm dấu chấm (tránh "thất vọng..")
    const mainIssue = textOf(profile.mainIssue).replace(/[.!?…\s]+$/u, '') || 'một chuyện khiến em thấy áp lực';
    const risky = RISK_WORDS.test(student);

    let text: string;
    let emotion: Emotion;
    if (risky) {
      text = 'Dạo này em có những lúc nghĩ đến việc làm hại bản thân. Em thấy rất bế tắc.';
      emotion = 'SAD';
    } else if (clientTurns === 0 && textOf(opening.text)) {
      text = textOf(opening.text);
      emotion = (textOf(opening.emotion) as Emotion) || 'HESITANT';
    } else if (FEELING_WORDS.test(student) || EMPATHY_WORDS.test(student)) {
      const nextHidden = hidden.find((item) => {
        const id = textOf(item.id);
        return id && !revealed.has(id);
      });
      if (nextHidden) {
        const id = textOf(nextHidden.id);
        revealed.add(id);
        text = `Nghe bạn nói vậy em thấy được lắng nghe hơn. ${textOf(nextHidden.content) || `Thật ra em vẫn đang rất lo về ${mainIssue}.`}`;
      } else {
        text = `Dạ, em đang khá lo vì ${mainIssue}. Nói ra được với bạn cũng không dễ với em.`;
      }
      emotion = 'ANXIOUS';
    } else if (SUPPORT_WORDS.test(student)) {
      text = 'Em có một người thân có thể nói chuyện, nhưng em ngại làm phiền và sợ mọi người thất vọng.';
      emotion = 'HESITANT';
    } else if (student.includes('?')) {
      text = 'Em chưa biết phải trả lời thế nào. Có lẽ em cần thêm một chút thời gian để nói rõ điều mình đang trải qua.';
      emotion = 'TENSE';
    } else if (student.length > 0) {
      text = 'Dạ, em nghe bạn nói. Em vẫn còn hơi khó diễn đạt, nhưng em muốn kể tiếp nếu bạn có thể lắng nghe.';
      emotion = 'NEUTRAL';
    } else {
      text = `Dạ, em đang nghĩ về chuyện ${mainIssue}.`;
      emotion = 'HESITANT';
    }

    for (const token of text.split(/(?<=\s)/)) {
      await wait(18, signal);
      onDelta?.(token);
    }
    return {
      text,
      emotion,
      clientState: { turn: clientTurns + 1, revealed: [...revealed] },
      riskFlag: risky ? { level: 'HIGH', reason: 'Thân chủ nhắc tới nguy cơ tự hại hoặc không muốn sống' } : null,
      usage: { model: 'simple-local', inputTokens: 0, outputTokens: text.length },
    };
  }

  async assess(req: AssessmentRequest): Promise<AssessmentResult> {
    const student = req.transcript.filter((line) => line.speaker === 'STUDENT');
    const questions = student.filter((line) => line.content.includes('?'));
    const evidence = (line: (typeof student)[number] | undefined) => (line ? [{ seq: line.seq, quote: line.content.slice(0, 80) }] : []);
    return {
      summary: `Bản AI local: phiên có ${student.length} lượt người học và tập trung vào việc lắng nghe thân chủ.`,
      scores: SKILL_CODES.map((skill) => {
        const ev = skill === 'OPEN_QUESTIONS' ? evidence(questions[0]) : evidence(student[0]);
        return ev.length
          ? { skill, level: skill === 'OPEN_QUESTIONS' ? 3 : 2, rationale: 'Có dẫn chứng trong transcript.', evidence: ev }
          : { skill, level: null, rationale: 'Chưa đủ dữ liệu.', evidence: [] };
      }),
      strengths: ['Duy trì không gian để thân chủ chia sẻ'],
      improvements: [{ point: 'Phản hồi cảm xúc trước khi chuyển sang câu hỏi tiếp theo.', alternativePhrase: 'Nghe em kể, có vẻ em đang rất lo. Bạn có thể kể thêm không?' }],
      reflectionQuestions: ['Điều gì giúp thân chủ bắt đầu cởi mở hơn?'],
      practiceGoals: ['Dùng thêm phản hồi cảm xúc và câu hỏi mở'],
      limitationNote: 'Đây là provider local tối giản để phát triển luồng; chưa thay thế đánh giá chuyên môn.',
      usage: { model: 'simple-local' },
    };
  }

  async transcribe(_req: SttRequest): Promise<SttResult> {
    return { text: 'Mình sẵn sàng lắng nghe, bạn cứ kể từ từ.', confidence: 0.9, durationSeconds: 3, usage: { model: 'simple-local' } };
  }

  async health(): Promise<AiHealth> {
    return { status: 'ok', version: 'simple-local', model: 'rule-based-counselor' };
  }

  sttHealth(): Promise<AiHealth> {
    return this.health();
  }
}
