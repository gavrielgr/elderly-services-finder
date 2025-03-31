import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Verify the service worker file exists
const swPath = join(__dirname, 'dist', 'sw.js');
if (!existsSync(swPath)) {
    console.error('Service Worker file not found at', swPath);
    process.exit(1);
}

console.log('Service Worker file verified at', swPath); 