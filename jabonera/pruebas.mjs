/* Las pruebas del motor de Jabonera.
 *
 * Están escritas contra LAS CINCO TRAMPAS que el motor documenta arriba, no
 * contra lo que yo creo que hace el código. Es la diferencia entre comprobar
 * que el programa hace lo que hace y comprobar que hace lo que debe.
 *
 *   node jabonera/pruebas.mjs
 */
import { createRequire } from 'node:module';
const M = createRequire(import.meta.url)('./motor.js');

let bien = 0, mal = 0;
const ok = (que, cond, detalle='') => {
  if(cond){ bien++; console.log('  ✓ ' + que); }
  else { mal++; console.log('  ✗ ' + que + (detalle ? '\n      → ' + detalle : '')); }
};
const casi = (a, b, tol=1e-6) => Math.abs(a - b) < tol;
const T = (d, h=8, m=0) => new Date(2026, 0, d, h, m).getTime();

const LIQ = { id:'p1', nombre:'Jabón líquido', tipo:'liquido', tamanoEnvase:5000, marca:'X' };
const SOL = { id:'p2', nombre:'Jabón en barra', tipo:'solido', tamanoEnvase:1200,
              gramosPorPieza:100, marca:'X' };
const B1  = { id:'b1', nombre:'Baño A · planta baja', alumnos:120 };
const B2  = { id:'b2', nombre:'Baño B · planta alta', alumnos:80 };
const B3  = { id:'b3', nombre:'Baño C · sin datos',   alumnos:40 };
const v = (banoId, productoId, dia, restante, repuesto, hora=8) =>
  ({ id:`v${dia}${banoId}${hora}`, ts:T(dia,hora), banoId, productoId, restante, repuesto });

console.log('\n══ TRAMPA 1 · el consumo es una resta, no una medición ══');
{
  /* Lunes: quedaban 200, se repusieron 800 → adentro hay 1000.
     Martes: quedan 350 → se gastaron 650. */
  const ints = M.intervalos([ v('b1','p1',5,200,800), v('b1','p1',6,350,0) ]);
  ok('un intervalo entre dos visitas', ints.length === 1, `dio ${ints.length}`);
  ok('consumo = (restante + repuesto) − restante siguiente = 650',
     casi(ints[0].consumo, 650), `dio ${ints[0]?.consumo}`);
  ok('una sola visita NO produce consumo (con un punto no hay resta)',
     M.intervalos([ v('b1','p1',5,200,800) ]).length === 0);
  ok('visitas de baños distintos no se restan entre sí',
     M.intervalos([ v('b1','p1',5,900,0), v('b2','p1',6,100,0) ]).length === 0);
}

console.log('\n══ TRAMPA 1b · el hueco NO se esconde ══');
{
  /* Quedaban 100, nadie apuntó recarga, y al día siguiente hay 900:
     apareció jabón de la nada. Eso es un HUECO, no un consumo negativo. */
  const ints = M.intervalos([ v('b1','p1',5,100,0), v('b1','p1',6,900,0) ]);
  ok('consumo imposible se cuenta como 0, no como negativo',
     ints[0].consumo === 0, `dio ${ints[0].consumo}`);
  ok('y queda marcado como hueco de 800', casi(ints[0].hueco, 800), `dio ${ints[0].hueco}`);
  const c = M.calidad([v('b1','p1',5,100,0), v('b1','p1',6,900,0)], ints, [B1]);
  ok('la calidad del informe lo denuncia', c.huecos === 1 && casi(c.huecoTotal, 800));
}

