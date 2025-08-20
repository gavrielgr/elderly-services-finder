import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/e2e/**', // Exclude E2E tests from Vitest runs
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.js',
        '**/*.spec.js',
        'vite.config.js',
        'vitest.config.js'
      ]
    },
    deps: {
      // Handle ESM URL imports in the code
      inline: [
        // Add patterns that match the imports that need to be transformed
        /firebase\/.+/,
        /^https:\/\//
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'js'),
      '/js': resolve(__dirname, 'js')
    }
  }
})