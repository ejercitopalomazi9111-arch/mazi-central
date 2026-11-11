/* Pruebas de la Comunidad en la pantalla: crear cuenta, foros, comentarios, respuestas, reacciones, perfiles y
   los comentarios de una serie y de un capítulo desde Tiras. El servidor es el de verdad (sala/servidor/comunidad.js)
   corriendo en Node con SQLite.  node inkwell/pruebas-comunidad.mjs */
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
import { DatabaseSync } from 'node:sqlite';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const RAIZ = path.dirname(new URL(import.meta.url).pathname);
const { manejar, ESQUEMA } = await import(path.join(RAIZ, '../sala/servidor/comunidad.js'));
const db = new DatabaseSync(':memory:'); db.exec(ESQUEMA);
const q = (sql, ...v) => db.prepare(sql).all(...v);
const TIPOS = { '.css': 'text/css', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer(async (pq, r) => {
  const u = new URL(pq.url, 'http://x');
  if (u.pathname.startsWith('/api/sala/comunidad/')) {
    const cuerpo = await new Promise((ok) => { let b = ''; pq.on('data', (c) => b += c); pq.on('end', () => ok(b)); });
    const res = await manejar(q, new Request('http://x' + pq.url, { method: pq.method, headers: pq.headers, body: pq.method === 'POST' ? cuerpo : undefined }));
    r.writeHead(res.status, { 'content-type': res.headers.get('content-type') }); r.end(Buffer.from(await res.arrayBuffer())); return;
  }
  if (u.pathname.startsWith('/api/')) { r.writeHead(404, { 'content-type': 'application/json' }); return r.end('{}'); }
  let f = path.join(RAIZ, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(RAIZ) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0);
const O = `http://localhost:${srv.address().port}`, S = '?servidor=' + encodeURIComponent(O);
let bien = 0, mal = 0; const ok = (c, t) => { if (c) { bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t); } };
const desborde = (pg) => pg.evaluate(() => Math.max(document.documentElement.scrollWidth - innerWidth, ...[...document.querySelectorAll('dialog[open]')].map((d) => d.scrollWidth - d.clientWidth)) > 1);
const br = await chromium.launch();

console.log('cuenta y foros (390)');
const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
await ctx.route(/sala\.palomazi9111/, (r) => r.fulfill({ status: 404, body: '{}' }));
const pg = await ctx.newPage(); const errores = [];
pg.on('pageerror', (e) => errores.push(e.message)); pg.on('console', (m) => m.type() === 'error' && !/404|401|409|400/.test(m.text()) && errores.push(m.text()));
await pg.goto(O + '/index.html' + S + '#comunidad');
await pg.waitForSelector('#comCuenta .cm-cuenta');
ok(await pg.isVisible('#comCuenta') && !(await pg.isVisible('#comDentro')), 'sin cuenta, la Comunidad pide entrar o crear una');
ok(await pg.evaluate(() => [...document.querySelectorAll('#nav a')].some((a) => a.dataset.ir === 'comunidad')), 'la Comunidad está en el muelle');
await pg.click('#comCuenta .cm-pestanas button:nth-child(2)');
await pg.fill('#comCuenta input[name=nombre]', 'Carlos'); await pg.fill('#comCuenta input[name=usuario]', 'palomazi'); await pg.fill('#comCuenta input[name=clave]', 'corta');
await pg.click('#comCuenta .cm-si');
await pg.waitForFunction(() => document.querySelector('#comCuenta .cm-error')?.textContent, null, { timeout: 8000 }).catch(() => {});
ok(/8 caracteres/.test(await pg.textContent('#comCuenta .cm-error')), 'una contraseña corta se rechaza con su porqué');
await pg.fill('#comCuenta input[name=clave]', 'muybuena123'); await pg.click('#comCuenta .cm-si');
await pg.waitForSelector('#comCuenta .cm-codigo');
const cod = (await pg.textContent('#comCuenta .cm-codigo')).trim();
ok(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(cod), 'al crear la cuenta enseña el código de recuperación · ' + cod);
await pg.click('#comCuenta .cm-si');
await pg.waitForSelector('#comDentro:not([hidden]) .com-yo b');
ok(/Carlos/.test(await pg.textContent('#comYo')) && /@palomazi/.test(await pg.textContent('#comYo')), 'ya adentro, sale tu nombre y tu usuario');
await pg.waitForSelector('#comNuevo');
/* con el tema oscuro puesto, <html data-tema="oscuro"> — así lo cazó Carlos */
await pg.evaluate(() => { document.documentElement.dataset.tema = 'oscuro'; });
await pg.click('#comCuerpo .lema, #comCuerpo .chips').catch(() => {});
await pg.click('#comNuevo');
ok(await pg.evaluate(() => !!document.querySelector('#formTema') && !document.querySelector('.cm-dlg[open]')), '«Abrir un tema» abre el formulario (y no un foro fantasma), aun en modo oscuro');
await pg.fill('#formTema input[name=titulo]', '¿Quién es el villano de verdad?');
await pg.selectOption('#formTema select', 'teorias');
await pg.fill('#formTema textarea', 'Yo digo que el hermano, @luis_g qué opinas');
await pg.click('#formTema button[type=submit]');
await pg.waitForSelector('.cm-dlg[open] .cm-c');
ok(/el hermano/.test(await pg.textContent('#cmLista')) && /villano/.test(await pg.textContent('#cmTitulo')), 'abrir un tema lo publica y abre su hilo');
ok(await pg.evaluate(() => !!document.querySelector('#cmLista .cm-men')), 'la @mención sale resaltada (y se puede tocar)');
ok(!(await desborde(pg)), 'la hoja de comentarios no se sale de lado');
await pg.fill('.cm-redactar textarea', 'Y otra cosa <img src=x onerror=alert(1)>');
await pg.click('.cm-enviar');
await pg.waitForFunction(() => document.querySelectorAll('#cmLista .cm-c').length === 2);
ok(await pg.evaluate(() => !document.querySelector('#cmLista img[src="x"]') && /onerror/.test(document.querySelector('#cmLista').textContent)), 'el HTML que alguien escriba sale como texto, nunca se ejecuta');
await pg.click('#cmLista .cm-c [data-reac="encanta"]');
await pg.waitForFunction(() => document.querySelector('#cmLista .cm-c [data-reac="encanta"].mia'));
ok(/1/.test(await pg.textContent('#cmLista .cm-c [data-reac="encanta"]')), 'reaccionar con «me encanta» se marca y cuenta 1');
await pg.click('#cmLista .cm-c [data-responder]');
ok((await pg.inputValue('.cm-redactar textarea')).startsWith('@palomazi'), 'responder pone la @ de a quién respondes');
await pg.fill('.cm-redactar textarea', '@palomazi me respondo solo'); await pg.click('.cm-enviar');
await pg.waitForSelector('#cmLista .cm-hijos .cm-c');
ok(true, 'la respuesta queda colgando del comentario');
await pg.click('#cmLista .cm-quien button');
await pg.waitForSelector('#cmLista .cm-perfil h3');
ok(/Carlos/.test(await pg.textContent('#cmLista .cm-perfil h3')) && /comentarios/.test(await pg.textContent('#cmLista .cm-cifras')), 'tocar un nombre abre su perfil con sus números');
await pg.click('.cm-x');
await pg.click('#comPestanas [data-p="perfil"]');
await pg.waitForSelector('#formPerfil');
await pg.fill('#formPerfil textarea[name=bio]', 'Leo manhwas de noche');
await pg.click('#formPerfil button[type=submit]');
await pg.waitForFunction(() => /Guardado/.test(document.querySelector('#errPerfil')?.textContent || '') || document.querySelector('#comYo b'));
ok(q('SELECT bio FROM cuentas WHERE usuario = ?', 'palomazi')[0].bio === 'Leo manhwas de noche', 'el perfil se guarda en el servidor');
await pg.click('#comPestanas [data-p="reciente"]');
await pg.waitForSelector('#comCuerpo .com-tema');
ok((await pg.$$('#comCuerpo .com-tema')).length === 3, '«Lo reciente» enseña lo último que se dijo');
if (process.env.CAPTURA) await pg.screenshot({ path: process.env.CAPTURA + '/comunidad.png' });
ok(!(await desborde(pg)), 'la Comunidad no se sale de lado');
ok(!errores.length, 'sin errores en la consola' + (errores.length ? ' — ' + errores.join(' | ') : ''));

console.log('\nuna segunda persona, desde Tiras (390)');
const ctx2 = await br.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
await ctx2.route(/sala\.palomazi9111/, (r) => r.fulfill({ status: 404, body: '{}' }));
const p2 = await ctx2.newPage(); const err2 = [];
p2.on('pageerror', (e) => err2.push(e.message));
await p2.goto(O + '/tiras.html' + S);
await p2.evaluate(async () => {
  const d = await new Promise((ok) => { const q = indexedDB.open('inkwell-tiras', 1); q.onupgradeneeded = () => { q.result.createObjectStore('series', { keyPath: 'id' }); q.result.createObjectStore('caps', { keyPath: 'clave' }).createIndex('serie', 'serie'); }; q.onsuccess = () => ok(q.result); });
  const t = d.transaction('series', 'readwrite');
  t.objectStore('series').put({ id: 'webtoon:777', fuente: 'webtoon', titulo: 'Mi serie', orden: 1, caps: [{ n: 1, titulo: 'Uno' }, { n: 2, titulo: 'Dos' }], leidos: [1], desde: 0, ref: { fuente: 'webtoon', lang: 'es', genero: 'fantasy', slug: 'mi-serie', titleNo: '777' } });
  await new Promise((ok) => { t.oncomplete = ok; });
});
await p2.goto(O + '/tiras.html' + S + '&ficha=webtoon%3A777');
await p2.waitForSelector('#ficha:not([hidden])');
await p2.click('#fCom');
await p2.waitForSelector('.cm-dlg[open] .cm-cuenta');
ok(/Nadie ha comentado|Cargando/.test(await p2.textContent('#cmLista')) && await p2.isVisible('.cm-redactar .cm-cuenta'), 'los comentarios de la serie piden cuenta para escribir');
await p2.click('.cm-redactar .cm-pestanas button:nth-child(2)');
await p2.fill('.cm-redactar input[name=nombre]', 'Luis'); await p2.fill('.cm-redactar input[name=usuario]', 'luis_g'); await p2.fill('.cm-redactar input[name=clave]', 'clave-de-luis');
await p2.click('.cm-redactar .cm-si'); await p2.waitForSelector('.cm-redactar .cm-codigo'); await p2.click('.cm-redactar .cm-si');
await p2.waitForSelector('.cm-redactar textarea');
await p2.fill('.cm-redactar textarea', 'Esta serie está buenísima, @palomazi léela'); await p2.click('.cm-redactar .cm-op input'); await p2.click('.cm-enviar');
await p2.waitForSelector('#cmLista .cm-c');
ok(await p2.evaluate(() => !!document.querySelector('#cmLista .cm-spoiler')), 'comentar la serie, marcado como spoiler, sale borroso');
await p2.click('#cmLista .cm-spoiler .cm-txt');
ok(await p2.evaluate(() => !document.querySelector('#cmLista .cm-spoiler')), 'y al tocarlo se ve');
ok(q("SELECT COUNT(*) n FROM comentarios WHERE obra = 'webtoon:777' AND cap = ''")[0].n === 1, 'queda guardado como comentario de la SERIE');
ok(q("SELECT COUNT(*) n FROM avisos WHERE para = 'palomazi' AND tipo = 'mencion' AND de = 'luis_g'")[0].n === 1, 'a Carlos le llega el aviso cuando Luis lo menciona');
ok(q("SELECT COUNT(*) n FROM avisos WHERE para = 'luis_g'")[0].n === 0, 'una @mención a alguien que todavía no tenía cuenta no deja avisos fantasma');
ok(!err2.length, 'sin errores en la consola' + (err2.length ? ' — ' + err2.join(' | ') : ''));

await br.close(); srv.close();
console.log(`\n${bien} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
