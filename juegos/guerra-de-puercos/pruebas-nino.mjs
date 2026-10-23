/* EL NIÑO DE 4 AÑOS. Carlos: «que juegue como humano, arrastrando, soltando a
 * medio vuelo, etc., como un niño de 4 años».
 *
 * Las pruebas de pantalla juegan como un adulto que sabe las reglas: cada gesto
 * con su propósito y esperando a que acabe la animación. Así nunca salen los
 * defectos que sólo aparecen con un dedo que no espera: la carta que se suelta
 * a medio camino, el arrastre que el sistema cancela, el doble toque al botón
 * que ya cambió, el toque en medio de una animación.
 *
 * Este robot hace eso a propósito, con azar repetible (SEMILLA), y cada tantas
 * travesuras una jugada buena para que la partida avance. Después de cada una
 * revisa lo que nunca debe pasar:
 *   - un error de la página
 *   - una carta fantasma (la del arrastre) que se queda flotando
 *   - el recuadro de la mesa encendido sin nadie arrastrando
 *   - cartas «al frente» de más
 *   - la página que se mueve de lado
 *   - la partida trabada: nada cambia en 60 acciones, ni con jugadas buenas
 *
 *   node juegos/guerra-de-puercos/pruebas-nino.mjs [http://localhost:8791]
 *   SEMILLA=7 PARTIDAS=3 ACCIONES=2000 node …   (otra travesura, más larga)
 */
const BASE = process.argv[2] || 'http://localhost:8791';
const SEMILLA = Number(process.env.SEMILLA) || 1;
const PARTIDAS = Number(process.env.PARTIDAS) || 2;
const MAX = Number(process.env.ACCIONES) || 1500;
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;

let s = SEMILLA >>> 0;                                   /* mulberry32: el mismo azar cada vez */
const azar = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const entre = (a, b) => a + azar() * (b - a);
const uno = (xs) => xs[Math.floor(azar() * xs.length)];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errores = [];
page.on('pageerror', e => errores.push(String(e)));
page.on('console', m => { if(m.type() === 'error' && !/Failed to load resource|net::/.test(m.text())) errores.push('consola: ' + m.text()); });
await page.goto(BASE + '/juegos/guerra-de-puercos/', { waitUntil: 'networkidle' });
const espera = (ms) => page.waitForTimeout(ms);

/* Lo que se ve, en una foto: para revisar y para saber si la partida se mueve. */
const estado = () => page.evaluate(() => {
  const vis = (el) => el && !el.classList.contains('oculto') && el.offsetParent !== null;
  const pant = [...document.querySelectorAll('main')].find(m => !m.classList.contains('oculto'))?.id || '?';
  const sec = ['fElegir', 'fDuelo', 'fFin'].find(id => !document.getElementById(id).classList.contains('oculto')) || '?';
  const mano = [...document.querySelectorAll('#mMano .carta')];
  const sel = (typeof elegidas !== 'undefined' ? elegidas.length : 0) + (typeof especialId !== 'undefined' && especialId ? 1 : 0);
  return {
    pant, sec, cortina: !document.getElementById('cortina').classList.contains('oculto'),
    ronda: document.getElementById('mRonda').textContent, pva: document.getElementById('mPvA').textContent,
    pvb: document.getElementById('mPvB').textContent,
    fantasmas: document.querySelectorAll('.carta.fantasma').length,
    apuntado: document.getElementById('mSlotA').classList.contains('apuntado'),
    frente: document.querySelectorAll('#mMano .carta.frente').length, sel,
    planas: pant === 'p-mesa' && sec === 'fElegir' ? mano.filter(c => { const r = c.getBoundingClientRect(); return r.width < 4 || r.height < 4; }).length : 0,
    ancho: document.documentElement.scrollWidth, vista: innerWidth,
    guia: vis(document.getElementById('guia')),
  };
});

