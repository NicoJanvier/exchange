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
  const req = e.request;
  if (req.method !== 'GET') return;
  // never intercept the rates API: a cache-first handler would pin a stale rate forever.
  // offline durability for rates is localStorage's job, not ours.
  if (new URL(req.url).origin !== location.origin) return;

  // The HTML shell is network-first. Cache-first here would mean a deploy that doesn't
  // change sw.js is never seen: no new worker, so no update banner, and the old page is
  // served forever. Cache stays as the offline fallback.
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => { c.put('./index.html', copy.clone()); c.put('./', copy); }).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html').then((hit) => hit || caches.match('./')))
    );
    return;
  }

  // Everything else (manifest, icon) is cache-first — it only changes with a CACHE bump.
  e.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
