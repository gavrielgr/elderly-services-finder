const APP_VERSION = '1.997.20'; // Updated version number

// At the beginning of your app.js, after defining APP_VERSION
console.log('App Version:', APP_VERSION);

// State
let allServicesData = null;
let lastUpdated = null;
let activeCategory = null;
let currentSearchQuery = '';
let noWaitlistOnly = false;
let currentServiceDetails = null;
let isOnline = navigator.onLine;
let storedVersion = null;
let deferredPrompt = null;
let isCategoriesCollapsed = true; // מצב התחלתי - קטגוריות מוסתרות
// Data refresh function
async function refreshData(showNotification = true) {
    if (!isOnline) {
        showStatusMessage('לא ניתן לרענן ללא חיבור לאינטרנט', 'warning');
        return false;
    }

    if (showNotification) {
        showStatusMessage('מרענן נתונים...', 'info');
    }

    try {
        const success = await loadFromAPI();
        if (success) {
            renderCategories();
            if (currentSearchQuery || activeCategory) {
                performSearch();
            } else {
                renderDefaultResults();
            }
            updateLastUpdatedText();
            if (showNotification) {
                showStatusMessage('הנתונים עודכנו בהצלחה', 'success');
            }
            return true;
        } else {
            if (showNotification) {
                showStatusMessage('שגיאה בעדכון הנתונים', 'error');
            }
            return false;
        }
    } catch (error) {
        console.error('Error refreshing data:', error);
        if (showNotification) {
            showStatusMessage('שגיאה בעדכון הנתונים', 'error');
        }
        return false;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', initApp);

async function checkAppVersion() {
    try {
        // Open the database
        const db = await openDatabase();
        
        // Get stored version
        storedVersion = await getFromStore(db, VERSION_KEY);
        console.log('Stored version:', storedVersion, 'Current version:', APP_VERSION);
        
        if (!storedVersion || storedVersion !== APP_VERSION) {
            console.log(`Version change detected: ${storedVersion || 'none'} -> ${APP_VERSION}`);
            
            // Clear caches
            if ('caches' in window) {
                try {
                    const cacheKeys = await caches.keys();
                    await Promise.all(
                        cacheKeys.map(key => {
                            console.log('Clearing cache:', key);
                            return caches.delete(key);
                        })
                    );
                    console.log('All caches cleared');
                } catch (error) {
                    console.error('Error clearing caches:', error);
                }
            }
            
            // Delete all data in IndexedDB
            await clearIndexedDB();
            
            // Store the new version
            await saveToIndexedDBSimple(VERSION_KEY, APP_VERSION);
            
            // Show update message
            showStatusMessage('גרסה חדשה! המידע יטען מחדש.', 'success', 5000);
            
            // Instead of forcing a page reload, try to refresh the data
            try {
                if (isOnline) {
                    await refreshData(false); // Refresh with notification
                    renderCategories();
                    renderDefaultResults();
                    return; // Success - no need to reload
                }
            } catch (refreshError) {
                console.error('Error refreshing after version change:', refreshError);
                // Fall back to reload if refresh fails
                window.location.reload(true);
            }
        }
    } catch (error) {
        console.error('Error checking app version:', error);
    }
}

const DB_NAME = 'elderlyServicesDB';
const DB_VERSION = 2; // Increased DB version
const STORE_NAME = 'servicesData';
const DATA_KEY = 'allServicesData';
const LAST_UPDATED_KEY = 'lastUpdated';
const VERSION_KEY = 'appVersion';

const API_URL = 'https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLhjH6M2KJrbCQRu4YiofKbgwrkDpjxZGvLIUqE4KrcA_IKd5sp_8eDl0Pb_zEjeWb9_F8A26cGZyN3LnUwLp1tSGwE4DO0MvbpgpbuL6dkaSgQyecapCtZLqZWSy4fns_lzmQ-VVQYa0YZvoLbV3-5Oq0p4FguPA1dOH8tQlui0VwZ_H9mdlkd0D1AgxO53pa8r4r8VlKWtje0O0-W-tIQTtzYauPWkvm8bwXofRooP4qw-IYmKBYIVb_wXqSyHH5n9dcN7a7v5RpLauKypRY9G1hw1Uw&lib=MOF1g2zWJcL4207AxUsxFPKpukIcnFaFe';
// DOM Elements
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const voiceSearchButton = document.getElementById('voice-search-button');
const categoriesContainer = document.getElementById('categories-container');
const resultsContainer = document.getElementById('results-container');
const lastUpdatedText = document.getElementById('last-updated-text');
const refreshButton = document.getElementById('refresh-button');
const serviceModal = document.getElementById('service-modal');
const serviceDetailsContainer = document.getElementById('service-details-container');
const callButton = document.getElementById('call-button');
const shareButton = document.getElementById('share-button');
const closeModalButton = document.querySelector('.close-modal');
const connectionStatus = document.getElementById('connection-status');
const statusBar = document.getElementById('status-bar');
const clearSearchButton = document.getElementById('clear-search-button');


// כפתורי החלפת תצוגה
const gridViewButton = document.getElementById('grid-view-button');
const listViewButton = document.getElementById('list-view-button');

// בדיקה אם יש העדפת תצוגה שמורה
const savedViewMode = localStorage.getItem('viewMode') || 'grid';

// פונקציה להגדרת מצב התצוגה
function setViewMode(mode) {
    const container = document.getElementById('results-container');
    
    if (!container) return;
    
    // הסר מחלקות קודמות
    container.classList.remove('grid-view', 'list-view');
    gridViewButton.classList.remove('active');
    listViewButton.classList.remove('active');
    
    // הוסף את המחלקה המתאימה
    container.classList.add(mode + '-view');
    
    // סימון הכפתור המתאים כפעיל
    if (mode === 'grid') {
        gridViewButton.classList.add('active');
    } else {
        listViewButton.classList.add('active');
    }
    
    // שמירת ההעדפה
    localStorage.setItem('viewMode', mode);
    
    console.log(`View mode set to ${mode}, container classes:`, container.className);
}

// הגדרת מצב התצוגה ההתחלתי
setViewMode(savedViewMode);

// הוספת מאזיני אירועים לכפתורים
gridViewButton.addEventListener('click', () => setViewMode('grid'));
listViewButton.addEventListener('click', () => setViewMode('list'));

// Category icons mapping (default icons if not specified in data)
const categoryIcons = {
    'שירותים ומסגרות בזקנה': '🏠',
    'ניצולי שואה': '🕯️',
    'מוקדים ממשלתיים': '📞',
    'תוכניות משרד לשיוון חברתי': '⚖️',
    'מנועי חיפוש לזקנה': '🔍',
    'בעלי מקצוע': '👨‍⚕️',
    'הטפול בזקן בישראל': '❤️',
    'default': '📋'
};

// Helper function to get icon with trim handling
function getCategoryIcon(categoryName) {
    const trimmedName = categoryName.trim();
    return categoryIcons[trimmedName] || categoryIcons['default'];
}

// Event listeners


// קוד עדכני לתיקון כפתור החלפת תצוגה
function updateThemeToggleIcon() {
  const lightIcon = document.querySelector('.light-mode-icon');
  const darkIcon = document.querySelector('.dark-mode-icon');
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  
  if (currentTheme === 'dark') {
    lightIcon.classList.add('hidden');
    darkIcon.classList.remove('hidden');
  } else {
    darkIcon.classList.add('hidden');
    lightIcon.classList.remove('hidden');
  }
}

// בדיקה אם המשתמש כבר בחר מצב
const currentTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', currentTheme);

// עדכון האייקונים בטעינה הראשונית
document.addEventListener('DOMContentLoaded', updateThemeToggleIcon);

// החלפת קוד הלחיצה על כפתור החלפת התצוגה
const themeSwitch = document.getElementById('theme-switch');
themeSwitch.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  // עדכון אייקון המתג
  updateThemeToggleIcon();
});

