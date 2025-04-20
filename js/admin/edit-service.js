import { collection, getDocs, doc, getDoc, updateDoc, addDoc, deleteDoc, Timestamp, writeBatch, setDoc, query, where } from 'firebase/firestore';
import { initializeFirebase } from '../config/firebase.js';
import { showStatus } from './ui.js';
import { getFromIndexedDB, saveToIndexedDB } from '../services/storageService.js';
import { ADMIN_CACHE_KEYS } from './services.js';

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

// Load categories from cache or Firebase
async function loadCategories() {
    try {
        // נסה לטעון מהמטמון תחילה
        const cachedCategories = await getFromIndexedDB(ADMIN_CACHE_KEYS.CATEGORIES);
        if (cachedCategories && cachedCategories.length > 0) {
            console.log('Using cached categories:', cachedCategories.length);
            categories = cachedCategories;
            
            // עדכן את ה-dropdown
            const categorySelect = document.getElementById('serviceCategory');
            categorySelect.innerHTML = '<option value="">בחר קטגוריה</option>' +
                categories.map(category => 
                    `<option value="${category.id}">${category.name}</option>`
                ).join('');
            return;
        }

        console.log('No valid cached categories, fetching from Firebase...');
        
        // Initialize Firebase directly
        const { db } = await initializeFirebase();
        if (!db) {
            throw new Error('Failed to initialize Firebase');
        }
        
        console.log('Firebase initialized for categories fetch');
        const snapshot = await getDocs(collection(db, 'categories'));
        categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        console.log(`Fetched ${categories.length} categories from Firebase`);
        
        // עדכן את ה-dropdown
        const categorySelect = document.getElementById('serviceCategory');
        categorySelect.innerHTML = '<option value="">בחר קטגוריה</option>' +
            categories.map(category => 
                `<option value="${category.id}">${category.name}</option>`
            ).join('');
        
        // שמור במטמון
        await saveToIndexedDB(ADMIN_CACHE_KEYS.CATEGORIES, categories);
    } catch (error) {
        console.error('Error loading categories:', error);
        showStatus('שגיאה בטעינת הקטגוריות', 'error');
    }
}

// Load interest areas from cache or Firebase
async function loadInterestAreas() {
    try {
        // נסה לטעון מהמטמון תחילה
        const cachedAreas = await getFromIndexedDB(ADMIN_CACHE_KEYS.INTEREST_AREAS);
        if (cachedAreas && cachedAreas.length > 0) {
            console.log('Using cached interest areas:', cachedAreas.length);
            interestAreas = cachedAreas;
            
            // עדכן את ה-dropdown
            const areasSelect = document.getElementById('serviceInterestAreas');
            areasSelect.innerHTML = interestAreas.map(area => 
                `<option value="${area.id}">${area.name}</option>`
            ).join('');
            return;
        }

        console.log('No valid cached interest areas, fetching from Firebase...');
        
        // Initialize Firebase directly
        const { db } = await initializeFirebase();
        if (!db) {
            throw new Error('Failed to initialize Firebase');
        }
        
        console.log('Firebase initialized for interest areas fetch');
        const snapshot = await getDocs(collection(db, 'interest-areas'));
        interestAreas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        console.log(`Fetched ${interestAreas.length} interest areas from Firebase`);
        
        // עדכן את ה-dropdown
        const areasSelect = document.getElementById('serviceInterestAreas');
        areasSelect.innerHTML = interestAreas.map(area => 
            `<option value="${area.id}">${area.name}</option>`
        ).join('');
        
        // שמור במטמון
        await saveToIndexedDB(ADMIN_CACHE_KEYS.INTEREST_AREAS, interestAreas);
    } catch (error) {
        console.error('Error loading interest areas:', error);
        showStatus('שגיאה בטעינת תחומי העניין', 'error');
    }
}

