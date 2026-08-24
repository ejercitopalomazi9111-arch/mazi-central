/* Las pruebas de `acta.mjs`.
 *
 * Miden el PDF RENDERIZADO, no el HTML que le di de comer. Esa distinción me
 * costó caro una vez: el medidor de la presentación revisaba las cajas
 * declaradas en el XML, daba 19/19, y Carlos mandó siete capturas de una
 * presentación rota. Lo que no se pinta, no cuenta.
 *
 * Así que aquí se convierte de verdad, se lee el PDF con `pdftotext -bbox` y
 * se revisa lo que quedó pintado y dónde quedó.
 *
 *   node herramientas/pruebas-acta.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { quienEs, GENTE, AREAS } = require('./consejo.js');
const RAIZ = resolve(dirname(new URL(import.meta.url).pathname), '..');
const PDFS = join(RAIZ, '.claude', 'actas-pdf');

let bien = 0, mal = 0;
const ok = (que, cond, detalle='') => {
  if(cond){ bien++; console.log('  ✓ ' + que); }
  else { mal++; console.log('  ✗ ' + que + (detalle ? '  → ' + detalle : '')); }
};

/* Las palabras PINTADAS, con sus coordenadas. */
function palabras(pdf){
  const xml = execFileSync('pdftotext', ['-bbox', pdf, '-'], { encoding:'utf-8' });
  const paginas = [];
  for(const p of xml.split('<page').slice(1)){
    const w = Number((/width="([\d.]+)"/.exec(p) || [])[1]);
    const h = Number((/height="([\d.]+)"/.exec(p) || [])[1]);
    const ws = [];
    const re = /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g;
    let m; while((m = re.exec(p))) ws.push({ x1:+m[1], y1:+m[2], x2:+m[3], y2:+m[4], t:m[5] });
    paginas.push({ ancho:w, alto:h, palabras:ws });
  }
  return paginas;
}
const texto = (pdf) => execFileSync('pdftotext', ['-layout', pdf, '-'], { encoding:'utf-8' });

console.log('\n── El censo ──');
ok('están los 24 de la sala más el gato y el perro', GENTE.filter(p => p.area !== 'consejo').length === 26,
   String(GENTE.filter(p => p.area !== 'consejo').length));
ok('y los cuatro jueces', GENTE.filter(p => p.area === 'consejo').length === 4);
ok('nadie repite id', new Set(GENTE.map(p => p.id)).size === GENTE.length);
ok('todos tienen un área que existe', GENTE.every(p => !!AREAS[p.area]));
ok('todos tienen cargo escrito', GENTE.every(p => p.cargo && p.cargo.length > 5));

console.log('\n── A quién reconoce y a quién NO ──');
for(const [n, esperado] of [
  ['Nadia', 'Nadia Berrones'], ['Verónica Alcázar', 'Verónica Alcázar'],
  ['"Cuervo" Saldaña', '"Cuervo" Saldaña'], ['Cuervo', '"Cuervo" Saldaña'],
  ['AK', 'AK Villalpando'], ['Ana Karina Villalpando', 'AK Villalpando'],
  ['MICHI', 'Michi'], ['El Escéptico', 'El Escéptico'],
]){
  const p = quienEs(n);
  ok('reconoce «' + n + '»', p && p.nombre === esperado, p ? p.nombre : 'no lo halló');
}
/* Lo que NO es una persona. Esto es lo que falló primero: el acta le ponía
   avatar a «Fecha» y a «Menú», y metía al Creyente a una auditoría porque
   cualquier «El algo» casaba con «El Creyente». */
for(const n of ['Fecha', 'Menú', 'Pedido', 'Sistema', 'Mesa', 'El veredicto',
                'El plan', 'La regla', 'Lo que rechazo']){
  ok('NO cree que «' + n + '» sea una persona', quienEs(n) === null,
     (quienEs(n) || {}).nombre);
}

console.log('\n── Los PDF, ya renderizados ──');
const actas = existsSync(PDFS) ? readdirSync(PDFS).filter(f => f.endsWith('.pdf')) : [];
ok('se convirtieron las nueve actas', actas.length === 9, actas.length + ' archivos');

