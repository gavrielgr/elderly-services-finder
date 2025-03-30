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
            ${this.service.tags?.length ? 
                `<div class="service-tags">
                    ${this.service.tags.map(tag => `<span class="service-tag">${tag}</span>`).join('')}
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