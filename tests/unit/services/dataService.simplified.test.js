import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DataService } from '../../__mocks__/data-service.js'
import { testServices, testCategories, testInterestAreas } from '../../fixtures/seed-data.js'

describe('DataService (Simplified Mock)', () => {
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
    
    // Create a fresh instance for each test
    dataService = new DataService()
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })
  
  describe('data retrieval methods', () => {
    it('should return all services with getData()', () => {
      const services = dataService.getData()
      expect(services).toEqual(testServices)
    })
    
    it('should return all categories with getCategories()', () => {
      const categories = dataService.getCategories()
      expect(categories).toEqual(testCategories)
    })
    
    it('should find a category by ID with getCategory()', () => {
      // Add an id to a test category
      const testCategory = { ...testCategories[0], id: 'health' }
      dataService.allServicesData.categories = [testCategory]
      
      const category = dataService.getCategory('health')
      expect(category).toEqual(testCategory)
    })
    
    it('should create proper slugs from Hebrew service names', () => {
      // Test Hebrew service name slugification
      const hebrewName = 'מרכז רפואי הדסה'
      const expectedSlug = 'מרכז-רפואי-הדסה'
      
      const slug = dataService.createSlug(hebrewName)
      expect(slug).toBe(expectedSlug)
    })
  })
  
  describe('service retrieval methods', () => {
    it('should retrieve service by ID from cache', async () => {
      const service = await dataService.getServiceById('service-1', false)
      expect(service).toBeDefined()
    })
    
    it('should retrieve service by slug', async () => {
      const slug = 'מרכז-רפואי-הדסה'
      const service = await dataService.getServiceBySlug(slug, false)
      expect(service).toBeDefined()
    })
  })
  
  describe('refresh behavior', () => {
    it('should refresh data successfully', async () => {
      const result = await dataService.refreshData()
      expect(result).toBe(true)
    })
  })
})