import { categoryIcons } from '../config/constants.js';

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
        const categories = this.uiManager.dataService.getCategories();
        const services = this.uiManager.dataService.getData();
        if (!categories || !Array.isArray(categories) || !services || !Array.isArray(services)) {
            console.warn('Categories or services not available:', { categories, services });
            return;
        }

        // מיון לפי א-ב
        categories.sort((a, b) => {
            return a.name.localeCompare(b.name, 'he');
        });

        this.categoriesContainer.innerHTML = '';

        // עדכון מיפוי קטגוריות
        categories.forEach(category => {
            this.categoryMap.set(category.id, category.name);
        });

        categories.forEach(category => {
            // בדיקה אם יש שירותים בקטגוריה
            const hasServices = services.some(service => 
                service.category === category.id || service.categoryId === category.id
            );
            
            if (hasServices) {
                const card = this.createCategoryCard(category.id, category.name);
                this.categoriesContainer.appendChild(card);
            }
        });

        this.updateCategoriesVisibility();
        
        // Set default category if none is selected
        this.setDefaultCategory();
    }

    createCategoryCard(categoryId, categoryName) {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.setAttribute('data-category', categoryId);
        
        const category = this.uiManager.dataService.getCategory(categoryId);
        const icon = category?.icon || categoryIcons[categoryName] || categoryIcons['default'];
        
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
        if (!this.uiManager || !this.uiManager.resultsManager) {
            console.error('UIManager or ResultsManager not initialized');
            return;
        }

        document.querySelectorAll('.category-card').forEach(card => {
            card.classList.remove('active');
        });

        if (categoryId === this.activeCategory) {
            this.activeCategory = null;
            this.uiManager.resultsManager.currentCategory = null;
        } else {
            this.activeCategory = categoryId;
            this.uiManager.resultsManager.currentCategory = categoryId;
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
    
    setDefaultCategory() {
        // Only set default if no category is currently selected
        if (this.activeCategory === null) {
            const categories = this.uiManager.dataService.getCategories();
            if (categories && Array.isArray(categories)) {
                console.log('Available categories:', categories.map(c => c.name));
                
                // Find the "שירותים ומסגרות בזקנה" category
                const defaultCategory = categories.find(category => 
                    category.name === 'שירותים ומסגרות בזקנה'
                );
                
                if (defaultCategory) {
                    console.log('Setting default category:', defaultCategory.name, 'with ID:', defaultCategory.id);
                    this.selectCategory(defaultCategory.id);
                } else {
                    console.log('Default category "שירותים ומסגרות בזקנה" not found');
                    console.log('Available category names:', categories.map(c => c.name));
                }
            } else {
                console.log('No categories available for default selection');
            }
        } else {
            console.log('Category already selected, not setting default:', this.activeCategory);
        }
    }
}
