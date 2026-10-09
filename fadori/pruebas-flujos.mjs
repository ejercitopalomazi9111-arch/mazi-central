#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   FADORI · LOS FLUJOS QUE REPORTÓ CARLOS (9 de octubre, segunda ronda)
   ──────────────────────────────────────────────────────────────────────────
   Cada bloque es una frase suya convertida en prueba, con varios aparatos en
   un navegador de verdad y el servidor real (o el local, con API_LOCAL):

     «al hacer cambios de no había no se actualiza en mostrador»
     «el de fiados no sirve»
     «lo de volver a entrar con tu código»
     «al entregar o al haber cambios en la fila deberían salirme en Mi turno»
     «al pagar ya no debería poder decir hoy no voy»
     «al pagar o cancelar no debería salir el contenido del pedido»
     y registrar varios alumnos en el mismo teléfono.

   Correr:  LOCAL=1 API_LOCAL=http://127.0.0.1:8791 node fadori/pruebas-flujos.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import { abrirMesa } from './mesa-de-pruebas.mjs';
const { ok, fallas, aparato, tarda, mostrador, alumno, cerrar, CASA } = await abrirMesa('flujos');

const most = await mostrador();
ok('el mostrador entra y tiene su llave', await most.evaluate(() => !!FADORI.llaveMostrador()));
const pedir = (pg, prods) => pg.evaluate(ps => {
  const F = FADORI, yo = F.yo(), disp = F.productos(true).filter(p => p.disponible);
  return F.pedir(yo.codigo, ps.map(i => ({ prod: disp[i].id, cant: 1 })), {}).id;
}, prods);

/* ── 1 · lo que no había ─────────────────────────────────────────────── */
console.log('\n1 · «no había»: el alumno cambia y el mostrador lo puede marcar');
const a = await alumno('Ana P', '3B');
const idA = await pedir(a, [0, 1]);
await tarda(most, id => !!FADORI.pedido(id), idA);
// la señora, con sus botones: «Tomar este pedido» y «no hay» en el segundo renglón
await most.click('[data-vista="despachar"]');
await most.waitForSelector(`[data-tomar="${idA}"]`, { timeout: 8000 }).catch(() => {});
await most.click(`[data-tomar="${idA}"]`).catch(e => console.log('   (no se pudo tocar «Tomar»)', e.message.slice(0, 80)));
await most.waitForSelector(`[data-nohay="${idA}:1"]`, { timeout: 5000 }).catch(() => {});
await most.click(`[data-nohay="${idA}:1"]`).catch(e => console.log('   (no se pudo tocar «no hay»)', e.message.slice(0, 80)));
await most.waitForTimeout(400);
await most.click('#hNoHaySi').catch(e => console.log('   (no se pudo confirmar «no hay»)', e.message.slice(0, 80)));
let ms = await tarda(a, id => { const p = FADORI.pedido(id); return p && p.avisoFalta && p.renglones[1].sinSurtir; }, idA);
ok(`Ana se entera de que no había (${ms} ms)`, ms != null);
const nuevo = await a.evaluate(id => { const F = FADORI, p = F.pedido(id); const otro = F.enLugarDe(p.renglones[1].prod, 1)[0]; F.cambiarRenglon(id, 1, otro.id); return otro.id; }, idA);
ms = await tarda(most, ([id, pid]) => { const r = FADORI.pedido(id).renglones[1]; return r.prod === pid && !r.sinSurtir; }, [idA, nuevo]);
ok(`el mostrador ve lo que escogió en su lugar (${ms} ms)`, ms != null);
ms = await tarda(most, id => !!document.querySelector('[data-renglon="' + id + ':1"]'), idA, 6000);
ok(`y en la pantalla de despachar sale solo, como botón para marcarlo (${ms} ms)`, ms != null);
await most.click(`[data-renglon="${idA}:1"]`).catch(() => {});
ms = await tarda(a, id => FADORI.pedido(id).renglones[1].listo === true, idA);
ok(`marcarlo listo llega al teléfono de Ana (${ms} ms)`, ms != null);