searchButton.addEventListener('click', performSearch);
clearSearchButton.addEventListener('click', clearSearch);
searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') performSearch();
});
// Show/hide clear button based on search input
searchInput.addEventListener('input', () => {
    if (searchInput.value.trim() !== '') {
        clearSearchButton.classList.remove('hidden');
    } else {
        clearSearchButton.classList.add('hidden');
    }
});
voiceSearchButton.addEventListener('click', startVoiceSearch);
refreshButton.addEventListener('click', refreshData);
closeModalButton.addEventListener('click', closeModal);
window.addEventListener('click', (e) => {
    if (e.target === serviceModal) closeModal();
});
callButton.addEventListener('click', initiateCall);
shareButton.addEventListener('click', shareService);

// Network status listeners
window.addEventListener('online', handleNetworkChange);
window.addEventListener('offline', handleNetworkChange);

// Service worker communication
if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CACHE_UPDATED') {
            showStatusMessage('תוכן חדש זמין! רענן לטעינה מחדש.');
        }
    });
}

// Check if the app is installable
function isInstallable() {
    return deferredPrompt !== null;
}

// Initialize the application
async function initApp() {
    updateConnectionStatus();
    
    try {
        // Try to load data from IndexedDB first
        const savedData = await loadFromIndexedDB();
        if (savedData && savedData.data) {
            allServicesData = savedData.data;
            lastUpdated = savedData.lastUpdated;
            console.log('Data loaded from IndexedDB');
        }

        // Check if we need to refresh from API
        const shouldRefresh = !allServicesData || 
            (lastUpdated && (new Date().getTime() - new Date(lastUpdated).getTime() > 24 * 60 * 60 * 1000));

        if (isOnline && shouldRefresh) {
            console.log('Refreshing data from API...');
            const success = await loadFromAPI();
            if (success) {
                console.log('Data refreshed successfully');
            }
        }

        // Render initial UI
        if (allServicesData && Array.isArray(allServicesData)) {
            renderCategories();
            renderDefaultResults();
            updateLastUpdatedText();
        } else {
            console.log('No valid data available, showing empty state');
            categoriesContainer.innerHTML = '<div class="category-loading">אין מידע זמין. אנא רענן כשיש חיבור לאינטרנט.</div>';
            resultsContainer.innerHTML = '<div class="results-message">אין מידע זמין. אנא רענן כשיש חיבור לאינטרנט.</div>';
        }
        
        // Show install prompt if applicable
        if (isInstallable()) {
            showInstallPrompt();
        }

         // Render initial UI
        if (allServicesData && Array.isArray(allServicesData)) {
            renderCategories();
            renderDefaultResults();
            updateLastUpdatedText();
            
            // אתחול מספר התוצאות
            updateResultsCount(0);
        } else {
            console.log('No valid data available, showing empty state');
            categoriesContainer.innerHTML = '<div class="category-loading">אין מידע זמין. אנא רענן כשיש חיבור לאינטרנט.</div>';
            resultsContainer.innerHTML = '<div class="results-message">אין מידע זמין. אנא רענן כשיש חיבור לאינטרנט.</div>';
            
            // אתחול מספר התוצאות במצב ריק
            updateResultsCount(0);
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        showStatusMessage('שגיאה בטעינת המידע. נסה שוב מאוחר יותר.', 'error');
    }
}

// Clear all IndexedDB data
async function clearIndexedDB() {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const request = store.clear();
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject('Error clearing database');
        });
    } catch (error) {
        console.error('Error in clearIndexedDB:', error);
        throw error;
    }
}

