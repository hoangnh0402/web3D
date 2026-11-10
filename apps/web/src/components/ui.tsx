import type { ReactNode } from 'react';
import { UserRound, type LucideIcon } from 'lucide-react';

/** Thành phần chuyển từ prototype (docs/design/UI/prototype/src/ui.tsx), dùng chung lớp CSS của prototype */

export const Field = ({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) => (
  <div className="field">
    <label htmlFor={id}>{label}</label>
    {children}
    {error ? (
      <span id={`${id}-error`} className="hint" role="alert" style={{ color: 'var(--danger)' }}>
        {error}
      </span>
    ) : (
      hint && <span className="hint">{hint}</span>
    )}
  </div>
);

export const Notice = ({
  tone,
  icon: Icon,
  children,
}: {
  tone?: 'warn' | 'danger' | 'neutral';
  icon: LucideIcon;
  children: ReactNode;
}) => (
  <div className={`notice ${tone ?? ''}`} role={tone === 'danger' ? 'alert' : undefined}>
    <Icon size={17} aria-hidden />
    <div className="grow">{children}</div>
  </div>
);

export const BrandMark = ({ small }: { small?: boolean }) => (
  <span className={`brand-mark ${small ? 'sm' : ''}`} aria-hidden>
    <UserRound size={small ? 18 : 42} strokeWidth={2.2} />
  </span>
);

/** Nền lá nhiệt đới hai lớp, đứng yên hoàn toàn để không gây xao nhãng */
export const Leaves = () => (
  <div className="leaves" aria-hidden>
    <i className="back" style={{ backgroundImage: 'url("/brand/leaves-back.svg")' }} />
    <i className="front" style={{ backgroundImage: 'url("/brand/leaves-front.svg")' }} />
  </div>
);

export const PageHead = ({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) => (
  <div className="page-head">
    <div className="grow">
      <h1>{title}</h1>
      {sub && <p className="sub">{sub}</p>}
    </div>
    {actions && <div className="row">{actions}</div>}
  </div>
);
