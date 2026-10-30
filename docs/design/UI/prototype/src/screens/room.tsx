import { Component, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, CloudOff, FlaskConical, Loader2, Mic, MicOff, Send, ShieldAlert, Square, WifiOff, X } from 'lucide-react';
import { roomImage } from '../assets';
import { Emotion, Msg, Session } from '../data';
import Scene, { webglSupported, type Activity } from '../room/Scene';
import { buildReport, nextClientLine, RISK_LINE } from '../sim';
import { CURRENT_STUDENT, getState, go, logAudit, setState, toast, updateSession, useStore } from '../store';
import { Btn, Modal, Notice } from '../ui';
import { MsgLine } from './student';

class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

type Phase = 'ready' | 'recording' | 'transcribing' | 'confirm' | 'ai' | 'offline' | 'error';

const now = () => new Date().toTimeString().slice(0, 5);
const STATE_TEXT: Record<Phase, string> = {
  ready: 'Nhấn micro để nói hoặc nhập văn bản',
  recording: 'Đang ghi âm, nhấn để dừng',
  transcribing: 'Đang chuyển lời nói thành văn bản',
  confirm: 'Kiểm tra văn bản, sửa nếu cần rồi bấm Gửi',
  ai: 'Thân chủ đang trả lời',
  offline: 'Mất kết nối. Nội dung của bạn vẫn được giữ, đang kết nối lại',
  error: 'Thân chủ chưa trả lời được. Lời của bạn đã được lưu',
};

