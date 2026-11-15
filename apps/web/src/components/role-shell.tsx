'use client';

import { ViewTransition, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Newspaper, type LucideIcon } from 'lucide-react';
import { ROLE_HOME, ROLE_LABELS, ROLE_LOGIN, type Role } from '@lab-fourt/shared';
import { landingFor, useLogout, useMe } from '@/lib/auth';
import { BrandMark, Leaves } from './ui';

export interface NavItem {
  href: string;
  label: string;
  /** Nhãn ngắn ở thanh điều hướng dưới trên điện thoại, theo prototype. Bỏ trống thì dùng label. */
  short?: string;
  icon: LucideIcon;
}

/** Mục chung cho mọi vai trò: quay về trang bài viết công khai khi đã đăng nhập. Trang này có nút quay lại khu vực của vai trò. */
const BLOG: NavItem = { href: '/', label: 'Trang bài viết', short: 'Bài viết', icon: Newspaper };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/** Khối sáng chạy theo mục đang chọn của thanh bên (trục y) và thanh dưới (trục x), như useIndicator của prototype */
const useIndicator = (active: number, axis: 'x' | 'y', ready: boolean) => {
  const box = useRef<HTMLElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ opacity: 0 });
  useLayoutEffect(() => {
    if (!ready) return;
    const measure = () => {
      const el = box.current?.querySelectorAll('button')[active];
      if (!el || active < 0) return setStyle({ opacity: 0 });
      setStyle(
        axis === 'y'
          ? { transform: `translateY(${el.offsetTop}px)`, height: el.offsetHeight, opacity: 1 }
          : { transform: `translateX(${el.offsetLeft}px)`, width: el.offsetWidth, opacity: 1 },
      );
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [active, axis, ready]);
  return [box, style] as const;
};

/**
 * Khung trang sau đăng nhập, cùng bố cục với prototype: thanh bên trên máy tính, thanh dưới trên điện thoại.
 * Chỉ điều hướng giao diện; quyền thật do API kiểm tra ở từng yêu cầu.
 */
export const RoleShell = ({ roles, nav, children }: { roles: Role[]; nav: NavItem[]; children: ReactNode }) => {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const logout = useLogout();
  const user = me.data;
  const allowed = !!user && !user.mustChangePassword && roles.includes(user.role);
  const items = [...nav, BLOG];
  const isActive = (href: string) => pathname === href || (href !== nav[0]?.href && href !== BLOG.href && pathname.startsWith(`${href}/`));
  const active = items.findIndex((it) => isActive(it.href));
  const [sideBox, sideStyle] = useIndicator(active, 'y', allowed);
  const [bottomBox, bottomStyle] = useIndicator(active, 'x', allowed);
  const scroller = useRef<HTMLElement>(null);

  // Menu dùng nút (giữ đúng kiểu của prototype) nên không được Next tự tải trước như <Link>.
  // Tải trước mã và dữ liệu khung của các mục menu để bấm là chuyển ngay. Next chỉ tải trước ở bản production.
  useEffect(() => {
    if (allowed) for (const item of [...nav, BLOG]) router.prefetch(item.href);
  }, [allowed, nav, router]);

  // Trang mới bắt đầu từ đầu, như go() của prototype. Chạy trước khi trình duyệt chụp trang mới cho hiệu ứng chuyển trang.
  useLayoutEffect(() => {
    scroller.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

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
        <nav className="nav" aria-label="Điều hướng chính" ref={sideBox}>
          <span className="nav-indicator" style={sideStyle} aria-hidden />
          {items.map(({ href, label, icon: Icon }) => (
            <button key={href} type="button" aria-current={isActive(href) ? 'page' : undefined} onClick={() => router.push(href)}>
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
      <main className="main-scroll" ref={scroller}>
        {/*
          Chuyển trang như prototype: thanh bên đứng yên, nội dung cũ mờ và trượt lên (vt-out), nội dung mới trượt vào (vt-in).
          key theo đường dẫn để trang cũ và trang mới thành một cặp cùng tên "main". Chỉ chạy khi điều hướng,
          không chạy khi nội dung trong trang tự cập nhật.
        */}
        <ViewTransition key={pathname} name="main" share="auto" default="none">
          <div className="main-view">
            <div className="page">{children}</div>
          </div>
        </ViewTransition>
      </main>
      <nav className="tabbar" aria-label="Điều hướng chính" ref={bottomBox}>
        <span className="tab-indicator" style={bottomStyle} aria-hidden />
        {items.map(({ href, label, short, icon: Icon }) => (
          <button key={href} type="button" aria-current={isActive(href) ? 'page' : undefined} onClick={() => router.push(href)}>
            <Icon size={21} aria-hidden />
            <span>{short ?? label}</span>
          </button>
        ))}
      </nav>
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
