import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function bumpVersion(version) {
    const parts = version.split('.');
    parts[2] = String(Number(parts[2]) + 1);
    return parts.join('.');
}

// Get current version from package.json
const PACKAGE_PATH = join(__dirname, 'package.json');
const packageJson = JSON.parse(readFileSync(PACKAGE_PATH, 'utf8'));
const APP_VERSION = packageJson.version;
const BUILD_TIMESTAMP = new Date().toISOString();

// If this is a version bump command
if (process.argv.includes('--bump')) {
    const newVersion = bumpVersion(APP_VERSION);
    packageJson.version = newVersion;
    writeFileSync(PACKAGE_PATH, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`Bumped version from ${APP_VERSION} to ${newVersion}`);
    process.exit(0);
}

// Update all version/timestamp references
function updateFile(path, replacements) {
    const content = readFileSync(path, 'utf8');
    const newContent = replacements.reduce((acc, [search, replace]) => 
        acc.replace(search, replace), content);
    writeFileSync(path, newContent);
}

// Update service worker
updateFile(
    join(__dirname, 'sw.js'),
    [
        [/const CACHE_VERSION = .*?;/, `const CACHE_VERSION = '${APP_VERSION}';`]
    ]
);

// Copy service worker to dist and assets
const distDir = join(__dirname, 'dist');
const distAssetsDir = join(distDir, 'assets');

if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
}

if (!existsSync(distAssetsDir)) {
    mkdirSync(distAssetsDir, { recursive: true });
}

// Generate the service worker filename
const swFileName = `sw-${APP_VERSION.replace(/\./g, '_')}.js`;

// Copy to root for direct access
copyFileSync(
    join(__dirname, 'sw.js'),
    join(distDir, 'sw.js')
);

// Copy to assets for hashed version
copyFileSync(
    join(__dirname, 'sw.js'),
    join(distAssetsDir, swFileName)
);

// Update netlify.toml with the new service worker filename
const netlifyConfig = readFileSync('netlify.toml', 'utf8');
const updatedConfig = netlifyConfig.replace(
    /to = "\/assets\/sw-[^"]+\.js"/,
    `to = "/assets/${swFileName}"`
);
writeFileSync('netlify.toml', updatedConfig);
console.log(`Updated netlify.toml with Service Worker file: ${swFileName}`);

// Update constants.js with more specific replacements
updateFile(
    join(__dirname, 'js', 'config', 'constants.js'),
    [
        [/export const BUILD_TIMESTAMP = .*?;/, `export const BUILD_TIMESTAMP = '${BUILD_TIMESTAMP}';`],
        [/export const APP_VERSION = .*?;/, `export const APP_VERSION = '${APP_VERSION}';`]
    ]
);

console.log(`Updated builds with version ${APP_VERSION} and timestamp ${BUILD_TIMESTAMP}`);
