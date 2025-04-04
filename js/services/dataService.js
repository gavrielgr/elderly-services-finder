import { fetchFromAPI } from '../config/api.js';
import { saveToIndexedDB, getFromIndexedDB } from './storageService.js';
import { ALL_SERVICES_KEY } from '../config/constants.js';

export class DataService {
    constructor() {
        this.allServicesData = null;
        this.lastUpdated = null;
        this.lastUpdateCheck = null;
        this.UPDATE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
        this.refreshPromise = null; // למניעת קריאות מקבילות
    }

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
    
    // פונקציית העזר שמבצעת את הטעינה בפועל
    async _doRefresh(forceRefresh) {
        try {
            // נסה לטעון מהמטמון תחילה
            if (!forceRefresh) {
                const cachedData = await getFromIndexedDB(ALL_SERVICES_KEY);
                if (cachedData && cachedData.services && cachedData.categories) {
                    // בדיקה אם הנתונים תקפים (לא ריקים ויש תאריך עדכון)
                    if (
                        cachedData.services.length > 0 && 
                        cachedData.categories.length > 0 && 
                        cachedData.lastUpdated
                    ) {
                        this.allServicesData = cachedData;
                        this.lastUpdated = cachedData.lastUpdated;
                        console.log('Using cached data from:', this.lastUpdated);
                        
                        // פירסום אירוע עדכון נתונים כדי לעדכן את הממשק
                        this._dispatchDataUpdatedEvent(this.lastUpdated);
                        
                        return true;
                    }
                    console.log('Cached data is invalid, fetching from server');
                }
            }

            // אם יש חיבור אינטרנט ואין מידע במטמון או שביקשנו רענון, נטען מהשרת
            if (navigator.onLine) {
                console.log('Fetching data from server...');
                const startTime = performance.now();
                
                const response = await fetchFromAPI();
                
                const endTime = performance.now();
                console.log(`API fetch completed in ${Math.round(endTime - startTime)}ms`);
                
                if (response && response.data) {
                    this.allServicesData = response.data;
                    this.lastUpdated = response.data.lastUpdated;
                    
                    // פירסום אירוע עדכון נתונים
                    this._dispatchDataUpdatedEvent(this.lastUpdated);
                    
                    // שמירת זמן הבדיקה האחרונה
                    this.lastUpdateCheck = Date.now();
                    
                    return true;
                }
            }

            // אם לא הצלחנו לקבל נתונים חדשים אבל יש לנו נתונים קיימים
            if (this.allServicesData) {
                console.log('Using existing data');
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error refreshing data:', error);
            return false;
        }
    }
    
    // פירסום אירוע עדכון נתונים
    _dispatchDataUpdatedEvent(timestamp) {
        window.dispatchEvent(new CustomEvent('dataUpdated', {
            detail: {
                timestamp,
                data: this.allServicesData
            }
        }));
    }

    async checkForUpdates() {
        try {
            // בדיקה אם עבר מספיק זמן מהבדיקה האחרונה
            if (this.lastUpdateCheck && (Date.now() - this.lastUpdateCheck < this.UPDATE_CHECK_INTERVAL)) {
                console.log('Last update check was too recent, skipping');
                return false;
            }
            
            // בדיקה אם יש נתונים במטמון
            const cachedData = await this.getCachedData();
            if (!cachedData) {
                console.log('No cached data found, need to refresh');
                return await this.refreshData(true);
            }

            // בדיקה אם הנתונים במטמון עדכניים
            const lastUpdated = new Date(cachedData.lastUpdated);
            const now = new Date();
            const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);

            if (hoursSinceUpdate > 24) {
                console.log('Cached data is older than 24 hours, need to refresh');
                return await this.refreshData(true);
            }
            
            // עדכון זמן הבדיקה האחרונה
            this.lastUpdateCheck = Date.now();

            // שמירת הנתונים במטמון ב-allServicesData
            if (!this.allServicesData) {
                this.allServicesData = cachedData;
                this.lastUpdated = cachedData.lastUpdated;
            }

            console.log('Using cached data:', {
                lastUpdated: cachedData.lastUpdated,
                servicesCount: cachedData.services?.length || 0,
                categoriesCount: cachedData.categories?.length || 0
            });

            return false; // אין צורך בעדכון
        } catch (error) {
            console.error('Error checking for updates:', error);
            return false;
        }
    }

    getData() {
        if (!this.allServicesData || !this.allServicesData.services) {
            console.warn('Services not available in allServicesData');
            return [];
        }
        return this.allServicesData.services;
    }

    getLastUpdated() {
        return this.lastUpdated;
    }

