/* Arma el archivo único de la app: mete las fuentes en base64 y el logo en línea,
   para que funcione abriendo el archivo aunque se mueva de carpeta.
     node armar.mjs <raíz del repo> <salida.html> */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const RAIZ = process.argv[2], SALIDA = process.argv[3];
const AQUI = dirname(new URL(import.meta.url).pathname);

const AQUI_F = join(AQUI, 'fuentes');
const empotrar = (n) => readFileSync(join(AQUI_F, n)).toString('base64');
const logo = readFileSync(join(RAIZ, 'marca/logo/paloma-simple.svg'), 'utf8')
  .replace(/<\?xml[^>]*\?>/g, '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\s*width="[^"]*"/, '')
  .replace(/\s*height="[^"]*"/, '')
  .replace(/<svg /, '<svg style="width:100%;height:100%;display:block" ')
  .trim();

const niveles = ['1','2','3','4','5']
  .map(k => readFileSync(join(AQUI, `niveles-${k}.js`), 'utf8')).join('\n');

const html =
  readFileSync(join(AQUI, 'cabeza.html'), 'utf8')
    .replace('__TITULO__',   empotrar('titulo.woff2'))
    .replace('__TITULO_B__', empotrar('titulo-b.woff2'))
+ readFileSync(join(AQUI, 'cuerpo.html'), 'utf8').replace('__LOGO__', logo)
+ '\n<script>\nvar LOGO = ' + JSON.stringify(logo) + ';\nvar NIVELES = [\n'
+ niveles + '\n];\n'
+ readFileSync(join(AQUI, 'motor.js'), 'utf8')
+ '\n</script>\n</body>\n</html>\n';

writeFileSync(SALIDA, html);
console.log('escrito', SALIDA, (html.length/1024).toFixed(0) + ' KB');
