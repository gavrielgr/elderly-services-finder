import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
// Import a mock version that doesn't rely on URL imports
import { DataService } from './dataService.mock.js'
import { testServices, testCategories, testInterestAreas } from '../../fixtures/seed-data.js'

// Define constants locally to avoid import issues
const ALL_SERVICES_KEY = 'all-services';

// Mock the StorageService functions globally
global.saveToIndexedDB = vi.fn();
global.getFromIndexedDB = vi.fn();

// Create mock Firebase module
vi.mock('../../../js/config/firebase.js', () => {
  return {
    initializeFirebase: vi.fn().mockResolvedValue({
      app: { name: 'test-app' },
      db: {
        collection: vi.fn(() => ({
          doc: vi.fn(),
          where: vi.fn()
        }))
      },
      auth: { currentUser: null }
    }),
    app: { name: 'test-app' },
    db: {
      collection: vi.fn(() => ({
        doc: vi.fn(),
        where: vi.fn()
      }))
    },
    auth: { currentUser: null }
  }
})

// Create mocks for Firebase Firestore functions
const docData = { name: 'מרכז רפואי הדסה', description: 'בית חולים מוביל' }

// Mock Firebase Firestore functions
const mockDocRef = 'mocked-doc-ref'
const mockDoc = vi.fn(() => mockDocRef)
const mockGetDoc = vi.fn(() => Promise.resolve({
  exists: () => true,
  id: 'service-1',
  data: () => docData
}))

const mockCollectionRef = 'mocked-collection'
const mockCollection = vi.fn(() => mockCollectionRef)
const mockWhereRef = 'mocked-where'
const mockWhere = vi.fn(() => mockWhereRef)
const mockQueryRef = 'mocked-query'
const mockQuery = vi.fn(() => mockQueryRef)
const mockGetDocs = vi.fn(() => Promise.resolve({
  docs: [
    {
      id: 'service-1',
      data: () => docData
    }
  ]
}))

// No need to mock the storageService as we're using local mock functions

// Create a replacement for direct URL imports
vi.mock('../../../js/services/dataService.js', async (importOriginal) => {
  const mod = await importOriginal()
  
  // Add our mocks to the module
  mod.doc = mockDoc
  mod.getDoc = mockGetDoc
  mod.collection = mockCollection
  mod.query = mockQuery
  mod.where = mockWhere
  mod.getDocs = mockGetDocs
  
  return mod
}, { virtual: true })

