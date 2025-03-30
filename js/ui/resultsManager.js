import { dataService } from '../services/dataService.js';
import Fuse from 'https://cdn.jsdelivr.net/npm/fuse.js@6.6.2/dist/fuse.esm.js';

export class ResultsManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.resultsContainer = document.getElementById('results-container');
        this.resultsCount = document.getElementById('results-count');
        this.viewMode = localStorage.getItem('viewMode') || 'grid';
        this.noResultsMessage = document.getElementById('no-results-message');
        this.currentResults = [];
        
        this.initializeViewToggle();
    }

    async performSearch(searchQuery = '') {
        const services = dataService.getData();
        if (!services) return;

        const activeCategory = this.uiManager.categoryManager.activeCategory;
        
        if (!searchQuery && this.uiManager.searchManager.currentQuery) {
            searchQuery = this.uiManager.searchManager.currentQuery;
        }
        
        // Modified regex to allow non-Hebrew characters including punctuation
        if (!/[\u0590-\u05FF]/.test(searchQuery)) {
            const hebrewEquivalent = await this.getHebrewEquivalent(searchQuery);
            if (hebrewEquivalent) {
                this.showHebrewSuggestion(hebrewEquivalent);
                return;
            }
        }

        // Only show default message if both search and category are empty
        if (!searchQuery && !activeCategory) {
            this.renderDefaultResults();
            return;
        }

        let results;
        
        // If we have a search query, use Fuse.js
        if (searchQuery) {
            const fuse = new Fuse(services, {
                keys: ['name', 'description', 'tags'],
                threshold: 0.2,
                distance: 40,
                ignoreLocation: true
            });

            results = fuse.search(searchQuery).map(result => result.item);
        } else {
            // If no search query, use all services
            results = services;
        }

        // Filter by category if active
        if (activeCategory) {
            results = results.filter(service => service.category === activeCategory);
        }

        // מיון התוצאות לפי א-ב
        results.sort((a, b) => {
            return a.name.localeCompare(b.name, 'he');
        });

        this.renderResults(results);
        this.updateResultsCount(results.length);
    }

    async getHebrewEquivalent(englishText) {
        const keyboardMap = {
            q: '/', w: "'", e: 'ק', r: 'ר', t: 'א', y: 'ט', u: 'ו', i: 'ן', o: 'ם', p: 'פ',
                a: 'ש', s: 'ד', d: 'ג', f: 'כ', g: 'ע', h: 'י', j: 'ח', k: 'ל', l: 'ך',
                z: 'ז', x: 'ס', c: 'ב', v: 'ה', b: 'נ', n: 'מ', m: 'צ', ',': 'ת', '.': 'ץ', ';': 'ף'
        };

        const hebrewText = englishText
            .split('')
            .map(char => keyboardMap[char.toLowerCase()] || char)
            .join('');

        if (hebrewText.length > 3) {
            const services = dataService.getData();
            const activeCategory = this.uiManager.categoryManager.activeCategory;

            // Create Fuse instance just like in performSearch
            const fuse = new Fuse(services, {
                keys: ['name', 'description', 'tags'],
                threshold: 0.2,
                distance: 40,
                ignoreLocation: true
            });

            let results = fuse.search(hebrewText).map(result => result.item);

            // Filter by category if active, just like in performSearch
            if (activeCategory) {
                results = results.filter(service => service.category === activeCategory);
            }

            if (results.length > 0) {
                return hebrewText; // Suggest only if results are found
            }
        }

        return null; // No suggestion if no results or text is too short
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
        
        const categoryName = this.uiManager.categoryManager.getCategoryName(service.category);
        
        card.innerHTML = `
            <div class="result-category-tag">${categoryName}</div>
            <h3 class="result-name">${service.name}</h3>
            <p class="result-description">${service.description}</p>
            ${service.tags?.length > 0 ? `
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
            this.resultsCount.textContent = 'הקלידו מילות חיפוש או בחרו קטגוריה';
        } else {
            const activeCategory = this.uiManager.categoryManager.activeCategory;
            let categoryText = '';
            if (activeCategory) {
                const categoryName = this.uiManager.categoryManager.getCategoryName(activeCategory);
                categoryText = ` בקטגוריה: ${categoryName}`;
            }
            this.resultsCount.textContent = `נמצאו ${count} תוצאות${categoryText}`;
        }
    }

    showHebrewSuggestion(hebrewText) {
        if (!this.resultsCount) return;
        
        this.resultsCount.innerHTML = `
            האם התכוונת ל: 
            <span class="hebrew-suggestion" style="color: var(--primary-color); cursor: pointer; text-decoration: underline;">
                ${hebrewText}
            </span>?
        `;

        // Add click handler for the suggestion
        const suggestionElement = this.resultsCount.querySelector('.hebrew-suggestion');
        if (suggestionElement) {
            suggestionElement.addEventListener('click', () => {
                this.uiManager.searchManager.searchInput.value = hebrewText;
                this.performSearch(hebrewText);
            });
        }
    }

    updateResults(data) {
        this.currentResults = data;
        this.renderResults(data);
    }
}
