/* GRABA LAS WEBS DE SMILEY'S DE VERDAD para los comerciales: un teléfono de
   390×844 a doble resolución, la página corriendo 5 veces más lenta para que la
   grabación salga a 60 cuadros de verdad, y un circulito donde va el dedo.

     python3 -m http.server 8765        (en la raíz del repo)
     node smileys/video/grabar.mjs basica|completa
   Sale en smileys/video/rec/<cual>/%05d.jpg y rec/<cual>.json con las MARCAS:
   en qué segundo de la grabación pasa cada cosa, para que la composición sepa
   qué tramo poner en cada escena. */
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
import { grabar, dedo, tocar, deslizar, mover, lento } from '../../fadori-campana/grabar/comun.mjs';
import { red } from '../../herramientas/video/red.mjs';
const AQUI = path.dirname(new URL(import.meta.url).pathname);
const CUAL = process.argv[2] || 'basica', K = Number(process.env.LENTO || 5);
const BASE = process.env.BASE || 'http://localhost:8765';
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--force-device-scale-factor=2'] });
const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, reducedMotion: 'no-preference' });
await red(ctx); await lento(ctx, K);
const pg = await ctx.newPage(); await dedo(pg);
const errores = []; pg.on('pageerror', e => errores.push(e.message));
/* ninguna liga abre otra pestaña: se ve el toque y ya */
await pg.addInitScript(() => { window.open = () => null; addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href^="https://wa.me"],a[href^="tel:"]'); if(a) e.preventDefault(); }, true); });
const marcas = {}; let t0 = 0;
const marca = (n) => { marcas[n] = +((Date.now() - t0) / 1000 / K).toFixed(3); console.log('  ·', n, marcas[n]); };
const espera = (s) => pg.waitForTimeout(s * 1000 * K);

const rec = await grabar(pg); t0 = Date.now();
if(CUAL === 'basica'){
  await pg.goto(BASE + '/smileys/basica/', { waitUntil: 'load' });
  marca('portada'); await espera(2.6);
  await mover(pg, 230, 640, K); marca('baja-promos');
  await deslizar(pg, 760, 1300); await espera(0.6); marca('promo-grande');
  await deslizar(pg, 640, 1200); await espera(0.7); marca('promos');
  await deslizar(pg, 900, 1400); await espera(0.6); marca('carta');
  await deslizar(pg, 640, 1200); await espera(0.7); marca('pizzas');
  await deslizar(pg, 700, 1200); await espera(0.7); marca('pizzas-2');
  await deslizar(pg, 1500, 1500); await espera(0.7); marca('alitas');
  await deslizar(pg, 1500, 1500); await espera(0.7); marca('sucursales');
  await tocar(pg, '.flota', K); await espera(0.9); marca('hoja');
  await tocar(pg, '#hojaSuc a >> nth=1', K); await espera(1.2); marca('fin');
}
if(CUAL === 'completa'){
  /* baja hasta que la sección quede arriba, deslizando como dedo */
  const ir = async (sel, extra = 0, ms = 1300) => {
    const dy = await pg.evaluate(([s, e]) => document.querySelector(s).getBoundingClientRect().top - 70 + e, [sel, extra]);
    if(Math.abs(dy) > 4) await deslizar(pg, dy, ms);
  };
  await pg.goto(BASE + '/smileys/', { waitUntil: 'load' });
  marca('intro'); await espera(3.4);
  marca('portada'); await espera(1.6);
  await ir('#favoritas', 0, 1500); await espera(0.5); marca('favoritas');
  await ir('#cuantos', 0, 1400); await espera(0.4); marca('cuantos');
  for(let i = 0; i < 4; i++){ await tocar(pg, '#mas', K); await espera(0.35); }
  marca('cuantos-10'); await espera(0.6);
  await ir('#calcAgregar', -380, 900); await espera(0.3);
  await tocar(pg, '#calcAgregar', K); await espera(1.1); marca('agregado');
  await ir('#carta', 0, 1500); await espera(0.5); marca('carta');
  await ir('#lista', -40, 900); await espera(1.0);
  await ir('#armar', 0, 1500); await espera(0.4); marca('armar');
  for(const n of [0, 7, 11, 8]){ await tocar(pg, `#ings .ing >> nth=${n}`, K); await espera(0.6); }
  await ir('#mia', -90, 1000); await espera(1.3); marca('armada');
  await tocar(pg, '#agregarMia', K); await espera(1.0); marca('armada-agregada');
  await ir('#alitas', 0, 1500); await espera(0.9); marca('alitas');
  await tocar(pg, '#flota', K); await espera(1.0); marca('pedido');
  await pg.evaluate(() => { const a = document.querySelector('#avisoHora'); if(a) a.remove(); });
  await tocar(pg, '#continuar', K); await espera(0.7); marca('datos');
  await tocar(pg, '#radiosSuc label >> nth=1', K); await espera(0.4);
  await tocar(pg, '#fNombre', K);
  for(const c of 'Ana'){ await pg.keyboard.type(c); await espera(0.12); }
  await tocar(pg, '#enviar', K); await espera(1.6); marca('gracias');
}
const dir = path.join(AQUI, 'rec', CUAL);
const n = await rec.parar(dir, 60, K);
fs.writeFileSync(path.join(AQUI, 'rec', CUAL + '.json'), JSON.stringify({ cuadros: n, fps: 60, marcas }, null, 1));
console.log('✓', CUAL + ':', n, 'cuadros a 60 →', path.relative(process.cwd(), dir), errores.length ? '· errores: ' + errores.join(' | ') : '');
await br.close();
