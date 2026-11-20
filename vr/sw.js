/* MAZI VR · trabajador de fondo: que el visor abra al instante y sin internet (Carlos, 18 nov: «toco entrar y tarda
   años en cargar, hazlo que funcione offline»).

   · Todo lo del visor sale DE LO GUARDADO primero y se actualiza por detrás para la siguiente vez (como INKWELL).
   · Lo pesado (three, las manos —7.5 MB de modelo y el motor de MediaPipe—, sonidos) se guarda en la primera visita,
     sin detener la instalación; si el teléfono se cierra antes, se guarda la primera vez que se use.
   · Lo de otros sitios (YouTube, Internet Archive, La Sala) no se toca: eso sí necesita internet.
   · Cloudflare le quita el «index.html» a la dirección (307 → /vr/). La página se guarda con su dirección limpia y nada
     sale de lo guardado marcado como redirigido: el navegador rechaza una navegación «redirigida» (lo que tumbó a
     INKWELL el 11 nov, ver inkwell/sw.js v31).
   Prueba: node vr/pruebas-sinred.mjs (apaga el servidor de a de veras). */
const V = 'mazivr-v38';
const APP = ['./', './vr.js', './iconos.js', './teclado.js', './cine.js', './lector.js', './sables.js', './sable-mano.js', './objetos.js', './musica.js', './agarre.js', './temshop.js', './seis.js', './ancla.js', './nube.js', './limites.js', './prediccion.js', './monarca/monarca.js', './monarca/narrador.js', './monarca/travesuras.js', './pantalla.js', './manos.js', './manos-estables.js', './mano3d.js', './modelos/manos/izquierda.glb', './modelos/manos/derecha.glb', './gestos.js',
  './manifest.webmanifest', './silencio.mp4', './sonidos/toque.wav', './sonidos/whoosh.wav', './sonidos/ding.wav',
  './vendor/three.module.min.js', './vendor/three.core.min.js', './vendor/loaders/GLTFLoader.js', './vendor/utils/BufferGeometryUtils.js', './vendor/utils/SkeletonUtils.js',
  './modelos/objetos/desk.glb', './modelos/objetos/crate-small.glb', './modelos/objetos/crate-medium.glb', './modelos/objetos/blaster-a.glb', './modelos/objetos/Textures/colormap.png', './modelos/temshop/temshop-cuarto.webp', './modelos/temshop/temshop-letrero.png', './modelos/temshop/temshop-piso.webp', './modelos/temshop/temmie.glb', './modelos/temshop/bookcaseOpen.glb', './modelos/temshop/books.glb', './modelos/temshop/cardboardBoxClosed.glb', './modelos/temshop/cardboardBoxOpen.glb', './modelos/temshop/coatRack.glb', './modelos/temshop/bear.glb', './modelos/temshop/trashcan.glb', './modelos/temshop/sideTable.glb', './modelos/temshop/radio.glb', './modelos/temshop/tableCoffee.glb', './modelos/temshop/lampRoundFloor.glb', './modelos/temshop/plantSmall1.glb', './modelos/temshop/pillow.glb', './modelos/temshop/rugRound.glb', '../marca/paloma-2026/logo-icono.svg', '../marca/paloma-2026/icono-512.png', '../inkwell/biblioteca.js', '../inkwell/fuentes.js', '../inkwell/red.js', '../inkwell/compartir.js'];
