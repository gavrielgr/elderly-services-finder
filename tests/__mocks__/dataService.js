import { vi } from 'vitest'
import { testServices, testCategories, testInterestAreas } from '../fixtures/seed-data.js'
import { ALL_SERVICES_KEY } from '../../js/config/constants.js'

// Create a mock DataService that doesn't rely on Firebase URL imports
export class DataService {
  constructor() {
    this.allServicesData = {
      services: testServices,
      categories: testCategories,
      interestAreas: testInterestAreas,
      lastUpdated: new Date().toISOString()
    }
    this.lastUpdated = this.allServicesData.lastUpdated
    this.lastUpdateCheck = null
    this.UPDATE_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes
    this.refreshPromise = null
    
    // Mock Firestore methods
    this.initializeFirebaseDb = vi.fn().mockResolvedValue({
      collection: vi.fn()
    })
  }
  
  async refreshData(forceRefresh = false) {
    return true
  }
  
  getData() {
    return this.allServicesData?.services || []
  }
  
  getCategories() {
    return this.allServicesData?.categories || []
  }
  
  getCategory(categoryId) {
    if (!this.allServicesData || !this.allServicesData.categories) return null
    return this.allServicesData.categories.find(c => c.id === categoryId)
  }
  
  getInterestAreas() {
    return this.allServicesData?.interestAreas || []
  }
  
  getInterestArea(areaId) {
    if (!this.allServicesData || !this.allServicesData.interestAreas) return null
    return this.allServicesData.interestAreas.find(a => a.id === areaId)
  }
  
  createSlug(text) {
    return text.replace(/\s+/g, '-')
  }
  
  async getServiceById(serviceId, forceRefresh = false) {
    if (!forceRefresh && this.allServicesData?.services) {
      const cachedService = this.allServicesData.services.find(s => s.id === serviceId)
      if (cachedService) return cachedService
    }
    
    return {
      id: serviceId,
      name: 'מרכז רפואי הדסה',
      description: 'בית חולים מוביל'
    }
  }
  
  async getServiceBySlug(slug, forceRefresh = false) {
    const serviceWithMatchingSlug = testServices.find(s => this.createSlug(s.name) === slug)
    
    if (serviceWithMatchingSlug) {
      return serviceWithMatchingSlug
    }
    
    return {
      id: 'service-slug',
      name: 'שירות לדוגמה',
      slug: slug,
      description: 'תיאור שירות'
    }
  }
  
  async checkServiceVersion(serviceId) {
    return false
  }
}

export default DataService