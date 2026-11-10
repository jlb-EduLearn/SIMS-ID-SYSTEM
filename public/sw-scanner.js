/* SIMS Scanner station service worker — caches shell for offline UI. */
const CACHE = "sims-scanner-shell-v1";
const PRECACHE = [
  "/scanner",
  "/scanner-manifest.webmanifest",
  "/SIMS-white-colored-blue.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API / auth — offline queue handles scan sync.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/api")) return;

  if (
    url.pathname.startsWith("/scanner") ||
    url.pathname.startsWith("/_next/static") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".webmanifest")
  ) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        try {
          const fresh = await fetch(request);
          if (fresh.ok) cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cached = await cache.match(request);
          if (cached) return cached;
          if (url.pathname.startsWith("/scanner")) {
            const shell = await cache.match("/scanner");
            if (shell) return shell;
          }
          throw new Error("Offline and not cached");
        }
      })
    );
  }
});
