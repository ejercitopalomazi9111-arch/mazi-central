#!/usr/bin/env node
/* Pruebas del bot · `node tienda/nucleo/pruebas-bot.mjs`
   Lo que no se negocia: nunca inventa precio ni existencia, y si no sabe, pasa a una persona. */
import { responder, buscar, cantidad, intencion } from './bot.js';
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const productos = [
  { id: 'c1', n: 'Cera Mate Reuzel 113 g', m: 'Reuzel', c: 'peinado', p: 289, a: null, q: 12, x: false },
  { id: 'c2', n: 'Cera Brillo Reuzel 113 g', m: 'Reuzel', c: 'peinado', p: 289, a: 340, q: 3, x: false },
  { id: 'c3', n: 'Cera Fibra Suavecito', m: 'Suavecito', c: 'peinado', p: 199, a: null, q: 0, x: true },
  { id: 'n1', n: 'Navajas Derby 100 pz', m: 'Derby', c: 'barba', p: 165.5, a: null, q: 40, x: false },
  { id: 't1', n: 'Talco Clubman 255 g', m: 'Clubman', c: 'cuidado', p: 120, a: 150, q: 1, x: false },
  { id: 'm1', n: 'Máquina Wahl Magic Clip', m: 'Wahl', c: 'maquinas', p: 2450, a: null, q: 6, x: false },
];
const categorias = [{ id: 'peinado', nombre: 'Peinado' }, { id: 'barba', nombre: 'Barba y afeitado' }, { id: 'cuidado', nombre: 'Cuidado' }, { id: 'maquinas', nombre: 'Máquinas' }];
const completo = { nombre: 'Surtido', marca: { nombre_corto: 'Surtido' }, ajustes: {
  envio: { costo: 60, gratis_desde: 1000, zona: 'Querétaro y Corregidora', tiempo: 'el mismo día', recoger: true },
  pagos: { efectivo: true, tarjeta: false, transferencia: true, banco: 'BBVA', clabe: '012180001234567895', titular: 'Surtido SA' },
  contacto: { horario: 'lunes a sábado de 9 a 7', direccion: 'Hidalgo 10, Centro' } } };
const vacio = { nombre: 'Surtido', ajustes: {} };
function charla(mensajes, negocio = completo){
  let estado = {}; const salida = [];
  for(const m of mensajes){ const r = responder(m, { productos, categorias, negocio, estado }); estado = r.estado; salida.push(r); }
  return salida;
}
const precios = (t) => (String(t).match(/\$[\d,]+(\.\d+)?/g) || []).map((x) => Number(x.replace(/[$,]/g, '')));
const valido = new Set(productos.flatMap((p) => [p.p, p.a]).filter(Boolean));

console.log('\n· Cantidades e intenciones');
ok('«quiero 3 ceras» → 3', cantidad('quiero 3 ceras') === 3);
ok('«un par de navajas» → 2', cantidad('un par de navajas') === 2);
ok('«dame cera» → sin cantidad', cantidad('dame cera') === null);
ok('«dos» → 2', cantidad('dos') === 2);
ok('«113 g» es del producto, no cuántas piezas', cantidad('cera mate 113 g') === null, cantidad('cera mate 113 g'));
ok('«250 ml» tampoco', cantidad('shampoo 250 ml') === null);
ok('«quiero 2 cera 113 g» → 2', cantidad('quiero 2 cera 113 g') === 2);
ok('«¿a qué hora abren?» → horario', intencion('¿A qué hora abren?') === 'horario');
ok('«quiero hablar con una persona» → persona', intencion('quiero hablar con una persona') === 'persona');

console.log('\n· Buscar en el catálogo');
ok('«cera mate» → sólo la mate', buscar('¿tienen cera mate?', productos, categorias).map((p) => p.id).join() === 'c1');
ok('«ceras» (plural) encuentra las tres', buscar('ceras', productos, categorias).length === 3);
ok('«algo para la barba» busca por categoría', buscar('algo para la barba', productos, categorias)[0]?.id === 'n1');
ok('sin acentos: «maquina wahl»', buscar('maquina wahl', productos, categorias)[0]?.id === 'm1');
ok('lo agotado va al final', buscar('cera', productos, categorias).slice(-1)[0].id === 'c3');
ok('«tinte rubio» no está: cero, no se inventa', buscar('tinte rubio', productos, categorias).length === 0);
ok('catálogo vacío no truena', buscar('cera', [], []).length === 0);

