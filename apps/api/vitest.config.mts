import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// NestJS cần emitDecoratorMetadata, esbuild của Vite không hỗ trợ nên dùng SWC để biên dịch khi kiểm thử
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
