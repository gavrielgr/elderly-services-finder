/**
 * A mock version of DataService for testing
 */
export class DataService {
  constructor() {
    this.allServicesData = null;
    this.lastUpdated = null;
  }

  async refreshData(forceRefresh = false) {
    try {
      // First try to get data from cache
      if (!forceRefresh) {
        const cachedData = await this._getFromCache();
        if (cachedData && this._isValidData(cachedData)) {
          this.allServicesData = cachedData;
          this.lastUpdated = cachedData.lastUpdated;
          this._dispatchDataUpdatedEvent();
          return true;
        }
      }

      // If no valid cached data or forceRefresh, fetch from API
      if (typeof fetchFromAPI === 'function') {
        const data = await fetchFromAPI();
        if (data && this._isValidData(data)) {
          this.allServicesData = data;
          this.lastUpdated = data.lastUpdated;
          this._saveToCache(data);
          this._dispatchDataUpdatedEvent();
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error refreshing data:', error);
      return false;
    }
  }

  getData() {
    return this.allServicesData?.services || [];
  }

  getCategories() {
    return this.allServicesData?.categories || [];
  }

  getCategory(id) {
    return this.getCategories().find(c => c.id === id);
  }

  getInterestAreas() {
    return this.allServicesData?.interestAreas || [];
  }

  getInterestArea(id) {
    return this.getInterestAreas().find(a => a.id === id);
  }

  getServiceById(id) {
    return this.getData().find(s => s.id === id);
  }

  getServiceBySlug(slug) {
    return this.getData().find(s => this.createSlug(s.name) === slug);
  }

  createSlug(name) {
    return name.replace(/\s+/g, '-');
  }

  getLastUpdated() {
    return this.lastUpdated;
  }

  async _getFromCache() {
    try {
      // Access the mock function from the global scope
      if (global.getFromIndexedDB) {
        return await global.getFromIndexedDB('all-services');
      }
      return null;
    } catch (error) {
      console.error('Error getting from cache:', error);
      return null;
    }
  }

  _saveToCache(data) {
    // Access the mock function from the global scope
    if (global.saveToIndexedDB) {
      return global.saveToIndexedDB('all-services', data);
    }
    return Promise.resolve();
  }

  _isValidData(data) {
    return (
      data &&
      Array.isArray(data.services) &&
      data.services.length > 0 &&
      Array.isArray(data.categories)
    );
  }

  _dispatchDataUpdatedEvent() {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('dataUpdated', {
        detail: {
          timestamp: this.lastUpdated,
          data: this.allServicesData
        }
      });
      window.dispatchEvent(event);
    }
  }
}