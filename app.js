// Global variables
const APP_VERSION = '1.97.0'; // Updated version number

// At the beginning of your app.js, after defining APP_VERSION
console.log('App Version:', APP_VERSION);

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
      
      // Force a page reload to ensure everything is fresh
      window.location.reload(true);
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

// Replace with your actual Google Apps Script URL
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
// State
let allServicesData = null;
let lastUpdated = null;
let activeCategory = null;
let currentSearchQuery = '';
let noWaitlistOnly = false;
let currentServiceDetails = null;
let isOnline = navigator.onLine;
let storedVersion = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', initApp);

// Event listeners

const themeSwitch = document.getElementById('theme-switch');

// בדיקה אם המשתמש כבר בחר מצב
const currentTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', currentTheme);

themeSwitch.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  // עדכון אייקון המתג
  const lightIcon = themeSwitch.querySelector('.light-mode-icon');
  const darkIcon = themeSwitch.querySelector('.dark-mode-icon');
  
  if (newTheme === 'dark') {
    lightIcon.classList.add('hidden');
    darkIcon.classList.remove('hidden');
  } else {
    darkIcon.classList.add('hidden');
    lightIcon.classList.remove('hidden');
  }
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

// Initialize the application
async function initApp() {
    updateConnectionStatus();
    
    try {
        // Check for version mismatch first
        await checkAppVersion();
        
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
        
        // Trim category name to handle spaces
        const trimmedCategoryName = categoryName.trim();
        
        const categoryCard = document.createElement('div');
        categoryCard.className = 'category-card';
        categoryCard.setAttribute('data-category', trimmedCategoryName);
        
        // Use trimmed name for comparison with active category
        if (trimmedCategoryName === activeCategory) {
            categoryCard.classList.add('active');
        }
        
        // Get icon using trimmed name
        const icon = categoryIcons[trimmedCategoryName] || categoryIcons.default;
        
        categoryCard.innerHTML = `
            <div class="category-icon">${icon}</div>
            <div class="category-name">${categoryName}</div>
        `;
        
        categoryCard.addEventListener('click', () => {
            if (activeCategory === trimmedCategoryName) {
                // Deselect if already active
                activeCategory = null;
                categoryCard.classList.remove('active');
            } else {
                // Remove active class from all categories
                document.querySelectorAll('.category-card').forEach(card => {
                    card.classList.remove('active');
                });
                
                // Set new active category (using trimmed name)
                activeCategory = trimmedCategoryName;
                categoryCard.classList.add('active');
            }
            
            // Update search results
            performSearch();
        });
        
        categoriesContainer.appendChild(categoryCard);
    });
}

function renderDefaultResults() {
    // אם אין חיפוש טקסט ואין קטגוריה נבחרת, הצג הודעה במקום כל התוצאות
    resultsContainer.innerHTML = '<div class="results-message">הזן מילות חיפוש או בחר קטגוריה כדי להציג תוצאות</div>';
}
// Search functions
function performSearch() {
    if (!allServicesData) {
        showStatusMessage('אין מידע זמין לחיפוש.', 'warning');
        return;
    }
    
    // Get search query and update clear button visibility
    currentSearchQuery = searchInput.value.trim().toLowerCase();
    
    // Show/hide clear button based on search text
    if (currentSearchQuery !== '') {
        clearSearchButton.classList.remove('hidden');
    } else {
        clearSearchButton.classList.add('hidden');
    }
    
    // Get filtered results
    const results = searchServices(currentSearchQuery, activeCategory, noWaitlistOnly);
    
    // Render results
    renderSearchResults(results);
}

