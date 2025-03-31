// Service Worker for Elderly Services Finder

// This version is injected during build
const CACHE_VERSION = '1.99.94'; // Updated version
const CACHE_NAME = `elderly-services-cache-v${CACHE_VERSION}`;
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles/main.css',
  './styles/base/reset.css',
  './styles/base/variables.css',
  './styles/base/typography.css',
  './styles/components/header.css',
  './styles/components/search.css',
  './styles/components/categories.css',
  './styles/components/results.css',
  './styles/components/modal.css',
  './styles/components/install-prompt.css',
  './styles/components/status-bar.css',
  './styles/layout/responsive.css',
  './styles/layout/print.css',
  './styles/themes/dark-mode.css',
  './app.js',
  './js/ui/uiManager.js',
  './js/ui/searchManager.js',
  './js/ui/categoryManager.js',
  './js/ui/resultsManager.js',
  './js/ui/modalManager.js',
  './js/services/dataService.js',
  './js/services/storageService.js',
  './js/utils/helpers.js',
  './js/config/constants.js',
  './js/config/api.js',
  './js/config/firebase.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon.ico',
  './icons/favicon-32x32.png',
  './icons/favicon-16x16.png',
  './icons/search.png',  
  './icons/logo.png',    
  'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700&display=swap',
  'https://cdn.jsdelivr.net/npm/fuse.js@6.6.2/dist/fuse.esm.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  console.log(`Installing service worker version ${CACHE_VERSION}`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch((error) => {
        console.error('Failed to cache assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log(`Activating new service worker version ${CACHE_VERSION}`);
  
  // Remove all caches that don't match current version
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(`Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim clients to ensure the new service worker takes control immediately
      return self.clients.claim();
    }).then(() => {
      // Notify all clients that the service worker has been updated
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SERVICE_WORKER_UPDATED',
            version: CACHE_VERSION
          });
        });
      });
    })
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests except for specific domains we need
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('fonts.googleapis.com') &&
      !event.request.url.includes('fonts.gstatic.com')) {
    return;
  }
  
  // Handle API requests differently
  if (event.request.url.includes('script.google.com/macros')) {
    // Network first for API requests, with cache fallback
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the updated API response
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If network fails, try to return the cached response
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // For all other requests, use Cache First strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return the cached response if found
        if (response) {
          return response;
        }
        
        // If not in cache, fetch from network
        return fetch(event.request).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response as it can only be consumed once
            const responseToCache = response.clone();
            
            // Add the new response to the cache
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          }
        );
      })
  );
});

// Background sync event for when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'refresh-data') {
    console.log('Background sync triggered');
    
    // Notify all clients that we're doing a background sync
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'BACKGROUND_SYNC_STARTED'
        });
      });
    });
    
    // After successfully fetching new data, notify all clients
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'CACHE_UPDATED',
          data: {
            timestamp: new Date().toISOString(),
            version: CACHE_VERSION
          }
        });
      });
    });
  }
});

// Listen for push notifications (if we add this feature later)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'יש עדכון חדש במידע!',
      icon: '/icons/icon-192.png',
      dir: 'rtl', // Right-to-left for Hebrew
      lang: 'he'
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'עדכון שירותים לגיל השלישי', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clientList => {
      // If a window client is already open, focus it
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
