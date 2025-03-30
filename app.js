import { CACHE_VERSION, APP_VERSION } from './js/config/constants.js';
import { dataService } from './js/services/dataService.js';
import { UIManager } from './js/ui/uiManager.js';
import { installManager } from './js/services/installManager.js';

// Initialize global state
let isOnline = navigator.onLine;

// Create instances
const uiManager = new UIManager();

// Initialize the application
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    console.log(`Elderly Services Finder v${APP_VERSION}`);
    console.log(`Cache Version: ${CACHE_VERSION}`);
    
    // Inject app version into the footer
    const appVersionElement = document.getElementById('app-version');
    if (appVersionElement) {
        appVersionElement.textContent = `גרסה: ${APP_VERSION}`;
    }
    
    uiManager.updateConnectionStatus(isOnline);
    
    try {
        await dataService.refreshData(false);
        uiManager.renderInitialUI();
        
        // Check if app is installable
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            const installButton = document.getElementById('install-button');
            if (installButton) {
                installButton.style.display = 'block';
            }
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
                
                // Listen for updates from the service worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data.type === 'SERVICE_WORKER_UPDATED') {
                        console.log('New service worker version available:', event.data.version);
                        // Force reload to get the latest version
                        window.location.reload(true);
                    }
                });
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    });
}

// Initialize install manager
installManager.init();

