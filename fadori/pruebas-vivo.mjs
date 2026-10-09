/* FADORI · la prueba de punta a punta, en tiempo real, contra el servidor DE VERDAD.
   ─────────────────────────────────────────────────────────────────────────────
   Dos alumnos, un mostrador y la pantalla de turnos en una escuela de prueba
   aparte (fadori_casa = prueba-vivo-…), y se mide cuánto tarda cada cambio en
   verse en los otros aparatos sin recargar nada. El mostrador con el reloj 3 s
   atrasado y un alumno 2 min adelantado, como en una escuela de verdad.

   Nació de la prueba de Carlos del 9 de octubre (cinco alumnos, todos turno 1,
   nada en el mostrador) y cazó tres defectos más que no salían probando cada
   pieza sola. Ver el Cerebro: servidor-que-nadie-conecta, gana-el-reloj-equivocado.

   Correr:  LOCAL=1 node fadori/pruebas-vivo.mjs   (los archivos del repo)
            node fadori/pruebas-vivo.mjs           (lo publicado)
   En este contenedor el navegador sale por el proxy con su certificado en el
   almacén de Chromium (certutil -d sql:$HOME/.pki/nssdb -A …) y el WebSocket
   va por un relevo (tunel-ws.mjs) porque el proxy no deja pasar la mejora a
   WebSocket cuando el navegador ofrece h2. Un teléfono va directo a Cloudflare. */
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import { abrirWS } from './tunel-ws.mjs';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const PROD = 'https://mazi-central.palomazi9111.workers.dev', CASA = 'prueba-vivo-' + Date.now();
const px = new URL(process.env.HTTPS_PROXY);
const br = await chromium.launch({ args: process.env.H1 ? ['--disable-http2'] : [], proxy: { server: `${px.protocol}//${px.host}`, username: decodeURIComponent(px.username), password: decodeURIComponent(px.password) } });
const fallas = []; const ok = (q, c) => { console.log((c ? '  ✓ ' : '  ✗ ') + q); if (!c) fallas.push(q); };
async function aparato(ruta, w = 390, h = 844, desfase = 0) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
  await ctx.addInitScript(c => { try { localStorage.setItem('fadori_casa', c); } catch (e) {} }, CASA);
  // un reloj desatinado, como el de un teléfono de verdad
  if (desfase) await ctx.addInitScript(ms => { const real = Date.now.bind(Date); Date.now = () => real() + ms; }, desfase);
  // con LOCAL=1 se sirven los archivos del repo en la dirección publicada
  if (process.env.LOCAL) await ctx.route(/mazi-central\.palomazi9111\.workers\.dev\/fadori\//, route => {
    const u = new URL(route.request().url()); let f = path.join(path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), decodeURIComponent(u.pathname));
    if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
    const T = { '.js': 'text/javascript', '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ status: 200, body: fs.readFileSync(f), headers: { 'content-type': T[path.extname(f)] || 'application/octet-stream' } });
    return route.continue();
  });
  // relevo: el socket del navegador se conecta de verdad al servidor por un túnel (ver tunel.mjs)
  await ctx.routeWebSocket(/fadori\.palomazi9111\.workers\.dev\/api\/vivo/, async pagina => {
    try {
      const real = await abrirWS(pagina.url(), PROD, m => pagina.send(m), () => { try { pagina.close(); } catch (e) {} });
      pagina.onMessage(m => real.enviar(String(m))); pagina.onClose(() => real.cerrar());
    } catch (e) { console.log('relevo falló', e.message); pagina.close(); }
  });
  const pg = await ctx.newPage(); pg.errores = []; pg.consola = [];
  pg.on('pageerror', e => pg.errores.push(e.message)); pg.on('console', m => pg.consola.push(m.text()));
  await pg.goto(PROD + ruta); await pg.waitForFunction(() => window.FADORI && FADORI.estadoSync().modo === 'enlinea', null, { timeout: 20000 }).catch(() => {});
  return pg;
}
// cuánto tarda en cumplirse algo en otra pantalla, SIN recargar ni llamar cargar() a mano
async function tarda(pg, fn, arg) {
  const t0 = Date.now();
  try { await pg.waitForFunction(fn, arg, { timeout: 14000, polling: 100 }); return Date.now() - t0; } catch (e) { return null; }
}
const most = await aparato('/fadori/mostrador', 1100, 800, -3000);   // la tablet 3 s atrasada
const pant = await aparato('/fadori/pantalla', 1280, 720);
await most.waitForTimeout(2500);   // que suba su menú
const a = await aparato('/fadori/', 390, 844, 120000), b = await aparato('/fadori/');   // A con el reloj 2 min adelantado
for (const [n, pg] of [['mostrador', most], ['pantalla', pant], ['alumno A', a], ['alumno B', b]])
  ok(`${n}: conectado en vivo (${await pg.evaluate(() => FADORI.estadoSync().texto)})`, await pg.evaluate(() => FADORI.estadoSync().modo === 'enlinea'));

