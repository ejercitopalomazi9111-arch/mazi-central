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
const V = 'inkwell-v31';
const APP = ['./', './index.html', './tiras.html', './tiras.js', './red.js', './tinta.js', './muelle.js', './comunidad.js', './libros.html', './libros.js', './biblioteca.js', './studio/', './studio/index.html', './studio/libro.html', './studio/comic.html', './studio/obras.js', './studio/personajes.js', './studio/video.js', './studio/lienzo.js', './letra/bangers.ttf', './fuentes.js', './archivos.js', './compartir.js', './manifest.webmanifest', './marca.css', './iconos.js', './marca/pluma.png', './marca/inkwell.svg', './letra/gloock.woff2', './letra/archivo.woff2', './letra/crimson.woff2', './icon-192.png',
  ...['female-person', 'male-person', 'female-adventurer', 'male-adventurer', 'robot', 'zombie'].map((q) => `./studio/arte/personajes/${q}/idle.png`)];

/* v31 · «no deja leer nada» (Carlos, 12 nov). Cloudflare le quita el .html a las páginas (tiras.html → 307 →
   /inkwell/tiras). Al instalar, cache.add seguía esa redirección y guardaba una respuesta marcada «redirigida»; desde
   que las páginas salen «de lo guardado primero» (v22), al tocar «Leer» el trabajador le daba al navegador esa
   respuesta redirigida para una navegación, y el navegador la RECHAZA: «No se puede acceder a este sitio»
   (ERR_FAILED). Ahora cada página se guarda con su dirección limpia (sin .html ni index.html), la misma para
   tiras.html y para /tiras, y nada que salga de lo guardado va marcado como redirigido.
   Se prueba con inkwell/pruebas-sw.mjs, que imita las redirecciones de Cloudflare. */
const clave = (u) => { const url = new URL(u, self.location.href); let p = url.pathname;
  if (p.endsWith('/index.html')) p = p.slice(0, -10); else if (p.endsWith('.html')) p = p.slice(0, -5);
  return url.origin + p; };
const sano = async (r) => r && r.redirected ? new Response(await r.blob(), { status: r.status, statusText: r.statusText, headers: r.headers }) : r;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.all(APP.map(async (u) => { try {
      const r = await fetch(u, { cache: 'no-cache' }); if (!r.ok) return;
      await c.put(/\.html$|\/$/.test(u) ? clave(u) : new URL(u, self.location.href).href, await sano(r));
    } catch {} }));
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
   Cada página sale al instante del teléfono y mientras tanto se pide la versión nueva para la siguiente vez.
   Lo de otro sitio y /api/ nunca pasa por aquí (la lista de capítulos de Webtoon sigue siendo fresca). */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith((async () => {
    const c = await caches.open(V);
    const pagina = req.mode === 'navigate' || req.destination === 'document';
    const llave = pagina ? clave(url) : req;
    const hit = pagina ? await c.match(llave) : await c.match(req);
    /* para una página, la red se pide siguiendo la redirección (y luego se limpia con «sano») */
    const red = fetch(pagina ? new Request(url.href, { credentials: 'same-origin' }) : req)
      .then(async (res) => { if (res.ok && res.type === 'basic') await c.put(llave, await sano(res.clone())); return res; });
    if (hit) { e.waitUntil(red.catch(() => {})); return sano(hit); }
    try { return await sano(await red); }
    catch (err) { return (await sano(await c.match(llave, { ignoreSearch: true }))) || (pagina && await sano(await c.match(clave('./')))) || Response.error(); }
  })());
});
