import { loadUsers, saveUser, deleteUser as deleteUserFromDb, getUser } from './users.js';
import { signOutUser } from './auth.js';
import { 
    saveService as saveServiceToDb, 
    deleteService as deleteServiceFromDb, 
    loadServices, 
    loadCategoriesAndInterestAreas,
    loadInterestAreas
} from './services.js';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase.js';

// Show status message
export function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status');
    if (!statusDiv) return;

    statusDiv.className = `alert alert-${type} d-block`;
    statusDiv.textContent = message;

    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusDiv.className = 'alert d-none';
    }, 5000);
}

// Initialize tabs
function initializeTabs() {
    const tabElements = document.querySelectorAll('[data-bs-toggle="tab"]');
    tabElements.forEach(tab => {
        tab.addEventListener('shown.bs.tab', async (event) => {
            const targetId = event.target.getAttribute('data-bs-target');
            switch (targetId) {
                case '#services':
                    await loadServices(document.getElementById('servicesTableBody'));
                    break;
                case '#categories':
                    await loadCategories();
                    break;
                case '#interest-areas':
                    await loadInterestAreasTable(document.getElementById('interest-areas-table-body'));
                    break;
                case '#users':
                    await loadUsers();
                    break;
            }
        });
    });
}

// Initialize app
export function initializeApp() {
    // Initialize tabs
    initializeTabs();
    
    // Load initial data
    loadAllData();
}

// Load all data
async function loadAllData() {
    try {
        // Load users
        await loadUsers();
        
        // Load services
        await loadServices(document.getElementById('servicesTableBody'));
        
        // Load categories and interest areas
        await loadCategoriesAndInterestAreas();
        
        // Load interest areas table
        await loadInterestAreasTable(document.getElementById('interest-areas-table-body'));
    } catch (error) {
        console.error('Error loading data:', error);
        showStatus('שגיאה בטעינת הנתונים', 'error');
    }
}

// Load categories
async function loadCategories() {
    try {
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        const categoriesTableBody = document.getElementById('categoriesTableBody');
        
        if (categoriesSnapshot.empty) {
            categoriesTableBody.innerHTML = '<tr><td colspan="4" class="text-center">אין קטגוריות להצגה</td></tr>';
            return;
        }

        const rows = [];
        categoriesSnapshot.forEach(doc => {
            const category = doc.data();
            rows.push(`
                <tr>
                    <td>${category.name}</td>
                    <td>${category.description || ''}</td>
                    <td>${new Date(category.createdAt).toLocaleDateString('he-IL')}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-primary" onclick="editCategory('${doc.id}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteCategory('${doc.id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `);
        });
        
        categoriesTableBody.innerHTML = rows.join('');
    } catch (error) {
        console.error('Error loading categories:', error);
        showStatus('שגיאה בטעינת הקטגוריות', 'error');
    }
}

// Load interest areas table
async function loadInterestAreasTable(tableBody) {
    try {
        const areasSnapshot = await getDocs(collection(db, 'interest-areas'));
        
        if (areasSnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">אין תחומי עניין להצגה</td></tr>';
            return;
        }

        const rows = [];
        areasSnapshot.forEach(doc => {
            const area = doc.data();
            rows.push(`
                <tr>
                    <td>${area.name}</td>
                    <td>${area.description || ''}</td>
                    <td>${new Date(area.createdAt).toLocaleDateString('he-IL')}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-primary" onclick="editInterestArea('${doc.id}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteInterestArea('${doc.id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `);
        });
        
        tableBody.innerHTML = rows.join('');
    } catch (error) {
        console.error('Error loading interest areas:', error);
        showStatus('שגיאה בטעינת תחומי העניין', 'error');
    }
}

// Initialize event listeners
export function initializeEventListeners() {
    // Logout
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
            try {
                await signOutUser();
            } catch (error) {
                console.error('Error signing out:', error);
                showStatus('שגיאה בהתנתקות', 'error');
            }
        });
    }

    // Modal closers
    document.querySelectorAll('[data-bs-dismiss="modal"]').forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.closest('.modal').id;
            const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
            modal.hide();
        });
    });

    // Form validation
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', (event) => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });
}

// Show/hide user modal
export function showUserModal(userId = null) {
    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    const form = document.getElementById('userForm');
    const title = document.getElementById('userModalTitle');

    if (!form || !title) return;

    // Reset form
    form.reset();
    document.getElementById('userId').value = '';

    if (userId) {
        title.textContent = 'עריכת משתמש';
        // Load user data
        getUser(userId).then(user => {
            document.getElementById('userId').value = user.id;
            document.getElementById('userName').value = user.name;
            document.getElementById('userEmail').value = user.email;
            document.getElementById('userRole').value = user.role;
            document.getElementById('userStatus').value = user.status;
            document.getElementById('userPhone').value = user.metadata?.phoneNumber || '';
            document.getElementById('userAddress').value = user.metadata?.address || '';
        }).catch(error => {
            showStatus('שגיאה בטעינת פרטי המשתמש', 'error');
            console.error('Error loading user:', error);
        });
    } else {
        title.textContent = 'הוספת משתמש';
    }

    modal.show();
}

export function hideUserModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('userModal'));
    if (modal) {
        modal.hide();
    }
}

// Handle user form submission
export async function handleUserSubmit() {
    const form = document.getElementById('userForm');
    if (!form) return;
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const userData = {
        id: document.getElementById('userId').value,
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        role: document.getElementById('userRole').value,
        status: document.getElementById('userStatus').value,
        phoneNumber: document.getElementById('userPhone').value,
        address: document.getElementById('userAddress').value
    };

    await saveUser(userData);
}

// Edit functions
export function editUser(userId) {
    showUserModal(userId);
}

export function editService(serviceId) {
    showStatus('עריכת שירות עדיין לא מומשה', 'info');
}

export function editInterestArea(areaId) {
    showStatus('עריכת תחום עניין עדיין לא מומשה', 'info');
}

// Delete functions
export function deleteUser(userId) {
    if (confirm('האם אתה בטוח שברצונך למחוק משתמש זה?')) {
        try {
            deleteUserFromDb(userId);
            showStatus('המשתמש נמחק בהצלחה', 'success');
        } catch (error) {
            console.error('Error deleting user:', error);
            showStatus('שגיאה במחיקת המשתמש', 'error');
        }
    }
}

export function deleteService(serviceId) {
    if (confirm('האם אתה בטוח שברצונך למחוק שירות זה?')) {
        try {
            deleteServiceFromDb(serviceId);
            showStatus('השירות נמחק בהצלחה', 'success');
        } catch (error) {
            console.error('Error deleting service:', error);
            showStatus('שגיאה במחיקת השירות', 'error');
        }
    }
}

