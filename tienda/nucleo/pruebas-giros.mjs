#!/usr/bin/env node
/* Pruebas de giros · `node tienda/nucleo/pruebas-giros.mjs`
   El Bloque 13 dice: el segundo giro sale SÓLO con configuración. Esta prueba
   lo cuida por los dos lados:
     1. cada giro de datos/giros/*.json está bien formado (lo que la app espera);
     2. en el CÓDIGO no queda ninguna palabra de producto amarrada a un giro —
        si vuelve «cera» o «Wahl» a un texto de pantalla, revienta. */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ICONOS } from './iconos.js';
import { textoASinonimos, sinonimosATexto } from './bot.js';
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const RAIZ = new URL('..', import.meta.url).pathname;
const TIPOS = new Set(['texto', 'numero', 'opcion', 'si_no']);

console.log('\n· Los giros');
const dir = join(RAIZ, 'datos/giros');
const giros = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => ({ f, g: JSON.parse(readFileSync(join(dir, f), 'utf8')) }));
ok('hay al menos dos giros', giros.length >= 2, giros.map((x) => x.f).join());
ok('cada slug es único', new Set(giros.map((x) => x.g.slug)).size === giros.length);
for(const { f, g } of giros){
  const cats = g.categorias || [];
  ok(`${f}: tiene categorías`, cats.length >= 3, cats.length);
  ok(`${f}: claves de categoría únicas y sin espacios`, new Set(cats.map((c) => c.id)).size === cats.length && cats.every((c) => /^[a-z0-9_-]+$/.test(c.id)));
  const sinIcono = cats.filter((c) => !ICONOS[c.icono]).map((c) => `${c.id}:${c.icono}`);
  ok(`${f}: cada ícono existe`, !sinIcono.length, sinIcono.join());
  const malos = cats.flatMap((c) => (c.plantilla || []).filter((x) => !/^[a-z_]+$/.test(x.clave) || !x.etiqueta || !TIPOS.has(x.tipo) || (x.tipo === 'opcion' && !(x.opciones?.length >= 2))).map((x) => `${c.id}.${x.clave}`));
  ok(`${f}: cada campo de plantilla es válido (clave, etiqueta, tipo, y 2+ opciones si es lista)`, !malos.length, malos.join());
  const sin = g.ajustes?.bot?.sinonimos || [];
  ok(`${f}: sus sinónimos sobreviven a editarse en Ajustes`, JSON.stringify(textoASinonimos(sinonimosATexto(sin))) === JSON.stringify(sin));
}

console.log('\n· El código no sabe de qué giro es');
const PROHIBIDAS = /\b(cera|ceras|navajas?|wahl|shampoo|pomada|reuzel|odara|tijeras?|matte)\b/i;
const archivos = [];
const recorrer = (d) => { for(const n of readdirSync(d)){ const p = join(d, n); const r = relative(RAIZ, p);
  if(/^(datos|muestra|supabase|puente|nucleo\/vendor|nucleo\/letra)(\/|$)/.test(r)) continue;
  if(statSync(p).isDirectory()) recorrer(p); else if(/\.js$/.test(n) && !/^pruebas-/.test(n)) archivos.push(p); } };
recorrer(RAIZ);
const hallazgos = [];
for(const p of archivos){
  // Sin comentarios: ahí sí se vale poner un ejemplo para explicar.
  const codigo = readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, '')).split('\n').map((l) => l.replace(/(^|[^:'"`])\/\/.*$/, '$1'));
  codigo.forEach((l, i) => { const m = l.match(PROHIBIDAS); if(m) hallazgos.push(`${relative(RAIZ, p)}:${i + 1} «${m[0]}»`); });
}
ok(`${archivos.length} archivos de la app sin productos de un giro escritos a mano`, !hallazgos.length, hallazgos.join(' · '));

console.log(`\n${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
