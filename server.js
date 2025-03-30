import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;

console.log('Server starting with configuration:');
console.log('Project ID:', FIREBASE_PROJECT_ID);

// אתחול Firebase Admin
try {
    const adminApp = initializeApp({
        credential: cert({
            projectId: FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
    });
    console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    process.exit(1);
}

const db = getFirestore();
const auth = getAuth();

// קאש בזיכרון
let cache = {
    services: null,
    categories: null,
    interestAreas: null,
    lastFetch: null
};

const CACHE_TTL = 5 * 60 * 1000; // 5 דקות בmilliseconds

function isCacheValid() {
    return cache.lastFetch && (Date.now() - cache.lastFetch) < CACHE_TTL;
}

// נקודת קצה לקבלת נתונים מ-Firestore
app.get('/api/data', async (req, res) => {
    try {
        console.log('Received request for /api/data');

        // בדיקה אם יש מידע בקאש ואם הוא עדיין תקף
        if (isCacheValid()) {
            console.log('Returning cached data');
            return res.json({
                services: cache.services,
                categories: cache.categories,
                interestAreas: cache.interestAreas
            });
        }

        console.log('Cache miss or expired, fetching fresh data...');
        
        console.log('Fetching services...');
        const servicesSnapshot = await db.collection('services').get();
        const services = servicesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(`Retrieved ${services.length} services`);
        
        console.log('Fetching categories...');
        const categoriesSnapshot = await db.collection('categories').get();
        const categories = categoriesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(`Retrieved ${categories.length} categories`);
        
        console.log('Fetching interest areas...');
        const interestAreasSnapshot = await db.collection('interestAreas').get();
        const interestAreas = interestAreasSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(`Retrieved ${interestAreas.length} interest areas`);
        
        // עדכון הקאש
        cache = {
            services,
            categories,
            interestAreas,
            lastFetch: Date.now()
        };
        
        const responseData = {
            services,
            categories,
            interestAreas
        };
        
        console.log('Sending response');
        res.json(responseData);
    } catch (error) {
        console.error('Error in /api/data:', error);
        
        // אם יש שגיאה אבל יש מידע בקאש, נחזיר אותו גם אם פג תוקפו
        if (cache.services) {
            console.log('Error occurred, returning stale cache data');
            return res.json({
                services: cache.services,
                categories: cache.categories,
                interestAreas: cache.interestAreas,
                fromStaleCache: true
            });
        }
        
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the API at http://localhost:${PORT}/api/data`);
}); 