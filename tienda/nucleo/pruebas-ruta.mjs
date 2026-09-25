#!/usr/bin/env node
/* Pruebas de ruta.js · `node tienda/nucleo/pruebas-ruta.mjs` */
import { distancia, ordenar, largo, estimarMinutos, tramosMaps } from './ruta.js';
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };

console.log('\n· Distancia');
const qro = { lat: 20.5888, lng: -100.3899 }, cdmx = { lat: 19.4326, lng: -99.1332 };
const d = distancia(qro, cdmx);
ok('Querétaro–CDMX en línea recta ≈ 181 km', Math.abs(d - 181) < 5, d.toFixed(1));
ok('de un punto a sí mismo, 0', distancia(qro, qro) === 0);

// Paradas al azar alrededor de Querétaro (semilla fija).
let s = 42; const azar = () => (s = (s * 16807) % 2147483647) / 2147483647;
const puntos = (n) => Array.from({ length: n }, (_, i) => ({ id: i, lat: 20.55 + azar() * 0.1, lng: -100.45 + azar() * 0.12 }));
function optimo(o, ps){
  let mejor = Infinity;
  const perm = (hechos, quedan) => { if(!quedan.length){ mejor = Math.min(mejor, largo(o, hechos)); return; }
    quedan.forEach((p, i) => perm([...hechos, p], [...quedan.slice(0, i), ...quedan.slice(i + 1)])); };
  perm([], ps); return mejor;
}

console.log('\n· Contra la ruta óptima (fuerza bruta, 7 paradas, 20 casos)');
let peor = 0, exactos = 0;
for(let k = 0; k < 20; k++){
  const ps = puntos(7), r = ordenar(qro, ps), o = optimo(qro, ps);
  peor = Math.max(peor, r.km / o - 1); if(r.km - o < 1e-6) exactos++;
}
ok(`nunca más de 10 % arriba de la óptima (peor: ${(peor * 100).toFixed(1)} %)`, peor <= 0.10);
ok(`da la óptima exacta en la mayoría (${exactos} de 20)`, exactos >= 12);

console.log('\n· Treinta paradas');
const ps30 = puntos(30);
const t0 = performance.now(), r30 = ordenar(qro, ps30), ms = performance.now() - t0;
ok(`tarda menos de 100 ms (${ms.toFixed(1)} ms)`, ms < 100);
ok('visita todas, una vez cada una', r30.orden.length === 30 && new Set(r30.orden.map((p) => p.id)).size === 30);
ok('acorta contra el orden en que llegaron', r30.km < largo(qro, ps30), `${r30.km.toFixed(1)} vs ${largo(qro, ps30).toFixed(1)} km`);

console.log('\n· Sin ubicación');
const mixtas = [...puntos(4), { id: 'x' }, { id: 'y', lat: null, lng: null }];
const rm = ordenar(qro, mixtas);
ok('las que no tienen lugar van al final y se avisan', rm.orden.slice(-2).map((p) => p.id).join() === 'x,y' && rm.sinLugar.length === 2);
ok('sin origen también ordena', ordenar(null, puntos(5)).orden.length === 5);
ok('sin paradas no truena', ordenar(qro, []).orden.length === 0);

console.log('\n· Tiempo estimado');
ok('10 km en línea recta y 4 paradas ≈ 57 min', estimarMinutos(10, 4) === 57, String(estimarMinutos(10, 4)));

console.log('\n· Ligas de Google Maps por tramos');
const pars = (u) => new URL(u).searchParams;
const once = puntos(11), tr = tramosMaps(qro, once);
ok('11 paradas → 3 tramos de 4, 4 y 3', tr.map((t) => t.paradas.length).join() === '4,4,3', tr.map((t) => t.paradas.length).join());
ok('ningún tramo pasa de 3 paradas intermedias (el límite del teléfono)', tr.every((t) => (pars(t.url).get('waypoints') || '').split('|').filter(Boolean).length <= 3));
const visitadas = tr.flatMap((t) => [...(pars(t.url).get('waypoints') || '').split('|').filter(Boolean), pars(t.url).get('destination')]);
const esperadas = once.map((p) => `${+p.lat.toFixed(6)},${+p.lng.toFixed(6)}`);
ok('entre todos los tramos visitan las 11, en orden y sin repetir', visitadas.join(';') === esperadas.join(';'));
ok('el primero sale de donde estás; cada otro, de donde acabó el anterior', pars(tr[0].url).get('origin') === `${qro.lat},${qro.lng}` && pars(tr[1].url).get('origin') === esperadas[3] && pars(tr[2].url).get('origin') === esperadas[7]);
ok('los números de parada cuadran con la lista', tr.map((t) => `${t.desde}-${t.hasta}`).join() === '1-4,5-8,9-11');
ok('sin saber dónde estás, el primer tramo no inventa origen', !pars(tramosMaps(null, puntos(3))[0].url).has('origin'));
ok('una sola parada: un tramo, sin intermedias', (() => { const t = tramosMaps(qro, puntos(1)); return t.length === 1 && !pars(t[0].url).has('waypoints'); })());
ok('las paradas sin ubicación no entran a la liga', tramosMaps(qro, [{ id: 'x' }, ...puntos(2)]).flatMap((t) => t.paradas).length === 2);
ok('sin paradas, sin tramos', tramosMaps(qro, []).length === 0);

console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
