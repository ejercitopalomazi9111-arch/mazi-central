// LAS PORTADAS DE LOS ANUNCIOS: un cuadro de cada video con su título encima (plantilla.html).
//   node marca/anuncios/portadas/armar.mjs            (con python3 -m http.server 8765 en la raíz)
// Saca el cuadro de salida/<video>.mp4 con ffmpeg y deja portadas/<video>.jpg de 1080 × 1920.
import { createRequire } from 'module'; import { execFileSync } from 'child_process'; import fs from 'fs'; import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const AQUI = path.dirname(new URL(import.meta.url).pathname);
const LISTA = [
  ['01-no-somos-una-agencia-mas', 12, 'Por qué elegirnos', 'No somos *una agencia más*'],
  ['02-lo-que-hacemos', 10, 'Lo que hacemos', '6 cosas, *un equipo*'],
  ['03-trabajo-real', 6, 'Portafolio', 'Esto no es *una maqueta*'],
  ['04-nueva-imagen', 16, 'Nueva imagen', 'Cambiamos *de cara*'],
  ['05-mi-sobrino', 18, 'Historias', 'Mi sobrino sabe *de compus*'],
  ['06-cinco-senales', 24, 'Tips', '5 señales: *ya te urge página*'],
  ['07-la-plantilla', 6, 'Comparación', 'La plantilla *baratita*'],
  ['08-vende-con-nosotros', 10, 'Únete', '¿Se te da *vender?*'],
  ['09-buscamos-talento', 12, 'Únete', 'Buscamos *talento*'],
  ['10-la-historia-de-mary', 22.5, 'Historias', 'La historia *de Mary*'],
  ['11-corporativo', 7.5, 'Grupo Mazi', 'Un solo equipo *para todo*'],
  ['12-al-ritmo', 10, 'Motion', 'Al ritmo *de tu negocio*'],
  ['13-en-movimiento', 4.0, 'Motion 3D', 'Hazlo que *se mueva*']];
fs.mkdirSync(path.join(AQUI, 'cuadros'), { recursive: true });
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pg = await br.newPage({ viewport: { width: 1080, height: 1920 } });
for(const [v, s, k, t] of LISTA){
  const mp4 = path.join(AQUI, '../salida', v + '.mp4'); if(!fs.existsSync(mp4)){ console.log('· falta', v); continue; }
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', String(s), '-i', mp4, '-frames:v', '1', '-q:v', '2', path.join(AQUI, 'cuadros', v + '.jpg')]);
  await pg.goto(`http://localhost:8765/marca/anuncios/portadas/plantilla.html?c=cuadros/${v}.jpg&k=${encodeURIComponent(k)}&t=${encodeURIComponent(t)}`);
  await pg.evaluate(() => window.listo);
  await pg.screenshot({ path: path.join(AQUI, v + '.jpg'), type: 'jpeg', quality: 86 });
  console.log('✓', v);
}
await br.close();
