/* Comprueba que los sitios ENTREGADOS traen el mismo motor que la plantilla.
     node empresa/sitio-chico/revisar-copias.mjs

   ⚠ POR QUÉ EXISTE. Arreglé el contraste del botón de WhatsApp en la plantilla
   y el sitio entregado siguió roto: es una COPIA, y una copia no se entera de
   que el original cambió. Lo cazó correr las pruebas contra `dist/` en vez de
   contra la plantilla. Sin esto, cada arreglo se queda a medio camino y el
   cliente conserva el defecto que ya creíamos cerrado. */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const PLANTILLA = join(AQUI, 'plantilla', 'index.html');
const CLIENTES = join(AQUI, '..', '..', 'clientes');

const original = readFileSync(PLANTILLA, 'utf8');
let viejos = 0, revisados = 0;

for (const c of readdirSync(CLIENTES, { withFileTypes: true })) {
  if (!c.isDirectory()) continue;
  const suyo = join(CLIENTES, c.name, 'index.html');
  if (!existsSync(suyo)) { console.log(`  ✗ ${c.name}: no tiene index.html`); viejos++; continue; }
  revisados++;
  if (readFileSync(suyo, 'utf8') === original) console.log(`  ✓ ${c.name}: al día`);
  else { console.log(`  ✗ ${c.name}: su index.html NO es el de la plantilla`); viejos++; }
}

console.log(`\n${revisados} sitios revisados · ${viejos} desfasados`);
if (viejos) {
  console.log('Para ponerlos al día: cp empresa/sitio-chico/plantilla/index.html clientes/<sitio>/index.html');
  console.log('(`negocio.js` NO se toca: ésos son los datos de cada cliente.)');
}
process.exit(viejos ? 1 : 0);
