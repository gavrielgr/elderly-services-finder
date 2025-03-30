import { collection, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { showStatus } from './ui.js';

// Show category modal
export function showCategoryModal(categoryId = null) {
    const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
    const form = document.getElementById('categoryForm');
    const title = document.getElementById('categoryModalTitle');

    if (!form || !title) return;

    // Reset form
    form.reset();
    document.getElementById('categoryId').value = '';

    if (categoryId) {
        title.textContent = 'עריכת קטגוריה';
        // Load category data
        getCategory(categoryId).then(category => {
            document.getElementById('categoryId').value = category.id;
            document.getElementById('categoryName').value = category.name;
            document.getElementById('categoryDescription').value = category.description || '';
            document.getElementById('categoryIcon').value = category.icon || '';
        }).catch(error => {
            console.error('Error loading category:', error);
            showStatus('שגיאה בטעינת פרטי הקטגוריה', 'error');
        });
    } else {
        title.textContent = 'הוספת קטגוריה';
    }

    modal.show();
}

// Save category
export async function saveCategory() {
    const form = document.getElementById('categoryForm');
    const saveButton = document.getElementById('saveCategoryBtn');
    
    if (!form || !form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const categoryId = document.getElementById('categoryId').value;
    const categoryData = {
        name: document.getElementById('categoryName').value,
        description: document.getElementById('categoryDescription').value,
        icon: document.getElementById('categoryIcon').value,
        updatedAt: new Date().toISOString()
    };

    try {
        // Show loading state
        saveButton.disabled = true;
        saveButton.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            שומר...
        `;

        const categoryRef = categoryId ? 
            doc(db, 'categories', categoryId) : 
            doc(collection(db, 'categories'));

        if (!categoryId) {
            categoryData.createdAt = new Date().toISOString();
        }

        await setDoc(categoryRef, categoryData, { merge: true });
        showStatus('הקטגוריה נשמרה בהצלחה', 'success');
        
        // Hide modal and reload data
        const modal = bootstrap.Modal.getInstance(document.getElementById('categoryModal'));
        modal.hide();
        await loadCategories();
    } catch (error) {
        console.error('Error saving category:', error);
        showStatus('שגיאה בשמירת הקטגוריה', 'error');
    } finally {
        // Reset button state
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.innerHTML = 'שמור';
        }
    }
}

// Get category
export async function getCategory(categoryId) {
    try {
        const categoryDoc = await getDoc(doc(db, 'categories', categoryId));
        if (!categoryDoc.exists()) {
            showStatus('הקטגוריה לא נמצאה', 'error');
            return null;
        }
        return { id: categoryDoc.id, ...categoryDoc.data() };
    } catch (error) {
        console.error('Error getting category:', error);
        showStatus('שגיאה בקבלת פרטי הקטגוריה', 'error');
        return null;
    }
}

// Edit category
export function editCategory(categoryId) {
    showCategoryModal(categoryId);
}

// Delete category
export async function deleteCategory(categoryId) {
    if (!confirm('האם אתה בטוח שברצונך למחוק קטגוריה זו?')) {
        return;
    }

    try {
        const categoryRef = doc(db, 'categories', categoryId);
        const categoryDoc = await getDoc(categoryRef);
        
        if (!categoryDoc.exists()) {
            showStatus('הקטגוריה לא נמצאה', 'error');
            return;
        }

        await deleteDoc(categoryRef);
        showStatus('הקטגוריה נמחקה בהצלחה', 'success');
        await loadCategories();
    } catch (error) {
        console.error('Error deleting category:', error);
        showStatus('שגיאה במחיקת הקטגוריה', 'error');
    }
} 