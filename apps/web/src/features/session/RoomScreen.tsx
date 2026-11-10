'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  Loader2,
  Mic,
  MicOff,
  Send,
  ShieldAlert,
  Square,
  WifiOff,
  X,
} from 'lucide-react';
import type { InputMode, MessageDto, SessionDetail, SessionEvent } from '@lab-fourt/shared';
import { Modal } from '@/components/modal';
import { MsgLine } from '@/components/msg-line';
import { Notice } from '@/components/ui';
import { ApiRequestError } from '@/lib/api';
import { endSession, sendTurn, setRenderMode, transcribe } from '@/lib/sessions';
import { RoomStage, useWebGL2 } from '@/features/room/RoomView';
import type { Activity } from '@/features/room/rig';
import { MAX_RECORD_SECONDS, useRecorder, type MicProblem } from './useRecorder';
import { useSessionStream } from './useSessionStream';

type Phase = 'ready' | 'recording' | 'transcribing' | 'confirm' | 'ai' | 'offline' | 'error';

const STATE_TEXT: Record<Phase, string> = {
  ready: 'Nhấn micro để nói hoặc nhập văn bản',
  recording: 'Đang ghi âm, nhấn để dừng',
  transcribing: 'Đang chuyển lời nói thành văn bản',
  confirm: 'Kiểm tra văn bản, sửa nếu cần rồi bấm Gửi',
  ai: 'Thân chủ đang trả lời',
  offline: 'Mất kết nối. Nội dung của bạn vẫn được giữ, đang kết nối lại',
  error: 'Thân chủ chưa trả lời được. Lời của bạn đã được lưu',
};

const MIC_HELP: Record<Exclude<MicProblem, null>, string> = {
  denied: 'Trình duyệt chưa cho phép dùng micro. Mở cài đặt trang để cấp quyền, hoặc tiếp tục bằng văn bản.',
  unavailable: 'Không tìm thấy micro trên thiết bị này. Bạn vẫn có thể tiếp tục bằng văn bản.',
  insecure: 'Micro chỉ dùng được khi truy cập qua HTTPS. Bạn vẫn có thể tiếp tục bằng văn bản.',
};

/** Cảnh báo trước khi hết giờ (FR-SES-07) */
const WARN_BEFORE_MS = 2 * 60_000;
const INTRO_KEY = 'lf.room.introSeen';

// ---------- Trạng thái hội thoại ----------

interface Live {
  messages: MessageDto[];
  caption: string;
  aiBusy: boolean;
  error: string | null;
  safety: string | null;
}

type Action =
  | { type: 'load'; session: SessionDetail }
  | { type: 'event'; event: SessionEvent }
  | { type: 'upsert'; message: MessageDto }
  | { type: 'retrying' }
  | { type: 'dismiss-safety' };

const upsert = (list: MessageDto[], m: MessageDto) =>
  list.some((x) => x.seq === m.seq) ? list.map((x) => (x.seq === m.seq ? m : x)) : [...list, m].sort((a, b) => a.seq - b.seq);

const reducer = (s: Live, a: Action): Live => {
  switch (a.type) {
    case 'load':
      return {
        ...s,
        messages: a.session.messages,
        aiBusy: a.session.aiBusy,
        caption: a.session.aiBusy ? s.caption : '',
        error: a.session.awaitingRetry ? STATE_TEXT.error : null,
      };
    case 'upsert':
      return { ...s, messages: upsert(s.messages, a.message) };
    case 'retrying':
      return { ...s, error: null, aiBusy: true, caption: '' };
    case 'dismiss-safety':
      return { ...s, safety: null };
    case 'event': {
      const e = a.event;
      if (e.type === 'delta') return { ...s, caption: e.reset ? '' : s.caption + e.text };
      if (e.type === 'message') {
        return { ...s, messages: upsert(s.messages, e.message), caption: e.message.speaker === 'CLIENT' ? '' : s.caption };
      }
      if (e.type === 'busy') return { ...s, aiBusy: e.busy, error: e.busy ? null : s.error };
      if (e.type === 'turn-error') return { ...s, aiBusy: false, caption: '', error: e.message };
      if (e.type === 'safety') return { ...s, safety: e.guidance };
      return s;
    }
  }
};

