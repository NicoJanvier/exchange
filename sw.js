// Cache-first service worker for offline use. Bump CACHE to force an update.
const CACHE = 'exchange-v1';
const ASSETS = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', (e) => {
  // do NOT skipWaiting here — wait until the user taps "Reload" in the app
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

// the page asks us to activate the new version when the user taps Reload
self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // never intercept the rates API: a cache-first handler would pin a stale rate forever.
  // offline durability for rates is localStorage's job, not ours.
  if (new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then((hit) =>
      hit || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
