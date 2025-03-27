import { auth, db } from '../config/firebase.js';
import { 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged 
} from 'firebase/auth';
import { 
    doc, 
    getDoc,
    collection,
    addDoc,
    serverTimestamp 
} from 'firebase/firestore';

export class AdminAuth {
    constructor() {
        this.currentAdmin = null;
        this.authStateListeners = new Set();
        
        // Listen to auth state changes
        onAuthStateChanged(auth, (user) => {
            this.handleAuthStateChange(user);
        });
    }

    async login(email, password) {
        try {
            // 1. Firebase authentication
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            
            // 2. Check if user is admin
            const adminDoc = await getDoc(doc(db, 'admins', userCredential.user.uid));
            
            if (!adminDoc.exists() || adminDoc.data().status !== 'active') {
                await signOut(auth);
                throw new Error('unauthorized');
            }

            // 3. Log successful login
            await this.logActivity(userCredential.user.uid, 'login', {
                timestamp: serverTimestamp(),
                success: true
            });

            return {
                uid: userCredential.user.uid,
                email: userCredential.user.email,
                ...adminDoc.data()
            };

        } catch (error) {
            // Log failed attempt
            await this.logActivity(null, 'login_failed', {
                timestamp: serverTimestamp(),
                error: error.message
            });
            
            throw new Error('אימות נכשל');
        }
    }

    async logout() {
        if (this.currentAdmin) {
            await this.logActivity(this.currentAdmin.uid, 'logout', {
                timestamp: serverTimestamp()
            });
        }
        await signOut(auth);
    }

    async checkPermission(permission) {
        if (!this.currentAdmin) return false;
        
        const adminDoc = await getDoc(doc(db, 'admins', this.currentAdmin.uid));
        if (!adminDoc.exists()) return false;
        
        return adminDoc.data().permissions.includes(permission);
    }

    async logActivity(adminId, action, details) {
        try {
            await addDoc(collection(db, 'admin_logs'), {
                adminId,
                action,
                details,
                timestamp: serverTimestamp(),
                userAgent: navigator.userAgent,
                // Note: In a real app, you'd get the IP from the server side
                // here we're just logging the user agent for demo purposes
            });
        } catch (error) {
            console.error('Failed to log activity:', error);
        }
    }

    async handleAuthStateChange(user) {
        if (user) {
            const adminDoc = await getDoc(doc(db, 'admins', user.uid));
            this.currentAdmin = adminDoc.exists() ? {
                uid: user.uid,
                ...adminDoc.data()
            } : null;
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