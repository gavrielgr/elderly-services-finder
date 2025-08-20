import { vi } from 'vitest'

// In-memory storage for our mock IndexedDB
const mockStorage = {
  app_data: {}
};

// Mock for error testing
let shouldThrowError = false;
let mockError = null;

// Helper to reset between tests
export function __resetMockStorage() {
  for (const store in mockStorage) {
    mockStorage[store] = {};
  }
  shouldThrowError = false;
  mockError = null;
}

// Helper to make the mock throw errors for testing error handling
export function __setThrowError(error) {
  shouldThrowError = true;
  mockError = error || new Error('Mock IDB Error');
}

// Helper to create a database connection that might throw an error
const createDB = () => {
  if (shouldThrowError) {
    throw mockError;
  }

  // Return a mock DB with the necessary methods
  return {
    put: (store, value, key) => {
      if (shouldThrowError) throw mockError;
      
      if (!mockStorage[store]) {
        mockStorage[store] = {};
      }
      mockStorage[store][key] = value;
      return Promise.resolve();
    },
    get: (store, key) => {
      if (shouldThrowError) throw mockError;
      
      if (!mockStorage[store]) {
        return Promise.resolve(null);
      }
      return Promise.resolve(mockStorage[store][key] || null);
    },
    clear: (store) => {
      if (shouldThrowError) throw mockError;
      
      if (mockStorage[store]) {
        mockStorage[store] = {};
      }
      return Promise.resolve();
    },
    getAllKeys: (store) => {
      if (shouldThrowError) throw mockError;
      
      if (!mockStorage[store]) {
        return Promise.resolve([]);
      }
      return Promise.resolve(Object.keys(mockStorage[store]));
    },
    getAll: (store) => {
      if (shouldThrowError) throw mockError;
      
      if (!mockStorage[store]) {
        return Promise.resolve([]);
      }
      return Promise.resolve(Object.values(mockStorage[store]));
    }
  };
};

// Mock IDB operations
export const openDB = vi.fn().mockImplementation((dbName, version, { upgrade } = {}) => {
  // Call upgrade function if provided
  if (upgrade && typeof upgrade === 'function') {
    // Create a simple mock db object to pass to the upgrade function
    const mockDb = {
      objectStoreNames: {
        contains: vi.fn().mockReturnValue(false)
      },
      createObjectStore: vi.fn(() => {
        // Ensure the store exists in our mock
        if (!mockStorage['app_data']) {
          mockStorage['app_data'] = {};
        }
      })
    };
    upgrade(mockDb);
  }

  return createDB();
});

export default {
  openDB,
  __resetMockStorage,
  __setThrowError
};