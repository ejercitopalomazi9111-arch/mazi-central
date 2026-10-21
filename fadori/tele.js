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
import { enlace, leerID3, largoID3, YT } from './relleno.js';
import { montarPantalla } from './transmision.js';

const $ = (s) => document.querySelector(s);
const F = window.FADORI;
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
F.cargar();
document.querySelectorAll('[data-ico]').forEach(el => { el.innerHTML = F.ico(el.dataset.ico); });

/* ── ajustes de esta tablet ─────────────────────────────────────────── */
const LLAVE = 'fadori_tele';
const BASE = { cadaMin: 8, porCorte: 2, canal: 'rembrandt', timbre: true, voz: true, plancha: true, volumen: 0.9, tablet: false, sigAnuncio: 0, alAcabar: 'relleno', popCada: 3, recibir: true };
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
/* ── EL MOVIMIENTO DEL ACOMODO (Carlos, 10 de octubre) ─────────────────
   «Cada cambio en la disposición debe ser natural: que se cambie suavemente,
   con el texto, los elementos y las imágenes desplazándose, y lo que está
   apareciendo que entre desde fuera como si ya estuviese listo».
   Es la técnica FLIP: se mide dónde estaba cada cosa, se cambia, se mide
   dónde quedó y se le anima la diferencia (sólo transform y opacity, que no
   traban). Lo nuevo entra deslizándose desde fuera; lo que se va, se desliza
   hacia fuera antes de irse. Con «reducir movimiento», cambia sin animar. */
const CURVA = 'cubic-bezier(.22,.8,.24,1)';
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function flip(nodos, cambiar, { dur = 700, entra = 'derecha' } = {}){
  if(quieto()){ cambiar(); return; }
  const antes = new Map();
  nodos().forEach(e => { const r = e.getBoundingClientRect(); if(r.width) antes.set(e.dataset.flip || e, r); });
  cambiar();
  nodos().forEach(e => {
    const b = e.getBoundingClientRect(); if(!b.width) return;
    const a = antes.get(e.dataset.flip || e);
    if(a){
      /* del centro viejo al centro nuevo, con escala PAREJA: estirar a lo
         ancho y a lo alto por separado deforma las letras a media vuelta */
      const dx = (a.left + a.width / 2) - (b.left + b.width / 2), dy = (a.top + a.height / 2) - (b.top + b.height / 2);
      const k = Math.max(.5, Math.min(2, Math.min(a.width / b.width, a.height / b.height)));
      if(Math.abs(dx) + Math.abs(dy) < 1 && Math.abs(k - 1) < .01) return;
      e.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + k + ')' }, { transform: 'none' }], { duration: dur, easing: CURVA });
    } else {
      const desde = entra === 'abajo' ? 'translateY(40px)' : 'translateX(' + (b.left > innerWidth / 2 ? 60 : -60) + 'px)';
      e.animate([{ transform: desde, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: dur * 0.8, easing: CURVA });
    }
  });
}
/* pintar un bloque de turnos sólo si cambió; los números que se mueven se
   deslizan a su lugar nuevo y los que llegan entran desde fuera */
