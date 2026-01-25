import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import glsl from 'vite-plugin-glsl';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/ready-set-render/' : '/',

  plugins: [
    glsl({
      include: ['**/*.glsl', '**/*.vert', '**/*.frag'],
      warnDuplicatedImports: true,
      compress: false
    })
  ],

  resolve: {
    alias: {
      '@core': resolve(__dirname, './src/core'),
      '@plugins': resolve(__dirname, './src/plugins'),
      '@utils': resolve(__dirname, './src/utils'),
      '@ui': resolve(__dirname, './src/ui')
    }
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'core': ['./src/core/index.ts'],
          'monaco': ['monaco-editor']
        }
      }
    }
  },

  server: {
    port: 3000,
    open: true
  }
});
