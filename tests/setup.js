import '@testing-library/jest-dom'
import { beforeEach, vi } from 'vitest'

// Mock global objects that might not exist in test environment
global.navigator = {
  onLine: true,
  serviceWorker: {
    register: vi.fn(() => Promise.resolve())
  }
}

global.window = {
  location: {
    hostname: 'localhost',
    origin: 'http://localhost:3000'
  },
  dispatchEvent: vi.fn(),
  addEventListener: vi.fn()
}

// Clean up after each test
beforeEach(() => {
  vi.clearAllMocks()
})