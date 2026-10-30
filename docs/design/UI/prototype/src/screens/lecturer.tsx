import { useMemo, useState } from 'react';
import { Archive, BookCheck, CalendarPlus, Check, Copy, Eye, FilePlus2, Info, Send, Table2 } from 'lucide-react';
import { CaseItem, LEVELS, Session, SKILLS } from '../data';
import { CURRENT_LECTURER, go, logAudit, newCase, setState, toast, updateSession, useStore } from '../store';
import { Badge, Btn, Field, Meter, Modal, Notice, PageHead } from '../ui';
import { MsgLine } from './student';

const useScope = () => {
  const classes = useStore(s => s.classes), sessions = useStore(s => s.sessions), users = useStore(s => s.users);
  return useMemo(() => {
    const mine = classes.filter(c => c.lecturerId === CURRENT_LECTURER);
    const ids = new Set(mine.flatMap(c => c.students));
    return { mine, students: users.filter(u => ids.has(u.id)), sessions: sessions.filter(s => ids.has(s.userId) && s.status === 'ENDED') };
  }, [classes, sessions, users]);
};

export const LecHome = () => {
  const { mine, students, sessions } = useScope();
  const assignments = useStore(s => s.assignments), cases = useStore(s => s.cases), users = useStore(s => s.users);
  const open = assignments.filter(a => a.status === 'OPEN');
  const toReview = sessions.filter(s => s.record === 'ACTIVE' && s.submission?.status === 'SUBMITTED' && !s.report?.reviewedBy);
  return (
    <div className="page">
      <PageHead title="Tổng quan" sub={mine.map(c => c.name).join(', ')} actions={<Btn icon={CalendarPlus} onClick={() => go('lec-assign')}>Giao bài mới</Btn>} />
      <div className="grid-4">
        <div className="stat"><b>{students.length}</b><span>Sinh viên phụ trách</span></div>
        <div className="stat"><b>{open.length}</b><span>Bài đang mở</span></div>
        <div className="stat"><b>{toReview.length}</b><span>Bài chờ xem xét</span></div>
        <div className="stat"><b>{sessions.filter(s => s.record === 'ACTIVE').length}</b><span>Phiên trong 14 ngày</span></div>
      </div>
      <div className="grid-2">
        <section className="panel flush">
          <div className="panel-head"><h2>Bài chờ xem xét</h2><Btn kind="ghost" size="sm" onClick={() => go('lec-progress')}>Xem tiến độ lớp</Btn></div>
          <div className="table-wrap"><table className="t">
            <thead><tr><th>Sinh viên</th><th>Ca</th><th>Nộp lúc</th><th /></tr></thead>
            <tbody>{toReview.map(s => (
              <tr key={s.id}>
                <td>{users.find(u => u.id === s.userId)!.name}</td>
                <td>{cases.find(c => c.id === s.caseId)!.title}</td>
                <td className="num">{s.submission!.at}</td>
                <td className="act"><Btn kind="ghost" size="sm" onClick={() => go('lec-review', { reviewId: s.id })}>Xem xét</Btn></td>
              </tr>
            ))}{!toReview.length && <tr><td colSpan={4} className="muted">Bạn đã xem hết các bài đã nộp.</td></tr>}</tbody>
          </table></div>
        </section>
        <section className="panel stack">
          <h2>Bài đang mở</h2>
          <div>{open.map(a => {
            const subs = sessions.filter(s => s.assignmentId === a.id && s.submission?.status === 'SUBMITTED').length;
            return (
              <div className="list-row" key={a.id}>
                <div className="grow"><b style={{ fontWeight: 500 }}>{cases.find(c => c.id === a.caseId)!.title}</b><div className="small muted">Hạn {a.due}</div></div>
                <Badge>{subs}/{students.filter(u => u.classId === a.classId).length} đã nộp</Badge>
              </div>
            );
          })}</div>
        </section>
      </div>
    </div>
  );
};

