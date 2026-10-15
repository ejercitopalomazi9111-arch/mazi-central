/* Lo que comparten las grabaciones del comercial. */
import fs from 'fs'; import path from 'path';

/* Graba lo que pinta la página. Chromium manda un cuadro cada vez que algo
   cambia (hasta ~60 por segundo) con su hora; al parar se vuelve una
   secuencia fija de 30 por segundo repitiendo el último cuadro cuando no
   cambió nada, que es lo que necesita el video. */
export async function grabar(pg, { calidad = 92, escala = 2 } = {}){
  const cdp = await pg.context().newCDPSession(pg), cuadros = [];
  cdp.on('Page.screencastFrame', async (f) => {
    cuadros.push({ t: f.metadata.timestamp, b: Buffer.from(f.data, 'base64') });
    try{ await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); }catch(e){}
  });
  /* el tope va en pixeles del aparato: con el devicePixelRatio de una pestaña en blanco salía a 1x */
  const vp = pg.viewportSize(), dpr = escala;
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: calidad, maxWidth: Math.round(vp.width * Math.max(dpr, 1)), maxHeight: Math.round(vp.height * Math.max(dpr, 1)), everyNthFrame: 1 });
  return {
    /* `lento`: si la página corrió `lento` veces más despacio (ver abajo), el
       tiempo de la grabación se divide entre eso y sale a velocidad normal */
    async parar(dir, fps = 30, lento = 1){
      await cdp.send('Page.stopScreencast').catch(() => {});
      fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
      if(!cuadros.length) return 0;
      const t0 = cuadros[0].t, fin = cuadros[cuadros.length - 1].t + 0.5 * lento;
      let k = 0, n = 0;
      for(let t = t0; t <= fin; t += lento / fps){
        while(k + 1 < cuadros.length && cuadros[k + 1].t <= t) k++;
        fs.writeFileSync(path.join(dir, String(n++).padStart(5, '0') + '.jpg'), cuadros[k].b);
      }
      return n;
    },
  };
}

/* El dedo: un círculo que sigue al ratón y se hunde al tocar. */
export async function dedo(pg){
  await pg.addInitScript(() => {
    addEventListener('DOMContentLoaded', () => {
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;left:0;top:0;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(255,255,255,.55);border:3px solid rgba(46,27,16,.55);box-shadow:0 4px 14px rgba(0,0,0,.25);pointer-events:none;z-index:2147483647;transition:transform .12s,opacity .3s;opacity:0';
      document.documentElement.appendChild(d);
      addEventListener('mousemove', e => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; d.style.opacity = 1; }, true);
      addEventListener('mousedown', () => { d.style.transform = 'scale(.72)'; }, true);
      addEventListener('mouseup', () => { d.style.transform = 'scale(1)'; }, true);
    });
  });
}

/* el dedo se desliza con frenado; con cámara lenta, cada paso espera K veces más */
const dedoEn = new WeakMap();
export async function mover(pg, x, y, K = 1, ms = 380){
  const [x0, y0] = dedoEn.get(pg) || [x, y], n = 24;
  for(let i = 1; i <= n; i++){ const k = i / n, e = 1 - Math.pow(1 - k, 3); await pg.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e); await pg.waitForTimeout(ms / n * K); }
  dedoEn.set(pg, [x, y]);
}

/* Llevar el dedo hasta un botón sin brincos, y tocarlo. */
export async function tocar(pg, sel, K = 1){
  const el = pg.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  const b = await el.boundingBox();
  if(!b) throw new Error('no se ve ' + sel);
  await mover(pg, b.x + b.width / 2, b.y + b.height / 2, K);
  await pg.waitForTimeout(160 * K);
  await pg.mouse.down(); await pg.waitForTimeout(90 * K); await pg.mouse.up();
}

/* Desplazar la página suave, como un dedo (con frenado al final). */
export async function deslizar(pg, dy, ms = 1200){
  await pg.evaluate(([dy, ms]) => new Promise(si => {
    const y0 = scrollY, t0 = performance.now();
    const paso = (t) => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); scrollTo(0, y0 + dy * e); k < 1 ? requestAnimationFrame(paso) : si(); };
    requestAnimationFrame(paso);
  }), [dy, ms]);
}

/* CÁMARA LENTA. Carlos, 15 de octubre: «hazlo a 60fps porque se traba».
   Chromium sin pantalla sólo entrega 15-25 cuadros distintos por segundo, así
   que la página corre K veces más despacio —temporizadores,
   requestAnimationFrame, animaciones y transiciones de CSS, y los videos— y
   la grabación se acelera K veces al guardarla: sale fluida a 60. */
export async function lento(ctx, K){
  await ctx.addInitScript((K) => {
    /* la FECHA no se frena: el teléfono le manda sus horas al servidor, y con
       el reloj atrasado el servidor rechazaba el pedido («no lo aceptó») */
    const pn = performance.now.bind(performance), p0 = pn();
    performance.now = () => p0 + (pn() - p0) / K;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => raf((t) => cb(p0 + (t - p0) / K));
    const st = window.setTimeout.bind(window), si = window.setInterval.bind(window);
    window.setTimeout = (f, ms, ...a) => st(f, (Number(ms) || 0) * K, ...a);
    window.setInterval = (f, ms, ...a) => si(f, (Number(ms) || 0) * K, ...a);
    /* CSS y videos: cada cuadro se frena lo que haya nacido desde el anterior */
    const frenar = () => {
      try{ for(const a of document.getAnimations()) if(a.playbackRate === 1) a.playbackRate = 1 / K; }catch(e){}
      for(const v of document.querySelectorAll('video,audio')) if(v.playbackRate !== 1 / K){ v.defaultPlaybackRate = 1 / K; v.playbackRate = 1 / K; }
      raf(frenar);
    };
    raf(frenar);
  }, K);
}
