import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/web-editor-example/' : '/',

  resolve: {
    alias: {
      '@core': path.resolve(__dirname, './src/core'),
      '@plugins': path.resolve(__dirname, './src/plugins'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@ui': path.resolve(__dirname, './src/ui')
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