export const LecCases = () => {
  const cases = useStore(s => s.cases);
  const [archive, setArchive] = useState<CaseItem | null>(null);
  const dup = (c: CaseItem) => {
    const copy = { ...c, id: 'case' + Date.now(), title: c.title + ' (bản sao)', status: 'DRAFT' as const, version: 0, updatedAt: '30/10/2026' };
    setState(s => ({ cases: [...s.cases, copy] })); toast('Đã sao chép ca');
  };
  return (
    <div className="page">
      <PageHead title="Ca mô phỏng" sub="Sinh viên chỉ thấy ca đã xuất bản. Sửa ca không làm thay đổi các phiên đã thực hành." actions={<Btn icon={FilePlus2} onClick={() => { const n = newCase(); setState(s => ({ cases: [...s.cases, n] })); go('lec-case-edit', { editCaseId: n.id }); }}>Tạo ca mới</Btn>} />
      <section className="panel flush"><div className="table-wrap"><table className="t">
        <thead><tr><th>Tên ca</th><th>Độ khó</th><th>Phiên bản</th><th>Trạng thái</th><th>Thẩm định nội dung</th><th>Cập nhật</th><th /></tr></thead>
        <tbody>{cases.map(c => (
          <tr key={c.id}>
            <td>{c.title}</td><td>{c.difficulty}</td><td className="num">{c.version ? `v${c.version}` : 'Chưa có'}</td>
            <td>{c.status === 'PUBLISHED' ? <Badge tone="ok">Đã xuất bản</Badge> : c.status === 'DRAFT' ? <Badge tone="warn">Nháp</Badge> : <Badge>Đã lưu trữ</Badge>}</td>
            <td>{c.reviewed ? <Badge tone="ok">Đã đối chiếu</Badge> : <Badge>Chờ đối chiếu</Badge>}</td>
            <td className="num">{c.updatedAt}</td>
            <td className="act">
              <Btn kind="ghost" size="sm" onClick={() => go('lec-case-edit', { editCaseId: c.id })}>Sửa</Btn>
              <Btn kind="ghost" size="sm" icon={Copy} label="Sao chép" onClick={() => dup(c)} />
              <Btn kind="ghost" size="sm" icon={Archive} label="Lưu trữ" disabled={c.status === 'ARCHIVED'} onClick={() => setArchive(c)} />
            </td>
          </tr>
        ))}</tbody>
      </table></div></section>
      <Notice tone="neutral" icon={Info}><span className="small">Nội dung ca cần được giảng viên đối chiếu với giáo trình trước khi nghiệm thu. Ba ca mẫu đang ở trạng thái chờ đối chiếu.</span></Notice>
      {archive && <Modal title="Lưu trữ ca này?" onClose={() => setArchive(null)} footer={<><Btn kind="secondary" onClick={() => setArchive(null)}>Hủy</Btn><Btn onClick={() => { setState(s => ({ cases: s.cases.map(c => c.id === archive.id ? { ...c, status: 'ARCHIVED' } : c) })); toast('Đã lưu trữ ca'); setArchive(null); }}>Lưu trữ</Btn></>}><p>Sinh viên sẽ không còn thấy ca {archive.title}. Các phiên đã thực hành vẫn được giữ nguyên.</p></Modal>}
    </div>
  );
};

const STEPS: { key: keyof CaseItem; label: string; help: string }[] = [
  { key: 'background', label: 'Bối cảnh', help: 'Thông tin nền cần thiết để hiểu hoàn cảnh của thân chủ.' },
  { key: 'mainIssue', label: 'Vấn đề chính', help: 'Điều khiến thân chủ tìm kiếm hỗ trợ.' },
  { key: 'objectives', label: 'Mục tiêu học tập', help: 'Mỗi dòng một kỹ năng sinh viên cần luyện.' },
  { key: 'traits', label: 'Tính cách và giao tiếp', help: 'Ví dụ: dè dặt, lo lắng, ít nói hoặc dễ xúc động.' },
  { key: 'hidden', label: 'Thông tin chưa chia sẻ', help: 'Chi tiết chỉ xuất hiện khi hội thoại có điều kiện phù hợp.' },
  { key: 'arc', label: 'Diễn biến cảm xúc', help: 'Cách cảm xúc và mức độ sẵn sàng chia sẻ thay đổi.' },
  { key: 'safety', label: 'Ranh giới và an toàn', help: 'Nội dung nhạy cảm, điều AI không được tự suy diễn và cách xử lý nguy cơ.' },
  { key: 'criteria', label: 'Tiêu chí đánh giá', help: 'Hành vi quan sát được để đánh giá kỹ năng.' },
];

