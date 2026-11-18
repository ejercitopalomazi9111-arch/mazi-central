/* MAZI VR · la pantalla de la web. Lo que viene de otro sitio (YouTube, películas libres de Internet Archive, una
   página) NO se puede pintar dentro de la escena 3D: el navegador no deja leer los pixeles de otro sitio. Entonces se
   pone ENCIMA, como elemento de la página, una copia por ojo, deformada para que caiga justo en el rectángulo de la
   pantalla 3D que ve ese ojo (cuatro esquinas → matrix3d). El ojo izquierdo lleva el sonido; el derecho va callado y
   se mantiene al mismo tiempo que el izquierdo.
   Lo que no se puede: tocar adentro de una página ajena (es de otro sitio); se maneja con el control desde fuera. */
const BASE_W = 1280, BASE_H = 720;
/* homografía de un rectángulo a cuatro puntos (la clásica: adjunta de la base) */
const adj = (m) => [m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4], m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5], m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3]];
const mm = (a, b) => { const c = []; for(let i = 0; i < 3; i++) for(let j = 0; j < 3; j++){ let s = 0; for(let k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j]; c[3 * i + j] = s; } return c; };
const mv = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
const base = (p) => { const m = [p[0], p[2], p[4], p[1], p[3], p[5], 1, 1, 1]; const v = mv(adj(m), [p[6], p[7], 1]); return mm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]); };
export function matrizDe(w, h, d){
  const t = mm(base(d), adj(base([0, 0, w, 0, 0, h, w, h])));
  const n = t.map((x) => x / t[8]);
  return `matrix3d(${n[0]},${n[3]},0,${n[6]},${n[1]},${n[4]},0,${n[7]},0,0,1,0,${n[2]},${n[5]},0,${n[8]})`;
}
export const deYouTube = (u) => { const m = String(u).match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/); return m ? m[1] : null; };
export const esVideo = (u) => /\.(mp4|webm|m4v|mov|m3u8)(\?|#|$)/i.test(String(u));

export function crearPantallaWeb(V){
  const { THREE } = V;
  const capa = document.createElement('div');
  capa.style.cssText = 'position:fixed; inset:0; z-index:3; pointer-events:none; display:none';
  const ojos = [0, 1].map((i) => { const o = document.createElement('div'); o.style.cssText = `position:absolute; top:0; bottom:0; ${i ? 'right:0' : 'left:0'}; width:50%; overflow:hidden`; capa.appendChild(o); return o; });
  document.body.appendChild(capa);
  /* los dos videos se crean desde el principio para «desbloquearlos» con el toque de Entrar: el iPhone sólo deja sonar
     un video que ya se reprodujo una vez con un toque, y en el visor no hay toques */
  const videos = [0, 1].map((i) => { const v = document.createElement('video'); v.playsInline = true; v.setAttribute('playsinline', ''); v.muted = i === 1; v.preload = 'auto';
    v.style.cssText = `position:absolute; left:0; top:0; width:${BASE_W}px; height:${BASE_H}px; transform-origin:0 0; background:#000; object-fit:contain`; return v; });
  let modo = null, elems = [], yts = [], lista = [], parte = 0, anclaje = null, alSalir = null;
  const estado = { modo: null, titulo: '' };

  /* sin esperas: el iPhone sólo cuenta como «tocado» lo que se pide en el mismo instante del toque */
  function desbloquear(){
    for(const v of videos){ try{ v.src = 'silencio.mp4'; v.play().then(() => v.pause()).catch(() => {}); }catch{} }
  }
  function limpiar(){
    for(const o of ojos) o.replaceChildren();
    /* los reproductores de YouTube se desarman DESPUÉS: hacerlo en el mismo cuadro congelaba la salida en el teléfono */
    const viejos = yts; setTimeout(() => { for(const p of viejos) try{ p.destroy(); }catch{} }, 450);
    yts = []; elems = []; videos.forEach((v) => { v.pause(); v.removeAttribute('src'); v.load(); });
    modo = null; estado.modo = null; capa.style.display = 'none';
  }
  function montar(e0, e1){ elems = [e0, e1]; ojos[0].appendChild(e0); ojos[1].appendChild(e1); capa.style.display = 'block'; }

  /* ── video directo (Internet Archive, un .mp4 de cualquier sitio) ── */
  function verVideo(urls, titulo){
    limpiar(); modo = 'video'; estado.modo = modo; estado.titulo = titulo; lista = [].concat(urls); parte = 0;
    montar(videos[0], videos[1]);
    cargarParte();
  }
  /* la película «nunca cargaba» (Carlos, 18 nov): si el iPhone no deja sonar, play() se rechaza y el video se quedaba
     PARADO en negro. Ahora arranca callado y avisa; un toque le regresa el sonido. Y se dice qué pasa mientras carga */
  function cargarParte(){
    for(const v of videos){ v.src = lista[parte]; }
    V.hud('Cargando…', 30);
    videos[0].play().catch(() => { videos[0].muted = true; videos[0].play().then(() => V.hud('Sin sonido: toca la pantalla', 4)).catch(() => {}); });
    videos[1].play().catch(() => {});
  }
  videos[0].addEventListener('playing', () => { if(modo === 'video') V.hud(estado.titulo || 'Listo', 1.5); });
  videos[0].addEventListener('waiting', () => { if(modo === 'video') V.hud('Cargando…', 30); });
  videos[0].addEventListener('error', () => { if(modo === 'video') V.hud('Ese video no abre en el iPhone', 4); });
  videos[0].addEventListener('ended', () => { if(modo === 'video' && parte < lista.length - 1){ parte++; cargarParte(); } });

  /* ── YouTube: el reproductor oficial, dos veces ── */
  let apiYT = null;
  const cargarAPI = () => apiYT || (apiYT = new Promise((ok) => {
    if(window.YT?.Player) return ok(window.YT);
    window.onYouTubeIframeAPIReady = () => ok(window.YT);
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s);
  }));
  async function verYouTube(id, titulo){
    limpiar(); modo = 'youtube'; estado.modo = modo; estado.titulo = titulo;
    const YT = await cargarAPI();
    const cajas = [0, 1].map(() => { const d = document.createElement('div'); d.style.cssText = `position:absolute; left:0; top:0; width:${BASE_W}px; height:${BASE_H}px; transform-origin:0 0; background:#000`;
      const dentro = document.createElement('div'); d.appendChild(dentro); return [d, dentro]; });
    montar(cajas[0][0], cajas[1][0]);
    yts = cajas.map(([, dentro], i) => new YT.Player(dentro, { width: BASE_W, height: BASE_H, videoId: id,
      playerVars: { playsinline: 1, autoplay: 1, controls: 0, rel: 0, modestbranding: 1, mute: i ? 1 : 0, iv_load_policy: 3, fs: 0, disablekb: 1 },
      events: { onReady: (e) => { if(i) e.target.mute(); e.target.playVideo(); } } }));
    /* si el iPhone no lo dejó sonar, que al menos se vea */
    setTimeout(() => { try{ if(modo === 'youtube' && yts[0].getPlayerState?.() !== 1){ yts[0].mute(); yts[0].playVideo(); V.hud('Sin sonido: toca la pantalla una vez', 3); } }catch{} }, 3000);
  }
  /* un toque o una tecla (el control del visor puede ir como teclado) devuelven el sonido */
  const devolverSonido = () => { try{ if(modo === 'youtube'){ yts[0].unMute(); yts[0].playVideo(); yts[1]?.mute(); yts[1]?.playVideo(); } if(modo === 'video'){ videos[0].muted = false; videos[0].play(); } }catch{} };
  addEventListener('touchend', devolverSonido); addEventListener('keydown', devolverSonido);

  /* ── una página: dos marcos, sólo para ver ── */
  function verPagina(url, titulo){
    limpiar(); modo = 'pagina'; estado.modo = modo; estado.titulo = titulo;
    const marcos = [0, 1].map(() => { const f = document.createElement('iframe'); f.src = url; f.allow = 'autoplay; encrypted-media; fullscreen';
      f.style.cssText = `position:absolute; left:0; top:0; width:${BASE_W}px; height:${BASE_H}px; transform-origin:0 0; border:0; background:#fff`; return f; });
    montar(marcos[0], marcos[1]);
    V.hud('Si sale en blanco, ese sitio no se deja mostrar', 3);
  }
  function abrir(url, titulo = ''){
    const id = deYouTube(url);
    if(id) return verYouTube(id, titulo);
    if(esVideo(url)) return verVideo(url, titulo);
    return verPagina(url, titulo);
  }

  /* ── control ── */
  const tiempo = () => modo === 'youtube' ? (yts[0]?.getCurrentTime?.() || 0) : videos[0].currentTime;
  function pausa(){
    if(modo === 'youtube'){ const p = yts[0]?.getPlayerState?.() === 1; yts.forEach((y) => p ? y.pauseVideo() : y.playVideo()); return !p; }
    if(modo === 'video'){ const p = !videos[0].paused; videos.forEach((v) => p ? v.pause() : v.play().catch(() => {})); return !p; }
    return true;
  }
  function brincar(s){
    const t = Math.max(0, tiempo() + s);
    if(modo === 'youtube') yts.forEach((y) => y.seekTo(t, true));
    if(modo === 'video') videos.forEach((v) => { v.currentTime = t; });
  }
  /* el derecho persigue al izquierdo: en el visor, dos ojos con cuadros distintos se ven dobles */
  let ultSync = 0;
  function sincronizar(t){
    if(t - ultSync < .8) return; ultSync = t;
    try{
      if(modo === 'video' && Math.abs(videos[1].currentTime - videos[0].currentTime) > .08) videos[1].currentTime = videos[0].currentTime;
      /* el ojo derecho se quedaba en la portada con su botón de play (Carlos, 18 nov, captura): sólo se le corregía el
         TIEMPO, nunca si estaba sonando. Ahora también sigue el estado del izquierdo: si el izquierdo corre y él no, se
         calla y arranca; si el izquierdo se pausa, él también */
      if(modo === 'youtube' && yts[1]?.getCurrentTime){
        const ea = yts[0].getPlayerState?.(), eb = yts[1].getPlayerState?.(), corre = (e) => e === 1 || e === 3;
        if(corre(ea) && !corre(eb)){ yts[1].mute(); yts[1].seekTo(yts[0].getCurrentTime() + .15, true); yts[1].playVideo(); estado.arranques = (estado.arranques || 0) + 1; }
        else if(ea === 2 && corre(eb)) yts[1].pauseVideo();
        else { const a = yts[0].getCurrentTime(), b = yts[1].getCurrentTime(); if(Math.abs(a - b) > .3) yts[1].seekTo(a + .15, true); }
      }
    }catch{}
  }
  /* ── colocar: cada cuadro, las cuatro esquinas de la pantalla 3D vistas por cada ojo ── */
  const esq = [new THREE.Vector3(-.5, .5, 0), new THREE.Vector3(.5, .5, 0), new THREE.Vector3(-.5, -.5, 0), new THREE.Vector3(.5, -.5, 0)];
  const p = new THREE.Vector3(), inv = new THREE.Matrix4();
  function colocar(camaras, ancho, alto){
    if(!modo || !anclaje || !elems.length) return;
    anclaje.updateMatrixWorld();
    camaras.forEach((cam, i) => {
      const d = []; let atras = false; inv.copy(cam.matrixWorld).invert();
      for(const e of esq){ p.copy(e).applyMatrix4(anclaje.matrixWorld).applyMatrix4(inv); if(p.z > -.05) atras = true;
        p.applyMatrix4(cam.projectionMatrix); const [u, v] = V.alLente((p.x + 1) / 2, (p.y + 1) / 2, i === 1); d.push(u * ancho, (1 - v) * alto); }
      elems[i].style.visibility = atras ? 'hidden' : 'visible';
      if(!atras) elems[i].style.transform = matrizDe(BASE_W, BASE_H, d);
    });
  }
  return { abrir, verVideo, verYouTube, verPagina, cerrar: () => { limpiar(); alSalir?.(); }, pausa, brincar, sincronizar, colocar, desbloquear, estado,
    anclar: (malla) => { anclaje = malla; }, get activa(){ return !!modo; }, al: (f) => { alSalir = f; } };
}
