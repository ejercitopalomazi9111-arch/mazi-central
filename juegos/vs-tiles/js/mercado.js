/* EL MERCADO DE ECOS: tres máquinas de verdad, en 3D (vitrina.js), y cada una con sus propios premios
   (Carlos, 30 oct: «cambia todo lo de la tienda por modelos reales… y que cada uno de los 3 tenga diferentes
   cosméticos disponibles»).
     · GARRA: mueves el gancho, baja, agarra un peluche y lo saca. Trae VOCES y FORMAS de nota.
     · SOBRE: se rasga deslizando el dedo y las cartas se destapan una por una. Trae COLORES, FONDOS y TÍTULOS.
     · RULETA: gira y frena en la rareza que te tocó. Trae los EFECTOS: golpe, flechas, símbolos, aros y botones.
   El premio se decide al PAGAR, con las probabilidades publicadas (y la garantía a las 50); la máquina sólo lo
   enseña. Así la habilidad con la garra no cambia lo que sale: cambia lo divertido que es sacarlo.
   Y el premio no se cierra solo: lo cierra quien jugó (lección de Ligas Mazi, «se cierra muy rápido»). */
import { crearVitrina } from './vitrina.js';

export const MAQUINAS = {
  garra: { n: 'Garra', trae: 'Voces y formas', cats: ['voz', 'forma'] },
  sobre: { n: 'Sobre', trae: 'Colores, fondos y títulos', cats: ['nota', 'fondo', 'titulo'] },
  ruleta: { n: 'Ruleta', trae: 'Efectos y botones', cats: ['golpe', 'flechas', 'simbolos', 'aros', 'boton'] }
};

