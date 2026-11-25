/* El motor del simulador de física contra las fórmulas del libro (y casos que se resuelven a mano).
     node vr/pruebas-fisica.mjs */
import { estado, resumen, tiempoVuelo, trayectoria, GRAVEDADES } from './fisica/motor.js';
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
const cerca = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
/* MRU: 3 m/s durante 4 s = 12 m */
sí(cerca(estado('mru', { v: 3 }, 4).x, 12), 'MRU: 3 m/s × 4 s = 12 m');
/* MRUA: v0 = 2, a = 1.5, t = 4 → x = 8 + 12 = 20; v = 8 */
let e = estado('mrua', { v0: 2, a: 1.5 }, 4); sí(cerca(e.x, 20) && cerca(e.vx, 8), `MRUA: x = 2·4 + ½·1.5·16 = 20 m y v = 8 m/s (${e.x}, ${e.vx})`);
/* frenar: v0 = 20, a = −5 → se detiene a los 4 s, a 40 m, y no se echa de reversa */
e = estado('mrua', { v0: 20, a: -5 }, 10); const r = resumen('mrua', { v0: 20, a: -5 });
sí(cerca(e.x, 40) && e.vx === 0 && e.detenido && cerca(r.tAlto, 4) && cerca(r.distanciaAlto, 40), 'MRUA frenando: se detiene en 4 s a 40 m (v² = v0² + 2ad) y ahí se queda');
/* caída libre desde 20 m en la Tierra: t = √(2h/g) */
const g = GRAVEDADES.tierra;
sí(cerca(tiempoVuelo('caida', { h: 20 }), Math.sqrt(40 / g)), `caída libre de 20 m: t = √(2h/g) = ${Math.sqrt(40 / g).toFixed(3)} s`);
sí(cerca(resumen('caida', { h: 20 }).vFinal, Math.sqrt(2 * g * 20)), 'caída libre: v final = √(2gh)');
/* tiro vertical v0 = 15: altura máxima v0²/2g, sube en v0/g y tarda el doble en volver */
const rv = resumen('vertical', { v0: 15 });
sí(cerca(rv.hMax, 225 / (2 * g)) && cerca(rv.tSubida, 15 / g) && cerca(rv.tVuelo, 30 / g), 'tiro vertical: hmax = v0²/2g, sube en v0/g, vuelve en 2·v0/g');
/* tiro parabólico desde el piso: alcance = v0²·sen2θ / g, hmax = v0²·sen²θ / 2g */
const rp = resumen('parabolico', { v0: 20, angulo: 30 });
sí(cerca(rp.alcance, 400 * Math.sin(60 * Math.PI / 180) / g) && cerca(rp.hMax, 400 * .25 / (2 * g)), `parabólico 20 m/s a 30°: alcance ${rp.alcance.toFixed(2)} m, hmax ${rp.hMax.toFixed(2)} m (fórmulas del libro)`);
/* 45° da el alcance máximo; 30° y 60° el mismo */
const al = (a) => resumen('parabolico', { v0: 20, angulo: a }).alcance;
sí(al(45) > al(40) && al(45) > al(50) && cerca(al(30), al(60), 1e-9), 'desde el piso, 45° llega más lejos y 30° y 60° llegan igual');
/* desde una mesa (h = 1.2 m) llega más lejos que desde el piso */
sí(resumen('parabolico', { v0: 10, angulo: 45, h: 1.2 }).alcance > al(45) * 0 + resumen('parabolico', { v0: 10, angulo: 45 }).alcance, 'desde 1.2 m de alto, el mismo tiro llega más lejos');
/* en la Luna el mismo tiro llega g_tierra/g_luna veces más lejos */
const lunaVs = resumen('parabolico', { v0: 20, angulo: 45, g: GRAVEDADES.luna }).alcance / al(45);
sí(cerca(lunaVs, g / GRAVEDADES.luna, 1e-9), `en la Luna llega ${lunaVs.toFixed(2)} veces más lejos (= g Tierra / g Luna)`);
/* la trayectoria termina en el piso y nunca baja de él */
const tr = trayectoria('parabolico', { v0: 20, angulo: 60 }, 80);
sí(tr.every((s) => s.y >= 0) && cerca(tr.at(-1).y, 0, 1e-9) && cerca(tr.at(-1).x, al(60), 1e-9), 'la curva sale del piso, sube, baja y termina en el piso, en el alcance');
console.log(`${ok} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