export const LecCaseEdit = () => {
  const id = useStore(s => s.editCaseId), cases = useStore(s => s.cases);
  const c = cases.find(x => x.id === id)!;
  const [step, setStep] = useState(0);
  const set = (patch: Partial<CaseItem>) => setState(s => ({ cases: s.cases.map(x => x.id === id ? { ...x, ...patch } : x) }));
  const filled = (k: keyof CaseItem) => { const v = c[k]; return Array.isArray(v) ? v.length > 0 : !!v; };
  const complete = STEPS.every(s => filled(s.key)) && !!c.title;
  const cur = STEPS[step];
  const val = c[cur.key];
  return (
    <div className="page wide">
      <PageHead back={{ label: 'Ca mô phỏng', to: 'lec-cases' }} title={c.title || 'Ca mới'} sub={`${c.status === 'PUBLISHED' ? 'Đã xuất bản' : 'Nháp'}${c.version ? `, phiên bản ${c.version}` : ''}. Xuất bản sẽ tạo phiên bản mới.`}
        actions={<><Btn kind="secondary" onClick={() => toast('Đã lưu nháp')}>Lưu nháp</Btn><Btn icon={BookCheck} disabled={!complete} onClick={() => { const v = c.version + 1; set({ status: 'PUBLISHED', version: v, updatedAt: '30/10/2026' }); logAudit('TS. Lê Thu Hằng', 'Xuất bản ca', c.title, `Phiên bản ${v}`); toast(`Đã xuất bản phiên bản ${v}`); }}>Xuất bản</Btn></>} />
      <div className="editor">
        <nav className="panel steps" aria-label="Thành phần của ca" style={{ padding: 8 }}>
          {STEPS.map((s, i) => <button key={s.key} aria-current={i === step} onClick={() => setStep(i)}>{s.label}{filled(s.key) && <Check size={15} aria-label="Đã điền" color="var(--ok)" />}</button>)}
        </nav>
        <div className="stack lg">
          <section className="panel stack">
            <div className="grid-2-eq">
              <Field id="case-title" label="Tên ca"><input id="case-title" className="input" value={c.title} onChange={e => set({ title: e.target.value })} /></Field>
              <Field id="case-client" label="Tên thân chủ"><input id="case-client" className="input" value={c.clientName} onChange={e => set({ clientName: e.target.value })} /></Field>
              <Field id="case-diff" label="Độ khó"><select id="case-diff" className="select" value={c.difficulty} onChange={e => set({ difficulty: e.target.value as CaseItem['difficulty'] })}>{['Cơ bản', 'Trung bình', 'Nâng cao'].map(d => <option key={d}>{d}</option>)}</select></Field>
              <Field id="case-mins" label="Thời lượng tối đa (phút)"><input id="case-mins" className="input num" type="number" min={5} value={c.minutes} onChange={e => set({ minutes: Number(e.target.value) })} /></Field>
            </div>
          </section>
          <section className="panel stack">
            <h2>{cur.label}</h2>
            <Field id="case-field" label={cur.label} hint={cur.help}>
              <textarea id="case-field" className="textarea" rows={6} value={Array.isArray(val) ? (val as string[]).join('\n') : String(val ?? '')} onChange={e => set({ [cur.key]: Array.isArray(val) ? e.target.value.split('\n') : e.target.value } as Partial<CaseItem>)} />
            </Field>
            <div className="row between">
              <Btn kind="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>Trước</Btn>
              <span className="small muted num">{step + 1}/{STEPS.length}</span>
              <Btn kind="secondary" disabled={step === STEPS.length - 1} onClick={() => setStep(step + 1)}>Tiếp theo</Btn>
            </div>
          </section>
          {!complete && <Notice tone="warn" icon={Info}>Điền đủ 8 thành phần để xuất bản ca.</Notice>}
        </div>
      </div>
    </div>
  );
};

