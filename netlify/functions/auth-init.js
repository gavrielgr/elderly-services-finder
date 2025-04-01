// Netlify serverless function for auth initialization
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK only once
let firebaseAdmin;

const initializeFirebaseAdmin = () => {
  if (!firebaseAdmin) {
    try {
      firebaseAdmin = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
      });
      console.log('Firebase Admin SDK initialized in auth-init function');
    } catch (error) {
      console.error('Error initializing Firebase Admin SDK:', error);
      throw error;
    }
  }
  return firebaseAdmin;
};

export const handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  try {
    // For security, verify the origin/referer
    const origin = event.headers.origin || event.headers.referer;
    const allowedOrigins = [
      'https://elderly-service-finder.netlify.app',
      'https://elderly-services-finder.netlify.app',
      'http://localhost:5173',
      'http://localhost:5174'
    ];
    
    if (origin && !allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      console.warn(`Unauthorized auth init request from: ${origin}`);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Check for Firebase Admin credentials
    if (!process.env.FIREBASE_PROJECT_ID || 
        !process.env.FIREBASE_CLIENT_EMAIL || 
        !process.env.FIREBASE_PRIVATE_KEY) {
      console.log('Firebase Admin credentials not found, using development mode');
      // Return a development mode response
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'success',
          developmentMode: true,
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'elderly-service-finder'
        })
      };
    }

    // Initialize Firebase Admin and create a custom token
    const app = initializeFirebaseAdmin();
    const auth = getAuth(app);
    const token = await auth.createCustomToken('server-auth');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'success',
        authToken: token,
        projectId: process.env.VITE_FIREBASE_PROJECT_ID
      })
    };
  } catch (error) {
    console.error('Error in auth-init function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}; 