// Load service data with optimized queries
async function loadService(id) {
    try {
        // Initialize Firebase directly
        const { db } = await initializeFirebase();
        if (!db) {
            throw new Error('Failed to initialize Firebase');
        }
        
        console.log(`Firebase initialized for service ${id} fetch`);
        
        const [serviceDoc, serviceAreasSnapshot] = await Promise.all([
            getDoc(doc(db, 'services', id)),
            getDocs(query(
                collection(db, 'service-interest-areas'),
                where('serviceId', '==', id)
            ))
        ]);
        
        if (!serviceDoc.exists()) {
            showStatus('השירות לא נמצא', 'error');
            return;
        }

        const service = serviceDoc.data();
        console.log('Loaded service data (raw):', JSON.stringify(service, null, 2));
        const selectedAreas = serviceAreasSnapshot.docs.map(doc => doc.data().interestAreaId);
        
        // Helper function to safely set form field values
        const setFieldValue = (id, value) => {
            const field = document.getElementById(id);
            if (field) {
                field.value = value || '';
                return true;
            } else {
                console.warn(`Field ${id} not found in the form`);
                return false;
            }
        };
        
        // מילוי הטופס
        setFieldValue('serviceId', serviceDoc.id);
        setFieldValue('serviceName', service.name || '');
        setFieldValue('serviceDescription', service.description || '');
        
        // Handle both category and categoryId fields
        const categoryValue = service.category || service.categoryId || '';
        console.log('Setting category value:', categoryValue);
        setFieldValue('serviceCategory', categoryValue);
        
        // Handle tags field
        const tags = service.tags || [];
        if (Array.isArray(tags)) {
            setFieldValue('serviceTags', tags.join(', '));
            console.log('Setting tags:', tags.join(', '));
        } else if (typeof tags === 'string') {
            setFieldValue('serviceTags', tags);
            console.log('Setting tags string:', tags);
        }
        
        // סימון תחומי עניין נבחרים
        const areasSelect = document.getElementById('serviceInterestAreas');
        if (areasSelect) {
            Array.from(areasSelect.options).forEach(option => {
                option.selected = selectedAreas.includes(option.value);
            });
            console.log('Set selected interest areas:', selectedAreas);
        } else {
            console.warn('Interest areas select element not found');
        }
        
        // טיפול בפרטי קשר - check for different possible structures
        console.log('Contact field in service:', service.contact);
        
        let phones = [];
        let emails = [];
        let websites = [];
        
        // Try to extract contact info from different possible structures
        if (service.contact) {
            phones = service.contact.phone || service.contact.phones || [];
            emails = service.contact.email || service.contact.emails || [];
            websites = service.contact.website || service.contact.websites || [];
        } else if (service.phones) {
            // Alternative structure
            phones = service.phones;
        } else if (service.emails) {
            emails = service.emails;
        } else if (service.websites) {
            websites = service.websites;
        }
        
        console.log('Contact details extracted:', { 
            phonesCount: phones.length, 
            emailsCount: emails.length, 
            websitesCount: websites.length 
        });
        console.log('Phone details:', phones);
        console.log('Email details:', emails);
        console.log('Website details:', websites);
        
        // ניקוי ערכים קיימים
        const phonesContainer = document.getElementById('phonesContainer');
        const emailsContainer = document.getElementById('emailsContainer');
        const websitesContainer = document.getElementById('websitesContainer');
        
        if (!phonesContainer || !emailsContainer || !websitesContainer) {
            console.error('One or more contact containers not found in the DOM');
            console.log('Available elements:', {
                phonesContainer: !!phonesContainer,
                emailsContainer: !!emailsContainer,
                websitesContainer: !!websitesContainer
            });
        }
        
        if (phonesContainer) phonesContainer.innerHTML = '';
        if (emailsContainer) emailsContainer.innerHTML = '';
        if (websitesContainer) websitesContainer.innerHTML = '';
        
        // הוספת שדות קשר
        if (Array.isArray(phones)) {
            phones.forEach(phone => {
                // Handle different possible phone object structures
                const number = phone.number || phone.value || (typeof phone === 'string' ? phone : '');
                const description = phone.description || '';
                console.log('Adding phone:', number, description);
                if (number) addPhoneEntry(number, description);
            });
        }
        if (phones.length === 0 && phonesContainer) {
            console.log('No phones found, adding empty phone entry');
            addPhoneEntry();
        }
        
        if (Array.isArray(emails)) {
            emails.forEach(email => {
                // Handle different possible email object structures
                const address = email.address || email.value || (typeof email === 'string' ? email : '');
                const description = email.description || '';
                console.log('Adding email:', address, description);
                if (address) addEmailEntry(address, description);
            });
        }
        if (emails.length === 0 && emailsContainer) {
            console.log('No emails found, adding empty email entry');
            addEmailEntry();
        }
        
        if (Array.isArray(websites)) {
            websites.forEach(website => {
                // Handle different possible website object structures
                const url = website.url || website.value || (typeof website === 'string' ? website : '');
                const description = website.description || '';
                console.log('Adding website:', url, description);
                if (url) addWebsiteEntry(url, description);
            });
        }
        if (websites.length === 0 && websitesContainer) {
            console.log('No websites found, adding empty website entry');
            addWebsiteEntry();
        }
        
        setFieldValue('serviceCity', service.city || '');
        setFieldValue('serviceAddress', service.address || '');
        
        console.log('Form population complete');
    } catch (error) {
        console.error('Error loading service:', error);
        showStatus('שגיאה בטעינת פרטי השירות', 'error');
    }
}

