/* MAZI VR · MÚSICA (Carlos, 18 nov: «mete música, un menú de música; si quieres que se conecte a Spotify está bien, pero
   que meta música»).
   Tres fuentes, ninguna pide cuenta:
     · Buscar: canciones de YouTube (La Sala busca, como en el Cine) y suenan con el reproductor oficial, escondido: sólo audio.
     · Radio: estaciones de México en vivo (radio-browser.info, un directorio libre; sólo las de dirección segura).
     · Mis canciones: las que elijas del teléfono en la pantalla de entrada (botón Videos y música).
   La música sigue sonando aunque salgas a otra parte del visor. Abajo: anterior, pausa, siguiente y volumen.
   Con el control: X elige, L1/R1 anterior/siguiente.
   Spotify no va todavía: su reproductor para páginas pide cuenta Premium y que se registre una app con ellos. */
export const SALA = 'https://sala.palomazi9111.workers.dev';
const RADIOS = 'https://de1.api.radio-browser.info/json/stations/search?countrycode=MX&order=clickcount&reverse=true&limit=40&hidebroken=true';

export function montarMusica(V, { pedirTexto, CANCIONES = [] }){
  const { THREE, B } = V;
  const musica = { grupo: new THREE.Group() };
  /* el que suena: un <audio> (radio y canciones del teléfono) o un reproductor de YouTube escondido */
  const audio = document.createElement('audio'); audio.preload = 'none'; audio.setAttribute('playsinline', ''); audio.crossOrigin = 'anonymous';
  audio.style.display = 'none'; document.body.appendChild(audio);
  const cajaYT = document.createElement('div'); cajaYT.style.cssText = 'position:fixed; left:-400px; top:0; width:220px; height:220px; opacity:0; pointer-events:none';
  document.body.appendChild(cajaYT);
  let yt = null, ytListo = null, cola = [], pos = -1, sonando = false, volumen = 1, fase = 'estante';
  /* el iPhone sólo deja sonar un audio que ya se reprodujo con un toque: se «desbloquea» en el toque de Entrar */
  musica.desbloquear = () => { try{ audio.src = 'silencio.mp4'; audio.play().then(() => { if(!cola.length) audio.pause(); }).catch(() => {}); }catch{} };

  const cargarYT = () => ytListo || (ytListo = new Promise((ok) => {
    if(window.YT?.Player) return ok(window.YT);
    const antes = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { antes?.(); ok(window.YT); };
    if(!document.querySelector('script[src*="youtube.com/iframe_api"]')){ const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s); }
  }));

  /* ── tocar ── */
  function parar(){ try{ audio.pause(); }catch{} try{ yt?.stopVideo?.(); }catch{} }
  async function tocar(i){
    if(!cola.length) return; pos = (i + cola.length) % cola.length; const it = cola[pos]; parar(); sonando = true; pintarAhora(); pintarPausa();
    if(it.tipo === 'youtube'){
      const YT = await cargarYT();
      if(!yt){ const d = document.createElement('div'); cajaYT.appendChild(d);
        await new Promise((ok) => { yt = new YT.Player(d, { width: 220, height: 220, videoId: it.id, playerVars: { playsinline: 1, autoplay: 1, controls: 0 },
          events: { onReady: (e) => { e.target.setVolume(volumen * 100); e.target.playVideo(); ok(); }, onStateChange: (e) => { if(e.data === 0) siguiente(); } } }); }); }
      else { yt.loadVideoById(it.id); yt.setVolume?.(volumen * 100); }
      setTimeout(() => { try{ if(sonando && cola[pos] === it && yt.getPlayerState?.() !== 1) V.hud('Toca la pantalla una vez para el sonido', 3); }catch{} }, 3500);
    } else {
      audio.src = it.url; audio.volume = volumen;
      audio.play().catch(() => V.hud('Toca la pantalla una vez para el sonido', 3));
    }
    V.hud(it.titulo.slice(0, 40), 1.6);
  }
  audio.addEventListener('ended', () => { if(cola[pos]?.tipo === 'archivo') siguiente(); });
  audio.addEventListener('error', () => { if(sonando && audio.src && !audio.src.endsWith('silencio.mp4')) V.hud('Esa no se pudo oír', 1.6); });
  /* un toque en la pantalla devuelve el sonido si el teléfono lo bloqueó */
  addEventListener('pointerup', () => { if(!sonando) return; try{ if(cola[pos]?.tipo === 'youtube') yt?.playVideo?.(); else if(audio.paused) audio.play().catch(() => {}); }catch{} });
  const siguiente = () => tocar(pos + 1), anterior = () => tocar(pos - 1);
  function pausa(){
    if(pos < 0) return; const it = cola[pos];
    if(sonando){ sonando = false; if(it.tipo === 'youtube') yt?.pauseVideo?.(); else audio.pause(); }
    else { sonando = true; if(it.tipo === 'youtube') yt?.playVideo?.(); else audio.play().catch(() => {}); }
    pintarPausa(); V.hud(sonando ? 'Sigue' : 'Pausa', .8);
  }
  function volumenA(v){ volumen = Math.max(0, Math.min(1, v)); audio.volume = volumen; try{ yt?.setVolume?.(volumen * 100); }catch{} V.hud(`Volumen ${Math.round(volumen * 100)}`, .8); }

  /* ── lo que se ve ── */
  const ahora = new V.Panel(1.7, .26, 400); ahora.malla.position.set(0, .62, -1.95); musica.grupo.add(ahora.malla);
  function pintarAhora(){ const { x, cv } = ahora; x.clearRect(0, 0, cv.width, cv.height); x.textAlign = 'center'; x.textBaseline = 'middle';
    const it = cola[pos];
    x.font = '900 40px system-ui, -apple-system, sans-serif'; x.fillStyle = '#F4EEF2'; x.fillText(it ? it.titulo.slice(0, 34) + (it.titulo.length > 34 ? '…' : '') : 'Música', cv.width / 2, 40);
    x.font = '600 26px system-ui, -apple-system, sans-serif'; x.fillStyle = '#C9B6DA'; x.fillText(it ? (it.sub || '') : 'Elige qué escuchar', cv.width / 2, 80); ahora.listo(); }
  pintarAhora();
  let fuentes = [], botones = [], tarjetas = [], bPlay = null, bPausa = null;
  const enArco = (m, i, n, r, y, paso = 21) => { const a = (i - (n - 1) / 2) * paso * Math.PI / 180; m.position.set(Math.sin(a) * r, y, -Math.cos(a) * r); m.lookAt(0, y, 0); };
  const armado = (async () => {
    const F = [['Buscar', 'search', buscar], ['Radio', 'radio', radio], ['Mis canciones', 'list-music', misCanciones]];
    fuentes = await Promise.all(F.map(async ([t, ic, fn], i) => { const p = await V.tarjeta({ titulo: t, icono: ic }); enArco(p.malla, i, F.length, 1.9, .05); p.malla.userData.accion = fn; musica.grupo.add(p.malla); return p.malla; }));
    const C = [['Anterior', 'skip-back', anterior], ['Pausa', 'pause', pausa], ['Seguir', 'play', pausa], ['Siguiente', 'skip-forward', siguiente], ['Bajar', 'volume-1', () => volumenA(volumen - .15)], ['Subir', 'volume-2', () => volumenA(volumen + .15)]];
    botones = await Promise.all(C.map(async ([t, ic, fn]) => { const p = await V.tarjeta({ titulo: t, icono: ic }); p.malla.scale.setScalar(.55); p.malla.userData.accion = fn; musica.grupo.add(p.malla); return p.malla; }));
    bPausa = botones[1]; bPlay = botones[2];
    const orden = [botones[0], bPausa, botones[3], botones[4], botones[5]];
    orden.forEach((m, i) => enArco(m, i, orden.length, 1.7, -.55, 13)); bPlay.position.copy(bPausa.position); bPlay.quaternion.copy(bPausa.quaternion);
    pintarPausa();
  })();
  function pintarPausa(){ if(!bPlay) return; bPausa.visible = sonando; bPlay.visible = !sonando; }

  /* ── listas (resultados de búsqueda, radios, canciones) ── */
  const limpiar = () => { tarjetas.forEach((m) => { musica.grupo.remove(m); m.material.map?.dispose(); m.geometry.dispose(); }); tarjetas = []; };
  function mostrar(items){
    limpiar(); fase = 'resultados'; fuentes.forEach((m) => { m.visible = false; });
    if(!items.length){ V.hud('Sin resultados', 1.6); volver(); return; }
    const COL = 4, W = .56, H = .3, n = Math.min(12, items.length), filas = Math.ceil(n / COL);
    items.slice(0, 12).forEach((it, i) => {
      const p = new V.Panel(W, H, 420); const { x, cv } = p;
      const dib = (f) => { x.clearRect(0, 0, cv.width, cv.height); V.redondo(x, 4, 4, cv.width - 8, cv.height - 8, 22); x.fillStyle = f ? '#3A1A5C' : '#1E1428'; x.fill();
        x.lineWidth = f ? 6 : 2; x.strokeStyle = f ? '#AC27FF' : '#3C2652'; x.stroke();
        x.fillStyle = '#F4EEF2'; x.font = '700 21px system-ui, -apple-system, sans-serif'; x.textBaseline = 'top';
        const pal = String(it.titulo).split(' '); let ren = '', y = 18, k = 0;
        for(const w of pal){ const t = ren ? ren + ' ' + w : w; if(x.measureText(t).width > cv.width - 30){ x.fillText(ren, 16, y); y += 25; ren = w; if(++k >= 2) { ren = ''; break; } } else ren = t; }
        if(ren) x.fillText(ren, 16, y);
        x.fillStyle = '#C9B6DA'; x.font = '600 16px system-ui, -apple-system, sans-serif'; x.fillText(String(it.sub || '').slice(0, 36), 16, cv.height - 30); p.listo(); };
      dib(false); p.foco = (f) => { if(p._f === f) return; p._f = f; dib(f); };
      const fila = Math.floor(i / COL), enFila = Math.min(COL, n - fila * COL), col = i % COL, a = (col - (enFila - 1) / 2) * 21 * Math.PI / 180, y = .18 + (filas - 1) / 2 * .34 - fila * .34;
      p.malla.position.set(Math.sin(a) * 1.75, y, -Math.cos(a) * 1.75); p.malla.lookAt(0, y, 0);
      p.malla.userData.accion = () => { cola = items.slice(); tocar(i); };
      musica.grupo.add(p.malla); tarjetas.push(p.malla);
    });
  }
  function volver(){ limpiar(); fase = 'estante'; fuentes.forEach((m) => { m.visible = true; }); }

  async function buscar(){
    const q = await pedirTexto('Buscar música', { regresarA: 'musica' }); if(!q) return;
    V.hud('Buscando…', 1.2);
    try{ const r = await (await fetch(`${SALA}/api/sala/vr/buscar?q=${encodeURIComponent(q)}`)).json(); if(!r.bien) throw new Error(r.error);
      mostrar(r.videos.map((v) => ({ tipo: 'youtube', id: v.id, titulo: v.titulo, sub: [v.canal, v.dura].filter(Boolean).join(' · ') }))); }
    catch(e){ V.hud('No contestó la búsqueda', 2); console.warn(e); }
  }
  async function radio(){
    V.hud('Buscando radios…', 1.2);
    try{ const L = await (await fetch(RADIOS)).json();
      const seguras = L.filter((s) => /^https:/.test(s.url_resolved || '')).map((s) => ({ tipo: 'radio', url: s.url_resolved, titulo: s.name.trim(), sub: [s.state, (s.tags || '').split(',')[0]].filter(Boolean).join(' · ') }));
      mostrar(seguras); }
    catch(e){ V.hud('Las radios no contestaron', 2); console.warn(e); }
  }
  function misCanciones(){
    if(!CANCIONES.length){ V.hud('Elige canciones en la entrada (Videos y música)', 3); return; }
    mostrar(CANCIONES.map((c) => ({ tipo: 'archivo', url: c.url, titulo: c.nombre, sub: 'Del teléfono' })));
  }

  musica.elegibles = () => [...(fase === 'resultados' ? tarjetas : fuentes), ...botones.filter((b) => b.visible)];
  musica.control = (c) => { if(c.oprimido[B.R1]) siguiente(); if(c.oprimido[B.L1]) anterior(); return {}; };
  musica.atras = () => { if(fase === 'resultados') volver(); else V.ir('inicio'); };
  musica.entrar = () => { pintarAhora(); pintarPausa(); };
  musica.estado = () => ({ fase, cola: cola.length, pos, sonando, titulo: cola[pos]?.titulo || null, tipo: cola[pos]?.tipo || null, tarjetas: tarjetas.length, volumen,
    audio: { src: audio.currentSrc ? audio.currentSrc.split('/').pop() : '', pausado: audio.paused } });
  musica.elegir = (i) => tarjetas[i]?.userData.accion();
  musica.armado = armado; musica.tocar = tocar; musica.pausa = pausa; musica.mostrar = mostrar; musica.buscar = buscar; musica.radio = radio;
  V.registrar('musica', musica);
  return musica;
}
