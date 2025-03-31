import { auth, db } from '../config/firebase.js';
import { 
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged 
} from 'firebase/auth';
import { 
    doc, 
    getDoc,
    setDoc,
    collection,
    addDoc,
    serverTimestamp 
} from 'firebase/firestore';

export class AdminAuth {
    constructor() {
        this.currentAdmin = null;
        this.authStateListeners = new Set();
        this.googleProvider = new GoogleAuthProvider();
        
        // Listen to auth state changes
        onAuthStateChanged(auth, (user) => {
            this.handleAuthStateChange(user);
        });
    }

    async login() {
        try {
            // 1. Firebase authentication with Google
            const userCredential = await signInWithPopup(auth, this.googleProvider);
            
            // 2. Check if user exists in users collection
            const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
            
            if (!userDoc.exists()) {
                // Create new user document
                await setDoc(doc(db, 'users', userCredential.user.uid), {
                    email: userCredential.user.email,
                    name: userCredential.user.displayName,
                    role: 'user',
                    status: 'pending',
                    createdAt: serverTimestamp(),
                    provider: 'google.com'
                });
                
                await signOut(auth);
                throw new Error('unauthorized_new_user');
            }

            const userData = userDoc.data();
            if (userData.role !== 'admin' || userData.status !== 'active') {
                await signOut(auth);
                throw new Error('unauthorized');
            }

            // 3. Log successful login
            try {
                await this.logActivity(userCredential.user.uid, 'login', {
                    timestamp: serverTimestamp(),
                    success: true
                });
            } catch (error) {
                console.warn('Failed to log activity:', error);
                // Continue despite logging failure
            }

            return {
                uid: userCredential.user.uid,
                email: userCredential.user.email,
                ...userData
            };

        } catch (error) {
            // Log failed attempt if possible
            try {
                await this.logActivity(null, 'login_failed', {
                    timestamp: serverTimestamp(),
                    error: error.message
                });
            } catch (logError) {
                console.warn('Failed to log failed login attempt:', logError);
            }
            
            if (error.message === 'unauthorized_new_user') {
                throw new Error('המשתמש נרשם בהצלחה אך מחכה לאישור מנהל');
            } else if (error.message === 'unauthorized') {
                throw new Error('אין לך הרשאות מנהל');
            } else {
                throw new Error('אימות נכשל');
            }
        }
    }

    async logout() {
        if (this.currentAdmin) {
            try {
                await this.logActivity(this.currentAdmin.uid, 'logout', {
                    timestamp: serverTimestamp()
                });
            } catch (error) {
                console.warn('Failed to log logout:', error);
            }
        }
        await signOut(auth);
    }

    async checkPermission(permission) {
        if (!this.currentAdmin) return false;
        
        const userDoc = await getDoc(doc(db, 'users', this.currentAdmin.uid));
        if (!userDoc.exists()) return false;
        
        return userDoc.data().permissions?.includes(permission) || false;
    }

    async logActivity(adminId, action, details) {
        try {
            await addDoc(collection(db, 'admin_logs'), {
                adminId,
                action,
                details,
                timestamp: serverTimestamp(),
                userAgent: navigator.userAgent
            });
        } catch (error) {
            console.warn('Failed to log activity:', error);
            // Don't throw, just log the error
        }
    }

    async handleAuthStateChange(user) {
        if (user) {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                this.currentAdmin = userDoc.exists() && 
                                  userDoc.data().role === 'admin' && 
                                  userDoc.data().status === 'active' ? {
                    uid: user.uid,
                    ...userDoc.data()
                } : null;
            } catch (error) {
                console.error('Error checking user status:', error);
                this.currentAdmin = null;
            }
        } else {
            this.currentAdmin = null;
        }

        // Notify listeners
        this.authStateListeners.forEach(listener => listener(this.currentAdmin));
    }

    onAuthStateChanged(listener) {
        this.authStateListeners.add(listener);
        // Return unsubscribe function
        return () => this.authStateListeners.delete(listener);
    }
}

// Export singleton instance
export const adminAuth = new AdminAuth(); 