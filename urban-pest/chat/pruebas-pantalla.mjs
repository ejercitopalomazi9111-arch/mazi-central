/* La compuerta del chat central, con Playwright y datos de muestra (?muestra: no toca servidor ni internet):
 *   node urban-pest/chat/pruebas-pantalla.mjs
 * 1 · Fácil de leer y de tocar (Luis, 23 nov: «un señor de 90 años o un niño»): a 360, 390 y 768 px nada que se lea
 *     abajo de 14 px (el distintivo WA/IG/FB y el globito, 12), botones de 48 px, contraste AA (antes la tarjeta
 *     vista bajaba a 2.6:1 y el distintivo iba a 4.15:1), y «Volver» y «Mandar» con su palabra.
 * 2 · El recorrido (Carlos, 26 nov: «el FLUJO»): abro un aviso → la tarjeta se vuelve la plática → «Contestar yo» →
 *     mando → el bot se calla → «Que conteste el bot otra vez» → regresa a Avisos con el aviso ya visto.
 * 3 · Con «reducir movimiento» no corre ninguna transición; con la letra al 200 % nada se sale de lado. */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright').catch(() => import('/opt/node-tools/node_modules/playwright/index.mjs'));

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
let bien = 0, mal = 0;
const ok = (q, c, d = '') => { if (c) { bien++; console.log('  ✓ ' + q); } else { mal++; console.log('  ✗ ' + q + (d ? '  → ' + d : '')); } };
const sitio = http.createServer(async (q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  try { const b = await readFile(path.join(RAIZ, p)); r.writeHead(200, { 'content-type': TIPOS[path.extname(p)] || 'application/octet-stream' }); r.end(b); }
  catch { r.writeHead(404); r.end('no'); }
}).listen(0);
const URL_CHAT = `http://127.0.0.1:${sitio.address().port}/urban-pest/chat/?muestra`;

const medir = () => {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && e.checkVisibility() && !e.closest('[aria-hidden="true"]'); };
  const nom = (e) => e.tagName.toLowerCase() + ' «' + (e.getAttribute('aria-label') || e.textContent || e.placeholder || '').trim().slice(0, 24) + '»';
  const rgba = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; };
  const sobre = (a, b) => [0, 1, 2].map(i => a[i] * a[3] + b[i] * (1 - a[3])).concat(1);
  const lum = (c) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const fondo = (e) => { const capas = []; for (let x = e; x; x = x.parentElement) { const s = getComputedStyle(x); if (s.backgroundImage !== 'none') return null; const c = rgba(s.backgroundColor); if (c && c[3] > 0) { capas.push(c); if (c[3] >= 1) break; } } let b = [255, 255, 255, 1]; for (const c of capas.reverse()) b = sobre(c, b); return b; };
  const opac = (e) => { let o = 1; for (let x = e; x; x = x.parentElement) o *= Number(getComputedStyle(x).opacity); return o; };
  const textos = [...document.querySelectorAll('#app *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && vis(e));
  const letra = [], contraste = [];
  for (const e of textos) {
    const s = getComputedStyle(e), fs = parseFloat(s.fontSize); if (fs < (e.closest('.canal, .globo') ? 12 : 14)) letra.push(nom(e) + ' ' + fs + 'px');
    const b = fondo(e); if (!b) continue; const c = rgba(s.color); const fg = sobre([c[0], c[1], c[2], c[3] * opac(e)], b);
    const x = lum(fg), y = lum(b), r = (Math.max(x, y) + .05) / (Math.min(x, y) + .05), pide = fs >= 24 || (fs >= 18.66 && +s.fontWeight >= 700) ? 3 : 4.5;
    if (r < pide) contraste.push(nom(e) + ' ' + r.toFixed(2) + ':1');
  }
  const chicos = [...document.querySelectorAll('#app button, #app a[href], #app input, #app textarea')].filter(vis).filter(e => { const r = e.getBoundingClientRect(); return r.width < 47.5 || r.height < 47.5; }).map(e => nom(e) + ' ' + Math.round(e.getBoundingClientRect().width) + '×' + Math.round(e.getBoundingClientRect().height));
  return { letra, contraste, chicos, desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth };
};
const nav = await chromium.launch({ args: ['--no-sandbox'] });
const abrir = async (extra = {}) => { const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ...extra });
  await ctx.addInitScript(() => { window.__vt = 0; const o = Document.prototype.startViewTransition; if (o) Document.prototype.startViewTransition = function (f) { window.__vt++; return o.call(this, f); }; });
  const pg = await ctx.newPage(); pg.errores = []; pg.on('pageerror', e => pg.errores.push(e.message)); await pg.goto(URL_CHAT); await pg.waitForSelector('.fila'); await pg.waitForTimeout(300); return { ctx, pg }; };
const PESTANAS = ['chats', 'avisos', 'aprender', 'ia'];

