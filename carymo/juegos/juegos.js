/* ══════════════════════════════════════════════════════════════════════════
   JUEGOS DE MESA DE CARYMO · la pantalla
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 14 nov: ajedrez, damas, reversi, Conecta 4 y dominó; clases de
   estrategia que se aprenden JUGANDO; contra la máquina y contra otros
   jugadores de la app o tus amigos. Pocas palabras en pantalla.

   Las reglas viven en motores.js (las mismas que usa el servidor), las clases
   en clases.js y la máquina piensa aparte en maquina.js.
   ═════════════════════════════════════════════════════════════════════════ */
import { MOTORES, elegir, enJaque } from './motores.js';
import { CLASES } from './clases.js';
import { cumple, pista } from './revisar.js';

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
.jg-botones{ display:flex; flex-wrap:wrap; gap:8px; justify-content:center } .jg-botones .bt{ min-height:44px }
.jg-fin{ position:fixed; inset:0; z-index:90; display:grid; place-items:center; background:#170A26cc; padding:16px; animation:jgEntra .3s ease }
.jg-fin > div{ width:min(100%, 380px); padding:24px 20px; border-radius:24px; background:var(--fondo-2); text-align:center; box-shadow:0 30px 80px #000 }
.jg-fin h2{ font:900 34px/1 Titulo; margin:0 0 6px } .jg-fin p{ color:var(--suave); margin:0 0 18px } .jg-fin .jg-masc{ width:110px; height:118px; margin:0 auto 6px }
@keyframes jgEntra{ from{ opacity:0 } }
.jg-buscando{ display:grid; justify-items:center; gap:14px; padding:40px 0; text-align:center } .jg-buscando .i{ width:42px; height:42px; color:var(--claro-txt); animation:jgGira 1.6s linear infinite }
@keyframes jgGira{ to{ transform:rotate(360deg) } }
@media (prefers-reduced-motion: reduce){ .jg-disco.voltea, .jg-c4 i.cae, .jg-buscando .i{ animation:none } }
`;

export function iniciarJuegos(h){
  const { ico, esc, sala, tono, SON, brindis } = h;
  if(!document.getElementById('jg-css')){ const s = document.createElement('style'); s.id = 'jg-css'; s.textContent = CSS; document.head.append(s); }
  const guardado = (() => { try{ return JSON.parse(localStorage.getItem('carymo.juegos') || '{}'); }catch{ return {}; } })();
  guardado.clases ||= {};
  const guardar = () => { try{ localStorage.setItem('carymo.juegos', JSON.stringify(guardado)); }catch{} };

  /* ── la máquina, en su trabajador (si el teléfono no lo deja, piensa aquí mismo) ── */
  let trabajador = null, pedidoN = 0; const esperando = new Map();
  try{ trabajador = new Worker(new URL('./maquina.js', import.meta.url), { type: 'module' }); trabajador.onmessage = (ev) => { const f = esperando.get(ev.data.id); if(f){ esperando.delete(ev.data.id); f(ev.data.j); } }; trabajador.onerror = () => { trabajador = null; }; }catch{ trabajador = null; }
  const pensar = (juego, e, nivel) => new Promise((ok) => {
    if(!trabajador){ setTimeout(() => ok(elegir(MOTORES[juego], e, nivel)), 30); return; }
    const id = ++pedidoN; esperando.set(id, ok); trabajador.postMessage({ id, juego, e, nivel });
    setTimeout(() => { if(esperando.has(id)){ esperando.delete(id); ok(elegir(MOTORES[juego], e, nivel)); } }, 8000);
  });

  let c = null, P = null, reloj = 0, mias = { partidas: [], stats: {} };
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
      <div class="jg-seccion">Contra la máquina</div>
      <div class="jg-niveles">${Object.entries(NIVEL).map(([k, v]) => `<button class="bt" data-nivel="${k}">${v}</button>`).join('')}</div>
      <div class="jg-seccion">En línea</div>
      <div class="jg-niveles" style="grid-template-columns:1fr 1fr"><button class="bt fuerte" data-linea="buscar">${ico('search')}Buscar rival</button><button class="bt" data-linea="retar">${ico('swords')}Retar</button></div></div>`, (hj) => {
      hj.addEventListener('click', (ev) => {
        const k = ev.target.closest('[data-clase]'); if(k){ h.cerrarHoja(); empezarClase(id, k.dataset.clase); return; }
        const n = ev.target.closest('[data-nivel]'); if(n){ h.cerrarHoja(); empezarMaquina(id, n.dataset.nivel); return; }
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
    P = { juego, m, modo: 'maquina', nivel, e, e0, yo: 0, hist: [], nombres: ['Tú', `Máquina · ${NIVEL[nivel]}`], meta };
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
      const j = await pensar(P.juego, P.e, P.nivel || 'medio');
      await new Promise((ok) => setTimeout(ok, Math.max(0, 450 - (performance.now() - t0))));
      if(P !== yo || !j) return;
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
    const xp = gane ? (P.modo === 'linea' ? XP_GANAR.linea : XP_GANAR[P.nivel] || 5) : empate ? 3 : 0;
    if(xp) h.sumarXP?.(xp, 'juego');
    if(gane){ tono(SON.fin); h.confeti?.(); } else if(!empate) tono(SON.perdio || SON.mal);
    const elo = P.modo === 'linea' && P.linea.final ? P.linea.final.cambioElo[P.yo] : null;
    const extra = [f.motivo, xp ? `+${xp} XP` : '', elo != null ? `${elo >= 0 ? '+' : ''}${elo} puntos` : ''].filter(Boolean).join(' · ');
    setTimeout(() => mostrarFin(gane ? '¡Ganaste!' : empate ? 'Empate' : 'Perdiste', extra,
      P?.modo === 'linea' ? [['menu', 'Juegos'], ['otra', 'Otra']] : [['otra', 'Otra'], ['menu', 'Juegos']],
      (a) => { if(a === 'otra'){ if(P.modo === 'linea') buscarRival(P.juego); else empezarMaquina(P.juego, P.nivel, P.e0, P.meta); } else abrir(); },
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
    c.innerHTML = `<div class="jg-mesa">
      <div class="jg-arriba"><button class="bt redondo fantasma" data-salir aria-label="Salir">${ico('chevron-left')}</button><b>${esc(tit)}</b>${P.modo === 'clase' ? `<span class="jg-pill">${P.paso + 1}/${P.clase.pasos.length}</span>` : ''}</div>
      ${P.modo === 'clase' ? `<div class="jg-dice ${P.diceClase || ''}"><div class="jg-masc"></div><p>${negritas(P.dice)}</p></div>` : jugadorHTML(1 - P.yo, rival)}
      <div class="jg-estado" aria-live="polite"></div>
      <div class="jg-tablero"></div>
      ${P.modo === 'clase' ? '' : jugadorHTML(P.yo, yoN)}
      <div class="jg-botones">${botones.map(([k, i, t]) => `<button class="bt" data-accion="${k}">${ico(i)}${t}</button>`).join('')}</div></div>`;
    c.querySelector('.jg-tablero').append(tablero({ antes }));
    if(P.modo === 'clase'){ P.masc = h.mascotaEn?.(c.querySelector('.jg-masc'), { tam: 68 }); }
    pintarEstado();
    c.onclick = onClickMesa;
  }
  const negritas = (t) => esc(t || '').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  function pintarDice(){ const d = c?.querySelector('.jg-dice'); if(!d) return; d.className = `jg-dice ${P.diceClase || ''}`; d.querySelector('p').innerHTML = negritas(P.dice); }
  function colorDe(j){
    const g = P.juego;
    if(g === 'ajedrez') return j === 0 ? '#F1ECF4' : '#24113A';
    if(g === 'damas') return j === 0 ? '#F1ECF4' : '#7E1735';
    if(g === 'reversi') return j === 0 ? '#170A26' : '#F1ECF4';
    if(g === 'conecta4') return j === 0 ? '#E8B54A' : '#E2506A';
    return j === 0 ? '#AC27FF' : '#7E1735';
  }
  function jugadorHTML(j, nombre){
    let extra = '';
    if(P.juego === 'reversi'){ const n = P.m.cuenta(P.e); extra = `<small>${n[j]}</small>`; }
    if(P.juego === 'domino'){ extra = `<small>${P.e.manos[j].length} fichas</small>`; }
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
    c.querySelectorAll('[data-jugador]').forEach((el) => el.classList.toggle('turno', !f && m.turno(P.e) === +el.dataset.jugador));
  }
  async function onClickMesa(ev){
    if(ev.target.closest('[data-salir]')){ parar(); document.querySelector('.jg-fin')?.remove(); abrir(); return; }
    const a = ev.target.closest('[data-accion]');
    if(a){
      const k = a.dataset.accion;
      if(k === 'pista'){ if(!miTurno()) return; const meta = P.modo === 'clase' ? P.clase.pasos[P.paso].meta : null; P.marcaPista = pista(P.m, P.e, meta); tono(SON.pop); pintarMesa(); return; }
      if(k === 'deshacer'){ if(P.pensando || !P.hist.length) return; let e = P.hist.pop(); while(P.hist.length && P.m.turno(e) !== P.yo) e = P.hist.pop(); P.e = e; P.cerrada = false; pintarMesa(); return; }
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
    const t = c.querySelector('.jg-tablero'); t.replaceChildren(tablero());
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

  /* ── dibujar cada tablero ── */
  function tablero({ antes } = {}){
    const g = P.juego;
    if(g === 'ajedrez' || g === 'damas') return tablero8(antes);
    if(g === 'reversi') return tableroReversi(antes);
    if(g === 'conecta4') return tableroC4(antes);
    return tableroDomino();
  }
  function tablero8(antes){
    const m = P.m, e = P.e, d = document.createElement('div'); d.className = 'jg-tab';
    const vuelta = P.yo === 1, js = miTurno() ? m.jugadas(e) : [];
    const desde = (j) => P.juego === 'ajedrez' ? j.de : j.ruta[0], hasta = (j) => P.juego === 'ajedrez' ? j.a : j.ruta[j.ruta.length - 1];
    const destinos = P.sel != null ? js.filter((j) => desde(j) === P.sel) : [];
    const ult = e.ult ? (P.juego === 'ajedrez' ? [e.ult.de, e.ult.a] : [e.ult.ruta[0], e.ult.ruta[e.ult.ruta.length - 1]]) : [];
    const rey = P.juego === 'ajedrez' && enJaque(e) ? e.b.indexOf(e.t === 'w' ? 'K' : 'k') : -1;
    const piPista = P.marcaPista ? [desde(P.marcaPista), hasta(P.marcaPista)] : [];
    let html = '';
    for(let k = 0; k < 64; k++){
      const i = vuelta ? 63 - k : k, f = Math.floor(i / 8), col = i % 8, p = e.b[i];
      const cls = ['jg-c', (f + col) % 2 ? 'o' : '', ult.includes(i) ? 'ult' : '', P.sel === i ? 'sel' : '', rey === i ? 'jaque' : '', piPista.includes(i) ? 'pista' : ''];
      const va = destinos.find((j) => hasta(j) === i);
      if(va) cls.push('va', (P.juego === 'ajedrez' ? va.cap : va.caps.length) ? 'come' : '');
      let dentro = '';
      if(P.juego === 'ajedrez' && p) dentro = `<img src="${PIEZA(p)}" alt="">`;
      if(P.juego === 'damas' && p) dentro = `<span class="jg-ficha-d ${'aA'.includes(p) ? 'a' : 'b'}">${p === p.toUpperCase() ? ico('crown') : ''}</span>`;
      const coordF = (vuelta ? col === 7 : col === 0) ? `<span class="jg-coord f">${8 - f}</span>` : '';
      const coordC = (vuelta ? f === 0 : f === 7) ? `<span class="jg-coord c">${'abcdefgh'[col]}</span>` : '';
      html += `<button class="${cls.filter(Boolean).join(' ')}" data-i="${i}" aria-label="${'abcdefgh'[col]}${8 - f}">${dentro}${P.juego === 'ajedrez' ? coordF + coordC : ''}</button>`;
    }
    d.innerHTML = html;
    return d;
  }
  function tableroReversi(antes){
    const m = P.m, e = P.e, d = document.createElement('div'); d.className = 'jg-tab rev';
    const js = miTurno() ? m.jugadas(e).filter((j) => !j.pasa) : [];
    const volteadas = new Set(e.ult?.volteo || []);
    let html = '';
    for(let i = 0; i < 64; i++){
      const v = e.b[i], va = js.some((j) => j.pos === i);
      const cls = ['jg-c', va ? 'va' : '', e.ult?.pos === i ? 'ult' : '', P.marcaPista?.pos === i ? 'pista' : ''];
      html += `<button class="${cls.filter(Boolean).join(' ')}" data-i="${i}" aria-label="casilla ${i + 1}">${v === null ? '' : `<span class="jg-disco k${v} ${antes && volteadas.has(i) ? 'voltea' : ''}"></span>`}</button>`;
    }
    d.innerHTML = html;
    // si sólo puedo pasar, se pasa solo
    if(miTurno() && m.jugadas(e)[0]?.pasa) setTimeout(() => { brindis('No tienes jugada: pasas', 'vino', 'clock'); jugar({ pasa: true }); }, 700);
    return d;
  }
  function tableroC4(antes){
    const e = P.e, d = document.createElement('div'); d.className = 'jg-c4';
    const f = P.m.fin(e), linea = new Set(f?.linea || []);
    let html = '';
    for(let i = 0; i < 42; i++){
      const v = e.b[i], fila = Math.floor(i / 7), col = i % 7;
      const nueva = antes && e.ult?.pos === i;
      html += `<button data-col="${col}" class="${P.marcaPista?.col === col && fila === 0 ? 'pista' : ''}" aria-label="columna ${col + 1}">${v === null ? '' : `<i class="k${v} ${nueva ? 'cae' : ''} ${linea.has(i) ? 'gana' : ''}" style="--desde:${-(fila + 1) * 110}%"></i>`}</button>`;
    }
    d.innerHTML = html;
    return d;
  }
  function tableroDomino(){
    const e = P.e, d = document.createElement('div'); d.style.display = 'grid'; d.style.gap = '12px';
    const js = miTurno() ? P.m.jugadas(e) : [], puede = new Set(js.filter((j) => j.ficha).map((j) => j.ficha));
    const otro = e.manos[1 - P.yo];
    d.innerHTML = `<div class="jg-dom-otro">${otro.map(() => fichaSVG(0, 0, { tapada: true })).join('')}</div>
      <div class="jg-dom-mesa">${e.mesa.length ? e.mesa.map(([a, b]) => a === b ? fichaSVG(a, b, { clase: 'doble' }) : fichaSVG(a, b, { acostada: true })).join('') : '<span class="vacia">Pon la primera</span>'}</div>
      <div class="jg-dom-info"><span>Pozo: ${e.pozo.length}</span></div>
      <div class="jg-dom-mano">${e.manos[P.yo].map((f) => { const k = f[0] + '-' + f[1]; return `<button data-ficha="${k}" class="${puede.has(k) ? 'puede' : ''} ${P.marcaPista?.ficha === k ? 'pista' : ''}" ${js.length && !puede.has(k) ? 'disabled' : ''} aria-label="ficha ${f[0]} y ${f[1]}">${fichaSVG(f[0], f[1])}</button>`; }).join('')}</div>
      ${js[0]?.roba ? '<div class="jg-botones"><button class="bt fuerte" data-roba>Robar</button></div>' : ''}${js[0]?.pasa ? '<div class="jg-botones"><button class="bt fuerte" data-pasa>Pasar</button></div>' : ''}`;
    return d;
  }

  return { abrir, avisoDeJuego, get partida(){ return P; } };
}
