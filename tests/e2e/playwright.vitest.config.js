// This configuration is used when running Playwright tests via Vitest
// It ensures tests are skipped, avoiding errors when the app isn't running

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  // Always skip tests when running through Vitest
  testMatch: ['**/?(*.)skip.spec.js'], // Use a non-existent pattern to skip all tests
});