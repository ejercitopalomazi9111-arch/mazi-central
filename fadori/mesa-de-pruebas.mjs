/* FADORI · pruebas. La mesa: varios aparatos (teléfonos, tablet, pantalla) en un navegador de
   verdad, cada uno con su propia memoria, contra el servidor real o el de `wrangler dev`.
   La usan pruebas-flujos.mjs y quien quiera armar otra prueba de varios aparatos.

   LOCAL=1                         sirve los archivos del repo en la dirección publicada
   API_LOCAL=http://127.0.0.1:8791  manda la API al servidor local (el nuevo, antes de publicarlo)
   Sin API_LOCAL, la API es la de producción en una escuela de prueba aparte. */
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
import { abrirWS } from './tunel-ws.mjs';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');

export const PROD = 'https://mazi-central.palomazi9111.workers.dev';
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const T = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

export async function abrirMesa(nombre = 'flujos'){
  const CASA = 'prueba-' + nombre + '-' + Date.now();
  const API_LOCAL = process.env.API_LOCAL || '';
  const px = process.env.HTTPS_PROXY ? new URL(process.env.HTTPS_PROXY) : null;
  const br = await chromium.launch(px && !API_LOCAL ? { proxy: { server: `${px.protocol}//${px.host}`, username: decodeURIComponent(px.username), password: decodeURIComponent(px.password) } } : {});
  const fallas = [];
  const ok = (q, c, extra) => { console.log((c ? '  ✓ ' : '  ✗ ') + q + (!c && extra ? ' · ' + extra : '')); if(!c) fallas.push(q); };

  async function aparato(ruta, { w = 390, h = 844, desfase = 0 } = {}){
    const ctx = await br.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block', hasTouch: w < 800 });
    await ctx.addInitScript(c => { try{ localStorage.setItem('fadori_casa', c); }catch(e){} }, CASA);
    if(desfase) await ctx.addInitScript(ms => { const real = Date.now.bind(Date); Date.now = () => real() + ms; }, desfase);
    if(process.env.LOCAL) await ctx.route(/mazi-central\.palomazi9111\.workers\.dev\/fadori\//, route => {
      const u = new URL(route.request().url()); let f = path.join(RAIZ, decodeURIComponent(u.pathname));
      if(f.endsWith('/')) f += 'index.html'; if(!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
      if(fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ status: 200, body: fs.readFileSync(f), headers: { 'content-type': T[path.extname(f)] || 'application/octet-stream' } });
      return route.continue();
    });
    if(API_LOCAL) await ctx.route(/fadori\.palomazi9111\.workers\.dev\/api\//, async route => {
      if(ctx._sinRed) return route.abort('internetdisconnected');
      const q = route.request(), u = new URL(q.url());
      const hh = Object.assign({}, q.headers()); delete hh.host;
      const r = await fetch(API_LOCAL + u.pathname + u.search, { method: q.method(), headers: hh, body: q.method() === 'POST' ? q.postDataBuffer() : undefined });
      return route.fulfill({ status: r.status, body: Buffer.from(await r.arrayBuffer()), headers: { 'content-type': r.headers.get('content-type') || 'application/json', 'access-control-allow-origin': PROD } });
    });
    await ctx.routeWebSocket(/fadori\.palomazi9111\.workers\.dev\/api\/vivo/, async pagina => {
      try{
        if(API_LOCAL){
          const u = new URL(pagina.url()), real = new WebSocket(API_LOCAL.replace(/^http/, 'ws') + u.pathname + u.search);
          real.onmessage = e => pagina.send(String(e.data)); real.onclose = () => { try{ pagina.close(); }catch(e){} };
          await new Promise((si, no) => { real.onopen = si; real.onerror = no; });
          pagina.onMessage(m => real.send(String(m))); pagina.onClose(() => real.close());
          return;
        }
        const real = await abrirWS(pagina.url(), PROD, m => pagina.send(m), () => { try{ pagina.close(); }catch(e){} });
        pagina.onMessage(m => real.enviar(String(m))); pagina.onClose(() => real.cerrar());
      }catch(e){ pagina.close(); }
    });
    const pg = await ctx.newPage(); pg.errores = []; pg.consola = [];
    pg.on('pageerror', e => pg.errores.push(e.message)); pg.on('console', m => pg.consola.push(m.text()));
    await pg.goto(PROD + ruta);
    await pg.waitForFunction(() => window.FADORI && FADORI.estadoSync().modo === 'enlinea', null, { timeout: 20000 }).catch(() => {});
    return pg;
  }
  /* cuánto tarda en cumplirse algo en otro aparato, sin recargar nada */
  async function tarda(pg, fn, arg, max = 14000){
    const t0 = Date.now();
    try{ await pg.waitForFunction(fn, arg, { timeout: max, polling: 100 }); return Date.now() - t0; }catch(e){ return null; }
  }
  /* la cooperativa entra como de verdad: pasador en su pantalla */
  async function mostrador(opciones){
    const m = await aparato('/fadori/mostrador', Object.assign({ w: 1100, h: 800 }, opciones || {}));
    await m.fill('#rPase', '1234'); await m.click('#rEntrar');
    await m.waitForFunction(() => FADORI.llaveMostrador(), null, { timeout: 10000 }).catch(() => {});
    await m.waitForTimeout(1500);
    return m;
  }
  /* un alumno se registra por la pantalla, como lo haría un niño */
  async function alumno(nombre, grupo = '3B', pg){
    const a = pg || await aparato('/fadori/');
    await a.evaluate(([n, g]) => { const F = FADORI; const al = F.registrar(n, g); F.aceptarTerminos(al.codigo); }, [nombre, grupo]);
    return a;
  }
  return { CASA, br, ok, fallas, aparato, tarda, mostrador, alumno, cerrar: () => br.close() };
}
