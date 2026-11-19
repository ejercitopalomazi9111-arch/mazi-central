/* MAZI VR · PREDECIR EL GIRO («time warp» casero). Investigación del 19 nov (vr/investigacion/INVESTIGACION-XR.md, R2):
   Oculus bajó el mareo del DK1 al DK2 dibujando con la pose PREDICHA para cuando la imagen llega al ojo, no con la última
   medida. Aquí: el giroscopio del teléfono avisa ~60 veces por segundo; con las dos últimas lecturas se saca la velocidad
   de giro y se adelanta la vista lo que tarda en salir el cuadro (`adelanto`, 20 ms de fábrica).
     · Sólo afecta lo que se DIBUJA. El 6DoF (seis.js) sigue recibiendo la lectura real.
     · Quieto no se predice nada: abajo de `quieto` rad/s la predicción se apaga suave (si no, el temblor del sensor se
       volvería un «hervor» de la imagen).
     · Tope: nunca adelanta más de `maxMs` ni más de `maxRad` (una lectura rara no puede voltear la vista).
   Sin dependencias: se prueba en Node (vr/pruebas-prediccion.mjs). Cuaterniones {x, y, z, w} como los de three. */

export const PRED = { adelanto: 20, maxMs: 50, maxRad: .25, quieto: .25, lleno: .7, suave: .5 };

const mul = (a, b) => ({
  w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
  y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
  z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w });
const inv = (q) => ({ w: q.w, x: -q.x, y: -q.y, z: -q.z });
const norm = (q) => { const n = Math.hypot(q.w, q.x, q.y, q.z) || 1; return { w: q.w / n, x: q.x / n, y: q.y / n, z: q.z / n }; };

export function crearPredictor(op = {}){
  const P = { ...PRED, ...op };
  let qAnt = null, tAnt = 0, qUlt = null, tUlt = 0;
  const w = { x: 0, y: 0, z: 0 };   /* velocidad de giro en el marco del mundo (rad/s), suavizada */
  /* una lectura nueva del giroscopio (q en el marco del mundo, t en ms) */
  function muestra(q, t){
    q = norm(q);
    if(qUlt && t > tUlt){
      const dt = (t - tUlt) / 1000;
      if(dt > 0 && dt < .2){
        let d = mul(q, inv(qUlt)); if(d.w < 0) d = { w: -d.w, x: -d.x, y: -d.y, z: -d.z };
        const s = Math.sqrt(Math.max(0, 1 - d.w * d.w)), ang = 2 * Math.atan2(s, d.w);
        const k = s > 1e-6 ? ang / s / dt : 0;
        const a = P.suave;
        w.x += (d.x * k - w.x) * a; w.y += (d.y * k - w.y) * a; w.z += (d.z * k - w.z) * a;
      } else { w.x = w.y = w.z = 0; }
    }
    qAnt = qUlt; tAnt = tUlt; qUlt = q; tUlt = t;
  }
  /* la vista para el momento `t` (ms) más el adelanto */
  function predecir(t){
    if(!qUlt) return null;
    const vel = Math.hypot(w.x, w.y, w.z);
    const f = vel <= P.quieto ? 0 : vel >= P.lleno ? 1 : (vel - P.quieto) / (P.lleno - P.quieto);
    const ms = Math.min(P.maxMs, Math.max(0, t - tUlt) + P.adelanto);
    const ang = Math.min(P.maxRad, vel * ms / 1000) * f;
    if(ang < 1e-5) return qUlt;
    const h = ang / 2, s = Math.sin(h) / vel;
    return norm(mul({ w: Math.cos(h), x: w.x * s, y: w.y * s, z: w.z * s }, qUlt));
  }
  return { muestra, predecir, get velocidad(){ return Math.hypot(w.x, w.y, w.z); }, P };
}
