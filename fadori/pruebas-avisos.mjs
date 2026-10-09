#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   FADORI · LOS AVISOS, como los pidió Carlos:
     «activa alertas sonoras y visuales en el sitio web tmb así como las
      notificaciones habituales del teléfono»
     «al entregar los pedidos o al haber cambios en posición de la fila
      deberían salirme los cambios en los mi turno de los alumnos»

   Varios aparatos en un navegador de verdad. Se comprueba el EFECTO: que el
   letrero salga con su texto y que suene (se cuentan las notas que pide el
   audio), no que exista la función.

   Correr:  LOCAL=1 API_LOCAL=http://127.0.0.1:8791 node fadori/pruebas-avisos.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import { abrirMesa } from './mesa-de-pruebas.mjs';
const { ok, fallas, aparato, tarda, mostrador, alumno, cerrar } = await abrirMesa('avisos');

/* cuenta las notas que se tocan, sin altavoz */
const oido = (pg) => pg.evaluate(() => {
  window.__notas = 0;
  const AC = window.AudioContext || window.webkitAudioContext;
  const orig = AC.prototype.createOscillator;
  AC.prototype.createOscillator = function(){ window.__notas++; return orig.call(this); };
});
const letrero = (pg) => pg.evaluate(() => { const n = document.getElementById('fadoriAlerta'); return n && /\bsale\b/.test(n.className) ? n.textContent : ''; });
const esperaLetrero = async (pg, re, max = 12000) => {
  const t0 = Date.now();
  while(Date.now() - t0 < max){ const t = await letrero(pg); if(re.test(t)) return t; await pg.waitForTimeout(150); }
  return await letrero(pg);
};
const pedir = (pg) => pg.evaluate(() => {
  const F = FADORI, yo = F.yo(), disp = F.productos(true).filter(p => p.disponible);
  return F.pedir(yo.codigo, [{ prod: disp[0].id, cant: 1 }], {}).id;
});

const most = await mostrador();
await oido(most);
await most.waitForTimeout(4500);   /* que el vigilante tome su primera nota */

console.log('\n1 · al mostrador le suena el pedido nuevo');
const a = await alumno('Ana P', '3B');
const b = await alumno('Beto R', '3B');
for(const pg of [a, b]){ await pg.reload(); await pg.waitForFunction(() => window.FADORI && FADORI.estadoSync().modo === 'enlinea', null, { timeout: 20000 }).catch(() => {}); }
await oido(a); await oido(b);
const idB = await pedir(b);
let t = await esperaLetrero(most, /Nuevo pedido/);
ok('sale el letrero «Nuevo pedido» en la tablet', /Nuevo pedido/.test(t), t);
ok('con el nombre de quien pidió', /Beto R/.test(t), t);
ok('y suena', await most.evaluate(() => window.__notas) > 0);

console.log('\n2 · al alumno le cambia la fila y se entera');
await b.waitForTimeout(500);
const idA = await pedir(a);
await tarda(most, id => !!FADORI.pedido(id), idA);
await a.click('[data-ir="turno"]');
await a.waitForTimeout(3500);   /* el vigilante de Ana ya vio que hay 1 antes */
const antesNotas = await a.evaluate(() => window.__notas);
await most.evaluate(id => { const F = FADORI; F.tomar(id, 'ana'); F.marcarListo(id); F.entregar(id, true); }, idB);
t = await esperaLetrero(a, /Eres el que sigue/);
ok('Ana: «Eres el que sigue» cuando entregan el de enfrente', /Eres el que sigue/.test(t), t);
ok('y le suena', await a.evaluate(() => window.__notas) > antesNotas);

console.log('\n3 · al alumno le avisan que ya está');
const n0 = await a.evaluate(() => window.__notas);
await most.evaluate(id => { const F = FADORI; F.tomar(id, 'ana'); F.marcarListo(id); }, idA);
t = await esperaLetrero(a, /ya está/);
ok('Ana: «¡Tu pedido ya está!»', /ya está/.test(t), t);
ok('con su turno', /Turno \d+/.test(t), t);
ok('suena con las tres notas de «listo»', await a.evaluate(() => window.__notas) - n0 >= 3);
ok('Beto (otro teléfono) NO recibe el aviso de Ana', !/ya está/.test(await letrero(b)) || /Turno/.test(await letrero(b)) === false);

console.log('\n4 · cancelar uno mismo no suena; que lo cancelen, sí');
await most.evaluate(id => FADORI.entregar(id, true), idA);
await tarda(a, id => FADORI.pedido(id) && FADORI.pedido(id).estado === 'entregado', idA);
const idA2 = await pedir(a);
await a.waitForTimeout(3500);
/* con el botón de verdad: «Hoy no puedo ir» → «Sí, cancélalo» */
await a.click('[data-ir="turno"]'); await a.waitForTimeout(400);
await a.click('#bNoPuedo'); await a.waitForSelector('#p2Si'); await a.click('#p2Si');
await a.waitForTimeout(3500);
ok('el alumno que cancela no recibe «se canceló»', !/se canceló/.test(await letrero(a)));
t = await esperaLetrero(most, /canceló/);
ok('la tablet sí se entera: «Turno N canceló»', /canceló/.test(t), t);

console.log('\n5 · el sonido se apaga y la tarjeta de avisos dice en qué está');
await a.click('[data-ir="turno"]');
const tarjeta = await a.evaluate(() => { const c = document.querySelector('.donde-avisos'); return c ? c.textContent : ''; });
ok('Mi turno trae la tarjeta de avisos', /avis/i.test(tarjeta), tarjeta.slice(0, 80));
await a.evaluate(() => document.querySelector('[data-avisos="sonido"]').click());
const n1 = await a.evaluate(() => window.__notas);
await a.evaluate(() => FADORI.avisos.sonar('listo'));
ok('con «Sonido apagado» ya no suena', await a.evaluate(() => window.__notas) === n1);
ok('y el botón lo dice', /apagado/.test(await a.evaluate(() => document.querySelector('[data-avisos="sonido"]').textContent)));
await a.evaluate(() => document.querySelector('[data-avisos="sonido"]').click());

/* el iPhone sin «Agregar a inicio» no tiene Notification: se le explica */
const ip = await a.evaluate(() => {
  const real = window.Notification; try{ delete window.Notification; }catch(e){}
  Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)', configurable: true });
  const e = FADORI.avisos.estado(); if(real) window.Notification = real; return e;
});
ok('en iPhone sin la app en inicio dice «agrégala a tu inicio»', ip === 'instalar', ip);

console.log('\n6 · ni un error de consola');
for(const [n, pg] of [['mostrador', most], ['Ana', a], ['Beto', b]])
  ok('sin errores en ' + n, !pg.errores.length, pg.errores.join(' | '));

await cerrar();
console.log(`\n${fallas.length ? '✗' : '✓'} avisos · ${fallas.length} fallas`);
process.exit(fallas.length ? 1 : 0);