// Handle online/offline status changes
function handleNetworkChange() {
    isOnline = navigator.onLine;
    updateConnectionStatus();
    
    if (isOnline) {
        showStatusMessage('חיבור לאינטרנט זוהה! ניתן לרענן את המידע.', 'success');
        refreshButton.disabled = false;
    } else {
        showStatusMessage('אתה במצב לא מקוון. המידע המוצג הוא המידע האחרון שנשמר במכשיר.', 'warning');
        refreshButton.disabled = true;
    }
}

// Update the connection status indicator
function updateConnectionStatus() {
    const onlineIcon = document.querySelector('.status-icon.online');
    const offlineIcon = document.querySelector('.status-icon.offline');
    
    if (isOnline) {
        onlineIcon.classList.remove('hidden');
        offlineIcon.classList.add('hidden');
        connectionStatus.title = 'מחובר לאינטרנט';
    } else {
        onlineIcon.classList.add('hidden');
        offlineIcon.classList.remove('hidden');
        connectionStatus.title = 'לא מחובר לאינטרנט';
    }
}

// Show status message
function showStatusMessage(message, type = 'info', duration = 3000) {
    statusBar.textContent = message;
    statusBar.className = 'status-bar show';
    
    // Add type-specific class
    if (type === 'error') statusBar.classList.add('error');
    if (type === 'success') statusBar.classList.add('success');
    if (type === 'warning') statusBar.classList.add('warning');
    
    setTimeout(() => {
        statusBar.classList.remove('show');
    }, duration);
}

// Data transformation
function transformData(rawData) {
    console.log('Raw data received:', rawData);
    if (!rawData || typeof rawData !== 'object') {
        console.error('Invalid data format received:', rawData);
        return [];
    }

    let transformedData = [];

    // Process each category directly from the root object
    Object.entries(rawData).forEach(([category, services]) => {
        // Skip non-array properties and special keys
        if (!Array.isArray(services) || ['status', 'data', 'lastUpdated'].includes(category)) {
            return;
        }

        // Remove any extra spaces from category name
        const cleanCategory = category.trim();
        
        // Process each service in the category
        services.forEach(service => {
            const transformedService = {
                category: cleanCategory,
                name: service['שם העסק'] || service['שם התוכנית'] || service['מוקד'] || service['אנשי מקצוע'] || service['שם'] || 'שירות ללא שם',
                description: service['תיאור העסק'] || service['תיאור כללי'] || service['זכויות ותחומי אחריות'] || service['תחום'] || service['תיאור'] || '',
                phone: service['טלפון'] || service['מס\' טלפון'] || service['טלפון / אימייל'] || '',
                email: service['אימייל'] || service['מייל'] || '',
                website: service['אתר'] || service['קישור לאתר'] || '',
                tags: []
            };

            // Add interest tags
            if (service['תחום עניין']) {
                const interestTags = typeof service['תחום עניין'] === 'string' 
                    ? service['תחום עניין'].split(',')
                    : [service['תחום עניין']];
                
                transformedService.tags.push(...interestTags.map(tag => tag.trim()).filter(tag => tag.length > 0));
            }

            // Add waitlist tag if applicable
            if (service['רשימת המתנה'] === 'כן') {
                transformedService.tags.push('רשימת המתנה');
            }

            transformedData.push(transformedService);
        });
    });

    console.log('Final transformed data:', transformedData);
    return transformedData;
}

