import { SearchManager } from './searchManager.js';
import { CategoryManager } from './categoryManager.js';
import { ResultsManager } from './resultsManager.js';
import { ModalManager } from './modalManager.js';
import { DataService } from '../services/dataService.js';
import { getFromIndexedDB } from '../services/storageService.js';

export class UIManager {
    constructor() {
        this.dataService = new DataService();
        this.statusBar = document.getElementById('status-bar');
        this.connectionStatus = document.getElementById('connection-status');
        this.lastUpdatedText = document.getElementById('last-updated-text');
        this.scrollUpButton = document.getElementById('scroll-up-button');
        
        this.initThemeToggle();
        this.initRefreshButton();
        this.initScrollUpButton();
        
        // Check initial connection status if element exists
        if (this.connectionStatus) {
            this.updateConnectionStatus(navigator.onLine);
        }
    }

    async initialize() {
        try {
            const refreshed = await this.dataService.refreshData();
            if (!refreshed) {
                console.error('Failed to load data');
                this.showStatusMessage('שגיאה בטעינת הנתונים', 'error');
                return;
            }

            const services = this.dataService.getData();
            const categories = this.dataService.getCategories();
            
            if (!services || !Array.isArray(services) || !categories || !Array.isArray(categories)) {
                console.warn('Services or categories not available:', { services, categories });
                this.showStatusMessage('שגיאה בטעינת הנתונים', 'error');
                return;
            }

            // יצירת המנהלים אחרי טעינת הנתונים
            this.searchManager = new SearchManager(this);
            this.resultsManager = new ResultsManager(this);
            this.categoryManager = new CategoryManager(this);
            this.modalManager = new ModalManager(this);

            this.setupEventListeners();
            this.renderInitialUI();
        } catch (error) {
            console.error('Error initializing UI:', error);
            this.showStatusMessage('שגיאה בטעינת הנתונים', 'error');
        }
    }

    setupEventListeners() {
        // Listen for online/offline status
        window.addEventListener('online', () => {
            this.updateConnectionStatus(true);
            this.showStatusMessage('החיבור לאינטרנט חודש', 'success');
        });

        window.addEventListener('offline', () => {
            this.updateConnectionStatus(false);
            this.showStatusMessage('החיבור לאינטרנט נותק', 'error');
        });

        // Listen for data updates
        window.addEventListener('dataUpdated', (event) => {
            const { timestamp, data } = event.detail;
            this.updateLastUpdatedText(timestamp);
            this.showStatusMessage('המידע עודכן בהצלחה', 'success');
            this.resultsManager.updateResults(data);
        });
    }

    updateConnectionStatus(isOnline) {
        if (!this.connectionStatus) return;
        
        const onlineIcon = this.connectionStatus.querySelector('.status-icon.online');
        const offlineIcon = this.connectionStatus.querySelector('.status-icon.offline');
        
        if (onlineIcon && offlineIcon) {
            if (isOnline) {
                onlineIcon.classList.remove('hidden');
                offlineIcon.classList.add('hidden');
                this.connectionStatus.title = 'מחובר לאינטרנט';
            } else {
                onlineIcon.classList.add('hidden');
                offlineIcon.classList.remove('hidden');
                this.connectionStatus.title = 'מנותק מהאינטרנט';
            }
        }
    }

    showStatusMessage(message, type = 'info', duration = 3000) {
        if (!this.statusBar) return;

        this.statusBar.textContent = message;
        this.statusBar.className = 'status-bar show';
        
        if (type) this.statusBar.classList.add(type);
        
        setTimeout(() => {
            this.statusBar.classList.remove('show');
        }, duration);
    }

    updateLastUpdatedText(timestamp) {
        if (!this.lastUpdatedText) return;
        
        const date = new Date(timestamp);
        const formattedDate = date.toLocaleDateString('he-IL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        this.lastUpdatedText.textContent = `עודכן: ${formattedDate}`;
    }

    async renderInitialUI() {
        this.resultsManager.renderDefaultResults();
        this.categoryManager.renderCategories();
        
        // Load and display last updated timestamp
        const timestamp = this.dataService.getLastUpdated();
        if (timestamp) {
            this.updateLastUpdatedText(timestamp);
        }
    }

    initThemeToggle() {
        const themeSwitch = document.getElementById('theme-switch');
        if (!themeSwitch) return;

        const currentTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        this.updateThemeToggleIcon();

        themeSwitch.addEventListener('click', () => {
            const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            this.updateThemeToggleIcon();
        });
    }

    updateThemeToggleIcon() {
        const lightIcon = document.querySelector('.light-mode-icon');
        const darkIcon = document.querySelector('.dark-mode-icon');
        const currentTheme = document.documentElement.getAttribute('data-theme');
        
        if (currentTheme === 'dark') {
            lightIcon.classList.add('hidden');
            darkIcon.classList.remove('hidden');
        } else {
            darkIcon.classList.add('hidden');
            lightIcon.classList.remove('hidden');
        }
    }

    initRefreshButton() {
        document.getElementById('refresh-button')?.addEventListener('click', async () => {
            console.log('Refresh button clicked - starting data refresh');
            this.showStatusMessage('מרענן נתונים...', 'info');
            
            try {
                console.log('Attempting to refresh data from server...');
                const refreshed = await this.dataService.refreshData(true);
                
                if (refreshed) {
                    console.log('Data refresh successful - updating UI');
                    this.showStatusMessage('הנתונים עודכנו בהצלחה', 'success');
                    this.renderInitialUI();
                    this.updateLastUpdatedText(this.dataService.getLastUpdated());
                } else {
                    console.log('No new data available from server');
                    this.showStatusMessage('לא נמצאו עדכונים חדשים', 'info');
                }
            } catch (error) {
                console.error('Error during data refresh:', error);
                this.showStatusMessage('שגיאה בעדכון הנתונים', 'error');
            }
        });
    }

    initScrollUpButton() {
        this.scrollUpButton.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                this.scrollUpButton.classList.add('show');
            } else {
                this.scrollUpButton.classList.remove('show');
            }
        });
    }
}
