/* ══════════════════════════════════════════════════════════════════════════
   EL TRABAJADOR DE FONDO · que la app abra y venda sin red (Bloque 14)
   ──────────────────────────────────────────────────────────────────────────
   Reglas, de la más a la menos importante:
     · CON red, siempre lo más nuevo: primero la red y, si contesta, se guarda
       copia. Así nunca se queda pegada una versión vieja de la app.
     · SIN red, la última copia: la app, el catálogo y la caja abierta.
     · Del servidor sólo se guardan LECTURAS del catálogo y de quién soy; ni
       pedidos, ni clientes, ni nada que se escriba. Una venta sin red no pasa
       por aquí: la guarda la propia app en su fila (nucleo/fila.js).
     · Las fotos de productos: la copia primero (no cambian), con tope.
   ═════════════════════════════════════════════════════════════════════════ */
const VERSION = 'tienda-v1';
const APP = VERSION + '-app', DATOS = VERSION + '-datos', FOTOS = VERSION + '-fotos';
const TOPE_FOTOS = 400;
const LECTURAS = /\/rest\/v1\/(negocios|categorias|productos|existencias|perfiles|cajas)\?/;

self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for(const k of await caches.keys()) if(k.startsWith('tienda-') && !k.startsWith(VERSION)) await caches.delete(k);
  await self.clients.claim();
})()));

/* La página, al cargar, manda la lista de lo que ya bajó (módulos, estilos,
   letra): se guarda de una vez, porque en la primera visita el trabajador
   todavía no estaba escuchando cuando esos archivos pasaron. */
self.addEventListener('message', (e) => {
  if(e.data?.tipo !== 'guardar') return;
  e.waitUntil(caches.open(APP).then((c) => Promise.all(e.data.urls.map((u) => c.add(u).catch(() => {})))));
});

async function redPrimero(req, cache){
  try{
    const r = await fetch(req);
    if(r.ok) (await caches.open(cache)).put(req, r.clone());
    return r;
  }catch(err){
    const copia = await caches.match(req, { ignoreVary: true });
    if(copia) return copia;
    throw err;
  }
}

async function copiaPrimero(req){
  const copia = await caches.match(req);
  if(copia) return copia;
  const r = await fetch(req);
  if(r.ok || r.type === 'opaque'){
    const c = await caches.open(FOTOS);
    await c.put(req, r.clone());
    const llaves = await c.keys();
    for(const k of llaves.slice(0, Math.max(0, llaves.length - TOPE_FOTOS))) await c.delete(k);
  }
  return r;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if(req.method !== 'GET') return;                       // lo que escribe, siempre directo
  const url = new URL(req.url);
  if(url.origin === location.origin){
    if(!url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;
    // La portada con ?negocio=… se guarda sin el parámetro: una sola copia de la app.
    e.respondWith(redPrimero(req.mode === 'navigate' ? new Request(new URL('index.html', self.registration.scope)) : req, APP));
    return;
  }
  if(LECTURAS.test(url.pathname + url.search)){ e.respondWith(redPrimero(req, DATOS)); return; }
  if(req.destination === 'image'){ e.respondWith(copiaPrimero(req).catch(() => Response.error())); return; }
});
