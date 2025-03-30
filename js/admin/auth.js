import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '../config/firebase.js';
import { showStatus } from './ui.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// List of allowed admin emails
const allowedEmails = ['gavrielgr@gmail.com'];

// Initialize auth state listener
export function initializeAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Check if user's email is allowed
            if (!allowedEmails.includes(user.email)) {
                await signOut(auth);
                showStatus('אין לך הרשאות גישה למערכת', 'error');
                return;
            }

            // Create or update user in Firestore
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                // First user with allowed email becomes admin
                await setDoc(userRef, {
                    email: user.email,
                    name: user.displayName,
                    role: 'admin',
                    createdAt: new Date().toISOString()
                });
            }

            // Only redirect to admin page if we're on the login page
            if (window.location.pathname === '/login.html') {
                window.location.href = '/admin.html';
            }
        } else {
            // User is signed out
            // Only redirect to login page if we're on the admin page
            if (window.location.pathname === '/admin.html') {
                window.location.href = '/login.html';
            }
        }
    });
}

// Sign in with Google
export async function signInWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        const result = await signInWithPopup(auth, provider);
        if (!result.user) {
            throw new Error('No user returned from sign in');
        }
    } catch (error) {
        console.error('Error signing in with Google:', error);
        showStatus('שגיאה בהתחברות עם Google', 'error');
    }
}

// Sign out
export async function signOutUser() {
    try {
        await signOut(auth);
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Error signing out:', error);
        showStatus('שגיאה בהתנתקות', 'error');
    }
} 