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
      '@': '/src',
      '/js': resolve(__dirname, 'js')
    }
  },

  // Additional build settings
  server: {
    port: 5173,
    open: true,
    hmr: {
      overlay: true
    }
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: 'index.html',
        login: 'login.html',
        admin: 'admin.html',
        sw: 'sw.js'
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'sw') {
            return 'sw.js';
          }
          return 'assets/[name]-[hash].js';
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          
          // Keep original names for assets in public/assets
          if (assetInfo.name.startsWith('public/assets/')) {
            return assetInfo.name.replace('public/', '');
          }
          
          // Handle other assets
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return 'assets/images/[name][extname]';
          }
          if (ext === 'css') {
            return 'assets/css/[name][extname]';
          }
          if (ext === 'js') {
            return 'js/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    // Copy files from public to dist
    copyPublicDir: true
  },

  optimizeDeps: {
    exclude: ['fsevents']
  }
}); 