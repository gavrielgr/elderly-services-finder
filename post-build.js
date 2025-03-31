import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Find the service worker file in dist/assets
const distAssetsDir = join(__dirname, 'dist', 'assets');
const files = readdirSync(distAssetsDir);
const swFile = files.find(file => file.startsWith('sw-') && file.endsWith('.js'));

if (!swFile) {
    console.error('Service Worker file not found in dist/assets');
    process.exit(1);
}

// Update netlify.toml with the new service worker filename
const netlifyConfig = readFileSync('netlify.toml', 'utf8');
const updatedConfig = netlifyConfig.replace(
    /to = "\/assets\/sw-[^"]+\.js"/,
    `to = "/assets/${swFile}"`
);
writeFileSync('netlify.toml', updatedConfig);
console.log(`Updated netlify.toml with Service Worker file: ${swFile}`); 