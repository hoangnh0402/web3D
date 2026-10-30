import { useState } from 'react';
import { AlertTriangle, CheckCircle2, FileUp, KeyRound, Lock, RotateCcw, ShieldCheck, Unlock, UserPlus, XCircle } from 'lucide-react';
import { RecordStatus, Role, Session, USAGE, User } from '../data';
import { logAudit, setState, toast, updateSession, useStore } from '../store';
import { Badge, Btn, Field, Modal, Notice, PageHead } from '../ui';

const ADMIN = 'Trần Quốc Bảo';
const ROLE: Record<Role, string> = { student: 'Sinh viên', lecturer: 'Giảng viên', admin: 'Quản trị viên' };

export const AdmUsers = () => {
  const users = useStore(s => s.users), classes = useStore(s => s.classes);
  const [q, setQ] = useState(''), [role, setRole] = useState<'all' | Role>('all');
  const [create, setCreate] = useState(false), [csv, setCsv] = useState(false), [reset, setReset] = useState<User | null>(null);
  const [name, setName] = useState(''), [username, setUsername] = useState(''), [newRole, setNewRole] = useState<Role>('student');
  const shown = users.filter(u => (role === 'all' || u.role === role) && (u.name + u.username).toLowerCase().includes(q.toLowerCase()));
  const setStatus = (u: User, status: User['status']) => {
    setState(s => ({ users: s.users.map(x => x.id === u.id ? { ...x, status } : x) }));
    logAudit(ADMIN, status === 'LOCKED' ? 'Khóa tài khoản' : 'Mở khóa tài khoản', u.username, 'Thu hồi phiên đăng nhập');
    toast(status === 'LOCKED' ? `Đã khóa ${u.username}` : `Đã mở khóa ${u.username}`);
  };
  const add = () => {
    if (!name || !username) return;
    setState(s => ({ users: [{ id: 'u' + Date.now(), name, username, role: newRole, status: 'ACTIVE', lastLogin: 'Chưa đăng nhập' }, ...s.users] }));
    logAudit(ADMIN, 'Tạo tài khoản', username, ROLE[newRole]); toast('Đã tạo tài khoản'); setCreate(false); setName(''); setUsername('');
  };
  return (
    <div className="page wide">
      <PageHead title="Tài khoản" sub={`${users.length} tài khoản. Người dùng mới phải đổi mật khẩu ở lần đăng nhập đầu.`} actions={<><Btn kind="secondary" icon={FileUp} onClick={() => setCsv(true)}>Nhập từ CSV</Btn><Btn icon={UserPlus} onClick={() => setCreate(true)}>Tạo tài khoản</Btn></>} />
      <div className="row">
        <input id="user-search" className="input" style={{ maxWidth: 300 }} aria-label="Tìm tài khoản" placeholder="Tìm theo tên hoặc tên đăng nhập" value={q} onChange={e => setQ(e.target.value)} />
        <div className="chips" role="group" aria-label="Lọc theo vai trò">{(['all', 'student', 'lecturer', 'admin'] as const).map(r => <button key={r} className="chip" aria-pressed={r === role} onClick={() => setRole(r)}>{r === 'all' ? 'Tất cả' : ROLE[r]}</button>)}</div>
      </div>
      <section className="panel flush"><div className="table-wrap"><table className="t">
        <thead><tr><th>Họ tên</th><th>Tên đăng nhập</th><th>Vai trò</th><th>Lớp</th><th>Trạng thái</th><th>Đăng nhập gần nhất</th><th /></tr></thead>
        <tbody>{shown.map(u => (
          <tr key={u.id}>
            <td>{u.name}</td><td>{u.username}</td><td>{ROLE[u.role]}</td><td>{classes.find(c => c.id === u.classId)?.name ?? '-'}</td>
            <td>{u.status === 'ACTIVE' ? <Badge tone="ok">Hoạt động</Badge> : u.status === 'LOCKED' ? <Badge tone="danger">Đã khóa</Badge> : <Badge>Vô hiệu hóa</Badge>}</td>
            <td className="num">{u.lastLogin}</td>
            <td className="act">
              <Btn kind="ghost" size="sm" icon={KeyRound} onClick={() => setReset(u)}>Đặt lại mật khẩu</Btn>
              {u.status === 'LOCKED' ? <Btn kind="ghost" size="sm" icon={Unlock} label="Mở khóa" onClick={() => setStatus(u, 'ACTIVE')} /> : <Btn kind="danger-ghost" size="sm" icon={Lock} label="Khóa" onClick={() => setStatus(u, 'LOCKED')} />}
            </td>
          </tr>
        ))}</tbody>
      </table></div></section>
      {create && <Modal title="Tạo tài khoản" onClose={() => setCreate(false)} footer={<><Btn kind="secondary" onClick={() => setCreate(false)}>Hủy</Btn><Btn disabled={!name || !username} onClick={add}>Tạo tài khoản</Btn></>}>
        <Field id="new-name" label="Họ tên"><input id="new-name" className="input" value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field id="new-user" label="Tên đăng nhập"><input id="new-user" className="input" value={username} onChange={e => setUsername(e.target.value)} /></Field>
        <Field id="new-role" label="Vai trò"><select id="new-role" className="select" value={newRole} onChange={e => setNewRole(e.target.value as Role)}>{(Object.keys(ROLE) as Role[]).map(r => <option key={r} value={r}>{ROLE[r]}</option>)}</select></Field>
      </Modal>}
      {csv && <Modal title="Nhập tài khoản từ CSV" onClose={() => setCsv(false)} footer={<><Btn kind="secondary" onClick={() => setCsv(false)}>Hủy</Btn><Btn onClick={() => { toast('Đã nhập 12 tài khoản (minh họa)'); setCsv(false); }}>Nhập 12 tài khoản</Btn></>}>
        <p className="small muted">Tệp gồm các cột: họ tên, tên đăng nhập, vai trò, lớp.</p>
        <Notice icon={CheckCircle2}>Đã đọc tệp danh-sach-k72.csv: 12 dòng hợp lệ.</Notice>
        <Notice tone="warn" icon={AlertTriangle}>Dòng 7: tên đăng nhập đã tồn tại, dòng này sẽ được bỏ qua.</Notice>
      </Modal>}
      {reset && <Modal title="Đặt lại mật khẩu" onClose={() => setReset(null)} footer={<><Btn kind="secondary" onClick={() => setReset(null)}>Hủy</Btn><Btn onClick={() => { logAudit(ADMIN, 'Đặt lại mật khẩu', reset.username, ''); toast('Đã đặt lại mật khẩu'); setReset(null); }}>Đặt lại mật khẩu</Btn></>}>
        <p>Tạo mật khẩu tạm cho {reset.name}. Người dùng phải đổi mật khẩu ở lần đăng nhập tiếp theo.</p>
      </Modal>}
    </div>
  );
};

