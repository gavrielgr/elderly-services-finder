const { readFileSync, writeFileSync } = require('fs');
const { dirname, join } = require('path');
const { fileURLToPath } = require('url');

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
    [['"__APP_VERSION__"', `"${APP_VERSION}-${BUILD_TIMESTAMP}"`]]
);

// Update constants.js
updateFile(
    join(__dirname, 'js', 'config', 'constants.js'),
    [
        [/'__BUILD_TIMESTAMP__'/, `'${BUILD_TIMESTAMP}'`],
        [/'__APP_VERSION__'/, `'${APP_VERSION}'`]
    ]
);

console.log(`Updated builds with version ${APP_VERSION} and timestamp ${BUILD_TIMESTAMP}`);

if (process.argv.includes('--bump')) {
    process.exit(0);
}