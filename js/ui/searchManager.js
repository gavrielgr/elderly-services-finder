import { debounce } from '../utils/helpers.js';
import { dataService } from '../services/dataService.js';

export class SearchManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.currentQuery = '';
        this.searchInput = document.getElementById('search-input');
        this.searchButton = document.getElementById('search-button');
        this.clearButton = document.getElementById('clear-search-button');
        
        this.initializeListeners();
    }
    
    initializeListeners() {
        this.searchInput.addEventListener('input', debounce(() => this.handleSearch(), 300));
        this.searchButton.addEventListener('click', () => this.handleSearch());
        this.clearButton.addEventListener('click', () => this.clearSearch());
        this.searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
    }

    handleSearch() {
        this.currentQuery = this.searchInput.value.trim();
        this.toggleClearButton();
        this.uiManager.resultsManager.performSearch(this.currentQuery);
    }

    clearSearch() {
        if (this.searchInput.value === '' && !this.uiManager.categoryManager.activeCategory) {
            return; // Do nothing if search is already empty and no category is selected
        }
        
        this.searchInput.value = '';
        this.currentQuery = '';
        this.toggleClearButton();
        
        if (this.uiManager.categoryManager.activeCategory) {
            this.uiManager.resultsManager.performSearch(''); // Show results for active category
        } else {
            this.uiManager.resultsManager.renderDefaultResults();
        }
        
        this.searchInput.focus();
    }

    toggleClearButton() {
        if (this.currentQuery) {
            this.clearButton.classList.remove('hidden');
        } else {
            this.clearButton.classList.add('hidden');
        }
    }
}
