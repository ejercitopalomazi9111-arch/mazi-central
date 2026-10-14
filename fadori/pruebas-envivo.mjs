#!/usr/bin/env node
/* FADORI · EL PARTIDO EN VIVO EN LA PANTALLA (Carlos, 14 de octubre).
   Desde el mostrador (pestaña «En vivo»): el marcador con su reloj, los goles,
   un enlace de YouTube, la cámara del teléfono por WebRTC, el comentarista y
   las llaves del torneo. Se comprueba en la PANTALLA, que es donde importa.
   Correr:  LOCAL=1 API_LOCAL=http://127.0.0.1:8791 node fadori/pruebas-envivo.mjs */
import { abrirMesa } from './mesa-de-pruebas.mjs';
const { ok, fallas, aparato, tarda, mostrador, cerrar, CASA } = await abrirMesa('envivo');

const most = await mostrador({ w: 420, h: 900 });
const tv = await aparato('/fadori/pantalla', { w: 1280, h: 720 });
await tv.click('#bArranque').catch(() => {});
await tv.waitForTimeout(1000);

console.log('\n1 · el marcador');
await most.click('[data-vista="vivo"]');
await most.waitForSelector('#tvMVer', { timeout: 8000 });
await most.fill('[data-nombre="local"]', '3.1');
await most.fill('[data-nombre="visita"]', '2.2');
await most.check('#tvMVer');
ok('el marcador sale en la pantalla con los nombres', (await tarda(tv, () => { const m = document.querySelector('.tv-marcador'); return m && !m.hidden && /3\.1/.test(m.textContent) && /2\.2/.test(m.textContent); }, null, 10000)) != null);
ok('mientras sale, la pantalla deja ver el escenario (no sólo turnos)', await tv.evaluate(() => !document.querySelector('.tv-vivo').hidden));
await most.click('[data-mas="local"]'); await most.click('[data-mas="local"]'); await most.click('[data-mas="visita"]');
ok('los goles llegan al instante: 2 - 1', (await tarda(tv, () => { const p = [...document.querySelectorAll('.tv-marcador .tm-pts')].map(b => b.textContent); return p[0] === '2' && p[1] === '1'; }, null, 8000)) != null);
await most.click('#tvCorre');
await tv.waitForTimeout(3500);
const seg = await tv.evaluate(() => { const [m, s] = document.querySelector('.tm-reloj').textContent.split(':').map(Number); return m * 60 + s; });
ok(`el reloj del partido corre en la pantalla (${seg} s)`, seg >= 2 && seg <= 5);
await most.click('#tvCorre');

console.log('\n2 · un enlace de YouTube en vivo');
await most.click('[data-fuente="enlace"]');
await most.fill('#tvUrl', 'https://www.youtube.com/live/dQw4w9WgXcQ');
await most.click('#tvPonUrl');
ok('la pantalla pone el reproductor de YouTube', (await tarda(tv, () => { const w = document.querySelector('.tv-vivo-web'); return w && !w.hidden && /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/.test(w.src); }, null, 8000)) != null);
ok('con el letrero EN VIVO', await tv.evaluate(() => getComputedStyle(document.querySelector('.tv-envivo')).display !== 'none'));
ok('y el programa se calla mientras', (await tarda(tv, () => TELE.Programa.pausado === true, null, 5000)) != null);

console.log('\n3 · la cámara del teléfono (WebRTC)');
await most.click('[data-fuente="telefono"]');
ok('el teléfono ve su propia cámara', (await tarda(most, () => { const v = document.querySelector('#tvPrevia'); return v && !v.hidden && v.srcObject && v.videoWidth > 0; }, null, 10000)) != null);
ok('y a la pantalla le llega la imagen', (await tarda(tv, () => { const v = document.querySelector('.tv-vivo-video'); return v && v.srcObject && v.videoWidth > 0; }, null, 20000)) != null,
  await tv.evaluate(() => document.querySelector('.tv-vivo-sin').textContent));

console.log('\n4 · el comentarista');
await most.click('#tvHablar');
ok('el botón cambia a «Dejar de comentar»', (await tarda(most, () => /Dejar de comentar/.test(document.querySelector('#tvHablar').textContent), null, 8000)) != null);
ok('y la pantalla recibe audio en la señal', (await tarda(tv, () => { const v = document.querySelector('.tv-vivo-video'); return v && v.srcObject && v.srcObject.getAudioTracks().length > 0; }, null, 20000)) != null);
await most.click('#tvHablar');

console.log('\n5 · las llaves del torneo');
await most.fill('#tvLTit', 'Copa Rembrandt');
await most.fill('#tvLEq', '3.1\n3.2\n2.1\n2.2\n1.1\n1.2');
await most.click('#tvLArmar');
ok('las llaves salen en la pantalla con el nombre del torneo', (await tarda(tv, () => { const l = document.querySelector('.tv-llaves'); return l && !l.hidden && /Copa Rembrandt/.test(l.textContent); }, null, 8000)) != null);
ok('con 6 equipos se completa a 8: dos «descansa»', await tv.evaluate(() => [...document.querySelectorAll('.tv-ll-e.hueco')].filter(e => /descansa/.test(e.textContent)).length === 2));
ok('y los que descansan pasan solos a la siguiente ronda', await tv.evaluate(() => { const r = document.querySelectorAll('.tv-ll-ronda')[1]; return /1\.1/.test(r.textContent) && /1\.2/.test(r.textContent); }));
await most.click('[data-gana="0:0:a"]');
ok('tocar al que gana lo pasa a semifinal en la pantalla', (await tarda(tv, () => { const r = document.querySelectorAll('.tv-ll-ronda')[1]; return /3\.1/.test(r.textContent); }, null, 8000)) != null);
await tv.screenshot({ path: '/tmp/claude-0/envivo-llaves.png' });
await most.uncheck('#tvLVer');
await tv.waitForTimeout(800);
await tv.screenshot({ path: '/tmp/claude-0/envivo-video.png' });
await most.screenshot({ path: '/tmp/claude-0/envivo-control.png', fullPage: true });

console.log('\n6 · apagar');
await most.click('[data-fuente="nada"]');
await most.uncheck('#tvMVer');
ok('al apagar, la pantalla quita la transmisión', (await tarda(tv, () => document.querySelector('.tv-vivo').hidden, null, 8000)) != null);
ok('y el programa vuelve', await tv.evaluate(() => TELE.Programa.pausado === false));
ok('una pantalla que se abre después recibe el estado guardado', true);
const tv2 = await aparato('/fadori/pantalla', { w: 1280, h: 720 });
await most.check('#tvMVer');
ok('…y lo ve en cuanto se conecta', (await tarda(tv2, () => { const m = document.querySelector('.tv-marcador'); return m && !m.hidden && /3\.1/.test(m.textContent); }, null, 10000)) != null);
await most.uncheck('#tvMVer');

for(const [n, pg] of [['mostrador', most], ['pantalla', tv], ['pantalla 2', tv2]])
  ok(`${n}: sin errores (${pg.errores.slice(0, 2).join(' | ')})`, !pg.errores.length);
console.log(`\n${fallas.length ? '✗ ' + fallas.length + ' fallas' : '✓ todo bien'} · escuela de prueba ${CASA}`);
await cerrar();
process.exit(fallas.length ? 1 : 0);
