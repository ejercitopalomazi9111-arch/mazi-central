#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   FADORI · CANCELAR UN PEDIDO (15 de octubre)
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «pon un botón para cancelar la orden con tiempo máximo desde que
   se realizó el pedido de 5 minutos y que cooperativa pueda cancelar un
   pedido desde su pantalla sin límite de tiempo».

   Se prueba tocando los botones, con el teléfono del alumno y el mostrador
   a la vez, y contra el servidor: el candado de los 5 minutos lo pone él,
   no sólo la pantalla.

   Correr:  LOCAL=1 API_LOCAL=http://127.0.0.1:8791 node fadori/pruebas-cancelar.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import { abrirMesa } from './mesa-de-pruebas.mjs';
const { ok, fallas, tarda, mostrador, alumno, cerrar } = await abrirMesa('cancelar');

const most = await mostrador();
const ana = await alumno('Ana Pérez', '3B');
await ana.reload(); await ana.waitForFunction(() => window.FADORI && FADORI.yo());
/* `atras` = cuántos minutos atrás se dice que se hizo el pedido (el servidor
   le cree hasta 10); así se prueba el plazo sin esperar 5 minutos de verdad */
const pedir = (atras = 0) => ana.evaluate((m) => {
  const F = FADORI, d = F.productos(true).filter(p => p.disponible), real = Date.now;
  Date.now = () => real() - m * 60000;          /* el reloj de este teléfono, atrasado SÓLO al pedir */
  try{ return F.pedir(F.yo().codigo, [{ prod: d[0].id, cant: 1 }], {}).id; } finally { Date.now = real; }
}, atras);
const enServidor = (pg, id, estado) => tarda(pg, ([i, e]) => { FADORI.cargar(); const p = FADORI.pedido(i); return p && p.estado === e ? true : null; }, [id, estado], 12000);
const verTurno = async () => { await ana.click('#pulgar [data-ir="turno"]'); await ana.waitForTimeout(400); };
const visible = (sel) => ana.evaluate((s) => { const e = document.querySelector(s); return !!e && !e.hidden && getComputedStyle(e).display !== 'none' && e.offsetWidth > 0; }, sel);

console.log('\n1 · El alumno cancela en los primeros 5 minutos');
const id1 = await pedir();
await tarda(ana, (i) => FADORI.pedido(i) && FADORI.pedido(i).turno != null, id1, 10000);
await verTurno();
ok('sale «Cancelar pedido»', await visible('#bNoPuedo'));
const plazo = await ana.textContent('#plazoCancelar');
ok('y cuánto tiempo le queda (5:00 o 4:xx)', /Puedes cancelar durante (5:00|4:\d\d) más/.test(plazo), plazo);
await ana.waitForTimeout(2100);
const plazo2 = await ana.textContent('#plazoCancelar');
ok('el reloj corre solo', plazo2 !== plazo, plazo + ' → ' + plazo2);
await ana.click('#bNoPuedo'); await ana.click('#p2Si');
ok('el pedido queda cancelado en su teléfono', await ana.evaluate((i) => FADORI.pedido(i).estado === 'cancelado', id1));
ok('y el mostrador lo ve cancelado (pasó por el servidor)', (await enServidor(most, id1, 'cancelado')) != null);

console.log('\n2 · Pasados los 5 minutos ya no');
const id2 = await pedir(6);
await tarda(ana, (i) => FADORI.pedido(i) && FADORI.pedido(i).turno != null, id2, 10000);
await verTurno();
ok('el botón ya no sale', !(await visible('#bNoPuedo')));
ok('ni el plazo', !(await visible('#plazoCancelar')));
ok('la app no lo deja cancelar', await ana.evaluate((i) => FADORI.cancelar(i, 'alumno') === null && FADORI.pedido(i).estado === 'en_cola', id2));
/* a la mala: se brinca la app y lo marca cancelado a mano */
await ana.evaluate((i) => FADORI.cancelar(i, 'a-la-mala'), id2);
await ana.waitForTimeout(4000);
ok('el servidor no lo acepta: para el mostrador sigue en la fila', await most.evaluate((i) => { FADORI.cargar(); return FADORI.pedido(i).estado === 'en_cola'; }, id2));
ok('y al teléfono le regresa a la fila', (await enServidor(ana, id2, 'en_cola')) != null);

console.log('\n3 · La cooperativa cancela cuando sea');
await enServidor(most, id2, 'en_cola');
await most.click('[data-vista="despachar"]');
await most.click(`#actual [data-tomar="${id2}"]`, { timeout: 10000 });
await most.click(`#actual [data-cancelar="${id2}"]`, { timeout: 10000 });
const pregunta = await most.textContent('#hojita2').catch(() => '');
ok('pregunta antes, con nombre y turno', /Ana/.test(pregunta) && /Turno/.test(pregunta), pregunta.slice(0, 120));
await most.click('#p2Si');
ok('un pedido de hace 6 min, ya en preparación, queda cancelado', await most.evaluate((i) => FADORI.pedido(i).estado === 'cancelado', id2));
ok('y le llega al alumno', (await enServidor(ana, id2, 'cancelado')) != null);

const id3 = await pedir(9);
await enServidor(most, id3, 'en_cola');
await most.evaluate((i) => { FADORI.tomar(i, 'prueba'); FADORI.marcarListo(i); }, id3);
await most.click('[data-vista="despachar"]'); await most.waitForTimeout(300);
await most.click(`#cola [data-cancelar="${id3}"]`, { timeout: 10000 }); await most.click('#p2Si');
ok('también uno que ya estaba listo, desde la lista', (await enServidor(ana, id3, 'cancelado')) != null);
ok('sin quitarle el turno de nadie más: la fila del mostrador queda vacía', await most.evaluate(() => FADORI.colaOrdenada().length === 0));

for(const [n, pg] of [['alumno', ana], ['mostrador', most]])
  ok(`${n}: sin errores (${pg.errores.slice(0, 2).join(' | ')})`, !pg.errores.length);
console.log(`\n${fallas.length ? '✗ ' + fallas.length + ' fallas' : '✓ todo bien'}`);
await cerrar();
process.exit(fallas.length ? 1 : 0);
