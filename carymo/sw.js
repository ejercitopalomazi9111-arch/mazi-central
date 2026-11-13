/* EL TRABAJADOR DE FONDO DE CARYMO · avisos y SIN INTERNET
 * ─────────────────────────────────────────────────────────────────────────────
 * Dos trabajos:
 *  1. Los avisos («¿una lección?», «tu racha se puede perder», «mañana es tu
 *     examen», «tu tigre tiene hambre»), aun con CARYMO cerrado.
 *  2. Que CARYMO abra y funcione sin internet (Carlos, 13 nov: «lo que más me
 *     importa es que sí se puede operar sin internet. Desde abrir la aplicación»).
 *
 * ⚠ PRIMERO LA RED, NUNCA PRIMERO LO GUARDADO. Un trabajador que sirve copias
 * guardadas primero deja la app congelada en la versión del primer día —ya pasó
 * con INKWELL— y CARYMO cambia todos los días. Aquí cada archivo se pide a la red;
 * si contesta, se usa y se guarda la copia; sólo si NO contesta (o tarda de más)
 * sale lo guardado.
 *
 * ⚠ Y NADA REDIRIGIDO. Cloudflare le quita el «.html» con un 307, y el navegador
 * rechaza una respuesta redirigida para abrir una página («No se puede acceder a
 * este sitio»). Lo redirigido no se guarda, y si algo guardado viene marcado así,
 * se sirve como copia limpia.
 *
 * /api/ no se toca nunca (lo de La Sala va siempre directo), ni lo de otros sitios.
 *
 * EL PIZARRÓN. Explica vive en /sala/explica.html, fuera del alcance de este
 * trabajador, así que dentro de CARYMO se abre como /carymo/pizarron.html: aquí se
 * arma con la misma página de Explica y un <base href="../sala/">, para que todo lo
 * que pida pase por este trabajador y quede guardado.
 */
const CAJA = 'carymo-v1';
const ALCANCE = new URL('./', self.location).pathname;               /* /carymo/ */
const RAIZ = new URL('../', self.location).pathname;                 /* / */
const ESPERA_PAGINA = 5000, ESPERA_ARCHIVO = 8000;

/* lo que se guarda al instalarse, para que la PRIMERA visita ya deje todo listo
   (lo que la página pidió antes de que este trabajador existiera no pasó por aquí) */
const BASE = [
  './', './index.html', './manifest.webmanifest', './pizarron.html',
  './carymo.js', './academia.js', './amigos.js', './apuntes.js', './avisos.js', './companero.js', './cosas.js', './cuenta.js',
  './entrada.js', './iconos.js', './mascota.js', './ropa.js', './sesion.js', './trazo.js', './vestidor.js', './yo.js', './zoo.js', './personaje-vivo.js', './ligas.js', './crianza-datos.js', './mascota-ropa.js', './muelle.js', './nombre.js', './titulos.js',
  './marca/icono-192.png', './marca/favicon-64.png',
  '../sala/explica.html', '../sala/explica.js', '../sala/lienzo.js', '../sala/voces.js', '../sala/acceso.js', '../sala/iconos-clase.js',
  '../sala/json-ia.js', '../sala/clases-guardadas.js', '../sala/sonidos/sonidos.js', '../presentaciones/ia.js',
  '../sala/letra/montserrat.woff2', '../sala/letra/nunito-600.woff2', '../sala/letra/nunito-700.woff2', '../sala/letra/caveat-700.woff2',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(guardarLista(BASE));
});
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for(const k of await caches.keys()) if(k.startsWith('carymo-') && k !== CAJA) await caches.delete(k);
  await self.clients.claim();
})()));

/* la página manda la lista de lo que cargó: así se guarda lo que no está en BASE (sonidos, vendor…) */
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if(d.guardar && Array.isArray(d.guardar)) e.waitUntil(guardarLista(d.guardar.slice(0, 400)));
});

async function guardarLista(lista){
  const caja = await caches.open(CAJA);
  await Promise.all(lista.map(async (x) => {
    try{
      const url = new URL(x, self.location);
      if(!sePuede(url)) return;
      const llave = llaveDe(url);
      if(url.pathname === ALCANCE + 'pizarron.html'){ const r = await pizarronDeRed(); if(r) await caja.put(llave, r); return; }
      const r = await fetch(url.href, { cache: 'no-cache' });
      if(r.ok) await caja.put(llave, await limpia(r));
    }catch{ /* sin red al instalarse: se guardará al usarse */ }
  }));
}

/* mismo sitio, GET, y nada de /api/ */
function sePuede(url){
  return url.origin === self.location.origin && !url.pathname.includes('/api/') && (url.pathname.startsWith(ALCANCE) || url.pathname.startsWith(RAIZ + 'sala/') || url.pathname.startsWith(RAIZ + 'presentaciones/'));
}
/* la llave: sin ?búsqueda (CARYMO abre con ?ir=, ?abrir=, el pizarrón con ?tema=…) y sin «.html»
   ni «index.html», que Cloudflare quita: así lo guardado en local y lo publicado se encuentran igual */
function llaveDe(url){
  let p = url.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  return url.origin + p;
}
/* una copia que no venga marcada como redirigida */
async function limpia(r){
  if(!r.redirected) return r;
  return new Response(await r.blob(), { status: r.status, statusText: r.statusText, headers: r.headers });
}
function conTope(promesa, ms){
  return new Promise((si, no) => { const t = setTimeout(() => no(new Error('lento')), ms); promesa.then((x) => { clearTimeout(t); si(x); }, (e) => { clearTimeout(t); no(e); }); });
}

async function pizarronDeRed(){
  const r = await fetch(new URL('../sala/explica.html', self.location).href, { cache: 'no-cache' });
  if(!r.ok) return null;
  return armarPizarron(await r.text());
}
function armarPizarron(html){
  const base = `<base href="${RAIZ}sala/">`;
  const t = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + base) : base + html;
  return new Response(t, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(!sePuede(url)) return;
  e.respondWith(primeroLaRed(req, url));
});

async function primeroLaRed(req, url){
  const caja = await caches.open(CAJA), llave = llaveDe(url);
  const esPagina = req.mode === 'navigate';
  const esPizarron = url.pathname === ALCANCE + 'pizarron.html' || url.pathname === ALCANCE + 'pizarron';
  try{
    let r;
    if(esPizarron){
      r = await conTope(pizarronDeRed(), ESPERA_PAGINA);
      if(!r) throw new Error('sin pizarrón');
    }else{
      /* una página se pide como archivo normal (que siga el 307 de Cloudflare) y se entrega limpia */
      r = await conTope(fetch(esPagina ? url.href : req, esPagina ? { cache: 'no-cache', credentials: 'same-origin' } : undefined), esPagina ? ESPERA_PAGINA : ESPERA_ARCHIVO);
      if(esPagina) r = await limpia(r);
    }
    if(r.ok && (r.type === 'basic' || r.type === 'default') && !r.redirected) caja.put(llave, r.clone()).catch(() => {});
    else if(!r.ok){ const g = await caja.match(llave); if(g) return limpia(g); }
    return r;
  }catch(err){
    const g = await caja.match(llave);
    if(g) return limpia(g);
    /* sin red y sin copia de esa página: la portada de CARYMO, si está */
    if(esPagina){ const p = await caja.match(llaveDe(new URL(ALCANCE, self.location))); if(p) return limpia(p); }
    return new Response('Sin internet y sin copia guardada.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
}

/* ── avisos ─────────────────────────────────────────────────────────────── */
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
