import { vi } from 'vitest'

// Mock document reference
const mockDocRef = {
  id: 'mock-doc-id',
  set: vi.fn(() => Promise.resolve()),
  update: vi.fn(() => Promise.resolve()),
  delete: vi.fn(() => Promise.resolve()),
  get: vi.fn(() => Promise.resolve({
    exists: true,
    id: 'mock-doc-id',
    data: () => ({ 
      name: 'Mock Document', 
      description: 'This is mocked data'
    })
  }))
}

// Mock query snapshot
const mockQuerySnapshot = {
  docs: [
    {
      id: 'doc1',
      data: () => ({ name: 'Document 1' }),
      ref: { ...mockDocRef, id: 'doc1' }
    },
    {
      id: 'doc2',
      data: () => ({ name: 'Document 2' }),
      ref: { ...mockDocRef, id: 'doc2' }
    }
  ],
  empty: false,
  size: 2,
  forEach: vi.fn(callback => mockQuerySnapshot.docs.forEach(callback))
}

// Mock collection reference
const mockCollectionRef = {
  doc: vi.fn(id => ({
    ...mockDocRef,
    id: id || 'mock-doc-id'
  })),
  add: vi.fn(() => Promise.resolve(mockDocRef)),
  get: vi.fn(() => Promise.resolve(mockQuerySnapshot)),
  where: vi.fn(() => mockCollectionRef),
  orderBy: vi.fn(() => mockCollectionRef),
  limit: vi.fn(() => mockCollectionRef),
  startAfter: vi.fn(() => mockCollectionRef)
}

// Mock Firestore
const mockFirestore = {
  collection: vi.fn(path => mockCollectionRef),
  doc: vi.fn(path => mockDocRef),
  batch: vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(() => Promise.resolve())
  })),
  runTransaction: vi.fn(transactionHandler => 
    Promise.resolve(transactionHandler({ 
      get: vi.fn(() => Promise.resolve({
        exists: true,
        data: () => ({ counter: 1 })
      })),
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }))
  )
}

// Mock auth
const mockAuth = {
  currentUser: null,
  signInWithEmailAndPassword: vi.fn(() => Promise.resolve({ user: { uid: 'test-uid', email: 'test@example.com' } })),
  signOut: vi.fn(() => Promise.resolve()),
  onAuthStateChanged: vi.fn(callback => {
    // Immediately invoke with null
    callback(null)
    return vi.fn() // Return unsubscribe function
  })
}

// Main export to mock Firebase
export const mockFirebase = {
  app: { name: 'mock-app' },
  db: mockFirestore,
  auth: mockAuth
}

// Default mock for initializeFirebase
export default vi.fn(() => Promise.resolve(mockFirebase))