// Update the data loading function
async function loadFromAPI() {
    try {
        console.log('Fetching data from API...');
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const rawData = await response.json();
        console.log('Raw data from API:', rawData);
        
        // Check if we got data in the response
        if (!rawData || typeof rawData !== 'object') {
            throw new Error('Invalid response format');
        }
        
        // Transform the data and ensure it's an array
        const transformedData = transformData(rawData.data || rawData);
        if (!Array.isArray(transformedData)) {
            throw new Error('Transformed data is not an array');
        }
        
        console.log('Setting allServicesData:', transformedData);
        allServicesData = transformedData;
        
        // Update last updated timestamp
        lastUpdated = rawData.lastUpdated || new Date().toISOString();
        
        // Save to IndexedDB
        await saveToIndexedDB(allServicesData, lastUpdated);
        
        return true;
    } catch (error) {
        console.error('Error loading data from API:', error);
        return false;
    }
}

// IndexedDB Operations
async function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = (event) => reject('Error opening database');
        
        request.onsuccess = (event) => resolve(event.target.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
        };
    });
}

async function saveToIndexedDB(data, timestamp) {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            // Save the data
            store.put({ key: DATA_KEY, value: data });
            
            // Format and save the timestamp
            const formattedTimestamp = new Date().toISOString();
            store.put({ key: LAST_UPDATED_KEY, value: formattedTimestamp });
            
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject('Error saving to database');
        });
    } catch (error) {
        console.error('Error in saveToIndexedDB:', error);
        throw error;
    }
}

// Simplified function to save a single key/value pair
async function saveToIndexedDBSimple(key, value) {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            // Save the value
            store.put({ key: key, value: value });
            
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject('Error saving to database');
        });
    } catch (error) {
        console.error(`Error saving ${key} to IndexedDB:`, error);
        throw error;
    }
}

async function loadFromIndexedDB() {
    try {
        const db = await openDatabase();
        const data = await getFromStore(db, DATA_KEY);
        const timestamp = await getFromStore(db, LAST_UPDATED_KEY);
        
        if (data) {
            allServicesData = data;
            lastUpdated = timestamp ? new Date(timestamp) : new Date();
            renderCategories();
            renderDefaultResults();
        } else {
            categoriesContainer.innerHTML = '<div class="category-loading">אין מידע זמין. אנא רענן כשיש חיבור לאינטרנט.</div>';
            resultsContainer.innerHTML = '<div class="results-message">אין מידע זמין. אנא רענן כשיש חיבור לאינטרנט.</div>';
        }
        
        // Update the last updated text after setting the data
        updateLastUpdatedText();
        
        return { data, lastUpdated: timestamp };
    } catch (error) {
        console.error('Error in loadFromIndexedDB:', error);
        throw error;
    }
}

async function getFromStore(db, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        
        request.onsuccess = () => {
            if (request.result) {
                resolve(request.result.value);
            } else {
                resolve(null);
            }
        };
        
        request.onerror = () => reject('Error getting from store');
    });
}

// UI Update Functions
function updateLastUpdatedText() {
    if (lastUpdated) {
        try {
            // Try to parse the date string
            let date;
            if (typeof lastUpdated === 'string') {
                // If it's already a formatted string, use it as is
                if (lastUpdated.includes('עודכן:')) {
                    lastUpdatedText.textContent = lastUpdated;
                    return;
                }
                // Otherwise try to parse it
                date = new Date(lastUpdated);
            } else {
                date = new Date(lastUpdated);
            }

            // Check if the date is valid
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date');
            }

            const formattedDate = new Intl.DateTimeFormat('he-IL', {
                day: 'numeric',
                month: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric'
            }).format(date);
            
            lastUpdatedText.textContent = `עודכן: ${formattedDate}`;
        } catch (error) {
            console.warn('Error formatting date:', error);
            // Fallback: just show the raw lastUpdated value if it's a string
            if (typeof lastUpdated === 'string') {
                lastUpdatedText.textContent = `עודכן: ${lastUpdated}`;
            } else {
                lastUpdatedText.textContent = 'לא עודכן';
            }
        }
    } else {
        lastUpdatedText.textContent = 'לא עודכן';
    }
}

function renderCategories() {
    if (!allServicesData || !Array.isArray(allServicesData)) {
        console.error('Invalid data format for categories');
        return;
    }

    // Get unique categories
    const categories = [...new Set(allServicesData.map(service => service.category))];
    
    const container = document.getElementById('categories-container');
    if (!container) return;

    container.innerHTML = '';

    categories.forEach(category => {
        if (!category) return;

        const card = document.createElement('div');
        card.className = 'category-card';
        card.setAttribute('data-category', category);

        const icon = getCategoryIcon(category);
        
        card.innerHTML = `
            <div class="category-icon">${icon}</div>
            <div class="category-name">${category}</div>
        `;

        card.addEventListener('click', () => selectCategory(category));
        
        if (category === activeCategory) {
            card.classList.add('active');
        }

        container.appendChild(card);
    });
}

