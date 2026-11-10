import { defineConfig, devices } from '@playwright/test';

/**
 * Kiểm thử đầu cuối. Cần PostgreSQL (deploy/compose.dev.yaml), đã migrate, và đã build cả API lẫn web.
 * Playwright tự khởi động API và Next nếu chưa chạy.
 * Dùng trình duyệt có sẵn trên máy: PLAYWRIGHT_CHANNEL=msedge (hoặc chrome). Bỏ trống thì dùng Chromium của Playwright.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    locale: 'vi-VN',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
        // Máy chạy kiểm thử thường không có GPU: dựng WebGL bằng phần mềm để phòng 3D vẫn chạy
        launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
      },
    },
  ],
  webServer: [
    {
      command: 'node dist/main.js',
      cwd: '../api',
      url: 'http://127.0.0.1:4000/api/health',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'node .next/standalone/apps/web/server.js',
      env: { PORT: '3000', HOSTNAME: '127.0.0.1', API_ORIGIN: 'http://127.0.0.1:4000' },
      url: 'http://127.0.0.1:3000/login',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
