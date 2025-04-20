import { fetchFromAPI } from '../config/api.js';
import { saveToIndexedDB, getFromIndexedDB } from './storageService.js';
import { ALL_SERVICES_KEY } from '../config/constants.js';
// Add Firebase imports
import { initializeFirebase, db as firebaseDb } from '../config/firebase.js';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

// Local db reference that will be set after initialization
let db = null;

export class DataService {
    constructor() {
        this.allServicesData = null;
        this.lastUpdated = null;
        this.lastUpdateCheck = null;
        this.UPDATE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
        this.refreshPromise = null; // למניעת קריאות מקבילות
        
        // Initialize Firebase when the service is created
        this.initializeFirebaseDb();
    }
    
    // Helper method to initialize Firebase
    async initializeFirebaseDb() {
        try {
            console.log('Initializing Firebase in DataService');
            const { db: firestore } = await initializeFirebase();
            if (firestore) {
                console.log('Firebase DB initialized successfully in DataService');
                return firestore;
            } else {
                console.error('Firebase DB returned null from initializeFirebase');
                return null;
            }
        } catch (error) {
            console.error('Failed to initialize Firebase in DataService:', error);
            return null;
        }
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

            // Make sure Firebase is initialized before proceeding
            try {
                await initializeFirebase();
            } catch (error) {
                console.error('Failed to initialize Firebase before API fetch:', error);
                // Continue anyway, the API will try to initialize Firebase again
            }

            // אם יש חיבור אינטרנט ואין מידע במטמון או שביקשנו רענון, נטען מהשרת
            if (navigator.onLine) {
                console.log('Fetching data from server...');
                const startTime = performance.now();
                
                const response = await fetchFromAPI();
                
                const endTime = performance.now();
                console.log(`API fetch completed in ${Math.round(endTime - startTime)}ms`);
                
                // Handle different possible response structures
                let data = null;
                if (response && response.services) {
                    // If response directly contains the data structure
                    data = response;
                } else if (response && response.data && response.data.services) {
                    // If response is wrapped in a data property
                    data = response.data;
                }
                
                if (data && data.services) {
                    console.log(`Received data with ${data.services.length} services, ${data.categories?.length || 0} categories`);
                    this.allServicesData = data;
                    this.lastUpdated = data.lastUpdated;
                    
                    // פירסום אירוע עדכון נתונים
                    this._dispatchDataUpdatedEvent(this.lastUpdated);
                    
                    // שמירת זמן הבדיקה האחרונה
                    this.lastUpdateCheck = Date.now();
                    
                    return true;
                } else {
                    console.error('Invalid data format received from API:', response);
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

        // Get a fresh Firebase db instance directly
        let db = null;
        if (forceRefresh) {
            try {
                console.log(`Initializing Firebase for getServiceById(${serviceId})`);
                const { db: freshDb } = await initializeFirebase();
                db = freshDb;
                
                if (!db) {
                    console.warn("Firebase db not available after initialization");
                    forceRefresh = false; // Fallback to cache
                } else {
                    console.log(`Firebase db initialized successfully for getServiceById(${serviceId})`);
                }
            } catch (error) {
                console.error(`Failed to initialize Firebase in getServiceById(${serviceId}):`, error);
                // Fallback to cache if DB init fails
                forceRefresh = false;
            }
        }

        // First check if we have it in memory (unless forceRefresh)
        if (this.allServicesData?.services && !forceRefresh) {
            const service = this.allServicesData.services.find(s => s.id === serviceId);
            if (service) {
                // console.log(`Returning service ${serviceId} from memory cache`);
                return service;
            }
        }

        // If forceRefresh is true and db is available, fetch fresh from Firestore
        if (forceRefresh && db) {
            try {
                console.log(`Fetching fresh data for service ${serviceId} from Firestore...`);
                // 1. Fetch the service document
                const serviceDocRef = doc(db, 'services', serviceId);
                const serviceDocSnap = await getDoc(serviceDocRef);

                if (!serviceDocSnap.exists()) {
                    console.warn(`Service ${serviceId} not found in Firestore.`);
                    return null; // Service doesn't exist
                }

                let serviceData = { id: serviceDocSnap.id, ...serviceDocSnap.data() };

                // 2. Fetch related interest area mappings
                const mappingsQuery = query(
                    collection(db, 'service-interest-areas'),
                    where('serviceId', '==', serviceId)
                );
                const mappingsSnapshot = await getDocs(mappingsQuery);

                const interestAreaIds = [];
                mappingsSnapshot.forEach(mappingDoc => {
                    const mappingData = mappingDoc.data();
                    if (mappingData.interestAreaId) {
                        interestAreaIds.push(mappingData.interestAreaId);
                    }
                });

                // 3. Merge interest areas into the service data
                serviceData.interestAreas = interestAreaIds;
                console.log(`Merged interestAreas for ${serviceId}:`, interestAreaIds);

                // 4. Update the service in our local memory cache (allServicesData)
                if (this.allServicesData?.services) {
                    const index = this.allServicesData.services.findIndex(s => s.id === serviceId);
                    if (index >= 0) {
                        console.log(`Updating service ${serviceId} in memory cache`);
                        this.allServicesData.services[index] = serviceData;
                    } else {
                        // If service wasn't in cache before, add it (less common case)
                        this.allServicesData.services.push(serviceData);
                    }
                    // Optionally, update the main lastUpdated timestamp if needed
                    // this.allServicesData.lastUpdated = new Date().toISOString();

                    // 5. Save the *entire* updated data structure back to IndexedDB
                    // This ensures the cache reflects the newly merged data
                    await saveToIndexedDB(ALL_SERVICES_KEY, this.allServicesData);
                    console.log(`Saved updated allServicesData to IndexedDB after fetching ${serviceId}`);
                }

                return serviceData; // Return the freshly fetched and merged data

            } catch (error) {
                console.error(`Error fetching service ${serviceId} directly from Firestore:`, error);
                // Don't fallback here if Firestore fetch fails, let the final fallback handle it
            }
        }

        // Fallback to local cache if not forceRefresh, or if Firestore fetch failed
        if (this.allServicesData?.services) {
            // console.log(`Returning service ${serviceId} from memory cache (fallback)`);
            return this.allServicesData.services.find(s => s.id === serviceId) || null;
        }

        console.warn(`Service ${serviceId} could not be found.`);
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

