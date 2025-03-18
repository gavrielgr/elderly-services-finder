import { CACHE_VERSION, APP_VERSION } from './js/config/constants.js';
import { dataService } from './js/services/dataService.js';
import { UIManager } from './js/ui/uiManager.js';
import { InstallManager } from './js/pwa/installManager.js';

// Initialize global state
let isOnline = navigator.onLine;
let deferredPrompt = null;

// Create instances
const uiManager = new UIManager();
const installManager = new InstallManager();

// Initialize the application
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    console.log(`Elderly Services Finder v${APP_VERSION}`);
    console.log(`Cache Version: ${CACHE_VERSION}`);
    
    uiManager.updateConnectionStatus(isOnline);
    
    try {
        await dataService.refreshData(false);
        uiManager.renderInitialUI();
        
        if (installManager.isInstallable()) {
            installManager.showInstallPrompt();
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        uiManager.showStatusMessage('שגיאה בטעינת המידע. נסה שוב מאוחר יותר.', 'error');
    }
}

// Network status listeners
window.addEventListener('online', handleNetworkChange);
window.addEventListener('offline', handleNetworkChange);

function handleNetworkChange() {
    isOnline = navigator.onLine;
    uiManager.updateConnectionStatus(isOnline);
    
    if (isOnline) {
        uiManager.showStatusMessage('חיבור לאינטרנט זוהה! ניתן לרענן את המידע.', 'success');
    } else {
        uiManager.showStatusMessage('אתה במצב לא מקוון. המידע המוצג הוא המידע האחרון שנשמר במכשיר.', 'warning');
    }
}

// Service worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker registered successfully');
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    });
}

