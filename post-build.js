import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Create necessary directories
function createDirectories() {
    const dirs = [
        join(__dirname, 'dist'),
        join(__dirname, 'dist', 'assets'),
        join(__dirname, 'dist', 'js'),
        join(__dirname, 'dist', 'js', 'config'),
        join(__dirname, 'dist', 'js', 'services'),
        join(__dirname, 'dist', 'js', 'admin'),
        join(__dirname, 'dist', 'css')
    ];
    
    for (const dir of dirs) {
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    }
}

// Extract script paths from HTML files
function extractScriptPathsFromHTML(htmlFilePath) {
    try {
        const content = readFileSync(htmlFilePath, 'utf8');
        const scriptRegex = /<script[^>]*src="([^"?]+)(\?[^"]*)?"/g;
        const paths = [];
        let match;
        
        while ((match = scriptRegex.exec(content)) !== null) {
            const path = match[1];
            if (path.startsWith('/js/')) {
                // Convert from absolute path to relative path without leading slash
                paths.push(path.substring(1));
            }
        }
        
        return paths;
    } catch (error) {
        console.error(`Error extracting scripts from ${htmlFilePath}:`, error);
        return [];
    }
}

// Copy HTML files and assets
function copyFiles() {
    try {
        // Create directories first
        createDirectories();
        
        // Verify source files exist
        const loginFile = join(__dirname, 'login.html');
        const adminFile = join(__dirname, 'admin.html');
        
        if (!existsSync(loginFile)) {
            throw new Error(`Source file not found: ${loginFile}`);
        }
        if (!existsSync(adminFile)) {
            throw new Error(`Source file not found: ${adminFile}`);
        }
        
        // Copy files
        copyFileSync(loginFile, join(__dirname, 'dist', 'login.html'));
        copyFileSync(adminFile, join(__dirname, 'dist', 'admin.html'));
        
        // Get all script paths from HTML files
        const scriptPathsFromLogin = extractScriptPathsFromHTML(loginFile);
        const scriptPathsFromAdmin = extractScriptPathsFromHTML(adminFile);
        
        // Combine and deduplicate paths
        const allPaths = [...new Set([...scriptPathsFromLogin, ...scriptPathsFromAdmin])];
        
        console.log('Found these JS files in HTML:', allPaths);
        
        // Copy each script file
        for (const path of allPaths) {
            const sourcePath = join(__dirname, path);
            const targetPath = join(__dirname, 'dist', path);
            const targetDir = dirname(targetPath);
            
            // Ensure directory exists
            if (!existsSync(targetDir)) {
                mkdirSync(targetDir, { recursive: true });
            }
            
            // Copy file if it exists
            if (existsSync(sourcePath)) {
                copyFileSync(sourcePath, targetPath);
                console.log(`Copied ${path} to dist`);
            } else {
                console.warn(`Warning: Source file ${sourcePath} not found`);
            }
        }
        
        // Also copy our critical files explicitly to be sure
        const criticalFiles = [
            ['js/config/app-config.js', 'dist/js/config/app-config.js'],
            ['js/config/firebase.js', 'dist/js/config/firebase.js'],
            ['js/services/authService.js', 'dist/js/services/authService.js']
        ];
        
        for (const [src, dst] of criticalFiles) {
            const sourcePath = join(__dirname, src);
            const targetPath = join(__dirname, dst);
            
            if (existsSync(sourcePath)) {
                copyFileSync(sourcePath, targetPath);
                console.log(`Copied critical file ${src} to ${dst}`);
            } else {
                console.error(`Critical file ${sourcePath} not found`);
                // Don't fail the build
            }
        }
        
        console.log('Successfully copied HTML and JS files to dist');
    } catch (error) {
        console.error('Error copying files:', error);
        process.exit(1);
    }
}

// Run the build steps
createDirectories();
copyFiles(); 