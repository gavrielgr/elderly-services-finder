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
      '@': '/src',
      'firebase/app': 'firebase/app',
      'firebase/firestore': 'firebase/firestore',
      'firebase/auth': 'firebase/auth'
    }
  },

  // הגדרות נוספות של הבנייה
  server: {
    port: 5173,
    open: true
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      external: ['firebase/app', 'firebase/firestore', 'firebase/auth']
    }
  },

  optimizeDeps: {
    exclude: ['fsevents'],
    include: ['firebase/app', 'firebase/firestore', 'firebase/auth']
  }
}); 