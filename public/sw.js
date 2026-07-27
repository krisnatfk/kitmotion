// KITMOTION service worker — minimal app-shell cache.
// Camera frames and MediaPipe model/wasm are NEVER cached or intercepted:
// - getUserMedia streams don't go through fetch.
// - Cross-origin CDN requests (model/wasm) are passed through untouched.
const CACHE = "kitmotion-v1";
const PRECACHE = ["/", "/dashboard", "/manifest.json", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Never touch cross-origin (MediaPipe CDN, fonts) — let the network handle it.
  if (url.origin !== self.location.origin) return;

  // Next hashed assets: cache-first, they're immutable.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  // Navigations: network-first, fall back to cached shell when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE);
        return (
          (await cache.match(request)) ||
          (await cache.match("/")) ||
          Response.error()
        );
      }),
    );
  }
});
