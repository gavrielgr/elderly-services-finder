import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { saveToIndexedDB, getFromIndexedDB, clearIndexedDB, ALL_SERVICES_KEY } from '../../../js/services/storageService.js'
import { testServices, testCategories } from '../../fixtures/seed-data.js'

// Import our mock helpers
import { __resetMockStorage, __setThrowError } from '../../__mocks__/idb.js'

// Mock the idb dependency
vi.mock('idb', async () => {
  const actual = await vi.importActual('../../__mocks__/idb.js')
  return actual
})

// Mock constants
vi.mock('../../../js/config/constants.js', () => ({
  DB_NAME: 'test-db',
  ALL_SERVICES_KEY: 'allServicesData'
}))

describe('StorageService', () => {
  beforeEach(() => {
    // Reset the mock storage before each test
    __resetMockStorage()
    
    // Reset console spies
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    // Clean up spies
    vi.restoreAllMocks()
  })

  describe('saveToIndexedDB', () => {
    it('should save data to IndexedDB', async () => {
      const testKey = 'test-key'
      const testData = { hello: 'world' }
      
      await saveToIndexedDB(testKey, testData)
      
      // Verify data was logged
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Saved to IndexedDB'))
      
      // Verify data exists in IndexedDB by reading it back
      const savedData = await getFromIndexedDB(testKey)
      expect(savedData).toEqual(testData)
    })
    
    it('should save complex Hebrew data with proper encoding', async () => {
      // Test with Hebrew data
      const hebrewData = {
        name: 'שירות לדוגמה',
        description: 'תיאור בעברית עם סימני פיסוק: !@#$%^',
        categories: testCategories
      }
      
      await saveToIndexedDB('hebrew-test', hebrewData)
      
      // Read back and verify Hebrew is preserved
      const savedData = await getFromIndexedDB('hebrew-test')
      expect(savedData.name).toBe('שירות לדוגמה')
      expect(savedData.description).toBe('תיאור בעברית עם סימני פיסוק: !@#$%^')
    })
    
    it('should handle large data objects', async () => {
      // Create a large dataset
      const largeData = {
        services: Array(100).fill().map((_, i) => ({
          id: `service-${i}`,
          name: `שירות מספר ${i}`,
          description: `תיאור ארוך לשירות מספר ${i} עם טקסט בעברית`.repeat(10)
        })),
        lastUpdated: new Date().toISOString()
      }
      
      await saveToIndexedDB('large-data', largeData)
      
      // Read back and verify
      const savedData = await getFromIndexedDB('large-data')
      expect(savedData.services.length).toBe(100)
      expect(savedData.services[0].name).toBe('שירות מספר 0')
    })
    
    it('should throw and log errors on failure', async () => {
      // Set up the mock to throw an error
      __setThrowError(new Error('IndexedDB failure'))
      
      // Attempt to save data
      await expect(saveToIndexedDB('test-key', { data: 'test' }))
        .rejects.toThrow()
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error saving to IndexedDB'),
        expect.any(Error)
      )
    })
  })
  
  describe('getFromIndexedDB', () => {
    it('should retrieve data from IndexedDB', async () => {
      // First save some test data
      const testKey = 'retrieve-test'
      const testData = { value: 'test data' }
      
      // Directly seed the data for testing retrieval
      await saveToIndexedDB(testKey, testData)
      
      // Clear console logs from the save operation
      console.log.mockClear()
      
      // Now retrieve it
      const retrievedData = await getFromIndexedDB(testKey)
      
      // Verify logging happened
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Retrieved from IndexedDB'))
      
      // Verify the data matches what was saved
      expect(retrievedData).toEqual(testData)
    })
    
    it('should return null for non-existent keys', async () => {
      const result = await getFromIndexedDB('non-existent-key')
      expect(result).toBeNull()
      expect(console.log).not.toHaveBeenCalled() // No log for non-existent data
    })
    
    it('should return null and log errors when retrieval fails', async () => {
      // Set up the mock to throw an error
      __setThrowError(new Error('IndexedDB retrieval failure'))
      
      const result = await getFromIndexedDB('test-key')
      
      // Should log the error and return null
      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error reading from IndexedDB'),
        expect.any(Error)
      )
    })
  })
  
  describe('clearIndexedDB', () => {
    it('should clear all data from IndexedDB', async () => {
      // First, save some test data
      await saveToIndexedDB('key1', { value: 'data1' })
      await saveToIndexedDB('key2', { value: 'data2' })
      
      // Verify data exists
      expect(await getFromIndexedDB('key1')).toEqual({ value: 'data1' })
      expect(await getFromIndexedDB('key2')).toEqual({ value: 'data2' })
      
      // Clear console logs
      console.log.mockClear()
      
      // Now clear the database
      await clearIndexedDB()
      
      // Verify logging
      expect(console.log).toHaveBeenCalledWith('IndexedDB cleared')
      
      // Verify data is gone
      expect(await getFromIndexedDB('key1')).toBeNull()
      expect(await getFromIndexedDB('key2')).toBeNull()
    })
    
    it('should throw and log errors when clearing fails', async () => {
      // Save some test data first
      await saveToIndexedDB('test-key', { data: 'test' })
      
      // Reset the spy to ensure we capture the correct call
      console.error.mockClear()
      
      // Set up the mock to throw an error
      __setThrowError(new Error('IndexedDB clear failure'))
      
      // Attempt to clear
      await expect(clearIndexedDB())
        .rejects.toThrow()
      
      // Verify error logging
      expect(console.error).toHaveBeenCalledWith(
        'Error clearing IndexedDB:',
        expect.any(Error)
      )
    })
  })
  
  describe('integration with complex data', () => {
    it('should handle storing and retrieving the full application data model', async () => {
      // Create a mock of the full app data structure
      const fullAppData = {
        services: testServices,
        categories: testCategories,
        lastUpdated: new Date().toISOString()
      }
      
      // Store it using the actual key used by the application
      await saveToIndexedDB(ALL_SERVICES_KEY, fullAppData)
      
      // Retrieve it
      const retrievedData = await getFromIndexedDB(ALL_SERVICES_KEY)
      
      // Verify the whole data structure
      expect(retrievedData).toEqual(fullAppData)
      expect(retrievedData.services[0].name).toBe('מרכז רפואי הדסה')
      expect(retrievedData.categories[0].name).toBe('בריאות')
    })
    
    it('should handle storing null and undefined values', async () => {
      // Test with various edge cases
      const edgeCaseData = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        zero: 0,
        falseValue: false,
        nestedNull: { value: null },
        array: [1, null, 3],
        hebrewWithNull: { name: 'שם עברי', value: null }
      }
      
      await saveToIndexedDB('edge-cases', edgeCaseData)
      
      const retrievedData = await getFromIndexedDB('edge-cases')
      expect(retrievedData.nullValue).toBeNull()
      expect(retrievedData.undefinedValue).toBeUndefined()
      expect(retrievedData.emptyString).toBe('')
      expect(retrievedData.zero).toBe(0)
      expect(retrievedData.falseValue).toBe(false)
      expect(retrievedData.nestedNull.value).toBeNull()
      expect(retrievedData.array).toEqual([1, null, 3])
      expect(retrievedData.hebrewWithNull.name).toBe('שם עברי')
    })
  })
})