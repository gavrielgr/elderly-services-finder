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
    
    // אם המערך tags קיים, נמפה אותו
    if (service.tags) {
        // בדיקה אם כל תג הוא כבר מחרוזת או שצריך לחלץ את שם התג
        if (Array.isArray(service.tags)) {
            service.tags.forEach(tag => {
                if (typeof tag === 'string') {
                    tags.push(tag);
                } else if (typeof tag === 'object' && tag.name) {
                    tags.push(tag.name);
                }
            });
        }
    }

    // אם יש תחומי עניין (interest areas), נוסיף אותם לתגיות
    if (service.interestAreas && Array.isArray(service.interestAreas)) {
        // Try to find interest area names if available in the global context
        const interestAreasData = window.appData?.interestAreas || [];
        
        service.interestAreas.forEach(area => {
            if (typeof area === 'string') {
                // Look up the interest area name by ID
                const interestArea = interestAreasData.find(a => a.id === area);
                if (interestArea && interestArea.name) {
                    // Use the Hebrew name if available
                    tags.push(interestArea.name);
                } else {
                    // Fallback to ID if area not found or no name
                    tags.push(area);
                }
            } else if (typeof area === 'object' && area.name) {
                tags.push(area.name);
            }
        });
    }

    // הוספת תג לשירותים עם רשימת המתנה
    if (service['רשימת המתנה'] === 'כן') {
        tags.push('רשימת המתנה');
    }

    // מסירת כפילויות
    return [...new Set(tags)];
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
