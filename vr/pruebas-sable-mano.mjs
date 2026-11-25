/* MAZI VR · el sable pegado a la palma (sable-mano.js), con una mano inventada de la que se sabe la verdad.
     node vr/pruebas-sable-mano.mjs */
import { crearSable, marco, aMundo, anguloEntre } from './sable-mano.js';
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
const grados = (a, b) => anguloEntre(a, b) * 180 / Math.PI;
/* una palma girada «g» radianes sobre el eje z del mundo (de lado), con adelante = arriba cuando g = 0 */
const palma = (g, ruido = 0, azar = Math.random) => {
  const r = () => (azar() - .5) * ruido;
  return { adelante: [-Math.sin(g) + r(), Math.cos(g) + r(), r()], lado: [Math.cos(g) + r(), Math.sin(g) + r(), r()], palma: [0, 0, -.4] };
};
let semilla = 3; const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;

/* 1. de fábrica, el sable sale hacia «adelante» de la palma */
{ const s = crearSable('1'); const r = s.paso(palma(0), 0); sí(grados(r.dir, [0, 1, 0]) < .5, `de fábrica sale hacia adelante de la palma (${grados(r.dir, [0, 1, 0]).toFixed(2)}°)`); }
/* 2. cerrar la mano no lo mueve: el marco no usa las puntas de los dedos (aquí las puntas ni existen) */
{ const M = marco([0, 1, 0], [1, .2, 0]); sí(Math.abs(M.x[0] * M.y[0] + M.x[1] * M.y[1] + M.x[2] * M.y[2]) < 1e-9, 'el marco es recto aunque «lado» venga chueco'); }
/* 3. calibrar: la mano en puño apunta su «lado» hacia arriba → desde ahí el sable sale por el lado del pulgar */
{ const s = crearSable('-1'); s.calibrar(); let r, t = 0;
  for(let i = 0; i < 40 && !r?.calibrado; i++){ r = s.paso(palma(Math.PI / 2, .03, azar), t); t += 1 / 30; }   /* girada 90°: «lado» = arriba */
  sí(!!r.calibrado, `calibrar termina con la mano firme (${Math.round(t * 30)} lecturas)`);
  const g = s.paso(palma(0), t + .5);   /* ahora la mano derecha: «lado» apunta a +x */
  sí(grados(g.dir, [1, 0, 0]) < 4, `calibrado, el sable sigue a la palma por su lado (${grados(g.dir, [1, 0, 0]).toFixed(1)}° del lado)`); }
/* 4. calibrar no termina si la mano no está firme */
{ const s = crearSable('1'); s.calibrar(); let r, t = 0;
  for(let i = 0; i < 60; i++){ r = s.paso(palma(Math.sin(i) * .6), t); t += 1 / 30; }
  sí(!r.calibrado && s.st.cal, 'con la mano moviéndose, calibrar espera'); }
/* 5. temblor: con la mano casi quieta y ruido de 3°, el sable tiembla mucho menos */
{ const s = crearSable('1'); let t = 0, antes = null, salto = 0, crudoSalto = 0, crudoAntes = null;
  for(let i = 0; i < 120; i++){ const p = palma(0, .1, azar); const r = s.paso(p, t); t += 1 / 60;
    const c = aMundo(marco(p.adelante, p.lado), [0, 1, 0]);
    if(antes){ salto += grados(antes, r.dir); crudoSalto += grados(crudoAntes, c); } antes = r.dir; crudoAntes = c; }
  sí(salto < crudoSalto * .45, `el temblor de la mano quieta baja (${(salto / 119).toFixed(2)}° por cuadro contra ${(crudoSalto / 119).toFixed(2)}°)`); }
/* 6. corte rápido: 120° en 0.15 s llega casi sin retraso */
{ const s = crearSable('1'); let t = 0, r; for(let i = 0; i < 10; i++){ r = s.paso(palma(0), t); t += 1 / 60; }
  for(let i = 1; i <= 9; i++){ r = s.paso(palma(i / 9 * 2.1), t); t += 1 / 60; }
  const fin = aMundo(marco(palma(2.1).adelante, palma(2.1).lado), [0, 1, 0]);
  sí(grados(r.dir, fin) < 8, `un corte rápido de 120° llega casi a tiempo (${grados(r.dir, fin).toFixed(1)}° atrás)`); }
/* 7. si la mano se pierde un instante, el sable se queda; si se pierde más, se apaga */
{ const s = crearSable('1'); s.paso(palma(0), 0);
  const a = s.paso(null, .2), b = s.paso(null, .5);
  sí(a?.sostenido && !b, `perdida 0.2 s se queda (${!!a?.sostenido}); 0.5 s se apaga (${!b})`); }
console.log(`${ok} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
