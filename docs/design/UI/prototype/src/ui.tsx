import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  BarChart3, BookOpen, CheckCircle2, ClipboardList, Database, FileClock, FlaskConical, GraduationCap, History, Home, LayoutGrid,
  LogOut, LucideIcon, Map, ScrollText, Send, Server, Settings2, UserRound, Users, X,
} from 'lucide-react';
import { LEVELS, Role } from './data';
import { CURRENT_ADMIN, CURRENT_LECTURER, CURRENT_STUDENT, go, Route, State, useStore } from './store';
import leavesBack from './assets/leaves-back.svg';
import leavesFront from './assets/leaves-front.svg';

export const calmMotion = () => document.documentElement.classList.contains('no-motion') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

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

// Số đếm tăng dần khi xuất hiện
export const useCountUp = (target: number, ms = 1100) => {
  const [v, setV] = useState(() => (calmMotion() ? target : 0));
  useEffect(() => {
    if (calmMotion()) { setV(target); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      setV(target * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
};

export const CountUp = ({ value, decimals = 0 }: { value: number; decimals?: number }) => {
  const v = useCountUp(value);
  return <>{v.toLocaleString('vi-VN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}</>;
};

// Đồng hồ vòng cung như mẫu: cung nền xanh nhạt, cung tiến độ navy quét dần từ trái sang
export const Gauge = ({ value, label, sub }: { value: number; label: ReactNode; sub: string }) => {
  const [shown, setShown] = useState(calmMotion() ? value : 0);
  useEffect(() => { const t = requestAnimationFrame(() => setShown(value)); return () => cancelAnimationFrame(t); }, [value]);
  const len = Math.PI * 100;
  return (
    <div className="gauge" role="img" aria-label={`${sub}: ${Math.round(value * 100)}%`}>
      <svg viewBox="-12 -12 244 136" aria-hidden>
        <path className="track" d="M10 110 A100 100 0 0 1 210 110" fill="none" strokeWidth="18" strokeLinecap="round" />
        <path className="fill" d="M10 110 A100 100 0 0 1 210 110" fill="none" strokeWidth="18" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - shown)} />
      </svg>
      <div className="value"><b>{label}</b><span>{sub}</span></div>
    </div>
  );
};

export const Bar = ({ value }: { value: number }) => (
  <div className="bar-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}><i style={{ width: `${Math.max(2, value * 100)}%` }} /></div>
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

export const BrandMark = ({ small }: { small?: boolean }) => <span className={`brand-mark ${small ? 'sm' : ''}`} aria-hidden><UserRound size={small ? 18 : 42} strokeWidth={2.2} /></span>;

// Nền lá nhiệt đới hai lớp, lệch nhẹ theo con trỏ để tạo chiều sâu
export const Leaves = () => {
  useEffect(() => {
    if (calmMotion()) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = document.documentElement.style;
        r.setProperty('--mx', ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
        r.setProperty('--my', ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
      });
    };
    window.addEventListener('pointermove', onMove);
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
  }, []);
  return <div className="leaves" aria-hidden><i className="back" style={{ backgroundImage: `url("${leavesBack}")` }} /><i className="front" style={{ backgroundImage: `url("${leavesFront}")` }} /></div>;
};

const NAV: Record<Role, { route: Route; label: string; short: string; icon: LucideIcon; also?: Route[] }[]> = {
  student: [
    { route: 'home', label: 'Trang chủ', short: 'Trang chủ', icon: Home },
    { route: 'library', label: 'Thư viện ca', short: 'Ca', icon: BookOpen, also: ['prepare'] },
    { route: 'history', label: 'Lịch sử thực hành', short: 'Lịch sử', icon: History, also: ['report', 'transcript', 'reflection'] },
  ],
  lecturer: [
    { route: 'lec-home', label: 'Tổng quan', short: 'Tổng quan', icon: LayoutGrid },
    { route: 'lec-cases', label: 'Ca mô phỏng', short: 'Ca', icon: BookOpen, also: ['lec-case-edit'] },
    { route: 'lec-assign', label: 'Giao bài', short: 'Giao bài', icon: ClipboardList },
    { route: 'lec-progress', label: 'Tiến độ lớp', short: 'Tiến độ', icon: GraduationCap, also: ['lec-review'] },
    { route: 'lec-stats', label: 'Thống kê kỹ năng', short: 'Thống kê', icon: BarChart3 },
  ],
  admin: [
    { route: 'adm-users', label: 'Tài khoản', short: 'Tài khoản', icon: UserRound },
    { route: 'adm-classes', label: 'Lớp', short: 'Lớp', icon: Users },
    { route: 'adm-data', label: 'Dữ liệu phiên', short: 'Dữ liệu', icon: Database },
    { route: 'adm-config', label: 'Cấu hình', short: 'Cấu hình', icon: Settings2 },
    { route: 'adm-status', label: 'Trạng thái hệ thống', short: 'Hệ thống', icon: Server },
    { route: 'adm-logs', label: 'Nhật ký', short: 'Nhật ký', icon: ScrollText },
  ],
};

const ROLE_LABEL: Record<Role, string> = { student: 'Sinh viên', lecturer: 'Giảng viên', admin: 'Quản trị viên' };
const currentId = (r: Role) => r === 'student' ? CURRENT_STUDENT : r === 'lecturer' ? CURRENT_LECTURER : CURRENT_ADMIN;

export const initials = (name: string) => name.replace(/^(TS\.|ThS\.)\s*/, '').split(' ').slice(-2).map(w => w[0]).join('');

// Vệt sáng trượt theo mục đang chọn, dùng chung cho thanh bên và thanh dưới
const useIndicator = (active: number, axis: 'y' | 'x') => {
  const box = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 });
  useLayoutEffect(() => {
    const measure = () => {
      const el = box.current?.querySelectorAll('button')[active] as HTMLElement | undefined;
      if (!el) { setStyle({ opacity: 0 }); return; }
      setStyle(axis === 'y' ? { transform: `translateY(${el.offsetTop}px)`, height: el.offsetHeight, opacity: 1 } : { transform: `translateX(${el.offsetLeft}px)`, width: el.offsetWidth, opacity: 1 });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [active, axis]);
  return { box, style };
};

export const Shell = ({ children }: { children: ReactNode }) => {
  const role = useStore(s => s.role), route = useStore(s => s.route), users = useStore(s => s.users);
  const me = users.find(u => u.id === currentId(role))!;
  const items = NAV[role];
  const active = items.findIndex(it => it.route === route || it.also?.includes(route));
  const side = useIndicator(active, 'y'), bottom = useIndicator(active, 'x');
  return (
    <div className="shell">
      <Leaves />
      <aside className="side">
        <div className="brand"><BrandMark /><div><b>LAB FOURT</b><small>Phòng thực hành tham vấn ảo</small></div></div>
        <nav className="nav" aria-label="Điều hướng chính" ref={side.box}>
          <span className="nav-indicator" style={side.style} aria-hidden />
          {items.map((it, i) => <button key={it.route} aria-current={i === active ? 'page' : undefined} onClick={() => go(it.route)}><it.icon size={21} aria-hidden />{it.label}</button>)}
        </nav>
        <div className="who">
          <span className="avatar">{initials(me.name)}</span>
          <div className="grow"><b>{me.name}</b><span>{ROLE_LABEL[role]}</span></div>
          <button className="icon-btn" aria-label="Đăng xuất" onClick={() => go('login')}><LogOut size={17} /></button>
        </div>
      </aside>
      <main className="main-scroll"><div className="main-view">{children}</div></main>
      <nav className="tabbar" aria-label="Điều hướng chính" ref={bottom.box}>
        <span className="tab-indicator" style={bottom.style} aria-hidden />
        {items.map((it, i) => <button key={it.route} aria-current={i === active ? 'page' : undefined} onClick={() => go(it.route)}><it.icon size={21} aria-hidden /><span>{it.short}</span></button>)}
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
