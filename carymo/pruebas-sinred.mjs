/* CARYMO SIN INTERNET (Carlos, 13 nov: «lo que más me importa es que sí se puede operar sin internet.
   Desde abrir la aplicación… todo tu plan ya debería estar precargado»).
   Un Chromium de verdad con el trabajador de fondo PRENDIDO, contra un servidor local:
     1. con red: abre CARYMO, el trabajador se pone, el plan se precarga solo (lecciones y cátedras);
     2. se APAGA EL SERVIDOR de a de veras y el teléfono se pone sin red;
     3. se vuelve a abrir CARYMO: tiene que abrir con su plan, sus lecciones y su cátedra ya hecha;
     4. y una cátedra que no se alcanzó a preparar sale de las ideas de la lección.
   Uso: node carymo/pruebas-sinred.mjs */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PW = path.join(execSync('npm root -g').toString().trim(), 'playwright/index.mjs');
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let pasan = 0, fallan = 0;
const ok = (c, t) => { if(c){ pasan++; console.log('  ✓ ' + t); } else { fallan++; console.log('  ✗ ' + t); } };

/* ── la IA de mentiras: lección para CARYMO, clase de pizarrón para Explica ── */
const pedidos = [];
function leccion(tema){
  return { leccion: { titulo: tema, ideas: [{ titulo: 'La idea', texto: `Lo central de ${tema} en una frase.`, icono: '' }, { titulo: 'El ejemplo', texto: `Un ejemplo de ${tema} de todos los días.`, icono: '' }], dato: 'Un truco para recordarlo.' },
    preguntas: [1, 2, 3, 4].map((k) => ({ tipo: 'opcion', pregunta: `Pregunta ${k} de ${tema}`, opciones: [`Buena ${k}`, `Mala A${k}`, `Mala B${k}`, `Mala C${k}`], correcta: 0, porque: 'Porque sí.', pista: 'La primera.' })) };
}
function clase(tema){
  return { titulo: `Clase de ${tema}`, visual: 'pizarron', pasos: [
    { voz: `Hoy vemos ${tema}.`, pizarra: { tipo: 'titulo', texto: tema, sub: 'Cátedra' } },
    { voz: 'Primero la idea central.', pizarra: { tipo: 'texto', texto: 'La idea central, hecha con red.' } },
    { voz: 'Y para cerrar, lo importante.', pizarra: { tipo: 'resumen', puntos: ['Uno', 'Dos'] } } ], referencias: [], repaso: [] };
}
function contestarIA(c){
  const texto = (c.mensajes || [])[0]?.texto || '';
  pedidos.push(texto.slice(0, 60));
  if(/CLASE que se DIBUJA/.test(c.sistema || '')) return { bien: true, texto: JSON.stringify(clase(texto.replace(/^Explícame:\s*/, '').slice(0, 40))) };
  const tema = ((/Tema: (.+)/.exec(texto) || [])[1] || 'Tema').trim();
  return { bien: true, texto: JSON.stringify(leccion(tema)) };
}

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.webp': 'image/webp' };
let peticiones = 0;
const servidor = http.createServer(async (q, res) => {
  peticiones++;
  const u = new URL(q.url, 'http://x');
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*');
  if(q.method === 'OPTIONS'){ res.end(); return; }
  const cuerpo = await new Promise((ya) => { let d = ''; q.on('data', (x) => d += x); q.on('end', () => ya(d)); });
  if(u.pathname.includes('/api/')){
    if(u.pathname.endsWith('/ia-texto')){ res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(contestarIA(JSON.parse(cuerpo)))); return; }
    /* lo demás de la sala (biblioteca, planes, perfil…): contesta «nada» */
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ bien: true, planes: [], hallado: null })); return;
  }
  let f = path.join(raiz, decodeURIComponent(u.pathname));
  if(fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if(!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => servidor.listen(0, r));
const P = servidor.address().port, base = `http://localhost:${P}`;
const url = `${base}/carymo/?servidor=${encodeURIComponent(base)}&sala=G`;

/* un plan de dos temas: la lección del tema 1 ya está; la del 2 la tiene que precargar la app */
const PLAN = { id: 'psr', titulo: 'Examen de Química', materia: 'Química', color: '#7E1735', fecha: '2030-01-01', forma: 2, creado: Date.now(), progreso: {},
  contenido: { ta: leccion('Átomos') },
  unidades: [{ id: 'u1', titulo: 'Materia', temas: [{ id: 'ta', titulo: 'Átomos' }, { id: 'tb', titulo: 'Moléculas' }],
    nodos: [{ id: 'n0', tipo: 'pizarra', alcance: 'unidad', titulo: 'Materia' }, { id: 'n1', tipo: 'pizarra', tema: 'ta', titulo: 'Átomos' }, { id: 'n2', tipo: 'quiz', tema: 'ta', titulo: 'Átomos' },
      { id: 'n3', tipo: 'pizarra', tema: 'tb', titulo: 'Moléculas' }, { id: 'n4', tipo: 'quiz', tema: 'tb', titulo: 'Moléculas' }] }] };

console.log('CARYMO sin internet');
const { chromium } = await import(PW);
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await ctx.addInitScript((plan) => {
  try{
    if(!localStorage.getItem('prueba.puesto')){
      localStorage.setItem('prueba.puesto', '1');
      localStorage.setItem('salaLlave', 'prueba');
      localStorage.setItem('est.planes', JSON.stringify({ [plan.id]: plan })); localStorage.setItem('est.actual', JSON.stringify(plan.id));
      localStorage.setItem('est.perfil', JSON.stringify({ nombre: 'Ana' }));
    }
  }catch{}
}, PLAN);
const errores = [];
const pagina = await ctx.newPage();
pagina.on('pageerror', (e) => errores.push(e.message));

try{
  /* ── 1 · con red ── */
  await pagina.goto(url);
  await pagina.waitForSelector('.camino', { timeout: 15000 });
  const puesto = await pagina.evaluate(async () => { const r = await Promise.race([navigator.serviceWorker.ready, new Promise((x) => setTimeout(() => x(null), 8000))]); return !!r; });
  ok(puesto, 'el trabajador de fondo se pone solo al abrir (ya no sólo al prender los avisos)');
  /* la segunda visita ya la controla el trabajador (así abre el teléfono de verdad) */
  await pagina.reload(); await pagina.waitForSelector('.camino', { timeout: 15000 });
  ok(await pagina.evaluate(() => !!navigator.serviceWorker.controller), 'y controla CARYMO desde la segunda vez que abre');

  /* la precarga: la lección del tema 2 y las tres cátedras, sin tocar nada */
  let listo = null;
  for(let i = 0; i < 60 && !listo; i++){
    await espera(1000);
    listo = await pagina.evaluate(async () => {
      const { hayClase } = await import('../sala/clases-guardadas.js');
      const pl = JSON.parse(localStorage.getItem('est.planes')).psr;
      const temas = ['Panorama general', 'Átomos (Química)', 'Moléculas (Química)'];
      const lec = !!(pl.contenido && pl.contenido.tb);
      const db = await new Promise((si) => { const r = indexedDB.open('explica-clases', 1); r.onsuccess = () => si(r.result); r.onerror = () => si(null); r.onupgradeneeded = () => { if(!r.result.objectStoreNames.contains('clases')) r.result.createObjectStore('clases'); }; });
      const llaves = db ? await new Promise((si) => { const t = db.transaction('clases', 'readonly').objectStore('clases').getAllKeys(); t.onsuccess = () => si(t.result); t.onerror = () => si([]); }) : [];
      const clases = temas.filter((t) => llaves.some((k) => k.startsWith(t.toLowerCase()))).length;
      void hayClase;
      return lec && clases === 3 ? { lec, clases, llaves } : null;
    });
  }
  ok(!!listo, 'sin tocar nada se precargó la lección que faltaba y las 3 cátedras del camino');
  const guardado = await pagina.evaluate(async () => { const k = await caches.keys(); const c = await caches.open(k.find((x) => x.startsWith('carymo-'))); return (await c.keys()).map((r) => new URL(r.url).pathname); });
  ok(['/carymo/', '/carymo/carymo.js', '/sala/explica', '/sala/lienzo.js', '/carymo/pizarron'].every((p) => guardado.includes(p)), `quedó guardada la app y el pizarrón (${guardado.length} archivos)`);
  ok(guardado.every((p) => !p.includes('/api/')), 'nada de /api/ se guarda');

  /* ── 2 · se va la red de a de veras ── */
  await new Promise((r) => { servidor.close(r); servidor.closeAllConnections?.(); });
  await ctx.setOffline(true);
  const antes = peticiones;

  /* ── 3 · CARYMO abre sin red ── */
  await pagina.reload();
  await pagina.waitForSelector('.camino', { timeout: 15000 }).catch(() => {});
  ok(await pagina.$('.camino') !== null, 'sin internet, CARYMO abre y enseña el camino del plan');
  ok(/Química/.test(await pagina.textContent('body')), 'con su plan (Examen de Química)');
  ok(peticiones === antes, 'y de verdad no hubo red: el servidor está apagado');

  /* la lección precargada abre */
  const sig = await pagina.evaluate(() => { const pl = JSON.parse(localStorage.getItem('est.planes')).psr; return !!pl.contenido.tb && pl.contenido.tb.preguntas.length; });
  ok(sig > 0, 'la lección del tema 2 está en el teléfono, lista para jugarse sin red');

  /* la cátedra ya hecha abre en el pizarrón */
  await pagina.evaluate(() => window.__estudio && window.__estudio.ir('plan'));
  await pagina.click('.siguiente [data-nodo]');
  const marco = await pagina.waitForSelector('#capa iframe', { timeout: 8000 }).catch(() => null);
  ok(!!marco && /\/carymo\/pizarron/.test(await marco.getAttribute('src')), 'el pizarrón se abre dentro de CARYMO (para que pase por el trabajador)');
  const f = marco && await marco.contentFrame();
  if(f){
    await f.waitForSelector('#bExplica', { timeout: 10000 }).catch(() => {});
    ok(!!(await f.$('#bExplica')), 'sin red, la página del pizarrón carga');
    await f.click('#bExplica').catch(() => {});
    await f.waitForFunction(() => window.__explica && window.__explica.estado().actual !== undefined && window.__explica.estado().pasos > 0, null, { timeout: 10000 }).catch(() => {});
    const est = await f.evaluate(() => window.__explica && window.__explica.estado());
    ok(est && est.pasos === 3, `y la cátedra hecha de antemano arranca sin red (${est ? est.pasos : 0} pasos)`);
  }else ok(false, 'sin red, la página del pizarrón carga');

  /* ── 4 · una cátedra que no se alcanzó a preparar: sale de la lección ── */
  await pagina.evaluate(async () => { const r = indexedDB.open('explica-clases', 1); await new Promise((si) => { r.onsuccess = si; }); const t = r.result.transaction('clases', 'readwrite'); t.objectStore('clases').clear(); await new Promise((si) => { t.oncomplete = si; }); });
  await pagina.reload(); await pagina.waitForSelector('.camino', { timeout: 15000 }).catch(() => {});
  await pagina.click('.siguiente [data-nodo]');
  const m2 = await pagina.waitForSelector('#capa iframe', { timeout: 8000 }).catch(() => null);
  const f2 = m2 && await m2.contentFrame();
  if(f2){
    await f2.waitForSelector('#bExplica', { timeout: 10000 }).catch(() => {});
    await espera(800);
    await f2.click('#bExplica').catch(() => {});
    await f2.waitForFunction(() => window.__explica && window.__explica.estado().pasos > 0, null, { timeout: 10000 }).catch(() => {});
    const e2 = await f2.evaluate(() => window.__explica && window.__explica.estado());
    ok(e2 && e2.pasos >= 3, `sin la cátedra guardada, el pizarrón arma una básica con las ideas de la lección (${e2 ? e2.pasos : 0} pasos)`);
  }else ok(false, 'sin la cátedra guardada, el pizarrón arma una básica');

  ok(!errores.length, 'sin errores en la página' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
}catch(e){ ok(false, 'la prueba tronó: ' + (e.stack || e)); }
await nav.close();
servidor.close();
console.log(`\n${pasan} pasan · ${fallan} fallan`);
process.exit(fallan ? 1 : 0);
