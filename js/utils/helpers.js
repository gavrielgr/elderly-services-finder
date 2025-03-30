export function transformData(rawData) {
    if (!rawData || typeof rawData !== 'object') {
        console.error('Invalid data format received:', rawData);
        return [];
    }

    console.log('Raw data from server:', rawData);

    // אם קיבלנו מערך ישירות, נחזיר אותו
    if (Array.isArray(rawData)) {
        return rawData;
    }

    // אם קיבלנו אובייקט עם data, נחזיר את המערך שבתוכו
    if (rawData.data && Array.isArray(rawData.data)) {
        return rawData.data;
    }

    return [];
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
