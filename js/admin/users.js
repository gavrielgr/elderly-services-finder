import { showStatus } from './ui.js';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { signInWithPopup, GoogleAuthProvider, getAuth } from 'firebase/auth';

// Load users
export async function loadUsers() {
    try {
        const tableBody = document.getElementById('usersTableBody');
        if (!tableBody) return;

        const snapshot = await getDocs(collection(db, 'users'));
        
        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">אין משתמשים להצגה</td></tr>';
            return;
        }

        const rows = [];
        snapshot.forEach(doc => {
            const user = doc.data();
            rows.push(`
                <tr>
                    <td>${user.name || ''}</td>
                    <td>${user.email || ''}</td>
                    <td>${user.role || 'משתמש'}</td>
                    <td>${user.status || 'פעיל'}</td>
                    <td>${new Date(user.createdAt).toLocaleDateString('he-IL')}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-primary" onclick="editUser('${doc.id}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteUser('${doc.id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `);
        });

        tableBody.innerHTML = rows.join('');
    } catch (error) {
        console.error('Error loading users:', error);
        showStatus('שגיאה בטעינת המשתמשים', 'error');
    }
}

// Get user
export async function getUser(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
            throw new Error('משתמש לא נמצא');
        }
        return { id: userDoc.id, ...userDoc.data() };
    } catch (error) {
        console.error('Error getting user:', error);
        showStatus('שגיאה בטעינת פרטי המשתמש', 'error');
        throw error;
    }
}

// Save user
export async function saveUser(userData) {
    try {
        let userRef;
        if (userData.id) {
            userRef = doc(db, 'users', userData.id);
            // עדכון משתמש קיים
            await setDoc(userRef, {
                ...userData,
                updatedAt: new Date().toISOString()
            });
        } else {
            // יצירת משתמש חדש
            userRef = await addDoc(collection(db, 'users'), {
                ...userData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        showStatus('המשתמש נשמר בהצלחה', 'success');
        await loadUsers();
    } catch (error) {
        console.error('Error saving user:', error);
        showStatus('שגיאה בשמירת המשתמש', 'error');
        throw error;
    }
}

// Delete user
export async function deleteUser(userId) {
    try {
        await deleteDoc(doc(db, 'users', userId));
        showStatus('המשתמש נמחק בהצלחה', 'success');
        await loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        showStatus('שגיאה במחיקת המשתמש', 'error');
    }
}

// Create new user
export async function createNewUser() {
    try {
        const userData = {
            name: document.getElementById('userName').value,
            email: document.getElementById('userEmail').value,
            role: document.getElementById('userRole').value,
            status: document.getElementById('userStatus').value,
            phone: document.getElementById('userPhone').value
        };

        if (!userData.name || !userData.email || !userData.role || !userData.status) {
            showStatus('נא למלא את כל השדות החובה', 'error');
            return;
        }

        // בדיקה אם המשתמש כבר קיים רק אם זה משתמש חדש
        const userId = document.getElementById('userId').value;
        if (!userId) {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const existingUser = usersSnapshot.docs.find(doc => doc.data().email === userData.email);
            
            if (existingUser) {
                showStatus('משתמש עם אימייל זה כבר קיים במערכת', 'error');
                return;
            }
        }

        // שמירת המשתמש בקולקציית users
        await saveUser({
            ...userData,
            id: userId // שימוש ב-ID הקיים אם זה עריכה
        });
        
        // סגירת המודל בצורה בטוחה יותר
        const modalElement = document.getElementById('userModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            } else {
                modalElement.classList.add('d-none');
            }
        }
        
        // ניקוי הטופס
        document.getElementById('userName').value = '';
        document.getElementById('userEmail').value = '';
        document.getElementById('userRole').value = '';
        document.getElementById('userStatus').value = '';
        document.getElementById('userPhone').value = '';
        document.getElementById('userId').value = '';

        showStatus('המשתמש נשמר בהצלחה', 'success');
    } catch (error) {
        console.error('Error creating new user:', error);
        showStatus('שגיאה ביצירת משתמש חדש', 'error');
    }
} 