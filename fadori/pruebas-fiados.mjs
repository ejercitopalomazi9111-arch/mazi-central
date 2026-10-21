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

console.log('\n6 · El teclado del cobro (21 de octubre: «tipo calculadora, para no usar el teclado»)');
const id6 = await pedir();
const total6 = await ana.evaluate((i) => FADORI.pedido(i).total, id6);
await tarda(most, (i) => !!FADORI.pedido(i) && FADORI.pedido(i).turno != null, id6, 10000);
await most.evaluate((i) => { FADORI.tomar(i, 'prueba'); FADORI.marcarListo(i); }, id6);
await most.click('[data-vista="despachar"]');
await most.click(`[data-cobrar="${id6}"]`, { timeout: 10000 });
const pago = () => most.inputValue('#hPago');
const tecla = (t) => most.click(`#hCalc button:text-is("${t}")`);
ok('el campo no abre el teclado del sistema', (await most.getAttribute('#hPago', 'inputmode')) === 'none');
ok('trae puesto el total', parseFloat(await pago()) === total6 / 100, await pago());
await tecla('5'); await tecla('0');
ok('la primera tecla reemplaza el total (como calculadora): 5, 0 → 50', (await pago()) === '50', await pago());
ok('y la hoja recalcula el cambio', /Cambio|Pago exacto|Queda a deber/.test(await most.textContent('#hCambio')));
await tecla("C · borrar todo"); await tecla("$50"); await tecla('$20');
ok('dos billetes seguidos se suman: $50 + $20 = 70', (await pago()) === '70', await pago());
await tecla('Exacto');
ok('«Exacto» pone el total', parseFloat(await pago()) === total6 / 100 && /Pago exacto/.test(await most.textContent('#hCambio')));
await tecla("C · borrar todo");
ok('«C» lo deja vacío y la hoja dice que queda a deber todo', (await pago()) === '' && /Queda a deber/.test(await most.textContent('#hCambio')));
await most.click('#hCobrar');
ok('cobrar con $0 le fía todo a Ana', (await deudaEn(most)) === total6, await deudaEn(most));

console.log('\n7 · Fiado a mano (21 de octubre: «que el vendedor pueda poner a mano si alguien debe más»)');
await most.click('[data-vista="deudas"]');
await most.click(`[data-fiarmano="${cod}"]`);
const prod = await most.evaluate(() => { const p = FADORI.productos(true)[0]; return { id: p.id, nombre: p.nombre, precio: p.precio }; });
await most.click(`[data-fmprod="${prod.id}"]`);
ok('tocar un producto escribe qué se llevó y suma su precio', (await most.inputValue('#fmMotivo')) === prod.nombre && parseFloat(await most.inputValue('#fmMonto')) === prod.precio / 100);
await most.click('#fmSi');
ok(`queda apuntado: ${total6 / 100} + ${prod.precio / 100}`, (await deudaEn(most)) === total6 + prod.precio, await deudaEn(most));
/* el de arriba: buscando a la persona y con la calculadora */
await most.click('#bFiarMano');
await most.click('#fmSi');
ok('sin elegir a nadie no se apunta', /elige quién/.test(await most.textContent('body')));
await most.fill('#fmBusca', 'Ana Pé');
await most.click(`[data-fmquien="${cod}"]`);
await most.click('#fmCalc button:text-is("1")'); await most.click('#fmCalc button:text-is("5")');
await most.fill('#fmMotivo', 'refresco de ayer que no se apuntó');
await most.click('#fmSi');
const debe7 = total6 + prod.precio + 1500;
ok('buscándola y con el teclado: +15', (await deudaEn(most)) === debe7, await deudaEn(most));
ok('el otro mostrador y Ana ven la deuda que sumó el servidor', (await tarda(most2, ([c, e]) => (FADORI.estado().alumnos[c] || {}).deuda === e, [cod, debe7], 15000)) != null &&
  (await tarda(ana, (e) => (FADORI.yo() || {}).deuda === e, debe7, 15000)) != null);

console.log('\n8 · El estado de cuenta para los papás');
const llego = await tarda(most2, ([c, e]) => { const x = FADORI.estadoDeCuenta(c); return !!x && x.deuda === e && x.movimientos.length === 3; }, [cod, debe7], 15000);
const ec = await most2.evaluate((c) => FADORI.estadoDeCuenta(c), cod);
ok('desde el último cero (cuando se perdonó): la compra y los dos fiados, en el OTRO mostrador (la historia viaja por el servidor)', llego != null, ec && ec.movimientos);
ok('dice desde qué día, cuánto se fió y cuánto falta', ec && ec.desde > 0 && ec.cargado === debe7 && ec.abonado === 0 && ec.completo);
ok('la compra trae qué se llevó, cuánto costó y cuánto pagó', ec && ec.movimientos[0].k === 'compra' && ec.movimientos[0].q.length > 2 && ec.movimientos[0].tot === total6 && ec.movimientos[0].pag === 0);
const txt = await most.evaluate((c) => FADORI.constanciaTexto(c), cod);
ok('el texto para WhatsApp lo dice todo', /Estado de cuenta/.test(txt) && /Ana Pérez/.test(txt) && /Debe hoy/.test(txt) && /refresco de ayer/.test(txt) && new RegExp(prod.nombre).test(txt) && /Falta/.test(txt), txt);
ok('y lo de antes del perdón no sale (ya está saldado)', !/abonó/.test(txt));
await most.click(`[data-constancia="${cod}"]`);
const ticket = await most.textContent('#fconsTicket');
ok('«Estado de cuenta» abre el ticket', /Debe/.test(ticket) && /refresco de ayer/.test(ticket), ticket.slice(0, 200));
const png = await most.evaluate(async (c) => { const b = await FadoriConstancia.imagen(c); const i = await createImageBitmap(b); return { tam: b.size, w: i.width, h: i.height, tipo: b.type }; }, cod);
ok(`sale una imagen de ticket para mandar (${png.w}×${png.h}, ${Math.round(png.tam / 1024)} KB)`, png.tipo === 'image/png' && png.w === 1080 && png.h > 900);
await most.click('.fcons-x');
ok('Ana también lo ve en su teléfono, para reenviarlo', await ana.evaluate((c) => { const x = FADORI.estadoDeCuenta(c); return !!x && x.movimientos.length === 3 && /refresco/.test(FADORI.constanciaTexto(c)); }, cod));

for(const [n, pg] of [['mostrador', most], ['mostrador 2', most2], ['Ana', ana]])
  ok(`${n}: sin errores (${pg.errores.slice(0, 2).join(' | ')})`, !pg.errores.length);
console.log(`\n${fallas.length ? '✗ ' + fallas.length + ' fallas' : '✓ todo bien'} · escuela de prueba ${CASA}`);
await cerrar();
process.exit(fallas.length ? 1 : 0);
