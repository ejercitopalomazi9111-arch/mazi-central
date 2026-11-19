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
console.log(`${ok} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