export const LecAssign = () => {
  const cases = useStore(s => s.cases), classes = useStore(s => s.classes), assignments = useStore(s => s.assignments);
  const [caseId, setCaseId] = useState('case3'), [classId, setClassId] = useState('c1'), [due, setDue] = useState('2026-11-26');
  const [title, setTitle] = useState('Bài thực hành tuần 13');
  const fmt = (d: string) => d.split('-').reverse().join('/');
  return (
    <div className="page">
      <PageHead title="Giao bài" sub="Giao ca cho lớp, nhóm hoặc từng sinh viên." />
      <div className="grid-2">
        <section className="panel stack">
          <Field id="asg-title" label="Tên bài"><input id="asg-title" className="input" value={title} onChange={e => setTitle(e.target.value)} /></Field>
          <Field id="asg-case" label="Ca mô phỏng" hint="Bài được giao gắn với phiên bản ca hiện tại."><select id="asg-case" className="select" value={caseId} onChange={e => setCaseId(e.target.value)}>{cases.filter(c => c.status === 'PUBLISHED').map(c => <option key={c.id} value={c.id}>{c.title} (v{c.version})</option>)}</select></Field>
          <Field id="asg-class" label="Giao cho"><select id="asg-class" className="select" value={classId} onChange={e => setClassId(e.target.value)}>{classes.filter(c => c.lecturerId === CURRENT_LECTURER).map(c => <option key={c.id} value={c.id}>{c.name} ({c.students.length} sinh viên)</option>)}</select></Field>
          <Field id="asg-due" label="Hạn hoàn thành"><input id="asg-due" className="input num" type="date" value={due} onChange={e => setDue(e.target.value)} /></Field>
          <div><Btn icon={Send} onClick={() => { setState(s => ({ assignments: [{ id: 'as' + Date.now(), caseId, title, classId, due: fmt(due), status: 'OPEN' }, ...s.assignments] })); toast('Đã giao bài'); go('lec-home'); }}>Giao bài</Btn></div>
        </section>
        <aside className="panel stack">
          <h2>Đã giao gần đây</h2>
          <div>{assignments.map(a => <div className="list-row" key={a.id}><div className="grow"><b style={{ fontWeight: 500 }}>{a.title}</b><div className="small muted">{cases.find(c => c.id === a.caseId)!.title}, hạn {a.due}</div></div>{a.status === 'OPEN' ? <Badge tone="brand">Đang mở</Badge> : <Badge>Đã đóng</Badge>}</div>)}</div>
        </aside>
      </div>
    </div>
  );
};

export const LecProgress = () => {
  const { students, sessions } = useScope();
  const assignments = useStore(s => s.assignments), cases = useStore(s => s.cases);
  const open = assignments.filter(a => a.status === 'OPEN');
  const [aid, setAid] = useState(open[0].id);
  const a = assignments.find(x => x.id === aid)!;
  const list = students.filter(u => u.classId === a.classId);
  const row = (id: string) => sessions.find(s => s.userId === id && s.assignmentId === aid);
  const stateOf = (s?: Session) => !s ? <Badge>Chưa làm</Badge> : s.submission?.status === 'SUBMITTED' ? <Badge tone="ok">Đã nộp</Badge> : s.submission?.status === 'WITHDRAWN' ? <Badge tone="danger">Người học đã rút bài</Badge> : <Badge tone="warn">Đã làm, chưa nộp</Badge>;
  return (
    <div className="page">
      <PageHead title="Tiến độ lớp" sub="Bạn xem được transcript và báo cáo của bài đã nộp. Với phiên luyện tự do, chỉ có số liệu tổng hợp." />
      <div className="chips" role="group" aria-label="Chọn bài">{open.map(x => <button key={x.id} className="chip" aria-pressed={x.id === aid} onClick={() => setAid(x.id)}>{x.title}</button>)}</div>
      <section className="panel flush">
        <div className="panel-head"><h2>{cases.find(c => c.id === a.caseId)!.title}</h2><span className="small muted">Hạn {a.due}</span></div>
        <div className="table-wrap"><table className="t">
          <thead><tr><th>Sinh viên</th><th>Trạng thái</th><th>Thời lượng</th><th>Nộp lúc</th><th>Đã nhận xét</th><th /></tr></thead>
          <tbody>{list.map(u => {
            const s = row(u.id);
            const canOpen = s?.submission?.status === 'SUBMITTED' && s.record === 'ACTIVE';
            return (
              <tr key={u.id}>
                <td>{u.name}</td><td>{stateOf(s)}</td><td className="num">{s ? `${s.minutes} phút` : '-'}</td>
                <td className="num">{s?.submission?.at ?? '-'}</td><td>{s?.report?.reviewedBy ? <Badge tone="ok">Rồi</Badge> : '-'}</td>
                <td className="act">{canOpen && <Btn kind="ghost" size="sm" icon={Eye} onClick={() => go('lec-review', { reviewId: s!.id })}>Xem xét</Btn>}</td>
              </tr>
            );
          })}</tbody>
        </table></div>
      </section>
    </div>
  );
};

