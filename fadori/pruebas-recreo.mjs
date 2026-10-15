#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   FADORI · LA HORA DEL RECREO (15 de octubre)
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «el recreo inicia a las 10 no 10:30, se acaba a las 10:30».
   El servidor ya lo tenía en 10:00 desde el 9 de octubre, pero la app hacía
   `setHours(h || 10, m || 30)`: cero minutos es falso, así que «10:00» se
   volvía 10:30 y la app esperaba el recreo media hora tarde.

   Se pone el reloj del teléfono en México a distintas horas y se lee lo que
   la app cree: si falta, si ya empezó o si ya se acabó.

   Correr:  LOCAL=1 API_LOCAL=http://127.0.0.1:8791 node fadori/pruebas-recreo.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import { abrirMesa } from './mesa-de-pruebas.mjs';
const { ok, fallas, aparato, alumno, cerrar } = await abrirMesa('recreo');

const a = (hh, mm) => { const d = new Date(); d.setUTCHours(hh + 6, mm, 0, 0); return d.getTime() - Date.now(); };   /* México = UTC−6 */
const casos = [
  ['9:43, faltan 17 minutos', a(9, 43), 'antes', 17],
  ['10:12, ya es recreo y quedan 18', a(10, 12), 'durante', 18],
  ['10:40, ya se acabó', a(10, 40), 'despues', 0],
];
for(const [nombre, desfase, estado, min] of casos){
  const pg = await aparato('/fadori/', { desfase, zona: 'America/Mexico_City' });
  await alumno('Ana Pérez', '3.1', pg); await pg.reload(); await pg.waitForFunction(() => window.FADORI && FADORI.yo());
  const r = await pg.evaluate(() => { const F = FADORI, c = F.cuentaRegresiva(), w = F.ventanaRecreo(), f = (t) => new Date(t).toTimeString().slice(0, 5);
    return { c, inicia: F.estado().config.recreoInicia, desde: f(w.inicio), hasta: f(w.fin) }; });
  console.log('\n· ' + nombre);
  ok('la cooperativa tiene el recreo a las 10:00', r.inicia === '10:00', r.inicia);
  ok('la app lo pone de 10:00 a 10:30', r.desde === '10:00' && r.hasta === '10:30', r.desde + '–' + r.hasta);
  ok('y dice «' + estado + '»' + (min ? ' con ' + min + ' min' : ''), r.c.estado === estado && Math.abs(Math.round(r.c.segundos / 60) - min) <= 1, JSON.stringify(r.c));
  await pg.context().close();
}

await cerrar();
console.log(fallas.length ? '\n✗ ' + fallas.length + ' fallan' : '\n✓ todo pasa');
process.exit(fallas.length ? 1 : 0);
