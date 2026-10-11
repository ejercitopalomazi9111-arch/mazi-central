/* MOSCA · pruebas de pantalla, en un navegador de verdad.   node mosca/pruebas-pantalla.mjs
   Sirve mosca/ con las cabeceras de aislamiento (como _headers en Cloudflare) y prueba los dos modos:
   tres cerebros en paralelo y todo en un solo trabajador. Comprueba EFECTOS, no que los botones existan:
   que la sombra haga despegar, que el azúcar haga comer, que la araña no salga gigante. */
import { createRequire } from 'module';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');

const RAIZ = new URL('./', import.meta.url).pathname;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.glb': 'model/gltf-binary' };
function servidor(aislar) {
  return createServer(async (q, r) => {
    let p = join(RAIZ, decodeURIComponent(new URL(q.url, 'http://x').pathname));
    try {
      if ((await stat(p)).isDirectory()) p = join(p, 'index.html');
      const h = { 'content-type': TIPOS[extname(p)] || 'application/octet-stream' };
      if (aislar) Object.assign(h, { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' });
      r.writeHead(200, h); r.end(await readFile(p));
    } catch { r.writeHead(404); r.end('no'); }
  }).listen(0);
}

let bien = 0, mal = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); c ? bien++ : mal++; };
const nav = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

