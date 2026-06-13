// ==========================================================================
// APEX FINANCE SERVICE WORKER
// ==========================================================================

const CACHE_NAME = "apex-finance-v6";

const ASSETS = [
    "./",
    "./index.html",
    "./css/styles.css",
    "./js/app.js",
    "./js/charts.js",
    "./manifest.json"
];

// Install
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log("Caching app shell...");
                return cache.addAll(ASSETS);
            })
            .catch(err => {
                console.error("Cache install failed:", err);
            })
    );

    self.skipWaiting();
});

// Activate
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(cacheNames =>
            Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log("Deleting old cache:", cache);
                        return caches.delete(cache);
                    }
                })
            )
        )
    );

    self.clients.claim();
});

// Fetch
self.addEventListener("fetch", event => {

    if (event.request.method !== "GET") {
        return;
    }

    event.respondWith(

        caches.match(event.request).then(cachedResponse => {

            const fetchPromise = fetch(event.request)
                .then(networkResponse => {

                    if (
                        networkResponse &&
                        networkResponse.status === 200 &&
                        networkResponse.type === "basic"
                    ) {
                        const clone = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, clone);
                            });
                    }

                    return networkResponse;
                });

            return cachedResponse || fetchPromise;

        }).catch(() => {

            if (
                event.request.mode === "navigate"
            ) {
                return caches.match("./index.html");
            }

        })

    );
});

// Allow instant updates
self.addEventListener("message", event => {
    if (event.data?.action === "skipWaiting") {
        self.skipWaiting();
    }
});