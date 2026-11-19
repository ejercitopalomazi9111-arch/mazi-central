/* MAZI VR · MANOS QUE NO SE DEFORMAN NI SE VOLTEAN (guía de Carlos, 19 nov: «cuando el sistema pierde de vista algunos
   dedos intenta inventar su posición: la mano cambia de forma, los dedos se estiran o se doblan raro, o confunde una mano
   con la otra o invierte la palma»).
   Antes de que la mano se suavice y se dibuje, cada lectura de MediaPipe pasa por aquí:
     · LARGOS DE HUESO: los primeros cuadros buenos aprenden cuánto mide cada hueso de ESA mano (en metros, de
       worldLandmarks). Un dedo cuyos huesos de repente miden 40 % más o menos (o que se dobla más de 125° en una
       articulación) es un dedo inventado: se queda en su última forma buena, pegada a la palma de AHORA (se mueve, gira y
       crece con la palma), en vez de deformarse.
     · PALMA VOLTEADA DE GOLPE: si la palma gira más de 120° entre dos lecturas, es la confusión de MediaPipe, no tu mano:
       se sostiene la mano buena hasta 3 lecturas; si sigue volteada, entonces sí era tu mano y se acepta.
     · LADO (izquierda/derecha): la etiqueta sólo cambia si la nueva se repite 8 lecturas seguidas con confianza.
   Sin dependencias: se prueba en Node (vr/pruebas-manos-estables.mjs). Puntos: { x, y, z }. */
export const DEDOS = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
const PALMA = [0, 5, 9, 13, 17];
export const LIM = { largo: .4, angulo: 125, voltea: 120, sostenerVolteo: 3, aprender: 12, cambiarLado: 8 };
const d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const resta = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const cruz = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const largo = (v) => Math.hypot(v.x, v.y, v.z) || 1e-9;
const angulo = (a, b) => Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y + a.z * b.z) / (largo(a) * largo(b))))) * 180 / Math.PI;
export const normalPalma = (W) => cruz(resta(W[5], W[0]), resta(W[17], W[0]));
const mediana = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[s.length >> 1]; };

/* la semejanza 2D (girar, escalar, mover) que lleva la palma de antes a la de ahora; se aplica a un dedo guardado */
function semejanza(P, Q, conGiro = true){
  let px = 0, py = 0, qx = 0, qy = 0; for(const i of PALMA){ px += P[i].x; py += P[i].y; qx += Q[i].x; qy += Q[i].y; }
  px /= 5; py /= 5; qx /= 5; qy /= 5;
  let pp = 0, qq = 0, dot = 0, cr = 0;
  for(const i of PALMA){ const ax = P[i].x - px, ay = P[i].y - py, bx = Q[i].x - qx, by = Q[i].y - qy; pp += ax * ax + ay * ay; qq += bx * bx + by * by; dot += ax * bx + ay * by; cr += ax * by - ay * bx; }
  const th = conGiro ? Math.atan2(cr, dot) : 0, s = Math.sqrt(qq / (pp || 1e-12)), c = Math.cos(th) * s, n = Math.sin(th) * s;
  return (p) => ({ x: qx + c * (p.x - px) - n * (p.y - py), y: qy + n * (p.x - px) + c * (p.y - py), z: p.z * s });
}

export function crearEstable(op = {}){
  const L0 = { ...LIM, ...op };
  const st = { huesos: null, muestras: [], bueno: null, buenoW: null, normal: null, volteos: 0, lado: '', ladoNuevo: '', ladoCuenta: 0, dudosos: [], sostenida: 0, cuenta: { dedos: 0, volteos: 0 } };
  const huesosDe = (W) => DEDOS.map((f) => [d3(W[0], W[f[0]]), d3(W[f[0]], W[f[1]]), d3(W[f[1]], W[f[2]]), d3(W[f[2]], W[f[3]])]);
  /** L: 21 puntos de la imagen; W: 21 en metros (puede faltar); etiqueta y seguro: lo que dice MediaPipe del lado */
  function paso(L, W, etiqueta = '', seguro = 0){
    st.dudosos = []; let salida = L.map((p) => ({ ...p })), salidaW = W ? W.map((p) => ({ ...p })) : W;
    /* lado: sólo cambia si se repite */
    if(etiqueta && seguro > .8){ if(!st.lado) st.lado = etiqueta; else if(etiqueta !== st.lado){ if(etiqueta === st.ladoNuevo) st.ladoCuenta++; else { st.ladoNuevo = etiqueta; st.ladoCuenta = 1; } if(st.ladoCuenta >= L0.cambiarLado){ st.lado = etiqueta; st.ladoCuenta = 0; } } else st.ladoCuenta = 0; }
    if(!W){ st.bueno = salida; return { L: salida, W: salidaW, lado: st.lado, dudosos: [], sostenida: false }; }
    /* palma volteada de golpe */
    const n = normalPalma(W);
    if(st.normal && st.bueno && angulo(n, st.normal) > L0.voltea && st.volteos < L0.sostenerVolteo){
      st.volteos++; st.cuenta.volteos++;
      /* sin girar: el giro es justo lo que está en duda; sólo se sigue dónde está y qué tan cerca */
      const T = semejanza(st.bueno, L, false); const L2 = st.bueno.map(T);
      st.sostenida = 1; return { L: L2, W: st.buenoW.map((p) => ({ ...p })), lado: st.lado, dudosos: [0, 1, 2, 3, 4], sostenida: true };
    }
    st.volteos = 0; st.sostenida = 0;
    /* largos de hueso: aprender con las primeras lecturas, luego vigilar dedo por dedo */
    const h = huesosDe(W);
    if(!st.huesos){ st.muestras.push(h); if(st.muestras.length >= L0.aprender) st.huesos = DEDOS.map((_, f) => [0, 1, 2, 3].map((b) => mediana(st.muestras.map((m) => m[f][b])))); }
    else {
      const T = st.bueno ? semejanza(st.bueno, L) : null;
      DEDOS.forEach((dedo, f) => {
        const raro = h[f].some((v, b) => Math.abs(v / (st.huesos[f][b] || 1e-6) - 1) > L0.largo)
          || [0, 1, 2].some((b) => { const a = resta(W[dedo[b]], b ? W[dedo[b - 1]] : W[0]), c = resta(W[dedo[b + 1]], W[dedo[b]]); return angulo(a, c) > L0.angulo; });
        if(raro && T && st.bueno){ st.dudosos.push(f); st.cuenta.dedos++; for(const i of dedo){ salida[i] = T(st.bueno[i]); if(salidaW && st.buenoW) salidaW[i] = { ...st.buenoW[i] }; } }
      });
    }
    st.normal = n; st.bueno = salida.map((p) => ({ ...p })); st.buenoW = salidaW ? salidaW.map((p) => ({ ...p })) : null;
    return { L: salida, W: salidaW, lado: st.lado, dudosos: st.dudosos, sostenida: false };
  }
  return { st, paso };
}
