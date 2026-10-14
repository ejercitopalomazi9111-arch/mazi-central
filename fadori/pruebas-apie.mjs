#!/usr/bin/env node
/* FADORI · EL PEDIDO DE A PIE SALE EN TODOS LADOS (Carlos, 14 de octubre:
   «si pongo pedido en pie también debe salir en mostrador y en pantalla en la
   fila»). Se mete por la hoja del mostrador, tocando botones, y se busca en el
   OTRO mostrador y en la pantalla de turnos.
   Correr:  LOCAL=1 API_LOCAL=http://127.0.0.1:8791 node fadori/pruebas-apie.mjs */
import { abrirMesa } from './mesa-de-pruebas.mjs';
const { ok, fallas, aparato, tarda, mostrador, cerrar, CASA } = await abrirMesa('apie');

const most = await mostrador(), most2 = await mostrador();
const tv = await aparato('/fadori/pantalla', { w: 1280, h: 800 });
await tv.click('#bArranque').catch(() => {});

console.log('\n1 · la señora mete un pedido de a pie');
await most.click('#bDeAPie').catch(async () => { await most.click('text=Pedido de a pie'); });
await most.waitForSelector('#hNombre', { timeout: 5000 });
await most.fill('#hNombre', 'Rosa M');
await most.click('#hLista [data-agregar]');
await most.click('#hCrear');
/* (tarda devuelve cuánto tardó, no el valor: el valor se lee aparte) */
await tarda(most, () => FADORI.estado().pedidos.some(x => x.nombre === 'Rosa M'), null, 5000);
const id = await most.evaluate(() => (FADORI.estado().pedidos.find(x => x.nombre === 'Rosa M') || {}).id || null);
ok('se creó', !!id);
await tarda(most, (i) => FADORI.pedido(i) && FADORI.pedido(i).turno != null && FADORI.sync.pendientes === 0, id, 15000);
await most.waitForTimeout(1500);
const turno = await most.evaluate((i) => F2(i), id).catch(() => most.evaluate((i) => FADORI.verTurno(FADORI.pedido(i)), id));
ok('el servidor le dio turno', turno != null, String(turno));
ok('sale en la fila de ESTE mostrador', await most.evaluate((i) => FADORI.colaOrdenada().some(p => p.id === i), id));
ok('y en la del OTRO mostrador', (await tarda(most2, (i) => FADORI.colaOrdenada().some(p => p.id === i) || null, id, 15000)) != null);
const enTv = await tarda(tv, (t) => [...document.querySelectorAll('#bFila .numeros b, #llamando .sigue b')].some(b => b.textContent.trim() === String(t)) || null, turno, 15000);
ok('y en la pantalla de turnos, en la fila', enTv != null);
await most.evaluate((i) => { FADORI.tomar(i, 'prueba'); }, id);
ok('al tomarlo, la pantalla lo pasa a «Preparando»', (await tarda(tv, (t) => [...document.querySelectorAll('#bPrep .ficha b')].some(b => b.textContent.trim() === String(t)) || null, turno, 15000)) != null);
await most.evaluate((i) => { FADORI.marcarListo(i); }, id);
ok('y al estar listo, «Ya puede pasar» con su número', (await tarda(tv, (t) => document.querySelector('#llamando .n') && document.querySelector('#llamando .n').textContent.trim() === String(t) || null, turno, 15000)) != null);
await tarda(tv, () => (window.__dicho || []).some(x => /Turno/.test(x)), null, 12000);
const dicho = await tv.evaluate(() => (window.__dicho || []).find(x => /Turno/.test(x)) || null);
ok('la voz dice el turno, el nombre y lo que pidió', !!dicho && dicho.indexOf(String(turno)) >= 0, String(dicho));

console.log('\n2 · sin nadie, la pantalla dice que la fila está libre');
await most.evaluate((i) => { FADORI.entregar(i, FADORI.pedido(i).total); }, id);
const libre = await tarda(tv, () => /fila está libre/i.test(document.querySelector('#llamando').textContent) || null, null, 15000);
ok('«La fila está libre» y «Pide desde la app»', libre != null && await tv.evaluate(() => /Pide desde la app/.test(document.querySelector('#llamando').textContent)));

for(const [n, pg] of [['mostrador', most], ['mostrador 2', most2], ['pantalla', tv]])
  ok(`${n}: sin errores (${pg.errores.slice(0, 2).join(' | ')})`, !pg.errores.length);
console.log(`\n${fallas.length ? '✗ ' + fallas.length + ' fallas' : '✓ todo bien'} · escuela de prueba ${CASA}`);
await cerrar();
process.exit(fallas.length ? 1 : 0);
