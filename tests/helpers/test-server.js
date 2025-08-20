import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Define PORT for testing
const PORT = process.env.TEST_PORT || 5002;

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

// In-memory cache for testing
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

// Test data
const testServices = [
  {
    id: "service-1",
    name: "מרכז רפואי הדסה",
    description: "בית חולים מוביל המתמחה ברפואה מתקדמת",
    category: "health",
    city: "ירושלים",
    phones: [{ number: "02-6777111", description: "מוקד ראשי" }]
  },
  {
    id: "service-2",
    name: "בית אבות נופי ירושלים",
    description: "מרכז מגורים לקשישים עם שירותים מקיפים",
    category: "elderly-care",
    city: "ירושלים",
    phones: [{ number: "02-5551234", description: "מזכירות" }]
  }
];

const testCategories = [
  { id: "health", name: "בריאות", description: "שירותי בריאות וטיפול", order: 1 },
  { id: "elderly-care", name: "דיור לקשישים", description: "אפשרויות דיור לקשישים", order: 2 }
];

const testInterestAreas = [
  { id: "medical", name: "שירותים רפואיים", description: "טיפולים רפואיים" },
  { id: "housing", name: "דיור", description: "אפשרויות מגורים לקשישים" }
];

// Mock whether Firebase is initialized for testing
let isFirebaseInitialized = true;
let isUnauthenticatedTest = false;
let isServerErrorTest = false;

// Allow tests to control the Firebase initialization state
export function setFirebaseInitialized(value) {
  isFirebaseInitialized = value;
}

// Allow tests to simulate unauthorized access
export function setUnauthenticatedTest(value) {
  isUnauthenticatedTest = value;
}

// Allow tests to simulate server errors
export function setServerErrorTest(value) {
  isServerErrorTest = value;
}

// Reset all test conditions
export function resetTestConditions() {
  isFirebaseInitialized = true;
  isUnauthenticatedTest = false;
  isServerErrorTest = false;
  
  // Reset cache
  cache = {
    services: null,
    categories: null,
    interestAreas: null,
    lastFetch: null
  };
}

// Fill cache with test data
export function populateCache() {
  cache = {
    services: testServices,
    categories: testCategories,
    interestAreas: testInterestAreas,
    lastFetch: Date.now()
  };
}

// Clear the cache
export function clearCache() {
  cache = {
    services: null,
    categories: null,
    interestAreas: null,
    lastFetch: null
  };
}

