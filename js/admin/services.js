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

        // Get all service-interest-areas connections at once
        const serviceAreasSnapshot = await getDocs(collection(db, 'service-interest-areas'));
        
        // Create a map of serviceId to array of area IDs
        const serviceAreasMap = {};
        serviceAreasSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (!serviceAreasMap[data.serviceId]) {
                serviceAreasMap[data.serviceId] = [];
            }
            serviceAreasMap[data.serviceId].push(data.interestAreaId);
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

// Save service
export async function saveService() {
    const form = document.getElementById('serviceForm');
    const saveButton = document.getElementById('saveServiceBtn');
    
    if (!form || !form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const serviceId = document.getElementById('serviceId').value;
    const serviceData = {
        name: document.getElementById('serviceName').value,
        description: document.getElementById('serviceDescription').value,
        category: document.getElementById('serviceCategory').value,
        contact: {
            phone: document.getElementById('servicePhones').value.split(',')
                .map(p => p.trim())
                .filter(Boolean)
                .map(number => ({
                    number,
                    description: document.getElementById('servicePhonesDesc').value
                })),
            email: document.getElementById('serviceEmails').value.split(',')
                .map(e => e.trim())
                .filter(Boolean)
                .map(address => ({
                    address,
                    description: document.getElementById('serviceEmailsDesc').value
                })),
            website: document.getElementById('serviceWebsites').value.split(',')
                .map(w => w.trim())
                .filter(Boolean)
                .map(url => ({
                    url,
                    description: document.getElementById('serviceWebsitesDesc').value
                }))
        },
        city: document.getElementById('serviceCity').value,
        address: document.getElementById('serviceAddress').value,
        metadata: {
            updated: Timestamp.now()
        }
    };

    try {
        // Show loading state
        saveButton.disabled = true;
        saveButton.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            שומר...
        `;
        showModalStatus('שומר את השירות...', 'info');

        const batch = writeBatch(db);
        const selectedInterestAreas = Array.from(document.getElementById('serviceInterestAreas').selectedOptions).map(option => option.value);

        // Get or create service reference
        const serviceRef = serviceId ? 
            doc(db, 'services', serviceId) : 
            doc(collection(db, 'services'));

        if (serviceId) {
            // Update existing service
            // First, get existing service-interest-areas
            const existingAreasSnapshot = await getDocs(
                query(collection(db, 'service-interest-areas'), 
                where('serviceId', '==', serviceId))
            );
            
            // Delete removed areas
            existingAreasSnapshot.docs.forEach(doc => {
                const areaId = doc.data().interestAreaId;
                if (!selectedInterestAreas.includes(areaId)) {
                    batch.delete(doc.ref);
                }
            });
            
            // Add new areas
            const existingAreaIds = existingAreasSnapshot.docs.map(doc => doc.data().interestAreaId);
            for (const areaId of selectedInterestAreas) {
                if (!existingAreaIds.includes(areaId)) {
                    const newAreaRef = doc(collection(db, 'service-interest-areas'));
                    batch.set(newAreaRef, {
                        serviceId: serviceId,
                        interestAreaId: areaId,
                        createdAt: Timestamp.now()
                    });
                }
            }
        } else {
            // New service - create all service-interest-areas
            for (const areaId of selectedInterestAreas) {
                const newAreaRef = doc(collection(db, 'service-interest-areas'));
                batch.set(newAreaRef, {
                    serviceId: serviceRef.id,
                    interestAreaId: areaId,
                    createdAt: Timestamp.now()
                });
            }
            serviceData.metadata.created = Timestamp.now();
        }

        // Save the service
        batch.set(serviceRef, serviceData, { merge: true });
        await batch.commit();
        
        // Show success message in modal
        showModalStatus('השירות נשמר בהצלחה!', 'success');
        
        // Reload the services table
        await loadServices(document.getElementById('servicesTableBody'));
        
        // Close modal after a short delay
        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('serviceModal'));
            modal.hide();
            hideModalStatus();
        }, 1500);
        
    } catch (error) {
        console.error('Error saving service:', error);
        showModalStatus('שגיאה בשמירת השירות', 'danger');
    } finally {
        // Reset button state
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.innerHTML = 'שמור';
        }
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