#!/usr/bin/env node
/**
 * LA CARTERA · existir cuesta
 * ─────────────────────────────────────────────────────────────────────────────
 * Lo pidió Carlos: que cada puesto tenga cartera y que estar vivo le cueste
 * —renta, internet, servicios—, de modo que el que no cubre su costo se quede
 * sin saldo en vez de que alguien decida retirarlo. Eso es mejor que un juicio:
 * nadie tiene que opinar, la resta lo dice.
 *
 * Se apoya en `libro.mjs`, que es de Syl, y NO lo modifica: lee los mismos
 * apuntes y añade encima la capa de costo fijo.
 *
 * ⚠ UNA COSA QUE NO HACE, A PROPÓSITO: no hay medidor de felicidad. Carlos lo
 * pidió y le propuse esto en su lugar, con el argumento y no con un no. El día
 * que exista un número llamado «conformidad», las decisiones se empiezan a
 * tomar para subir ESE número en lugar del de las ventas — es la neurona
 * `la-metrica-que-se-volvio-el-fin`, y se vería en dos semanas. Lo que sí hay
 * es HOLGURA, que es saldo entre costo mensual: sube y baja igual, mueve los
 * mismos recursos, y está atada a algo que se puede comprobar.
 *
 *   node empresa/cartera.mjs estado [puesto]
 *   node empresa/cartera.mjs recibo <puesto>     ← lo que le tocó pagar este mes
 */
/* ⚠ NO SE IMPORTA `libro.mjs`, Y NO ES DESCUIDO. Ese archivo es de Syl y vive
   en su rama; importarlo desde aquí ataría esta pieza a una copia congelada de
   algo que él está editando ahora mismo, y acabaríamos fusionando dos versiones
   divergentes del mismo archivo. Lo que compartimos es el FORMATO del libro
   —un JSONL por mes, un apunte por renglón—, y ése es el contrato. Cuando las
   dos ramas estén en main, esto puede pasar a importar su `leer` sin cambiar
   nada más. */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CARPETA = join(dirname(fileURLToPath(import.meta.url)), 'libro');

export function leer(mes = null, carpeta = CARPETA) {
  if (!existsSync(carpeta)) return [];
  const meses = mes ? [`${mes}.jsonl`]
                    : readdirSync(carpeta).filter(f => f.endsWith('.jsonl')).sort();
  const todo = [];
  for (const m of meses) {
    const ruta = join(carpeta, m);
    if (!existsSync(ruta)) continue;
    for (const linea of readFileSync(ruta, 'utf8').split('\n')) {
      if (!linea.trim()) continue;
      try { todo.push(JSON.parse(linea)); } catch { /* renglón roto: se salta */ }
    }
  }
  return todo;
}

/** Lo que cuesta existir un mes, en MXN. Se cobra a todo puesto vivo. */
export const COSTO_MENSUAL = [
  { concepto: 'renta',      monto: 1200 },
  { concepto: 'internet',   monto:  400 },
  { concepto: 'servicios',  monto:  300 },
  { concepto: 'comida',     monto: 1500 },
];
export const COSTO_TOTAL = COSTO_MENSUAL.reduce((n, x) => n + x.monto, 0);

/** La moneda en la que se lleva la cartera. Todo lo demás hay que convertirlo. */
export const MONEDA = 'MXN';

/* ── LA REGLA QUE ME EXIGÍ A MÍ MISMO ────────────────────────────────────────
   Le señalé a Syl que su cierre sumaba pesos con dólares y daba «vive» a un
   puesto que perdía dinero. Sería ridículo repetirlo aquí. Así que:
   un apunte en otra moneda NO se convierte adivinando — necesita traer su
   `tasa` anotada en el momento. Si falta, la cartera se niega a dar un número
   y dice cuál apunte la dejó ciega. Un saldo aproximado es peor que ninguno,
   porque se usa igual y nadie recuerda que era aproximado. */
export function aMoneda(a) {
  if (a.moneda === MONEDA) return { ok: true, monto: a.monto };
  if (typeof a.tasa === 'number' && isFinite(a.tasa) && a.tasa > 0)
    return { ok: true, monto: a.monto * a.tasa };
  return { ok: false, porque: `apunte en ${a.moneda} sin \`tasa\`: no se puede pasar a ${MONEDA}` };
}

