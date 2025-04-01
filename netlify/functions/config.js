// Netlify serverless function for Firebase configuration
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
      console.warn(`Unauthorized config request from: ${origin}`);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Send only the necessary Firebase config for client side
    const clientConfig = {
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.VITE_FIREBASE_APP_ID
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(clientConfig)
    };
  } catch (error) {
    console.error('Error in config function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}; 