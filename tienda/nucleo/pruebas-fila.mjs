#!/usr/bin/env node
/* Pruebas de fila.js · `node tienda/nucleo/pruebas-fila.mjs` — que ninguna venta sin red se pierda ni se suba dos veces. */
import { crearFila, subir, sinRed } from './fila.js';
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const memoria = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const red = new Error('Algo falló: TypeError: Failed to fetch');
const alcanza = Object.assign(new Error('Ya no alcanzan las piezas de: Cera'), { causa: { message: 'sin_existencias: Cera' } });

console.log('\n· ¿Es falta de red?');
ok('«Failed to fetch» es falta de red', sinRed(red, true));
ok('Safari dice «Load failed»', sinRed(new Error('TypeError: Load failed'), true));
ok('sin conexión según el navegador, cualquier error cuenta como falta de red', sinRed(new Error('lo que sea'), false));
ok('«ya no alcanzan» NO es falta de red: es un no de verdad', !sinRed(alcanza, true));

console.log('\n· La fila');
const f = crearFila(memoria(), 'x');
const a = f.agregar({ total: 100 }), b = f.agregar({ total: 50 }), c = f.agregar({ total: 30 });
ok('folios provisionales en orden: L1, L2, L3', [a, b, c].map((v) => v.folio).join() === 'L1,L2,L3');
ok('las tres pendientes', f.pendientes().length === 3);
const f2 = crearFila(f === null ? null : { getItem: () => '{roto', setItem(){} }, 'x');
ok('un almacén con basura no truena: fila vacía', f2.todas().length === 0);

console.log('\n· Subir');
let vistas = [];
let r = await subir(f, async (v) => { vistas.push(v.folio); if(v.folio === 'L2') throw red; return { folio: 100 + vistas.length }; });
ok('sube L1, y al caerse la red en L2 se detiene', r.subidas.length === 1 && r.cortada && vistas.join() === 'L1,L2', JSON.stringify(r));
ok('L2 y L3 siguen pendientes, en orden', f.pendientes().map((v) => v.folio).join() === 'L2,L3');
r = await subir(f, async (v) => { if(v.folio === 'L2') throw alcanza; return { folio: 200 }; });
ok('L2 rechazada por el servidor: se marca y NO se pierde', f.rechazadas().length === 1 && f.rechazadas()[0].folio === 'L2' && /alcanzan/.test(f.rechazadas()[0].error));
ok('L3 subió aunque L2 se rechazó', r.subidas.length === 1 && r.subidas[0].item.folio === 'L3' && f.pendientes().length === 0);
const g = crearFila(memoria(), 'y'); g.agregar({}); let veces = 0;
const lento = async () => { veces++; await new Promise((s) => setTimeout(s, 30)); return {}; };
await Promise.all([subir(g, lento), subir(g, lento)]);
ok('dos «volvió la red» a la vez no suben dos veces la misma venta', veces === 1, veces);
const h = crearFila(memoria(), 'z'); h.agregar({}); h.agregar({});
const nuevo = h.agregar({});
ok('el siguiente folio no se repite aunque se suban las anteriores', nuevo.folio === 'L3');

console.log(`\n${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
