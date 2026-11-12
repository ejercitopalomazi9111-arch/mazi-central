/* Pruebas del pizarrón: el servidor (atenderPizarron con un almacén en memoria)
   y la pantalla en un navegador de verdad a 390×844.
   node sala/pruebas-pizarron.mjs */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { atenderPizarron } from './servidor/pizarron.js';

let bien = 0, mal = 0;
const ok = (c, t) => { if(c){ bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t); } };

/* almacén con la forma del de Durable Objects */
function almacen(){
  const m = new Map();
  return {
    m,
    async get(k){ if(Array.isArray(k)){ const r = new Map(); for(const x of k) if(m.has(x)) r.set(x, structuredClone(m.get(x))); return r; } return structuredClone(m.get(k)); },
    async put(k, v){ if(typeof k === 'object'){ for(const [a, b] of Object.entries(k)) m.set(a, structuredClone(b)); } else m.set(k, structuredClone(v)); },
    async delete(k){ for(const x of [].concat(k)) m.delete(x); },
    async list({ prefix }){ return new Map([...m].filter(([k]) => k.startsWith(prefix)).sort()); },
  };
}
const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const pedido = (metodo, q = '', cuerpo) => [new Request('http://x/api/sala/G/pizarron' + q, { method: metodo, body: cuerpo ? JSON.stringify(cuerpo) : undefined }), new URL('http://x/api/sala/G/pizarron' + q)];

console.log('El servidor');
{
  const s = almacen();
  let r = await (await atenderPizarron(s, ...pedido('GET'), 'carlos', 1000)).json();
  ok(r.tableros.length === 1 && r.tableros[0].id === 'general', 'nace con un tablero «Pendientes»');
  r = await (await atenderPizarron(s, ...pedido('POST', '', { tablero: 'general', cambios: [{ id: 'a1', tipo: 'nota', x: 0, y: 0, w: 100, h: 100, texto: 'hola', t: 9e15 }] }), 'carlos', 2000)).json();
  ok(r.guardados === 1, 'guarda una nota');
  ok(s.m.get('piz:e:general:a1').t === 2000, 'la hora la pone el servidor, no el teléfono (reloj adelantado no gana)');
  r = await (await atenderPizarron(s, ...pedido('GET', '?tablero=general&desde=1500'), 'carlos', 3000)).json();
  ok(r.elementos.length === 1 && r.hora === 3000, '«desde» trae lo que cambió después');
  r = await (await atenderPizarron(s, ...pedido('GET', '?tablero=general&desde=2500'), 'carlos', 3000)).json();
  ok(r.elementos.length === 0, 'y nada si no cambió');
  await atenderPizarron(s, ...pedido('POST', '', { tablero: 'general', borrados: ['a1'] }), 'carlos', 4000);
  r = await (await atenderPizarron(s, ...pedido('GET', '?tablero=general'), 'carlos', 5000)).json();
  ok(r.elementos.length === 0, 'lo borrado no sale en la carga completa');
  r = await (await atenderPizarron(s, ...pedido('GET', '?tablero=general&desde=3500'), 'carlos', 5000)).json();
  ok(r.elementos.length === 1 && r.elementos[0].borrado, 'pero sí como lápida para los otros teléfonos');
  r = await (await atenderPizarron(s, ...pedido('POST', '', { tablero: 'general', cambios: [{ id: 'a1', tipo: 'nota', texto: 'revive' }] }), 'luis', 6000)).json();
  ok(r.rechazados === 1, 'un teléfono atrasado no revive lo borrado');
  const png = 'data:image/png;base64,' + Buffer.from('89504e470d0a1a0a', 'hex').toString('base64');
  await atenderPizarron(s, ...pedido('POST', '', { tablero: 'general', cambios: [{ id: 'f1', tipo: 'foto', src: png, w: 100, h: 100 }] }), 'carlos', 7000);
  ok(/^v/.test(s.m.get('piz:e:general:f1').src) && s.m.get('piz:f:general:f1') === png, 'la foto se guarda aparte y el elemento sólo dice su versión');
  const rf = await atenderPizarron(s, ...pedido('GET', '?tablero=general&foto=f1'), 'carlos', 8000);
  ok(rf.headers.get('content-type') === 'image/png' && (await rf.arrayBuffer()).byteLength === 8, 'la foto se sirve como imagen');
  r = await (await atenderPizarron(s, ...pedido('POST', '', { tablero: 'general', cambios: [{ id: 'x', tipo: 'virus' }, { id: '../../', tipo: 'nota' }] }), 'carlos', 9000)).json();
  ok(r.rechazados === 2, 'tipos e ids raros se rechazan');
  r = await (await atenderPizarron(s, ...pedido('POST', '', { accion: 'tablero', nombre: 'Urban Pest' }), 'carlos', 9000)).json();
  ok(r.tablero.nombre === 'Urban Pest', 'crea otro tablero');
  r = await (await atenderPizarron(s, ...pedido('POST', '', { accion: 'borrarTablero', id: 'general' }), 'carlos', 9000)).json();
  ok(r.bien, 'borra un tablero');
  r = await (await atenderPizarron(s, ...pedido('POST', '', { accion: 'borrarTablero', id: Object.keys(s.m.get('piz:tableros'))[0] }), 'carlos', 9000));
  ok(r.status === 400, 'el único tablero no se borra');
}

