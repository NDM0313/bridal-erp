// 610C POS System - Service Worker
// Handles offline support, caching, and background sync

const CACHE_NAME = '610c-v1.0.0';
const URLS_TO_CACHE = [
  '/610c/public/',
  '/610c/public/home',
  '/610c/public/login',
  '/610c/public/css/app.css',
  '/610c/public/js/app.js',
  '/610c/public/images/logo.png',
  '/610c/public/manifest.json',
  '/610c/public/offline.html'
];

// Install event - cache essential files
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching essential files');
      return cache.addAll(URLS_TO_CACHE);
    }).catch(error => {
      console.error('[Service Worker] Cache failed:', error);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip API calls - they should always go to network
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => response)
        .catch(() => new Response(
          JSON.stringify({ error: 'Offline - API unavailable' }),
          { 
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'application/json' })
          }
        ))
    );
    return;
  }

  // For HTML pages: try network first, fallback to cache
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (!response || response.status !== 200) {
            return caches.match(request) || caches.match('/610c/public/offline.html');
          }
          // Cache successful responses
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          console.log('[Service Worker] Network failed, using cache:', request.url);
          return caches.match(request) || caches.match('/610c/public/offline.html');
        })
    );
    return;
  }

  // For assets (CSS, JS, images): cache first, fallback to network
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(request)
          .then(response => {
            if (!response || response.status !== 200) {
              return response;
            }
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
            return response;
          })
          .catch(() => {
            console.log('[Service Worker] Failed to fetch:', request.url);
            return new Response('Asset not available', { status: 404 });
          });
      })
  );
});

// Background Sync - sync data when online
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background sync:', event.tag);
  if (event.tag === 'sync-sales') {
    event.waitUntil(syncSalesData());
  } else if (event.tag === 'sync-inventory') {
    event.waitUntil(syncInventoryData());
  }
});

// Sync sales transactions
function syncSalesData() {
  return fetch('/610c/public/api/sync-sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    credentials: 'same-origin'
  })
  .then(response => {
    if (response.ok) {
      console.log('[Service Worker] Sales data synced');
      notifyClients('Sales data synced successfully');
    }
  })
  .catch(error => {
    console.error('[Service Worker] Sync failed:', error);
  });
}

// Sync inventory
function syncInventoryData() {
  return fetch('/610c/public/api/sync-inventory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin'
  })
  .then(response => {
    if (response.ok) {
      console.log('[Service Worker] Inventory synced');
      notifyClients('Inventory updated');
    }
  })
  .catch(error => {
    console.error('[Service Worker] Inventory sync failed:', error);
  });
}

// Notify clients of changes
function notifyClients(message) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_COMPLETE', message });
    });
  });
}

// Push notifications
self.addEventListener('push', event => {
  console.log('[Service Worker] Push notification received');
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'New notification',
    icon: '/610c/public/images/icons/icon-192x192.png',
    badge: '/610c/public/images/icons/badge-72x72.png',
    tag: data.tag || 'notification',
    requireInteraction: data.requireInteraction || false,
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '610C System', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    const urlToOpen = event.notification.data?.url || '/610c/public/home';
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        // Check if app is already open
        for (let i = 0; i < windowClients.length; i++) {
          if (windowClients[i].url === urlToOpen) {
            return windowClients[i].focus();
          }
        }
        // Open new window if not found
        return clients.openWindow(urlToOpen);
      })
    );
  }
});

console.log('[Service Worker] Service Worker loaded');
