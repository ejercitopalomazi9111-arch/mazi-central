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
     --jpeg N         guarda JPEG con calidad N (1-100) en vez de PNG.
                      Para fotos y capturas de pantalla: un PNG de 560 KB sale
                      en 70 KB de JPEG sin que se note. Para logos y cosas con
                      transparencia, NO — ahí el PNG es el correcto.

   Ejemplos:
     node herramientas/captura.mjs http://127.0.0.1:8080/pacto-roto/ sitio/img/pacto.png
     node herramientas/captura.mjs http://127.0.0.1:8080/ligas-mazi/ sitio/img/ligas.png --movil
     node herramientas/captura.mjs http://127.0.0.1:5173/ sitio/img/torre.png \
       --teclas Enter,Enter,Enter --espera 5000
   ==========================================================================*/

import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
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

// SEGUNDO MOTOR: Playwright.
// El ojo dejó de abrir en esta caja porque aquí no hay puppeteer instalado —
// hay Playwright, que viene con la máquina. Antes eso significaba "no hay
// capturas", y sin capturas no hay portafolio. Las dos librerías manejan el
// MISMO Chromium y su API de página es casi idéntica (goto, evaluate, keyboard,
// screenshot, on), así que lo único que cambia es cómo se abre. Se abstrae ese
// pedazo y el resto del archivo no se entera de cuál está corriendo.
let playwright = null;
if (!puppeteer) {
  for (const nombre of ['playwright', 'playwright-core',
                        '/opt/node22/lib/node_modules/playwright/index.js']) {
    if (playwright) break;
    try { playwright = (await import(nombre)).chromium; } catch { /* siguiente */ }
  }
}

if (!puppeteer && !playwright) {
  console.error('No encontré ni puppeteer ni playwright. Instala uno:');
  console.error('  cd herramientas && npm i puppeteer-core');
  console.error('Busqué puppeteer en:\n  ' + RAICES.join('\n  '));
  process.exit(1);
}

// El Chromium ya viene en la caja; no hay que bajar otro. Se prueban las rutas
// conocidas en orden y se usa la primera que exista, porque la versión del
// paquete cambia con la imagen y una ruta fija se pudre sola.
const CHROMIUM = (() => {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const candidatas = [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  ];
  for (const c of candidatas) if (existsSync(c)) return c;
  return undefined;   // que el motor use el suyo
})();

// ---- argumentos ----
const args = process.argv.slice(2);
const USO = 'Uso: node herramientas/captura.mjs <url> <salida.png> [--ancho N] [--alto N] [--espera MS] [--teclas a,b] [--js "…"] [--movil] [--completa]';
const opt = (nombre, pordefecto) => {
  const i = args.indexOf('--' + nombre);
  return i === -1 ? pordefecto : args[i + 1];
};
const url = args[0];
// La salida es posicional, pero también se acepta --salida. Y si el segundo
// argumento resulta ser una bandera es que se olvidó la ruta: se avisa en vez
// de escribir un archivo llamado "--ancho" en la raíz del repo. Ya pasó.
const salida = opt('salida', args[1]?.startsWith('--') ? undefined : args[1]);
if (!url || !salida) {
  if (args[1]?.startsWith('--')) {
    console.error(`Falta la ruta de salida: el segundo argumento es la bandera "${args[1]}".`);
  }
  console.error(USO);
  process.exit(1);
}
const bandera = (nombre) => args.includes('--' + nombre);

const movil = bandera('movil');
const ancho = Number(opt('ancho', movil ? 390 : 1280));
const alto = Number(opt('alto', movil ? 844 : 800));
const escala = Number(opt('escala', 2));
const espera = Number(opt('espera', 3500));
const teclas = (opt('teclas', '') || '').split(',').map(s => s.trim()).filter(Boolean);
const js = opt('js', null);

const dormir = (ms) => new Promise(r => setTimeout(r, ms));

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ARGS = ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'];

let navegador, pagina;
if (puppeteer) {
  navegador = await puppeteer.launch({ headless: 'new', executablePath: CHROMIUM, args: ARGS });
  pagina = await navegador.newPage();
  await pagina.setViewport({ width: ancho, height: alto, deviceScaleFactor: escala, isMobile: movil, hasTouch: movil });
  if (movil) await pagina.setUserAgent(IPHONE);
} else {
  navegador = await playwright.launch({ executablePath: CHROMIUM, args: ARGS });
  const contexto = await navegador.newContext({
    viewport: { width: ancho, height: alto },
    deviceScaleFactor: escala, isMobile: movil, hasTouch: movil,
    ...(movil ? { userAgent: IPHONE } : {}),
  });
  pagina = await contexto.newPage();
}
console.log('   motor: ' + (puppeteer ? 'puppeteer' : 'playwright'));

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
  const jpeg = opt('jpeg', null);
  await pagina.screenshot({
    path: destino, fullPage: bandera('completa'),
    ...(jpeg ? { type: 'jpeg', quality: Number(jpeg) } : {}),
  });
  const peso = (statSync(destino).size / 1024).toFixed(0);
  console.log('📸 ' + salida + `  (${ancho}×${alto} @${escala}x · ${peso} KB)`);
  if (problemas.length) {
    console.log('   ⚠ ' + problemas.length + ' problema(s) en consola:');
    problemas.slice(0, 5).forEach(p => console.log('     · ' + p.slice(0, 160)));
  } else {
    console.log('   ✓ sin errores de consola');
  }
} finally {
  await navegador.close();
}
