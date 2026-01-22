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