console.log('\n══ TRAMPA 2 · líquido y sólido no se suman ══');
{
  ok('mL se guarda tal cual', M.aCanonica(500,'mL',LIQ) === 500);
  ok('L se guarda en mL', M.aCanonica(5,'L',LIQ) === 5000);
  ok('kg se guarda en gramos', M.aCanonica(1.2,'kg',SOL) === 1200);
  ok('3 barras de 100 g son 300 g', M.aCanonica(3,'pz',SOL) === 300);
  ok('sin peso de barra, PIEZAS no se puede convertir y da 0 (no adivina)',
     M.aCanonica(3,'pz',{ tipo:'solido' }) === 0);
  ok('gramos → barras sólo para mostrar', casi(M.enPiezas(250, SOL), 2.5));
  ok('sin peso de barra no hay conversión a piezas', M.enPiezas(250, {}) === null);

  const est = {
    banos:[B1], productos:[LIQ,SOL], dispensador:{},
    entregas:[],
    visitas:[ v('b1','p1',5,0,1000), v('b1','p1',6,400,0),
              v('b1','p2',5,0,600),  v('b1','p2',6,200,0) ],
  };
  const inf = M.informe(est);
  const liq = inf.porProducto.find(x => x.producto.id === 'p1');
  const sol = inf.porProducto.find(x => x.producto.id === 'p2');
  ok('el informe separa los dos productos', inf.porProducto.length === 2);
  ok('líquido: 600 mL', casi(liq.consumo,600) && liq.unidad === 'mL', `${liq.consumo} ${liq.unidad}`);
  ok('sólido: 400 g = 4 barras', casi(sol.consumo,400) && casi(sol.piezas,4) && sol.unidad === 'g');
  ok('el líquido no reporta piezas', liq.piezas === null);
}

console.log('\n══ TRAMPA 3 · un intervalo no cabe en un día ══');
{
  /* Del día 5 a las 00:00 al día 9 a las 00:00: cuatro días redondos. */
  const limpio = M.intervalos([ v('b1','p1',5,400,0,0), v('b1','p1',9,0,0,0) ]);
  const dl = M.porDia(limpio);
  ok('cuatro días redondos tocan cuatro días', dl.length === 4, `dio ${dl.length}: ${dl.map(d=>d.dia)}`);
  ok('y el reparto es de 100 por día',
     dl.every(d => casi(d.consumo, 100)), dl.map(d=>d.consumo.toFixed(1)).join(', '));

  /* Y ahora el caso de verdad, que es el que se da: de las 08:00 del día 5 a
     las 08:00 del 9 son 96 h que caen sobre CINCO días de calendario. El día
     5 recibe 16 h de 96 (=66.67) y el día 9 recibe 8 (=33.33). Cargarle los
     400 a un solo día, o repartirlos a partes iguales entre cinco, serían
     las dos formas fáciles de mentir. */
  const ints = M.intervalos([ v('b1','p1',5,400,0), v('b1','p1',9,0,0) ]);
  const dias = M.porDia(ints);
  ok('96 h desde las 08:00 tocan CINCO días de calendario, no cuatro',
     dias.length === 5, `dio ${dias.length}: ${dias.map(d=>d.dia)}`);
  ok('los días parciales reciben su fracción exacta: 66.67 y 33.33 en las puntas',
     casi(dias[0].consumo, 400*16/96, 1e-9) && casi(dias[4].consumo, 400*8/96, 1e-9),
     dias.map(d=>d.consumo.toFixed(2)).join(', '));
  ok('y los tres días completos de en medio reciben 100 cada uno',
     dias.slice(1,4).every(d => casi(d.consumo, 100)));
  ok('el total repartido es exactamente el consumido',
     casi(dias.reduce((s,d)=>s+d.consumo,0), 400));
  const sem = M.porDiaSemana(ints);
  ok('la semana también reparte y suma 400', casi(sem.reduce((s,d)=>s+d.consumo,0), 400));
}

console.log('\n══ TRAMPA 2b · la semana y la hora hablan de UN producto ══');
{
  /* ⚠ ESTO YA ESTUVO MAL EN LA PANTALLA. Las gráficas «por día de la semana»
     y «a qué hora» sumaban los mL del líquido con los gramos de la barra en
     la misma barra. El eje quedaba en una unidad que no existe: se ve muy
     bien y no significa nada. */
  const est = { banos:[B1], productos:[LIQ,SOL], entregas:[], dispensador:{},
    /* El mismo día y con 4 h de diferencia: así el intervalo también sirve
       para el perfil por hora, que descarta todo lo que pase de 12 h. */
    visitas:[ v('b1','p1',5,1000,0,8), v('b1','p1',5,0,0,12),      /* 1000 mL */
              v('b1','p2',5,300,0,8),  v('b1','p2',5,0,0,12) ] };  /*  300 g  */
  const inf = M.informe(est);
  ok('el informe declara cuál es el producto principal',
     inf.principal && inf.principal.producto.id === 'p1', `dio ${inf.principal?.producto?.id}`);
  ok('la semana suma 1000 (sólo el líquido) y NO 1300 (líquido + barra)',
     casi(inf.semana.reduce((s,x)=>s+x.consumo,0), 1000),
     `dio ${inf.semana.reduce((s,x)=>s+x.consumo,0)} — 1300 sería mL sumados con gramos`);
  ok('el perfil por hora también, y sobre el mismo producto',
     casi(inf.hora.horas.reduce((s,x)=>s+x.consumo,0), 1000),
     `dio ${inf.hora.horas.reduce((s,x)=>s+x.consumo,0)}`);
  ok('el corte por DÍA sí sale separado por producto (ahí no hace falta elegir)',
     new Set(inf.dia.map(d=>d.productoId)).size === 2);
}

