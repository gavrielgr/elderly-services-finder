import { getFromIndexedDB, saveToIndexedDB } from '../services/storageService.js';
import { ALL_SERVICES_KEY } from './constants.js';
import { initializeFirebase, db as firebaseDb } from './firebase.js';
import { 
    collection, getDocs, query, limit, orderBy, startAfter, where, 
    doc, getDoc, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp 
} from 'firebase/firestore';

// הגדרות עבור בקרת עומס קריאות פיירבייס
const BATCH_SIZE = 50;
const QUERY_DELAY = 500; // מילישניות לחכות בין קריאות
const CACHE_TTL = 1000 * 60 * 60 * 24; // תוקף המטמון - 24 שעות

// פונקציית עזר לחכות מספר מילישניות
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// קבלת נתונים מהמטמון המקומי
async function getFromCache() {
    try {
        const allServicesData = await getFromIndexedDB(ALL_SERVICES_KEY);
        if (allServicesData) {
            console.log('Using cached data from:', allServicesData.lastUpdated);
            return allServicesData;
        }
        return null;
    } catch (error) {
        console.error('Error reading from cache:', error);
        return null;
    }
}

// שמירת נתונים במטמון המקומי
async function saveToCache(data) {
    try {
        await saveToIndexedDB(ALL_SERVICES_KEY, data);
        console.log('Data saved to cache');
    } catch (error) {
        console.error('Error saving to cache:', error);
    }
}

// המרת תאריך לפורמט אחיד
function normalizeTimestamp(timestamp) {
    if (!timestamp) return null;
    
    // אם זה כבר string
    if (typeof timestamp === 'string') {
        return timestamp;
    }
    
    // אם זה Date
    if (timestamp instanceof Date) {
        return timestamp.toISOString();
    }
    
    return null;
}

// בדיקה האם המידע עדיין טרי
function isDataFresh(localTimestamp) {
    if (!localTimestamp) return false;
    
    const localDate = new Date(localTimestamp);
    const now = new Date();
    const diffInHours = (now - localDate) / (1000 * 60 * 60);
    
    // המידע נחשב טרי עד 24 שעות
    return diffInHours < 24;
}

