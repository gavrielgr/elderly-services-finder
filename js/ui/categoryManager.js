import { categoryIcons } from '../config/constants.js';
import { dataService } from '../services/dataService.js';

export class CategoryManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.activeCategory = null;
        this.isCategoriesCollapsed = false;
        
        this.categoriesContainer = document.getElementById('categories-container');
        this.toggleButton = document.getElementById('toggle-categories');
        
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', () => this.toggleCategories());
        }
    }

    renderCategories() {
        const services = dataService.getData();
        if (!services || !Array.isArray(services)) return;

        const categories = [...new Set(services.map(service => service.category))];
        this.categoriesContainer.innerHTML = '';

        categories.forEach(category => {
            if (!category) return;
            const card = this.createCategoryCard(category);
            this.categoriesContainer.appendChild(card);
        });

        this.updateCategoriesVisibility();
    }

    createCategoryCard(category) {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.setAttribute('data-category', category);
        
        const icon = categoryIcons[category.trim()] || categoryIcons['default'];
        
        card.innerHTML = `
            <div class="category-icon">${icon}</div>
            <div class="category-name">${category}</div>
        `;

        card.addEventListener('click', () => this.selectCategory(category));
        
        if (category === this.activeCategory) {
            card.classList.add('active');
        }

        return card;
    }

    selectCategory(category) {
        document.querySelectorAll('.category-card').forEach(card => {
            card.classList.remove('active');
        });

        if (category === this.activeCategory) {
            this.activeCategory = null;
        } else {
            this.activeCategory = category;
            const selectedCard = document.querySelector(`.category-card[data-category="${category}"]`);
            if (selectedCard) selectedCard.classList.add('active');
        }

        this.uiManager.resultsManager.performSearch();
    }

    toggleCategories() {
        this.isCategoriesCollapsed = !this.isCategoriesCollapsed;
        const toggleIcon = document.querySelector('.toggle-icon');
        const categoriesContainer = document.getElementById('categories-container');
        const categoriesSection = document.querySelector('.categories-section');
        
        if (this.isCategoriesCollapsed) {
            categoriesContainer?.classList.add('collapsed');
            toggleIcon?.classList.remove('rotated');
            categoriesSection?.classList.add('collapsed');
        } else {
            categoriesContainer?.classList.remove('collapsed');
            toggleIcon?.classList.add('rotated');
            categoriesSection?.classList.remove('collapsed');
        }
    }

    updateCategoriesVisibility() {
        const toggleIcon = document.querySelector('.toggle-icon');
        const categoriesContainer = this.categoriesContainer;
        const categoriesSection = document.querySelector('.categories-section');
        
        // Always start expanded
        this.isCategoriesCollapsed = false;
        
        categoriesContainer?.classList.remove('collapsed');
        toggleIcon?.classList.add('rotated');
        categoriesSection?.classList.remove('collapsed');
    }
}
