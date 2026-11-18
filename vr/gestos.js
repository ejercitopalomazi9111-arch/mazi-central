/* MAZI VR · leer una mano: de los 21 puntos de MediaPipe a «pellizca», «palma abierta», «apunta» o «puño».
   Aparte del rastreo para poder probarlo sin cámara (vr/pruebas-gestos.mjs). Las distancias se miden contra el
   tamaño de la propia mano (muñeca → nudillo del medio), así da igual si la mano está cerca o lejos.
   Puntos: 0 muñeca · 4 punta del pulgar · 8 índice · 12 medio · 16 anular · 20 meñique · 5/9/13/17 nudillos. */
export const d = (a, b, asp = 1) => Math.hypot((a.x - b.x) * asp, a.y - b.y);
export function tamano(l, asp = 1){ return d(l[0], l[9], asp) || 1e-6; }
/* un dedo está estirado si su punta queda bastante más lejos de la muñeca que su nudillo */
const estirado = (l, punta, nudillo, s, asp) => d(l[punta], l[0], asp) > d(l[nudillo], l[0], asp) + .55 * s;
export function leer(l, asp = 1){
  const s = tamano(l, asp);
  const pinza = d(l[4], l[8], asp) / s;
  const dedos = [[8, 5], [12, 9], [16, 13], [20, 17]].map(([p, n]) => estirado(l, p, n, s, asp));
  const n = dedos.filter(Boolean).length;
  return {
    s, pinza,
    pellizca: pinza < .32,
    suelta: pinza > .5,
    palma: n === 4 && pinza > .6,
    apunta: dedos[0] && n <= 2,
    puno: n === 0 && pinza > .25,
  };
}
