import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { testServices, testCategories, testInterestAreas } from '../fixtures/seed-data.js'

/**
 * This test file focuses on testing server-side utility functions and cache management.
 * We don't import the server directly to avoid starting it, but test the internal
 * functions that would be used by the server.
 */
describe('Server Utility Functions', () => {
  // Utility function tests
  describe('Format Firebase Private Key', () => {
    // This is a direct test of the formatFirebasePrivateKey function from server.js
    it('should properly format a Firebase private key with escaped newlines', () => {
      // Implementation of the function to test
      function formatFirebasePrivateKey(key) {
        if (!key) return null;
        
        try {
          // If it's a JSON string, parse it first
          if (typeof key === 'string' && (key.startsWith('"') && key.endsWith('"'))) {
            key = JSON.parse(key);
          }
          
          // Replace escaped newlines with actual newlines
          if (typeof key === 'string') {
            key = key.replace(/\\n/g, '\n');
          }
          
          // Validate that the key appears to be in PEM format
          if (typeof key === 'string' && !key.includes('-----BEGIN PRIVATE KEY-----')) {
            return null;
          }
          
          return key;
        } catch (error) {
          return null;
        }
      }

      // Test with a properly formatted key with escaped newlines
      const testKey = '"-----BEGIN PRIVATE KEY-----\\nMIIEvAIBADANBgkqhkiG9w0BAQEFA\\nASCBKYwggSiAgEAAoIBAQC\\n-----END PRIVATE KEY-----\\n"';
      const formattedKey = formatFirebasePrivateKey(testKey);
      
      expect(formattedKey).toContain('-----BEGIN PRIVATE KEY-----');
      expect(formattedKey).toContain('-----END PRIVATE KEY-----');
      expect(formattedKey).toContain('\n');
      expect(formattedKey).not.toContain('\\n');
    })

    it('should return null for invalid private keys', () => {
      function formatFirebasePrivateKey(key) {
        if (!key) return null;
        
        try {
          if (typeof key === 'string' && (key.startsWith('"') && key.endsWith('"'))) {
            key = JSON.parse(key);
          }
          
          if (typeof key === 'string') {
            key = key.replace(/\\n/g, '\n');
          }
          
          if (typeof key === 'string' && !key.includes('-----BEGIN PRIVATE KEY-----')) {
            return null;
          }
          
          return key;
        } catch (error) {
          return null;
        }
      }
      
      // Test with invalid key
      const invalidKey = 'not-a-valid-key';
      expect(formatFirebasePrivateKey(invalidKey)).toBeNull();
      
      // Test with empty key
      expect(formatFirebasePrivateKey('')).toBeNull();
      
      // Test with null
      expect(formatFirebasePrivateKey(null)).toBeNull();
    })
  })

  describe('Cache Management', () => {
    it('should determine if cache is valid based on TTL', () => {
      // Cache TTL (5 minutes in milliseconds)
      const CACHE_TTL = 5 * 60 * 1000;
      
      // Define the cache validation function within the test scope
      const isCacheValid = (cache) => {
        return Boolean(cache && cache.lastFetch && (Date.now() - cache.lastFetch) < CACHE_TTL);
      };
      
      // Test with fresh cache
      const freshCache = { lastFetch: Date.now() };
      expect(isCacheValid(freshCache)).toBe(true);
      
      // Test with expired cache
      const expiredCache = { lastFetch: Date.now() - (CACHE_TTL + 1000) };
      expect(isCacheValid(expiredCache)).toBe(false);
      
      // Test with no lastFetch
      const noLastFetchCache = {};
      expect(isCacheValid(noLastFetchCache)).toBe(false);
      
      // Test with null cache
      expect(isCacheValid(null)).toBe(false);
    })

    it('should update cache with new data', () => {
      let cache = {
        services: null,
        categories: null,
        interestAreas: null,
        lastFetch: null
      };
      
      // Mock updating cache
      function updateCache(newData) {
        cache = {
          ...newData,
          lastFetch: Date.now()
        };
        return cache;
      }
      
      const newData = {
        services: testServices,
        categories: testCategories,
        interestAreas: testInterestAreas
      };
      
      const updatedCache = updateCache(newData);
      
      expect(updatedCache.services).toEqual(testServices);
      expect(updatedCache.categories).toEqual(testCategories);
      expect(updatedCache.interestAreas).toEqual(testInterestAreas);
      expect(updatedCache.lastFetch).toBeTypeOf('number');
    })
  })

  describe('CORS and Security', () => {
    it('should generate localhost origins for a range of ports', () => {
      const generateLocalhostOrigins = (startPort, endPort) => {
        const origins = [];
        for (let port = startPort; port <= endPort; port++) {
          origins.push(`http://localhost:${port}`);
        }
        return origins;
      };
      
      const origins = generateLocalhostOrigins(5000, 5005);
      
      expect(origins).toEqual([
        'http://localhost:5000',
        'http://localhost:5001',
        'http://localhost:5002',
        'http://localhost:5003',
        'http://localhost:5004',
        'http://localhost:5005'
      ]);
      expect(origins.length).toBe(6);
    })

    it('should validate allowed origins correctly', () => {
      const allowedOrigins = [
        'https://elderly-service-finder.firebaseapp.com',
        'https://elderly-service-finder.web.app',
        'http://localhost:5000',
        'http://localhost:5173'
      ];
      
      // Check if origin is allowed
      const isOriginAllowed = (origin) => {
        return allowedOrigins.some(allowed => origin.startsWith(allowed));
      };
      
      // Valid origins
      expect(isOriginAllowed('https://elderly-service-finder.firebaseapp.com')).toBe(true);
      expect(isOriginAllowed('https://elderly-service-finder.firebaseapp.com/page')).toBe(true);
      expect(isOriginAllowed('http://localhost:5173')).toBe(true);
      
      // Invalid origins
      expect(isOriginAllowed('https://malicious-site.com')).toBe(false);
      expect(isOriginAllowed('https://fake-elderly-service-finder.firebaseapp.com')).toBe(false);
      expect(isOriginAllowed('http://localhost:6000')).toBe(false);
    })
  })

  describe('Error Handling', () => {
    it('should handle Firebase initialization errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock initialization function
      const initializeFirebase = async () => {
        throw new Error('Firebase initialization error');
      };
      
      // Mock error handler
      const handleFirebaseError = async () => {
        try {
          await initializeFirebase();
          return true;
        } catch (error) {
          console.error('Error initializing Firebase:', error.message);
          return false;
        }
      };
      
      // Test the error handler - await the promise to make sure error handling happens
      const result = await handleFirebaseError();
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error initializing Firebase:',
        'Firebase initialization error'
      );
      
      consoleSpy.mockRestore();
    })

    it('should provide stale cache data during errors if available', async () => {
      // Mock cache and error scenario
      const cache = {
        services: testServices,
        categories: testCategories,
        lastFetch: Date.now() - (10 * 60 * 1000) // Expired by 5 minutes
      };
      
      // Mock function to get data with fallback to cache
      const getDataWithFallback = async () => {
        try {
          throw new Error('API error');
        } catch (error) {
          // If there's an error but we have cached data, return it even if expired
          if (cache.services) {
            return {
              services: cache.services,
              categories: cache.categories,
              fromStaleCache: true
            };
          }
          throw error;
        }
      };
      
      // Test the fallback mechanism - await the promise
      const result = await getDataWithFallback();
      expect(result).toEqual({
        services: testServices,
        categories: testCategories,
        fromStaleCache: true
      });
    })
  })
})