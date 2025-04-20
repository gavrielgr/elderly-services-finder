// Verify build structure
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const distDir = join(rootDir, 'dist');

console.log('Verifying build structure...');

function checkDirectoryExists(path, name) {
  if (!existsSync(path)) {
    console.error(`❌ ${name} directory doesn't exist at ${path}`);
    return false;
  }
  console.log(`✅ ${name} directory exists`);
  return true;
}

function checkFileExists(path, name) {
  if (!existsSync(path)) {
    console.error(`❌ ${name} file doesn't exist at ${path}`);
    return false;
  }
  console.log(`✅ ${name} file exists`);
  return true;
}

function listDirectoryContents(path, name) {
  console.log(`Contents of ${name}:`);
  const contents = readdirSync(path, { withFileTypes: true });
  contents.forEach(item => {
    const type = item.isDirectory() ? 'DIR' : 'FILE';
    console.log(`  - [${type}] ${item.name}`);
  });
}

// Check main dist directory
if (checkDirectoryExists(distDir, 'dist')) {
  listDirectoryContents(distDir, 'dist');
  
  // Check JS directory structure
  const jsDir = join(distDir, 'js');
  if (checkDirectoryExists(jsDir, 'js')) {
    listDirectoryContents(jsDir, 'js');
    
    // Check config directory
    const configDir = join(jsDir, 'config');
    if (checkDirectoryExists(configDir, 'js/config')) {
      listDirectoryContents(configDir, 'js/config');
      
      // Check specific JS files
      checkFileExists(join(configDir, 'app-config.js'), 'app-config.js');
      checkFileExists(join(configDir, 'firebase.js'), 'firebase.js');
    }
    
    // Check services directory
    const servicesDir = join(jsDir, 'services');
    if (checkDirectoryExists(servicesDir, 'js/services')) {
      listDirectoryContents(servicesDir, 'js/services');
      
      // Check auth service file
      checkFileExists(join(servicesDir, 'authService.js'), 'authService.js');
    }
  }
  
  // Check HTML files
  checkFileExists(join(distDir, 'index.html'), 'index.html');
  checkFileExists(join(distDir, 'login.html'), 'login.html');
  checkFileExists(join(distDir, 'admin.html'), 'admin.html');
}

console.log('Verification complete'); 