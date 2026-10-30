import { ReactNode, useEffect, useState } from 'react';
import {
  BarChart3, BookOpen, CheckCircle2, ClipboardList, Database, FileClock, FlaskConical, GraduationCap, History, Home, LayoutGrid,
  Leaf, LogOut, LucideIcon, Map, ScrollText, Send, Server, Settings2, UserRound, Users, X,
} from 'lucide-react';
import { LEVELS, Role } from './data';
import { CURRENT_ADMIN, CURRENT_LECTURER, CURRENT_STUDENT, go, Route, State, useStore } from './store';

type BtnKind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost';
export const Btn = ({ kind = 'primary', size, icon: I, disabled, onClick, children, label, id }: { kind?: BtnKind; size?: 'sm' | 'lg'; icon?: LucideIcon; disabled?: boolean; onClick?: () => void; children?: ReactNode; label?: string; id?: string }) => (
  <button type="button" id={id} className={`btn ${kind} ${size ?? ''}`} aria-disabled={disabled || undefined} aria-label={label} onClick={() => !disabled && onClick?.()}>
    {I && <I size={size === 'sm' ? 15 : 17} aria-hidden />}{children}
  </button>
);

export const Badge = ({ tone, children }: { tone?: 'ok' | 'warn' | 'danger' | 'brand'; children: ReactNode }) => <span className={`badge ${tone ?? ''}`}>{children}</span>;

export const Notice = ({ tone, icon: I, children }: { tone?: 'warn' | 'danger' | 'neutral'; icon: LucideIcon; children: ReactNode }) => (
  <div className={`notice ${tone ?? ''}`}><I size={17} aria-hidden /><div className="grow">{children}</div></div>
);

// Thang 4 mức trong rubric. null nghĩa là chưa đủ dữ liệu.
export const Meter = ({ level, compact }: { level: number | null | undefined; compact?: boolean }) => (
  <span className="meter" aria-label={level ? `Mức ${level}: ${LEVELS[level - 1]}` : 'Chưa đủ dữ liệu'}>
    <span className="bars" aria-hidden>{[1, 2, 3, 4].map(i => <i key={i} className={level && i <= level ? `on l${level}` : ''} />)}</span>
    {!compact && <span className="lv">{level ? `${level}. ${LEVELS[level - 1]}` : 'Chưa đủ dữ liệu'}</span>}
  </span>
);

export const Modal = ({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer: ReactNode }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <header><h2>{title}</h2><button className="icon-btn" aria-label="Đóng" onClick={onClose}><X size={18} /></button></header>
        <div className="body">{children}</div>
        <footer>{footer}</footer>
      </div>
    </div>
  );
};

