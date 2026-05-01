// Service Worker for SheetCutters.com
// Provides offline support and asset caching

const CACHE_NAME = 'sheetcutters-v1';
const RUNTIME_CACHE = 'sheetcutters-runtime';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles/globals.css',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip API calls (always fetch fresh)
  if (url.pathname.includes('/functions/v1/')) {
    return;
  }

  // Skip authentication requests
  if (url.pathname.includes('/auth/')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log('[Service Worker] Serving from cache:', url.pathname);
        return cachedResponse;
      }

      // Not in cache - fetch from network
      return fetch(request).then((response) => {
        // Don't cache if not successful
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone the response (can only read once)
        const responseToCache = response.clone();

        // Cache static assets and images
        const shouldCache = 
          url.pathname.endsWith('.js') ||
          url.pathname.endsWith('.css') ||
          url.pathname.endsWith('.png') ||
          url.pathname.endsWith('.jpg') ||
          url.pathname.endsWith('.jpeg') ||
          url.pathname.endsWith('.svg') ||
          url.pathname.endsWith('.webp') ||
          url.pathname.endsWith('.woff') ||
          url.pathname.endsWith('.woff2') ||
          url.pathname.endsWith('.ttf');

        if (shouldCache) {
          caches.open(RUNTIME_CACHE).then((cache) => {
            console.log('[Service Worker] Caching new resource:', url.pathname);
            cache.put(request, responseToCache);
          });
        }

        return response;
      }).catch((error) => {
        console.error('[Service Worker] Fetch failed:', error);
        
        // Return offline fallback for HTML requests
        if (request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
        
        throw error;
      });
    })
  );
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});