export const AdmClasses = () => {
  const classes = useStore(s => s.classes), users = useStore(s => s.users);
  const [sel, setSel] = useState(classes[0].id);
  const c = classes.find(x => x.id === sel)!;
  return (
    <div className="page wide">
      <PageHead title="Lớp" sub="Giảng viên chỉ thấy dữ liệu của lớp mình phụ trách." actions={<Btn icon={UserPlus} onClick={() => toast('Mở biểu mẫu thêm sinh viên (minh họa)')}>Thêm sinh viên</Btn>} />
      <div className="grid-2">
        <section className="panel flush">
          <div className="panel-head"><h2>{c.name}</h2><span className="small muted">{c.term}</span></div>
          <div className="table-wrap"><table className="t">
            <thead><tr><th>Sinh viên</th><th>Tên đăng nhập</th><th /></tr></thead>
            <tbody>{c.students.map(id => { const u = users.find(x => x.id === id)!; return (
              <tr key={id}><td>{u.name}</td><td>{u.username}</td><td className="act"><Btn kind="danger-ghost" size="sm" onClick={() => { setState(s => ({ classes: s.classes.map(k => k.id === c.id ? { ...k, students: k.students.filter(x => x !== id) } : k) })); toast('Đã bớt sinh viên khỏi lớp'); }}>Bớt khỏi lớp</Btn></td></tr>
            ); })}</tbody>
          </table></div>
        </section>
        <aside className="panel stack">
          <h2>Danh sách lớp</h2>
          <div>{classes.map(k => (
            <button key={k.id} className="screen-link" style={{ width: '100%', flexDirection: 'column', gap: 0, background: k.id === sel ? 'var(--brand-soft)' : undefined }} aria-pressed={k.id === sel} onClick={() => setSel(k.id)}>
              <span>{k.name}</span><span className="small muted">{users.find(u => u.id === k.lecturerId)!.name}, {k.students.length} sinh viên</span>
            </button>
          ))}</div>
        </aside>
      </div>
    </div>
  );
};

