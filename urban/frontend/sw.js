// EC Play service worker — makes the PWA genuinely installable/offline and
// gives repeat visits instant loads (GitHub Pages offers no cache headers, so
// this is the only durable caching layer we control).
//
// Strategy:
//  - HTML/navigation: network-first (deploys propagate immediately); offline
//    falls back to the cached page, the app shell for "/", or /offline.html.
//  - Static assets (css/js/fonts/icons) + question banks (content/*.json):
//    stale-while-revalidate — serve from cache instantly, refresh in background.
//  - Firebase SDK modules (gstatic, versioned/immutable): cache-first, so the
//    app-shell ES-module graph never rejects offline.
// PRECACHE must cover the FULL module-import graph of js/main.js — ES modules
// fetch each import separately (no ?v= on imports) and one miss rejects the
// whole graph. Bump VERSION on any precached-asset change.
const VERSION = "v7";
const CACHE = `ecplay-${VERSION}`;
const PRECACHE = [
  "/",
  "/offline.html",
  "/css/style.css?v=game6",
  "/js/main.js?v=game6",
  "/js/auth.js",
  "/js/firebase-config.js",
  "/js/premium.js",
  "/js/progress.js",
  "/js/question-bank.js",
  "/js/share-cards.js",
  "/js/sound-fx.js",
  "/js/stats.js",
  "/content/curriculum.js",
  "/content/exams.js",
  "/content/regions.js",
  "/shared-lib/adaptive-engine.js",
  "/shared-lib/audio-player.js",
  "/fonts/baloo2-var.woff2",
  "/manifest.json",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
];

self.addEventListener("install", (e) => {
  // No swallow: if any precache entry 404s, install fails loudly and the
  // previous (complete) service worker keeps serving. cache: "no-cache"
  // revalidates each entry (GitHub Pages serves max-age=600), so a VERSION
  // bump can never precache the stale copy it was bumped to replace.
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE.map((u) => new Request(u, { cache: "no-cache" }))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // Firebase SDK ES modules: versioned immutable URLs → cache-first.
  if (url.origin === "https://www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) {
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      }))
    );
    return;
  }

  if (url.origin !== location.origin) return; // never touch API/auth calls

  // navigations: network-first so new deploys show up right away
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
        .catch(() => caches.match(e.request).then((m) => {
          if (m) return m;
          // Only the shell URL falls back to the app; other pages get an
          // honest offline page instead of silently serving the home screen.
          if (url.pathname === "/" || url.pathname === "/index.html") return caches.match("/");
          return caches.match("/offline.html");
        }))
    );
    return;
  }

  // static assets + content: stale-while-revalidate
  if (/\.(css|js|woff2|png|svg|json)(\?|$)/.test(url.pathname + url.search) || url.pathname.startsWith("/content/")) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const refresh = fetch(e.request)
          .then(async (res) => {
            if (res.ok) { const c = await caches.open(CACHE); await c.put(e.request, res.clone()); }
            return res;
          })
          .catch(() => cached || Response.error());
        // Hold the worker open until the cache write completes, so a big
        // question-bank download still lands in cache even if the page that
        // started it (the starter background fill) closes mid-transfer.
        e.waitUntil(refresh.then(() => undefined, () => undefined));
        return cached || refresh;
      })
    );
  }
});
