import type { Emotion, SkillCode } from '@lab-fourt/shared';

/** Hợp đồng với dịch vụ AI và STT theo docs/srs/07. Phần web chỉ phụ thuộc vào các kiểu này. */

export interface TranscriptLine {
  seq: number;
  speaker: 'STUDENT' | 'CLIENT';
  content: string;
  inputMode?: 'VOICE' | 'TEXT';
  sttConfidence?: number;
}

export interface ClientTurnRequest {
  requestId: string;
  sessionId: string;
  caseProfile: unknown;
  clientState: unknown;
  history: TranscriptLine[];
  utterance: { seq: number; content: string; inputMode: 'VOICE' | 'TEXT' };
}

export interface Usage {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface ClientTurnDone {
  text: string;
  emotion?: Emotion;
  clientState: unknown;
  riskFlag: { level: 'HIGH'; reason: string } | null;
  usage?: Usage;
}

export interface AssessmentRequest {
  requestId: string;
  sessionId: string;
  caseProfile: unknown;
  rubric: { skills: SkillCode[]; levels: number[] };
  transcript: TranscriptLine[];
}

export interface AssessmentResult {
  summary: string;
  scores: { skill: SkillCode; level: number | null; rationale: string; evidence: { seq: number; quote: string }[] }[];
  strengths: string[];
  improvements: { point: string; alternativePhrase?: string }[];
  reflectionQuestions: string[];
  practiceGoals: string[];
  limitationNote?: string;
  usage?: Usage;
}

export interface SttRequest {
  requestId: string;
  sessionId: string;
  audio: Buffer;
  mimeType: string;
}

export interface SttResult {
  text: string;
  confidence?: number;
  durationSeconds?: number;
  usage?: Usage;
}

export interface AiHealth {
  status: 'ok' | 'error';
  version?: string;
  model?: string;
}

export interface AiGateway {
  /** onDelta nhận từng phần lời thân chủ khi dịch vụ trả dần */
  clientTurn(req: ClientTurnRequest, onDelta?: (text: string) => void, signal?: AbortSignal): Promise<ClientTurnDone>;
  assess(req: AssessmentRequest, signal?: AbortSignal): Promise<AssessmentResult>;
  transcribe(req: SttRequest, signal?: AbortSignal): Promise<SttResult>;
  health(): Promise<AiHealth>;
}

export const AI_GATEWAY = Symbol('AI_GATEWAY');