function renderDefaultResults() {
 // אם אין חיפוש טקסט ואין קטגוריה נבחרת, הצג הודעה במקום כל התוצאות
    resultsContainer.innerHTML = '<div class="results-message">הזן מילות חיפוש או בחר קטגוריה כדי להציג תוצאות</div>';
    
    // עדכון מספר התוצאות
    updateResultsCount(0);
}
// Search functions
function performSearch() {
    console.log('Performing search...');
    const query = searchInput.value.trim().toLowerCase();
    currentSearchQuery = query;

    // אם אין חיפוש ואין קטגוריה נבחרת, הצג את הודעת ברירת המחדל
    if (!query && !activeCategory) {
        renderDefaultResults();
        return;
    }

    let results = [];
    if (allServicesData) {
        console.log('Filtering services...');
        console.log('Active category:', activeCategory);
        console.log('Current query:', currentSearchQuery);
        
        results = allServicesData.filter(service => {
            const matchesQuery = !query || 
                service.name.toLowerCase().includes(query) ||
                service.description.toLowerCase().includes(query) ||
                (service.tags && service.tags.some(tag => tag.toLowerCase().includes(query)));

            const matchesCategory = !activeCategory || service.category === activeCategory;

            return matchesQuery && matchesCategory;
        });

        console.log('Found results:', results.length);
    }

    // רנדר את התוצאות
    renderResults(results);
}

function renderResults(results) {
    if (!results || !Array.isArray(results)) {
        console.error('Invalid results data:', results);
        return;
    }

    console.log('Rendering results:', results.length);
    const container = document.getElementById('results-container');
    if (!container) {
        console.error('Results container not found');
        return;
    }

    // הסר את כל המחלקות הקודמות
    container.className = 'results-container visible-grid';

    // נקה את התוצאות הקודמות
    container.innerHTML = '';

    if (results.length === 0) {
        container.innerHTML = '<div class="no-results">לא נמצאו תוצאות</div>';
        return;
    }

    // צור את כל הכרטיסים תחילה
    const fragment = document.createDocumentFragment();
    results.forEach(service => {
        const card = createResultCard(service);
        if (card) {
            fragment.appendChild(card);
        }
    });

    // הוסף את כל הכרטיסים בבת אחת
    container.appendChild(fragment);

    // וודא שהתצוגה נשארת נכונה
    requestAnimationFrame(() => {
        // הוסף את מחלקת התצוגה הנוכחית
        const currentViewMode = localStorage.getItem('viewMode') || 'grid';
        container.classList.add(`${currentViewMode}-view`);
        
        // וודא שהמכל נשאר נראה
        container.classList.add('visible-grid');
        
        console.log('Container classes after render:', container.className);
    });
}

function createResultCard(service) {
    if (!service) return null;

    const card = document.createElement('div');
    card.className = 'result-card';
    card.setAttribute('data-category', service.category || '');
    
    // צור את תוכן הכרטיס
    card.innerHTML = `
        <div class="result-category-tag">${service.category || ''}</div>
        <h3 class="result-name">${service.name || ''}</h3>
        <p class="result-description">${service.description || ''}</p>
        ${service.tags ? `
            <div class="result-tags">
                ${service.tags.map(tag => `<span class="result-tag">${tag}</span>`).join('')}
            </div>
        ` : ''}
    `;

    // הוסף מאזין לחיצה
    card.addEventListener('click', () => {
        showServiceDetails(service);
    });

    return card;
}