console.log('\n══ TRAMPA 4 · la hora sólo la saben los intervalos cortos ══');
{
  const cortos = M.intervalos([ v('b1','p1',5,300,0,8), v('b1','p1',5,100,0,12) ]);
  const largos = M.intervalos([ v('b2','p1',5,300,0,8), v('b2','p1',9,100,0,8) ]);
  const h1 = M.porHora(cortos);
  ok('un intervalo de 4 h sí cuenta para el perfil horario', h1.muestras === 1);
  ok('y su consumo cae entre las 8 y las 12',
     h1.horas.slice(8,12).reduce((s,x)=>s+x.consumo,0) > 190);
  const h2 = M.porHora([...cortos, ...largos]);
  ok('un intervalo de 4 DÍAS se descarta del perfil horario',
     h2.muestras === 1 && h2.descartados === 1, `muestras ${h2.muestras} descartados ${h2.descartados}`);
  ok('y el informe dice con cuántas muestras habla', typeof h2.muestras === 'number');
}

console.log('\n══ TRAMPA 5 · sin denominador no hay promedio ══');
{
  const ints = M.intervalos([ v('b1','p1',5,1200,0), v('b1','p1',7,0,0) ]);   /* 1200 en 2 días */
  ok('120 alumnos, 2 días, 1200 mL → 5 mL por alumno y día',
     casi(M.porAlumno(ints, B1), 5), `dio ${M.porAlumno(ints,B1)}`);
  ok('sin alumnos asignados devuelve null, NO cero',
     M.porAlumno(ints, { id:'b1', nombre:'x' }) === null);
  ok('con alumnos pero sin intervalos, también null',
     M.porAlumno([], B1) === null);

  ok('sin entregas no hay precio: null, no $0',
     M.costoPorUnidad('p1', [], [LIQ]) === null);
  const entregas = [
    { id:'e1', ts:T(1), productoId:'p1', envases:4, costoTotal:300 },   /* 20 L → $300 */
    { id:'e2', ts:T(2), productoId:'p1', envases:1, costoTotal:100 },   /*  5 L → $100 */
  ];
  ok('el costo es promedio PONDERADO, no el último precio: $400 / 25 000 mL',
     casi(M.costoPorUnidad('p1', entregas, [LIQ]), 400/25000),
     `dio ${M.costoPorUnidad('p1', entregas, [LIQ])} · el último precio daría ${100/5000}`);

  const din = M.dinero(ints, [LIQ], entregas);
  ok('gasto de 1200 mL a $0.016/mL = $19.20', casi(din.gasto, 1200*400/25000));
  ok('lo invertido son los $400 de las entregas', casi(din.invertido, 400));
  const sinPrecio = M.dinero(ints, [LIQ], []);
  ok('sin entregas el gasto es DESCONOCIDO (null), no cero', sinPrecio.gasto === null);
  ok('y se reporta cuánto consumo se quedó sin precio', casi(sinPrecio.consumoSinPrecio, 1200));
}

console.log('\n══ EXISTENCIAS · el almacén y el dispensador son dos preguntas ══');
{
  const entregas = [{ id:'e1', ts:T(1), productoId:'p1', envases:4, costoTotal:300 }]; /* 20 000 mL */
  const visitas  = [ v('b1','p1',5,0,3000), v('b1','p1',6,1200,0) ];
  const ex = M.existencias([LIQ], entregas, visitas)[0];
  ok('entró 20 000 mL', casi(ex.entro, 20000));
  ok('salieron al baño 3 000 mL', casi(ex.salio, 3000));
  ok('en el almacén quedan 17 000 mL', casi(ex.almacen, 17000));
  ok('en los dispensadores hay 1 200 mL, y NO se cuentan en el almacén',
     casi(ex.enDispensadores, 1200));
  ok('proyección: 17 000 mL a 1 800/día ≈ 9.44 días',
     casi(M.proyeccion(17000, 1800), 17000/1800));
  ok('sin ritmo medido no se proyecta', M.proyeccion(17000, 0) === null);
}