const REC: Record<RecordStatus, { label: string; tone?: 'ok' | 'warn' | 'danger' }> = { ACTIVE: { label: 'Đang hiệu lực', tone: 'ok' }, ARCHIVED: { label: 'Đã lưu trữ', tone: 'warn' }, DELETED: { label: 'Đã xóa', tone: 'danger' } };

export const AdmData = () => {
  const sessions = useStore(s => s.sessions), users = useStore(s => s.users), cases = useStore(s => s.cases);
  const [f, setF] = useState<'ALL' | RecordStatus>('ALL');
  const [edit, setEdit] = useState<Session | null>(null);
  const [next, setNext] = useState<RecordStatus>('ACTIVE'), [until, setUntil] = useState('2026-11-13');
  const list = sessions.filter(s => s.status !== 'IN_PROGRESS' && (f === 'ALL' || s.record === f));
  const count = (r: RecordStatus) => sessions.filter(s => s.record === r && s.status !== 'IN_PROGRESS').length;
  const fmt = (d: string) => d.split('-').reverse().join('/');
  const apply = () => {
    if (!edit) return;
    updateSession(edit.id, { record: next, ...(next === 'ACTIVE' ? { retentionUntil: fmt(until) } : {}) });
    logAudit(ADMIN, 'Đổi trạng thái phiên', edit.id, `${REC[edit.record].label} sang ${REC[next].label}`);
    toast(`Đã chuyển sang ${REC[next].label}`); setEdit(null);
  };
  return (
    <div className="page wide">
      <PageHead title="Dữ liệu phiên" sub="Dữ liệu không bị xóa hẳn. Sau 14 ngày phiên tự chuyển sang Đã lưu trữ và chỉ quản trị viên xem được." />
      <div className="grid-3">
        <div className="stat"><b>{count('ACTIVE')}</b><span>Đang hiệu lực</span></div>
        <div className="stat"><b>{count('ARCHIVED')}</b><span>Đã lưu trữ</span></div>
        <div className="stat"><b>{count('DELETED')}</b><span>Đã xóa mềm</span></div>
      </div>
      <div className="chips" role="group" aria-label="Lọc theo trạng thái">{(['ALL', 'ACTIVE', 'ARCHIVED', 'DELETED'] as const).map(r => <button key={r} className="chip" aria-pressed={r === f} onClick={() => setF(r)}>{r === 'ALL' ? 'Tất cả' : REC[r].label}</button>)}</div>
      <section className="panel flush"><div className="table-wrap"><table className="t">
        <thead><tr><th>Sinh viên</th><th>Ca</th><th>Kết thúc</th><th>Hạn hiển thị</th><th>Trạng thái</th><th /></tr></thead>
        <tbody>{list.map(s => (
          <tr key={s.id}>
            <td>{users.find(u => u.id === s.userId)?.name}</td><td>{cases.find(c => c.id === s.caseId)?.title}</td>
            <td className="num">{s.endedAt}</td><td className="num">{s.retentionUntil}</td>
            <td><Badge tone={REC[s.record].tone}>{REC[s.record].label}</Badge></td>
            <td className="act"><Btn kind="ghost" size="sm" icon={RotateCcw} onClick={() => { setEdit(s); setNext(s.record === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE'); }}>Đổi trạng thái</Btn></td>
          </tr>
        ))}</tbody>
      </table></div></section>
      {edit && <Modal title="Đổi trạng thái phiên" onClose={() => setEdit(null)} footer={<><Btn kind="secondary" onClick={() => setEdit(null)}>Hủy</Btn><Btn onClick={apply}>Lưu trạng thái</Btn></>}>
        <p className="small muted">Hiện tại: {REC[edit.record].label}. Thay đổi được ghi vào nhật ký.</p>
        <Field id="rec-next" label="Trạng thái mới"><select id="rec-next" className="select" value={next} onChange={e => setNext(e.target.value as RecordStatus)}>{(Object.keys(REC) as RecordStatus[]).filter(r => r !== edit.record).map(r => <option key={r} value={r}>{REC[r].label}</option>)}</select></Field>
        {next === 'ACTIVE' && <Field id="rec-until" label="Hạn hiển thị mới" hint="Cần đặt hạn mới, nếu không phiên sẽ bị chuyển lưu trữ lại ở lần chạy tiếp theo."><input id="rec-until" className="input num" type="date" value={until} onChange={e => setUntil(e.target.value)} /></Field>}
      </Modal>}
    </div>
  );
};

export const AdmConfig = () => {
  const [days, setDays] = useState(14), [rate, setRate] = useState(30), [maxMin, setMaxMin] = useState(30);
  const [guide, setGuide] = useState('Hãy tạm dừng khám phá vấn đề, hỏi trực tiếp về sự an toàn của thân chủ và làm theo quy trình của giảng viên.');
  return (
    <div className="page">
      <PageHead title="Cấu hình" sub="Các thay đổi có hiệu lực ngay và được ghi vào nhật ký." actions={<Btn onClick={() => { logAudit(ADMIN, 'Đổi cấu hình', 'Hệ thống', `Thời hạn ${days} ngày, ${rate} lượt mỗi phút`); toast('Đã lưu cấu hình'); }}>Lưu cấu hình</Btn>} />
      <div className="grid-2-eq">
        <section className="panel stack">
          <h2>Dịch vụ AI và giọng nói</h2>
          <Field id="cfg-ai" label="Địa chỉ dịch vụ AI"><input id="cfg-ai" className="input" defaultValue="http://ai.labfourt.local:8100" /></Field>
          <Field id="cfg-stt" label="Địa chỉ dịch vụ giọng nói"><input id="cfg-stt" className="input" defaultValue="http://stt.labfourt.local:8200" /></Field>
          <div className="field"><span className="lbl">Khóa dịch vụ</span><div className="row"><Badge tone="ok"><ShieldCheck size={13} aria-hidden />Đã cấu hình</Badge><span className="small muted">Khóa chỉ lưu ở máy chủ, không hiển thị tại đây.</span></div></div>
        </section>
        <section className="panel stack">
          <h2>Dữ liệu và giới hạn</h2>
          <Field id="cfg-days" label="Thời hạn hiển thị phiên (ngày)" hint="Sau thời hạn, phiên chuyển sang Đã lưu trữ, không bị xóa hẳn."><input id="cfg-days" className="input num" type="number" min={1} value={days} onChange={e => setDays(Number(e.target.value))} /></Field>
          <Field id="cfg-rate" label="Giới hạn lượt mỗi phút cho một người dùng"><input id="cfg-rate" className="input num" type="number" min={1} value={rate} onChange={e => setRate(Number(e.target.value))} /></Field>
          <Field id="cfg-max" label="Độ dài phiên mặc định (phút)"><input id="cfg-max" className="input num" type="number" min={5} value={maxMin} onChange={e => setMaxMin(Number(e.target.value))} /></Field>
        </section>
      </div>
      <section className="panel stack">
        <h2>Hướng dẫn an toàn</h2>
        <Field id="cfg-guide" label="Nội dung hiển thị khi có tín hiệu nguy cơ" hint="Nội dung minh họa, chờ giảng viên xác nhận quy trình."><textarea id="cfg-guide" className="textarea" value={guide} onChange={e => setGuide(e.target.value)} /></Field>
      </section>
    </div>
  );
};

const SERVICES: [string, string, boolean][] = [
  ['Website và API', 'Phản hồi 120 ms', true], ['Cơ sở dữ liệu', 'Sử dụng 18% dung lượng', true],
  ['Dịch vụ AI', 'Phản hồi đầu tiên 1,9 giây', true], ['Dịch vụ giọng nói', 'Không phản hồi trong 2 phút', false], ['Sao lưu gần nhất', 'Hôm nay lúc 02:00', true],
];

export const AdmStatus = () => {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const max = Math.max(...USAGE.map(u => u.turns));
  const total = USAGE.reduce((a, b) => a + b.turns, 0);
  const down = SERVICES.filter(s => !s[2]);
  return (
    <div className="page">
      <PageHead title="Trạng thái hệ thống" sub="Số liệu minh họa của 7 ngày gần nhất." />
      {down.length > 0 && <Notice tone="danger" icon={AlertTriangle}>{down[0][0]} đang gặp sự cố. Sinh viên vẫn nhập văn bản được nhưng chưa dùng được micro.</Notice>}
      <div className="grid-2-eq">
        <section className="panel stack">
          <h2>Dịch vụ</h2>
          <div>{SERVICES.map(([n, d, ok]) => (
            <div className="list-row health" key={n}>
              <div className="grow"><span>{n}</span><div className="small muted">{d}</div></div>
              {ok ? <Badge tone="ok"><CheckCircle2 size={13} aria-hidden />Hoạt động</Badge> : <Badge tone="danger"><XCircle size={13} aria-hidden />Sự cố</Badge>}
            </div>
          ))}</div>
        </section>
        <section className="panel stack">
          <div className="stack" style={{ gap: 2 }}><h2>Lượt hội thoại mỗi ngày</h2><p className="small muted num">Tổng {total.toLocaleString('vi-VN')} lượt trong 7 ngày</p></div>
          <div className="bars-v">{USAGE.map(u => (
            <div key={u.day} onMouseMove={e => setTip({ x: e.clientX, y: e.clientY, text: `${u.day}: ${u.turns} lượt` })} onMouseLeave={() => setTip(null)} role="img" aria-label={`${u.day}: ${u.turns} lượt`}>
              <i style={{ height: `${(u.turns / max) * 100}%` }} />
            </div>
          ))}</div>
          <div className="bars-x">{USAGE.map(u => <span key={u.day}>{u.day}</span>)}</div>
        </section>
      </div>
      {tip && <div className="chart-tip num" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>}
    </div>
  );
};

export const AdmLogs = () => {
  const audit = useStore(s => s.audit);
  const [q, setQ] = useState('');
  const shown = audit.filter(a => (a.actor + a.action + a.target + a.detail).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="page wide">
      <PageHead title="Nhật ký" sub="Ghi lại đăng nhập, đổi quyền, đổi trạng thái dữ liệu, xuất báo cáo và đổi cấu hình. Nhật ký không sửa được từ giao diện." />
      <input id="log-search" className="input" style={{ maxWidth: 340 }} aria-label="Tìm trong nhật ký" placeholder="Tìm theo người thực hiện hoặc hành động" value={q} onChange={e => setQ(e.target.value)} />
      <section className="panel flush"><div className="table-wrap"><table className="t">
        <thead><tr><th>Thời điểm</th><th>Người thực hiện</th><th>Hành động</th><th>Đối tượng</th><th>Chi tiết</th></tr></thead>
        <tbody>{shown.map(a => <tr key={a.id}><td className="num">{a.at}</td><td>{a.actor}</td><td>{a.action}</td><td>{a.target}</td><td className="muted">{a.detail}</td></tr>)}</tbody>
      </table></div></section>
    </div>
  );
};
