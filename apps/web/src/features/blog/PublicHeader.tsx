'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, LogIn } from 'lucide-react';
import { ROLE_LOGIN, ROLES } from '@lab-fourt/shared';
import { PORTAL } from '@/components/role-portals';
import { BrandMark } from '@/components/ui';
import { landingFor, useMe } from '@/lib/auth';

/** Đầu trang công khai: thương hiệu, liên kết mục, nút Đăng nhập mở ba lựa chọn vai trò */
export const PublicHeader = () => {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Đóng menu khi bấm ra ngoài hoặc nhấn Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header className="pub-head">
      <div className="pub-head-in">
        <Link href="/" className="pub-brand" aria-label="Lab FourT, trang chủ">
          <BrandMark small />
          <span>
            <b>LAB FOURT</b>
            <small>Phòng thực hành tham vấn ảo</small>
          </span>
        </Link>
        <nav className="pub-nav" aria-label="Mục chính">
          <Link href="/#bai-viet">Bài viết</Link>
          <Link href="/#gioi-thieu">Về Lab FourT</Link>
        </nav>
        {me.data ? (
          <Link href={landingFor(me.data)} className="btn primary">
            Vào trang của tôi
            <ArrowRight size={16} aria-hidden />
          </Link>
        ) : (
          <div className="pub-login" ref={box}>
            <button
              type="button"
              className="btn primary"
              aria-expanded={open}
              aria-controls="pub-login-menu"
              onClick={() => setOpen((v) => !v)}
            >
              <LogIn size={17} aria-hidden />
              Đăng nhập
              <ChevronDown size={16} aria-hidden className={`pub-chev ${open ? 'up' : ''}`} />
            </button>
            {open && (
              <div id="pub-login-menu" className="pub-menu">
                <p className="pub-menu-title">Đăng nhập với vai trò</p>
                <nav className="role-quick" aria-label="Chọn vai trò đăng nhập">
                  {ROLES.map((r) => {
                    const Icon = PORTAL[r].icon;
                    return (
                      <Link key={r} href={ROLE_LOGIN[r]} onClick={() => setOpen(false)}>
                        <Icon size={19} aria-hidden />
                        <div>
                          <b>{PORTAL[r].card}</b>
                          <span>{PORTAL[r].hint}</span>
                        </div>
                      </Link>
                    );
                  })}
                </nav>
                <p className="small muted pub-menu-foot">
                  Sinh viên chưa có tài khoản? <Link href="/register">Đăng ký</Link>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
