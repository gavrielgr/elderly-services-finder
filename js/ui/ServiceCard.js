export class ServiceCard {
    constructor(service, onClick) {
        this.service = service;
        this.onClick = onClick;
    }

    updateRatings(ratings) {
        if (ratings) {
            if (!this.service.ratings) {
                this.service.ratings = {};
            }
            this.service.ratings.average = ratings.average;
            this.service.ratings.count = ratings.count;
            this.render();
        }
    }

    render() {
        const card = document.createElement('div');
        card.className = 'service-card';
        card.onclick = () => this.onClick(this.service);

        const rating = this.service.ratings?.average || 0;
        const ratingStars = '⭐'.repeat(Math.round(rating));
        const ratingText = rating > 0 ? `${rating.toFixed(1)} (${this.service.ratings?.count || 0} דירוגים)` : 'אין דירוגים עדיין';

        // Process tags or interest areas with proper name lookup
        let displayTags = [];
        
        // Try to get interest areas data from window context
        const interestAreasData = window.appData?.interestAreas || [];
        
        // Process tags if available
        if (this.service.tags?.length) {
            this.service.tags.forEach(tag => {
                if (typeof tag === 'string') {
                    displayTags.push(tag);
                } else if (typeof tag === 'object' && tag.name) {
                    displayTags.push(tag.name);
                }
            });
        }
        
        // Process interest areas if available
        if (this.service.interestAreas?.length) {
            this.service.interestAreas.forEach(area => {
                if (typeof area === 'string') {
                    // Look up the area name from ID
                    const interestArea = interestAreasData.find(a => a.id === area);
                    if (interestArea && interestArea.name) {
                        displayTags.push(interestArea.name);
                    } else {
                        displayTags.push(area);
                    }
                } else if (typeof area === 'object' && area.name) {
                    displayTags.push(area.name);
                }
            });
        }
        
        // Remove duplicates
        displayTags = [...new Set(displayTags)];

        card.innerHTML = `
            <h3 class="service-title">${this.service.name}</h3>
            ${this.service.description ? 
                `<p class="service-description">${this.truncateText(this.service.description, 100)}</p>` : 
                ''
            }
            <div class="service-rating">
                <span class="rating-stars">${ratingStars}</span>
                <span class="rating-text">${ratingText}</span>
            </div>
            ${displayTags.length ? 
                `<div class="service-tags">
                    ${displayTags.map(tag => `<span class="service-tag">${tag}</span>`).join('')}
                </div>` : 
                ''
            }
        `;

        return card;
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }
} 