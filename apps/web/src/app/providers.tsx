'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        // staleTime: quay lại trang vừa xem trong 30 giây thì dùng luôn dữ liệu đã có, không gọi API lại.
        // Thao tác của chính người dùng vẫn làm mới ngay vì các mutation đều invalidate truy vấn liên quan;
        // báo cáo đang tạo vẫn tự hỏi lại theo refetchInterval.
        defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 30_000 } },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
