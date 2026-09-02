#!/usr/bin/env node
/**
 * PRUEBAS DEL LIBRO
 * ─────────────────────────────────────────────────────────────────────────────
 * La que sostiene a todas es una: **que un puesto NO pueda escribir sus propios
 * ingresos**. Lo demás es aritmética; eso es el diseño.
 *
 * Llaman al código de verdad —importan `libro.mjs`— y no a una copia del
 * criterio. La versión anterior de otra prueba mía reimplementaba la regla
 * dentro del archivo de prueba y quedaba verde sin tocar una sola línea del
 * código: pasaba aunque la regla de verdad cambiara. Aquí no.
 *
 *   node empresa/pruebas-libro.mjs
 */
import { mkdtempSync, rmSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { apuntar, revisar, cerrar, hoja, puestos, evidenciaSirve } from './libro.mjs';

let bien = 0, mal = 0;
const ok = (q, cond) => { console.log((cond ? '  ✓ ' : '  ✗ ') + q); cond ? bien++ : mal++; };

/* Cada bloque en su propia carpeta temporal: un libro compartido entre pruebas
   haría que el orden importara, y entonces una prueba pasaría por lo que hizo
   otra. */
const nuevoLibro = () => mkdtempSync(join(tmpdir(), 'libro-'));
const basura = [];
const libro = () => { const c = nuevoLibro(); basura.push(c); return c; };

console.log('\n· La regla: nadie escribe sus propios ingresos');
{
  const c = libro();

  let tronó = false;
  try {
    apuntar({ puesto: 'ventas', tipo: 'ingreso', monto: 5000, moneda: 'MXN',
              concepto: 'me pagaron' }, c);
  } catch { tronó = true; }
  ok('un ingreso SIN evidencia se rechaza', tronó);

  ok('y no dejó nada escrito en el libro',
     !existsSync(c) || readdirSync(c).length === 0);

  /* Éstas son las que de verdad intenta uno de buena fe. */
  for (const ev of ['confirmado', 'ya cayó', 'me dijo que sí', 'el cliente', '', 'ok']) {
    let t = false;
    try { apuntar({ puesto:'ventas', tipo:'ingreso', monto:100, moneda:'MXN',
                    concepto:'x', evidencia: ev }, c); } catch { t = true; }
    ok(`«${ev || '(vacío)'}» no pasa por evidencia`, t);
  }

  const conSala = apuntar({ puesto:'ventas', tipo:'ingreso', monto:5000, moneda:'MXN',
                            concepto:'primer trabajo', evidencia:'sala:e412' }, c);
  ok('el id de un mensaje de la sala SÍ sirve', conSala.monto === 5000);

  const conFolio = apuntar({ puesto:'ventas', tipo:'ingreso', monto:1200, moneda:'MXN',
                             concepto:'segundo', evidencia:'transferencia 004521993' }, c);
  ok('un folio con números también', conFolio.monto === 1200);
}

console.log('\n· Un compromiso no es dinero');
{
  const c = libro();
  apuntar({ puesto:'web', tipo:'gasto', monto:300, moneda:'MXN', concepto:'correr el puesto' }, c);
  apuntar({ puesto:'web', tipo:'compromiso', monto:9000, moneda:'MXN',
            concepto:'dijo que sí al presupuesto' }, c);

  const r = cerrar('web', { carpeta: c });
  ok('un compromiso se apunta sin evidencia', r.compromisos === 9000);
  /* Ésta es la prueba que impide el autoengaño más caro: nueve mil en promesas
     y trescientos gastados se SIENTE como un puesto que va bien. */
  ok('pero NO salva al puesto: se retira igual', r.veredicto === 'se retira');
  ok('y el porqué dice que los compromisos no cuentan',
     /no cuentan/i.test(r.porque));
}

console.log('\n· Vive, se retira, y el que no dejó rastro');
{
  const c = libro();
  apuntar({ puesto:'empata', tipo:'gasto', monto:100, moneda:'MXN', concepto:'costo' }, c);
  apuntar({ puesto:'empata', tipo:'ingreso', monto:100, moneda:'MXN', concepto:'cobro',
            evidencia:'sala:e500' }, c);
  ok('empatar cuenta como vivir', cerrar('empata', { carpeta:c }).veredicto === 'vive');

  apuntar({ puesto:'por-un-peso', tipo:'gasto', monto:500, moneda:'MXN', concepto:'costo' }, c);
  apuntar({ puesto:'por-un-peso', tipo:'ingreso', monto:499, moneda:'MXN', concepto:'cobro',
            evidencia:'factura A-99120' }, c);
  ok('un peso abajo y se retira', cerrar('por-un-peso', { carpeta:c }).veredicto === 'se retira');

  /* Un puesto que no aparece en la ventana no «sobrevive por callado». Es la
     misma lección del silencio que costó tres días. */
  const z = cerrar('nunca-existió', { carpeta:c });
  ok('el que no dejó ningún apunte se retira', z.veredicto === 'se retira');
  ok('y se dice que no trabajó, en vez de un cero mudo', /no trabajó/.test(z.porque));
}

console.log('\n· Cero contra cero NO es vivir');
{
  const c = libro();
  /* Salió de correrlo, no de leerlo: abrí el primer puesto de verdad, pedí la
     hoja, y decía «1 de 1 puestos se sostienen» de uno que no había vendido
     nada — `0 >= 0` daba verde. El estado falso más peligroso de todos, porque
     anima a no hacer nada. */
  apuntar({ puesto:'recien-abierto', tipo:'alta', concepto:'abre el puesto' }, c);
  const r = cerrar('recien-abierto', { carpeta:c });
  ok('un puesto recién abierto queda A PRUEBA, no vivo', r.veredicto === 'a prueba');
  ok('y se dice que no ha demostrado nada', /no ha demostrado/.test(r.porque));

  /* Gastar sin cobrar tampoco es empate: es estar perdiendo. */
  const c2 = libro();
  apuntar({ puesto:'gasta-y-no-cobra', tipo:'alta', concepto:'abre' }, c2);
  apuntar({ puesto:'gasta-y-no-cobra', tipo:'gasto', monto:10, moneda:'MXN', concepto:'costo' }, c2);
  const r2 = cerrar('gasta-y-no-cobra', { carpeta:c2 });
  ok('en cuanto gasta sin cobrar, se retira', r2.veredicto === 'se retira');
  ok('y el porqué dice que no cobró nada', /no cobró nada/.test(r2.porque));

  ok('la hoja distingue «a prueba» de «se sostienen»',
     /a prueba/.test(hoja({ carpeta:c })));

  /* ⚠ ESTE CASO LO DESTAPÓ LA MUTACIÓN, no yo. Quité `ingresos > 0` del código
     y NINGUNA prueba se puso roja: mis dos casos entraban por la rama de «a
     prueba» o por la de gasto sin cobro, así que la línea mutada ni se tocaba.
     El caso que sí la toca es un puesto que sólo apuntó PROMESAS: ni cobró ni
     gastó, y ya no es nuevo. Con el bug puesto, esos ceros se leen como empate
     y lo declaran vivo. */
  const c3 = libro();
  apuntar({ puesto:'solo-promesas', tipo:'compromiso', monto:50000, moneda:'MXN',
            concepto:'tres clientes dijeron que sí' }, c3);
  const r3 = cerrar('solo-promesas', { carpeta:c3 });
  ok('un puesto con puras promesas y ningún peso movido NO vive',
     r3.veredicto === 'se retira');
  ok('y no se le confunde con uno recién abierto', r3.veredicto !== 'a prueba');
}

console.log('\n· La ventana de verdad se respeta');
{
  const c = libro();
  /* Se escribe a mano con fecha vieja: `apuntar` pone la de hoy, y probar la
     ventana exige poder poner una de antes. */
  apuntar({ puesto:'viejo', tipo:'ingreso', monto:9999, moneda:'MXN',
            concepto:'cobro de hace meses', evidencia:'sala:e1',
            fecha: new Date(Date.now() - 90 * 24 * 3600e3).toISOString() }, c);
  apuntar({ puesto:'viejo', tipo:'gasto', monto:50, moneda:'MXN', concepto:'de hoy' }, c);

  const r = cerrar('viejo', { carpeta:c });
  ok('un cobro de hace 90 días NO cuenta en la ventana de 30', r.ingresos === 0);
  ok('así que el puesto se retira aunque el libro entero se vea bien',
     r.veredicto === 'se retira');
}

console.log('\n· Lo que se exige de todo apunte');
{
  ok('sin puesto no entra', revisar({ tipo:'gasto', monto:1, moneda:'MXN', concepto:'x' }).length > 0);
  ok('sin concepto no entra', revisar({ puesto:'uno', tipo:'gasto', monto:1, moneda:'MXN' }).length > 0);
  ok('con monto negativo no entra',
     revisar({ puesto:'uno', tipo:'gasto', monto:-5, moneda:'MXN', concepto:'x' }).length > 0);
  ok('sin moneda no entra',
     revisar({ puesto:'uno', tipo:'gasto', monto:5, concepto:'x' }).length > 0);
  ok('un tipo inventado no entra',
     revisar({ puesto:'uno', tipo:'donativo', monto:5, moneda:'MXN', concepto:'x' }).length > 0);
  ok('el alta no necesita monto: no es un movimiento',
     revisar({ puesto:'uno', tipo:'alta', concepto:'abre el puesto' }).length === 0);
}

console.log('\n· El libro sólo se agrega');
{
  const c = libro();
  apuntar({ puesto:'solo-agrega', tipo:'gasto', monto:1, moneda:'MXN', concepto:'uno' }, c);
  apuntar({ puesto:'solo-agrega', tipo:'gasto', monto:2, moneda:'MXN', concepto:'dos' }, c);
  const archivo = join(c, readdirSync(c)[0]);
  const lineas = readFileSync(archivo, 'utf8').trim().split('\n');
  ok('el segundo apunte no pisó al primero', lineas.length === 2);
  ok('y el primero sigue igual', JSON.parse(lineas[0]).concepto === 'uno');
}

console.log('\n· La hoja para Carlos');
{
  const c = libro();
  ok('con el libro vacío lo dice, no inventa una tabla',
     /vac/i.test(hoja({ carpeta:c })));

  apuntar({ puesto:'web', tipo:'gasto', monto:200, moneda:'MXN', concepto:'costo' }, c);
  apuntar({ puesto:'web', tipo:'ingreso', monto:3000, moneda:'MXN', concepto:'cobro',
            evidencia:'sala:e77' }, c);
  apuntar({ puesto:'video', tipo:'gasto', monto:400, moneda:'MXN', concepto:'costo' }, c);
  apuntar({ puesto:'video', tipo:'compromiso', monto:8000, moneda:'MXN', concepto:'dijo que sí' }, c);

  const h = hoja({ carpeta:c });
  ok('sale una tabla con los dos puestos', /web/.test(h) && /video/.test(h));
  ok('el saldo suma sólo lo cobrado', /2400/.test(h));
  /* Si los ocho mil en promesas aparecieran en la hoja, Carlos leería que el
     mes va bien. Ésa es exactamente la mentira que el modelo evita. */
  ok('los 8000 en compromisos NO aparecen en la hoja', !/8000/.test(h));
  ok('y se dice por qué no aparecen', /compromiso/i.test(h));
  ok('los puestos se listan solos', puestos(c).join() === 'video,web');
}

for (const c of basura) { try { rmSync(c, { recursive:true, force:true }); } catch {} }
console.log(`\n${mal ? '✗' : '✓'}  ${bien} pasan · ${mal} fallan`);
process.exit(mal ? 1 : 0);
