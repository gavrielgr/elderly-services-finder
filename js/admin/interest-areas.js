import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { showStatus } from './ui.js';

export async function loadInterestAreas(tableBody) {
    try {
        const areasSnapshot = await getDocs(collection(db, 'interest-areas'));
        
        if (areasSnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">אין תחומי עניין להצגה</td></tr>';
            return;
        }

        const rows = [];
        areasSnapshot.forEach((doc) => {
            const area = doc.data();
            rows.push(`
                <tr>
                    <td>${area.name || ''}</td>
                    <td>${area.description || ''}</td>
                    <td>${area.servicesCount || 0}</td>
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

export async function saveInterestArea(areaData, id) {
    try {
        if (id) {
            // Update existing area
            const areaRef = doc(db, 'interest-areas', id);
            await updateDoc(areaRef, {
                ...areaData,
                'metadata.lastUpdated': Timestamp.now()
            });
        } else {
            // Create new area
            const areaRef = doc(db, 'interest-areas', areaData.id);
            await updateDoc(areaRef, {
                ...areaData,
                servicesCount: 0,
                'metadata.created': Timestamp.now(),
                'metadata.lastUpdated': Timestamp.now()
            });
        }
    } catch (error) {
        console.error('Error saving interest area:', error);
        throw error;
    }
}

export async function getInterestArea(id) {
    try {
        const docRef = doc(db, 'interest-areas', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        
        return null;
    } catch (error) {
        console.error('Error getting interest area:', error);
        throw error;
    }
}

// Show interest area modal
export function showInterestAreaModal(areaId = null) {
    const modal = new bootstrap.Modal(document.getElementById('interestAreaModal'));
    const form = document.getElementById('interestAreaForm');
    const title = document.getElementById('interestAreaModalTitle');

    if (!form || !title) return;

    // Reset form
    form.reset();
    document.getElementById('interestAreaId').value = '';

    if (areaId) {
        title.textContent = 'עריכת תחום עניין';
        // Load interest area data
        getInterestArea(areaId).then(area => {
            document.getElementById('interestAreaId').value = area.id;
            document.getElementById('interestAreaName').value = area.name;
            document.getElementById('interestAreaDescription').value = area.description || '';
        }).catch(error => {
            console.error('Error loading interest area:', error);
            showStatus('שגיאה בטעינת פרטי תחום העניין', 'error');
        });
    } else {
        title.textContent = 'הוספת תחום עניין';
    }

    modal.show();
}

// Save interest area
export async function saveInterestAreaFromForm() {
    const form = document.getElementById('interestAreaForm');
    if (!form || !form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const areaId = document.getElementById('interestAreaId').value;
    const areaData = {
        name: document.getElementById('interestAreaName').value,
        description: document.getElementById('interestAreaDescription').value,
        metadata: {
            lastUpdated: Timestamp.now()
        }
    };

    try {
        const areaRef = areaId ? 
            doc(db, 'interest-areas', areaId) : 
            doc(collection(db, 'interest-areas'));

        if (!areaId) {
            areaData.servicesCount = 0;
            areaData.metadata.created = Timestamp.now();
        }

        await updateDoc(areaRef, areaData, { merge: true });
        showStatus('תחום העניין נשמר בהצלחה', 'success');
        
        // Hide modal and reload data
        const modal = bootstrap.Modal.getInstance(document.getElementById('interestAreaModal'));
        modal.hide();
        await loadInterestAreas();
    } catch (error) {
        console.error('Error saving interest area:', error);
        showStatus('שגיאה בשמירת תחום העניין', 'error');
    }
}

// Edit interest area
export function editInterestArea(areaId) {
    showInterestAreaModal(areaId);
}

// Delete interest area
export async function deleteInterestArea(areaId) {
    if (!confirm('האם אתה בטוח שברצונך למחוק תחום עניין זה?')) {
        return;
    }

    try {
        const areaRef = doc(db, 'interest-areas', areaId);
        const areaDoc = await getDoc(areaRef);
        
        if (!areaDoc.exists()) {
            showStatus('תחום העניין לא נמצא', 'error');
            return;
        }

        const area = areaDoc.data();
        if (area.servicesCount > 0) {
            showStatus('לא ניתן למחוק תחום עניין שיש לו שירותים מקושרים', 'error');
            return;
        }

        await deleteDoc(areaRef);
        showStatus('תחום העניין נמחק בהצלחה', 'success');
        await loadInterestAreas();
    } catch (error) {
        console.error('Error deleting interest area:', error);
        showStatus('שגיאה במחיקת תחום העניין', 'error');
    }
}