/* ── las travesuras ───────────────────────────────────────────────────────── */
const cartas = () => page.$$eval('#mMano .carta', cs => cs.map(c => { const r = c.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 40), id: c.dataset.id || c.dataset.llave, ok: r.width > 4 }; }).filter(c => c.ok));
const mesa = () => page.$eval('#mSlotA', el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }).catch(() => ({ x: 195, y: 380 }));
const botones = () => page.$$eval('button', bs => bs.filter(x => x.offsetParent !== null && !x.disabled
  && !['bLinea', 'bCrear', 'bEntrar', 'bCopiar'].includes(x.id)).map(x => { const r = x.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: (x.id || x.textContent).trim().slice(0, 20) }; })
  .filter(p => p.y > 0 && p.y < innerHeight));
const toque = (x, y) => page.touchscreen.tap(x, y);

async function arrastrar(como){
  const cs = await cartas(); if(!cs.length) return 'sin cartas';
  const c = uno(cs), m = await mesa();
  const destino = como === 'mesa' ? m : { x: entre(10, 380), y: entre(60, 800) };
  const pasos = 2 + Math.floor(azar() * 9);
  const hasta = como === 'mesa' ? 1 : entre(0.2, 0.8);        /* a medio vuelo */
  await page.mouse.move(c.x, c.y); await page.mouse.down();
  for(let i = 1; i <= pasos; i++){
    const f = (i / pasos) * hasta;
    await page.mouse.move(c.x + (destino.x - c.x) * f + entre(-6, 6), c.y + (destino.y - c.y) * f + entre(-6, 6));
    if(azar() < 0.3) await espera(entre(5, 60));
  }
  if(como === 'cancela'){
    /* El sistema cancela el arrastre (llamada, notificación, el dedo se sale). */
    await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y)?.closest('.carta') || document.querySelector('#mMano .carta');
      el?.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1, clientX: x, clientY: y }));
    }, c);
  }
  await page.mouse.up();
  return como + ' ' + c.id;
}

const TRAVESURAS = [
  [20, 'tocar una carta', async () => { const cs = await cartas(); if(cs.length){ const c = uno(cs); await toque(c.x, c.y); } }],
  [8, 'tres toques rápidos', async () => { const cs = await cartas(); if(cs.length){ const c = uno(cs); for(let i = 0; i < 3; i++){ await toque(c.x, c.y); await espera(entre(10, 70)); } } }],
  [8, 'arrastrar a la mesa', () => arrastrar('mesa')],
  [9, 'soltar a medio vuelo', () => arrastrar('medio')],
  [5, 'arrastre cancelado', () => arrastrar('cancela')],
  [15, 'tocar donde sea', () => toque(entre(5, 385), entre(5, 839))],
  [8, 'doble toque a un botón', async () => { const bs = await botones(); if(bs.length){ const x = uno(bs); await toque(x.x, x.y); await espera(entre(20, 90)); await toque(x.x, x.y); } }],
  [8, 'tocar un botón', async () => { const bs = await botones(); if(bs.length){ const x = uno(bs); await toque(x.x, x.y); } }],
  [2, 'girar el teléfono', async () => { await page.setViewportSize({ width: 844, height: 390 }); await espera(entre(50, 300)); await page.setViewportSize({ width: 390, height: 844 }); }],
];
const PESO = TRAVESURAS.reduce((a, t) => a + t[0], 0);
const travesura = () => { let r = azar() * PESO; for(const t of TRAVESURAS){ r -= t[0]; if(r <= 0) return t; } return TRAVESURAS[0]; };

/* La jugada buena: lo mínimo para que la partida avance, como lo haría alguien
   que sí sabe jugar. Usa los mismos gestos (tres toques), no atajos. */
