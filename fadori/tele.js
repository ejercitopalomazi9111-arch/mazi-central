/* LA PANTALLA DE TURNOS · lo que pasa en ella
   ----------------------------------------------------------------------------
   Tres cosas a la vez, en una tablet colgada junto a la cooperativa:

   1 · EL PROGRAMA. Los episodios del podcast que se le cargan a esta tablet
       (se guardan en ella: un recreo de 30 minutos es un episodio), con su
       marco de televisión, y cada tantos minutos una tanda de anuncios de la
       escuela con el logo que gira, como en la tele.
   2 · LOS TURNOS. En la esquina, el que ya puede pasar en grande, con lo que
       pidió y —sólo si quien pidió dijo que sí— su primer nombre. Cuando uno
       queda listo suena un timbre y una voz dice el número.
   3 · EL MODO TABLET. Con el pasador de la cooperativa, cualquiera que toque
       la pantalla puede pedir desde aquí: se abre la app normal y el turno
       queda en chiquito arriba a la izquierda. Al terminar, la pantalla
       regresa sola haciendo zoom hacia el turno. */
import { mezclarAnuncios, prepararAnuncio, dibujarIdent, dibujarAnuncio, DURA_IDENT, DURA_ANUNCIO } from './anuncios.js';

const $ = (s) => document.querySelector(s);
const F = window.FADORI;
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
F.cargar();
document.querySelectorAll('[data-ico]').forEach(el => { el.innerHTML = F.ico(el.dataset.ico); });

/* ── ajustes de esta tablet ─────────────────────────────────────────── */
const LLAVE = 'fadori_tele';
const BASE = { cadaMin: 8, porCorte: 2, canal: 'rembrandt', timbre: true, voz: true, plancha: true, volumen: 0.9, tablet: false, sigAnuncio: 0 };
let cfg = Object.assign({}, BASE);
try{ cfg = Object.assign(cfg, JSON.parse(localStorage.getItem(LLAVE) || '{}')); }catch(e){}
const guardarCfg = () => { try{ localStorage.setItem(LLAVE, JSON.stringify(cfg)); }catch(e){} };

/* ── lo pesado (los videos y los logos) va en IndexedDB ─────────────── */
const BD = new Promise((si) => {
  try{
    const r = indexedDB.open('fadori-tele', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('cosas'); };
    r.onsuccess = () => si(r.result); r.onerror = () => si(null);
  }catch(e){ si(null); }
});
async function guardar(clave, valor){
  const bd = await BD; if(!bd) return;
  await new Promise((si) => { try{ const t = bd.transaction('cosas', 'readwrite'); valor === undefined ? t.objectStore('cosas').delete(clave) : t.objectStore('cosas').put(valor, clave); t.oncomplete = si; t.onerror = si; }catch(e){ si(); } });
}
async function leer(clave){
  const bd = await BD; if(!bd) return undefined;
  return new Promise((si) => { try{ const r = bd.transaction('cosas').objectStore('cosas').get(clave); r.onsuccess = () => si(r.result); r.onerror = () => si(undefined); }catch(e){ si(undefined); } });
}

/* ══════════════════════════════════════════════════════════════════════
   2 · LOS TURNOS
   ═════════════════════════════════════════════════════════════════════ */
