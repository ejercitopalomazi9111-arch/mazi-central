/* Recorte 1:1 del pie y del titular: la letra chica es donde se cae todo. */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
const DIR='/tmp/claude-0/-home-user-evaluaciones-rembrandt/bf88face-536e-5b8f-9dd9-93f513378ced/scratchpad/poster';
const T={'.html':'text/html','.woff2':'font/woff2'};
const srv=http.createServer(async(q,r)=>{const f=join(DIR,decodeURIComponent(new URL(q.url,'http://x').pathname));
 try{const d=await readFile(f);r.setHeader('content-type',T[extname(f)]||'application/octet-stream');r.end(d);}catch(e){r.statusCode=404;r.end('no');}});
await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const P=srv.address().port;
let nav=null;
for(const d of ['playwright','/opt/node22/lib/node_modules/playwright/index.mjs','/usr/lib/node_modules/playwright/index.mjs']){
  try{ nav=await (await import(d)).chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']}); break;}catch(e){}}
const ctx=await nav.newContext({viewport:{width:1912,height:2668},deviceScaleFactor:2});
const pg=await ctx.newPage();
await pg.goto(`http://127.0.0.1:${P}/poster.html`,{waitUntil:'networkidle'});
await pg.evaluate(()=>document.fonts.ready); await pg.waitForTimeout(500);
await pg.screenshot({path:join(DIR,'detalle-pie.png'), clip:{x:60,y:2380,width:1800,height:280}});
await pg.screenshot({path:join(DIR,'detalle-titular.png'), clip:{x:60,y:1900,width:1500,height:480}});
await nav.close(); srv.close(); console.log('recortes listos');
