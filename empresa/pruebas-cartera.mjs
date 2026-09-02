/* Pruebas de la cartera.
     node empresa/pruebas-cartera.mjs
   Cada bloque termina con su MUTACIÓN: se rompe la regla a propósito y se
   exige que la prueba se ponga roja. Una prueba que nadie ha visto fallar no
   demuestra nada — es la lección que nos costó dos días y un artefacto viejo
   servido durante semanas. */
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cartera, recibo, aMoneda, banda, COSTO_TOTAL, BANDAS } from './cartera.mjs';

let bien = 0, mal = 0;
const ok = (que, cond, detalle = '') => {
  if (cond) { bien++; console.log('  ✓ ' + que); }
  else { mal++; console.log('  ✗ ' + que + (detalle ? '  → ' + detalle : '')); }
};

/* un libro de mentira, con las fechas puestas a mano */
function libroCon(apuntes) {
  const carpeta = mkdtempSync(join(tmpdir(), 'cartera-'));
  mkdirSync(carpeta, { recursive: true });
  const porMes = {};
  for (const a of apuntes) (porMes[a.fecha.slice(0, 7)] ??= []).push(a);
  for (const [mes, lista] of Object.entries(porMes))
    writeFileSync(join(carpeta, mes + '.jsonl'), lista.map(x => JSON.stringify(x)).join('\n') + '\n');
  return carpeta;
}
const dia = (n) => new Date(Date.UTC(2026, 8, n)).toISOString();

console.log('\n· Existir cuesta');
{
  const c = libroCon([
    { puesto: 'p', tipo: 'alta', concepto: 'abre', fecha: dia(1) },
  ]);
  const r = cartera('p', { carpeta: c, hasta: new Date(Date.UTC(2026, 9, 1)) });
  ok('un puesto que no vendió nada NO está en cero: debe la renta',
     r.saldo < 0, 'saldo ' + r.saldo);
  ok('30 días cuestan el mes completo',
     Math.abs(r.renta - COSTO_TOTAL) < 1, 'cobró ' + r.renta + ' de ' + COSTO_TOTAL);
  ok('y cae en la banda sin-saldo', r.banda.nombre === 'sin-saldo', r.banda.nombre);

  const r3 = cartera('p', { carpeta: c, hasta: new Date(Date.UTC(2026, 8, 4)) });
  ok('un puesto de 3 días no debe un mes entero',
     r3.renta < COSTO_TOTAL / 5, 'le cobró ' + r3.renta);
}

console.log('\n· La holgura mueve recursos de verdad');
{
  const c = libroCon([
    { puesto: 'q', tipo: 'alta', concepto: 'abre', fecha: dia(1) },
    { puesto: 'q', tipo: 'ingreso', concepto: 'un sitio', monto: 14000, moneda: 'MXN',
      evidencia: 'sala:e999', fecha: dia(2) },
  ]);
  const r = cartera('q', { carpeta: c, hasta: new Date(Date.UTC(2026, 8, 11)) });
  ok('quien cobró de sobra queda holgado', r.banda.nombre === 'holgado',
     r.banda.nombre + ' con holgura ' + r.holgura);
  ok('y holgado compra más revisiones que austeridad',
     banda(5).revisiones > banda(0.5).revisiones);
  /* ⚠ ESTA PRUEBA SE PUSO ROJA AL AÑADIR `a prueba`, Y TENÍA RAZÓN. La
     invariante que quería sostener es que LA ESCALERA DE ESCASEZ crece con la
     holgura: sin-saldo → austeridad → normal → holgado. `a prueba` no es un
     peldaño de esa escalera, es una excepción por edad que vive fuera de ella.
     Así que la prueba pasa a comprobar la escalera de verdad, y se le añade la
     que faltaba: que la excepción no se cuele en el orden. Corregir lo que la
     prueba DICE es legítimo; bajarle el listón para que se calle, no. */
  const escalera = BANDAS.filter(b => b.nombre !== 'a prueba');
  ok('la escalera de escasez va de menos a más y ninguna se salta',
     escalera.every((b, i) => i === 0 || b.revisiones >= escalera[i - 1].revisiones));
  ok('«a prueba» no es un peldaño: está fuera de la escalera',
     BANDAS[0].nombre === 'a prueba' && escalera.length === BANDAS.length - 1);
}

