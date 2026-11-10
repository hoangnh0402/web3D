import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Mã Three.js chuyển nguyên từ prototype: điều khiển camera, ref và xương nhân vật mỗi khung hình là cách làm
    // bắt buộc của React Three Fiber, không đi qua state của React nên các luật của React Compiler không áp dụng.
    files: ['src/features/room/**'],
    rules: { 'react-hooks/immutability': 'off', 'react-hooks/refs': 'off' },
  },
  globalIgnores(['.next/**', 'out/**', 'next-env.d.ts', 'public/**', 'playwright-report/**', 'test-results/**']),
]);
