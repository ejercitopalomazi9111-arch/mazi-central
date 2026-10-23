/* LAS TOMAS DEL COMERCIAL DE GRUPO MAZI: cada trabajo grabado de verdad, en
   el navegador, con la página corriendo 5 veces más lenta para que salga a 60
   cuadros. Teléfono (390×844 al doble) o computadora (1440×900 a 1.5).

     python3 -m http.server 8765        (en la raíz del repo)
     node marca/video/grabar.mjs [toma …]      (sin nombres, todas)
   Sale en marca/video/rec/<toma>/%05d.jpg y rec/<toma>.json. */
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
import { grabar, dedo, tocar, deslizar, mover, lento } from '../../fadori-campana/grabar/comun.mjs';
import { red } from '../../herramientas/video/red.mjs';
const AQUI = path.dirname(new URL(import.meta.url).pathname), K = Number(process.env.LENTO || 5);
const BASE = process.env.BASE || 'http://localhost:8765';
const TEL = { w: 390, h: 844, escala: 2, movil: true }, PC = { w: 1440, h: 900, escala: 1.5, movil: false };

/* cada toma: dónde, en qué aparato y qué hace el dedo */
const TOMAS = {
  'district-tel': { ap: TEL, url: '/district-roll/', async hacer(pg, e){ await e(2.2); await deslizar(pg, 760, 1500); await e(.6); await deslizar(pg, 900, 1500); await e(.8); } },
  'district-pc': { ap: PC, url: '/district-roll/', async hacer(pg, e){ await e(2.4); await deslizar(pg, 700, 1700); await e(1.2); } },
  'arco-pc': { ap: PC, url: 'https://bigtigermx.github.io/rodrigo-cabrera/', async hacer(pg, e){ await e(2.6); await deslizar(pg, 900, 1700); await e(1); await deslizar(pg, 1000, 1700); await e(1.2); } },
  'arco-tel': { ap: TEL, url: 'https://bigtigermx.github.io/rodrigo-cabrera/', async hacer(pg, e){ await e(2.2); await deslizar(pg, 1500, 1700); await e(1); } },
  'ligas-pc': { ap: PC, url: '/ligas-mazi/', async hacer(pg, e){ await e(4); } },
  'puercos-tel': { ap: TEL, url: '/juegos/guerra-de-puercos/', async hacer(pg, e){ await e(1.6); await tocar(pg, '[data-modo="maquina"]', K); await e(3.2); } },
  'mosca-pc': { ap: PC, url: '/mosca/', async hacer(pg, e){ await e(5); } },
  'laboratorio-pc': { ap: PC, url: '/laboratorio/', async hacer(pg, e){ await e(1.8); await deslizar(pg, 800, 1700); await e(1); } },
  'reportes-pc': { ap: PC, url: '/reportes/', async hacer(pg, e){ await e(2); await deslizar(pg, 500, 1500); await e(1); } },
  'sitio-pc': { ap: PC, url: '/sitio/', async hacer(pg, e){ await e(5); await deslizar(pg, 900, 1700); await e(1); } },
};

const pedidas = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(TOMAS);
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--force-device-scale-factor=2'] });
for(const nombre of pedidas){
  const T = TOMAS[nombre]; if(!T){ console.log('✗ no existe', nombre); continue; }
  const ctx = await br.newContext({ viewport: { width: T.ap.w, height: T.ap.h }, deviceScaleFactor: T.ap.escala, isMobile: T.ap.movil, hasTouch: T.ap.movil, reducedMotion: 'no-preference' });
  await red(ctx); await lento(ctx, K);
  const pg = await ctx.newPage(); await dedo(pg);
  const errores = []; pg.on('pageerror', x => errores.push(x.message));
  await pg.addInitScript(() => { window.open = () => null; });
  const espera = (s) => pg.waitForTimeout(s * 1000 * K);
  const rec = await grabar(pg, { escala: T.ap.escala });
  await pg.goto(T.url.startsWith('http') ? T.url : BASE + T.url, { waitUntil: 'load', timeout: 120000 });
  try{ await T.hacer(pg, espera); }catch(x){ console.log('  ✗', nombre, x.message.split('\n')[0]); }
  const dir = path.join(AQUI, 'rec', nombre);
  const n = await rec.parar(dir, 60, K);
  fs.writeFileSync(path.join(AQUI, 'rec', nombre + '.json'), JSON.stringify({ cuadros: n, fps: 60, w: T.ap.w * T.ap.escala, h: T.ap.h * T.ap.escala }));
  console.log('✓', nombre + ':', n, 'cuadros', errores.length ? '· errores: ' + errores.slice(0, 2).join(' | ') : '');
  await ctx.close();
}
await br.close();
