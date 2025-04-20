/**
 * Auth Bundle Entry Point
 * 
 * This file bundles all authentication-related functionality
 * for use in login.html and admin.html
 */

export { default as appConfig } from './config/app-config.js';
export * from './config/firebase.js';
export * from './services/authService.js'; 