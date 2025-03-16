// Service Worker for Elderly Services Finder

// This version number should match APP_VERSION in app.js
const CACHE_VERSION = '1.997.8';
const CACHE_NAME = `elderly-services-cache-v${CACHE_VERSION}`;
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/favicon.ico',
  'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700&display=swap'
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
    // This would be where we could implement background data synchronization
    console.log('Background sync triggered');
    
    // Notify all clients that we're doing a background sync
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'BACKGROUND_SYNC_STARTED'
        });
      });
    });
    
    // Here you would typically fetch the latest data from your API
    event.waitUntil(
      fetch(API_URL)
        .then(response => response.json())
        .then(data => {
          // After successfully fetching new data, notify all clients
          return self.clients.matchAll().then(clients => {
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
        })
        .catch(error => {
          console.error('Background sync failed:', error);
        })
    );
  }
});

// Listen for push notifications (if we add this feature later)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'יש עדכון חדש במידע!',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge.png',
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
