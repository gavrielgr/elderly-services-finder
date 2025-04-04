import { UIManager } from './ui/uiManager.js';
import { DataService } from './services/dataService.js';

// Register service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch(error => {
            console.error('Service Worker registration failed:', error);
        });
}

// Initialize the app
async function initApp() {
    try {
        // Check for stored theme preference
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) {
            document.documentElement.setAttribute('data-theme', storedTheme);
        }
        
        // Initialize data services
        const dataService = new DataService();
        await dataService.refreshData();
        
        // Store interest areas in window object for global access
        if (!window.appData) window.appData = {};
        window.appData.interestAreas = dataService.getInterestAreas();
        
        // Listen for data updates
        window.addEventListener('dataUpdated', (event) => {
            console.log('Data updated event received');
            // Update global interest areas data
            if (event.detail && event.detail.data) {
                window.appData.interestAreas = event.detail.data.interestAreas || [];
            }
        });
        
        // Initialize UI components
        const uiManager = new UIManager();
        
    } catch (error) {
        console.error('Error initializing the app:', error);
    }
}

// Start the app
initApp();