// קבלת נתונים מהשרת עם pagination ובקרת קצב קריאות
async function fetchFromServer() {
    try {
        console.log('Fetching data from Firebase with pagination...');
        
        // Make sure Firebase is fully initialized first
        const firebaseInstance = await initializeFirebase();
        const db = firebaseInstance.db;
        
        if (!db) {
            throw new Error('Firestore not initialized properly. Firebase initialization may have failed.');
        }
        
        // Verify collection function is available
        if (typeof collection !== 'function') {
            console.error('Firebase collection function not found. Verify Firebase imports are correct.');
            throw new Error('Firebase collection function not available. Check Firebase imports.');
        }
        
        console.log('Using Firebase db instance:', !!db);

        try {
            // 1. Get categories (small collection, fetch all at once)
            console.log('Fetching categories...');
            const categoriesCollection = collection(db, 'categories');
            if (!categoriesCollection) {
                throw new Error('Failed to create categories collection reference');
            }
            
            const categoriesSnapshot = await getDocs(categoriesCollection);
            const categories = categoriesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(`Retrieved ${categories.length} categories`);

            // 2. Get interest areas (small collection, fetch all at once)
            console.log('Fetching interest areas...');
            const interestAreasCollection = collection(db, 'interest-areas');
            if (!interestAreasCollection) {
                throw new Error('Failed to create interest-areas collection reference');
            }
            
            const interestAreasSnapshot = await getDocs(interestAreasCollection);
            const interestAreas = interestAreasSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(`Retrieved ${interestAreas.length} interest areas`);

            // 3. Get services with pagination
            console.log('Fetching services with pagination...');
            let services = [];
            let lastDoc = null;
            let hasMore = true;
            let batchCount = 0;

            while (hasMore) {
                batchCount++;
                let servicesQuery;
                
                // Create services collection reference
                const servicesCollection = collection(db, 'services');
                if (!servicesCollection) {
                    throw new Error('Failed to create services collection reference');
                }
                
                if (lastDoc) {
                    servicesQuery = query(
                        servicesCollection,
                        orderBy('name'),
                        startAfter(lastDoc),
                        limit(BATCH_SIZE)
                    );
                } else {
                    servicesQuery = query(
                        servicesCollection,
                        orderBy('name'),
                        limit(BATCH_SIZE)
                    );
                }

                console.log(`Fetching services batch ${batchCount}...`);
                const servicesSnapshot = await getDocs(servicesQuery);
                
                const batchServices = servicesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                services = [...services, ...batchServices];
                
                // Check if we have more services to fetch
                if (servicesSnapshot.docs.length < BATCH_SIZE) {
                    hasMore = false;
                    console.log('No more services to fetch');
                } else {
                    // Update the last document for pagination
                    lastDoc = servicesSnapshot.docs[servicesSnapshot.docs.length - 1];
                    console.log(`Fetched ${services.length} services so far`);
                    
                    // Add delay between batches to prevent rate limiting
                    if (hasMore) {
                        console.log(`Waiting ${QUERY_DELAY}ms before next batch...`);
                        await delay(QUERY_DELAY);
                    }
                }
            }

            // 4. Get service-interest-area mappings (may be large, use pagination)
            console.log('Fetching service-interest-area mappings...');
            const serviceInterestAreasMap = {};
            let lastMappingDoc = null;
            hasMore = true;
            batchCount = 0;

            while (hasMore) {
                batchCount++;
                let mappingsQuery;
                
                // Create collection reference for mappings
                const mappingsCollection = collection(db, 'service-interest-areas');
                if (!mappingsCollection) {
                    throw new Error('Failed to create service-interest-areas collection reference');
                }
                
                if (lastMappingDoc) {
                    mappingsQuery = query(
                        mappingsCollection,
                        orderBy('serviceId'),
                        startAfter(lastMappingDoc),
                        limit(BATCH_SIZE)
                    );
                } else {
                    mappingsQuery = query(
                        mappingsCollection,
                        orderBy('serviceId'),
                        limit(BATCH_SIZE)
                    );
                }

                console.log(`Fetching mappings batch ${batchCount}...`);
                const mappingsSnapshot = await getDocs(mappingsQuery);
                
                // Process this batch of mappings
                mappingsSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (!serviceInterestAreasMap[data.serviceId]) {
                        serviceInterestAreasMap[data.serviceId] = [];
                    }
                    serviceInterestAreasMap[data.serviceId].push(data.interestAreaId);
                });
                
                // Check if we have more mappings to fetch
                if (mappingsSnapshot.docs.length < BATCH_SIZE) {
                    hasMore = false;
                    console.log('No more mappings to fetch');
                } else {
                    // Update the last document for pagination
                    lastMappingDoc = mappingsSnapshot.docs[mappingsSnapshot.docs.length - 1];
                    console.log(`Processed ${Object.keys(serviceInterestAreasMap).length} service mappings so far`);
                    
                    // Add delay between batches to prevent rate limiting
                    if (hasMore) {
                        console.log(`Waiting ${QUERY_DELAY}ms before next batch...`);
                        await delay(QUERY_DELAY);
                    }
                }
            }

            // Tie interest areas to each service
            services.forEach(service => {
                service.interestAreas = serviceInterestAreasMap[service.id] || [];
            });

            console.log(`Total data fetched: ${services.length} services, ${categories.length} categories, ${interestAreas.length} interest areas`);
            
            // Return the complete dataset
            return {
                services,
                categories,
                interestAreas,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Firebase query error:', error);
            // Try to provide more context on collection errors
            if (error.message.includes('collection()')) {
                console.error('This appears to be a Firebase collection reference error. Verify that:');
                console.error('1. Firebase was properly initialized');
                console.error('2. The Firestore instance is valid');
                console.error('3. Firebase imports (especially collection, query, etc.) are correct');
            }
            throw error;
        }
    } catch (error) {
        console.error('Error in fetchFromServer:', error);
        // Add fallback mechanism
        console.warn('Attempting fallback data retrieval...');
        
        // Try a last resort, direct re-initialization  
        try {
            // Attempt to get cached data
            const cachedData = await getFromCache();
            if (cachedData) {
                console.log('Successfully retrieved fallback data from cache');
                return cachedData;
            }
        } catch (cacheError) {
            console.error('Cache fallback also failed:', cacheError);
        }
        
        throw error;
    }
}

