#!/usr/bin/env node
/* ESTUDIO · la pantalla en un navegador de verdad, a 390 px.
   Se comprueba el EFECTO de cada botón: que el audio subido aparezca, que
   limpiar diga cuánto silencio quitó, que armar dé un episodio, que el MP3 y
   la portada se bajen de verdad, que grabar (con micrófono de mentira) sume un
   pedazo, y que al recargar no se haya perdido nada.
   Correr:  python3 -m http.server 8781 &   node podcast/pruebas-pantalla.mjs [http://localhost:8781] */
import { createRequire } from 'module'; import fs from 'fs';
import * as M from './motor.js'; import { azar } from './jingle.js';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8781';
let bien = 0, mal = 0;
const ok = (q, c, extra) => { console.log((c ? '  ✓ ' : '  ✗ ') + q + (!c && extra != null ? ' · ' + extra : '')); c ? bien++ : mal++; };

/* una voz de mentira con pausas largas, como WAV */
const rnd = azar(7), SR = M.SR, partes = [];
for(let f = 0; f < 4; f++){
  for(let s = 0; s < 14; s++){ const n = Math.round(0.2 * SR), a = new Float32Array(n), f0 = 130 + rnd() * 50;
    for(let i = 0; i < n; i++) a[i] = 0.2 * Math.sin(Math.PI * i / n) * (Math.sin(2 * Math.PI * f0 * i / SR) + 0.4 * Math.sin(4 * Math.PI * f0 * i / SR)); partes.push(a); }
  partes.push(new Float32Array(Math.round(2.5 * SR)));
}
const voz = M.unir(partes, SR, 0); for(let i = 0; i < voz.length; i++) voz[i] += (rnd() * 2 - 1) * 0.002;
const wav = Buffer.from(M.aWav(voz));

/* contra la dirección publicada (https), por el proxy del contenedor */
const px = /^https:/.test(BASE) && process.env.HTTPS_PROXY ? new URL(process.env.HTTPS_PROXY) : null;
const br = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  ...(px ? { proxy: { server: `${px.protocol}//${px.host}`, username: decodeURIComponent(px.username), password: decodeURIComponent(px.password) } } : {}) });
const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true, hasTouch: true, ignoreHTTPSErrors: !!px });
await ctx.grantPermissions(['microphone'], { origin: BASE });
const pg = await ctx.newPage(); const errores = [];
pg.on('pageerror', e => errores.push(e.message)); pg.on('console', m => { if(m.type() === 'error') errores.push(m.text()); });
await pg.goto(BASE + '/podcast/'); await pg.waitForFunction(() => window.ESTUDIO && window.ESTUDIO.listo);

console.log('\n1 · abrir');
ok('los iconos se pintan (hay <svg> en el logo)', await pg.evaluate(() => !!document.querySelector('.logo svg')));
ok('lo escondido NO se ve (Oír frase, Compartir, quitar foto)', await pg.evaluate(() =>
  ['#bOirFrase', '#bBorrarFrase', '#bSinFoto'].every(s => document.querySelector(s).getBoundingClientRect().width === 0)));
ok('sin audio, «Limpiar» y «Armar» esperan', await pg.evaluate(() => document.querySelector('#bLimpiar').disabled && document.querySelector('#bArmar').disabled));
const ancho = async () => pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);
ok('nada se sale de la pantalla a 390', await ancho() <= 0, await ancho());

console.log('\n2 · subir audio');
await pg.setInputFiles('#fSubir', { name: 'entrevista.wav', mimeType: 'audio/wav', buffer: wav });
await pg.waitForSelector('.pedazo', { timeout: 15000 });
ok('aparece el pedazo con su nombre', /entrevista/.test(await pg.textContent('.pedazo')));
ok('y su duración (~0:22)', /0:2[0-4]/.test(await pg.textContent('.pedazo small')), await pg.textContent('.pedazo small'));

console.log('\n3 · limpiar');
await pg.click('#bLimpiar');
await pg.waitForSelector('#resLimpio:not([hidden]) .cifras', { timeout: 30000 });
const res = await pg.textContent('#resLimpio');
ok('dice cuánto silencio quitó (más de 5 s)', /−0:0[5-9]|−0:1\d/.test(res), res.replace(/\s+/g, ' ').slice(0, 80));
ok('trae los dos reproductores: antes y después', await pg.locator('#resLimpio audio').count() === 2);

