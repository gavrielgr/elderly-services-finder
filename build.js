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

// Update all version/timestamp references
function updateFile(path, replacements) {
    try {
        const content = readFileSync(path, 'utf8');
        const newContent = replacements.reduce((acc, [search, replace]) => 
            acc.replace(search, replace), content);
        writeFileSync(path, newContent);
        return true;
    } catch (error) {
        console.error(`Error updating file ${path}:`, error.message);
        return false;
    }
}

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

// Function to update version in constants.js
function updateConstantsVersion(version) {
    const constantsPath = join(__dirname, 'js', 'config', 'constants.js');
    if (existsSync(constantsPath)) {
        updateFile(
            constantsPath,
            [
                [/export const BUILD_TIMESTAMP = .*?;/, `export const BUILD_TIMESTAMP = '${BUILD_TIMESTAMP}';`],
                [/export const APP_VERSION = .*?;/, `export const APP_VERSION = '${version}';`]
            ]
        );
        console.log(`Updated constants.js version to ${version}`);
    } else {
        console.warn(`constants.js file not found at ${constantsPath}`);
    }
}

// If this is a version bump command
if (process.argv.includes('--bump')) {
    const newVersion = bumpVersion(APP_VERSION);
    
    // Update package.json
    packageJson.version = newVersion;
    writeFileSync(PACKAGE_PATH, JSON.stringify(packageJson, null, 2) + '\n');
    
    // Update package-lock.json
    const PACKAGE_LOCK_PATH = join(__dirname, 'package-lock.json');
    if (existsSync(PACKAGE_LOCK_PATH)) {
        try {
            const packageLockJson = JSON.parse(readFileSync(PACKAGE_LOCK_PATH, 'utf8'));
            packageLockJson.version = newVersion;
            
            // Also update the version in the packages section
            if (packageLockJson.packages && packageLockJson.packages['']) {
                packageLockJson.packages[''].version = newVersion;
            }
            
            writeFileSync(PACKAGE_LOCK_PATH, JSON.stringify(packageLockJson, null, 2) + '\n');
            console.log(`Updated package-lock.json version to ${newVersion}`);
        } catch (error) {
            console.error('Error updating package-lock.json:', error.message);
        }
    }
    
    // Update service worker version
    const swPath = join(__dirname, 'sw.js');
    if (existsSync(swPath)) {
        updateFile(
            swPath,
            [
                [/const CACHE_VERSION = ['"].*?['"];/, `const CACHE_VERSION = '${newVersion}';`]
            ]
        );
        console.log(`Updated sw.js version to ${newVersion}`);
    }
    
    console.log(`Bumped version from ${APP_VERSION} to ${newVersion}`);
    
    // Update HTML files with new version
    updateHtmlVersions(newVersion);
    
    // Also update constants.js with the new version
    updateConstantsVersion(newVersion);
    
    process.exit(0);
}

// Create dist directory if it doesn't exist
const distDir = join(__dirname, 'dist');
if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
}

// Update service worker version
const swPath = join(__dirname, 'sw.js');
if (existsSync(swPath)) {
    updateFile(
        swPath,
        [
            [/const CACHE_VERSION = ['"].*?['"];/, `const CACHE_VERSION = '${APP_VERSION}';`]
        ]
    );
    console.log(`Updated sw.js version to ${APP_VERSION}`);
} else {
    console.warn('Service worker file (sw.js) not found');
}

// Update constants.js during normal build with current version
updateConstantsVersion(APP_VERSION);

// Update HTML files with current version during normal build
updateHtmlVersions(APP_VERSION);

console.log(`Updated builds with version ${APP_VERSION} and timestamp ${BUILD_TIMESTAMP}`);
