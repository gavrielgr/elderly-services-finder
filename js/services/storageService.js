import { openDB } from 'idb';
import { DB_NAME } from '../config/constants.js';

const DB_VERSION = 2;
const STORE_NAME = 'app_data';

export const ALL_SERVICES_KEY = 'allServicesData';

let dbPromise;

async function getDB() {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            }
        });
    }
    return dbPromise;
}

export async function saveToIndexedDB(key, value) {
    try {
        const db = await getDB();
        await db.put(STORE_NAME, value, key);
        console.log(`Saved to IndexedDB: ${key}`);
    } catch (error) {
        console.error(`Error saving to IndexedDB (${key}):`, error);
        throw error;
    }
}

export async function getFromIndexedDB(key) {
    try {
        const db = await getDB();
        const value = await db.get(STORE_NAME, key);
        if (value) {
            console.log(`Retrieved from IndexedDB: ${key}`);
        }
        return value;
    } catch (error) {
        console.error(`Error reading from IndexedDB (${key}):`, error);
        return null;
    }
}

export async function clearIndexedDB() {
    try {
        const db = await getDB();
        await db.clear(STORE_NAME);
        console.log('IndexedDB cleared');
    } catch (error) {
        console.error('Error clearing IndexedDB:', error);
        throw error;
    }
}
