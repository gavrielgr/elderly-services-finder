import { vi } from 'vitest'

// Create mock Firebase Firestore functions
export const doc = vi.fn().mockReturnValue('mocked-doc-ref')
export const getDoc = vi.fn().mockResolvedValue({
  exists: () => true,
  id: 'service-1',
  data: () => ({ name: 'מרכז רפואי הדסה', description: 'בית חולים מוביל' })
})

export const collection = vi.fn().mockReturnValue('mocked-collection')
export const query = vi.fn().mockReturnValue('mocked-query')
export const where = vi.fn().mockReturnValue('mocked-where')
export const getDocs = vi.fn().mockResolvedValue({
  docs: [
    {
      id: 'service-1',
      data: () => ({ name: 'מרכז רפואי הדסה', description: 'בית חולים מוביל' })
    }
  ]
})

export default {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
}