    getCategories() {
        if (!this.allServicesData || !this.allServicesData.categories) {
            console.warn('Categories not available in allServicesData');
            return [];
        }
        return this.allServicesData.categories;
    }

    getCategory(categoryId) {
        if (!this.allServicesData?.categories) {
            console.warn('Categories is not available:', this.allServicesData);
            return null;
        }
        return this.allServicesData.categories.find(cat => cat.id === categoryId);
    }

    getInterestAreas() {
        if (!this.allServicesData || !this.allServicesData.interestAreas) {
            console.warn('Interest areas not available in allServicesData');
            return [];
        }
        return this.allServicesData.interestAreas;
    }

    getInterestArea(areaId) {
        if (!this.allServicesData?.interestAreas) {
            console.warn('Interest areas not available:', this.allServicesData);
            return null;
        }
        return this.allServicesData.interestAreas.find(area => area.id === areaId);
    }

    // Get a service by ID with option to refresh from server
    async getServiceById(serviceId, forceRefresh = false) {
        if (!serviceId) {
            return null;
        }
        
        // First check if we have it in memory
        if (this.allServicesData?.services && !forceRefresh) {
            const service = this.allServicesData.services.find(s => s.id === serviceId);
            if (service) {
                return service;
            }
        }
        
        if (forceRefresh) {
            try {
                // Fetch the latest service data from the server
                const response = await fetch(`${window.location.origin.replace('5173', '5001')}/api/service/${serviceId}`);
                
                if (response.ok) {
                    const serviceData = await response.json();
                    
                    // Update the service in our local data if it exists
                    if (this.allServicesData?.services) {
                        const index = this.allServicesData.services.findIndex(s => s.id === serviceId);
                        if (index >= 0) {
                            this.allServicesData.services[index] = serviceData;
                            
                            // Save the updated data to IndexedDB
                            await saveToIndexedDB(ALL_SERVICES_KEY, this.allServicesData);
                        }
                    }
                    
                    return serviceData;
                } else {
                    console.warn(`Failed to fetch service ${serviceId} from server:`, response.status);
                }
            } catch (error) {
                console.error(`Error fetching service ${serviceId}:`, error);
            }
        }
        
        // Fallback to local cache
        if (this.allServicesData?.services) {
            return this.allServicesData.services.find(s => s.id === serviceId) || null;
        }
        
        return null;
    }

    async getCachedData() {
        try {
            const cachedData = await getFromIndexedDB(ALL_SERVICES_KEY);
            if (cachedData) {
                console.log('Retrieved cached data:', {
                    servicesCount: cachedData.services?.length || 0,
                    categoriesCount: cachedData.categories?.length || 0,
                    lastUpdated: cachedData.lastUpdated
                });
                return cachedData;
            }
            console.log('No cached data found');
            return null;
        } catch (error) {
            console.error('Error getting cached data:', error);
            return null;
        }
    }

    /**
     * Check if the service version in cache is up to date
     * This implements the versioned cache strategy for ratings
     * @param {string} serviceId - The ID of the service to check
     * @returns {Promise<boolean>} - Whether the service needs to be refreshed
     */
    async checkServiceVersion(serviceId) {
        if (!serviceId || !this.allServicesData?.services) {
            return false;
        }
        
        try {
            // Find the service in our local cache
            const cachedService = this.allServicesData.services.find(s => s.id === serviceId);
            if (!cachedService) {
                return false;
            }
            
            // Get the timestamp from either metadata.updated or updatedAt
            const cachedTimestamp = cachedService.metadata?.updated || 
                                   (cachedService.updatedAt?.seconds ? 
                                    new Date(cachedService.updatedAt.seconds * 1000).toISOString() : 
                                    null);
            
            if (!cachedTimestamp) {
                return true; // No timestamp, better refresh to be safe
            }
            
            // Check the version with the server using a lightweight API call
            const response = await fetch(`${window.location.origin.replace('5173', '5001')}/api/service-version/${serviceId}`);
            
            if (response.ok) {
                const versionData = await response.json();
                const serverTimestamp = versionData.updated;
                
                // If the server has a newer timestamp, we need to refresh
                if (serverTimestamp && serverTimestamp !== cachedTimestamp) {
                    console.log(`Service ${serviceId} has a new version. Cache: ${cachedTimestamp}, Server: ${serverTimestamp}`);
                    return true;
                }
                
                return false; // No update needed
            }
            
            return false; // Couldn't check, assume no update needed
        } catch (error) {
            console.error(`Error checking service version for ${serviceId}:`, error);
            return false; // On error, assume no update needed
        }
    }
}

