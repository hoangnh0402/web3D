'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, type LucideIcon } from 'lucide-react';
import { ROLE_HOME, ROLE_LABELS, ROLE_LOGIN, type Role } from '@lab-fourt/shared';
import { landingFor, useLogout, useMe } from '@/lib/auth';
import { BrandMark, Leaves } from './ui';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/**
 * Khung trang sau đăng nhập, cùng bố cục thanh bên với prototype.
 * Chỉ điều hướng giao diện; quyền thật do API kiểm tra ở từng yêu cầu.
 */
export const RoleShell = ({ roles, nav, children }: { roles: Role[]; nav: NavItem[]; children: ReactNode }) => {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const logout = useLogout();
  const user = me.data;
  const allowed = !!user && !user.mustChangePassword && roles.includes(user.role);

  useEffect(() => {
    if (me.isPending) return;
    if (!user) router.replace(ROLE_LOGIN[roles[0] ?? 'STUDENT']);
    else if (user.mustChangePassword) router.replace('/change-password');
    else if (!roles.includes(user.role)) router.replace(ROLE_HOME[user.role]);
  }, [me.isPending, user, roles, router]);

  if (me.isError) {
    return (
      <div className="page">
        <p role="alert">Không tải được thông tin tài khoản. Hãy tải lại trang.</p>
      </div>
    );
  }
  if (!allowed) {
    return (
      <div className="page" aria-busy="true">
        <Leaves />
      </div>
    );
  }

  return (
    <div className="shell">
      <Leaves />
      <aside className="side">
        <div className="brand">
          <BrandMark />
          <div>
            <b>LAB FOURT</b>
            <small>Phòng thực hành tham vấn ảo</small>
          </div>
        </div>
        <nav className="nav" aria-label="Điều hướng chính">
          {nav.map(({ href, label, icon: Icon }) => (
            <button
              key={href}
              type="button"
              aria-current={pathname === href || (href !== nav[0]?.href && pathname.startsWith(`${href}/`)) ? 'page' : undefined}
              onClick={() => router.push(href)}
            >
              <Icon size={20} aria-hidden />
              {label}
            </button>
          ))}
        </nav>
        <div className="who">
          <span className="avatar" aria-hidden>
            {initials(user.fullName)}
          </span>
          <div className="grow">
            <b>{user.fullName}</b>
            <span>{ROLE_LABELS[user.role]}</span>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Đăng xuất"
            title="Đăng xuất"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut size={18} aria-hidden />
          </button>
        </div>
      </aside>
      <main className="main-scroll">
        <div className="page">{children}</div>
      </main>
    </div>
  );
};

/** Trang gốc chuyển về trang của từng vai trò */
export const RoleRedirect = () => {
  const me = useMe();
  const router = useRouter();
  useEffect(() => {
    if (me.isPending) return;
    router.replace(me.data ? landingFor(me.data) : '/login');
  }, [me.isPending, me.data, router]);
  return <Leaves />;
};
