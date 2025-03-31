import { fetchFromAPI } from '../config/api.js';
import { saveToIndexedDB, getFromIndexedDB } from './storageService.js';
import { ALL_SERVICES_KEY } from '../config/constants.js';

export class DataService {
    constructor() {
        this.allServicesData = null;
        this.lastUpdated = null;
        this.lastUpdateCheck = null;
        this.UPDATE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
    }

    async refreshData(forceRefresh = false) {
        try {
            // נסה לטעון מהמטמון תחילה
            if (!forceRefresh) {
                const cachedData = await getFromIndexedDB(ALL_SERVICES_KEY);
                if (cachedData && cachedData.services && cachedData.categories) {
                    this.allServicesData = cachedData;
                    this.lastUpdated = cachedData.lastUpdated;
                    console.log('Using cached data from:', this.lastUpdated);
                    console.log('Categories from cache:', this.allServicesData.categories);
                    return true;
                }
            }

            // אם אין מידע במטמון או שביקשנו רענון, נטען מהשרת
            if (navigator.onLine) {
                const response = await fetchFromAPI();
                if (response && response.data) {
                    this.allServicesData = response.data;
                    this.lastUpdated = response.data.lastUpdated;
                    console.log('Categories from API:', this.allServicesData.categories);
                    
                    // שמירה במטמון
                    await saveToIndexedDB(ALL_SERVICES_KEY, this.allServicesData);
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error('Error refreshing data:', error);
            return false;
        }
    }

    async checkForUpdates() {
        try {
            // בדיקה אם יש נתונים במטמון
            const cachedData = await this.getCachedData();
            if (!cachedData) {
                console.log('No cached data found, need to refresh');
                return true;
            }

            // בדיקה אם הנתונים במטמון עדכניים
            const lastUpdated = new Date(cachedData.lastUpdated);
            const now = new Date();
            const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);

            if (hoursSinceUpdate > 24) {
                console.log('Cached data is older than 24 hours, need to refresh');
                return true;
            }

            // שמירת הנתונים במטמון ב-allServicesData
            this.allServicesData = cachedData;

            console.log('Using cached data:', {
                lastUpdated: cachedData.lastUpdated,
                servicesCount: cachedData.services?.length || 0,
                categoriesCount: cachedData.categories?.length || 0
            });

            return false;
        } catch (error) {
            console.error('Error checking for updates:', error);
            return true;
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
}

