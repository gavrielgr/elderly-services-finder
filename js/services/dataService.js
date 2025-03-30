import { fetchFromAPI } from '../config/api.js';
import { saveToIndexedDB, getFromIndexedDB } from './storageService.js';
import { transformData } from '../utils/helpers.js';
import { DATA_KEY, LAST_UPDATED_KEY, ALL_SERVICES_KEY, CATEGORIES_KEY } from '../config/constants.js';

export class DataService {
    constructor() {
        this.allServicesData = null;
        this.lastUpdated = null;
        this.lastUpdateCheck = null;
        this.UPDATE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
        this.categories = []; // אתחול מערך ריק
        this.db = window.firebaseDb;
    }

    async refreshData(forceRefresh = false) {
        try {
            // נסה לטעון מהמטמון תחילה
            if (!forceRefresh) {
                const cachedData = await getFromIndexedDB(ALL_SERVICES_KEY);
                if (cachedData) {
                    this.allServicesData = cachedData;
                    this.lastUpdated = await getFromIndexedDB(LAST_UPDATED_KEY);
                    const cachedCategories = await getFromIndexedDB(CATEGORIES_KEY);
                    this.categories = Array.isArray(cachedCategories) ? cachedCategories : [];
                    console.log('Using cached data from:', this.lastUpdated);
                    console.log('Categories from cache:', this.categories);
                    return;
                }
            }

            // אם אין מידע במטמון או שביקשנו רענון, נטען מהשרת
            if (navigator.onLine) {
                if (this.db) {
                    const servicesRef = this.db.collection('services');
                    const snapshot = await servicesRef.get();
                    const rawData = snapshot.docs.map(doc => doc.data());
                    
                    if (rawData) {
                        this.allServicesData = transformData(rawData);
                        this.lastUpdated = new Date().toISOString();
                        this.categories = Array.isArray(rawData.categories) ? rawData.categories : [];
                        console.log('Categories from Firestore:', this.categories);
                        
                        // שמירה במטמון
                        await saveToIndexedDB(ALL_SERVICES_KEY, this.allServicesData);
                        await saveToIndexedDB(LAST_UPDATED_KEY, this.lastUpdated);
                        await saveToIndexedDB(CATEGORIES_KEY, this.categories);
                    }
                } else {
                    console.error('Firebase not initialized');
                }
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }

    async checkForUpdates() {
        try {
            const { data: rawData, source } = await fetchFromAPI();
            
            // אם המידע מגיע מהמטמון, אין צורך לעדכן
            if (source === 'cache') {
                console.log('Cache is up to date');
                return false;
            }

            // אם יש מידע חדש מהשרת
            if (rawData) {
                console.log('New data available from server, updating...');
                const transformedData = transformData(rawData);
                const timestamp = new Date().toISOString();
                await this.updateLocalData(transformedData, timestamp);
                
                // Dispatch custom event to notify UI
                const event = new CustomEvent('dataUpdated', {
                    detail: {
                        timestamp,
                        data: transformedData
                    }
                });
                window.dispatchEvent(event);
                
                return true;
            }

            console.log('No updates available');
            return false;
        } catch (error) {
            console.error('Error checking for updates:', error);
            return false;
        }
    }

    async updateLocalData(data, timestamp) {
        this.allServicesData = data;
        this.lastUpdated = timestamp;
        
        try {
            // Save to IndexedDB
            await saveToIndexedDB(DATA_KEY, data);
            await saveToIndexedDB(LAST_UPDATED_KEY, timestamp);
        } catch (error) {
            console.warn('Failed to save to IndexedDB:', error);
            // Continue even if IndexedDB save fails
        }
    }

    getData() {
        return this.allServicesData;
    }

    getLastUpdated() {
        return this.lastUpdated;
    }

    getCategory(categoryId) {
        if (!Array.isArray(this.categories)) {
            console.warn('Categories is not an array:', this.categories);
            this.categories = [];
        }
        return this.categories.find(cat => cat.id === categoryId);
    }
}

export const dataService = new DataService();
