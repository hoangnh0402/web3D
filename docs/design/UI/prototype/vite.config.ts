import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Đóng gói toàn bộ JS, CSS, phông chữ và ảnh vào một tệp HTML
// để mở được bằng cách bấm đúp, không cần máy chủ hay internet.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  assetsInclude: ['**/*.glb.gz', '**/*.bin'],
  build: {
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 6000,
  },
});
