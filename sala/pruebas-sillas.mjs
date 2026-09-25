/* ══════════════════════════════════════════════════════════════════════════
   LAS SILLAS NO SE DUERMEN · `node sala/pruebas-sillas.mjs`
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «en sala aún salen apagadas sus sillas cuando no deberían». Paulina
   (Gemini) y Negro (Groq) no tienen socket: los sienta el servidor cuando su
   llave está puesta. La mesa marcaba «sin señal» a quien llevara cinco minutos
   sin dar señales y sin socket — o sea, a las sillas, en cuanto nadie
   escribía cinco minutos. Aquí se pinta la mesa con gente de mentira: una
   silla y un agente de verdad, los dos callados veinte minutos.
   ═════════════════════════════════════════════════════════════════════════ */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json' };
const servidor = createServer((req, res) => {
  let r = join(RAIZ, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if(r.endsWith('/')) r += 'index.html';
  try{ res.writeHead(200, { 'Content-Type': TIPOS[extname(r)] || 'application/octet-stream' }).end(readFileSync(r)); }
  catch{ res.writeHead(404).end(); }
}).listen(0);
const b = await chromium.launch();
const pg = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errores = []; pg.on('pageerror', (e) => errores.push(e.message));
// Sin servidor de sala: las peticiones se contestan vacías para que la mesa no espere.
await pg.route(/sala\.palomazi9111\.workers\.dev|127\.0\.0\.1:\d+\/api/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
await pg.goto(`http://localhost:${servidor.address().port}/sala/?sala=PRUEBA`);
await pg.waitForTimeout(800);

console.log('\n· Veinte minutos sin que nadie escriba');
const r = await pg.evaluate(() => {
  const hace20 = Date.now() - 20 * 60_000;
  gente = {
    gemini: { id: 'gemini', cuenta: 'sala', nombre: 'Paulina', tipo: 'agente', motor: 'gemini-3.8-flash', figura: 'rombo', silla: true, visto: hace20 },
    groq: { id: 'groq', cuenta: 'sala', nombre: 'Negro', tipo: 'agente', motor: 'llama-3.3-70b-versatile', figura: 'rayo', silla: true, visto: hace20 },
    otro: { id: 'claude-de-luis', cuenta: 'luis', nombre: 'Godines', tipo: 'claude', visto: hace20 },
  };
  pintarGente();
  const ficha = (id) => document.querySelector(`#gente [data-ver="${id}"]`);
  return {
    paulina: ficha('gemini')?.className, negro: ficha('groq')?.className, godines: ficha('claude-de-luis')?.className,
    subPaulina: ficha('gemini')?.querySelector('.quien-sub')?.textContent,
    enLinea: document.getElementById('enLinea')?.textContent,
  };
});
ok('Paulina (Gemini) no sale «sin señal»', r.paulina && !/dormido/.test(r.paulina) && !/sin señal/.test(r.subPaulina), JSON.stringify(r));
ok('Negro (Groq) tampoco', r.negro && !/dormido/.test(r.negro), r.negro);
ok('un agente de verdad callado veinte minutos SÍ sale sin señal', /dormido/.test(r.godines || ''), r.godines);
ok('«en línea» cuenta a las dos sillas', /^2 en línea/.test(r.enLinea || ''), r.enLinea);
ok('ni un error de consola', !errores.length, errores.join(' | '));

await b.close(); servidor.close();
console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
