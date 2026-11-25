/* Busca fotos libres en Unsplash con un Chromium de verdad (red() reenvía por el proxy sin apagar TLS). */
import { createRequire } from 'module'; import { red } from '../../../herramientas/video/red.mjs';
const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const b = await chromium.launch();
const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' });
await red(ctx); const p = await ctx.newPage();
for(const q of process.argv.slice(2)){
  try {
    await p.goto('https://unsplash.com/s/photos/' + encodeURIComponent(q) + '?license=free', { waitUntil: 'domcontentloaded', timeout: 45000 }); for(let k=0;k<8 && /Checking/.test(await p.title());k++) await p.waitForTimeout(3000); await p.waitForTimeout(2500);
    console.log(await p.title(), (await p.content()).length); const r = await p.$$eval('img[srcset*="images.unsplash.com/photo-"]', is => is.map(i => (i.alt || '').slice(0, 60) + ' | ' + i.src.split('?')[0]).slice(0, 8));
    console.log('##', q); r.forEach(x => console.log(x));
  } catch(e){ console.log('ERR', q, e.message.slice(0, 120)); }
}
await b.close();
