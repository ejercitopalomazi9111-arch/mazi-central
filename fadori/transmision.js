/* ══════════════════════════════════════════════════════════════════════════
   EL PARTIDO EN VIVO · Carlos, 14 de octubre:
   «prepara el soporte de la pantalla para que yo pueda reproducir en vivo
   videos como los partidos de fútbol, y poder actualizar en tiempo real el
   marcador, así como poder ponerme como comentarista sobre el en vivo del
   partido, y necesito poder mostrar cómo están organizados los enfrentamientos
   en los torneos».

   Dos lados, en este mismo archivo:
     · EL CONTROL (pestaña «En vivo» del mostrador, en el teléfono de Carlos):
       de dónde sale el video, el marcador con su reloj, el botón para hablar
       y las llaves del torneo.
     · LA PANTALLA (pantalla.html): pinta todo eso encima del programa.

   El estado (marcador, llaves, fuente) viaja por el servidor y le llega al
   instante a todas las pantallas por el socket de los pedidos. La IMAGEN y la
   VOZ no pasan por el servidor: van directo del teléfono a la pantalla por
   WebRTC; el servidor sólo pasa los recados para que se encuentren.

   Fuentes del video:
     · un ENLACE en vivo (YouTube, Twitch, Facebook) o un .mp4/.m3u8;
     · la CÁMARA DEL TELÉFONO que controla (WebRTC, con su micrófono);
     · una cámara o capturadora CONECTADA A LA PANTALLA (la de la tele).
   ═════════════════════════════════════════════════════════════════════════ */
import { enlace, YT } from './relleno.js';
import { armarLlaves, avanzar, nombreRonda } from './llaves.js';
export { armarLlaves, avanzar };

const F = window.FADORI;
const ICE = [{ urls: 'stun:stun.cloudflare.com:3478' }, { urls: 'stun:stun.l.google.com:19302' }];
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sync = () => F.sync;

export function estadoVacio(){
  return {
    activa: false,
    fuente: { tipo: 'nada', url: '', emisor: '' },
    voz: { activa: false, emisor: '' },
    marcador: { visible: false, deporte: 'Fútbol', periodo: '1T',
      local: { nombre: 'Local', color: '#C2410C', puntos: 0 },
      visita: { nombre: 'Visitante', color: '#2563EB', puntos: 0 },
      reloj: { corriendo: false, base: 0, desde: 0 } },
    llaves: { visible: false, titulo: 'Torneo', rondas: [] },
    v: 0,
  };
}
const completar = (e) => {
  const b = estadoVacio(); if(!e || typeof e !== 'object') return b;
  return Object.assign(b, e, {
    fuente: Object.assign(b.fuente, e.fuente || {}),
    voz: Object.assign(b.voz, e.voz || {}),
    marcador: Object.assign(b.marcador, e.marcador || {}, {
      local: Object.assign(b.marcador.local, (e.marcador || {}).local || {}),
      visita: Object.assign(b.marcador.visita, (e.marcador || {}).visita || {}),
      reloj: Object.assign(b.marcador.reloj, (e.marcador || {}).reloj || {}) }),
    llaves: Object.assign(b.llaves, e.llaves || {}),
  });
};

/* ── EL RELOJ DEL PARTIDO ─────────────────────────────────────────────
   Corre en el teléfono que lo controla: `desde` es su hora al darle «Seguir».
   Las pantallas lo cuentan con la diferencia entre SU reloj y el del que lo
   manda, que se mide al llegar cada estado (el servidor estampa `t`). */
/* en el teléfono que lo controla: lo acumulado más lo que lleva corriendo */
export function msDe(rel){
  if(!rel) return 0;
  return (rel.base || 0) + (rel.corriendo ? Math.max(0, Date.now() - (rel.desde || 0)) : 0);
}
export const segundosDe = (rel) => Math.floor(msDe(rel) / 1000);
/* en la pantalla: `va` es lo que llevaba al mandarse, `t` la hora del
   servidor al recibirlo y `desfase` cuánto va el servidor delante de este
   aparato. Así los relojes de los aparatos no tienen que coincidir. */