export const Field = ({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) => (
  <div className="field"><label htmlFor={id}>{label}</label>{children}{hint && <span className="hint">{hint}</span>}</div>
);

export const BrandMark = () => <span className="brand-mark" aria-hidden><Leaf size={16} /></span>;

const NAV: Record<Role, { route: Route; label: string; icon: LucideIcon; also?: Route[] }[]> = {
  student: [
    { route: 'home', label: 'Trang chủ', icon: Home },
    { route: 'library', label: 'Thư viện ca', icon: BookOpen, also: ['prepare'] },
    { route: 'history', label: 'Lịch sử thực hành', icon: History, also: ['report', 'transcript', 'reflection'] },
  ],
  lecturer: [
    { route: 'lec-home', label: 'Tổng quan', icon: LayoutGrid },
    { route: 'lec-cases', label: 'Ca mô phỏng', icon: BookOpen, also: ['lec-case-edit'] },
    { route: 'lec-assign', label: 'Giao bài', icon: ClipboardList },
    { route: 'lec-progress', label: 'Tiến độ lớp', icon: GraduationCap, also: ['lec-review'] },
    { route: 'lec-stats', label: 'Thống kê kỹ năng', icon: BarChart3 },
  ],
  admin: [
    { route: 'adm-users', label: 'Tài khoản', icon: UserRound },
    { route: 'adm-classes', label: 'Lớp', icon: Users },
    { route: 'adm-data', label: 'Dữ liệu phiên', icon: Database },
    { route: 'adm-config', label: 'Cấu hình', icon: Settings2 },
    { route: 'adm-status', label: 'Trạng thái hệ thống', icon: Server },
    { route: 'adm-logs', label: 'Nhật ký', icon: ScrollText },
  ],
};

const ROLE_LABEL: Record<Role, string> = { student: 'Sinh viên', lecturer: 'Giảng viên', admin: 'Quản trị viên' };
const currentId = (r: Role) => r === 'student' ? CURRENT_STUDENT : r === 'lecturer' ? CURRENT_LECTURER : CURRENT_ADMIN;

export const initials = (name: string) => name.replace(/^(TS\.|ThS\.)\s*/, '').split(' ').slice(-2).map(w => w[0]).join('');

export const Shell = ({ children }: { children: ReactNode }) => {
  const role = useStore(s => s.role), route = useStore(s => s.route), users = useStore(s => s.users);
  const me = users.find(u => u.id === currentId(role))!;
  const items = NAV[role];
  const active = (it: (typeof items)[number]) => it.route === route || it.also?.includes(route);
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><BrandMark /><div><b>Lab FourT</b><small>Phòng thực hành tham vấn ảo</small></div></div>
        <nav className="nav" aria-label="Điều hướng chính">
          {items.map(it => <button key={it.route} aria-current={active(it) ? 'page' : undefined} onClick={() => go(it.route)}><it.icon size={18} aria-hidden />{it.label}</button>)}
        </nav>
        <div className="who">
          <span className="avatar">{initials(me.name)}</span>
          <div className="grow"><b>{me.name}</b><span>{ROLE_LABEL[role]}</span></div>
          <button className="icon-btn" aria-label="Đăng xuất" onClick={() => go('login')}><LogOut size={17} /></button>
        </div>
      </aside>
      <main className="main-scroll">{children}</main>
      <nav className="tabbar" aria-label="Điều hướng chính">
        {items.map(it => <button key={it.route} aria-current={active(it) ? 'page' : undefined} onClick={() => go(it.route)}><it.icon size={19} aria-hidden /><span>{it.label.split(' ').slice(0, 2).join(' ')}</span></button>)}
      </nav>
    </div>
  );
};

export const PageHead = ({ title, sub, actions, back }: { title: string; sub?: ReactNode; actions?: ReactNode; back?: { label: string; to: Route } }) => (
  <div className="stack" style={{ gap: 6 }}>
    {back && <button className="crumb" onClick={() => go(back.to)}>‹ {back.label}</button>}
    <div className="page-head">
      <div className="grow"><h1>{title}</h1>{sub && <p className="sub">{sub}</p>}</div>
      {actions && <div className="row">{actions}</div>}
    </div>
  </div>
);

export const Toasts = () => {
  const toasts = useStore(s => s.toasts);
  return <div className="toasts" aria-live="polite">{toasts.map(t => <div key={t.id} className={`toast ${t.kind}`}><CheckCircle2 size={16} aria-hidden />{t.text}</div>)}</div>;
};

// Nút dành cho người trình bày: đổi vai trò nhanh và mở bản đồ màn hình.
export const DemoPill = () => {
  const [open, setOpen] = useState(false);
  const pick = (r: Route, patch: Partial<State> = {}) => { setOpen(false); go(r, patch); };
  return (
    <div className="demo-pill" data-demo-chrome>
      {open && (
        <div className="demo-menu">
          <div className="lbl">Xem với vai trò</div>
          <button onClick={() => pick('home')}><GraduationCap size={16} aria-hidden />Sinh viên</button>
          <button onClick={() => pick('lec-home')}><Users size={16} aria-hidden />Giảng viên</button>
          <button onClick={() => pick('adm-users')}><Settings2 size={16} aria-hidden />Quản trị viên</button>
          <div className="lbl">Trình bày</div>
          <button onClick={() => pick('map')}><Map size={16} aria-hidden />Bản đồ màn hình</button>
          <button onClick={() => location.reload()}><FileClock size={16} aria-hidden />Đặt lại dữ liệu demo</button>
        </div>
      )}
      <Btn kind="secondary" icon={FlaskConical} onClick={() => setOpen(o => !o)}>Demo</Btn>
    </div>
  );
};

export { Send };
