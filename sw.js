const CACHE_NAME = 'serabut-v7';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/logo.png',
  '/manifest.json'
];

// ── Install: cache semua static assets termasuk index.html ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activate: hapus cache lama ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch strategy ──
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // Skip: bukan GET
  if (req.method !== 'GET') return;

  // Skip: request ke GAS (external hostname)
  if (url.hostname !== location.hostname) return;

  // Navigasi (HTML pages) — network first, fallback ke cached index.html
  if (req.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname.startsWith('/produk/') || url.pathname.startsWith('/pesanan/')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          // Update cache dengan versi terbaru
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => {
          // Offline → serve cached index.html
          return caches.match('/index.html').then(cached => {
            return cached || new Response('<h1>Offline</h1><p>Buka serabut.id saat ada koneksi internet.</p>', {
              headers: { 'Content-Type': 'text/html' }
            });
          });
        })
    );
    return;
  }

  // Static assets (logo, manifest, icons) — cache first
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
