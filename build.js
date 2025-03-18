import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Get current version from package.json
const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
const APP_VERSION = packageJson.version;
const BUILD_TIMESTAMP = new Date().toISOString();

// Update sw.js
const SW_PATH = join(__dirname, 'sw.js');
const swContent = readFileSync(SW_PATH, 'utf8');
const newContent = swContent.replace(
  '"__APP_VERSION__"',
  `"${APP_VERSION}-${BUILD_TIMESTAMP}"`
);
writeFileSync(SW_PATH, newContent);

console.log(`Updated service worker version to ${APP_VERSION}-${BUILD_TIMESTAMP}`);
