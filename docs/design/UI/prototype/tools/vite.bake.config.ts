import { defineConfig } from 'vite';

export default defineConfig({
  root: 'tools',
  base: './',
  build: { outDir: '../dist-tools', emptyOutDir: false, target: 'esnext', chunkSizeWarningLimit: 6000, rollupOptions: { input: 'tools/bake.html' } },
});