export function segundosEnPantalla(est, desfase){
  const rel = est.marcador.reloj; if(!rel) return 0;
  const va = rel.va != null ? rel.va : msDe(rel);
  const corre = rel.corriendo && est.t ? Math.max(0, Date.now() + desfase - est.t) : 0;
  return Math.floor((va + corre) / 1000);
}
export const verReloj = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

export function htmlLlaves(ll){
  const rondas = ll.rondas || []; if(!rondas.length) return '<p class="tv-ll-vacio">Todavía no hay llaves.</p>';
  const final = rondas[rondas.length - 1][0], campeon = final && final.gana;
  return '<div class="tv-ll"><h3>' + esc(ll.titulo || 'Torneo') + '</h3><div class="tv-ll-rondas">' +
    rondas.map((ps, r) => '<div class="tv-ll-ronda"><small>' + nombreRonda(r, rondas.length) + '</small>' +
      ps.map(p => '<div class="tv-ll-p">' + [['a', 'pa'], ['b', 'pb']].map(([k, pk]) =>
        '<div class="tv-ll-e' + (p.gana && p.gana === p[k] ? ' gano' : p.gana ? ' perdio' : '') + (p[k] ? '' : ' hueco') + '"><span>' +
        esc(p[k] || (r === 0 ? 'descansa' : '—')) + '</span><b>' + esc(p[pk]) + '</b></div>').join('') + '</div>').join('') + '</div>').join('') +
    '<div class="tv-ll-ronda campeon"><small>Campeón</small><div class="tv-ll-copa">' + (campeon ? '🏆 ' + esc(campeon) : '¿Quién será?') + '</div></div>' +
    '</div></div>';
}

/* ── WEBRTC ───────────────────────────────────────────────────────────
   El teléfono EMITE (cámara y/o micrófono); cada pantalla que lo ve le pide
   la señal y recibe la suya. Cuando cambian las pistas (empezó a hablar,
   apagó la cámara), se cuelga y cada pantalla vuelve a pedir. */
