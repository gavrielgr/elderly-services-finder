// Service Worker for Elderly Services Finder

// This version is injected during build
const CACHE_VERSION = '1.99.116'; // Updated version
const CACHE_NAME = `elderly-services-cache-v${CACHE_VERSION}`;

// Function to normalize URL
const normalizeUrl = (url) => {
  const urlObj = new URL(url, self.location.origin);
  // Remove hash from the URL if it exists
  return urlObj.origin + urlObj.pathname;
};

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/favicon.ico',
  '/icons/favicon-32x32.png',
  '/icons/favicon-16x16.png',
  '/icons/search.png',  
  '/icons/logo.png',
  '/icons/google-logo.png',
  '/icons/android/mipmap-mdpi.png',
  '/icons/android/mipmap-hdpi.png',
  '/icons/android/mipmap-xhdpi.png',
  '/icons/android/mipmap-xxhdpi.png',
  '/icons/android/mipmap-xxxhdpi.png',
  '/icons/android-512x512.png',
  '/icons/apple-touch-icon.png',
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
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(`Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName).catch(error => {
              console.error(`Failed to delete cache ${cacheName}:`, error);
              // Continue execution even if deletion fails
              return Promise.resolve();
            });
          }
          return Promise.resolve();
        }).filter(Boolean)
      );
    }).then(() => {
      // Claim clients to ensure the new service worker takes control immediately
      return self.clients.claim();
    }).catch(error => {
      console.error('Cache cleanup failed:', error);
      // Continue with activation even if cache cleanup fails
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Handle Google Fonts requests differently
  if (event.request.url.includes('fonts.googleapis.com') || 
      event.request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetch(event.request)
        .then(response => response)
        .catch(() => {
          // If network request fails, return a fallback font or empty response
          return new Response('', {
            status: 200,
            statusText: 'OK'
          });
        })
    );
    return;
  }
  
  // Skip other cross-origin requests except for specific domains we need
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('cdn.jsdelivr.net')) {
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

  // For all other requests, use Cache First strategy with network fallback
  event.respondWith(
    caches.match(normalizeUrl(event.request.url))
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200) {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the response
            caches.open(CACHE_NAME)
              .then((cache) => {
                const normalizedUrl = normalizeUrl(event.request.url);
                cache.put(normalizedUrl, responseToCache);
              });

            return response;
          }
        ).catch((error) => {
          console.error('Fetch failed:', error);
          throw error;
        });
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
      icon: '/icons/android/mipmap-xxxhdpi.png',
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
