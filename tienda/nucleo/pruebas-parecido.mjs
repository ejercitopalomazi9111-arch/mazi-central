#!/usr/bin/env node
/* Pruebas de parecido.js · `node tienda/nucleo/pruebas-parecido.mjs` */
import { distancia, estaParecida } from './parecido.js';
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
console.log('\n· Distancia');
ok('igual = 0', distancia('tinte', 'tinte') === 0);
ok('una letra de menos = 1 (shampo/shampoo)', distancia('shampo', 'shampoo') === 1);
ok('dos volteadas = 1 (tnite/tinte)', distancia('tnite', 'tinte') === 1);
ok('cambiada = 1 (acondisionador/acondicionador)', distancia('acondisionador', 'acondicionador') === 1);
ok('muy distintas se cortan en el tope', distancia('cera', 'aceite', 2) === 3);
console.log('\n· Lo mal escrito se encuentra');
const t = ' alfaparf keratin therapy lisse design shampoo 250 ml acondicionador tinte color';
for(const w of ['shampo', 'shampu', 'keratine', 'kerati', 'acondisionador', 'acondicionadr', 'tinet']) ok(`«${w}»`, estaParecida(t, w));
console.log('\n· Lo corto o distinto NO');
for(const w of ['cera', 'cero', 'gel', 'rojo', 'navaja', 'maquina']) ok(`«${w}» no se inventa`, !estaParecida(t, w));
console.log('\n· Lo que suena igual (se escribe de oído)');
const cat = 'cera mate reuzel brocha de afeitar navaja zero gel';
for(const w of ['seras', 'sera', 'vrocha', 'bróxa'.normalize('NFD').replace(/[̀-ͯ]/g, '').replace('x', 'ch'), 'nabaja']) ok(`«${w}»`, estaParecida(cat, w));
for(const w of ['cerca', 'mata', 'gal']) ok(`«${w}» no suena a nada del catálogo`, !estaParecida('brocha de afeitar navaja', w));
console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
