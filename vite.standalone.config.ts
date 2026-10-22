import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Builds a single-file IIFE bundle that can be dropped into any HTML page:
 *   <script src="numerology-widget.iife.js"></script>
 *   <numerology-widget show-weekly></numerology-widget>
 *
 * Runs after the main library build and does not clear dist/.
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/web-component.ts'),
      name: 'NumerologyWidget',
      formats: ['iife'],
      fileName: () => 'numerology-widget.iife.js'
    },
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      output: {
        exports: 'named'
      }
    }
  }
});
