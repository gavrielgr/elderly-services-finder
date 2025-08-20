import { vi } from 'vitest'

// Mock Firebase app
export const initializeApp = vi.fn(() => ({
  name: 'test-app'
}))

// Mock Firestore
export const getFirestore = vi.fn(() => ({
  collection: vi.fn()
}))

// Mock Auth
export const getAuth = vi.fn(() => ({
  currentUser: null
}))

// Mock Firestore functions
export const doc = vi.fn(() => 'mock-doc-ref')
export const getDoc = vi.fn(() => Promise.resolve({
  exists: () => true,
  id: 'service-1',
  data: () => ({
    name: 'מרכז רפואי הדסה',
    description: 'בית חולים מוביל'
  })
}))

export const collection = vi.fn(() => 'mock-collection')
export const query = vi.fn(() => 'mock-query')
export const where = vi.fn(() => 'mock-where')
export const getDocs = vi.fn(() => Promise.resolve({
  docs: [{
    id: 'service-1',
    data: () => ({
      name: 'מרכז רפואי הדסה',
      description: 'בית חולים מוביל'
    })
  }]
}))

// Export defaults
export default {
  initializeApp,
  getFirestore,
  getAuth,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
}