console.log('\n══ EL DISPENSADOR MECÁNICO ══');
{
  ok('1 200 mL a 1.2 mL por pulsada = 1 000 lavadas',
     casi(M.lavados(1200, { dosisPorPulsada:1.2 }, LIQ), 1000));
  ok('sin dosis medida no se inventan lavadas', M.lavados(1200, {}, LIQ) === null);

  /* ⚠ ESTE FALLO ESTUVO EN VERDE. El motor dividía los GRAMOS de la barra
     entre los MILILITROS por pulsada del dispensador de líquido y devolvía
     «1 205 lavadas» sin pestañear. Ninguna prueba lo tocaba porque todas
     usaban producto líquido. Se vio mirando la salida de los datos demo. */
  ok('la barra NO usa la dosis del dispensador de líquido: sin su medida, null',
     M.lavados(1446, { dosisPorPulsada:1.2 }, SOL) === null,
     `dio ${M.lavados(1446, { dosisPorPulsada:1.2 }, SOL)} — gramos entre mL no es nada`);
  ok('con gramos por lavada medidos, la barra sí responde: 300 g a 0.6 g = 500 lavadas',
     casi(M.lavados(300, {}, { ...SOL, gramosPorLavada:0.6 }), 500));
  ok('y el informe usa la medida de CADA producto, no una sola para los dos',
     (() => {
       const est = { banos:[B1], productos:[LIQ,SOL], entregas:[],
         dispensador:{ dosisPorPulsada:1.2 },
         visitas:[ v('b1','p1',5,0,1200), v('b1','p1',6,0,0),
                   v('b1','p2',5,0,300),  v('b1','p2',6,0,0) ] };
       const inf = M.informe(est);
       const l = inf.porProducto.find(x=>x.producto.id==='p1');
       const s = inf.porProducto.find(x=>x.producto.id==='p2');
       return casi(l.lavados, 1000) && s.lavados === null;
     })());
  ok('20 000 mL en dispensadores de 1 L = 20 recargas',
     casi(M.recargasPosibles(20000, { capacidad:1000 }, LIQ), 20));
  /* ⚠ Se vio en la pantalla, no en una prueba: el almacén de barras está en
     GRAMOS y la capacidad del dispensador en MILILITROS, y salía «alcanza
     para 1.3 recargas». Un dispensador de bombeo no se recarga con barras. */
  ok('el jabón EN BARRA no se mide en recargas del dispensador de líquido',
     M.recargasPosibles(1329, { capacidad:1000 }, SOL) === null,
     `dio ${M.recargasPosibles(1329, { capacidad:1000 }, SOL)} — gramos entre mL otra vez`);
  ok('sin capacidad declarada tampoco se inventa',
     M.recargasPosibles(20000, {}, LIQ) === null);
}

console.log('\n══ HONESTIDAD DEL INFORME ══');
{
  const est = {
    banos:[B1,B2,B3], productos:[LIQ], dispensador:{ dosisPorPulsada:1.2, capacidad:1000 },
    entregas:[{ id:'e1', ts:T(1), productoId:'p1', envases:4, costoTotal:300 }],
    visitas:[ v('b1','p1',5,0,2000), v('b1','p1',6,1400,0), v('b2','p1',5,500,0) ],
  };
  const inf = M.informe(est);
  ok('nombra los baños SIN datos', inf.calidad.banosSinDatos.includes('Baño C · sin datos'));
  ok('nombra los baños con una sola visita (que aún no dicen nada)',
     inf.calidad.banosConUnaSolaVisita.includes('Baño B · planta alta'));
  ok('dice cuántos días reales tiene medidos', casi(inf.calidad.dias, 1));
  ok('con 1 intervalo y 1 día, declara que NO es suficiente', inf.calidad.suficiente === false);
  ok('y traduce el consumo a lavadas de manos',
     casi(inf.porProducto[0].lavados, 600/1.2), `dio ${inf.porProducto[0].lavados}`);
}

console.log(`\n${bien} bien · ${mal} mal\n`);
process.exit(mal ? 1 : 0);