// Initialize page with optimized loading
async function initializePage() {
    try {
        // Initialize Firebase first
        await initializeFirebase();
        console.log('Firebase initialized in page initialization');
        
        // Log all available form elements for debugging
        const formElements = {
            serviceId: !!document.getElementById('serviceId'),
            serviceName: !!document.getElementById('serviceName'),
            serviceDescription: !!document.getElementById('serviceDescription'),
            serviceCategory: !!document.getElementById('serviceCategory'),
            serviceInterestAreas: !!document.getElementById('serviceInterestAreas'),
            phonesContainer: !!document.getElementById('phonesContainer'),
            emailsContainer: !!document.getElementById('emailsContainer'),
            websitesContainer: !!document.getElementById('websitesContainer'),
            serviceTags: !!document.getElementById('serviceTags'),
            serviceCity: !!document.getElementById('serviceCity'),
            serviceAddress: !!document.getElementById('serviceAddress')
        };
        console.log('Available form elements:', formElements);
        
        // טען קטגוריות ותחומי עניין במקביל
        await Promise.all([loadCategories(), loadInterestAreas()]);
        
        // בדוק אם יש מזהה שירות ב-URL
        const urlParams = new URLSearchParams(window.location.search);
        const serviceId = urlParams.get('id');
        
        if (serviceId) {
            document.getElementById('pageTitle').textContent = 'עריכת שירות';
            await loadService(serviceId);
        } else {
            document.getElementById('pageTitle').textContent = 'הוספת שירות';
            // הוסף שדות קשר ריקים
            addPhoneEntry();
            addEmailEntry();
            addWebsiteEntry();
        }
    } catch (error) {
        console.error('Error initializing page:', error);
        showStatus('שגיאה בטעינת הדף', 'error');
    }
}

// Initialize the page when loaded
document.addEventListener('DOMContentLoaded', initializePage);

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
        if (saveButton) {
            saveButton.disabled = true;
            const originalContent = saveButton.innerHTML;
            saveButton.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                שומר...
            `;
        }

        // Initialize Firebase directly
        const { db } = await initializeFirebase();
        if (!db) {
            throw new Error('Failed to initialize Firebase for saving');
        }
        
        console.log('Firebase initialized for service save');

        // Helper function to safely get field values
        const getFieldValue = (id, defaultValue = '') => {
            const field = document.getElementById(id);
            return field ? field.value : defaultValue;
        };

        const serviceId = getFieldValue('serviceId');
        
        // Process tags from comma-separated string to array
        let tags = [];
        const tagsValue = getFieldValue('serviceTags');
        if (tagsValue) {
            tags = tagsValue.split(',').map(tag => tag.trim()).filter(tag => tag);
            console.log('Processed tags:', tags);
        }
        
        const serviceData = {
            name: getFieldValue('serviceName'),
            description: getFieldValue('serviceDescription'),
            category: getFieldValue('serviceCategory'),
            tags: tags,
            contact: {
                phone: Array.from(document.querySelectorAll('#phonesContainer .phone-number')).map(input => ({
                    number: input.value.trim(),
                    description: input.nextElementSibling ? input.nextElementSibling.value.trim() : ''
                })).filter(p => p.number),
                email: Array.from(document.querySelectorAll('#emailsContainer .email-address')).map(input => ({
                    address: input.value.trim(),
                    description: input.nextElementSibling ? input.nextElementSibling.value.trim() : ''
                })).filter(e => e.address),
                website: Array.from(document.querySelectorAll('#websitesContainer .website-url')).map(input => ({
                    url: input.value.trim(),
                    description: input.nextElementSibling ? input.nextElementSibling.value.trim() : ''
                })).filter(w => w.url)
            },
            city: getFieldValue('serviceCity'),
            address: getFieldValue('serviceAddress'),
            metadata: {
                updated: new Date().toISOString()
            }
        };

        console.log('Saving service data:', serviceData);

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