const Emisor = {
  flujo: null, pcs: new Map(),
  async poner(conVideo, conVoz){
    this.colgarTodo();
    if(this.flujo) this.flujo.getTracks().forEach(t => t.stop());
    this.flujo = null;
    if(!conVideo && !conVoz) return null;
    this.flujo = await navigator.mediaDevices.getUserMedia({
      video: conVideo ? { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      audio: conVoz ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false });
    return this.flujo;
  },
  colgarTodo(){ this.pcs.forEach(pc => { try{ pc.close(); }catch(e){} }); this.pcs.clear(); },
  async atender(de, datos){
    if(datos.pido){
      if(!this.flujo) return;
      const viejo = this.pcs.get(de); if(viejo) try{ viejo.close(); }catch(e){}
      const pc = new RTCPeerConnection({ iceServers: ICE });
      this.pcs.set(de, pc);
      this.flujo.getTracks().forEach(t => pc.addTrack(t, this.flujo));
      pc.onicecandidate = (e) => { if(e.candidate) sync().mandarVivo(de, { ice: e.candidate.toJSON(), sesion: datos.sesion }); };
      const of = await pc.createOffer();
      await pc.setLocalDescription(of);
      sync().mandarVivo(de, { sdp: pc.localDescription.toJSON(), sesion: datos.sesion });
    } else if(datos.sdp && datos.sdp.type === 'answer'){
      const pc = this.pcs.get(de); if(pc) await pc.setRemoteDescription(datos.sdp).catch(() => {});
    } else if(datos.ice){
      const pc = this.pcs.get(de); if(pc) await pc.addIceCandidate(datos.ice).catch(() => {});
    }
  },
};
const Receptor = {
  pcs: new Map(),        /* emisor -> { pc, sesion } */
  pedir(emisor, alFlujo){
    this.colgar(emisor);
    const sesion = Math.random().toString(36).slice(2);
    const pc = new RTCPeerConnection({ iceServers: ICE });
    this.pcs.set(emisor, { pc, sesion, alFlujo });
    pc.ontrack = (e) => alFlujo(e.streams[0] || new MediaStream([e.track]));
    pc.onicecandidate = (e) => { if(e.candidate) sync().mandarVivo(emisor, { ice: e.candidate.toJSON(), sesion }); };
    sync().mandarVivo(emisor, { pido: true, sesion });
  },
  colgar(emisor){ const x = this.pcs.get(emisor); if(x){ try{ x.pc.close(); }catch(e){} this.pcs.delete(emisor); } },
  colgarTodo(){ [...this.pcs.keys()].forEach(k => this.colgar(k)); },
  async atender(de, datos){
    const x = this.pcs.get(de); if(!x || (datos.sesion && datos.sesion !== x.sesion)) return;
    if(datos.sdp && datos.sdp.type === 'offer'){
      await x.pc.setRemoteDescription(datos.sdp);
      const r = await x.pc.createAnswer(); await x.pc.setLocalDescription(r);
      sync().mandarVivo(de, { sdp: x.pc.localDescription.toJSON(), sesion: x.sesion });
    } else if(datos.ice) await x.pc.addIceCandidate(datos.ice).catch(() => {});
  },
};

/* ══════════════════════════════════════════════════════════════════════
   LA PANTALLA
   ═════════════════════════════════════════════════════════════════════ */
export function montarPantalla({ marco, alCambiar }){
  const capa = document.createElement('div');
  capa.className = 'tv-vivo'; capa.hidden = true;
  capa.innerHTML = '<video class="tv-vivo-video" playsinline autoplay></video>' +
    '<iframe class="tv-vivo-web" hidden allow="autoplay; encrypted-media; fullscreen; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" title="Transmisión en vivo"></iframe>' +
    '<audio class="tv-vivo-voz" autoplay></audio>' +
    '<div class="tv-vivo-sin" hidden></div>' +
    '<div class="tv-marcador" hidden></div>' +
    '<span class="tv-envivo"><i></i>EN VIVO</span>' +
    '<div class="tv-llaves" hidden></div>';
  marco.insertBefore(capa, marco.querySelector('#llamado'));   /* debajo del letrero de «ya está tu pedido» */
  const v = capa.querySelector('.tv-vivo-video'), web = capa.querySelector('.tv-vivo-web'), voz = capa.querySelector('.tv-vivo-voz');
  const sin = capa.querySelector('.tv-vivo-sin'), mar = capa.querySelector('.tv-marcador'), ll = capa.querySelector('.tv-llaves');
  let est = estadoVacio(), desfase = 0, firmaFuente = '', firmaVoz = '', propia = null, encendida = false;

  const mostrarSin = (txt) => { sin.hidden = !txt; sin.textContent = txt || ''; };
  async function ponerFuente(){
    const f = est.fuente, firma = est.activa ? f.tipo + '|' + f.url + '|' + f.emisor + '|' + (est.v || 0) : 'apagada';
    if(firma === firmaFuente) return; firmaFuente = firma;
    /* lo de antes, fuera */
    web.hidden = true; web.removeAttribute('src'); v.srcObject = null; v.removeAttribute('src'); mostrarSin('');
    if(propia){ propia.getTracks().forEach(t => t.stop()); propia = null; }
    [...Receptor.pcs.keys()].filter(k => k !== est.voz.emisor).forEach(k => Receptor.colgar(k));
    if(!est.activa) return;
    if(f.tipo === 'enlace'){
      const e = enlace(f.url, { origen: location.origin });
      if(e && e.tipo === 'youtube'){ web.src = e.embed; web.hidden = false; web.onload = () => YT.escuchar(web); return; }
      let u = null; try{ u = new URL(f.url); }catch(err){}
      if(!u){ mostrarSin('Ese enlace no se pudo abrir.'); return; }
      const h = u.hostname.replace(/^www\./, '');
      if(/\.(mp4|webm|m3u8)(\?|$)/i.test(u.pathname)){ v.src = u.href; v.muted = false; v.play().catch(() => { v.muted = true; v.play().catch(() => {}); }); return; }
      if(h === 'twitch.tv'){ const canal = u.pathname.split('/')[1]; web.src = 'https://player.twitch.tv/?channel=' + encodeURIComponent(canal) + '&parent=' + location.hostname + '&autoplay=true'; web.hidden = false; return; }
      if(/facebook\.com$|fb\.watch$/.test(h)){ web.src = 'https://www.facebook.com/plugins/video.php?autoplay=true&href=' + encodeURIComponent(u.href); web.hidden = false; return; }
      web.src = u.href; web.hidden = false;                 /* lo demás, tal cual: algunos sitios no se dejan poner en marco */
    } else if(f.tipo === 'telefono' && f.emisor){
      mostrarSin('Conectando con la cámara del teléfono…');
      Receptor.pedir(f.emisor, (flujo) => { mostrarSin(''); v.srcObject = flujo; v.muted = false; v.play().catch(() => { v.muted = true; v.play().catch(() => {}); }); });
    } else if(f.tipo === 'camara'){
      try{
        propia = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: true });
        v.srcObject = propia; v.muted = false; v.play().catch(() => {});
      }catch(err){ mostrarSin('Esta pantalla no tiene cámara conectada, o no dio permiso.'); }
    }
  }
  function ponerVoz(){
    const firma = est.activa && est.voz.activa && est.voz.emisor && !(est.fuente.tipo === 'telefono' && est.fuente.emisor === est.voz.emisor)
      ? est.voz.emisor + '|' + (est.v || 0) : '';
    if(firma === firmaVoz) return; firmaVoz = firma;
    voz.srcObject = null;
    if(!firma) return;
    Receptor.pedir(est.voz.emisor, (flujo) => { voz.srcObject = flujo; voz.play().catch(() => {}); });
  }
  function pintarMarcador(){
    const m = est.marcador;
    mar.hidden = !m.visible;
    if(!m.visible) return;
    const html = '<span class="tm-eq" style="--c:' + esc(m.local.color) + '"><i></i>' + esc(m.local.nombre) + '</span><b class="tm-pts">' + (m.local.puntos | 0) + '</b>' +
      '<b class="tm-pts">' + (m.visita.puntos | 0) + '</b><span class="tm-eq" style="--c:' + esc(m.visita.color) + '">' + esc(m.visita.nombre) + '<i></i></span>' +
      '<span class="tm-reloj">' + verReloj(segundosEnPantalla(est, desfase)) + '</span><span class="tm-per">' + esc(m.periodo) + '</span>';
    if(mar._html !== html){ mar._html = html; mar.innerHTML = html; }
  }
  setInterval(pintarMarcador, 500);
  function aplicar(nuevo, ahoraServidor){
    const antesGoles = est.marcador.local.puntos + ':' + est.marcador.visita.puntos;
    est = completar(nuevo);
    if(typeof ahoraServidor === 'number') desfase = ahoraServidor - Date.now();
    const ver = est.activa || est.marcador.visible || est.llaves.visible;
    capa.hidden = !ver;
    capa.classList.toggle('con-video', !!est.activa);
    ll.hidden = !est.llaves.visible;
    if(est.llaves.visible){ const h = htmlLlaves(est.llaves); if(ll._html !== h){ ll._html = h; ll.innerHTML = h; } }
    pintarMarcador();
    const goles = est.marcador.local.puntos + ':' + est.marcador.visita.puntos;
    if(antesGoles !== goles && est.marcador.visible && encendida){ mar.classList.remove('gol'); void mar.offsetWidth; mar.classList.add('gol'); }
    ponerFuente(); ponerVoz();
    encendida = ver;
    alCambiar && alCambiar(ver, est);
    window.__vivo = { est, ver };
  }
  sync().alVivo((m) => {
    if(m.tipo === 'transmision') aplicar(m.estado, m.ahora);
    else if(m.tipo === 'senal' && m.datos) Receptor.atender(m.de, m.datos);
  });
  return { estado: () => est, video: v, web };
}

