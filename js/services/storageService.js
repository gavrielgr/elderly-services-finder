import { DB_NAME, DB_VERSION, STORE_NAME, DATA_KEY, LAST_UPDATED_KEY } from '../config/constants.js';

export async function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject('Error opening database');
        request.onsuccess = (event) => resolve(event.target.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
        };
    });
}

export async function saveToIndexedDB(key, data) {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const request = store.put({ key, value: data });
            
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject('Error saving to database');
            
            // Close the database connection when done
            request.onsuccess = () => {
                db.close();
            };
        });
    } catch (error) {
        console.error('Error in saveToIndexedDB:', error);
        throw error;
    }
}

export async function getFromIndexedDB(key) {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);
            
            request.onsuccess = () => {
                db.close();
                resolve(request.result?.value || null);
            };
            request.onerror = () => {
                db.close();
                reject('Error reading from database');
            };
        });
    } catch (error) {
        console.error('Error in getFromIndexedDB:', error);
        throw error;
    }
}

export async function clearIndexedDB() {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject('Error clearing database');
        });
    } catch (error) {
        console.error('Error in clearIndexedDB:', error);
        throw error;
    }
}

export { LAST_UPDATED_KEY } from '../config/constants.js';
