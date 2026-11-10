import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Cấu hình ESLint dùng chung cho API và packages. apps/web có cấu hình riêng theo Next.js. */
export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/generated/**', 'apps/web/**', 'docs/**', '**/*.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports', disallowTypeAnnotations: false }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // NestJS cần import giá trị thật của lớp để tiêm phụ thuộc, không đổi sang import type được
    files: ['apps/api/**/*.ts'],
    rules: { '@typescript-eslint/consistent-type-imports': 'off' },
  },
  {
    files: ['**/prisma/seed.ts'],
    rules: { 'no-console': 'off' },
  },
);
