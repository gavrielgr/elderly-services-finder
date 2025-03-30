import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // מאפשר טעינת משתני סביבה
  envDir: '.',
  
  // מגדיר את תיקיית המקור
  root: '.',

  // מגדיר את ה-base URL
  base: '/',

  // הגדרת aliases
  resolve: {
    alias: {
      '@': '/src'
    }
  },

  // הגדרות נוספות של הבנייה
  server: {
    port: 5173,
    open: true
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },

  optimizeDeps: {
    exclude: ['fsevents'],
    include: ['firebase/app', 'firebase/firestore', 'firebase/auth']
  }
}); 