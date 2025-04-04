import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch'; // For Node.js versions that don't have fetch built-in

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Define PORT at the top so it's available throughout the file
const PORT = process.env.PORT || 5001;

// Generate localhost origins for a range of ports
const generateLocalhostOrigins = (startPort, endPort) => {
  const origins = [];
  for (let port = startPort; port <= endPort; port++) {
    origins.push(`http://localhost:${port}`);
  }
  return origins;
};

// Get allowed origins including production and all potential local ports
const getAllowedOrigins = () => {
  return [
    'https://elderly-service-finder.firebaseapp.com',
    'https://elderly-service-finder.web.app',
    ...generateLocalhostOrigins(3000, 3010),
    ...generateLocalhostOrigins(5000, 5200)
  ];
};

const app = express();
app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true
}));
app.use(express.json());

const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;

console.log('Server starting with configuration:');
console.log('Project ID:', FIREBASE_PROJECT_ID);

// Firebase Admin initialization
let auth;
let db;
let isFirebaseInitialized = false;

try {
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
} catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    console.log('Server will not be able to perform admin operations');
}

// In-memory cache
let cache = {
    services: null,
    categories: null,
    interestAreas: null,
    lastFetch: null
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

function isCacheValid() {
    return cache.lastFetch && (Date.now() - cache.lastFetch) < CACHE_TTL;
}

// Endpoint to get data from Firestore
app.get('/api/data', async (req, res) => {
    try {
        console.log('Received request for /api/data');

        // Check if we have valid cached data
        if (isCacheValid()) {
            console.log('Returning cached data');
            return res.json({
                services: cache.services,
                categories: cache.categories,
                interestAreas: cache.interestAreas
            });
        }

        console.log('Cache miss or expired, fetching fresh data...');
        
        // Ensure Firebase is initialized
        if (!isFirebaseInitialized || !db) {
            return res.status(500).json({ 
                error: 'Firebase not initialized', 
                message: 'Check Firebase credentials in server environment'
            });
        }
        
        // Fetch data from Firestore
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
        
        // Update cache
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
        
        // If there's an error but we have cached data, return it even if expired
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

// Endpoint for the client to get Firebase config
app.get('/api/config', (req, res) => {
    try {
        // Check request origin
        const origin = req.headers.origin || req.headers.referer;
        const allowedOrigins = getAllowedOrigins();
        
        if (origin && !allowedOrigins.some(allowed => origin.startsWith(allowed))) {
            console.warn(`Unauthorized config request from origin: ${origin}`);
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Send only necessary information to the client securely
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

// Authentication initialization endpoint
app.get('/api/auth/init', async (req, res) => {
    try {
        // Check request origin
        const origin = req.headers.origin || req.headers.referer;
        const allowedOrigins = getAllowedOrigins();
        
        if (origin && !allowedOrigins.some(allowed => origin.startsWith(allowed))) {
            console.warn(`Unauthorized auth init request from: ${origin}`);
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        if (!isFirebaseInitialized || !auth) {
            return res.status(500).json({ 
                error: 'Firebase Auth not initialized',
                message: 'Check Firebase credentials in server environment'
            });
        }
        
        // Create auth token for server auth
        try {
            const token = await auth.createCustomToken('server-auth');
            res.json({
                status: 'success',
                authToken: token,
                projectId: process.env.VITE_FIREBASE_PROJECT_ID
            });
        } catch (error) {
            console.error('Error creating auth token:', error);
            res.status(500).json({ error: 'Authentication token creation failed' });
        }
    } catch (error) {
        console.error('Error in auth initialization:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Server-side API endpoint to get service ratings
app.get('/api/ratings/:serviceId', async (req, res) => {
    try {
        const serviceId = req.params.serviceId;
        
        // If Firebase Admin initialized successfully, use it
        if (isFirebaseInitialized && db) {
            // Query for approved ratings for this service using admin access
            const ratingsSnapshot = await db.collection('ratings')
                .where('serviceId', '==', serviceId)
                .where('moderation.status', '==', 'approved')
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();
                
            // Transform to array of rating objects
            const ratings = ratingsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            return res.json({ ratings });
        } else {
            // Load Firebase Web SDK dynamically
            console.log('Admin SDK not available, using Firestore Web SDK instead');
            const { initializeApp } = await import('firebase/app');
            const { getFirestore, collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');
            
            // Get Firebase config
            const apiUrl = `http://localhost:${PORT}/api/config`;
            const configResponse = await fetch(apiUrl);
            if (!configResponse.ok) {
                throw new Error('Failed to fetch Firebase config');
            }
            
            const firebaseConfig = await configResponse.json();
            const app = initializeApp(firebaseConfig);
            const webDb = getFirestore(app);
            
            // Query for approved ratings for this service
            const ratingsQuery = query(
                collection(webDb, 'ratings'),
                where('serviceId', '==', serviceId),
                where('moderation.status', '==', 'approved'),
                orderBy('timestamp', 'desc'),
                limit(10)
            );
            
            const snapshot = await getDocs(ratingsQuery);
            
            // Transform to array of rating objects
            const ratings = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            return res.json({ ratings });
        }
    } catch (error) {
        console.error('Error fetching ratings:', error);
        res.status(500).json({ 
            error: 'Failed to fetch ratings',
            message: error.message
        });
    }
});

// Endpoint to get a single service by ID
app.get('/api/service/:serviceId', async (req, res) => {
    try {
        const serviceId = req.params.serviceId;
        
        // Try to load service from cache first
        if (cache.services) {
            const cachedService = cache.services.find(s => s.id === serviceId);
            if (cachedService) {
                return res.json(cachedService);
            }
        }
        
        // If not in cache or Firebase Admin is not initialized, try using Firestore Web SDK
        const { initializeApp } = await import('firebase/app');
        const { getFirestore, doc, getDoc } = await import('firebase/firestore');
        
        // Get Firebase config
        const apiUrl = `http://localhost:${PORT}/api/config`;
        const configResponse = await fetch(apiUrl);
        if (!configResponse.ok) {
            throw new Error('Failed to fetch Firebase config');
        }
        
        const firebaseConfig = await configResponse.json();
        const app = initializeApp(firebaseConfig);
        const webDb = getFirestore(app);
        
        // Get the service document
        const serviceDoc = await getDoc(doc(webDb, 'services', serviceId));
        
        if (!serviceDoc.exists()) {
            return res.status(404).json({ error: 'Service not found' });
        }
        
        // Return the service data
        const serviceData = {
            id: serviceDoc.id,
            ...serviceDoc.data()
        };
        
        res.json(serviceData);
    } catch (error) {
        console.error('Error fetching service:', error);
        res.status(500).json({ 
            error: 'Failed to fetch service',
            message: error.message
        });
    }
});

// Lightweight endpoint to check service version/timestamp
app.get('/api/service-version/:serviceId', async (req, res) => {
    try {
        const serviceId = req.params.serviceId;
        
        // Try to get the version from cache first
        if (cache.services) {
            const cachedService = cache.services.find(s => s.id === serviceId);
            if (cachedService) {
                const updated = cachedService.metadata?.updated || 
                               (cachedService.updatedAt?.seconds ? 
                                new Date(cachedService.updatedAt.seconds * 1000).toISOString() : 
                                null);
                                
                return res.json({ 
                    serviceId, 
                    updated,
                    source: 'cache'
                });
            }
        }
        
        // If not in cache, try using Firestore Web SDK
        const { initializeApp } = await import('firebase/app');
        const { getFirestore, doc, getDoc } = await import('firebase/firestore');
        
        // Get Firebase config
        const apiUrl = `http://localhost:${PORT}/api/config`;
        const configResponse = await fetch(apiUrl);
        if (!configResponse.ok) {
            throw new Error('Failed to fetch Firebase config');
        }
        
        const firebaseConfig = await configResponse.json();
        const app = initializeApp(firebaseConfig);
        const webDb = getFirestore(app);
        
        // Get only the metadata field from the service document
        const serviceDoc = await getDoc(doc(webDb, 'services', serviceId));
        
        if (!serviceDoc.exists()) {
            return res.status(404).json({ error: 'Service not found' });
        }
        
        // Get the updated timestamp
        const data = serviceDoc.data();
        const updated = data.metadata?.updated || 
                       (data.updatedAt?.seconds ? 
                        new Date(data.updatedAt.seconds * 1000).toISOString() : 
                        null);
        
        res.json({ 
            serviceId, 
            updated,
            source: 'firestore'
        });
    } catch (error) {
        console.error('Error checking service version:', error);
        res.status(500).json({ 
            error: 'Failed to check service version',
            message: error.message
        });
    }
});

// Serve static files 
app.use(express.static('public'));

// Handle SPA routes
app.get('*', (req, res) => {
    // Only serve HTML/static files for GET requests
    if (req.method === 'GET' && !req.path.startsWith('/api/')) {
        if (req.path === '/login' || req.path === '/login.html') {
            res.sendFile(__dirname + '/login.html');
        } else if (req.path === '/admin' || req.path === '/admin.html') {
            res.sendFile(__dirname + '/admin.html');
        } else {
            res.sendFile(__dirname + '/index.html');
        }
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the API at http://localhost:${PORT}/api/data`);
}); 