// Category selection
function selectCategory(category) {
    console.log('Selecting category:', category);
    
    // הסר את המחלקה הפעילה מכל הקטגוריות
    document.querySelectorAll('.category-card').forEach(card => {
        card.classList.remove('active');
    });

    // אם לוחצים על אותה קטגוריה, נקה אותה
    if (category === activeCategory) {
        console.log('Clearing active category');
        activeCategory = null;
    } else {
        console.log('Setting new active category:', category);
        activeCategory = category;
        // הוסף מחלקה פעילה לקטגוריה שנבחרה
        const selectedCard = document.querySelector(`.category-card[data-category="${category}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
        }
    }

    // בצע חיפוש עם הקטגוריה החדשה
    console.log('Performing search with active category:', activeCategory);
    performSearch();
}

// Voice search functionality
function startVoiceSearch() {
    if (!('webkitSpeechRecognition' in window)) {
        showStatusMessage('חיפוש קולי אינו נתמך בדפדפן זה.', 'warning');
        return;
    }
    
    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'he-IL';
    recognition.interimResults = false;
    
    recognition.onstart = () => {
        showStatusMessage('הקשבה... דבר עכשיו');
        voiceSearchButton.textContent = '🔴';
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        searchInput.value = transcript;
        performSearch();
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        showStatusMessage('שגיאה בזיהוי קולי. נסה שוב.', 'error');
        voiceSearchButton.textContent = '🎤';
    };
    
    recognition.onend = () => {
        voiceSearchButton.textContent = '🎤';
    };
    
    recognition.start();
}

// Service detail functions
function showServiceDetails(service) {
    currentServiceDetails = service;
    
    // Clear details container
    serviceDetailsContainer.innerHTML = '';
    
    // Create a map of field display names (Hebrew)
    const fieldDisplayNames = {
        'name': 'שם',
        'description': 'תיאור',
        'phone': 'טלפון',
        'email': 'דוא"ל',
        'website': 'אתר אינטרנט',
        'category': 'קטגוריה',
        'tags': 'תגיות'
    };
    
    // Start with service name
    let detailsHTML = `<h2 class="service-name">${service.name || 'שירות ללא שם'}</h2>`;
    
    // Add description if exists
    if (service.description) {
        detailsHTML += `
            <div class="service-detail">
                <div class="service-detail-label">תיאור</div>
                <div class="service-detail-value">${service.description}</div>
            </div>
        `;
    }
    
    // Add phone if exists
    if (service.phone) {
        const phoneNumbers = service.phone.split(',').map(p => p.trim());
        const phoneLinks = phoneNumbers.map(phone => {
            if (phone.startsWith('*')) {
                const encodedPhone = encodeURIComponent(phone);
                return `<a href="tel:${encodedPhone}">${phone}</a>`;
            } else {
                const cleanPhone = phone.replace(/\D/g, '');
                return `<a href="tel:${cleanPhone}">${phone}</a>`;
            }
        });
        
        detailsHTML += `
            <div class="service-detail">
                <div class="service-detail-label">טלפון</div>
                <div class="service-detail-value">${phoneLinks.join(', ')}</div>
            </div>
        `;
    }
    
    // Add email if exists
    if (service.email) {
        detailsHTML += `
            <div class="service-detail">
                <div class="service-detail-label">דוא"ל</div>
                <div class="service-detail-value"><a href="mailto:${service.email}">${service.email}</a></div>
            </div>
        `;
    }
    
    // Add website if exists
    if (service.website) {
        let url = service.website;
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }
        detailsHTML += `
            <div class="service-detail">
                <div class="service-detail-label">אתר אינטרנט</div>
                <div class="service-detail-value"><a href="${url}" target="_blank" rel="noopener noreferrer">${service.website}</a></div>
            </div>
        `;
    }
    
    // Add category if exists
    if (service.category) {
        detailsHTML += `
            <div class="service-detail">
                <div class="service-detail-label">קטגוריה</div>
                <div class="service-detail-value">${service.category}</div>
            </div>
        `;
    }
    
    // Add tags if exist
    if (service.tags && service.tags.length > 0) {
        detailsHTML += `
            <div class="service-detail">
                <div class="service-detail-label">תגיות</div>
                <div class="service-detail-value service-tags">
                    ${service.tags.map(tag => `<span class="service-tag">${tag}</span>`).join('')}
                </div>
            </div>
        `;
    }
    
    // Set HTML and show modal
    serviceDetailsContainer.innerHTML = detailsHTML;
    serviceModal.style.display = 'block';
    
    // Configure call button
    if (service.phone && /\d/.test(service.phone)) {
        callButton.style.display = 'block';
        callButton.dataset.phone = service.phone.replace(/\D/g, '');
    } else {
        callButton.style.display = 'none';
    }
}

function closeModal() {
    serviceModal.style.display = 'none';
    currentServiceDetails = null;
}

function initiateCall() {
    if (!currentServiceDetails) return;
    
    const phoneNumber = callButton.dataset.phone;
    if (phoneNumber) {
        window.location.href = `tel:${phoneNumber}`;
    }
}

function shareService() {
    if (!currentServiceDetails) return;
    
    const name = currentServiceDetails.name || 'שירות לגיל השלישי';
    const description = currentServiceDetails.description || '';
    const contact = [];
    
    if (currentServiceDetails.phone) {
        contact.push(`טלפון: ${currentServiceDetails.phone}`);
    }
    if (currentServiceDetails.email) {
        contact.push(`דוא"ל: ${currentServiceDetails.email}`);
    }
    if (currentServiceDetails.website) {
        contact.push(`אתר: ${currentServiceDetails.website}`);
    }
    
    let shareText = `${name}\n`;
    if (description) shareText += `${description}\n`;
    if (contact.length > 0) shareText += `\nפרטי התקשרות:\n${contact.join('\n')}`;
    if (currentServiceDetails.category) shareText += `\n\nקטגוריה: ${currentServiceDetails.category}`;
    
    if (navigator.share) {
        navigator.share({
            title: name,
            text: shareText
        })
        .catch((error) => {
            console.error('Error sharing:', error);
            fallbackShare(shareText);
        });
    } else {
        fallbackShare(shareText);
    }
}

// פונקציית גיבוי לשיתוף כאשר Web Share API לא זמין
function fallbackShare(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        showStatusMessage('המידע הועתק ללוח. ניתן להדביק ולשלוח.', 'success');
    } catch (err) {
        console.error('Error copying text:', err);
        showStatusMessage('לא ניתן להעתיק את המידע.', 'error');
    }
    
    document.body.removeChild(textarea);
}

// Clear search function
function clearSearch() {
    searchInput.value = '';
    clearSearchButton.classList.add('hidden');
    currentSearchQuery = '';
    
    // Reset search results to default state
    if (activeCategory) {
        // If a category is selected, show only that category
        performSearch();
    } else {
        // If no category is selected, show default results
        renderDefaultResults();
    }
    
    // Focus on search input after clearing
    searchInput.focus();
}

