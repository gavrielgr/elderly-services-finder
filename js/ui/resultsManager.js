import { dataService } from '../services/dataService.js';

export class ResultsManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.resultsContainer = document.getElementById('results-container');
        this.resultsCount = document.getElementById('results-count');
        this.viewMode = localStorage.getItem('viewMode') || 'grid';
        
        this.initializeViewToggle();
    }

    performSearch(searchQuery = '') {
        const services = dataService.getData();
        if (!services) return;

        const activeCategory = this.uiManager.categoryManager.activeCategory;
        
        // Keep the last search query from the search input if no new query is provided
        if (!searchQuery && this.uiManager.searchManager.currentQuery) {
            searchQuery = this.uiManager.searchManager.currentQuery;
        }
        
        // Only show default message if both search and category are empty
        if (!searchQuery && !activeCategory) {
            this.renderDefaultResults();
            return;
        }

        let results = services.filter(service => {
            const matchesQuery = !searchQuery || 
                service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (service.tags && service.tags.some(tag => 
                    tag.toLowerCase().includes(searchQuery.toLowerCase())
                ));

            const matchesCategory = !activeCategory || service.category === activeCategory;

            return matchesQuery && matchesCategory;
        });

        this.renderResults(results);
        this.updateResultsCount(results.length);
    }

    renderDefaultResults() {
        this.resultsContainer.innerHTML = '';
        this.updateResultsCount(0, false);
    }

    initializeViewToggle() {
        const gridViewButton = document.getElementById('grid-view-button');
        const listViewButton = document.getElementById('list-view-button');

        if (gridViewButton && listViewButton) {
            gridViewButton.addEventListener('click', () => this.setViewMode('grid'));
            listViewButton.addEventListener('click', () => this.setViewMode('list'));
            this.setViewMode(this.viewMode);
        }
    }

    renderResults(results) {
        if (!results || !Array.isArray(results)) return;
        
        const container = document.getElementById('results-container');
        container.innerHTML = '';
        
        if (results.length === 0) {
            this.updateResultsCount(0);
            return;
        }

        const fragment = document.createDocumentFragment();
        results.forEach(service => {
            const card = this.createResultCard(service);
            if (card) fragment.appendChild(card);
        });

        container.appendChild(fragment);
        container.className = `results-container ${this.viewMode}-view`;
    }

    createResultCard(service) {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.setAttribute('data-category', service.category);
        
        card.innerHTML = `
            <div class="result-category-tag">${service.category}</div>
            <h3 class="result-name">${service.name}</h3>
            <p class="result-description">${service.description}</p>
            ${service.tags ? `
                <div class="result-tags">
                    ${service.tags.map(tag => `<span class="result-tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
        `;

        card.addEventListener('click', () => {
            this.uiManager.modalManager.showServiceDetails(service);
        });

        return card;
    }

    setViewMode(mode) {
        this.viewMode = mode;
        localStorage.setItem('viewMode', mode);
        
        document.getElementById('grid-view-button').classList.toggle('active', mode === 'grid');
        document.getElementById('list-view-button').classList.toggle('active', mode === 'list');
        
        if (this.resultsContainer) {
            this.resultsContainer.className = `results-container ${mode}-view`;
        }
    }

    updateResultsCount(count, hasActiveSearch = true) {
        if (!this.resultsCount) return;

        if (!hasActiveSearch) {
            this.resultsCount.textContent = 'קלידו מילות חיפוש או בחרו קטגוריה'; // Default text
        } else {
            const activeCategory = this.uiManager.categoryManager.activeCategory;
            const categoryText = activeCategory ? ` בקטגוריה: ${activeCategory}` : '';
            this.resultsCount.textContent = `נמצאו ${count} תוצאות${categoryText}`;
        }

        this.resultsCount.classList.add('has-results'); // Always show results-count
    }
}