console.log('\n1 · pedir');
const pedir = (pg, n) => pg.evaluate(n => { const F = FADORI; const al = F.registrar('Alumno ' + n, '3B'); F.aceptarTerminos(al.codigo);
  const prod = F.productos(true).find(p => p.disponible && F.tocaHoy(p)) || F.productos(true)[0];
  return F.pedir(al.codigo, [{ prod: prod.id, cant: 1 }], {}).id; }, n);
const idA = await pedir(a, 'A'), idB = await pedir(b, 'B');
let ms = await tarda(a, id => FADORI.pedido(id)?.turno != null, idA); ok(`A recibe su turno del servidor (${ms} ms)`, ms != null && ms < 4000);
ms = await tarda(b, id => FADORI.pedido(id)?.turno != null, idB); ok(`B recibe su turno del servidor (${ms} ms)`, ms != null && ms < 4000);
const ta = await a.evaluate(id => FADORI.pedido(id).turno, idA), tb = await b.evaluate(id => FADORI.pedido(id).turno, idB);
ok(`turnos distintos: A=${ta}, B=${tb}`, ta !== tb);
ms = await tarda(most, ids => ids.every(id => FADORI.colaOrdenada().some(p => p.id === id)), [idA, idB]); ok(`los dos llegan a la cola del mostrador (${ms} ms)`, ms != null && ms < 4000);
ok('el mostrador sabe qué platillo es cada uno', await most.evaluate(ids => ids.every(id => FADORI.pedido(id).renglones.every(r => FADORI.producto(r.prod))), [idA, idB]));

console.log('\n2 · el mostrador despacha y el alumno lo ve');
await most.evaluate(id => FADORI.tomar(id, 'Señora'), idA);
ms = await tarda(a, id => FADORI.pedido(id).estado === 'preparando', idA); ok(`A ve «preparando» (${ms} ms)`, ms != null && ms < 4000);
await most.evaluate(id => FADORI.marcarListo(id), idA);
ms = await tarda(a, id => FADORI.pedido(id).estado === 'listo', idA); ok(`A ve «listo» (${ms} ms)`, ms != null && ms < 4000);
ms = await tarda(pant, t => document.body.innerText.includes(String(t)), ta); ok(`la pantalla de turnos enseña el turno ${ta} (${ms} ms)`, ms != null && ms < 4000);
await most.evaluate(id => FADORI.entregar(id, FADORI.pedido(id).total), idA);
ms = await tarda(a, id => FADORI.pedido(id).estado === 'entregado', idA); ok(`A ve «entregado» (${ms} ms)`, ms != null && ms < 4000);

console.log('\n3 · el alumno cancela y el mostrador se entera');
const cancelo = await b.evaluate(id => { try { FADORI.cancelar(id, 'alumno'); return FADORI.pedido(id).estado; } catch (e) { return 'error: ' + e.message; } }, idB);
ms = await tarda(most, id => FADORI.pedido(id).estado === 'cancelado', idB); ok(`el mostrador ve la cancelación de B (${cancelo}, ${ms} ms)`, ms != null && ms < 4000);
if (ms == null && process.env.DEPURAR) {
  console.log('   B:', await b.evaluate(id => { const p = FADORI.pedido(id); return { estado: p.estado, t: p.t, pend: FADORI.estadoSync(), visto: localStorage.getItem('fadori_sync') }; }, idB));
  console.log('   mostrador:', await most.evaluate(id => { const p = FADORI.pedido(id); return { estado: p.estado, t: p.t }; }, idB));
  const todo = await (await fetch(`https://fadori.palomazi9111.workers.dev/api/todo?casa=${CASA}`)).json().catch(e => ({ e: e.message }));
  console.log('   servidor:', JSON.stringify((todo.cambios?.pedidos || []).find(p => p.id === idB) || todo).slice(0, 300));
}