let sinTexto = 0, seSalen = 0, conMarcas = [], pesados = 0;
for(const f of actas){
  const ruta = join(PDFS, f);
  const paginas = palabras(ruta);
  const t = texto(ruta);
  if(!paginas.length || !paginas[0].palabras.length) sinTexto++;

  /* Nada pintado fuera del papel. */
  for(const pg of paginas){
    for(const w of pg.palabras){
      if(w.x1 < -1 || w.y1 < -1 || w.x2 > pg.ancho + 1 || w.y2 > pg.alto + 1) seSalen++;
    }
  }
  /* Markdown que se quedó sin convertir. Es EL defecto de esta herramienta:
     un `**` que sobrevive quiere decir que algo no se entendió, y se ve feo
     justo en el documento que se supone que es el bonito. */
  const marcas = (t.match(/\*\*|^#{1,6}\s|\|\s*-{3,}/gm) || []);
  if(marcas.length) conMarcas.push(f + ' (' + marcas.length + ')');
  if(paginas.length > 40) pesados++;
}
ok('todas tienen texto de verdad, no páginas vacías', sinTexto === 0, sinTexto + ' vacías');
ok('nada quedó pintado fuera del papel', seSalen === 0, seSalen + ' palabras fuera');
ok('no sobrevivió ningún ** ni ## sin convertir', conMarcas.length === 0, conMarcas.join(' · '));
ok('ninguna acta se disparó de largo', pesados === 0);

console.log('\n── Lo que hace que se lea distinto ──');
{
  const f = join(PDFS, '2026-08-22-fadori-antes-de-construir.pdf');
  const t = texto(f);
  ok('sale el veredicto como sello', /ARREGLAR PRIMERO/.test(t));
  ok('sale el reparto con los cargos', /Jueza Técnica/.test(t) && /Sombrero negro/.test(t));
  ok('los niveles de gravedad se volvieron etiqueta con su nombre',
     /SANGRA|DUELE|ESTORBA|SE ACEPTA/i.test(t));
  ok('ya NO quedan emojis de bolita suelta', !/🔴|🟠|🟡|⚪/.test(t));
  ok('los turnos están numerados', /Nadia Berrones abre/.test(t));
  ok('el pie trae el nombre del archivo de origen',
     /2026-08-22-fadori-antes-de-construir\.md/.test(t));
  /* Esto es lo que Carlos pidió: saber quién habla. Si el nombre de quien
     habla no aparece muchas veces, el documento no cambió nada. */
  const veces = (t.match(/Paola Urquiza/g) || []).length;
  ok('el nombre de quien habla se repite en cada intervención', veces >= 3, veces + ' veces');
}

console.log('\n── MUTACIÓN: ¿la prueba caza lo que ya falló? ──');
{
  /* Se convierte un markdown hecho a mano con los defectos que YA pasaron, y
     se mira si salen en el texto pintado. */
  const md = [
    '# Prueba',
    '',
    '**Fecha:** hoy',
    '',
    '**Nadia:** esto tiene una **negrita que se',
    'parte de renglón** a la mitad.',
    '',
    'Y tres reglas:',
    '',
    '- **Una cosa.** con su explicación que también se',
    '  parte de renglón',
    '- **Otra cosa.** corta',
  ].join('\n');
  const tmp = '/tmp/acta-mutante.md';
  require('fs').writeFileSync(tmp, md);
  execFileSync('node', [join(RAIZ, 'herramientas/acta.mjs'), tmp], { encoding:'utf-8' });
  const t = texto(join(PDFS, 'acta-mutante.pdf'));
  ok('MUTACIÓN · una negrita partida de renglón SÍ se convierte',
     !/\*\*/.test(t), 'quedaron ** en el PDF');
  ok('MUTACIÓN · «Fecha» no se convirtió en persona con avatar',
     !/Fecha[\s\S]{0,40}no está en el censo/.test(t));
  /* Su nombre sale DOS veces cuando está bien: una en el reparto de la
     portada y otra como quien habla. Si la lista se saliera de su tarjeta,
     lo que va después abriría una tarjeta nueva y saldría una TERCERA vez.
     (La primera versión de esta prueba pedía una sola y fallaba con el
     código bueno: se me había olvidado el reparto.) */
  const veces = (t.match(/Nadia Berrones/g) || []).length;
  ok('MUTACIÓN · la lista quedó DENTRO de lo que dijo Nadia', veces === 2,
     'el nombre sale ' + veces + ' veces; con la lista fuera saldrían 3');
}

{
  const md = [
    '# Prueba de cita',
    '',
    '> **XIMENA RÍOS** — voy sección por sección:',
    '>',
    '> | # | Apartado | Veredicto |',
    '> |---|---|---|',
    '> | 1 | **El display** | **Bien.** No lo toco. **Pero trae una frase vieja** |',
    '> | 2 | **El taller** | **Aquí está el hueco.** Una sola herramienta |',
  ].join('\n');
  require('fs').writeFileSync('/tmp/acta-cita.md', md);
  execFileSync('node', [join(RAIZ, 'herramientas/acta.mjs'), '/tmp/acta-cita.md'],
               { encoding:'utf-8' });
  const t = texto(join(PDFS, 'acta-cita.pdf'));
  ok('MUTACIÓN · una tabla DENTRO de una cita sí se parsea',
     !/\*\*/.test(t) && /El display/.test(t) && /El taller/.test(t),
     'quedaron ** o se perdió la tabla');
  ok('MUTACIÓN · quien habla con guion largo también trae su avatar y su cargo',
     /Jefa de Front End/.test(t));
}

/* Las actas de mentiras que armaron las mutaciones NO se quedan en la
   carpeta de salida: si se quedan, la prueba de «se convirtieron las nueve
   actas» cuenta once y falla por culpa de sí misma. */
for(const f of ['acta-mutante.pdf', 'acta-cita.pdf']){
  try{ require('fs').unlinkSync(join(PDFS, f)); }catch(e){}
}

console.log('\n' + bien + ' bien · ' + mal + ' mal');
process.exit(mal ? 1 : 0);
