/* El cascarón del centro abre sin internet: la página, su estilo, los íconos y el motor se guardan
   en el teléfono. Los DATOS no pasan por aquí: de eso se encarga sin-red.js (réplica y cola).
   Estrategia: se contesta con lo guardado y, si hay señal, se refresca por detrás. Por eso un
   cambio publicado se ve en la SEGUNDA apertura, no en la primera. Subir V al cambiar la lista. */
const V = 'urbanpest-centro-v1';
const CASCARON = ['./', './index.html', './sin-red.js', './motor.js', './muestra.js', '../chat/estilo.css',
  '../../presentaciones/vendor/lucide-1.48.0.json', '../web/img/sello.png'];

self.addEventListener('install', (e) => {
  /* uno por uno: si un archivo falta, los demás se guardan igual (addAll falla entero por uno solo) */
  e.waitUntil(caches.open(V).then(c => Promise.all(CASCARON.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('urbanpest-centro-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  /* sólo archivos de este mismo sitio y sólo lecturas; el servidor de datos (/api/) nunca se guarda aquí */
  if (e.request.method !== 'GET' || u.origin !== self.location.origin || u.pathname.includes('/api/')) return;
  e.respondWith(caches.open(V).then(async (c) => {
    const guardado = await c.match(e.request, { ignoreSearch: e.request.mode === 'navigate' });
    const deRed = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    return guardado || (await deRed) || new Response('Sin internet y esto todavía no estaba guardado.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }));
});
