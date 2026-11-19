/* La predicción del giro (prediccion.js), en Node: gira a velocidad fija y la vista predicha va adelante lo justo;
   quieto (con temblor del sensor) no se mueve; una lectura loca no voltea la vista.
     node vr/pruebas-prediccion.mjs */
import { crearPredictor } from './prediccion.js';
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
const giroY = (rad) => ({ w: Math.cos(rad / 2), x: 0, y: Math.sin(rad / 2), z: 0 });
const anguloY = (q) => 2 * Math.atan2(q.y, q.w);

/* 1 · gira 90°/s en y, lecturas cada 16 ms: a los 20 ms de adelanto debe ir ~1.8° más adelante */
{ const p = crearPredictor(), w = Math.PI / 2;
  for(let i = 0; i <= 30; i++) p.muestra(giroY(w * i * .016), i * 16);
  const t = 30 * 16, real = w * t / 1000, pred = anguloY(p.predecir(t));
  const adel = (pred - real) * 180 / Math.PI;
  sí(Math.abs(adel - 1.8) < .25, `girando a 90°/s, la vista va ${adel.toFixed(2)}° adelante (lo de 20 ms: 1.8°)`);
  const tarde = anguloY(p.predecir(t + 10)) - real;
  sí(Math.abs(tarde * 180 / Math.PI - 2.7) < .3, `si el cuadro sale 10 ms después de la lectura, adelanta 30 ms (${(tarde * 180 / Math.PI).toFixed(2)}°)`); }

/* 2 · quieto con temblor del sensor (±0.15°): la vista predicha es la misma lectura */
{ const p = crearPredictor(); let k = 7; const az = () => ((k = (k * 16807) % 2147483647) / 2147483647 - .5);
  let peor = 0;
  for(let i = 0; i <= 120; i++){ const q = giroY(az() * .15 * Math.PI / 180 * 2); p.muestra(q, i * 16); if(i > 10) peor = Math.max(peor, Math.abs(anguloY(p.predecir(i * 16)) - anguloY(q))); }
  sí(peor < 1e-6, `quieto (temblor de ±0.15°) no predice nada: la imagen no «hierve» (diferencia ${(peor * 180 / Math.PI).toFixed(4)}°)`); }

/* 3 · una lectura loca (brinco de 170° en 16 ms) no voltea la vista: tope de 0.25 rad (~14°) */
{ const p = crearPredictor();
  for(let i = 0; i < 10; i++) p.muestra(giroY(0), i * 16);
  p.muestra(giroY(170 * Math.PI / 180), 160);
  const d = Math.abs(anguloY(p.predecir(160)) - 170 * Math.PI / 180);
  sí(d <= .2501, `una lectura loca adelanta como mucho 14° (${(d * 180 / Math.PI).toFixed(1)}°)`); }

/* 4 · un hueco largo entre lecturas (la página se pausó) no se vuelve velocidad */
{ const p = crearPredictor();
  p.muestra(giroY(0), 0); p.muestra(giroY(1), 5000);
  sí(p.velocidad === 0, 'tras una pausa de 5 s, la velocidad vuelve a cero (no inventa un giro)'); }

/* 5 · al frenar, la predicción se apaga sola */
{ const p = crearPredictor(), w = Math.PI;
  for(let i = 0; i <= 20; i++) p.muestra(giroY(w * i * .016), i * 16);
  const fin = w * 20 * .016; for(let i = 21; i <= 40; i++) p.muestra(giroY(fin), i * 16);
  const d = Math.abs(anguloY(p.predecir(40 * 16)) - fin);
  sí(d < 1e-3, `al dejar de girar, la vista se queda donde está (${(d * 180 / Math.PI).toFixed(3)}°)`); }

console.log(`${ok} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
