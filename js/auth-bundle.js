/**
 * Auth Bundle Entry Point
 * 
 * This file bundles all authentication-related functionality
 * for use in login.html and admin.html
 */

// Import Firebase SDK pieces
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Import local modules
import appConfig from './config/app-config.js';
import { 
  initializeFirebase, 
  getFirebaseApp,
  app as firebaseApp, 
  db as firebaseDb, 
  auth as firebaseAuth 
} from './config/firebase.js';
import { authService } from './services/authService.js';

// Export everything
export { 
  // App config
  appConfig,
  
  // Firebase SDK
  initializeApp,
  getFirestore,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  
  // Firebase initialization
  initializeFirebase,
  getFirebaseApp,
  firebaseApp,
  firebaseDb,
  firebaseAuth,
  
  // Auth service
  authService
}; 