/* Tu personaje VIVO (personaje-vivo.js) a 390×844, contra el servidor de verdad (atenderEstudio en memoria):
   que parpadee y mire de lado solo, que reaccione con su cara y su cuerpo, que una reacción leve no tape a
   una fuerte, que se duerma si no tocas nada y despierte al tocar, que se asome por la esquina cuando subes
   y no hay ninguno a la vista, y que con «reducir movimiento» cambie la cara pero no brinque.
   node carymo/pruebas-personaje.mjs            (FOTOS=carpeta para sacar capturas) */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { atenderEstudio } from '../sala/servidor/estudio.js';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = 8700 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let f = 0, n = 0; const ok = (c, t) => { n++; console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };

const m = new Map();
const s = { async get(k){ return structuredClone(m.get(k)); }, async put(k, v){ if(typeof k === 'object'){ for(const [a, b] of Object.entries(k)) m.set(a, structuredClone(b)); } else m.set(k, structuredClone(v)); },
  async delete(k){ for(const x of [].concat(k)) m.delete(x); }, async list({ prefix }){ return new Map([...m].filter(([k]) => k.startsWith(prefix)).sort()); } };
const como = async (cuenta, cuerpo) => { const req = new Request('http://x/estudio', { method: 'POST', body: JSON.stringify(cuerpo) }); return (await atenderEstudio(s, req, new URL(req.url), cuenta)).json(); };
await como('carlos', { accion: 'perfil', nombre: 'Carlos' });
await como('carlos', { accion: 'vestir', personaje: { pelo: 'shortCurly', ojos: 'default', boca: 'smile', ropa: 'hoodie', colorRopa: '7e1735' } });

const b = await chromium.launch();
async function abrir({ reducido = false } = {}){
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: process.env.FOTOS ? 2 : 1, reducedMotion: reducido ? 'reduce' : 'no-preference' });
  const pg = await ctx.newPage();
  const err = []; pg.on('pageerror', (e) => err.push(e.message));
  await pg.route(/^http:\/\/localhost:1\//, async (r) => {
    const q = r.request(), u = new URL(q.url());
    const req = new Request('http://x/estudio' + u.search, { method: q.method(), body: q.method() === 'POST' ? q.postData() : undefined });
    const res = await atenderEstudio(s, req, new URL(req.url), 'carlos');
    await r.fulfill({ status: res.status, contentType: 'application/json', body: await res.text() });
  });
  await pg.addInitScript(() => { localStorage.setItem('salaLlave', 'x'); localStorage.setItem('est.ajustes', JSON.stringify({ sonido: false, vibrar: false, mascota: 'gatito' })); sessionStorage.setItem('carymo.entrada', '1'); });
  await pg.goto(`http://127.0.0.1:${PUERTO}/carymo/?servidor=http://localhost:1&sala=G`, { waitUntil: 'load' });
  await pg.waitForFunction(() => window.__estudio && window.__estudio.vestidor && window.__estudio.vestidor());
  await pg.waitForTimeout(900);
  await pg.click('#nav [data-ir="yo"]');
  await pg.waitForSelector('#yoPj .pv svg', { timeout: 8000 });
  return { ctx, pg, err };
}
const mod = (pg, js) => pg.evaluate(`import('/carymo/personaje-vivo.js').then((M) => { ${js} })`);
const foto = async (pg, nombre, sel) => { if(!process.env.FOTOS) return; if(sel) await pg.locator(sel).screenshot({ path: `${process.env.FOTOS}/${nombre}.png` }); else await pg.screenshot({ path: `${process.env.FOTOS}/${nombre}.png` }); };

