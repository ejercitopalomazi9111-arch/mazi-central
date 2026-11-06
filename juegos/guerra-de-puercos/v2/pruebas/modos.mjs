/* Los tres modos de juego desde la pantalla, tocando cartas de verdad:
 *   1. contra la máquina (que no se rompió),
 *   2. dos en un teléfono: cortina entre turnos y la mano del otro boca abajo,
 *   3. a distancia: dos teléfonos, uno crea la sala y el otro entra con el
 *      código; los dos ven la MISMA partida, y
 *   4. amigos: se agregan por apodo, se aceptan, y un reto le llega al otro.
 * Hay que tener levantados (desde la raíz del repo):
 *   python3 -m http.server 8765 --bind 127.0.0.1
 *   cd juegos/servidor && npx wrangler dev --port 8815 --local --ip 127.0.0.1 --var "ORIGENES:http://127.0.0.1:8765"
 *   node juegos/guerra-de-puercos/v2/pruebas/modos.mjs            (SOLO=dos|linea|amigos para uno) */
import { createRequire } from 'module'; const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const PAG = process.argv[2] || 'http://127.0.0.1:8765/juegos/guerra-de-puercos/v2/';
const SRV = process.argv[3] || 'http://127.0.0.1:8815';
const SOLO = process.env.SOLO || '';
const FOTOS = '/tmp/claude-0/p2/';
let bien = 0, mal = 0;
const ok = (q, c, d = '') => { if(c){ bien++; console.log('  ✓ ' + q); } else { mal++; console.log('  ✗ ' + q + (d ? '  → ' + d : '')); } };
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
async function telefono(){
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage(); pg.err = [];
  pg.on('pageerror', e => pg.err.push('PE ' + e.message)); pg.on('console', m => { if(m.type() === 'error' && !/401|404/.test(m.text())) pg.err.push(m.text()); });
  await pg.goto(PAG + '?servidor=' + encodeURIComponent(SRV), { waitUntil: 'load' }); await pg.waitForTimeout(2200);
  /* el aviso del sobre de bienvenida, fuera */
  await pg.evaluate(() => { const n = document.querySelector('#notiSobres'); n.classList.remove('ve'); n.hidden = true; });
  return pg;
}
const est = (pg) => pg.evaluate(() => globalThis.__mesa?.estado());
const libre = (pg, t = 30000) => pg.waitForFunction(() => { const e = globalThis.__mesa?.estado(); return e && !e.ocupado && !e.cortina && e.mano.some(c => c.x != null); }, null, { timeout: t }).then(() => true, () => false);
/* toca la carta de en medio dos veces: elegir y jugar */
async function jugarUna(pg){
  const e = await est(pg);
  const jug = e.mano.filter(c => c.nivel !== 'ESP' && c.x != null).sort((a, b) => a.x - b.x);
  const c = jug[Math.floor(jug.length / 2)];
  await pg.mouse.click(c.x, c.y); await pg.waitForTimeout(320);
  await pg.mouse.click(c.x, c.y); await pg.waitForTimeout(200);
  return c;
}
async function elegirModo(pg, m){ await pg.click('#bJugar'); await pg.waitForTimeout(450); await pg.click(`#hojaCaja [data-h="${m}"]`); }

/* ═══ 1 · contra la máquina ═══ */
if(!SOLO || SOLO === 'maquina'){
  console.log('1 · contra la máquina');
  const pg = await telefono();
  await elegirModo(pg, 'maquina');
  ok('JUGAR abre la mesa contra la máquina', await libre(pg));
  ok('arriba dice «La Máquina»', (await pg.textContent('[data-nom-b]')) === 'La Máquina');
  await jugarUna(pg);
  ok('la ronda se juega', await pg.waitForFunction(() => { const e = __mesa.estado(); return !e.ocupado && e.ronda === 2; }, null, { timeout: 20000 }).then(() => true, () => false));
  ok('sin errores en consola', !pg.err.length, pg.err.join(' | '));
  await pg.context().close();
}

