import { collection, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { showStatus } from './ui.js';

// Load users
export async function loadUsers() {
    try {
        const tableBody = document.getElementById('usersTableBody');
        if (!tableBody) return;

        const snapshot = await getDocs(collection(db, 'users'));
        
        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">אין משתמשים להצגה</td></tr>';
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
            throw new Error('User not found');
        }
        return { id: userDoc.id, ...userDoc.data() };
    } catch (error) {
        console.error('Error getting user:', error);
        throw error;
    }
}

// Save user
export async function saveUser(userData) {
    try {
        const userRef = doc(db, 'users', userData.id);
        await setDoc(userRef, {
            ...userData,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        showStatus('המשתמש נשמר בהצלחה', 'success');
        await loadUsers();
    } catch (error) {
        console.error('Error saving user:', error);
        showStatus('שגיאה בשמירת המשתמש', 'error');
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