let yaListos = null, yaPrep = null, nuevoDeTablet = null;
const quien = (p) => F.aliasDe(p);
const pidio = (p, max) => F.queSePidio(p, max);
function pintarTurnos(){
  const d = F.estado();
  const listos = d.pedidos.filter(p => p.estado === 'listo').sort((a, b) => (b.listoEn || 0) - (a.listoEn || 0));
  const cola = F.colaOrdenada();
  const prep = cola.filter(p => p.estado === 'preparando');
  const fila = cola.filter(p => p.estado !== 'preparando');
  const antes = yaListos, antesPrep = yaPrep;
  yaListos = new Set(listos.map(p => p.id)); yaPrep = new Set(prep.map(p => p.id));

  const top = listos[0];
  $('#llamando').innerHTML = '<h2>' + F.ico('circle-check-big') + 'Ya puede pasar</h2>' + (top
    ? '<b class="n">' + esc(F.verTurno(top)) + '</b>' + (quien(top) ? '<span class="quien">' + esc(quien(top)) + '</span>' : '') +
      (pidio(top) ? '<span class="pidio">' + esc(pidio(top, 4)) + '</span>' : '')
    : '<span class="vacio">Aquí sale tu número cuando esté listo</span>');
  $('#llamando').dataset.turno = top ? top.id : '';

  const ficha = (p, clase) => '<div class="ficha ' + clase + (p.id === nuevoDeTablet ? ' nueva' : '') + '" data-id="' + p.id + '"><b>' + esc(F.verTurno(p)) + '</b>' +
    '<span>' + esc([quien(p), pidio(p, 2)].filter(Boolean).join(' · ')) + '</span></div>';
  const otros = listos.slice(1);
  $('#bListos').innerHTML = otros.length ? '<h3>' + F.ico('circle-check-big') + 'También listos</h3><div class="fichas">' +
    otros.slice(0, 3).map(p => ficha(p, 'lista')).join('') + '</div>' + (otros.length > 3 ? '<p class="mas">y ' + (otros.length - 3) + ' más</p>' : '') : '';
  $('#bPrep').innerHTML = '<h3>' + F.ico('chef-hat') + 'Preparando <span class="cuenta">' + (prep.length || '') + '</span></h3>' +
    (prep.length ? '<div class="fichas">' + prep.slice(0, 3).map(p => ficha(p, 'prep')).join('') + '</div>' + (prep.length > 3 ? '<p class="mas">y ' + (prep.length - 3) + ' más</p>' : '')
      : '<p class="mas">Nada en la plancha</p>');
  $('#bFila').innerHTML = '<h3>' + F.ico('hourglass') + 'En la fila <span class="cuenta">' + (fila.length || '') + '</span></h3>' +
    (fila.length ? '<div class="numeros">' + fila.slice(0, 14).map(p => '<b data-id="' + p.id + '"' + (p.id === nuevoDeTablet ? ' class="nueva"' : '') + '>' + esc(F.verTurno(p)) + '</b>').join('') + '</div>' +
      (fila.length > 14 ? '<p class="mas">y ' + (fila.length - 14) + ' más</p>' : '') : '<p class="mas">Nadie esperando</p>');

  /* lo nuevo: el timbre, la voz y el letrero grande */
  if(antes){
    const nuevos = listos.filter(p => !antes.has(p.id)).reverse();
    nuevos.forEach(p => anunciar(p));
    if(nuevos.length){ const c = $('#llamando'); c.classList.remove('brinca'); void c.offsetWidth; c.classList.add('brinca'); }
    if(antesPrep && cfg.plancha && prep.some(p => !antesPrep.has(p.id))) Sonido.tin();
  }
  pintarMini(listos);
}
function pintarMini(listos){
  const top = listos[0];
  $('#kMini').innerHTML = '<small>Ya puede pasar</small><b>' + (top ? esc(F.verTurno(top)) : '—') + '</b>' +
    (listos.length > 1 ? '<span>' + listos.slice(1, 4).map(p => esc(F.verTurno(p))).join(' · ') + '</span>' : '');
}

