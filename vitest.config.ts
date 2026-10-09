import { defineConfig } from 'vitest/config';

// Unit and data tests only; browser tests live in tests/e2e and run under Playwright.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
