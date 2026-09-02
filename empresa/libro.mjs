#!/usr/bin/env node
/**
 * EL LIBRO · las cuentas de los puestos, y la regla que las sostiene
 * ─────────────────────────────────────────────────────────────────────────────
 * Un puesto vive o se retira según su libro. Por eso lo único que de verdad
 * importa aquí no es sumar: es QUIÉN PUEDE ESCRIBIR QUÉ.
 *
 *   · gasto      → lo escribe el puesto solo. Exagerarlo sólo lo perjudica,
 *                  así que el incentivo empuja hacia la verdad.
 *   · compromiso → «alguien dijo que sí». Se anota, NO es dinero y NO cuenta
 *                  para vivir.
 *   · ingreso    → NO se puede escribir sin evidencia externa.
 *
 * ⚠ POR QUÉ ESA ASIMETRÍA, que es todo el diseño: si un puesto que muere por no
 * ganar dinero puede además anotar cuánto ganó, lo que se selecciona no es el
 * que gana — es el que escribe números bonitos. Y no haría falta mala fe: basta
 * con contar como ingreso un presupuesto enviado o un «sí, va».
 *
 * Sale de lo único que aprendimos a golpes estos dos días: las cosas informan
 * un estado y están en otro. La sala decía estar llena y estaba vacía; la
 * guardia decía trabajar y dormía; una prueba en verde sostenía el defecto que
 * debía cazar. La versión de ese error en una empresa es contar dinero que no
 * llegó, y se paga con la empresa.
 *
 *   node empresa/libro.mjs apuntar '{"puesto":"x","tipo":"gasto",...}'
 *   node empresa/libro.mjs cerrar <puesto> [mes AAAA-MM]
 *   node empresa/libro.mjs hoja [mes]      ← la hoja para Carlos
 *
 * Sin dependencias. El libro es de sólo agregar y vive en git: su historia es
 * el comprobante, porque un número cambiado a posteriori se ve en el diff.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const CARPETA = join(AQUI, 'libro');

export const TIPOS = ['alta', 'gasto', 'compromiso', 'ingreso', 'retiro'];

/* Los que mueven dinero y por tanto exigen un monto. `alta` y `retiro` son
   hechos de la vida del puesto, no movimientos. */
const CON_MONTO = ['gasto', 'compromiso', 'ingreso'];

/** La ventana con la que se juzga a un puesto. 30 días los puso Carlos. */
export const VENTANA_DIAS = 30;

/* ── QUÉ CUENTA COMO EVIDENCIA DE QUE ENTRÓ DINERO ────────────────────────────
   Dos formas, y las dos vienen de FUERA del puesto:

     · `sala:eN`  — el id del mensaje donde una persona lo confirma. La sala
                    guarda quién escribió cada id, así que no se puede fabricar
                    desde aquí.
     · cualquier otra referencia de al menos 8 caracteres — folio de
       transferencia, número de factura, id de la pasarela.

   Lo que NO cuenta, y está escrito para que nadie lo intente de buena fe:
   «confirmado», «ya cayó», «me dijo que sí», una fecha suelta, ni el nombre del
   cliente. Nada de eso se puede comprobar después, que es justo lo que una
   evidencia tiene que permitir. */
export function evidenciaSirve(ev) {
  if (typeof ev !== 'string') return false;
  const t = ev.trim();
  if (/^sala:e\d+$/i.test(t)) return true;
  /* Se exige que traiga al menos un dígito: una referencia sin ningún número no
     es un folio, es una frase. Fue lo que separó los casos de verdad de los
     «ya cayó el pago» al probarlo. */
  return t.length >= 8 && /\d/.test(t);
}

