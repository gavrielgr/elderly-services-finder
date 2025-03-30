import { collection, getDocs, doc, getDoc, updateDoc, addDoc, deleteDoc, Timestamp, writeBatch, setDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { showStatus } from './ui.js';

let categories = [];
let interestAreas = [];

// Helper functions for contact entries
window.addPhoneEntry = function(number = '', description = '') {
    const container = document.getElementById('phonesContainer');
    const entryDiv = document.createElement('div');
    entryDiv.className = 'input-group mb-2';
    entryDiv.innerHTML = `
        <input type="text" class="form-control phone-number" value="${number}" placeholder="מספר טלפון">
        <input type="text" class="form-control phone-description" value="${description}" placeholder="תיאור (לא חובה)">
        <button type="button" class="btn btn-outline-danger" onclick="this.closest('.input-group').remove()">
            <i class="bi bi-trash"></i>
        </button>
    `;
    container.appendChild(entryDiv);
};

window.addEmailEntry = function(address = '', description = '') {
    const container = document.getElementById('emailsContainer');
    const entryDiv = document.createElement('div');
    entryDiv.className = 'input-group mb-2';
    entryDiv.innerHTML = `
        <input type="email" class="form-control email-address" value="${address}" placeholder="כתובת אימייל">
        <input type="text" class="form-control email-description" value="${description}" placeholder="תיאור (לא חובה)">
        <button type="button" class="btn btn-outline-danger" onclick="this.closest('.input-group').remove()">
            <i class="bi bi-trash"></i>
        </button>
    `;
    container.appendChild(entryDiv);
};

window.addWebsiteEntry = function(url = '', description = '') {
    const container = document.getElementById('websitesContainer');
    const entryDiv = document.createElement('div');
    entryDiv.className = 'input-group mb-2';
    entryDiv.innerHTML = `
        <input type="url" class="form-control website-url" value="${url}" placeholder="כתובת אתר">
        <input type="text" class="form-control website-description" value="${description}" placeholder="תיאור (לא חובה)">
        <button type="button" class="btn btn-outline-danger" onclick="this.closest('.input-group').remove()">
            <i class="bi bi-trash"></i>
        </button>
    `;
    container.appendChild(entryDiv);
};

// Load categories
async function loadCategories() {
    try {
        const snapshot = await getDocs(collection(db, 'categories'));
        categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Populate categories dropdown
        const categorySelect = document.getElementById('serviceCategory');
        categorySelect.innerHTML = '<option value="">בחר קטגוריה</option>' +
            categories.map(category => 
                `<option value="${category.id}">${category.name}</option>`
            ).join('');
    } catch (error) {
        console.error('Error loading categories:', error);
        showStatus('שגיאה בטעינת הקטגוריות', 'error');
    }
}

// Load interest areas
async function loadInterestAreas() {
    try {
        const snapshot = await getDocs(collection(db, 'interest-areas'));
        interestAreas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Populate interest areas dropdown
        const areasSelect = document.getElementById('serviceInterestAreas');
        areasSelect.innerHTML = interestAreas.map(area => 
            `<option value="${area.id}">${area.name}</option>`
        ).join('');
    } catch (error) {
        console.error('Error loading interest areas:', error);
        showStatus('שגיאה בטעינת תחומי העניין', 'error');
    }
}

// Load service data
async function loadService(id) {
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
            
            const selectedAreas = serviceAreasSnapshot.docs.map(doc => doc.data().interestAreaId);
            
            // Populate form fields
            document.getElementById('serviceId').value = docSnap.id;
            document.getElementById('serviceName').value = service.name || '';
            document.getElementById('serviceDescription').value = service.description || '';
            document.getElementById('serviceCategory').value = service.category || '';
            
            // Set selected interest areas
            const areasSelect = document.getElementById('serviceInterestAreas');
            Array.from(areasSelect.options).forEach(option => {
                option.selected = selectedAreas.includes(option.value);
            });
            
            // Handle contact information
            const phones = service.contact?.phone || [];
            const emails = service.contact?.email || [];
            const websites = service.contact?.website || [];
            
            // Clear existing entries
            document.getElementById('phonesContainer').innerHTML = '';
            document.getElementById('emailsContainer').innerHTML = '';
            document.getElementById('websitesContainer').innerHTML = '';
            
            // Add phone entries
            phones.forEach(phone => {
                addPhoneEntry(phone.number, phone.description);
            });
            if (phones.length === 0) addPhoneEntry(); // Add empty entry if none exist
            
            // Add email entries
            emails.forEach(email => {
                addEmailEntry(email.address, email.description);
            });
            if (emails.length === 0) addEmailEntry(); // Add empty entry if none exist
            
            // Add website entries
            websites.forEach(website => {
                addWebsiteEntry(website.url, website.description);
            });
            if (websites.length === 0) addWebsiteEntry(); // Add empty entry if none exist
            
            document.getElementById('serviceCity').value = service.city || '';
            document.getElementById('serviceAddress').value = service.address || '';
        } else {
            showStatus('השירות לא נמצא', 'error');
        }
    } catch (error) {
        console.error('Error loading service:', error);
        showStatus('שגיאה בטעינת פרטי השירות', 'error');
    }
}