// Function to check if the cache is valid
async function isCacheValid(key) {
    try {
        const cachedData = await getFromIndexedDB(key);
        if (!cachedData) return false;
        
        // Check last updated timestamp
        const now = new Date();
        const lastUpdated = new Date(cachedData.lastUpdated);
        const diffInMs = now - lastUpdated;
        
        // Valid if less than CACHE_TTL (default: 24 hours)
        return diffInMs < CACHE_TTL;
    } catch (error) {
        console.error('Error checking cache validity:', error);
        return false;
    }
}

// Main entry point for data fetching
export async function fetchFromAPI() {
    try {
        console.log('Fetching data from API');
        
        // Try to get data from server first
        try {
            const data = await fetchFromServer();
            // Save fresh data to cache for future use
            await saveToCache(data);
            return data;
        } catch (error) {
            console.error('Error in fetchFromServer:', error);
            
            // If server fetch fails, try to get from cache
            const cachedData = await getFromCache();
            if (cachedData) {
                console.log('Returning cached data due to server error');
                return cachedData;
            }
            
            // If cache also fails, throw the original error
            throw error;
        }
    } catch (error) {
        console.error('Error in fetchFromAPI:', error);
        throw error;
    }
}

export const API_URL = 'https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLhjH6M2KJrbCQRu4YiofKbgwrkDpjxZGvLIUqE4KrcA_IKd5sp_8eDl0Pb_zEjeWb9_F8A26cGZyN3LnUwLp1tSGwE4DO0MvbpgpbuL6dkaSgQyecapCtZLqZWSy4fns_lzmQ-VVQYa0YZvoLbV3-5Oq0p4FguPA1dOH8tQlui0VwZ_H9mdlkd0D1AgxO53pa8r4r8VlKWtje0O0-W-tIQTtzYauPWkvm8bwXofRooP4qw-IYmKBYIVb_wXqSyHH5n9dcN7a7v5RpLauKypRY9G1hw1Uw&lib=MOF1g2zWJcL4207AxUsxFPKpukIcnFaFe';

/**
 * פונקציה להוספת שירות חדש
 * @param {Object} serviceData - נתוני השירות
 * @returns {Promise<Object>} - תוצאת התהליך
 */
export async function addServiceAPI(serviceData) {
    try {
        // Initialize Firebase and get db instance
        const firebaseInstance = await initializeFirebase();
        const db = firebaseInstance.db;
        
        if (!db) {
            throw new Error('Firestore not initialized');
        }
        
        // הוספת חותמת זמן
        serviceData.createdAt = serverTimestamp();
        
        // הוספת השירות
        const docRef = await addDoc(collection(db, 'services'), serviceData);
        
        // אם יש תחומי עניין, מוסיפים מיפויים
        if (serviceData.interestAreaIds && serviceData.interestAreaIds.length > 0) {
            const batch = writeBatch(db);
            
            for (const interestAreaId of serviceData.interestAreaIds) {
                const mappingData = {
                    serviceId: docRef.id,
                    interestAreaId,
                    createdAt: serverTimestamp()
                };
                
                const newMappingRef = doc(collection(db, 'service-interest-areas'));
                batch.set(newMappingRef, mappingData);
            }
            
            await batch.commit();
        }
        
        // מחיקת מטמון לאחר שינוי נתונים
        await saveToIndexedDB(ALL_SERVICES_KEY, null);
        
        return { success: true, serviceId: docRef.id };
    } catch (error) {
        console.error('Error adding service:', error);
        return { success: false, error: error.message };
    }
}

/**
 * פונקציה לעדכון שירות קיים
 * @param {string} serviceId - מזהה השירות
 * @param {Object} serviceData - נתוני השירות המעודכנים
 * @returns {Promise<Object>} - תוצאת התהליך
 */
