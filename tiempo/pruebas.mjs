/* TIEMPO EN PANTALLA · pruebas en un navegador de verdad (390×844 y 1280×800).
   Lo que importa es que los pasos salgan con SUS datos: cambiar el plan cambia
   el texto exacto del paso que le toca, y las palomitas sobreviven a cerrar.
     node tiempo/pruebas.mjs                                                    */
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TIPOS = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html' };
const srv = http.createServer((q, s) => {
  let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
  const f = path.join(RAIZ, u); if (!f.startsWith(RAIZ)) { s.writeHead(403); s.end(); return; }
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); s.end(d); });
}).listen(0);
const BASE = `http://localhost:${srv.address().port}/tiempo/`;
let bien = 0, mal = 0;
const ok = (c, t) => { if (c) { bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t); } };
const desborde = (pg) => pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);

const br = await chromium.launch();
for (const [ancho, alto, nombre] of [[390, 844, 'teléfono'], [1280, 800, 'computadora']]) {
  console.log(`\n${nombre} ${ancho}×${alto}`);
  const ctx = await br.newContext({ viewport: { width: ancho, height: alto } });
  const pg = await ctx.newPage(); const errores = [];
  pg.on('pageerror', (e) => errores.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  await pg.goto(BASE);
  const paso = (id) => pg.textContent(`.paso[data-paso="${id}"]`);
  ok(await pg.locator('.paso').count() === 10, 'salen los diez pasos');
  ok(await pg.textContent('#cuenta') === '0 de 8', 'el avance cuenta los ocho obligatorios');
  ok(await desborde(pg) <= 0, 'nada se sale de la pantalla');
  const chicos = await pg.evaluate(() => [...document.querySelectorAll('button, input, select, .listo label')].filter((e) => e.offsetParent && e.type !== 'radio' && e.type !== 'checkbox' && e.getBoundingClientRect().height < 44).map((e) => e.id || e.textContent.trim().slice(0, 20)));
  ok(!chicos.length, 'todo lo que se toca mide 44 px o más' + (chicos.length ? ' — ' + chicos.join(', ') : ''));

  const p2 = await paso('permitidas');
  ok(['Claude', 'WhatsApp Business', 'Duolingo', 'Alarmy'].every((a) => p2.includes(a)) && !p2.includes('Mapas'), 'el paso 2 trae sus apps de trabajo y no las que no eligió');
  await pg.click('#apps button[data-v="Mapas"]');
  ok((await paso('permitidas')).includes('Mapas'), 'marcar «Mapas» la suma al paso 2');
  await pg.fill('#otraApp', 'Notion'); await pg.click('#agregarApp');
  ok((await paso('permitidas')).includes('Notion') && await pg.isVisible('#apps button[data-v="Notion"][aria-pressed="true"]'), '«Agregar» suma una app que no estaba en la lista');

  ok(/30 minutos al día/.test(await paso('tope')) && /0 h 30 min/.test(await paso('tope')), 'el paso 3 dice 30 minutos');
  await pg.selectOption('#ocio', '90');
  ok(/1 h 30 min al día/.test(await paso('tope')) && /1 h 30 min/.test(await paso('tope')), 'cambiar el ocio a hora y media cambia el paso 3');

  await pg.fill('#dormir', '22:45'); await pg.dispatchEvent('#dormir', 'change');
  ok(/de 10:45 pm a 6:30 am/.test(await paso('dormir')), 'la hora de dormir sale en el paso 4 (10:45 pm)');

  ok(/Solo sitios web permitidos/.test(await paso('web')) && (await paso('web')).includes('claude.ai'), 'internet estricto: sólo sitios permitidos, con claude.ai');
  await pg.check('input[name=web][value=normal]');
  ok(/Limitar sitios web para adultos/.test(await paso('web')) && (await paso('web')).includes('tiktok.com'), 'internet normal: limita adultos y nunca permite redes');

  await pg.fill('#quien', 'Luis');
  ok(/Que Luis ponga el código/.test(await paso('codigo')) && /se lo tienes que pedir a Luis/.test(await paso('mas')), 'el nombre de quien guarda el código sale en los pasos');
  await pg.click('#tentacion button[data-v="YouTube"]');
  ok(!(await paso('franja')).includes('YouTube') && (await paso('tienda')).includes('TikTok'), 'quitar YouTube de tentación lo quita de los pasos');

  await pg.check('.paso[data-paso="codigo"] .listo input');
  await pg.check('.paso[data-paso="filtro"] .listo input');
  ok(await pg.textContent('#cuenta') === '1 de 8', 'una palomita en un obligatorio sube el avance; la del opcional no cuenta');
  ok(await pg.textContent('.paso[data-paso="codigo"] .num') === '✓', 'y el paso se pinta como hecho');

  await pg.reload();
  ok(await pg.inputValue('#quien') === 'Luis' && await pg.inputValue('#ocio') === '90' && await pg.textContent('#cuenta') === '1 de 8'
    && (await paso('permitidas')).includes('Notion'), 'el plan y las palomitas sobreviven a cerrar');
  ok(await desborde(pg) <= 0, 'y sigue sin salirse nada');
  ok(!errores.length, 'ni un error en la consola' + (errores.length ? ' — ' + errores.slice(0, 3).join(' | ') : ''));
  if (process.env.CAPTURA) await pg.screenshot({ path: `${process.env.CAPTURA}/tiempo-${ancho}.png`, fullPage: true });
  await ctx.close();
}
await br.close(); srv.close();
console.log(`\n${bien} bien · ${mal} mal`);
process.exit(mal ? 1 : 0);
