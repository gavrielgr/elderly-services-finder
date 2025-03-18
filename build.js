import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

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
    
    // Update constants.js with new version
    const CONSTANTS_PATH = join(__dirname, 'js', 'config', 'constants.js');
    const constantsContent = readFileSync(CONSTANTS_PATH, 'utf8');
    const newConstantsContent = constantsContent
        .replace(/BUILD_TIMESTAMP = .*?;/, `BUILD_TIMESTAMP = '${BUILD_TIMESTAMP}';`)
        .replace(/APP_VERSION = .*?;/, `APP_VERSION = '${packageJson.version}';`);
    writeFileSync(CONSTANTS_PATH, newConstantsContent);

    process.exit(0);
}

// Update sw.js
const SW_PATH = join(__dirname, 'sw.js');
const swContent = readFileSync(SW_PATH, 'utf8');
const newContent = swContent.replace(
    '"__APP_VERSION__"',
    `"${APP_VERSION}-${BUILD_TIMESTAMP}"`
);
writeFileSync(SW_PATH, newContent);

console.log(`Updated service worker version to ${APP_VERSION}-${BUILD_TIMESTAMP}`);

// Update constants.js
const CONSTANTS_PATH = join(__dirname, 'js', 'config', 'constants.js');
const constantsContent = readFileSync(CONSTANTS_PATH, 'utf8');
const newConstantsContent = constantsContent
    .replace(/BUILD_TIMESTAMP = .*?;/, `BUILD_TIMESTAMP = '${BUILD_TIMESTAMP}';`)
    .replace(/APP_VERSION = .*?;/, `APP_VERSION = '${packageJson.version}';`);
writeFileSync(CONSTANTS_PATH, newConstantsContent);