// Endpoint to get data from Firestore
app.get('/api/data', async (req, res) => {
  try {
    console.log('Test server: Received request for /api/data');
    
    // Simulate server error if enabled
    if (isServerErrorTest) {
      // Check if we have cached data for stale cache test
      if (cache.services) {
        console.log('Test server: Error occurred, returning stale cache data');
        return res.json({
          services: cache.services,
          categories: cache.categories,
          interestAreas: cache.interestAreas,
          fromStaleCache: true
        });
      }
      
      return res.status(500).json({ error: 'Simulated server error' });
    }

    // Check if we have valid cached data
    if (isCacheValid()) {
      console.log('Test server: Returning cached data');
      return res.json({
        services: cache.services,
        categories: cache.categories,
        interestAreas: cache.interestAreas
      });
    }

    console.log('Test server: Cache miss or expired, fetching fresh data...');
    
    // Ensure Firebase is initialized (simulated)
    if (!isFirebaseInitialized) {
      // Check if we have cached data for stale cache test
      if (cache.services) {
        console.log('Test server: Error occurred, returning stale cache data');
        return res.json({
          services: cache.services,
          categories: cache.categories,
          interestAreas: cache.interestAreas,
          fromStaleCache: true
        });
      }
      
      return res.status(500).json({ 
        error: 'Firebase not initialized', 
        message: 'Check Firebase credentials in server environment'
      });
    }
    
    // Return test data
    const responseData = {
      services: testServices,
      categories: testCategories,
      interestAreas: testInterestAreas
    };
    
    // Update cache
    cache = {
      ...responseData,
      lastFetch: Date.now()
    };
    
    console.log('Test server: Sending response');
    res.json(responseData);
  } catch (error) {
    console.error('Test server: Error in /api/data:', error);
    
    // If there's an error but we have cached data, return it even if expired
    if (cache.services) {
      console.log('Test server: Error occurred, returning stale cache data');
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
    
    if (isUnauthenticatedTest || (origin && !allowedOrigins.some(allowed => origin.startsWith(allowed)))) {
      console.warn(`Test server: Unauthorized config request from origin: ${origin}`);
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Send test configuration
    const clientConfig = {
      apiKey: 'test-api-key',
      authDomain: 'test-project.firebaseapp.com',
      projectId: 'test-project',
      storageBucket: 'test-project.appspot.com',
      messagingSenderId: 'test-sender-id',
      appId: 'test-app-id'
    };
    
    res.json(clientConfig);
  } catch (error) {
    console.error('Test server: Error in /api/config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Authentication initialization endpoint
app.get('/api/auth/init', async (req, res) => {
  try {
    // Check request origin
    const origin = req.headers.origin || req.headers.referer;
    const allowedOrigins = getAllowedOrigins();
    
    if (isUnauthenticatedTest || (origin && !allowedOrigins.some(allowed => origin.startsWith(allowed)))) {
      console.warn(`Test server: Unauthorized auth init request from: ${origin}`);
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (!isFirebaseInitialized) {
      return res.status(500).json({ 
        error: 'Firebase Auth not initialized',
        message: 'Check Firebase credentials in server environment'
      });
    }
    
    // Return a test token
    res.json({
      status: 'success',
      authToken: 'test-auth-token',
      projectId: 'test-project'
    });
  } catch (error) {
    console.error('Test server: Error in auth initialization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Server-side API endpoint to get service ratings
app.get('/api/ratings/:serviceId', async (req, res) => {
  try {
    const serviceId = req.params.serviceId;
    
    // Simulate server error if enabled
    if (isServerErrorTest) {
      return res.status(500).json({ error: 'Simulated server error' });
    }
    
    if (!isFirebaseInitialized) {
      return res.status(500).json({ 
        error: 'Firebase not initialized',
        message: 'Check Firebase credentials in server environment'
      });
    }
    
    // Return test ratings data
    const ratings = [
      {
        id: 'rating-1',
        serviceId: serviceId,
        rating: 5,
        comment: 'שירות מצוין!',
        userName: 'יעקב כהן',
        timestamp: new Date().toISOString(),
        moderation: { status: 'approved' }
      },
      {
        id: 'rating-2',
        serviceId: serviceId,
        rating: 4,
        comment: 'שירות טוב מאוד',
        userName: 'רחל לוי',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        moderation: { status: 'approved' }
      }
    ];
    
    return res.json({ ratings });
  } catch (error) {
    console.error('Test server: Error fetching ratings:', error);
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
    
    // Simulate server error if enabled
    if (isServerErrorTest) {
      return res.status(500).json({ error: 'Simulated server error' });
    }
    
    // Try to load service from cache first
    if (cache.services) {
      const cachedService = cache.services.find(s => s.id === serviceId);
      if (cachedService) {
        return res.json(cachedService);
      }
    }
    
    // Find the service in test data
    const service = testServices.find(s => s.id === serviceId);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Return the service data
    res.json(service);
  } catch (error) {
    console.error('Test server: Error fetching service:', error);
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
    
    // Simulate server error if enabled
    if (isServerErrorTest) {
      return res.status(500).json({ error: 'Simulated server error' });
    }
    
    // Try to get the version from cache first
    if (cache.services) {
      const cachedService = cache.services.find(s => s.id === serviceId);
      if (cachedService) {
        return res.json({ 
          serviceId, 
          updated: new Date().toISOString(),
          source: 'cache'
        });
      }
    }
    
    // Find the service in test data
    const service = testServices.find(s => s.id === serviceId);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json({ 
      serviceId, 
      updated: new Date().toISOString(),
      source: 'firestore'
    });
  } catch (error) {
    console.error('Test server: Error checking service version:', error);
    res.status(500).json({ 
      error: 'Failed to check service version',
      message: error.message
    });
  }
});

// Start the server only if not being imported as a module
let server;

if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });
}

// Export for testing
// Handle non-existent API endpoints
app.all('/api/*', (_, res) => {
  // If the request wasn't handled by previous routes, it's a 404
  res.status(404).json({ error: 'API endpoint not found' });
});

export { app, server, PORT };