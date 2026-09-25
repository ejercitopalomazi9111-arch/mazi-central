#!/usr/bin/env node
/* `node tienda/nucleo/pruebas-memoria.mjs` — favoritos, vistos, búsquedas, guardado para después, envío gratis y comprar de nuevo. */
import { crearMemoria, bajoDesde, envioGratis, comprados, TOPE_VISTOS, TOPE_BUSQUEDAS } from './memoria.js';
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const almacen = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), m }; };
let reloj = 1000; const A = almacen(); const M = crearMemoria(A, 'demo', () => reloj++);

console.log('\n· Favoritos');
ok('empieza vacío', M.favoritos.todos().length === 0 && !M.favoritos.tiene('a'));
ok('alternar pone y dice que quedó puesto', M.favoritos.alternar({ id: 'a', p: 199 }) === true && M.favoritos.tiene('a'));
M.favoritos.poner({ id: 'b', p: 50 });
ok('lo más nuevo primero', M.favoritos.todos()[0].id === 'b');
M.favoritos.poner({ id: 'a', p: 180 });
ok('volver a guardarlo no lo duplica y actualiza su precio', M.favoritos.todos().filter((f) => f.id === 'a').length === 1 && M.favoritos.todos()[0].precio === 180);
ok('alternar lo quita y dice que ya no está', M.favoritos.alternar({ id: 'a', p: 1 }) === false && !M.favoritos.tiene('a'));
ok('guarda el precio con el que se guardó', M.favoritos.todos().find((f) => f.id === 'b').precio === 50);
ok('bajó de precio: dice cuánto (en centavos)', bajoDesde({ precio: 50 }, { p: 45.5 }) === 450);
ok('subió: sale negativo', bajoDesde({ precio: 50 }, { p: 60 }) === -1000);
ok('si el producto ya no existe, no hay cambio que decir', bajoDesde({ precio: 50 }, undefined) === 0);
ok('los favoritos son de ESTE negocio (otra tienda no los ve)', crearMemoria(A, 'otra').favoritos.todos().length === 0);

console.log('\n· Vistos recientemente');
for(const id of ['x', 'y', 'z', 'x']) M.vistos.ver(id);
ok('el último visto va primero y no se repite', M.vistos.todos().join('') === 'xzy', M.vistos.todos().join(''));
for(let i = 0; i < 40; i++) M.vistos.ver('p' + i);
ok(`guarda sólo los últimos ${TOPE_VISTOS}`, M.vistos.todos().length === TOPE_VISTOS && M.vistos.todos()[0] === 'p39');
M.vistos.borrar();
ok('se puede borrar el historial', M.vistos.todos().length === 0);

console.log('\n· Búsquedas');
M.busquedas.guardar('  cera   mate '); M.busquedas.guardar('shampoo'); M.busquedas.guardar('Cera Mate');
ok('limpia espacios, no repite sin importar mayúsculas y lo último va primero', JSON.stringify(M.busquedas.todas()) === '["Cera Mate","shampoo"]', JSON.stringify(M.busquedas.todas()));
M.busquedas.guardar('a');
ok('una letra no se guarda', !M.busquedas.todas().includes('a'));
for(let i = 0; i < 20; i++) M.busquedas.guardar('cosa ' + i);
ok(`guarda sólo las últimas ${TOPE_BUSQUEDAS}`, M.busquedas.todas().length === TOPE_BUSQUEDAS);
M.busquedas.quitar('cosa 19');
ok('se puede quitar una', !M.busquedas.todas().includes('cosa 19'));

console.log('\n· Guardado para después');
M.despues.guardar('a', 2); M.despues.guardar('b', 1); M.despues.guardar('a', 3);
ok('guarda cantidad, no repite y lo último va primero', JSON.stringify(M.despues.todos()) === '[["a",3],["b",1]]', JSON.stringify(M.despues.todos()));
M.despues.quitar('a');
ok('se quita al regresarlo al carrito', JSON.stringify(M.despues.todos()) === '[["b",1]]');

console.log('\n· Avisos a quien escucha');
let avisos = 0; const soltar = M.alCambiar(() => avisos++);
M.favoritos.poner({ id: 'q', p: 1 }); M.vistos.ver('q'); soltar(); M.vistos.ver('r');
ok('avisa al cambiar, y deja de avisar al soltarlo', avisos === 2, avisos);
const roto = crearMemoria({ getItem: () => '{roto', setItem(){ throw new Error('lleno'); } }, 'x');
ok('un almacén dañado o lleno no truena', roto.favoritos.todos().length === 0 && (roto.favoritos.poner({ id: 'a', p: 1 }), true));

console.log('\n· Envío gratis');
ok('falta lo que falta', JSON.stringify(envioGratis(60000, { gratis_desde: 800, costo: 80 })) === JSON.stringify({ meta: 80000, falta: 20000, listo: false, avance: 75 }));
ok('al llegar, listo', envioGratis(80000, { gratis_desde: 800, costo: 80 }).listo === true);
ok('sin envío gratis configurado, no hay barra', envioGratis(100, { costo: 80 }) === null);
ok('si el envío no cuesta, no hay barra', envioGratis(100, { gratis_desde: 800, costo: 0 }) === null);

console.log('\n· Comprar de nuevo');
const ped = [
  { creado: '2026-09-01', estado: 'entregado', renglones: [{ producto_id: 'a', nombre: 'A', cantidad: 2 }, { producto_id: 'b', nombre: 'B', cantidad: 1 }] },
  { creado: '2026-09-20', estado: 'entregado', renglones: [{ producto_id: 'a', nombre: 'A', cantidad: 1 }] },
  { creado: '2026-09-22', estado: 'cancelado', renglones: [{ producto_id: 'c', nombre: 'C', cantidad: 1 }] },
];
const cs = comprados(ped);
ok('sin repetir y lo más reciente primero', cs.map((x) => x.id).join('') === 'ab', cs.map((x) => x.id).join(''));
ok('cuenta veces y piezas', cs[0].veces === 2 && cs[0].piezas === 3 && cs[0].ultima === '2026-09-20');
ok('lo cancelado no cuenta', !cs.some((x) => x.id === 'c'));
ok('sin pedidos, vacío', comprados(null).length === 0);

console.log(`\n${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
