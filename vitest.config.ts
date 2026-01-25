import { defineConfig, Plugin } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';
import glsl from 'vite-plugin-glsl';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isTest = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';

/**
 * Simple GLSL raw loader for tests.
 * This provides basic .glsl file support without #include processing.
 * For tests that need #include resolution, the actual shader content
 * should be tested via integration tests with the dev server.
 */
function glslRawPlugin(): Plugin {
  return {
    name: 'glsl-raw-loader',
    enforce: 'pre',
    transform(code: string, id: string) {
      if (id.endsWith('.glsl') || id.endsWith('.vert') || id.endsWith('.frag')) {
        const content = readFileSync(id, 'utf-8');
        return {
          code: `export default ${JSON.stringify(content)};`,
          map: null
        };
      }
      return null;
    }
  };
}

export default defineConfig({
  plugins: isTest
    ? [glslRawPlugin()]
    : [
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
  test: {
    globals: false,
    environment: 'jsdom',
    setupFiles: './tests/helpers/setup.ts',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.config.ts',
        'dist/'
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85
      }
    }
  }
});
