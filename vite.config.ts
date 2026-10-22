import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      tsconfigPath: './tsconfig.json',
      rollupTypes: false,
      exclude: ['src/__tests__/**']
    })
  ],
  build: {
    lib: {
      entry: {
        'numerology-core': resolve(__dirname, 'src/numerology-core.ts'),
        'web-component': resolve(__dirname, 'src/web-component.ts'),
        'react': resolve(__dirname, 'src/react.tsx')
      },
      name: 'NumerologyWidget',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        exports: 'named',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'ReactJSXRuntime'
        }
      }
    },
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
