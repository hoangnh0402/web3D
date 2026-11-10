import path from 'node:path';
import type { NextConfig } from 'next';

// Khi phát triển, Next chuyển /api sang NestJS. Khi triển khai, Caddy chuyển /api trước khi tới Next.
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://127.0.0.1:4000';

const config: NextConfig = {
  output: 'standalone',
  // Gom phụ thuộc từ gốc monorepo để bản standalone có cả packages/shared
  outputFileTracingRoot: path.join(__dirname, '../..'),
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_ORIGIN}/api/:path*` }];
  },
  async headers() {
    return [
      {
        // Tài sản 3D không đổi giữa các bản build cùng tên, cho trình duyệt giữ lâu
        source: '/3d/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          // Chỉ cho phép micro trên chính trang này (ghi âm ở các nhiệm vụ sau)
          { key: 'Permissions-Policy', value: 'microphone=(self), camera=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default config;