/* ── 2 · fiados ─────────────────────────────────────────────────────── */
console.log('\n2 · fiados');
await most.evaluate(id => FADORI.marcarListo(id), idA);
const fiado = await most.evaluate(id => { try{ const p = FADORI.entregar(id, 0); return 'ok ' + (p && p.debio); }catch(e){ return 'error: ' + e.message; } }, idA);
ok(`entregar sin que pague lo apunta como fiado (${fiado})`, /^ok \d+/.test(fiado));
ms = await tarda(a, () => (FADORI.yo() || {}).deuda > 0);
ok(`Ana ve su deuda en su teléfono (${ms} ms)`, ms != null);
await most.reload(); await most.waitForTimeout(2500);
const pase = await most.$('#rPase');
if(pase && await pase.isVisible()){ await most.fill('#rPase', '1234'); await most.click('#rEntrar'); await most.waitForTimeout(2000); }
ok('tras recargar el mostrador, Ana sigue en la lista de fiados', await most.evaluate(() => {
  document.querySelector('[data-vista="deudas"]')?.click();
  return /Ana P/.test(document.getElementById('listaDeudas')?.textContent || '');
}));
ok('y los pedidos conservan el nombre (no «Sin nombre»)', await most.evaluate(id => FADORI.pedido(id).nombre === 'Ana P', idA));
// la tablet nueva (o la de siempre con la llave vencida): abre, carga como cualquiera, y LUEGO pone el pasador
const most2 = await aparato('/fadori/mostrador', { w: 1100, h: 800 });
await most2.waitForTimeout(2000);
await most2.fill('#rPase', '1234'); await most2.click('#rEntrar');
ms = await tarda(most2, () => { document.querySelector('[data-vista="deudas"]')?.click(); return /Ana P/.test(document.getElementById('listaDeudas')?.textContent || ''); }, null, 10000);
ok(`una tablet que entra con el pasador DESPUÉS de cargar ve los fiados (${ms} ms)`, ms != null);
ok('y los nombres de los pedidos', await most2.evaluate(id => (FADORI.pedido(id) || {}).nombre === 'Ana P', idA));
const abono = await most.evaluate(() => { const a = Object.values(FADORI.estado().alumnos).find(x => x.nombre === 'Ana P'); const antes = a.deuda; FADORI.abonar(a.codigo, 1000); return [antes, FADORI.estado().alumnos[a.codigo].deuda]; });
ok(`un abono baja la deuda (${abono[0]} → ${abono[1]})`, abono[1] === abono[0] - 1000);
ms = await tarda(a, d => (FADORI.yo() || {}).deuda === d, abono[1]);
ok(`y le llega a Ana (${ms} ms)`, ms != null);

/* ── 3 · volver a entrar con el código ──────────────────────────────── */
console.log('\n3 · volver a entrar con tu código desde otro teléfono');
const codA = await a.evaluate(() => FADORI.yo().codigo);
const d = await aparato('/fadori/');
await d.evaluate(() => { const s = document.getElementById('p-entrada'); if(s) s.hidden = false; });
await d.fill('#eCodigo', codA); await d.click('#bVolver');
ms = await tarda(d, () => FADORI.yo() && FADORI.yo().nombre === 'Ana P', null, 8000);
ok(`entra con el código por la pantalla (${ms} ms)`, ms != null);
ok('y trae su historial', await d.evaluate(() => FADORI.pedidosDe(FADORI.yo().codigo).length >= 1));

