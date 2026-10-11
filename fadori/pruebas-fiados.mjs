#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   FADORI · LOS FIADOS, por la pantalla y con varios aparatos (11 de octubre)
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «arregla el sistema de deudas». Esto lo usa como la cooperativa:
   cobra de menos en la hoja de cobro, ve Fiados, abona y perdona tocando
   botones, con DOS aparatos de mostrador a la vez y el teléfono del alumno.

   Correr:  LOCAL=1 API_LOCAL=http://127.0.0.1:8791 node fadori/pruebas-fiados.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import { abrirMesa } from './mesa-de-pruebas.mjs';
const { ok, fallas, aparato, tarda, mostrador, alumno, cerrar, CASA } = await abrirMesa('fiados');

const most = await mostrador(), most2 = await mostrador();
const ana = await alumno('Ana Pérez', '3B');
await ana.reload(); await ana.waitForFunction(() => window.FADORI && FADORI.yo());
const cod = await ana.evaluate(() => FADORI.yo().codigo);
const deudaEn = (pg) => pg.evaluate((c) => (FADORI.estado().alumnos[c] || {}).deuda || 0, cod);
const pedir = () => ana.evaluate(() => { const F = FADORI, d = F.productos(true).filter(p => p.disponible); return F.pedir(F.yo().codigo, [{ prod: d[0].id, cant: 1 }], {}).id; });
/* el mostrador lo toma, lo marca listo y abre la hoja de cobro, como la señora */
async function cobrar(pg, id, paga){
  await tarda(pg, (i) => !!FADORI.pedido(i) && FADORI.pedido(i).turno != null, id, 10000);
  await pg.evaluate((i) => { FADORI.tomar(i, 'prueba'); FADORI.marcarListo(i); }, id);
  await pg.click('[data-vista="despachar"]');
  await pg.click(`[data-cobrar="${id}"]`, { timeout: 10000 });
  await pg.fill('#hPago', String(paga));
  const txt = await pg.textContent('#hojitaC');
  await pg.click('#hCobrar');
  return txt;
}

console.log('\n1 · Cobrar de menos en la hoja de cobro');
const id1 = await pedir();
const total1 = await ana.evaluate((i) => FADORI.pedido(i).total, id1);
const hoja = await cobrar(most, id1, 0);
ok('la hoja dice cuánto queda a deber y a quién se le fía', /Queda a deber/.test(hoja) && /Se le fía a/.test(hoja) && /Ana/.test(hoja), hoja.slice(0, 160));
ok('el pedido queda entregado', await most.evaluate((i) => FADORI.pedido(i).estado === 'entregado', id1));
ok(`la deuda queda en Ana (${total1 / 100} pesos)`, (await deudaEn(most)) === total1);
await most.click('[data-vista="deudas"]');
ok('«Fiados» la enseña con su monto', /Ana Pérez/.test(await most.textContent('#listaDeudas')));
ok('el OTRO mostrador también la ve', (await tarda(most2, (c) => (FADORI.estado().alumnos[c] || {}).deuda > 0, cod, 10000)) != null);
ok('y Ana la ve en su teléfono', (await tarda(ana, (t) => (FADORI.yo() || {}).deuda === t, total1, 10000)) != null);

console.log('\n2 · El límite');
const limite = await most.evaluate(() => FADORI.estado().config.limiteDeuda);
const id2 = await pedir(); await cobrar(most, id2, 0);
const deuda2 = await deudaEn(most);
await tarda(ana, (t) => (FADORI.yo() || {}).deuda === t, deuda2, 10000);
ok(`con ${deuda2 / 100} pesos (límite ${limite / 100}) la app ya no deja pedir`, deuda2 < limite || await ana.evaluate(() => !FADORI.puedePedir(FADORI.yo().codigo).puede));
/* a la mala: se le borra la deuda SÓLO en su teléfono para que la app lo deje pedir */
const id3 = await ana.evaluate(() => { const F = FADORI, c = F.yo().codigo; F.estado().alumnos[c].deuda = 0; const d = F.productos(true).filter(p => p.disponible); return F.pedir(c, [{ prod: d[0].id, cant: 1 }], {}).id; });
const rech = await tarda(ana, (i) => { const p = FADORI.pedido(i); return p && p.estado === 'cancelado' && p.rechazo ? p.rechazo : null; }, id3, 12000);
ok('y si se lo brinca, el servidor lo rechaza por la deuda', rech != null && await ana.evaluate((i) => /deuda/.test(FADORI.pedido(i).rechazo || ''), id3), String(rech));

console.log('\n3 · Abonar y perdonar tocando los botones');
await most.click('[data-vista="deudas"]');
await most.click(`[data-abonar="${cod}"]`);
await most.fill('#p2Campo', '20'); await most.click('#p2Si');
ok('abonar 20 pesos baja la deuda 20', (await deudaEn(most)) === deuda2 - 2000);
ok('Ana ve la deuda nueva', (await tarda(ana, (t) => (FADORI.yo() || {}).deuda === t, deuda2 - 2000, 10000)) != null);
ok('y el otro mostrador también', (await tarda(most2, ([c, t]) => (FADORI.estado().alumnos[c] || {}).deuda === t, [cod, deuda2 - 2000], 10000)) != null);

console.log('\n4 · Dos mostradores a la vez (la tablet fía mientras el teléfono abona)');
await most.waitForTimeout(1500);
const antes = await deudaEn(most);
/* sin red los dos al mismo tiempo: cada uno cambia la deuda sin ver al otro */
const ctx1 = most.context(), ctx2 = most2.context();
await ctx1.setOffline(true); await ctx2.setOffline(true);
await most.evaluate((c) => FADORI.ajustarDeuda(c, FADORI.estado().alumnos[c].deuda + 4500, 'fiado a mano'), cod);
await most2.evaluate((c) => FADORI.abonar(c, 1000), cod);
await ctx1.setOffline(false); await ctx2.setOffline(false);
const esperada = antes + 4500 - 1000;
const final = await tarda(most, ([c, e]) => (FADORI.estado().alumnos[c] || {}).deuda === e, [cod, esperada], 20000);
ok(`se suman los dos movimientos: ${antes / 100} + 45 − 10 = ${esperada / 100} (quedó ${(await deudaEn(most)) / 100} en uno y ${(await deudaEn(most2)) / 100} en el otro)`, final != null && (await tarda(most2, ([c, e]) => (FADORI.estado().alumnos[c] || {}).deuda === e, [cod, esperada], 20000)) != null);

console.log('\n5 · Perdonar');
await most.click('[data-vista="despachar"]').catch(() => {}); await most.click('[data-vista="deudas"]');
await most.click(`[data-perdonar="${cod}"]`); await most.click('#p2Si');
ok('perdonar la deja en cero', (await deudaEn(most)) === 0);
ok('y desaparece de «Fiados»', /Nadie debe nada/.test(await most.textContent('#listaDeudas')));
ok('Ana ve que ya no debe', (await tarda(ana, () => (FADORI.yo() || {}).deuda === 0, null, 10000)) != null);

for(const [n, pg] of [['mostrador', most], ['mostrador 2', most2], ['Ana', ana]])
  ok(`${n}: sin errores (${pg.errores.slice(0, 2).join(' | ')})`, !pg.errores.length);
console.log(`\n${fallas.length ? '✗ ' + fallas.length + ' fallas' : '✓ todo bien'} · escuela de prueba ${CASA}`);
await cerrar();
process.exit(fallas.length ? 1 : 0);
