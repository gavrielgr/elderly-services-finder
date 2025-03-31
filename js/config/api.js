import { getFromIndexedDB, saveToIndexedDB } from '../services/storageService.js';
import { ALL_SERVICES_KEY } from '../config/constants.js';
import { db, auth } from './firebase.js';
import { collection, getDocs } from 'firebase/firestore';

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

// קבלת נתונים מהשרת
async function fetchFromServer() {
    try {
        console.log('Fetching data from Firebase...');
        
        const [servicesSnapshot, categoriesSnapshot, interestAreasSnapshot, serviceAreasSnapshot] = await Promise.all([
            getDocs(collection(db, 'services')),
            getDocs(collection(db, 'categories')),
            getDocs(collection(db, 'interest-areas')),
            getDocs(collection(db, 'service-interest-areas'))
        ]);

        const services = servicesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const categories = categoriesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const interestAreas = interestAreasSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // יצירת מיפוי של מזהי שירותים לתחומי עניין
        const serviceInterestAreasMap = {};
        serviceAreasSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (!serviceInterestAreasMap[data.serviceId]) {
                serviceInterestAreasMap[data.serviceId] = [];
            }
            serviceInterestAreasMap[data.serviceId].push(data.interestAreaId);
        });

        // הוספת תחומי עניין לכל שירות
        services.forEach(service => {
            const interestAreaIds = serviceInterestAreasMap[service.id] || [];
            // מוסיף את אובייקטי תחומי העניין המלאים לשירות
            service.interestAreas = interestAreaIds
                .map(areaId => {
                    const area = interestAreas.find(a => a.id === areaId);
                    return area ? { id: area.id, name: area.name } : null;
                })
                .filter(area => area !== null);
        });

        console.log(`Retrieved ${services.length} services`);
        console.log(`Retrieved ${categories.length} categories`);
        console.log(`Retrieved ${interestAreas.length} interest areas`);
        console.log(`Retrieved ${serviceAreasSnapshot.size} service-interest-area links`);

        return {
            services,
            categories,
            interestAreas
        };
    } catch (error) {
        console.error('Error in fetchFromServer:', error);
        return null;
    }
}

export const API_URL = 'https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLhjH6M2KJrbCQRu4YiofKbgwrkDpjxZGvLIUqE4KrcA_IKd5sp_8eDl0Pb_zEjeWb9_F8A26cGZyN3LnUwLp1tSGwE4DO0MvbpgpbuL6dkaSgQyecapCtZLqZWSy4fns_lzmQ-VVQYa0YZvoLbV3-5Oq0p4FguPA1dOH8tQlui0VwZ_H9mdlkd0D1AgxO53pa8r4r8VlKWtje0O0-W-tIQTtzYauPWkvm8bwXofRooP4qw-IYmKBYIVb_wXqSyHH5n9dcN7a7v5RpLauKypRY9G1hw1Uw&lib=MOF1g2zWJcL4207AxUsxFPKpukIcnFaFe';

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
                services: serverData.services,
                categories: serverData.categories,
                interestAreas: serverData.interestAreas,
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

        return { data: { services: [], categories: [], interestAreas: [] }, source: 'empty' };
    } catch (error) {
        console.error('Error in fetchFromAPI:', error);
        return { data: { services: [], categories: [], interestAreas: [] }, source: 'error' };
    }
}