export const LecReview = () => {
  const id = useStore(s => s.reviewId), sessions = useStore(s => s.sessions), users = useStore(s => s.users), cases = useStore(s => s.cases);
  const s = sessions.find(x => x.id === id)!;
  const c = cases.find(x => x.id === s.caseId)!;
  const u = users.find(x => x.id === s.userId)!;
  const r = s.report!;
  const [levels, setLevels] = useState<Record<string, number | null>>(() => Object.fromEntries(r.scores.map(x => [x.skill, x.lecturerLevel ?? null])));
  const [comment, setComment] = useState(r.lecturerComment ?? '');
  const [focus, setFocus] = useState<number | null>(null);
  const save = () => {
    updateSession(id, { report: { ...r, lecturerComment: comment, reviewedBy: 'TS. Lê Thu Hằng', reviewedAt: '30/10/2026', scores: r.scores.map(x => ({ ...x, lecturerLevel: levels[x.skill] })) } });
    logAudit('TS. Lê Thu Hằng', 'Nhận xét bài', u.name, c.title); toast('Đã lưu nhận xét'); go('lec-progress');
  };
  return (
    <div className="page wide">
      <PageHead back={{ label: 'Tiến độ lớp', to: 'lec-progress' }} title={u.name} sub={`${c.title}, ${s.minutes} phút, nộp lúc ${s.submission?.at ?? 'chưa nộp'}.`} actions={<Btn onClick={save}>Lưu nhận xét</Btn>} />
      <div className="review">
        <section className="panel stack">
          <h2>Transcript</h2>
          <div className="log">{s.messages.map(m => <MsgLine key={m.seq} m={m} focus={focus === m.seq} clientName={c.clientName} you="Sinh viên" />)}</div>
        </section>
        <div className="stack lg">
          <section className="panel stack">
            <h2>Đánh giá theo kỹ năng</h2>
            <p className="small muted">Đề xuất của AI được giữ nguyên. Mức bạn chọn lưu riêng và hiển thị cho sinh viên.</p>
            <div>{r.scores.map(sc => (
              <div className="skill" key={sc.skill}>
                <h3>{SKILLS.find(x => x.code === sc.skill)!.name}</h3>
                <div className="compare">
                  <div><div className="small muted">AI đề xuất</div><Meter level={sc.level} compact /></div>
                  <div className="field"><label htmlFor={`lv-${sc.skill}`} className="small">Giảng viên đánh giá</label>
                    <select id={`lv-${sc.skill}`} className="select" value={levels[sc.skill] ?? ''} onChange={e => setLevels(l => ({ ...l, [sc.skill]: e.target.value ? Number(e.target.value) : null }))}>
                      <option value="">Chưa đánh giá</option>{LEVELS.map((n, i) => <option key={n} value={i + 1}>{i + 1}. {n}</option>)}
                    </select>
                  </div>
                </div>
                {sc.evidence.map((e, i) => <button className="quote" key={i} onClick={() => setFocus(e.seq)}><span className="seq num">Lượt {e.seq}</span><span>{e.quote}</span></button>)}
              </div>
            ))}</div>
          </section>
          {s.reflection?.done && <section className="panel stack"><h2>Phản tư của sinh viên</h2><ul className="clean small">{s.reflection.answers.map((a, i) => <li key={i}>{a}</li>)}</ul><p className="small"><b style={{ fontWeight: 500 }}>Mục tiêu:</b> {s.reflection.goal}</p></section>}
          <section className="panel stack">
            <Field id="lec-comment" label="Nhận xét của giảng viên"><textarea id="lec-comment" className="textarea" value={comment} onChange={e => setComment(e.target.value)} placeholder="Nhận xét về điểm mạnh và hướng luyện tập tiếp theo" /></Field>
          </section>
        </div>
      </div>
    </div>
  );
};

