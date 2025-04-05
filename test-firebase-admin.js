import dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// Utility function to properly format the Firebase private key
function formatFirebasePrivateKey(key) {
    if (!key) {
        console.error('FIREBASE_PRIVATE_KEY is missing or empty');
        return null;
    }
    
    try {
        // If it's a JSON string, parse it first
        if (typeof key === 'string' && (key.startsWith('"') && key.endsWith('"'))) {
            key = JSON.parse(key);
        }
        
        // Replace escaped newlines with actual newlines
        if (typeof key === 'string') {
            key = key.replace(/\\n/g, '\n');
        }
        
        // Validate that the key appears to be in PEM format
        if (typeof key === 'string' && !key.includes('-----BEGIN PRIVATE KEY-----')) {
            console.error('Private key does not appear to be in valid PEM format');
            return null;
        }
        
        return key;
    } catch (error) {
        console.error('Error formatting private key:', error);
        return null;
    }
}

// Verify Firebase Admin configuration
async function verifyFirebaseConfig() {
    console.log('Verifying Firebase Admin configuration...');
    
    // Check project ID
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    if (!projectId) {
        console.error('❌ VITE_FIREBASE_PROJECT_ID is missing');
    } else {
        console.log('✅ VITE_FIREBASE_PROJECT_ID:', projectId);
    }
    
    // Check client email
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    if (!clientEmail) {
        console.error('❌ FIREBASE_CLIENT_EMAIL is missing');
    } else {
        console.log('✅ FIREBASE_CLIENT_EMAIL:', clientEmail);
    }
    
    // Check private key
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKeyRaw) {
        console.error('❌ FIREBASE_PRIVATE_KEY is missing');
    } else {
        console.log('🔍 FIREBASE_PRIVATE_KEY found in environment');
        
        const privateKey = formatFirebasePrivateKey(privateKeyRaw);
        if (!privateKey) {
            console.error('❌ Failed to format private key');
        } else {
            console.log('✅ Private key format appears valid');
            
            // Check if the key contains "PRIVATE KEY" marker
            if (privateKey.includes('PRIVATE KEY')) {
                console.log('✅ Private key contains PEM markers');
            } else {
                console.error('❌ Private key is missing PEM markers');
            }
            
            // Write the formatted key to a temporary file for inspection
            fs.writeFileSync('./.temp-key.txt', privateKey);
            console.log('ℹ️ Formatted key written to ./.temp-key.txt for inspection');
        }
    }
    
    // Try to initialize Firebase Admin SDK
    try {
        console.log('\nAttempting to initialize Firebase Admin SDK...');
        
        const { initializeApp, cert } = await import('firebase-admin/app');
        
        const app = initializeApp({
            credential: cert({
                projectId: projectId,
                clientEmail: clientEmail,
                privateKey: formatFirebasePrivateKey(privateKeyRaw)
            })
        });
        
        console.log('✅ Firebase Admin SDK initialized successfully');
        
        // Try to access Firestore
        try {
            const { getFirestore } = await import('firebase-admin/firestore');
            const db = getFirestore(app);
            
            console.log('✅ Firestore initialized successfully');
            
            // Optional: Try a simple query
            const snapshot = await db.collection('services').limit(1).get();
            console.log(`✅ Successfully queried Firestore: found ${snapshot.size} documents`);
        } catch (error) {
            console.error('❌ Firestore initialization failed:', error);
        }
        
    } catch (error) {
        console.error('❌ Firebase Admin SDK initialization failed:', error);
    }
}

// Run verification
verifyFirebaseConfig().catch(error => {
    console.error('Verification failed with error:', error);
});

// Instructions for fixing private key issues
console.log(`
---------------------------------------------
🔧 TROUBLESHOOTING PRIVATE KEY ISSUES 🔧

If you're having issues with the private key format:

1. Make sure the FIREBASE_PRIVATE_KEY in your .env file:
   - Contains the full key including BEGIN/END markers
   - Uses actual newlines or \\n escape sequences
   - Is not wrapped in extra quotes if using actual newlines

2. Example of correct format with escaped newlines:
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAAS...\\n-----END PRIVATE KEY-----"

3. Example of correct format with real newlines:
   FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
   MIIEvQIBADANBgkqhkiG9w0BAQEFAAS...
   -----END PRIVATE KEY-----

4. If you're still having issues, try regenerating your Firebase service account key
   and downloading a fresh JSON file from the Firebase console.
---------------------------------------------
`); 