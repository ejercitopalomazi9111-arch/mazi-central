/* pruebas-modelos.mjs — LOS MODELOS 3D QUE SE TOCAN (Carlos, 14 nov: «modelos 3D para seleccionar una parte»)
 * Que cada pieza del archivo tenga su ficha y cada ficha su pieza, que tocar la pantalla de verdad elija una pieza,
 * que el reto cuente bien y que, dentro de CARYMO, el reto dé XP y la X regrese. iPhone 13, WebGL por software.
 * node carymo/modelos/pruebas-modelos.mjs */
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MODELOS } from './modelos.js';

const raiz = fileURLToPath(new URL('../..', import.meta.url));
const PUERTO = 8700 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
let n = 0, f = 0;
const ok = (c, t) => { n++; if(!c) f++; console.log(`  ${c ? '✓' : '✗'} ${t}`); };
await new Promise((r) => setTimeout(r, 700));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try{
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  const p = await ctx.newPage(); const err = []; p.on('pageerror', (x) => err.push(x.message));
  const listo = () => p.waitForFunction(() => window.__modelos && window.__modelos.piezas().length > 0, null, { timeout: 20000 });

  for(const M of MODELOS){
    console.log(M.titulo);
    await p.goto(`http://127.0.0.1:${PUERTO}/carymo/modelos/visor.html?m=${M.id}`); await listo();
    const piezas = await p.evaluate(() => window.__modelos.piezas());
    const fichas = Object.keys(M.partes);
    ok(fichas.every((k) => piezas.includes(k)) && piezas.every((k) => fichas.includes(k)), `las ${fichas.length} piezas del archivo y las fichas coinciden` + (fichas.length !== piezas.length ? ` (archivo: ${piezas.join(', ')})` : ''));
    await p.evaluate((k) => window.__modelos.tocar(k), fichas[0]); await p.waitForTimeout(200);
    ok((await p.textContent('.ficha h2')).includes(M.partes[fichas[0]].nombre), `tocar «${M.partes[fichas[0]].nombre}» enseña su ficha`);
  }

  console.log('Tocar la pantalla de verdad');
  await p.goto(`http://127.0.0.1:${PUERTO}/carymo/modelos/visor.html?m=esqueleto`); await listo(); await p.waitForTimeout(400);
  await p.evaluate(() => { window.__modelos.ponerModo('explora'); });
  await p.tap('#lienzo', { position: { x: 195, y: 230 } }); await p.waitForTimeout(250);
  const elegida = await p.evaluate(() => window.__modelos.estado().elegida);
  ok(['columna', 'costillas', 'pelvis'].includes(elegida), `un toque a media pantalla elige una pieza del tronco (${elegida})`);
  await p.tap('#lienzo', { position: { x: 30, y: 200 } }); await p.waitForTimeout(250);
  ok(await p.evaluate(() => window.__modelos.estado().elegida) === null, 'un toque al vacío la suelta');
  const ancho = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(ancho <= 390, `nada se sale de lado (${ancho} px)`);

  console.log('El reto');
  await p.click('#mReto'); await p.waitForTimeout(200);
  const total = await p.evaluate(() => window.__modelos.estado().reto.orden.length);
  ok(total === 6, 'son 6 preguntas');
  for(let i = 0; i < total; i++){
    const meta = await p.evaluate(() => { const r = window.__modelos.estado().reto; return r.orden[r.i]; });
    await p.evaluate((k) => window.__modelos.tocar(k), i === 0 ? (await p.evaluate(() => { const r = window.__modelos.estado().reto; return r.orden.find((x) => x !== r.orden[r.i]); })) : meta);
    await p.waitForTimeout(i === 0 ? 1900 : 1100);
  }
  ok(/5 de 6/.test(await p.textContent('#abajo')), 'cuenta bien: una mala y cinco buenas dan «5 de 6»');

  console.log('Dentro de CARYMO');
  await p.goto(`http://127.0.0.1:${PUERTO}/carymo/?sinsw`); await p.waitForTimeout(1500);
  ok(!!(await p.$('#bModelos')), 'el inicio trae «Modelos 3D»');
  await p.click('#bModelos'); await p.waitForTimeout(400);
  ok((await p.$$('#capa [data-modelo]')).length === MODELOS.length, `salen los ${MODELOS.length} modelos`);
  await p.click('#capa [data-modelo="corazon"]'); await p.waitForTimeout(400);
  const marco = await p.waitForSelector('#capa iframe'); const fr = await marco.contentFrame();
  await fr.waitForFunction(() => window.__modelos && window.__modelos.piezas().length > 0, null, { timeout: 20000 });
  const xp0 = await p.evaluate(() => window.__estudio.estado().perfil.xp || 0);
  await fr.evaluate(() => { window.__modelos.ponerModo('reto'); });
  for(let i = 0; i < 6; i++){ await fr.evaluate(() => { const r = window.__modelos.estado().reto; window.__modelos.tocar(r.orden[r.i]); }); await fr.waitForTimeout(1100); }
  await p.waitForTimeout(300);
  const xp1 = await p.evaluate(() => window.__estudio.estado().perfil.xp || 0);
  ok(xp1 - xp0 === 12, `el reto perfecto da 12 XP en CARYMO (${xp1 - xp0})`);
  await fr.click('#bCerrar'); await p.waitForTimeout(500);
  ok(!!(await p.$('#capa [data-modelo]')), 'la X regresa a la lista de modelos');
  ok(err.length === 0, 'sin errores en la consola' + (err.length ? ': ' + err.join(' | ') : ''));
}catch(e){ console.log(e); f++; }
await b.close(); srv.kill();
console.log(`\n${n - f} de ${n} pasan`);
process.exit(f ? 1 : 0);
