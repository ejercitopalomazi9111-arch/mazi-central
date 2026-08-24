/* Arma el juego en UN SOLO ARCHIVO, para mandárselo a alguien por WhatsApp y
 * que lo abra sin internet y sin servidor.
 *
 * No es una copia del juego: se genera de los mismos dos archivos, así que no
 * se puede quedar atrás. Lo que NO trae es el modo en línea —ése necesita el
 * servidor— y por eso el botón se quita en vez de dejarlo ahí para que truene.
 *
 *   node juegos/guerra-de-puercos/armar-suelto.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const AQUI = dirname(new URL(import.meta.url).pathname);
const html  = await readFile(join(AQUI, 'index.html'), 'utf-8');
const motor = await readFile(join(AQUI, 'motor.js'), 'utf-8');

let suelto = html.replace('<script src="motor.js"></script>',
  '<script>\n/* motor.js, metido aquí para que el archivo funcione solo */\n'
  + motor + '\n</script>');

if(suelto === html) throw new Error('No se encontró el <script src="motor.js">');

/* Fuera el modo en línea: sin servidor, ese botón sólo sabría fallar. */
suelto = suelto.replace(
  '<button class="btn ancho" id="bLinea">Jugar con alguien lejos</button>\n', '');
suelto = suelto.replace('$(\'#bLinea\').addEventListener(\'click\',',
                        'if($(\'#bLinea\')) $(\'#bLinea\').addEventListener(\'click\',');

const salida = join(AQUI, 'guerra-de-puercos.html');
await writeFile(salida, suelto);
console.log('✓ ' + salida + ' · ' + Math.round(suelto.length / 1024) + ' KB');
