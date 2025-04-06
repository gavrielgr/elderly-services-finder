/**
 * Data Service
 * Service that coordinates data access using repositories
 */
export class DataService {
    /**
     * Constructor
     * @param {ServiceRepository} serviceRepository - Service repository instance
     * @param {CategoryRepository} categoryRepository - Category repository instance
     */
    constructor(serviceRepository, categoryRepository) {
        this.serviceRepository = serviceRepository;
        this.categoryRepository = categoryRepository;
        this.allServicesData = null;
        this.lastUpdated = null;
        this.lastUpdateCheck = null;
        this.UPDATE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
        this.refreshPromise = null; // למניעת קריאות מקבילות
    }

    /**
     * Refresh data from repositories
     * @param {boolean} forceRefresh - Force refresh from network
     * @returns {Promise<boolean>} Success status
     */
    async refreshData(forceRefresh = false) {
        try {
            // אם כבר מתבצעת טעינה, נחזיר את ההבטחה הקיימת
            if (this.refreshPromise) {
                console.log('Refresh already in progress, waiting for it to complete...');
                return this.refreshPromise;
            }
            
            // נתחיל תהליך טעינה חדש
            this.refreshPromise = this._doRefresh(forceRefresh);
            
            // נחכה לתוצאה ונאפס את ההבטחה בסיום
            const result = await this.refreshPromise;
            this.refreshPromise = null;
            return result;
        } catch (error) {
            console.error('Error in refreshData:', error);
            this.refreshPromise = null;
            return false;
        }
    }
    
    /**
     * Internal refresh implementation
     * @param {boolean} forceRefresh - Force refresh from network
     * @returns {Promise<boolean>} Success status
     * @private
     */
    async _doRefresh(forceRefresh) {
        try {
            console.log('Fetching data from repositories...');
            const startTime = performance.now();
            
            // Fetch data from repositories in parallel
            const [services, categories] = await Promise.all([
                this.serviceRepository.getAll(),
                this.categoryRepository.getAll()
            ]);
            
            if (services && categories) {
                // Store the data
                this.allServicesData = {
                    services,
                    categories,
                    lastUpdated: new Date().toISOString()
                };
                this.lastUpdated = this.allServicesData.lastUpdated;
                
                // Publish data updated event
                this._dispatchDataUpdatedEvent(this.lastUpdated);
                
                // Update last check time
                this.lastUpdateCheck = Date.now();
                
                const endTime = performance.now();
                console.log(`Repository fetch completed in ${Math.round(endTime - startTime)}ms`);
                
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error refreshing data:', error);
            return false;
        }
    }
    
    /**
     * Dispatch data updated event
     * @param {string} timestamp - Update timestamp
     * @private
     */
    _dispatchDataUpdatedEvent(timestamp) {
        window.dispatchEvent(new CustomEvent('dataUpdated', {
            detail: {
                timestamp,
                data: this.allServicesData
            }
        }));
    }

    /**
     * Check for data updates
     * @returns {Promise<boolean>} True if updates were found and applied
     */
    async checkForUpdates() {
        try {
            // Check if enough time has passed since last check
            if (this.lastUpdateCheck && (Date.now() - this.lastUpdateCheck < this.UPDATE_CHECK_INTERVAL)) {
                console.log('Last update check was too recent, skipping');
                return false;
            }
            
            // Update last check time
            this.lastUpdateCheck = Date.now();
            
            // Refresh data
            return this.refreshData(true);
        } catch (error) {
            console.error('Error checking for updates:', error);
            return false;
        }
    }

    /**
     * Get all services
     * @returns {Array} Array of services
     */
    getData() {
        if (!this.allServicesData || !this.allServicesData.services) {
            console.warn('Services not available in allServicesData');
            return [];
        }
        return this.allServicesData.services;
    }

    /**
     * Get last updated timestamp
     * @returns {string|null} ISO timestamp or null
     */
    getLastUpdated() {
        return this.lastUpdated;
    }

    /**
     * Get all categories
     * @returns {Array} Array of categories
     */
    getCategories() {
        if (!this.allServicesData || !this.allServicesData.categories) {
            console.warn('Categories not available in allServicesData');
            return [];
        }
        return this.allServicesData.categories;
    }

    /**
     * Get category by ID
     * @param {string} categoryId - Category ID
     * @returns {Object|null} Category or null if not found
     */
    getCategory(categoryId) {
        if (!this.allServicesData?.categories) {
            console.warn('Categories is not available:', this.allServicesData);
            return null;
        }
        return this.allServicesData.categories.find(cat => cat.id === categoryId);
    }

    /**
     * Get service by ID
     * @param {string} id - Service ID
     * @param {boolean} forceRefresh - Force refresh from repository
     * @returns {Promise<Object|null>} Service or null if not found
     */
    async getServiceById(id, forceRefresh = false) {
        if (!forceRefresh && this.allServicesData?.services) {
            // Try to find in cached data first
            const cachedService = this.allServicesData.services.find(s => s.id === id);
            if (cachedService) {
                return cachedService;
            }
        }
        
        // Get from repository
        return this.serviceRepository.getById(id);
    }

    /**
     * Check if service has been updated
     * @param {string} id - Service ID
     * @returns {Promise<boolean>} True if service needs refresh
     */
    async checkServiceVersion(id) {
        if (!this.lastUpdated) {
            return true; // No last updated time, assume it needs refresh
        }
        
        return this.serviceRepository.checkVersion(id, this.lastUpdated);
    }

    /**
     * Search services
     * @param {string} query - Search query
     * @returns {Promise<Array>} Array of matching services
     */
    async searchServices(query) {
        return this.serviceRepository.search(query);
    }

    /**
     * Get services by category
     * @param {string} categoryId - Category ID
     * @returns {Promise<Array>} Array of services
     */
    async getServicesByCategory(categoryId) {
        return this.serviceRepository.getByCategory(categoryId);
    }
} 