const useNow = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return now;
};

const clock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

// ---------- Màn hình ----------

/** SCR-06 Phòng tham vấn (docs/srs/05 mục 2). Hội thoại là HTML nằm ngoài vùng 3D. */
export const RoomScreen = ({ session, onResync }: { session: SessionDetail; onResync: () => void }) => {
  const router = useRouter();
  const qc = useQueryClient();
  const c = session.case;
  const [live, dispatch] = useReducer(reducer, {
    messages: session.messages,
    caption: '',
    aiBusy: session.aiBusy,
    error: session.awaitingRetry ? STATE_TEXT.error : null,
    safety: null,
  });
  const [draft, setDraft] = useState('');
  const [voice, setVoice] = useState<{ text: string; confidence: number | null } | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const [intro, setIntro] = useState(false);
  const webglOk = useWebGL2();
  const [chosenView, setChosenView] = useState<'3D' | '2D'>(session.renderMode === 'LITE_2D' ? '2D' : '3D');
  const [gfxNote, setGfxNote] = useState('');
  const [lowFps, setLowFps] = useState(false);
  const lastAttempt = useRef<{ clientTurnId: string; content: string } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const autoEnded = useRef(false);
  const now = useNow();

  // Tải lại phiên từ máy chủ (sau khi kết nối lại) thì thay trạng thái cục bộ
  useEffect(() => dispatch({ type: 'load', session }), [session]);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc lựa chọn đã lưu sau khi mount
      if (!localStorage.getItem(INTRO_KEY)) setIntro(true);
    } catch {
      // Không đọc được bộ nhớ trình duyệt thì bỏ qua hướng dẫn
    }
  }, []);

  const goToSummary = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['sessions'] });
    router.replace(`/student/history/${session.id}`);
  }, [qc, router, session.id]);

  const stream = useSessionStream(
    session.id,
    session.status === 'IN_PROGRESS',
    (event) => {
      if (event.type === 'ended') goToSummary();
      else dispatch({ type: 'event', event });
    },
    onResync,
  );

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [live.messages, live.caption]);

  const recorder = useRecorder(async (blob) => {
    setTranscribing(true);
    setNotice(null);
    try {
      const r = await transcribe(session.id, blob);
      setDraft(r.text);
      setVoice({ text: r.text, confidence: r.confidence });
    } catch (err) {
      setNotice(err instanceof ApiRequestError ? err.message : 'Chưa nhận dạng được giọng nói. Hãy nói lại hoặc nhập văn bản.');
    } finally {
      setTranscribing(false);
    }
  });

  // ---------- Thời gian ----------
  const deadline = new Date(session.deadline).getTime();
  const elapsed = now - new Date(session.startedAt).getTime();
  const remaining = deadline - now;

  const finish = useCallback(async () => {
    setEnding(true);
    try {
      await endSession(session.id);
    } catch {
      // Phiên có thể đã được máy chủ kết thúc; vẫn chuyển sang trang tóm tắt
    }
    goToSummary();
  }, [goToSummary, session.id]);

  // Hết giờ thì tự kết thúc và lưu
  useEffect(() => {
    if (remaining <= 0 && !autoEnded.current && session.status === 'IN_PROGRESS') {
      autoEnded.current = true;
      void finish();
    }
  }, [remaining, finish, session.status]);

  // ---------- Gửi lượt ----------
  const phase: Phase = recorder.recording
    ? 'recording'
    : transcribing
      ? 'transcribing'
      : live.aiBusy
        ? 'ai'
        : live.error
          ? 'error'
          : stream === 'reconnecting'
            ? 'offline'
            : voice && draft
              ? 'confirm'
              : 'ready';
  const inputLocked = phase === 'ai' || phase === 'recording' || phase === 'transcribing' || sending;
  const canSend = !!draft.trim() && (phase === 'ready' || phase === 'confirm' || phase === 'offline') && !sending;

  const submit = async (turn: { clientTurnId: string; content: string; inputMode: InputMode; sttConfidence?: number; sttEdited?: boolean }) => {
    setSending(true);
    setNotice(null);
    try {
      const message = await sendTurn(session.id, turn);
      dispatch({ type: 'upsert', message });
      return true;
    } catch (err) {
      setNotice(err instanceof ApiRequestError ? err.message : 'Chưa gửi được. Nội dung của bạn vẫn còn, hãy thử lại.');
      return false;
    } finally {
      setSending(false);
    }
  };

  const send = async () => {
    const content = draft.trim();
    if (!canSend) return;
    // Bấm Gửi lại cùng nội dung sau khi mất mạng thì dùng lại mã lượt cũ để không tạo lượt trùng
    const clientTurnId =
      lastAttempt.current?.content === content ? lastAttempt.current.clientTurnId : crypto.randomUUID();
    lastAttempt.current = { clientTurnId, content };
    const ok = await submit({
      clientTurnId,
      content,
      inputMode: voice ? 'VOICE' : 'TEXT',
      ...(voice ? { sttConfidence: voice.confidence ?? undefined, sttEdited: content !== voice.text.trim() } : {}),
    });
    if (ok) {
      setDraft('');
      setVoice(null);
      lastAttempt.current = null;
    }
  };

  /** Thử lại lượt cuối chưa có phản hồi bằng chính mã lượt đã lưu (FR-CONV-08) */
  const retry = async () => {
    const last = live.messages.at(-1);
    if (!last || last.speaker !== 'STUDENT' || !last.clientTurnId) return;
    dispatch({ type: 'retrying' });
    const ok = await submit({
      clientTurnId: last.clientTurnId,
      content: last.content,
      inputMode: last.inputMode ?? 'TEXT',
      ...(last.sttConfidence !== null ? { sttConfidence: last.sttConfidence } : {}),
      sttEdited: last.sttEdited,
    });
    if (!ok) onResync();
  };

  const toggleMic = () => {
    if (recorder.problem || phase === 'ai' || phase === 'transcribing' || phase === 'offline') return;
    if (recorder.recording) recorder.stop();
    else void recorder.start();
  };

  // ---------- Hiển thị ----------
  const view: '3D' | '2D' = webglOk === false ? '2D' : chosenView;
  const switchView = (v: '3D' | '2D') => {
    if (v === '3D' && webglOk === false) return;
    setChosenView(v);
    setLowFps(false);
    setGfxNote('');
    void setRenderMode(session.id, v === '3D' ? 'THREE_D' : 'LITE_2D').catch(() => undefined);
  };
  const onLost = useCallback(() => {
    setChosenView('2D');
    setGfxNote('Phòng 3D gặp lỗi đồ họa, hệ thống đã chuyển sang chế độ nhẹ. Hội thoại không bị ảnh hưởng.');
  }, []);
  const onFps = useCallback((fps: number) => {
    if (fps < 18) setLowFps(true);
  }, []);

  const lastClient = [...live.messages].reverse().find((m) => m.speaker === 'CLIENT');
  const emotion = lastClient?.emotion ?? 'NEUTRAL';
  const caption = live.caption || (phase === 'ai' ? '' : (lastClient?.content ?? ''));
  const activity: Activity =
    phase === 'ai' ? (live.caption ? 'responding' : 'thinking') : phase === 'recording' || phase === 'confirm' || phase === 'transcribing' || draft ? 'listening' : 'idle';
  const studentTurns = live.messages.filter((m) => m.speaker === 'STUDENT').length;
  const closeIntro = () => {
    setIntro(false);
    try {
      localStorage.setItem(INTRO_KEY, '1');
    } catch {
      // Không lưu được thì lần sau hiện lại hướng dẫn
    }
  };

  return (
    <>
      <div className="room">
        <section className="stage" aria-label="Phòng tham vấn">
          {webglOk !== null && (
            <RoomStage
              variant={c.avatarKey}
              emotion={emotion}
              activity={activity}
              view={view}
              onLost={onLost}
              onFps={onFps}
              label={`Thân chủ ${c.clientName} trong phòng tham vấn`}
            />
          )}
          <div className="stage-top">
            <div className="row" style={{ gap: 6 }}>
              {/* FR-SES-10: nhãn môi trường mô phỏng luôn hiển thị */}
              <span className="glass">
                <span className="dot" aria-hidden />
                Môi trường mô phỏng
              </span>
              <span className="glass num" aria-label={`Đã dùng ${clock(elapsed)} trên ${c.maxDurationMin} phút`}>
                {clock(elapsed)} / {c.maxDurationMin}:00
              </span>
            </div>
            <div className="seg" role="group" aria-label="Chế độ hiển thị">
              <button type="button" aria-pressed={view === '3D'} disabled={webglOk === false} onClick={() => switchView('3D')}>
                3D
              </button>
              <button type="button" aria-pressed={view === '2D'} onClick={() => switchView('2D')}>
                2D
              </button>
            </div>
          </div>

          {phase === 'offline' && (
            <div className="room-offline" role="status">
              <WifiOff size={13} aria-hidden style={{ verticalAlign: -2, marginRight: 6 }} />
              Mất kết nối, đang kết nối lại
            </div>
          )}
          {remaining > 0 && remaining <= WARN_BEFORE_MS && (
            <div className="banner">
              <Notice tone="warn" icon={AlertTriangle}>
                Phiên còn khoảng {Math.ceil(remaining / 60_000)} phút. Hết giờ hệ thống sẽ tự kết thúc và lưu hội thoại.
              </Notice>
            </div>
          )}
          {lowFps && view === '3D' && !gfxNote && (
            <div className="banner">
              <Notice tone="warn" icon={AlertTriangle}>
                <div className="row between">
                  <span>Phòng 3D đang chạy chậm trên thiết bị này.</span>
                  <button type="button" className="btn secondary sm" onClick={() => switchView('2D')}>
                    Chuyển sang chế độ nhẹ
                  </button>
                </div>
              </Notice>
            </div>
          )}
          {(gfxNote || webglOk === false) && (
            <div className="banner">
              <Notice tone="warn" icon={AlertTriangle}>
                <div className="row between">
                  <span>{gfxNote || 'Thiết bị này chưa hỗ trợ phòng 3D, bạn đang dùng chế độ nhẹ.'}</span>
                  {gfxNote && (
                    <button type="button" className="icon-btn" aria-label="Đóng thông báo" onClick={() => setGfxNote('')}>
                      <X size={15} />
                    </button>
                  )}
                </div>
              </Notice>
            </div>
          )}
          {live.safety && (
            <div className="safety" role="alert">
              <ShieldAlert size={22} color="var(--danger)" aria-hidden style={{ flex: 'none' }} />
              <div className="stack" style={{ gap: 6 }}>
                <h3>Tín hiệu cần chú ý về an toàn</h3>
                <p className="small">{live.safety}</p>
                <div>
                  <button type="button" className="btn secondary sm" onClick={() => dispatch({ type: 'dismiss-safety' })}>
                    Tôi đã đọc
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="caption" aria-live="polite">
            <b>{c.clientName}</b>
            {phase === 'ai' && !live.caption ? (
              <span className="typing" aria-label="Thân chủ đang suy nghĩ">
                <i />
                <i />
                <i />
              </span>
            ) : phase === 'error' ? (
              <p className="muted">Thân chủ chưa trả lời được.</p>
            ) : (
              <p>{caption}</p>
            )}
          </div>
          {intro && (
            <div className="intro">
              <div className="card" role="dialog" aria-label="Làm quen với phòng tham vấn">
                <h2>Làm quen với phòng tham vấn</h2>
                <ol className="small">
                  <li>Thân chủ ngồi chếch đối diện bạn. Kéo chuột, vuốt hoặc dùng phím mũi tên để xoay góc nhìn.</li>
                  <li>Nhấn micro để nói hoặc nhập văn bản ở khung hội thoại.</li>
                  <li>Thân chủ trả lời bằng chữ trên màn hình.</li>
                  <li>Khi xong, bấm Kết thúc phiên. Hết giờ hệ thống sẽ tự lưu.</li>
                </ol>
                <button type="button" className="btn primary" onClick={closeIntro}>
                  Bắt đầu trò chuyện
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="talk" aria-label="Hội thoại">
          <div className="talk-head">
            <div>
              <b>{c.title}</b>
              <div className="small muted">Thân chủ {c.clientName}</div>
            </div>
            <button type="button" className="btn secondary sm" onClick={() => setConfirmEnd(true)}>
              <Square size={15} aria-hidden />
              Kết thúc phiên
            </button>
          </div>
          <div className="talk-log" ref={logRef} aria-live="polite" aria-relevant="additions">
            {live.messages.map((m) => (
              <MsgLine key={m.seq} m={m} clientName={c.clientName} />
            ))}
            {live.caption && phase === 'ai' && (
              <div className="msg client">
                <div className="who-line">
                  <span>{c.clientName}</span>
                </div>
                <div className="text">{live.caption}</div>
              </div>
            )}
          </div>
          <div className="composer">
            {phase === 'error' && (
              <div className="row between">
                <span className="small">
                  <CloudOff size={14} aria-hidden style={{ verticalAlign: -2, marginRight: 6 }} />
                  {live.error}
                </span>
                <button type="button" className="btn secondary sm" onClick={retry} disabled={sending}>
                  Thử lại
                </button>
              </div>
            )}
            {notice && (
              <Notice tone="warn" icon={AlertTriangle}>
                <span className="small">{notice}</span>
              </Notice>
            )}
            {recorder.problem && (
              <Notice tone="warn" icon={MicOff}>
                <span className="small">{MIC_HELP[recorder.problem]}</span>
              </Notice>
            )}
            {phase !== 'error' && (
              <div className="composer-state state" aria-live="polite">
                {phase === 'recording' && (
                  <>
                    <span className="wave" aria-hidden>
                      {Array.from({ length: 9 }).map((_, i) => (
                        <i key={i} />
                      ))}
                    </span>
                    <span className="num">
                      {clock(recorder.seconds * 1000)} / {clock(MAX_RECORD_SECONDS * 1000)}
                    </span>
                  </>
                )}
                {(phase === 'transcribing' || phase === 'ai') && (
                  <Loader2 size={14} aria-hidden style={{ animation: 'spin 1s linear infinite' }} />
                )}
                {phase === 'confirm' && <CheckCircle2 size={14} aria-hidden />}
                <span>{STATE_TEXT[phase]}</span>
              </div>
            )}
            <div className="inputs">
              <button
                type="button"
                className={`mic ${phase === 'recording' ? 'rec' : ''}`}
                aria-label={phase === 'recording' ? 'Dừng ghi âm' : 'Nhấn để nói'}
                aria-disabled={!!recorder.problem || phase === 'ai' || phase === 'transcribing' || phase === 'offline' || undefined}
                onClick={toggleMic}
              >
                {recorder.problem ? <MicOff size={20} /> : phase === 'recording' ? <Square size={18} /> : <Mic size={20} />}
              </button>
              <textarea
                id="composer-input"
                aria-label="Nhập lời nói của bạn"
                placeholder="Nhập lời nói của bạn"
                value={draft}
                maxLength={2000}
                disabled={inputLocked}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <button type="button" className="send" aria-label="Gửi" aria-disabled={!canSend || undefined} onClick={() => void send()}>
                <Send size={18} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {confirmEnd && (
        <Modal
          title="Kết thúc phiên?"
          onClose={() => setConfirmEnd(false)}
          footer={
            <>
              <button type="button" className="btn secondary" onClick={() => setConfirmEnd(false)}>
                Tiếp tục trò chuyện
              </button>
              <button type="button" className="btn primary" onClick={() => void finish()} disabled={ending}>
                {ending ? 'Đang lưu...' : 'Kết thúc phiên'}
              </button>
            </>
          }
        >
          <p>Hội thoại sẽ được lưu và hệ thống bắt đầu tạo báo cáo. Bạn không thể tiếp tục phiên này sau khi kết thúc.</p>
          {studentTurns < 3 && (
            <Notice tone="warn" icon={AlertTriangle}>
              Phiên còn ngắn nên một số kỹ năng có thể chưa đủ dữ liệu để đánh giá.
            </Notice>
          )}
        </Modal>
      )}
    </>
  );
};
