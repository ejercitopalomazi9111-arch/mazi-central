#!/usr/bin/env node
/* ============================================================================
   captura.mjs — HERRAMIENTA MAZI · el ojo
   ----------------------------------------------------------------------------
   Abre cualquier proyecto en un Chromium sin cabeza y saca la foto. Sirve para
   dos cosas que antes costaban horas:

     1. QA visual: ver lo que hice sin depender de que Carlos abra el teléfono.
     2. Portafolio: sacar capturas REALES de los proyectos para la web.
        (Regla Mazi: el arte nunca se dibuja por código. Una captura de un
        proyecto que sí existe es material real, no un dibujito inventado.)

   Uso:
     node herramientas/captura.mjs <url> <salida.png> [opciones]

   Opciones:
     --ancho N        ancho del viewport            (por defecto 1280)
     --alto N         alto del viewport             (por defecto 800)
     --escala N       deviceScaleFactor, 2 = retina (por defecto 2)
     --espera MS      espera antes de disparar      (por defecto 3500)
     --teclas a,b,c   teclas a pulsar antes, en orden, 700ms entre cada una
     --js "código"    JS a ejecutar en la página antes de esperar
     --movil          viewport de iPhone y user-agent táctil
     --completa       captura la página entera, no sólo el viewport

   Ejemplos:
     node herramientas/captura.mjs http://127.0.0.1:8080/pacto-roto/ sitio/img/pacto.png
     node herramientas/captura.mjs http://127.0.0.1:8080/ligas-mazi/ sitio/img/ligas.png --movil
     node herramientas/captura.mjs http://127.0.0.1:5173/ sitio/img/torre.png \
       --teclas Enter,Enter,Enter --espera 5000
   ==========================================================================*/

import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// puppeteer vive donde haya quedado instalado; lo buscamos en los lugares de
// siempre para no tener que instalarlo una vez por proyecto. Sirve igual
// `puppeteer` que `puppeteer-core` — el Chromium ya viene en la caja, así que
// core basta y baja mucho más rápido.
const PAQUETES = ['puppeteer', 'puppeteer-core'];
const RAICES = [
  process.env.MAZI_PUPPETEER,
  ...PAQUETES.flatMap(p => [
    new URL(`./node_modules/${p}/`, import.meta.url).pathname,
    `/home/user/mazi-central/node_modules/${p}/`,
    `/workspace/torre-infinita/node_modules/${p}/`,
  ]),
].filter(Boolean);

let puppeteer = null;
for (const nombre of PAQUETES) {
  if (puppeteer) break;
  try { puppeteer = (await import(nombre)).default; } catch { /* seguimos buscando */ }
}
for (const raiz of RAICES) {
  if (puppeteer) break;
  try {
    const pkg = JSON.parse(readFileSync(raiz + 'package.json', 'utf8'));
    puppeteer = (await import(raiz + (pkg.module || pkg.main))).default;
  } catch { /* siguiente */ }
}
if (!puppeteer) {
  console.error('No encontré puppeteer. Instálalo con:');
  console.error('  cd herramientas && npm i puppeteer-core');
  console.error('Busqué en:\n  ' + RAICES.join('\n  '));
  process.exit(1);
}

// el Chromium ya viene en la caja; no hay que bajar otro
const CHROMIUM = process.env.PUPPETEER_EXECUTABLE_PATH
  || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// ---- argumentos ----
const args = process.argv.slice(2);
const url = args[0];
const salida = args[1];
if (!url || !salida) {
  console.error('Uso: node herramientas/captura.mjs <url> <salida.png> [--ancho N] [--alto N] [--espera MS] [--teclas a,b] [--js "…"] [--movil] [--completa]');
  process.exit(1);
}
const opt = (nombre, pordefecto) => {
  const i = args.indexOf('--' + nombre);
  return i === -1 ? pordefecto : args[i + 1];
};
const bandera = (nombre) => args.includes('--' + nombre);

const movil = bandera('movil');
const ancho = Number(opt('ancho', movil ? 390 : 1280));
const alto = Number(opt('alto', movil ? 844 : 800));
const escala = Number(opt('escala', 2));
const espera = Number(opt('espera', 3500));
const teclas = (opt('teclas', '') || '').split(',').map(s => s.trim()).filter(Boolean);
const js = opt('js', null);

const dormir = (ms) => new Promise(r => setTimeout(r, ms));

const navegador = await puppeteer.launch({
  headless: 'new',
  executablePath: CHROMIUM,
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
});
const pagina = await navegador.newPage();
await pagina.setViewport({ width: ancho, height: alto, deviceScaleFactor: escala, isMobile: movil, hasTouch: movil });
if (movil) await pagina.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');

const problemas = [];
pagina.on('pageerror', e => problemas.push('ERROR: ' + e.message));
pagina.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION|Failed to load resource/.test(m.text())) problemas.push(m.text()); });

try {
  await pagina.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  if (js) await pagina.evaluate(js);
  await dormir(espera);
  for (const t of teclas) {
    // pulsación SOSTENIDA: en headless los frames van lentos y un toque
    // instantáneo se le pierde al sondeo de los motores de juego
    await pagina.keyboard.down(t); await dormir(120); await pagina.keyboard.up(t);
    await dormir(700);
  }
  const destino = resolve(salida);
  mkdirSync(dirname(destino), { recursive: true });
  await pagina.screenshot({ path: destino, fullPage: bandera('completa') });
  console.log('📸 ' + salida + `  (${ancho}×${alto} @${escala}x)`);
  if (problemas.length) {
    console.log('   ⚠ ' + problemas.length + ' problema(s) en consola:');
    problemas.slice(0, 5).forEach(p => console.log('     · ' + p.slice(0, 160)));
  } else {
    console.log('   ✓ sin errores de consola');
  }
} finally {
  await navegador.close();
}
