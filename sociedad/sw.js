/* LA SOCIEDAD · el trabajador de fondo. Dos cosas: los avisos al teléfono con
   la página cerrada, y abrir sin internet lo último que se vio. Siempre
   «primero la red» (la lección de INKWELL: «primero lo guardado» congela la
   app para siempre). Lo del servidor (/api/) no se toca. */
const CAJA = 'sociedad-v1';
const BASE = ['./', 'index.html', 'app.js', 'nucleo.js', 'horario.js', 'estilo.css', 'iconos.js', 'escudo.png', 'icon-192.png', 'manifest.webmanifest', '../fadori/llaves.js'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CAJA).then(c => Promise.all(BASE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('sociedad-') && k !== CAJA).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const q = e.request;
  if(q.method !== 'GET') return;
  const u = new URL(q.url);
  if(u.origin !== self.location.origin || u.pathname.indexOf('/api/') >= 0) return;
  e.respondWith((async () => {
    const caja = await caches.open(CAJA);
    const red = fetch(q).then(r => { if(r && r.ok && r.type === 'basic') caja.put(q, r.clone()).catch(() => {}); return r; });
    try{ return await Promise.race([red, new Promise((_, no) => setTimeout(() => no(new Error('lenta')), 4000))]); }
    catch(err){
      const g = await caja.match(q, { ignoreSearch: q.mode === 'navigate' }) || (q.mode === 'navigate' ? await caja.match('index.html') : null);
      return g || red.catch(() => new Response('Sin internet.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } }));
    }
  })());
});
self.addEventListener('push', (e) => {
  let d = {}; try{ d = e.data ? e.data.json() : {}; }catch(err){ d = { cuerpo: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Sociedad de Alumnos', {
    body: d.cuerpo || '', tag: d.tag || 'sociedad', renotify: true, icon: 'icon-192.png', badge: 'icon-192.png', data: { url: d.url || './' } }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const destino = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((vs) => {
    const ya = vs.find(w => w.url.split('#')[0] === destino.split('#')[0]);
    return ya ? ya.focus() : self.clients.openWindow(destino);
  }));
});
