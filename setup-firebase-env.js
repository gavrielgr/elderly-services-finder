/**
 * Firebase Environment Setup Helper
 * 
 * This script helps set up the .env file with the proper Firebase credentials format.
 * It reads the Firebase service account JSON file and formats the private key correctly.
 */

import { promises as fs } from 'fs';
import { createInterface } from 'readline';
import path from 'path';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function loadServiceAccountFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading service account file: ${error.message}`);
    return null;
  }
}

async function updateEnvFile(serviceAccount, useEscapedNewlines = true) {
  try {
    // Format private key properly based on user preference
    let privateKey = serviceAccount.private_key;
    
    if (useEscapedNewlines) {
      // Replace actual newlines with escaped ones
      privateKey = privateKey.replace(/\n/g, '\\n');
      privateKey = `"${privateKey}"`;
    }
    
    // Read existing .env file or create a template
    let envContent;
    try {
      envContent = await fs.readFile('.env', 'utf8');
    } catch (error) {
      envContent = `# Firebase Configuration
PORT=5001
NODE_ENV=development

# Firebase Client SDK Config (for browser)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Firebase Admin SDK Config (for server)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
`;
    }
    
    // Update the Firebase Admin SDK variables
    envContent = envContent
      .replace(/FIREBASE_PROJECT_ID=.*$/m, `FIREBASE_PROJECT_ID=${serviceAccount.project_id}`)
      .replace(/FIREBASE_CLIENT_EMAIL=.*$/m, `FIREBASE_CLIENT_EMAIL=${serviceAccount.client_email}`)
      .replace(/FIREBASE_PRIVATE_KEY=.*$/m, `FIREBASE_PRIVATE_KEY=${privateKey}`);
    
    // Also update the project ID for client SDK
    envContent = envContent
      .replace(/VITE_FIREBASE_PROJECT_ID=.*$/m, `VITE_FIREBASE_PROJECT_ID=${serviceAccount.project_id}`);
    
    // Write updated .env file
    await fs.writeFile('.env', envContent);
    
    return true;
  } catch (error) {
    console.error(`Error updating .env file: ${error.message}`);
    return false;
  }
}

async function run() {
  console.log('🔥 Firebase Environment Setup Helper 🔥');
  console.log('This tool will help you set up your Firebase credentials in the .env file.\n');
  
  // Ask for service account file path
  const filePath = await question('Enter the path to your Firebase service account JSON file: ');
  
  // Load service account file
  const serviceAccount = await loadServiceAccountFile(filePath);
  if (!serviceAccount) {
    console.error('Could not load service account file. Please check the path and try again.');
    rl.close();
    return;
  }
  
  console.log('\n✅ Service account file loaded successfully!');
  console.log(`  - Project ID: ${serviceAccount.project_id}`);
  console.log(`  - Client Email: ${serviceAccount.client_email}`);
  
  // Ask for format preference
  const formatChoice = await question('\nHow would you like to store the private key in .env?\n1. With escaped newlines (recommended for most environments)\n2. With actual newlines (may not work in all environments)\nChoose (1/2): ');
  
  const useEscapedNewlines = formatChoice !== '2';
  
  // Update .env file
  const success = await updateEnvFile(serviceAccount, useEscapedNewlines);
  
  if (success) {
    console.log('\n✅ .env file updated successfully!');
    console.log('Try starting your server now with: npm run dev');
  } else {
    console.log('\n❌ Failed to update .env file.');
  }
  
  rl.close();
}

run().catch(error => {
  console.error('An unexpected error occurred:', error);
  rl.close();
}); 