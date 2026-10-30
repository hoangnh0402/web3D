import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  root: 'tools',
  base: './',
  plugins: [viteSingleFile()],
  build: { outDir: '../dist-tools', emptyOutDir: true, chunkSizeWarningLimit: 6000 },
});
