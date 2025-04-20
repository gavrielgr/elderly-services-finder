import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
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
    
    // Update HTML files with new version
    updateHtmlVersions(newVersion);
    
    process.exit(0);
}

// Update all version/timestamp references
function updateFile(path, replacements) {
    const content = readFileSync(path, 'utf8');
    const newContent = replacements.reduce((acc, [search, replace]) => 
        acc.replace(search, replace), content);
    writeFileSync(path, newContent);
}

// Create dist directory if it doesn't exist
const distDir = join(__dirname, 'dist');
if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
}

// Update service worker version
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

// Function to update version in HTML files
function updateHtmlVersions(version) {
    const htmlFiles = ['login.html', 'admin.html'];
    htmlFiles.forEach(file => {
        const filePath = join(__dirname, file);
        if (existsSync(filePath)) {
            updateFile(
                filePath,
                [
                    // Update script src version parameters for both JS files and CDN links if they have versions
                    [/src="([^"]+)\?v=[\d\.]+"/g, `src="$1?v=${version}"`]
                ]
            );
            console.log(`Updated version parameters in ${file} to ${version}`);
        } else {
            console.warn(`HTML file ${file} not found, skipping version update`);
        }
    });
}

// Update HTML files with current version
updateHtmlVersions(APP_VERSION);

console.log(`Updated builds with version ${APP_VERSION} and timestamp ${BUILD_TIMESTAMP}`);
