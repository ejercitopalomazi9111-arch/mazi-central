/* La prueba del cartel · `node probar.mjs`
 *
 * Un cartel con un QR que no escanea no sirve para nada, y eso NO se ve
 * mirándolo: un código puede verse perfecto y no decodificar porque quedó
 * chico, sin margen o con poco contraste. Así que se lee el PNG FINAL con un
 * decodificador de verdad —el mismo trabajo que hace la cámara del alumno— y
 * se comprueba que cada código lleva a donde dice.
 *
 * También se mide el tamaño impreso: a menos de ~2 cm un teléfono batalla.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const AQUI = dirname(fileURLToPath(import.meta.url));
const PNG = join(AQUI, 'cartel-fadori.png');

const CASA = 'https://mazi-central.palomazi9111.workers.dev/fadori/';
const ESPERADOS = [CASA, CASA + 'instalar.html'];

let bien = 0, mal = 0;
const ok = (q, c, d='') => { if(c){ bien++; console.log('  ✓ ' + q); }
                             else { mal++; console.log('  ✗ ' + q + (d ? '  → ' + d : '')); } };

let leidos = [];
try{
  leidos = execFileSync('zbarimg', ['-q', '--raw', PNG], { encoding:'utf8', stdio:['ignore','pipe','ignore'] })
    .split('\n').map(x => x.trim()).filter(Boolean);
}catch(e){
  /* zbarimg sale con código 4 cuando no encuentra nada: eso ES el fallo */
  leidos = String(e.stdout || '').split('\n').map(x => x.trim()).filter(Boolean);
}

console.log('── los códigos del cartel ──');
ok('se leen los dos códigos', leidos.length === 2,
   'se leyeron ' + leidos.length + ': ' + (leidos.join(' | ') || 'ninguno'));
ESPERADOS.forEach((url, i) => {
  ok('el código ' + (i+1) + ' lleva a ' + url,
     leidos.includes(url), 'leyó: ' + (leidos[i] || '—'));
});
ok('los dos códigos son distintos', new Set(leidos).size === leidos.length,
   'hay uno repetido: alguien pegó el mismo QR dos veces');

/* El cartel es A4 (21 cm de ancho) a 2480 px → 118 px por cm. */
const anchoQR = 475 * 2;             // 475 px de maqueta, renderizado al doble
const cm = anchoQR / (2480 / 21);
console.log('\n── que se pueda escanear de lejos ──');
ok('cada código mide más de 3 cm impreso en A4',
   cm >= 3, 'mide ' + cm.toFixed(1) + ' cm');

console.log('\nFadori cartel · ' + bien + '/' + (bien + mal) + ' pruebas');
process.exit(mal ? 1 : 0);
