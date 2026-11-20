/* MAZI VR · TOPES TEMPORALES DEL 6DoF (Carlos, 20 nov): con el 6DoF no te sales de la zona segura, tu cabeza no atraviesa
   el suelo y no sube más de un límite. Primero la cuenta sola (limites.js, toparCabeza) y luego en el visor con un 6DoF de
   mentiras que intenta irse de lado, hundirse y volar.
     node vr/pruebas-topes6.mjs     (con el servidor del repo en :8765) */
import { toparCabeza, TOPES } from './limites.js';
import { createRequire } from 'module';
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
const base = { x: 0, y: 0, z: 0 }, suelo = -1.5;
{ const p = { x: .3, y: -.2, z: .2 }; const t = toparCabeza(p, base, 1, suelo); sí(t === '' && p.x === .3 && p.y === -.2, 'adentro de la zona y a buena altura no se toca nada'); }
{ const p = { x: 3, y: 0, z: 4 }; const t = toparCabeza(p, base, 1, suelo); sí(t === 'zona' && Math.abs(Math.hypot(p.x, p.z) - 1) < 1e-9 && Math.abs(p.x / p.z - .75) < 1e-9, `de lado se queda en la orilla de la zona, en la misma dirección (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`); }
{ const p = { x: 0, y: -2.4, z: 0 }; const t = toparCabeza(p, base, 1, suelo); sí(t === 'suelo' && Math.abs(p.y - (suelo + TOPES.margenSuelo)) < 1e-9, `la cabeza no baja del suelo (queda a ${p.y.toFixed(2)})`); }
{ const p = { x: 0, y: -1.2, z: 0 }; toparCabeza(p, base, 1, suelo); sí(p.y === -1.2, 'agacharte hasta cerca del suelo sí se puede'); }
{ const p = { x: 0, y: 1.5, z: 0 }; const t = toparCabeza(p, base, 1, suelo); sí(t === 'techo' && Math.abs(p.y - TOPES.subir) < 1e-9, `subir tiene tope (${p.y.toFixed(2)} sobre donde empezaste)`); }
{ const p = { x: 2, y: -3, z: 0 }; toparCabeza(p, { x: 1, y: 0, z: 1 }, .5, suelo); sí(Math.abs(Math.hypot(p.x - 1, p.z - 1) - .5) < 1e-9 && p.y > suelo, 'zona y suelo a la vez, con la zona fuera del origen'); }

/* ── en el visor ── */
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765';
const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
await ctx.addInitScript(() => { navigator.getGamepads = () => []; try{ localStorage.setItem('mazivr.ajustes', JSON.stringify({ manos: false, fondo: 1, zona: 1 })); }catch{} });
const pg = await ctx.newPage(); const errores = []; pg.on('pageerror', (e) => errores.push(e.message));
await pg.goto(BASE + '/vr/', { waitUntil: 'networkidle' }); await pg.click('#bEntrar');
await pg.waitForFunction(() => window.__vr?.ahora() === 'inicio');
/* el 6DoF de mentiras: el filtro entrega la posición que la prueba diga */
await pg.evaluate(() => { const S = __vr.seis; window.__pos = [0, 0, 0];
  S.vio = { S: { listo: true, corriendo: true, estado: 'track' }, pose: () => null, parar(){}, intrinsecos: null };
  S.filtro = { paso: () => ({ pos: window.__pos.slice() }), st: {} }; S.base6 = null; });
const llevar = async (pos) => { await pg.evaluate((q) => { window.__pos = q; }, pos); await pg.waitForTimeout(250); return pg.evaluate(() => __vr.cabeza.position.toArray().map((x) => +x.toFixed(3))); };
await llevar([0, 0, 0]);
let c = await llevar([.4, -.3, .2]); sí(c[0] === .4 && c[1] === -.3 && c[2] === .2, `moverte adentro de la zona pasa tal cual (${c})`);
c = await llevar([2.5, 0, 0]); sí(Math.abs(c[0] - 1) < .002 && c[2] === 0, `irte 2.5 m de lado te deja en la orilla de la zona (${c})`);
c = await llevar([0, -3, 0]); sí(c[1] > -1.5 && c[1] < -1.3, `hundirte 3 m te deja arriba del suelo (${c[1]})`);
c = await llevar([0, 2, 0]); sí(Math.abs(c[1] - .6) < .002, `subir 2 m te deja a 60 cm sobre donde empezaste (${c[1]})`);
c = await llevar([.1, 0, -.1]); sí(c[0] === .1 && c[1] === 0 && c[2] === -.1, `al regresar, todo vuelve a seguirte (${c})`);
await pg.evaluate(() => { __vr.AJ.topes6 = false; }); c = await llevar([0, -3, 0]); sí(c[1] === -3, 'con los topes apagados (topes6: false) no se toca nada');
await pg.evaluate(() => { const S = __vr.seis; S.vio = null; });
sí(!errores.length, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 2).join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
