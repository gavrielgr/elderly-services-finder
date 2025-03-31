// Import modules
import { UIManager } from './ui/uiManager.js';
import { SearchManager } from './ui/searchManager.js';
import { CategoryManager } from './ui/categoryManager.js';
import { ResultsManager } from './ui/resultsManager.js';
import { ModalManager } from './ui/modalManager.js';
import { InstallManager } from './pwa/installManager.js';

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/assets/sw-ki5AU8Ys.js', { scope: '/' })
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Initializing application...');
        const uiManager = new UIManager();
        await uiManager.initialize();
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
        document.body.innerHTML = `
            <div class="error-message">
                <h1>שגיאה בטעינת האפליקציה</h1>
                <p>אנא נסה לרענן את הדף</p>
            </div>
        `;
    }
});
