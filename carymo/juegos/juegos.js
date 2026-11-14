/* ══════════════════════════════════════════════════════════════════════════
   JUEGOS DE MESA DE CARYMO · la pantalla
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 14 nov: ajedrez, damas, reversi, Conecta 4 y dominó; clases de
   estrategia que se aprenden JUGANDO; contra la máquina y contra otros
   jugadores de la app o tus amigos. Pocas palabras en pantalla.

   Las reglas viven en motores.js (las mismas que usa el servidor), las clases
   en clases.js y la máquina piensa aparte en maquina.js.
   ═════════════════════════════════════════════════════════════════════════ */
import { MOTORES, elegir, enJaque, ELO, ELO_MIN, ELO_MAX, nombreElo, claveElo } from './motores.js';
import { CLASES } from './clases.js';
import { cumple, pista } from './revisar.js';
import { armarLibro, aperturaDe, deLibro, enLibroHasta, analizar, resumen, perfil, CLASES as CLASE_JUGADA } from './entrenador.js';

const PIEZA = (p) => new URL(`./piezas/${p === p.toUpperCase() ? 'w' : 'b'}${p.toUpperCase()}.svg`, import.meta.url).href;
const ORDEN = ['ajedrez', 'damas', 'reversi', 'conecta4', 'domino'];
const FRASE = { ajedrez: 'Estrategia pura', damas: 'Come y corona', reversi: 'Voltea y domina', conecta4: 'Cuatro en línea', domino: 'Cuenta y cierra' };
const NIVEL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
const XP_GANAR = { facil: 5, medio: 10, dificil: 20, linea: 15 };
const PIPS = { 0: [], 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

/* el dibujo de una ficha de dominó (vertical o acostada) */
export function fichaSVG(a, b, { acostada = false, tapada = false, clase = '' } = {}){
  const w = acostada ? 64 : 32, h = acostada ? 32 : 64;
  const mitad = (n, ox, oy) => PIPS[n].map((k) => `<circle cx="${ox + 6 + (k % 3) * 10}" cy="${oy + 6 + Math.floor(k / 3) * 10}" r="2.6"/>`).join('');
  const cuerpo = tapada ? '<rect x="6" y="6" width="' + (w - 12) + '" height="' + (h - 12) + '" rx="4" fill="#AC27FF" opacity=".35"/>'
    : (acostada ? mitad(a, 0, 1) + mitad(b, 32, 1) + '<line x1="32" y1="5" x2="32" y2="27" stroke="#5b4a6e" stroke-width="1.4"/>'
      : mitad(a, 1, 0) + mitad(b, 1, 32) + '<line x1="5" y1="32" x2="27" y2="32" stroke="#5b4a6e" stroke-width="1.4"/>');
  return `<svg class="jg-ficha ${clase}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-label="${tapada ? 'ficha tapada' : a + ' y ' + b}"><rect x=".8" y=".8" width="${w - 1.6}" height="${h - 1.6}" rx="6" fill="${tapada ? '#2A1640' : '#F7F1FB'}" stroke="${tapada ? '#AC27FF' : '#cbb8de'}" stroke-width="1.4"/><g fill="#24113A">${cuerpo}</g></svg>`;
}
/* la portadita de cada juego en el menú */
function arte(id){
  if(id === 'ajedrez') return `<img src="${PIEZA('N')}" alt="" width="54" height="54">`;
  if(id === 'damas') return '<span class="jg-arte-damas"><i class="b"></i><i class="a"></i></span>';
  if(id === 'reversi') return '<span class="jg-arte-rev"><i></i><i class="o"></i><i class="o"></i><i></i></span>';
  if(id === 'conecta4') return '<span class="jg-arte-c4">' + [1, 0, 0, 2, 1, 2, 1, 2, 0].map((k) => `<i class="k${k}"></i>`).join('') + '</span>';
  return fichaSVG(6, 3, { acostada: true });
}

const CSS = `
.jg{ padding:0 16px calc(24px + env(safe-area-inset-bottom)) }
.jg-tit{ font:900 28px/1.1 Titulo; margin:4px 0 2px } .jg-sub{ color:var(--suave); margin:0 0 16px }
.jg-lista{ display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:12px }
.jg-juego{ display:grid; grid-template-rows:76px auto auto; justify-items:center; gap:4px; padding:14px 10px; border-radius:22px; border:1px solid var(--borde); background:var(--fondo-2); color:inherit; font:inherit; text-align:center; min-height:150px }
.jg-juego b{ font:800 17px/1.1 Titulo } .jg-juego small{ color:var(--suave); font-size:13px } .jg-juego .jg-elo{ font:800 12px/1 Titulo; color:var(--claro-txt) }
.jg-juego:active{ transform:scale(.97) }
.jg-arte-damas{ position:relative; display:block; width:64px; height:56px } .jg-arte-damas i{ position:absolute; width:40px; height:40px; border-radius:50%; box-shadow:inset 0 -5px 0 #0004, 0 4px 10px #0007 }
.jg-arte-damas .b{ left:2px; top:2px; background:#7E1735 } .jg-arte-damas .a{ right:2px; bottom:2px; background:#F1ECF4 }
.jg-arte-rev{ display:inline-grid; grid-template-columns:repeat(2, 26px); gap:4px; padding:6px; border-radius:10px; background:#2f6b4f } .jg-arte-rev i{ width:26px; height:26px; border-radius:50%; background:#170A26 } .jg-arte-rev i.o{ background:#F1ECF4 }
.jg-arte-c4{ display:inline-grid; grid-template-columns:repeat(3, 18px); gap:4px; padding:6px; border-radius:10px; background:#3B2C8C } .jg-arte-c4 i{ width:18px; height:18px; border-radius:50%; background:#170A26 } .jg-arte-c4 i.k1{ background:#E8B54A } .jg-arte-c4 i.k2{ background:#E2506A }
.jg-seccion{ font:800 13px/1 Titulo; letter-spacing:.06em; text-transform:uppercase; color:var(--suave); margin:22px 0 10px }
.jg-partida-f{ display:grid; grid-template-columns:44px minmax(0, 1fr) auto; gap:10px; align-items:center; padding:10px 12px; border-radius:16px; background:var(--fondo-2); border:1px solid var(--borde); color:inherit; font:inherit; text-align:left; width:100%; margin-bottom:8px; min-height:60px }
.jg-partida-f .jg-mini{ width:44px; height:44px; display:grid; place-items:center; overflow:hidden } .jg-partida-f .jg-mini img, .jg-partida-f .jg-mini svg{ max-width:44px; max-height:44px }
.jg-partida-f b{ display:block; font:800 15px/1.2 Titulo } .jg-partida-f small{ color:var(--suave) }
.jg-pill{ padding:6px 10px; border-radius:99px; font:800 12px/1 Titulo; background:var(--sup) } .jg-pill.tu{ background:var(--claro); color:#fff }
.jg-opciones{ display:grid; gap:10px } .jg-niveles{ display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:8px }
.jg-clase-f{ display:flex; align-items:center; gap:10px; width:100%; padding:12px; border-radius:14px; border:1px solid var(--borde); background:var(--fondo-2); color:inherit; font:inherit; text-align:left; min-height:52px }
.jg-clase-f .i{ width:20px; height:20px; flex:none; color:var(--claro-txt) } .jg-clase-f.hecha .i{ color:#5BD68F }
/* la mesa */
.jg-mesa{ display:flex; flex-direction:column; gap:10px; padding:0 12px calc(16px + env(safe-area-inset-bottom)); min-height:100% }
.jg-mesa > *{ flex-shrink:0 }
.jg-arriba{ display:flex; align-items:center; gap:8px; padding-top:calc(6px + env(safe-area-inset-top)) } .jg-arriba b{ flex:1; font:800 18px/1.1 Titulo; min-width:0 }
.jg-jugador{ display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:14px; background:var(--fondo-2); border:2px solid transparent; min-height:48px }
.jg-jugador.turno{ border-color:var(--claro) } .jg-jugador b{ flex:1; min-width:0; font:800 15px/1.2 Titulo; overflow:hidden; text-overflow:ellipsis; white-space:nowrap } .jg-jugador small{ color:var(--suave); font-size:13px }
.jg-color{ width:22px; height:22px; border-radius:50%; flex:none; box-shadow:inset 0 -3px 0 #0003, 0 0 0 2px #ffffff40 }
.jg-dice{ display:grid; grid-template-columns:72px minmax(0, 1fr); gap:10px; align-items:center; padding:10px; border-radius:18px; background:var(--sup); overflow:hidden }
.jg-dice .jg-masc{ width:72px; height:76px } .jg-dice p{ margin:0; font-size:16px; line-height:1.35 } .jg-dice p b{ color:var(--claro-txt) }
.jg-dice.bien{ background:#1d4a34 } .jg-dice.mal{ background:#4E0E22 }
.jg-estado{ min-height:22px; text-align:center; font:800 15px/1.3 Titulo; color:var(--suave) }
.jg-tab{ --casilla-l:#E9DCF6; --casilla-o:#7B4BB3; position:relative; width:min(100%, 520px); margin:0 auto; aspect-ratio:1; display:grid; grid-template-columns:repeat(8, minmax(0, 1fr)); grid-template-rows:repeat(8, minmax(0, 1fr)); border-radius:12px; overflow:hidden; box-shadow:0 18px 40px -16px #000c; touch-action:manipulation; user-select:none; -webkit-user-select:none }
.jg-c{ position:relative; display:grid; place-items:center; border:0; padding:0; margin:0; background:var(--casilla-l); min-width:0; min-height:0 }
.jg-c.o{ background:var(--casilla-o) } .jg-c img{ position:absolute; inset:6%; width:88%; height:88%; pointer-events:none }
.jg-c.jg-llega{ z-index:3 } .jg-c .jg-pz{ will-change:transform } .jg-c .jg-sale{ z-index:-1 }
.jg-dom-mesa > span{ display:inline-flex }
.jg-c.ult::before{ content:""; position:absolute; inset:0; background:#E8B54A55 } .jg-c.sel::before{ content:""; position:absolute; inset:0; background:#AC27FF66 }
.jg-c.jaque::before{ content:""; position:absolute; inset:0; background:radial-gradient(#E2506A, transparent 70%) }
.jg-c.va::after{ content:""; position:absolute; width:30%; height:30%; border-radius:50%; background:#170A2655 } .jg-c.va.come::after{ width:86%; height:86%; background:none; border:5px solid #170A2655 }
.jg-c.pista{ outline:4px solid #E8B54A; outline-offset:-4px }
.jg-coord{ position:absolute; font:800 9px/1 Titulo; opacity:.6; pointer-events:none } .jg-coord.f{ left:2px; top:2px } .jg-coord.c{ right:3px; bottom:2px }
.jg-c.o .jg-coord{ color:var(--casilla-l) } .jg-c:not(.o) .jg-coord{ color:var(--casilla-o) }
.jg-ficha-d{ width:78%; height:78%; border-radius:50%; display:grid; place-items:center; box-shadow:inset 0 -6px 0 #0004, 0 4px 8px #0006; pointer-events:none }
.jg-ficha-d.a{ background:#F1ECF4; color:#7E1735 } .jg-ficha-d.b{ background:#7E1735; color:#F1ECF4 } .jg-ficha-d .i{ width:50%; height:50% }
.jg-tab.rev{ --casilla-l:#2f6b4f; --casilla-o:#2f6b4f; gap:2px; background:#1f4a36; padding:2px }
.jg-disco{ width:84%; height:84%; border-radius:50%; box-shadow:inset 0 -5px 0 #0005, 0 3px 6px #0006; pointer-events:none; transition:background .3s }
.jg-disco.k0{ background:#170A26 } .jg-disco.k1{ background:#F1ECF4 } .jg-disco.voltea{ animation:jgVoltea .45s ease }
@keyframes jgVoltea{ 0%{ transform:scaleX(1) } 50%{ transform:scaleX(.05) } 100%{ transform:scaleX(1) } }
.jg-tab.rev .jg-c.va::after{ background:#ffffff40 }
.jg-c4{ width:min(100%, 480px); margin:0 auto; display:grid; grid-template-columns:repeat(7, 1fr); gap:6px; padding:10px; border-radius:18px; background:#3B2C8C; box-shadow:0 18px 40px -16px #000c; aspect-ratio:7 / 6.2; touch-action:manipulation }
.jg-c4 button{ display:grid; place-items:center; border:0; padding:0; border-radius:50%; background:#170A26; aspect-ratio:1; min-width:0 }
.jg-c4 i{ width:100%; height:100%; border-radius:50%; box-shadow:inset 0 -5px 0 #0004 } .jg-c4 i.k0{ background:#E8B54A } .jg-c4 i.k1{ background:#E2506A }
.jg-c4 i.cae{ animation:jgCae .42s cubic-bezier(.4, 0, .9, .5) } .jg-c4 .gana{ box-shadow:0 0 0 4px #fff, 0 0 18px #fff }
@keyframes jgCae{ from{ transform:translateY(var(--desde, -400%)) } to{ transform:none } }
.jg-c4 button.pista{ box-shadow:0 0 0 4px #E8B54A }
.jg-dom-mesa{ display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:3px; min-height:120px; padding:14px 8px; border-radius:18px; background:#1d4a34; box-shadow:inset 0 0 40px #0006 }
.jg-dom-mesa .jg-ficha.doble{ transform:none } .jg-dom-mesa .vacia{ color:#ffffff99; font:800 14px Titulo }
.jg-dom-mano{ display:flex; flex-wrap:wrap; justify-content:center; gap:8px } .jg-dom-mano button{ padding:0; border:0; background:none; border-radius:8px; transition:transform .15s }
.jg-dom-mano button.puede{ transform:translateY(-6px); filter:drop-shadow(0 0 8px #AC27FF) } .jg-dom-mano button:disabled{ opacity:.45 } .jg-dom-mano button.pista{ filter:drop-shadow(0 0 10px #E8B54A) }
.jg-dom-otro{ display:flex; gap:3px; justify-content:center; flex-wrap:wrap } .jg-dom-otro .jg-ficha{ width:16px; height:32px }
.jg-dom-info{ display:flex; justify-content:center; gap:14px; color:var(--suave); font:700 13px/1 Titulo }
.jg-elo{ display:grid; gap:10px; padding:14px; border-radius:18px; background:var(--sup) }
.jg-elo-dato{ text-align:center; font:700 16px/1.2 Titulo; color:var(--suave) } .jg-elo-dato b{ font:900 34px/1 Titulo; color:var(--claro-txt, #fff); font-variant-numeric:tabular-nums }
.jg-elo input[type=range]{ -webkit-appearance:none; appearance:none; width:100%; height:44px; background:transparent; margin:0 }
.jg-elo input[type=range]::-webkit-slider-runnable-track{ height:10px; border-radius:5px; background:linear-gradient(90deg, #3FCB8A, #E8B54A 40%, #E2506A 70%, #AC27FF) }
.jg-elo input[type=range]::-moz-range-track{ height:10px; border-radius:5px; background:linear-gradient(90deg, #3FCB8A, #E8B54A 40%, #E2506A 70%, #AC27FF) }
.jg-elo input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; width:30px; height:30px; margin-top:-10px; border-radius:50%; background:#fff; border:4px solid #AC27FF; box-shadow:0 4px 12px #0008 }
.jg-elo input[type=range]::-moz-range-thumb{ width:24px; height:24px; border-radius:50%; background:#fff; border:4px solid #AC27FF }
.jg-elo-marcas{ display:flex; justify-content:space-between; font-size:12px; color:var(--suave); margin-top:-6px }
.jg-botones{ display:flex; flex-wrap:wrap; gap:8px; justify-content:center } .jg-botones .bt{ min-height:44px }
.jg-fin{ position:fixed; inset:0; z-index:90; display:grid; place-items:center; background:#170A26cc; padding:16px; animation:jgEntra .3s ease }
.jg-fin > div{ width:min(100%, 380px); padding:24px 20px; border-radius:24px; background:var(--fondo-2); text-align:center; box-shadow:0 30px 80px #000 }
.jg-fin h2{ font:900 34px/1 Titulo; margin:0 0 6px } .jg-fin p{ color:var(--suave); margin:0 0 18px } .jg-fin .jg-masc{ width:110px; height:118px; margin:0 auto 6px }
@keyframes jgEntra{ from{ opacity:0 } }
.jg-buscando{ display:grid; justify-items:center; gap:14px; padding:40px 0; text-align:center } .jg-buscando .i{ width:42px; height:42px; color:var(--claro-txt); animation:jgGira 1.6s linear infinite }
@keyframes jgGira{ to{ transform:rotate(360deg) } }
@media (prefers-reduced-motion: reduce){ .jg-disco.voltea, .jg-c4 i.cae, .jg-buscando .i{ animation:none } }
/* el entrenador de ajedrez (entrenador.js) */
.jg-apertura{ text-align:center; color:var(--suave); font-size:13px; min-height:18px; margin-top:-4px }
.jg-c.hecha::before{ content:""; position:absolute; inset:0; background:var(--cc); opacity:.55; transition:background .25s }
.jg-c.mejor::after{ content:""; position:absolute; inset:3px; border:4px solid #3FCB8A; border-radius:6px }
.jg-rep{ display:grid; gap:14px }
.jg-rep-cab{ display:flex; gap:14px; align-items:center }
.jg-prec{ flex:none; width:92px; height:92px; border-radius:50%; display:grid; place-content:center; text-align:center; background:conic-gradient(#AC27FF calc(var(--p) * 1%), #ffffff14 0); position:relative }
.jg-prec::before{ content:""; position:absolute; inset:8px; border-radius:50%; background:var(--fondo, #170A26) }
.jg-prec b, .jg-prec small{ position:relative } .jg-prec b{ font:800 28px/1 Titulo } .jg-prec small{ font-size:11px; color:var(--suave) }
.jg-cuenta{ display:flex; flex-wrap:wrap; gap:6px }
.jg-cuenta span{ display:inline-flex; align-items:center; gap:6px; font-size:13px; background:var(--sup); border-radius:999px; padding:4px 10px }
.jg-cuenta i, .jg-movs i{ width:10px; height:10px; border-radius:50%; background:var(--cc); flex:none }
.jg-rep-nota{ background:var(--sup); border:1px solid var(--borde); border-left:0; border-radius:16px; padding:12px 14px; min-height:74px }
.jg-rep-nota b{ font:800 17px Titulo; display:flex; align-items:center; gap:8px } .jg-rep-nota p{ margin:4px 0 0 }
.jg-rep-nav{ display:grid; grid-template-columns:auto 1fr auto; gap:8px }
.jg-movs{ display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; scrollbar-width:none }
.jg-movs button{ flex:none; display:flex; align-items:center; gap:6px; border:1px solid var(--borde); background:var(--sup); border-radius:999px; padding:6px 10px; min-height:40px; font-weight:800 }
.jg-movs button[aria-current="true"]{ border-color:#C77DFF; background:#AC27FF33 }
.jg-perfil{ display:grid; gap:10px }
.jg-perfil .fila{ background:var(--sup); border-radius:16px; padding:12px 14px } .jg-perfil .fila small{ color:var(--suave); display:block } .jg-perfil .fila b{ font:800 18px Titulo }
`;

export function iniciarJuegos(h){
  const { ico, esc, sala, tono, SON, brindis } = h;
  if(!document.getElementById('jg-css')){ const s = document.createElement('style'); s.id = 'jg-css'; s.textContent = CSS; document.head.append(s); }
  const guardado = (() => { try{ return JSON.parse(localStorage.getItem('carymo.juegos') || '{}'); }catch{ return {}; } })();
  guardado.clases ||= {};
  const guardar = () => { try{ localStorage.setItem('carymo.juegos', JSON.stringify(guardado)); }catch{} };

  /* ── la máquina, en su trabajador (si el teléfono no lo deja, piensa aquí mismo) ── */
  let trabajador = null, pedidoN = 0; const esperando = new Map();
  try{ trabajador = new Worker(new URL('./maquina.js', import.meta.url), { type: 'module' }); trabajador.onmessage = (ev) => { const f = esperando.get(ev.data.id); if(f){ esperando.delete(ev.data.id); f('an' in ev.data ? ev.data.an : ev.data.j); } }; trabajador.onerror = () => { trabajador = null; }; }catch{ trabajador = null; }
  const pensar = (juego, e, nivel) => new Promise((ok) => {
    if(!trabajador){ setTimeout(() => ok(elegir(MOTORES[juego], e, nivel)), 30); return; }
    const id = ++pedidoN; esperando.set(id, ok); trabajador.postMessage({ id, juego, e, nivel });
    setTimeout(() => { if(esperando.has(id)){ esperando.delete(id); ok(elegir(MOTORES[juego], e, nivel)); } }, 8000);
  });

  let c = null, P = null, reloj = 0, mias = { partidas: [], stats: {} };
  /* el libro de aperturas se baja la primera vez que se juega ajedrez */
  let libro = null, bajandoLibro = null;
  const cargarLibro = () => bajandoLibro ||= fetch(new URL('./aperturas.json', import.meta.url)).then((r) => r.json()).then((d) => { libro = armarLibro(d); return libro; }).catch(() => { bajandoLibro = null; return null; });
  const movsDe = () => (P && P.reg || []).map((r) => r.uci);
  guardado.repasos ||= [];
  const analizarAparte = (datos) => new Promise((ok) => {
    const local = () => setTimeout(() => { try{ ok(analizar(datos.estados, datos.movs, datos.yo, { libroHasta: datos.libroHasta })); }catch{ ok(null); } }, 30);
    if(!trabajador) return local();
    const id = ++pedidoN; esperando.set(id, (an) => ok(an)); trabajador.postMessage({ id, tipo: 'analizar', ...datos });
    setTimeout(() => { if(esperando.has(id)){ esperando.delete(id); local(); } }, 60000);
  });
  const parar = () => { clearInterval(reloj); reloj = 0; };

  /* ══════════════ el menú ══════════════ */
  async function abrir(){
    parar(); P = null;
    c = h.capa('juegos');
    pintarMenu();
    if(h.conAcceso()){ try{ mias = await sala({ accion: 'juegosMios' }); }catch{} if(c?.isConnected && !P) pintarMenu(); }
  }
  function pintarMenu(){
    const st = mias.stats || {}, partidas = (mias.partidas || []).filter((p) => p.estado === 'jugando' || p.estado === 'reto');
    const hechas = (id) => CLASES[id].filter((k) => guardado.clases[k.id]).length;
    c.innerHTML = `<div class="arriba"><button class="bt redondo fantasma" data-cerrar aria-label="Cerrar">${ico('x')}</button><div style="flex:1"></div></div>
      <div class="cuerpo entra jg"><h1 class="jg-tit">Juegos</h1><p class="jg-sub">Aprende jugando. Reta a quien quieras.</p>
      ${partidas.length ? `<div class="jg-seccion">Tus partidas</div>${partidas.map((p) => `<button class="jg-partida-f" data-partida="${esc(p.id)}"><span class="jg-mini">${arte(p.juego)}</span>
        <span><b>${esc(MOTORES[p.juego].nombre)} · ${esc(p.rival)}</b><small>${p.reto === 'recibido' ? 'Te retó' : p.reto === 'mandado' ? 'Esperando' : p.miTurno ? 'Te toca' : 'Le toca'}</small></span>
        <span class="jg-pill ${p.miTurno || p.reto === 'recibido' ? 'tu' : ''}">${p.reto === 'recibido' ? 'Responder' : p.miTurno ? 'Jugar' : 'Ver'}</span></button>`).join('')}` : ''}
      <div class="jg-seccion">Elige</div>
      <div class="jg-lista">${ORDEN.map((id) => `<button class="jg-juego" data-juego="${id}"><span>${arte(id)}</span><b>${MOTORES[id].nombre}</b>
        <small>${FRASE[id]} · ${hechas(id)}/${CLASES[id].length}</small>${st[id] ? `<span class="jg-elo">${st[id].elo} · ${st[id].g}G ${st[id].p}P</span>` : ''}</button>`).join('')}</div></div>`;
    c.onclick = (ev) => {
      if(ev.target.closest('[data-cerrar]')){ parar(); h.cerrarCapa(); return; }
      const j = ev.target.closest('[data-juego]'); if(j){ tono(SON.toque); menuJuego(j.dataset.juego); return; }
      const p = ev.target.closest('[data-partida]'); if(p) abrirPartidaLinea(p.dataset.partida);
    };
  }
  function menuJuego(id){
    const m = MOTORES[id];
    h.hoja(m.nombre, `<div class="jg-opciones">
      <div class="jg-seccion" style="margin-top:0">Aprender</div>
      ${CLASES[id].map((k) => `<button class="jg-clase-f ${guardado.clases[k.id] ? 'hecha' : ''}" data-clase="${k.id}">${ico(guardado.clases[k.id] ? 'circle-check' : 'graduation-cap')}<span>${esc(k.titulo)}</span></button>`).join('')}
      ${id === 'ajedrez' ? `<div class="jg-seccion">Tu juego</div><button class="jg-clase-f" data-perfil>${ico('chart-line')}<span>Cómo juegas · ${guardado.repasos.length} repasadas</span></button>` : ''}
      <div class="jg-seccion">Contra la máquina</div>
      ${id === 'ajedrez' ? `<div class="jg-elo"><div class="jg-elo-dato"><b data-elo-num>${guardado.elo || 600}</b> ELO · <span data-elo-nom>${nombreElo(guardado.elo || 600)}</span></div>
        <input type="range" min="${ELO_MIN}" max="${ELO_MAX}" step="50" value="${guardado.elo || 600}" data-elo aria-label="Dificultad en ELO">
        <div class="jg-elo-marcas"><span>Fácil</span><span>Medio</span><span>Difícil</span><span>Experto</span></div>
        <button class="bt fuerte ancho" data-nivel-elo>Jugar</button></div>`
      : `<div class="jg-niveles">${Object.entries(NIVEL).map(([k, v]) => `<button class="bt" data-nivel="${k}">${v}</button>`).join('')}</div>`}
      <div class="jg-seccion">En línea</div>
      <div class="jg-niveles" style="grid-template-columns:1fr 1fr"><button class="bt fuerte" data-linea="buscar">${ico('search')}Buscar rival</button><button class="bt" data-linea="retar">${ico('swords')}Retar</button></div></div>`, (hj) => {
      hj.querySelector('[data-elo]')?.addEventListener('input', (ev) => { const v = +ev.target.value;
        hj.querySelector('[data-elo-num]').textContent = v; hj.querySelector('[data-elo-nom]').textContent = nombreElo(v);
        ev.target.style.setProperty('--p', ((v - ELO_MIN) / (ELO_MAX - ELO_MIN) * 100).toFixed(1) + '%'); });
      hj.querySelector('[data-elo]')?.dispatchEvent(new Event('input'));
      hj.addEventListener('click', (ev) => {
        const k = ev.target.closest('[data-clase]'); if(k){ h.cerrarHoja(); empezarClase(id, k.dataset.clase); return; }
        if(ev.target.closest('[data-perfil]')){ h.cerrarHoja(); verPerfil(); return; }
        const n = ev.target.closest('[data-nivel]'); if(n){ h.cerrarHoja(); empezarMaquina(id, n.dataset.nivel); return; }
        if(ev.target.closest('[data-nivel-elo]')){ const elo = +hj.querySelector('[data-elo]').value; guardado.elo = elo; guardar(); h.cerrarHoja(); empezarMaquina(id, elo); return; }
        const l = ev.target.closest('[data-linea]'); if(!l) return;
        if(!h.conAcceso()){ h.cerrarHoja(); brindis('Crea tu cuenta para jugar en línea', 'vino', 'user-plus'); return; }
        h.cerrarHoja(); if(l.dataset.linea === 'buscar') buscarRival(id); else elegirRival(id);
      });
    });
  }

  /* ══════════════ en línea ══════════════ */
  function buscarRival(juego){
    parar(); P = null;
    c.innerHTML = `<div class="arriba"><button class="bt redondo fantasma" data-volver aria-label="Atrás">${ico('chevron-left')}</button><div style="flex:1"></div></div>
      <div class="cuerpo jg"><div class="jg-buscando">${ico('search')}<b class="jg-tit" style="font-size:22px">Buscando rival</b><p class="jg-sub">${esc(MOTORES[juego].nombre)}</p><button class="bt" data-volver>Cancelar</button></div></div>`;
    c.onclick = (ev) => { if(ev.target.closest('[data-volver]')){ parar(); sala({ accion: 'juegoNoBuscar' }).catch(() => {}); abrir(); } };
    const intenta = async () => {
      try{ const r = await sala({ accion: 'juegoBuscar', juego }); if(r.partida){ parar(); tono(SON.subir || SON.pop); entrarLinea(r.partida); } }catch(e){ parar(); brindis(e.message || 'No se pudo buscar', 'vino', 'clock'); abrir(); }
    };
    intenta(); reloj = setInterval(intenta, 3000);
  }
  function elegirRival(juego){
    const a = (typeof h.amigos === 'function' && h.amigos()) || {}, gente = new Map();
    for(const x of a.amigos || []) gente.set(x.cuenta, { ...x, amigo: true });
    for(const x of a.enLinea || []) if(!gente.has(x.cuenta)) gente.set(x.cuenta, { ...x, enLinea: true });
    const lista = [...gente.values()];
    h.hoja('Retar', lista.length ? `<div class="jg-opciones">${lista.map((x) => `<button class="jg-clase-f" data-retar="${esc(x.cuenta)}">${ico(x.enLinea ? 'zap' : 'users')}<span><b>${esc(x.nombre || x.cuenta)}</b>${x.enLinea ? ' · en línea' : ''}</span></button>`).join('')}</div>`
      : `<p class="jg-sub">Agrega amigos en Comunidad o busca rival.</p><button class="bt fuerte ancho" data-buscar>${ico('search')}Buscar rival</button>`, (hj) => {
      hj.addEventListener('click', async (ev) => {
        if(ev.target.closest('[data-buscar]')){ h.cerrarHoja(); buscarRival(juego); return; }
        const b = ev.target.closest('[data-retar]'); if(!b) return;
        h.cerrarHoja();
        try{ const r = await sala({ accion: 'juegoRetar', juego, a: b.dataset.retar }); brindis('Reto enviado', '', 'swords'); entrarLinea(r.partida); }
        catch(e){ brindis(e.message || 'No se pudo retar', 'vino', 'clock'); }
      });
    });
  }
  async function abrirPartidaLinea(id){
    try{ const r = await sala({ accion: 'juegoEstado', id }); if(r.partida) entrarLinea(r.partida); }catch(e){ brindis(e.message || 'No se pudo abrir', 'vino', 'clock'); }
  }
  function entrarLinea(p){
    const m = MOTORES[p.juego];
    P = { juego: p.juego, m, modo: 'linea', e: p.e, yo: p.yo < 0 ? 0 : p.yo, linea: p, nombres: p.nombres, hist: [] };
    pintarMesa();
    if(p.estado === 'reto' && p.retador !== p.j[P.yo]) responderReto(p);
    reloj = setInterval(refrescarLinea, 2000);
  }
  async function refrescarLinea(){
    if(!P || P.modo !== 'linea' || !c?.isConnected){ parar(); return; }
    if(document.hidden || P.enviando) return;
    try{
      const r = await sala({ accion: 'juegoEstado', id: P.linea.id, v: P.linea.v });
      if(r.igual || !r.partida || !P) return;
      const antes = P.e; P.linea = r.partida; P.e = r.partida.e;
      pintarMesa({ antes });
      if(r.partida.fin) finDePartida(r.partida.fin);
      else if(MOTORES[P.juego].turno(P.e) === P.yo) tono(SON.pop);
    }catch{}
  }
  function responderReto(p){
    h.hoja(`${p.nombres[1 - P.yo]} te retó`, `<p class="jg-sub">${esc(MOTORES[p.juego].nombre)}</p><div class="jg-niveles" style="grid-template-columns:1fr 1fr"><button class="bt fuerte" data-si>Aceptar</button><button class="bt" data-no>Ahora no</button></div>`, (hj) => {
      hj.addEventListener('click', async (ev) => {
        const si = !!ev.target.closest('[data-si]'), no = !!ev.target.closest('[data-no]'); if(!si && !no) return;
        h.cerrarHoja();
        try{ const r = await sala({ accion: 'juegoResponder', id: p.id, acepta: si }); if(si){ P.linea = r.partida; P.e = r.partida.e; pintarMesa(); } else abrir(); }catch(e){ brindis(e.message || 'No se pudo', 'vino', 'clock'); }
      });
    });
  }
  /* lo que llega al buzón (amigos.js lo pasa aquí) */
  function avisoDeJuego(m){
    const t = { reta: 'te retó a jugar', retoAcepta: 'aceptó tu reto', retoRechaza: 'ahorita no puede jugar', juegoFin: 'terminó la partida' }[m.tipo] || '';
    tono(SON.pop); brindis(`${m.nombre || 'Alguien'} ${t}`, m.tipo === 'retoRechaza' ? 'vino' : '', 'swords');
    if(m.tipo === 'reta' && m.partida && !P){ h.hoja(`${m.nombre || 'Alguien'} te retó`, `<p class="jg-sub">${esc(m.texto || '')}</p><button class="bt fuerte ancho" data-ver>Ver reto</button>`, (hj) => {
      hj.addEventListener('click', (ev) => { if(ev.target.closest('[data-ver]')){ h.cerrarHoja(); if(!c?.isConnected) c = h.capa('juegos'); abrirPartidaLinea(m.partida); } });
    }); }
  }

  /* ══════════════ contra la máquina ══════════════ */
  function empezarMaquina(juego, nivel, e0 = null, meta = null){
    parar();
    const m = MOTORES[juego], e = e0 ? JSON.parse(JSON.stringify(e0)) : m.inicial({});
    P = { juego, m, modo: 'maquina', nivel, e, e0, yo: 0, hist: [], reg: [], nombres: ['Tú', typeof nivel === 'number' ? `Máquina · ${nivel} ELO` : `Máquina · ${NIVEL[nivel]}${juego === 'ajedrez' && ELO[nivel] ? ` · ${ELO[nivel].elo} ELO` : ''}`], meta };
    if(juego === 'ajedrez') cargarLibro().then(() => { if(P && P.juego === 'ajedrez') pintarEstado(); });
    // en ajedrez y damas a veces te toca con negras
    if(!e0 && (juego === 'ajedrez' || juego === 'damas' || juego === 'reversi') && Math.random() < .5) P.yo = 1;
    if(juego === 'domino') P.yo = 0;
    pintarMesa();
    if(m.turno(P.e) !== P.yo && !m.fin(P.e)) turnoMaquina();
  }
  async function turnoMaquina(){
    if(!P || P.modo === 'linea') return;
    const m = P.m;
    while(P && !m.fin(P.e) && m.turno(P.e) !== P.yo){
      P.pensando = true; pintarEstado();
      const t0 = performance.now(), yo = P;
      /* en ajedrez, Medio y Difícil abren como los libros (Fácil juega a lo que salga) */
      let j = null;
      if(P.juego === 'ajedrez' && (typeof P.nivel === 'number' ? P.nivel >= 400 : P.nivel !== 'facil') && !P.e0 && libro){ const u = deLibro(libro, movsDe()); if(u) j = m.jugadas(P.e).find((x) => m.texto(x) === u) || null; }
      if(!j) j = await pensar(P.juego, P.e, P.nivel || 'medio');
      await new Promise((ok) => setTimeout(ok, Math.max(0, 450 - (performance.now() - t0))));
      if(P !== yo || !j) return;
      if(P.reg) P.reg.push({ e: P.e, uci: m.texto ? m.texto(j) : '' });
      const antes = P.e; P.e = m.aplicar(P.e, j); P.pensando = false;
      tono(SON.toque); pintarMesa({ antes });
    }
    if(P){ P.pensando = false; pintarEstado(); const f = m.fin(P.e); if(f) finDePartida(f); }
  }

  /* ══════════════ las clases ══════════════ */
  function empezarClase(juego, idClase){
    parar();
    const k = CLASES[juego].find((x) => x.id === idClase);
    P = { juego, m: MOTORES[juego], modo: 'clase', clase: k, paso: 0, hist: [], nombres: ['Tú', ''] };
    ponerPaso();
  }
  function ponerPaso(){
    const p = P.clase.pasos[P.paso];
    P.e = JSON.parse(JSON.stringify(p.e)); P.yo = P.m.turno(P.e); P.sel = null; P.marcaPista = null; P.dice = p.texto; P.diceClase = '';
    pintarMesa();
  }
  function revisarPaso(j){
    const p = P.clase.pasos[P.paso];
    if(cumple(P.m, P.e, j, p.meta)){
      const antes = P.e; P.e = P.m.aplicar(P.e, j); P.dice = ['¡Eso!', '¡Muy bien!', '¡Así se hace!', '¡Perfecto!'][P.paso % 4]; P.diceClase = 'bien'; P.bloqueo = true;
      tono(SON.bien); pintarMesa({ antes }); P.masc?.play('festeja');
      setTimeout(() => {
        if(!P || P.modo !== 'clase') return; P.bloqueo = false;
        if(P.paso + 1 < P.clase.pasos.length){ P.paso++; ponerPaso(); return; }
        guardado.clases[P.clase.id] = true; guardar(); h.sumarXP?.(10, 'juego'); h.confeti?.(); tono(SON.fin);
        finDeClase();
      }, 1100);
    } else {
      P.dice = 'Casi. Esa no es; vuelve a intentar.'; P.diceClase = 'mal'; tono(SON.mal); pintarDice(); P.masc?.play('piensa');
    }
  }
  function finDeClase(){
    const k = P.clase, juego = P.juego, sig = CLASES[juego][CLASES[juego].indexOf(k) + 1];
    mostrarFin('¡Clase lista!', '+10 XP', [
      k.practica ? ['practica', 'Practicar'] : ['maquina', 'Jugar'],
      sig ? ['sig', 'Siguiente'] : ['salir', 'Salir'],
    ], (accion) => {
      if(accion === 'practica') empezarMaquina(juego, k.practica.nivel, k.practica.e, k.practica.meta);
      else if(accion === 'maquina') empezarMaquina(juego, 'facil');
      else if(accion === 'sig') empezarClase(juego, sig.id);
      else abrir();
    }, 'festeja');
  }

  /* ══════════════ jugar ══════════════ */
  const miTurno = () => P && !P.pensando && !P.bloqueo && !P.m.fin(P.e) && P.m.turno(P.e) === P.yo && (P.modo !== 'linea' || P.linea.estado === 'jugando');
  async function jugar(j){
    if(!miTurno()) return;
    const m = P.m, legal = m.jugadas(P.e).find((k) => m.igual(k, j)); if(!legal) return;
    P.sel = null; P.marcaPista = null;
    if(P.modo === 'clase'){ revisarPaso(legal); return; }
    P.hist.push(P.e);
    if(P.reg) P.reg.push({ e: P.e, uci: m.texto ? m.texto(legal) : '' });
    const antes = P.e; P.e = m.aplicar(P.e, legal); tono(SON.toque); vibrar(8);
    pintarMesa({ antes });
    if(P.modo === 'maquina'){ const f = m.fin(P.e); if(f) finDePartida(f); else turnoMaquina(); return; }
    // en línea: se manda; si el servidor no la acepta, manda la buena
    P.enviando = true;
    try{
      const r = await sala({ accion: 'juegoMover', id: P.linea.id, jugada: legal, v: P.linea.v });
      if(r.partida && P){ P.linea = r.partida; P.e = r.partida.e; pintarMesa(); if(r.partida.fin) finDePartida(r.partida.fin); }
    }catch(e){
      brindis(e.message || 'No se mandó la jugada', 'vino', 'clock');
      try{ const r = await sala({ accion: 'juegoEstado', id: P.linea.id }); if(r.partida && P){ P.linea = r.partida; P.e = r.partida.e; pintarMesa(); } }catch{}
    }finally{ if(P) P.enviando = false; }
  }
  const vibrar = (ms) => { try{ navigator.vibrate?.(ms); }catch{} };

  function finDePartida(f){
    if(!P || P.cerrada) return; P.cerrada = true; parar();
    const gane = f.ganador === P.yo, empate = f.ganador === null;
    if(P.modo === 'maquina' && P.meta){ /* práctica de una clase: se gana o se repite */ }
    const xp = gane ? (P.modo === 'linea' ? XP_GANAR.linea : XP_GANAR[typeof P.nivel === 'number' ? claveElo(P.nivel) : P.nivel] || 5) : empate ? 3 : 0;
    if(xp) h.sumarXP?.(xp, 'juego');
    if(gane){ tono(SON.fin); h.confeti?.(); } else if(!empate) tono(SON.perdio || SON.mal);
    const elo = P.modo === 'linea' && P.linea.final ? P.linea.final.cambioElo[P.yo] : null;
    const extra = [f.motivo, xp ? `+${xp} XP` : '', elo != null ? `${elo >= 0 ? '+' : ''}${elo} puntos` : ''].filter(Boolean).join(' · ');
    const repasable = P.juego === 'ajedrez' && P.modo === 'maquina' && !P.meta && (P.reg || []).length >= 6;
    const resultado = gane ? 'ganaste' : empate ? 'empate' : 'perdiste';
    setTimeout(() => mostrarFin(gane ? '¡Ganaste!' : empate ? 'Empate' : 'Perdiste', extra,
      P?.modo === 'linea' ? [['menu', 'Juegos'], ['otra', 'Otra']] : repasable ? [['repaso', 'Repasar'], ['otra', 'Otra'], ['menu', 'Juegos']] : [['otra', 'Otra'], ['menu', 'Juegos']],
      (a) => { if(a === 'repaso'){ repasar({ reg: P.reg.slice(), final: P.e, yo: P.yo, nivel: P.nivel, resultado }); return; } if(a === 'otra'){ if(P.modo === 'linea') buscarRival(P.juego); else empezarMaquina(P.juego, P.nivel, P.e0, P.meta); } else abrir(); },
      gane ? 'festeja' : empate ? 'saluda' : 'piensa'), 700);
  }
  function mostrarFin(titulo, texto, botones, alElegir, anim){
    document.querySelector('.jg-fin')?.remove();
    const d = document.createElement('div'); d.className = 'jg-fin';
    d.innerHTML = `<div><div class="jg-masc"></div><h2>${esc(titulo)}</h2><p>${esc(texto || '')}</p><div class="jg-botones">${botones.map(([k, t], i) => `<button class="bt ${i === 0 ? 'fuerte' : ''}" data-fin="${k}">${esc(t)}</button>`).join('')}</div></div>`;
    document.body.append(d);
    const mm = h.mascotaEn?.(d.querySelector('.jg-masc'), { tam: 100 }); if(mm) setTimeout(() => mm.play(anim || 'festeja'), 200);
    d.addEventListener('click', (ev) => { const b = ev.target.closest('[data-fin]'); if(!b) return; d.remove(); alElegir(b.dataset.fin); });
  }

  /* ══════════════ la mesa ══════════════ */
  /* LA MESA SE ARMA UNA VEZ Y DESPUÉS SÓLO SE ACTUALIZA (Carlos, 14 nov: «el parpadeo cada vez que tocas una pieza…
     que nunca, jamás, pase»). Rehacerla con innerHTML en cada toque volvía a crear las 32 imágenes de las piezas y
     el iPhone las pinta en blanco un instante. Ahora: el marco se rehace sólo si cambia de juego, de modo o de quién;
     los tableros se crean una vez y cada pieza es el MISMO nodo toda la partida, que se desliza a su casilla nueva. */
  function pintarMesa({ antes } = {}){
    if(!c?.isConnected) c = h.capa('juegos');
    const m = P.m, tit = P.modo === 'clase' ? P.clase.titulo : m.nombre;
    const rival = P.modo === 'clase' ? null : (P.nombres[1 - P.yo] || 'Rival'), yoN = P.modo === 'linea' ? 'Tú' : P.nombres[0];
    const botones = [];
    if(P.modo !== 'linea') botones.push(['pista', 'lightbulb', 'Pista']);
    if(P.modo === 'maquina') botones.push(['deshacer', 'undo-2', 'Deshacer']);
    if(P.modo === 'clase') botones.push(['repetir', 'rotate-ccw', 'Repetir']);
    if(P.modo === 'linea' && P.linea.estado === 'jugando') botones.push(['rendirse', 'flag', 'Rendirse']);
    if(P.modo === 'linea' && P.linea.reclamable) botones.push(['reclamar', 'trophy', 'Reclamar']);
    const firma = [P.juego, P.modo, P.yo, tit, rival, yoN].join('|');
    let mesa = c.querySelector('.jg-mesa');
    if(!mesa || mesa._P !== P || mesa.dataset.firma !== firma){
      c.innerHTML = `<div class="jg-mesa">
        <div class="jg-arriba"><button class="bt redondo fantasma" data-salir aria-label="Salir">${ico('chevron-left')}</button><b>${esc(tit)}</b>${P.modo === 'clase' ? '<span class="jg-pill"></span>' : ''}</div>
        ${P.modo === 'clase' ? `<div class="jg-dice"><div class="jg-masc"></div><p></p></div>` : jugadorHTML(1 - P.yo, rival)}
        <div class="jg-estado" aria-live="polite"></div>
        <div class="jg-tablero"></div>
        ${P.juego === 'ajedrez' && P.modo === 'maquina' ? '<div class="jg-apertura" aria-live="polite"></div>' : ''}
        ${P.modo === 'clase' ? '' : jugadorHTML(P.yo, yoN)}
        <div class="jg-botones"></div></div>`;
      mesa = c.querySelector('.jg-mesa'); mesa._P = P; mesa.dataset.firma = firma;
      if(P.modo === 'clase'){ P.masc = h.mascotaEn?.(c.querySelector('.jg-masc'), { tam: 68 }); }
      c.onclick = onClickMesa;
    }
    const pill = c.querySelector('.jg-pill'); if(pill) poner(pill, 'textContent', `${P.paso + 1}/${P.clase.pasos.length}`);
    if(P.modo === 'clase') pintarDice();
    c.querySelectorAll('[data-jugador]').forEach((el) => { const x = el.querySelector('small'), t = extraDe(+el.dataset.jugador); if(x) poner(x, 'textContent', t); });
    const bts = c.querySelector('.jg-botones'), bh = botones.map(([k, i, t]) => `<button class="bt" data-accion="${k}">${ico(i)}${t}</button>`).join('');
    if(bts.dataset.h !== bh){ bts.innerHTML = bh; bts.dataset.h = bh; }
    actualizarTablero(c.querySelector('.jg-tablero'), antes);
    pintarEstado();
  }
  /* sólo se toca el DOM si el valor cambió (CLAUDE.md: reescribir en cada cuadro le roba el toque al iPhone) */
  const poner = (el, k, v) => { if(el[k] !== v) el[k] = v; };
  const extraDe = (j) => P.juego === 'reversi' ? String(P.m.cuenta(P.e)[j]) : P.juego === 'domino' ? `${P.e.manos[j].length} fichas` : '';
  const negritas = (t) => esc(t || '').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  function pintarDice(){ const d = c?.querySelector('.jg-dice'); if(!d) return; poner(d, 'className', `jg-dice ${P.diceClase || ''}`); const q = d.querySelector('p'), t = negritas(P.dice); if(q.dataset.h !== t){ q.innerHTML = t; q.dataset.h = t; } }
  function colorDe(j){
    const g = P.juego;
    if(g === 'ajedrez') return j === 0 ? '#F1ECF4' : '#24113A';
    if(g === 'damas') return j === 0 ? '#F1ECF4' : '#7E1735';
    if(g === 'reversi') return j === 0 ? '#170A26' : '#F1ECF4';
    if(g === 'conecta4') return j === 0 ? '#E8B54A' : '#E2506A';
    return j === 0 ? '#AC27FF' : '#7E1735';
  }
  function jugadorHTML(j, nombre){
    const extra = P.juego === 'reversi' || P.juego === 'domino' ? `<small>${esc(extraDe(j))}</small>` : '';
    return `<div class="jg-jugador ${P.m.turno(P.e) === j && !P.m.fin(P.e) ? 'turno' : ''}" data-jugador="${j}"><span class="jg-color" style="background:${colorDe(j)}"></span><b>${esc(nombre)}</b>${extra}</div>`;
  }
  function pintarEstado(){
    const s = c?.querySelector('.jg-estado'); if(!s || !P) return;
    const m = P.m, f = m.fin(P.e);
    let t = '';
    if(f) t = f.ganador === null ? 'Empate' : f.ganador === P.yo ? '¡Ganaste!' : 'Ganó el rival';
    else if(P.modo === 'linea' && P.linea.estado === 'reto') t = P.linea.retador === P.linea.j[P.yo] ? 'Esperando respuesta' : 'Te retaron';
    else if(P.pensando) t = 'Pensando…';
    else if(P.modo !== 'clase') t = m.turno(P.e) === P.yo ? 'Te toca' : 'Le toca';
    if(!f && P.juego === 'ajedrez' && enJaque(P.e)) t += ' · Jaque';
    s.textContent = t;
    const ap = c.querySelector('.jg-apertura'); if(ap){ const a = aperturaDe(libro, movsDe()); ap.textContent = a ? a.nombre : ''; }
    c.querySelectorAll('[data-jugador]').forEach((el) => el.classList.toggle('turno', !f && m.turno(P.e) === +el.dataset.jugador));
  }
  async function onClickMesa(ev){
    if(ev.target.closest('[data-salir]')){ parar(); document.querySelector('.jg-fin')?.remove(); abrir(); return; }
    const a = ev.target.closest('[data-accion]');
    if(a){
      const k = a.dataset.accion;
      if(k === 'pista'){ if(!miTurno()) return; const meta = P.modo === 'clase' ? P.clase.pasos[P.paso].meta : null; P.marcaPista = pista(P.m, P.e, meta); tono(SON.pop); pintarMesa(); return; }
      if(k === 'deshacer'){ if(P.pensando || !P.hist.length) return; let e = P.hist.pop(); while(P.hist.length && P.m.turno(e) !== P.yo) e = P.hist.pop(); P.e = e; P.cerrada = false;
        if(P.reg){ const k = P.reg.findIndex((r) => r.e === e); if(k >= 0) P.reg.length = k; } pintarMesa(); return; }
      if(k === 'repetir'){ ponerPaso(); return; }
      if(k === 'rendirse'){ try{ const r = await sala({ accion: 'juegoRendirse', id: P.linea.id }); P.linea = r.partida; P.e = r.partida.e; finDePartida(r.partida.fin); }catch(e){ brindis(e.message || 'No se pudo', 'vino', 'clock'); } return; }
      if(k === 'reclamar'){ try{ const r = await sala({ accion: 'juegoReclamar', id: P.linea.id }); P.linea = r.partida; finDePartida(r.partida.fin); }catch(e){ brindis(e.message || 'Todavía no', 'vino', 'clock'); } return; }
      return;
    }
    const cas = ev.target.closest('[data-i]'); if(cas){ tocarCasilla(+cas.dataset.i); return; }
    const col = ev.target.closest('[data-col]'); if(col){ jugar({ col: +col.dataset.col }); return; }
    const fi = ev.target.closest('[data-ficha]'); if(fi){ tocarFicha(fi.dataset.ficha); return; }
    const lado = ev.target.closest('[data-lado]'); if(lado){ jugar({ ficha: lado.dataset.f, lado: lado.dataset.lado }); return; }
    if(ev.target.closest('[data-roba]')) jugar({ roba: true });
    if(ev.target.closest('[data-pasa]')) jugar({ pasa: true });
  }

  /* ── tocar en el tablero ── */
  function tocarCasilla(i){
    if(!miTurno()) return;
    const m = P.m, js = m.jugadas(P.e);
    if(P.juego === 'reversi'){ jugar(js.find((j) => j.pos === i) || {}); return; }
    const desde = (j) => P.juego === 'ajedrez' ? j.de : j.ruta[0], hasta = (j) => P.juego === 'ajedrez' ? j.a : j.ruta[j.ruta.length - 1];
    if(P.sel != null){
      const van = js.filter((j) => desde(j) === P.sel && hasta(j) === i);
      if(van.length === 1){ jugar(van[0]); return; }
      if(van.length > 1){ // coronar en ajedrez: ¿a qué?
        h.hoja('Corona', `<div class="jg-niveles" style="grid-template-columns:repeat(4, 1fr)">${'qrbn'.split('').map((p) => `<button class="bt" data-promo="${p}" aria-label="${p}"><img src="${PIEZA(P.yo === 0 ? p.toUpperCase() : p)}" width="44" height="44" alt=""></button>`).join('')}</div>`, (hj) => {
          hj.addEventListener('click', (ev) => { const b = ev.target.closest('[data-promo]'); if(!b) return; h.cerrarHoja(); jugar(van.find((j) => j.p === b.dataset.promo)); });
        });
        return;
      }
    }
    P.sel = js.some((j) => desde(j) === i) ? (P.sel === i ? null : i) : null;
    if(P.sel != null) tono(SON.toque);
    actualizarTablero(c.querySelector('.jg-tablero'));
  }
  function tocarFicha(f){
    if(!miTurno()) return;
    const js = P.m.jugadas(P.e).filter((j) => j.ficha === f);
    if(js.length === 1){ jugar(js[0]); return; }
    if(js.length === 2){
      h.hoja('¿De qué lado?', `<div class="jg-niveles" style="grid-template-columns:1fr 1fr"><button class="bt fuerte" data-lado="izq" data-f="${esc(f)}">${ico('chevron-left')}Izquierda</button><button class="bt fuerte" data-lado="der" data-f="${esc(f)}">Derecha${ico('chevron-right')}</button></div>`, (hj) => {
        hj.addEventListener('click', (ev) => { const b = ev.target.closest('[data-lado]'); if(!b) return; h.cerrarHoja(); jugar({ ficha: f, lado: b.dataset.lado }); });
      });
    }
  }

  /* ── dibujar cada tablero: se crea una vez y se actualiza ── */
  const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function actualizarTablero(sitio, antes){
    const g = P.juego;
    if(g === 'ajedrez' || g === 'damas'){
      const vuelta = P.yo === 1;
      let d = sitio.querySelector('.jg-tab');
      if(!d || d._juego !== g || d._vuelta !== vuelta || d._P !== P){ d = crear8(vuelta, g === 'ajedrez', 'button'); d._juego = g; d._P = P; sitio.replaceChildren(d); }
      const m = P.m, e = P.e, js = miTurno() ? m.jugadas(e) : [];
      const desde = (j) => g === 'ajedrez' ? j.de : j.ruta[0], hasta = (j) => g === 'ajedrez' ? j.a : j.ruta[j.ruta.length - 1];
      const destinos = P.sel != null ? js.filter((j) => desde(j) === P.sel) : [];
      const ult = e.ult ? [desde(e.ult), hasta(e.ult)] : [];
      const rey = g === 'ajedrez' && enJaque(e) ? e.b.indexOf(e.t === 'w' ? 'K' : 'k') : -1;
      const piPista = P.marcaPista ? [desde(P.marcaPista), hasta(P.marcaPista)] : [];
      actualizar8(d, e.b, {
        clases: (i) => { const va = destinos.find((j) => hasta(j) === i);
          return [ult.includes(i) && 'ult', P.sel === i && 'sel', rey === i && 'jaque', piPista.includes(i) && 'pista', va && 'va', va && (g === 'ajedrez' ? va.cap : va.caps.length) && 'come']; },
        ruta: g === 'damas' && e.ult ? e.ult.ruta : e.ult ? [e.ult.de, e.ult.a] : null, animar: !!antes,
      });
      return;
    }
    if(g === 'reversi') return actualizarReversi(sitio, antes);
    if(g === 'conecta4') return actualizarC4(sitio, antes);
    return actualizarDomino(sitio, antes);
  }
  /* el tablero de 8×8 vacío: 64 casillas que ya no se vuelven a crear */
  function crear8(vuelta, coords, tag){
    const d = document.createElement('div'); d.className = 'jg-tab'; d._vuelta = vuelta; d._cas = []; d._b = Array(64).fill(null);
    for(let k = 0; k < 64; k++){
      const i = vuelta ? 63 - k : k, f = Math.floor(i / 8), col = i % 8, el = document.createElement(tag);
      el.dataset.i = i; el._base = 'jg-c' + ((f + col) % 2 ? ' o' : ''); el.className = el._base;
      if(tag === 'button') el.setAttribute('aria-label', 'abcdefgh'[col] + (8 - f));
      if(coords){ if(vuelta ? col === 7 : col === 0) el.insertAdjacentHTML('beforeend', `<span class="jg-coord f">${8 - f}</span>`);
        if(vuelta ? f === 0 : f === 7) el.insertAdjacentHTML('beforeend', `<span class="jg-coord c">${'abcdefgh'[col]}</span>`); }
      d._cas[i] = el; d.appendChild(el);
    }
    return d;
  }
  function nodoPieza(p){
    if('pnbrqkPNBRQK'.includes(p)){ const im = document.createElement('img'); im.className = 'jg-pz'; im.alt = ''; im.src = PIEZA(p); im.decoding = 'sync'; im.dataset.p = p; return im; }
    const s2 = document.createElement('span'); s2.className = `jg-pz jg-ficha-d ${'aA'.includes(p) ? 'a' : 'b'}`; s2.dataset.p = p; s2.innerHTML = p === p.toUpperCase() ? ico('crown') : ''; return s2;
  }
  function cambiarPieza(n, p){ if(n.dataset.p === p) return; n.dataset.p = p; if(n.tagName === 'IMG') n.src = PIEZA(p); else n.innerHTML = p === p.toUpperCase() ? ico('crown') : ''; }
  const colorPz = (p) => p && (p === p.toUpperCase() ? 'claro' : 'oscuro') + ('aAbB'.includes(p) ? ('aA'.includes(p) ? 'a' : 'b') : '');
  /* pone cada pieza en su casilla: las que no cambiaron ni se tocan; la que se movió es el mismo nodo y se desliza
     (pasando por cada salto en damas); la comida se desvanece; las que aparecen (deshacer, otra posición) entran suave */
  function actualizar8(d, b, { clases = () => [], ruta = null, animar = true } = {}){
    for(let i = 0; i < 64; i++){ const el = d._cas[i], cn = [el._base, ...clases(i)].filter(Boolean).join(' '); if(el.className !== cn) el.className = cn; }
    const ant = d._b, dejan = [], llegan = [];
    for(let i = 0; i < 64; i++) if(ant[i] !== b[i]){ if(ant[i]) dejan.push(i); if(b[i]) llegan.push(i); }
    d._b = b.slice();
    if(!dejan.length && !llegan.length) return;
    const nodos = new Map(dejan.map((i) => [i, d._cas[i].querySelector('.jg-pz')]));
    const caja = new Map(); const rc = (i) => { if(!caja.has(i)) caja.set(i, d._cas[i].getBoundingClientRect()); return caja.get(i); };
    if(animar && !quieto()) [...dejan, ...llegan, ...(ruta || [])].forEach(rc);
    const libres = new Set(dejan), fila = (i) => Math.floor(i / 8), col = (i) => i % 8, dist = (x, y) => Math.abs(fila(x) - fila(y)) + Math.abs(col(x) - col(y));
    const llegada = ruta ? ruta[ruta.length - 1] : null, salida = ruta ? ruta[0] : null;
    llegan.sort((x, y) => (y === llegada) - (x === llegada));
    const planes = [];
    for(const t of llegan){
      let cand = [...libres].filter((s2) => ant[s2] === b[t]);
      if(t === llegada && libres.has(salida) && colorPz(ant[salida]) === colorPz(b[t])) cand = [salida];       /* coronar: es la misma pieza */
      cand.sort((x, y) => dist(x, t) - dist(y, t));
      const s2 = cand[0] ?? null; if(s2 != null) libres.delete(s2);
      planes.push([s2, t]);
    }
    const anima = animar && !quieto();
    for(const s2 of libres){ const n = nodos.get(s2); if(!n) continue;
      if(anima){ n.classList.add('jg-sale'); n.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.55)' }], { duration: 220, easing: 'ease-in', fill: 'forwards' }).onfinish = () => n.remove(); }
      else n.remove(); }
    for(const [s2, t] of planes){
      const dest = d._cas[t];
      if(s2 == null){ const n = nodoPieza(b[t]); dest.prepend(n); if(anima) n.animate([{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'ease-out' }); continue; }
      const n = nodos.get(s2); if(!n) continue;
      dest.prepend(n); cambiarPieza(n, b[t]);
      if(!anima) continue;
      const fin = rc(t), paso = (i) => { const r = rc(i); return `translate(${(r.left - fin.left).toFixed(1)}px, ${(r.top - fin.top).toFixed(1)}px)`; };
      const saltos = t === llegada && s2 === salida && ruta && ruta.length > 2 ? ruta : [s2, t];
      const marcos = saltos.map((i, k) => ({ transform: i === t && k === saltos.length - 1 ? 'none' : paso(i) }));
      dest.classList.add('jg-llega');
      const a2 = n.animate(marcos, { duration: Math.min(620, 170 + 70 * Math.sqrt(dist(s2, t)) + 120 * (saltos.length - 2)), easing: 'cubic-bezier(.3, .75, .25, 1)' });
      a2.onfinish = a2.oncancel = () => dest.classList.remove('jg-llega');
    }
  }
  function actualizarReversi(sitio, antes){
    const m = P.m, e = P.e;
    let d = sitio.querySelector('.jg-tab.rev');
    if(!d || d._P !== P){ d = document.createElement('div'); d.className = 'jg-tab rev'; d._P = P; d._cas = [];
      for(let i = 0; i < 64; i++){ const el = document.createElement('button'); el.dataset.i = i; el.setAttribute('aria-label', `casilla ${i + 1}`); el.className = 'jg-c'; d._cas[i] = el; d.appendChild(el); }
      sitio.replaceChildren(d); }
    const js = miTurno() ? m.jugadas(e).filter((j) => !j.pasa) : [], anima = !!antes && !quieto();
    for(let i = 0; i < 64; i++){
      const el = d._cas[i], v = e.b[i];
      const cn = ['jg-c', js.some((j) => j.pos === i) && 'va', e.ult?.pos === i && 'ult', P.marcaPista?.pos === i && 'pista'].filter(Boolean).join(' ');
      if(el.className !== cn) el.className = cn;
      let disco = el.querySelector('.jg-disco');
      if(v === null){ disco?.remove(); continue; }
      if(!disco){ disco = document.createElement('span'); disco.className = `jg-disco k${v}`; el.appendChild(disco);
        if(anima) disco.animate([{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: .7 }, { transform: 'none' }], { duration: 300, easing: 'ease-out' }); continue; }
      if(disco.className !== `jg-disco k${v}`){ disco.className = `jg-disco k${v}`;
        if(anima){ const k = (e.ult?.volteo || []).indexOf(i); disco.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(.05)' }, { transform: 'scaleX(1)' }], { duration: 420, delay: Math.max(0, k) * 60, easing: 'ease-in-out' }); } }
    }
    // si sólo puedo pasar, se pasa solo (una vez)
    if(miTurno() && m.jugadas(e)[0]?.pasa && P._pasa !== e){ P._pasa = e; setTimeout(() => { brindis('No tienes jugada: pasas', 'vino', 'clock'); jugar({ pasa: true }); }, 700); }
  }
  function actualizarC4(sitio, antes){
    const e = P.e, f = P.m.fin(e), linea = new Set(f?.linea || []);
    let d = sitio.querySelector('.jg-c4');
    if(!d || d._P !== P){ d = document.createElement('div'); d.className = 'jg-c4'; d._P = P; d._cas = [];
      for(let i = 0; i < 42; i++){ const el = document.createElement('button'); el.dataset.col = i % 7; el.setAttribute('aria-label', `columna ${i % 7 + 1}`); d._cas[i] = el; d.appendChild(el); }
      sitio.replaceChildren(d); }
    const anima = !!antes && !quieto();
    for(let i = 0; i < 42; i++){
      const el = d._cas[i], v = e.b[i], fila = Math.floor(i / 7), col = i % 7;
      const cn = P.marcaPista?.col === col && fila === 0 ? 'pista' : ''; if(el.className !== cn) el.className = cn;
      let ficha = el.querySelector('i');
      if(v === null){ ficha?.remove(); continue; }
      if(!ficha){ ficha = document.createElement('i'); el.appendChild(ficha);
        if(anima && e.ult?.pos === i) ficha.animate([{ transform: `translateY(${-(fila + 1) * 110}%)` }, { transform: 'none', offset: .78 }, { transform: 'translateY(-9%)', offset: .88 }, { transform: 'none' }], { duration: 300 + fila * 55, easing: 'cubic-bezier(.45, 0, .9, .55)' }); }
      const fc = `k${v}${linea.has(i) ? ' gana' : ''}`; if(ficha.className !== fc) ficha.className = fc;
    }
  }
  /* el dominó sí se rearma (son dibujos, no imágenes que se cargan), pero la ficha jugada vuela de la mano a la mesa */
  const llaveFicha = (a, b) => Math.min(a, b) + '-' + Math.max(a, b);
  function actualizarDomino(sitio, antes){
    const e = P.e, js = miTurno() ? P.m.jugadas(e) : [], puede = new Set(js.filter((j) => j.ficha).map((j) => j.ficha));
    const otro = e.manos[1 - P.yo], anima = !!antes && !quieto();
    const deDonde = new Map(); if(anima){ sitio.querySelectorAll('.jg-dom-mano [data-ficha]').forEach((b) => { const [x, y] = b.dataset.ficha.split('-').map(Number); deDonde.set(llaveFicha(x, y), b.getBoundingClientRect()); }); }
    const enMesaAntes = new Set([...sitio.querySelectorAll('.jg-dom-mesa [data-k]')].map((x) => x.dataset.k));
    const rOtro = sitio.querySelector('.jg-dom-otro')?.getBoundingClientRect();
    const html = `<div class="jg-dom-otro">${otro.map(() => fichaSVG(0, 0, { tapada: true })).join('')}</div>
      <div class="jg-dom-mesa">${e.mesa.length ? e.mesa.map(([a, b]) => `<span data-k="${llaveFicha(a, b)}">${a === b ? fichaSVG(a, b, { clase: 'doble' }) : fichaSVG(a, b, { acostada: true })}</span>`).join('') : '<span class="vacia">Pon la primera</span>'}</div>
      <div class="jg-dom-info"><span>Pozo: ${e.pozo.length}</span></div>
      <div class="jg-dom-mano">${e.manos[P.yo].map((f) => { const k = f[0] + '-' + f[1]; return `<button data-ficha="${k}" class="${puede.has(k) ? 'puede' : ''} ${P.marcaPista?.ficha === k ? 'pista' : ''}" ${js.length && !puede.has(k) ? 'disabled' : ''} aria-label="ficha ${f[0]} y ${f[1]}">${fichaSVG(f[0], f[1])}</button>`; }).join('')}</div>
      ${js[0]?.roba ? '<div class="jg-botones"><button class="bt fuerte" data-roba>Robar</button></div>' : ''}${js[0]?.pasa ? '<div class="jg-botones"><button class="bt fuerte" data-pasa>Pasar</button></div>' : ''}`;
    let d = sitio.querySelector('.jg-dom'); if(!d){ d = document.createElement('div'); d.className = 'jg-dom'; d.style.display = 'grid'; d.style.gap = '12px'; sitio.replaceChildren(d); }
    if(d.dataset.h === html) return;
    d.innerHTML = html; d.dataset.h = html;
    if(!anima) return;
    for(const t of d.querySelectorAll('.jg-dom-mesa [data-k]')){
      if(enMesaAntes.has(t.dataset.k)) continue;
      const de = deDonde.get(t.dataset.k) || rOtro, a = t.getBoundingClientRect(); if(!de) continue;
      t.animate([{ transform: `translate(${(de.left + de.width / 2 - a.left - a.width / 2).toFixed(1)}px, ${(de.top + de.height / 2 - a.top - a.height / 2).toFixed(1)}px) rotate(-12deg) scale(1.1)` }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.3, .75, .25, 1)' });
    }
  }

  /* ══════════════ el entrenador: repasar una partida y ver cómo juegas ══════════════ */
  async function repasar(datos, guardadoYa = null){
    parar(); P = null;
    c = h.capa('juegos');
    const volver = () => abrir();
    c.innerHTML = `<div class="arriba"><button class="bt redondo fantasma" data-salir aria-label="Salir">${ico('chevron-left')}</button><b style="flex:1">Repaso</b></div><div class="cuerpo"><p class="jg-sub">Repasando cada jugada…</p></div>`;
    c.onclick = (ev) => { if(ev.target.closest('[data-salir]')) volver(); };
    await cargarLibro();
    const movs = datos.reg.map((r) => r.uci), estados = datos.reg.map((r) => r.e);
    const libroHasta = enLibroHasta(libro, movs), apertura = aperturaDe(libro, movs);
    let rep = guardadoYa;
    if(!rep){
      const an = await analizarAparte({ estados, movs, yo: datos.yo, libroHasta });
      if(!c.isConnected) return;
      if(!an){ c.querySelector('.cuerpo').innerHTML = '<p class="jg-sub">No se pudo repasar esta partida.</p>'; return; }
      rep = { fecha: Date.now(), nivel: datos.nivel, yo: datos.yo, resultado: datos.resultado, movs, apertura: apertura && apertura.nombre, an, resumen: resumen(an) };
      guardado.repasos.push(rep); guardado.repasos = guardado.repasos.slice(-20); guardar();
      h.sumarXP?.(3, 'repaso');
    }
    pintarRepaso(rep, estados.length ? estados : null);
  }
  function estadosDe(movs){
    const m = MOTORES.ajedrez; let e = m.inicial({}); const out = [];
    for(const u of movs){ out.push(e); const j = m.jugadas(e).find((x) => m.texto(x) === u); if(!j) break; e = m.aplicar(e, j); }
    return out;
  }
  function pintarRepaso(rep, estados){
    estados ||= estadosDe(rep.movs);
    const m = MOTORES.ajedrez, an = rep.an, r0 = rep.resumen;
    let k = Math.max(0, an.findIndex((x) => x.clase === 'grave' || x.clase === 'error')); if(k < 0) k = 0;
    /* se arma una vez; cada paso sólo mueve las piezas y cambia la nota (nada de rehacer el tablero: parpadea) */
    c.innerHTML = `<div class="arriba"><button class="bt redondo fantasma" data-salir aria-label="Salir">${ico('chevron-left')}</button><b style="flex:1">Repaso</b></div>
      <div class="cuerpo jg-rep">
        <div class="jg-rep-cab"><div class="jg-prec" style="--p:${r0.precision}"><b>${r0.precision}</b><small>Precisión</small></div>
          <div><div class="jg-sub" style="margin:0 0 6px">${esc(rep.apertura || 'Sin apertura de libro')}</div><div class="jg-cuenta">${Object.entries(CLASE_JUGADA).filter(([c2]) => r0.cuenta[c2]).map(([c2, v]) => `<span style="--cc:${v.color}"><i></i>${r0.cuenta[c2]} ${esc(v.nombre)}</span>`).join('')}</div></div></div>
        <div class="jg-tab-sitio"></div>
        <div class="jg-rep-nota"><b></b><p></p></div>
        <div class="jg-rep-nav"><button class="bt" data-paso="-1" aria-label="Anterior">${ico('chevron-left')}</button><button class="bt fuerte" data-error>Siguiente error</button><button class="bt" data-paso="1" aria-label="Siguiente">${ico('chevron-right')}</button></div>
        <div class="jg-movs">${an.map((y, q) => `<button data-mov="${q}" aria-current="false" style="--cc:${CLASE_JUGADA[y.clase].color}"><i></i>${Math.floor(y.i / 2) + 1}. ${esc(y.es)}</button>`).join('')}</div>
      </div>`;
    const tab = crear8(rep.yo === 1, false, 'div'); c.querySelector('.jg-tab-sitio').replaceWith(tab);
    const nota = c.querySelector('.jg-rep-nota'), botonesMov = [...c.querySelectorAll('.jg-movs [data-mov]')];
    let primera = true;
    const pinta = () => {
      const x = an[k], cl = CLASE_JUGADA[x.clase];
      const e = estados[x.i], j = m.jugadas(e).find((y) => m.texto(y) === x.uci), n = j ? m.aplicar(e, j) : e;
      const mejor = x.mejorUci && x.clase !== 'mejor' && x.clase !== 'libro' ? m.deTexto(x.mejorUci) : null;
      tab.style.setProperty('--cc', cl.color);
      actualizar8(tab, n.b, { clases: (i) => [j && (j.de === i || j.a === i) && 'hecha', mejor && (mejor.de === i || mejor.a === i) && 'mejor'], ruta: j ? [j.de, j.a] : null, animar: !primera });
      primera = false;
      nota.style.boxShadow = `inset 4px 0 0 ${cl.color}`;
      const tb = `<span style="color:${cl.color}">${esc(cl.nombre)}</span> · ${Math.floor(x.i / 2) + 1}. ${esc(x.es)}`;
      if(nota.firstElementChild.innerHTML !== tb) nota.firstElementChild.innerHTML = tb;
      poner(nota.lastElementChild, 'textContent', x.nota);
      botonesMov.forEach((bm, q) => { const v = String(q === k); if(bm.getAttribute('aria-current') !== v) bm.setAttribute('aria-current', v); });
      /* sólo se mueve la fila de jugadas (scrollIntoView movería también la página: CLAUDE.md) */
      const fila = c.querySelector('.jg-movs'), act = botonesMov[k];
      if(fila && act) fila.scrollTo({ left: act.offsetLeft - fila.clientWidth / 2 + act.offsetWidth / 2, behavior: 'smooth' });
    };
    pinta();
    c.onclick = (ev) => {
      if(ev.target.closest('[data-salir]')){ abrir(); return; }
      const p = ev.target.closest('[data-paso]'); if(p){ k = Math.max(0, Math.min(an.length - 1, k + +p.dataset.paso)); tono(SON.toque); pinta(); return; }
      const mv = ev.target.closest('[data-mov]'); if(mv){ k = +mv.dataset.mov; tono(SON.toque); pinta(); return; }
      if(ev.target.closest('[data-error]')){
        const sig = an.findIndex((y, q) => q > k && ['imprecision', 'error', 'grave'].includes(y.clase));
        if(sig >= 0){ k = sig; tono(SON.toque); pinta(); } else brindis('No hay más errores', '', 'circle-check');
      }
    };
  }
  function verPerfil(){
    const pf = perfil(guardado.repasos);
    const lista = guardado.repasos.slice().reverse();
    h.hoja('Cómo juegas', pf ? `<div class="jg-perfil">
      <div class="fila"><small>Nivel</small><b>${esc(pf.nivel)} · ${pf.precision} % de precisión</b>${pf.tendencia != null ? `<small>${pf.tendencia >= 0 ? 'Mejoraste' : 'Bajaste'} ${Math.abs(pf.tendencia)} puntos en tus últimas partidas</small>` : ''}</div>
      ${pf.error ? `<div class="fila"><small>Tu error de siempre (${pf.error.veces} ${pf.error.veces === 1 ? 'vez' : 'veces'})</small><b>${esc(pf.error.error)}</b><p style="margin:6px 0 0">${esc(pf.error.consejo)}</p></div>` : ''}
      ${pf.peorFase ? `<div class="fila"><small>Donde más fallas</small><b>${esc(pf.peorFase.nombre)} · ${pf.peorFase.precision} %</b></div>` : ''}
      ${pf.apertura ? `<div class="fila"><small>Tu apertura</small><b>${esc(pf.apertura.nombre)}</b></div>` : ''}
      <div class="jg-seccion">Tus partidas</div>
      ${lista.map((r, q) => `<button class="jg-clase-f" data-rep="${guardado.repasos.length - 1 - q}">${ico(r.resultado === 'ganaste' ? 'trophy' : 'swords')}<span>${esc(r.apertura || 'Partida')} · ${r.resumen.precision} %</span></button>`).join('')}
    </div>` : '<p class="jg-sub">Juega contra la máquina y toca «Repasar» al terminar: aquí verás cómo juegas.</p>', (hj) => {
      hj.addEventListener('click', (ev) => { const b = ev.target.closest('[data-rep]'); if(!b) return; h.cerrarHoja(); const r = guardado.repasos[+b.dataset.rep]; c = h.capa('juegos'); pintarRepaso(r, null); });
    });
  }

  return { abrir, avisoDeJuego, repasar, verPerfil, get partida(){ return P; } };
}