const PESADO = ['./modelos/hand_landmarker.task', './monarca/medios/monarca.glb', './monarca/medios/flores.glb', './monarca/medios/mapa.json', './monarca/medios/cielos/alps_field.webp', './monarca/medios/cielos/misty_pines.webp', './monarca/medios/cielos/barnaslingan_02.webp', './monarca/medios/cielos/misty_farm_road.webp', '../presentaciones/vendor/mediapipe/vision_bundle.mjs',
  '../presentaciones/vendor/mediapipe/wasm/vision_wasm_internal.js', '../presentaciones/vendor/mediapipe/wasm/vision_wasm_internal.wasm',
  /* el narrador de MONARCH (narrador.js): un audio por renglón */
  ...['e-bienvenida', 'e-mariposa', 'e-ciclo', 'e-flores', 'e-migracion', 'e-santuario', 'e-tala', 'e-campo', 'e-decision', 'e-cuestionario', 'e-final', 'q-1', 'q-2', 'q-3', 'q-4', 'q-5', 'q-1-mal', 'q-2-mal', 'q-3-mal', 'q-4-mal', 'q-5-mal', 'r-bien-1', 'r-bien-2', 'r-bien-3', 'r-bien-4', 'r-perfecto', 'r-medio', 'r-cero', 'r-talar', 'r-conservar', 'r-turismo', 'r-prisa-1', 'r-prisa-2', 'r-prisa-3', 'r-atras', 'r-lejos-1', 'r-lejos-2', 'r-quieto-1', 'r-quieto-2', 'r-flor-1', 'r-flor-hablando', 'r-flores-todas', 'r-voz-off', 'r-voz-on', 'r-creditos', 'r-otra-vez', 'r-lejos-3', 'r-atras-mira', 'r-piso', 'r-cielo', 'r-ladeado', 'r-vueltas-1', 'r-vueltas-2', 'r-no-cabeza', 'r-si-cabeza', 'r-sin-cabeza', 'r-agachado', 'r-salto', 'r-cerca-cartel', 'r-lejos-cuerpo', 'r-zona', 'r-manos-juega', 'r-saludo', 'r-punos', 'r-pellizcos', 'r-manos-arriba', 'r-tocar-mariposa', 'r-oscuro', 'r-machaca', 'r-stick', 'r-opciones', 'r-voz-juega', 'r-pingpong', 'r-puntaje', 'r-puntaje-2', 'r-creditos-2', 'r-otra-vez-2', 'r-record', 'r-sospechoso', 'r-rapido-resp', 'r-flores-rapido', 'r-quieto-3', 'r-quieto-4', 'r-quieto-5', 'r-volviste', 'r-vertical', 'r-agitar', 'r-largo', 'r-regresa-exp'].map((id) => `./monarca/medios/narrador/${id}.mp3`)];

const clave = (u) => { const url = new URL(u, self.location.href); let p = url.pathname;
  if(p.endsWith('/index.html')) p = p.slice(0, -10); else if(p.endsWith('.html')) p = p.slice(0, -5);
  return url.origin + p; };
const sano = async (r) => r && r.redirected ? new Response(await r.blob(), { status: r.status, statusText: r.statusText, headers: r.headers }) : r;
const guardar = async (c, u) => { try{ const r = await fetch(u, { cache: 'no-cache' }); if(r.ok) await c.put(/\/$|\.html$/.test(u) ? clave(u) : new URL(u, self.location.href).href, await sano(r)); }catch{} };

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.all(APP.map((u) => guardar(c, u)));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for(const k of await caches.keys()) if(k.startsWith('mazivr-') && k !== V) await caches.delete(k);
    await self.clients.claim();
    /* lo pesado, ya con el visor andando */
    const c = await caches.open(V);
    for(const u of PESADO) if(!(await c.match(new URL(u, self.location.href).href))) await guardar(c, u);
  })());
});
/* la página pide «¿ya está todo?» para decirlo en la entrada */
self.addEventListener('message', async (e) => {
  if(e.data !== 'listo?') return;
  const c = await caches.open(V), falta = [];
  /* los audios del narrador no cuentan: si falta uno, el narrador usa la voz del teléfono (narrador.js) */
  for(const u of [...APP, ...PESADO].filter((x) => !x.includes('/narrador/'))){ const k = /\/$/.test(u) ? clave(u) : new URL(u, self.location.href).href; if(!(await c.match(k))) falta.push(u); }
  e.source?.postMessage({ listo: falta.length === 0, falta, version: +V.replace(/\D/g, '') });
});

/* lo que no cambia (three, el modelo de manos, sonidos) no se vuelve a pedir: bajar 7.5 MB en cada visita sería peor
   que no tener trabajador. Si alguno cambia, se sube la versión (V) de arriba. */
const FIJO = /\/(vendor|modelos|sonidos|mediapipe)\/|\.(wasm|task|mp4|wav|svg|glb)$/;
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if(req.headers.has('range')) return;   // lo que se pide por pedazos va directo
  e.respondWith((async () => {
    const c = await caches.open(V);
    const pagina = req.mode === 'navigate' || req.destination === 'document';
    const llave = pagina ? clave(url) : url.href;
    const hit = await c.match(llave, { ignoreSearch: pagina });
    if(hit && FIJO.test(url.pathname)) return sano(hit);
    const red = fetch(pagina ? new Request(url.href, { credentials: 'same-origin' }) : req)
      .then(async (res) => { if(res.ok && res.type === 'basic') await c.put(llave, await sano(res.clone())); return res; });
    if(hit){ e.waitUntil(red.catch(() => {})); return sano(hit); }
    try{ return await sano(await red); }
    catch{ return (pagina && await sano(await c.match(clave('./')))) || Response.error(); }
  })());
});
