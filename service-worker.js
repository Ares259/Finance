// ==========================================================================
// SERVICE WORKER COMPLIANCE ENGINE
// ==========================================================================

// Change this version identifier (e.g., v4 to v5) whenever you push updates
const CACHE_NAME = 'apex-finance-v4';

const ASSETS = [
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/charts.js',
  './manifest.json'
];

// Phase 1: Installation Lifecycle (Cache assets)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

// Phase 2: Activation Lifecycle (Wipe old caches automatically)
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing deprecated app cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Phase 3: Fetch Lifecycle (Serve cached assets offline)
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => {
      return res || fetch(e.request);
    })
  );
});