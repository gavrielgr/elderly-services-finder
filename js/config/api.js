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

// קבלת נתונים מהשרת
async function fetchFromServer() {
    try {
        const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
        const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/services`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.documents.map(doc => doc.fields);
    } catch (error) {
        console.error('Error fetching from server:', error);
        return null;
    }
}

// פונקציה ראשית לקבלת נתונים
export async function fetchFromAPI() {
    try {
        // נסה לקבל מהמטמון תחילה
        const cachedData = await getFromCache();
        if (cachedData && isDataFresh(cachedData.lastUpdated)) {
            console.log('Using fresh cached data');
            return { data: cachedData, source: 'cache' };
        }

        // אם אין מידע במטמון או שהוא לא טרי, נטען מהשרת
        const serverData = await fetchFromServer();
        if (serverData) {
            const timestamp = new Date().toISOString();
            const data = {
                services: serverData,
                categories: serverData.categories || [],
                interestAreas: serverData.interestAreas || [],
                lastUpdated: timestamp
            };
            
            // שמירה במטמון
            await saveToCache(data);
            
            return { data, source: 'server' };
        }

        // אם לא הצלחנו לקבל נתונים מהשרת, נשתמש במטמון (אם יש)
        if (cachedData) {
            console.log('Using stale cached data');
            return { data: cachedData, source: 'cache' };
        }

        return null;
    } catch (error) {
        console.error('Error in fetchFromAPI:', error);
        return null;
    }
}
