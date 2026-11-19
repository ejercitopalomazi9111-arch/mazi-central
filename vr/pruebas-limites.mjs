/* MAZI VR · obstáculos y zona segura (limites.js), con un cuarto inventado: piso, una cama al lado y ruido suelto.
     node vr/pruebas-limites.mjs */
import { crearLimites } from './limites.js';
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
let semilla = 5; const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
/* el cuarto: piso a y = −1.6 (estás parado, tus ojos en 0), de −2 a 2 m; una cama de x 0.8..1.6, z −1..1, alta 0.5 m */
const puntos = [];
for(let i = 0; i < 1500; i++) puntos.push([azar() * 4 - 2, -1.6 + (azar() - .5) * .02, azar() * 4 - 2]);
for(let i = 0; i < 600; i++){ const x = .8 + azar() * .8, z = -1 + azar() * 2; puntos.push([x, -1.1 + (azar() - .5) * .02, z]);   /* el colchón */
  puntos.push([.8 + (azar() - .5) * .02, -1.6 + azar() * .5, z]); }                                                            /* la orilla */
for(let i = 0; i < 15; i++) puntos.push([-1 + azar() * 2, -.5 + azar(), -1 + azar() * 2]);   /* ruido suelto en el aire */
for(let i = 0; i < 150; i++) puntos.push([azar() * 4 - 2, -4 + azar() * 2, azar() * 4 - 2]);   /* ruido muy abajo (lo que da el rastreo real) */
const pos = new Float32Array(puntos.flat());
const lim = () => { const l = crearLimites(); l.agregar(pos, puntos.length); return l; };

{ const l = lim(); l.paso([-.5, 0, 0]); sí(Math.abs(l.st.piso + 1.6) < .06, `encuentra el piso aunque haya ruido muy abajo (${l.st.piso?.toFixed(2)} m)`); }
{ const l = lim(); const a = l.paso([-.5, 0, 0]); sí(a === null && l.st.cerca > .9, `en medio del cuarto no avisa (lo más cerca a ${l.st.cerca.toFixed(2)} m: el ruido suelto no cuenta)`); }
{ const l = lim(); const a = l.paso([.45, 0, 0]); sí(a === 'obstaculo' && l.st.cerca < .5 && Math.abs(l.st.haciaX - .85) < .1, `a 35 cm de la cama avisa «obstáculo» y sabe hacia dónde (${l.st.cerca.toFixed(2)} m, x ${l.st.haciaX.toFixed(2)})`);
  const b = l.paso([.27, 0, 0]); sí(b === null && l.st.obstaculo, 'sigue en aviso sin repetirlo');
  l.paso([.22, 0, 0]); const c = l.st.obstaculo; l.paso([-.1, 0, 0]);
  sí(c && !l.st.obstaculo, 'deja de avisar hasta pasar 65 cm (no parpadea en la orilla)'); }
/* sentado: los ojos más abajo; el piso no cambia y la cama sigue siendo obstáculo */
{ const l = lim(); l.paso([.45, -.5, 0]); sí(l.st.obstaculo, 'sentado (ojos 50 cm más abajo), la cama sigue contando'); }
/* el piso solo nunca es obstáculo */
{ const l = crearLimites(); const p = []; for(let i = 0; i < 800; i++) p.push(azar() * 4 - 2, -1.6 + (azar() - .5) * .03, azar() * 4 - 2); l.agregar(new Float32Array(p), 800);
  l.paso([0, 0, 0]); sí(!l.st.obstaculo && l.st.cerca === Infinity, 'un cuarto vacío (sólo piso) no tiene obstáculos'); }
/* zona segura */
{ const l = crearLimites(); l.ponerZona([0, 0, 0], 1);
  const a = l.paso([.5, 0, 0]), p1 = l.st.pared; const b = l.paso([.9, 0, 0]), p2 = l.st.pared; const c = l.paso([1.1, 0, 0]);
  sí(a === null && p1 === 0 && b === null && p2 > .4 && c === 'zona', `la pared de la zona sale al acercarte (${p2.toFixed(2)}) y afuera avisa «zona»`);
  l.paso([.97, 0, 0]); const sigue = l.st.fuera; l.paso([.9, 0, 0]); sí(sigue && !l.st.fuera, 'al volver adentro deja de avisar (sin parpadeo en la orilla)'); }
/* agregar por pedazos = agregar todo de un jalón */
{ const a = lim(), b = crearLimites(); b.agregar(pos, 1000); b.agregar(pos, puntos.length); a.paso([.45, 0, 0]); b.paso([.45, 0, 0]);
  sí(Math.abs(a.st.cerca - b.st.cerca) < 1e-9 && b.cercanas([.45, 0, 0]).length > 5, `los puntos que llegan por pedazos dan lo mismo (${b.cercanas([.45, 0, 0]).length} casillas de cama cerca)`); }
console.log(`${ok} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