// PWA Installation Logic
const installPrompt = document.getElementById('install-prompt');
const installButtonAndroid = document.getElementById('install-button-android');
const laterButton = document.getElementById('later-button');
const closePromptButton = document.getElementById('close-prompt');
const androidInstructions = document.getElementById('android-instructions');
const iosInstructions = document.getElementById('ios-instructions');

// Store install prompt event for later use
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Check if this is a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Only proceed if on mobile device
    if (!isMobile) {
        // Not a mobile device, don't show the install prompt
        return;
    }
    
    // Detect browser platform
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isIOS) {
        // Show iOS specific instructions
        androidInstructions.classList.add('hidden');
        iosInstructions.classList.remove('hidden');
    } else {
        // Show Android/others instructions
        androidInstructions.classList.remove('hidden');
        iosInstructions.classList.add('hidden');
    }
    
    // Show install prompt if not installed and not recently dismissed
    const lastPromptTime = localStorage.getItem('installPromptDismissed');
    const now = new Date().getTime();
    
    // Show prompt if never shown or shown more than 7 days ago
    if (!lastPromptTime || now - parseInt(lastPromptTime) > 7 * 24 * 60 * 60 * 1000) {
        // Wait 3 seconds before showing the prompt to avoid overwhelming the user
        setTimeout(() => {
            showInstallPrompt();
        }, 3000);
    }
});

// Detect if in standalone mode (already installed)
window.addEventListener('load', () => {
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
        // App is installed, don't show install prompt
        return;
    }
    
    // Check if this is a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Only proceed if on mobile device
    if (!isMobile) {
        // Not a mobile device, don't show the install prompt
        return;
    }
    
    // For iOS devices (Safari doesn't fire beforeinstallprompt)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS && !deferredPrompt) {
        // Check if we should show the iOS instructions
        const lastPromptTime = localStorage.getItem('installPromptDismissed');
        const now = new Date().getTime();
        
        if (!lastPromptTime || now - parseInt(lastPromptTime) > 7 * 24 * 60 * 60 * 1000) {
            androidInstructions.classList.add('hidden');
            iosInstructions.classList.remove('hidden');
            
            // Wait 3 seconds before showing the prompt
            setTimeout(() => {
                showInstallPrompt();
            }, 3000);
        }
    }
});

// Show install prompt
function showInstallPrompt() {
    if (installPrompt) {
        installPrompt.classList.add('show');
    }
}

// Hide install prompt
function hideInstallPrompt() {
    if (installPrompt) {
        installPrompt.classList.remove('show');
        // Save the time when the prompt was dismissed
        localStorage.setItem('installPromptDismissed', new Date().getTime());
    }
}

// Handle Android install button click
if (installButtonAndroid) {
    installButtonAndroid.addEventListener('click', async () => {
        if (deferredPrompt) {
            // Show browser install prompt
            deferredPrompt.prompt();
            // Wait for user choice
            const { outcome } = await deferredPrompt.userChoice;
            // Clear the deferredPrompt so it can be used again later
            deferredPrompt = null;
            
            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
                showStatusMessage('האפליקציה מותקנת!', 'success');
            } else {
                console.log('User dismissed the install prompt');
            }
        }
        
        // Hide our custom prompt
        hideInstallPrompt();
    });
}

// Handle later button click
if (laterButton) {
    laterButton.addEventListener('click', () => {
        hideInstallPrompt();
    });
}

// Handle close button click
if (closePromptButton) {
    closePromptButton.addEventListener('click', () => {
        hideInstallPrompt();
    });
}

// הוסף את זה בתחילת הקובץ, אחרי הגדרת המשתנים הגלובליים
document.addEventListener('DOMContentLoaded', () => {
    // הוסף סגנונות דינמיים
    const style = document.createElement('style');
    style.textContent = `
        .visible-grid {
            display: grid !important;
            opacity: 1 !important;
            visibility: visible !important;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important;
            gap: 1rem !important;
            padding: 1rem !important;
        }
    `;
    document.head.appendChild(style);
    
    // אתחול כפתור הToggle לקטגוריות
     const toggleButton = document.getElementById('toggle-categories');
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleCategories);
        
        // וודא שהקטגוריות מוסתרות בטעינה הראשונית
        const categoriesContainer = document.getElementById('categories-container');
        if (categoriesContainer) {
            if (isCategoriesCollapsed) {
                categoriesContainer.classList.add('collapsed');
                document.querySelector('.toggle-icon').classList.remove('rotated');
            } else {
                categoriesContainer.classList.remove('collapsed');
                document.querySelector('.toggle-icon').classList.add('rotated');
            }
        }
});
}
function performSearch() {
    console.log('Performing search...');
    const query = searchInput.value.trim().toLowerCase();
    currentSearchQuery = query;

    // אם אין חיפוש ואין קטגוריה נבחרת, הצג את הודעת ברירת המחדל
    if (!query && !activeCategory) {
        renderDefaultResults();
        updateResultsCount(0);
        return;
    }

    let results = [];
    if (allServicesData) {
        console.log('Filtering services...');
        console.log('Active category:', activeCategory);
        console.log('Current query:', currentSearchQuery);
        
        results = allServicesData.filter(service => {
            const matchesQuery = !query || 
                service.name.toLowerCase().includes(query) ||
                service.description.toLowerCase().includes(query) ||
                (service.tags && service.tags.some(tag => tag.toLowerCase().includes(query)));

            const matchesCategory = !activeCategory || service.category === activeCategory;

            return matchesQuery && matchesCategory;
        });

        console.log('Found results:', results.length);
    }

    // רנדר את התוצאות
    renderResults(results);
    
    // גלילה לתוצאות
    scrollToResults();
    
    // הצגת מספר התוצאות
    updateResultsCount(results.length);
}