console.log('La pantalla');
const s = almacen();
let pedidos = [];
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml' };
const servidor = http.createServer(async (q, res) => {
  const u = new URL(q.url, 'http://x');
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*');
  if(q.method === 'OPTIONS'){ res.end(); return; }
  if(u.pathname.endsWith('/pizarron')){
    const cuerpo = await new Promise((ya) => { let d = ''; q.on('data', (c) => d += c); q.on('end', () => ya(d)); });
    pedidos.push(q.method + ' ' + u.search);
    const r = await atenderPizarron(s, new Request('http://x' + q.url, { method: q.method, body: q.method === 'POST' ? cuerpo : undefined }), u, 'carlos');
    res.writeHead(r.status, { 'content-type': r.headers.get('content-type') }); res.end(Buffer.from(await r.arrayBuffer())); return;
  }
  const f = path.join(raiz, decodeURIComponent(u.pathname));
  if(!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
const P = servidor.address().port, base = `http://localhost:${P}`;
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => { try{ localStorage.setItem('salaLlave', 'prueba'); }catch{} });
const p = await ctx.newPage();
const errores = []; p.on('pageerror', (e) => errores.push(e.message)); p.on('console', (m) => { if(m.type() === 'error') errores.push(m.text()); });
const t0 = Date.now();
await p.goto(`${base}/sala/pizarron.html?servidor=${base}`);
await p.waitForFunction(() => window.__piz && window.__piz.estado().elementos > 0, null, { timeout: 8000 });
ok(Date.now() - t0 < 4000, `abre y pinta en ${Date.now() - t0} ms`);
ok((await p.evaluate(() => window.__piz.estado().elementos)) === 6, 'el tablero vacío trae el ejemplo de 6 piezas');
await p.waitForTimeout(1200);
ok([...s.m.keys()].filter((k) => k.startsWith('piz:e:general:')).length === 6, 'el ejemplo se guardó en La Sala');
const desborde = () => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
ok((await desborde()) <= 0, 'no se sale de lado');
await p.screenshot({ path: process.env.CAPTURAS ? process.env.CAPTURAS + '/piz-1.png' : '/dev/null' });

/* agregar una nota con la barra de abajo */
const antes = await p.evaluate(() => window.__piz.estado().elementos);
await p.click('[data-h="nota"]');
await p.waitForSelector('#hoja[open]');
await p.fill('#fTexto', 'Llamar a Brenda');
await p.fill('#fQuien', 'Carlos');
await p.click('#fListo');
ok((await p.evaluate(() => window.__piz.estado().elementos)) === antes + 1, 'agregar nota con su texto');
ok(await p.evaluate(() => [...document.querySelectorAll('.el.nota .tx')].some((x) => x.textContent === 'Llamar a Brenda')), 'la nota nueva se ve en el pizarrón');

/* tocar el estado de la nota elegida lo avanza */
const idNota = await p.evaluate(() => window.__piz.estado().sel);
const pill = p.locator(`.el[data-id="${idNota}"] [data-estado]`);
await pill.tap();
ok((await p.evaluate((id) => window.__piz.els.get(id).estado, idNota)) === 'curso', 'tocar «Pendiente» la pasa a «En curso»');

/* arrastrar la nota */
const caja = await p.locator(`.el[data-id="${idNota}"] .tx`).boundingBox();
const x0 = await p.evaluate((id) => window.__piz.els.get(id).x, idNota);
const cdp = await ctx.newCDPSession(p);
const dedo = async (pts) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0][0], y: pts[0][1] }] }); for(const [x, y] of pts.slice(1)){ await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }); await p.waitForTimeout(16); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
const cx = caja.x + caja.width / 2, cy = caja.y + caja.height / 2;
await dedo([[cx, cy], [cx + 10, cy], [cx + 30, cy + 5], [cx + 60, cy + 10], [cx + 80, cy + 10]]);
const x1 = await p.evaluate((id) => window.__piz.els.get(id).x, idNota);
ok(Math.abs(x1 - x0 - 80 / (await p.evaluate(() => window.__piz.cam.z))) < 3, `arrastrar con el dedo la mueve (${x0} → ${x1})`);
await dedo([[cx + 80, cy + 10], [cx + 70, cy + 10], [cx + 40, cy + 5], [cx, cy]]);

/* mover el pizarrón con el dedo en un espacio vacío */
const cam0 = await p.evaluate(() => ({ ...window.__piz.cam }));
await dedo([[200, 780 - 120], [200, 700 - 120], [180, 600 - 120]]);
const cam1 = await p.evaluate(() => ({ ...window.__piz.cam }));
ok(cam1.y < cam0.y, 'arrastrar el fondo mueve el pizarrón');

