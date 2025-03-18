import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'));

export const BUILD_TIMESTAMP = '2025-03-18T04:18:14.758Z';
export const CACHE_VERSION = `${packageJson.version}-${BUILD_TIMESTAMP}`;
export const DB_NAME = 'elderlyServicesDB';
export const DB_VERSION = 2;
export const STORE_NAME = 'servicesData';
export const DATA_KEY = 'allServicesData';
export const LAST_UPDATED_KEY = 'lastUpdated';
export const VERSION_KEY = 'appVersion';

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
