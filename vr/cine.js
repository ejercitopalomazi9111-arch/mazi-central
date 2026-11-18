/* MAZI VR · el cine. Cuatro puertas:
     · YouTube: se escribe en el teclado del visor, La Sala busca (/api/sala/vr/buscar) y se ve con el reproductor oficial.
     · Películas libres: Internet Archive (dominio público y licencias libres), buscadas directo desde el teléfono.
     · Enlace: cualquier dirección; YouTube, un video directo (.mp4…) o una página (ésta sólo para ver).
     · Mis videos: los que se cargaron en la entrada; ésos sí van DENTRO de la escena (con la corrección del lente).
   Lo de otros sitios va en la pantalla de la web (pantalla.js), encima de la escena, una copia por ojo.
   Netflix, Crunchyroll y similares no: su protección pinta negro y no dejan meterse en otra página (PLAN.md). */
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
  const ponerPantalla = () => { const ancho = dist * 1.15, asp = peli.videoWidth && fase === 'viendo' && !web.activa ? peli.videoWidth / peli.videoHeight : 16 / 9; pantalla.scale.set(ancho, ancho / asp, 1); pantalla.position.set(0, .25, -dist); };
  ponerPantalla(); cine.grupo.add(pantalla); pantalla.visible = false;
  web.anclar(pantalla);
  peli.addEventListener('loadedmetadata', ponerPantalla);

  const aviso = new V.Panel(1.8, .3, 400); aviso.malla.position.set(0, .62, -2.2); cine.grupo.add(aviso.malla);
  const decir = (txt) => { const { x, cv } = aviso; x.clearRect(0, 0, cv.width, cv.height); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '800 40px system-ui, -apple-system, sans-serif'; x.fillStyle = '#C9B6DA'; x.fillText(txt, cv.width / 2, cv.height / 2); aviso.listo(); aviso.malla.visible = !!txt; };

  /* ── el estante: las cuatro puertas ── */
  const puertas = [];
  const PUERTAS = [
    ['YouTube', 'search', () => buscarYouTube()],
    ['Películas', 'popcorn', () => buscarArchivo()],
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
      p.malla.userData.accion = () => abrirItem(it);
      cine.grupo.add(p.malla); tarjetas.push(p.malla);
    }
  }

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
      mostrar(r.response.docs.map((d) => ({ id: d.identifier, titulo: d.title, dura: d.year ? String(d.year) : '' })), abrirArchivo);
    }catch(e){ decir('Internet Archive no contestó'); console.warn(e); }
  }
  async function abrirArchivo(it){
    decir('Abriendo…');
    try{
      const m = await (await fetch(`${ARCHIVO}/metadata/${encodeURIComponent(it.id)}`)).json();
      const mp4 = (m.files || []).filter((f) => /\.mp4$/i.test(f.name));
      /* la mejor calidad que haya; si viene en partes, todas en orden */
      const buenos = mp4.filter((f) => !/512kb|\.ia\./i.test(f.name)); const usar = (buenos.length ? buenos : mp4).sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
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
    mostrar(VIDEOS.map((v) => ({ titulo: v.nombre, url: v.url, mio: true })), (v) => {
      fase = 'viendo'; limpiarTarjetas(); decir(''); pantalla.visible = true;
      peli.src = v.url; peli.play().catch(() => {}); pantalla.material.map = ptex; pantalla.material.color.set(0xffffff); pantalla.material.needsUpdate = true;
    });
  }

  function ver(abrir){ fase = 'viendo'; limpiarTarjetas(); decir(''); pantalla.visible = false;   /* la de la web va encima; el marco 3D sólo da las esquinas */
    pantalla.material.map = null; pantalla.material.color.set(0x0b0814); pantalla.material.needsUpdate = true; ponerPantalla(); abrir(); }
  function dejarDeVer(){
    if(web.activa) web.cerrar();
    peli.pause(); pantalla.material.map = null; pantalla.visible = false; fase = 'estante'; decir('');
  }

  cine.entrar = () => { fase = 'estante'; decir(''); };
  cine.salir = () => { dejarDeVer(); limpiarTarjetas(); };
  cine.elegibles = () => fase === 'estante' ? puertas : fase === 'resultados' ? tarjetas : [];
  cine.control = (c) => {
    if(fase !== 'viendo') return {};
    if(c.oprimido[B.X]){ const sigue = web.activa ? web.pausa() : (peli.paused ? (peli.play(), true) : (peli.pause(), false)); V.hud(sigue ? 'Sigue' : 'Pausa', 1); }
    if(c.oprimido[B.L1]){ if(web.activa) web.brincar(-10); else peli.currentTime = Math.max(0, peli.currentTime - 10); }
    if(c.oprimido[B.R1]){ if(web.activa) web.brincar(10); else peli.currentTime = Math.min(peli.duration || 0, peli.currentTime + 10); }
    if(c.oprimido[B.ARRIBA]){ dist = Math.max(1.6, dist - .4); ponerPantalla(); }
    if(c.oprimido[B.ABAJO]){ dist = Math.min(8, dist + .4); ponerPantalla(); }
    return { x: true, flechas: true };
  };
  cine.atras = () => { if(fase === 'viendo' || fase === 'resultados'){ dejarDeVer(); limpiarTarjetas(); fase = 'estante'; } else V.ir('inicio'); };
  cine.cuadro = (t) => { puertas.forEach((m) => { m.visible = fase === 'estante'; }); if(web.activa) web.sincronizar(t); };
  cine.estado = () => ({ fase, web: web.estado.modo, tarjetas: tarjetas.length });
  V.registrar('cine', cine);
  return cine;
}
