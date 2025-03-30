import { collection, getDocs, doc, getDoc, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { getFromIndexedDB, saveToIndexedDB, LAST_UPDATED_KEY, SERVICES_KEY, CATEGORIES_KEY, INTEREST_AREAS_KEY } from '../services/storageService.js';

// קבלת נתונים מהמטמון המקומי
async function getFromCache() {
    try {
        const [services, categories, interestAreas, lastUpdated] = await Promise.all([
            getFromIndexedDB(SERVICES_KEY),
            getFromIndexedDB(CATEGORIES_KEY),
            getFromIndexedDB(INTEREST_AREAS_KEY),
            getFromIndexedDB(LAST_UPDATED_KEY)
        ]);
        
        if (services && categories && interestAreas && lastUpdated) {
            console.log('Using cached data from:', lastUpdated);
            return { services, categories, interestAreas, lastUpdated };
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
        await Promise.all([
            saveToIndexedDB(SERVICES_KEY, data.services),
            saveToIndexedDB(CATEGORIES_KEY, data.categories),
            saveToIndexedDB(INTEREST_AREAS_KEY, data.interestAreas),
            saveToIndexedDB(LAST_UPDATED_KEY, data.lastUpdated)
        ]);
        console.log('Data saved to cache');
    } catch (error) {
        console.error('Error saving to cache:', error);
    }
}

// המרת תאריך Firestore לפורמט אחיד
function normalizeTimestamp(timestamp) {
    if (!timestamp) return null;
    
    // אם זה Timestamp של Firestore
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate().toISOString();
    }
    
    // אם זה כבר string
    if (typeof timestamp === 'string') {
        return timestamp;
    }
    
    // אם זה אובייקט עם seconds ו-nanoseconds
    if (timestamp.seconds) {
        return new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate().toISOString();
    }
    
    return null;
}

// בדיקה האם הנתונים במטמון מעודכנים
function isDataFresh(localTimestamp) {
    if (!localTimestamp) {
        console.log('No local timestamp available');
        return false;
    }

    // בדיקה שהתאריך המקומי הוא בטווח סביר (לא יותר מיום)
    const localDate = new Date(localTimestamp);
    const now = new Date();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    
    console.log('Checking if cache is fresh:', {
        localTimestamp,
        localDate,
        now,
        differenceInHours: (now - localDate) / (60 * 60 * 1000)
    });
    
    return now - localDate < oneDayInMs;
}

export async function fetchFromAPI() {
    try {
        // בדיקת מטמון ראשית
        const cachedData = await getFromCache();
        
        if (cachedData) {
            // בדיקה שהנתונים במטמון לא ישנים מדי
            if (isDataFresh(cachedData.lastUpdated)) {
                console.log('Using cached data - cache is fresh');
                return {
                    data: cachedData.services,
                    lastUpdated: cachedData.lastUpdated,
                    source: 'cache'
                };
            } else {
                console.log('Cache is stale, fetching fresh data');
            }
        } else {
            console.log('No cache available, fetching fresh data');
        }

        console.log('Fetching fresh data from server...');
        
        // קבל את כל הקטגוריות
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        const categories = categoriesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // קבל את כל תחומי העניין
        const interestAreasSnapshot = await getDocs(collection(db, 'interest-areas'));
        const interestAreas = interestAreasSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // קבל את כל השירותים
        const servicesSnapshot = await getDocs(collection(db, 'services'));

        // קבל את כל הקישורים בין שירותים לתחומי עניין
        const serviceAreasSnapshot = await getDocs(collection(db, 'service-interest-areas'));
        const serviceInterestAreasMap = {};
        serviceAreasSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (!serviceInterestAreasMap[data.serviceId]) {
                serviceInterestAreasMap[data.serviceId] = [];
            }
            serviceInterestAreasMap[data.serviceId].push(data.interestAreaId);
        });

        // עיבוד השירותים עם המידע הנלווה
        const services = servicesSnapshot.docs.map(doc => {
            const serviceData = doc.data();
            
            // קבלת תחומי העניין לשירות
            const serviceInterestAreas = (serviceInterestAreasMap[doc.id] || [])
                .map(areaId => interestAreas.find(area => area.id === areaId))
                .filter(area => area !== undefined);

            return {
                id: doc.id,
                ...serviceData,
                categoryName: categories.find(category => category.id === serviceData.category)?.name || 'כללי',
                interestAreas: serviceInterestAreas
            };
        });

        const currentTime = new Date().toISOString();
        const result = {
            data: services,
            categories,
            interestAreas,
            serviceInterestAreasMap,
            lastUpdated: currentTime,
            source: 'server'
        };

        // שמירה במטמון
        await saveToCache({
            services,
            categories,
            interestAreas,
            lastUpdated: currentTime
        });

        console.log(`Fetched and processed: ${services.length} services with their related data`);
        return result;

    } catch (error) {
        console.error('Error fetching data from Firestore:', error);
        throw error;
    }
}
