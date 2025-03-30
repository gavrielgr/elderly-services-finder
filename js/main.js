// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
let app;
let db;
let auth;

try {
  if (!firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    console.log('Firebase initialized successfully');
  } else {
    app = firebase.app();
    db = firebase.firestore();
    auth = firebase.auth();
    console.log('Using existing Firebase app');
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

// Import modules
import './ui/theme.js';
import './ui/search.js';
import './ui/categories.js';
import './ui/results.js';
import './ui/modal.js';
import './ui/install.js';
import './ui/scroll.js';
import './services/auth.js';
import './services/data.js';
