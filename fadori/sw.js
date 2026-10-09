/* ══════════════════════════════════════════════════════════════════════════
   FADORI · el trabajador de fondo (service worker)
   ──────────────────────────────────────────────────────────────────────────
   Hace UNA cosa: recibir los avisos del servidor con la app cerrada y
   mostrarlos como notificación del teléfono. Al tocarla, abre la app.

   NO guarda nada en caché y NO atiende `fetch`, a propósito: un trabajador
   «primero lo guardado» deja la app congelada en su primera versión para
   siempre (pasó con INKWELL; está en la tabla de CLAUDE.md). Sin `fetch`, la
   app se carga siempre de la red como antes.
   ═════════════════════════════════════════════════════════════════════════ */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

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