{
  const { ctx, pg, err } = await abrir();
  console.log('En «Tú», vivo');
  ok(await pg.locator('#yoPj .pv svg').count() === 1, 'tu personaje sale en «Tú» (vivo, no una foto)');
  /* 9 s mirando qué cara trae: tiene que parpadear solo y de vez en cuando mirar de lado */
  const caras = await mod(pg, `const v = [...M._interno.vivos].find((x) => x.el.closest('#yoPj')); const vistas = new Set();
    return new Promise((r) => { const t = setInterval(() => vistas.add(v.cara), 30); setTimeout(() => { clearInterval(t); r([...vistas]); }, 9000); });`);
  ok(caras.includes('parpadeo'), `parpadea solo (caras vistas en 9 s: ${caras.join(', ')})`);
  ok(caras.includes('base'), 'y entre parpadeos regresa a su cara de siempre');
  const conMira = await mod(pg, `const v = [...M._interno.vivos].find((x) => x.el.closest('#yoPj')); const vistas = new Set();
    return new Promise((r) => { const t = setInterval(() => vistas.add(v.cara), 30); setTimeout(() => { clearInterval(t); r(vistas.has('mira')); }, 22000); });`);
  ok(conMira, 'de vez en cuando mira de lado');

  console.log('Reacciones');
  const svgAntes = await pg.innerHTML('#yoPj .pv-dib');
  await mod(pg, `M.reaccion('sube')`); await pg.waitForTimeout(350);
  const r1 = await pg.evaluate(() => { const e = document.querySelector('#yoPj .pv'); return { r: e.dataset.reaccion, mov: e.querySelector('.pv-cuerpo').className, chispas: e.querySelectorAll('.pv-chispa').length, svg: e.querySelector('.pv-dib').innerHTML }; });
  ok(r1.r === 'sube' && /pv-celebra/.test(r1.mov), 'subir: brinca celebrando');
  ok(r1.svg !== svgAntes, 'y le cambia la cara (otros ojos y otra boca)');
  ok(r1.chispas >= 6, `con chispas alrededor (${r1.chispas})`);
  await foto(pg, 'pj-sube', '.yo-cab');
  await mod(pg, `M.reaccion('bien')`); await pg.waitForTimeout(100);
  ok(await pg.$eval('#yoPj .pv', (e) => e.dataset.reaccion) === 'sube', 'una reacción leve (una buena) no le tapa una fuerte (subir de nivel)');
  await pg.waitForTimeout(2800);
  ok(await pg.$eval('#yoPj .pv', (e) => !e.dataset.reaccion), 'al terminar se le quita y vuelve a la vida de fondo');
  const vistas = {};
  for(const t of ['bien', 'combo', 'mal', 'mareado', 'piensa', 'baja', 'perfecto', 'regular', 'sorpresa', 'guino', 'racha']){
    await mod(pg, `[...M._interno.vivos].forEach((v) => v.reaccionar('${t}'))`); await pg.waitForTimeout(260);
    vistas[t] = await pg.evaluate(() => { const e = document.querySelector('#yoPj .pv'); return { r: e.dataset.reaccion, svg: e.querySelector('.pv-dib').innerHTML.length }; });
    if(t === 'baja' || t === 'mareado' || t === 'combo') await foto(pg, 'pj-' + t, '.yo-cab');
    await pg.waitForFunction(() => !document.querySelector('#yoPj .pv').dataset.reaccion, null, { timeout: 6000 });
  }
  ok(Object.entries(vistas).every(([t, v]) => v.r === t && v.svg > 500), 'las 11 reacciones se ponen y todas traen su dibujo: ' + Object.entries(vistas).filter(([t, v]) => v.r !== t).map(([t]) => t).join(', '));

  console.log('Se duerme y despierta');
  await mod(pg, `M.configurarPersonaje({ sueno: 1500 })`);
  await pg.waitForTimeout(6500);
  ok(await pg.$eval('#yoPj .pv', (e) => e.classList.contains('pv-duerme') && e.querySelectorAll('.pv-z').length === 3), 'sin tocar nada un rato, se duerme (ojos cerrados y sus «z»)');
  await foto(pg, 'pj-duerme', '.yo-cab');
  await mod(pg, `M.configurarPersonaje({ sueno: 45000 })`);
  await pg.mouse.click(200, 700); await pg.waitForTimeout(150);
  ok(await pg.$eval('#yoPj .pv', (e) => !e.classList.contains('pv-duerme') && e.dataset.reaccion === 'sorpresa'), 'al tocar la pantalla despierta con cara de susto');

  console.log('Se asoma cuando no hay ninguno a la vista');
  await pg.click('#nav [data-ir="plan"]'); await pg.waitForTimeout(600);
  await mod(pg, `M.reaccion('sube', { cameo: true })`); await pg.waitForTimeout(800);
  const asoma = await pg.evaluate(() => { const a = document.querySelector('.pv-asoma'); if(!a) return null; const r = a.getBoundingClientRect(); return { dentro: a.classList.contains('dentro'), abajo: r.bottom, izq: r.left, reac: a.querySelector('.pv')?.dataset.reaccion, toques: getComputedStyle(a).pointerEvents }; });
  ok(asoma && asoma.dentro && asoma.reac === 'sube', 'en el camino (sin tu personaje a la vista), subir de nivel lo hace asomarse por la esquina celebrando');
  ok(asoma && asoma.abajo <= 844 && asoma.izq >= 0 && asoma.toques === 'none', 'cabe en la pantalla, arriba de la barra, y no estorba a los toques');
  await foto(pg, 'pj-asoma');
  await mod(pg, `M.reaccion('racha', { cameo: true })`); await pg.waitForTimeout(200);
  ok(await pg.locator('.pv-asoma').count() === 1, 'si ya está asomado, reacciona el mismo (no salen dos)');
  await pg.waitForTimeout(4500);
  ok(await pg.locator('.pv-asoma').count() === 0, 'y luego se va solo');
  await pg.click('#nav [data-ir="yo"]'); await pg.waitForTimeout(500);
  ok(await mod(pg, `return M.reaccion('bien', { cameo: true })`) === true && await pg.locator('.pv-asoma').count() === 0, 'con tu personaje a la vista no se asoma otro: reacciona el que ya está');

  console.log('Limpieza');
  for(let k = 0; k < 6; k++){ await pg.click('#nav [data-ir="plan"]'); await pg.click('#nav [data-ir="yo"]'); }
  await pg.waitForTimeout(6000);
  const cuantos = await mod(pg, `return M._interno.vivos.size`);
  ok(cuantos <= 2, `ir y volver no deja personajes vivos regados (${cuantos} vivos después de 6 vueltas)`);
  ok(!err.length, 'sin errores en la consola' + (err.length ? ': ' + err.slice(0, 2).join(' | ') : ''));
  await ctx.close();
}
{
  const { ctx, pg, err } = await abrir({ reducido: true });
  console.log('Con «reducir movimiento»');
  const antes = await pg.innerHTML('#yoPj .pv-dib');
  await mod(pg, `M.reaccion('sube')`); await pg.waitForTimeout(300);
  const r = await pg.evaluate(() => { const e = document.querySelector('#yoPj .pv'); return { mov: e.querySelector('.pv-cuerpo').className, chispas: e.querySelectorAll('.pv-chispa').length, anim: getComputedStyle(e.querySelector('.pv-dib')).animationName }; });
  ok(r.mov === 'pv-cuerpo' && r.chispas === 0 && r.anim === 'none', 'no brinca, no respira y no echa chispas');
  ok(await pg.innerHTML('#yoPj .pv-dib') !== antes, 'pero la cara sí cambia: es información, no adorno');
  ok(!err.length, 'sin errores');
  await ctx.close();
}
await b.close(); srv.kill();
console.log(`\n${n - f} pasan · ${f} fallan`);
process.exit(f ? 1 : 0);
