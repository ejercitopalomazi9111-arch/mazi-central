#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   LA APERTURA · `node tienda/nucleo/pruebas-apertura.mjs`
   ──────────────────────────────────────────────────────────────────────────
   El logo de El Garaje del Barbero se arma al abrir la tienda (apertura.js).
   Se comprueba en un navegador de verdad, a 390×844:
   · que las nueve capas cargan y la animación corre (no en blanco);
   · que al terminar el logo armado es EL LOGO: se compara pixel a pixel
     contra el original, y la diferencia tiene que ser mínima;
   · que se quita sola, que un toque la salta y que sólo sale una vez;
   · que con «reducir movimiento» sale quieta.
   Con CAPTURAS=<carpeta> guarda los cuadros de la animación.
   ═════════════════════════════════════════════════════════════════════════ */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';

const TIENDA = join(dirname(new URL(import.meta.url).pathname), '..');
const { chromium, request } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const CAP = process.env.CAPTURAS || '';

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const servidor = createServer((req, res) => {
  const r = join(TIENDA, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  try{ res.writeHead(200, { 'Content-Type': TIPOS[extname(r)] || 'application/octet-stream' }).end(readFileSync(r)); }
  catch{ res.writeHead(404).end(); }
}).listen(0);
const BASE = `http://localhost:${servidor.address().port}/index.html`;
const api = await request.newContext({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
const nav = await chromium.launch();

async function pagina(extra = {}){
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block', isMobile: true, hasTouch: true, ...extra });
  await ctx.routeWebSocket(/^wss:\/\//, () => {});
  await ctx.route(/^https:\/\//, async (r) => { try{ await r.fulfill({ response: await api.fetch(r.request()) }); }catch{ await r.abort(); } });
  // Mientras la prueba mira un cuadro (window.__retener), el reloj de 4.6 s (DURA)
  // que quita la apertura espera.
  await ctx.addInitScript(() => {
    const st = window.setTimeout;
    window.setTimeout = function(f, ms, ...r){
      if(ms !== 4600 || typeof f !== 'function') return st.call(this, f, ms, ...r);
      const intenta = () => window.__retener ? st(intenta, 100) : f(...r);
      return st(intenta, ms);
    };
  });
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', (e) => errores.push(e.message));
  p.on('console', (m) => { if(m.type() === 'error' && !/Failed to load resource/.test(m.text())) errores.push(m.text()); });
  return { ctx, p, errores };
}

try{
  console.log('\n· La animación');
  {
    const { ctx, p, errores } = await pagina();
    await p.goto(BASE + '#/');
    await p.waitForSelector('.apertura', { timeout: 30000 });
    ok('la barbería abre con su logo, no con la genérica', await p.locator('.apertura .capa').count() === 9 && !(await p.locator('.presentacion .sello').count()));
    await p.waitForSelector('.apertura.corre', { timeout: 5000 });
    const cargadas = await p.evaluate(() => [...document.querySelectorAll('.apertura img.capa')].every((i) => i.complete && i.naturalWidth > 1000) && [...document.querySelectorAll('.apertura img.pieza')].every((i) => i.complete && i.naturalWidth > 20));
    ok('las nueve capas y las piezas sueltas cargan (y es cuando arranca)', cargadas);
    // Los cuadros se toman con las animaciones PAUSADAS en el milisegundo
    // exacto: tomar capturas en vivo tarda, y el reloj de la prueba se atrasa
    // contra el de la animación (así salía «la D ya llegó» a los «700 ms»).
    // Y el reloj que la quita a los 3.3 s se detiene mientras se mira.
    await p.evaluate(() => { window.__retener = true; });
    // La acción que pidió Carlos, medida en el cuadro exacto.
    const en = (t, fn) => p.evaluate(([t, cuerpo]) => { document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; }); return (0, eval)(cuerpo)(); }, [t, fn.toString()]);
    // La serpiente: cuadro por cuadro, la cuerda gira (casi dos vueltas en total) y su centro va de un lado a otro.
    const pasos = [];
    for(let t = 380; t <= 1600; t += 40) pasos.push(await en(t, () => { const e = document.querySelector('.apertura .cuerda-izq'), r = e.getBoundingClientRect(), c = e.parentNode.getBoundingClientRect(), m = getComputedStyle(e).transform; const v = m === 'none' ? [1, 0] : m.match(/matrix\(([^)]+)\)/)[1].split(',').map(Number); return { x: r.left + r.width / 2 - (c.left + c.width / 2), y: r.top + r.height / 2 - (c.top + c.height / 2), a: Math.atan2(v[1], v[0]) * 180 / Math.PI }; }));
    let vueltas = 0, cambios = 0, dir = 0;
    for(let k = 1; k < pasos.length; k++){
      let d = pasos[k].a - pasos[k - 1].a; if(d > 180) d -= 360; if(d < -180) d += 360; vueltas += Math.abs(d);
      const dx = pasos[k].x - pasos[k - 1].x; if(Math.abs(dx) > 0.5){ const s = Math.sign(dx); if(dir && s !== dir) cambios++; dir = s; }
    }
    ok('las cuerdas suben como serpiente: giran casi dos vueltas y culebrean de un lado a otro', vueltas > 500 && cambios >= 2 && pasos[0].y > pasos.at(-1).y + 20, JSON.stringify({ vueltas: Math.round(vueltas), cambios, y0: Math.round(pasos[0].y), y1: Math.round(pasos.at(-1).y) }));
    const tij = await en(1520, () => { const e = document.querySelector('.apertura .p-tijeras'), r = e.getBoundingClientRect(), c = e.parentNode.getBoundingClientRect(); return { top: r.top - c.top, op: getComputedStyle(e).opacity }; });
    const tij2 = await en(1830, () => { const e = document.querySelector('.apertura .p-tijeras'), r = e.getBoundingClientRect(), c = e.parentNode.getBoundingClientRect(); return { top: r.top - c.top, op: getComputedStyle(e).opacity }; });
    ok('las tijeras caen desde muy arriba y pegan en su lugar', tij.top < -40 && Number(tij.op) > 0.2 && tij2.top > 0, JSON.stringify([tij, tij2]));
    const golpe = await en(1880, () => getComputedStyle(document.querySelector('.apertura .logo-armado')).transform);
    ok('al pegar las tijeras, el logo entero se sacude (y salta la chispa)', golpe !== 'none' && await en(1900, () => Number(getComputedStyle(document.querySelector('.apertura .chispa.c1')).opacity)) > 0.2, golpe);
    const mango = await en(1900, () => Number(getComputedStyle(document.querySelector('.apertura .p-mango')).opacity));
    ok('el otro mango entra a armarse con las tijeras', mango > 0.3, String(mango));
    const cuadros = [250, 900, 1350, 1700, 2350, 3000, 4450];
    const opacidades = [], piezasEn = [];
    for(const [n, ms] of cuadros.entries()){
      await p.evaluate((t) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; }), ms);
      await p.waitForTimeout(60);
      opacidades.push(await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.apertura .capa')].map((i) => [i.classList[1], Number(getComputedStyle(i).opacity).toFixed(2)]))));
      piezasEn.push(await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.apertura .pieza')].map((i) => [i.classList[1], Number(getComputedStyle(i).opacity).toFixed(2)]))));
      if(CAP) await p.screenshot({ path: `${CAP}/apertura-${n + 1}.png` });
    }
    const piezas = await p.evaluate(() => [...document.querySelectorAll('.apertura .pieza')].map((i) => i.className.split(' ')[1]));
    ok('las piezas sueltas de Carlos (G, D, B, navaja, peine y los dos mangos de las tijeras) están en la apertura', piezas.length === 7, piezas.join());
    ok('la G que vuela es la pieza ENTERA; la capa cortada aparece al aterrizar', Number(piezasEn[4]['p-g']) > 0.3 && opacidades[4].g === '0.00', JSON.stringify(piezasEn[4]) + JSON.stringify(opacidades[4]));
    ok('y al final ya no queda ninguna pieza suelta: sólo el logo exacto', Object.values(piezasEn.at(-1)).every((o) => o === '0.00'), JSON.stringify(piezasEn.at(-1)));
    ok('las piezas llegan en orden: la D todavía no está cuando el aro ya se ve', opacidades[1].aro === '1.00' && Number(opacidades[1].d) < 0.2, JSON.stringify(opacidades[1]));
    ok('a los 4.45 s están todas', Object.values(opacidades.at(-1)).every((o) => o === '1.00'), JSON.stringify(opacidades.at(-1)));
    // El logo armado contra el original: mismo lugar y mismo tamaño en pantalla.
    const dif = await p.evaluate(() => { const c = document.querySelector('.apertura .logo-armado').getBoundingClientRect(); return { caja: [c.x, c.y, c.width, c.height] }; });
    const png = await p.screenshot({ clip: { x: dif.caja[0], y: dif.caja[1], width: dif.caja[2], height: dif.caja[3] } });
    if(CAP) (await import('node:fs')).writeFileSync(`${CAP}/armado.png`, png);
    const comparar = await p.evaluate(async (b64) => {
      const cargar = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
      const [a, b] = await Promise.all([cargar('data:image/png;base64,' + b64), cargar('marca/fuente/logo-completo.jpg')]);
      // A 288 px, y con el mejor acomodo de ±3 px: el recorte de la captura cae
      // en medio pixel y eso solo ya pinta de «diferente» cada orilla. Lo que
      // se quiere cazar es una pieza que falte o que no llegue a su lugar
      // (una G ausente sube la diferencia en ~7), no el medio pixel.
      const W = 288, H = Math.round(W * 535 / 577);
      const leer = (i) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(i, 0, 0, W, H); return x.getImageData(0, 0, W, H).data; };
      const A = leer(a), B = leer(b);
      /* Dos medidas: el logo entero y SÓLO la franja del nombre (abajo, entre
         12° y 165°, del radio 118 al 225). La del logo entero NO veía un nombre
         a medias: el 26 de septiembre la máscara del título quedó mal escrita,
         el nombre se paraba en «EL GAR», y el promedio de todo el logo seguía
         abajo de 15. */
      let mejor = Infinity, mejorNombre = Infinity;
      for(let sy = -3; sy <= 3; sy++) for(let sx = -3; sx <= 3; sx++){
        let suma = 0, n = 0, sumaN = 0, nN = 0;
        for(let y = 4; y < H - 4; y++) for(let x = 4; x < W - 4; x++){
          const dx = x / W * 577 - 289, dy = y / H * 535 - 269, r = Math.hypot(dx, dy);
          if(r > 225) continue;   // afuera: el original es negro y la apertura su fondo
          const k = (y * W + x) * 4, q = ((y + sy) * W + x + sx) * 4;
          const d = (Math.abs(A[q] - B[k]) + Math.abs(A[q + 1] - B[k + 1]) + Math.abs(A[q + 2] - B[k + 2])) / 3;
          suma += d; n++;
          const ang = Math.atan2(dy, dx) * 180 / Math.PI;
          if(r >= 118 && ang >= 12 && ang <= 165){ sumaN += d; nN++; }
        }
        mejor = Math.min(mejor, suma / n); mejorNombre = Math.min(mejorNombre, sumaN / nN);
      }
      return { todo: mejor, nombre: mejorNombre };
    }, png.toString('base64'));
    // Calibrado con mutaciones el 25 de septiembre: armado completo 12.3 (lo que
    // queda es el JPEG del original y el reescalado del navegador); sin la G,
    // 19.3; con el título corrido un 3 %, 17.3. La raya va en 15.
    ok('al terminar, lo armado ES el logo (diferencia < 15; sin la G da 19)', comparar.todo < 15, comparar.todo.toFixed(2));
    ok('y el nombre está COMPLETO en su arco (franja < 18: completo da 11.4, cortado en «EL GAR» da 26.7)', comparar.nombre < 18, comparar.nombre.toFixed(2));
    await p.evaluate(() => { window.__retener = false; document.getAnimations().forEach((a) => a.finish()); });
    await p.waitForSelector('.apertura', { state: 'detached', timeout: 5000 });
    ok('se quita sola y deja la tienda', await p.locator('#contenido').count() === 1);
    await p.reload();
    await p.waitForFunction(() => document.querySelector('#contenido')?.children.length, null, { timeout: 30000 });
    ok('en la misma sesión no vuelve a salir', !(await p.locator('.apertura').count()));
    ok('ni un error de consola', !errores.length, errores.join(' | '));
    await ctx.close();
  }

  console.log('\n· Saltarla');
  {
    const { ctx, p } = await pagina();
    await p.goto(BASE + '#/');
    await p.waitForSelector('.apertura.corre', { timeout: 30000 });
    await p.waitForTimeout(500);
    await p.locator('.apertura').click();
    await p.waitForSelector('.apertura', { state: 'detached', timeout: 1500 });
    ok('un toque la quita al momento', true);
    await ctx.close();
  }

  console.log('\n· Reducir movimiento');
  {
    const { ctx, p } = await pagina({ reducedMotion: 'reduce' });
    await p.goto(BASE + '#/');
    await p.waitForSelector('.apertura.quieta.corre', { timeout: 30000 });
    await p.waitForTimeout(700);
    const t = await p.evaluate(() => [...document.querySelectorAll('.apertura .capa')].map((i) => getComputedStyle(i).transform));
    ok('sale el logo quieto: ninguna pieza se mueve', t.every((x) => x === 'none'), t.join());
    if(CAP) await p.screenshot({ path: `${CAP}/apertura-quieta.png` });
    await ctx.close();
  }

  console.log('\n· Otro negocio');
  {
    // El de mercancía variada sólo existe en la prueba del segundo giro; aquí
    // basta con preguntarle a la regla.
    const { ctx, p } = await pagina();
    await p.goto(BASE + '#/');
    const r = await p.evaluate(async () => { const m = await import('./nucleo/apertura.js'); return [m.aperturaDe({ slug: 'variada' }), m.aperturaDe({ slug: 'otro', marca: { apertura: 'garaje' } }), m.aperturaDe({ slug: 'x', marca: { apertura: 'inventada' } })]; });
    ok('un negocio sin logo propio sigue con la presentación genérica', r[0] === null && r[1] === 'garaje' && r[2] === null, JSON.stringify(r));
    await ctx.close();
  }
}finally{
  await nav.close(); servidor.close(); await api.dispose();
}
console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan`);
process.exit(mal ? 1 : 0);
