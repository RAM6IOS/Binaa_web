// public/sw.js

const CACHE_NAME = 'binaa-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/images/icon-192.png',
  '/images/icon-512.png',
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // Bypass external resources, local APIs, Supabase endpoints
  if (
    requestUrl.origin !== self.location.origin ||
    requestUrl.pathname.startsWith('/api') ||
    requestUrl.href.includes('supabase.co')
  ) {
    return;
  }

  // Next.js hot-reloading (HMR) and internal dev compilation bypass
  const isLocalhost = requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1';
  if (
    requestUrl.pathname.startsWith('/_next/webpack-hmr') ||
    (isLocalhost && requestUrl.pathname.includes('_next/'))
  ) {
    return;
  }

  // Cache-First strategy for static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          // Cache newly fetched static assets
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback for document navigation if network is down
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
    })
  );
});

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    console.log('[Service Worker] Background sync triggered for tag: sync-queue');
    event.waitUntil(triggerClientSync());
  }
});

// Helper to notify active client windows to run sync
async function triggerClientSync() {
  const allClients = await self.clients.matchAll({ type: 'window' });
  for (const client of allClients) {
    client.postMessage({ type: 'TRIGGER_SYNC' });
  }
}
