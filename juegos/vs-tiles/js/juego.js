/* LA PARTIDA: entrada, juicio y la capa 2D encima del 3D.
   La entrada se juzga EN EL EVENTO (con su timeStamp), nunca en el cuadro: si el teléfono se traba
   un cuadro, el toque ya se juzgó con su hora real. Cada modo traduce el toque a su nota:
     · Carril: el riel más cercano A LO LARGO de la línea de golpe proyectada en pantalla (así, aunque el
       carril esté girado, inclinado o en espejo, el toque cae en el riel que se ve debajo del dedo);
     · Flechas: la cuarta parte de la pantalla; · Símbolos: el botón △ □ × ○; · Círculos: el círculo. */
import { reloj } from './reloj.js';
import { crearJuez, JUICIOS, ALCANCE } from './juez.js';
import { COLORES_RIEL } from './escena.js';

const SIM = ['triangle', 'square', 'cross', 'circle'];            // △ □ × ○ (el orden de los botones)
const COLOR_SIM = ['#3DDC97', '#FF6BD6', '#7AA7FF', '#FF5A5A'];
const FLECHA = ['left', 'down', 'up', 'right'], COLOR_FL = ['#C24B99', '#00E5FF', '#12FA05', '#F9393F'], RIEL_FL = [1, 2, 4, 5];
const TECLAS_CARRIL = { 2: ['f', 'j'], 3: ['f', ' ', 'j'], 4: ['d', 'f', 'j', 'k'], 5: ['d', 'f', ' ', 'j', 'k'], 6: ['s', 'd', 'f', 'j', 'k', 'l'], 7: ['s', 'd', 'f', ' ', 'j', 'k', 'l'] };
const TECLAS_DIVA = { w: 0, i: 0, arrowup: 0, a: 1, j: 1, arrowleft: 1, s: 2, k: 2, arrowdown: 2, d: 3, l: 3, arrowright: 3 };
const TECLAS_FL = { arrowleft: 0, d: 0, arrowdown: 1, f: 1, arrowup: 2, j: 2, arrowright: 3, k: 3 };
const ACERCA = { tutorial: 1.7, facil: 1.25, normal: 1.0, dificil: .82, experto: .66, exorcist: .52 };

export async function cargarSprites(){
  const nombres = ['paloma', 'gen_circle_fill', 'gen_circle_outline', 'p_light_01', 'p_flare_01', 'p_star_06', 'p_star_01', 'p_spark_05', 'p_magic_03', 'p_circle_03', 'p_twirl_01', 'p_trace_04', 'p_slash_03', 'p_symbol_01', 'p_window_02',
    ...SIM.flatMap(s => [`ps_color_${s}`, `ps_color_${s}_outline`, `ps_${s}_outline`]), ...FLECHA.flatMap(f => [`tecla_arrow_${f}`, `tecla_arrow_${f}_outline`])];
  const S = {}; await Promise.all(nombres.map(n => new Promise(r => { const im = new Image(); im.onload = () => { S[n] = im; r(); }; im.onerror = r; im.src = `sprites/${n}.png`; })));
  /* versiones teñidas (el canvas 2D no tiñe solo): se hornean una vez */
  S.teñir = (n, color) => { const k = n + color; if(S[k]) return S[k]; const im = S[n]; if(!im) return null; const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d');
    x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); x.globalCompositeOperation = 'destination-over'; x.globalAlpha = .0; x.drawImage(im, 0, 0); return S[k] = c; };
  return S;
}

