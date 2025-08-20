import { vi } from 'vitest'
import { testServices, testCategories, testInterestAreas } from '../fixtures/seed-data.js'

// Mock DataService for testing
export class DataService {
  constructor() {
    this.allServicesData = {
      services: testServices,
      categories: testCategories,
      interestAreas: testInterestAreas,
      lastUpdated: new Date().toISOString()
    }
    this.lastUpdated = this.allServicesData.lastUpdated
    this.refreshPromise = null
  }

  async initializeFirebaseDb() {
    return {
      collection: vi.fn()
    }
  }

  // Methods for testing
  getData() {
    return this.allServicesData?.services || []
  }

  getCategories() {
    return this.allServicesData?.categories || []
  }

  getCategory(id) {
    return this.allServicesData?.categories?.find(c => c.id === id)
  }

  getInterestAreas() {
    return this.allServicesData?.interestAreas || []
  }

  getInterestArea(id) {
    return this.allServicesData?.interestAreas?.find(a => a.id === id)
  }

  createSlug(text) {
    return text.replace(/\s+/g, '-')
  }

  async refreshData(forceRefresh = false) {
    return true
  }

  async getServiceById(id, forceRefresh = false) {
    if (!forceRefresh && this.allServicesData?.services) {
      const cachedService = this.allServicesData.services.find(s => s.id === id)
      if (cachedService) {
        return cachedService
      }
    }

    return {
      id,
      name: 'מרכז רפואי הדסה',
      description: 'בית חולים מוביל'
    }
  }

  async getServiceBySlug(slug, forceRefresh = false) {
    if (!forceRefresh && this.allServicesData?.services) {
      const cachedService = this.allServicesData.services.find(
        s => this.createSlug(s.name) === slug
      )
      if (cachedService) {
        return cachedService
      }
    }

    return {
      id: 'mock-service',
      name: `שירות עם סלאג ${slug}`,
      description: 'תיאור מוק'
    }
  }

  async checkServiceVersion(serviceId) {
    return false
  }
}

export default DataService