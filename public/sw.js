// דפים ונתונים מהרשת (עם גיבוי מהמטמון לעבודה בלי קליטה), תמונות ונכסים מהמטמון.
const CACHE = 'shvil-v2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
));
const networkFirst = (req, key) => fetch(req).then((res) => {
  if (res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(key || req, copy));
  }
  return res;
}).catch(() => caches.match(key || req));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') return e.respondWith(networkFirst(req, '/'));
  if (url.origin === location.origin && url.pathname.startsWith('/data/')) return e.respondWith(networkFirst(req));
  if (['image', 'script', 'style', 'font'].includes(req.destination)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    })));
  }
});