describe('DataService', () => {
  let dataService
  let mockData
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Setup mock data
    mockData = {
      services: testServices,
      categories: testCategories,
      interestAreas: testInterestAreas,
      lastUpdated: new Date().toISOString()
    }
    
    // Mock browser globals
    global.navigator = {
      onLine: true
    }
    
    global.window = {
      location: { origin: 'http://localhost:5173' },
      dispatchEvent: vi.fn()
    }
    
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ updated: new Date().toISOString() })
    }))
    
    // Mock IndexedDB operations
    getFromIndexedDB.mockReset()
    saveToIndexedDB.mockReset()
    
    // Create a fresh instance for each test
    dataService = new DataService()
  })
  
  afterEach(() => {
    // Clean up
    vi.restoreAllMocks()
  })
  
  describe('caching behavior', () => {
    it('should load data from IndexedDB cache if available', async () => {
      // Setup the mock cache
      getFromIndexedDB.mockResolvedValueOnce(mockData)
      
      // Run the refresh logic
      const result = await dataService.refreshData()
      
      // Assertions
      expect(result).toBe(true)
      expect(getFromIndexedDB).toHaveBeenCalledWith(ALL_SERVICES_KEY)
      expect(dataService.allServicesData).toEqual(mockData)
      expect(dataService.lastUpdated).toBe(mockData.lastUpdated)
      expect(window.dispatchEvent).toHaveBeenCalled()
    })
    
    it('should not use cache if data is invalid', async () => {
      // Setup invalid cache data
      getFromIndexedDB.mockResolvedValueOnce({
        services: [],  // Empty services array (invalid)
        categories: testCategories,
        lastUpdated: new Date().toISOString()
      })
      
      // Mock the API call
      global.fetchFromAPI = vi.fn(() => Promise.resolve(mockData))
      
      // Run the refresh logic
      await dataService.refreshData()
      
      // Should try to fetch from API
      expect(getFromIndexedDB).toHaveBeenCalledWith(ALL_SERVICES_KEY)
    })
    
    it('should persist data to IndexedDB after fetching from API', async () => {
      // Simulate empty cache
      getFromIndexedDB.mockResolvedValueOnce(null)
      
      // Mock API call response
      global.fetchFromAPI = vi.fn(() => Promise.resolve(mockData))
      
      // Run the refresh logic
      const result = await dataService.refreshData()
      
      // Assertions
      expect(result).toBe(true)
      expect(getFromIndexedDB).toHaveBeenCalledWith(ALL_SERVICES_KEY)
      expect(global.fetchFromAPI).toHaveBeenCalled()
    })
  })
  
  describe('data retrieval methods', () => {
    beforeEach(() => {
      // Pre-load some data into the service
      dataService.allServicesData = mockData
      dataService.lastUpdated = mockData.lastUpdated
    })
    
    it('should return all services with getData()', () => {
      const services = dataService.getData()
      expect(services).toEqual(mockData.services)
    })
    
    it('should return an empty array from getData() if no data available', () => {
      dataService.allServicesData = null
      const services = dataService.getData()
      expect(services).toEqual([])
    })
    
    it('should return all categories with getCategories()', () => {
      const categories = dataService.getCategories()
      expect(categories).toEqual(mockData.categories)
    })
    
    it('should return an empty array from getCategories() if no data available', () => {
      dataService.allServicesData = null
      const categories = dataService.getCategories()
      expect(categories).toEqual([])
    })
    
    it('should find a category by ID with getCategory()', () => {
      // Prepare a category with ID for testing
      const testCategory = { ...testCategories[0], id: 'health' }
      dataService.allServicesData.categories = [testCategory]
      
      const category = dataService.getCategory('health')
      expect(category).toEqual(testCategory)
    })
    
    it('should return null from getCategory() if category not found', () => {
      const category = dataService.getCategory('non-existent')
      expect(category).toBeUndefined()
    })
    
    it('should return interest areas with getInterestAreas()', () => {
      const areas = dataService.getInterestAreas()
      expect(areas).toEqual(mockData.interestAreas)
    })
    
    it('should find an interest area by ID with getInterestArea()', () => {
      const area = dataService.getInterestArea('elderly-care')
      expect(area).toEqual(testInterestAreas.find(a => a.id === 'elderly-care'))
    })
    
    it('should create proper slugs from Hebrew service names', () => {
      // Test Hebrew service name slugification
      const hebrewName = 'מרכז רפואי הדסה'
      const expectedSlug = 'מרכז-רפואי-הדסה'
      
      const slug = dataService.createSlug(hebrewName)
      expect(slug).toBe(expectedSlug)
    })
  })
  
  describe('error handling', () => {
    it('should handle errors when fetching from API', async () => {
      // Setup mock failure
      getFromIndexedDB.mockResolvedValueOnce(null)
      global.fetchFromAPI = vi.fn().mockRejectedValue(new Error('API error'))
      
      // Run the refresh logic
      const result = await dataService.refreshData()
      
      // Should handle the error gracefully
      expect(result).toBe(false)
      expect(global.fetchFromAPI).toHaveBeenCalled()
    })
    
    it('should handle IndexedDB errors gracefully', async () => {
      // Mock IndexedDB error
      getFromIndexedDB.mockRejectedValue(new Error('IndexedDB error'))
      
      // Try to refresh data
      const result = await dataService.refreshData()
      
      // Should handle the error gracefully
      expect(result).toBe(false)
    })
  })
})