console.log('\n· Precio y existencias: sólo del catálogo');
const [r1] = charla(['¿Cuánto cuesta la cera mate?']);
ok('dice el precio real', /\$289/.test(r1.texto), r1.texto);
ok('dice que sí hay (12)', /Sí hay/.test(r1.texto));
const [r2] = charla(['precio del talco']);
ok('con 1 pieza dice «me queda 1»', /queda 1/.test(r2.texto) && /\$120/.test(r2.texto) && /antes \$150/.test(r2.texto), r2.texto);
const [r3] = charla(['tienen cera fibra suavecito']);
ok('agotado lo dice y no ofrece apartar', /acabó/.test(r3.texto) && !/aparto/.test(r3.texto), r3.texto);
const [r4] = charla(['¿tienen tinte rubio cenizo?']);
ok('lo que no existe: «no encontré», sin precio', /No encontré/.test(r4.texto) && !precios(r4.texto).length, r4.texto);
const todas = charla(['hola', 'ceras', '2', 'cuánto llevo', 'ofertas', 'navajas', 'talco', 'precio maquina']);
// Cada cifra dicha tiene que salir del catálogo: un precio, un precio × piezas, o el total de lo que lleva.
const permitido = (r, x) => valido.has(x) || productos.some((p) => [1, 2, 3, 4, 5, 6, 10, 12].some((k) => Math.abs(p.p * k - x) < 0.01))
  || Math.abs((r.estado.carrito || []).reduce((t, [id, k]) => t + productos.find((p) => p.id === id).p * k, 0) - x) < 0.01;
const inventados = todas.flatMap((r) => precios(r.texto || '').filter((x) => !permitido(r, x)));
ok('ningún precio dicho en toda la charla está fuera del catálogo', !inventados.length, inventados.join(', '));

console.log('\n· Armar el pedido');
const pedido = charla(['hola', 'quiero cera', '1', '3', 'y 2 navajas derby', '¿cuánto llevo?', 'es todo']);
ok('«quiero cera» ofrece opciones numeradas', /1\. Cera/.test(pedido[1].texto) && pedido[1].estado.opciones.length === 3, pedido[1].texto);
ok('«1» elige la primera y pregunta cuántas', /Cuántas/.test(pedido[2].texto) && pedido[2].estado.foco === pedido[1].estado.opciones[0], pedido[2].texto);
ok('«3» la agrega', pedido[3].estado.carrito.some(([id, n]) => id === pedido[1].estado.opciones[0] && n === 3), JSON.stringify(pedido[3].estado.carrito));
ok('«y 2 navajas derby» agrega 2 directo', pedido[4].estado.carrito.some(([id, n]) => id === 'n1' && n === 2), pedido[4].texto);
ok('el total cuadra: 3×289 + 2×165.5 = 1198', /\$1,198/.test(pedido[5].texto), pedido[5].texto);
ok('con 1198 el envío ya es gratis: no dice «te faltan»', !/Te faltan/.test(pedido[5].texto));
ok('«es todo» entrega el pedido para crearlo', pedido[6].accion === 'pedido' && pedido[6].pedido.renglones.length === 2 && pedido[6].pedido.total === 1198, JSON.stringify(pedido[6].pedido));
const tope = charla(['quiero 10 cera brillo']);
ok('pide 10 y quedan 3: pone 3 y lo dice', tope[0].estado.carrito[0]?.[1] === 3 && /Sólo me quedaban 3/.test(tope[0].texto), tope[0].texto);
const tope2 = charla(['quiero 3 cera brillo', 'quiero 1 cera brillo']);
ok('lo que ya llevas cuenta contra lo que queda', /Ya llevas las 3/.test(tope2[1].texto), tope2[1].texto);
const agot = charla(['quiero cera fibra suavecito']);
ok('agotado no entra al pedido', !agot[0].estado.carrito.length);
const quita = charla(['quiero 2 navajas', 'quita las navajas']);
ok('«quita las navajas» las saca', !quita[1].estado.carrito.length, quita[1].texto);
const faltan = charla(['quiero talco', 'cuanto llevo']);
ok('con $120 dice cuánto falta para el envío gratis', /Te faltan \$880/.test(faltan[1].texto), faltan[1].texto);

console.log('\n· Si no sabe, pasa a una persona');
const [h] = charla(['¿a qué hora abren?'], vacio);
ok('sin horario configurado: no lo inventa', /no lo tengo/.test(h.texto) && !/\d/.test(h.texto), h.texto);
const [h2] = charla(['¿a qué hora abren?']);
ok('con horario configurado lo dice', /lunes a sábado/.test(h2.texto));
const [pg] = charla(['¿aceptan transferencia?']);
ok('transferencia: da la CLABE configurada', /012180001234567895/.test(pg.texto) && /BBVA/.test(pg.texto), pg.texto);
ok('no dice que acepta tarjeta si no la acepta', !/tarjeta/.test(pg.texto));
const per = charla(['quiero hablar con una persona', 'hola?', '¿cuánto cuesta la cera?']);
ok('«persona» pasa la charla y avisa', per[0].accion === 'persona' && per[0].estado.conPersona);
ok('con la persona atendiendo, el bot se calla', per[1].texto === null && per[2].texto === null);
const confuso = charla(['asdf qwer', 'zxcv']);
ok('a la primera que no entiende, pregunta', !confuso[0].accion && /No te entendí/.test(confuso[0].texto));
ok('a la segunda, pasa a una persona', confuso[1].accion === 'persona');
const [fac] = charla(['necesito factura']);
ok('factura va con una persona (no la hace el bot)', fac.accion === 'persona');

console.log(`\n${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
