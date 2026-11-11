/* INKWELL — service worker.
   Guarda la app para abrir sin datos. (v9: se fueron las pinturas con las 5 series viejas.)

   v4 · lo que cambió y por qué:
   · Antes TODO iba «primero lo guardado»: la app nunca se actualizaba (el
     index.html del primer día se servía para siempre) y, con las Tiras, la
     lista de capítulos de Webtoon se habría congelado — nunca un capítulo
     nuevo — y cada imagen se habría guardado DOS veces (aquí y en la base de
     las Tiras). Ahora:
       · lo de otro sitio (Wattpad) y lo que va a La Sala (/api/) NO se toca;
       · la app (html, js, manifest) va «primero la red» y, sin red, lo guardado;
       · las pinturas siguen «primero lo guardado»: no cambian nunca. */
const V = 'inkwell-v22';
const APP = ['./', './index.html', './tiras.html', './tiras.js', './red.js', './tinta.js', './muelle.js', './comunidad.js', './libros.html', './libros.js', './biblioteca.js', './studio/', './studio/index.html', './studio/libro.html', './studio/comic.html', './studio/obras.js', './studio/personajes.js', './studio/video.js', './studio/lienzo.js', './letra/bangers.ttf', './fuentes.js', './archivos.js', './compartir.js', './manifest.webmanifest', './marca.css', './iconos.js', './marca/pluma.png', './marca/inkwell.svg', './letra/gloock.woff2', './letra/archivo.woff2', './letra/crimson.woff2', './icon-192.png',
  ...['female-person', 'male-person', 'female-adventurer', 'male-adventurer', 'robot', 'zombie'].map((q) => `./studio/arte/personajes/${q}/idle.png`)];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.all(APP.map(u => c.add(u).catch(()=>{})));
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

/* v22 · «que no brinque» (Carlos, 11 nov): la app va «lo guardado primero, y se actualiza por detrás».
   Cada página sale al instante del teléfono —todas están guardadas desde que se instala, así que aunque
   estén a dos toques ya están ahí— y mientras tanto se pide la versión nueva para la siguiente vez.
   Lo que NO se congela: cada vez que se publica, el número V cambia y se vuelve a guardar todo; y lo
   de otro sitio y /api/ nunca pasa por aquí (la lista de capítulos de Webtoon sigue siendo fresca). */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith((async () => {
    const c = await caches.open(V);
    const pagina = req.mode === 'navigate' || req.destination === 'document';
    const hit = await c.match(req, { ignoreSearch: pagina });
    const red = fetch(req).then((res) => { if (res.ok && res.type === 'basic') c.put(pagina ? new Request(url.origin + url.pathname) : req, res.clone()); return res; });
    if (hit) { e.waitUntil(red.catch(() => {})); return hit; }
    try { return await red; }
    catch (err) { return (await c.match(req, { ignoreSearch: true })) || (pagina && await c.match('./index.html')) || Response.error(); }
  })());
});
