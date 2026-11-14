/* pruebas-hoja.mjs — LAS HOJAS SE CIERRAN DESLIZANDO, Y SIN ZOOM (Carlos, 14 nov)
 * «En los menús que se levantan sobre otra página, que si los deslizo desde arriba, donde tienen la línea blanca,
 *  hacia abajo, los pueda cerrar» y «bloquea el zoom porque molesta». Con toques de verdad (CDP), en un iPhone 13.
 * node carymo/pruebas-hoja.mjs */
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = 8500 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
let n = 0, f = 0;
const ok = (c, t) => { n++; if(!c) f++; console.log(`  ${c ? '✓' : '✗'} ${t}`); };
await new Promise((r) => setTimeout(r, 700));
const b = await chromium.launch();
try{
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage(); const err = []; p.on('pageerror', (x) => err.push(x.message));
  await p.goto(`http://127.0.0.1:${PUERTO}/carymo/?sinsw`); await p.waitForTimeout(1200);
  const cdp = await ctx.newCDPSession(p);
  const arrastrar = async (y0, y1, pasos = 10) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: y0 }] });
    for(let i = 1; i <= pasos; i++){ await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: y0 + (y1 - y0) * i / pasos }] }); await p.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(400);
  };
  const abrir = () => p.evaluate(() => window.__estudio.hoja('Prueba', '<p>hola</p><button id="bUno">Uno</button>'));
  const arriba = () => p.evaluate(() => document.querySelector('#hoja').getBoundingClientRect().top);

  console.log('Deslizar para cerrar');
  await abrir(); await p.waitForTimeout(400);
  let y = await arriba();
  await arrastrar(y + 15, y + 40, 4);
  ok(!!(await p.$('#hoja')), 'un jalón corto desde la rayita la regresa a su lugar');
  y = await arriba();
  await arrastrar(y + 15, y + 420, 12);
  ok(!(await p.$('#hoja')), 'un jalón largo desde la rayita la cierra');
  await abrir(); await p.waitForTimeout(400);
  y = await arriba();
  await arrastrar(y + 140, y + 500, 12);
  ok(!!(await p.$('#hoja')), 'deslizar desde el contenido (no desde la rayita) no la cierra');
  await p.tap('#bUno');
  ok(!!(await p.$('#hoja')), 'un toque normal sigue siendo un toque');

  console.log('Sin zoom');
  const vp = await p.getAttribute('meta[name="viewport"]', 'content');
  ok(/maximum-scale=1/.test(vp) && /user-scalable=no/.test(vp), 'la página pide no hacer zoom');
  ok(await p.evaluate(() => getComputedStyle(document.documentElement).touchAction === 'manipulation'), 'sin zoom por doble toque');
  ok(await p.evaluate(() => { const e = new Event('gesturestart', { cancelable: true }); document.dispatchEvent(e); return e.defaultPrevented; }), 'el pellizco del iPhone (gesturestart) se corta');
  ok(err.length === 0, 'sin errores en la consola' + (err.length ? ': ' + err.join(' | ') : ''));
}catch(e){ console.log(e); f++; }
await b.close(); srv.kill();
console.log(`\n${n - f} de ${n} pasan`);
process.exit(f ? 1 : 0);
