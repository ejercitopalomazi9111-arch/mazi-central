/* Pruebas de la navegación de tres (Estudiar, Comunidad, Tú) y del tablero de «Tú» (yo.js), a 390×844.
   node carymo/pruebas-yo.mjs            (FOTOS=carpeta para sacar capturas) */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = 8700 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let f = 0, n = 0; const ok = (c, t) => { n++; console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };
const perfil = { cuenta: 'ana', nombre: 'Ana', xp: 120, racha: 2, cubos: 9, cuidado: { hambre: 15, limpieza: 80, animo: 70, t: Date.now() } };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: process.env.FOTOS ? 2 : 1 });
const pg = await ctx.newPage(); const err = []; pg.on('pageerror', (e) => { err.push(e.message); if(process.env.PILA) console.log(e.stack); });
await pg.route(/^http:\/\/localhost:1\//, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ bien: true, perfil, planes: [], ranking: { semana: '', filas: [] }, personajes: {}, tienda: {} }) }));
await pg.addInitScript(() => { localStorage.setItem('salaLlave', 'x'); localStorage.setItem('est.ajustes', JSON.stringify({ sonido: false, vibrar: false, mascota: 'tigre' })); sessionStorage.setItem('carymo.entrada', '1'); });
await pg.goto(`http://127.0.0.1:${PUERTO}/carymo/?servidor=http://localhost:1&sala=G`, { waitUntil: 'load' });
await pg.waitForFunction(() => window.__estudio && window.__estudio.yo && window.__estudio.yo()); await pg.waitForTimeout(500);
const foto = async (x) => { if(process.env.FOTOS) await pg.screenshot({ path: `${process.env.FOTOS}/${x}.png` }); };

console.log('Abajo, tres');
ok(await pg.locator('#nav button').count() === 3 && /Estudiar.*Comunidad.*Tú/s.test(await pg.textContent('#nav')), 'la barra de abajo trae sólo tres: Estudiar, Comunidad y Tú');
await pg.click('#nav [data-ir="yo"]'); await pg.waitForSelector('#vYo .yo-bt'); await pg.waitForTimeout(700);
ok(await pg.locator('#vYo [data-ir], #vYo [data-yo]').count() >= 8, 'en «Tú» hay botones grandes a todo lo demás');
ok(await pg.locator('#yoMasc .masc').count() === 1 && /hambre/i.test(await pg.textContent('.yo-masc')), 'tu mascota está a la vista y dice cómo está («Tiene hambre»)');
ok(await pg.locator('#yoPj svg').count() === 1, 'arriba, tu personaje');
ok(await pg.evaluate(() => document.documentElement.scrollWidth) <= 390, 'nada se sale de lado');
await foto('yo-1');

console.log('Entrar y regresar');
await pg.click('.yo-masc'); await pg.waitForSelector('#capa.companero', { timeout: 5000 });
ok(await pg.locator('#capa.companero').count() === 1, 'tocar la mascota abre su cuarto');
await pg.click('#capa [data-cerrar]'); await pg.waitForTimeout(300);
for(const [v, t] of [['horario', 'Horario'], ['apuntes', 'Apuntes'], ['perfil', 'Ajustes']]){
  await pg.click(`#vYo [data-ir="${v}"]`); await pg.waitForTimeout(400);
  const vis = await pg.evaluate((v) => !document.querySelector('#v' + v[0].toUpperCase() + v.slice(1)).hidden, v);
  const enTu = (await pg.getAttribute('#nav [data-ir="yo"]', 'aria-current')) === 'page';
  ok(vis && enTu && await pg.isVisible('#subBarra .sub-volver'), `${t}: se abre, «Tú» sigue encendido abajo y arriba está «‹ Tú»`);
  await pg.click('#subBarra .sub-volver'); await pg.waitForTimeout(300);
  ok(await pg.isVisible('#vYo .yo-rejilla'), `${t}: «‹ Tú» regresa al tablero`);
}
await pg.click('#nav [data-ir="ranking"]'); await pg.waitForTimeout(400);
ok(!(await pg.evaluate(() => document.querySelector('#vRanking').hidden)) && (await pg.getAttribute('#nav [data-ir="ranking"]', 'aria-current')) === 'page', 'Comunidad abre el ranking y los amigos');
ok(err.length === 0, 'cero errores' + (err.length ? ': ' + err[0] : ''));
console.log(`\n${n - f} pasan · ${f} fallan`);
await b.close(); srv.kill(); process.exit(f ? 1 : 0);
