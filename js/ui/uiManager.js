import { SearchManager } from './searchManager.js';
import { CategoryManager } from './categoryManager.js';
import { ResultsManager } from './resultsManager.js';
import { ModalManager } from './modalManager.js';
import { dataService } from '../services/dataService.js';
import { getFromIndexedDB, LAST_UPDATED_KEY } from '../services/storageService.js';

export class UIManager {
    constructor() {
        this.searchManager = new SearchManager(this);
        this.categoryManager = new CategoryManager(this);
        this.resultsManager = new ResultsManager(this);
        this.modalManager = new ModalManager(this);
        
        this.statusBar = document.getElementById('status-bar');
        this.connectionStatus = document.getElementById('connection-status');
        this.lastUpdatedText = document.getElementById('last-updated-text');
        
        this.initThemeToggle();
        this.initRefreshButton();
    }

    updateConnectionStatus(isOnline) {
        const onlineIcon = document.querySelector('.status-icon.online');
        const offlineIcon = document.querySelector('.status-icon.offline');
        
        if (isOnline) {
            onlineIcon.classList.remove('hidden');
            offlineIcon.classList.add('hidden');
            this.connectionStatus.title = 'מחובר לאינטרנט';
        } else {
            onlineIcon.classList.add('hidden');
            offlineIcon.classList.remove('hidden');
            this.connectionStatus.title = 'לא מחובר לאינטרנט';
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
        if (!this.lastUpdatedText || !timestamp) return;
        
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return;
        
        const formattedDate = new Intl.DateTimeFormat('he-IL', {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
        }).format(date);
        
        this.lastUpdatedText.textContent = `עודכן: ${formattedDate}`;
    }

    async renderInitialUI() {
        this.categoryManager.renderCategories();
        this.resultsManager.renderDefaultResults();
        
        // Load and display last updated timestamp
        const timestamp = await getFromIndexedDB(LAST_UPDATED_KEY);
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
                const refreshed = await dataService.refreshData(true);
                
                if (refreshed) {
                    console.log('Data refresh successful - updating UI');
                    this.showStatusMessage('הנתונים עודכנו בהצלחה', 'success');
                    this.renderInitialUI();
                    this.updateLastUpdatedText(dataService.getLastUpdated());
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
}
