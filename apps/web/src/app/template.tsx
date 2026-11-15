import { ViewTransition, type ReactNode } from 'react';

/**
 * Template gốc dựng lại khi đổi khu vực cấp đầu: trang bài viết, đăng nhập, phòng thực hành, khu vực từng vai trò.
 * Lúc đó cả trang chuyển như prototype (lớp "area" trong styles/transitions.css).
 * Chuyển trang bên trong một khu vực do RoleShell lo, template này không dựng lại nên không chạy hai lần.
 */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="area" exit="area" default="none">
      {children}
    </ViewTransition>
  );
}
