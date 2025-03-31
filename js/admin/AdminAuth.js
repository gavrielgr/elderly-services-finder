import { auth, db } from '../config/firebase.js';
import { 
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    updateDoc
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
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            // בדיקה אם המשתמש קיים במאגר
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            
            if (!userDoc.exists()) {
                // יצירת משתמש חדש
                await setDoc(doc(db, 'users', user.uid), {
                    email: user.email,
                    name: user.displayName,
                    isAdmin: false,
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp()
                });
                
                throw new Error('אין לך הרשאות מנהל. אנא פנה למנהל המערכת.');
            }
            
            const userData = userDoc.data();
            
            if (!userData.isAdmin) {
                throw new Error('אין לך הרשאות מנהל. אנא פנה למנהל המערכת.');
            }
            
            // עדכון זמן התחברות אחרון
            await updateDoc(doc(db, 'users', user.uid), {
                lastLogin: serverTimestamp()
            });
            
            // שמירת פרטי המשתמש
            this.currentUser = {
                uid: user.uid,
                email: user.email,
                name: user.displayName,
                isAdmin: userData.isAdmin
            };
            
            // ניתוב לדף הניהול
            window.location.href = '/admin';
            
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async logout() {
        try {
            await signOut(auth);
            this.currentUser = null;
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
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