const LEVEL_FILL = ['var(--l1)', 'var(--l2)', 'var(--l3)', 'var(--l4)', 'var(--l0)'];
const LEGEND = ['1. Chưa thể hiện', '2. Đang hình thành', '3. Đạt yêu cầu', '4. Thể hiện linh hoạt', 'Chưa đủ dữ liệu'];

export const LecStats = () => {
  const { sessions, students, mine } = useScope();
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [table, setTable] = useState(false);
  const data = SKILLS.map(sk => {
    const counts = [0, 0, 0, 0, 0];
    sessions.filter(s => s.report && s.record !== 'DELETED').forEach(s => { const sc = s.report!.scores.find(x => x.skill === sk.code); if (sc) counts[sc.level ? sc.level - 1 : 4]++; });
    return { ...sk, counts, total: counts.reduce((a, b) => a + b, 0) };
  });
  // Chỉ gợi ý kỹ năng có đủ phiên được đánh giá, để không kết luận từ một vài phiên lẻ.
  const lowShare = (d: (typeof data)[number]) => (d.counts[0] + d.counts[1]) / (d.total - d.counts[4]);
  const weakest = data.filter(d => d.total - d.counts[4] >= 3).sort((x, y) => lowShare(y) - lowShare(x))[0];
  return (
    <div className="page">
      <PageHead title="Thống kê kỹ năng" sub={`${mine[0].name}, ${students.length} sinh viên, ${sessions.length} phiên. Số liệu dùng để điều chỉnh định hướng giảng dạy, không phải điểm học phần.`}
        actions={<><Btn kind="secondary" icon={Table2} onClick={() => setTable(t => !t)}>{table ? 'Xem biểu đồ' : 'Xem bảng số liệu'}</Btn><Btn kind="secondary" onClick={() => { logAudit('TS. Lê Thu Hằng', 'Xuất báo cáo', mine[0].name, 'Báo cáo tổng hợp theo kỹ năng'); toast('Đã tạo báo cáo tổng hợp (minh họa)'); }}>Xuất báo cáo</Btn></>} />
      {weakest && <Notice icon={Info}><b style={{ fontWeight: 500 }}>Nên chú ý: {weakest.name}.</b> Trong các kỹ năng có từ 3 phiên được đánh giá trở lên, đây là kỹ năng có tỷ lệ phiên ở mức 1 và 2 cao nhất.</Notice>}
      <section className="panel stack lg">
        <div className="stack" style={{ gap: 4 }}><h2>Phân bố mức theo kỹ năng</h2><p className="small muted">Mỗi thanh là toàn bộ phiên của lớp với kỹ năng đó. Tính cả phiên đã lưu trữ.</p></div>
        {table ? <div className="table-wrap"><table className="t">
          <thead><tr><th>Kỹ năng</th>{LEGEND.map(l => <th key={l}>{l}</th>)}</tr></thead>
          <tbody>{data.map(d => <tr key={d.code}><td>{d.name}</td>{d.counts.map((n, i) => <td key={i} className="num">{n}</td>)}</tr>)}</tbody>
        </table></div> : <>
          <div className="legend">{LEGEND.map((l, i) => <span key={l}><i style={{ background: LEVEL_FILL[i] }} aria-hidden />{l}</span>)}</div>
          <div className="dist">
            {data.flatMap(d => [
              <span key={d.code} className="small">{d.name}</span>,
              <div key={d.code + 'b'} className="bar" role="img" aria-label={`${d.name}: ${d.counts.map((n, i) => `${LEGEND[i]} ${n}`).join(', ')}`}>
                {d.counts.map((n, i) => n > 0 && <i key={i} style={{ flexGrow: n, flexBasis: 0, background: LEVEL_FILL[i] }}
                  onMouseMove={e => setTip({ x: e.clientX, y: e.clientY, text: `${LEGEND[i]}: ${n} phiên` })} onMouseLeave={() => setTip(null)} />)}
              </div>,
            ])}
          </div>
        </>}
      </section>
      {tip && <div className="chart-tip num" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>}
    </div>
  );
};
