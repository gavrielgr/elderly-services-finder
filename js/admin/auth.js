import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '../config/firebase.js';
import { showStatus } from './ui.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize auth state listener
export function initializeAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // בדיקת הרשאות מנהל ב-Firestore
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                // משתמש חדש - יצירת רשומה ב-Firestore
                await setDoc(userRef, {
                    email: user.email,
                    name: user.displayName,
                    role: 'user',
                    status: 'active',
                    createdAt: new Date().toISOString()
                });
                await signOut(auth);
                showStatus('אין לך הרשאות גישה למערכת', 'error');
                return;
            }

            const userData = userDoc.data();
            if (userData.role !== 'admin' || userData.status !== 'active') {
                await signOut(auth);
                showStatus('אין לך הרשאות גישה למערכת', 'error');
                return;
            }

            // רק אם המשתמש הוא מנהל פעיל, ממשיכים
            if (window.location.pathname === '/login.html') {
                window.location.href = '/admin.html';
            }
        } else {
            // משתמש לא מחובר - הפניה לדף התחברות
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