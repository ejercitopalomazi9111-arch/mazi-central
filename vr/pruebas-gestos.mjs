/* MAZI VR · los gestos sin cámara: manos armadas a mano (21 puntos) y lo que leer() debe decir de cada una.
     node vr/pruebas-gestos.mjs */
import { leer } from './gestos.js';
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
/* una mano vertical: muñeca abajo; cada dedo es una columna; estirado = puntas arriba, doblado = puntas cerca del nudillo */
function mano({ estirados = [1, 1, 1, 1], pulgarAIndice = false }){
  const P = Array.from({ length: 21 }, () => ({ x: .5, y: .8, z: 0 }));
  P[0] = { x: .5, y: .8, z: 0 };
  const xs = [.44, .48, .52, .56];
  [[5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]].forEach((ids, k) => {
    const x = xs[k]; P[ids[0]] = { x, y: .65, z: 0 };
    if(estirados[k]){ P[ids[1]] = { x, y: .6, z: 0 }; P[ids[2]] = { x, y: .55, z: 0 }; P[ids[3]] = { x, y: .5, z: 0 }; }
    else { P[ids[1]] = { x, y: .62, z: 0 }; P[ids[2]] = { x, y: .66, z: 0 }; P[ids[3]] = { x, y: .68, z: 0 }; }
  });
  P[1] = { x: .42, y: .76, z: 0 }; P[2] = { x: .38, y: .72, z: 0 }; P[3] = { x: .35, y: .68, z: 0 };
  P[4] = pulgarAIndice ? { x: P[8].x + .005, y: P[8].y + .005, z: 0 } : { x: .32, y: .64, z: 0 };
  return P;
}
const abierta = leer(mano({}));
sí(abierta.palma && !abierta.pellizca && !abierta.puno, 'palma abierta');
const pinza = leer(mano({ pulgarAIndice: true }));
sí(pinza.pellizca && !pinza.palma, 'pellizco (pulgar con índice)');
const apunta = leer(mano({ estirados: [1, 0, 0, 0] }));
sí(apunta.apunta && !apunta.palma && !apunta.pellizca, 'apunta con el índice');
const puno = leer(mano({ estirados: [0, 0, 0, 0] }));
sí(puno.puno && !puno.apunta && !puno.palma, 'puño');
/* el tamaño no importa: la misma mano a la mitad de tamaño dice lo mismo */
const chica = mano({ pulgarAIndice: true }).map((p) => ({ x: .5 + (p.x - .5) / 2, y: .5 + (p.y - .5) / 2, z: 0 }));
sí(leer(chica).pellizca, 'pellizco de una mano lejana (la mitad de tamaño)');
console.log(`${ok} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
