#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   PRUEBAS DEL CLASIFICADOR · `node tienda/nucleo/pruebas-clasificar.mjs`
   ──────────────────────────────────────────────────────────────────────────
   La vara la puso adelgazar.mjs: «si el modelo no le gana a esto, no sirve».
   Con los 600-y-tantos productos de barbería de Odara: aprende del 80 % y
   adivina el 20 % que no vio. Lo que se exige:
     · acierta la gran mayoría SÓLO con el nombre (un Excel real no trae «tipo»);
     · lo que marca como seguro casi nunca está mal — ésa es la promesa que
       le hace a la pantalla de revisión;
     · manda a revisar una parte chica, no la mitad;
     · con un negocio vacío (sin ejemplos) no se inventa confianza.
   Y mutaciones: un clasificador que tira al azar y uno que siempre dice lo
   mismo TIENEN que reprobar las mismas compuertas.
   ═════════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { entrenar, predecir, palabras, UMBRAL } from './clasificar.js';
import { CATEGORIAS, categoriaDe, esDeBarberia } from '../datos/adelgazar.mjs';

const AQUI = dirname(new URL(import.meta.url).pathname);
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${d ? ` — ${d}` : ''}`); };

/* La respuesta «correcta» es la de las reglas de adelgazar.mjs, y las reglas
   también se equivocan. Estas cinco las cazó el clasificador y las confirmó una
   persona leyendo el nombre: una mascarilla no es un aparato ni un acondicionador
   es cera. Sin corregirlas, la prueba castigaba al clasificador por tener razón. */
const LA_REGLA_SE_EQUIVOCABA = {
  'Obliphica Seaberry Crema Hidratante Sin Enjuague Cabello Medio a Grueso': 'cuidado',
  'Oyster Cosmetics Cutinol Plus Curly Mask': 'cuidado',
  'Redken Extreme Acondicionador': 'cuidado',
  'Olaplex Hello Healthy Hair Starter Kit': 'cuidado',
  'Olaplex 4 en 1 Mascarilla Hidratante 370 ml': 'cuidado',
};
const crudo = JSON.parse(readFileSync(join(AQUI, '..', 'datos', 'catalogo-muestra.json'), 'utf8')).productos;
const todos = crudo.filter(esDeBarberia).map((p) => ({ id: p.id, nombre: p.nombre, marca: p.marca, tipo: p.tipo, categoria: LA_REGLA_SE_EQUIVOCABA[p.nombre] || categoriaDe(p) }));
const cats = CATEGORIAS.map(({ id, nombre }) => ({ id, nombre }));
// Partición fija: no depende del azar, la corrida de mañana da lo mismo.
const prueba = todos.filter((p) => p.id % 5 === 0), aprende = todos.filter((p) => p.id % 5 !== 0);

function medir(clasifica, textoDe){
  let aciertos = 0, seguros = 0, segurosMal = 0;
  for(const p of prueba){
    const r = clasifica(textoDe(p));
    const acierta = r.orden[0]?.categoria === p.categoria;
    if(acierta) aciertos++;
    if(!r.dudoso){ seguros++; if(!acierta) segurosMal++; }
  }
  return { acierto: aciertos / prueba.length, dudosos: 1 - seguros / prueba.length, errorSeguros: seguros ? segurosMal / seguros : 0 };
}
const pct = (x) => (x * 100).toFixed(1) + ' %';
const compuertas = (m) => ({
  acierta: m.acierto >= 0.85,
  seguroEsSeguro: m.errorSeguros <= 0.04,
  pocoARevisar: m.dudosos <= 0.30,
});

console.log(`\n· ${todos.length} productos · aprende de ${aprende.length} · adivina ${prueba.length}`);

console.log('\n· Palabras');
ok('quita acentos, plurales y relleno', JSON.stringify(palabras('Tijeras de Acero 6.5" para Barbería 500 ml')) === JSON.stringify(['tijera', 'acero', 'barberia']),
   JSON.stringify(palabras('Tijeras de Acero 6.5" para Barbería 500 ml')));

const modelo = entrenar(aprende.map((p) => ({ texto: `${p.nombre} ${p.marca}`, categoria: p.categoria })), cats);

console.log('\n· Sólo con nombre y marca (como llega de un Excel)');
const m1 = medir((t) => predecir(modelo, t), (p) => `${p.nombre} ${p.marca}`);
const c1 = compuertas(m1);
ok(`acierta ${pct(m1.acierto)} (mínimo 85 %)`, c1.acierta);
ok(`de lo que da por seguro, se equivoca en ${pct(m1.errorSeguros)} (máximo 4 %)`, c1.seguroEsSeguro);
ok(`manda a revisar ${pct(m1.dudosos)} (máximo 30 %)`, c1.pocoARevisar);

console.log('\n· Con el «tipo» del proveedor también');
const modelo2 = entrenar(aprende.map((p) => ({ texto: `${p.nombre} ${p.marca} ${p.tipo}`, categoria: p.categoria })), cats);
const m2 = medir((t) => predecir(modelo2, t), (p) => `${p.nombre} ${p.marca} ${p.tipo}`);
ok(`acierta ${pct(m2.acierto)}, y no peor que sin él`, m2.acierto >= m1.acierto - 0.01);

console.log('\n· Negocio vacío: sólo los nombres de las categorías');
const vacio = entrenar([], cats);
const r0 = predecir(vacio, 'Tijera de acero japonés 6 pulgadas');
ok('una palabra que es el nombre de una categoría sí la encuentra', r0.orden[0].categoria === 'corte', r0.orden[0].categoria);
const r1 = predecir(vacio, 'Producto XR-2000 importado');
ok('sin ninguna pista, no se inventa confianza: va a revisar', r1.dudoso && r1.confianza === 0);

console.log('\n· Mutaciones: tienen que reprobar');
let semilla = 7; const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
const alAzar = medir(() => { const o = cats.map((c) => ({ categoria: c.id, prob: azar() })).sort((a, b) => b.prob - a.prob); return { orden: o, dudoso: false }; }, (p) => p.nombre);
ok('el que tira al azar reprueba «acierta»', !compuertas(alAzar).acierta, pct(alAzar.acierto));
const terco = medir(() => ({ orden: [{ categoria: 'cuidado', prob: 1 }], dudoso: false }), (p) => p.nombre);
ok('el que siempre dice lo mismo reprueba «lo seguro es seguro»', !compuertas(terco).seguroEsSeguro, pct(terco.errorSeguros));
const miedoso = medir((t) => ({ ...predecir(modelo, t), dudoso: true }), (p) => p.nombre);
ok('el que todo lo manda a revisar reprueba «poco a revisar»', !compuertas(miedoso).pocoARevisar);
ok('el umbral es el que está en el código', UMBRAL > 0.5 && UMBRAL < 1);

console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