console.log('\n4 · se acaba un platillo');
const pid = await most.evaluate(() => { const p = FADORI.productos(true).find(p => p.disponible); FADORI.marcarDisponible(p.id, false); return p.id; });
ms = await tarda(a, id => FADORI.producto(id) && !FADORI.producto(id).disponible, pid); ok(`A ve el platillo agotado (${ms} ms)`, ms != null && ms < 4000);
await most.evaluate(id => FADORI.marcarDisponible(id, true), pid);
ms = await tarda(b, id => FADORI.producto(id)?.disponible, pid); ok(`y B lo ve de vuelta (${ms} ms)`, ms != null && ms < 4000);

console.log('\n5 · el mostrador cambia un precio');
const precio = await most.evaluate(() => { const p = Object.assign({}, FADORI.productos(true)[1]); p.precio = p.precio + 500; FADORI.guardarProducto(p); return [p.id, p.precio]; });
ms = await tarda(a, ([id, pr]) => FADORI.producto(id)?.precio === pr, precio); ok(`A ve el precio nuevo (${ms} ms)`, ms != null && ms < 4000);

console.log('\n6 · el alumno que vuelve: abre la app ya registrado y lo PRIMERO que hace es pedir');
const c = await aparato('/fadori/');
const codC = await c.evaluate(() => { const al = FADORI.registrar('Alumno C', '2A'); FADORI.aceptarTerminos(al.codigo); return al.codigo; });
await c.waitForTimeout(1500);
await c.reload(); await c.waitForFunction(() => window.FADORI && FADORI.estadoSync().modo === 'enlinea', null, { timeout: 20000 }).catch(() => {});
const idC = await c.evaluate(cod => { const prod = FADORI.productos(true).find(p => p.disponible); return FADORI.pedir(cod, [{ prod: prod.id, cant: 1 }], {}).id; }, codC);
ms = await tarda(most, id => !!FADORI.pedido(id), idC); ok(`su pedido llega al mostrador (${ms} ms)`, ms != null && ms < 4000);
ms = await tarda(c, id => FADORI.pedido(id)?.turno != null, idC); ok(`y recibe turno (${ms} ms)`, ms != null && ms < 4000);

console.log('\n7 · sin señal: pide sin internet y sale solo cuando vuelve');
await b.context().setOffline(true);
const idB2 = await b.evaluate(() => { const yo = FADORI.yo && FADORI.yo(); const al = FADORI.registrar('Alumno B2', '3B'); FADORI.aceptarTerminos(al.codigo); const prod = FADORI.productos(true).find(p => p.disponible); return FADORI.pedir(al.codigo, [{ prod: prod.id, cant: 1 }], {}).id; });
await b.waitForTimeout(3000);
ok('sin señal no llega (todavía)', !(await most.evaluate(id => !!FADORI.pedido(id), idB2)));
await b.context().setOffline(false);
ms = await tarda(most, id => !!FADORI.pedido(id), idB2); ok(`vuelve la señal y llega solo (${ms} ms)`, ms != null && ms < 14000);

console.log('\n8 · pantallas');
for (const [n, pg] of [['mostrador', most], ['pantalla', pant], ['alumno A', a], ['alumno B', b], ['alumno C', c]]) {
  ok(`${n}: sin errores (${pg.errores.slice(0, 2).join(' | ')})`, !pg.errores.length);
  const pr = pg.consola.find(t => /pruebas/.test(t)); if (pr) ok(`${n}: ${pr.replace(/%c| color:.*/g, '')}`, !/✗/.test(pg.consola.join(' ')) && !/color:#FF7A7A/.test(pr));
}

console.log(`\n${fallas.length ? '✗ ' + fallas.length + ' fallas' : '✓ todo bien'} · escuela de prueba ${CASA}`);
await br.close();

process.exit(fallas.length ? 1 : 0);
