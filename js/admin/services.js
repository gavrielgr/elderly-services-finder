import { collection, getDocs, doc, getDoc, updateDoc, addDoc, deleteDoc, Timestamp, writeBatch, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { showStatus } from './ui.js';
import { getFromIndexedDB, saveToIndexedDB } from '../services/storageService.js';

export const ADMIN_CACHE_KEYS = {
    CATEGORIES: 'admin_categories',
    INTEREST_AREAS: 'admin_interest_areas',
    LAST_UPDATE: 'admin_last_update'
};

let categories = [];
let interestAreas = [];

// Load categories from cache or Firebase
export async function loadCategories() {
    try {
        // נסה לטעון מהמטמון תחילה
        const cachedCategories = await getFromIndexedDB(ADMIN_CACHE_KEYS.CATEGORIES);
        if (cachedCategories) {
            categories = cachedCategories;
            return;
        }

        const snapshot = await getDocs(collection(db, 'categories'));
        categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // שמור במטמון
        await saveToIndexedDB(ADMIN_CACHE_KEYS.CATEGORIES, categories);
    } catch (error) {
        console.error('Error loading categories:', error);
        showStatus('שגיאה בטעינת הקטגוריות', 'error');
    }
}

// Load interest areas from cache or Firebase
export async function loadInterestAreas() {
    try {
        // נסה לטעון מהמטמון תחילה
        const cachedAreas = await getFromIndexedDB(ADMIN_CACHE_KEYS.INTEREST_AREAS);
        if (cachedAreas) {
            interestAreas = cachedAreas;
            return;
        }

        const snapshot = await getDocs(collection(db, 'interest-areas'));
        interestAreas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // שמור במטמון
        await saveToIndexedDB(ADMIN_CACHE_KEYS.INTEREST_AREAS, interestAreas);
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

// Load services with optimized queries
export async function loadServices(tableBody) {
    try {
        // טען קטגוריות ותחומי עניין במקביל
        await Promise.all([
            categories.length === 0 ? loadCategories() : Promise.resolve(),
            interestAreas.length === 0 ? loadInterestAreas() : Promise.resolve()
        ]);

        const servicesSnapshot = await getDocs(collection(db, 'services'));
        
        if (servicesSnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">אין שירותים להצגה</td></tr>';
            return;
        }

        // קבל את כל השירותים
        const serviceIds = servicesSnapshot.docs.map(doc => doc.id);
        
        // חלק את ה-IDs לקבוצות של 30 (מגבלת Firebase)
        const chunkSize = 30;
        const serviceIdChunks = [];
        for (let i = 0; i < serviceIds.length; i += chunkSize) {
            serviceIdChunks.push(serviceIds.slice(i, i + chunkSize));
        }

        // בצע שאילתות מרובות ואחד את התוצאות
        const serviceAreasPromises = serviceIdChunks.map(chunk => 
            getDocs(query(
                collection(db, 'service-interest-areas'),
                where('serviceId', 'in', chunk)
            ))
        );
        
        const serviceAreasSnapshots = await Promise.all(serviceAreasPromises);
        
        // יצירת מפה של serviceId לתחומי עניין
        const serviceAreasMap = {};
        serviceAreasSnapshots.forEach(snapshot => {
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (!serviceAreasMap[data.serviceId]) {
                    serviceAreasMap[data.serviceId] = [];
                }
                serviceAreasMap[data.serviceId].push(data.interestAreaId);
            });
        });

        const rows = [];
        for (const serviceDoc of servicesSnapshot.docs) {
            const service = serviceDoc.data();
            const category = categories.find(c => c.id === service.category);
            
            // Get interest areas for this service from the map
            const areaIds = serviceAreasMap[serviceDoc.id] || [];
            const areas = areaIds
                .map(areaId => interestAreas.find(a => a.id === areaId)?.name)
                .filter(Boolean)
                .join(', ');

            // Extract contact information with type checking and fallbacks
            let phones = '', emails = '', websites = '';
            
            // Handle phone numbers
            if (service.contact?.phone) {
                if (Array.isArray(service.contact.phone)) {
                    phones = service.contact.phone.map(p => typeof p === 'object' ? p.number : p).join(', ');
                } else if (typeof service.contact.phone === 'string') {
                    phones = service.contact.phone;
                }
            }
            
            // Handle emails
            if (service.contact?.email) {
                if (Array.isArray(service.contact.email)) {
                    emails = service.contact.email.map(e => typeof e === 'object' ? e.address : e).join(', ');
                } else if (typeof service.contact.email === 'string') {
                    emails = service.contact.email;
                }
            }
            
            // Handle websites
            if (service.contact?.website) {
                if (Array.isArray(service.contact.website)) {
                    websites = service.contact.website.map(w => typeof w === 'object' ? w.url : w).join(', ');
                } else if (typeof service.contact.website === 'string') {
                    websites = service.contact.website;
                }
            }

            // Fallback to old structure if contact object doesn't exist
            if (!service.contact) {
                phones = service.phone || '';
                emails = service.email || '';
                websites = service.website || '';
            }

            rows.push(`
                <tr>
                    <td>${service.name || ''}</td>
                    <td>${category?.name || ''}</td>
                    <td>${areas}</td>
                    <td>${phones}</td>
                    <td>${emails}</td>
                    <td>${websites}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-primary" onclick="window.location.href='edit-service.html?id=${serviceDoc.id}'">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteService('${serviceDoc.id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `);
        }
        
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
            console.log('Service data:', service);
            document.getElementById('serviceId').value = service.id;
            document.getElementById('serviceName').value = service.name || '';
            document.getElementById('serviceDescription').value = service.description || '';
            document.getElementById('serviceCategory').value = service.category || '';
            document.getElementById('serviceInterestAreas').value = service.interestAreas || [];
            
            // Handle contact information
            const phones = service.contact?.phone || [];
            const emails = service.contact?.email || [];
            const websites = service.contact?.website || [];
            
            document.getElementById('servicePhones').value = phones.map(p => p.number).join(', ');
            document.getElementById('servicePhonesDesc').value = phones[0]?.description || '';
            
            document.getElementById('serviceEmails').value = emails.map(e => e.address).join(', ');
            document.getElementById('serviceEmailsDesc').value = emails[0]?.description || '';
            
            document.getElementById('serviceWebsites').value = websites.map(w => w.url).join(', ');
            document.getElementById('serviceWebsitesDesc').value = websites[0]?.description || '';
            
            document.getElementById('serviceCity').value = service.city || '';
            document.getElementById('serviceAddress').value = service.address || '';
        }).catch(error => {
            console.error('Error loading service:', error);
            showStatus('שגיאה בטעינת פרטי השירות', 'error');
        });
    } else {
        title.textContent = 'הוספת שירות';
    }

    modal.show();
}