/* ══════════════════════════════════════════════════════════════════════
   EL CONTROL (en el mostrador)
   ═════════════════════════════════════════════════════════════════════ */
export function montarControl(caja){
  let est = completar(sync().transmision), mandando = null, preview = null;
  const yo = sync().aparato();
  const mandar = () => {
    est.v = (est.v || 0);
    clearTimeout(mandando);
    mandando = setTimeout(async () => {
      est.marcador.reloj.va = msDe(est.marcador.reloj);
      try{ await sync().ponerTransmision(est); mandando = null; pintarEstado(''); }
      catch(e){ mandando = null; pintarEstado(e.message || 'No se pudo mandar a la pantalla.'); }
    }, 120);
  };
  sync().alVivo((m) => {
    if(m.tipo === 'senal' && m.datos) Emisor.atender(m.de, m.datos);
    if(m.tipo === 'transmision' && !mandando){ est = completar(m.estado); pintar(); }
  });
  caja.innerHTML = `
    <p class="sub">Lo que pongas aquí sale <b>al instante</b> en la pantalla de turnos. Los turnos y la voz siguen saliendo encima.</p>
    <p class="aviso malo" id="tvEstado" hidden></p>
    <div class="tarjeta">
      <h3>1 · El video</h3>
      <div class="chips" role="group" aria-label="De dónde sale el video">
        <button class="chip" type="button" data-fuente="enlace">Un enlace</button>
        <button class="chip" type="button" data-fuente="telefono">La cámara de este teléfono</button>
        <button class="chip" type="button" data-fuente="camara">Cámara conectada a la pantalla</button>
        <button class="chip" type="button" data-fuente="nada">Apagar</button>
      </div>
      <div id="tvEnlace" hidden>
        <label for="tvUrl">Enlace en vivo (YouTube, Twitch, Facebook o un .mp4)</label>
        <div class="fila-btn"><input id="tvUrl" type="url" inputmode="url" placeholder="https://youtube.com/live/…"><button class="btn fuerte" type="button" id="tvPonUrl">Poner</button></div>
      </div>
      <video id="tvPrevia" playsinline muted autoplay hidden></video>
      <p class="sub" id="tvFuenteQue"></p>
    </div>
    <div class="tarjeta">
      <h3>2 · El marcador</h3>
      <label class="interruptor"><input type="checkbox" id="tvMVer"> Enseñar el marcador en la pantalla</label>
      <div class="tv-equipos">
        ${['local', 'visita'].map(k => `<div class="tv-eq" data-eq="${k}">
          <div class="fila-btn"><input type="color" data-color="${k}" aria-label="Color"><input data-nombre="${k}" maxlength="18" aria-label="Nombre del equipo"></div>
          <div class="tv-pts"><button class="btn" type="button" data-menos="${k}" aria-label="Quitar un punto">−</button><b data-pts="${k}">0</b><button class="btn fuerte" type="button" data-mas="${k}">+ Gol</button></div>
        </div>`).join('')}
      </div>
      <div class="fila-btn tv-reloj-c"><b id="tvReloj">00:00</b>
        <button class="btn fuerte" type="button" id="tvCorre">▶ Empezar</button>
        <button class="btn" type="button" id="tvCero">Reloj a 0</button>
        <select id="tvPeriodo" aria-label="Periodo">${['1T', 'Medio', '2T', 'Extra', 'Penales', 'Final'].map(x => `<option>${x}</option>`).join('')}</select>
      </div>
    </div>
    <div class="tarjeta">
      <h3>3 · El comentarista</h3>
      <p class="sub">Tu voz sale por las bocinas de la pantalla, encima del partido.</p>
      <button class="btn ancho fuerte" type="button" id="tvHablar">🎙 Empezar a comentar</button>
    </div>
    <div class="tarjeta">
      <h3>4 · Las llaves del torneo</h3>
      <label class="interruptor"><input type="checkbox" id="tvLVer"> Enseñar las llaves en la pantalla</label>
      <label for="tvLTit">Nombre del torneo</label><input id="tvLTit" maxlength="40">
      <label for="tvLEq">Equipos, uno por renglón (en el orden de los enfrentamientos)</label>
      <textarea id="tvLEq" rows="6" placeholder="3.1&#10;3.2&#10;2.1&#10;2.2"></textarea>
      <button class="btn" type="button" id="tvLArmar">Armar las llaves</button>
      <div id="tvLlaves" class="tv-llc"></div>
    </div>`;
  const $ = (s) => caja.querySelector(s), $$ = (s) => [...caja.querySelectorAll(s)];
  function pintarEstado(txt){ const p = $('#tvEstado'); p.hidden = !txt; p.textContent = txt; }

  async function ponerFuente(tipo){
    try{
      if(tipo === 'telefono'){
        const f = await Emisor.poner(true, est.voz.activa && est.voz.emisor === yo);
        preview = f; $('#tvPrevia').srcObject = f; $('#tvPrevia').hidden = false;
        est.fuente = { tipo, url: '', emisor: yo };
      } else {
        if(est.fuente.tipo === 'telefono' && est.fuente.emisor === yo){ await Emisor.poner(false, est.voz.activa && est.voz.emisor === yo); $('#tvPrevia').hidden = true; }
        est.fuente = { tipo, url: tipo === 'enlace' ? ($('#tvUrl').value.trim() || est.fuente.url) : '', emisor: '' };
      }
      est.activa = tipo !== 'nada';
      est.v = (est.v || 0) + 1;
      mandar(); pintar();
    }catch(e){ pintarEstado(e && e.name === 'NotAllowedError' ? 'Dale permiso a la cámara para transmitir desde el teléfono.' : 'No se pudo usar la cámara: ' + (e.message || e)); }
  }
  $$('[data-fuente]').forEach(b => b.addEventListener('click', () => {
    const t = b.dataset.fuente;
    if(t === 'enlace'){ $('#tvEnlace').hidden = false; $('#tvUrl').focus(); if(est.fuente.tipo !== 'enlace') pintar(); return; }
    ponerFuente(t);
  }));
  $('#tvPonUrl').addEventListener('click', () => {
    const u = $('#tvUrl').value.trim();
    try{ new URL(u); }catch(e){ return pintarEstado('Pega un enlace completo, que empiece con https://'); }
    ponerFuente('enlace');
  });
  $('#tvHablar').addEventListener('click', async () => {
    try{
      const habla = !(est.voz.activa && est.voz.emisor === yo);
      const conVideo = est.fuente.tipo === 'telefono' && est.fuente.emisor === yo;
      const f = await Emisor.poner(conVideo, habla);
      if(conVideo){ preview = f; $('#tvPrevia').srcObject = f; }
      est.voz = { activa: habla, emisor: habla ? yo : '' };
      est.v = (est.v || 0) + 1; mandar(); pintar();
    }catch(e){ pintarEstado(e && e.name === 'NotAllowedError' ? 'Dale permiso al micrófono para comentar.' : 'No se pudo usar el micrófono.'); }
  });
  /* marcador */
  $('#tvMVer').addEventListener('change', (e) => { est.marcador.visible = e.target.checked; mandar(); });
  $$('[data-nombre]').forEach(i => i.addEventListener('input', () => { est.marcador[i.dataset.nombre].nombre = i.value; mandar(); }));
  $$('[data-color]').forEach(i => i.addEventListener('input', () => { est.marcador[i.dataset.color].color = i.value; mandar(); }));
  $$('[data-mas]').forEach(b => b.addEventListener('click', () => { est.marcador[b.dataset.mas].puntos++; est.marcador.visible = true; mandar(); pintar(); }));
  $$('[data-menos]').forEach(b => b.addEventListener('click', () => { const q = est.marcador[b.dataset.menos]; q.puntos = Math.max(0, q.puntos - 1); mandar(); pintar(); }));
  $('#tvCorre').addEventListener('click', () => {
    const r = est.marcador.reloj;
    if(r.corriendo){ r.base = (r.base || 0) + (Date.now() - r.desde); r.corriendo = false; }
    else { r.desde = Date.now(); r.corriendo = true; }
    mandar(); pintar();
  });
  $('#tvCero').addEventListener('click', () => { est.marcador.reloj = { corriendo: false, base: 0, desde: 0 }; mandar(); pintar(); });
  $('#tvPeriodo').addEventListener('change', (e) => { est.marcador.periodo = e.target.value; mandar(); });
  setInterval(() => { $('#tvReloj').textContent = verReloj(segundosDe(est.marcador.reloj)); }, 500);
  /* llaves */
  $('#tvLVer').addEventListener('change', (e) => { est.llaves.visible = e.target.checked; mandar(); });
  $('#tvLTit').addEventListener('input', (e) => { est.llaves.titulo = e.target.value; mandar(); });
  $('#tvLArmar').addEventListener('click', () => {
    const eq = $('#tvLEq').value.split('\n').map(x => x.trim()).filter(Boolean);
    if(eq.length < 2) return pintarEstado('Pon al menos dos equipos.');
    est.llaves.rondas = armarLlaves(eq); est.llaves.visible = true; mandar(); pintar();
  });
  $('#tvLlaves').addEventListener('click', (e) => {
    const b = e.target.closest('[data-gana]'); if(!b) return;
    const [r, i, k] = b.dataset.gana.split(':'), p = est.llaves.rondas[+r][+i];
    p.gana = p.gana === p[k] ? '' : p[k];
    avanzar(est.llaves.rondas); mandar(); pintar();
  });
  $('#tvLlaves').addEventListener('input', (e) => {
    const i = e.target.closest('[data-res]'); if(!i) return;
    const [r, n, k] = i.dataset.res.split(':'); est.llaves.rondas[+r][+n][k] = i.value.slice(0, 3); mandar();
  });

  function pintar(){
    $$('[data-fuente]').forEach(b => b.setAttribute('aria-pressed', String(est.activa ? b.dataset.fuente === est.fuente.tipo : b.dataset.fuente === 'nada')));
    $('#tvEnlace').hidden = !(est.fuente.tipo === 'enlace' || !$('#tvEnlace').hidden);
    if(document.activeElement !== $('#tvUrl') && est.fuente.url) $('#tvUrl').value = est.fuente.url;
    $('#tvFuenteQue').textContent = !est.activa ? 'Sin transmisión: la pantalla pasa su programa normal.'
      : est.fuente.tipo === 'enlace' ? 'En la pantalla: el enlace.'
      : est.fuente.tipo === 'telefono' ? (est.fuente.emisor === yo ? 'En la pantalla: la cámara de ESTE teléfono. No cierres esta página.' : 'En la pantalla: la cámara de otro teléfono.')
      : 'En la pantalla: la cámara conectada a ella.';
    $('#tvMVer').checked = !!est.marcador.visible;
    ['local', 'visita'].forEach(k => {
      const q = est.marcador[k];
      const n = caja.querySelector('[data-nombre="' + k + '"]'); if(document.activeElement !== n) n.value = q.nombre;
      caja.querySelector('[data-color="' + k + '"]').value = q.color;
      caja.querySelector('[data-pts="' + k + '"]').textContent = q.puntos;
    });
    $('#tvCorre').textContent = est.marcador.reloj.corriendo ? '❚❚ Pausar' : '▶ ' + (est.marcador.reloj.base ? 'Seguir' : 'Empezar');
    $('#tvPeriodo').value = est.marcador.periodo;
    const hablo = est.voz.activa && est.voz.emisor === yo;
    $('#tvHablar').textContent = hablo ? '■ Dejar de comentar' : '🎙 Empezar a comentar';
    $('#tvHablar').classList.toggle('peligro', hablo);
    $('#tvLVer').checked = !!est.llaves.visible;
    if(document.activeElement !== $('#tvLTit')) $('#tvLTit').value = est.llaves.titulo || '';
    const R = est.llaves.rondas || [];
    $('#tvLlaves').innerHTML = R.length ? R.map((ps, r) => '<div class="tv-llc-r"><small>' + nombreRonda(r, R.length) + '</small>' + ps.map((p, i) =>
      '<div class="tv-llc-p">' + [['a', 'pa'], ['b', 'pb']].map(([k, pk]) => p[k]
        ? '<div class="tv-llc-e' + (p.gana === p[k] ? ' gano' : '') + '"><button type="button" data-gana="' + r + ':' + i + ':' + k + '">' + esc(p[k]) + '</button><input data-res="' + r + ':' + i + ':' + pk + '" value="' + esc(p[pk]) + '" inputmode="numeric" aria-label="Marcador"></div>'
        : '<div class="tv-llc-e hueco">' + (r === 0 ? 'descansa' : '—') + '</div>').join('') + '</div>').join('') + '</div>').join('')
      : '<p class="sub">Escribe los equipos y toca «Armar las llaves». Luego toca al que gana cada partido y pasa solo a la siguiente ronda.</p>';
  }
  pintar();
  return { estado: () => est };
}

/* el mostrador se arma solo si trae su caja */
const caja = document.getElementById('vivoControl');
if(caja && F) montarControl(caja);
