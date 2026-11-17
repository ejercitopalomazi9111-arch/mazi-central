/* Alba abre sin internet: la app entera se guarda en el teléfono. Al publicar un cambio, subir V. */
var V = 'alba-v1';
var ARCHIVOS = ['./', 'index.html', 'estilo.css', 'app.js', 'datos.js', 'iconos.js', 'manifest.webmanifest', 'icono-192.png', 'icono-512.png',
  'fuentes/young-serif.woff2', 'fuentes/figtree.woff2', 'fuentes/figtree-cursiva.woff2'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(V).then(function (c) { return Promise.all(ARCHIVOS.map(function (u) { return c.add(u).catch(function () {}); })); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('alba-') === 0 && k !== V; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(V).then(function (c) { return c.match(e.request, { ignoreSearch: true }).then(function (g) {
    var red = fetch(e.request).then(function (r) { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(function () { return null; });
    return g || red.then(function (r) { return r || new Response('Sin conexión', { status: 503 }); });
  }); }));
});
self.addEventListener('notificationclick', function (e) { e.notification.close(); e.waitUntil(self.clients.matchAll({ type: 'window' }).then(function (l) { return l.length ? l[0].focus() : self.clients.openWindow('./'); })); });
