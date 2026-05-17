// Nexxus CRM service worker.
//
// Strategy:
//   * Navigation requests (HTML) — network-first, fall back to the precached
//     /offline page when the network errors out (typically when the device
//     is offline).
//   * Static Next assets (/_next/static/*) and same-origin images — stale-
//     while-revalidate so the app shell loads instantly on repeat visits
//     and stays up to date in the background.
//   * Everything else (API routes, third-party) — passthrough. We never
//     cache /api/* because responses are personalised and would leak data
//     across users or workspaces.
//
// Bump CACHE_VERSION when you change anything in PRECACHE — the install
// step deletes prior caches.

const CACHE_VERSION = "nexxus-v1";
const PRECACHE_URLS = ["/offline", "/favicon.ico", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

function isNavigationRequest(request) {
  return request.mode === "navigate" || (request.method === "GET" && request.headers.get("accept")?.includes("text/html"));
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache cross-origin or API responses.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline").then((cached) => cached || new Response("offline", { status: 503 }))),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response && response.status === 200) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      }),
    );
  }
});
