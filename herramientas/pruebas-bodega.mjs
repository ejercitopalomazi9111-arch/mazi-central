/* ══════════════════════════════════════════════════════════════════════════
   LA BODEGA · pruebas
     node herramientas/pruebas-bodega.mjs

   Lo que se prueba es lo que la haría PELIGROSA o INÚTIL: que borre una skill
   de la casa por un nombre repetido, que el índice no encuentre lo que uno
   describe con sus palabras, o que se trague encabezados mal formados.
   ═════════════════════════════════════════════════════════════════════════ */
import { readFile } from 'node:fs/promises';
import { encabezado, buscar } from './bodega.mjs';

let bien = 0, mal = 0;
const ok = (q, c) => { c ? (bien++, console.log(`  ✓ ${q}`)) : (mal++, console.log(`  ✗ ${q}`)); };

console.log('\n· El encabezado');
{
  ok('lee nombre y descripción',
     encabezado('---\nname: x\ndescription: hace algo\n---\n# X').description === 'hace algo');

  /* La mitad de las descripciones vienen partidas con sangría. Sin juntarlas,
     el índice se queda con el primer renglón y no encuentra nada. */
  const largo = encabezado('---\nname: y\ndescription: primera parte\n   segunda parte\n   tercera\n---\n');
  ok('junta las descripciones partidas en varios renglones',
     largo.description === 'primera parte segunda parte tercera');

  ok('sin encabezado devuelve nulo', encabezado('# nada más un título') === null);
  ok('un encabezado vacío no truena', encabezado('---\n---\n') !== undefined);
  ok('quita las comillas', encabezado('---\nname: "z"\n---\n').name === 'z');
}

console.log('\n· Buscar en el índice');
{
  const idx = JSON.parse(await readFile(new URL('../bodega/INDICE.json', import.meta.url), 'utf8'));
  ok(`la bodega tiene bastante (${idx.total})`, idx.total > 500);

  /* Se busca como lo diría alguien con la necesidad enfrente. */
  for(const [q, espera] of [['android','movil'], ['video','video'],
                            ['seo marketing','negocio'], ['docker deploy','infra']]){
    const r = buscar(idx.skills, q, 8);
    ok(`«${q}» devuelve algo del tema ${espera}`,
       r.length > 0 && r.some(s => s.etiquetas.includes(espera)));
  }

  /* El nombre pesa más que el resumen: quien busca «video» quiere la skill DE
     video, no las cuarenta que la mencionan de pasada. */
  const v = buscar(idx.skills, 'video', 5);
  ok('lo más parecido sale primero',
     v.length > 0 && (v[0].nombre.includes('video') || v[0].etiquetas.includes('video')));

  ok('buscar vacío no truena', buscar(idx.skills, '').length === 0);
  ok('algo que no existe devuelve nada', buscar(idx.skills, 'zzqqxx').length === 0);

  /* Sin esto la bodega es un montón de archivos de desconocidos sin dueño. El
     repo es público: hay que poder decir de dónde salió cada cosa. */
  ok('cada skill dice de dónde salió y bajo qué licencia',
     idx.skills.every(s => s.fuente && s.licencia));
  ok('ninguna huella está repetida',
     new Set(idx.skills.map(s => s.huella)).size === idx.skills.length);
  ok('ningún nombre está repetido',
     new Set(idx.skills.map(s => s.nombre)).size === idx.skills.length);

  /* El índice tiene que caber. Si creciera al tamaño de las skills, no habría
     resuelto nada: sería el mismo problema con otro nombre. */
  const bytes = Buffer.byteLength(JSON.stringify(idx));
  ok(`el índice pesa poco comparado con lo que indexa (${Math.round(bytes/1024)} KB para ${idx.total})`,
     bytes / idx.total < 700);
}

console.log(`\n${mal ? '✗' : '✓'}  ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