export const Room = () => {
  const caseId = useStore(s => s.caseId), cases = useStore(s => s.cases), firstRun = useStore(s => s.firstRun);
  const c = cases.find(x => x.id === caseId)!;

  const [session] = useState<Session>(() => {
    const assignment = getState().assignments.find(a => a.caseId === caseId && a.status === 'OPEN');
    const s: Session = {
      id: 'live' + Date.now(), userId: CURRENT_STUDENT, caseId, caseVersion: c.version, assignmentId: assignment?.id,
      status: 'IN_PROGRESS', record: 'ACTIVE', startedAt: '30/10/2026 ' + now(), endedAt: '', retentionUntil: '13/11/2026', minutes: 0, mode: '3D',
      messages: [{ seq: 1, speaker: 'CLIENT', text: c.opening.text, time: now() }],
    };
    return s;
  });
  useEffect(() => { setState(st => st.sessions.some(x => x.id === session.id) ? {} : { sessions: [session, ...st.sessions] }); }, [session]);

  const [messages, setMessages] = useState<Msg[]>(session.messages);
  const [phase, setPhase] = useState<Phase>('ready');
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<'TEXT' | 'VOICE'>('TEXT');
  const [emotion, setEmotion] = useState<Emotion>(c.opening.emotion);
  const [caption, setCaption] = useState(c.opening.text);
  const [seconds, setSeconds] = useState(0);
  const [recSec, setRecSec] = useState(0);
  const [view, setView] = useState<'3D' | '2D'>(() => webglSupported() ? '3D' : '2D');
  const [lowFps, setLowFps] = useState(false);
  const [gfxNote, setGfxNote] = useState(webglSupported() ? '' : 'Thiết bị này chưa hỗ trợ phòng 3D, bạn đang dùng chế độ nhẹ.');
  const [micDenied, setMicDenied] = useState(false);
  const [safety, setSafety] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [panel, setPanel] = useState(false);
  const [intro, setIntro] = useState(firstRun);
  const [failNext, setFailNext] = useState(false);
  const pending = useRef<string | null>(null);
  const stage = useRef(0);
  const suggestIdx = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { const t = setInterval(() => setSeconds(s => s + 1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, caption]);
  useEffect(() => { updateSession(session.id, { messages }); }, [messages, session.id]);
  useEffect(() => {
    if (phase !== 'recording') return;
    setRecSec(0);
    const t = setInterval(() => setRecSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const speak = useCallback((text: string, emo: Emotion, after?: () => void) => {
    setCaption('');
    let i = 0;
    const tick = () => {
      i += 2;
      setCaption(text.slice(0, i));
      if (i < text.length) later(tick, 26);
      else {
        setCaption(text);
        setEmotion(emo);
        setMessages(m => [...m, { seq: m.length + 1, speaker: 'CLIENT', text, time: now() }]);
        setPhase('ready');
        after?.();
      }
    };
    tick();
  }, []);

  const askClient = useCallback((text: string, risk = false) => {
    setPhase('ai'); setCaption('');
    later(() => {
      if (failNext) { setFailNext(false); pending.current = text; setPhase('error'); return; }
      if (risk) { speak(RISK_LINE.text, RISK_LINE.emotion, () => setSafety(true)); return; }
      const { line, stage: nextStage } = nextClientLine(c, text, stage.current);
      stage.current = nextStage;
      speak(line.text, line.emotion);
    }, 1100);
  }, [c, failNext, speak]);

  const send = () => {
    const text = draft.trim();
    if (!text || phase === 'ai' || phase === 'transcribing' || phase === 'recording') return;
    const voice = mode === 'VOICE';
    setMessages(m => [...m, { seq: m.length + 1, speaker: 'STUDENT', text, mode, conf: voice ? 0.92 : undefined, edited: voice && text !== spoken.current, time: now() }]);
    setDraft(''); setMode('TEXT'); suggestIdx.current += 1;
    askClient(text);
  };

  const spoken = useRef('');
  const nextSuggestion = () => c.suggestions[Math.min(suggestIdx.current, c.suggestions.length - 1)] ?? 'Em có thể kể thêm không?';
  const toggleMic = () => {
    if (micDenied || phase === 'ai' || phase === 'transcribing' || phase === 'offline') return;
    if (phase === 'recording') {
      setPhase('transcribing');
      later(() => { const t = nextSuggestion(); spoken.current = t; setDraft(t); setMode('VOICE'); setPhase('confirm'); }, 1100);
    } else setPhase('recording');
  };

  const useSuggestion = (t: string) => { setDraft(t); setMode('TEXT'); };

  const finish = () => {
    const msgs = messages;
    setConfirmEnd(false);
    const mins = Math.max(1, Math.round(seconds / 60));
    updateSession(session.id, { status: 'ENDED', endedAt: '30/10/2026 ' + now(), minutes: mins, messages: msgs, mode: view, report: buildReport(msgs, c), reflection: { answers: ['', '', ''], goal: '', done: false } });
    logAudit('Nguyễn Minh Anh', 'Kết thúc phiên', c.title, `${msgs.length} lời trong hội thoại`);
    toast('Đã lưu phiên');
    go('report', { sessionId: session.id, firstRun: false });
  };

  const simulateOffline = () => {
    setPanel(false); const before = phase; setPhase('offline');
    later(() => { setPhase(before === 'offline' ? 'ready' : before); toast('Đã kết nối lại, hội thoại đầy đủ'); }, 3200);
  };

  const retry = () => { const t = pending.current; pending.current = null; if (t) askClient(t); };
  const switchView = (v: '3D' | '2D') => { if (v === '3D' && !webglSupported()) return; setView(v); setLowFps(false); setGfxNote(''); };
  const onLost = useCallback(() => { setView('2D'); setGfxNote('Phòng 3D gặp lỗi đồ họa, hệ thống đã chuyển sang chế độ nhẹ. Hội thoại không bị ảnh hưởng.'); }, []);
  const onFps = useCallback((fps: number) => { if (fps < 18 && !(window as unknown as { __noFps?: boolean }).__noFps) setLowFps(true); }, []);

  const activity: Activity = phase === 'ai' ? (caption ? 'responding' : 'thinking') : phase === 'recording' || phase === 'confirm' || phase === 'transcribing' ? 'listening' : 'idle';
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0'), ss = String(seconds % 60).padStart(2, '0');
  const canSend = !!draft.trim() && (phase === 'ready' || phase === 'confirm');
  const inputLocked = phase === 'ai' || phase === 'recording' || phase === 'transcribing';

  return (
    <>
      <div className="room">
        <section className="stage" aria-label="Phòng tham vấn">
          {view === '3D'
            ? <SceneBoundary onError={onLost}><Scene variant={c.avatar} emotion={emotion} activity={activity} poster={roomImage(c.avatar, emotion)} onLost={onLost} onFps={onFps} /></SceneBoundary>
            : <div className="stage-2d" role="img" aria-label={`Thân chủ ${c.clientName} trong phòng tham vấn`} style={{ backgroundImage: `url(${roomImage(c.avatar, emotion)})` }} />}
          <div className="stage-top">
            <div className="row" style={{ gap: 6 }}>
              <span className="glass"><span className="dot" aria-hidden />Môi trường mô phỏng</span>
              <span className="glass num">{mm}:{ss} / {c.minutes}:00</span>
            </div>
            <div className="seg" role="group" aria-label="Chế độ hiển thị">
              <button aria-pressed={view === '3D'} onClick={() => switchView('3D')}>3D</button>
              <button aria-pressed={view === '2D'} onClick={() => switchView('2D')}>2D</button>
            </div>
          </div>
          {phase === 'offline' && <div className="room-offline"><WifiOff size={13} aria-hidden style={{ verticalAlign: -2, marginRight: 6 }} />Mất kết nối, đang kết nối lại</div>}
          {lowFps && view === '3D' && <div className="banner"><Notice tone="warn" icon={AlertTriangle}><div className="row between"><span>Phòng 3D đang chạy chậm trên thiết bị này.</span><Btn kind="secondary" size="sm" onClick={() => switchView('2D')}>Chuyển sang 2D</Btn></div></Notice></div>}
          {gfxNote && <div className="banner"><Notice tone="warn" icon={AlertTriangle}><div className="row between"><span>{gfxNote}</span><button className="icon-btn" aria-label="Đóng thông báo" onClick={() => setGfxNote('')}><X size={15} /></button></div></Notice></div>}
          {safety && (
            <div className="safety" role="alert">
              <ShieldAlert size={22} color="var(--danger)" aria-hidden style={{ flex: 'none' }} />
              <div className="stack" style={{ gap: 6 }}>
                <h3>Tín hiệu cần chú ý về an toàn</h3>
                <p className="small">Thân chủ vừa nói điều có thể liên quan đến nguy cơ. Hãy tạm dừng khám phá vấn đề, hỏi trực tiếp về sự an toàn của thân chủ và làm theo quy trình của giảng viên.</p>
                <p className="small muted">Nếu chính bạn đang gặp khó khăn, hãy liên hệ giảng viên hoặc một người bạn tin cậy. Nội dung này là minh họa, chờ giảng viên xác nhận.</p>
                <div><Btn kind="secondary" size="sm" onClick={() => setSafety(false)}>Tôi đã đọc</Btn></div>
              </div>
            </div>
          )}
          <div className="caption" aria-live="polite">
            <b>{c.clientName}</b>
            {phase === 'ai' && !caption ? <span className="typing" aria-label="Thân chủ đang suy nghĩ"><i /><i /><i /></span> : phase === 'error' ? <p className="muted">Thân chủ chưa trả lời được.</p> : <p>{caption}</p>}
          </div>
          {intro && (
            <div className="intro">
              <div className="card">
                <h2>Làm quen với phòng tham vấn</h2>
                <ol className="small">
                  <li>Thân chủ ngồi đối diện bạn. Kéo chuột, vuốt hoặc dùng phím mũi tên để xoay góc nhìn.</li>
                  <li>Nhấn micro để nói hoặc nhập văn bản ở khung hội thoại.</li>
                  <li>Thân chủ trả lời bằng chữ trên màn hình.</li>
                  <li>Khi xong, bấm Kết thúc phiên để xem báo cáo.</li>
                </ol>
                <Btn onClick={() => { setIntro(false); setState({ firstRun: false }); }}>Bắt đầu trò chuyện</Btn>
              </div>
            </div>
          )}
        </section>

        <section className="talk" aria-label="Hội thoại">
          <div className="talk-head">
            <div><b>{c.title}</b><div className="small muted">Thân chủ {c.clientName}</div></div>
            <Btn kind="secondary" size="sm" icon={Square} onClick={() => setConfirmEnd(true)}>Kết thúc phiên</Btn>
          </div>
          <div className="talk-log" ref={logRef}>
            {messages.map(m => <MsgLine key={m.seq} m={m} clientName={c.clientName} />)}
            {caption && phase === 'ai' && <div className="msg client"><div className="who-line"><span>{c.clientName}</span></div><div className="text">{caption}</div></div>}
          </div>
          <div className="composer">
            {phase === 'error' && <div className="row between"><span className="small"><CloudOff size={14} aria-hidden style={{ verticalAlign: -2, marginRight: 6 }} />{STATE_TEXT.error}</span><Btn kind="secondary" size="sm" onClick={retry}>Thử lại</Btn></div>}
            {micDenied && <Notice tone="warn" icon={MicOff}><span className="small">Trình duyệt chưa cho phép dùng micro. Mở cài đặt trang để cấp quyền, hoặc tiếp tục bằng văn bản.</span></Notice>}
            {phase !== 'error' && (
              <div className="composer-state state" aria-live="polite">
                {phase === 'recording' && <><span className="wave" aria-hidden>{Array.from({ length: 9 }).map((_, i) => <i key={i} />)}</span><span className="num">0:{String(recSec).padStart(2, '0')}</span></>}
                {(phase === 'transcribing' || phase === 'ai') && <Loader2 size={14} aria-hidden style={{ animation: 'spin 1s linear infinite' }} />}
                {phase === 'confirm' && <CheckCircle2 size={14} aria-hidden />}
                <span>{STATE_TEXT[phase]}</span>
              </div>
            )}
            {phase === 'ready' && !draft && (
              <div className="suggest" aria-label="Gợi ý câu nói dành cho buổi demo">
                {c.suggestions.slice(suggestIdx.current, suggestIdx.current + 3).map(s => <button key={s} onClick={() => useSuggestion(s)}>{s}</button>)}
              </div>
            )}
            <div className="inputs">
              <button className={`mic ${phase === 'recording' ? 'rec' : ''}`} aria-label={phase === 'recording' ? 'Dừng ghi âm' : 'Nhấn để nói'} aria-disabled={micDenied || phase === 'ai' || phase === 'transcribing' || phase === 'offline' || undefined} onClick={toggleMic}>
                {micDenied ? <MicOff size={20} /> : phase === 'recording' ? <Square size={18} /> : <Mic size={20} />}
              </button>
              <textarea id="composer-input" aria-label="Nhập lời nói của bạn" placeholder="Nhập lời nói của bạn" value={draft} disabled={inputLocked} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
              <button className="send" aria-label="Gửi" aria-disabled={!canSend || undefined} onClick={send}><Send size={18} /></button>
            </div>
          </div>
        </section>
      </div>

      <div className="demo-pill" data-demo-chrome>
        {panel && (
          <div className="demo-menu">
            <div className="lbl">Giả lập tình huống</div>
            <button onClick={simulateOffline}><WifiOff size={16} aria-hidden />Mất kết nối 3 giây</button>
            <button onClick={() => { setFailNext(true); setPanel(false); toast('Lượt tiếp theo sẽ báo lỗi dịch vụ AI', 'warn'); }}><CloudOff size={16} aria-hidden />Lỗi dịch vụ AI ở lượt sau</button>
            <button onClick={() => { setMicDenied(d => !d); setPanel(false); }}><MicOff size={16} aria-hidden />{micDenied ? 'Cấp lại quyền micro' : 'Từ chối quyền micro'}</button>
            <button onClick={() => { setPanel(false); askClient('', true); }}><ShieldAlert size={16} aria-hidden />Tín hiệu nguy cơ</button>
            <button onClick={() => { setPanel(false); setLowFps(true); }}><AlertTriangle size={16} aria-hidden />Thiết bị chạy chậm</button>
          </div>
        )}
        <Btn kind="secondary" icon={FlaskConical} onClick={() => setPanel(p => !p)}>Demo</Btn>
      </div>

      {confirmEnd && (
        <Modal title="Kết thúc phiên?" onClose={() => setConfirmEnd(false)} footer={<><Btn kind="secondary" onClick={() => setConfirmEnd(false)}>Tiếp tục trò chuyện</Btn><Btn onClick={finish}>Kết thúc và xem báo cáo</Btn></>}>
          <p>Hội thoại sẽ được lưu và hệ thống bắt đầu tạo báo cáo. Bạn không thể tiếp tục phiên này sau khi kết thúc.</p>
          {messages.filter(m => m.speaker === 'STUDENT').length < 3 && <Notice tone="warn" icon={AlertTriangle}>Phiên còn ngắn nên một số kỹ năng có thể chưa đủ dữ liệu để đánh giá.</Notice>}
        </Modal>
      )}
    </>
  );
};
