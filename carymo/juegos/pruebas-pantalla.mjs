/* Los juegos de mesa en un navegador de verdad, a 390×844: entrar, clases, contra la máquina y en línea.
   node carymo/juegos/pruebas-pantalla.mjs            (FOTOS=carpeta para sacar capturas) */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MOTORES, indice } from './motores.js';

const raiz = fileURLToPath(new URL('../..', import.meta.url));
const PUERTO = 8600 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let f = 0; const ok = (c, t) => { console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };
const perfil = { cuenta: 'ana', nombre: 'Ana', xp: 120, racha: 2, cubos: 9 };

/* el servidor de mentiras: lo de siempre, más los juegos en línea con las reglas de verdad */
let linea = null; const pedidos = [];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: process.env.FOTOS ? 2 : 1 });
const pg = await ctx.newPage(); const err = []; pg.on('pageerror', (e) => err.push(e.message)); pg.on('console', (m) => { if(m.type() === 'error' && !/Failed to load resource/.test(m.text())) err.push(m.text()); });
await pg.route(/^http:\/\/localhost:1\//, async (r) => {
  let c = {}; try{ c = JSON.parse(r.request().postData() || '{}'); }catch{}
  pedidos.push(c.accion);
  const vista = () => ({ ...linea, e: MOTORES[linea.juego].vista(linea.e, 0), turno: MOTORES[linea.juego].turno(linea.e) });
  let body = { bien: true, perfil, planes: [], ranking: { semana: '', filas: [] }, personajes: {}, tienda: {} };
  if(c.accion === 'juegosMios') body = { bien: true, partidas: [], stats: { ajedrez: { elo: 1016, g: 1, p: 0, e: 0 } } };
  if(c.accion === 'juegoBuscar'){ linea = { id: 'p1', juego: c.juego, j: ['ana', 'beto'], nombres: ['Ana', 'Beto'], yo: 0, estado: 'jugando', v: 0, e: MOTORES[c.juego].inicial({ semilla: 5 }), jugadas: [] }; body = { bien: true, partida: vista() }; }
  if(c.accion === 'juegoEstado' && linea) body = c.v === linea.v ? { bien: true, igual: true, v: linea.v } : { bien: true, partida: vista() };
  if(c.accion === 'juegoMover' && linea){
    const m = MOTORES[linea.juego], legal = m.jugadas(linea.e).find((k) => m.igual(k, c.jugada));
    if(!legal){ await r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Esa jugada no se vale.' }) }); return; }
    linea.e = m.aplicar(linea.e, legal); linea.v++; linea.ultimaJugada = c.jugada; body = { bien: true, partida: vista() };
  }
  await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
await pg.addInitScript(() => {
  localStorage.setItem('salaLlave', 'x'); localStorage.setItem('est.ajustes', JSON.stringify({ sonido: false, vibrar: false, mascota: 'tigre' })); sessionStorage.setItem('carymo.entrada', '1');
  const r = Math.random; Math.random = () => (window.__azarFijo ?? r());   // para que en ajedrez te toquen blancas
  window.__azarFijo = .9;
});
await pg.goto(`http://127.0.0.1:${PUERTO}/carymo/?servidor=http://localhost:1&sala=G`, { waitUntil: 'load' });
await pg.waitForFunction(() => window.__estudio); await pg.waitForTimeout(600);
const foto = async (x) => { if(process.env.FOTOS) await pg.screenshot({ path: `${process.env.FOTOS}/${x}.png` }); };
const sinDesborde = async (t) => { const malo = await pg.evaluate(() => { const W = innerWidth; if(document.documentElement.scrollWidth > W) return 'página'; for(const el of document.querySelectorAll('#capa *, .hoja *, .jg-fin *')){ const r = el.getBoundingClientRect(); if(!(r.width && (r.right > W + 1 || r.left < -1))) continue;
    /* lo que un papá recorta (overflow hidden/clip) y queda dentro de la pantalla no se ve fuera */
    let p = el.parentElement, recortado = false; while(p && p !== document.body){ const o = getComputedStyle(p); if(/hidden|clip/.test(o.overflowX + o.overflow)){ const q = p.getBoundingClientRect(); if(q.left >= -1 && q.right <= W + 1){ recortado = true; break; } } p = p.parentElement; }
    if(!recortado) return (el.className?.baseVal ?? el.className) + ' ' + Math.round(r.left) + '→' + Math.round(r.right); } return ''; }); ok(!malo, t + (malo ? ' (' + malo + ')' : '')); };
const esperar = (fn, ms = 6000) => pg.waitForFunction(fn, null, { timeout: ms }).then(() => true).catch(() => false);

console.log('\nEntrar');
await pg.click('#nav [data-ir="yo"]'); await pg.waitForSelector('#vYo [data-yo="juegos"]');
await pg.click('#vYo [data-yo="juegos"]'); await pg.waitForSelector('#capa.juegos .jg-juego');
ok(await pg.locator('.jg-juego').count() === 5, 'en «Tú» está Juegos y abre los cinco: ajedrez, damas, reversi, Conecta 4 y dominó');
ok(/1016/.test(await pg.textContent('.jg-juego[data-juego="ajedrez"]')), 'cada juego enseña tus puntos en línea');
await sinDesborde('el menú no se sale de lado'); await foto('juegos-1-menu');

console.log('\nUna clase de ajedrez, jugando');
await pg.click('.jg-juego[data-juego="ajedrez"]'); await pg.waitForSelector('.hoja [data-clase]');
await sinDesborde('la hoja del juego cabe'); await foto('juegos-2-hoja');
await pg.click('.hoja [data-clase="aj-mueve"]'); await pg.waitForSelector('.jg-tab .jg-c');
ok(/torre/i.test(await pg.textContent('.jg-dice')) && await pg.locator('.jg-dice .jg-masc svg, .jg-dice .jg-masc .masc').count() >= 1, 'la mascota da la clase: «La torre va en línea recta…»');
await foto('juegos-3-clase');
await pg.click(`.jg-c[data-i="${indice('a1')}"]`); ok(await pg.locator('.jg-c.va').count() > 3, 'al tocar la torre se marcan a dónde puede ir');
await pg.click(`.jg-c[data-i="${indice('a6')}"]`);
ok(await esperar(() => document.querySelector('.jg-dice.bien')), 'comer el peón: «¡Eso!» en verde');
ok(await esperar(() => /2\/5/.test(document.querySelector('.jg-arriba')?.textContent || '')), 'y pasa sola al paso 2 de 5');
await pg.click(`.jg-c[data-i="${indice('c1')}"]`); await pg.click(`.jg-c[data-i="${indice('d2')}"]`);
ok(await esperar(() => document.querySelector('.jg-dice.mal')), 'una jugada que no es: «Casi…», y no se mueve nada');
ok(await pg.locator(`.jg-c[data-i="${indice('c1')}"] img`).count() === 1, 'el alfil sigue en su lugar');
await pg.click('[data-accion="pista"]'); ok(await pg.locator('.jg-c.pista').count() === 2, 'Pista marca la jugada (de dónde y a dónde)');
await sinDesborde('la clase no se sale de lado');

console.log('\nAjedrez contra la máquina');
await pg.click('[data-salir]'); await pg.waitForSelector('.jg-juego');
await pg.click('.jg-juego[data-juego="ajedrez"]'); await pg.click('.hoja [data-nivel="facil"]'); await pg.waitForSelector('.jg-tab .jg-c img');
ok(await pg.locator('.jg-tab img').count() === 32 && await pg.locator('.jg-tab .jg-c').count() === 64, 'tablero de 64 con sus 32 piezas');
ok(await pg.evaluate(() => { const c = [...document.querySelectorAll('.jg-tab .jg-c')].slice(0, 2).map((x) => getComputedStyle(x).backgroundColor); return c[0] !== c[1] && !c.some((x) => /rgba\(0, 0, 0, 0\)|transparent/.test(x)); }), 'las casillas van a dos colores (claras y oscuras), no transparentes');
ok(await pg.evaluate(() => { const hs = [...document.querySelectorAll('.jg-tab .jg-c')].map((x) => Math.round(x.getBoundingClientRect().height)); return Math.max(...hs) - Math.min(...hs) <= 1; }), 'las 64 casillas miden lo mismo (el tablero es cuadrado)');
await pg.click(`.jg-c[data-i="${indice('e2')}"]`); await pg.click(`.jg-c[data-i="${indice('e4')}"]`);
ok(await esperar(() => document.querySelector(`.jg-c[data-i="${36}"] img`) && /Te toca/.test(document.querySelector('.jg-estado').textContent) && document.querySelectorAll('.jg-c.ult').length === 2 && !document.querySelector('.jg-c[data-i="52"] img')), 'e2-e4 y la máquina contesta (piensa aparte y te regresa el turno)');
await foto('juegos-4-ajedrez');
await pg.click('[data-accion="deshacer"]'); ok(await esperar(() => document.querySelector('.jg-c[data-i="52"] img')), 'Deshacer regresa tu jugada y la suya');
await sinDesborde('el tablero cabe en 390');

console.log('\nConecta 4, reversi, damas y dominó contra la máquina');
const otra = async (juego) => { await pg.click('[data-salir]'); await pg.waitForSelector('.jg-juego'); await pg.click(`.jg-juego[data-juego="${juego}"]`); await pg.click('.hoja [data-nivel="medio"]'); await pg.waitForTimeout(400); };
await otra('conecta4');
await pg.locator('.jg-c4 [data-col="3"]').first().click();
ok(await esperar(() => document.querySelectorAll('.jg-c4 i').length === 2 && /Te toca/.test(document.querySelector('.jg-estado').textContent)), 'Conecta 4: tu ficha cae y la máquina pone la suya');
await foto('juegos-5-c4');
await otra('reversi');
if(!(await pg.locator('.jg-tab.rev .jg-c.va').count())) await esperar(() => document.querySelectorAll('.jg-tab.rev .jg-c.va').length);
await pg.locator('.jg-tab.rev .jg-c.va').first().click();
ok(await esperar(() => document.querySelectorAll('.jg-disco').length >= 6), 'Reversi: pones, se voltean y la máquina contesta');
await foto('juegos-6-reversi');
await otra('damas');
if(!(await esperar(() => /Te toca/.test(document.querySelector('.jg-estado').textContent)))) ok(false, 'damas: me toca');
const vaDamas = await pg.evaluate(() => { for(let i = 0; i < 64; i++){ const el = document.querySelector(`.jg-tab .jg-c[data-i="${i}"]`); if(el?.querySelector('.jg-ficha-d.a')){ el.click(); if(document.querySelector('.jg-c.va')) return true; } } return false; });
if(vaDamas) await pg.locator('.jg-c.va').first().click();
ok(vaDamas && await esperar(() => document.querySelectorAll('.jg-c.ult').length === 2 && /Te toca/.test(document.querySelector('.jg-estado').textContent)), 'Damas: tocas tu ficha, se marca a dónde, mueves y la máquina contesta');
await foto('juegos-7-damas');
await otra('domino');
await esperar(() => /Te toca/.test(document.querySelector('.jg-estado').textContent));
const antesMesa = await pg.locator('.jg-dom-mesa .jg-ficha').count();
if(await pg.locator('.jg-dom-mano button.puede').count()) await pg.locator('.jg-dom-mano button.puede').first().click();
else if(await pg.locator('[data-roba]').count()) await pg.click('[data-roba]');
if(await pg.locator('.hoja [data-lado]').count()) await pg.locator('.hoja [data-lado]').first().click();
ok(await esperar(() => document.querySelectorAll('.jg-dom-mesa .jg-ficha').length >= 1 || document.querySelectorAll('.jg-dom-mano button').length > 7), `Dominó: pones ficha (o robas) y sigue el juego (antes ${antesMesa} en la mesa)`);
await foto('juegos-8-domino'); await sinDesborde('el dominó cabe en 390');

console.log('\nEn línea');
await pg.click('[data-salir]'); await pg.waitForSelector('.jg-juego');
await pg.click('.jg-juego[data-juego="conecta4"]'); await pg.click('.hoja [data-linea="buscar"]');
ok(await esperar(() => document.querySelector('.jg-c4')), 'Buscar rival: el servidor arma la partida y se abre el tablero');
ok(/Beto/.test(await pg.textContent('.jg-mesa')), 'sale el nombre del rival');
await pg.locator('.jg-c4 [data-col="2"]').first().click();
ok(await esperar(() => linea && linea.v === 1, 4000) === false ? linea?.v === 1 : true, 'tu jugada se manda al servidor');
ok(linea?.ultimaJugada?.col === 2 && pedidos.includes('juegoMover'), 'el servidor recibe la columna que tocaste');
ok(/Le toca/.test(await pg.textContent('.jg-estado')), 'y ahora le toca al rival');
await foto('juegos-9-linea');

ok(err.length === 0, `sin errores en la consola${err.length ? ': ' + err.slice(0, 3).join(' | ') : ''}`);
await b.close(); srv.kill();
console.log(`\n${f ? f + ' fallan' : 'todo bien'}`);
process.exit(f ? 1 : 0);
