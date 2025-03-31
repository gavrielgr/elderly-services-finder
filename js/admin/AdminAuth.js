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
        
        // Listen to auth state changes
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists() && userDoc.data().isAdmin) {
                        this.currentUser = {
                            uid: user.uid,
                            email: user.email,
                            name: user.displayName,
                            isAdmin: userDoc.data().isAdmin
                        };
                    } else {
                        this.currentUser = null;
                    }
                } catch (error) {
                    console.error('Error checking user status:', error);
                    this.currentUser = null;
                }
            } else {
                this.currentUser = null;
            }
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

    async logActivity(action, details) {
        if (!this.currentUser) return;
        
        try {
            await addDoc(collection(db, 'admin_logs'), {
                adminId: this.currentUser.uid,
                action,
                details,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.warn('Failed to log activity:', error);
        }
    }
}

// Export singleton instance
export const adminAuth = new AdminAuth(); 