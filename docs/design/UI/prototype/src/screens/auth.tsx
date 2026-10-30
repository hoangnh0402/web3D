import { useState } from 'react';
import { AlertTriangle, BookOpenCheck, Check, GraduationCap, Info, KeyRound, Mic, Play, Settings2, ShieldCheck, Trash2, Users } from 'lucide-react';
import { roomImage } from '../assets';
import { SKILLS } from '../data';
import { go, Route, toast } from '../store';
import { Badge, BrandMark, Btn, Field, Meter, Notice, PageHead } from '../ui';

export const Login = () => {
  const [user, setUser] = useState('minhanh.k72');
  const [pass, setPass] = useState('labfourt');
  const [error, setError] = useState('');
  const submit = () => {
    if (!user || !pass) { setError('Nhập tên đăng nhập và mật khẩu để tiếp tục.'); return; }
    go('home');
  };
  return (
    <div className="login">
      <section className="login-art" style={{ backgroundImage: `url(${roomImage('a')})` }}>
        <div><h1>Một căn phòng để luyện lắng nghe</h1><p>Thực hành tham vấn với thân chủ mô phỏng, xem lại từng lượt trao đổi và nhận phản hồi có dẫn chứng.</p></div>
      </section>
      <section className="login-form">
        <div>
          <div className="brand"><BrandMark /><div><b>Lab FourT</b><small>Phòng thực hành tham vấn ảo</small></div></div>
          <form className="stack" onSubmit={e => { e.preventDefault(); submit(); }}>
            <Field id="login-user" label="Tên đăng nhập"><input id="login-user" className="input" value={user} autoComplete="username" onChange={e => setUser(e.target.value)} /></Field>
            <Field id="login-pass" label="Mật khẩu"><input id="login-pass" className="input" type="password" value={pass} autoComplete="current-password" onChange={e => setPass(e.target.value)} /></Field>
            {error && <Notice tone="danger" icon={KeyRound}>{error}</Notice>}
            <button type="submit" className="btn primary lg">Đăng nhập</button>
            <p className="small muted">Tài khoản do quản trị viên cấp. Quên mật khẩu, hãy liên hệ quản trị viên của bạn.</p>
          </form>
          <div className="divider">Vào nhanh bản demo</div>
          <div className="role-quick">
            <button onClick={() => go('home')}><GraduationCap size={19} aria-hidden /><div><b>Sinh viên</b><span>Thực hành ca và xem báo cáo</span></div></button>
            <button onClick={() => go('lec-home')}><Users size={19} aria-hidden /><div><b>Giảng viên</b><span>Soạn ca, giao bài, nhận xét</span></div></button>
            <button onClick={() => go('adm-users')}><Settings2 size={19} aria-hidden /><div><b>Quản trị viên</b><span>Tài khoản, dữ liệu, hệ thống</span></div></button>
          </div>
        </div>
      </section>
    </div>
  );
};

export const ChangePassword = () => {
  const [a, setA] = useState(''), [b, setB] = useState('');
  const mismatch = b.length > 0 && a !== b;
  return (
    <div className="login">
      <section className="login-art" style={{ backgroundImage: `url(${roomImage('a')})` }}>
        <div><h1>Chào mừng bạn đến với Lab FourT</h1><p>Đây là lần đăng nhập đầu tiên, hãy đặt mật khẩu của riêng bạn.</p></div>
      </section>
      <section className="login-form">
        <form className="stack" onSubmit={e => { e.preventDefault(); if (a.length >= 8 && a === b) { toast('Đã đổi mật khẩu'); go('home'); } }}>
          <h2>Đặt mật khẩu mới</h2>
          <Field id="pw-new" label="Mật khẩu mới" hint="Tối thiểu 8 ký tự."><input id="pw-new" className="input" type="password" value={a} onChange={e => setA(e.target.value)} /></Field>
          <Field id="pw-again" label="Nhập lại mật khẩu"><input id="pw-again" className="input" type="password" value={b} onChange={e => setB(e.target.value)} /></Field>
          {mismatch && <Notice tone="danger" icon={KeyRound}>Hai mật khẩu chưa khớp, hãy nhập lại.</Notice>}
          <button type="submit" className="btn primary lg">Lưu và tiếp tục</button>
        </form>
      </section>
    </div>
  );
};

