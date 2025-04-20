import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js';
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc,
    updateDoc,
    serverTimestamp,
    collection,
    addDoc
} from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js';
import { initializeFirebase } from '../config/firebase.js';

export class AdminAuth {
    constructor() {
        this.currentUser = null;
        this.currentAdmin = null;
        this.authInitialized = false;
        this.initializeAuth();
    }
    
    async initializeAuth() {
        try {
            // Initialize Firebase first
            const { auth, db } = await initializeFirebase();
            this.auth = auth;
            this.db = db;
            
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
                                    this.currentAdmin = this.currentUser;
                                    // Do NOT update lastLogin or log activity here on initial load
                                } else {
                                    this.currentUser = null;
                                    this.currentAdmin = null;
                                    // Don't throw error here, let login() handle it
                                }
                            } else {
                               // User exists in Auth but not in Firestore - treat as non-admin
                               this.currentUser = null;
                               this.currentAdmin = null;
                            }
                        } catch (error) {
                            console.error("Error fetching user data on auth state change:", error);
                            this.currentUser = null;
                            this.currentAdmin = null;
                        }
                    } else {
                        this.currentUser = null;
                        this.currentAdmin = null;
                    }
                    this.authInitialized = true;
                    resolve(); // Resolve the promise once initial state is known
                });
            });
            
            await this.authStatePromise;
        } catch (error) {
            console.error("Failed to initialize authentication:", error);
            this.authInitialized = true;
            this.currentUser = null;
            this.currentAdmin = null;
        }
    }

    async login() {
        try {
            await this.authStatePromise; // Wait for auth to be initialized
            
            const { auth, db } = await initializeFirebase();
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

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
                    this.currentAdmin = this.currentUser;

                    // Try to update lastLogin but continue even if it fails
                    try {
                        await updateDoc(doc(db, 'users', user.uid), {
                            lastLogin: serverTimestamp()
                        });
                    } catch (updateError) {
                        console.warn('Failed to update last login:', updateError);
                        // Continue despite the error
                    }
                    
                    // Go directly to admin page
                    window.location.href = '/admin';
                    return this.currentUser;
                } else {
                    // User exists but is not an active admin
                    this.currentUser = null;
                    this.currentAdmin = null;
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
                this.currentAdmin = null;
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
            const { auth } = await initializeFirebase();
            await signOut(auth);
        } catch (error) {
            console.warn('Logout error:', error);
        }
        this.currentUser = null;
        this.currentAdmin = null;
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }
    
    async checkPermission(permission) {
        if (!this.currentAdmin || this.currentAdmin.role !== 'admin') {
            console.warn(`Permission check failed for ${permission}: No admin user`);
            return false;
        }
        
        // For now, any admin has all permissions
        // In a more complex system, you could check specific permission fields
        return true;
    }
    
    // Method to support auth state listeners
    onAuthStateChanged(callback) {
        if (!this.auth) {
            // Not initialized yet - store the callback and call it once initialized
            this.authStatePromise.then(() => {
                callback(this.currentUser);
            });
            return () => {}; // Return dummy unsubscribe function
        }
        
        return onAuthStateChanged(this.auth, async (user) => {
            if (user) {
                try {
                    const userDoc = await getDoc(doc(this.db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        if (userData.role === 'admin' && userData.status === 'active') {
                            this.currentUser = {
                                uid: user.uid,
                                email: user.email,
                                name: user.displayName,
                                ...userData
                            };
                            this.currentAdmin = this.currentUser;
                            callback(this.currentUser);
                        } else {
                            this.currentUser = null;
                            this.currentAdmin = null;
                            callback(null);
                        }
                    } else {
                       this.currentUser = null;
                       this.currentAdmin = null; 
                       callback(null);
                    }
                } catch (error) {
                    console.error("Error in auth state change:", error);
                    this.currentUser = null;
                    this.currentAdmin = null;
                    callback(null);
                }
            } else {
                this.currentUser = null;
                this.currentAdmin = null;
                callback(null);
            }
        });
    }

    async logActivity(action) {
        if (!this.currentUser || this.currentUser.role !== 'admin') {
            console.warn('Attempted to log activity without admin privileges');
            return; 
        }
        
        try {
            const { db } = await initializeFirebase();
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