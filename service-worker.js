const CACHE_NAME = 'apex-finance-v4';
const ASSETS = [
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/charts.js',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});