/* ── 4 · varios alumnos en un mismo teléfono ────────────────────────── */
console.log('\n4 · varios alumnos en el mismo teléfono (pruebas, hermanos)');
const t = await aparato('/fadori/');
let aceptados = 0;
for(let i = 1; i <= 8; i++){
  await t.evaluate(n => { FADORI.salir(); const al = FADORI.registrar('Prueba ' + n, '1A'); FADORI.aceptarTerminos(al.codigo); }, i);
  const id = await pedir(t, [0]);
  const turno = await tarda(t, i => { const p = FADORI.pedido(i); return p && (p.turno != null || p.estado === 'cancelado'); }, id, 6000);
  if(turno != null && await t.evaluate(i => FADORI.pedido(i).turno != null, id)) aceptados++;
}
ok(`8 alumnos registrados en un teléfono piden y les llega turno (${aceptados}/8)`, aceptados === 8);

/* ── 5 · Mi turno se mueve solo ─────────────────────────────────────── */
console.log('\n5 · Mi turno se mueve solo cuando avanza la fila');
const b1 = await alumno('Beto R', '2A'); const idB1 = await pedir(b1, [0]);
const c1 = await alumno('Caro S', '2A'); const idC1 = await pedir(c1, [0]);
await tarda(most, ids => ids.every(i => FADORI.pedido(i)), [idB1, idC1]);
await c1.evaluate(() => { const b = document.querySelector('[data-ir="turno"]') || [...document.querySelectorAll('button,a')].find(x => /Mi turno/i.test(x.textContent)); b && b.click(); });
await c1.waitForTimeout(800);
const antes = await c1.evaluate(() => document.getElementById('cajaTurno')?.textContent || '');
// la cooperativa despacha todo lo que va antes de Caro
await most.evaluate(idC => { for(const p of FADORI.colaOrdenada()){ if(p.id === idC) break; FADORI.tomar(p.id, 'S'); FADORI.marcarListo(p.id); FADORI.entregar(p.id, p.total); } }, idC1);
ms = await tarda(c1, a => { const t = document.getElementById('cajaTurno')?.textContent || ''; return t !== a && /sigue/i.test(t); }, antes);
ok(`la pantalla de Caro pasa sola a «eres el que sigue» (${ms} ms)`, ms != null, antes.replace(/\s+/g, ' ').slice(0, 80));
await most.evaluate(id => { FADORI.tomar(id, 'S'); FADORI.marcarListo(id); }, idC1);
ms = await tarda(c1, () => /Ve por él|listo/i.test(document.getElementById('cajaTurno')?.textContent || ''));
ok(`y a «ya está, ve por él» (${ms} ms)`, ms != null);
await most.evaluate(id => FADORI.entregar(id, FADORI.pedido(id).total), idC1);
ms = await tarda(c1, () => /Entregado/i.test(document.getElementById('cajaTurno')?.textContent || ''));
ok(`y a «entregado» (${ms} ms)`, ms != null);

/* ── 6 · pagado o cancelado: sin «hoy no puedo ir» y sin la lista abierta ─ */
console.log('\n6 · lo que ya se pagó o se canceló');
const vis = sel => c1.evaluate(s => { const e = document.querySelector(s); return !!e && !e.hidden && e.offsetParent !== null; }, sel);
ok('ya entregado y pagado: no sale «Hoy no puedo ir»', !(await vis('#bNoPuedo')));
ok('ni «Voy en camino»', !(await vis('#bEnCamino')));
ok('y lo que pidió va guardado en un desplegable cerrado', await c1.evaluate(() => { const d = document.querySelector('#p-turno details.lo-pedido'); return !!d && !d.open; }));

console.log('\n7 · pantallas sin errores');
for(const [n, pg] of [['mostrador', most], ['Ana', a], ['Ana en otro teléfono', d], ['teléfono de pruebas', t], ['Caro', c1]])
  ok(`${n}: sin errores (${pg.errores.slice(0, 2).join(' | ')})`, !pg.errores.length);

console.log(`\n${fallas.length ? '✗ ' + fallas.length + ' fallas' : '✓ todo bien'} · escuela de prueba ${CASA}`);
await cerrar();
process.exit(fallas.length ? 1 : 0);
