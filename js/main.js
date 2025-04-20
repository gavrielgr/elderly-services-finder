import 'bootstrap/dist/css/bootstrap.min.css';

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

// Service Worker registration moved to app.js
// if ('serviceWorker' in navigator && location.hostname !== 'localhost') { ... }

// Initialization logic moved to app.js
// document.addEventListener('DOMContentLoaded', async () => { ... });
