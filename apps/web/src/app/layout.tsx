import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
// Font tự lưu trữ, không tải từ Google Fonts để chạy được trên mạng nội bộ không có internet
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: { default: 'Lab FourT', template: '%s · Lab FourT' },
  description: 'Phòng thực hành tham vấn ảo',
};

export const viewport: Viewport = { themeColor: '#EAF3FF', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
