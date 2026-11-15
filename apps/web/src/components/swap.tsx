'use client';

import { ViewTransition, startTransition, type ReactNode } from 'react';

/**
 * Đổi nội dung tại chỗ (bộ lọc, chọn lớp): nội dung cũ mờ và trượt lên, nội dung mới trượt vào.
 * Đổi `id` là đổi nội dung. Hiệu ứng chỉ chạy khi cập nhật được gọi qua `swap()`.
 */
export const Swap = ({ id, children }: { id: string; children: ReactNode }) => (
  <ViewTransition key={id} enter="swap" exit="swap" default="none">
    {children}
  </ViewTransition>
);

/** Cập nhật trạng thái trong một transition để <Swap> chạy hiệu ứng. Cập nhật setState thường thì đổi ngay, không hiệu ứng. */
export const swap = (update: () => void) => startTransition(update);
