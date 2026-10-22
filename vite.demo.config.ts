import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'demo'),
  base: './',
  build: {
    outDir: resolve(__dirname, 'demo-dist'),
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: true
  },
  server: {
    port: 5174,
    host: true,
    open: true
  }
});
