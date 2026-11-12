/* INKWELL · el trabajador de fondo contra las redirecciones de Cloudflare.
   Cloudflare le quita el .html a las páginas (tiras.html → 307 → /tiras). Con el trabajador de la v30, «Leer»
   daba «No se puede acceder a este sitio» (ERR_FAILED) porque servía de lo guardado una respuesta redirigida.
   Esta prueba levanta un servidor que redirige igual que Cloudflare y revisa:
     1. con el trabajador nuevo, cada página abre (con y sin .html, con ?leer=);
     2. un teléfono que ya tenía el trabajador VIEJO se cura al abrir el inicio una vez;
     3. sin internet, las páginas siguen abriendo de lo guardado.
   Uso: node inkwell/pruebas-sw.mjs   (VIEJO=<archivo> para cambiar el trabajador viejo de la prueba 2) */
import http from 'http'; import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
import { createRequire } from 'module'; const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const VIEJO = process.env.VIEJO ? fs.readFileSync(process.env.VIEJO, 'utf8') : execFileSync('git', ['show', '337aabbd:inkwell/sw.js'], { cwd: RAIZ, encoding: 'utf8' });
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp' };
let swViejo = false;
const srv = http.createServer((q, r) => {
  const u = new URL(q.url, 'http://x'), p = decodeURIComponent(u.pathname);
  if(p.endsWith('/index.html')){ r.writeHead(307, { Location: p.slice(0, -10) + u.search }); return r.end(); }
  if(p.endsWith('.html')){ r.writeHead(307, { Location: p.slice(0, -5) + u.search }); return r.end(); }
  if(p === '/inkwell/sw.js' && swViejo){ r.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-cache' }); return r.end(VIEJO); }
  let f = path.join(RAIZ, p);
  if(p.endsWith('/')) f = path.join(f, 'index.html'); else if(!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
  if(!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ r.writeHead(404); return r.end('404'); }
  r.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); fs.createReadStream(f).pipe(r);
});
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const B = `http://127.0.0.1:${srv.address().port}/inkwell/`;
const RUTAS = ['tiras.html?leer=todo', 'tiras.html', 'tiras', 'libros.html', 'libros.html?abrir=x', 'studio/libro.html', 'studio/', 'index.html', ''];
let mal = 0; const ok = (bien, que) => { console.log((bien ? '✓ ' : '✗ ') + que); if(!bien) mal++; };
const b = await chromium.launch();
async function abre(pg, ruta){ try{ const r = await pg.goto(B + ruta, { timeout: 10000 }); return r ? r.status() : 0; } catch(e){ return e.message.split('\n')[0]; } }
async function listo(pg){ await pg.evaluate(() => navigator.serviceWorker.ready); await pg.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 10000 }).catch(() => {}); await pg.waitForTimeout(1200); }

/* 1 · trabajador nuevo */
{ const ctx = await b.newContext(), pg = await ctx.newPage();
  await pg.goto(B); await listo(pg); await pg.reload(); await listo(pg);
  for(const r of RUTAS){ const s = await abre(pg, r); ok(s === 200, `abre ${r || '(inicio)'} → ${s}`); }
  /* 3 · sin internet */
  await ctx.setOffline(true);
  for(const r of ['tiras.html?leer=todo', 'libros.html', 'tiras', '']){ const s = await abre(pg, r); ok(s === 200, `sin internet abre ${r || '(inicio)'} → ${s}`); }
  await ctx.close(); }

/* 2 · un teléfono con el trabajador viejo */
{ swViejo = true; const ctx = await b.newContext(), pg = await ctx.newPage();
  await pg.goto(B); await listo(pg); await pg.reload(); await listo(pg);
  const roto = await abre(pg, 'tiras.html?leer=todo');
  ok(roto !== 200, `con el trabajador viejo «Leer» falla, como en el teléfono de Carlos (${roto})`);
  swViejo = false;
  await abre(pg, ''); await pg.waitForTimeout(2500);   // abrir el inicio una vez trae el trabajador nuevo
  const s = await abre(pg, 'tiras.html?leer=todo'); ok(s === 200, `tras abrir el inicio una vez, «Leer» ya abre → ${s}`);
  await ctx.close(); }

await b.close(); srv.close();
console.log(mal ? `\n✗ ${mal} fallaron` : '\n✓ todo bien'); process.exit(mal ? 1 : 0);
