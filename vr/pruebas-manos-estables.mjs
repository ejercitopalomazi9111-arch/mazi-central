/* MAZI VR · manos que no se deforman ni se voltean (manos-estables.js), con una mano inventada de la que se sabe la verdad.
     node vr/pruebas-manos-estables.mjs */
import { crearEstable, normalPalma } from './manos-estables.js';
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
/* una mano abierta (metros, MediaPipe pone el centro de la mano en el origen) y su imagen (0..1) */
function mano(){ const W = [{ x: 0, y: .08, z: 0 }];
  [[-.04, -.035], [-.02, -.01], [0, -.005], [.02, -.01], [.04, -.02]].forEach(([x, y], f) => {
    for(let k = 0; k < 4; k++) W.push({ x: x * (f === 0 ? 1.2 : 1) + (f === 0 ? -.012 * k : 0), y: y - .022 * k, z: 0 }); });
  return W; }
const aImagen = (W, dx = .5, dy = .5, s = 2, giro = 0) => W.map((p) => ({ x: dx + s * (Math.cos(giro) * p.x - Math.sin(giro) * p.y), y: dy + s * (Math.sin(giro) * p.x + Math.cos(giro) * p.y), z: p.z }));
const giraW = (W, g) => W.map((p) => ({ x: Math.cos(g) * p.x - Math.sin(g) * p.y, y: Math.sin(g) * p.x + Math.cos(g) * p.y, z: p.z }));
const cerca = (A, B, tol) => A.every((p, i) => Math.hypot(p.x - B[i].x, p.y - B[i].y) < tol);
const W0 = mano();

/* 1. una mano normal que se mueve y gira pasa igual que llega */
{ const e = crearEstable(); let todo = true;
  for(let i = 0; i < 30; i++){ const g = i * .03, W = giraW(W0, g), L = aImagen(W, .4 + i * .005, .5, 2, 0); const r = e.paso(L, W, 'Right', .95); if(!cerca(r.L, L, 1e-9) || r.dudosos.length) todo = false; }
  sí(todo, 'una mano sana que se mueve y gira pasa tal cual (nada inventado, nada sostenido)'); }
/* 2. el índice tapado: MediaPipe lo inventa estirado al doble → se queda en su forma buena, pegada a la palma */
{ const e = crearEstable(); for(let i = 0; i < 15; i++) e.paso(aImagen(W0), W0, 'Right', .95);
  const W = W0.map((p) => ({ ...p })); for(const i of [6, 7, 8]) W[i] = { x: W0[i].x, y: W0[5].y + (W0[i].y - W0[5].y) * 2.1, z: 0 };
  const L = aImagen(W, .52, .5), r = e.paso(L, W, 'Right', .95), bueno = aImagen(W0, .52, .5);
  sí(r.dudosos.includes(1) && cerca([6, 7, 8].map((i) => r.L[i]), [6, 7, 8].map((i) => bueno[i]), 1e-6), `el índice inventado (estirado al doble) se queda en su forma buena y sigue a la palma (dedos dudosos: ${r.dudosos.join(',')})`);
  sí(cerca([12, 16, 20].map((i) => r.L[i]), [12, 16, 20].map((i) => L[i]), 1e-9), 'los otros dedos siguen saliendo de la lectura real'); }
/* 3. un dedo doblado hacia atrás (más de 125°) también se toma como inventado */
{ const e = crearEstable(); for(let i = 0; i < 15; i++) e.paso(aImagen(W0), W0, 'Right', .95);
  const W = W0.map((p) => ({ ...p })); W[11] = { x: W0[10].x + .0, y: W0[10].y + .021, z: .004 }; W[12] = { x: W0[10].x, y: W0[10].y, z: .02 };
  const r = e.paso(aImagen(W), W, 'Right', .95); sí(r.dudosos.includes(2), `el medio doblado al revés no se dibuja (dudosos: ${r.dudosos.join(',')})`); }
/* 4. palma volteada de golpe por un instante → se sostiene; si sigue volteada → era real y se acepta */
{ const e = crearEstable(); for(let i = 0; i < 15; i++) e.paso(aImagen(W0), W0, 'Right', .95);
  const voltea = W0.map((p) => ({ x: -p.x, y: p.y, z: p.z }));   /* la mano en espejo: la palma apunta al otro lado */
  const r1 = e.paso(aImagen(voltea), voltea, 'Right', .95);
  /* la forma es la buena (no la del espejo), puesta donde está la palma ahora */
  const rel = (A) => A.map((p) => ({ x: p.x - A[0].x, y: p.y - A[0].y })), buena = aImagen(W0);
  sí(r1.sostenida && cerca(rel(r1.L), rel(buena), 1e-6) && !cerca(rel(r1.L), rel(aImagen(voltea)), .01), 'la palma volteada de golpe (un cuadro) se ignora: queda la forma de la mano buena');
  const r2 = e.paso(aImagen(W0), W0, 'Right', .95); sí(!r2.sostenida, 'al volver la lectura buena, sigue normal');
  let r; for(let i = 0; i < 5; i++) r = e.paso(aImagen(voltea), voltea, 'Right', .95);
  sí(!r.sostenida && cerca(r.L, aImagen(voltea), 1e-9), 'si sigue volteada varias lecturas, era tu mano de verdad y se acepta'); }