export function crearPartida({ escena, capa, sprites: S, sonidos, ajustes, alTerminar }){
  const x = capa.getContext('2d');
  let W = 0, H = 0, dpr = 1, carta = null, an = null, J = null, est = null, cancion = null, corriendo = false, pausa = false, auto = false, fin = 0, bajos = null;
  const efectos = [], textos = [];
  /* el tamaño de verdad del lienzo (innerHeight miente en el iPhone cuando la barra de Safari aparece o
     se esconde, y en modo teléfono daba 1040 con una pantalla de 844: los receptores quedaban fuera) */
  /* las zonas que el iPhone se queda (la isla dinámica arriba, la rayita para salir abajo, la muesca de lado en
     horizontal). Se miden con un elemento de prueba: leer env() desde una variable de CSS devuelve el texto sin
     resolver, no los píxeles */
  const sonda = document.createElement('div'); sonda.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'; document.body.appendChild(sonda);
  let SA = { t: 0, r: 0, b: 0, l: 0 };
  function medir(){ const cs = getComputedStyle(sonda); SA = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
    dpr = Math.min(2, devicePixelRatio || 1); W = capa.clientWidth || document.documentElement.clientWidth; H = capa.clientHeight || document.documentElement.clientHeight; capa.width = W * dpr; capa.height = H * dpr; capa.style.width = W + 'px'; capa.style.height = H + 'px'; escena.medir(W, H); }
  addEventListener('resize', medir); window.visualViewport?.addEventListener('resize', medir); new ResizeObserver(medir).observe(capa); medir();

  /* el modo que manda en el segundo t (para la entrada: frontera exacta) y el que se ve (0.3 s antes, para
     que la pantalla ya esté cambiando cuando llegue la sección) */
  const modoEn = (t, adelanto = 0) => { if(!carta) return 'carril'; const p = carta.plan.find(p => t + adelanto >= p.t0 && t + adelanto < p.t1) || carta.plan.at(-1); return p.modo; };
  const area = () => { const lado = Math.min(W, H * .78), ax = (W - lado * (W > H ? 1.3 : 1)) / 2; return { x: Math.max(12, ax), y: H * .12, w: Math.min(W - 24, lado * (W > H ? 1.3 : 1)), h: H * .66 }; };
  const enArea = (n) => { const A = area(); return [A.x + n.x * A.w, A.y + n.y * A.h]; };
  const radio = () => Math.min(W, H) * (carta && carta.dif === 'exorcist' ? .062 : carta && carta.dif === 'experto' ? .07 : .08);
  const botonesDiva = () => { const b = Math.min(W / 4.6, H / 3.6, 110), y = H - b * .75 - 18 - SA.b, xs = [SA.l + b * .65, SA.l + b * 1.75, W - SA.r - b * 1.75, W - SA.r - b * .65]; return xs.map((cx, i) => ({ x: cx, y: y - (i === 1 || i === 2 ? b * .35 : 0), r: b * .5, i })); };

  /* ══ juzgar ══ */
  function marcar(n, j, dt, donde){
    est.estado[n.id] = n.fin && j.id !== 'fallo' ? 'sosteniendo' : (j.id === 'fallo' ? 'fallada' : 'hecha');
    est.ultimoGolpe = performance.now();
    if(j.id !== 'fallo'){ if(sonidos.golpe && ajustes.sonidoGolpe) reloj.golpe(sonidos.golpe, .35);
      if(n.modo === 'carril') escena.golpeRiel(n.r, j.id === 'sonoluz' ? '#FFF3B0' : null);
      const [px, py] = donde || [W / 2, H * .6]; efectos.push({ x: px, y: py, t0: performance.now(), j, color: j.color }); }
    else if(sonidos.fallo) reloj.golpe(sonidos.fallo, .25);
    textos.push({ j, dt, t0: performance.now() });
  }
  function juzgar(n, t, donde){ const j = J.juzgar(t - n.t, n); if(!j) return false; marcar(n, j, t - n.t, donde); return true; }
  /* la nota más temprana todavía viva que cumple `filtro`, dentro del alcance */
  function candidata(t, filtro){ let mejor = null; const wg = J.ventana()[2];
    for(let k = est.desde; k < carta.notas.length; k++){ const n = carta.notas[k]; if(n.t > t + ALCANCE) break; if(n.rival || (est.estado[n.id] && est.estado[n.id] !== 'pendiente') || n.t < t - ALCANCE || !filtro(n)) continue;
      /* la más cercana; pero una más vieja que todavía está en GENIAL gana (si no, se «come» la que sigue) */
      if(!mejor) mejor = n; else if(Math.abs(n.t - t) < Math.abs(mejor.t - t) && !(Math.abs(mejor.t - t) <= wg && mejor.t < n.t)) mejor = n; }
    return mejor; }

  /* ══ la entrada ══ */
  const dedos = new Map();
  /* lo que está apretado AHORA (aunque no haya nota): mientras el dedo siga abajo, su botón se queda encendido
     (Carlos, 30 oct: «si mantengo pulsado el botón dentro de cualquier minijuego, que se mantenga encendido») */
  const apretado = new Map(), tenido = (m, k) => { for(const a of apretado.values()) if(a.m === m && a.k === k) return true; return false; };
  let receptores = [];       // [{r, x, y}] en pantalla, cada cuadro
  let tAhora = null;
  function rielBajo(px, py){
    const vis = receptores.filter(q => q.vis > .5); if(vis.length < 1) return null;
    if(vis.length === 1) return vis[0].r;
    /* la línea de golpe en pantalla: de su primer a su último receptor; el toque se proyecta sobre ella */
    const a = vis[0], b = vis[vis.length - 1], dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1;
    const s = ((px - a.x) * dx + (py - a.y) * dy) / L2;
    const orden = vis.map(q => ({ r: q.r, d: Math.abs(((q.x - a.x) * dx + (q.y - a.y) * dy) / L2 - s) })).sort((p, q) => p.d - q.d);
    /* cuando dos rieles quedan bajo el dedo (se cruzan en un espejo, se amontonan al cambiar de número),
       gana el que tiene una nota esperando */
    const paso = 1 / Math.max(1, vis.length - 1), cerca = orden.filter(o => o.d <= orden[0].d + paso * .5);
    if(cerca.length > 1 && tAhora !== null){ const con = cerca.find(o => candidata(tAhora, n => n.modo === 'carril' && n.r === o.r)); if(con) return con.r; }
    return orden[0].r;
  }
  function baja(id, t, px, py, tecla){
    if(!corriendo || pausa || auto) return;
    const m = modoEn(t);
    if(m === 'carril'){ tAhora = t; const r = tecla !== undefined ? tecla : rielBajo(px, py); if(r === null || r === undefined) return; apretado.set(id, { m, k: r });
      const n = candidata(t, n => n.modo === 'carril' && n.r === r);
      escena.piezas.rieles[r].golpe = performance.now();
      if(!n) return;
      if(n.tipo === 'flick'){ dedos.set(id, { n, t, px, py, flick: true }); if(tecla !== undefined){ juzgar(n, t, recXY(r)); } return; }
      if(juzgar(n, t, recXY(r)) && n.fin) dedos.set(id, { n, hold: true });
    }
    else if(m === 'flechas'){ const col = tecla !== undefined ? tecla : Math.min(3, Math.max(0, Math.floor(px / (W / 4)))), r = RIEL_FL[col]; apretado.set(id, { m, k: col });
      est.pulsado[col] = performance.now();
      const n = candidata(t, n => n.modo === 'flechas' && n.r === r); if(!n) return;
      if(juzgar(n, t, flechaXY(col, 0)) && n.fin) dedos.set(id, { n, hold: true });
    }
    else if(m === 'diva'){
      let k = tecla; if(k === undefined){ const B = botonesDiva(); let d = 1e9; for(const b of B){ const dd = Math.hypot(px - b.x, py - b.y); if(dd < d){ d = dd; k = b.i; } } if(d > Math.max(W, H) * .5) k = undefined; }
      if(k === 'estrella' || k === undefined){ dedos.set(id, { t, px, py, estrella: true }); if(k === 'estrella') estrella(t); return; }
      est.pulsado[k] = performance.now(); apretado.set(id, { m, k });
      const n = candidata(t, n => n.modo === 'diva'); if(!n) return;
      if(n.tipo === 'estrella'){ dedos.set(id, { t, px, py, estrella: true }); return; }
      if(n.sim !== k){ if(Math.abs(n.t - t) < J.ventana()[3]){ J.apuntar(JUICIOS[4], null, n); marcar(n, JUICIOS[4], null, enArea(n)); } return; }    // símbolo equivocado
      if(juzgar(n, t, enArea(n)) && n.fin) dedos.set(id, { n, hold: true });
    }
    else if(m === 'circulos'){
      const g = carta.notas.find(n => n.tipo === 'giro' && t >= n.t - .1 && t < n.fin && !est.estado[n.id]);
      if(g){ dedos.set(id, { giro: g, ang: Math.atan2(py - H * .45, px - W / 2) }); }
      /* de las que están a tiempo, la que está bajo el dedo (antes: la más temprana, y si no era ésa el toque se perdía) */
      let n = null, dn = Infinity; for(let k = est.desde; k < carta.notas.length; k++){ const m = carta.notas[k]; if(m.t > t + ALCANCE) break;
        if(m.modo !== 'circulos' || m.tipo === 'giro' || m.rival || (est.estado[m.id] && est.estado[m.id] !== 'pendiente') || m.t < t - ALCANCE) continue;
        const [cx, cy] = enArea(m), d = Math.hypot(px - cx, py - cy); if(d < dn){ dn = d; n = m; } }
      /* un deslice que ya va en camino se puede agarrar tarde tocando la bola: la cabeza cuenta como BIEN */
      if(!n || dn > radio() * 1.5){ const tarde = carta.notas.find(m => m.tipo === 'deslice' && m.modo === 'circulos' && t > m.t && t < m.fin - .1 && (!est.estado[m.id] || est.estado[m.id] === 'pendiente'));
        if(tarde){ const [bx, by] = puntoCamino(tarde, (t - tarde.t) / (tarde.fin - tarde.t)); if(Math.hypot(px - bx, py - by) < radio() * 2){
          marcar(tarde, JUICIOS[3], t - tarde.t, [bx, by]); J.apuntar(JUICIOS[3], t - tarde.t, tarde); dedos.set(id, { n: tarde, deslice: true, px, py }); est.sigue[tarde.id] = { si: 0, no: 0 }; } }
        return; }
      const [cx, cy] = enArea(n);
      if(juzgar(n, t, [cx, cy]) && n.tipo === 'deslice'){ dedos.set(id, { n, deslice: true, px, py }); est.sigue[n.id] = { si: 0, no: 0 }; }
    }
  }
  function mueve(id, t, px, py){ const d = dedos.get(id); if(!d) return;
    if(d.flick || d.estrella){ const dx = px - d.px, dy = py - d.py; if(Math.hypot(dx, dy) < 34) return;
      if(d.estrella){ dedos.delete(id); estrella(d.t); return; }
      const roll = escena.cam.up ? Math.atan2(escena.cam.up.x, escena.cam.up.y) : 0;
      const ang = Math.atan2(dx, -dy), quiere = d.n.dir * Math.PI / 4 - roll;
      let dif = Math.abs(((ang - quiere) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
      dedos.delete(id);
      if(dif < Math.PI / 4.2) juzgar(d.n, d.t, recXY(d.n.r)); else { J.fallar(d.n); marcar(d.n, JUICIOS[4], null, recXY(d.n.r)); }
    }
    if(d.deslice){ d.px = px; d.py = py; }
    if(d.giro){ const a = Math.atan2(py - H * .45, px - W / 2); let da = a - d.ang; if(da > Math.PI) da -= 2 * Math.PI; if(da < -Math.PI) da += 2 * Math.PI; d.ang = a; est.giro[d.giro.id] = (est.giro[d.giro.id] || 0) + Math.abs(da);
      /* CADA VUELTA ES UNA NOTA MÁS (Carlos, 30 oct): suma al combo y a la cuenta, y entre más rápido gires, más puntos */
      const g = d.giro, vueltas = Math.floor(est.giro[g.id] / (2 * Math.PI)); est.vueltasG = est.vueltasG || {};
      while((est.vueltasG[g.id] || 0) < vueltas){ est.vueltasG[g.id] = (est.vueltasG[g.id] || 0) + 1; J.total++; J.apuntar(JUICIOS[1], 0, g); textos.push({ j: { ...JUICIOS[1], nombre: `VUELTA ${est.vueltasG[g.id]}` }, t0: performance.now() }); sonidos.golpe && reloj.golpe(sonidos.golpe, .25); } }
  }
  function sube(id, t){ apretado.delete(id); const d = dedos.get(id); if(!d) return; dedos.delete(id);
    if(d.deslice && est.estado[d.n.id] === 'sosteniendo'){ const n = d.n, u = (t - n.t) / (n.fin - n.t), sg = est.sigue[n.id], p = sg.si / Math.max(1, sg.si + sg.no);
      est.estado[n.id] = 'hecha'; const j = u > .85 && p > .65 ? JUICIOS[1] : u > .45 ? JUICIOS[3] : JUICIOS[4]; J.apuntar(j, null, n); textos.push({ j, t0: performance.now() }); return; }
    if(d.hold && est.estado[d.n.id] === 'sosteniendo'){
      /* M003 · soltar: si suelta antes de tiempo, la cola se pierde */
      if(t < d.n.fin - J.ventana()[3]){ est.estado[d.n.id] = 'fallada'; J.fallar(d.n); textos.push({ j: JUICIOS[4], t0: performance.now() }); }
      else { est.estado[d.n.id] = 'hecha'; J.apuntar(JUICIOS[1], t - d.n.fin, d.n); }
    }
    if(d.flick && !est.estado[d.n.id] && t - d.t > .25){ J.fallar(d.n); marcar(d.n, JUICIOS[4], null, recXY(d.n.r)); }
  }
  function estrella(t){ const n = candidata(t, n => n.modo === 'diva' && n.tipo === 'estrella'); if(n) juzgar(n, t, enArea(n)); }
  const recXY = (r) => { const q = receptores.find(q => q.r === r); return q ? [q.x, q.y] : [W / 2, H * .8]; };
  const flechaXY = (col, dz) => [W / 8 + col * W / 4, H * .82 - dz];

  /* los eventos del navegador → el reloj del audio */
  const opc = { passive: false };
  /* setPointerCapture TRUENA si cuando se atiende el toque el dedo ya se levantó (un teléfono ocupado
     atiende el evento cientos de ms después): sin el try se perdía el toque entero */
  function abajo(e){ if(!corriendo) return; e.preventDefault(); try{ capa.setPointerCapture(e.pointerId); }catch(err){} baja('p' + e.pointerId, reloj.en(e.timeStamp), e.clientX, e.clientY); est && (est.ultimoXY = [e.clientX, e.clientY]); }
  function mover(e){ if(!corriendo) return; e.preventDefault(); mueve('p' + e.pointerId, reloj.en(e.timeStamp), e.clientX, e.clientY); est && (est.ultimoXY = [e.clientX, e.clientY]); }
  function arriba(e){ if(!corriendo) return; e.preventDefault(); sube('p' + e.pointerId, reloj.en(e.timeStamp)); }
  capa.addEventListener('pointerdown', abajo, opc); capa.addEventListener('pointermove', mover, opc); capa.addEventListener('pointerup', arriba, opc); capa.addEventListener('pointercancel', arriba, opc);
  const teclaDe = (e, t) => { const k = e.key.toLowerCase(), m = modoEn(t);
    if(m === 'carril'){ const n = escena.E.carriles, ks = TECLAS_CARRIL[n] || TECLAS_CARRIL[5], i = ks.indexOf(k); if(i < 0) return null; const vis = receptores.filter(q => q.vis > .5); return vis[i] ? vis[i].r : null; }
    if(m === 'flechas') return TECLAS_FL[k] ?? null;
    if(m === 'diva') return k === ' ' ? 'estrella' : TECLAS_DIVA[k] ?? null;
    if(m === 'circulos') return (k === 'z' || k === 'x') ? 'c' : null; return null; };
  addEventListener('keydown', e => { if(!corriendo || e.repeat) return; if(e.key === 'Escape'){ alternarPausa(); return; } const t = reloj.en(e.timeStamp), k = teclaDe(e, t); if(k === null) return; e.preventDefault();
    if(k === 'c'){ const [px, py] = est.ultimoXY || [W / 2, H / 2]; baja('k' + e.key, t, px, py); } else baja('k' + e.key, t, 0, 0, k); });
  addEventListener('keyup', e => { if(!corriendo) return; sube('k' + e.key, reloj.en(e.timeStamp)); });
  document.addEventListener('visibilitychange', () => { if(document.hidden && corriendo && !pausa) alternarPausa(); });
  ['gesturestart', 'gesturechange', 'dblclick', 'contextmenu'].forEach(n => capa.addEventListener(n, e => e.preventDefault(), opc));

  function alternarPausa(){ if(!corriendo) return; pausa = !pausa; if(pausa) reloj.pausar(); else reloj.seguir(); ajustes.alPausar?.(pausa); }

  /* ══ el bot (modo AUTO): lo usa la demo y las pruebas; juzga con 0 ms ══ */
  function bot(t){ for(let k = est.desde; k < carta.notas.length; k++){ const n = carta.notas[k]; if(n.t > t) break; if(n.rival || est.estado[n.id]) continue;
    if(n.tipo === 'giro'){ if(t >= n.fin - .05){ est.estado[n.id] = 'hecha'; J.apuntar(JUICIOS[0], 0, n); } continue; }
    const j = JUICIOS[0]; marcar(n, j, 0, n.modo === 'carril' ? recXY(n.r) : n.modo === 'flechas' ? flechaXY(RIEL_FL.indexOf(n.r), 0) : enArea(n)); J.apuntar(j, 0, n);
    if(n.modo === 'flechas') est.pulsado[RIEL_FL.indexOf(n.r)] = performance.now(); if(n.modo === 'diva') est.pulsado[n.sim] = performance.now(); } }

  /* ══ cada cuadro ══ */
  function cuadro(){
    if(!corriendo) return; requestAnimationFrame(cuadro);
    if(pausa){ pintar2d(reloj.vista(), true); return; }
    const t = reloj.ahora(), tv = t - reloj.desfaseVisual, modo = modoEn(tv, .3);
    if(auto) bot(t);
    /* los que se fueron sin tocar. Se decide con la hora del cuadro ANTERIOR: si el teléfono se trabó,
       un toque que llegó a tiempo pero se atendió tarde todavía encuentra su nota viva */
    const wf = J.ventana()[3], tFallo = Math.min(t, est.tPrevio ?? t); est.tPrevio = t;
    for(let k = est.desde; k < carta.notas.length; k++){ const n = carta.notas[k]; if(n.t > t) break;
      const s = est.estado[n.id];
      if(n.rival){ if(!s && n.t <= t){ est.estado[n.id] = 'hecha'; est.rivalCanta = performance.now(); est.pulsadoR[RIEL_FL.indexOf(n.r)] = performance.now(); } continue; }
      if(s === 'sosteniendo'){ if(n.tipo === 'deslice' && !auto && [...dedos.values()].some(d => d.n === n)) continue;
        if(t >= n.fin){ est.estado[n.id] = 'hecha'; J.apuntar(n.tipo === 'deslice' && !auto ? JUICIOS[4] : JUICIOS[1], 0, n); } continue; }
      if(n.tipo === 'giro'){ if(!s && t >= n.fin){ const g = (est.giro[n.id] || 0) / (2 * Math.PI) / Math.max(1, n.vueltas); est.estado[n.id] = 'hecha'; J.apuntar(g >= 1 ? JUICIOS[1] : g >= .6 ? JUICIOS[3] : JUICIOS[4], null, n); } continue; }
      /* la nota se va, pero el FALLO no se cuenta todavía: si el teléfono estaba ocupado, el toque que sí
         llegó a tiempo está en la cola con su hora real y se atiende hasta después. Se espera un momento (140 ms)
         de reloj de pared; si en ese rato aparece un toque con hora dentro de la ventana, se juzga normal */
      if(!s && tFallo - n.t > wf){ est.estado[n.id] = 'pendiente'; est.pendientes.push({ n, desde: performance.now() }); }
    }
    for(let i = est.pendientes.length - 1; i >= 0; i--){ const { n, desde } = est.pendientes[i]; if(est.estado[n.id] !== 'pendiente'){ est.pendientes.splice(i, 1); continue; }
      if(performance.now() - desde > 140){   /* Carlos, 30 oct: «tarda mucho en detectar que fallaste» (era medio segundo) */ est.pendientes.splice(i, 1); est.estado[n.id] = 'fallada'; J.fallar(n); if(n.fin) J.fallar(n); textos.push({ j: JUICIOS[4], t0: performance.now() }); } }
    /* los deslices: ¿el dedo va con la bola? */
    for(const [id, d] of dedos){ if(!d.deslice) continue; const n = d.n, u = Math.min(1, Math.max(0, (t - n.t) / (n.fin - n.t))), [bx, by] = puntoCamino(n, u);
      const sg = est.sigue[n.id]; if(Math.hypot(d.px - bx, d.py - by) < radio() * 3.2) sg.si++; else sg.no++;
      if(t >= n.fin && est.estado[n.id] === 'sosteniendo'){ dedos.delete(id); const p = sg.si / Math.max(1, sg.si + sg.no); est.estado[n.id] = 'hecha'; const j = p > .75 ? JUICIOS[1] : p > .45 ? JUICIOS[3] : JUICIOS[4]; J.apuntar(j, null, n); textos.push({ j, t0: performance.now() }); } }
    while(est.desde < carta.notas.length && est.estado[carta.notas[est.desde].id] && carta.notas[est.desde].t < t - 3) est.desde++;
    /* el 3D */
    escena.piezas.rieles.forEach((R, r) => { R.tenido = tenido('carril', r); });
    const v = escena.pintar(tv, { an, carta, est, modo, bajos });
    receptores = [0, 1, 2, 3, 4, 5, 6].map(r => { const [px, py, vis] = escena.receptor(r, W, H); return { r, x: px, y: py, vis }; }).sort(receptores0);
    pintar2d(tv, false, v, modo);
    if(t > fin || (J.muerto && !ajustes.sinMorir && !auto)) terminar(J.muerto && !ajustes.sinMorir);
  }
  /* los receptores en el orden en que se ven a lo largo de la línea (así las teclas siguen al espejo) */
  function receptores0(a, b){ const up = escena.cam.up, ex = up.y, ey = -up.x; return (a.x * ex + a.y * ey) - (b.x * ex + b.y * ey); }

  /* con `vueltas: 2` la bola va y REGRESA por el mismo camino (antes iba sólo de ida aunque el dibujo prometía vuelta) */
  function puntoCamino(n, u){ if(n.vueltas === 2) u = u < .5 ? u * 2 : 2 - u * 2; const c = n.camino, f = u * (c.length - 1), i = Math.min(c.length - 2, Math.floor(f)), k = f - i; const A = area();
    return [A.x + (c[i][0] + (c[i + 1][0] - c[i][0]) * k) * A.w, A.y + (c[i][1] + (c[i + 1][1] - c[i][1]) * k) * A.h]; }

  /* ══ la capa 2D ══ */
  function img(n, cx, cy, s, rot = 0, alfa = 1, add = false){ const im = typeof n === 'string' ? S[n] : n; if(!im) return; x.save(); x.globalAlpha = Math.max(0, Math.min(1, alfa)); if(add) x.globalCompositeOperation = 'lighter'; x.translate(cx, cy); if(rot) x.rotate(rot); x.drawImage(im, -s / 2, -s / 2, s, s); x.restore(); }
  function pintar2d(t, enPausa, v = { latido: 0 }, modo){
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    if(!carta) return;
    const ahora = performance.now(), lat = v.latido || 0, AR = ACERCA[carta.dif];
    /* ── Flechas (FNF): las del rival arriba a la izquierda, las tuyas grandes abajo ── */
    if(modo === 'flechas'){ const tam = Math.min(W / 4.4, H / 6.5, 120), yRec = H * .8, velPx = H * .9 / AR / 1.4;
      for(let c = 0; c < 4; c++){ const [cx] = flechaXY(c, 0), pul = Math.max(tenido('flechas', c) ? .85 : 0, 1 - (ahora - (est.pulsado[c] || 0)) / 160);
        const ef = ajustes.estilos?.flechas || 'contorno';
        img(ef === 'solida' ? S.teñir(`tecla_arrow_${FLECHA[c]}`, COLOR_FL[c]) : `tecla_arrow_${FLECHA[c]}_outline`, cx, yRec, tam * (1 + .12 * lat + .15 * pul), 0, ef === 'solida' ? .45 : .9); if(pul > 0) img(S.teñir('p_light_01', COLOR_FL[c]), cx, yRec, tam * 2.2, 0, pul, true); }
      const tamR = tam * .42, yRiv = Math.max(H * .2, SA.t + 104), xRiv = 20 + SA.l; for(let c = 0; c < 4; c++){ const pr = Math.max(0, 1 - (ahora - (est.pulsadoR[c] || 0)) / 160); img(`tecla_arrow_${FLECHA[c]}_outline`, xRiv + tamR * .6 + c * tamR * 1.05, yRiv, tamR * (1 + .2 * pr), 0, .6); }
      for(let k = est.desde; k < carta.notas.length; k++){ const n = carta.notas[k]; if(n.modo !== 'flechas') continue; const dt = n.t - t; if(dt > AR * 1.6) break;
        const c = RIEL_FL.indexOf(n.r), st = est.estado[n.id];
        if(n.rival){ const yy = yRiv + dt * velPx * .42; if(dt < -.05 || yy > H) continue; const xx = xRiv + tamR * .6 + c * tamR * 1.05;
          if(n.fin){ x.fillStyle = COLOR_FL[c] + '88'; x.fillRect(xx - tamR * .12, yy, tamR * .24, (n.fin - n.t) * velPx * .42); }
          img(S.teñir(`tecla_arrow_${FLECHA[c]}`, COLOR_FL[c]), xx, yy, tamR, 0, .85); continue; }
        if(st === 'hecha' || st === 'fallada' || st === 'pendiente') continue; const [cx] = flechaXY(c, 0), yy = yRec - (st === 'sosteniendo' ? 0 : dt) * velPx;
        if(n.fin){ const yf = yRec - (n.fin - t) * velPx; x.fillStyle = COLOR_FL[c] + (st === 'sosteniendo' ? 'EE' : '99'); x.fillRect(cx - tam * .13, Math.min(yf, yy), tam * .26, Math.abs(yy - yf)); }
        if(st !== 'sosteniendo'){ if((ajustes.estilos?.flechas) === 'neon') img(S.teñir('p_light_01', COLOR_FL[c]), cx, yy, tam * 2, 0, .7, true);
          img((ajustes.estilos?.flechas) === 'solida' ? `tecla_arrow_${FLECHA[c]}_outline` : S.teñir(`tecla_arrow_${FLECHA[c]}`, COLOR_FL[c]), cx, yy, tam); }
      }
    }
    /* ── Símbolos (DIVA): el blanco con su manecilla, y el símbolo que vuela hacia él ── */
    if(modo === 'diva'){ const tam = radio() * 2.1, B = botonesDiva();
      for(let k = est.desde; k < carta.notas.length; k++){ const n = carta.notas[k]; if(n.modo !== 'diva') continue; const dt = n.t - t; if(dt > AR * 1.15) break; const st = est.estado[n.id];
        if(st === 'hecha' || st === 'fallada' || st === 'pendiente') continue; const [cx, cy] = enArea(n), u = 1 - Math.max(0, dt) / (AR * 1.15);
        const es = ajustes.estilos?.simbolos || 'color', nom = n.tipo === 'estrella' ? 'p_star_06' : es === 'contorno' ? S.teñir(`ps_${SIM[n.sim]}_outline`, COLOR_SIM[n.sim]) : es === 'blanco' ? `ps_color_${SIM[n.sim]}_outline` : `ps_color_${SIM[n.sim]}`;
        img(n.tipo === 'estrella' ? S.teñir('p_star_01', '#FFF3B0') : `ps_${SIM[n.sim]}_outline`, cx, cy, tam * (1.05 + .08 * lat), 0, Math.min(1, u * 3));
        /* la manecilla del reloj del blanco (M116) */
        x.save(); x.globalAlpha = Math.min(1, u * 3); x.strokeStyle = '#FFFFFF'; x.lineWidth = 3; x.beginPath(); x.moveTo(cx, cy); const a = -Math.PI / 2 + u * Math.PI * 2; x.lineTo(cx + Math.cos(a) * tam * .62, cy + Math.sin(a) * tam * .62); x.stroke(); x.restore();
        if(st === 'sosteniendo'){ img(S.teñir('p_magic_03', COLOR_SIM[n.sim]), cx, cy, tam * 2.4, ahora / 300, .8, true); continue; }
        /* el símbolo llega volando en curva desde fuera, con estela */
        const d = Math.max(W, H) * .55 * Math.max(0, dt) / (AR * 1.15), ang = n.ang + Math.max(0, dt) * 1.6, fx = cx + Math.cos(ang) * d, fy = cy + Math.sin(ang) * d;
        for(let q = 1; q <= 5; q++){ const dq = d + q * 18, aq = n.ang + (Math.max(0, dt) + q * .02) * 1.6; img(S.teñir('p_light_01', n.tipo === 'estrella' ? '#FFF3B0' : COLOR_SIM[n.sim]), cx + Math.cos(aq) * dq, cy + Math.sin(aq) * dq, tam * (1 - q * .12), 0, .25, true); }
        img(nom, fx, fy, tam * (1 + .1 * lat), n.tipo === 'estrella' ? ahora / 200 : 0);
        if(n.fin){ x.save(); x.globalAlpha = .7; x.strokeStyle = COLOR_SIM[n.sim]; x.lineWidth = 6; x.beginPath(); x.arc(cx, cy, tam * .75, -Math.PI / 2, -Math.PI / 2 + Math.min(1, (n.fin - n.t) / 2) * Math.PI * 2); x.stroke(); x.restore(); }
      }
      for(const b of B){ const pul = Math.max(tenido('diva', b.i) ? .85 : 0, 1 - (ahora - (est.pulsado[b.i] || 0)) / 150); img(`ps_color_${SIM[b.i]}`, b.x, b.y, b.r * 2 * (1 - .1 * pul), 0, .92); if(pul) img(S.teñir('p_light_01', COLOR_SIM[b.i]), b.x, b.y, b.r * 4, 0, pul, true); }
      x.save(); x.font = '600 13px "Zen Kaku Gothic New", sans-serif'; x.fillStyle = '#ffffff99'; x.textAlign = 'center'; x.fillText('★ desliza en cualquier lado', W / 2, H - 14 - SA.b); x.restore();
    }
    /* ── Círculos (osu): número, anillo que se cierra, deslices y remolinos ── */
    if(modo === 'circulos'){ const R = radio(), lista = [];
      for(let k = est.desde; k < carta.notas.length; k++){ const n = carta.notas[k]; if(n.modo !== 'circulos') continue; if(n.t - t > AR) break; lista.push(n); }
      let num = 0; for(const n of lista.slice().reverse()){ const st = est.estado[n.id], dt = n.t - t; num++;
        if(n.tipo === 'giro'){ if(t < n.t - .3 || t > n.fin || st === 'hecha') continue; const g = (est.giro[n.id] || 0) / (2 * Math.PI) / Math.max(1, n.vueltas);
          img('p_twirl_01', W / 2, H * .45, Math.min(W, H) * .7, (est.giro[n.id] || 0), .8, true); img('gen_circle_outline', W / 2, H * .45, Math.min(W, H) * .62 * (1 - (t - n.t) / (n.fin - n.t)), 0, .8);
          x.save(); x.font = '800 28px Orbitron, sans-serif'; x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText(`GIRA ${Math.min(100, Math.round(g * 100))}%`, W / 2, H * .45 + 10); x.restore(); continue; }
        if(st === 'fallada' || st === 'pendiente' || (st === 'hecha' && !(n.tipo === 'deslice' && t < n.fin))) continue;
        const [cx, cy] = enArea(n), u = 1 - Math.max(0, dt) / AR, alfa = Math.min(1, u * 2.5), color = COLORES_RIEL[(n.id % 3) + 1];
        if(n.tipo === 'deslice'){ x.save(); x.globalAlpha = alfa * .55; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#ffffff'; x.lineWidth = R * 2.05; x.beginPath(); n.camino.forEach((p, i) => { const [qx, qy] = [area().x + p[0] * area().w, area().y + p[1] * area().h]; i ? x.lineTo(qx, qy) : x.moveTo(qx, qy); }); x.stroke();
          x.strokeStyle = color; x.lineWidth = R * 1.8; x.stroke(); x.restore();
          const [ex, ey] = puntoCamino(n, 1); img('gen_circle_outline', ex, ey, R * 2, 0, alfa);
          if(t >= n.t){ const [bx, by] = puntoCamino(n, Math.min(1, (t - n.t) / (n.fin - n.t))); img(S.teñir('gen_circle_fill', '#FFFFFF'), bx, by, R * 1.6); img('gen_circle_outline', bx, by, R * 4.6, 0, .7); } }
        if(st !== 'hecha'){ img(S.teñir('gen_circle_fill', color), cx, cy, R * 2, 0, alfa); img('gen_circle_outline', cx, cy, R * 2.1, 0, alfa);
          const ea = ajustes.estilos?.aros || 'clasico', rAro = R * 2 * (1 + 2.2 * Math.max(0, dt) / AR);
          if(ea === 'magia') img(S.teñir('p_magic_03', color), cx, cy, rAro * 1.15, ahora / 400, alfa * .9, true); else if(ea === 'estelar'){ img(S.teñir('p_star_06', color), cx, cy, R * 3.2, ahora / 900, alfa * .5, true); img('gen_circle_outline', cx, cy, rAro, 0, alfa * .9); } else img('gen_circle_outline', cx, cy, rAro, 0, alfa * .9);
          x.save(); x.globalAlpha = alfa; x.font = `800 ${Math.round(R * .9)}px Orbitron, sans-serif`; x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String((n.id % 9) + 1), cx, cy + 1); x.restore(); }
      }
    }
    /* LOS BOTONES DE TOQUE del modo Carril: un aro en cada receptor, que sigue a la pista aunque gire, se
       incline o cambie de carriles (Carlos, 29 oct: «pon un indicador de dónde tocar»). Siempre tenue; se
       encienden y laten 1.5 s cuando los carriles se mueven, y destellan al tocarlos */
    if(modo === 'carril' && escena.E.visible > .5){ const vis = receptores.filter(q => q.vis > .5);
      let sep = Infinity; for(let i = 1; i < vis.length; i++) sep = Math.min(sep, Math.hypot(vis[i].x - vis[i - 1].x, vis[i].y - vis[i - 1].y));
      const rad = Math.max(18, Math.min(46, (isFinite(sep) ? sep : 90) * .46)), mov = Math.max(0, 1 - escena.E.movido / 1.5);
      for(const q of vis){ const golpe = Math.max(tenido('carril', q.r) ? .8 : 0, 1 - (ahora - escena.piezas.rieles[q.r].golpe) / 180), c = COLORES_RIEL[q.r];
        const a = Math.min(1, .2 + mov * (.55 + .25 * Math.sin(ahora / 70)) + golpe * .6);
        x.save(); x.globalAlpha = a * q.vis; x.lineWidth = 2.5 + mov * 2; x.strokeStyle = c; x.fillStyle = c + '22';
        x.beginPath(); x.arc(q.x, q.y, rad * (1 + .15 * golpe + .1 * mov), 0, Math.PI * 2); x.fill(); x.stroke();
        x.globalAlpha = (.35 + .4 * mov) * q.vis; x.fillStyle = '#fff'; x.beginPath(); x.arc(q.x, q.y, Math.max(3, rad * .12), 0, Math.PI * 2); x.fill(); x.restore(); } }
    /* los destellos de cada acierto */
    for(let i = efectos.length - 1; i >= 0; i--){ const e = efectos[i], u = (ahora - e.t0) / 420; if(u >= 1){ efectos.splice(i, 1); continue; }
      const sp = ajustes.golpeSprite || 'p_flare_01', paloma = sp === 'paloma';
      img(paloma ? S.paloma : S.teñir(sp, e.color), e.x, e.y - (paloma ? 40 * u : 0), (paloma ? 70 : 110) + 160 * u, paloma ? 0 : u * 2, 1 - u, !paloma); if(e.j.id === 'sonoluz') img(S.teñir('p_star_06', '#FFF3B0'), e.x, e.y, 80 + 220 * u, -u * 3, 1 - u, true); }
    hud(t, ahora, lat, modo);
    if(enPausa){ x.fillStyle = '#05020Acc'; x.fillRect(0, 0, W, H); }
  }

  let comboAbajo = 0;
  function hud(t, ahora, lat, modo){
    const p = Math.min(1, Math.max(0, t / carta.dur)), T = SA.t, L = 16 + SA.l, R = W - 16 - SA.r;
    /* la vida (la «tensión»), arriba */
    x.fillStyle = '#ffffff22'; x.fillRect(L, T + 14, R - L, 6); const vida = J.vida / 100;
    const gr = x.createLinearGradient(L, 0, R, 0); gr.addColorStop(0, '#FF2D55'); gr.addColorStop(.5, '#B44BFF'); gr.addColorStop(1, '#38E1FF'); x.fillStyle = gr; x.fillRect(L, T + 14, (R - L) * vida, 6);
    x.fillStyle = '#ffffffaa'; x.fillRect(L, T + 23, (R - L) * p, 2);
    x.save(); x.textAlign = 'right'; x.font = `800 ${W < 360 ? 18 : 22}px Orbitron, sans-serif`; x.fillStyle = '#fff'; const pts = String(J.puntaje).padStart(7, '0'); x.fillText(pts, R, T + 50);
    /* el nombre se recorta para que nunca choque con los puntos (en un teléfono de 320 se enciman) */
    const libre = R - L - x.measureText(pts).width - 12;
    x.font = '600 12px Orbitron, sans-serif'; x.fillStyle = '#ffffffaa'; x.fillText(J.precision.toFixed(2) + '%', R, T + 66);
    x.font = '700 12px Orbitron, sans-serif'; x.fillStyle = '#ffffffcc'; x.textAlign = 'left';
    let nom = cancion.titulo.toUpperCase(); const dif = ` · ${carta.D.nombre.toUpperCase()}${carta.nivel ? ' ' + carta.nivel : ''}`;
    if(x.measureText(nom + dif).width <= libre) nom += dif; else { x.fillText(dif.slice(3), L, T + 60); }
    while(nom.length > 3 && x.measureText(nom).width > libre) nom = nom.slice(0, -2) + '…';
    x.fillText(nom, L, T + 44); x.restore();
    /* el combo y el juicio se acomodan DEBAJO del marcador: en pantallas bajitas (un SE, o en horizontal) a una
       fracción fija de la altura se encimaban con los puntos y entre ellos */
    /* con la pista de cabeza (giro de 180°) los botones quedan ARRIBA: el combo y el juicio se bajan para no taparlos */
    const vis = modo === 'carril' ? receptores.filter(q => q.vis > .5) : [], recY = vis.length ? vis.reduce((a, q) => a + q.y, 0) / vis.length : H;
    comboAbajo += ((recY < H * .5 ? 1 : 0) - comboAbajo) * .12;
    const yCombo = Math.max(T + 112, H * (modo === 'carril' ? .21 : .16)) + comboAbajo * H * .42, yJuicio = Math.max(yCombo + 60, H * (modo === 'carril' ? .3 : .245) + comboAbajo * H * .42);
    /* el combo, grande y latiendo */
    if(J.combo > 2){ const c = String(J.combo), s = 1 + .18 * lat + Math.max(0, .3 - (ahora - (J.ultimo?.t || 0)) / 400);
      x.save(); x.translate(W / 2, yCombo); x.scale(s, s); x.textAlign = 'center'; x.font = `900 ${H < 450 ? 36 : 46}px Orbitron, sans-serif`;
      x.fillStyle = J.combo >= 100 ? '#FFF3B0' : '#ffffff'; x.shadowColor = '#B44BFF'; x.shadowBlur = 24; x.fillText(c, 0, 0); x.font = '700 12px Orbitron, sans-serif'; x.shadowBlur = 0; x.fillStyle = '#ffffffbb'; x.fillText('COMBO', 0, 18); x.restore(); }
    /* el juicio del último toque, con «antes» o «tarde» */
    const tx = textos[textos.length - 1]; if(tx){ const u = (ahora - tx.t0) / 520; if(u < 1){ const s = 1 + .5 * Math.max(0, .2 - u) * 5;
      x.save(); x.translate(W / 2, yJuicio); x.scale(s, s); x.globalAlpha = 1 - u * u; x.textAlign = 'center'; x.font = '900 26px Orbitron, sans-serif'; x.fillStyle = tx.j.color; x.shadowColor = tx.j.color; x.shadowBlur = 16; x.fillText(tx.j.nombre, 0, 0);
      if(tx.dt !== null && tx.dt !== undefined && tx.j.id !== 'sonoluz' && ajustes.mostrarDesvio){ x.font = '600 11px Orbitron, sans-serif'; x.shadowBlur = 0; x.fillStyle = '#ffffffcc'; x.fillText((tx.dt < 0 ? 'ANTES ' : 'TARDE ') + Math.round(Math.abs(tx.dt) * 1000) + ' ms', 0, 16); } x.restore(); } if(textos.length > 8) textos.splice(0, textos.length - 8); }
    /* el letrero del tutorial: grande, arriba, todo el rato que dura su fase */
    for(const e of carta.eventos){ if(e.tipo !== 'tuto' || t < e.t || t > e.t + e.dur) continue; const u = Math.min(1, (t - e.t) * 3, (e.t + e.dur - t) * 3);
      x.save(); x.globalAlpha = u; const yy = Math.max(T + 150, H * .27); x.fillStyle = '#0A0412E6'; x.fillRect(12, yy - 34, W - 24, 68); x.strokeStyle = '#5CFFB0'; x.lineWidth = 2; x.strokeRect(12, yy - 34, W - 24, 68);
      x.font = `800 ${W < 380 ? 15 : 17}px "Zen Kaku Gothic New", sans-serif`; x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
      const ps = e.texto.split(' '); let l1 = '', l2 = ''; for(const w of ps){ if(x.measureText(l1 + ' ' + w).width < W - 60 && !l2) l1 = (l1 + ' ' + w).trim(); else l2 = (l2 + ' ' + w).trim(); }
      x.fillText(l1, W / 2, l2 ? yy - 11 : yy); if(l2) x.fillText(l2, W / 2, yy + 13); x.restore(); }
    /* los avisos de cambio de reglas y el compás (M031) */
    for(const e of carta.eventos){ if(e.tipo === 'aviso' && t > e.t - 1.6 && t < e.t + .4){ const u = (t - (e.t - 1.6)) / 2;
      x.save(); x.globalAlpha = Math.min(1, u * 5, (1 - u) * 5); x.fillStyle = '#0A0412E0'; x.fillRect(0, H * .44, W, 64); x.fillStyle = '#FF2D55'; x.fillRect(0, H * .44, W, 3); x.fillRect(0, H * .44 + 61, W, 3);
      x.font = '900 13px Orbitron, sans-serif'; x.fillStyle = '#FF2D55'; x.textAlign = 'center'; x.fillText('⚠ LAS REGLAS CAMBIAN', W / 2 + Math.sin(ahora / 40) * 2, H * .44 + 24); x.font = '700 14px "Zen Kaku Gothic New", sans-serif'; x.fillStyle = '#fff'; x.fillText(e.texto, W / 2, H * .44 + 46); x.restore(); } }
    if(escena.E.compas){ x.save(); x.font = '900 30px Orbitron, sans-serif'; x.textAlign = 'left'; x.fillStyle = '#FFF07A'; x.globalAlpha = .6 + .4 * lat; x.fillText(escena.E.compas, L, T + 100); x.restore(); }
    if(escena.E.destello > 0){ x.fillStyle = `rgba(255,255,255,${(.35 * escena.E.destello * escena.E.destello).toFixed(3)})`; x.fillRect(0, 0, W, H); }
    if(escena.E.glitch > 0){ const g = escena.E.glitch; for(let i = 0; i < 6; i++){ const yy = Math.random() * H, hh = 4 + Math.random() * 30; x.drawImage(capa, 0, yy * dpr, W * dpr, hh * dpr, (Math.random() - .5) * 40 * g, yy, W, hh); } x.fillStyle = `rgba(255,45,85,${.15 * g})`; x.fillRect(0, 0, W, H); }
    if(auto){ x.save(); x.font = '800 12px Orbitron, sans-serif'; x.fillStyle = '#FFF07A'; x.textAlign = 'left'; x.fillText('AUTO', L, T + 76); x.restore(); }
  }

  function terminar(murio){ if(!corriendo) return; corriendo = false; reloj.parar(); dedos.clear(); apretado.clear(); escena.piezas.rieles.forEach(R => { R.tenido = false; });
    alTerminar?.({ cancion, carta, J, murio, auto }); }

  return {
    medir, get corriendo(){ return corriendo; }, get pausa(){ return pausa; }, alternarPausa,
    async empezar(c, cartaN, analisis, buf, { autoJuego = false, vel = 1, ritmo = 1, desde = null } = {}){
      cancion = c; carta = cartaN; an = analisis; auto = autoJuego;
      J = crearJuez(carta); J.total = carta.notas.filter(n => !n.rival).length + carta.notas.filter(n => !n.rival && n.fin && n.tipo !== 'giro').length;
      est = { estado: {}, pendientes: [], desde: 0, vel: vel * (cartaN.D?.rapidez || 1), pulsado: [0, 0, 0, 0], pulsadoR: [0, 0, 0, 0], sigue: {}, giro: {}, cola: {}, ultimoGolpe: 0 };
      /* empezar a media canción (sólo las pruebas): lo de antes no cuenta, o se juzgaría todo como fallo y se moriría al instante */
      if(desde !== null) for(const n of carta.notas) if(n.t < desde + .5) est.estado[n.id] = 'hecha';
      bajos = an.ataques.filter(a => a[2] === 0 && a[1] > .55).map(a => [a[0], a[1]]);
      escena.prepararVelocidad(carta.eventos);
      fin = Math.min(an.dur - .5, (carta.notas.at(-1)?.fin || carta.notas.at(-1)?.t || an.dur) + 3);
      const primero = carta.notas[0]?.t ?? 2, inicio = desde ?? Math.min(0, primero - 3);
      reloj.tocar(buf, { desde: inicio, espera: .15, vel: ritmo });
      corriendo = true; pausa = false; requestAnimationFrame(cuadro);
    },
    salir(){ corriendo = false; reloj.parar(); dedos.clear(); apretado.clear(); escena.piezas.rieles.forEach(R => { R.tenido = false; }); x.clearRect(0, 0, capa.width, capa.height); },
    pintarMenu(t){ x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, capa.width, capa.height); escena.pintar(t, { an: null, carta: null, est: null, modo: 'menu', bajos: null }); },
    get juez(){ return J; }, get t(){ return reloj.ahora(); }, punto: (n, u) => n.camino ? puntoCamino(n, u) : enArea(n), get radio(){ return radio(); }, get estado(){ return est; }, get carta(){ return carta; }, receptores: () => receptores,
    /* para las pruebas: dispara un toque como si fuera del navegador */
    _baja: baja, _sube: sube, _mueve: mueve,
    /* dónde tocaría un jugador para esa nota (las pruebas de entrada la usan) */
    _donde(n){ if(n.modo === 'carril') return recXY(n.r); if(n.modo === 'flechas') return flechaXY(RIEL_FL.indexOf(n.r), 0); if(n.modo === 'diva'){ const b = botonesDiva()[n.sim]; return n.tipo === 'estrella' ? [W / 2, H / 2] : [b.x, b.y]; } return n.tipo === 'giro' ? [W / 2 + Math.min(W, H) * .25, H * .45] : enArea(n); },
    _camino: puntoCamino, _alto: () => [W, H]
  };
}