function renderCategories() {
    if (!allServicesData || !Array.isArray(allServicesData)) {
        console.error('Invalid data format for categories');
        return;
    }

    // Get unique categories
    const categories = [...new Set(allServicesData.map(service => service.category))];
    
    const container = document.getElementById('categories-container');
    if (!container) return;

    container.innerHTML = '';

    categories.forEach(category => {
        if (!category) return;

        const card = document.createElement('div');
        card.className = 'category-card';
        card.setAttribute('data-category', category);

        const icon = getCategoryIcon(category);
        
        card.innerHTML = `
            <div class="category-icon">${icon}</div>
            <div class="category-name">${category}</div>
        `;

        card.addEventListener('click', () => selectCategory(category));
        
        if (category === activeCategory) {
            card.classList.add('active');
        }

        container.appendChild(card);
    });
    
    // שמור על מצב הקטגוריות (פתוח/סגור)
    if (isCategoriesCollapsed) {
        container.classList.add('collapsed');
    } else {
        container.classList.remove('collapsed');
    }
}

// פונקציות לתקשורת עם ה-CMS
async function fetchServices(filters = {}) {
  try {
    const queryParams = new URLSearchParams({
      ...filters,
      populate: '*'  // כולל קטגוריות ותגיות
    });
    
    const response = await fetch(`${API_URL}/api/services?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      }
    });
    
    if (!response.ok) throw new Error('שגיאה בטעינת השירותים');
    
    const data = await response.json();
    return data.data.map(processServiceData);
  } catch (error) {
    console.error('שגיאה בטעינת שירותים:', error);
    throw error;
  }
}

async function fetchCategories() {
  try {
    const response = await fetch(`${API_URL}/api/categories?sort=order:asc`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      }
    });
    
    if (!response.ok) throw new Error('שגיאה בטעינת הקטגוריות');
    
    const data = await response.json();
    return data.data.map(category => ({
      id: category.id,
      name: category.attributes.name,
      icon: category.attributes.icon,
      color: category.attributes.color
    }));
  } catch (error) {
    console.error('שגיאה בטעינת קטגוריות:', error);
    throw error;
  }
}

// עיבוד נתונים מה-CMS
function processServiceData(service) {
  const { attributes } = service;
  return {
    id: service.id,
    name: attributes.name,
    description: attributes.description,
    category: attributes.category?.data?.attributes?.name,
    contact: {
      phones: attributes.contact?.phone || [],
      email: attributes.contact?.email,
      website: attributes.contact?.website
    },
    address: attributes.address,
    tags: attributes.tags?.data?.map(tag => tag.attributes.name) || [],
    isAccessible: attributes.isAccessible,
    isFree: attributes.isFree,
    lastUpdated: new Date(attributes.updatedAt)
  };
}

// עדכון פונקציית הטעינה הראשונית
async function initializeApp() {
  try {
    const [categories, services] = await Promise.all([
      fetchCategories(),
      fetchServices()
    ]);
    
    updateCategoriesUI(categories);
    updateServicesUI(services);
  } catch (error) {
    showError('שגיאה בטעינת הנתונים');
  }
}

// פונקציה לטוגל הקטגוריות
function toggleCategories() {
    const categoriesContainer = document.getElementById('categories-container');
    const toggleIcon = document.querySelector('.toggle-icon');
    
    if (!categoriesContainer) return;
    
    isCategoriesCollapsed = !isCategoriesCollapsed;
    
    if (isCategoriesCollapsed) {
        categoriesContainer.classList.add('collapsed');
        toggleIcon.classList.remove('rotated');
    } else {
        categoriesContainer.classList.remove('collapsed');
        toggleIcon.classList.add('rotated');
    }
}

// פונקציה לגלילה לתוצאות
function scrollToResults() {
    const resultsSection = document.querySelector('.results-section');
    if (resultsSection) {
        // גלילה חלקה לתחילת התוצאות
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// פונקציה לעדכון מספר התוצאות
function updateResultsCount(count) {
    const resultsCount = document.getElementById('results-count');
    if (resultsCount) {
        resultsCount.textContent = `נמצאו ${count} תוצאות`;
    }
}
