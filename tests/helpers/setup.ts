import { beforeAll, afterEach, vi } from 'vitest';

beforeAll(() => {
  console.log('Test suite starting...');
});

afterEach(() => {
  vi.clearAllMocks();
});

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

/**
 * Mock for .glsl file imports during tests.
 * When migrating to raw .glsl files, Vitest needs to know how to handle these imports.
 * The vite-plugin-glsl cannot run during tests (it breaks the test pipeline),
 * so we configure Vitest to treat .glsl files as plain text imports.
 */
// Note: GLSL mocking is handled via vitest.config.ts deps.inline configuration