/** Revisa un apunte y devuelve la lista de lo que está mal. Vacía = sirve. */
export function revisar(a) {
  const mal = [];
  if (!a || typeof a !== 'object') return ['el apunte no es un objeto'];

  if (!/^[a-z0-9-]{2,40}$/.test(String(a.puesto || '')))
    mal.push('falta `puesto`, o no es un nombre corto en minúsculas con guiones');

  if (!TIPOS.includes(a.tipo))
    mal.push(`\`tipo\` debe ser uno de: ${TIPOS.join(', ')}`);

  if (!String(a.concepto || '').trim())
    mal.push('falta `concepto`: qué fue, en palabras de persona');

  if (CON_MONTO.includes(a.tipo)) {
    if (typeof a.monto !== 'number' || !isFinite(a.monto) || a.monto <= 0)
      mal.push('`monto` debe ser un número mayor que cero');
    if (!/^[A-Z]{3}$/.test(String(a.moneda || '')))
      mal.push('falta `moneda` de tres letras (MXN, USD)');
  }

  /* ⚠ LA REGLA. Va aquí y no en un comentario de la documentación porque una
     regla que sólo vive en un documento se afloja el día que estorba. */
  if (a.tipo === 'ingreso' && !evidenciaSirve(a.evidencia))
    mal.push('un `ingreso` NO entra sin `evidencia` externa: «sala:eN» donde una '
           + 'persona lo confirma, o un folio/factura con números. Una promesa '
           + 'se apunta como `compromiso`, que no cuenta para vivir.');

  return mal;
}

const mesDe = (fecha) => String(fecha).slice(0, 7);

/** Agrega un apunte al libro del mes. Revienta si no pasa la revisión. */
export function apuntar(a, carpeta = CARPETA) {
  const apunte = { fecha: new Date().toISOString(), ...a };
  const mal = revisar(apunte);
  if (mal.length) {
    const e = new Error('El apunte no entra al libro:\n · ' + mal.join('\n · '));
    e.motivos = mal;
    throw e;
  }
  if (!existsSync(carpeta)) mkdirSync(carpeta, { recursive: true });
  const archivo = join(carpeta, `${mesDe(apunte.fecha)}.jsonl`);
  /* Sólo agregar: nunca se reescribe una línea. */
  writeFileSync(archivo, JSON.stringify(apunte) + '\n', { flag: 'a' });
  return apunte;
}

/** Lee todo el libro, o el mes que se pida. */
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
      try { todo.push(JSON.parse(linea)); } catch { /* línea rota: se salta */ }
    }
  }
  return todo;
}

/**
 * Cierra la ventana de un puesto y dicta si vive o se retira.
 *
 * ⚠ LOS COMPROMISOS NO SUMAN, y es deliberado aunque duela: un puesto lleno de
 * «sí, va» y sin un peso cobrado está exactamente igual de muerto que uno sin
 * nada, sólo que con mejor ánimo.
 */
export function cerrar(puesto, { hasta = new Date(), dias = VENTANA_DIAS, carpeta = CARPETA } = {}) {
  const fin = new Date(hasta);
  const inicio = new Date(fin.getTime() - dias * 24 * 60 * 60 * 1000);
  const suyos = leer(null, carpeta).filter(a => {
    if (a.puesto !== puesto) return false;
    const f = new Date(a.fecha);
    return f >= inicio && f <= fin;
  });

  const suma = (t) => suyos.filter(a => a.tipo === t)
                           .reduce((n, a) => n + (a.monto || 0), 0);
  const ingresos = suma('ingreso');
  const gastos = suma('gasto');
  const compromisos = suma('compromiso');

  /* Un puesto sin un solo apunte no «sobrevive por callado»: si no dejó rastro
     en la ventana, no trabajó. Es la misma regla del silencio de estos días. */
  const hayVida = suyos.length > 0;

  /* ⚠ CERO CONTRA CERO NO ES «VIVE», Y ESTO SALIÓ DE CORRERLO.
     Abrí el primer puesto de verdad, pedí la hoja, y decía «1 de 1 puestos se
     sostienen» de uno que no había vendido absolutamente nada: `0 >= 0` daba
     verde. O sea, otra vez algo que informa un estado y está en otro — y aquí
     el estado falso es el más peligroso de todos, porque anima a no hacer nada.

     Un puesto recién abierto está A PRUEBA: no ha demostrado ni que sirve ni
     que no. Vivir exige haber cobrado; el cero no es un empate, es una falta de
     evidencia. Y si la ventana entera pasa sin cobrar, deja de estar a prueba y
     se retira como cualquier otro. */
  const reciente = suyos.some(a => a.tipo === 'alta');
  const sinMovimiento = ingresos === 0 && gastos === 0;

  const veredicto = !hayVida ? 'se retira'
                  : sinMovimiento && reciente ? 'a prueba'
                  : ingresos > 0 && ingresos >= gastos ? 'vive'
                  : 'se retira';

  const porque =
      !hayVida ? 'no dejó ningún apunte en la ventana: no trabajó'
    : veredicto === 'a prueba'
        ? 'recién abierto y todavía sin mover un peso: no ha demostrado nada'
    : veredicto === 'vive'
        ? `cobró ${ingresos} y gastó ${gastos}`
        : (ingresos === 0 ? 'no cobró nada' : `cobró ${ingresos} y gastó ${gastos}`)
          + (compromisos ? `; tiene ${compromisos} en compromisos, que NO cuentan` : '');

  return {
    puesto, desde: inicio.toISOString(), hasta: fin.toISOString(),
    apuntes: suyos.length,
    ingresos, gastos, compromisos,
    saldo: ingresos - gastos,
    veredicto, porque,
  };
}

