/* EL SERVICE WORKER DE LA SALA · lo único que sigue despierto con la app cerrada
 * ─────────────────────────────────────────────────────────────────────────────
 * Existe para una cosa: recibir el aviso cuando la sala está CERRADA y mostrar
 * la notificación. Con la app abierta no hace falta —de eso se encarga la
 * propia mesa— y por eso aquí no hay caché, ni interceptar peticiones, ni nada
 * de lo que suele meterse en un service worker.
 *
 * ⚠ Y NO CACHEA A PROPÓSITO. Un service worker que sirve archivos guardados es
 * la forma más común de que alguien vea una versión vieja de la sala sin
 * enterarse, y depurarlo es horrible porque todo «se ve bien». La sala cambia
 * seguido; cachearla sería regalarle a Carlos una pantalla que miente.
 *
 * El aviso llega SIN TEXTO. Mandar el contenido dentro del push obliga a
 * cifrarlo contra las llaves del navegador, y eso no se puede probar de punta a
 * punta desde el contenedor donde trabajo. Prefiero un aviso honesto que diga
 * «escribieron» a uno con el texto que a veces llegue.
 */

const TITULO = 'La Sala';

self.addEventListener('install', (e) => {
  /* Se activa de inmediato en vez de esperar a que se cierren las pestañas
     viejas: si no, el primer aviso podría tardar días en funcionar y nadie
     entendería por qué. */
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('push', (e) => {
  /* El push viene sin cuerpo, pero si algún día se le pone uno, esto lo usa en
     vez de ignorarlo. Nunca revienta por un cuerpo que no se entiende. */
  let datos = {};
  try { if (e.data) datos = e.data.json(); } catch (x) { /* sin cuerpo o no es JSON */ }

  const sala = datos.sala || '';
  const cuerpo = datos.texto
    || (sala ? `Escribieron en ${sala}. Toca para verlo.`
             : 'Escribieron en la sala. Toca para verlo.');

  e.waitUntil(self.registration.showNotification(datos.titulo || TITULO, {
    body: cuerpo,
    icon: '../icon-192.png',
    badge: '../icon-192.png',
    /* Una etiqueta fija hace que el aviso nuevo PISE al anterior en vez de
       apilar una torre de veinte. Con `renotify` el teléfono vuelve a sonar
       aunque se pise, que es lo que uno quiere de un chat. */
    tag: 'sala-' + (sala || 'x'),
    renotify: true,
    data: { sala },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const sala = (e.notification.data && e.notification.data.sala) || '';
  const destino = sala ? `./?sala=${encodeURIComponent(sala)}` : './';

  /* ⚠ PRIMERO SE BUSCA UNA PESTAÑA ABIERTA Y SE LE DA FOCO; sólo si no hay se
     abre una nueva. Sin esto, cada aviso tocado deja otra pestaña de la sala
     abierta, y en un teléfono eso termina en diez copias de la misma
     conversación. */
  e.waitUntil((async () => {
    const abiertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of abiertas) {
      if (c.url.includes('/sala/')) { await c.focus(); return; }
    }
    await self.clients.openWindow(destino);
  })());
});
