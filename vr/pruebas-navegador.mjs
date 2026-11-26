/* EL NAVEGADOR DE MAZI VR (Carlos, 25 nov): teclado con todos los caracteres, y una página de verdad dentro del visor que
   se baja y a la que se le pica (enlace, caja de texto, buscar). La ruta /api/sala/vr/web la contesta aquí el mismo
   sala/servidor/web.js (en producción va por la puerta de la Central), con un sitio de mentiras en vez de internet.
     node vr/pruebas-navegador.mjs     (con el servidor del repo en :8765) */
import { createRequire } from 'module';
import { navegar } from '../sala/servidor/web.js';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765';
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
/* el «internet» de la prueba: dos páginas con enlace, una caja de búsqueda y mucho texto para bajar */
const SITIO = {
  'https://ejemplo.org/': `<html><head><title>Inicio de ejemplo</title><script>window.__malo = 1</script></head><body style="margin:0;font:40px sans-serif">
    <a id="ir" href="/segunda.html" style="display:block;height:300px;background:#cde">Ir a la segunda</a>
    <form action="/buscar"><input id="caja" name="q" style="display:block;width:1200px;height:200px;font-size:60px"><button style="height:150px;width:600px">Buscar</button></form>
    ${'<p>relleno</p>'.repeat(200)}</body></html>`,
  'https://ejemplo.org/segunda.html': `<html><head><title>Segunda página</title></head><body>Hola</body></html>`,
};
const global0 = globalThis.fetch;
globalThis.fetch = async (u) => { const k = String(u).replace(/\?.*$/, ''); if(/buscar/.test(String(u))) return new Response(`<title>Resultados ${new URL(u).searchParams.get('q')}</title>ok`, { headers: { 'content-type': 'text/html' } }); const h = SITIO[k]; return h ? Object.assign(new Response(h, { headers: { 'content-type': 'text/html' } }), {}) : new Response('no', { status: 404, headers: { 'content-type': 'text/html' } }); };
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
await ctx.addInitScript(() => { navigator.getGamepads = () => []; try{ localStorage.setItem('mazivr.ajustes', JSON.stringify({ manos: false, fondo: 1 })); }catch{} });
await ctx.route(/\/api\/sala\/vr\/web/, async (route) => { const req = route.request(); const r = await navegar(new URL(req.url()), new Request(req.url(), { headers: { referer: BASE + '/vr/' } }));
  route.fulfill({ status: r.status, headers: Object.fromEntries(r.headers), body: await r.text() }); });
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
await p.goto(BASE + '/vr/', { waitUntil: 'networkidle' }); await p.click('#bEntrar');
await p.waitForFunction(() => window.__vr?.ahora() === 'inicio');
/* EL TECLADO: todos los caracteres */
await p.evaluate(() => { __vr.ir('cine'); window.__cine.internet(); });
await p.waitForFunction(() => __vr.ahora() === 'teclado');
const titulos = () => p.evaluate(() => __teclado.elegibles().map((m) => m.userData.panel.titulo));
const t1 = await titulos();
sí([':', '/', '.', '@', '-', 'Mayús', '#+='].every((k) => t1.includes(k)), 'teclado: «:», «/», «.», «@», «-», Mayús y el cambio a símbolos están a la vista');
await p.evaluate(() => __teclado.elegibles().find((m) => m.userData.panel.titulo === '#+=').userData.accion());
const t2 = await titulos();
sí(['?', '=', '&', '%', '#', '+', '_', '~', 'https://', 'www.'].every((k) => t2.includes(k)), `símbolos: ? = & % # + _ ~ https:// www. (${t2.length} teclas)`);
for(const k of ['https://']) await p.evaluate((k) => __teclado.elegibles().find((m) => m.userData.panel.titulo === k).userData.accion(), k);
await p.evaluate(() => __teclado.elegibles().find((m) => m.userData.panel.titulo === 'ABC').userData.accion());
await p.evaluate(() => __teclado.escribir('ejemplo.org/'));
await p.evaluate(() => __teclado.elegibles().find((m) => m.userData.panel.titulo === 'Ir').userData.accion());
await p.waitForFunction(() => window.__cine && __vr.ahora() === 'cine');
/* LA PÁGINA */
const marco = () => p.evaluate(() => { const f = document.querySelector('iframe[sandbox]'); return f ? { titulo: f.contentDocument?.title, url: f.contentWindow.location.href, malo: f.contentWindow.__malo, sandbox: f.getAttribute('sandbox'), y: f.contentWindow.scrollY } : null; });
await p.waitForFunction(() => document.querySelector('iframe[sandbox]')?.contentDocument?.title === 'Inicio de ejemplo', null, { timeout: 8000 }).catch(() => {});
let m = await marco();
sí(m?.titulo === 'Inicio de ejemplo' && /api\/sala\/vr\/web\?u=https%3A%2F%2Fejemplo\.org/.test(m.url), `«https://ejemplo.org/» escrito con el teclado abre la página dentro del visor (${m?.titulo})`);
sí(m && m.malo === undefined && m.sandbox === 'allow-same-origin', 'sus scripts no corren (quitados y marco sin scripts)');
await p.evaluate(() => __cine.elegibles().find((x) => x.userData.panel?.titulo === 'Bajar').userData.accion()); await p.waitForTimeout(200);
m = await marco(); sí(m.y > 300, `«Bajar» baja la página (${m.y} px)`);
await p.evaluate(() => __cine.elegibles().find((x) => x.userData.panel?.titulo === 'Subir').userData.accion()); await p.waitForTimeout(200);
/* picar el enlace: el centro de lo que apunta la mira es la página → se calcula el punto */
await p.evaluate(() => document.querySelectorAll('iframe[sandbox]').forEach((f) => f.contentWindow.scrollTo(0, 0))); await p.waitForTimeout(150);
const tipo = await p.evaluate(() => window.__web?.clicEn(.3, .1)?.tipo);
sí(tipo === 'enlace', `picar sobre «Ir a la segunda» lo sigue (${tipo})`);
await p.waitForFunction(() => document.querySelector('iframe[sandbox]')?.contentDocument?.title === 'Segunda página', null, { timeout: 6000 }).catch(() => {});
sí((await marco())?.titulo === 'Segunda página', 'y abre la segunda página por la puerta');
await p.evaluate(() => __cine.elegibles().find((x) => x.userData.panel?.titulo === 'Regresar').userData.accion());
await p.waitForFunction(() => document.querySelector('iframe[sandbox]')?.contentDocument?.title === 'Inicio de ejemplo', null, { timeout: 6000 }).catch(() => {});
sí((await marco())?.titulo === 'Inicio de ejemplo', '«Regresar» vuelve a la anterior');
/* la caja de búsqueda: picarla da «texto»; escribir y mandar abre los resultados */
const caja = await p.evaluate(() => { const r = window.__web.clicEn(.4, .55); if(r?.tipo === 'texto') r.escribir('mariposa monarca', true); return r?.tipo; });
await p.waitForFunction(() => /Resultados/.test(document.querySelector('iframe[sandbox]')?.contentDocument?.title || ''), null, { timeout: 6000 }).catch(() => {});
sí(caja === 'texto' && (await marco())?.titulo === 'Resultados mariposa monarca', `la caja de búsqueda se escribe y se manda (${(await marco())?.titulo})`);
if(process.env.CAPS) await p.screenshot({ path: process.env.CAPS + '/navegador.png' });
sí(!errores.length, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 2).join(' | ') : ''));
globalThis.fetch = global0;
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