function searchServices(query, category, noWaitlistOnly) {
    let results = [];
    const searchTerms = query.split(/\s+/).filter(term => term.length > 0);
    
    // אם אין חיפוש וגם אין קטגוריה נבחרת, החזר מערך ריק
    if (searchTerms.length === 0 && !category) {
        return [];
    }
    
    // Process each category (sheet)
    Object.entries(allServicesData).forEach(([sheetName, services]) => {
        // Trim sheet name for comparison with active category
        const trimmedSheetName = sheetName.trim();
        
        // Skip if category filter is applied and doesn't match
        if (category && category !== trimmedSheetName) return;
        
        // Skip empty sheets
        if (sheetName === 'גיליון2') return;
        
        // Process each service in the category
        services.forEach(service => {
            // Check for waitlist if filter is applied
            const hasWaitlist = service['רשימת המתנה'] === 'כן';
            if (noWaitlistOnly && hasWaitlist) return;
            
            // If no search terms but category is selected, include all services from the category
            if (searchTerms.length === 0 && category) {
                results.push({
                    ...service,
                    category: trimmedSheetName
                });
                return;
            }
            
            // Search across all fields
            const allValues = Object.values(service)
                .filter(value => value && typeof value === 'string')
                .join(' ')
                .toLowerCase();
            
            // Check if all search terms match
            const matchesAllTerms = searchTerms.every(term => allValues.includes(term));
            
            if (matchesAllTerms) {
                results.push({
                    ...service,
                    category: trimmedSheetName
                });
            }
        });
    });
    
    return results;
}

