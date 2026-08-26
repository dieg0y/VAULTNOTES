/* VaultNotes Service Worker — offline-first shell caching.
 * Caches same-origin GET requests (network-first in dev, cache-first
 * fallback to network in prod).
 * IndexedDB (Dexie) is the source of truth for app data; this SW only
 * caches the HTML/JS/CSS shell so the app loads even with no network.
 *
 * Bumping CACHE version (v1 → v2 → v3 → …) triggers automatic cleanup of
 * the previous cache on activation, so users always see the latest shell
 * after a single reload.
 */
const CACHE = 'vaultnotes-v3';
const SHELL = ['/', '/manifest.webmanifest', '/logo.svg', '/icon.svg'];

// Dev detection — Next.js dev server runs on localhost:3000. In dev the SW
// must NOT intercept fetch (it breaks HMR + serves stale chunks). We still
// install the SW so the manifest resolves, but the fetch handler returns
// early for same-origin GETs in dev.
const IS_DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

// Wipe ALL caches (any name) — used in both install and activate to make
// sure no stale cache from a previous version survives. In dev we want
// zero caching; in prod we keep only the current version.
const wipeAllCaches = () =>
  caches.keys().then((keys) =>
    Promise.all(
      keys
        .filter((k) => (IS_DEV ? true : k !== CACHE))
        .map((k) => caches.delete(k))
    )
  );

self.addEventListener('install', (event) => {
  // In dev, skip shell precaching entirely AND wipe any stale cache from
  // previous prod sessions (e.g. when the user opened a prod build earlier
  // and is now running the dev server). HMR handles freshness in dev.
  if (IS_DEV) {
    event.waitUntil(wipeAllCaches().then(() => self.skipWaiting()));
    return;
  }
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL).catch(() => undefined))
      .then(() => wipeAllCaches())
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Always wipe stale caches on activate (dev: all; prod: non-current).
  event.waitUntil(wipeAllCaches().then(() => self.clients.claim()));
  // Force every open client to refresh so users immediately see the new
  // shell instead of relying on them to hard-reload.
  self.clients.matchAll({ type: 'window' }).then((clients) => {
    for (const client of clients) {
      // Post a message so the page can show a "Reloading…" toast if it wants.
      client.postMessage({ type: 'SW_UPDATED', cache: CACHE });
    }
  });
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only handle same-origin; let cross-origin (fonts, analytics) pass through.
  if (url.origin !== self.location.origin) return;

  // In dev: never intercept. Let the dev server + HMR handle everything.
  // Returning without calling event.respondWith() lets the browser do the
  // default network request — exactly what dev needs.
  if (IS_DEV) return;

  // For navigation requests, serve cached index.html (app shell) when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/').then((r) => r || caches.match('/index.html')))
    );
    return;
  }
  // Static assets: cache-first, then network (and cache the response).
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