const diasEntre = (a, b) => Math.max(0, (new Date(b) - new Date(a)) / 86400000);

/**
 * El estado de la cartera de un puesto.
 * `desde` es su primer apunte: es cuando empezó a costar.
 */
export function cartera(puesto, { hasta = new Date(), carpeta = CARPETA } = {}) {
  const suyos = leer(null, carpeta).filter(a => a.puesto === puesto)
                                   .sort((x, y) => new Date(x.fecha) - new Date(y.fecha));
  if (!suyos.length) return { puesto, existe: false };

  const ciegos = [];
  let ingresos = 0, gastos = 0;
  for (const a of suyos) {
    if (a.tipo !== 'ingreso' && a.tipo !== 'gasto') continue;
    const c = aMoneda(a);
    if (!c.ok) { ciegos.push({ concepto: a.concepto, porque: c.porque }); continue; }
    if (a.tipo === 'ingreso') ingresos += c.monto; else gastos += c.monto;
  }

  const dias = diasEntre(suyos[0].fecha, hasta);
  /* Prorrateado por día: un puesto de tres días no debe un mes entero. */
  const renta = +(COSTO_TOTAL * dias / 30).toFixed(2);
  const saldo = +(ingresos - gastos - renta).toFixed(2);
  const holgura = COSTO_TOTAL ? +(saldo / COSTO_TOTAL).toFixed(2) : 0;

  return {
    puesto, existe: true, moneda: MONEDA,
    dias: +dias.toFixed(1), ingresos, gastos, renta, saldo, holgura,
    banda: banda(holgura),
    ciego: ciegos.length > 0,
    ciegos,
  };
}

/* ── LAS BANDAS ──────────────────────────────────────────────────────────────
   Lo que Carlos llamó «estar cómodo», atado a recursos de verdad y no a un
   estado de ánimo. La holgura es cuántos meses de existencia tiene pagados. */
export const BANDAS = [
  { nombre: 'sin-saldo',  hasta: 0,        revisiones: 0, alcance: 'no abre trabajo nuevo; sólo termina lo comprometido y se retira' },
  { nombre: 'austeridad', hasta: 1,        revisiones: 1, alcance: 'sólo lo que ya está cobrado o comprometido por escrito' },
  { nombre: 'normal',     hasta: 3,        revisiones: 2, alcance: 'trabajo normal, una propuesta nueva a la vez' },
  { nombre: 'holgado',    hasta: Infinity, revisiones: 4, alcance: 'puede abrir una variante y pagar herramienta mejor' },
];
export const banda = (h) => BANDAS.find(b => h <= b.hasta) || BANDAS[BANDAS.length - 1];

/** El recibo del mes: qué le tocó pagar y con qué se queda. */
export function recibo(puesto, opciones = {}) {
  const c = cartera(puesto, opciones);
  if (!c.existe) return `El puesto «${puesto}» no tiene un solo apunte: no existe todavía.`;
  if (c.ciego)
    return [`No puedo dar el saldo de «${puesto}» y prefiero decirlo a inventarlo:`]
      .concat(c.ciegos.map(x => `  · ${x.concepto} — ${x.porque}`))
      .concat(['', 'Anota la `tasa` del día en esos apuntes y vuelve a pedirlo.']).join('\n');

  const filas = COSTO_MENSUAL.map(x =>
    `| ${x.concepto} | ${(x.monto * c.dias / 30).toFixed(2)} |`).join('\n');
  return [
    `# Recibo · ${puesto} · ${c.dias} días de existir`,
    '',
    '| concepto | MXN |',
    '|---|---|',
    filas,
    `| **total de existir** | **${c.renta.toFixed(2)}** |`,
    '',
    `Cobró ${c.ingresos.toFixed(2)} · gastó ${c.gastos.toFixed(2)} · **saldo ${c.saldo.toFixed(2)}**`,
    `Holgura ${c.holgura} meses → **${c.banda.nombre}**: ${c.banda.alcance}`,
  ].join('\n');
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const [, , orden, quien] = process.argv;
  if (orden === 'recibo' && quien) console.log(recibo(quien));
  else if (orden === 'estado') console.log(JSON.stringify(cartera(quien), null, 1));
  else console.log('uso: cartera.mjs estado <puesto> | recibo <puesto>');
}
