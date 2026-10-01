import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts on purpose: unit tests need none of the app's
// build plugins (PWA, React refresh, env-based HTML transforms).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
