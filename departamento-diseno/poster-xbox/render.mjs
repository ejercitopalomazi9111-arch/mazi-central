/* Render del cartel: PDF vectorial para imprenta + PNG para mirarlo. */

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = dirname(fileURLToPath(import.meta.url));   /* la carpeta de este archivo */
const T = { '.html':'text/html', '.woff2':'font/woff2', '.png':'image/png', '.svg':'image/svg+xml', '.jpg':'image/jpeg' };
const srv = http.createServer(async (q, r) => {
  const f = join(DIR, decodeURIComponent(new URL(q.url,'http://x').pathname));
  try { const d = await readFile(f);
        r.setHeader('content-type', T[extname(f)]||'application/octet-stream'); r.end(d); }
  catch(e){ r.statusCode = 404; r.end('no'); }
});
await new Promise(r => srv.listen(0,'127.0.0.1',r));
const P = srv.address().port;

let nav = null;
for (const d of ['playwright','/opt/node22/lib/node_modules/playwright/index.mjs','/usr/lib/node_modules/playwright/index.mjs']) {
  try { nav = await (await import(d)).chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--font-render-hinting=none'] }); break; } catch(e){}
}
if (!nav) { console.log('sin navegador'); process.exit(1); }

const ESCALA = Number(process.argv[2] || 2);
/* 506 mm a 96 dpi = 1912 px de CSS. Con escala 2 → 3824 px ≈ 192 dpi. */
const ctx = await nav.newContext({ viewport:{ width:1912, height:2669 }, deviceScaleFactor: ESCALA });
const pg = await ctx.newPage();
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(`http://127.0.0.1:${P}/poster.html`, { waitUntil:'networkidle' });
await pg.evaluate(() => document.fonts.ready);
await pg.waitForTimeout(700);

await pg.screenshot({ path: join(DIR,'poster.png'), fullPage:false });
await pg.pdf({ path: join(DIR,'poster.pdf'), width:'506mm', height:'706mm',
               printBackground:true, margin:{top:0,right:0,bottom:0,left:0} });

/* Miniatura para mirarla de un vistazo sin abrir 4000 px */
const ctx2 = await nav.newContext({ viewport:{ width:1912, height:2669 }, deviceScaleFactor:.85 });
const pg2 = await ctx2.newPage();
await pg2.goto(`http://127.0.0.1:${P}/poster.html`, { waitUntil:'networkidle' });
await pg2.evaluate(() => document.fonts.ready);
await pg2.waitForTimeout(500);
await pg2.screenshot({ path: join(DIR,'poster-pantalla.png') });

console.log('errores de página:', errs.length ? errs[0] : 'ninguno');
await nav.close(); srv.close();
