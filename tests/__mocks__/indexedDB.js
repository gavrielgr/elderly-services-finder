import { vi } from 'vitest'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'

// Mock data storage for simulating IndexedDB
const mockIndexedDBStorage = {
  'app-data': {}
}

// Setup a clean IndexedDB mock before each test
export function setupMockIndexedDB() {
  // Reset all stored mock data
  Object.keys(mockIndexedDBStorage).forEach(key => {
    mockIndexedDBStorage[key] = {}
  })

  // Use fake-indexeddb to create a fresh IDB environment
  global.indexedDB = new IDBFactory()
  
  return mockIndexedDBStorage
}

// Helper for checking the current mock storage state
export function getMockIndexedDBData(storeName) {
  return mockIndexedDBStorage[storeName] || {}
}

// Helper for manually setting mock data (for test setup)
export function setMockIndexedDBData(storeName, key, data) {
  if (!mockIndexedDBStorage[storeName]) {
    mockIndexedDBStorage[storeName] = {}
  }
  mockIndexedDBStorage[storeName][key] = data
}

// Mock implementations for common IndexedDB operations
export const mockSaveToIndexedDB = vi.fn((key, data) => {
  // Simple storage implementation
  mockIndexedDBStorage['app-data'][key] = data
  return Promise.resolve()
})

export const mockGetFromIndexedDB = vi.fn((key) => {
  // Return stored data or null
  return Promise.resolve(mockIndexedDBStorage['app-data'][key] || null)
})

export const mockClearIndexedDB = vi.fn(() => {
  // Clear all stored data
  Object.keys(mockIndexedDBStorage).forEach(storeName => {
    mockIndexedDBStorage[storeName] = {}
  })
  return Promise.resolve()
})