function renderSearchResults(results) {
    // Clear results container
    resultsContainer.innerHTML = '';
    
    // If no results
    if (results.length === 0) {
        // Check if any search was performed (either text search or category selection)
        if (currentSearchQuery || activeCategory) {
            // If search was attempted but found nothing
            resultsContainer.innerHTML = '<div class="no-results">לא נמצאו תוצאות</div>';
        } else {
            // If no search was attempted
            resultsContainer.innerHTML = '<div class="results-message">הזן מילות חיפוש או בחר קטגוריה כדי להציג תוצאות</div>';
        }
        return;
    }
    
    results.forEach((service, index) => {
        const resultCard = document.createElement('div');
        resultCard.className = 'result-card';
        
        // הוספת מאפיין data-category לצורך הסגנון
        resultCard.setAttribute('data-category', service.category.trim());
        
        // Keep the existing animation delay
        resultCard.style.animationDelay = `${index * 0.05}s`;
        
        // Get common fields
        const name = service['שם העסק'] || service['שם התוכנית'] || service['מוקד'] || service['אנשי מקצוע'] || 'שירות ללא שם';
        const type = service['סוג'] || '';
        const description = service['תיאור העסק'] || service['תיאור כללי'] || service['זכויות ותחומי אחריות'] || service['תחום'] || '';
        const contact = service['טלפון / אימייל'] || service['טלפון'] || service['מס\' טלפון'] || service['אימייל'] || '';
        
        // Create interest tags - עדכון קוד תחומי עניין
        let interestTags = [];
        const interestField = service['תחום עניין'];
        
        if (interestField && typeof interestField === 'string') {
            // פיצול הערכים לפי פסיקים וטיפול ברווחים מיותרים
            interestTags = interestField.split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0); // סינון ערכים ריקים
        }
        
        // Create result card HTML with category tag
        let cardHTML = `
            <div class="result-name">${name}</div>
            <div class="result-category-tag">${service.category.trim()}</div>
        `;
        
        if (type) {
            cardHTML += `<div class="result-type">${type}</div>`;
        }
        
        if (description) {
            cardHTML += `<div class="result-description">${description.substring(0, 100)}${description.length > 100 ? '...' : ''}</div>`;
        }
        
        if (contact) {
            cardHTML += `<div class="result-contact">${contact}</div>`;
        }
        
        // הוספת תגיות תחומי עניין רק אם יש כאלה
        if (interestTags.length > 0) {
            cardHTML += `
                <div class="result-tags">
                    ${interestTags.map(tag => `<span class="result-tag">${tag}</span>`).join('')}
                </div>
            `;
        }
        
        resultCard.innerHTML = cardHTML;
        
        // Add click event to show details
        resultCard.addEventListener('click', () => {
            showServiceDetails(service);
        });
        
        resultsContainer.appendChild(resultCard);
    });
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
    
    // Get common fields
    const name = service['שם העסק'] || service['שם התוכנית'] || service['מוקד'] || service['אנשי מקצוע'] || 'שירות ללא שם';
    
    // Start with service name
    let detailsHTML = `<h2 class="service-name">${name}</h2>`;
    
    // Create a map of field display names (Hebrew)
    const fieldDisplayNames = {
        'סוג': 'סוג שירות',
        'תיאור העסק': 'תיאור',
        'תיאור כללי': 'תיאור',
        'זכויות ותחומי אחריות': 'זכויות ותחומי אחריות',
        'אתר': 'אתר אינטרנט',
        'קישור לאתר': 'אתר אינטרנט',
        'טלפון / אימייל': 'פרטי התקשרות',
        'טלפון': 'טלפון',
        'מס\' טלפון': 'טלפון',
        'אימייל': 'אימייל',
        'הערות': 'הערות נוספות',
        'מטרת התוכנית': 'מטרת התוכנית',
        'תחום': 'תחום מקצועי',
        'תחום עניין': 'תחומי עניין'
    };
    
    // Add fields based on category
    Object.entries(service).forEach(([field, value]) => {
        // Skip empty values, ID field, and category field
        if (!value || field === 'id' || field === 'category' || value.trim() === '') return;
        
        // Skip fields that are handled separately
        if (field === 'תחום עניין') return;
        
        // Get display name for the field, or use the field name
        const displayName = fieldDisplayNames[field] || field;
        
        // Format value based on field type
        let formattedValue = value;
        
        // Handle website URLs
        if (field === 'אתר' || field === 'קישור לאתר') {
            let url = value;
            if (!url.startsWith('http')) {
                url = 'https://' + url;
            }
            formattedValue = `<a href="${url}" target="_blank" rel="noopener noreferrer">${value}</a>`;
        }
        
        // Handle contact info
        if (field === 'טלפון' || field === 'מס\' טלפון') {
            const phoneNumber = value.replace(/\D/g, ''); // Remove non-digits
            formattedValue = `<a href="tel:${phoneNumber}">${value}</a>`;
        }
        
        if (field === 'אימייל') {
            formattedValue = `<a href="mailto:${value}">${value}</a>`;
        }
        
        // Add to details HTML
        detailsHTML += `
            <div class="service-detail">
                <div class="service-detail-label">${displayName}</div>
                <div class="service-detail-value">${formattedValue}</div>
            </div>
        `;
    });
    
    // הוספת תחומי עניין כשדה נפרד, עם פיצול לפי פסיקים
    if (service['תחום עניין'] && service['תחום עניין'].trim()) {
        const interestTags = service['תחום עניין'].split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
            
        if (interestTags.length > 0) {
            detailsHTML += `
                <div class="service-detail">
                    <div class="service-detail-label">תחומי עניין</div>
                    <div class="service-detail-value service-tags">
                        ${interestTags.map(tag => `<span class="service-tag">${tag}</span>`).join('')}
                    </div>
                </div>
            `;
        }
    }
    
    // Set HTML and show modal
    serviceDetailsContainer.innerHTML = detailsHTML;
    serviceModal.style.display = 'block';
    
    // Configure call button
    const phoneNumber = service['טלפון'] || service['מס\' טלפון'] || service['טלפון / אימייל'];
    if (phoneNumber && /\d/.test(phoneNumber)) {
        callButton.style.display = 'block';
        callButton.dataset.phone = phoneNumber.replace(/\D/g, '');
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
    
    const name = currentServiceDetails['שם העסק'] || currentServiceDetails['שם התוכנית'] || currentServiceDetails['מוקד'] || currentServiceDetails['אנשי מקצוע'] || 'שירות לגיל השלישי';
    const contact = currentServiceDetails['טלפון'] || currentServiceDetails['מס\' טלפון'] || currentServiceDetails['טלפון / אימייל'] || '';
    const description = currentServiceDetails['תיאור העסק'] || currentServiceDetails['תיאור כללי'] || currentServiceDetails['זכויות ותחומי אחריות'] || '';
    
    let shareText = `${name}\n`;
    if (description) shareText += `${description}\n`;
    if (contact) shareText += `ליצירת קשר: ${contact}\n`;
    
    if (navigator.share) {
        navigator.share({
            title: name,
            text: shareText
        })
        .catch((error) => console.error('Error sharing:', error));
    } else {
        // Fallback for browsers that don't support Web Share API
        // Create a temporary textarea to copy text
        const textarea = document.createElement('textarea');
        textarea.value = shareText;
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            showStatusMessage('המידע הועתק ללוח. ניתן להדביק ולשלוח.', 'success');
        } catch (err) {
            showStatusMessage('לא ניתן להעתיק את המידע.', 'error');
        }
        
        document.body.removeChild(textarea);
    }
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
let deferredPrompt;
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
