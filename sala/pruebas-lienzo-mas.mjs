/* LOS 50 ELEMENTOS EXTRA DEL PIZARRÓN (sala/lienzo-mas.js), en un Chromium de verdad.
   Cada ejemplo pasa la revisión, se dibuja sin errores, nada se sale de su recuadro (a 360 y a 900 de ancho)
   y la revisión tira lo que viene mal. FOTOS=carpeta guarda la hoja con todos.
   Uso: node sala/pruebas-lienzo-mas.mjs */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PW = path.join(execSync('npm root -g').toString().trim(), 'playwright/index.mjs');
let pasan = 0, fallan = 0;
const ok = (c, t) => { if(c){ pasan++; console.log('  ✓ ' + t); } else { fallan++; console.log('  ✗ ' + t); } };
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.png': 'image/png' };
const sv = http.createServer((q, r) => { const f = path.join(raiz, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if(!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const base = `http://localhost:${sv.address().port}`;

console.log('Los 50 elementos extra del pizarrón');
const { EJEMPLOS_MAS, TIPOS_MAS, normalizarMas } = await import('./lienzo-mas.js');
ok(TIPOS_MAS.length === 50 && new Set(TIPOS_MAS).size === 50, `son 50 tipos distintos (${TIPOS_MAS.length})`);
ok(EJEMPLOS_MAS.length === 50 && TIPOS_MAS.every((t) => EJEMPLOS_MAS.some((e) => e.tipo === t)), 'hay un ejemplo de cada uno');
const malos = EJEMPLOS_MAS.filter((e) => !normalizarMas(structuredClone(e))).map((e) => e.tipo);
ok(!malos.length, 'todos los ejemplos pasan la revisión' + (malos.length ? ': ' + malos.join(', ') : ''));
const basura = ['termometro', 'fraccion', 'atomo', 'adivina', 'calendario', 'reloj', 'plano'].filter((t) => normalizarMas({ tipo: t }) !== null);
ok(!basura.length, 'y la revisión tira lo que viene vacío' + (basura.length ? ' (dejó pasar: ' + basura.join(', ') + ')' : ''));
ok(normalizarMas({ tipo: 'adivina', pregunta: '¿?', opciones: ['a', 'b'], correcta: 5 }) === null, 'una «adivina» con la correcta fuera de las opciones se tira');

const { chromium } = await import(PW);
const nav = await chromium.launch();
for(const ancho of [360, 900]){
  const p = await (await nav.newContext({ viewport: { width: ancho, height: 900 } })).newPage();
  const errores = []; p.on('pageerror', (e) => errores.push(e.message));
  await p.goto(`${base}/sala/explica.html`); await p.waitForFunction(() => window.__explica);
  const revisados = await p.evaluate((ej) => ej.map((e) => !!window.__explica.normalizarPizarra(e)), EJEMPLOS_MAS);
  ok(revisados.every(Boolean), `a ${ancho}: Explica reconoce los 50 tipos (no los vuelve «texto»)`);
  /* una clase admite 48 pasos: van en dos tandas de 25 */
  const r = { quien: [], dibujos: 0, fuera: 0, max: 0, ancho: 0 };
  for(const k of [0, 25]){
  await p.evaluate((ej) => { window.__explica.empezar({ titulo: 'Los 50', pasos: ej.map((z) => ({ voz: 'x', pizarra: z })) }); window.__explica.abrirApuntes(); }, EJEMPLOS_MAS.slice(k, k + 25));
  await p.waitForTimeout(2000);
  const r1 = await p.evaluate(() => {
    const out = [], quien = [];
    const secs = [...document.querySelectorAll('#apCuerpo .bloque-ap')];
    secs.forEach((sec, i) => { if(!sec.querySelector('svg.dib')) quien.push('sin dibujo:' + i); });
    for(const s of document.querySelectorAll('#apCuerpo svg.dib')){
      const W = s.viewBox.baseVal.width, H = s.viewBox.baseVal.height; let peor = 0;
      for(const n of s.querySelectorAll('path, text, circle, rect, g > *')){ try{ const b = n.getBBox(); if(!b.width && !b.height) continue; peor = Math.max(peor, -b.x, -b.y, b.x + b.width - W, b.y + b.height - H); }catch{} }
      out.push(peor); if(peor > 6) quien.push(secs.indexOf(s.closest('.bloque-ap')) + ':' + Math.round(peor));
    }
    return { quien, dibujos: out.length, fuera: out.filter((x) => x > 6).length, max: Math.max(0, ...out), ancho: document.documentElement.scrollWidth };
  });
  r.quien.push(...r1.quien.map((q) => q.replace(/^(\d+)/, (m) => String(+m + k)).replace(/:(\d+)$/, (m, i) => /sin/.test(q) ? ':' + (+i + k) : m)));
  r.dibujos += r1.dibujos; r.fuera += r1.fuera; r.max = Math.max(r.max, r1.max); r.ancho = Math.max(r.ancho, r1.ancho);
  if(process.env.FOTOS) await p.screenshot({ path: path.join(process.env.FOTOS, `elementos-${ancho}-${k}.png`), fullPage: true });
  }
  ok(r.dibujos >= 50, `a ${ancho}: se dibujan los 50 (${r.dibujos})`);
  ok(r.fuera === 0, `a ${ancho}: nada se sale de su recuadro (el peor, ${Math.round(r.max)} px)` + (r.quien.length ? ' · ' + r.quien.map((q) => { const [i, v] = q.split(':'); return /sin/.test(q) ? (EJEMPLOS_MAS[+v] || {}).tipo + ' sin dibujo' : (EJEMPLOS_MAS[+i] || {}).tipo + ' ' + v; }).join(', ') : ''));
  ok(r.ancho <= ancho + 1, `a ${ancho}: la página no se sale de lado`);
  ok(!errores.length, `a ${ancho}: sin errores` + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
  await p.context().close();
}
await nav.close(); sv.close();
console.log(`\n${pasan} pasan · ${fallan} fallan`);
process.exit(fallan ? 1 : 0);