console.log('\n· Un puesto recién nacido no es un puesto fracasado');
{
  /* ⚠ ESTE CASO SALIÓ DE CORRER LA CARTERA CONTRA EL PRIMER PUESTO DE VERDAD,
     no de inventarme datos. `sitio-chico` tenía medio día de vida, cero ventas
     —normal— y salía en `sin-saldo`, o sea con el alcance de un moribundo. Los
     dos dan saldo negativo; lo que los separa es la ventana de 30 días que el
     modelo de Syl ya prometía y mi cartera no sabía leer. */
  const c = libroCon([{ puesto: 'nuevo', tipo: 'alta', concepto: 'abre', fecha: dia(1) }]);
  const bebe = cartera('nuevo', { carpeta: c, hasta: new Date(Date.UTC(2026, 8, 2)) });
  ok('con un día de vida y sin ventas queda «a prueba», no «sin-saldo»',
     bebe.banda.nombre === 'a prueba', 'quedó en ' + bebe.banda.nombre);
  ok('y a prueba sí puede trabajar: 2 revisiones, no 0',
     bebe.banda.revisiones === 2, 'le dieron ' + bebe.banda.revisiones);

  const viejo = cartera('nuevo', { carpeta: c, hasta: new Date(Date.UTC(2026, 9, 15)) });
  ok('pasada la ventana sin cobrar, ahí sí es «sin-saldo»',
     viejo.banda.nombre === 'sin-saldo', 'quedó en ' + viejo.banda.nombre);
  ok('MUTACIÓN: sin mirar los días, el recién nacido caería en sin-saldo',
     banda(bebe.holgura) .nombre === 'sin-saldo' && bebe.banda.nombre === 'a prueba',
     'la banda sin días dio ' + banda(bebe.holgura).nombre);
}

console.log('\n· No se adivina una conversión de moneda');
{
  const c = libroCon([
    { puesto: 'r', tipo: 'alta', concepto: 'abre', fecha: dia(1) },
    { puesto: 'r', tipo: 'ingreso', concepto: 'venta en dólares', monto: 400, moneda: 'USD',
      evidencia: 'sala:e998', fecha: dia(2) },
  ]);
  const r = cartera('r', { carpeta: c, hasta: new Date(Date.UTC(2026, 8, 11)) });
  ok('un ingreso en otra moneda SIN tasa deja la cartera ciega', r.ciego === true);
  ok('y el recibo lo dice en vez de inventar un saldo',
     /no puedo dar el saldo/i.test(recibo('r', { carpeta: c })));

  const c2 = libroCon([
    { puesto: 's', tipo: 'alta', concepto: 'abre', fecha: dia(1) },
    { puesto: 's', tipo: 'ingreso', concepto: 'venta en dólares', monto: 400, moneda: 'USD',
      tasa: 18.5, evidencia: 'sala:e998', fecha: dia(2) },
  ]);
  const r2 = cartera('s', { carpeta: c2, hasta: new Date(Date.UTC(2026, 8, 11)) });
  ok('con la tasa anotada sí calcula', r2.ciego === false && r2.ingresos === 7400,
     'ingresos ' + r2.ingresos);
}

console.log('\n· MUTACIONES · se rompe la regla y la prueba tiene que enrojecer');
{
  /* 1 · si `aMoneda` adivinara una tasa en vez de negarse */
  const adivinando = (a) => a.moneda === 'MXN' ? { ok: true, monto: a.monto }
                                               : { ok: true, monto: a.monto * 18 };
  const antes = aMoneda({ monto: 400, moneda: 'USD' });
  ok('MUTACIÓN: hoy `aMoneda` se NIEGA sin tasa; adivinando, no se notaría',
     antes.ok === false && adivinando({ monto: 400, moneda: 'USD' }).ok === true,
     'la de verdad devolvió ' + JSON.stringify(antes));

  /* 2 · si existir fuera gratis, un puesto sin ventas parecería sano */
  const c = libroCon([{ puesto: 'z', tipo: 'alta', concepto: 'abre', fecha: dia(1) }]);
  const real = cartera('z', { carpeta: c, hasta: new Date(Date.UTC(2026, 9, 1)) });
  const sinCosto = real.ingresos - real.gastos;   /* el saldo si la renta fuera 0 */
  ok('MUTACIÓN: con renta 0 el saldo daría 0 y parecería sano; con renta da negativo',
     sinCosto === 0 && real.saldo < 0,
     'saldo real ' + real.saldo + ' · sin costo ' + sinCosto);
}

console.log('\n' + bien + ' bien · ' + mal + ' mal');
process.exit(mal ? 1 : 0);
