import { fetchFromAPI } from '../config/api.js';
import { saveToIndexedDB, getFromIndexedDB } from './storageService.js';
import { transformData } from '../utils/helpers.js';
import { DATA_KEY, LAST_UPDATED_KEY } from '../config/constants.js';

export class DataService {
    constructor() {
        this.allServicesData = null;
        this.lastUpdated = null;
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
                    
                    // If we're online, check for updates in background
                    if (navigator.onLine) {
                        this.checkForUpdates();
                    }
                    return true;
                }
            }

            // If no cached data or force refresh, fetch from API
            if (!navigator.onLine) {
                throw new Error('No internet connection');
            }

            const rawData = await fetchFromAPI();
            const transformedData = transformData(rawData.data || rawData);
            const timestamp = rawData.lastUpdated || new Date().toISOString();

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
            
            return false;
        }
    }

    async checkForUpdates() {
        try {
            const rawData = await fetchFromAPI();
            const serverTimestamp = rawData.lastUpdated || new Date().toISOString();

            // Compare with local timestamp
            if (serverTimestamp > this.lastUpdated) {
                console.log('New data available, updating...');
                const transformedData = transformData(rawData.data || rawData);
                await this.updateLocalData(transformedData, serverTimestamp);
                return true;
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
        }
        return false;
    }

    async updateLocalData(data, timestamp) {
        this.allServicesData = data;
        this.lastUpdated = timestamp;
        
        // Save to IndexedDB
        await saveToIndexedDB(DATA_KEY, data);
        await saveToIndexedDB(LAST_UPDATED_KEY, timestamp);
    }

    getData() {
        return this.allServicesData;
    }

    getLastUpdated() {
        return this.lastUpdated;
    }
}

export const dataService = new DataService();