let partidas = 0, rondas = 0, ultimaRonda = '';
async function jugadaBuena(e){
  if(e.cortina){ await page.click('#bCortina').catch(() => {}); return 'cortina'; }
  if(e.guia){ await page.click('#guiaOk').catch(() => page.click('#guiaSaltar').catch(() => {})); return 'guía'; }
  if(e.pant === 'p-portada'){ await page.click(azar() < 0.8 ? '[data-modo="maquina"]' : '[data-modo="dos"]'); return 'a jugar'; }
  if(e.pant !== 'p-mesa'){ await page.click('[data-ir="portada"]:visible').catch(() => page.goto(BASE + '/juegos/guerra-de-puercos/')); return 'a la portada'; }
  if(e.sec === 'fDuelo'){ await page.click('#bSeguir').catch(() => {}); return 'seguir'; }
  if(e.sec === 'fFin'){ partidas++; await page.click('#bOtra').catch(() => {}); return 'otra partida'; }
  const id = await page.evaluate(() => {
    if(typeof elegidas !== 'undefined'){ elegidas.length = 0; especial = null; especialId = null; }
    const c = [...document.querySelectorAll('#mMano .carta')].find(x => !x.dataset.esp);
    return c ? c.dataset.llave : null;
  });
  if(!id) return 'sin carta buena';
  for(let i = 0; i < 3; i++) await page.click(`#mMano .carta[data-llave="${id}"]`, { timeout: 1500 }).catch(() => {});
  return 'jugar ' + id;
}

/* ── a jugar ───────────────────────────────────────────────────────────────── */
const fallas = [];
const falla = (que, n, hecho) => { if(fallas.length < 25) fallas.push(`#${n} tras «${hecho}»: ${que}`); };
let firma = '', quieto = 0, n = 0, hecho = '';
const cuenta = {};
for(n = 1; n <= MAX && partidas < PARTIDAS; n++){
  const e0 = await estado();
  if(n % 6 === 0 || e0.cortina || e0.pant !== 'p-mesa'){
    hecho = 'buena: ' + await jugadaBuena(e0);
  } else {
    const [, nombre, f] = travesura();
    hecho = nombre; cuenta[nombre] = (cuenta[nombre] || 0) + 1;
    await f();
  }
  /* A veces espera a que acabe la animación y a veces no, como un niño. */
  await espera(azar() < 0.5 ? entre(0, 40) : entre(120, 700));
  const e = await estado();
  if(errores.length){ falla('error de la página → ' + errores.splice(0).join(' | '), n, hecho); }
  if(e.fantasmas){ falla(`${e.fantasmas} carta(s) fantasma flotando sin nadie arrastrando`, n, hecho); }
  if(e.apuntado){ falla('el recuadro de la mesa se quedó encendido', n, hecho); }
  if(e.frente > e.sel + 1){ falla(`${e.frente} cartas al frente con ${e.sel} elegidas`, n, hecho); }
  if(e.planas){ falla(`${e.planas} carta(s) de la mano sin tamaño`, n, hecho); }
  if(e.ancho > e.vista + 1){ falla(`la página se sale de lado: ${e.ancho} px en ${e.vista}`, n, hecho); }
  if(e.ronda !== ultimaRonda){ rondas++; ultimaRonda = e.ronda; }
  const f = [e.pant, e.sec, e.cortina, e.ronda, e.pva, e.pvb, partidas].join('|');
  quieto = f === firma ? quieto + 1 : 0; firma = f;
  if(quieto === 60){
    falla('la partida se trabó: nada cambió en 60 acciones (' + f + ')', n, hecho);
    await page.screenshot({ path: '/tmp/nino-trabado.png' }).catch(() => {});
  }
}
await b.close();

console.log(`\n── El niño de 4 años · semilla ${SEMILLA} ──`);
console.log(`  ${n - 1} acciones · ${partidas} partida(s) terminada(s) · ${rondas} cambios de ronda`);
console.log('  ' + Object.entries(cuenta).map(([k, v]) => `${k} ×${v}`).join(' · '));
let bien = 0, mal = 0;
const ok = (que, cond, detalle = '') => { if(cond){ bien++; console.log('  ✓ ' + que); } else { mal++; console.log('  ✗ ' + que + (detalle ? '\n      ' + detalle : '')); } };
ok('no tronó ni dejó nada colgado', !fallas.length, fallas.join('\n      '));
ok(`terminó ${PARTIDAS} partida(s) a pesar del niño`, partidas >= PARTIDAS, `sólo ${partidas} en ${MAX} acciones`);
console.log(`\n${bien} bien · ${mal} mal`);
process.exit(mal ? 1 : 0);
