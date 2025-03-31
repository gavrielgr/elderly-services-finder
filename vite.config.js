import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Enables loading environment variables
  envDir: '.',
  
  // Sets the source directory
  root: '.',

  // Sets the base URL
  base: '/',

  // Defines aliases
  resolve: {
    alias: {
      '@': '/src'
    }
  },

  // Additional build settings
  server: {
    port: 5173,
    open: true
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: 'index.html',
        login: 'login.html',
        admin: 'admin.html'
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'sw') {
            return 'sw.js';
          }
          return 'assets/[name]-[hash].js';
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.js')) {
            return 'js/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },

  optimizeDeps: {
    exclude: ['fsevents']
  }
}); 