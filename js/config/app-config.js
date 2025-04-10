/**
 * Application Configuration
 * 
 * This file provides central configuration options for the application.
 */

// Whether running in a local environment
export const isLocalEnvironment = () => {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1';
};

// Helper to get the correct API base URL based on environment
export const getApiBaseUrl = () => {
  // For local development, use the local server port
  if (isLocalEnvironment()) {
    return 'http://localhost:5001';
  }
  
  // For production, use relative URLs
  return '';
}; 