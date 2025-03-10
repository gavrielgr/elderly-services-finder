// Global variables
const APP_VERSION = '1.0.0';
const DB_NAME = 'elderlyServicesDB';
const DB_VERSION = 1;
const STORE_NAME = 'servicesData';
const DATA_KEY = 'allServicesData';
const LAST_UPDATED_KEY = 'lastUpdated';

// Replace with your actual Google Apps Script URL
const API_URL = 'https://script.google.com/macros/s/REPLACE_WITH_YOUR_DEPLOYED_SCRIPT_ID/exec';

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const voiceSearchButton = document.getElementById('voice-search-button');
const noWaitlistCheckbox = document.getElementById('no-waitlist-checkbox');
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

// Category icons mapping (default icons if not specified in data)
const categoryIcons = {
    'שירותים ומסגרות בזקנה': '🏢',
    'ניצולי שואה': '🕯️',
    'מוקדים ממשלתיים': '🏛️',
    'תוכניות משרד לשיוון חברתי': '📝',
    'מנועי חיפוש לזקנה': '🔍',
    'בעלי מקצוע': '👨‍⚕️',
    'הטפול בזקן בישראל': '🏥',
    'default': '📋'
};

// State
let allServicesData = null;
let lastUpdated = null;
let activeCategory = null;
let currentSearchQuery = '';
let noWaitlistOnly = false;
let currentServiceDetails = null;
let isOnline = navigator.onLine;

// Initialize the application
document.addEventListener('DOMContentLoaded', initApp);

// Event listeners
searchButton.addEventListener('click', performSearch);
searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') performSearch();
});
voiceSearchButton.addEventListener('click', startVoiceSearch);
noWaitlistCheckbox.addEventListener('change', () => {
    noWaitlistOnly = noWaitlistCheckbox.checked;
    performSearch();
});
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

// Initialize the application
async function initApp() {
    updateConnectionStatus();
    
    try {
        // Load data from IndexedDB
        await loadFromIndexedDB();
        
        // If online, check for updates
        if (isOnline) {
            refreshData(true); // Silent refresh (no UI notification if no changes)
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        showStatusMessage('שגיאה בטעינת המידע. נסה שוב מאוחר יותר.', 'error');
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

// Fetch data from API
async function fetchDataFromAPI() {
    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            return {
                data: data.data,
                lastUpdated: data.lastUpdated
            };
        } else {
            throw new Error('API returned error status');
        }
    } catch (error) {
        console.error('Error fetching data from API:', error);
        throw error;
    }
}

// Refresh data from API
async function refreshData(silent = false) {
    if (!isOnline) {
        if (!silent) showStatusMessage('אין חיבור לאינטרנט. לא ניתן לרענן את המידע.', 'warning');
        return;
    }
    
    if (!silent) showStatusMessage('מרענן נתונים...');
    
    try {
        const apiData = await fetchDataFromAPI();
        const newData = apiData.data;
        const newLastUpdated = apiData.lastUpdated;
        
        // Check if data is new compared to what we have
        if (lastUpdated !== newLastUpdated) {
            // Update state
            allServicesData = newData;
            lastUpdated = newLastUpdated;
            
            // Save to IndexedDB
            await saveToIndexedDB(newData, newLastUpdated);
            
            // Update UI
            updateLastUpdatedText();
            renderCategories();
            performSearch(); // Refresh search results
            
            if (!silent) showStatusMessage('המידע עודכן בהצלחה!', 'success');
        } else {
            if (!silent) showStatusMessage('המידע עדכני, אין צורך ברענון.', 'info');
        }
    } catch (error) {
        console.error('Error refreshing data:', error);
        if (!silent) showStatusMessage('שגיאה ברענון המידע. נסה שוב מאוחר יותר.', 'error');
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

async function saveToIndexedDB(data, lastUpdated) {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            // Save the data
            store.put({ key: DATA_KEY, value: data });
            
            // Save the last updated timestamp
            store.put({ key: LAST_UPDATED_KEY, value: lastUpdated });
            
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject('Error saving to database');
        });
    } catch (error) {
        console.error('Error in saveToIndexedDB:', error);
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
            lastUpdated = timestamp;
            updateLastUpdatedText();
            renderCategories();
            renderDefaultResults();
        } else {
            categoriesContainer.innerHTML = '<div class="category-loading">אין מידע זמין. אנא רענן כשיש חיבור לאינטרנט.</div>';
            resultsContainer.innerHTML = '<div class="results-message">אין מידע זמין. אנא רענן כשיש חיבור לאינטרנט.</div>';
        }
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
        const date = new Date(lastUpdated);
        const formattedDate = new Intl.DateTimeFormat('he-IL', {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
        }).format(date);
        
        lastUpdatedText.textContent = `עודכן: ${formattedDate}`;
    } else {
        lastUpdatedText.textContent = 'לא עודכן עדיין';
    }
}

function renderCategories() {
    if (!allServicesData) return;
    
    // Clear categories container
    categoriesContainer.innerHTML = '';
    
    // Get sheet names as categories
    const categories = Object.keys(allServicesData);
    
    // Create category cards
    categories.forEach(categoryName => {
        if (!categoryName || categoryName === 'גיליון2') return; // Skip empty sheet
        
        const categoryCard = document.createElement('div');
        categoryCard.className = 'category-card';
        if (categoryName === activeCategory) {
            categoryCard.classList.add('active');
        }
        
        const icon = categoryIcons[categoryName] || categoryIcons.default;
        
        categoryCard.innerHTML = `
            <div class="category-icon">${icon}</div>
            <div class="category-name">${categoryName}</div>
        `;
        
        categoryCard.addEventListener('click', () => {
            if (activeCategory === categoryName) {
                // Deselect if already active
                activeCategory = null;
                categoryCard.classList.remove('active');
            } else {
