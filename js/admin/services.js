import { collection, getDocs, doc, getDoc, updateDoc, addDoc, deleteDoc, Timestamp, writeBatch, setDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { showStatus } from './ui.js';

let categories = [];
let interestAreas = [];

// Load categories
export async function loadCategories() {
    try {
        const snapshot = await getDocs(collection(db, 'categories'));
        categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error loading categories:', error);
        showStatus('שגיאה בטעינת הקטגוריות', 'error');
    }
}

// Load interest areas
export async function loadInterestAreas() {
    try {
        const snapshot = await getDocs(collection(db, 'interest-areas'));
        interestAreas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error loading interest areas:', error);
        showStatus('שגיאה בטעינת תחומי העניין', 'error');
    }
}

// Load both categories and interest areas
export async function loadCategoriesAndInterestAreas() {
    await Promise.all([
        loadCategories(),
        loadInterestAreas()
    ]);
}

// Load services
export async function loadServices(tableBody) {
    try {
        // Load categories and interest areas if not already loaded
        if (categories.length === 0) await loadCategories();
        if (interestAreas.length === 0) await loadInterestAreas();

        const servicesSnapshot = await getDocs(collection(db, 'services'));
        
        if (servicesSnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">אין שירותים להצגה</td></tr>';
            return;
        }

        const rows = [];
        servicesSnapshot.forEach((doc) => {
            const service = doc.data();
            const category = categories.find(c => c.id === service.category);
            const areas = service.interestAreas?.map(areaId => 
                interestAreas.find(a => a.id === areaId)?.name
            ).filter(Boolean).join(', ') || '';

            rows.push(`
                <tr>
                    <td>${service.name || ''}</td>
                    <td>${category?.name || ''}</td>
                    <td>${areas}</td>
                    <td>${service.contact?.phone || ''}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-primary" onclick="editService('${doc.id}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteService('${doc.id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `);
        });
        
        tableBody.innerHTML = rows.join('');
    } catch (error) {
        console.error('Error loading services:', error);
        showStatus('שגיאה בטעינת השירותים', 'error');
    }
}

// Show service modal
export function showServiceModal(serviceId = null) {
    const modal = new bootstrap.Modal(document.getElementById('serviceModal'));
    const form = document.getElementById('serviceForm');
    const title = document.getElementById('serviceModalTitle');

    if (!form || !title) return;

    // Reset form
    form.reset();
    document.getElementById('serviceId').value = '';

    if (serviceId) {
        title.textContent = 'עריכת שירות';
        // Load service data
        getService(serviceId).then(service => {
            document.getElementById('serviceId').value = service.id;
            document.getElementById('serviceName').value = service.name;
            document.getElementById('serviceDescription').value = service.description || '';
            document.getElementById('serviceCategory').value = service.category || '';
            document.getElementById('serviceInterestAreas').value = service.interestAreas || [];
            document.getElementById('servicePhones').value = service.contact?.phone || '';
            document.getElementById('serviceEmails').value = service.contact?.email || '';
            document.getElementById('serviceWebsites').value = service.contact?.website || '';
        }).catch(error => {
            console.error('Error loading service:', error);
            showStatus('שגיאה בטעינת פרטי השירות', 'error');
        });
    } else {
        title.textContent = 'הוספת שירות';
    }

    modal.show();
}

// Save service
export async function saveService() {
    const form = document.getElementById('serviceForm');
    if (!form || !form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const serviceId = document.getElementById('serviceId').value;
    const serviceData = {
        name: document.getElementById('serviceName').value,
        description: document.getElementById('serviceDescription').value,
        category: document.getElementById('serviceCategory').value,
        interestAreas: Array.from(document.getElementById('serviceInterestAreas').selectedOptions).map(option => option.value),
        contact: {
            phone: document.getElementById('servicePhones').value,
            email: document.getElementById('serviceEmails').value,
            website: document.getElementById('serviceWebsites').value
        },
        metadata: {
            lastUpdated: Timestamp.now()
        }
    };

    try {
        const batch = writeBatch(db);

        // Update service counts for interest areas
        if (serviceId) {
            // Get existing service data
            const serviceDoc = await getDoc(doc(db, 'services', serviceId));
            const existingAreas = serviceDoc.data()?.interestAreas || [];
            
            // Decrease count for removed areas
            for (const areaId of existingAreas) {
                if (!serviceData.interestAreas.includes(areaId)) {
                    const areaRef = doc(db, 'interest-areas', areaId);
                    const areaDoc = await getDoc(areaRef);
                    if (areaDoc.exists()) {
                        batch.update(areaRef, {
                            servicesCount: (areaDoc.data().servicesCount || 0) - 1
                        });
                    }
                }
            }
            
            // Increase count for new areas
            for (const areaId of serviceData.interestAreas) {
                if (!existingAreas.includes(areaId)) {
                    const areaRef = doc(db, 'interest-areas', areaId);
                    const areaDoc = await getDoc(areaRef);
                    if (areaDoc.exists()) {
                        batch.update(areaRef, {
                            servicesCount: (areaDoc.data().servicesCount || 0) + 1
                        });
                    }
                }
            }
        } else {
            // New service - increase count for all areas
            for (const areaId of serviceData.interestAreas) {
                const areaRef = doc(db, 'interest-areas', areaId);
                const areaDoc = await getDoc(areaRef);
                if (areaDoc.exists()) {
                    batch.update(areaRef, {
                        servicesCount: (areaDoc.data().servicesCount || 0) + 1
                    });
                }
            }
            serviceData.metadata.created = Timestamp.now();
        }

        // Save the service
        const serviceRef = serviceId ? 
            doc(db, 'services', serviceId) : 
            doc(collection(db, 'services'));
        
        batch.set(serviceRef, serviceData, { merge: true });

        await batch.commit();
        showStatus('השירות נשמר בהצלחה', 'success');
        
        // Hide modal and reload data
        const modal = bootstrap.Modal.getInstance(document.getElementById('serviceModal'));
        modal.hide();
        await loadServices(document.getElementById('servicesTableBody'));
    } catch (error) {
        console.error('Error saving service:', error);
        showStatus('שגיאה בשמירת השירות', 'error');
    }
}

// Edit service
export function editService(serviceId) {
    showServiceModal(serviceId);
}

// Delete service
export async function deleteService(serviceId) {
    if (!confirm('האם אתה בטוח שברצונך למחוק שירות זה?')) {
        return;
    }

    try {
        const batch = writeBatch(db);

        // Get service data
        const serviceDoc = await getDoc(doc(db, 'services', serviceId));
        const service = serviceDoc.data();

        // Update interest area counts
        if (service?.interestAreas) {
            for (const areaId of service.interestAreas) {
                const areaRef = doc(db, 'interest-areas', areaId);
                const areaDoc = await getDoc(areaRef);
                if (areaDoc.exists()) {
                    batch.update(areaRef, {
                        servicesCount: Math.max(0, (areaDoc.data().servicesCount || 0) - 1)
                    });
                }
            }
        }

        // Delete the service
        batch.delete(doc(db, 'services', serviceId));

        await batch.commit();
        showStatus('השירות נמחק בהצלחה', 'success');
        await loadServices(document.getElementById('servicesTableBody'));
    } catch (error) {
        console.error('Error deleting service:', error);
        showStatus('שגיאה במחיקת השירות', 'error');
    }
}

export async function getService(id) {
    try {
        const docRef = doc(db, 'services', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const service = docSnap.data();
            return {
                id: docSnap.id,
                ...service,
                contact: {
                    phone: service.contact?.phone || '',
                    email: service.contact?.email || '',
                    website: service.contact?.website || ''
                }
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error getting service:', error);
        throw error;
    }
} 