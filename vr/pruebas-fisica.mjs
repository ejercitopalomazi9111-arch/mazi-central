/* El motor del simulador de física contra las fórmulas del libro (y casos que se resuelven a mano).
     node vr/pruebas-fisica.mjs */
import { estado, resumen, tiempoVuelo, trayectoria, GRAVEDADES, simular, enInstante, OBJETOS, LUGARES, kArrastre, vTerminal, circular, plano, pendulo, resorte, choque, enTiempo } from './fisica/motor.js';
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

/* ── con aire ── */
const B = OBJETOS.balon, P = OBJETOS.piedra;
/* sin aire, el paso a paso da lo mismo que las fórmulas (a menos de 1 mm) */
const sv = simular('parabolico', { v0: 20, angulo: 30, g, rho: 0, objeto: B });
sí(cerca(sv.alcance, al(30), 1e-3) && cerca(sv.tVuelo, rp.tVuelo, 1e-4) && cerca(sv.hMax, rp.hMax, 1e-3), `sin aire, el paso a paso da el alcance del libro (${sv.alcance.toFixed(4)} contra ${al(30).toFixed(4)} m)`);
const sc = simular('caida', { h: 20, g, rho: 0, objeto: B });
sí(cerca(sc.tVuelo, Math.sqrt(40 / g), 1e-4) && cerca(sc.vFinal, Math.sqrt(2 * g * 20), 1e-3), 'sin aire, la caída paso a paso cae en √(2h/g) y llega a √(2gh)');
/* con aire llega menos lejos, y el balón (ligero y grande) pierde más que la piedra */
const ca = (o, rho = 1.225) => simular('parabolico', { v0: 20, angulo: 45, g, rho, objeto: o }).alcance;
sí(ca(B) < al(45) && ca(P) < al(45) && ca(B) < ca(P), `con aire el balón llega a ${ca(B).toFixed(1)} m y la piedra a ${ca(P).toFixed(1)} m (sin aire ${al(45).toFixed(1)} m)`);
/* más denso el aire, menos llega */
sí(ca(B, 5) < ca(B, 1.225) && ca(B, 65) < ca(B, 5), 'más denso el aire, más corto el tiro (Venus casi no lo deja avanzar)');
/* el tiro más lejano con aire es a menos de 45° */
const mejor = [30, 35, 40, 45, 50].map((a) => [a, simular('parabolico', { v0: 25, angulo: a, g, rho: 1.225, objeto: B }).alcance]).sort((x, y) => y[1] - x[1])[0][0];
sí(mejor < 45, `con aire, el ángulo que llega más lejos ya no es 45° (aquí ${mejor}°)`);
/* velocidad terminal: una caída larga se acerca a √(g/k) y no la pasa */
const vt = vTerminal(B, 1.225, g), larga = simular('caida', { h: 2000, g, rho: 1.225, objeto: B });
sí(larga.vFinal < vt && larga.vFinal > vt * .99, `velocidad terminal del balón ${vt.toFixed(1)} m/s; tras 2 km de caída va a ${larga.vFinal.toFixed(1)} m/s`);
/* en la Luna (sin aire) no importa el objeto */
const lu = (o) => simular('parabolico', { v0: 10, angulo: 45, g: LUGARES.luna.g, rho: LUGARES.luna.rho, objeto: o }).alcance;
sí(cerca(lu(B), lu(P), 1e-9), 'en la Luna, sin aire, el balón y la piedra caen igual (como el martillo y la pluma del Apolo 15)');
/* termina exacto en el piso y enInstante lo encuentra */
const fin = enInstante(sv, sv.tVuelo + 1), mit = enInstante(sv, sv.tVuelo / 2);
sí(cerca(fin.y, 0, 1e-9) && mit.y > 0 && cerca(mit.x, sv.alcance / 2, 1e-3), 'termina en y = 0 y a la mitad del tiempo va a la mitad del alcance (sin aire)');
sí(kArrastre(B, 0) === 0 && vTerminal(B, 0, g) === Infinity, 'sin aire no hay arrastre');

/* ── rebote ── */
const rb = (o) => simular('parabolico', { v0: 15, angulo: 45, g, rho: 0, objeto: o, rebote: true });
const rB = rb(B), rP = rb(P), sinR = simular('parabolico', { v0: 15, angulo: 45, g, rho: 0, objeto: B });
sí(rB.botes > rP.botes && rB.alcance > rP.alcance && cerca(rB.primero, sinR.alcance, 1e-3), `con rebote el balón da ${rB.botes} botes y la piedra ${rP.botes}; el primer bote cae donde caería sin rebote (${rB.primero.toFixed(2)} m)`);
/* cada bote sube e² veces lo que subió el anterior (sin aire) */
const picos = []; let subiendo = false; rB.puntos.forEach((q, i) => { const n = rB.puntos[i + 1]; if(n && q.vy > 0 && n.vy <= 0) picos.push(q.y); });
sí(picos.length >= 3 && cerca(picos[1] / picos[0], B.e ** 2, .02), `cada bote sube e² del anterior (${(picos[1] / picos[0]).toFixed(3)} contra ${(B.e ** 2).toFixed(3)})`);
sí(rB.puntos.every((q) => q.y >= -1e-9) && rB.puntos.every((q, i) => !i || q.t >= rB.puntos[i - 1].t), 'con rebote nunca atraviesa el piso y el tiempo siempre avanza');
const mitad = enInstante(rB, rB.tPrimero + .01); sí(mitad.vy > 0, 'justo después del primer bote va de subida');