function pon(sel, html){
  const el = $(sel); if(el._html === html) return; el._html = html;
  flip(() => el.querySelectorAll('[data-id]').length ? [...el.querySelectorAll('[data-id]')].map(x => (x.dataset.flip = x.dataset.id, x)) : [],
    () => { el.innerHTML = html ? '<div class="encaje">' + html + '</div>' : ''; el.querySelectorAll('[data-id]').forEach(x => { x.dataset.flip = x.dataset.id; }); encajarTodo(); }, { dur: 600 });
  if(sel === '#llamando'){ const n = el.querySelector('.n, .sigue b'); if(n && !quieto()) n.animate([{ transform: 'translateY(30px) scale(.96)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 650, easing: CURVA }); }
}
/* QUE TODO QUEPA EN CUALQUIER PANTALLA (Carlos, 14 de octubre: «los
   próximos en fila se cortan», «los elementos se escalan mal en pantallas
   diferentes»). Cada bloque se encoge entero (zoom) hasta caber en el lugar
   que le toca, y si ni así, los números de la fila que sobran se cambian por
   «y N más» con la cuenta correcta. Antes la fila tenía un tope de alto con
   `overflow:hidden`: los números de abajo simplemente desaparecían. */
function encajar(el){
  const w = el && el.querySelector(':scope > .encaje'); if(!w || !el.offsetParent) return;
  w.style.zoom = 1;
  w.querySelectorAll('.numeros b[hidden]').forEach(b => { b.hidden = false; });
  const masFila = w.querySelector('.mas-calc'); if(masFila) masFila.remove();
  const tope = () => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    let fondo = r.bottom - parseFloat(cs.paddingBottom || 0) - parseFloat(cs.borderBottomWidth || 0);
    const clip = el.parentElement && el.parentElement.closest('.turnos, .siguen, .tv-cuerpo');
    if(clip) fondo = Math.min(fondo, clip.getBoundingClientRect().bottom);
    return fondo;
  };
  /* todo en medidas de pantalla: con zoom, scrollWidth viene en los px de
     adentro y nunca «cabía» */
  const cabe = () => { const r = w.getBoundingClientRect(); return r.bottom <= tope() + 1 && r.right <= el.getBoundingClientRect().right + 2; };
  let z = 1;
  while(!cabe() && z > 0.56){ z = Math.round((z - 0.06) * 100) / 100; w.style.zoom = z; }
  if(cabe()) return;
  /* la fila: fuera los números que no caben, y la cuenta de los que faltan */
  const nums = [...w.querySelectorAll('.numeros b')]; if(!nums.length) return;
  const total = Number(el.dataset.total) || nums.length;
  const viejo = w.querySelector('.mas'); if(viejo) viejo.hidden = true;
  const p = document.createElement('p'); p.className = 'mas mas-calc'; w.appendChild(p);
  for(let i = nums.length - 1; i > 0 && !cabe(); i--){
    nums[i].hidden = true;
    p.textContent = 'y ' + (total - i) + ' más';
  }
}
function encajarTodo(){ ['#llamando', '#bListos', '#bPrep', '#bFila'].forEach(s => encajar($(s))); }
addEventListener('resize', () => { clearTimeout(encajarTodo._t); encajarTodo._t = setTimeout(encajarTodo, 120); });

function pintarTurnos(){
  const d = F.estado();
  const listos = d.pedidos.filter(p => p.estado === 'listo').sort((a, b) => (b.listoEn || 0) - (a.listoEn || 0));
  const cola = F.colaOrdenada();
  const prep = cola.filter(p => p.estado === 'preparando');
  const fila = cola.filter(p => p.estado !== 'preparando');
  const antes = yaListos, antesPrep = yaPrep;
  yaListos = new Set(listos.map(p => p.id)); yaPrep = new Set(prep.map(p => p.id));

  const top = listos[0];
  /* Sin nadie listo NO decía nada útil: «Ya puede pasar» con la caja vacía
     (Carlos: «debería decir que la fila está libre y que pidan desde la
     app»). Ahora son tres casos: alguien listo, gente esperando, o libre. */
  const estadoDe = (p) => p.estado === 'preparando' ? 'preparando' : 'recibido, en la fila';
  pon('#llamando', top
    ? '<h2>' + F.ico('circle-check-big') + 'Ya puede pasar</h2><b class="n">' + esc(F.verTurno(top)) + '</b>' + (quien(top) ? '<span class="quien">' + esc(quien(top)) + '</span>' : '') +
      (pidio(top) ? '<span class="pidio">' + esc(pidio(top, 4)) + '</span>' : '')
    : cola.length
      ? '<h2>' + F.ico('chef-hat') + 'Preparando los pedidos</h2><span class="vacio">Aquí sale tu número cuando esté listo</span>' +
        '<span class="sigue">Sigue el<b>' + esc(F.verTurno(cola[0])) + '</b><small>' + estadoDe(cola[0]) + '</small></span>'
      : '<h2>' + F.ico('sparkles') + 'La fila está libre</h2><span class="libre">Pide desde la app</span>' +
        '<span class="vacio">Escanea el código, pide y pasa cuando salga tu número.</span><img class="qr-libre" src="qr/abrir.svg" alt="Código para abrir Fadori">');
  $('#llamando').classList.toggle('libre-ya', !top && !cola.length);
  $('#llamando').dataset.turno = top ? top.id : '';

  const ficha = (p, clase) => '<div class="ficha ' + clase + (p.id === nuevoDeTablet ? ' nueva' : '') + '" data-id="' + p.id + '"><b>' + esc(F.verTurno(p)) + '</b>' +
    '<span>' + esc([quien(p), pidio(p, 2)].filter(Boolean).join(' · ')) + '</span></div>';
  const otros = listos.slice(1);
  pon('#bListos', otros.length ? '<h3>' + F.ico('circle-check-big') + 'También listos</h3><div class="fichas">' +
    otros.slice(0, 3).map(p => ficha(p, 'lista')).join('') + '</div>' + (otros.length > 3 ? '<p class="mas">y ' + (otros.length - 3) + ' más</p>' : '') : '');
  pon('#bPrep', '<h3>' + F.ico('chef-hat') + 'Preparando <span class="cuenta">' + (prep.length || '') + '</span></h3>' +
    (prep.length ? '<div class="fichas">' + prep.slice(0, 2).map(p => ficha(p, 'prep')).join('') + '</div>' + (prep.length > 2 ? '<p class="mas">y ' + (prep.length - 2) + ' más</p>' : '')
      : '<p class="mas">Nada en la plancha</p>'));
  /* la fila: el primero (el que sigue) resaltado */
  $('#bFila').dataset.total = fila.length;
  pon('#bFila', '<h3>' + F.ico('hourglass') + 'Recibidos · en la fila <span class="cuenta">' + (fila.length || '') + '</span></h3>' +
    (fila.length ? '<div class="numeros">' + fila.slice(0, 40).map((p, i) => '<b data-id="' + p.id + '" class="' + (i === 0 ? 'primero' : '') + (p.id === nuevoDeTablet ? ' nueva' : '') + '">' + esc(F.verTurno(p)) + '</b>').join('') + '</div>' +
      (fila.length > 40 ? '<p class="mas">y ' + (fila.length - 40) + ' más</p>' : '') : '<p class="mas">Nadie esperando</p>'));

  /* lo nuevo: el timbre, la voz y el letrero grande */
  if(antes){
    const nuevos = listos.filter(p => !antes.has(p.id)).reverse();
    nuevos.forEach(p => anunciar(p));
    if(nuevos.length){ const c = $('#llamando'); c.classList.remove('brinca'); void c.offsetWidth; c.classList.add('brinca'); }
    if(antesPrep && cfg.plancha && prep.some(p => !antesPrep.has(p.id))) Sonido.tin();
  }
  pintarMini(listos, prep, fila);
  encajarTodo();
}
function pintarMini(listos, prep = [], fila = []){
  const top = listos[0];
  const grupo = (txt, cl, ps) => ps.length ? '<span class="k-est ' + cl + '"><small>' + txt + '</small>' + ps.slice(0, 4).map(p => '<i>' + esc(F.verTurno(p)) + '</i>').join('') + (ps.length > 4 ? '<em>+' + (ps.length - 4) + '</em>' : '') + '</span>' : '';
  const html = '<span class="k-est listo"><small>Ya puede pasar</small><b>' + (top ? esc(F.verTurno(top)) : '—') + '</b>' +
    listos.slice(1, 3).map(p => '<i>' + esc(F.verTurno(p)) + '</i>').join('') + '</span>' +
    grupo('Preparando', 'prep', prep) + grupo('En la fila', 'fila', fila);
  const k = $('#kMini'); if(k._html !== html){ k._html = html; k.innerHTML = html; }
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
/* LA VOZ NO SONABA (Carlos, 14 de octubre). La causa: el navegador sólo deja
   hablar a una página que alguien ya TOCÓ, y la pantalla arranca sola; a los
   9 s escondía el botón grande y la voz se quedaba bloqueada sin decir nada.
   Ahora cualquier toque la desbloquea (y el timbre), se dice una frase vacía
   para que Safari la suelte, y Chrome —que a veces se queda «en pausa»
   después de un rato— se despierta antes de cada aviso. */
let vozDesbloqueada = false;
function desbloquearVoz(){
  Sonido.despierta();
  if(vozDesbloqueada || !('speechSynthesis' in window)) return;
  try{ const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); vozDesbloqueada = true; }catch(e){}
}
['pointerdown', 'keydown', 'touchstart'].forEach(t => addEventListener(t, desbloquearVoz, { capture: true, passive: true }));
window.__dicho = [];
function decir(texto){
  window.__dicho.push(texto);
  if(!cfg.voz || !('speechSynthesis' in window)) return;
  try{
    if(speechSynthesis.paused) speechSynthesis.resume();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'es-MX'; u.rate = 0.95; u.pitch = 1; u.volume = 1;
    const v = vozLista || voz(); if(v) u.voice = v;
    u.onerror = (e) => { window.__vozError = e.error || 'error'; };
    speechSynthesis.speak(u);
  }catch(e){ window.__vozError = e.message; }
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
  /* número, nombre (si quien pidió lo eligió) y lo que pidió */
  const loQue = pidio(p, 3);
  setTimeout(() => decir('Turno ' + n + '. ' + (al ? al + ', ' : '') + 'tu pedido está listo' + (loQue ? ': ' + loQue.replace(/·/g, ',') : '') + '.'), cfg.timbre ? 1300 : 0);
  window.__ultimoAviso = { turno: n, alias: al, pidio: qu, t: Date.now() };
  setTimeout(() => { $('#llamado').classList.remove('sale'); setTimeout(siguienteAviso, 700); }, 6500);
}

/* ══════════════════════════════════════════════════════════════════════
   1 · EL PROGRAMA Y LA TANDA DE ANUNCIOS
   ═════════════════════════════════════════════════════════════════════ */
const video = $('#prog'), lienzo = $('#tanda');
let anuncios = [];
/* ANUNCIOS EN VIDEO · Carlos, 21 de octubre: «poder poner videos de anuncios».
   Un video que se sube en los ajustes (o en el teléfono, y llega por el buzón)
   entra a la tanda como un anuncio más: se prende, se apaga y se borra igual.
   Viven aparte (`anv` y `anv:<id>`) porque pesan; lo demás de los anuncios
   cabe en un renglón y viaja entero al servidor. */
let anunVideos = [];
async function cargarAnuncios(){
  anunVideos.forEach(v => URL.revokeObjectURL(v.url));
  const g = await leer('anuncios'), cambios = (g && g.cambios) || {};
  anunVideos = [];
  for(const id of ((await leer('anv')) || [])){
    const x = await leer('anv:' + id);
    if(x && x.blob) anunVideos.push(Object.assign({ id, video: true, marca: x.nombre, titulo: 'Anuncio en video', texto: '', color: '#1A1A1A', color2: '#000', acento: '#FFFFFF', icono: 'megaphone', url: URL.createObjectURL(x.blob), activo: true }, cambios[id] || {}));
  }
  anuncios = mezclarAnuncios(g).concat(anunVideos);
}
/* cuánto dura un video, sin pasarlo (tope de 2 minutos por anuncio) */
function durDeVideo(url){
  return new Promise(r => { const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true;
    const fin = (d) => { v.removeAttribute('src'); v.load(); r(d); };
    v.onloadedmetadata = () => fin(Math.min(120, isFinite(v.duration) && v.duration > 0 ? v.duration : 30)); v.onerror = () => fin(0); v.src = url;
    setTimeout(() => fin(30), 8000); });
}
const activos = () => anuncios.filter(a => a.activo !== false);

/* QUÉ PASA EN EL PROGRAMA, en orden (lo pidió Carlos el 10 de octubre):
     1 · los episodios NUEVOS del podcast — nuevo = todavía no se ha pasado
         completo en esta tablet;
     2 · cuando ya pasaron todos, «el relleno»: música o películas subidas a
         la tablet, videos o listas de YouTube, o Spotify con su carátula;
     3 · si no hay relleno (o así se eligió), los episodios otra vez;
     4 · si no hay nada de nada, la tanda de anuncios da vueltas sola.
   Un episodio nuevo que se sube a media música entra en cuanto se sube. */
const web = $('#progWeb'), portada = $('#portada');
const VISTOS = 'fadori_tele_vistos';
let vistos = {}; try{ vistos = JSON.parse(localStorage.getItem(VISTOS) || '{}') || {}; }catch(e){}
const guardarVistos = () => { try{ localStorage.setItem(VISTOS, JSON.stringify(vistos)); }catch(e){} };
/* Carlos, 21 de octubre: Radio Divergentes todavía no va en Fadori, así que
   la pantalla no lo nombra: un episodio es un episodio */
const DE = { ep: 'Programa', youtube: 'YouTube', spotify: 'Spotify' };
let dejarDeOir = null;
const Programa = {
  eps: [],              /* [{id, tipo:'ep', nombre, url}] */
  rell: [],             /* [{id, tipo:'archivo'|'youtube'|'spotify', nombre, ...}] */
  actual: null, desdeCorte: 0, ultimoT: 0, enCorte: false, pausado: false, bajo: false,
  /* lo que toca pasar ahora, según la regla de arriba */
  fuente(){
    const nuevos = this.eps.filter(e => !vistos[e.id]);
    if(nuevos.length) return nuevos;
    if(this.rell.length && cfg.alAcabar !== 'repetir') return this.rell;
    return this.eps.length ? this.eps : this.rell;
  },
  async cargar(){
    [...this.eps, ...this.rell].forEach(e => { if(e.url) URL.revokeObjectURL(e.url); if(e.tapa) URL.revokeObjectURL(e.tapa); });
    this.eps = []; this.rell = [];
    for(const id of ((await leer('eps')) || [])){ const g = await leer('ep:' + id); if(g && g.blob) this.eps.push({ id, tipo: 'ep', nombre: g.nombre, url: URL.createObjectURL(g.blob) }); }
    for(const id of ((await leer('relleno')) || [])){
      const g = await leer('rel:' + id); if(!g) continue;
      const r = Object.assign({ id }, g); delete r.blob; delete r.portada;
      if(g.blob) r.url = URL.createObjectURL(g.blob);
      if(g.portada) r.tapa = URL.createObjectURL(g.portada);
      this.rell.push(r);
    }
    let pos = null; try{ pos = JSON.parse(localStorage.getItem('fadori_tele_pos') || 'null'); }catch(e){}
    const lista = this.fuente();
    const k = pos ? lista.findIndex(e => e.id === pos.id) : -1;
    this.poner(k >= 0 ? lista[k] : (lista[0] || null), k >= 0 ? pos.t : 0);
  },
  esWeb(e = this.actual){ return !!e && (e.tipo === 'youtube' || e.tipo === 'spotify'); },
  poner(e, t = 0){
    this.actual = e || null;
    $('#sinProg').hidden = true;
    /* lo que no toca se apaga del todo: un YouTube escondido sigue sonando */
    if(!this.esWeb(e) && web.dataset.id){ web.src = 'about:blank'; web.dataset.id = ''; if(dejarDeOir) dejarDeOir(); }
    web.hidden = !this.esWeb(e);
    portada.hidden = !(e && e.tipo === 'archivo' && e.esAudio);
    if(!e){
      video.removeAttribute('src'); video.dataset.id = ''; video.load(); video.hidden = true;
      $('#progQue').innerHTML = 'Anuncios de la escuela';
      setTimeout(acomodar, 0);
      return;
    }
    setTimeout(acomodar, 0);
    const sub = e.tipo === 'archivo' ? (e.artista || (e.esAudio ? 'Música' : 'Película')) : DE[e.tipo];
    $('#progQue').innerHTML = esc(e.nombre) + '<small>' + esc(sub) + '</small>';
    if(this.esWeb(e)){
      video.pause(); video.hidden = true;
      if(video.dataset.id){ video.removeAttribute('src'); video.dataset.id = ''; video.load(); }
      if(web.dataset.id !== e.id){
        /* sin el toque de arranque el navegador sólo deja empezar en silencio */
        web.src = e.tipo === 'youtube' && !arrancado ? e.embed + '&mute=1' : e.embed;
        web.dataset.id = e.id;
        if(dejarDeOir) dejarDeOir();
        if(e.tipo === 'youtube') web.onload = () => { dejarDeOir = YT.escuchar(web); setTimeout(() => this.volumen(), 1500); };
      }
      if(this.enCorte || this.pausado) this.callar();
      return;
    }
    if(e.esAudio){
      $('#ptTapa').src = e.tapa || 'marca/icon-512.png';
      $('#ptFondo').style.backgroundImage = 'url("' + (e.tapa || 'marca/icon-512.png') + '")';
      portada.classList.toggle('sin-tapa', !e.tapa);
      $('#ptTitulo').textContent = e.nombre; $('#ptArtista').textContent = e.artista || '';
    }
    video.hidden = false;
    if(video.dataset.id !== e.id){ video.src = e.url; video.dataset.id = e.id; }
    try{ video.currentTime = t || 0; }catch(err){}
    this.volumen();
    if(!this.enCorte && !this.pausado) video.play().catch(() => {});
  },
  siguiente(){
    const lista = this.fuente();
    if(!lista.length){ this.poner(null); return; }
    const k = this.actual ? lista.findIndex(x => x.id === this.actual.id) : -1;
    this.poner(lista[(k + 1) % lista.length], 0);
  },
  /* se acabó lo que sonaba: si era episodio, ya no es nuevo; tanda y lo que sigue */
  async acabo(){
    const e = this.actual;
    if(e && e.tipo === 'ep'){ vistos[e.id] = Date.now(); guardarVistos(); }
    await this.corte();
    this.siguiente();
  },
  /* un episodio nuevo que llega a media música entra ya */
  revisar(){
    const nuevo = this.eps.find(e => !vistos[e.id]);
    if(nuevo && (!this.actual || this.actual.tipo !== 'ep')) this.poner(nuevo, 0);
  },
  volumen(){
    const v = Math.max(0, Math.min(1, (this.bajo ? 0.12 : 1) * cfg.volumen));
    video.volume = v; video.muted = !Sonido.ac || Sonido.ac.state !== 'running';
    if(this.actual && this.actual.tipo === 'youtube'){
      YT.mandar(web, 'setVolume', [Math.round(v * 100)]);
      YT.mandar(web, video.muted ? 'mute' : 'unMute');
    }
  },
  bajar(si){ this.bajo = si; this.volumen(); },
  /* callar y seguir: para la tanda, la tablet y los ajustes. Spotify no se
     deja pausar desde fuera, así que se quita y al volver se pone otra vez */
  callar(){
    video.pause();
    if(this.actual && this.actual.tipo === 'youtube') YT.mandar(web, 'pauseVideo');
    if(this.actual && this.actual.tipo === 'spotify'){ web.src = 'about:blank'; web.dataset.id = ''; }
  },
  seguir(){
    if(this.enCorte || this.pausado || !this.actual) return;
    if(this.actual.tipo === 'youtube'){ YT.mandar(web, 'playVideo'); this.volumen(); }
    else if(this.actual.tipo === 'spotify'){ if(!web.dataset.id) this.poner(this.actual); }
    else video.play().catch(() => {});
  },
  pausar(si){ this.pausado = si; if(si) this.callar(); else this.seguir(); },
  async corte(){
    if(this.enCorte) return;
    const lista = activos();
    if(!lista.length) return;
    this.enCorte = true; this.callar(); this.desdeCorte = 0; ocultarPop();
    if(solo){ acomodar(); await new Promise(r => setTimeout(r, quieto() ? 0 : 650)); }
    $('#tercio').style.opacity = 0; document.querySelector('.bicho').style.opacity = 0;
    const canal = anuncios.find(a => a.id === cfg.canal && a.id !== 'divergentes') || anuncios[0];   /* una tablet que ya lo tenía puesto ya no abre con Radio Divergentes */
    const piezas = [{ tipo: 'canal', a: canal, dur: 2.6 }];
    for(let k = 0; k < Math.min(cfg.porCorte, lista.length); k++){
      const a = lista[(cfg.sigAnuncio + k) % lista.length];
      if(a.video){ const d = await durDeVideo(a.url); if(d > 0) piezas.push({ tipo: 'video', a, dur: d }); continue; }
      piezas.push({ tipo: 'ident', a, dur: DURA_IDENT }, { tipo: 'anuncio', a, dur: DURA_ANUNCIO });
    }
    cfg.sigAnuncio = (cfg.sigAnuncio + Math.min(cfg.porCorte, lista.length)) % lista.length; guardarCfg();
    piezas.push({ tipo: 'canal', a: canal, dur: 2.2, regreso: true });
    for(const p of piezas) if(p.tipo !== 'video') p.P = await prepararAnuncio(p.a);
    window.__corte = { piezas: piezas.map(p => p.tipo + ':' + p.a.id), t: Date.now() };
    await this.tanda(piezas);
    $('#tercio').style.opacity = 1; document.querySelector('.bicho').style.opacity = '';
    this.enCorte = false;
    this.seguir();
    acomodar();
  },
  tanda(piezas){
    return new Promise((fin) => {
      lienzo.hidden = false;
      const g = lienzo.getContext('2d');
      const medir = () => { const r = lienzo.getBoundingClientRect(), k = Math.min(2, devicePixelRatio || 1);
        const w = Math.max(320, Math.min(1920, Math.round(r.width * k))), h = Math.round(w * 9 / 16);
        if(lienzo.width !== w) lienzo.width = w; if(lienzo.height !== h) lienzo.height = h; };
      let i = -1, t0 = 0;
      /* el anuncio en video se pinta en el mismo lienzo (así le tocan igual la
         cortinilla y el marco), con su sonido y de borde a borde sin deformarse */
      const vid = $('#tandaVid') || Object.assign(document.createElement('video'), { id: 'tandaVid', playsInline: true, hidden: true });
      if(!vid.isConnected){ vid.setAttribute('playsinline', ''); document.body.appendChild(vid); }
      const pararVid = () => { vid.pause(); vid.onended = vid.onerror = null; };
      const paso = (ahora) => {
        medir();
        if(i < 0 || (ahora - t0) / 1000 >= piezas[i].dur || piezas[i].acabo){
          if(i >= 0 && piezas[i].tipo === 'video') pararVid();
          i++; t0 = ahora;
          if(i >= piezas.length){ lienzo.hidden = true; fin(); return; }
          if(piezas[i].tipo === 'canal' || piezas[i].tipo === 'ident') Sonido.cortinilla();
          if(piezas[i].tipo === 'video'){
            const p = piezas[i];
            vid.src = p.a.url; vid.currentTime = 0;
            vid.volume = Math.max(0, Math.min(1, cfg.volumen)); vid.muted = !Sonido.ac || Sonido.ac.state !== 'running';
            vid.onended = vid.onerror = () => { p.acabo = true; };
            vid.play().catch(() => { p.acabo = true; });
          }
        }
        const p = piezas[i], t = (ahora - t0) / 1000, W = lienzo.width, H = lienzo.height;
        if(p.tipo === 'video'){
          g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
          if(vid.videoWidth){ const k = Math.min(W / vid.videoWidth, H / vid.videoHeight), w = vid.videoWidth * k, h = vid.videoHeight * k; g.drawImage(vid, (W - w) / 2, (H - h) / 2, w, h); }
        }
        else if(p.tipo === 'canal') dibujarIdent(g, W, H, t, p.P, { dur: p.dur, aterriza: false });
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
  const e = Programa.actual;
  if(e && Math.round(t) % 5 === 0) try{ localStorage.setItem('fadori_tele_pos', JSON.stringify({ id: e.id, t })); }catch(err){}
  if(Programa.desdeCorte >= cfg.cadaMin * 60 && !avisando && capa.hidden && !enVivo) Programa.corte();
});
video.addEventListener('ended', () => Programa.acabo());
video.addEventListener('error', () => { if(Programa.actual && !Programa.esWeb()) $('#sinProg').hidden = false, $('#sinProg').textContent = 'Este archivo no se puede reproducir aquí. Cárgalo otra vez desde los ajustes.'; });
/* YouTube y Spotify no avisan del tiempo como un video: se cuenta a mano */
setInterval(() => {
  if(!Programa.esWeb() || Programa.enCorte || Programa.pausado) return;
  Programa.desdeCorte += 1;
  $('#progBarra').style.width = '0%';
  if(Programa.desdeCorte >= cfg.cadaMin * 60 && !avisando && capa.hidden && !enVivo) Programa.corte();
}, 1000);
/* YouTube dice cuándo acabó (el video, o la lista entera) */
addEventListener('message', (e) => {
  if(YT.ORIGENES.indexOf(e.origin) < 0 || e.source !== web.contentWindow) return;
  if(YT.estado(e.data) === 0 && Programa.actual && Programa.actual.tipo === 'youtube' && !Programa.enCorte) Programa.acabo();
});
/* SIN NADA QUE PASAR (Carlos: «si no hay nada reproduciéndose, simplemente
   pon los turnos en grande y bien acomodados»): la pantalla se vuelve sólo
   turnos. La tanda de anuncios sigue saliendo cada `cadaMin` minutos: el
   programa entra deslizándose, pasa la tanda y se vuelve a ir. */
let solo = null, desdeSolo = 0, enVivo = false;
function acomodar(){
  const quiere = !Programa.actual && !Programa.enCorte && !enVivo;
  if(quiere === solo) return;
  const primera = solo === null; solo = quiere;
  const bloques = () => [...document.querySelectorAll('.escenario, .turnos, .siguen, #llamando, #bPrep, #bFila, #bListos')];
  if(primera){ document.body.classList.toggle('solo-turnos', quiere); return; }
  if(quiere){
    /* el programa se va deslizando hacia fuera antes de esconderse */
    const esc = document.querySelector('.escenario');
    const a = quieto() ? null : esc.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateX(-80px)', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
    const seguir = () => { flip(bloques, () => document.body.classList.add('solo-turnos')); if(a) a.cancel(); };
    if(a) a.onfinish = seguir; else seguir();
  } else flip(bloques, () => document.body.classList.remove('solo-turnos'));
}
setInterval(() => {
  acomodar();
  if(Programa.actual || Programa.enCorte || Programa.pausado || avisando || enVivo){ desdeSolo = 0; return; }
  desdeSolo += 1;
  if(desdeSolo >= cfg.cadaMin * 60 && capa.hidden){ desdeSolo = 0; Programa.corte(); }
}, 1000);

/* ── el aviso de Fadori a un lado ───────────────────────────────────────
   Lo pidió Carlos: «anuncios tipo pop up durante el podcast como lo que hace
   Fadori al entrar, pero en un lateral, sin estorbar demasiado y dando
   visibilidad a la app». Es la misma hamburguesa que se arma al abrir la
   app, en chiquito, con el QR. Sale cada `popCada` minutos de programa,
   dura 11 s y nunca encima de la tanda, del letrero de turno ni de la tablet. */
const pop = $('#popFadori');
const FRASES_POP = [
  ['Pide desde tu celular', 'y pasa cuando tu número salga en verde'],
  ['Sin hacer fila', 'escanea el código y pide'],
  ['¿Ya tienes hambre?', 'tu pedido puede ir en camino'],
];
let desdePop = 0, fraseK = 0, popTimer = null;
function verPop(){
  if(!pop || Programa.enCorte || avisando || !capa.hidden) return false;
  const [a, b] = FRASES_POP[fraseK++ % FRASES_POP.length];
  $('#popUno').textContent = a;
  $('#popDos').textContent = tabletLista() ? b + ', o toca la pantalla' : b;
  /* la hamburguesa se vuelve a armar desde cero cada vez */
  const viejo = pop.querySelector('.burger'), nuevo = viejo.cloneNode(true); viejo.replaceWith(nuevo);
  /* con una canción, la carátula está a la izquierda: el aviso sale por la derecha */
  pop.classList.toggle('derecha', !portada.hidden);
  portada.classList.toggle('con-pop', !portada.hidden);
  pop.classList.remove('sale'); void pop.offsetWidth; pop.classList.add('sale');
  pop.setAttribute('aria-hidden', 'false');
  window.__pop = { t: Date.now(), frase: a };
  clearTimeout(popTimer); popTimer = setTimeout(ocultarPop, 11000);
  return true;
}
function ocultarPop(){ clearTimeout(popTimer); portada.classList.remove('con-pop'); if(pop){ pop.classList.remove('sale'); pop.setAttribute('aria-hidden', 'true'); } }
setInterval(() => {
  if(!cfg.popCada || Programa.enCorte || Programa.pausado || !capa.hidden) return;
  if(++desdePop >= cfg.popCada * 60){ if(verPop()) desdePop = 0; }
}, 1000);

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
  /* EL PROGRAMA NO SE CALLA (Carlos, 14 de octubre: «el audio de reproducción
     y el próximo turno por pasar no deben desaparecer jamás en ese modo, y el
     video debería hacerse chico y ponerse en una esquina»). Antes se pausaba
     todo al abrir la tablet. Ahora el video se encoge a una esquina con su
     sonido, y la tira de arriba sigue diciendo quién pasa, quién se prepara y
     quién está en la fila. La tanda de anuncios espera a que se cierre. */
  $('#tv').classList.remove('regresa');
  document.body.classList.add('con-pip');
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
  document.body.classList.remove('con-pip');
  setTimeout(() => { capa.hidden = true; capa.classList.remove('sale'); }, 600);
  setTimeout(() => { nuevoDeTablet = null; }, 2500);
}
window.addEventListener('message', (e) => {
  if(e.origin !== location.origin || !e.data) return;
  if(e.data.fadori === 'kiosco-fin') cerrarTablet(e.data.pedido);
  if(e.data.fadori === 'kiosco-mostrador') irAlMostrador();
});
/* La puerta escondida al mostrador: dos segundos con el dedo sobre «Fadori.»
   en la tablet (o sobre el logo de la pantalla) → pad del pasador → mostrador.
   Lo pidió Carlos para el de la cooperativa que voltea la tablet hacia la caja. */
let yendo = false;
async function irAlMostrador(){
  if(yendo) return; yendo = true;
  const ok = await pedirPasador('Abrir el mostrador', 'Para despachar desde esta tablet. Pon el pasador de la cooperativa.');
  yendo = false;
  if(!ok) return;
  window.__alMostrador = true;
  location.href = 'mostrador.html?desde=pantalla';
}
(function(){
  const logo = document.querySelector('.tv-logo'); if(!logo) return;
  let t = null;
  const suelta = () => { clearTimeout(t); t = null; };
  logo.addEventListener('pointerdown', (e) => { e.stopPropagation(); suelta(); t = setTimeout(() => { suelta(); irAlMostrador(); }, 2000); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => logo.addEventListener(ev, suelta));
  logo.addEventListener('click', (e) => e.stopPropagation());
  logo.addEventListener('contextmenu', (e) => e.preventDefault());
  logo.draggable = false; logo.style.touchAction = 'none'; logo.style.webkitUserSelect = 'none';
})();
$('#kCerrar').addEventListener('click', () => { try{ marco.contentWindow.KIOSCO.reiniciar(); marco.contentWindow.KIOSCO.dormir(); }catch(e){} cerrarTablet(null); });
$('#tv').addEventListener('click', (e) => {
  if(e.target.closest('button, a, dialog')) return;
  if(!arrancado){ arrancar(); return; }
  abrirTablet(e.clientX, e.clientY);
});

/* ── arrancar: sonido, pantalla completa y que no se apague ─────────── */
async function arrancar(){
  arrancado = true;
  $('#arranque').hidden = true; $('#bMudo').style.display = 'none';
  desbloquearVoz();
  try{ if(document.documentElement.requestFullscreen && !document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); }catch(e){}
  despierto();
  Programa.volumen();
  /* YouTube empezó en silencio por no haber toque: ahora sí con sonido */
  if(Programa.actual && Programa.actual.tipo === 'youtube'){ web.dataset.id = ''; Programa.poner(Programa.actual); }
  else Programa.seguir();
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
  Nube.revisar();
});
$('#ajCerrar').addEventListener('click', () => dlg.close());
dlg.addEventListener('close', () => { Programa.pausar(enVivo); });

function pintarAjustes(){
  const c = $('#ajCuerpo');
  if(pedirPase){
    c.innerHTML = '<h3>' + F.ico('shield-check') + 'Pasador de la cooperativa</h3><p class="aj-nota">La tablet está en modo pedir: los ajustes son sólo para la cooperativa.</p>' +
      '<div class="aj-fila"><button class="aj-btn fuerte" id="ajPaseOk" type="button">' + F.ico('lock') + 'Poner el pasador</button></div>';
    $('#ajPaseOk').onclick = async () => { if(await pedirPasador('Ajustes de la pantalla')){ pedirPase = false; pintarAjustes(); } };
    return;
  }
  const chips = (clave, ops) => '<div class="aj-fila">' + ops.map(([v, t]) => '<button class="aj-chip" type="button" data-cfg="' + clave + '" data-v="' + v + '" aria-pressed="' + (String(cfg[clave]) === String(v)) + '">' + t + '</button>').join('') + '</div>';
  const sw = (clave, t) => '<label class="aj-sw"><span>' + t + '</span><input type="checkbox" data-sw="' + clave + '"' + (cfg[clave] ? ' checked' : '') + '></label>';
  const conLlave = F.motor() !== 'servidor' || !!F.llaveMostrador();
  c.innerHTML =
    '<h3>' + F.ico('film') + 'El programa</h3>' +
    '<p class="aj-nota">Primero pasan los episodios <b>nuevos</b>, una vez cada uno. Se guardan en esta tablet; uno de 30 minutos llena un recreo.</p>' +
    '<ul class="aj-lista" id="ajEps">' + (Programa.eps.length ? Programa.eps.map((e, k) =>
      '<li data-ep="' + e.id + '"><span><input type="text" data-nombre-ep="' + e.id + '" value="' + esc(e.nombre) + '" aria-label="Nombre del episodio">' +
      '<small>' + (vistos[e.id] ? 'Ya se pasó' : '<b style="color:var(--tv-naranja)">Nuevo</b>') + (Programa.actual && Programa.actual.id === e.id ? ' · al aire' : '') + '</small></span>' +
      (vistos[e.id] ? '<button class="aj-btn" type="button" data-renueva="' + e.id + '" title="Que vuelva a pasar como nuevo">' + F.ico('rotate-ccw') + '</button>' : '') +
      '<button class="aj-btn" type="button" data-sube="' + e.id + '" aria-label="Subir"' + (k ? '' : ' disabled') + '>' + F.ico('arrow-up') + '</button>' +
      '<button class="aj-btn" type="button" data-quita="' + e.id + '" aria-label="Quitar">' + F.ico('trash') + '</button></li>').join('')
      : '<li><span>Todavía no hay episodios.</span></li>') + '</ul>' +
    '<div class="aj-fila" style="margin-top:10px"><label class="aj-btn fuerte" for="ajVideos">' + F.ico('upload') + 'Agregar episodios</label>' +
    '<input type="file" id="ajVideos" accept="video/*" multiple hidden>' +
    '<button class="aj-btn" type="button" id="ajSiguiente"' + (Programa.fuente().length > 1 ? '' : ' disabled') + '>' + F.ico('skip-forward') + 'Pasar al siguiente</button></div>' +

    '<p class="aj-nota" style="margin-top:10px">' + (Nube.activa()
      ? F.ico('upload') + ' Lo que agregues aquí <b>llega solo a las otras pantallas</b> (súbelo desde tu teléfono y la tablet lo baja).'
      : 'Para que lo que subas llegue a las otras pantallas, esta pantalla necesita el pasador de la cooperativa.' +
        (F.motor() === 'servidor' ? ' <button class="aj-btn" type="button" id="ajNubePase" style="margin-top:6px">' + F.ico('lock') + 'Poner el pasador</button>' : '')) + '</p>' +
    '<p class="aj-nota" id="ajNube" aria-live="polite" style="font-weight:800">' + esc(Nube.estado) + '</p>' +
    (Nube.activa() ? '<div class="aj-fila"><button class="aj-btn" type="button" id="ajRevisar">' + F.ico('rotate-ccw') + 'Revisar si hay algo nuevo</button></div>' : '') +
    chips('recibir', [[true, 'Esta pantalla baja lo que se sube'], [false, 'No bajar nada aquí']]) +

    '<h3>' + F.ico('music') + 'Si no hay episodio nuevo</h3>' +
    '<p class="aj-nota">Cuando ya pasaron todos los nuevos:</p>' + chips('alAcabar', [['relleno', 'Poner música y videos'], ['repetir', 'Repetir los episodios']]) +
    '<ul class="aj-lista" id="ajRell" style="margin-top:12px">' + (Programa.rell.length ? Programa.rell.map((r, k) =>
      '<li data-rel="' + r.id + '">' + (r.tapa ? '<img src="' + r.tapa + '" alt="" style="width:40px;height:40px;border-radius:8px;object-fit:cover;flex:none">'
        : '<span class="aj-color" style="width:40px;height:40px;border-radius:8px;display:grid;place-items:center;background:var(--tv-fondo)">' + F.ico(r.tipo === 'youtube' ? 'video' : r.tipo === 'spotify' ? 'list-music' : r.esAudio ? 'music' : 'clapperboard') + '</span>') +
      '<span><input type="text" data-nombre-rel="' + r.id + '" value="' + esc(r.nombre) + '" aria-label="Nombre"><small>' +
        esc(r.tipo === 'archivo' ? (r.esAudio ? 'Música' + (r.artista ? ' · ' + r.artista : '') : 'Película o video') : DE[r.tipo]) + (Programa.actual && Programa.actual.id === r.id ? ' · al aire' : '') + '</small></span>' +
      '<button class="aj-btn" type="button" data-rsube="' + r.id + '" aria-label="Subir"' + (k ? '' : ' disabled') + '>' + F.ico('arrow-up') + '</button>' +
      '<button class="aj-btn" type="button" data-rquita="' + r.id + '" aria-label="Quitar">' + F.ico('trash') + '</button></li>').join('')
      : '<li><span>Nada todavía. Sube música o películas, o pega un enlace.</span></li>') + '</ul>' +
    '<div class="aj-fila" style="margin-top:10px"><label class="aj-btn fuerte" for="ajRelArch">' + F.ico('upload') + 'Subir música o película</label>' +
    '<input type="file" id="ajRelArch" accept="audio/*,video/*" multiple hidden></div>' +
    '<div class="aj-fila" style="margin-top:8px"><input type="url" id="ajRelUrl" placeholder="Pega un enlace de YouTube o Spotify" style="flex:1;min-width:220px;min-height:44px;border-radius:12px;border:1px solid var(--tv-linea);background:var(--tv-fondo);color:var(--tv-tinta);padding:0 12px;font:inherit">' +
    '<button class="aj-btn" type="button" id="ajRelAgrega">' + F.ico('link') + 'Agregar</button></div>' +
    '<p class="aj-nota" id="ajRelMsg" style="margin-top:8px">YouTube pasa el video con su sonido. <b>Spotify</b> enseña la carátula; sin una cuenta de Spotify abierta en este navegador sólo deja oír 30 segundos por canción, y hay que tocar ▶ una vez en la pantalla.</p>' +

    '<h3>' + F.ico('sparkles') + 'El aviso de Fadori a un lado</h3>' +
    '<p class="aj-nota">Durante el programa sale a un lado, sin tapar, la hamburguesa armándose con el código para pedir.</p>' +
    chips('popCada', [[2, 'Cada 2 min'], [3, 'Cada 3 min'], [5, 'Cada 5 min'], [0, 'Nunca']]) +
    '<div class="aj-fila" style="margin-top:8px"><button class="aj-btn" type="button" id="ajPop">' + F.ico('play') + 'Verlo ahora</button></div>' +

    '<h3>' + F.ico('megaphone') + 'La tanda de anuncios</h3>' +
    '<p class="aj-nota">Anuncios de la escuela, nada de fuera. Se abre y se cierra con el logo que gira.</p>' +
    '<p class="aj-nota" style="margin-bottom:6px">Cada cuánto</p>' + chips('cadaMin', [[5, '5 min'], [8, '8 min'], [10, '10 min'], [15, '15 min']]) +
    '<p class="aj-nota" style="margin:12px 0 6px">Anuncios por tanda</p>' + chips('porCorte', [[1, '1'], [2, '2'], [3, '3']]) +
    '<p class="aj-nota" style="margin:12px 0 6px">El logo de la tanda</p>' + chips('canal', [['rembrandt', 'Rembrandt'], ['fadori', 'Fadori'], ['grupo31', 'Grupo 3.1']]) +
    '<ul class="aj-lista" style="margin-top:12px">' + anuncios.map(a => a.video
      ? '<li><span class="aj-color" style="width:40px;height:40px;border-radius:8px;display:grid;place-items:center;background:var(--tv-fondo)">' + F.ico('clapperboard') + '</span>' +
        '<span><b>' + esc(a.marca) + '</b><small>Anuncio en video</small></span>' +
        '<button class="aj-btn" type="button" data-ver-video="' + a.id + '">' + F.ico('play') + 'Verlo</button>' +
        '<button class="aj-btn" type="button" data-borra-video="' + a.id + '" aria-label="Borrar">' + F.ico('trash') + '</button>' +
        '<input type="checkbox" data-activo="' + a.id + '" aria-label="Pasar este anuncio"' + (a.activo !== false ? ' checked' : '') + ' style="width:24px;height:24px;accent-color:var(--tv-naranja)"></li>'
      : '<li style="flex-wrap:wrap"><span class="aj-color" style="background:' + esc(a.color) + '"></span><span><b>' + esc(a.marca) + '</b><small>' + esc(a.titulo) + (a.fecha ? ' · ' + esc(a.fecha) : '') + '</small></span>' +
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
    '<label class="aj-btn" for="ajAnunVideo">' + F.ico('upload') + 'Anuncio en video</label><input type="file" id="ajAnunVideo" accept="video/*" multiple hidden>' +
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
      : '<div class="aj-fila"><button class="aj-btn fuerte" type="button" id="ajTabletSi">' + F.ico('lock') + 'Prender el modo tablet</button></div><p class="aj-nota" style="margin-top:8px">Pide el pasador de la cooperativa, con el pad de números.</p>') +

    '<h3>' + F.ico('maximize') + 'Pantalla</h3>' +
    '<div class="aj-fila"><button class="aj-btn" type="button" id="ajCompleta">' + F.ico('maximize') + 'Pantalla completa</button></div>';
  conectarAjustes();
}
function conectarAjustes(){
  const c = $('#ajCuerpo');
  c.querySelectorAll('[data-cfg]').forEach(b => b.onclick = () => {
    const v = b.dataset.v; cfg[b.dataset.cfg] = v === 'true' ? true : v === 'false' ? false : /^\d+$/.test(v) ? +v : v; guardarCfg();
    if(b.dataset.cfg === 'recibir' && cfg.recibir) Nube.revisar();
    /* si lo que suena ya no toca con la regla nueva, se cambia ya */
    if(b.dataset.cfg === 'alAcabar' && Programa.actual && Programa.fuente().indexOf(Programa.actual) < 0) Programa.siguiente();
    pintarAjustes();
  });
  c.querySelectorAll('[data-sw]').forEach(i => i.onchange = () => { cfg[i.dataset.sw] = i.checked; guardarCfg(); });
  $('#ajVol').oninput = () => { cfg.volumen = +$('#ajVol').value; guardarCfg(); Programa.volumen(); };
  $('#ajProbar').onclick = () => { Sonido.despierta(); Sonido.timbre(); setTimeout(() => decir('Turno 75. Ana, tu pedido está listo.'), 1300); };
  $('#ajCompleta').onclick = async () => { try{ await document.documentElement.requestFullscreen(); }catch(e){} };
  $('#ajCorte').onclick = () => { dlg.close(); Programa.corte(); };
  $('#ajSiguiente').onclick = () => { Programa.siguiente(); pintarAjustes(); };
  $('#ajPop').onclick = () => { dlg.close(); setTimeout(verPop, 300); };
  const np = $('#ajNubePase'); if(np) np.onclick = async () => { if(await pedirPasador('Mandar a las otras pantallas')) pintarAjustes(); };
  c.querySelectorAll('[data-renueva]').forEach(b => b.onclick = () => { delete vistos[b.dataset.renueva]; guardarVistos(); Programa.revisar(); pintarAjustes(); });
  /* el relleno: archivos de la tablet y enlaces */
  $('#ajRelArch').onchange = async (e) => {
    const fs = [...e.target.files]; e.target.value = '';
    const orden = (await leer('relleno')) || [], subidos = [];
    for(const f of fs){
      const id = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const esAudio = /^audio\//.test(f.type) || /\.(mp3|m4a|aac|wav|ogg|flac)$/i.test(f.name);
      const g = { tipo: 'archivo', blob: f, esAudio, nombre: f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Sin nombre' };
      if(esAudio){
        /* la carátula y el nombre de la canción vienen dentro del MP3 */
        try{
          const n = largoID3(new Uint8Array(await f.slice(0, 10).arrayBuffer()));
          if(n){ const t = leerID3(new Uint8Array(await f.slice(0, Math.min(n, 12e6)).arrayBuffer()));
            if(t.titulo) g.nombre = t.titulo; if(t.artista) g.artista = t.artista;
            if(t.portada) g.portada = new Blob([t.portada.bytes], { type: t.portada.mime }); }
        }catch(err){}
      }
      await guardar('rel:' + id, g); orden.push(id); subidos.push([id, g]);
    }
    await guardar('relleno', orden); await Programa.cargar(); pintarAjustes();
    for(const [id, g] of subidos) await Nube.subir(id, 'rel', g);
  };
  $('#ajRelAgrega').onclick = async () => {
    const r = enlace($('#ajRelUrl').value, { origen: location.origin });
    if(!r){ $('#ajRelMsg').textContent = 'Ese enlace no es de YouTube ni de Spotify. Cópialo con «Compartir → Copiar enlace».'; return; }
    const id = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const orden = (await leer('relleno')) || [];
    const g = Object.assign(r, { fuente: $('#ajRelUrl').value.trim() });
    await guardar('rel:' + id, g); orden.push(id);
    await guardar('relleno', orden); await Programa.cargar(); pintarAjustes();
    Nube.subir(id, 'rel', g);
  };
  c.querySelectorAll('[data-nombre-rel]').forEach(i => i.onchange = async () => {
    const id = i.dataset.nombreRel, g = await leer('rel:' + id); if(!g) return;
    g.nombre = i.value.trim() || g.nombre; await guardar('rel:' + id, g);
    const r = Programa.rell.find(x => x.id === id); if(r) r.nombre = g.nombre;
  });
  c.querySelectorAll('[data-rsube]').forEach(b => b.onclick = async () => {
    const orden = (await leer('relleno')) || [], k = orden.indexOf(b.dataset.rsube);
    if(k > 0){ [orden[k - 1], orden[k]] = [orden[k], orden[k - 1]]; await guardar('relleno', orden); await Programa.cargar(); pintarAjustes(); }
  });
  c.querySelectorAll('[data-rquita]').forEach(b => b.onclick = async () => {
    if(!otraVez(b)) return;
    const orden = ((await leer('relleno')) || []).filter(x => x !== b.dataset.rquita);
    const p = Nube.borrar(b.dataset.rquita);
    await guardar('rel:' + b.dataset.rquita, undefined); await guardar('relleno', orden); await Programa.cargar(); pintarAjustes(); await p;
  });
  $('#ajVideos').onchange = async (e) => {
    const fs = [...e.target.files]; e.target.value = '';
    const orden = (await leer('eps')) || [], subidos = [];
    for(const f of fs){
      const id = 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), g = { blob: f, nombre: bonito(f.name) };
      await guardar('ep:' + id, g); orden.push(id); subidos.push([id, g]);
    }
    await guardar('eps', orden); await Programa.cargar(); Programa.revisar(); pintarAjustes();
    for(const [id, g] of subidos) await Nube.subir(id, 'ep', g);
  };
  c.querySelectorAll('[data-nombre-ep]').forEach(i => i.onchange = async () => {
    const id = i.dataset.nombreEp, g = await leer('ep:' + id); if(!g) return;
    g.nombre = i.value.trim() || g.nombre; await guardar('ep:' + id, g);
    const e = Programa.eps.find(x => x.id === id); if(e){ e.nombre = g.nombre; if(Programa.actual === e) $('#progQue').innerHTML = esc(e.nombre) + '<small>' + DE.ep + '</small>'; }
  });
  c.querySelectorAll('[data-sube]').forEach(b => b.onclick = async () => {
    const orden = (await leer('eps')) || [], k = orden.indexOf(b.dataset.sube);
    if(k > 0){ [orden[k - 1], orden[k]] = [orden[k], orden[k - 1]]; await guardar('eps', orden); await Programa.cargar(); pintarAjustes(); }
  });
  c.querySelectorAll('[data-quita]').forEach(b => b.onclick = async () => {
    if(!otraVez(b)) return;
    const orden = ((await leer('eps')) || []).filter(x => x !== b.dataset.quita);
    const p = Nube.borrar(b.dataset.quita);
    await guardar('ep:' + b.dataset.quita, undefined); await guardar('eps', orden); await Programa.cargar(); pintarAjustes(); await p;
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
    Programa.enCorte = true; Programa.callar();
    await Programa.tanda([{ tipo: 'ident', a, P, dur: DURA_IDENT }, { tipo: 'anuncio', a, P, dur: DURA_ANUNCIO }]);
    Programa.enCorte = false; Programa.seguir();
  });
  c.querySelectorAll('[data-borra-anuncio]').forEach(b => b.onclick = async () => {
    const g = (await leer('anuncios')) || {}; g.nuevos = (g.nuevos || []).filter(x => x.id !== b.dataset.borraAnuncio);
    await guardarAnuncios(g); pintarAjustes();
  });
  $('#ajNuevo').onclick = async () => {
    const g = (await leer('anuncios')) || {}; g.nuevos = g.nuevos || [];
    const id = 'n' + Date.now().toString(36);
    g.nuevos.push({ id, nuevo: true, marca: 'Anuncio de la escuela', titulo: 'Escribe el título', texto: 'Y aquí el detalle', color: '#7C2D12', color2: '#2A0E05', acento: '#FFE8D6', icono: 'megaphone' });
    await guardarAnuncios(g); editando = id; pintarAjustes();
  };
  $('#ajAnunVideo').onchange = async (e) => {
    const fs = [...e.target.files]; e.target.value = '';
    const orden = (await leer('anv')) || [], subidos = [];
    for(const f of fs){
      const id = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const g = { blob: f, nombre: f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Anuncio' };
      await guardar('anv:' + id, g); orden.push(id); subidos.push([id, g]);
    }
    await guardar('anv', orden); await cargarAnuncios(); pintarAjustes();
    for(const [id, g] of subidos) await Nube.subir(id, 'anun', g);
  };
  c.querySelectorAll('[data-borra-video]').forEach(b => b.onclick = async () => {
    if(!otraVez(b)) return;
    const id = b.dataset.borraVideo, p = Nube.borrar(id);
    await guardar('anv:' + id, undefined); await guardar('anv', ((await leer('anv')) || []).filter(x => x !== id));
    await cargarAnuncios(); pintarAjustes(); await p;
  });
  c.querySelectorAll('[data-ver-video]').forEach(b => b.onclick = async () => {
    const a = anuncios.find(x => x.id === b.dataset.verVideo); if(!a) return;
    dlg.close();
    Programa.enCorte = true; Programa.callar();
    await Programa.tanda([{ tipo: 'video', a, dur: await durDeVideo(a.url) || 30 }]);
    Programa.enCorte = false; Programa.seguir();
  });
  const rev = $('#ajRevisar'); if(rev) rev.onclick = async () => { rev.disabled = true; Nube.aviso('Revisando…'); const n = await Nube.revisar(); if(n === 0) Nube.aviso('Todo al día: no hay nada nuevo.'); rev.disabled = false; };
  const no = $('#ajTabletNo'); if(no) no.onclick = () => { cfg.tablet = false; guardarCfg(); pintarTablet(); pintarAjustes(); };
  const si = $('#ajTabletSi');
  if(si) si.onclick = async () => {
    if(!(await pedirPasador('Prender el modo tablet', 'Los pedidos de la fila llegan a la cooperativa con este pasador.', true))) return;
    cfg.tablet = true; guardarCfg(); pintarTablet(); precargar(); pintarAjustes();
  };
}
/* el pasador SIEMPRE con el pad de números, nunca con el teclado: lo pidió
   Carlos, el de la cooperativa puede traer las manos sucias o estar cobrando.
   Con servidor, el pasador lo revisa el servidor y le da a esta tablet la llave
   del mostrador; `exigeRed` = sin internet no sirve (el modo tablet manda los
   pedidos, así que sin red no tiene caso prenderlo). */
function pedirPasador(titulo, sub = 'El de la cooperativa.', exigeRed = false){
  return FadoriPad.abrir({ titulo, sub, largo: F.largoPasador(), revisar: async (v) => {
    if(F.motor() !== 'servidor') return F.pasadorOk(v) || { error: 'Ese no es el pasador' };
    const r = await F.entrarMostrador(v);
    if(r.ok){ F.recordarPasador(v); F.renovarPase(); setTimeout(() => Nube.revisar(), 500); return true; }
    if(r.sinRed && !exigeRed && F.pasadorOk(v)) return true;
    return { error: r.sinRed ? (exigeRed ? 'Sin internet: los pedidos no llegarían' : 'Sin internet, y ése no es el de esta tablet') : (r.error || 'Ese no es el pasador') };
  } });
}
/* Quitar pide un segundo toque. NO con confirm(): nucleo.js tapa los
   diálogos del navegador (en la tele se veían prestados) y confirm() siempre
   contesta «no», así que «Quitar» nunca había quitado nada. Lo cazó la
   prueba de la nube el 11 de octubre. */
function otraVez(b){
  if(b.dataset.seguro === '1') return true;
  b.dataset.seguro = '1'; const antes = b.innerHTML;
  b.classList.add('seguro'); b.innerHTML = F.ico('trash') + '¿Seguro? Toca otra vez';
  setTimeout(() => { if(b.isConnected){ b.dataset.seguro = ''; b.classList.remove('seguro'); b.innerHTML = antes; } }, 3500);
  return false;
}
async function cambiarAnuncio(id, cambio){
  const g = (await leer('anuncios')) || {}; g.cambios = g.cambios || {}; g.nuevos = g.nuevos || [];
  const n = g.nuevos.find(x => x.id === id);
  if(n) Object.assign(n, cambio); else g.cambios[id] = Object.assign({}, g.cambios[id] || {}, cambio);
  await guardarAnuncios(g);
  if(cambio.logoData || cambio.activo !== undefined) pintarAjustes();
}
/* los anuncios (textos, colores, prendidos y logos) viajan enteros a las
   otras pantallas: lo que se cambia en el teléfono le llega a la tablet.
   Gana el más reciente, con la hora de quien lo cambió */
async function guardarAnuncios(g){
  g.t = Date.now();
  await guardar('anuncios', g); await cargarAnuncios();
  Nube.subirAnuncios(g);
}
/* el logo que se sube se achica a 256 px: un PNG de 4 MB no hace falta, y
   así caben varios en lo que viaja a las otras pantallas */
async function achicar(f){
  const url = URL.createObjectURL(f), im = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = url; });
  URL.revokeObjectURL(url); if(!im) return '';
  const k = Math.min(1, 256 / Math.max(im.width, im.height)), c = document.createElement('canvas');
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

/* ══════════════════════════════════════════════════════════════════════
   4 · LA NUBE: lo que se sube en un aparato llega a los demás
   Carlos, 10 de octubre: «si lo subo desde mi teléfono, que la tablet
   también lo tenga, porque no es fácil estar yendo a cada rato». Lo que se
   agrega aquí (episodios, música, películas, enlaces) se manda al buzón del
   servidor en pedazos; cada pantalla con el pasador revisa el buzón y baja
   sola lo que le falta, y lo guarda en ella. Borrar en una lo borra en todas.
   ═════════════════════════════════════════════════════════════════════ */
const Nube = {
  ocupada: false, estado: '',
  activa(){ return F.motor() === 'servidor' && !!F.llaveMostrador(); },
  aviso(t){ this.estado = t; const n = $('#ajNube'); if(n) n.textContent = t; const c = $('#nubeChip'); if(c){ c.hidden = !t; c.textContent = t; } },
  async pide(ruta, opc){ const r = await F.alServidor(ruta, opc); if(!r.ok) throw new Error((await r.json().catch(() => ({}))).error || ('El servidor contestó ' + r.status)); return r; },
  /* subir lo que se acaba de agregar en ESTE aparato */
  async subir(id, tipo, g){
    if(!this.activa()) return;
    const clase = g.tipo === 'youtube' || g.tipo === 'spotify' ? g.tipo : 'archivo';
    let portada = '';
    if(g.portada) try{ portada = await chiquita(g.portada); }catch(e){}
    try{
      const alta = await (await this.pide('/api/medios/alta', { cuerpo: { id, tipo, clase, nombre: g.nombre, mime: g.blob ? g.blob.type : '', tam: g.blob ? g.blob.size : 0,
        esAudio: !!g.esAudio, artista: g.artista || '', portada, embed: g.embed || '' } })).json();
      for(let k = 0; k < alta.partes; k++){
        this.aviso('Subiendo «' + g.nombre + '» para las otras pantallas… ' + Math.round(100 * k / alta.partes) + '%');
        const trozo = await g.blob.slice(k * alta.parte, (k + 1) * alta.parte).arrayBuffer();
        await reintentar(() => this.pide('/api/medios/parte', { cuerpo: trozo, query: { id, k } }));
      }
      this.aviso('«' + g.nombre + '» ya está en el buzón: las otras pantallas lo bajan solas.');
      setTimeout(() => { if(/ya está en el buzón/.test(this.estado)) this.aviso(''); }, 8000);
    }catch(e){ this.aviso('No se pudo subir «' + g.nombre + '»: ' + e.message); }
  },
  async subirAnuncios(g){
    if(!this.activa()) return;
    const cuerpo = JSON.stringify({ g });
    if(cuerpo.length > 120000) return this.aviso('Los logos de los anuncios pesan mucho para mandarlos a las otras pantallas: usa logos más sencillos.');
    try{ await this.pide('/api/medios/anuncios', { cuerpo: { g } }); }catch(e){ this.aviso('No se pudieron mandar los anuncios: ' + e.message); }
  },
  /* lo que se quita aquí se apunta para no volver a bajarlo: si el buzón
     todavía lo tenía cuando se revisó, regresaba solo (se cazó en la prueba) */
  quitados(){ try{ return JSON.parse(localStorage.getItem('fadori_tele_quitados') || '[]'); }catch(e){ return []; } },
  async borrar(id){
    try{ localStorage.setItem('fadori_tele_quitados', JSON.stringify(this.quitados().concat(id).slice(-300))); }catch(e){}
    if(this.activa()) try{ await this.pide('/api/medios/borrar', { cuerpo: { id } }); }catch(e){}
  },
  /* revisar el buzón: bajar lo que falta y quitar lo que borraron en otra */
  async revisar(){
    if(!this.activa() || this.ocupada || cfg.recibir === false) return;
    this.ocupada = true;
    try{
      const { medios, borrados, anuncios: anunServ } = await (await this.pide('/api/medios/lista', { cuerpo: {} })).json();
      /* los anuncios que se cambiaron en otro aparato */
      let llegaron = 0, anunCambio = false;
      const mios = (await leer('anuncios')) || {};
      if(anunServ && anunServ.g && (anunServ.g.t || 0) > (mios.t || 0)){ await guardar('anuncios', anunServ.g); anunCambio = true; }
      const eps = (await leer('eps')) || [], rel = (await leer('relleno')) || [], anv = (await leer('anv')) || [];
      let cambio = false;
      for(const b of borrados || []){
        if(eps.indexOf(b.id) >= 0){ eps.splice(eps.indexOf(b.id), 1); await guardar('ep:' + b.id, undefined); cambio = true; }
        if(rel.indexOf(b.id) >= 0){ rel.splice(rel.indexOf(b.id), 1); await guardar('rel:' + b.id, undefined); cambio = true; }
        if(anv.indexOf(b.id) >= 0){ anv.splice(anv.indexOf(b.id), 1); await guardar('anv:' + b.id, undefined); anunCambio = true; }
      }
      if(cambio){ await guardar('eps', eps); await guardar('relleno', rel); }
      if(anunCambio) await guardar('anv', anv);
      const quitados = this.quitados();
      for(const m of medios || []){
        if(eps.indexOf(m.id) >= 0 || rel.indexOf(m.id) >= 0 || anv.indexOf(m.id) >= 0 || quitados.indexOf(m.id) >= 0) continue;
        const g = { nombre: m.nombre, nube: true };
        if(m.clase !== 'archivo'){ if(!m.embed) continue; Object.assign(g, { tipo: m.clase, embed: m.embed }); }
        else {
          const trozos = [];
          for(let k = 0; k < m.partes; k++){
            this.aviso('Bajando «' + m.nombre + '»… ' + Math.round(100 * k / m.partes) + '%');
            let t = await leer('baja:' + m.id + ':' + k);          /* si se cortó, sigue donde iba */
            if(!t){ const r = await reintentar(() => this.pide('/api/medios/parte', { metodo: 'GET', query: { id: m.id, k } }));
              t = new Blob([await r.arrayBuffer()]); await guardar('baja:' + m.id + ':' + k, t); }
            trozos.push(t);
          }
          g.blob = new Blob(trozos, { type: m.mime || 'video/mp4' });
          if(m.tipo === 'rel'){ g.tipo = 'archivo'; g.esAudio = !!m.esAudio; g.artista = m.artista || '';
            if(m.portada) g.portada = await (await fetch(m.portada)).blob(); }
        }
        if(m.tipo === 'ep'){ await guardar('ep:' + m.id, g); eps.push(m.id); await guardar('eps', eps); }
        else if(m.tipo === 'anun'){ await guardar('anv:' + m.id, { blob: g.blob, nombre: g.nombre }); anv.push(m.id); await guardar('anv', anv); anunCambio = true; }
        else { await guardar('rel:' + m.id, g); rel.push(m.id); await guardar('relleno', rel); }
        llegaron++;
        for(let k = 0; k < (m.partes || 0); k++) await guardar('baja:' + m.id + ':' + k, undefined);
        this.pide('/api/medios/bajado', { cuerpo: { id: m.id } }).catch(() => {});
        cambio = true;
        this.aviso('Llegó «' + m.nombre + '»');
        setTimeout(() => { if(/^Llegó/.test(this.estado)) this.aviso(''); }, 6000);
      }
      if(anunCambio) await cargarAnuncios();
      if(cambio || anunCambio){ if(cambio){ await Programa.cargar(); Programa.revisar(); } if(dlg.open) pintarAjustes(); }
      window.__nube = { t: Date.now(), medios: (medios || []).length };
      return llegaron + (anunCambio ? 1 : 0);
    }catch(e){ this.aviso(''); window.__nube = { t: Date.now(), error: e.message }; return -1; }
    finally{ this.ocupada = false; }
  },
};
async function reintentar(f, veces = 4){
  for(let i = 0; ; i++){ try{ return await f(); }catch(e){ if(i >= veces - 1) throw e; await new Promise(r => setTimeout(r, 1000 * (i + 1))); } }
}
/* la carátula viaja chica: 240 px */
async function chiquita(blob){
  const u = URL.createObjectURL(blob);
  try{
    const im = await new Promise((si, no) => { const i = new Image(); i.onload = () => si(i); i.onerror = no; i.src = u; });
    const e = Math.min(1, 240 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * e); c.height = Math.round(im.naturalHeight * e);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.8);
  } finally { URL.revokeObjectURL(u); }
}
/* Carlos, 21 de octubre: «que se actualice el contenido de mejor manera».
   Antes revisaba cada 2 minutos y sólo eso: lo que subía desde el teléfono
   tardaba en aparecer y parecía que no había llegado. Ahora cada 30 s, en
   cuanto la pantalla vuelve a estar a la vista, y en cuanto regresa el
   internet; y en los ajustes hay «Revisar si hay algo nuevo». */
setInterval(() => Nube.revisar(), 30000);
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') Nube.revisar(); });
addEventListener('online', () => setTimeout(() => Nube.revisar(), 1500));

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
setTimeout(() => Nube.revisar(), 2500);
/* la primera vez hay que tocar: sin un toque el navegador no deja sonar */
$('#arranque').hidden = false;
setTimeout(() => { if(!arrancado){ $('#arranque').hidden = true; $('#bMudo').style.display = 'inline-flex'; } }, 9000);
video.muted = true; if(Programa.actual && !Programa.esWeb()) video.play().catch(() => {});

/* EL PARTIDO EN VIVO: mientras haya transmisión (o las llaves en pantalla), el
   programa se calla y no hay tanda de anuncios; los turnos, el timbre y la
   voz siguen saliendo encima. Al apagarla, el programa sigue donde iba. */
const Vivo = montarPantalla({ marco: $('#marco'), alCambiar: (ver, est) => {
  const calla = !!(est.activa || est.llaves.visible);
  if(calla !== enVivo){ enVivo = calla; Programa.pausar(calla); }
  acomodar();
} });

window.TELE = { Vivo, Programa, cfg, anunciar, Sonido, abrirTablet, cerrarTablet, verPop, Nube, acomodar, get anuncios(){ return anuncios; }, listo: true };
