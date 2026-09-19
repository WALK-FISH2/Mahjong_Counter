import { defineConfig } from 'vitest/config';

// The application suite intentionally includes src only. Build regression is explicit.
export default defineConfig({
  test: { environment: 'node', include: ['build/encyclopedia/**/*.test.ts'] },
});
