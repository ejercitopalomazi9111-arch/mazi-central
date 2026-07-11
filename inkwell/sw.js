/* INKWELL — service worker.
   Guarda la app y las 112 pinturas para leer sin datos.
   Estrategia: cache-first (nada de esto cambia seguido). */
const V = 'inkwell-v3';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    // el shell mínimo; el arte se cachea solo conforme se ve
    await c.addAll(['./', './index.html', './manifest.webmanifest', './arte/arte.json']).catch(()=>{});
    // precarga TODAS las pinturas para que el camión no sea sorpresa
    try {
      const art = await (await fetch('./arte/arte.json')).json();
      await Promise.all(art.map(a =>
        c.add('./arte/img/' + a.f).catch(()=>{})
      ));
    } catch(e) {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const hit = await caches.match(e.request);
    if (hit) return hit;
    try {
      const res = await fetch(e.request);
      if (res.ok) {
        const c = await caches.open(V);
        c.put(e.request, res.clone());
      }
      return res;
    } catch (err) {
      return (await caches.match('./index.html')) || Response.error();
    }
  })());
});
