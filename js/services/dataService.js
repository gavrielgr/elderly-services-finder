import { fetchFromAPI } from '../config/api.js';
import { saveToIndexedDB, getFromIndexedDB } from './storageService.js';
import { ALL_SERVICES_KEY } from '../config/constants.js';
// Add Firebase imports
import { initializeFirebase, db as firebaseDb } from '../config/firebase.js';
import { doc, getDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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
        try {
            // אם יש לנו את הנתונים במטמון ולא ביקשנו רענון, נחזיר מהם
            if (!forceRefresh && this.allServicesData && this.allServicesData.services) {
                const service = this.allServicesData.services.find(s => s.id === serviceId);
                if (service) {
                    console.log(`Service found in cache for ID: ${serviceId}`);
                    return service;
                }
            }

            // אם אין במטמון או שביקשנו רענון, נטען מפיירבייס
            console.log(`Initializing Firebase for getServiceById(${serviceId})`);
            const { db } = await initializeFirebase();
            
            if (!db) {
                console.error(`Failed to initialize Firebase in getServiceById(${serviceId}):`, 'Firebase db is null');
                return null;
            }

            console.log(`Firebase db initialized successfully for getServiceById(${serviceId}):`, db);

            // נסה לטעון מהפיירבייס
            const serviceDoc = await getDoc(doc(db, 'services', serviceId));
            
            if (serviceDoc.exists()) {
                const serviceData = serviceDoc.data();
                console.log(`Service found in Firestore for ID: ${serviceId}:`, serviceData);
                return { id: serviceDoc.id, ...serviceData };
            } else {
                console.log(`Service not found in Firestore for ID: ${serviceId}`);
                return null;
            }
        } catch (error) {
            console.error(`Error fetching service by ID ${serviceId}:`, error);
            return null;
        }
    }

    // Get service by slug (converted service name)
    async getServiceBySlug(serviceSlug, forceRefresh = false) {
        try {
            if (!serviceSlug) {
                console.error('getServiceBySlug: serviceSlug is required');
                return null;
            }

            // Decode the URL-encoded slug
            const decodedSlug = decodeURIComponent(serviceSlug);
            console.log(`getServiceBySlug: Original slug: ${serviceSlug}, Decoded slug: ${decodedSlug}`);

            // אם יש לנו את הנתונים במטמון ולא ביקשנו רענון, נחפש בהם
            if (!forceRefresh && this.allServicesData && this.allServicesData.services) {
                const service = this.allServicesData.services.find(s => {
                    // Convert service name to slug and compare
                    const slug = this.createSlug(s.name);
                    console.log(`Comparing cached service "${s.name}" slug: "${slug}" with decoded slug: "${decodedSlug}"`);
                    return slug === decodedSlug;
                });
                
                if (service) {
                    console.log(`Service found in cache for slug: ${decodedSlug}`);
                    return service;
                }
            }

            // אם אין במטמון או שביקשנו רענון, נטען מפיירבייס
            console.log(`Initializing Firebase for getServiceBySlug(${decodedSlug})`);
            const { db } = await initializeFirebase();
            
            if (!db) {
                console.error(`Failed to initialize Firebase in getServiceBySlug(${decodedSlug}):`, 'Firebase db is null');
                return null;
            }

            console.log(`Firebase db initialized successfully for getServiceBySlug(${decodedSlug}):`, db);

            // Get all services and find by slug
            const servicesQuery = query(collection(db, 'services'));
            const querySnapshot = await getDocs(servicesQuery);
            
            for (const doc of querySnapshot.docs) {
                const serviceData = doc.data();
                const slug = this.createSlug(serviceData.name);
                console.log(`Comparing Firestore service "${serviceData.name}" slug: "${slug}" with decoded slug: "${decodedSlug}"`);
                
                if (slug === decodedSlug) {
                    console.log(`Service found in Firestore for slug: ${decodedSlug}:`, serviceData);
                    return { id: doc.id, ...serviceData };
                }
            }
            
            console.log(`Service not found in Firestore for slug: ${decodedSlug}`);
            return null;
        } catch (error) {
            console.error(`Error fetching service by slug ${serviceSlug}:`, error);
            return null;
        }
    }

    // Helper method to create slug from service name
    createSlug(serviceName) {
        if (!serviceName) return '';
        
        return serviceName
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-')        // Replace spaces with hyphens
            .replace(/[^\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9-]/g, '') // Keep Hebrew, Arabic, Latin letters, numbers, and hyphens
            .replace(/-+/g, '-')         // Replace multiple hyphens with single hyphen
            .replace(/^-+|-+$/g, '');    // Remove leading/trailing hyphens
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

