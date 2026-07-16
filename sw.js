// EC Play service worker — makes the PWA genuinely installable/offline and
// gives repeat visits instant loads (GitHub Pages offers no cache headers, so
// this is the only durable caching layer we control).
//
// Strategy:
//  - HTML/navigation: network-first (deploys propagate immediately), cache fallback.
//  - Static assets (css/js/fonts/icons) + question banks (content/*.json):
//    stale-while-revalidate — serve from cache instantly, refresh in background.
// Bump VERSION on breaking changes to purge old caches.
const VERSION = "v1";
const CACHE = `ecplay-${VERSION}`;
const PRECACHE = [
  "/",
  "/css/style.css?v=game1",
  "/js/main.js?v=game1",
  "/fonts/baloo2-var.woff2",
  "/manifest.json",
  "/icon-192.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // never touch API/auth calls

  // navigations: network-first so new deploys show up right away
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
        .catch(() => caches.match(e.request).then((m) => m || caches.match("/")))
    );
    return;
  }

  // static assets + content: stale-while-revalidate
  if (/\.(css|js|woff2|png|svg|json)(\?|$)/.test(url.pathname + url.search) || url.pathname.startsWith("/content/")) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const refresh = fetch(e.request)
          .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return res; })
          .catch(() => cached);
        return cached || refresh;
      })
    );
  }
});