for (const [aislar, ancho, alto] of [[true, 390, 844], [false, 1280, 800]]) {
  const srv = servidor(aislar);
  console.log(`\n── ${aislar ? 'en paralelo' : 'en un solo trabajador'} · ${ancho}×${alto}`);
  const p = await nav.newPage({ viewport: { width: ancho, height: alto } });
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' '))); p.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  await p.goto(`http://localhost:${srv.address().port}/index.html`);
  await p.waitForFunction(() => !document.querySelector('#carga'), null, { timeout: 180000 });
  ok(await p.evaluate(() => window.crossOriginIsolated) === aislar, aislar ? 'la página quedó aislada: tres núcleos' : 'sin aislar: un solo trabajador');
  ok(await p.evaluate(() => window.__mosca.moscas.length === 3 && window.__mosca.moscas.every((m) => m.cuerpo.raiz.children.length)), 'hay tres moscas con cuerpo');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sin desborde');

  // comer: una gota de azúcar justo debajo de la mosca 1
  await p.evaluate(() => { const M = window.__mosca, m = M.moscas[0]; M.ponerGota('azucar', { x: m.x, z: m.z }); m.paseo.vel = 0; m.paseo.hasta = 1e9; m.paseo.giro = 0; });
  await p.waitForFunction(() => window.__mosca.moscas[0].modo === 'comer', null, { timeout: 30000 }).catch(() => {});
  const comer = await p.evaluate(() => ({ modo: window.__mosca.moscas[0].modo, mn9: window.__mosca.moscas[0].tasas['comer:todos'] }));
  ok(comer.modo === 'comer', `sobre el azúcar la mosca 1 come (MN9 a ${(comer.mn9 || 0).toFixed(0)} Hz)`);

  // escape: la sombra que cae
  const antes = await p.evaluate(() => window.__mosca.moscas.reduce((a, m) => a + m.stats.escapes, 0));
  await p.evaluate(() => window.__mosca.soltarDepredador('sombra'));
  await p.waitForFunction((n) => window.__mosca.moscas.reduce((a, m) => a + m.stats.escapes, 0) > n, antes, { timeout: 30000 }).catch(() => {});
  const despues = await p.evaluate(() => window.__mosca.moscas.reduce((a, m) => a + m.stats.escapes, 0));
  ok(despues > antes, `la sombra hace despegar (${despues - antes} escapes)`);
  const lat = await p.evaluate(() => window.__mosca.moscas.flatMap((m) => m.stats.latencias).at(-1));
  ok(lat != null && lat < 1000, `reaccionan en menos de un segundo (${lat} ms)`);

  // la araña: del tamaño de una araña, no un cuadro de 6 cm
  await p.evaluate(() => window.__mosca.soltarDepredador('arana'));
  await p.waitForTimeout(800);
  const tam = await p.evaluate(async () => {
    const THREE = await import('three');
    const d = window.__mosca.mundo.depredadores.find((x) => x.tipo === 'arana');
    const b = new THREE.Box3().setFromObject(d.obj); return b.max.x - b.min.x;
  });
  ok(tam > 0.6 && tam < 2.5, `la araña mide ${tam.toFixed(2)} cm de ancho`);

  // qué piensa: con una sombra encima, «siente» que algo se le viene y quiere huir
  await p.click('[data-p=mente]'); await p.waitForTimeout(400);
  await p.evaluate(() => window.__mosca.soltarDepredador('sombra'));
  const sintio = await p.waitForFunction(() => /se le viene encima/.test(document.querySelector('#mentes').textContent), null, { timeout: 30000 }).then(() => true).catch(() => false);
  ok(sintio, '«Qué piensa»: siente que algo se le viene encima');
  ok(await p.waitForFunction(() => [...document.querySelectorAll('.mente .ganas output')].some((o) => parseInt(o.textContent) > 0), null, { timeout: 20000 }).then(() => true).catch(() => false), '«Qué piensa»: las ganas se mueven (sale de las neuronas que mandan)');
  ok(await p.evaluate(() => [...document.querySelectorAll('.mente .hace')].every((h) => h.textContent.trim().length > 3)), '«Qué piensa»: dice qué hace cada una');
  if (ancho === 390) await p.screenshot({ path: '/tmp/mosca-mente.png' });
  // zonas: se reparten las 138 mil neuronas y con la sombra se encienden los detectores
  await p.click('[data-p=zonas]');
  await p.waitForFunction(() => document.querySelectorAll('#listaZonas li').length > 10, null, { timeout: 30000 }).catch(() => {});
  const nz = await p.evaluate(() => [...document.querySelectorAll('#listaZonas li')].reduce((a, li) => a + parseInt(li.querySelector('output small').textContent.replace(/\D/g, '')), 0));
  ok(nz === 138639, `«Zonas»: las ${nz.toLocaleString('es-MX')} neuronas caen en alguna zona`);
  await p.evaluate(() => window.__mosca.soltarDepredador('sombra'));
  const prendio = await p.waitForFunction(() => { const li = [...document.querySelectorAll('#listaZonas li.activa')]; return li.some((x) => /Detectores|Vista/.test(x.textContent)); }, null, { timeout: 30000 }).then(() => true).catch(() => false);
  ok(prendio, '«Zonas»: con la sombra se encienden la vista y los detectores de peligro');
  ok(await p.evaluate(() => /trabaja más|en calma/.test(document.querySelector('#zonasAhora').textContent)), '«Zonas»: dice en palabras qué zona trabaja más');
  await p.click('#selZonas label:nth-child(3)'); await p.waitForTimeout(2500);
  const deQuien = await p.evaluate(() => [document.querySelector('#zonasAhora').textContent, document.querySelector('[name=zonasDe]:checked').closest('label').textContent.trim()]);
  ok(deQuien[0].startsWith(deQuien[1] + ':'), `«Zonas»: habla de la mosca elegida (${deQuien[1]} → «${deQuien[0].slice(0, 30)}…»)`);
  if (ancho === 390) await p.screenshot({ path: '/tmp/mosca-zonas.png' });

  // paneles
  for (const pest of ['moscas', 'cerebro', 'bitacora']) {
    await p.click(`[data-p=${pest}]`); await p.waitForTimeout(600);
    ok(await p.evaluate((x) => !document.querySelector(`[data-panel=${x}]`).hidden, pest), `la pestaña «${pest}» se abre`);
  }
  await p.waitForTimeout(1500);
  ok(await p.evaluate(() => /neuronas dispararon/.test(document.querySelector('#cifras').textContent)), 'la vista del cerebro cuenta neuronas');
  ok(await p.evaluate(() => document.querySelectorAll('#log li').length > 2), 'la bitácora anota lo que pasa');
  const vel = await p.evaluate(() => document.querySelector('#velocidad').textContent);
  ok(/×/.test(vel), `dice a qué velocidad va el cerebro (${vel.trim()})`);
  ok(errores.length === 0, 'cero errores de consola' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
  await p.close(); srv.close();
}
await nav.close();
console.log(`\n${bien} bien · ${mal} mal`);
process.exit(mal ? 1 : 0);