/* ── el timbre y la voz ─────────────────────────────────────────────── */
const Sonido = {
  ac: null,
  despierta(){
    try{ const AC = window.AudioContext || window.webkitAudioContext; if(!this.ac && AC) this.ac = new AC(); if(this.ac && this.ac.state === 'suspended') this.ac.resume(); }catch(e){}
    return this.ac;
  },
  tono(f, t0, dur, vol, tipo = 'sine'){
    const ac = this.ac, o = ac.createOscillator(), g = ac.createGain();
    o.type = tipo; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  },
  /* ding-dong de timbre: dos campanadas con su armónico */
  timbre(){
    const ac = this.despierta(); if(!ac || ac.state !== 'running') return false;
    const t = ac.currentTime + 0.03;
    [[659.25, 0], [523.25, 0.55]].forEach(([f, d]) => { this.tono(f, t + d, 1.6, 0.32); this.tono(f * 2.01, t + d, 0.9, 0.08); this.tono(f * 3, t + d, 0.5, 0.03, 'triangle'); });
    return true;
  },
  tin(){ const ac = this.despierta(); if(!ac || ac.state !== 'running') return; const t = ac.currentTime + 0.02; this.tono(1046.5, t, 0.5, 0.12); },
  /* el «fiuuu» con brillo de la cortinilla de anuncios */
  cortinilla(){
    const ac = this.despierta(); if(!ac || ac.state !== 'running') return;
    const t = ac.currentTime + 0.02, n = Math.round(ac.sampleRate * 0.9), b = ac.createBuffer(1, n, ac.sampleRate), x = b.getChannelData(0);
    for(let i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / n);
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = b; fl.type = 'bandpass'; fl.Q.value = 3; fl.frequency.setValueAtTime(300, t); fl.frequency.exponentialRampToValueAtTime(4200, t + 0.8);
    g.gain.value = 0.25; s.connect(fl).connect(g).connect(ac.destination); s.start(t);
    [784, 988, 1175, 1568].forEach((f, i) => this.tono(f, t + 0.85 + i * 0.07, 0.9, 0.09));
  },
};
let vozLista = null;
function voz(){
  if(!('speechSynthesis' in window)) return null;
  const vs = speechSynthesis.getVoices();
  return vs.find(v => /^es[-_]MX/i.test(v.lang)) || vs.find(v => /^es[-_](US|419)/i.test(v.lang)) || vs.find(v => /^es/i.test(v.lang)) || null;
}
if('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { vozLista = voz(); };
function decir(texto){
  if(!cfg.voz || !('speechSynthesis' in window)) return;
  try{
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'es-MX'; u.rate = 0.95; u.pitch = 1; u.volume = 1;
    const v = vozLista || voz(); if(v) u.voice = v;
    speechSynthesis.speak(u);
  }catch(e){}
}
/* los avisos van en fila: si salen tres juntos, se dicen uno por uno */
const filaAvisos = []; let avisando = false;
function anunciar(p){ filaAvisos.push(p.id); if(!avisando) siguienteAviso(); }
function siguienteAviso(){
  const id = filaAvisos.shift();
  if(!id){ avisando = false; Programa.bajar(false); return; }
  const p = F.pedido(id); if(!p){ siguienteAviso(); return; }
  avisando = true;
  const n = F.verTurno(p), al = quien(p), qu = pidio(p, 3);
  $('#llN').textContent = n;
  $('#llQue').textContent = al ? '¡' + al + ', ya está!' : '¡Ya está tu pedido!';
  $('#llPidio').textContent = qu;
  $('#llamado').classList.add('sale');
  Programa.bajar(true);
  if(cfg.timbre) Sonido.timbre();
  setTimeout(() => decir('Turno ' + n + '. ' + (al ? al + ', ' : '') + 'tu pedido está listo.'), cfg.timbre ? 1300 : 0);
  window.__ultimoAviso = { turno: n, alias: al, pidio: qu, t: Date.now() };
  setTimeout(() => { $('#llamado').classList.remove('sale'); setTimeout(siguienteAviso, 700); }, 6500);
}

/* ══════════════════════════════════════════════════════════════════════
   1 · EL PROGRAMA Y LA TANDA DE ANUNCIOS
   ═════════════════════════════════════════════════════════════════════ */
const video = $('#prog'), lienzo = $('#tanda');
let anuncios = [];
async function cargarAnuncios(){ anuncios = mezclarAnuncios(await leer('anuncios')); }
const activos = () => anuncios.filter(a => a.activo !== false);

const Programa = {
  eps: [],              /* [{id, nombre, url}] */
  i: 0, desdeCorte: 0, ultimoT: 0, enCorte: false, pausado: false, bajo: false,
  async cargar(){
    const orden = (await leer('eps')) || [];
    this.eps.forEach(e => URL.revokeObjectURL(e.url));
    this.eps = [];
    for(const id of orden){ const g = await leer('ep:' + id); if(g && g.blob) this.eps.push({ id, nombre: g.nombre, url: URL.createObjectURL(g.blob) }); }
    let pos = null; try{ pos = JSON.parse(localStorage.getItem('fadori_tele_pos') || 'null'); }catch(e){}
    const k = pos ? this.eps.findIndex(e => e.id === pos.id) : -1;
    this.i = k >= 0 ? k : 0;
    this.poner(k >= 0 ? pos.t : 0);
  },
  poner(t = 0){
    const e = this.eps[this.i];
    $('#sinProg').hidden = true;
    if(!e){
      video.removeAttribute('src'); video.load(); video.hidden = true;
      $('#progQue').innerHTML = 'Anuncios de la escuela';
      return;
    }
    video.hidden = false;
    if(video.dataset.id !== e.id){ video.src = e.url; video.dataset.id = e.id; }
    try{ video.currentTime = t || 0; }catch(err){}
    $('#progQue').innerHTML = esc(e.nombre) + '<small>Radio Divergentes</small>';
    this.volumen();
    if(!this.enCorte && !this.pausado) video.play().catch(() => {});
  },
  volumen(){ video.volume = Math.max(0, Math.min(1, (this.bajo ? 0.12 : 1) * cfg.volumen)); video.muted = !Sonido.ac || Sonido.ac.state !== 'running'; },
  bajar(si){ this.bajo = si; this.volumen(); },
  pausar(si){
    this.pausado = si;
    if(si){ video.pause(); } else if(!this.enCorte && this.eps.length) video.play().catch(() => {});
  },
  async corte(){
    if(this.enCorte) return;
    const lista = activos();
    if(!lista.length) return;
    this.enCorte = true; video.pause(); this.desdeCorte = 0;
    $('#tercio').style.opacity = 0; document.querySelector('.bicho').style.opacity = 0;
    const canal = anuncios.find(a => a.id === cfg.canal) || anuncios[0];
    const piezas = [{ tipo: 'canal', a: canal, dur: 2.6 }];
    for(let k = 0; k < Math.min(cfg.porCorte, lista.length); k++){
      const a = lista[(cfg.sigAnuncio + k) % lista.length];
      piezas.push({ tipo: 'ident', a, dur: DURA_IDENT }, { tipo: 'anuncio', a, dur: DURA_ANUNCIO });
    }
    cfg.sigAnuncio = (cfg.sigAnuncio + Math.min(cfg.porCorte, lista.length)) % lista.length; guardarCfg();
    piezas.push({ tipo: 'canal', a: canal, dur: 2.2, regreso: true });
    for(const p of piezas) p.P = await prepararAnuncio(p.a);
    window.__corte = { piezas: piezas.map(p => p.tipo + ':' + p.a.id), t: Date.now() };
    await this.tanda(piezas);
    $('#tercio').style.opacity = 1; document.querySelector('.bicho').style.opacity = '';
    this.enCorte = false;
    if(this.eps.length && !this.pausado) video.play().catch(() => {});
  },
  tanda(piezas){
    return new Promise((fin) => {
      lienzo.hidden = false;
      const g = lienzo.getContext('2d');
      const medir = () => { const r = lienzo.getBoundingClientRect(), k = Math.min(2, devicePixelRatio || 1);
        const w = Math.max(320, Math.min(1920, Math.round(r.width * k))), h = Math.round(w * 9 / 16);
        if(lienzo.width !== w) lienzo.width = w; if(lienzo.height !== h) lienzo.height = h; };
      let i = -1, t0 = 0;
      const paso = (ahora) => {
        medir();
        if(i < 0 || (ahora - t0) / 1000 >= piezas[i].dur){
          i++; t0 = ahora;
          if(i >= piezas.length){ lienzo.hidden = true; fin(); return; }
          if(piezas[i].tipo !== 'anuncio') Sonido.cortinilla();
        }
        const p = piezas[i], t = (ahora - t0) / 1000, W = lienzo.width, H = lienzo.height;
        if(p.tipo === 'canal') dibujarIdent(g, W, H, t, p.P, { dur: p.dur, aterriza: false });
        else if(p.tipo === 'ident') dibujarIdent(g, W, H, t, p.P, { dur: p.dur, aterriza: true });
        else dibujarAnuncio(g, W, H, t, p.P, { dur: p.dur });
        requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    });
  },
};
/* el reloj del programa: cuenta lo que se ha visto para saber cuándo toca corte */
video.addEventListener('timeupdate', () => {
  const t = video.currentTime, d = t - Programa.ultimoT; Programa.ultimoT = t;
  if(d > 0 && d < 2) Programa.desdeCorte += d;
  $('#progBarra').style.width = (video.duration ? 100 * t / video.duration : 0) + '%';
  const e = Programa.eps[Programa.i];
  if(e && Math.round(t) % 5 === 0) try{ localStorage.setItem('fadori_tele_pos', JSON.stringify({ id: e.id, t })); }catch(err){}
  if(Programa.desdeCorte >= cfg.cadaMin * 60 && !avisando) Programa.corte();
});
video.addEventListener('ended', async () => {
  await Programa.corte();
  Programa.i = (Programa.i + 1) % Math.max(1, Programa.eps.length);
  Programa.poner(0);
});
video.addEventListener('error', () => { if(Programa.eps.length) $('#sinProg').hidden = false, $('#sinProg').textContent = 'Este video no se puede reproducir aquí. Cárgalo otra vez desde los ajustes.'; });
/* sin episodios, la tanda da vueltas sola para que la pantalla nunca esté vacía */
setInterval(() => { if(!Programa.eps.length && !Programa.enCorte && !Programa.pausado && !avisando) Programa.corte(); }, 1500);

/* ══════════════════════════════════════════════════════════════════════
   3 · EL MODO TABLET
   ═════════════════════════════════════════════════════════════════════ */
const capa = $('#kCapa'), marco = $('#kMarco');
let arrancado = false;
function tabletLista(){ return cfg.tablet && (F.motor() !== 'servidor' || !!F.llaveMostrador()); }
function pintarTablet(){ document.body.classList.toggle('con-tablet', !!tabletLista()); }
function precargar(){ if(tabletLista() && marco.getAttribute('src') === 'about:blank') marco.src = 'index.html?kiosco'; }
function abrirTablet(x, y){
  if(!tabletLista() || !capa.hidden) return;
  precargar();
  capa.style.transformOrigin = (x || innerWidth / 2) + 'px ' + (y || innerHeight / 2) + 'px';
  capa.hidden = false; capa.classList.remove('sale'); capa.classList.add('entra');
  Programa.pausar(true);
  try{ marco.contentWindow.KIOSCO && marco.contentWindow.KIOSCO.reiniciar(); }catch(e){}
  try{ marco.focus(); }catch(e){}
}
function cerrarTablet(pedidoId){
  if(capa.hidden) return;
  nuevoDeTablet = pedidoId || null;
  F.cargar(); pintarTurnos();
  /* el zoom: la app se encoge hacia donde salió su turno (o hacia el turno
     que ya puede pasar) y la pantalla llega de cerca a ese mismo punto */
  const blanco = (pedidoId && document.querySelector('[data-id="' + pedidoId + '"]')) || $('#llamando');
  const r = blanco.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  capa.style.transformOrigin = cx + 'px ' + cy + 'px';
  $('#tv').style.transformOrigin = cx + 'px ' + cy + 'px';
  capa.classList.remove('entra'); capa.classList.add('sale');
  const tv = $('#tv'); tv.classList.remove('regresa'); void tv.offsetWidth; tv.classList.add('regresa');
  setTimeout(() => { capa.hidden = true; capa.classList.remove('sale'); Programa.pausar(false); }, 600);
  setTimeout(() => { nuevoDeTablet = null; }, 2500);
}
window.addEventListener('message', (e) => {
  if(e.origin !== location.origin || !e.data || e.data.fadori !== 'kiosco-fin') return;
  cerrarTablet(e.data.pedido);
});
$('#kCerrar').addEventListener('click', () => { try{ marco.contentWindow.KIOSCO.reiniciar(); }catch(e){} cerrarTablet(null); });
$('#tv').addEventListener('click', (e) => {
  if(e.target.closest('button, a, dialog')) return;
  if(!arrancado){ arrancar(); return; }
  abrirTablet(e.clientX, e.clientY);
});

/* ── arrancar: sonido, pantalla completa y que no se apague ─────────── */
async function arrancar(){
  arrancado = true;
  $('#arranque').hidden = true; $('#bMudo').style.display = 'none';
  Sonido.despierta();
  try{ if(document.documentElement.requestFullscreen && !document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); }catch(e){}
  despierto();
  Programa.volumen();
  if(!Programa.enCorte && !Programa.pausado && Programa.eps.length) video.play().catch(() => {});
  precargar();
}
let bloqueo = null;
async function despierto(){ try{ if(navigator.wakeLock && !bloqueo){ bloqueo = await navigator.wakeLock.request('screen'); bloqueo.addEventListener('release', () => { bloqueo = null; }); } }catch(e){} }
document.addEventListener('visibilitychange', () => { if(!document.hidden && arrancado) despierto(); });
$('#bArranque').addEventListener('click', (e) => { e.stopPropagation(); arrancar(); });
$('#bMudo').addEventListener('click', (e) => { e.stopPropagation(); arrancar(); });

/* ══════════════════════════════════════════════════════════════════════
   LOS AJUSTES
   ═════════════════════════════════════════════════════════════════════ */
const dlg = $('#ajustes');
let editando = null, pedirPase = false;
$('#bAjustes').addEventListener('click', (e) => {
  e.stopPropagation();
  /* con el modo tablet prendido, los ajustes piden el pasador: la tablet la
     tocan todos */
  pedirPase = cfg.tablet && !F.pasoElPasador();
  pintarAjustes(); dlg.showModal();
});
$('#ajCerrar').addEventListener('click', () => dlg.close());
dlg.addEventListener('close', () => { Programa.pausar(!capa.hidden); });

function pintarAjustes(){
  const c = $('#ajCuerpo');
  if(pedirPase){
    c.innerHTML = '<h3>' + F.ico('shield-check') + 'Pasador de la cooperativa</h3><p class="aj-nota">La tablet está en modo pedir: los ajustes son sólo para la cooperativa.</p>' +
      '<div class="aj-fila"><input type="password" inputmode="numeric" id="ajPase" class="aj-pase" style="min-height:44px;border-radius:12px;border:1px solid var(--tv-linea);background:var(--tv-fondo);color:var(--tv-tinta);padding:0 12px;font:inherit;font-size:18px" placeholder="Pasador">' +
      '<button class="aj-btn fuerte" id="ajPaseOk" type="button">Entrar</button></div>';
    $('#ajPaseOk').onclick = () => { if(F.pasadorOk($('#ajPase').value)){ pedirPase = false; pintarAjustes(); } else { $('#ajPase').value = ''; $('#ajPase').placeholder = 'Ese no es'; } };
    return;
  }
  const chips = (clave, ops) => '<div class="aj-fila">' + ops.map(([v, t]) => '<button class="aj-chip" type="button" data-cfg="' + clave + '" data-v="' + v + '" aria-pressed="' + (String(cfg[clave]) === String(v)) + '">' + t + '</button>').join('') + '</div>';
  const sw = (clave, t) => '<label class="aj-sw"><span>' + t + '</span><input type="checkbox" data-sw="' + clave + '"' + (cfg[clave] ? ' checked' : '') + '></label>';
  const conLlave = F.motor() !== 'servidor' || !!F.llaveMostrador();
  c.innerHTML =
    '<h3>' + F.ico('film') + 'El programa</h3>' +
    '<p class="aj-nota">Los episodios se guardan en esta tablet y se repiten en orden. Uno de 30 minutos llena un recreo.</p>' +
    '<ul class="aj-lista" id="ajEps">' + (Programa.eps.length ? Programa.eps.map((e, k) =>
      '<li data-ep="' + e.id + '"><span><input type="text" data-nombre-ep="' + e.id + '" value="' + esc(e.nombre) + '" aria-label="Nombre del episodio"></span>' +
      '<button class="aj-btn" type="button" data-sube="' + e.id + '" aria-label="Subir"' + (k ? '' : ' disabled') + '>' + F.ico('arrow-up') + '</button>' +
      '<button class="aj-btn" type="button" data-quita="' + e.id + '" aria-label="Quitar">' + F.ico('trash') + '</button></li>').join('')
      : '<li><span>Todavía no hay episodios: mientras, pasan los anuncios de la escuela.</span></li>') + '</ul>' +
    '<div class="aj-fila" style="margin-top:10px"><label class="aj-btn fuerte" for="ajVideos">' + F.ico('upload') + 'Agregar episodios</label>' +
    '<input type="file" id="ajVideos" accept="video/*" multiple hidden>' +
    '<button class="aj-btn" type="button" id="ajSiguiente"' + (Programa.eps.length > 1 ? '' : ' disabled') + '>' + F.ico('skip-forward') + 'Pasar al siguiente</button></div>' +

    '<h3>' + F.ico('megaphone') + 'La tanda de anuncios</h3>' +
    '<p class="aj-nota">Anuncios de la escuela, nada de fuera. Se abre y se cierra con el logo que gira.</p>' +
    '<p class="aj-nota" style="margin-bottom:6px">Cada cuánto</p>' + chips('cadaMin', [[5, '5 min'], [8, '8 min'], [10, '10 min'], [15, '15 min']]) +
    '<p class="aj-nota" style="margin:12px 0 6px">Anuncios por tanda</p>' + chips('porCorte', [[1, '1'], [2, '2'], [3, '3']]) +
    '<p class="aj-nota" style="margin:12px 0 6px">El logo de la tanda</p>' + chips('canal', [['rembrandt', 'Rembrandt'], ['divergentes', 'Radio Divergentes'], ['fadori', 'Fadori'], ['grupo31', 'Grupo 3.1']]) +
    '<ul class="aj-lista" style="margin-top:12px">' + anuncios.map(a =>
      '<li style="flex-wrap:wrap"><span class="aj-color" style="background:' + esc(a.color) + '"></span><span><b>' + esc(a.marca) + '</b><small>' + esc(a.titulo) + (a.fecha ? ' · ' + esc(a.fecha) : '') + '</small></span>' +
      '<button class="aj-btn" type="button" data-edita="' + a.id + '">Editar</button>' +
      '<input type="checkbox" data-activo="' + a.id + '" aria-label="Pasar este anuncio"' + (a.activo !== false ? ' checked' : '') + ' style="width:24px;height:24px;accent-color:var(--tv-naranja)">' +
      '<div class="aj-edita" style="flex-basis:100%"' + (editando === a.id ? '' : ' hidden') + '>' +
        '<label>Título<input data-campo="titulo" data-de="' + a.id + '" value="' + esc(a.titulo) + '" maxlength="70"></label>' +
        '<label>Texto<input data-campo="texto" data-de="' + a.id + '" value="' + esc(a.texto) + '" maxlength="120"></label>' +
        '<label>Fecha o dato extra (opcional)<input data-campo="fecha" data-de="' + a.id + '" value="' + esc(a.fecha || '') + '" maxlength="40" placeholder="Viernes 24 · cancha 2"></label>' +
        '<div class="aj-fila"><label class="aj-btn" for="logo-' + a.id + '">' + F.ico('upload') + 'Cambiar el logo</label><input type="file" accept="image/*" id="logo-' + a.id + '" data-logo="' + a.id + '" hidden>' +
        '<button class="aj-btn" type="button" data-ver-anuncio="' + a.id + '">' + F.ico('play') + 'Verlo</button>' +
        (a.nuevo ? '<button class="aj-btn" type="button" data-borra-anuncio="' + a.id + '">' + F.ico('trash') + 'Borrar</button>' : '') + '</div>' +
      '</div></li>').join('') + '</ul>' +
    '<div class="aj-fila" style="margin-top:10px"><button class="aj-btn" type="button" id="ajNuevo">' + F.ico('plus') + 'Anuncio nuevo</button>' +
    '<button class="aj-btn fuerte" type="button" id="ajCorte">' + F.ico('play') + 'Ver una tanda ahora</button></div>' +

    '<h3>' + F.ico('volume-2') + 'Sonido</h3>' +
    sw('timbre', 'Timbre cuando un pedido está listo') + sw('voz', 'Decir el número de turno en voz alta') + sw('plancha', 'Un sonidito cuando la cocina toma un pedido') +
    '<label class="aj-sw"><span>Volumen del programa</span><input type="range" min="0" max="1" step="0.05" id="ajVol" value="' + cfg.volumen + '" style="width:160px;height:auto"></label>' +
    '<div class="aj-fila" style="margin-top:10px"><button class="aj-btn" type="button" id="ajProbar">' + F.ico('bell-ring') + 'Probar el timbre y la voz</button></div>' +

    '<h3>' + F.ico('smartphone') + 'Modo tablet: pedir aquí</h3>' +
    '<div class="aj-estado' + (tabletLista() ? ' bien' : '') + '">' + (tabletLista()
      ? 'Prendido. Quien toque la pantalla puede pedir desde aquí.'
      : cfg.tablet && !conLlave ? 'Prendido, pero falta el pasador de hoy: sin él, los pedidos no llegarían a la cooperativa.' : 'Apagado: la pantalla sólo enseña.') + '</div>' +
    (tabletLista()
      ? '<button class="aj-btn" type="button" id="ajTabletNo">Apagar el modo tablet</button>'
      : '<div class="aj-fila"><input type="password" inputmode="numeric" id="ajTabPase" style="min-height:44px;border-radius:12px;border:1px solid var(--tv-linea);background:var(--tv-fondo);color:var(--tv-tinta);padding:0 12px;font:inherit;font-size:18px;width:160px" placeholder="Pasador">' +
        '<button class="aj-btn fuerte" type="button" id="ajTabletSi">Prender el modo tablet</button></div><p class="aj-nota" id="ajTabMsg" style="margin-top:8px"></p>') +

    '<h3>' + F.ico('maximize') + 'Pantalla</h3>' +
    '<div class="aj-fila"><button class="aj-btn" type="button" id="ajCompleta">' + F.ico('maximize') + 'Pantalla completa</button></div>';
  conectarAjustes();
}
function conectarAjustes(){
  const c = $('#ajCuerpo');
  c.querySelectorAll('[data-cfg]').forEach(b => b.onclick = () => { const v = b.dataset.v; cfg[b.dataset.cfg] = /^\d+$/.test(v) ? +v : v; guardarCfg(); pintarAjustes(); });
  c.querySelectorAll('[data-sw]').forEach(i => i.onchange = () => { cfg[i.dataset.sw] = i.checked; guardarCfg(); });
  $('#ajVol').oninput = () => { cfg.volumen = +$('#ajVol').value; guardarCfg(); Programa.volumen(); };
  $('#ajProbar').onclick = () => { Sonido.despierta(); Sonido.timbre(); setTimeout(() => decir('Turno 75. Ana, tu pedido está listo.'), 1300); };
  $('#ajCompleta').onclick = async () => { try{ await document.documentElement.requestFullscreen(); }catch(e){} };
  $('#ajCorte').onclick = () => { dlg.close(); Programa.corte(); };
  $('#ajSiguiente').onclick = () => { Programa.i = (Programa.i + 1) % Programa.eps.length; Programa.poner(0); };
  $('#ajVideos').onchange = async (e) => {
    const fs = [...e.target.files]; e.target.value = '';
    const orden = (await leer('eps')) || [];
    for(const f of fs){
      const id = 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      await guardar('ep:' + id, { blob: f, nombre: bonito(f.name) }); orden.push(id);
    }
    await guardar('eps', orden); await Programa.cargar(); pintarAjustes();
  };
  c.querySelectorAll('[data-nombre-ep]').forEach(i => i.onchange = async () => {
    const id = i.dataset.nombreEp, g = await leer('ep:' + id); if(!g) return;
    g.nombre = i.value.trim() || g.nombre; await guardar('ep:' + id, g);
    const e = Programa.eps.find(x => x.id === id); if(e){ e.nombre = g.nombre; if(Programa.eps[Programa.i] === e) $('#progQue').innerHTML = esc(e.nombre) + '<small>Radio Divergentes</small>'; }
  });
  c.querySelectorAll('[data-sube]').forEach(b => b.onclick = async () => {
    const orden = (await leer('eps')) || [], k = orden.indexOf(b.dataset.sube);
    if(k > 0){ [orden[k - 1], orden[k]] = [orden[k], orden[k - 1]]; await guardar('eps', orden); await Programa.cargar(); pintarAjustes(); }
  });
  c.querySelectorAll('[data-quita]').forEach(b => b.onclick = async () => {
    if(!confirm('¿Quitar este episodio de la tablet?')) return;
    const orden = ((await leer('eps')) || []).filter(x => x !== b.dataset.quita);
    await guardar('ep:' + b.dataset.quita, undefined); await guardar('eps', orden); await Programa.cargar(); pintarAjustes();
  });
  c.querySelectorAll('[data-edita]').forEach(b => b.onclick = () => { editando = editando === b.dataset.edita ? null : b.dataset.edita; pintarAjustes(); });
  c.querySelectorAll('[data-activo]').forEach(i => i.onchange = () => cambiarAnuncio(i.dataset.activo, { activo: i.checked }));
  c.querySelectorAll('[data-campo]').forEach(i => i.onchange = () => cambiarAnuncio(i.dataset.de, { [i.dataset.campo]: i.value.trim() }));
  c.querySelectorAll('[data-logo]').forEach(i => i.onchange = async () => {
    const f = i.files[0]; if(!f) return;
    cambiarAnuncio(i.dataset.logo, { logoData: await achicar(f) });
  });
  c.querySelectorAll('[data-ver-anuncio]').forEach(b => b.onclick = async () => {
    const a = anuncios.find(x => x.id === b.dataset.verAnuncio); if(!a) return;
    dlg.close();
    const P = await prepararAnuncio(a);
    Programa.enCorte = true; video.pause();
    await Programa.tanda([{ tipo: 'ident', a, P, dur: DURA_IDENT }, { tipo: 'anuncio', a, P, dur: DURA_ANUNCIO }]);
    Programa.enCorte = false; if(Programa.eps.length) video.play().catch(() => {});
  });
  c.querySelectorAll('[data-borra-anuncio]').forEach(b => b.onclick = async () => {
    const g = (await leer('anuncios')) || {}; g.nuevos = (g.nuevos || []).filter(x => x.id !== b.dataset.borraAnuncio);
    await guardar('anuncios', g); await cargarAnuncios(); pintarAjustes();
  });
  $('#ajNuevo').onclick = async () => {
    const g = (await leer('anuncios')) || {}; g.nuevos = g.nuevos || [];
    const id = 'n' + Date.now().toString(36);
    g.nuevos.push({ id, nuevo: true, marca: 'Anuncio de la escuela', titulo: 'Escribe el título', texto: 'Y aquí el detalle', color: '#7C2D12', color2: '#2A0E05', acento: '#FFE8D6', icono: 'megaphone' });
    await guardar('anuncios', g); await cargarAnuncios(); editando = id; pintarAjustes();
  };
  const no = $('#ajTabletNo'); if(no) no.onclick = () => { cfg.tablet = false; guardarCfg(); pintarTablet(); pintarAjustes(); };
  const si = $('#ajTabletSi');
  if(si) si.onclick = async () => {
    const pase = $('#ajTabPase').value.trim(), msg = $('#ajTabMsg');
    if(F.motor() !== 'servidor'){
      if(!F.pasadorOk(pase)){ msg.textContent = 'Ese no es el pasador.'; return; }
    } else {
      si.disabled = true; msg.textContent = 'Revisando…';
      const r = await F.entrarMostrador(pase);
      si.disabled = false;
      if(!r.ok){ msg.textContent = r.sinRed ? 'Sin internet: el modo tablet necesita internet para mandar los pedidos.' : (r.error || 'Ese no es el pasador.'); return; }
      F.recordarPasador(pase); F.renovarPase();
    }
    cfg.tablet = true; guardarCfg(); pintarTablet(); precargar(); pintarAjustes();
  };
}
async function cambiarAnuncio(id, cambio){
  const g = (await leer('anuncios')) || {}; g.cambios = g.cambios || {}; g.nuevos = g.nuevos || [];
  const n = g.nuevos.find(x => x.id === id);
  if(n) Object.assign(n, cambio); else g.cambios[id] = Object.assign({}, g.cambios[id] || {}, cambio);
  await guardar('anuncios', g); await cargarAnuncios();
  if(cambio.logoData || cambio.activo !== undefined) pintarAjustes();
}
/* el logo que se sube se achica a 512 px: un PNG de 4 MB no hace falta */
async function achicar(f){
  const url = URL.createObjectURL(f), im = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = url; });
  URL.revokeObjectURL(url); if(!im) return '';
  const k = Math.min(1, 512 / Math.max(im.width, im.height)), c = document.createElement('canvas');
  c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}