// Save service
window.saveService = async function() {
    const form = document.getElementById('serviceForm');
    const saveButton = document.getElementById('saveServiceBtn');
    
    if (!form || !form.checkValidity()) {
        form.reportValidity();
        return;
    }

    try {
        // Show loading state
        saveButton.disabled = true;
        const originalContent = saveButton.innerHTML;
        saveButton.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            שומר...
        `;

        const serviceId = document.getElementById('serviceId').value;
        const serviceData = {
            name: document.getElementById('serviceName').value,
            description: document.getElementById('serviceDescription').value,
            category: document.getElementById('serviceCategory').value,
            contact: {
                phone: Array.from(document.querySelectorAll('#phonesContainer .phone-number')).map(input => ({
                    number: input.value.trim(),
                    description: input.nextElementSibling.value.trim()
                })).filter(p => p.number),
                email: Array.from(document.querySelectorAll('#emailsContainer .email-address')).map(input => ({
                    address: input.value.trim(),
                    description: input.nextElementSibling.value.trim()
                })).filter(e => e.address),
                website: Array.from(document.querySelectorAll('#websitesContainer .website-url')).map(input => ({
                    url: input.value.trim(),
                    description: input.nextElementSibling.value.trim()
                })).filter(w => w.url)
            },
            city: document.getElementById('serviceCity').value,
            address: document.getElementById('serviceAddress').value,
            metadata: {
                updated: new Date().toISOString()
            }
        };

        const selectedInterestAreas = Array.from(document.getElementById('serviceInterestAreas').selectedOptions).map(option => option.value);

        const batch = writeBatch(db);

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
                        createdAt: new Date().toISOString()
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
                    createdAt: new Date().toISOString()
                });
            }
            serviceData.metadata.created = new Date().toISOString();
        }

        // Save the service
        batch.set(serviceRef, serviceData, { merge: true });
        await batch.commit();
        
        // Commit changes to current branch
        const commitMessage = `עדכון שירות: ${serviceData.name}`;
        
        try {
            // Add and commit changes
            await window.run_terminal_cmd({
                command: 'git add .',
                is_background: false
            });
            await window.run_terminal_cmd({
                command: `git commit -m "${commitMessage}"`,
                is_background: false
            });
            
            // Push to remote
            await window.run_terminal_cmd({
                command: 'git push',
                is_background: false
            });
            
            showStatus('השינויים נשמרו בהצלחה בענף הנוכחי', 'success');
        } catch (error) {
            console.error('Error committing changes:', error);
            showStatus('השירות נשמר, אך נכשלה שמירת השינויים ב-Git', 'warning');
        }
        
        // Redirect back to admin page with success message
        window.location.href = 'admin.html?status=service_saved';
    } catch (error) {
        console.error('Error saving service:', error);
        showStatus('שגיאה בשמירת השירות', 'error');
        
        // Reset button state in case of error
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.innerHTML = originalContent;
        }
    }
}

// Initialize page
async function initializePage() {
    await Promise.all([
        loadCategories(),
        loadInterestAreas()
    ]);
    
    // Check if we have a service ID in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const serviceId = urlParams.get('id');
    
    if (serviceId) {
        document.getElementById('pageTitle').textContent = 'עריכת שירות';
        await loadService(serviceId);
    } else {
        document.getElementById('pageTitle').textContent = 'הוספת שירות';
        // Add empty contact entries for new service
        addPhoneEntry();
        addEmailEntry();
        addWebsiteEntry();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage); 