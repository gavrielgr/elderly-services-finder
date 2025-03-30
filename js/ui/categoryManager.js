import { categoryIcons } from '../config/constants.js';
import { dataService } from '../services/dataService.js';

export class CategoryManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.activeCategory = null;
        this.isCategoriesCollapsed = false;
        this.categoryMap = new Map(); // מיפוי בין ID לשם
        
        this.categoriesContainer = document.getElementById('categories-container');
        this.toggleButton = document.getElementById('toggle-categories');
        
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', () => this.toggleCategories());
        }
    }

    renderCategories() {
        const services = dataService.getData();
        if (!services || !Array.isArray(services)) return;

        // יצירת מיפוי בין ID לשם
        this.categoryMap.clear();
        services.forEach(service => {
            if (service.category && service.categoryName) {
                this.categoryMap.set(service.category, service.categoryName);
            }
        });

        // קבלת קטגוריות ייחודיות
        const categories = [...new Set(services.map(service => service.category))].filter(Boolean);
        this.categoriesContainer.innerHTML = '';

        categories.forEach(categoryId => {
            const categoryName = this.categoryMap.get(categoryId);
            if (categoryName) {
                const card = this.createCategoryCard(categoryId, categoryName);
                this.categoriesContainer.appendChild(card);
            }
        });

        this.updateCategoriesVisibility();
    }

    createCategoryCard(categoryId, categoryName) {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.setAttribute('data-category', categoryId);
        
        const icon = categoryIcons[categoryName] || categoryIcons['default'];
        
        card.innerHTML = `
            <div class="category-icon">${icon}</div>
            <div class="category-name">${categoryName}</div>
        `;

        card.addEventListener('click', () => this.selectCategory(categoryId));
        
        if (categoryId === this.activeCategory) {
            card.classList.add('active');
        }

        return card;
    }

    selectCategory(categoryId) {
        document.querySelectorAll('.category-card').forEach(card => {
            card.classList.remove('active');
        });

        if (categoryId === this.activeCategory) {
            this.activeCategory = null;
        } else {
            this.activeCategory = categoryId;
            const selectedCard = document.querySelector(`.category-card[data-category="${categoryId}"]`);
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

    getCategoryName(categoryId) {
        return this.categoryMap.get(categoryId) || 'כללי';
    }
}
