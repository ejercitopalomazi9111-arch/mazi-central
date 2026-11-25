/* MAZI VR · el cine. Cuatro puertas:
     · YouTube: se escribe en el teclado del visor, La Sala busca (/api/sala/vr/buscar) y se ve con el reproductor oficial.
     · Películas libres: Internet Archive (dominio público y licencias libres), buscadas directo desde el teléfono.
     · Enlace: cualquier dirección; YouTube, un video directo (.mp4…) o una página (ésta sólo para ver).
     · Mis videos: los que se cargaron en la entrada; ésos sí van DENTRO de la escena (con la corrección del lente).
   Lo de otros sitios va en la pantalla de la web (pantalla.js), encima de la escena, una copia por ojo.
   Netflix, Crunchyroll y similares no: su protección pinta negro y no dejan meterse en otra página (PLAN.md). */
import { crearAgarre, crearMoverConControl } from './agarre.js';
export const SALA = 'https://sala.palomazi9111.workers.dev';
const ARCHIVO = 'https://archive.org';

export async function montarCine(V, { VIDEOS, pedirTexto, web }){
  const { THREE, B } = V;
  const cine = { grupo: new THREE.Group() };
  let fase = 'estante';            // estante · resultados · mios · viendo
  let dist = 3.2;

  /* la pantalla 3D: para mis videos lleva el video; para lo de la web es el marco donde se pega la copia de cada ojo */
  const peli = document.createElement('video'); peli.playsInline = true; peli.setAttribute('playsinline', '');
  const ptex = new THREE.VideoTexture(peli); ptex.colorSpace = THREE.SRGBColorSpace;
  const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x0b0814, toneMapped: false }));
  /* que quepa en la vista (Carlos, 18 nov: «las pantallas se salen por arriba»): un video vertical con el ancho de uno
     horizontal medía más de 90° de alto. De fábrica, a lo mucho el 56 % del campo de alto (49° con el de fábrica) y el 80 % de ancho; agrandarla
     con las dos manos (tam) sí la deja pasar de ahí, porque eso lo pidió quien la agarró */
  let tam = 1; const ponerPantalla = () => { const asp = peli.videoWidth && fase === 'viendo' && !web.activa ? peli.videoWidth / peli.videoHeight : 16 / 9;
    const c = (V.AJ.campo || 88) * Math.PI / 180, maxAlto = 2 * dist * Math.tan(c * .28), maxAncho = 2 * dist * Math.tan(c * .4);
    let ancho = Math.min(dist * 1.15, maxAncho), alto = ancho / asp; if(alto > maxAlto){ alto = maxAlto; ancho = alto * asp; }
    pantalla.scale.set(ancho * tam, alto * tam, 1); pantalla.position.set(0, alto * tam > maxAlto * .8 ? .05 : .25, -dist); };
  /* la pantalla cuelga de un soporte centrado en tu cabeza: con las dos manos pellizcando se lleva a donde quieras
     (encima de ti para verla acostado, de lado, en diagonal) y se agranda o achica (agarre.js) */
  const soporte = new THREE.Group(); cine.grupo.add(soporte);
  const agarrar = crearAgarre(V, { soporte, getEscala: () => tam, setEscala: (e) => { tam = e; ponerPantalla(); }, min: .35, max: 3 });
  const moverCtl = crearMoverConControl(V, { soporte, getEscala: () => tam, setEscala: (e) => { tam = e; ponerPantalla(); }, min: .35, max: 3 });
  ponerPantalla(); soporte.add(pantalla); pantalla.visible = false;
  cine.alRecentrar = () => { soporte.quaternion.identity(); tam = 1; ponerPantalla(); };
  web.anclar(pantalla);
  peli.addEventListener('loadedmetadata', ponerPantalla);

  const aviso = new V.Panel(1.8, .3, 400); aviso.malla.position.set(0, .62, -2.2); cine.grupo.add(aviso.malla);
  const decir = (txt) => { const { x, cv } = aviso; x.clearRect(0, 0, cv.width, cv.height); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '800 40px system-ui, -apple-system, sans-serif'; x.fillStyle = '#C9B6DA'; x.fillText(txt, cv.width / 2, cv.height / 2); aviso.listo(); aviso.malla.visible = !!txt; aviso.malla.position.y = fase === 'resultados' && tarjetas.length > 8 ? .92 : .62; };

  /* ── el estante: las cuatro puertas ── */
  const puertas = [];
  const PUERTAS = [
    ['YouTube', 'search', () => inicioYouTube()],
    ['Películas', 'popcorn', () => inicioPelis()],
    ['Enlace', 'link', () => abrirEnlace()],
    ['Mis videos', 'folder-open', () => verMios()],
  ];
  for(const [i, [t, ic, fn]] of PUERTAS.entries()){
    const p = await V.tarjeta({ titulo: t, icono: ic }); const a = (i - 1.5) * 22 * Math.PI / 180;
    p.malla.position.set(Math.sin(a) * 1.9, 0, -Math.cos(a) * 1.9); p.malla.lookAt(0, 0, 0); p.malla.userData.accion = fn;
    cine.grupo.add(p.malla); puertas.push(p.malla);
  }

  /* ── resultados: hasta 12 tarjetas con su miniatura ── */
  let tarjetas = [];
  const limpiarTarjetas = () => { tarjetas.forEach((m) => { cine.grupo.remove(m); m.material.map?.dispose(); }); tarjetas = []; };
  async function mostrar(items, abrirItem){
    limpiarTarjetas(); fase = 'resultados';
    if(!items.length){ decir('Sin resultados'); return; }
    decir('');
    const COL = 4, W = .56, H = .44, n = Math.min(12, items.length), filas = Math.ceil(n / COL);
    for(const [i, it] of items.slice(0, 12).entries()){
      const p = new V.Panel(W, H, 420); const { x, cv } = p;
      const dib = (f, img) => { x.clearRect(0, 0, cv.width, cv.height); V.redondo(x, 4, 4, cv.width - 8, cv.height - 8, 22); x.fillStyle = f ? '#3A1A5C' : '#1E1428'; x.fill();
        if(it.especial){ x.fillStyle = f ? '#7E1735' : '#2A1240'; V.redondo(x, 4, 4, cv.width - 8, cv.height - 8, 22); x.fill();
          x.lineWidth = f ? 6 : 2; x.strokeStyle = f ? '#AC27FF' : '#5A3A7A'; x.stroke(); x.textAlign = 'center'; x.textBaseline = 'middle';
          x.fillStyle = '#F4EEF2'; x.font = '900 44px system-ui, -apple-system, sans-serif'; x.fillText(it.titulo, cv.width / 2, cv.height / 2 - (it.sub ? 16 : 0));
          if(it.sub){ x.fillStyle = '#C9B6DA'; x.font = '700 22px system-ui, -apple-system, sans-serif'; x.fillText(it.sub, cv.width / 2, cv.height / 2 + 34); }
          x.textAlign = 'left'; p.listo(); return; }
        if(img){ x.save(); V.redondo(x, 14, 14, cv.width - 28, 128, 14); x.clip(); x.drawImage(img, 14, 14 - 16, cv.width - 28, 160); x.restore(); }
        else { x.fillStyle = '#24123A'; V.redondo(x, 14, 14, cv.width - 28, 128, 14); x.fill(); }
        x.lineWidth = f ? 6 : 2; x.strokeStyle = f ? '#AC27FF' : '#3C2652'; V.redondo(x, 4, 4, cv.width - 8, cv.height - 8, 22); x.stroke();
        x.fillStyle = '#F4EEF2'; x.font = '700 20px system-ui, -apple-system, sans-serif'; x.textBaseline = 'top';
        const pal = String(it.titulo || '').split(' '); let ren = '', y = 152, n = 0;
        for(const w of pal){ const t = ren ? ren + ' ' + w : w; if(x.measureText(t).width > cv.width - 30){ x.fillText(ren, 16, y); y += 23; ren = w; if(++n >= 1) break; } else ren = t; }
        if(n < 2 && ren) x.fillText(n >= 1 ? ren.slice(0, 22) + (ren.length > 22 ? '…' : '') : ren, 16, y);
        x.fillStyle = '#C9B6DA'; x.font = '600 16px system-ui, -apple-system, sans-serif'; x.fillText([it.canal, it.dura].filter(Boolean).join(' · ').slice(0, 34), 16, cv.height - 26);
        p.listo(); };
      let img = null; dib(false, null);
      if(it.mini){ const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { img = im; dib(p._f, img); }; im.src = it.mini; }
      p.foco = (f) => { if(p._f === f) return; p._f = f; dib(f, img); };
      /* centradas: las de la última fila también */
      const fila = Math.floor(i / COL), enFila = Math.min(COL, n - fila * COL), col = i % COL, a = (col - (enFila - 1) / 2) * 21 * Math.PI / 180, y = (filas - 1) / 2 * .5 - fila * .5;
      p.malla.position.set(Math.sin(a) * 1.7, y, -Math.cos(a) * 1.7); p.malla.lookAt(0, y, 0);
      p.malla.userData.accion = () => it.accion ? it.accion() : abrirItem(it);
      cine.grupo.add(p.malla); tarjetas.push(p.malla);
    }
  }

  /* ── las páginas de inicio (Carlos, 18 nov: «mete la página de inicio de YouTube y películas… para tener algo que elegir
     sin ser tan específicos»): al entrar ya hay videos; «Buscar» y «Otro tema» van primero ── */
  const TEMAS_YT = [['Tendencias', 'tendencias méxico hoy'], ['Música', 'música nueva éxitos'], ['Videojuegos', 'videojuegos noticias'], ['Risa', 'videos graciosos'],
    ['Tráileres', 'tráiler oficial español'], ['Ciencia', 'ciencia explicada'], ['Deportes', 'resumen futbol'], ['Cocina', 'recetas fáciles'], ['Anime', 'anime'], ['Podcasts', 'podcast méxico']];
  let temaYT = 0, temaPeli = 0;
  async function inicioYouTube(n = temaYT){
    temaYT = (n + TEMAS_YT.length) % TEMAS_YT.length; const [nombre, q] = TEMAS_YT[temaYT];
    decir(nombre + '…'); fase = 'resultados'; limpiarTarjetas();
    const extra = [{ especial: true, titulo: 'Buscar', accion: () => buscarYouTube() }, { especial: true, titulo: 'Otro tema', sub: TEMAS_YT[(temaYT + 1) % TEMAS_YT.length][0], accion: () => inicioYouTube(temaYT + 1) }];
    try{
      const r = await (await fetch(`${SALA}/api/sala/vr/buscar?q=${encodeURIComponent(q)}`)).json(); if(!r.bien) throw new Error(r.error);
      await mostrar([...extra, ...r.videos.slice(0, 10)], (v) => ver(() => web.verYouTube(v.id, v.titulo))); decir(nombre);
    }catch(e){ await mostrar(extra, () => {}); decir('YouTube no contestó'); console.warn(e); }
  }
  const GENEROS = [['Más vistas', ''], ['Clásicas', 'subject:(classic OR drama)'], ['Terror', 'subject:(horror)'], ['Comedia', 'subject:(comedy)'],
    ['Ciencia ficción', 'subject:("science fiction" OR sci-fi)'], ['Animación', 'collection:(animationandcartoons)'], ['Cine negro', 'subject:("film noir")'], ['Mudas', 'subject:(silent)']];
  async function inicioPelis(n = temaPeli){
    temaPeli = (n + GENEROS.length) % GENEROS.length; const [nombre, filtro] = GENEROS[temaPeli];
    decir(nombre + '…'); fase = 'resultados'; limpiarTarjetas();
    const extra = [{ especial: true, titulo: 'Buscar', accion: () => buscarArchivo() }, { especial: true, titulo: 'Otro género', sub: GENEROS[(temaPeli + 1) % GENEROS.length][0], accion: () => inicioPelis(temaPeli + 1) }];
    try{
      const base = filtro.startsWith('collection') ? `mediatype:(movies) AND ${filtro}` : `mediatype:(movies) AND collection:(feature_films)${filtro ? ' AND ' + filtro : ''}`;
      const u = `${ARCHIVO}/advancedsearch.php?q=${encodeURIComponent(base)}&fl[]=identifier&fl[]=title&fl[]=year&sort[]=downloads+desc&rows=10&output=json`;
      const r = await (await fetch(u)).json();
      await mostrar([...extra, ...r.response.docs.map(pelicula)], abrirArchivo); decir(nombre);
    }catch(e){ await mostrar(extra, () => {}); decir('Internet Archive no contestó'); console.warn(e); }
  }
  const pelicula = (d) => ({ id: d.identifier, titulo: d.title, dura: d.year ? String(d.year) : '', mini: `${ARCHIVO}/services/img/${encodeURIComponent(d.identifier)}` });

  async function buscarYouTube(){
    const q = await pedirTexto('Buscar en YouTube', { regresarA: 'cine' }); if(!q) return;
    decir('Buscando…'); fase = 'resultados'; limpiarTarjetas();
    try{
      const r = await (await fetch(`${SALA}/api/sala/vr/buscar?q=${encodeURIComponent(q)}`)).json();
      if(!r.bien) throw new Error(r.error);
      mostrar(r.videos, (v) => ver(() => web.verYouTube(v.id, v.titulo)));
    }catch(e){ decir('YouTube no contestó'); console.warn(e); }
  }
  async function buscarArchivo(){
    const q = await pedirTexto('Películas libres (Internet Archive)', { regresarA: 'cine' }); if(!q) return;
    decir('Buscando…'); fase = 'resultados'; limpiarTarjetas();
    try{
      const u = `${ARCHIVO}/advancedsearch.php?q=${encodeURIComponent(`(${q}) AND mediatype:(movies) AND (collection:(feature_films) OR collection:(classic_tv) OR collection:(moviesandfilms) OR collection:(animationandcartoons) OR collection:(short_films))`)}&fl[]=identifier&fl[]=title&fl[]=year&rows=12&output=json`;
      const r = await (await fetch(u)).json();
      mostrar(r.response.docs.map(pelicula), abrirArchivo);
    }catch(e){ decir('Internet Archive no contestó'); console.warn(e); }
  }
  async function abrirArchivo(it){
    decir('Abriendo…');
    try{
      const m = await (await fetch(`${ARCHIVO}/metadata/${encodeURIComponent(it.id)}`)).json();
      /* el iPhone sólo reproduce H.264: el «original» de Internet Archive muchas veces es MPEG-4 viejo o un archivo
         gigante que nunca arranca (por eso «no cargaba nunca»). Se prefieren las copias H.264 que hace el propio Archive */
      const mp4 = (m.files || []).filter((f) => /\.(mp4|m4v)$/i.test(f.name));
      const rango = (f) => /^h\.264$/i.test(f.format || '') ? 4 : /h\.264/i.test(f.format || '') ? 3 : /512kb/i.test((f.format || '') + f.name) ? 2 : /\.ia\./i.test(f.name) ? 1 : 0;
      const mejor = Math.max(-1, ...mp4.map(rango));
      const usar = mp4.filter((f) => rango(f) === mejor).sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
      if(!usar.length){ decir('Esa no trae video'); return; }
      ver(() => web.verVideo(usar.map((f) => `${ARCHIVO}/download/${encodeURIComponent(it.id)}/${encodeURIComponent(f.name)}`), it.titulo));
    }catch(e){ decir('No se pudo abrir'); console.warn(e); }
  }
  async function abrirEnlace(){
    let u = await pedirTexto('Escribe la dirección', { regresarA: 'cine' }); if(!u) return;
    if(!/^https?:\/\//.test(u)) u = 'https://' + u;
    ver(() => web.abrir(u, u));
  }

  /* ── mis videos ── */
  async function verMios(){
    limpiarTarjetas(); fase = 'resultados';
    if(!VIDEOS.length){ decir('Sin videos'); return; }
    decir('');
    mostrar(VIDEOS.map((v) => ({ titulo: v.nombre, url: v.url, mio: true })), (v) => verArchivo(v.url));
  }
  function verArchivo(url){
    tam = 1; ponerPantalla(); fase = 'viendo'; limpiarTarjetas(); decir(''); pantalla.visible = true;
    peli.src = url; peli.play().catch(() => {}); pantalla.material.map = ptex; pantalla.material.color.set(0xffffff); pantalla.material.needsUpdate = true;
  }
  cine.verArchivo = verArchivo; cine.inicioYouTube = inicioYouTube; cine.inicioPelis = inicioPelis;

  function ver(abrir){ tam = 1; fase = 'viendo'; limpiarTarjetas(); decir(''); pantalla.visible = false;   /* la de la web va encima; el marco 3D sólo da las esquinas */
    pantalla.material.map = null; pantalla.material.color.set(0x0b0814); pantalla.material.needsUpdate = true; ponerPantalla(); abrir(); }
  function dejarDeVer(){
    if(web.activa) web.cerrar();
    peli.pause(); pantalla.material.map = null; pantalla.visible = false; fase = 'estante'; decir('');
  }

  /* ── DE FONDO (Carlos, 18 nov: «un coso para tener el video reproduciendo de fondo mientras haces otras cosas») ──
     «Fondo» (o R2) deja el video corriendo en una pantalla chica arriba a la izquierda del cuarto y te regresa al inicio.
     Sigue sonando en cualquier apartado; al volver a entrar al Cine, regresa en grande donde estaba. */
  const mini = new THREE.Group(); V.hub.add(mini);
  let fondo = false;
  const bFondo = (await V.tarjeta({ titulo: 'Fondo', icono: 'tv' })).malla;
  bFondo.scale.setScalar(.5); bFondo.position.set(.62, -.95, -1.7); bFondo.lookAt(0, -.95 * .3, 0); bFondo.userData.accion = () => aFondo(); cine.grupo.add(bFondo);
  function aFondo(){
    if(fase !== 'viendo' || fondo) return;
    fondo = true; mini.add(pantalla);
    const a = 40 * Math.PI / 180, d = 2.3, y = .9, asp = pantalla.scale.x / pantalla.scale.y, ancho = Math.min(.95, .55 * asp);
    pantalla.position.set(-Math.sin(a) * d, y, -Math.cos(a) * d); pantalla.scale.set(ancho, ancho / asp, 1); pantalla.lookAt(V.hub.localToWorld(new THREE.Vector3(0, y * .4, 0)));
    pantalla.visible = true; V.hud('De fondo', 1.2); V.ir('inicio');
  }
  function volverDeFondo(){ fondo = false; pantalla.quaternion.identity(); soporte.add(pantalla); ponerPantalla(); fase = 'viendo'; decir(''); }
  /* de fondo, el ojo derecho sigue persiguiendo al izquierdo aunque el Cine no esté abierto */
  V.alCuadro.push((t) => { if(fondo && web.activa) web.sincronizar(t); });
  cine.fondo = aFondo;
  cine.entrar = () => { if(fondo) volverDeFondo(); else { fase = 'estante'; decir(''); } };
  cine.salir = () => { if(!fondo) dejarDeVer(); limpiarTarjetas(); V.extra.gestosVideo = false; };
  cine.elegibles = () => fase === 'estante' ? puertas : fase === 'resultados' ? tarjetas : fase === 'viendo' ? [bFondo] : [];
  cine.control = (c, dt) => {
    if(fase !== 'viendo') return {};
    if(moverCtl(c, dt)) return { x: true, flechas: true };
    if(c.oprimidoPad[B.X]) pausar();
    if(c.oprimido[B.R2]) aFondo();
    if(c.oprimido[B.L1]) brincar(-10);
    if(c.oprimido[B.R1]) brincar(10);
    if(c.oprimido[B.ARRIBA]){ dist = Math.max(1.6, dist - .4); ponerPantalla(); }
    if(c.oprimido[B.ABAJO]){ dist = Math.min(8, dist + .4); ponerPantalla(); }
    return { x: true, flechas: true };
  };
  /* con L2 apretado los sticks son de la pantalla: ni caminas ni giras */
  Object.defineProperty(cine, 'ocupaStick', { get: () => fase === 'viendo' && V.control.apretado(B.L2) });
  Object.defineProperty(cine, 'ocupaGiro', { get: () => fase === 'viendo' && V.control.apretado(B.L2) });
  cine.atras = () => { if(fase === 'viendo' || fase === 'resultados'){ dejarDeVer(); limpiarTarjetas(); fase = 'estante'; } else V.ir('inicio'); };
  /* ── gestos de mano mientras ves (Carlos, 18 nov) ──
       · pellizcar una vez: pausa / sigue
       · pellizcar, mantener y arrastrar a los lados: adelanta o regresa (todo el ancho de la vista ≈ 4 minutos)
       · pellizcar con las DOS manos: la pantalla se va a donde las lleves (arriba, de lado, encima de ti) y separarlas
         o juntarlas la agranda o achica
       · palma abierta un momento: cierra (eso ya lo hace manos.js, es el Círculo) */
  const gV = { activo: false, t0: 0, x0: 0, aplicado: 0, arrastre: false, cancelado: false, dos: null };
  const pausar = () => { const sigue = web.activa ? web.pausa() : (peli.paused ? (peli.play(), true) : (peli.pause(), false)); V.hud(sigue ? 'Sigue' : 'Pausa', 1); };
  const brincar = (s) => { if(web.activa) web.brincar(s); else peli.currentTime = Math.max(0, Math.min(peli.duration || 0, peli.currentTime + s)); };
  let trasAgarre = false;
  function gestosVideo(){
    const pin = (V.extra.manos || []).filter((m) => m.pellizco), ahora = performance.now();
    if(agarrar()){ gV.cancelado = true; trasAgarre = true; return; }
    if(!pin.length) trasAgarre = false;
    if(trasAgarre){ gV.activo = false; return; }   /* la mano que se queda pellizcando al soltar la otra no pausa ni adelanta */
    const p = pin[0];
    if(p && !gV.activo) Object.assign(gV, { activo: true, t0: ahora, x0: p.x, aplicado: 0, arrastre: false, cancelado: false });
    else if(p && gV.activo){
      const dx = p.x - gV.x0; if(Math.abs(dx) > .05) gV.arrastre = true;
      if(gV.arrastre && !gV.cancelado){ const meta = Math.round((dx - Math.sign(dx) * .05) * 240), d = meta - gV.aplicado;
        if(Math.abs(d) >= 2){ brincar(d); gV.aplicado = meta; V.hud(`${meta > 0 ? '+' : ''}${meta} s`, .8); } }
    }
    else if(!p && gV.activo){ gV.activo = false; if(!gV.arrastre && !gV.cancelado && ahora - gV.t0 < 700) pausar(); }
  }
  cine.cuadro = (t) => {
    puertas.forEach((m) => { m.visible = fase === 'estante'; }); bFondo.visible = fase === 'viendo'; if(web.activa) web.sincronizar(t);
    V.extra.gestosVideo = fase === 'viendo';
    if(fase === 'viendo') gestosVideo(); else gV.activo = false;
  };
  cine.estado = () => ({ fondo, fase, altoGrados: +(2 * Math.atan(pantalla.scale.y / 2 / dist) * 180 / Math.PI).toFixed(1), anchoGrados: +(2 * Math.atan(pantalla.scale.x / 2 / dist) * 180 / Math.PI).toFixed(1), web: web.estado.modo, tarjetas: tarjetas.length, dist: +dist.toFixed(2), tam: +tam.toFixed(2), giro: +(2 * Math.acos(Math.min(1, Math.abs(soporte.quaternion.w))) * 180 / Math.PI).toFixed(1), pausa: web.activa ? null : peli.paused, t: web.activa ? null : +peli.currentTime.toFixed(1) });
  V.registrar('cine', cine);
  return cine;
}
