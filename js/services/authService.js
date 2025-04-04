import { 
    GoogleAuthProvider, 
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { 
    doc, 
    getDoc, 
    setDoc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { initializeFirebase } from '../config/firebase.js';

// Auth service with real Firebase authentication
class AuthService {
    constructor() {
        this.currentUser = null;
        this.authInitialized = false;
        this.authListeners = [];
        
        // Initialize auth state tracking
        this.initialize();
    }
    
    async initialize() {
        try {
            // Initialize Firebase first
            const { auth, db } = await initializeFirebase();
            this.auth = auth;
            this.db = db;
            
            this.authStatePromise = new Promise((resolve) => {
                this.unsubscribe = onAuthStateChanged(this.auth, async (user) => {
                    if (user) {
                        try {
                            const userDoc = await getDoc(doc(this.db, 'users', user.uid));
                            if (userDoc.exists()) {
                                const userData = userDoc.data();
                                this.currentUser = {
                                    uid: user.uid,
                                    email: user.email,
                                    name: user.displayName,
                                    photoURL: user.photoURL,
                                    ...userData
                                };
                            } else {
                                // Create user document if it doesn't exist
                                await setDoc(doc(this.db, 'users', user.uid), {
                                    email: user.email,
                                    name: user.displayName,
                                    photoURL: user.photoURL,
                                    role: 'user',
                                    status: 'active',
                                    createdAt: serverTimestamp(),
                                    lastLogin: serverTimestamp()
                                });
                                
                                this.currentUser = {
                                    uid: user.uid,
                                    email: user.email,
                                    name: user.displayName,
                                    photoURL: user.photoURL,
                                    role: 'user',
                                    status: 'active'
                                };
                            }
                        } catch (error) {
                            console.error("Error fetching/creating user data:", error);
                            this.currentUser = null;
                        }
                    } else {
                        this.currentUser = null;
                    }
                    
                    this.authInitialized = true;
                    this._notifyListeners();
                    resolve();
                });
            });
        } catch (error) {
            console.error('Failed to initialize Firebase Auth:', error);
            this.authInitialized = false;
            this.currentUser = null;
            throw error;
        }
    }

    async loginWithGoogle() {
        try {
            const { auth, db } = await initializeFirebase();
            this.auth = auth;
            this.db = db;
            
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(this.auth, provider);
            const user = result.user;
            
            // Wait for auth state processing if needed
            if (!this.authInitialized) {
                await this.authStatePromise;
            }
            
            // Update last login time
            try {
                await updateDoc(doc(this.db, 'users', user.uid), {
                    lastLogin: serverTimestamp()
                });
            } catch (error) {
                console.warn('Failed to update last login time:', error);
            }
            
            return this.currentUser;
        } catch (error) {
            console.error('Google login error:', error);
            
            if (error.code !== 'auth/popup-closed-by-user') {
                throw error;
            }
            return null;
        }
    }

    async logout() {
        try {
            const { auth } = await initializeFirebase();
            this.auth = auth;
            
            await signOut(this.auth);
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            return false;
        }
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    onAuthStateChange(callback) {
        this.authListeners.push(callback);
        
        // If auth is already initialized, call the callback immediately
        if (this.authInitialized) {
            callback(this.currentUser);
        }
        
        // Return unsubscribe function
        return () => {
            this.authListeners = this.authListeners.filter(listener => listener !== callback);
        };
    }
    
    _notifyListeners() {
        this.authListeners.forEach(listener => {
            listener(this.currentUser);
        });
    }
}

// Export singleton instance
export const authService = new AuthService(); 