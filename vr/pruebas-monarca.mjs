/* MONARCH XR · la experiencia completa como la vive un alumno: entra por el QR (?monarca), recorre las escenas, decide,
   contesta el cuestionario y llega al final; y el docente sale con Opciones 5 veces.
     node vr/pruebas-monarca.mjs     (con el servidor del repo en :8765) · capturas en $CAPS (de fábrica /tmp/monarca) */
import { createRequire } from 'module'; import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765', CAPS = process.env.CAPS || '/tmp/monarca'; fs.mkdirSync(CAPS, { recursive: true });
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
await ctx.addInitScript(() => { try{ localStorage.setItem('mazivr.ajustes', JSON.stringify({ fondo: 1, manos: false })); }catch{}
  window.__pad = { id: 'Wireless Controller', index: 0, connected: true, mapping: 'standard', buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] }; navigator.getGamepads = () => [window.__pad]; });
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
p.on('console', (m) => { if(m.type() === 'error' && !/favicon|getUserMedia|Permission|NotAllowed|NotFound|Requested device/i.test(m.text())) errores.push(m.text()); });
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
await p.goto(BASE + '/vr/?monarca', { waitUntil: 'networkidle' }); await p.click('#bEntrar');
await p.waitForFunction(() => window.__vr?.ahora() === 'monarca', null, { timeout: 20000 });
await p.evaluate(() => window.__monarca.armado); await p.waitForTimeout(1500);
let e = await p.evaluate(() => ({ kiosco: __vr.kiosco.activo, atras: __monarca.atras, botones: __monarca.elegibles().map((m) => m.userData.panel.titulo) }));
sí(e.kiosco && !e.atras, `el QR (?monarca) entra directo a la experiencia en modo exposición, sin «Atrás» (${e.botones.join(' · ')})`);
const tocar = (titulo) => p.evaluate((t) => { const b = __monarca.elegibles().find((m) => m.userData.panel.titulo === t || m.userData.panel.titulo.startsWith(t)); if(!b) return false; b.userData.accion(); return true; }, titulo);
const escena = () => p.evaluate(() => __monarca.ESCENAS[__monarca.estado.escena].id);
const cap = async (n) => { await p.waitForTimeout(900); await p.screenshot({ path: `${CAPS}/${n}.png` }); };
await cap('1-bienvenida');
/* Opciones (lo que saca del visor) no saca en exposición */
const opciones = async () => { await p.evaluate(() => { window.__pad.buttons[9] = { pressed: true, value: 1 }; }); await p.waitForTimeout(150); await p.evaluate(() => { window.__pad.buttons[9] = { pressed: false, value: 0 }; }); await p.waitForTimeout(150); };
await opciones(); sí(await p.evaluate(() => __vr.ahora()) === 'monarca', 'Opciones una vez no saca de la experiencia');
/* el recorrido */
sí(await tocar('Empezar') && await escena() === 'mariposa', 'Empezar → La monarca'); await cap('2-mariposa');
const vis = await p.evaluate(() => ({ mariposa: __monarca.grupo.children.some((c) => c.visible && c.children.length && c.children[0].isGroup) }));
sí(vis.mariposa, 'se ve el ejemplar escaneado de monarca');
await tocar('Siguiente'); sí(await escena() === 'ciclo', 'Siguiente → Su ciclo de vida'); await p.waitForTimeout(2000); await cap('2a-ciclo');
sí((await p.evaluate(() => window.__monarca.grupo.children.find((g) => g.isGroup && g.children.length === 4)?.children.length)) === 4, 'las cuatro etapas: huevo, oruga, crisálida y adulta');
await tocar('Siguiente'); sí(await escena() === 'flores', '→ Flores en el camino');
await p.evaluate(() => window.__monarca.armadoFlores); await p.waitForTimeout(300);
for(let i = 0; i < 5; i++){ sí(await tocar('Plantar'), `planta la flor ${i + 1}`); await p.waitForTimeout(i === 2 ? 1200 : 200); if(i === 2) await cap('2b-flores'); }
const fl = await p.evaluate(() => ({ flores: window.__monarca.grupo.children.find((g) => g.isGroup && g.children.length === 5 && g.children.every((c) => c.isMesh))?.children.length || 0, lugares: window.__monarca.elegibles().filter((b) => b.userData.panel.titulo === 'Plantar').length }));
sí(fl.flores === 5 && fl.lugares === 0, `crecen las cinco flores y ya no quedan lugares (${fl.flores} flores)`); await cap('2c-flores');
await tocar('Siguiente'); sí(await escena() === 'migracion', '«¡Listo!» → La migración'); await p.waitForTimeout(6500); await cap('3-migracion');
await tocar('Siguiente'); sí(await escena() === 'santuario', '→ El santuario'); await p.waitForTimeout(1500); await cap('4-santuario');
const cielo = await p.evaluate(() => { const c = __monarca.grupo.children.find((x) => x.geometry?.type === 'SphereGeometry'); return { vis: c.visible, mapa: !!c.material.map }; });
sí(cielo.vis && cielo.mapa, 'el santuario tiene su foto 360° de fondo');
await tocar('Siguiente'); await cap('5-tala'); await tocar('Siguiente'); await cap('6-campo');
await tocar('Siguiente'); sí(await escena() === 'decision', '→ Tú decides'); await cap('7-decision');
await tocar('Turismo'); await cap('7b-turismo'); await tocar('Siguiente');
sí(await escena() === 'cuestionario', '→ Cuestionario'); await cap('8-cuestionario');
/* contesta bien las cuatro */
const NP = await p.evaluate(() => __monarca.PREGUNTAS.length);
for(let i = 0; i < NP; i++){ const r = await p.evaluate((i) => __monarca.PREGUNTAS[i][1][__monarca.PREGUNTAS[i][2]], i); await tocar(r); await p.waitForTimeout(150); await tocar('Siguiente'); await p.waitForTimeout(150); }
sí(await escena() === 'final' && (await p.evaluate(() => __monarca.estado.puntos)) === NP, `${NP} de ${NP} y llega al final`); await cap('9-final');
await tocar('Créditos'); await cap('9b-creditos');
/* cada cifra que sale en pantalla está en la tabla verificada */
const verificado = fs.readFileSync(new URL('../are/Documentation/MONARCH_XR.md', import.meta.url), 'utf8');
const cifras = await p.evaluate(() => __monarca.ESCENAS.flatMap((e) => [...(e.texto || []), ...(e.etapas || []).flat()]).join(' ').match(/\d[\d,.]*/g));
const sinFuente = [...new Set(cifras)].filter((c) => !verificado.includes(c.replace(/[.,]$/, '')));
sí(!sinFuente.length, `cada cifra de los carteles está en la tabla verificada${sinFuente.length ? ': faltan ' + sinFuente.join(', ') : ''}`);
/* el docente sale: Opciones 5 veces */
for(let i = 0; i < 5; i++) await opciones();
e = await p.evaluate(() => ({ vista: __vr.ahora(), kiosco: __vr.kiosco.activo }));
sí(e.vista === 'inicio' && !e.kiosco, `Opciones 5 veces seguidas: el docente sale y se apaga la exposición (${e.vista})`);
sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
