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
  // Mientras la prueba mira un cuadro (window.__retener), el reloj de 3.7 s (DURA)
  // que quita la apertura espera.
  await ctx.addInitScript(() => {
    const st = window.setTimeout;
    window.setTimeout = function(f, ms, ...r){
      if(ms !== 3700 || typeof f !== 'function') return st.call(this, f, ms, ...r);
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
    const cuadros = [250, 700, 1150, 1600, 2100, 2800, 3550];
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
    ok('la G que vuela es la pieza ENTERA; la capa cortada aparece al aterrizar', Number(piezasEn[2]['p-g']) > 0.3 && opacidades[2].g === '0.00', JSON.stringify(piezasEn[2]) + JSON.stringify(opacidades[2]));
    ok('y al final ya no queda ninguna pieza suelta: sólo el logo exacto', Object.values(piezasEn.at(-1)).every((o) => o === '0.00'), JSON.stringify(piezasEn.at(-1)));
    ok('las piezas llegan en orden: la D todavía no está cuando el aro ya se ve', opacidades[1].aro === '1.00' && Number(opacidades[1].d) < 0.2, JSON.stringify(opacidades[1]));
    ok('a los 3.5 s están todas', Object.values(opacidades.at(-1)).every((o) => o === '1.00'), JSON.stringify(opacidades.at(-1)));
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
      let mejor = Infinity;
      for(let sy = -3; sy <= 3; sy++) for(let sx = -3; sx <= 3; sx++){
        let suma = 0, n = 0;
        for(let y = 4; y < H - 4; y++) for(let x = 4; x < W - 4; x++){
          const dx = x / W * 577 - 289, dy = y / H * 535 - 269;
          if(Math.hypot(dx, dy) > 225) continue;   // afuera: el original es negro y la apertura su fondo
          const k = (y * W + x) * 4, q = ((y + sy) * W + x + sx) * 4;
          suma += (Math.abs(A[q] - B[k]) + Math.abs(A[q + 1] - B[k + 1]) + Math.abs(A[q + 2] - B[k + 2])) / 3; n++;
        }
        mejor = Math.min(mejor, suma / n);
      }
      return mejor;
    }, png.toString('base64'));
    // Calibrado con mutaciones el 25 de septiembre: armado completo 12.3 (lo que
    // queda es el JPEG del original y el reescalado del navegador); sin la G,
    // 19.3; con el título corrido un 3 %, 17.3. La raya va en 15.
    ok('al terminar, lo armado ES el logo (diferencia < 15; sin la G da 19)', comparar < 15, comparar.toFixed(2));
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
