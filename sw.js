// Stash service worker: lets the installed app open without a connection.
// Your photos and videos are never here; they live in the app's own storage on this device.
const CACHE = 'stash-app-v1';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => Promise.all(FILES.map(f => cache.add(f).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

// Network first, so a new index.html you upload shows up right away. The saved copy is used when you're offline.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req.mode === 'navigate' ? new Request(req.url, { cache: 'no-cache' }) : req);
      if (res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    } catch {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      return Response.error();
    }
  })());
});