export async function updateServiceAPI(serviceId, serviceData) {
    try {
        // Initialize Firebase and get db instance
        const firebaseInstance = await initializeFirebase();
        const db = firebaseInstance.db;
        
        if (!db) {
            throw new Error('Firestore not initialized');
        }
        
        // עדכון חותמת זמן העדכון
        serviceData.updatedAt = serverTimestamp();
        
        // עדכון נתוני השירות
        const serviceDocRef = doc(db, 'services', serviceId);
        await updateDoc(serviceDocRef, serviceData);
        
        // עדכון תחומי עניין אם יש
        if (serviceData.interestAreaIds) {
            // מחיקת כל המיפויים הקיימים
            const existingMappingsQuery = query(
                collection(db, 'service-interest-areas'),
                where('serviceId', '==', serviceId)
            );
            
            const existingMappings = await getDocs(existingMappingsQuery);
            
            const batch = writeBatch(db);
            
            // מחיקת המיפויים הישנים
            existingMappings.forEach(mapping => {
                batch.delete(mapping.ref);
            });
            
            // הוספת המיפויים החדשים
            for (const interestAreaId of serviceData.interestAreaIds) {
                const mappingData = {
                    serviceId,
                    interestAreaId,
                    createdAt: serverTimestamp()
                };
                
                const newMappingRef = doc(collection(db, 'service-interest-areas'));
                batch.set(newMappingRef, mappingData);
            }
            
            await batch.commit();
        }
        
        // מחיקת מטמון לאחר שינוי נתונים
        await saveToIndexedDB(ALL_SERVICES_KEY, null);
        
        return { success: true };
    } catch (error) {
        console.error('Error updating service:', error);
        return { success: false, error: error.message };
    }
}

/**
 * פונקציה למחיקת שירות
 * @param {string} serviceId - מזהה השירות למחיקה
 * @returns {Promise<Object>} - תוצאת התהליך
 */
export async function deleteServiceAPI(serviceId) {
    try {
        // Initialize Firebase and get db instance
        const firebaseInstance = await initializeFirebase();
        const db = firebaseInstance.db;
        
        if (!db) {
            throw new Error('Firestore not initialized');
        }
        
        // מחיקת השירות עצמו
        await deleteDoc(doc(db, 'services', serviceId));
        
        // מחיקת כל המיפויים לתחומי עניין
        const mappingsQuery = query(
            collection(db, 'service-interest-areas'),
            where('serviceId', '==', serviceId)
        );
        
        const mappingsSnapshot = await getDocs(mappingsQuery);
        
        if (!mappingsSnapshot.empty) {
            const batch = writeBatch(db);
            mappingsSnapshot.forEach(mapping => {
                batch.delete(mapping.ref);
            });
            await batch.commit();
        }
        
        // מחיקת מטמון לאחר שינוי נתונים
        await saveToIndexedDB(ALL_SERVICES_KEY, null);
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting service:', error);
        return { success: false, error: error.message };
    }
}

/**
 * פונקציה להוספת קטגוריה חדשה
 * @param {Object} categoryData - נתוני הקטגוריה
 * @returns {Promise<Object>} - תוצאת התהליך
 */
export async function addCategoryAPI(categoryData) {
    try {
        // Initialize Firebase and get db instance
        const firebaseInstance = await initializeFirebase();
        const db = firebaseInstance.db;
        
        if (!db) {
            throw new Error('Firestore not initialized');
        }
        
        categoryData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'categories'), categoryData);
        
        // מחיקת מטמון לאחר שינוי נתונים
        await saveToIndexedDB(ALL_SERVICES_KEY, null);
        
        return { success: true, categoryId: docRef.id };
    } catch (error) {
        console.error('Error adding category:', error);
        return { success: false, error: error.message };
    }
}

/**
 * פונקציה לעדכון קטגוריה קיימת
 * @param {string} categoryId - מזהה הקטגוריה
 * @param {Object} categoryData - נתוני הקטגוריה המעודכנים
 * @returns {Promise<Object>} - תוצאת התהליך
 */
export async function updateCategoryAPI(categoryId, categoryData) {
    try {
        // Initialize Firebase and get db instance
        const firebaseInstance = await initializeFirebase();
        const db = firebaseInstance.db;
        
        if (!db) {
            throw new Error('Firestore not initialized');
        }
        
        categoryData.updatedAt = serverTimestamp();
        await updateDoc(doc(db, 'categories', categoryId), categoryData);
        
        // מחיקת מטמון לאחר שינוי נתונים
        await saveToIndexedDB(ALL_SERVICES_KEY, null);
        
        return { success: true };
    } catch (error) {
        console.error('Error updating category:', error);
        return { success: false, error: error.message };
    }
}

