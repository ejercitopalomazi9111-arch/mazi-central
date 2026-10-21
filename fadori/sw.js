/* ══════════════════════════════════════════════════════════════════════════
   FADORI · el trabajador de fondo (service worker)
   ──────────────────────────────────────────────────────────────────────────
   Hace UNA cosa: recibir los avisos del servidor con la app cerrada y
   mostrarlos como notificación del teléfono. Al tocarla, abre la app.

   Y desde el 14 de octubre guarda una copia de la app para abrirla sin
   internet, siempre «primero la red» (abajo).
   ═════════════════════════════════════════════════════════════════════════ */
/* SIN INTERNET (Carlos, 14 de octubre: «haz que se pueda navegar aunque sea
   un poco sin internet»). Ahora sí atiende `fetch`, pero PRIMERO LA RED: si la
   red contesta, eso se usa y se guarda una copia; si no contesta (o tarda más
   de 4 s, que en el wifi de la escuela es lo mismo), se usa la última copia.
   Así nunca se queda congelada en una versión vieja —el error de INKWELL— y
   sin red abre el menú, tus pedidos y tu turno (los datos ya viven en el
   teléfono). Lo del servidor (/api/) y lo de otros sitios no se toca. */
const CAJA = 'fadori-v1';
const BASE_OFF = ['./', 'index.html', 'nucleo.js', 'constancia.js', 'estilo.css', 'iconos.js', 'manifest.webmanifest',
  'marca/icon-192.png', 'marca/logo-fadori.png', 'marca/capa-pan-arriba.png', 'marca/capa-pan-abajo.png', 'marca/capa-carne.png',
  'marca/capa-queso.png', 'marca/capa-jitomate.png', 'marca/capa-lechuga.png', 'marca/capa-sombra.png', 'marca/capa-fadori.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CAJA).then(c => Promise.all(BASE_OFF.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('fadori-') && k !== CAJA).map(k => caches.delete(k)))).then(() => self.clients.claim())));

self.addEventListener('fetch', (e) => {
  const q = e.request;
  if(q.method !== 'GET') return;
  const u = new URL(q.url);
  if(u.origin !== self.location.origin || u.pathname.indexOf('/api/') >= 0) return;
  if(q.headers.get('range')) return;                    /* videos a pedazos: tal cual */
  e.respondWith((async () => {
    const caja = await caches.open(CAJA);
    const red = fetch(q).then(r => { if(r && r.ok && r.type === 'basic') caja.put(q, r.clone()).catch(() => {}); return r; });
    const guardada = () => caja.match(q, { ignoreSearch: q.mode === 'navigate' }).then(r => r ||
      (q.mode === 'navigate' ? caja.match('index.html') : undefined));
    try{
      /* la red tiene 4 s; si no, la copia (y la red sigue para la próxima) */
      const r = await Promise.race([red, new Promise((_, no) => setTimeout(() => no(new Error('lenta')), 4000))]);
      return r;
    }catch(err){
      const g = await guardada();
      if(g) return g;
      return red.catch(() => new Response('Sin internet y esto todavía no se había abierto en este teléfono.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } }));
    }
  })());
});

self.addEventListener('push', (e) => {
  let d = {};
  try{ d = e.data ? e.data.json() : {}; }catch(err){ d = { cuerpo: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Fadori', {
    body: d.cuerpo || '',
    tag: d.tag || 'fadori',          /* el mismo aviso no se apila: se reemplaza */
    renotify: true,
    icon: 'marca/icon-192.png',
    badge: 'marca/icon-192.png',
    vibrate: [200, 100, 200, 100, 300],
    requireInteraction: /listo/.test(d.tag || ''),
    data: { url: d.url || 'index.html' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const destino = new URL((e.notification.data && e.notification.data.url) || 'index.html', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
    const ya = ventanas.find(w => w.url.split('#')[0].split('?')[0] === destino.split('?')[0]);
    if(ya) return ya.focus();
    return self.clients.openWindow(destino);
  }));
});