/* ── los temas de 3.er semestre ── */
const c = circular({ r: 2, T: 4 });
sí(cerca(c.v, Math.PI) && cerca(c.ac, Math.PI ** 2 / 2) && cerca(c.f, .25) && cerca(enTiempo(c, 1).th, Math.PI / 2, 1e-6), 'MCU r = 2 m, T = 4 s: v = π m/s, a = v²/r, f = 0.25 Hz, a 1 s va un cuarto de vuelta');
const pl = plano({ angulo: 30, mu: .2, m: 2 });
sí(pl.semueve && cerca(pl.a, g * (.5 - .2 * Math.cos(Math.PI / 6))) && cerca(pl.N, 2 * g * Math.cos(Math.PI / 6)) && cerca(pl.vFin, Math.sqrt(2 * pl.a * 5)), `plano 30° con μ = 0.2: a = g(senθ − μcosθ) = ${pl.a.toFixed(2)} m/s², y v² = 2aL`);
const quieto = plano({ angulo: 10, mu: .5, m: 2 });
sí(!quieto.semueve && quieto.a === 0 && cerca(quieto.fr, quieto.Px), 'si tanθ < μ no se mueve: la fricción iguala al peso a lo largo del plano');
const piso = plano({ angulo: 0, mu: .1, m: 4, F: 20 });
sí(cerca(piso.a, (20 - .1 * 4 * g) / 4), `en el piso con empuje: a = (F − μmg) / m = ${piso.a.toFixed(2)} m/s² (segunda ley de Newton)`);
sí(cerca(pl.Ec, pl.trabajoNeto, 1e-9), 'el trabajo neto es la energía cinética que gana (teorema trabajo-energía)');
const pe = pendulo({ L: 1, angulo: 10, m: .5 });
sí(cerca(pe.T, pe.T0, pe.T0 * .005), `péndulo de 1 m a 10°: T = ${pe.T.toFixed(3)} s ≈ 2π√(L/g) = ${pe.T0.toFixed(3)} s`);
const peG = pendulo({ L: 1, angulo: 60, m: .5 });
sí(peG.T > peG.T0 * 1.05, `a 60° el periodo es más largo que el de la fórmula (${peG.T.toFixed(3)} contra ${peG.T0.toFixed(3)} s)`);
const deriva = Math.max(...peG.puntos.map((q) => Math.abs(q.Ec + q.Ep - peG.Etotal))) / peG.Etotal;
sí(deriva < 1e-5, `la energía total se conserva (se desvía ${(deriva * 100).toExponential(1)} %)`);
const maxEc = Math.max(...peG.puntos.map((q) => q.Ec));
sí(cerca(maxEc, peG.Etotal, peG.Etotal * 1e-3) && cerca(Math.sqrt(2 * maxEc / .5), peG.vMax, 1e-2), 'abajo toda la energía es cinética: v máx = √(2gL(1 − cosθ))');
const rs = resorte({ k: 20, m: .5, x0: .3 });
sí(cerca(rs.T, 2 * Math.PI * Math.sqrt(.5 / 20)) && cerca(rs.F0, 6) && cerca(rs.Ep, .9) && cerca(enTiempo(rs, rs.T / 2).x, -.3, 1e-4), 'resorte k = 20 N/m, m = 0.5 kg, 0.3 m: F = kx = 6 N, Ep = 0.9 J, T = 2π√(m/k), a medio periodo está del otro lado');
const el = choque({ m1: 1, m2: 1, v1: 2, v2: 0 });
sí(cerca(el.u1, 0) && cerca(el.u2, 2) && cerca(el.pAntes, el.pDespues) && cerca(el.EcAntes, el.EcDespues), 'choque elástico de masas iguales: se intercambian la velocidad (como en el billar)');
const pg = choque({ m1: 2, m2: 1, v1: 3, v2: 0, pegan: true });
sí(cerca(pg.u1, 2) && cerca(pg.pAntes, pg.pDespues) && pg.EcDespues < pg.EcAntes, 'si se pegan: v = (m₁v₁ + m₂v₂)/(m₁ + m₂), se conserva p y se pierde energía');
const ch = enTiempo(el, el.tChoque + .5); sí(cerca(ch.x2 - ch.x1, 1, 1e-6), 'después del choque se separan como dicen las velocidades');
console.log(`${ok} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