const GROUPS: { title: string; items: [string, string, Route][] }[] = [
  { title: 'Chung', items: [['SCR-01', 'Đăng nhập', 'login'], ['SCR-02', 'Đổi mật khẩu lần đầu', 'change-password']] },
  { title: 'Sinh viên', items: [['SCR-03', 'Trang chủ', 'home'], ['SCR-04', 'Thư viện ca', 'library'], ['SCR-05', 'Trang chuẩn bị', 'prepare'], ['SCR-06', 'Phòng tham vấn', 'room'], ['SCR-07', 'Báo cáo sau phiên', 'report'], ['SCR-08', 'Transcript', 'transcript'], ['SCR-09', 'Phản tư và nộp bài', 'reflection'], ['SCR-10', 'Lịch sử thực hành', 'history']] },
  { title: 'Giảng viên', items: [['SCR-11', 'Tổng quan', 'lec-home'], ['SCR-12', 'Soạn ca', 'lec-case-edit'], ['SCR-13', 'Giao bài', 'lec-assign'], ['SCR-14', 'Tiến độ lớp', 'lec-progress'], ['SCR-15', 'Xem xét bài nộp', 'lec-review'], ['SCR-16', 'Thống kê kỹ năng', 'lec-stats']] },
  { title: 'Quản trị viên', items: [['SCR-17', 'Tài khoản', 'adm-users'], ['SCR-18', 'Lớp', 'adm-classes'], ['SCR-19', 'Dữ liệu phiên', 'adm-data'], ['SCR-20', 'Cấu hình', 'adm-config'], ['SCR-21', 'Trạng thái hệ thống', 'adm-status'], ['SCR-22', 'Nhật ký', 'adm-logs']] },
];

export const ScreenMap = () => (
  <div className="main-scroll">
    <div className="page">
      <PageHead title="Bản đồ màn hình" sub="Mở nhanh từng màn hình trong bản demo. Mã SCR khớp với tài liệu SRS, mục 05." actions={<><Btn kind="secondary" onClick={() => go('styleguide')}>Hệ thống thiết kế</Btn><Btn kind="secondary" onClick={() => go('login')}>Về trang đăng nhập</Btn></>} />
      <Notice tone="neutral" icon={ShieldCheck}>Dữ liệu trong bản demo là dữ liệu minh họa. Thân chủ, sinh viên và lớp học đều là nhân vật hư cấu. AI và nhận dạng giọng nói được giả lập.</Notice>
      <div className="grid-2-eq">
        {GROUPS.map(g => (
          <section key={g.title} className="panel screen-group">
            <h2>{g.title}</h2>
            <div>{g.items.map(([code, name, route]) => <button key={code} className="screen-link" onClick={() => go(route)}><code>{code}</code>{name}</button>)}</div>
          </section>
        ))}
      </div>
      <section className="panel stack">
        <h2><BookOpenCheck size={18} aria-hidden style={{ verticalAlign: -3, marginRight: 8 }} />Sáu nhóm kỹ năng trong rubric</h2>
        <div className="chips">{SKILLS.map(s => <span key={s.code} className="tag">{s.name}</span>)}</div>
      </section>
    </div>
  </div>
);

