import { ViewTransition, type ReactNode } from 'react';

/** Đổi trang trong khu vực này (template gốc không dựng lại) vẫn chuyển như đổi khu vực, xem app/template.tsx */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="area" exit="area" default="none">
      {children}
    </ViewTransition>
  );
}
