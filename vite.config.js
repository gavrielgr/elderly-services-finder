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
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('Proxy error:', err);
            
            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'application/json'
              });
              res.end(JSON.stringify({ 
                error: 'API server is not available',
                message: 'Please start the API server with "node server.js"'
              }));
            }
          });
        }
      }
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
        sw: 'sw.js',
        auth: 'js/auth-bundle.js'
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'sw') {
            return 'sw.js';
          }
          if (chunkInfo.name === 'auth') {
            return 'js/auth-bundle.js';
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
        },
        // Disable inlineDynamicImports to fix the build conflict
        inlineDynamicImports: false
      }
    },
    // Copy files from public to dist
    copyPublicDir: true,
    sourcemap: true
  },

  optimizeDeps: {
    exclude: ['fsevents']
  }
}); 