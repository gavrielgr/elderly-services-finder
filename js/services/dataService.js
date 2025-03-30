import { fetchFromAPI } from '../config/api.js';
import { saveToIndexedDB, getFromIndexedDB } from './storageService.js';
import { transformData } from '../utils/helpers.js';
import { DATA_KEY, LAST_UPDATED_KEY } from '../config/constants.js';

export class DataService {
    constructor() {
        this.allServicesData = null;
        this.lastUpdated = null;
        this.lastUpdateCheck = null;
        this.UPDATE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
    }

    async refreshData(forceRefresh = false) {
        try {
            // First try to get data from IndexedDB
            if (!forceRefresh) {
                const cachedData = await getFromIndexedDB(DATA_KEY);
                const cachedTimestamp = await getFromIndexedDB(LAST_UPDATED_KEY);
                
                if (cachedData) {
                    this.allServicesData = cachedData;
                    this.lastUpdated = cachedTimestamp;
                    console.log('Using cached data from:', cachedTimestamp);
                    
                    // If we're online, check for updates in background (with throttling)
                    if (navigator.onLine) {
                        const now = Date.now();
                        if (!this.lastUpdateCheck || (now - this.lastUpdateCheck) > this.UPDATE_CHECK_INTERVAL) {
                            this.lastUpdateCheck = now;
                            this.checkForUpdates();
                        } else {
                            console.log('Skipping update check - too soon since last check');
                        }
                    }
                    return true;
                }
            }

            // If no cached data or force refresh, fetch from API
            if (!navigator.onLine) {
                throw new Error('No internet connection');
            }

            const { data: rawData, source } = await fetchFromAPI();
            if (source === 'cache') {
                console.log('Using data from API cache');
                this.allServicesData = transformData(rawData);
                return true;
            }

            console.log('Got fresh data from API');
            const transformedData = transformData(rawData);
            const timestamp = new Date().toISOString();

            await this.updateLocalData(transformedData, timestamp);
            return true;
        } catch (error) {
            console.error('Error in refreshData:', error);
            
            // If offline and we have cached data, use it
            const cachedData = await getFromIndexedDB(DATA_KEY);
            if (cachedData) {
                this.allServicesData = cachedData;
                this.lastUpdated = await getFromIndexedDB(LAST_UPDATED_KEY);
                return true;
            }
            
            // If we have data in memory, use it
            if (this.allServicesData) {
                return true;
            }
            
            return false;
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
}

export const dataService = new DataService();
