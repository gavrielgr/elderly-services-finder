import { dataService } from '../services/dataService.js';
import Fuse from '../../node_modules/fuse.js/dist/fuse.esm.js'; // Update this import

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

        // Check if debug mode is enabled
        const urlParams = new URLSearchParams(window.location.search);
        const isDebugMode = urlParams.get('debug') === 'true';

        // Configure Fuse.js options
        const fuse = new Fuse(services, {
            keys: ['name', 'description', 'tags'], // Fields to search
            threshold: 0.2, // Lower threshold for stricter matching
            distance: 40, // Smaller distance for closer matches
            ignoreLocation: true, // Ignore match location
            includeMatches: isDebugMode, // Include match details only in debug mode
        });

        let results = searchQuery ? fuse.search(searchQuery) : services;

        // Log why each result was found if debug mode is enabled
        if (isDebugMode) {
            results.forEach(result => {
                if (result.matches) {
                    console.log(`Result found: ${result.item.name}`);
                    result.matches.forEach(match => {
                        console.log(`  Matched field: ${match.key}`);
                        console.log(`  Matched value: ${match.value}`);
                        console.log(`  Matched indices:`, match.indices);
                    });
                }
            });
        }

        // Extract items from Fuse.js results
        results = results.map(result => {
            if (isDebugMode && result.matches) {
                // Highlight matched text only in debug mode
                result.item.highlightedFields = this.getHighlightedFields(result.matches);
            }
            return result.item;
        });

        // Filter by category if active
        if (activeCategory) {
            results = results.filter(service => service.category === activeCategory);
        }

        this.renderResults(results);
        this.updateResultsCount(results.length);
    }

    getHighlightedFields(matches) {
        const highlighted = {};
        matches.forEach(match => {
            const { key, value, indices } = match;
            let highlightedValue = '';
            let lastIndex = 0;

            indices.forEach(([start, end]) => {
                highlightedValue += value.substring(lastIndex, start);
                highlightedValue += `<mark>${value.substring(start, end + 1)}</mark>`;
                lastIndex = end + 1;
            });

            highlightedValue += value.substring(lastIndex);
            highlighted[key] = highlightedValue;
        });
        return highlighted;
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
            <h3 class="result-name">${service.highlightedFields?.name || service.name}</h3>
            <p class="result-description">${service.highlightedFields?.description || service.description}</p>
            ${service.tags ? `
                <div class="result-tags">
                    ${service.tags.map(tag => service.highlightedFields?.tags?.includes(tag) ? `<mark>${tag}</mark>` : `<span class="result-tag">${tag}</span>`).join('')}
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
