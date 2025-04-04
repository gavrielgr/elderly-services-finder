// Netlify serverless function for data fetching
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK only once
let firebaseAdmin;
let db;

const initializeFirebaseAdmin = () => {
  if (!firebaseAdmin) {
    try {
      // Check for required environment variables
      if (!process.env.FIREBASE_PROJECT_ID || 
          !process.env.FIREBASE_CLIENT_EMAIL || 
          !process.env.FIREBASE_PRIVATE_KEY) {
        throw new Error('Firebase Admin SDK credentials missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.');
      }
      
      firebaseAdmin = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
      });
      db = getFirestore(firebaseAdmin);
      console.log('Firebase Admin SDK initialized in data function');
    } catch (error) {
      console.error('Error initializing Firebase Admin SDK:', error);
      throw error;
    }
  }
  return { app: firebaseAdmin, db };
};

// Cache for data
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

export const handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  try {
    console.log('Received request for data');

    // Check if we have valid cached data
    if (isCacheValid()) {
      console.log('Returning cached data');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          services: cache.services,
          categories: cache.categories,
          interestAreas: cache.interestAreas
        })
      };
    }

    console.log('Cache miss or expired, fetching fresh data...');
    
    // Initialize Firebase Admin and Firestore
    const { db } = initializeFirebaseAdmin();
    
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
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        services,
        categories,
        interestAreas
      })
    };
  } catch (error) {
    console.error('Error in data function:', error);
    
    // If we have cached data, return it even if expired
    if (cache.services) {
      console.log('Error occurred, returning stale cache data');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          services: cache.services,
          categories: cache.categories,
          interestAreas: cache.interestAreas,
          fromStaleCache: true
        })
      };
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        details: 'Failed to fetch data from Firestore. Firebase credentials may be invalid or missing.'
      })
    };
  }
}; 