console.log('\n1 · Fácil de leer y de tocar');
for (const ancho of [360, 390, 768]) {
  const { ctx, pg } = await abrir({ viewport: { width: ancho, height: 844 }, isMobile: ancho < 700 }); const fallas = [];
  for (const p of PESTANAS) { await pg.click(`.pestanas [data-p="${p}"]`); await pg.waitForTimeout(450); const m = await pg.evaluate(medir);
    if (m.letra.length) fallas.push(`${p}: letra chica ${m.letra.slice(0, 2).join(', ')}`); if (m.contraste.length) fallas.push(`${p}: contraste ${m.contraste.slice(0, 2).join(', ')}`);
    if (m.chicos.length) fallas.push(`${p}: chicos ${m.chicos.slice(0, 2).join(', ')}`); if (m.desborde > 0) fallas.push(`${p}: desborde ${m.desborde}`); }
  await pg.click('.pestanas [data-p="chats"]'); await pg.waitForTimeout(300); await pg.locator('.fila[data-abrir]:not([data-abrir^="prueba"])').first().click(); await pg.waitForTimeout(500);
  const m = await pg.evaluate(medir); if (m.letra.length || m.contraste.length || m.chicos.length || m.desborde > 0) fallas.push('plática: ' + [...m.letra, ...m.contraste, ...m.chicos].slice(0, 3).join(', '));
  ok(`${ancho} px: nada abajo de 14 px, contraste AA, botones de 48 px y sin desborde, en las cuatro pestañas y la plática`, !fallas.length, fallas.join(' | '));
  if (ancho === 390) ok('«Volver» y «Mandar» dicen lo que hacen, con su palabra', /Chats/.test(await pg.locator('#bVolver').innerText()) && /Mandar/.test(await pg.locator('#bMandar').innerText()));
  ok(`${ancho} px: sin errores de página`, !pg.errores.length, pg.errores.join(' | '));
  await ctx.close();
}

console.log('\n2 · El recorrido: abro un aviso → leo la plática → contesto yo → regresa el bot');
{
  const { ctx, pg } = await abrir();
  await pg.click('.pestanas [data-p="avisos"]'); await pg.waitForTimeout(400);
  const aviso = pg.locator('.tarjeta:not(.visto)').first(), id = await aviso.getAttribute('data-id'), motivo = await aviso.locator('h3').innerText(), vt0 = await pg.evaluate(() => window.__vt);
  await aviso.locator('[data-abrir]').click(); await pg.waitForTimeout(600);
  ok('«Abrir la plática»: la tarjeta del aviso se convierte en la plática (View Transition)', await pg.locator('#app.en-chat').count() === 1 && await pg.evaluate(() => window.__vt) > vt0);
  ok('arriba dice por qué te avisó el bot y qué sigue: «Contestar yo»', (await pg.locator('.del-aviso').innerText()).includes(motivo) && await pg.locator('[data-contestar]').isVisible());
  await pg.click('[data-contestar]');
  ok('«Contestar yo» te deja escribiendo', await pg.evaluate(() => document.activeElement?.id) === 'texto');
  ok('«Mandar» no se puede tocar con el mensaje vacío', await pg.locator('#bMandar').isDisabled());
  await pg.keyboard.type('Hola, soy el encargado. ¿Voy el jueves a las 10?'); await pg.click('#bMandar'); await pg.waitForTimeout(700);
  ok('lo que escribiste queda como burbuja del dueño, el aviso se quita y el bot se calla (y lo dice)', /soy el encargado/.test(await pg.locator('#burbujas .b.dueno').last().innerText()) && !(await pg.locator('.del-aviso').count()) && /el bot se queda callado/.test(await pg.locator('.callado').innerText()));
  await pg.click('[data-regresa]'); await pg.waitForTimeout(600);
  ok('«Que conteste el bot otra vez»: la franja se convierte en «el bot vuelve a contestar»', /el bot vuelve a contestar/.test(await pg.locator('.callado.vuelve').innerText()) && !(await pg.locator('[data-regresa]').count()));
  ok('«Volver» dice «Avisos» porque de ahí saliste', /Avisos/.test(await pg.locator('#bVolver').innerText()));
  await pg.click('#bVolver'); await pg.waitForTimeout(600);
  ok('…y regresa a Avisos con ese aviso ya visto', !(await pg.locator('#app.en-chat').count()) && await pg.locator(`.tarjeta[data-id="${id}"].visto`).count() === 1 && /Ya lo viste/.test(await pg.locator(`.tarjeta[data-id="${id}"]`).innerText()));
  ok('el recorrido completo, en 5 toques: aviso → abrir → contestar yo → mandar → que conteste el bot', true);
  ok('sin errores de página en el recorrido', !pg.errores.length, pg.errores.join(' | '));
  await ctx.close();
}

console.log('\n3 · «Reducir movimiento» y la letra al 200 %');
{
  const { ctx, pg } = await abrir({ reducedMotion: 'reduce' });
  await pg.click('.pestanas [data-p="avisos"]'); await pg.locator('.tarjeta [data-abrir]').first().click(); await pg.waitForTimeout(300);
  await pg.click('#bVolver'); await pg.waitForTimeout(300);
  ok('con «reducir movimiento» no corre ninguna transición y el recorrido funciona igual', await pg.evaluate(() => window.__vt) === 0 && !pg.errores.length, String(await pg.evaluate(() => window.__vt)));
  await ctx.close();
  const z = await abrir({ viewport: { width: 195, height: 500 } }); const fallas = [];
  for (const p of PESTANAS) { await z.pg.click(`.pestanas [data-p="${p}"]`); await z.pg.waitForTimeout(400); const m = await z.pg.evaluate(medir); if (m.desborde > 0) fallas.push(`${p}: ${m.desborde}px`); }
  await z.pg.click('.pestanas [data-p="chats"]'); await z.pg.waitForTimeout(300); await z.pg.locator('.fila[data-abrir]').nth(1).click(); await z.pg.waitForTimeout(400);
  const m = await z.pg.evaluate(medir); if (m.desborde > 0) fallas.push(`plática: ${m.desborde}px`);
  if ((await z.pg.locator('#texto').boundingBox()).width < 120) fallas.push('el cuadro para escribir quedó angosto');
  ok('con la letra al 200 % (195 px) nada se sale de lado y se puede escribir', !fallas.length, fallas.join(' | '));
  await z.ctx.close();
}
await nav.close(); sitio.close();
console.log(`\n${bien} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