/* ═══ 2 · dos en un teléfono ═══ */
if(!SOLO || SOLO === 'dos'){
  console.log('2 · dos en este teléfono');
  const pg = await telefono();
  const monedas0 = await pg.evaluate(() => __puercos.C.monedas);
  await elegirModo(pg, 'dos');
  await pg.waitForFunction(() => globalThis.__mesa?.estado().cortina, null, { timeout: 30000 });
  await pg.waitForTimeout(500);
  ok('sale la cortina «Turno de Jugador 1»', /Turno de Jugador 1/.test(await pg.textContent('[data-cortina]')));
  ok('detrás de la cortina todavía no hay mano repartida', (await est(pg)).mano.every(c => c.x == null));
  await pg.screenshot({ path: FOTOS + 'dos-cortina.png' });
  let rondas = 0, trabada = false, vioTapada = false, vioJ2 = false;
  while(rondas < 60){
    for(const quien of ['Jugador 1', 'Jugador 2']){
      const hay = await pg.waitForFunction(() => { const e = __mesa?.estado(); return !e || e.fin || e.cortina; }, null, { timeout: 30000 }).then(() => true, () => false);
      if(!hay){ trabada = true; break; }
      if((await est(pg))?.fin) break;
      if(quien === 'Jugador 2' && !vioTapada){ vioTapada = (await est(pg)).tapada; }
      const txt = await pg.textContent('[data-cortina]');
      if(!txt.includes('Turno de ' + quien.replace(' ', '\u00a0'))){ ok('la cortina va en orden', false, 'esperaba ' + quien + ', dice ' + txt); trabada = true; break; }
      await pg.click('[data-cortina] [data-listo]');
      if(!await libre(pg)){ trabada = true; break; }
      if(quien === 'Jugador 2' && !vioJ2){
        vioJ2 = true;
        const e = await est(pg);
        ok('en el turno de Jugador 2 la mano de abajo es la suya', e.persp === 'b' && (await pg.textContent('[data-nom-a]')) === 'Jugador 2');
        await pg.screenshot({ path: FOTOS + 'dos-j2.png' });
      }
      await jugarUna(pg);
    }
    if(trabada) break;
    const e = await est(pg);
    if(!e || e.fin) break;
    rondas++;
  }
  ok('mientras elige Jugador 2, la mano de Jugador 1 está boca abajo', vioTapada);
  ok('la partida de dos no se traba', !trabada, 'ronda ' + rondas);
  await pg.waitForFunction(() => __mesa?.estado().fin, null, { timeout: 40000 }).catch(() => {});
  const fin = await pg.evaluate(() => document.querySelector('[data-fin]')?.textContent.replace(/\s+/g, ' ').trim());
  await pg.screenshot({ path: FOTOS + 'dos-fin.png' });
  ok('termina diciendo quién ganó', /Ganó Jugador.[12]|Empate/.test(fin || ''), fin);
  ok('y le paga monedas al dueño del teléfono', (await pg.evaluate(() => __puercos.C.monedas)) > monedas0);
  ok('pero no cuenta para la tabla de líderes', (await pg.evaluate(() => __puercos.C.stats.partidas)) === 0);
  ok('sin errores en consola', !pg.err.length, pg.err.join(' | '));
  await pg.context().close();
}

