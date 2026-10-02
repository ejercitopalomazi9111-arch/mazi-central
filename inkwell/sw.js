/* INKWELL — service worker.
   Guarda la app y las 112 pinturas para leer sin datos.

   v4 · lo que cambió y por qué:
   · Antes TODO iba «primero lo guardado»: la app nunca se actualizaba (el
     index.html del primer día se servía para siempre) y, con las Tiras, la
     lista de capítulos de Webtoon se habría congelado — nunca un capítulo
     nuevo — y cada imagen se habría guardado DOS veces (aquí y en la base de
     las Tiras). Ahora:
       · lo de otro sitio (Wattpad) y lo que va a La Sala (/api/) NO se toca;
       · la app (html, js, manifest) va «primero la red» y, sin red, lo guardado;
       · las pinturas siguen «primero lo guardado»: no cambian nunca. */
const V = 'inkwell-v4';
const APP = ['./', './index.html', './tiras.html', './tiras.js', './fuentes.js', './archivos.js', './manifest.webmanifest', './arte/arte.json'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await c.addAll(APP).catch(()=>{});
    try {
      const art = await (await fetch('./arte/arte.json')).json();
      await Promise.all(art.map(a => c.add('./arte/img/' + a.f).catch(()=>{})));
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
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  const esArte = url.pathname.includes('/arte/img/');
  e.respondWith((async () => {
    const c = await caches.open(V);
    if (esArte) {
      const hit = await c.match(req);
      if (hit) return hit;
    }
    try {
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    } catch (err) {
      return (await c.match(req, { ignoreSearch: true })) || (await c.match('./index.html')) || Response.error();
    }
  })());
});
