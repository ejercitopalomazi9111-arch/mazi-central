#!/usr/bin/env node
/* FADORI · LA RED QUE FALLA, LA CARGA Y LAS PREGUNTAS (Carlos, 14 de octubre:
   «sincronizar el tiempo real de las pantallas y pedidos, un aviso cuando la
   conexión sea inestable, pantalla de carga, navegar un poco sin internet y
   un apartado de preguntas frecuentes»).
   Correr:  LOCAL=1 API_LOCAL=http://127.0.0.1:8791 node fadori/pruebas-red.mjs */
import { abrirMesa } from './mesa-de-pruebas.mjs';
const { ok, fallas, tarda, mostrador, alumno, cerrar, CASA } = await abrirMesa('red');

const most = await mostrador();
const ana = await alumno('Ana Pérez', '3B');
await ana.reload(); await ana.waitForFunction(() => window.FADORI && FADORI.yo());
await ana.waitForFunction(() => !document.querySelector('.cargando'), null, { timeout: 5000 }).catch(() => {});

console.log('\n1 · preguntas frecuentes');
await ana.click('#pulgar [data-ir="yo"]');
await ana.click('#p-yo [data-faq]');
ok('se abren desde «Lo tuyo»', await ana.evaluate(() => document.getElementById('faq').open));
ok('con 12 preguntas', await ana.evaluate(() => document.querySelectorAll('#faq .faq-q').length === 12));
ok('dice el tope de 5 pedidos', /5 por recreo/.test(await ana.textContent('#faq')));
await ana.click('#faqCerrar');
ok('y se cierran', await ana.evaluate(() => !document.getElementById('faq').open));

console.log('\n2 · sin internet');
const ctx = ana.context();
await ctx.setOffline(true);
const sinRed = await tarda(ana, () => { const r = document.getElementById('fadoriRed'); return r && r.dataset.estado === 'sinred'; }, null, 8000);
ok('sale el aviso «Sin internet»', sinRed != null, await ana.evaluate(() => (document.getElementById('fadoriRed') || {}).textContent));
const id = await ana.evaluate(() => { const F = FADORI, d = F.productos(true).filter(p => p.disponible); return F.pedir(F.yo().codigo, [{ prod: d[0].id, cant: 1 }], {}).id; });
await ana.waitForTimeout(800);
ok('el pedido hecho sin red se queda guardado en el teléfono', await ana.evaluate((i) => !!FADORI.pedido(i), id));
/* (lo «por mandar» no se puede probar aquí: con LOCAL las peticiones pasan por
   ctx.route desde Node, y setOffline no las corta — el pedido SÍ sale) */
await ctx.setOffline(false);
ok('al volver la red dice «Conectado de nuevo»', (await tarda(ana, () => /Conectado de nuevo/.test((document.getElementById('fadoriRed') || {}).textContent || ''), null, 12000)) != null);
ok('y el pedido llega solo al mostrador', (await tarda(most, (i) => !!FADORI.pedido(i) && FADORI.pedido(i).turno != null, id, 15000)) != null);
ok('el aviso se quita cuando todo va bien', (await tarda(ana, () => { const r = document.getElementById('fadoriRed'); return r && r.style.opacity === '0'; }, null, 8000)) != null);

console.log('\n3 · pantalla de carga');
await ana.reload();
const vio = await ana.evaluate(() => !!document.querySelector('.cargando'));
ok('al volver a abrir sale la pantalla de carga', vio);
ok('y se quita sola en cuanto contesta el servidor', (await tarda(ana, () => !document.querySelector('.cargando'), null, 4000)) != null);

for(const [n, pg] of [['mostrador', most], ['Ana', ana]]) ok(`${n}: sin errores (${pg.errores.slice(0, 2).join(' | ')})`, !pg.errores.length);
console.log(`\n${fallas.length ? '✗ ' + fallas.length + ' fallas' : '✓ todo bien'} · escuela de prueba ${CASA}`);
await cerrar();
process.exit(fallas.length ? 1 : 0);
