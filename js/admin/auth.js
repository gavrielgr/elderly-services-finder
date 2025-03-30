import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '../config/firebase.js';
import { showStatus } from './ui.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// List of allowed admin emails (temporary solution until Firestore quota resets)
const TEMP_ALLOWED_ADMINS = ['gavriel.tablet@gmail.com', 'gavrielgr@gmail.com', 'a.pinhasy@gmail.com'];

// Initialize auth state listener
export function initializeAuth() {
    return new Promise((resolve, reject) => {
        console.log('Starting auth state check...');
        onAuthStateChanged(auth, async (user) => {
            try {
                if (user) {
                    console.log('User is signed in:', user.email);
                    
                    // פתרון זמני - בדיקה מול רשימת אדמינים מקומית
                    if (TEMP_ALLOWED_ADMINS.includes(user.email)) {
                        console.log('User is in temporary admin list');
                        if (window.location.pathname === '/login.html') {
                            window.location.href = '/admin.html';
                        }
                        resolve({ email: user.email, role: 'admin', status: 'active' });
                        return;
                    }

                    try {
                        // בדיקת הרשאות מנהל ב-Firestore
                        const userRef = doc(db, 'users', user.uid);
                        const userDoc = await getDoc(userRef);

                        console.log('Checking if user exists in Firestore:', userDoc.exists());

                        if (!userDoc.exists()) {
                            console.log('User not found in Firestore');
                            await signOut(auth);
                            window.location.href = '/login.html';
                            showStatus('אין לך הרשאות גישה למערכת', 'error');
                            reject(new Error('User not found'));
                            return;
                        }

                        const userData = userDoc.data();
                        console.log('User data from Firestore:', {
                            email: userData.email,
                            role: userData.role,
                            status: userData.status
                        });

                        if (userData.role !== 'admin' || userData.status !== 'active') {
                            console.log('User is not an active admin');
                            await signOut(auth);
                            window.location.href = '/login.html';
                            showStatus('אין לך הרשאות גישה למערכת', 'error');
                            reject(new Error('User not authorized'));
                            return;
                        }

                        // רק אם המשתמש הוא מנהל פעיל, ממשיכים
                        if (window.location.pathname === '/login.html') {
                            console.log('Redirecting to admin page');
                            window.location.href = '/admin.html';
                        }
                        resolve(userData);
                    } catch (error) {
                        console.error('Error checking Firestore:', error);
                        // אם יש שגיאת Quota, נבדוק מול הרשימה המקומית
                        if (TEMP_ALLOWED_ADMINS.includes(user.email)) {
                            console.log('Firestore error but user is in temporary admin list');
                            if (window.location.pathname === '/login.html') {
                                window.location.href = '/admin.html';
                            }
                            resolve({ email: user.email, role: 'admin', status: 'active' });
                            return;
                        }
                        throw error;
                    }
                } else {
                    console.log('No user is signed in');
                    // משתמש לא מחובר - הפניה לדף התחברות
                    if (window.location.pathname !== '/login.html') {
                        window.location.href = '/login.html';
                    }
                    reject(new Error('User not logged in'));
                }
            } catch (error) {
                console.error('Detailed error in auth state change:', error);
                reject(error);
            }
        });
    });
}

// Sign in with Google
export async function signInWithGoogle() {
    try {
        console.log('Starting Google sign in process...');
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        const result = await signInWithPopup(auth, provider);
        if (!result.user) {
            console.error('No user returned from sign in');
            throw new Error('No user returned from sign in');
        }
        
        console.log('User signed in with Google:', result.user.email);

        // פתרון זמני - בדיקה מול רשימת אדמינים מקומית
        if (TEMP_ALLOWED_ADMINS.includes(result.user.email)) {
            console.log('User is in temporary admin list');
            window.location.href = '/admin.html';
            return;
        }

        try {
            // בדיקה אם המשתמש קיים בפיירסטור
            const userRef = doc(db, 'users', result.user.uid);
            const userDoc = await getDoc(userRef);

            console.log('Checking if user exists in Firestore:', userDoc.exists());
            
            if (!userDoc.exists()) {
                console.log('User does not exist in Firestore');
                await signOut(auth);
                showStatus('אין לך הרשאות גישה למערכת. אנא פנה למנהל המערכת', 'error');
                window.location.href = '/login.html';
                return;
            }

            // בדיקת הרשאות
            const userData = userDoc.data();
            console.log('User data from Firestore:', {
                email: userData.email,
                role: userData.role,
                status: userData.status
            });

            if (userData.role !== 'admin' || userData.status !== 'active') {
                console.log('User is not an active admin');
                await signOut(auth);
                showStatus('אין לך הרשאות גישה למערכת', 'error');
                window.location.href = '/login.html';
                return;
            }

            // עדכון זמן התחברות אחרון למשתמש מורשה
            await setDoc(userRef, {
                metadata: {
                    lastLogin: new Date().toISOString()
                }
            }, { merge: true });

            console.log('User successfully authenticated and authorized');
            window.location.href = '/admin.html';
        } catch (error) {
            console.error('Error checking Firestore:', error);
            // אם יש שגיאת Quota, נבדוק מול הרשימה המקומית
            if (TEMP_ALLOWED_ADMINS.includes(result.user.email)) {
                console.log('Firestore error but user is in temporary admin list');
                window.location.href = '/admin.html';
                return;
            }
            throw error;
        }
    } catch (error) {
        console.error('Detailed error in Google sign in:', error);
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