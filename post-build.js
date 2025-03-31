import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Copy login.html and admin.html to dist
function copyFiles() {
    try {
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
        
        console.log('Successfully copied login.html and admin.html to dist');
    } catch (error) {
        console.error('Error copying files:', error);
        process.exit(1);
    }
}

// Copy files
copyFiles(); 