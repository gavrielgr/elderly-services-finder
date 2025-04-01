import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
app.use(cors({
  origin: [
    'https://elderly-service-finder.firebaseapp.com',
    'https://elderly-service-finder.web.app',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:5173',
    'http://localhost:5174'
  ],
  credentials: true
}));
app.use(express.json());

const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;

console.log('Server starting with configuration:');
console.log('Project ID:', FIREBASE_PROJECT_ID);
console.log('Environment:', process.env.NODE_ENV || 'development');

// Firebase Admin initialization
let auth;
let db;
let isFirebaseInitialized = false;

try {
    if (process.env.NODE_ENV === 'production') {
        const { initializeApp, cert } = await import('firebase-admin/app');
        const { getFirestore } = await import('firebase-admin/firestore');
        const { getAuth } = await import('firebase-admin/auth');
        
        const adminApp = initializeApp({
            credential: cert({
                projectId: FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
            })
        });
        
        db = getFirestore();
        auth = getAuth();
        isFirebaseInitialized = true;
        console.log('Firebase Admin SDK initialized successfully');
    } else {
        console.log('Running in development mode - Firebase Admin SDK not initialized');
    }
} catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    console.log('Continuing without Firebase Admin SDK');
}

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
        
        // Check if we're in development mode (Firebase not initialized)
        if (!isFirebaseInitialized || !db) {
            console.log('Development mode detected, returning mock data');
            
            // Create mock data for development
            const mockServices = [
                { id: 'service1', name: 'שירות לדוגמה 1', description: 'תיאור שירות לדוגמה 1', categoryId: 'cat1' },
                { id: 'service2', name: 'שירות לדוגמה 2', description: 'תיאור שירות לדוגמה 2', categoryId: 'cat2' },
                { id: 'service3', name: 'שירות לדוגמה 3', description: 'תיאור שירות לדוגמה 3', categoryId: 'cat1' }
            ];
            
            const mockCategories = [
                { id: 'cat1', name: 'קטגוריה 1', description: 'תיאור קטגוריה 1' },
                { id: 'cat2', name: 'קטגוריה 2', description: 'תיאור קטגוריה 2' }
            ];
            
            const mockInterestAreas = [
                { id: 'area1', name: 'תחום עניין 1', description: 'תיאור תחום עניין 1' },
                { id: 'area2', name: 'תחום עניין 2', description: 'תיאור תחום עניין 2' }
            ];
            
            // Update the cache with mock data
            cache = {
                services: mockServices,
                categories: mockCategories,
                interestAreas: mockInterestAreas,
                lastFetch: Date.now()
            };
            
            return res.json({
                services: mockServices,
                categories: mockCategories,
                interestAreas: mockInterestAreas,
                mockData: true
            });
        }
        
        // Production mode with Firebase initialized
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

// נקודת קצה מאובטחת לקונפיגורציית Firebase
app.get('/api/config', (req, res) => {
    try {
        // בדיקת המקור של הבקשה
        const origin = req.headers.origin || req.headers.referer;
        const allowedOrigins = [
            'https://elderly-service-finder.firebaseapp.com',
            'https://elderly-service-finder.web.app',
            'http://localhost:3000',
            'http://localhost:5000',
            'http://localhost:5173',
            'http://localhost:5174'
        ];
        
        // אם המקור אינו ברשימת המקורות המורשים, נחזיר שגיאה
        if (origin && !allowedOrigins.some(allowed => origin.startsWith(allowed))) {
            console.warn(`Unauthorized config request from: ${origin}`);
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // שליחת רק המידע הנדרש לקליינט בצורה מאובטחת
        // הערה: חלק מהמידע עדיין יהיה נגיש בצד הקליינט, אבל זה הכרחי לפעולה תקינה
        // ורצוי להגדיר כללי אבטחה מתאימים ב-Firebase
        const clientConfig = {
            apiKey: process.env.VITE_FIREBASE_API_KEY,
            authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.VITE_FIREBASE_APP_ID
        };
        
        res.json(clientConfig);
    } catch (error) {
        console.error('Error in /api/config:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// נקודת קצה לאתחול מאובטח של מערכת האימות
app.get('/api/auth/init', async (req, res) => {
    try {
        // בדיקת המקור של הבקשה כמו בנקודת הקצה הקודמת
        const origin = req.headers.origin || req.headers.referer;
        const allowedOrigins = [
            'https://elderly-service-finder.firebaseapp.com',
            'https://elderly-service-finder.web.app',
            'http://localhost:3000',
            'http://localhost:5000',
            'http://localhost:5173',
            'http://localhost:5174'
        ];
        
        if (origin && !allowedOrigins.some(allowed => origin.startsWith(allowed))) {
            console.warn(`Unauthorized auth init request from: ${origin}`);
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        if (isFirebaseInitialized && auth) {
            try {
                // יצירת טוקן אימות מיוחד בצד השרת
                const token = await auth.createCustomToken('server-auth');
                
                // החזרת טוקן האימות לקליינט
                res.json({
                    status: 'success',
                    authToken: token,
                    projectId: process.env.VITE_FIREBASE_PROJECT_ID
                });
            } catch (error) {
                console.error('Error creating auth token:', error);
                res.status(500).json({ error: 'Authentication token creation failed' });
            }
        } else {
            // For development mode, send a mock token
            console.log('Sending mock auth token for development mode');
            res.json({
                status: 'success',
                authToken: 'dev-mock-token-12345',
                projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'elderly-service-finder',
                developmentMode: true
            });
        }
    } catch (error) {
        console.error('Error in /api/auth/init:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a static file middleware for development only
if (process.env.NODE_ENV !== 'production') {
    // For development, serve static files
    app.use(express.static(__dirname));
    
    // Fallback route for all other requests in development
    app.get('*', (req, res) => {
        // Only serve HTML/static files for GET requests
        if (req.method === 'GET' && !req.path.startsWith('/api/')) {
            if (req.path === '/login') {
                res.sendFile(__dirname + '/login.html');
            } else {
                res.sendFile(__dirname + '/index.html');
            }
        } else {
            res.status(404).json({ error: 'Not found' });
        }
    });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the API at http://localhost:${PORT}/api/data`);
}); 