/* pinza para alejar */
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 120, y: 400, id: 1 }, { x: 270, y: 400, id: 2 }] });
for(let i = 1; i <= 6; i++){ await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 120 + i * 10, y: 400, id: 1 }, { x: 270 - i * 10, y: 400, id: 2 }] }); await p.waitForTimeout(16); }
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
ok((await p.evaluate(() => window.__piz.cam.z)) < cam1.z, 'pellizcar aleja');

/* lista: palomear un pendiente */
await p.click('[data-h="ajustar"]');
const idLista = await p.evaluate(() => [...window.__piz.els.values()].find((e) => e.tipo === 'lista').id);
await p.locator(`.el[data-id="${idLista}"] .tt`).tap();
await p.locator(`.el[data-id="${idLista}"] [data-item="2"]`).tap();
ok((await p.evaluate((id) => window.__piz.els.get(id).items[2].hecho, idLista)) === true, 'palomear un pendiente de la lista');
ok(await p.evaluate(() => /\d+% hecho/.test(document.querySelector('.el.recuadro .av')?.textContent || '')), 'la fase dice cuánto lleva hecho');

/* foto */
const foto = path.join(process.env.CAPTURAS || '/tmp', 'piz-foto.png');
await p.screenshot({ path: foto, clip: { x: 0, y: 0, width: 300, height: 200 } });
await p.setInputFiles('#archivo', foto);
await p.waitForFunction(() => [...window.__piz.els.values()].some((e) => e.tipo === 'foto'));
await p.waitForTimeout(2500);
const ef = await p.evaluate(() => [...window.__piz.els.values()].find((e) => e.tipo === 'foto'));
ok(/^v/.test(ef.src) && !ef.local, 'la foto se sube y queda la versión de La Sala');
ok([...s.m.keys()].some((k) => k.startsWith('piz:f:general:')), 'la imagen vive aparte en La Sala');

/* otro teléfono abre y ve lo mismo, al instante desde su copia y luego al día */
await p.waitForTimeout(1200);
const p2 = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await p2.addInitScript(() => { try{ localStorage.setItem('salaLlave', 'prueba'); }catch{} });
await p2.goto(`${base}/sala/pizarron.html?servidor=${base}`);
await p2.waitForFunction(() => window.__piz && window.__piz.estado().elementos >= 8, null, { timeout: 8000 });
ok(await p2.evaluate(() => [...document.querySelectorAll('.el.nota .tx')].some((x) => x.textContent === 'Llamar a Brenda')), 'otro teléfono ve la nota nueva');
const img = await p2.waitForFunction(() => { const i = document.querySelector('.el.foto img'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 5000 }).then(() => true, () => false);
ok(img, 'y la foto carga desde La Sala');

/* borrar con doble toque (la foto, que quedó elegida) */
await p.click('[data-a="borrar"]');
ok(await p.evaluate(() => window.__piz.estado().elementos >= 8), 'el primer toque de «Borrar» sólo pregunta');
await p.click('[data-a="borrar"]');
await p.waitForTimeout(1200);
ok(s.m.get('piz:e:general:' + ef.id)?.borrado && !s.m.has('piz:f:general:' + ef.id), 'el segundo borra, deja la lápida y suelta la imagen');

/* tablero nuevo */
await p.click('#bTablero'); await p.fill('#tNombre', 'Urban Pest'); await p.click('#tCrear');
await p.waitForFunction(() => window.__piz.estado().tablero !== 'general');
ok(await p.evaluate(() => [...document.querySelectorAll('.tab')].some((t) => t.textContent === 'Urban Pest' && t.classList.contains('activo'))), 'crear un tablero nuevo y abrirlo');

/* recargar: lo guardado en el teléfono aparece antes que la red */
await p.click('.tab[data-t="general"]'); await p.waitForTimeout(800);
pedidos = [];
let lento = true;
await p.route('**/pizarron?tablero=general', async (r) => { if(lento) await new Promise((y) => setTimeout(y, 3000)); r.continue(); });
const t1 = Date.now();
await p.reload();
await p.waitForFunction(() => window.__piz && window.__piz.estado().elementos > 0, null, { timeout: 2500 });
ok(Date.now() - t1 < 2500, `con la red lenta, enseña lo guardado en ${Date.now() - t1} ms`);

ok((await desborde()) <= 0, 'nada se sale de lado al final');
if(process.env.CAPTURAS){ await p.waitForTimeout(3500); await p.click('[data-h="ajustar"]'); await p.waitForTimeout(400); await p.screenshot({ path: process.env.CAPTURAS + '/piz-2.png' }); }
ok(!errores.length, 'sin errores de consola' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
await nav.close(); servidor.close();
console.log(`\n${bien} pasan · ${mal} fallan`);
process.exit(mal ? 1 : 0);