/* 5. el lado (izquierda/derecha) no cambia por una lectura suelta */
{ const e = crearEstable(); for(let i = 0; i < 10; i++) e.paso(aImagen(W0), W0, 'Right', .95);
  let r; for(let i = 0; i < 3; i++) r = e.paso(aImagen(W0), W0, 'Left', .9);
  sí(r.lado === 'Right', 'tres lecturas de «izquierda» no cambian la mano derecha');
  for(let i = 0; i < 8; i++) r = e.paso(aImagen(W0), W0, 'Left', .9);
  sí(r.lado === 'Left', 'ocho seguidas sí (era la otra mano)'); }
/* 6. un puño de verdad (dedos doblados, mismos largos) NO es inventado */
{ const e = crearEstable(); for(let i = 0; i < 15; i++) e.paso(aImagen(W0), W0, 'Right', .95);
  const W = W0.map((p) => ({ ...p })); for(const f of [[5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]]){ const b = W0[f[0]];
    W[f[1]] = { x: b.x, y: b.y - .022 * Math.cos(.9), z: .022 * Math.sin(.9) }; W[f[2]] = { x: b.x, y: W[f[1]].y - .022 * Math.cos(1.9), z: W[f[1]].z + .022 * Math.sin(1.9) }; W[f[3]] = { x: b.x, y: W[f[2]].y - .022 * Math.cos(2.6), z: W[f[2]].z + .022 * Math.sin(2.6) }; }
  const r = e.paso(aImagen(W), W, 'Right', .95); sí(r.dudosos.length === 0, `cerrar la mano (puño de verdad) no se confunde con dedos inventados (dudosos: ${r.dudosos.join(',') || 'ninguno'})`); }
/* LO QUE VIO CARLOS EN EL VISOR (19 nov) */
/* 7. aprender con la mano CERRADA y luego abrirla: los dedos no se quedan congelados chiquitos (a lo más 4 lecturas) */
{ const puno = W0.map((p) => ({ ...p })); for(const f of [[5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]]){ const b = W0[f[0]];
    /* un puño mal leído: los dedos se ven cortitos (MediaPipe los encoge al taparse) */
    for(let k = 1; k < 4; k++) puno[f[k]] = { x: b.x + .002 * k, y: b.y - .009 * k, z: .004 * k }; }
  const e = crearEstable(); for(let i = 0; i < 15; i++) e.paso(aImagen(puno), puno, 'Right', .95);
  let r, n = 0; const L = aImagen(W0); for(; n < 10; n++){ r = e.paso(L, W0, 'Right', .95); if(cerca(r.L, L, 1e-9)) break; }
  sí(n <= 4, `aprender con el puño y abrir la mano: en ${n + 1} lecturas los dedos ya salen estirados como son (antes: congelados para siempre)`);
  let fijos = true; for(let i = 0; i < 10; i++){ r = e.paso(L, W0, 'Right', .95); if(r.dudosos.length) fijos = false; }
  sí(fijos, 'y ya re-aprendió sus largos: la mano abierta deja de parecer «rara»'); }
/* 8. la mano VOLTEADA en espejo (palma arriba) con un dedo raro: el dedo viejo NO se pega girado media vuelta */
{ const e = crearEstable(); for(let i = 0; i < 15; i++) e.paso(aImagen(W0), W0, 'Right', .95);
  const W = W0.map((p) => ({ ...p })); for(const i of [6, 7, 8]) W[i] = { x: W0[i].x, y: W0[5].y + (W0[i].y - W0[5].y) * 2.1, z: 0 };
  const espejo = aImagen(W).map((p) => ({ x: 1 - p.x, y: p.y, z: p.z }));
  const r = e.paso(espejo, W, 'Right', .95);
  const lejos = Math.max(...[6, 7, 8].map((i) => Math.hypot(r.L[i].x - espejo[i].x, r.L[i].y - espejo[i].y)));
  sí(!r.dudosos.includes(1) && lejos < 1e-9, `palma volteada en la imagen: el índice sale de la lectura, no disparado al otro lado (diferencia ${lejos.toFixed(3)})`); }
/* 9. un dedo de verdad raro (inventado) se sostiene, pero no más de 3 lecturas seguidas */
{ const e = crearEstable(); for(let i = 0; i < 15; i++) e.paso(aImagen(W0), W0, 'Right', .95);
  const W = W0.map((p) => ({ ...p })); for(const i of [6, 7, 8]) W[i] = { x: W0[i].x, y: W0[5].y + (W0[i].y - W0[5].y) * 2.1, z: 0 };
  const sost = []; for(let i = 0; i < 7; i++) sost.push(e.paso(aImagen(W), W, 'Right', .95).dudosos.includes(1));
  sí(sost.filter(Boolean).length === 3 && !sost[3], `el índice raro se sostiene 3 lecturas y a la cuarta se acepta (${sost.map((x) => x ? 'S' : '·').join('')})`); }
/* 10. EL RUIDO DE LAS PUNTAS (fotos del 19 nov en la noche): MediaPipe mueve cada falange ±0.6 cm; eso no es un dedo inventado */
{ const e = crearEstable(); for(let i = 0; i < 15; i++) e.paso(aImagen(W0), W0, 'Right', .95);
  let k = 7; const az = () => ((k = (k * 16807) % 2147483647) / 2147483647 - .5); let marcados = 0;
  for(let n = 0; n < 60; n++){ const W = W0.map((p, i) => i > 1 && i % 4 !== 1 ? { x: p.x + az() * .012, y: p.y + az() * .012, z: p.z + az() * .012 } : { ...p });
    marcados += e.paso(aImagen(W), W, 'Right', .95).dudosos.length; }
  sí(marcados <= 3, `el temblor normal de las puntas casi nunca se toma por dedo inventado (${marcados} dedos sostenidos en 60 lecturas)`); }
console.log(`${ok} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