export function montarMercado({ $, Y, RAREZA, sortear, pagar, barra, reloj, sonidos, vista, activo }){
  const COL = { c: '#B9AECB', r: '#38E1FF', e: '#B44BFF', l: '#FFC24B', m: '#FF2D55' };
  const NOMBRE = Object.fromEntries(Object.entries(RAREZA).map(([k, v]) => [k, v.n]));
  let maq = 'garra', ocupado = false, V = null, pagadoGarra = null;
  const tick = (vol = .18) => sonidos.clic && reloj.golpe(sonidos.clic, vol);
  const leyenda = (t) => { const L = $('#gLeyenda'); if(L) L.innerHTML = t; };
  const mejorDe = (sale) => sale.reduce((a, s) => 'crelm'.indexOf(s.o.raro) > 'crelm'.indexOf(a.o.raro) ? s : a, sale[0]);

  /* ── el premio, en grande ── */
  function premio(sale, titulo = '¡Te salió!', despues = pintar){
    const P = $('#premio'), mejor = mejorDe(sale);
    P.style.setProperty('--rc', COL[mejor.o.raro]);
    P.innerHTML = `<div class="premioCaja"><div class="ojo">${titulo}</div><div class="premioLista${sale.length > 1 ? ' varios' : ''}">${sale.map(({ o, nuevo }) =>
      `<div class="premioObj" style="--rc:${COL[o.raro]}"><div class="muestra">${vista(o)}</div><b>${o.nombre}</b><small>${RAREZA[o.raro].n.toUpperCase()} · ${nuevo ? 'NUEVO' : 'REPETIDO (+Ecos)'}</small></div>`).join('')}</div>
      <button class="b primario grande" id="premioB">Seguir</button></div>`;
    P.classList.add('vis'); if(['l', 'm'].includes(mejor.o.raro) && sonidos.premio) reloj.golpe(sonidos.premio, .7);
    $('#premioB').onclick = () => { P.classList.remove('vis'); ocupado = false; barra(); pintarSaldo(); despues(); };
  }

  /* ── la tira de máquinas, la vitrina y los botones de cada una ── */
  function pintar(){ const T = $('#gTira'); T.innerHTML = '';
    Object.entries(MAQUINAS).forEach(([k, M]) => { const b = document.createElement('button'); b.innerHTML = `${M.n}<small>${M.trae}</small>`; b.className = k === maq ? 'si' : '';
      b.onclick = () => { if(ocupado) return; maq = k; pintar(); }; T.appendChild(b); });
    const E = $('#gEscena');
    if(!V || !E.contains(V.cv)){ E.innerHTML = '<canvas id="vitrina" aria-label="La máquina"></canvas><div class="gCapa" id="gCapa"></div><div class="gCarga" id="gCarga">Encendiendo la máquina…</div><p class="sub" id="gLeyenda"></p>';
      V?.apagar(); V = crearVitrina($('#vitrina'), { COL, NOMBRE, activo }); V.cv = $('#vitrina'); }
    E.className = 'maquina ' + maq; $('#gCapa').innerHTML = ''; $('#gCapa').classList.remove('vis');
    pintarSaldo(); ({ garra, sobre, ruleta })[maq](); }
  const cargando = async (p) => { $('#gCarga').classList.add('vis'); try{ return await p; } finally { $('#gCarga').classList.remove('vis'); } };

  const boton = (txt, fn, prim) => { const b = document.createElement('button'); b.className = 'b' + (prim ? ' primario' : ''); b.innerHTML = txt; b.onclick = fn; return b; };
  function botones(...bs){ const B = $('#gBotones'); B.innerHTML = ''; bs.forEach(b => B.appendChild(b)); }
  const pintarSaldo = () => { $('#gSaldo').innerHTML = `<span><i class="ec"></i>${Y.ecos} Ecos</span><span><i class="se"></i>${Y.sellos} Sellos</span><span>Garantía legendaria en ${50 - Y.pity}</span>`; };

  /* ═══ RULETA ═══ */
  async function ruleta(){ botones(); leyenda('Gira y frena en la rareza que te tocó.');
    const R = await cargando(V.rueda({ tick })); if(!R) return;
    botones(boton('1 · 1 Sello', () => girar(1, true)), boton('1 · 100 Ecos', () => girar(1)), boton('10 · 900 Ecos', () => girar(10), true)); }
  async function girar(n, conSello = false){ if(ocupado || !V.actual?.girar) return; if(!pagar(n === 10 ? 900 : 100, conSello)) return; ocupado = true; pintarSaldo(); barra();
    const sale = sortear(n, 'ruleta'), mejor = mejorDe(sale); leyenda('Girando…'); tick(.3);
    await V.actual.girar(mejor.o.raro);
    leyenda(`<b style="color:${COL[mejor.o.raro]}">${RAREZA[mejor.o.raro].n}</b> · ${mejor.o.nombre}`);
    setTimeout(() => premio(sale, n > 1 ? `Tus ${n} tiradas` : '¡Te salió!', () => leyenda('Gira y frena en la rareza que te tocó.')), 700); }

  /* ═══ SOBRE ═══ */
  async function sobre(){ botones(); leyenda('Cinco cartas por sobre. Al abrirlo, destápalas una por una.');
    const S = await cargando(V.sobre({ alAbrir: () => repartir() })); if(!S) return;
    botones(boton('Sobre · 450 Ecos', abrirSobre, true)); }
  let cartasSobre = null;
  function abrirSobre(){ if(ocupado || !V.actual?.preparar) return; if(!pagar(450)) return; ocupado = true; pintarSaldo(); barra();
    cartasSobre = sortear(5, 'sobre'); $('#gBotones').innerHTML = ''; V.actual.preparar(); tick(.3);
    leyenda('Desliza el dedo de lado a lado sobre el sobre para rasgarlo <span class="sub2">(o tócalo tres veces)</span>.'); }
  function repartir(){ const sale = cartasSobre, capa = $('#gCapa'); reloj.golpe(sonidos.glitch, .3);
    capa.innerHTML = `<div class="cartas">${sale.map(({ o }, i) => `<button class="carta" data-i="${i}" style="--rc:${COL[o.raro]};--d:${i * .09}s"><div class="cara atras${['e', 'l', 'm'].includes(o.raro) ? ' brilla' : ''}"><i>VS</i></div><div class="cara frente"><div class="muestra">${vista(o)}</div><b>${o.nombre}</b><small>${RAREZA[o.raro].n}</small></div></button>`).join('')}</div>`;
    capa.classList.add('vis'); leyenda('Toca cada carta para voltearla. Las que brillan traen algo bueno.');
    let vueltas = 0; capa.querySelectorAll('.carta').forEach(c => c.onclick = () => { if(c.classList.contains('volteando')) return; c.classList.add('volteando'); setTimeout(() => c.classList.add('volteada'), 250); tick(.3);
      const o = sale[+c.dataset.i].o; if(['l', 'm'].includes(o.raro) && sonidos.premio) reloj.golpe(sonidos.premio, .6);
      if(++vueltas === sale.length) setTimeout(() => premio(sale, 'Tu sobre'), 900); });
    botones(boton('Voltear todas', () => capa.querySelectorAll('.carta:not(.volteando)').forEach((c, k) => setTimeout(() => c.click(), k * 220)))); }

  /* ═══ GARRA ═══ */
  async function garra(){ botones(); leyenda('Mueve el gancho con el dedo o con las flechas y suéltalo sobre un peluche.');
    const G = await cargando(V.garra({ leyenda, tick, alPremio: () => { reloj.golpe(sonidos.golpe, .4); const sale = pagadoGarra; pagadoGarra = null;
      setTimeout(() => premio(sale, '¡La sacaste!', () => { V.actual?.reiniciar?.(); leyenda('Mueve el gancho y suéltalo sobre un peluche.'); }), 250); } }));
    if(!G) return;
    const flecha = (d) => { const b = boton(`<img class="ico" src="sprites/iconos/${d < 0 ? 'arrowLeft' : 'arrowRight'}.png" alt="">`, () => {}); b.classList.add('chico'); b.setAttribute('aria-label', d < 0 ? 'Gancho a la izquierda' : 'Gancho a la derecha');
      b.onpointerdown = () => V.actual?.mover?.(d); b.onpointerup = b.onpointerleave = b.onpointercancel = () => V.actual?.mover?.(0); return b; };
    botones(flecha(-1), boton('Bajar · 100 Ecos', () => bajar(false), true), boton('Bajar · 1 Sello', () => bajar(true)), flecha(1)); }
  function bajar(conSello){ const G = V.actual; if(!G?.bajar || G.E.fase !== 'libre') return;
    /* un intento pagado que se fue sigue pagado: se puede volver a bajar sin cobrar */
    if(!pagadoGarra){ if(!pagar(100, conSello)) return; pagadoGarra = sortear(1, 'garra'); ocupado = true; barra(); pintarSaldo(); }
    G.bajar(); }

  return { abrir(){ ocupado = false; pintar(); }, get vitrina(){ return V; } };
}
