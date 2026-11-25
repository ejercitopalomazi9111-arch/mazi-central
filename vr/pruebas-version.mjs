/* MAZI VR · UNA VERSIÓN NUEVA LLEGA ENTERA (20 nov: el iPhone de Carlos se quedó en la v38 con «Importing a module script
   failed»: el trabajador de fondo actualizaba archivo por archivo y juntaba la página de una versión con módulos de otra).
   Un Chromium con el trabajador prendido contra un servidor local al que se le cambian archivos en vivo:
     1. instalada la versión N, cambiar un módulo en el servidor NO cambia lo que recibe la app (nada de mezclas);
     2. se publica N+1 (página, trabajador y módulo): la app pasa sola a N+1 y el módulo es el de N+1;
     3. si el trabajador N+2 sale pero la red todavía da la página N+1, no se instala a medias: sigue N+1, completa;
     4. si un módulo no carga, la app tira lo guardado y recarga una sola vez.
   Uso: node vr/pruebas-version.mjs */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let pasan = 0, fallan = 0; const ok = (c, t) => { c ? pasan++ : fallan++; console.log((c ? '✓ ' : '✗ ') + t); };
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.wav': 'audio/wav', '.json': 'application/json', '.wasm': 'application/wasm' };
const N = +fs.readFileSync(path.join(raiz, 'vr/index.html'), 'utf8').match(/const VERSION = (\d+)/)[1];
const parche = {};   /* ruta → texto que sirve el servidor en lugar del archivo */
const conVersion = (n) => {
  parche['/vr/index.html'] = fs.readFileSync(path.join(raiz, 'vr/index.html'), 'utf8').replace(`const VERSION = ${N};`, `const VERSION = ${n};`);
  parche['/vr/sw.js'] = fs.readFileSync(path.join(raiz, 'vr/sw.js'), 'utf8').replace(`mazivr-v${N}`, `mazivr-v${n}`);
};
const limites = fs.readFileSync(path.join(raiz, 'vr/limites.js'), 'utf8');
const servidor = http.createServer((q, res) => {
  const u = new URL(q.url, 'http://x');
  if(u.pathname.endsWith('/index.html')){ res.writeHead(307, { location: u.pathname.slice(0, -10) + u.search }); res.end(); return; }
  let ruta = decodeURIComponent(u.pathname); if(ruta.endsWith('/')) ruta += 'index.html';
  if(parche[ruta] != null){ res.writeHead(200, { 'content-type': TIPOS[path.extname(ruta)] || 'text/plain', 'cache-control': 'no-cache' }); res.end(parche[ruta]); return; }
  const f = path.join(raiz, ruta);
  if(!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => servidor.listen(0, r));
const URL_VR = `http://localhost:${servidor.address().port}/vr/?sw`;
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 844, height: 390 } });
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
const version = () => p.evaluate(() => document.querySelector('#version').textContent.trim());
const marca = () => p.evaluate(() => import('./limites.js?' + Math.random()).then(() => fetch('./limites.js').then((r) => r.text())).then((t) => (t.match(/MARCA_PRUEBA = (\d+)/) || [])[1] || 'ninguna'));
const swVersion = () => p.evaluate(async () => { const k = (await caches.keys()).filter((x) => x.startsWith('mazivr-')); return k.join(','); });
const esperarVersion = async (n, ms = 20000) => { const t = Date.now(); while(Date.now() - t < ms){ try{ if(new RegExp(`^v${n}\\b`).test(await version())) return true; }catch{} await p.waitForTimeout(300); } return false; };

/* 1 · instalada N, un módulo cambia en el servidor */
await p.goto(URL_VR, { waitUntil: 'load' });
await p.evaluate(() => navigator.serviceWorker.ready); await p.waitForTimeout(1500);
ok(await esperarVersion(N), `arranca en v${N}`);
parche['/vr/limites.js'] = limites + `\nexport const MARCA_PRUEBA = ${N + 1};\n`;
for(let i = 0; i < 2; i++){ await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(600); }
ok(await marca() === 'ninguna', 'un módulo cambiado en el servidor NO se cuela en la versión instalada (no se mezclan)');

/* 2 · sale N+1 completa */
conVersion(N + 1);
await p.reload({ waitUntil: 'load' });
ok(await esperarVersion(N + 1), `al publicar v${N + 1}, la app pasa sola a v${N + 1} (${await version()})`);
await p.waitForTimeout(800);
ok(await marca() === String(N + 1), 'y el módulo que corre es el de la versión nueva');
ok(await swVersion() === `mazivr-v${N + 1}`, `sólo queda guardada la versión nueva (${await swVersion()})`);

/* 3 · el trabajador N+2 sale, pero la red todavía da la página N+1 */
parche['/vr/sw.js'] = fs.readFileSync(path.join(raiz, 'vr/sw.js'), 'utf8').replace(`mazivr-v${N}`, `mazivr-v${N + 2}`);
await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update().catch(() => {}); });
await p.waitForTimeout(2500); await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1500);
ok(/^v\d+/.test(await version()) && (await version()).startsWith(`v${N + 1}`) && await swVersion() === `mazivr-v${N + 1}`, `con la red a medias no se instala nada: sigue v${N + 1} completa (${await swVersion()})`);

/* 4 · un módulo que no carga: se tira lo guardado y se recarga una vez */
const cargas = []; p.on('load', () => cargas.push(Date.now()));
await p.evaluate(() => { try{ sessionStorage.removeItem('mazivr.reparo'); }catch{} window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: new TypeError('Importing a module script failed.') })); });
await p.waitForTimeout(3000);
ok(cargas.length === 1, `ante «Importing a module script failed» recarga una sola vez (${cargas.length})`);
await p.evaluate(() => window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: new TypeError('Importing a module script failed.') })));
await p.waitForTimeout(2000);
ok(cargas.length === 1, 'y no se queda recargando en círculo');
ok(!errores.some((e) => !/Importing a module script failed/.test(e)), 'sin otros errores' + (errores.length ? ': ' + errores.slice(0, 2).join(' | ') : ''));
console.log(`${pasan} bien · ${fallan} mal`); await nav.close(); servidor.close(); process.exit(fallan ? 1 : 0);
