/* EL TRABAJADOR DE FONDO DE CARYMO · sólo para los avisos
 * ─────────────────────────────────────────────────────────────────────────────
 * Lo único que sigue despierto con CARYMO cerrado: recibe el aviso («¿una
 * lección?», «tu racha se puede perder», «mañana es tu examen», «tu tigre tiene
 * hambre») y lo enseña.
 *
 * ⚠ NO GUARDA NADA Y NO INTERCEPTA PETICIONES, a propósito (igual que el de La
 * Sala). Un trabajador que sirve copias guardadas deja la app congelada en la
 * versión del primer día —ya pasó con INKWELL— y CARYMO cambia todos los días.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try{ if(e.data) d = e.data.json(); }catch{ /* sin cuerpo o no es JSON */ }
  e.waitUntil(self.registration.showNotification(d.titulo || 'CARYMO', {
    body: d.texto || 'Tienes algo pendiente en CARYMO.',
    icon: './marca/icono-192.png',
    badge: './marca/favicon-64.png',
    /* uno por tipo: el de mañana pisa al de hoy en vez de apilar una torre */
    tag: 'carymo-' + (d.tipo || 'aviso'),
    data: { plan: d.plan || '', abrir: d.abrir || '' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const { plan = '', abrir = '' } = e.notification.data || {};
  /* «ir» y no «plan»: ?plan= ya es el código de compartir un plan */
  const q = new URLSearchParams(); if(plan) q.set('ir', plan); if(abrir) q.set('abrir', abrir);
  const destino = './' + (q.toString() ? '?' + q : '');
  e.waitUntil((async () => {
    /* primero una pestaña de CARYMO que ya esté abierta: si no, cada aviso deja otra copia abierta */
    const abiertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for(const c of abiertas){
      if(c.url.includes('/carymo/')){ c.postMessage({ aviso: { plan, abrir } }); await c.focus(); return; }
    }
    await self.clients.openWindow(destino);
  })());
});
