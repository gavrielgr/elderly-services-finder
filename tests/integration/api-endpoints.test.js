import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import supertest from 'supertest'
import { app, server, PORT, resetTestConditions, populateCache, clearCache, setFirebaseInitialized, setUnauthenticatedTest, setServerErrorTest } from '../helpers/test-server.js'

describe('API Endpoints', () => {
  let request

  beforeAll(async () => {
    // Create the supertest request object
    request = supertest(app)
    resetTestConditions()
  })

  beforeEach(() => {
    // Reset all test conditions before each test
    resetTestConditions()
  })

  afterAll(async () => {
    // Close the server if it was started
    if (server && server.close) {
      await new Promise((resolve) => {
        server.close(resolve)
      })
    }
  })

  describe('GET /api/data', () => {
    it('should return services data when Firebase is initialized', async () => {
      const response = await request
        .get('/api/data')
        .expect(200)

      expect(response.body).toHaveProperty('services')
      expect(response.body).toHaveProperty('categories')
      expect(response.body).toHaveProperty('interestAreas')
      expect(response.body.services).toBeInstanceOf(Array)
      expect(response.body.services.length).toBeGreaterThan(0)
      
      // Verify Hebrew content
      expect(response.body.services[0]).toHaveProperty('name')
      expect(response.body.services[0].name).toContain('מרכז')
      
      // Verify category structure
      expect(response.body.categories[0]).toHaveProperty('id')
      expect(response.body.categories[0]).toHaveProperty('name')
      expect(response.body.categories[0]).toHaveProperty('description')
    })

    it('should return cached data when available', async () => {
      // First populate the cache
      populateCache()
      
      const response = await request
        .get('/api/data')
        .expect(200)

      expect(response.body).toHaveProperty('services')
      expect(response.body.services).toBeInstanceOf(Array)
    })

    it('should handle Firebase connection errors gracefully', async () => {
      // Set Firebase as not initialized
      setFirebaseInitialized(false)
      clearCache()
      
      const response = await request
        .get('/api/data')
        .expect(500)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Firebase not initialized')
    })

    it('should use stale cache when there is an error but cache exists', async () => {
      // Populate cache first
      populateCache()
      
      // Then set Firebase as not initialized
      setFirebaseInitialized(false)
      
      // Set server error to true, but cache should still be used
      setServerErrorTest(true)
      
      const response = await request
        .get('/api/data')
        .expect(200)

      expect(response.body).toHaveProperty('fromStaleCache')
      expect(response.body.fromStaleCache).toBe(true)
      expect(response.body).toHaveProperty('services')
    })
  })

  describe('GET /api/config', () => {
    it('should return Firebase config for allowed origins', async () => {
      const response = await request
        .get('/api/config')
        .set('Origin', 'http://localhost:5173')
        .expect(200)

      expect(response.body).toHaveProperty('projectId')
      expect(response.body).toHaveProperty('apiKey')
      // Values should be test values
      expect(response.body.apiKey).toBe('test-api-key')
    })

    it('should reject requests from unauthorized origins', async () => {
      setUnauthenticatedTest(true)
      
      const response = await request
        .get('/api/config')
        .set('Origin', 'https://malicious-site.com')
        .expect(403)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Unauthorized')
    })
  })

  describe('GET /api/auth/init', () => {
    it('should return auth token for allowed origins', async () => {
      const response = await request
        .get('/api/auth/init')
        .set('Origin', 'http://localhost:5173')
        .expect(200)

      expect(response.body).toHaveProperty('authToken')
      expect(response.body).toHaveProperty('projectId')
      expect(response.body.status).toBe('success')
    })

    it('should reject requests from unauthorized origins', async () => {
      setUnauthenticatedTest(true)
      
      const response = await request
        .get('/api/auth/init')
        .set('Origin', 'https://malicious-site.com')
        .expect(403)

      expect(response.body).toHaveProperty('error')
    })

    it('should handle Firebase auth initialization errors', async () => {
      setFirebaseInitialized(false)
      
      const response = await request
        .get('/api/auth/init')
        .set('Origin', 'http://localhost:5173')
        .expect(500)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Firebase Auth not initialized')
    })
  })

  describe('GET /api/service/:serviceId', () => {
    it('should return specific service data for valid ID', async () => {
      const serviceId = 'service-1'
      
      const response = await request
        .get(`/api/service/${serviceId}`)
        .expect(200)

      expect(response.body).toHaveProperty('id', serviceId)
      expect(response.body).toHaveProperty('name')
      expect(response.body).toHaveProperty('description')
      
      // Check Hebrew content
      expect(response.body.name).toContain('מרכז רפואי')
    })

    it('should return 404 for non-existent service', async () => {
      const response = await request
        .get('/api/service/non-existent-id')
        .expect(404)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Service not found')
    })

    it('should use cache when available', async () => {
      // First populate the cache
      populateCache()
      
      // Get service from cache
      const serviceId = 'service-1'
      const response = await request
        .get(`/api/service/${serviceId}`)
        .expect(200)

      expect(response.body).toHaveProperty('id', serviceId)
    })

    it('should handle server errors gracefully', async () => {
      setServerErrorTest(true)
      
      const response = await request
        .get('/api/service/service-1')
        .expect(500)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Simulated server error')
    })
  })

  describe('GET /api/service-version/:serviceId', () => {
    it('should return version info for valid service', async () => {
      const serviceId = 'service-1'
      
      const response = await request
        .get(`/api/service-version/${serviceId}`)
        .expect(200)

      expect(response.body).toHaveProperty('serviceId', serviceId)
      expect(response.body).toHaveProperty('updated')
      expect(response.body).toHaveProperty('source')
    })

    it('should return version from cache when available', async () => {
      // First populate the cache
      populateCache()
      
      // Get version from cache
      const serviceId = 'service-1'
      const response = await request
        .get(`/api/service-version/${serviceId}`)
        .expect(200)

      expect(response.body).toHaveProperty('serviceId', serviceId)
      expect(response.body).toHaveProperty('source', 'cache')
    })

    it('should return 404 for non-existent service', async () => {
      const response = await request
        .get('/api/service-version/non-existent-id')
        .expect(404)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Service not found')
    })
  })

  describe('GET /api/ratings/:serviceId', () => {
    it('should return ratings for a service', async () => {
      const serviceId = 'service-1'
      
      const response = await request
        .get(`/api/ratings/${serviceId}`)
        .expect(200)

      expect(response.body).toHaveProperty('ratings')
      expect(response.body.ratings).toBeInstanceOf(Array)
      expect(response.body.ratings.length).toBeGreaterThan(0)
      
      // Check Hebrew content in ratings
      expect(response.body.ratings[0]).toHaveProperty('comment')
      expect(response.body.ratings[0].comment).toBeTruthy()
      expect(typeof response.body.ratings[0].comment).toBe('string')
      
      // Check rating structure
      expect(response.body.ratings[0]).toHaveProperty('rating')
      expect(response.body.ratings[0]).toHaveProperty('userName')
      expect(response.body.ratings[0]).toHaveProperty('moderation')
      expect(response.body.ratings[0].moderation.status).toBe('approved')
    })

    it('should handle Firebase errors when fetching ratings', async () => {
      setFirebaseInitialized(false)
      
      const response = await request
        .get('/api/ratings/service-1')
        .expect(500)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Firebase not initialized')
    })
  })

  describe('Error handling and security', () => {
    it('should handle server errors gracefully', async () => {
      setServerErrorTest(true)
      
      const response = await request
        .get('/api/data')
        .expect(500)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Simulated server error')
    })

    it('should validate origin headers for protected endpoints', async () => {
      setUnauthenticatedTest(true)
      
      await request
        .get('/api/config')
        .set('Origin', 'https://malicious-site.com')
        .expect(403)
        
      await request
        .get('/api/auth/init')
        .set('Origin', 'https://malicious-site.com')
        .expect(403)
    })

    it('should return 404 for non-existent API endpoints', async () => {
      const response = await request
        .get('/api/non-existent')
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })
  })
})