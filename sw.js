const CACHE_NAME = 'serabut-v5';
const STATIC_ASSETS = [
  '/logo.png',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // Jangan cache: POST, GAS API, CDN external
  if (req.method !== 'GET' || url.hostname !== location.hostname) {
    e.respondWith(fetch(req).catch(() => new Response('', { status: 503 })));
    return;
  }

  // index.html & navigasi — NETWORK FIRST (selalu ambil terbaru)
  if (url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname.startsWith('/produk/')) {
    e.respondWith(
      fetch(req).then(res => res).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Asset statis (logo, manifest) — cache first
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return res;
      }).catch(() => new Response('', { status: 503 }));
    })
  );
});