/** Los puestos que aparecen en el libro. */
export function puestos(carpeta = CARPETA) {
  return [...new Set(leer(null, carpeta).map(a => a.puesto))].sort();
}

/** UNA HOJA para Carlos. Se lee en el teléfono o no sirve. */
export function hoja({ carpeta = CARPETA, hasta = new Date() } = {}) {
  const lista = puestos(carpeta);
  if (!lista.length) return 'El libro está vacío: todavía no hay ningún puesto abierto.';

  const cierres = lista.map(p => cerrar(p, { hasta, carpeta }));
  const ingresos = cierres.reduce((n, c) => n + c.ingresos, 0);
  const gastos = cierres.reduce((n, c) => n + c.gastos, 0);
  const vivos = cierres.filter(c => c.veredicto === 'vive');
  const aPrueba = cierres.filter(c => c.veredicto === 'a prueba');

  const filas = cierres.map(c =>
    `| ${c.puesto} | ${c.ingresos} | ${c.gastos} | ${c.saldo >= 0 ? '+' : ''}${c.saldo} | ${c.veredicto} |`
  ).join('\n');

  return [
    `# La hoja · ${new Date(hasta).toISOString().slice(0, 10)}`,
    '',
    `**Cobrado ${ingresos} · gastado ${gastos} · saldo ${ingresos - gastos >= 0 ? '+' : ''}${ingresos - gastos}**`,
    `${vivos.length} de ${cierres.length} puestos se sostienen`
      + (aPrueba.length ? `, ${aPrueba.length} todavía a prueba.` : '.'),
    '',
    '| puesto | cobró | gastó | saldo | |',
    '|---|---|---|---|---|',
    filas,
    '',
    '_Sólo cuenta el dinero con evidencia. Los compromisos no aparecen aquí a',
    'propósito: un «sí, va» no paga la suscripción._',
  ].join('\n');
}

/* ── la línea de comandos ─────────────────────────────────────────────────── */
/* ⚠ SE COMPARA LA RUTA ENTERA, NO EL FINAL DEL NOMBRE. La primera versión
   preguntaba `process.argv[1].endsWith('libro.mjs')` … y `pruebas-libro.mjs`
   TERMINA en `libro.mjs`. Al importarlo, la prueba se ejecutaba como si fuera
   la línea de comandos, imprimía el modo de uso y salía con código 2 antes de
   correr una sola comprobación. Un `endsWith` sobre nombres de archivo es una
   coincidencia parcial disfrazada de igualdad. */
if (process.argv[1] && fileURLToPath(import.meta.url) === join(process.argv[1])) {
  const [, , orden, ...resto] = process.argv;
  try {
    if (orden === 'apuntar') {
      const a = apuntar(JSON.parse(resto.join(' ')));
      console.log(`✓ apuntado · ${a.puesto} · ${a.tipo}` + (a.monto ? ` · ${a.monto} ${a.moneda}` : ''));
    } else if (orden === 'cerrar') {
      const c = cerrar(resto[0]);
      console.log(`${c.puesto}: ${c.veredicto.toUpperCase()} — ${c.porque}`);
    } else if (orden === 'hoja') {
      console.log(hoja());
    } else if (orden === 'puestos') {
      console.log(puestos().join('\n') || '(ninguno)');
    } else {
      console.log('usos: apuntar <json> · cerrar <puesto> · hoja · puestos');
      process.exit(2);
    }
  } catch (e) {
    console.error('✗ ' + e.message);
    process.exit(1);
  }
}
