import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getApiBaseUrl } from './app-config.js';

// Initialization state tracking
let initializationPromise = null;
let initializationError = null;
let isInitialized = false;

// Instance variables
let firebaseApp = null;
let firebaseDb = null;
let firebaseAuth = null;

// Error handler function to standardize error logging
function handleError(error, message) {
  console.error(message, error);
  initializationError = error;
  throw error;
}

// Function to fetch config from server
async function fetchFirebaseConfig() {
  try {
    const apiUrl = `${getApiBaseUrl()}/api/config`;
    console.log(`Fetching Firebase config from: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Firebase configuration: ${response.status} ${response.statusText}`);
    }
    
    const config = await response.json();
    
    if (!config.apiKey || !config.projectId) {
      throw new Error('Invalid Firebase configuration received from server');
    }
    
    return config;
  } catch (error) {
    return handleError(error, 'Error fetching Firebase config:');
  }
}

// Async function to initialize Firebase
export async function initializeFirebase() {
  // If already fully initialized, return existing instances
  if (isInitialized && firebaseApp && firebaseDb && firebaseAuth) {
    console.log('Firebase already initialized, returning existing instances');
    return { app: firebaseApp, db: firebaseDb, auth: firebaseAuth };
  }
  
  // If initialization is in progress, wait for it to complete
  if (initializationPromise) {
    console.log('Firebase initialization already in progress, waiting...');
    return initializationPromise;
  }
  
  // If we previously had an error, clear it before trying again
  if (initializationError) {
    console.log('Previous initialization failed, retrying...');
    initializationError = null;
  }
  
  // Start initialization process
  console.log('Starting Firebase initialization...');
  
  // Create a promise for the initialization process
  initializationPromise = (async () => {
    try {
      // Fetch Firebase config
      const firebaseConfig = await fetchFirebaseConfig();
      console.log('Firebase config fetched successfully:', {
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
        hasApiKey: !!firebaseConfig.apiKey
      });
      
      // Initialize Firebase app if needed
      if (!firebaseApp) {
        console.log('Initializing Firebase app...');
        firebaseApp = initializeApp(firebaseConfig);
        console.log('Firebase app initialized:', firebaseApp.name);
      }
      
      // Initialize Firestore if needed
      if (!firebaseDb) {
        console.log('Initializing Firestore...');
        firebaseDb = getFirestore(firebaseApp);
        console.log('Firestore initialized:', firebaseDb);
      }
      
      // Initialize Auth if needed
      if (!firebaseAuth) {
        console.log('Initializing Auth...');
        firebaseAuth = getAuth(firebaseApp);
        console.log('Auth initialized:', firebaseAuth);
      }
      
      // Validate that all instances are properly initialized
      if (!firebaseApp || !firebaseDb || !firebaseAuth) {
        throw new Error('One or more Firebase services failed to initialize');
      }
      
      // Add to window for debugging if in browser environment
      if (typeof window !== 'undefined') {
        window._firebaseApp = firebaseApp;
        window._firebaseDb = firebaseDb;
        window._firebaseAuth = firebaseAuth;
      }
      
      // Mark as successfully initialized
      isInitialized = true;
      console.log('Firebase initialized successfully');
      
      return { app: firebaseApp, db: firebaseDb, auth: firebaseAuth };
    } catch (error) {
      // Clear the promise and mark as not initialized
      initializationPromise = null;
      isInitialized = false;
      initializationError = error;
      console.error('Error initializing Firebase:', error);
      throw error;
    }
  })();
  
  return initializationPromise;
}

// Helper function to get the Firebase app instance with verification
export function getFirebaseApp() {
  if (!isInitialized || !firebaseApp) {
    console.warn('Firebase app requested before initialization. Call initializeFirebase() first.');
  }
  return firebaseApp;
}

// Helper function to get the Firestore instance with verification
export function getFirebaseDb() {
  if (!isInitialized || !firebaseDb) {
    console.warn('Firestore requested before initialization. Call initializeFirebase() first.');
  }
  return firebaseDb;
}

// Helper function to get the Auth instance with verification
export function getFirebaseAuth() {
  if (!isInitialized || !firebaseAuth) {
    console.warn('Auth requested before initialization. Call initializeFirebase() first.');
  }
  return firebaseAuth;
}

// Check if Firebase is fully initialized
export function isFirebaseInitialized() {
  return isInitialized && !!firebaseApp && !!firebaseDb && !!firebaseAuth;
}

// Export named instances - they will be null until initializeFirebase() is called
export { firebaseApp as app, firebaseDb as db, firebaseAuth as auth }; 