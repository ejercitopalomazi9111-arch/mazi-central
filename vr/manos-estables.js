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
   ⚠ LO QUE SALIÓ MAL EL 19 NOV (fotos de Carlos en el visor) y cómo quedó:
     1. Un dedo sostenido se guardaba COMO SI FUERA el bueno: si los largos se aprendían con la mano cerrada, los dedos
        estirados quedaban congelados, chiquitos y doblados PARA SIEMPRE. Ahora: lo sostenido nunca se guarda como bueno,
        un dedo se sostiene como mucho `sostenerDedo` lecturas (después se acepta la lectura real) y los largos se van
        re-aprendiendo poco a poco con las lecturas aceptadas.
     2. Al voltear la mano (palma arriba) la imagen queda en ESPEJO; la semejanza 2D (giro + escala) no puede representar un
        espejo y lo «resolvía» girando media vuelta: los dedos guardados salían apuntando al revés, fuera de la pantalla.
        Ahora: si la palma cambió de lado en la imagen (espejo), no se pega ningún dedo viejo; se usa la lectura.
   Sin dependencias: se prueba en Node (vr/pruebas-manos-estables.mjs). Puntos: { x, y, z }. */
export const DEDOS = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
const PALMA = [0, 5, 9, 13, 17];
export const LIM = { largo: .45, angulo: 125, voltea: 120, sostenerVolteo: 3, aprender: 12, cambiarLado: 8, sostenerDedo: 4, reaprender: .08 };
const d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const resta = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const cruz = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const largo = (v) => Math.hypot(v.x, v.y, v.z) || 1e-9;
const angulo = (a, b) => Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y + a.z * b.z) / (largo(a) * largo(b))))) * 180 / Math.PI;
export const normalPalma = (W) => cruz(resta(W[5], W[0]), resta(W[17], W[0]));
const mediana = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[s.length >> 1]; };
/* de qué lado se ve la palma en la imagen (+1 o −1): cambia cuando la mano se voltea (espejo) */
const ladoImagen = (P) => Math.sign((P[5].x - P[0].x) * (P[17].y - P[0].y) - (P[5].y - P[0].y) * (P[17].x - P[0].x)) || 1;

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
  const st = { huesos: null, muestras: [], bueno: null, buenoW: null, normal: null, volteos: 0, lado: '', ladoNuevo: '', ladoCuenta: 0, dudosos: [], sostenida: 0, cuenta: { dedos: 0, volteos: 0 },
    /* el último dedo REAL de cada uno (nunca uno sostenido) y cuántas lecturas seguidas lleva sostenido */
    dedoReal: [null, null, null, null, null], sostenido: [0, 0, 0, 0, 0] };
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
      DEDOS.forEach((dedo, f) => {
        const raro = h[f].some((v, b) => Math.abs(v / (st.huesos[f][b] || 1e-6) - 1) > L0.largo)
          || [0, 1, 2].some((b) => { const a = resta(W[dedo[b]], b ? W[dedo[b - 1]] : W[0]), c = resta(W[dedo[b + 1]], W[dedo[b]]); return angulo(a, c) > L0.angulo; });
        const ref = st.dedoReal[f];
        /* sostener SÓLO si: hay un dedo real guardado, la palma no se volteó en espejo desde entonces y no lleva demasiado */
        if(raro && ref && ladoImagen(ref.palmaL) === ladoImagen(L) && st.sostenido[f] < L0.sostenerDedo){
          const T = semejanza(ref.palmaL, L);
          st.dudosos.push(f); st.cuenta.dedos++; st.sostenido[f]++;
          dedo.forEach((i, k) => { salida[i] = T(ref.L[k]); if(salidaW && ref.W) salidaW[i] = { ...ref.W[k] }; });
          return;
        }
        /* aceptado (sano, o sostenido de más: era real): se guarda como el dedo real y sus largos se re-aprenden despacio */
        st.sostenido[f] = 0;
        st.dedoReal[f] = { L: dedo.map((i) => ({ ...L[i] })), W: W ? dedo.map((i) => ({ ...W[i] })) : null, palmaL: L.map((p) => ({ ...p })) };
        /* si siguió «raro» todo el tiempo que se sostuvo, ERA real (la mano se aprendió mal, p. ej. cerrada): se re-aprende
           ese dedo de golpe; si no, poco a poco */
        if(raro) st.huesos[f] = h[f].slice();
        else st.huesos[f] = st.huesos[f].map((v, b) => v + (h[f][b] - v) * L0.reaprender);
      });
    }
    st.normal = n; st.bueno = salida.map((p) => ({ ...p })); st.buenoW = salidaW ? salidaW.map((p) => ({ ...p })) : null;
    return { L: salida, W: salidaW, lado: st.lado, dudosos: st.dudosos, sostenida: false };
  }
  return { st, paso };
}
