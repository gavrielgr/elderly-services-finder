import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getApiBaseUrl } from './app-config.js';

// Initialize Firebase with config from server
let app, db, auth;

// Async function to initialize Firebase
export async function initializeFirebase() {
  if (app) {
    return { app, db, auth }; // Already initialized
  }
  
  try {
    // Fetch Firebase config securely from server
    const apiUrl = `${getApiBaseUrl()}/api/config`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Firebase configuration: ${response.status} ${response.statusText}`);
    }
    
    const firebaseConfig = await response.json();
    
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      throw new Error('Invalid Firebase configuration received from server');
    }
    
    // Initialize Firebase with server-provided config
    // This does NOT require authentication - anyone can initialize and read public data
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    
    console.log('Firebase initialized successfully');
    return { app, db, auth };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
}

// Export empty instances initially - must call initializeFirebase() first
export { app, db, auth }; 