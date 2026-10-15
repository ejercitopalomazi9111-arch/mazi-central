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
const T = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg' };

/* desde el 11 de octubre no se pide sin correo y credencial: el alumno de
   prueba manda una foto (un cuadro gris) y pone un correo propio. Deja el
   correo en `pg.correoPrueba` (contraseña: prueba123) */
export async function ponerCuenta(pg, codigo){
  if(!(await pg.evaluate(() => FADORI.motor() === 'servidor'))) return;
  /* como una persona: entre darse de alta y escoger la foto pasan segundos.
     Hacerlo en el mismo milisegundo pierde la aceptación de los términos */
  await pg.waitForTimeout(1500);
  const correo = 'p' + Math.random().toString(36).slice(2, 10) + '@prueba.mx';
  const r = await pg.evaluate(async ([correo, cod]) => {
    const F = FADORI, al = () => F.estado().alumnos[cod || (F.yo() || {}).codigo]; if(!al()) return 'sin alumno';
    const c = document.createElement('canvas'); c.width = 64; c.height = 40; const g = c.getContext('2d'); g.fillStyle = '#888'; g.fillRect(0, 0, 64, 40);
    let ultimo = '';
    for(let i = 0; i < 40; i++){
      const a = al(), f = a.verif === 'si' || a.verif === 'pendiente' ? { ok: true } : await F.subirCredencial(a.codigo, c.toDataURL('image/jpeg', .6));
      const p = al().protegida ? { ok: true } : (f.ok ? await F.protegerCuenta(a.codigo, correo, 'prueba123') : { ok: false });
      if(f.ok && p.ok) return 'ok';
      ultimo = (f.error || '') + ' / ' + (p.error || '');
      await new Promise(s => setTimeout(s, 500));   /* el alta del alumno todavía no llega al servidor */
    }
    return 'no se pudo: ' + ultimo;
  }, [correo, codigo || null]);
  if(r !== 'ok') throw new Error('cuenta de prueba: ' + r);
  if(!(await pg.evaluate((cod) => !!(FADORI.estado().alumnos[cod || FADORI.yo().codigo] || {}).terminos, codigo || null))) throw new Error('cuenta de prueba: se perdió la aceptación de los términos');
  pg.correoPrueba = correo;
}

export async function abrirMesa(nombre = 'flujos'){
  const CASA = 'prueba-' + nombre + '-' + Date.now();
  const API_LOCAL = process.env.API_LOCAL || '';
  const px = process.env.HTTPS_PROXY ? new URL(process.env.HTTPS_PROXY) : null;
  /* cámara y micrófono de mentira para la transmisión en vivo (WebRTC) */
  const MEDIOS = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'];
  const br = await chromium.launch(Object.assign({ args: MEDIOS }, px && !API_LOCAL ? { proxy: { server: `${px.protocol}//${px.host}`, username: decodeURIComponent(px.username), password: decodeURIComponent(px.password) } } : {}));
  const fallas = [];
  const ok = (q, c, extra) => { console.log((c ? '  ✓ ' : '  ✗ ') + q + (!c && extra ? ' · ' + extra : '')); if(!c) fallas.push(q); };

  async function aparato(ruta, { w = 390, h = 844, desfase = 0, credencial = false, escala = 1, zona, tema } = {}){
    /* zona: la hora del aparato (p. ej. 'America/Mexico_City'); sin ella el navegador va en UTC
       y `new Date().setHours(10,30)` cae seis horas antes que en un teléfono de México */
    const ctx = await br.newContext(Object.assign({ viewport: { width: w, height: h }, serviceWorkers: 'block', hasTouch: w < 800, deviceScaleFactor: escala }, zona ? { timezoneId: zona } : {}));
    if(tema) await ctx.addInitScript(t => { try{ localStorage.setItem('fadori_tema', t); }catch(e){} }, tema);
    await ctx.addInitScript(c => { try{ localStorage.setItem('fadori_casa', c); }catch(e){} }, CASA);
    /* las pruebas de antes no traen credencial: dicen «no la traigo hoy», como
       un alumno que la deja para mañana. La prueba de cuentas pasa credencial:true */
    if(!credencial) await ctx.addInitScript(() => { try{ localStorage.setItem('fadori_cred_luego', new Date().toDateString()); }catch(e){} });
    if(desfase) await ctx.addInitScript(ms => { const real = Date.now.bind(Date); Date.now = () => real() + ms; }, desfase);
    if(process.env.LOCAL) await ctx.route(/mazi-central\.palomazi9111\.workers\.dev\/(fadori|sociedad|podcast)\//, route => {
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
    await m.fill('#rPase', '121026'); await m.click('#rEntrar');
    await m.waitForFunction(() => FADORI.llaveMostrador(), null, { timeout: 10000 }).catch(() => {});
    await m.waitForTimeout(1500);
    return m;
  }
  const cuenta = (pg, codigo) => ponerCuenta(pg, codigo);
  /* un alumno se registra por la pantalla, como lo haría un niño */
  async function alumno(nombre, grupo = '3B', pg){
    const a = pg || await aparato('/fadori/');
    await a.evaluate(([n, g]) => { const F = FADORI; const al = F.registrar(n, g); F.aceptarTerminos(al.codigo); }, [nombre, grupo]);
    await cuenta(a);
    return a;
  }
  return { CASA, br, ok, fallas, aparato, tarda, mostrador, alumno, cuenta, cerrar: () => br.close() };
}