/* «radio-divergentes-ep5.mp4» → «Episodio 5» */
function bonito(n){
  const b = String(n || '').replace(/\.[^.]+$/, '');
  const ep = b.match(/ep(?:isodio)?[\s_-]*(\d+)/i);
  if(ep) return 'Episodio ' + ep[1];
  return b.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^./, c => c.toUpperCase()) || 'Episodio';
}

/* ── el reloj y el arranque ─────────────────────────────────────────── */
function reloj(){
  const t = new Date();
  $('#reloj').textContent = t.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const r = $('#recreo');
  if(F.enRecreo()){ r.hidden = false; r.innerHTML = F.ico('clock') + 'Quedan ' + Math.ceil(F.quedanSegundosDeRecreo() / 60) + ' min de recreo'; }
  else r.hidden = true;
}
F.alCambiar(() => { F.cargar(); pintarTurnos(); });
addEventListener('storage', (e) => { if(e.key && e.key.indexOf('fadori') === 0){ F.cargar(); pintarTurnos(); } });
setInterval(() => { F.cargar(); pintarTurnos(); reloj(); pintarTablet(); }, 3000);
pintarTurnos(); reloj(); pintarTablet();
await cargarAnuncios();
await Programa.cargar();
/* la primera vez hay que tocar: sin un toque el navegador no deja sonar */
$('#arranque').hidden = false;
setTimeout(() => { if(!arrancado){ $('#arranque').hidden = true; $('#bMudo').style.display = 'inline-flex'; } }, 9000);
video.muted = true; if(Programa.eps.length) video.play().catch(() => {});

window.TELE = { Programa, cfg, anunciar, Sonido, abrirTablet, cerrarTablet, listo: true };
