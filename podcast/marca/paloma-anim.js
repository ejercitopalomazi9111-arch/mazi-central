/* LA PALOMA QUE SE MUEVE · el logo de Radio Divergentes en vectores
   ----------------------------------------------------------------------------
   Los trazos salen de paloma.svg (herramientas/vector-mascara.py), separados
   por partes con su punto de giro. Aquí se animan en un <canvas>:

     · se DIBUJA sola: cada trazo se va trazando y luego se rellena;
     · las alas aletean desde el hombro, el cuerpo sube y baja con ellas;
     · los audífonos laten con la música (`nivel`, de 0 a 1) y la cabeza
       sigue el ritmo.

   Se usa en la entrada del video. Para otra animación basta con mover las
   partes: cada una trae sus trazos y su pivote. */
import V from './paloma-vector.js';

export const PALOMA = { ancho: V.ancho, alto: V.alto };
const ORDEN = ['ala-izq', 'ala-baja', 'cuerpo', 'cable', 'ala-der', 'cabeza', 'audifonos', 'resto'];
let partes = null;
function largo(d){
  try{ const e = document.createElementNS('http://www.w3.org/2000/svg', 'path'); e.setAttribute('d', d); return e.getTotalLength(); }
  catch(err){ return 4000; }
}
function preparar(){
  if(partes) return partes;
  partes = {};
  for(const n of ORDEN){
    const p = V.partes[n]; if(!p) continue;
    partes[n] = { trazos: p.trazos.map(d => new Path2D(d)), largos: p.trazos.map(largo), piv: p.pivote };
  }
  return partes;
}
const lim = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
const suave = (x) => { x = lim(x); return x * x * (3 - 2 * x); };

/* dibuja la paloma centrada en (cx, cy) con `alto` pixeles de alto, en el
   segundo `t` de su animación */
export function dibujarPaloma(g, cx, cy, alto, t, { color = '#FFFFFF', nivel = 0, dibuja = 1.3, aleteo = 1, opacidad = 1 } = {}){
  const P = preparar(), k = alto / V.alto;
  const traza = lim(t / dibuja), relleno = suave((t - dibuja * 0.6) / (dibuja * 0.6));
  const ritmo = Math.sin(t * 5.2), ya = suave((t - dibuja * 0.5) / 0.8) * aleteo;
  g.save();
  g.globalAlpha *= opacidad;
  g.translate(cx - V.ancho * k / 2, cy - alto / 2 + ritmo * 8 * k * ya);
  g.scale(k, k);
  g.fillStyle = color; g.strokeStyle = color; g.lineWidth = 2.2 / Math.max(k, 0.05) * 0.5 + 2;
  g.lineJoin = 'round'; g.lineCap = 'round';
  for(const n of ORDEN){
    const p = P[n]; if(!p) continue;
    g.save();
    let ang = 0, esc = 1;
    if(n === 'ala-izq') ang = -(0.05 + 0.07 * ritmo) * ya;
    if(n === 'ala-der') ang = (0.06 + 0.09 * ritmo) * ya;
    if(n === 'ala-baja') ang = (0.03 + 0.04 * ritmo) * ya;
    if(n === 'cabeza') ang = nivel * 0.06 * Math.sin(t * 9);
    if(n === 'audifonos') esc = 1 + nivel * 0.07;
    if(p.piv && (ang || esc !== 1)){ g.translate(p.piv[0], p.piv[1]); g.rotate(ang); g.scale(esc, esc); g.translate(-p.piv[0], -p.piv[1]); }
    p.trazos.forEach((tr, i) => {
      if(traza < 1){
        const L = p.largos[i];
        g.setLineDash([L, L]); g.lineDashOffset = L * (1 - traza);
        g.stroke(tr);
      }
      if(relleno > 0){ g.globalAlpha = g.globalAlpha * relleno; g.fill(tr, 'evenodd'); g.globalAlpha = g.globalAlpha / relleno; }
    });
    g.restore();
  }
  g.setLineDash([]);
  g.restore();
}
