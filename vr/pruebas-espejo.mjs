/* EL ESPEJO DEL DOCENTE (Carlos, 26 nov): el visor en MONARCH saca un código; el docente lo escribe en vr/operador.html, ve
   en vivo lo que ve el alumno y guía la explicación (idioma, Listo, saltar tutorial, siguiente, ir a una escena).
   El relevo de La Sala (sala/servidor/espejo.js) se imita aquí con routeWebSocket, con sus mismas reglas.
     node vr/pruebas-espejo.mjs     (con el servidor del repo en :8765) */
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765', FOTOS = process.env.FOTOS;
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
await ctx.addInitScript(() => { navigator.getGamepads = () => []; try{ localStorage.setItem('mazivr.ajustes', JSON.stringify({ fondo: 1, manos: false })); }catch{} });
/* el relevo: igual que espejo.js */
const salas = {}; let cuadros = 0, ordenes = 0;
await ctx.routeWebSocket(/\/api\/sala\/vr\/espejo\//, (ws) => {
  const u = new URL(ws.url()), cod = u.pathname.split('/').pop(), rol = u.searchParams.get('rol') === 'operador' ? 'operador' : 'visor';
  const S = salas[cod] ||= { visor: [], operador: [] }; S[rol].push(ws);
  const gente = () => { for(const w of [...S.visor, ...S.operador]) w.send(JSON.stringify({ tipo: 'gente', visores: S.visor.length, operadores: S.operador.length })); };
  ws.onMessage((m) => { if(rol === 'operador' && typeof m !== 'string') return; if(typeof m !== 'string') cuadros++; else if(rol === 'operador') ordenes++;
    for(const w of S[rol === 'visor' ? 'operador' : 'visor']) w.send(m); });
  ws.onClose(() => { S[rol] = S[rol].filter((w) => w !== ws); gente(); });
  setTimeout(gente, 50);
});
const v = await ctx.newPage(), errores = []; v.on('pageerror', (e) => errores.push('visor: ' + e.message));
await v.goto(BASE + '/vr/?monarca', { waitUntil: 'networkidle' }); await v.click('#bEntrar');
await v.waitForFunction(() => window.__vr?.ahora() === 'monarca', null, { timeout: 20000 }); await v.waitForTimeout(1500);
const cod = await v.evaluate(() => __monarca.espejo.codigo);
sí(/^\d{4}$/.test(cod), `el visor enseña su código (${cod})`);
const o = await ctx.newPage(); o.on('pageerror', (e) => errores.push('docente: ' + e.message));
await o.setViewportSize({ width: 390, height: 844 });
await o.goto(BASE + '/vr/operador.html'); await o.fill('#codigo', cod);
await o.waitForFunction(() => document.getElementById('chip').textContent === 'En vivo', null, { timeout: 15000 }).catch(() => {});
sí(await o.evaluate(() => document.getElementById('chip').textContent === 'En vivo' && /^blob:/.test(document.getElementById('img').src)), `el docente ve en vivo lo que ve el visor (${cuadros} cuadros)`);
const tam = await o.evaluate(() => [document.getElementById('img').naturalWidth, document.getElementById('img').naturalHeight]);
sí(tam[0] === 480 && tam[1] > 100, `cuadros de ${tam.join('×')} (un ojo, ligero)`);
await o.waitForFunction(() => !document.getElementById('cIdioma').hidden, null, { timeout: 5000 }).catch(() => {});
if(FOTOS) await o.screenshot({ path: `${FOTOS}/docente-1.png` });
await o.click('#cIdioma button[data-l="es"]'); await v.waitForTimeout(600);
sí(await v.evaluate(() => __monarca.estado.fase === 'listo'), 'el docente elige el idioma desde su teléfono');
await o.waitForFunction(() => !document.getElementById('cListo').hidden, null, { timeout: 5000 }).catch(() => {});
await o.click('#cListo button'); await v.waitForTimeout(500);
sí(await v.evaluate(() => __monarca.estado.fase === 'cuenta'), 'y toca «Listo» para que empiece la cuenta');
await v.waitForFunction(() => __monarca.estado.fase === 'tutorial', null, { timeout: 9000 }).catch(() => {});
await o.waitForFunction(() => !document.getElementById('cTutorial').hidden, null, { timeout: 5000 }).catch(() => {});
await o.click('#cTutorial button');
await v.waitForFunction(() => __monarca.estado.fase === 'escenas', null, { timeout: 15000 }).catch(() => {});
sí(await v.evaluate(() => __monarca.estado.fase === 'escenas'), 'el docente puede saltar el tutorial');
await o.waitForFunction(() => document.querySelectorAll('#escenas button').length > 5, null, { timeout: 5000 }).catch(() => {});
const botones0 = await o.evaluate(() => { window.__b0 = [...document.querySelectorAll('#escenas button')]; return __b0.length; });
await o.click('[data-o="siguiente"]'); await v.waitForTimeout(500);
sí(await v.evaluate(() => __monarca.estado.escena === 1), '«Siguiente» pasa a la escena 2 en el visor');
await o.click('#escenas button:nth-child(4)'); await v.waitForTimeout(700);
sí(await v.evaluate(() => __monarca.estado.escena === 3), '«Ir a» la escena 4 la abre en el visor');
await o.waitForFunction(() => document.querySelector('#escenas .ahora') === document.querySelector('#escenas button:nth-child(4)'), null, { timeout: 4000 }).catch(() => {});
sí(await o.evaluate(() => document.querySelector('#escenas .ahora') === document.querySelector('#escenas button:nth-child(4)') && [...document.querySelectorAll('#escenas button')].every((x, i) => x === __b0[i])), `en el teléfono se marca dónde va, sin volver a crear los ${botones0} botones (cero parpadeo)`);
const c0 = cuadros; await v.waitForTimeout(4000);
sí(cuadros - c0 >= 2, `los cuadros siguen llegando mientras avanza la historia (${cuadros - c0} en 4 s en este Chromium sin tarjeta gráfica)`);
if(FOTOS) await o.screenshot({ path: `${FOTOS}/docente-2.png` });
await o.click('#bReiniciar'); await v.waitForTimeout(400);
sí(await v.evaluate(() => __monarca.estado.fase === 'escenas'), '«Reiniciar» con un toque no hace nada (pide otro)');
const ancho = await o.evaluate(() => document.documentElement.scrollWidth);
sí(ancho <= 390, `la pantalla del docente cabe en 390 px (${ancho})`);
/* al salir de MONARCH se cierra el espejo */
await v.evaluate(() => __monarca.salir()); await v.waitForTimeout(400);
sí(await v.evaluate(() => !__monarca.espejo.ws && !__vr.kiosco.activo), 'al salir de MONARCH se cierra el espejo y se apaga el candado');
sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
