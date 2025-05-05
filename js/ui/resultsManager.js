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
        if (!this.uiManager || !this.uiManager.dataService) {
            console.error('UIManager or DataService not initialized');
            return;
        }

        const services = this.uiManager.dataService.getData();
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
                threshold: 0.0,
                distance: 40,
                ignoreLocation: true,
                includeMatches: true,
                minMatchCharLength: 3
            });

            // Keep the full Fuse result object, including matches
            results = fuse.search(searchQuery); 
            
            // Mark results as having come from a search
            results.forEach(r => r.isSearchResult = true);

        } else {
            // If no search query, use all services
            results = services.map(service => ({ item: service, isSearchResult: false })); // Wrap in expected structure
        }

        // Filter by category if active
        if (activeCategory) {
            results = results.filter(result => {
                // תמיכה במבנה נתונים ישן
                if (result.item.category === activeCategory) {
                    return true;
                }
                // תמיכה במבנה נתונים חדש
                if (result.item.categoryId === activeCategory) {
                    return true;
                }
                return false;
            });
        }

        // מיון התוצאות לפי א-ב
        results.sort((a, b) => {
            return a.item.name.localeCompare(b.item.name, 'he');
        });

        this.renderResults(results, searchQuery);
        this.updateResultsCount(results.length);
    }

    async getHebrewEquivalent(englishText) {
        if (!this.uiManager || !this.uiManager.dataService) {
            console.error('UIManager or DataService not initialized');
            return null;
        }

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
            const services = this.uiManager.dataService.getData();
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
                results = results.filter(service => {
                    // תמיכה במבנה נתונים ישן
                    if (service.category === activeCategory) {
                        return true;
                    }
                    // תמיכה במבנה נתונים חדש
                    if (service.categoryId === activeCategory) {
                        return true;
                    }
                    return false;
                });
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

    renderResults(results, searchQuery = '') {
        if (!this.resultsContainer) return;

        this.resultsContainer.innerHTML = '';
        this.currentResults = results;

        if (!results || results.length === 0) {
            if (this.noResultsMessage) {
                this.noResultsMessage.classList.remove('hidden');
            }
            if (this.resultsCount) {
                this.resultsCount.textContent = 'לא נמצאו תוצאות';
            }
            return;
        }

        if (this.noResultsMessage) {
            this.noResultsMessage.classList.add('hidden');
        }
        if (this.resultsCount) {
            this.resultsCount.textContent = `${results.length} תוצאות`;
        }

        results.forEach(result => {
            // Extract the service item and matches (if any)
            const service = result.item;
            const matches = result.isSearchResult ? result.matches : null; // Only use matches if it was a search result
            
            const card = document.createElement('div');
            card.className = 'result-card';
            card.setAttribute('data-service-id', service.id);

            // Get category name from the categories array
            const categories = this.uiManager.dataService.getCategories();
            let categoryName = 'כללי';

            if (service.category && categories) {
                // תמיכה במבנה הנתונים הישן - כעת הסטנדרט
                const category = categories.find(cat => cat.id === service.category);
                if (category) {
                    categoryName = category.name;
                }
            }

            // ---- Revised Tag Handling & Highlighting Logic ----
            let highlightedName = service.name || '';
            let highlightedDescription = service.description || 'אין תיאור זמין';
            
            // 1. Collect all potential tag strings
            let allTagStrings = [];
            // From service.tags
            if (service.tags) {
                if (Array.isArray(service.tags)) {
                    // Handle array of strings or objects
                    service.tags.forEach(tag => {
                        if (typeof tag === 'string') {
                            allTagStrings.push(tag.trim());
                        } else if (typeof tag === 'object' && tag.name && typeof tag.name === 'string') {
                            allTagStrings.push(tag.name.trim());
                        }
                    });
                } else if (typeof service.tags === 'string') {
                    // Handle comma-separated string
                    allTagStrings = allTagStrings.concat(
                        service.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
                    );
                }
            }
            
            // From service.interestAreas
            const interestAreasData = this.uiManager.dataService.getInterestAreas() || [];
            if (service.interestAreas && Array.isArray(service.interestAreas)) {
                 service.interestAreas.forEach(area => {
                     if (typeof area === 'string') {
                         // Area is an ID, look it up
                         const interestArea = interestAreasData.find(a => a.id === area);
                         const name = interestArea?.name || area; // Use name or fallback to ID
                         allTagStrings.push(name.trim());
                     } else if (typeof area === 'object' && area.name && typeof area.name === 'string') {
                         // Area is an object with a name
                         allTagStrings.push(area.name.trim());
                     }
                 });
            }
            
            // Filter out any potential empty strings after trimming
            allTagStrings = allTagStrings.filter(tag => tag);

            // 2. Apply highlighting using a map (only if searchQuery exists)
            const highlightedTagsMap = new Map(); // Map original tag string -> highlighted version
            
            // Prepare a case-insensitive regex for the exact search query
            // Escape special regex characters in the query first
            const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const highlightRegex = searchQuery ? new RegExp(`(${escapedQuery})`, 'i') : null;
            
            // Apply highlighting to name and description
            if (highlightRegex) {
                highlightedName = highlightedName.replace(highlightRegex, '<mark>$1</mark>');
                highlightedDescription = highlightedDescription.replace(highlightRegex, '<mark>$1</mark>');
            }
            
            // 3. De-duplicate and prepare for rendering tags
            const uniqueTagStrings = [...new Set(allTagStrings)];
            uniqueTagStrings.forEach(tag => {
                if (highlightRegex) {
                    const highlightedTag = tag.replace(highlightRegex, '<mark>$1</mark>');
                    // Only add to map if highlighting actually happened
                    if (highlightedTag !== tag) { 
                        highlightedTagsMap.set(tag, highlightedTag);
                    }
                }
            });
            
            // ---- Remove the old Fuse.js match processing loop ----
            /* 
            if (matches && matches.length > 0) {
                matches.forEach(match => {
                    // ... old complex logic based on indices ...
                });
            }
            */
           // ---- End Removal ----

            card.innerHTML = `
                <div class="result-category-tag">${categoryName}</div>
                <h3 class="result-name">${highlightedName}</h3>
                <p class="result-description">${highlightedDescription}</p>
                <div class="result-details">
                    ${service.address ? `<div class="result-address"><i class="fas fa-map-marker-alt"></i> ${service.address}</div>` : ''}
                    ${service.phone ? `<div class="result-phone"><i class="fas fa-phone"></i> ${service.phone}</div>` : ''}
                    ${service.email ? `<div class="result-email"><i class="fas fa-envelope"></i> ${service.email}</div>` : ''}
                    ${service.website ? `<div class="result-website"><i class="fas fa-globe"></i> <a href="${service.website}" target="_blank">${service.website}</a></div>` : ''}
                </div>
                ${uniqueTagStrings.length > 0 ? `
                    <div class="result-tags">
                        ${uniqueTagStrings.map(tag => 
                            `<span class="result-tag">${highlightedTagsMap.get(tag) || tag}</span>` // Use highlighted version if available, else original
                        ).join('')}
                    </div>
                ` : ''}
            `;

            card.addEventListener('click', () => {
                if (this.uiManager && this.uiManager.modalManager) {
                    this.uiManager.modalManager.showServiceDetails(service);
                } else {
                    console.error('ModalManager not initialized');
                }
            });
            this.resultsContainer.appendChild(card);
        });

        // Update view mode
        this.resultsContainer.className = `results-container ${this.viewMode}-view`;
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
                const categories = this.uiManager.dataService.getCategories();
                const category = categories ? categories.find(cat => cat.id === activeCategory) : null;
                const categoryName = category ? category.name : 'כללי';
                categoryText = ` בקטגוריית ${categoryName}`;
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
        // Ensure data exists and has a services array
        if (!data || !Array.isArray(data.services)) {
            console.warn('updateResults received invalid data, skipping render:', data);
            // Optionally clear results or show an error message
            // this.renderResults([]); 
            return;
        }
        this.currentResults = data.services; // Store only the services array
        this.renderResults(data.services); // Pass only the services array
    }
}
