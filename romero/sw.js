/* Hoja de Romero — guarda el juego y su arte para jugarlo sin datos. */
const V = 'romero-v2';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await c.addAll([
      './', './index.html', './manifest.webmanifest',
      './arte/lpc/manifest.json',
      './arte/tiles/pasto.png', './arte/tiles/tierra.png', './arte/tiles/agua.png',
      './arte/tiles/piedra.png', './arte/tiles/arena.png', './arte/tiles/arado.png',
      './arte/crops/crops-v2/crops.png',
      './arte/food/lpc-food-v2/fruits-veggies.png',
      './arte/food/lpc-food-v2/animal-products.png',
      './arte/food/lpc-food-v2/bread-pastry.png',
    ].map(u => new Request(u, {cache:'reload'}))).catch(()=>{});
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)));
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
      if (res.ok) (await caches.open(V)).put(e.request, res.clone());
      return res;
    } catch (err) {
      return (await caches.match('./index.html')) || Response.error();
    }
  })());
});
