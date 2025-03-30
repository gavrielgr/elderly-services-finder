import { UIManager } from './ui/uiManager.js';

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker registered successfully');
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    });
}

// Initialize UI
const uiManager = new UIManager();