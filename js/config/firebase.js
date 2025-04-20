import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js';
import { getApiBaseUrl } from './app-config.js';

// Initialize Firebase with config from server
// Using let for mutable variables that will be initialized
let firebaseApp = null;
let firebaseDb = null;
let firebaseAuth = null;

// Async function to initialize Firebase
export async function initializeFirebase() {
  if (firebaseApp) {
    console.log('Firebase already initialized, returning existing instances');
    return { app: firebaseApp, db: firebaseDb, auth: firebaseAuth }; // Already initialized
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
    firebaseApp = initializeApp(firebaseConfig);
    
    // Initialize Firestore and Auth using the Firebase app
    firebaseDb = getFirestore(firebaseApp);
    firebaseAuth = getAuth(firebaseApp);
    
    // Also add to window for direct access in debugging
    if (typeof window !== 'undefined') {
      window._firebaseApp = firebaseApp;
      window._firebaseDb = firebaseDb;
      window._firebaseAuth = firebaseAuth;
    }
    
    console.log('Firebase initialized successfully');
    return { app: firebaseApp, db: firebaseDb, auth: firebaseAuth };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
}

// Helper function to get the Firebase app instance
export function getFirebaseApp() {
  return firebaseApp;
}

// Helper function to get the Firestore instance 
export function getFirebaseDb() {
  return firebaseDb;
}

// Helper function to get the Auth instance
export function getFirebaseAuth() {
  return firebaseAuth;
}

// Export named instances - they will be null until initializeFirebase() is called
export { firebaseApp as app, firebaseDb as db, firebaseAuth as auth }; 