const COLORS: [string, [string, string][]][] = [
  ['Mực và nền', [['ink', 'Chữ chính'], ['ink-2', 'Chữ phụ'], ['ink-3', 'Chú thích'], ['paper', 'Nền trang'], ['surface', 'Bề mặt'], ['sunken', 'Nền chìm'], ['line', 'Đường kẻ']]],
  ['Thương hiệu', [['night', 'Điều hướng'], ['night-2', 'Điều hướng, đang chọn'], ['brand', 'Hành động chính'], ['brand-strong', 'Khi di chuột'], ['brand-soft', 'Nền nhạt'], ['lamp', 'Ánh đèn, điểm nhấn'], ['lamp-soft', 'Nền đèn nhạt']]],
  ['Trạng thái', [['ok', 'Tốt'], ['ok-soft', 'Tốt, nền'], ['warn', 'Chú ý'], ['warn-soft', 'Chú ý, nền'], ['danger', 'Nguy hiểm'], ['danger-soft', 'Nguy hiểm, nền']]],
  ['Thang 4 mức', [['l1', 'Mức 1'], ['l2', 'Mức 2'], ['l3', 'Mức 3'], ['l4', 'Mức 4'], ['l0', 'Chưa đủ dữ liệu']]],
];

export const StyleGuide = () => (
  <div className="main-scroll">
    <div className="page">
      <PageHead title="Hệ thống thiết kế" sub="Màu, kiểu chữ và thành phần dùng chung của Lab FourT." actions={<Btn kind="secondary" onClick={() => go('map')}>Bản đồ màn hình</Btn>} />
      {COLORS.map(([group, list]) => (
        <section key={group} className="panel stack">
          <h2>{group}</h2>
          <div className="swatches">{list.map(([t, n]) => <div key={t} className="swatch"><i style={{ background: `var(--${t})` }} /><b>{n}</b><span>--{t}</span></div>)}</div>
        </section>
      ))}
      <section className="panel stack">
        <h2>Kiểu chữ</h2>
        <h1>Tiêu đề trang, Bricolage Grotesque 31</h1>
        <h2>Tiêu đề khối, Bricolage Grotesque 19</h2>
        <h3>Tiêu đề nhỏ, Be Vietnam Pro 15 đậm vừa</h3>
        <p>Nội dung, Be Vietnam Pro 15. Thân chủ có thể do dự hoặc chưa sẵn sàng chia sẻ ngay.</p>
        <p className="small muted">Chú thích, Be Vietnam Pro 13.</p>
      </section>
      <section className="panel stack">
        <h2>Nút</h2>
        <div className="row"><Btn icon={Play}>Hành động chính</Btn><Btn kind="secondary">Phụ</Btn><Btn kind="ghost">Nhẹ</Btn><Btn kind="danger" icon={Trash2}>Xóa</Btn><Btn kind="danger-ghost">Xóa nhẹ</Btn><Btn disabled>Vô hiệu</Btn></div>
        <div className="row"><Btn size="lg">Cỡ lớn</Btn><Btn>Cỡ vừa</Btn><Btn size="sm">Cỡ nhỏ</Btn><button className="mic" aria-label="Micro"><Mic size={20} /></button></div>
      </section>
      <section className="panel stack">
        <h2>Nhãn và thông báo</h2>
        <div className="row"><Badge tone="ok"><Check size={13} aria-hidden />Đã nộp</Badge><Badge tone="warn">Chưa nộp</Badge><Badge tone="danger">Đã khóa</Badge><Badge tone="brand">Được giao</Badge><Badge>Trung tính</Badge><span className="tag">Thẻ kỹ năng</span></div>
        <Notice icon={Info}>Thông báo thông tin.</Notice>
        <Notice tone="warn" icon={AlertTriangle}>Thông báo cần chú ý.</Notice>
        <Notice tone="danger" icon={AlertTriangle}>Thông báo lỗi kèm cách xử lý.</Notice>
      </section>
      <section className="panel stack">
        <h2>Thang đánh giá</h2>
        {[1, 2, 3, 4, null].map(l => <Meter key={String(l)} level={l} />)}
      </section>
      <section className="panel stack">
        <h2>Biểu mẫu</h2>
        <div className="grid-2-eq">
          <Field id="sg-input" label="Ô nhập" hint="Dòng gợi ý cho người dùng."><input id="sg-input" className="input" defaultValue="Nội dung đã nhập" /></Field>
          <Field id="sg-select" label="Danh sách chọn"><select id="sg-select" className="select"><option>Cơ bản</option></select></Field>
        </div>
      </section>
    </div>
  </div>
);
