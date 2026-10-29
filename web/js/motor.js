/* Lo poco del motor de los anuncios que usa el logo en 3D de la página: la paleta y el logo plano.
   Copia de marca/anuncios/motor.js (si cambia allá, se copia aquí). */
import { PIEZAS } from './piezas.js';
export { PIEZAS };
export const PAL = {
  oscuro: '#170A26', oscuro2: '#241036', negro: '#0B0B0F',
  vino: '#7E1735', vino2: '#A8264B', claro: '#F4EEF2', gris: '#B9AFC4',
  techo: '#AC27FF', izq: '#34343D', der: '#52525D',
};

/* el logo en un lienzo 2D */
const rutas = {};
const pth = (d) => rutas[d] || (rutas[d] = new Path2D(d));
export function logo2d(x, { cx, cy, ancho, soloCubo = false, letra = PAL.claro, partes = null, alfa = 1 }){
  const kc = 100 / 98, total = soloCubo ? 92 : PIEZAS.ancho + 24 + 92 * kc, e = ancho / total;
  x.save(); x.globalAlpha = alfa; x.translate(cx - ancho / 2, cy + 50 * e);
  if(!soloCubo){ x.save(); x.scale(e, e); x.fillStyle = letra; x.fill(pth(PIEZAS.mazi.join(' '))); x.restore(); x.translate((PIEZAS.ancho + 24) * e, 0); }
  x.translate(0, -(100 + 6 * kc) * e); x.scale(kc * e, kc * e);
  if(soloCubo) x.translate(-8, 0);
  const C = { arriba: PAL.techo, izq: PAL.izq, der: PAL.der };
  for(const [k, d] of Object.entries(partes || PIEZAS.cubo)){ x.fillStyle = C[k]; x.fill(pth(d)); }
  x.restore();
}
