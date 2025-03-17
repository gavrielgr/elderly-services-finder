export function transformData(rawData) {
    if (!rawData || typeof rawData !== 'object') {
        console.error('Invalid data format received:', rawData);
        return [];
    }

    let transformedData = [];

    Object.entries(rawData).forEach(([category, services]) => {
        if (!Array.isArray(services) || ['status', 'data', 'lastUpdated'].includes(category)) {
            return;
        }

        const cleanCategory = category.trim();
        
        services.forEach(service => {
            transformedData.push({
                category: cleanCategory,
                name: service['שם העסק'] || service['שם התוכנית'] || service['מוקד'] || service['אנשי מקצוע'] || service['שם'] || 'שירות ללא שם',
                description: service['תיאור העסק'] || service['תיאור כללי'] || service['זכויות ותחומי אחריות'] || service['תחום'] || service['תיאור'] || '',
                phone: service['טלפון'] || service['מס\' טלפון'] || service['טלפון / אימייל'] || '',
                email: service['אימייל'] || service['מייל'] || '',
                website: service['אתר'] || service['קישור לאתר'] || '',
                tags: processServiceTags(service)
            });
        });
    });

    return transformedData;
}

function processServiceTags(service) {
    const tags = [];
    
    if (service['תחום עניין']) {
        const interestTags = typeof service['תחום עניין'] === 'string' 
            ? service['תחום עניין'].split(',')
            : [service['תחום עניין']];
        
        tags.push(...interestTags.map(tag => tag.trim()).filter(tag => tag.length > 0));
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
