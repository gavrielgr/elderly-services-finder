import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc,
    updateDoc,
    serverTimestamp,
    collection,
    addDoc
} from 'firebase/firestore';
import { app } from '../config/firebase.js';

const auth = getAuth(app);
const db = getFirestore(app);

export class AdminAuth {
    constructor() {
        this.currentUser = null;
        this.authInitialized = false; // Flag to check if initial auth state is processed
        this.authStatePromise = new Promise((resolve) => {
            const unsubscribe = onAuthStateChanged(auth, async (user) => {
                if (user) {
                    try {
                        const userDoc = await getDoc(doc(db, 'users', user.uid));
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            if (userData.role === 'admin' && userData.status === 'active') {
                                this.currentUser = {
                                    uid: user.uid,
                                    email: user.email,
                                    name: user.displayName,
                                    ...userData
                                };
                                // Do NOT update lastLogin or log activity here on initial load
                            } else {
                                this.currentUser = null;
                                // Don't throw error here, let login() handle it
                            }
                        } else {
                           // User exists in Auth but not in Firestore - treat as non-admin
                           this.currentUser = null; 
                        }
                    } catch (error) {
                        console.error("Error fetching user data on auth state change:", error);
                        this.currentUser = null;
                    }
                } else {
                    this.currentUser = null;
                }
                this.authInitialized = true;
                resolve(); // Resolve the promise once initial state is known
                // Keep listening for future changes if needed, or unsubscribe if only initial check is desired.
                // For a persistent login system, keeping the listener is usually correct.
            });
        });
    }

    async login() {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            // Wait for auth state processing if it hasn't finished
            if (!this.authInitialized) {
                await this.authStatePromise;
            }

            // Re-check user data after login popup
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.role === 'admin' && userData.status === 'active') {
                    this.currentUser = {
                        uid: user.uid,
                        email: user.email,
                        name: user.displayName,
                        ...userData
                    };

                    // Try to update lastLogin but continue even if it fails
                    try {
                        await updateDoc(doc(db, 'users', user.uid), {
                            lastLogin: serverTimestamp()
                        });
                    } catch (updateError) {
                        console.warn('Failed to update last login:', updateError);
                        // Continue despite the error
                    }
                    
                    // Skip activity logging to avoid potential permission error
                    // Go directly to admin page instead of trying to log
                    window.location.href = '/admin';
                    return this.currentUser;
                } else {
                    // User exists but is not an active admin
                    this.currentUser = null;
                    try {
                        await signOut(auth); // Just sign out without logging
                    } catch (error) {
                        console.warn('Failed to sign out:', error);
                    }
                    throw new Error('אין לך הרשאות מנהל');
                }
            } else {
                // User logged in via Google but doesn't exist in our 'users' collection
                try {
                    await setDoc(doc(db, 'users', user.uid), {
                        email: user.email,
                        name: user.displayName,
                        role: 'user',
                        status: 'pending',
                        createdAt: serverTimestamp(),
                        lastLogin: serverTimestamp()
                    });
                } catch (createError) {
                    console.warn('Failed to create user document:', createError);
                    // Continue despite error
                }
                this.currentUser = null;
                try {
                    await signOut(auth); // Just sign out without logging
                } catch (error) {
                    console.warn('Failed to sign out:', error);
                }
                throw new Error('חשבון משתמש נוצר. אין לך הרשאות מנהל. אנא פנה למנהל המערכת.');
            }
        } catch (error) {
            console.error('Login process error:', error);
            if (error.code !== 'auth/popup-closed-by-user') {
                let errorMsg = 'שגיאה בתהליך ההתחברות';
                if (error.message && error.message.includes("הרשאות")) {
                    errorMsg = error.message;
                }
                const showErrorFn = window.showError || function(msg) { 
                    console.error('Login error:', msg); 
                };
                showErrorFn(errorMsg);
            }
            // Don't re-throw
        }
    }

    async logout() {
        try {
            await signOut(auth);
        } catch (error) {
            console.warn('Logout error:', error);
        }
        this.currentUser = null;
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }

    async logActivity(action) {
        // Don't even try if not admin
        if (!this.currentUser || this.currentUser.role !== 'admin') {
            console.warn('Attempted to log activity without admin privileges');
            return; 
        }
        
        try {
            const activityRef = collection(db, 'activities');
            await addDoc(activityRef, {
                userId: this.currentUser.uid,
                userName: this.currentUser.name,
                action,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.warn('Failed to log activity:', error);
        }
    }
}

// Export singleton instance
export const adminAuth = new AdminAuth(); 