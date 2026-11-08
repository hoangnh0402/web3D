import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Award, CalendarClock, Check, Clock, FileText, Info, MessagesSquare, Mic, PencilLine, Play, PlayCircle, ShieldCheck, Trash2 } from 'lucide-react';
import { roomImage } from '../assets';
import { CaseItem, Msg, Session, SKILLS } from '../data';
import { CURRENT_STUDENT, getState, go, logAudit, toast, updateSession, useStore } from '../store';
import { Badge, Bar, Btn, CountUp, Gauge, Meter, Modal, Notice, PageHead } from '../ui';

const firstName = (n: string) => n.split(' ').slice(-2).join(' ');
const daysLeft = (d: string) => {
  const [dd, mm, yy] = d.split('/').map(Number);
  return Math.ceil((new Date(yy, mm - 1, dd).getTime() - new Date(2026, 9, 30).getTime()) / 86400000);
};

export const useMine = () => {
  const sessions = useStore(s => s.sessions);
  return useMemo(() => sessions.filter(s => s.userId === CURRENT_STUDENT), [sessions]);
};

export const Home = () => {
  const cases = useStore(s => s.cases), assignments = useStore(s => s.assignments), users = useStore(s => s.users);
  const me = users.find(u => u.id === CURRENT_STUDENT)!;
  const mine = useMine();
  const open = assignments.filter(a => a.status === 'OPEN');
  const submitted = (id: string) => mine.some(s => s.assignmentId === id && s.submission?.status === 'SUBMITTED');
  const next = open.find(a => !submitted(a.id)) ?? open[0];
  const nextCase = cases.find(c => c.id === next.caseId)!;
  const done = assignments.filter(a => submitted(a.id)).length;
  const ended = mine.filter(s => s.status === 'ENDED');
  const minutes = ended.reduce((a, s) => a + s.minutes, 0);
  const last = mine.find(s => s.record === 'ACTIVE' && s.status === 'ENDED' && s.report);
  const strong = last?.report?.scores.filter(s => (s.level ?? 0) >= 3).length ?? 0;
  const published = cases.filter(c => c.status === 'PUBLISHED');
  return (
    <div className="page">
      <PageHead title="Trang chủ" sub={`Chào ${firstName(me.name)}. Bạn có thể thực hành bất cứ lúc nào, chỉ bạn và giảng viên được phân quyền xem bài nộp.`} />
      <section className="hero-card" aria-label="Trọng tâm hôm nay">
        <div>
          <span className="kicker">Trọng tâm hôm nay</span>
          <h2>{nextCase.title}</h2>
          <p>Phiên {nextCase.minutes} phút với thân chủ {nextCase.clientName}</p>
          <div className="meta">
            <span><CalendarClock size={15} aria-hidden />Hạn {next.due}</span>
            <span><Clock size={15} aria-hidden />{next.title}</span>
          </div>
          <div className="actions"><Btn icon={PlayCircle} size="lg" onClick={() => go('prepare', { caseId: nextCase.id })}>Bắt đầu thực hành</Btn></div>
        </div>
        <Gauge value={done / assignments.length} label={<><CountUp value={done} />/{assignments.length}</>} sub="Bài đã nộp" />
      </section>
      <div className="stats">
        <div className="stat">
          <h3>Phiên đã luyện</h3>
          <div className="val"><MessagesSquare size={30} aria-hidden /><span><CountUp value={ended.length} /> <small>/ 10 phiên</small></span></div>
          <Bar value={Math.min(1, ended.length / 10)} />
        </div>
        <div className="stat">
          <h3>Thời gian luyện</h3>
          <div className="val"><Clock size={30} aria-hidden /><span><CountUp value={minutes} /> <small>/ 180 phút</small></span></div>
          <Bar value={Math.min(1, minutes / 180)} />
        </div>
        <div className="stat">
          <h3>Kỹ năng đạt mức 3+</h3>
          <div className="val"><Award size={30} aria-hidden /><span><CountUp value={strong} /> <small>/ 6 kỹ năng</small></span></div>
          <Bar value={strong / 6} />
        </div>
      </div>
      <div className="grid-2-eq">
        <section className="panel lift stack">
          <h2>Câu hỏi phản tư</h2>
          <p style={{ fontSize: 16 }}>{last?.report?.questions[0] ?? 'Hoàn thành phiên đầu tiên để nhận câu hỏi phản tư.'}</p>
          {last && <p className="small muted">Từ phiên {cases.find(c => c.id === last.caseId)!.title}, {last.endedAt.slice(0, 5)}</p>}
          {last && <div><Btn kind="secondary" icon={PencilLine} onClick={() => go('reflection', { sessionId: last.id })}>Viết phản tư</Btn></div>}
        </section>
        <section className="panel lift stack">
          <div className="panel-head"><h2>Ca thực hành</h2><Btn kind="ghost" size="sm" onClick={() => go('library')}>Xem tất cả</Btn></div>
          <div>
            {published.map(c => {
              const a = open.find(x => x.caseId === c.id);
              return (
                <div className="list-row" key={c.id}>
                  <button className="play" aria-label={`Chuẩn bị ca ${c.title}`} onClick={() => go('prepare', { caseId: c.id })}><Play size={16} fill="currentColor" aria-hidden /></button>
                  <div className="grow"><b>{c.title}</b><div className="small muted">Thân chủ {c.clientName}, {c.minutes} phút</div></div>
                  {a ? (submitted(a.id) ? <Badge tone="ok"><Check size={13} aria-hidden />Đã nộp</Badge> : <Badge tone="brand">Hạn {a.due.slice(0, 5)}</Badge>) : <Badge>{c.difficulty}</Badge>}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

const statusFor = (c: CaseItem, mine: Session[], assignedIds: string[]) => {
  if (assignedIds.includes(c.id) && !mine.some(s => s.caseId === c.id && s.submission?.status === 'SUBMITTED')) return <Badge tone="brand">Được giao</Badge>;
  return mine.some(s => s.caseId === c.id) ? <Badge tone="ok">Đã thực hành</Badge> : <Badge>Chưa thực hành</Badge>;
};

export const Library = () => {
  const cases = useStore(s => s.cases), assignments = useStore(s => s.assignments);
  const mine = useMine();
  const [diff, setDiff] = useState('Tất cả');
  const assigned = assignments.filter(a => a.status === 'OPEN').map(a => a.caseId);
  const shown = cases.filter(c => c.status === 'PUBLISHED' && (diff === 'Tất cả' || c.difficulty === diff));
  return (
    <div className="page">
      <PageHead title="Thư viện ca" sub="Chọn ca được giao hoặc tự chọn ca để luyện thêm." />
      <div className="chips" role="group" aria-label="Lọc theo độ khó">
        {['Tất cả', 'Cơ bản', 'Trung bình', 'Nâng cao'].map(d => <button key={d} className="chip" aria-pressed={d === diff} onClick={() => setDiff(d)}>{d}</button>)}
      </div>
      {shown.length ? <div className="grid-3">
        {shown.map(c => (
          <article className="case-card" key={c.id}>
            <div className="pic" role="img" aria-label={`Thân chủ ${c.clientName}`} style={{ backgroundImage: `url(${roomImage(c.avatar)})`, viewTransitionName: `case-${c.id}` }} />
            <div className="body">
              <h2>{c.title}</h2>
              <p className="small muted">{c.summary}</p>
              <div className="chips">{c.skills.map(s => <span key={s} className="tag">{s}</span>)}</div>
              <div className="foot">
                <span className="small muted">{c.difficulty}, {c.minutes} phút</span>
                {statusFor(c, mine, assigned)}
              </div>
              <Btn kind="secondary" onClick={() => go('prepare', { caseId: c.id })}>Xem ca</Btn>
            </div>
          </article>
        ))}
      </div> : <section className="panel"><p className="muted">Chưa có ca ở mức độ này. Hãy chọn mức độ khác.</p></section>}
    </div>
  );
};

export const Prepare = () => {
  const caseId = useStore(s => s.caseId), cases = useStore(s => s.cases), assignments = useStore(s => s.assignments);
  const c = cases.find(x => x.id === caseId)!;
  const [ok, setOk] = useState(false);
  const asg = assignments.find(a => a.caseId === c.id && a.status === 'OPEN');
  return (
    <div className="page">
      <PageHead back={{ label: 'Thư viện ca', to: 'library' }} title={c.title} sub={c.summary} />
      <div className="prep-hero" role="img" aria-label={`Thân chủ ${c.clientName} trong phòng tham vấn`} style={{ backgroundImage: `url(${roomImage(c.avatar)})`, viewTransitionName: `case-${c.id}` }} />
      <div className="grid-2">
        <div className="stack lg">
          <section className="panel stack">
            <h2>Bối cảnh</h2>
            <p>{c.background}</p>
            <div className="row"><Badge tone="brand">Thân chủ {c.clientName}, {c.clientAge} tuổi</Badge><Badge>{c.difficulty}</Badge><Badge>Khoảng {c.minutes} phút</Badge></div>
          </section>
          <section className="panel stack">
            <h2>Mục tiêu học tập</h2>
            <ul className="clean">{c.objectives.map(o => <li key={o}>{o}</li>)}</ul>
          </section>
          <section className="panel stack">
            <h2>Vai trò của bạn</h2>
            <p>Bạn là người tham vấn trong buổi gặp đầu tiên. Hãy lắng nghe, đặt câu hỏi và giúp thân chủ tự làm rõ điều họ đang gặp phải. Thân chủ có thể do dự hoặc chưa sẵn sàng chia sẻ ngay.</p>
          </section>
        </div>
        <aside className="stack">
          <section className="panel stack">
            <h2>Trước khi bắt đầu</h2>
            <Notice tone="warn" icon={AlertTriangle}>Đây là môi trường mô phỏng phục vụ học tập. Thân chủ do AI đóng vai, không phải người thật.</Notice>
            <ul className="clean small">
              <li>Bạn có thể nói qua micro hoặc nhập văn bản.</li>
              <li>Thân chủ trả lời bằng chữ trên màn hình.</li>
              <li>Hệ thống lưu lời nói của bạn dưới dạng văn bản, không lưu âm thanh.</li>
              <li>Bạn xem và xóa được phiên của mình trong 14 ngày.</li>
              {asg && <li>Ca này thuộc {asg.title}, hạn {asg.due}.</li>}
            </ul>
            <label className="check"><input id="agree" type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} /><span>Tôi đã đọc và hiểu quy tắc mô phỏng.</span></label>
            <Btn size="lg" icon={PlayCircle} disabled={!ok} onClick={() => go('room')}>Bắt đầu phiên</Btn>
            {!ok && <p className="small muted">Đánh dấu ô xác nhận để bắt đầu.</p>}
          </section>
        </aside>
      </div>
    </div>
  );
};

export const sessionOf = (id: string) => getState().sessions.find(s => s.id === id)!;

export const Report = () => {
  const id = useStore(s => s.sessionId), sessions = useStore(s => s.sessions), cases = useStore(s => s.cases), role = useStore(s => s.role);
  const s = sessions.find(x => x.id === id)!;
  const c = cases.find(x => x.id === s.caseId)!;
  const [ready, setReady] = useState(!!s.report);
  useEffect(() => { if (!ready) { const t = setTimeout(() => setReady(true), 1400); return () => clearTimeout(t); } }, [ready]);
  if (!ready || !s.report) return (
    <div className="page"><PageHead title="Đang tạo báo cáo" sub="Quá trình này diễn ra ở nền. Bạn có thể rời trang, báo cáo sẽ nằm trong Lịch sử thực hành." />
      <section className="panel stack"><div className="typing"><i /><i /><i /></div><p className="muted">Hệ thống đang đọc lại hội thoại và đối chiếu với rubric.</p></section></div>
  );
  const r = s.report;
  const lowConf = s.messages.some(m => (m.conf ?? 1) < 0.8);
  return (
    <div className="page">
      <PageHead back={{ label: 'Lịch sử thực hành', to: 'history' }} title={`Báo cáo: ${c.title}`} sub={`Phiên ${s.startedAt}, ${s.minutes} phút, ${s.messages.filter(m => m.speaker === 'STUDENT').length} lượt của bạn.`}
        actions={<><Btn kind="secondary" icon={FileText} onClick={() => go('transcript')}>Xem transcript</Btn>{role === 'student' && <Btn icon={PencilLine} onClick={() => go('reflection')}>Viết phản tư</Btn>}</>} />
      <Notice icon={Info}>Đây là đề xuất của AI để bạn tự đánh giá, không phải điểm học phần và không phải kết luận về năng lực nghề nghiệp.</Notice>
      <div className="grid-2">
        <section className="panel stack">
          <h2>Đánh giá theo kỹ năng</h2>
          <div>
            {r.scores.map(sc => (
              <div className="skill" key={sc.skill}>
                <div className="skill-top"><h3>{SKILLS.find(x => x.code === sc.skill)!.name}</h3><Meter level={sc.level} /></div>
                <p className="small muted">{sc.rationale}</p>
                {sc.evidence.map((e, i) => (
                  <button className="quote" key={i} onClick={() => go('transcript', { focusSeq: e.seq })}><span className="seq num">Lượt {e.seq}</span><span>{e.quote}</span></button>
                ))}
                {sc.lecturerLevel !== undefined && <p className="small"><b style={{ fontWeight: 500 }}>Giảng viên đánh giá:</b> mức {sc.lecturerLevel ?? 'chưa đánh giá'}{sc.lecturerNote ? `. ${sc.lecturerNote}` : ''}</p>}
              </div>
            ))}
          </div>
        </section>
        <aside className="stack lg">
          <section className="panel stack"><h2>Tóm tắt phiên</h2><p className="small">{r.summary}</p></section>
          {r.lecturerComment && <section className="panel stack"><h2>Nhận xét của giảng viên</h2><p className="small">{r.lecturerComment}</p><p className="small muted">{r.reviewedBy}, {r.reviewedAt}</p></section>}
          <section className="panel stack"><h2>Điểm làm tốt</h2><ul className="clean small">{r.strengths.map(x => <li key={x}>{x}</li>)}</ul></section>
          <section className="panel stack">
            <h2>Điểm cần cải thiện</h2>
            {r.improvements.map(x => <div key={x.point} className="small">{x.point}<div className="alt">{x.alt}</div></div>)}
          </section>
          <section className="panel stack"><h2>Mục tiêu lần sau</h2><ul className="clean small">{r.goals.map(x => <li key={x}>{x}</li>)}</ul></section>
          <Notice tone="neutral" icon={AlertTriangle}><span className="small">{r.limitation}{lowConf && !r.limitation.includes('tin cậy') ? ' Một số lượt có độ tin cậy nhận dạng thấp.' : ''}</span></Notice>
        </aside>
      </div>
    </div>
  );
};

export const MsgLine = ({ m, focus, clientName, you = 'Bạn' }: { m: Msg; focus?: boolean; clientName: string; you?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (focus) ref.current?.scrollIntoView({ block: 'center' }); }, [focus]);
  return (
    <div ref={ref} className={`msg ${m.speaker === 'STUDENT' ? 'student' : 'client'} ${focus ? 'focus' : ''}`}>
      <div className="who-line">
        <span className="num">Lượt {m.seq}</span><span>{m.speaker === 'STUDENT' ? you : clientName}</span><span className="num">{m.time}</span>
        {m.mode === 'VOICE' && <Mic size={12} aria-label="Nhập bằng giọng nói" />}
        {m.edited && <span>đã sửa</span>}
        {(m.conf ?? 1) < 0.8 && <Badge tone="warn">Độ tin cậy thấp</Badge>}
      </div>
      <div className="text">{m.text}</div>
    </div>
  );
};

export const Transcript = () => {
  const id = useStore(s => s.sessionId), sessions = useStore(s => s.sessions), cases = useStore(s => s.cases), focus = useStore(s => s.focusSeq);
  const s = sessions.find(x => x.id === id)!;
  const c = cases.find(x => x.id === s.caseId)!;
  return (
    <div className="page">
      <PageHead back={{ label: 'Báo cáo', to: 'report' }} title="Transcript" sub={`${c.title}, thân chủ ${c.clientName}, phiên ${s.startedAt}.`} />
      <Notice tone="neutral" icon={Mic}><span className="small">Lượt có biểu tượng micro được chuyển từ giọng nói sang văn bản, nên có thể khác đôi chút so với lời nói thật.</span></Notice>
      <section className="panel stack" style={{ maxWidth: 760 }}>{s.messages.map(m => <MsgLine key={m.seq} m={m} focus={focus === m.seq} clientName={c.clientName} />)}</section>
    </div>
  );
};

export const ReflectionScreen = () => {
  const id = useStore(s => s.sessionId), sessions = useStore(s => s.sessions), assignments = useStore(s => s.assignments);
  const s = sessions.find(x => x.id === id)!;
  const r = s.report!;
  const asg = assignments.find(a => a.id === s.assignmentId);
  const [ans, setAns] = useState<string[]>(s.reflection?.answers ?? ['', '', '']);
  const [goal, setGoal] = useState(s.reflection?.goal ?? '');
  const complete = ans.every(a => a.trim()) && goal.trim().length > 0;
  const submitted = s.submission?.status === 'SUBMITTED';
  const save = (done: boolean) => updateSession(id, { reflection: { answers: ans, goal, done } });
  return (
    <div className="page">
      <PageHead back={{ label: 'Báo cáo', to: 'report' }} title="Phản tư" sub="Viết cho chính bạn. Với bài được giao, giảng viên phụ trách sẽ đọc phần này." />
      <div className="grid-2">
        <section className="panel stack lg">
          {r.questions.map((q, i) => (
            <div className="field" key={q}>
              <label htmlFor={`ref-${i}`}>{q}</label>
              <textarea id={`ref-${i}`} className="textarea" value={ans[i] ?? ''} onChange={e => setAns(a => a.map((x, k) => k === i ? e.target.value : x))} />
            </div>
          ))}
          <div className="field"><label htmlFor="ref-goal">Mục tiêu luyện tập cho lần sau</label><textarea id="ref-goal" className="textarea" value={goal} onChange={e => setGoal(e.target.value)} placeholder={r.goals[0]} /></div>
          <div className="row">
            <Btn kind="secondary" onClick={() => { save(false); toast('Đã lưu nháp'); }}>Lưu nháp</Btn>
            {asg
              ? <Btn disabled={!complete || submitted} onClick={() => { updateSession(id, { reflection: { answers: ans, goal, done: true }, submission: { status: 'SUBMITTED', at: '30/10/2026 ' + new Date().toTimeString().slice(0, 5), late: false } }); toast('Đã nộp cho giảng viên'); go('home'); }}>{submitted ? 'Đã nộp' : 'Nộp cho giảng viên'}</Btn>
              : <Btn disabled={!complete} onClick={() => { save(true); toast('Đã lưu phản tư'); go('history'); }}>Hoàn thành</Btn>}
          </div>
          {asg && !complete && !submitted && <p className="small muted">Trả lời đủ các câu hỏi để nộp bài.</p>}
        </section>
        <aside className="panel stack">
          <h2>Gợi ý từ báo cáo</h2>
          <ul className="clean small">{r.improvements.map(i => <li key={i.point}>{i.point}</li>)}</ul>
          {asg && <Notice icon={CalendarClock}><span className="small">{asg.title}, hạn {asg.due}.</span></Notice>}
        </aside>
      </div>
    </div>
  );
};

export const HistoryScreen = () => {
  const cases = useStore(s => s.cases);
  const mine = useMine().filter(s => s.record === 'ACTIVE');
  const [del, setDel] = useState<Session | null>(null);
  const doDelete = () => {
    if (!del) return;
    updateSession(del.id, s => ({ record: 'DELETED', submission: s.submission ? { ...s.submission, status: 'WITHDRAWN' } : undefined }));
    logAudit('Nguyễn Minh Anh', 'Xóa phiên', del.id, 'Đang hiệu lực sang Đã xóa');
    toast('Đã xóa phiên'); setDel(null);
  };
  return (
    <div className="page">
      <PageHead title="Lịch sử thực hành" sub="Phiên hiển thị ở đây trong 14 ngày sau khi kết thúc. Sau đó phiên được chuyển vào lưu trữ và bạn không còn thấy nữa." />
      <section className="panel flush">
        {mine.length ? <div className="table-wrap"><table className="t">
          <thead><tr><th>Ca</th><th>Thời gian</th><th>Thời lượng</th><th>Trạng thái</th><th>Còn xem được</th><th /></tr></thead>
          <tbody>{mine.map(s => {
            const c = cases.find(x => x.id === s.caseId)!;
            return (
              <tr key={s.id}>
                <td>{c.title}</td><td className="num">{s.startedAt}</td><td className="num">{s.minutes} phút</td>
                <td>{s.status === 'ABANDONED' ? <Badge tone="warn">Bỏ dở</Badge> : s.submission?.status === 'SUBMITTED' ? <Badge tone="ok">Đã nộp</Badge> : s.assignmentId ? <Badge tone="warn">Chưa nộp</Badge> : <Badge>Luyện tự do</Badge>}</td>
                <td className="num">{daysLeft(s.retentionUntil)} ngày</td>
                <td className="act">
                  <Btn kind="ghost" size="sm" onClick={() => go('report', { sessionId: s.id })}>Xem báo cáo</Btn>
                  <Btn kind="danger-ghost" size="sm" icon={Trash2} onClick={() => setDel(s)}>Xóa</Btn>
                </td>
              </tr>
            );
          })}</tbody>
        </table></div> : <div className="stack" style={{ padding: 20 }}><p className="muted">Bạn chưa có phiên nào đang hiển thị.</p><div><Btn onClick={() => go('library')}>Chọn ca để thực hành</Btn></div></div>}
      </section>
      <Notice tone="neutral" icon={ShieldCheck}><span className="small">Chỉ bạn và giảng viên được phân quyền xem được bài đã nộp. Giảng viên không đọc các phiên luyện tự do của bạn.</span></Notice>
      {del && (
        <Modal title="Xóa phiên này?" onClose={() => setDel(null)} footer={<><Btn kind="secondary" onClick={() => setDel(null)}>Giữ lại</Btn><Btn kind="danger" onClick={doDelete}>Xóa phiên</Btn></>}>
          <p>Phiên, transcript và báo cáo sẽ không còn hiển thị với bạn.</p>
          {del.submission?.status === 'SUBMITTED' && <Notice tone="warn" icon={AlertTriangle}>Phiên này đã nộp. Xóa phiên sẽ rút bài khỏi danh sách của giảng viên.</Notice>}
        </Modal>
      )}
    </div>
  );
};
