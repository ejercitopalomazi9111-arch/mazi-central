/* Pruebas de pantalla del compañero: el cuarto, el cuidado y la tienda de palomium (companero.js).
   Corre en un navegador de verdad a 390×844 contra un servidor de mentiras que se comporta como palomium.js.
   node carymo/pruebas-companero.mjs            (FOTOS=carpeta para sacar capturas) */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { comprar, cuidar, conEconomia, TIENDA } from '../sala/servidor/palomium.js';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = 8700 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let f = 0, n = 0; const ok = (c, t) => { n++; console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };

/* el «servidor»: el mismo palomium.js de verdad, con un perfil en memoria */
const ahora = Date.now();
const perfil = conEconomia({ cuenta: 'ana', nombre: 'Ana', xp: 120, racha: 2, congeladas: 0, cubos: 30, inv: { manzana: 1 }, cuarto: { puestos: ['tapete', 'cama'] }, cuidado: { hambre: 20, limpieza: 80, animo: 70, t: ahora } }, ahora);
perfil.inv.tapete = 1; perfil.inv.cama = 1;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: process.env.FOTOS ? 2 : 1 });
const pg = await ctx.newPage();
const err = []; pg.on('pageerror', (e) => err.push(e.message));
await pg.route(/^http:\/\/localhost:1\//, async (r) => {
  const q = r.request(); let cuerpo = {}; try{ cuerpo = JSON.parse(q.postData() || '{}'); }catch{}
  let res = { bien: true, perfil, planes: [], ranking: { semana: '', filas: [] }, tienda: TIENDA };
  if(cuerpo.accion === 'comprar'){ const x = comprar(perfil, cuerpo.item, cuerpo.cuantos); res = x.error ? { ...x, perfil } : { ...x, perfil }; if(x.error) return r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify(res) }); }
  if(cuerpo.accion === 'cuidar'){ const x = cuidar(perfil, cuerpo.que, cuerpo.item); res = { ...x, perfil }; if(x.error) return r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify(res) }); }
  if(cuerpo.accion === 'xp') res = { bien: true, sumado: 0, eventos: [], premios: [{ motivo: 'leccion', cubos: 1, que: 'Terminaste una lección' }, { motivo: 'racha', cubos: 1, que: 'Racha de hoy' }], perfil, ranking: { semana: '', filas: [] } };
  await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(res) });
});
await pg.addInitScript(() => { localStorage.setItem('salaLlave', 'x'); localStorage.setItem('est.ajustes', JSON.stringify({ sonido: false, vibrar: false, mascota: 'gatito' })); });
await pg.goto(`http://127.0.0.1:${PUERTO}/carymo/?servidor=http://localhost:1&sala=G`, { waitUntil: 'load' });
await pg.waitForFunction(() => window.__estudio && window.__estudio.companero());
await pg.waitForTimeout(600);
const foto = async (nombre) => { if(process.env.FOTOS) await pg.screenshot({ path: `${process.env.FOTOS}/${nombre}.png` }); };

console.log('El cuarto');
await pg.evaluate(() => window.__estudio.companero().abrir());
await pg.waitForSelector('.cosa [data-comprar]');
ok(await pg.locator('#capa.companero .masc').count() === 1, 'la mascota que elegiste está en su cuarto');
ok(await pg.locator('#muebles .mueble').count() === 2, 'los muebles que tienes están puestos');
ok(/30/.test(await pg.textContent('#cubosCuarto')), 'arriba se ve tu saldo de cubitos');
ok(await pg.locator('.barra-c.baja').count() === 1, 'con hambre, su barra se pinta en rojo');
await pg.waitForTimeout(900);
ok(/hambre|pancita|comer/i.test(await pg.textContent('#mascCuarto .masc-globo')), 'y la mascota lo DICE con su modo («Tengo hambre…»)');
await foto('01-cuarto');

console.log('Cuidarlo');
await pg.click('[data-cuidar="comer"]');
await pg.click('[data-dar="manzana"]');
await pg.waitForTimeout(500);
ok(perfil.cuidado.hambre === 40 && !perfil.inv.manzana, 'darle la manzana le quita hambre y se gasta');
await pg.click('[data-cuidar="banar"]'); await pg.waitForTimeout(700);
ok(/jabón/i.test(await pg.textContent('#mascCuarto .masc-globo')), 'sin jabón no se puede bañar, y la mascota te lo pide');

console.log('La tienda');
await pg.click('[data-comprar="jabon"]'); await pg.waitForTimeout(500);
ok(perfil.cubos === 26 && perfil.inv.jabon === TIENDA.jabon.usos, 'comprar jabón cobra 4 y te da sus usos');
await pg.click('[data-cuidar="banar"]'); await pg.waitForTimeout(500);
ok(perfil.cuidado.limpieza === 100, 'ahora sí: bañado y limpiecito');
ok(await pg.isDisabled('[data-comprar="cama"]'), 'lo que ya tienes sale como «Ya es tuyo» y no se compra otra vez');
await pg.click('[data-comprar="sillon"]'); await pg.waitForTimeout(400);
ok(perfil.cubos === 26 && /Te faltan/.test(await pg.textContent('#brindis')), 'sin cubitos suficientes no compra y dice cuántos faltan');
ok(await pg.evaluate(() => document.querySelector('#capa').scrollWidth) <= 390, 'nada se sale de lado');
await foto('02-tienda');

console.log('Los premios');
await pg.click('[data-cerrar]');
await pg.evaluate(() => { const c = window.__estudio.estado().cola; c.push({ id: 'xprueba', xp: 10, dia: '2026-11-13', motivo: 'leccion' }); });
await pg.evaluate(() => window.dispatchEvent(new Event('online')));
await pg.waitForTimeout(500);
ok(/\+2 cubitos/.test(await pg.textContent('#brindis')), 'al ganar cubitos sale el aviso «+2 cubitos» con lo que los dio');

ok(err.length === 0, 'cero errores' + (err.length ? ': ' + err[0] : ''));
console.log(`\n${n - f} pasan · ${f} fallan`);
await b.close(); srv.kill(); process.exit(f ? 1 : 0);