// Show modal status
function showModalStatus(message, type = 'info') {
    const statusDiv = document.getElementById('serviceModalStatus');
    if (!statusDiv) return;

    statusDiv.className = `alert alert-${type} d-block`;
    statusDiv.textContent = message;
}

// Hide modal status
function hideModalStatus() {
    const statusDiv = document.getElementById('serviceModalStatus');
    if (!statusDiv) return;
    statusDiv.className = 'alert d-none';
}

// Save service with optimized batch operations
export async function saveService(serviceData, id = null) {
    try {
        const batch = writeBatch(db);
        const timestamp = serverTimestamp();
        
        // הכן את הנתונים לשמירה
        const serviceRef = id ? doc(db, 'services', id) : doc(collection(db, 'services'));
        const serviceId = serviceRef.id;
        
        // עדכן את השירות
        batch.set(serviceRef, {
            ...serviceData,
            metadata: {
                ...serviceData.metadata,
                lastUpdated: timestamp
            }
        }, { merge: true });

        // עדכן את המטה-דאטה
        const metadataRef = doc(db, 'metadata', 'lastUpdate');
        batch.set(metadataRef, {
            timestamp,
            type: id ? 'update' : 'create',
            serviceId
        }, { merge: true });

        // נקה את המטמון המקומי
        await Promise.all([
            saveToIndexedDB(ADMIN_CACHE_KEYS.LAST_UPDATE, new Date().toISOString())
        ]);

        await batch.commit();
        return serviceId;
    } catch (error) {
        console.error('Error saving service:', error);
        throw error;
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

        // Delete all service-interest-areas connections
        const serviceAreasSnapshot = await getDocs(
            query(collection(db, 'service-interest-areas'), 
            where('serviceId', '==', serviceId))
        );
        
        serviceAreasSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete the service
        batch.delete(doc(db, 'services', serviceId));

        // Update metadata
        const metadataRef = doc(db, 'metadata', 'lastUpdate');
        batch.set(metadataRef, {
            timestamp: serverTimestamp(),
            type: 'delete',
            serviceId: serviceId
        }, { merge: true });

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
            
            // Get interest areas from service-interest-areas collection
            const serviceAreasSnapshot = await getDocs(
                query(collection(db, 'service-interest-areas'), 
                where('serviceId', '==', id))
            );
            
            const interestAreas = serviceAreasSnapshot.docs.map(doc => doc.data().interestAreaId);
            
            return {
                id: docSnap.id,
                ...service,
                interestAreas
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error getting service:', error);
        throw error;
    }
} 