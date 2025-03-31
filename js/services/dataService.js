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

