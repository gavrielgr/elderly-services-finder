// These values will be replaced during build but work for local dev
export const BUILD_TIMESTAMP = '2025-03-24T07:35:26.524Z';
export const APP_VERSION = '1.99.84'; // Updated version
export const CACHE_VERSION = `${APP_VERSION}-${BUILD_TIMESTAMP}`;

// Database constants
export const DB_NAME = 'elderlyServicesDB';
export const DB_VERSION = 2;
export const STORE_NAME = 'servicesData';
export const DATA_KEY = 'allServicesData';
export const LAST_UPDATED_KEY = 'lastUpdated';
export const VERSION_KEY = 'appVersion';

// Icons mapping
export const categoryIcons = {
    'שירותים ומסגרות בזקנה': '🏠',
    'ניצולי שואה': '🕯️',
    'מוקדים ממשלתיים': '📞',
    'תוכניות משרד לשיוון חברתי': '⚖️',
    'מנועי חיפוש לזקנה': '🔍',
    'בעלי מקצוע': '👨‍⚕️',
    'הטפול בזקן בישראל': '❤️',
    'default': '📋'
};