/* ═══ 3 · a distancia ═══ */
async function partidaEnLinea(A, B, rondasMax = 40){
  let r = 0, desfase = '', vioYaEligio = false;
  while(r < rondasMax){
    const listos = await Promise.all([libre(A, 40000), libre(B, 40000)]);
    if(!listos[0] || !listos[1]){ const ea = await est(A), eb = await est(B); if(ea?.fin && eb?.fin) break; return { trabada: true, r, desfase }; }
    const r0 = (await est(A)).ronda;
    await jugarUna(A);
    await B.waitForTimeout(700);
    if(!vioYaEligio) vioYaEligio = /ya eligió/.test((await est(B)).espera || '');
    await jugarUna(B);
    const fueron = await Promise.all([A, B].map(pg => pg.waitForFunction((r0) => { const e = __mesa?.estado(); return !e || e.fin || (!e.ocupado && e.ronda > r0); }, r0, { timeout: 40000 }).then(() => true, () => false)));
    if(!fueron[0] || !fueron[1]) return { trabada: true, r, desfase };
    const ea = await est(A), eb = await est(B);
    if(ea.pvA !== eb.pvB || ea.pvB !== eb.pvA || ea.ronda !== eb.ronda) desfase ||= `ronda ${ea.ronda}: A ve ${ea.pvA}/${ea.pvB}, B ve ${eb.pvA}/${eb.pvB}`;
    r++;
    if(ea.fin || eb.fin) break;
  }
  return { trabada: false, r, desfase, vioYaEligio };
}
if(!SOLO || SOLO === 'linea'){
  console.log('3 · a distancia');
  const A = await telefono(), B = await telefono();
  await elegirModo(A, 'linea'); await A.waitForTimeout(400);
  await A.screenshot({ path: FOTOS + 'linea-menu.png' });
  await A.click('#hojaCaja [data-crear]');
  await A.waitForSelector('#hojaCaja .codigo-grande', { timeout: 8000 });
  const codigo = (await A.textContent('#hojaCaja .codigo-grande')).trim();
  ok('crear sala da un código de 4 letras', /^[A-Z]{4}$/.test(codigo), codigo);
  await A.waitForTimeout(800);
  ok('y dice que espera a tu amigo', /Esperando a que entre/.test(await A.textContent('#hojaCaja [data-estado]')));
  await A.screenshot({ path: FOTOS + 'linea-sala.png' });
  await elegirModo(B, 'linea'); await B.waitForTimeout(400);
  await B.fill('#hojaCaja [data-codigo]', 'oo1'); await B.click('#hojaCaja [data-unir]');
  ok('un código mal escrito se dice ahí mismo', /4 letras/.test(await B.textContent('#hojaCaja [data-error]')));
  await B.fill('#hojaCaja [data-codigo]', codigo.toLowerCase()); await B.click('#hojaCaja [data-unir]');
  const entran = await Promise.all([libre(A, 40000), libre(B, 40000)]);
  ok('los dos entran a la mesa', entran[0] && entran[1]);
  const ea = await est(A), eb = await est(B);
  ok('cada quien ve 80 de vida y la mano del otro boca abajo', ea.pvA === 80 && eb.pvB === 80 && ea.rival >= 5 && eb.rival >= 5, JSON.stringify({ a: ea.rival, b: eb.rival }));
  ok('y NO ve las cartas del otro (sólo cuántas)', await A.evaluate(() => __mesa.estado().mano.every(c => !String(c.id).startsWith('r:'))));
  await A.screenshot({ path: FOTOS + 'linea-mesa-a.png' }); await B.screenshot({ path: FOTOS + 'linea-mesa-b.png' });
  const res = await partidaEnLinea(A, B, 4);
  ok('cuando el otro ya eligió, se te avisa', res.vioYaEligio);
  ok('las rondas avanzan en los dos teléfonos', !res.trabada && res.r >= 4, JSON.stringify(res));
  ok('los dos ven la MISMA vida en cada ronda', !res.desfase, res.desfase);
  /* se corta el internet de B a media partida y vuelve */
  const sigue = await Promise.all([est(A), est(B)]);
  if(!sigue[0].fin){
    await B.evaluate(() => __cx.cortar());
    await B.waitForTimeout(400);
    ok('si se va el internet, lo dice', /internet/.test((await est(B)).espera || ''), (await est(B)).espera);
    const vuelve = await B.waitForFunction(() => __cx.abierta, null, { timeout: 10000 }).then(() => true, () => false);
    ok('y se vuelve a conectar solo', vuelve);
    const res2 = await partidaEnLinea(A, B, 40);
    ok('después de reconectar se sigue jugando igual', !res2.trabada && !res2.desfase, JSON.stringify(res2));
  }
  await Promise.all([A, B].map(pg => pg.waitForFunction(() => __mesa?.estado().fin, null, { timeout: 240000 }).catch(() => {})));
  const finA = await A.evaluate(() => document.querySelector('[data-fin]')?.textContent || '');
  ok('la partida termina en los dos con botón de revancha', /Revancha/.test(finA) && /Revancha/.test(await B.evaluate(() => document.querySelector('[data-fin]')?.textContent || '')), finA.slice(0, 80));
  await A.screenshot({ path: FOTOS + 'linea-fin.png' });
  await A.click('[data-fin] [data-otra]');
  await B.waitForTimeout(1200);
  ok('al otro le dice que ya quieren la revancha', /quiere la revancha/.test(await B.textContent('[data-fin] [data-otra]')));
  await B.click('[data-fin] [data-otra]');
  const otra = await Promise.all([libre(A, 40000), libre(B, 40000)]);
  ok('y la revancha arranca en los dos', otra[0] && otra[1] && (await est(A)).ronda === 1);
  ok('sin errores en consola', !A.err.length && !B.err.length, [...A.err, ...B.err].join(' | '));
  await A.context().close(); await B.context().close();
}

