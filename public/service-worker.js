// MedAcademic Service Worker - Offline Support
// - Navigation (HTML): network-first, falls back to the cached shell offline (new deploys show up immediately)
// - Hashed build assets (/assets/*): cache-first (file names change on every build)
// - Other same-origin static files: stale-while-revalidate
// - Cross-origin requests (Firestore, Google APIs, fonts...) and non-GET requests are never intercepted
const CACHE_VERSION = 'medacademic-v3';
const STATIC_CACHE_NAME = `medacademic-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `medacademic-dynamic-${CACHE_VERSION}`;

const PRECACHE_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

// Install Event: Precache the core App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_RESOURCES).catch((err) => {
        console.warn('[SW] Falha parcial no precache (não-fatal):', err);
      });
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event: Purge old caches & claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

const jsonResponse = (body) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });

// Offline answer for backend requests that failed on the network
function offlineApiResponse() {
  return jsonResponse({ status: 'offline', message: 'Serviço em modo offline' });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only same-origin requests are handled; Firestore/Google traffic goes straight to the network
  if (url.origin !== self.location.origin) {
    return;
  }

  // API Requests (Backend): network only, with graceful offline fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).catch(() => offlineApiResponse()));
    return;
  }

  if (request.method !== 'GET') {
    return;
  }

  // Navigation Requests (HTML / SPA routes): NETWORK-FIRST so new deploys are picked up immediately
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => cache.put('/index.html', clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cache = await caches.open(STATIC_CACHE_NAME);
          const offlineHtml = (await cache.match('/index.html')) || (await cache.match('/'));
          return offlineHtml || new Response(
            '<!DOCTYPE html><html><body><h1>MedAcademic Offline</h1><p>Conecte-se à internet para carregar o aplicativo pela primeira vez.</p></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  const isHashedAsset = url.pathname.startsWith('/assets/');

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      });

      if (cachedResponse) {
        // Hashed assets never change; other files are revalidated in the background
        if (!isHashedAsset) networkFetch.catch(() => {});
        return cachedResponse;
      }

      return networkFetch.catch(() => new Response('', { status: 408, statusText: 'Offline Resource Unavailable' }));
    })
  );
});
