import { readFileSync, writeFileSync } from 'node:fs';
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
let APP_VERSION = packageJson.version;
const BUILD_TIMESTAMP = new Date().toISOString();

// If this is a version bump command
if (process.argv.includes('--bump')) {
    APP_VERSION = bumpVersion(APP_VERSION);
    packageJson.version = APP_VERSION;
    writeFileSync(PACKAGE_PATH, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`Bumped version from ${packageJson.version} to ${APP_VERSION}`);
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

// Update constants.js with more specific replacements
updateFile(
    join(__dirname, 'js', 'config', 'constants.js'),
    [
        [/export const BUILD_TIMESTAMP = .*?;/, `export const BUILD_TIMESTAMP = '${BUILD_TIMESTAMP}';`],
        [/export const APP_VERSION = .*?;/, `export const APP_VERSION = '${APP_VERSION}';`]
    ]
);

console.log(`Updated builds with version ${APP_VERSION} and timestamp ${BUILD_TIMESTAMP}`);

if (process.argv.includes('--bump')) {
    process.exit(0);
}