/* ═══ 4 · amigos y retos ═══ */
async function cuentaNueva(pg, apodo){
  await pg.click('#yo'); await pg.waitForTimeout(400);
  await pg.fill('#perfilCaja [name="apodo"]', apodo); await pg.fill('#perfilCaja [name="pin"]', '4321');
  await pg.click('[data-hacer="crear"]'); await pg.waitForTimeout(1500);
}
if(!SOLO || SOLO === 'amigos'){
  console.log('4 · amigos y retos');
  const A = await telefono(), B = await telefono();
  const sufijo = Math.random().toString(36).slice(2, 6), apA = 'Ana' + sufijo, apB = 'Beto' + sufijo;
  await cuentaNueva(A, apA); await cuentaNueva(B, apB);
  await A.click('[data-pp="amigos"]'); await A.waitForTimeout(800);
  await A.fill('#perfilCaja [data-nuevo] [name="apodo"]', 'NadieAsi' + sufijo); await A.click('#perfilCaja [data-nuevo] button');
  await A.waitForTimeout(900);
  ok('agregar a alguien que no existe se dice', /No hay nadie/.test(await A.textContent('#perfilCaja [data-error]')));
  await A.fill('#perfilCaja [data-nuevo] [name="apodo"]', apB); await A.click('#perfilCaja [data-nuevo] button');
  await A.waitForTimeout(1200);
  ok('la solicitud queda «esperando a que acepten»', (await A.textContent('#perfilCaja')).includes('Esperando a que acepten'));
  await B.click('[data-pp="amigos"]'); await B.waitForTimeout(1000);
  ok('a B le sale «te quieren agregar»', (await B.textContent('#perfilCaja')).includes(apA));
  await B.screenshot({ path: FOTOS + 'amigos-piden.png' });
  await B.click(`#perfilCaja [data-aceptar="${apA}"]`); await B.waitForTimeout(1200);
  ok('al aceptar, ya son amigos y sale «en línea»', /en línea/.test(await B.textContent('#perfilCaja')));
  await B.click('#perfilCaja [data-cerrar]'); await B.waitForTimeout(400);
  await A.click('[data-pp="cuenta"]'); await A.waitForTimeout(300); await A.click('[data-pp="amigos"]'); await A.waitForTimeout(1000);
  await A.screenshot({ path: FOTOS + 'amigos-lista.png' });
  await A.click(`#perfilCaja [data-retar="${apB}"]`);
  await A.waitForSelector('#hojaCaja .codigo-grande', { timeout: 8000 });
  await A.waitForTimeout(800);
  ok('retar abre la sala esperando a que acepte', (await A.textContent('#hojaCaja')).includes('acepte'));
  const llego = await B.waitForFunction(() => document.querySelector('#notiReto').classList.contains('ve'), null, { timeout: 25000 }).then(() => true, () => false);
  ok('a B le llega la notificación del reto', llego);
  await B.screenshot({ path: FOTOS + 'amigos-reto.png' });
  if(llego){
    ok('dice quién lo retó', (await B.textContent('#notiRetoTit')).includes(apA));
    await B.click('#notiReto');
    const entran = await Promise.all([libre(A, 40000), libre(B, 40000)]);
    ok('al tocarla, los dos entran a la partida', entran[0] && entran[1]);
    ok('y cada quien ve el apodo del otro arriba', (await A.textContent('[data-nom-b]')) === apB && (await B.textContent('[data-nom-b]')) === apA,
      (await A.textContent('[data-nom-b]')) + ' / ' + (await B.textContent('[data-nom-b]')));
    await A.screenshot({ path: FOTOS + 'amigos-mesa.png' });
  }
  ok('sin errores en consola', !A.err.length && !B.err.length, [...A.err, ...B.err].join(' | '));
  await A.context().close(); await B.context().close();
}

console.log(`\n${bien} pasan · ${mal} fallan`);
await br.close();
process.exit(mal ? 1 : 0);
