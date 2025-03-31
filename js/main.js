// Import modules
import { UIManager } from './ui/uiManager.js';
import { SearchManager } from './ui/searchManager.js';
import { CategoryManager } from './ui/categoryManager.js';
import { ResultsManager } from './ui/resultsManager.js';
import { ModalManager } from './ui/modalManager.js';
import { InstallManager } from './pwa/installManager.js';
import { DataService } from './services/dataService.js';

// יצירת מופע של שירות הנתונים לשימוש גלובלי
export const dataService = new DataService();

// Register Service Worker
if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('ServiceWorker registration failed:', error);
            });
    });
}

// אתחול האפליקציה בטעינת העמוד
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Initializing application...');
        
        // טעינת נתונים ראשונית
        await dataService.refreshData();
        
        // יצירת מופע UI Manager עם הנתונים שנטענו
        const uiManager = new UIManager();
        await uiManager.initialize();
        
        // שמירת המופע בחלון לגישה מקומפוננטים אחרים
        window.uiManager = uiManager;
        
        // פרסום אירוע מוכנות UI Manager
        window.dispatchEvent(new Event('uiManagerReady'));
        
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