console.log('\n4 · intro');
await pg.click('[data-estilo="pop"]');
ok('se marca el estilo elegido', await pg.getAttribute('[data-estilo="pop"]', 'aria-checked') === 'true');
await pg.click('[data-largo="8"]');
ok('y el largo', await pg.getAttribute('[data-largo="8"]', 'aria-checked') === 'true');

console.log('\n5 · armar y bajar');
await pg.fill('#eArchivo', 'Voces del 3.1 · Episodio 1');
await pg.click('#bArmar');
await pg.waitForSelector('#final:not([hidden])', { timeout: 60000 });
const datos = await pg.textContent('#datosFinal');
ok('sale el episodio armado y dice cuánto dura', /Dura \d+:\d\d/.test(datos), datos);
const durFinal = await pg.evaluate(() => window.ESTUDIO.final().length / 32000);
ok('dura más que la voz limpia (lleva intro y cierre)', durFinal > 18, durFinal.toFixed(1));
const [dMp3] = await Promise.all([pg.waitForEvent('download', { timeout: 60000 }), pg.click('#bMp3')]);
const mp3 = fs.readFileSync(await dMp3.path());
ok('el MP3 se baja con el nombre limpio', dMp3.suggestedFilename() === 'voces-del-3-1-episodio-1.mp3', dMp3.suggestedFilename());
ok('y es un MP3 de verdad (marco 0xFFE…)', mp3[0] === 0xFF && (mp3[1] & 0xE0) === 0xE0 && mp3.length > 50000, mp3.length);

console.log('\n6 · portada');
await pg.fill('#pNombre', 'Voces del 3.1'); await pg.fill('#pEpisodio', '1'); await pg.fill('#pEscuela', 'Rembrandt · 3.1');
await pg.click('[data-tema="electrico"]');
const [dPor] = await Promise.all([pg.waitForEvent('download', { timeout: 30000 }), pg.click('#bPortada')]);
const jpg = fs.readFileSync(await dPor.path());
ok('la portada es JPEG y pesa menos de 512 KB (lo que pide Apple)', jpg[0] === 0xFF && jpg[1] === 0xD8 && jpg.length <= 512 * 1024, jpg.length);
/* el tamaño, leído de la cabecera SOF del JPEG */
let lado = 0; for(let i = 2; i < jpg.length - 9; i++){ if(jpg[i] === 0xFF && (jpg[i + 1] === 0xC0 || jpg[i + 1] === 0xC2)){ lado = jpg.readUInt16BE(i + 5) + 'x' + jpg.readUInt16BE(i + 7); break; } }
ok('y mide 3000 × 3000', lado === '3000x3000', lado);
await pg.screenshot({ path: process.env.CAPTURAS ? process.env.CAPTURAS + '/estudio-portada.png' : '/dev/null', fullPage: false }).catch(() => {});

console.log('\n7 · grabar (micrófono de mentira)');
await pg.click('#bGrabar'); await pg.waitForTimeout(2300); await pg.click('#bGrabar');
await pg.waitForFunction(() => document.querySelectorAll('.pedazo').length === 2, null, { timeout: 15000 }).catch(() => {});
ok('la grabación se suma como segundo pedazo', await pg.locator('.pedazo').count() === 2);

console.log('\n8 · recargar no pierde nada');
await pg.reload(); await pg.waitForFunction(() => window.ESTUDIO && window.ESTUDIO.listo && window.ESTUDIO.pedazos().length >= 2, null, { timeout: 20000 }).catch(() => {});
ok('siguen los dos pedazos', await pg.locator('.pedazo').count() === 2);
ok('y el nombre del podcast de la portada', await pg.inputValue('#pNombre') === 'Voces del 3.1');
ok('y el estilo de la intro', await pg.getAttribute('[data-estilo="pop"]', 'aria-checked') === 'true');

console.log('\n9 · tamaños');
for(const w of [320, 768, 1280]){ await pg.setViewportSize({ width: w, height: 800 }); await pg.waitForTimeout(200);
  ok('nada se sale a ' + w + ' px', await ancho() <= 0, await ancho()); }
ok('ni un error de consola', !errores.length, errores.join(' | '));

await br.close();
console.log(`\n${mal ? '✗' : '✓'} estudio · pantalla · ${bien} pasan · ${mal} fallan`);
process.exit(mal ? 1 : 0);
