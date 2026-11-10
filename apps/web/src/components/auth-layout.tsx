import type { ReactNode } from 'react';
import { BrandMark, Leaves } from './ui';

/** Bố cục hai cột của SCR-01 và SCR-02: ảnh phòng tham vấn bên trái, biểu mẫu bên phải */
export const AuthLayout = ({ title, lead, children }: { title: string; lead: string; children: ReactNode }) => (
  <div className="login">
    <Leaves />
    <section className="login-art" style={{ backgroundImage: 'url(/rooms/room-a-neutral.jpg)' }}>
      <div>
        <h1>{title}</h1>
        <p>{lead}</p>
      </div>
    </section>
    <section className="login-form">
      <div>
        <div className="brand">
          <BrandMark small />
          <div>
            <b>LAB FOURT</b>
            <small>Phòng thực hành tham vấn ảo</small>
          </div>
        </div>
        {children}
      </div>
    </section>
  </div>
);