/**
 * פונקציה למחיקת קטגוריה
 * @param {string} categoryId - מזהה הקטגוריה למחיקה
 * @returns {Promise<Object>} - תוצאת התהליך
 */
export async function deleteCategoryAPI(categoryId) {
    try {
        // Initialize Firebase and get db instance
        const firebaseInstance = await initializeFirebase();
        const db = firebaseInstance.db;
        
        if (!db) {
            throw new Error('Firestore not initialized');
        }
        
        await deleteDoc(doc(db, 'categories', categoryId));
        
        // מחיקת מטמון לאחר שינוי נתונים
        await saveToIndexedDB(ALL_SERVICES_KEY, null);
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting category:', error);
        return { success: false, error: error.message };
    }
}

/**
 * פונקציה להוספת תחום עניין חדש
 * @param {Object} interestAreaData - נתוני תחום העניין
 * @returns {Promise<Object>} - תוצאת התהליך
 */
export async function addInterestAreaAPI(interestAreaData) {
    try {
        // Initialize Firebase and get db instance
        const firebaseInstance = await initializeFirebase();
        const db = firebaseInstance.db;
        
        if (!db) {
            throw new Error('Firestore not initialized');
        }
        
        interestAreaData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'interest-areas'), interestAreaData);
        
        // מחיקת מטמון לאחר שינוי נתונים
        await saveToIndexedDB(ALL_SERVICES_KEY, null);
        
        return { success: true, interestAreaId: docRef.id };
    } catch (error) {
        console.error('Error adding interest area:', error);
        return { success: false, error: error.message };
    }
}

/**
 * פונקציה לעדכון תחום עניין קיים
 * @param {string} interestAreaId - מזהה תחום העניין
 * @param {Object} interestAreaData - נתוני תחום העניין המעודכנים
 * @returns {Promise<Object>} - תוצאת התהליך
 */
export async function updateInterestAreaAPI(interestAreaId, interestAreaData) {
    try {
        // Initialize Firebase and get db instance
        const firebaseInstance = await initializeFirebase();
        const db = firebaseInstance.db;
        
        if (!db) {
            throw new Error('Firestore not initialized');
        }
        
        interestAreaData.updatedAt = serverTimestamp();
        await updateDoc(doc(db, 'interest-areas', interestAreaId), interestAreaData);
        
        // מחיקת מטמון לאחר שינוי נתונים
        await saveToIndexedDB(ALL_SERVICES_KEY, null);
        
        return { success: true };
    } catch (error) {
        console.error('Error updating interest area:', error);
        return { success: false, error: error.message };
    }
}

/**
 * פונקציה למחיקת תחום עניין
 * @param {string} interestAreaId - מזהה תחום העניין למחיקה
 * @returns {Promise<Object>} - תוצאת התהליך
 */
export async function deleteInterestAreaAPI(interestAreaId) {
    try {
        // Initialize Firebase and get db instance
        const firebaseInstance = await initializeFirebase();
        const db = firebaseInstance.db;
        
        if (!db) {
            throw new Error('Firestore not initialized');
        }
        
        await deleteDoc(doc(db, 'interest-areas', interestAreaId));
        
        // מחיקת כל המיפויים המקושרים לתחום העניין
        const mappingsQuery = query(
            collection(db, 'service-interest-areas'),
            where('interestAreaId', '==', interestAreaId)
        );
        
        const mappingsSnapshot = await getDocs(mappingsQuery);
        
        if (!mappingsSnapshot.empty) {
            const batch = writeBatch(db);
            mappingsSnapshot.forEach(mapping => {
                batch.delete(mapping.ref);
            });
            await batch.commit();
        }
        
        // מחיקת מטמון לאחר שינוי נתונים
        await saveToIndexedDB(ALL_SERVICES_KEY, null);
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting interest area:', error);
        return { success: false, error: error.message };
    }
}
