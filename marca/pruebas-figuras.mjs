/* ══════════════════════════════════════════════════════════════════════════
   LAS FIGURAS · pruebas
     node marca/pruebas-figuras.mjs

   La tabla de figuras la usan TRES pantallas: la mesa, el Taller y el Cerebro.
   Esta prueba existe por una razón concreta: que no se desincronicen. Agregar
   un modelo en un lado y olvidarlo en los otros es el defecto
   `renombrar-de-un-lado`, y con tres copias es tres veces más fácil.
   ═════════════════════════════════════════════════════════════════════════ */
import { readFile } from 'node:fs/promises';

let bien = 0, mal = 0;
const ok = (q, c) => { c ? (bien++, console.log(`  ✓ ${q}`)) : (mal++, console.log(`  ✗ ${q}`)); };

global.window = {};
await import('./figuras.js');
const F = global.window.FIGURAS_IA;

console.log('\n· La tabla');
{
  ok('carga y expone la tabla', !!F && !!F.FIGURAS);
  const fams = Object.keys(F.FIGURAS);
  ok(`hay figuras para todas las familias (${fams.length})`, fams.length >= 16);
  ok('cada familia tiene su nombre en cristiano',
     fams.every(f => F.NOMBRE_FAM[f] && F.NOMBRE_FAM[f].length > 1));
  ok('ninguna figura está vacía', fams.every(f => F.FIGURAS[f].length > 20));

  /* Si un glifo no se puede convertir a trazos, en el canvas del Cerebro sale
     un hueco — y un hueco se lee como «no sé qué IA es», que es justo lo que
     las figuras existen para evitar. */
  const sinTrazos = fams.filter(f => F.caminosDe(f).length === 0);
  ok(`todas se pueden dibujar en canvas${sinTrazos.length ? ' — fallan: ' + sinTrazos.join(', ') : ''}`,
     sinTrazos.length === 0);
}

console.log('\n· Que no se desincronice con la mesa');
{
  /* La mesa se quedó autónoma a propósito —es un solo archivo que abre sin
     nada— así que la tabla está en los dos lados. Lo que NO puede pasar es que
     se separen sin que nadie se entere. */
  const mesa = await readFile(new URL('../sala/index.html', import.meta.url), 'utf8');
  const suyas = [...mesa.matchAll(/^\s{2}(\w+):\s*'(<(?:circle|path|rect)[^\n]*)',?$/gm)]
    .map(m => m[1]);
  const faltan = Object.keys(F.FIGURAS).filter(f => !suyas.includes(f));
  const sobran = suyas.filter(f => !F.FIGURAS[f]);
  ok(`la mesa tiene las mismas familias (${suyas.length})`,
     faltan.length === 0 && sobran.length === 0);
  if(faltan.length) console.log(`      falta en la mesa: ${faltan.join(', ')}`);
  if(sobran.length) console.log(`      sobra en la mesa: ${sobran.join(', ')}`);

  ok('y los mismos dibujos, carácter por carácter',
     Object.keys(F.FIGURAS).every(f => mesa.includes(F.FIGURAS[f])));
}

console.log('\n· Que las figuras sean NUESTRAS');
{
  /* No es paranoia: es el mismo flanco de Torre Infinita. Un repo público de
     una empresa que vende servicios no puede traer los logos de otras. */
  const todo = Object.values(F.FIGURAS).join(' ') + Object.values(F.NOMBRE_FAM).join(' ');
  ok('ninguna trae una imagen de fuera', !/<image|xlink:href|url\(/i.test(todo));
  ok('ninguna es un logo pegado', !/\.svg|\.png|base64/i.test(todo));
}

console.log(`\n${mal ? '✗' : '✓'}  ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
