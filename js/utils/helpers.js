export function transformData(rawData) {
    if (!rawData || typeof rawData !== 'object') {
        console.error('Invalid data format received:', rawData);
        return {
            services: [],
            categories: []
        };
    }

    console.log('Raw data from server:', rawData);

    // אם קיבלנו מערך ישירות, נחזיר אותו כאובייקט עם services
    if (Array.isArray(rawData)) {
        return {
            services: rawData,
            categories: extractCategories(rawData)
        };
    }

    // אם קיבלנו אובייקט עם data, נחזיר אותו עם services ו-categories
    if (rawData.data && Array.isArray(rawData.data)) {
        return {
            services: rawData.data,
            categories: extractCategories(rawData.data)
        };
    }

    return {
        services: [],
        categories: []
    };
}

function extractCategories(services) {
    const categoriesMap = new Map();
    
    services.forEach(service => {
        if (service.category && !categoriesMap.has(service.category)) {
            categoriesMap.set(service.category, {
                id: service.category,
                name: service.category,
                icon: getCategoryIcon(service.category)
            });
        }
    });

    return Array.from(categoriesMap.values());
}

function getCategoryIcon(categoryName) {
    // כאן אפשר להוסיף מיפוי של אייקונים לקטגוריות
    return '🏥'; // אייקון ברירת מחדל
}

function processServiceTags(service) {
    const tags = [];
    
    if (service.tags) {
        tags.push(...service.tags.map(tag => tag.name));
    }

    if (service['רשימת המתנה'] === 'כן') {
        tags.push('רשימת המתנה');
    }

    return tags;
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
