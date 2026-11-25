/* MAZI VR · 6DoF dentro del motor: de la pose de la cámara (el VIO) a dónde están TUS OJOS en la escena.
   ──────────────────────────────────────────────────────────────────────────────────────────────────────
   Decisiones (ENGINEERING_LOG 006):
     · El GIRO de la cabeza sigue saliendo del giroscopio (deviceorientation): llega 60+ veces por segundo y nunca se
       pierde. Del VIO sólo se toma la POSICIÓN. Así, si el rastreo se cae, la vista no brinca ni se congela.
     · La posición se suma por PEDAZOS (lo que se movió desde el cuadro anterior), girados al marco del giroscopio con
       un ángulo que se ajusta despacio. Sumar pedazos deja poner filtros en cada uno:
         – rastreo perdido o reiniciándose: no se suma nada (te quedas donde estabas);
         – un brinco imposible (más de 30 cm entre dos cuadros): se tira;
         – deslizarse sin dar pasos (el VIO dice que vas a más de 35 cm/s y el acelerómetro no ve pasos): se tira lo
           horizontal. Es lo que vio Carlos el 19 nov en una zona difícil: el cubo «se iba lejos al azar» estando parado;
         – «coast» (la cámara perdió sus puntos y sólo va con el sensor) más de 0.3 s: se tira.
     · La cámara de atrás no está entre tus ojos: se corrige con su distancia (ojo = cámara + giro · desplazamiento).
   Sin dependencias: se prueba en Node (vr/pruebas-seis.mjs). Cuaterniones [w, x, y, z]. */

export const qMul = (a, b) => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
export const qRot = (q, v) => { const p = qMul(qMul(q, [0, v[0], v[1], v[2]]), [q[0], -q[1], -q[2], -q[3]]); return [p[1], p[2], p[3]]; };
const S2 = Math.SQRT1_2;
/* mundo del VIO (z arriba) → mundo de three (y arriba, −z adelante): (x, y, z) → (x, z, −y) */
const Q_MUNDO = [S2, -S2, 0, 0];
/* cámara de OpenCV (y abajo, z adelante) → cámara de three (y arriba, −z adelante): media vuelta en x */
const Q_CAM = [0, 1, 0, 0];
export const aThree = (v) => [v[0], v[2], -v[1]];
export const camaraThree = (qcv) => qMul(qMul(Q_MUNDO, qcv), Q_CAM);
/* hacia dónde ve (sólo de lado), en radianes, como `rumbo()` del motor */
export function rumboDe(q){ const f = qRot(q, [0, 0, -1]); return Math.atan2(-f[0], -f[2]); }
const envolver = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/* Dónde quedan tus ojos respecto a la cámara de atrás, en el marco de la cámara (x derecha, y abajo, z adelante, m).
   ESTIMADO para un iPhone 13 en un visor, sin medir: la lente principal está a ~5 cm del centro a lo largo y ~2 cm a lo
   ancho, y los ojos ~6 cm detrás de la pantalla. Con la pantalla girada 90° (arriba del teléfono a la izquierda) la
   lente queda arriba a la izquierda de lo que ves; con 270°, abajo a la derecha. Se ajusta en Ajustes si no cuadra. */
export function ojoPorDefecto(angulo){ return angulo === 270 ? [-.053, -.018, -.06] : [.053, .018, -.06]; }

export const LIMITES = { brinco: .30, desliz: .35, agitadoPasos: .15, coastMs: 300, alinear: .02, quietoAgitado: .06, quietoGiro: .1 };

export function crearSeis(op = {}){
  const L = { ...LIMITES, ...op };
  const st = {
    pos: [0, 0, 0],          /* tus ojos en el marco de la cabeza del motor (local al cuerpo, `rig`) */
    phi: 0, alineado: false, /* el giro que lleva el mundo del VIO al del giroscopio */
    antes: null,             /* la posición del ojo (en three, sin girar) del cuadro anterior */
    tAntes: 0, coastDesde: 0,
    estado: 'sin', tirado: { brinco: 0, desliz: 0, coast: 0, perdido: 0 }, recorrido: 0,
  };
  /**
   * pose: { q, p, v, estado } de la cámara (vio.pose()) o null.
   * qGiro: el giro de la cabeza del giroscopio, en three [w,x,y,z] (local al cuerpo).
   * quieto: { agitado } del acelerómetro (vio.S).  t: ms.
   * ojo: desplazamiento cámara→ojos (marco de la cámara).
   */
  function paso(pose, qGiro, quieto, t, ojo = [0, 0, 0]){
    if(!pose){ st.antes = null; st.estado = st.alineado ? 'retenido' : 'sin'; if(st.alineado) st.tirado.perdido++; return st; }
    const qc = camaraThree(pose.q);
    const ojoVio = [0, 1, 2].map((i) => pose.p[i] + qRot(pose.q, ojo)[i]);
    const e = aThree(ojoVio); st.eAhora = e;   /* tus ojos en el mundo del VIO (en ejes de three): la nube se pone respecto a ellos */
    /* el giro entre los dos mundos: al primer cuadro se pone de golpe; luego se acerca despacio (el del giroscopio
       también se va un poco con el tiempo, y así no se pelean) */
    const meta = envolver(rumboDe(qGiro) - rumboDe(qc));
    if(!st.alineado){ st.phi = meta; st.alineado = true; }
    else st.phi = envolver(st.phi + L.alinear * envolver(meta - st.phi));
    if(pose.estado === 'coast'){ if(!st.coastDesde) st.coastDesde = t; } else st.coastDesde = 0;
    if(!st.antes){ st.antes = e; st.tAntes = t; st.estado = 'seis'; return st; }
    let d = [e[0] - st.antes[0], e[1] - st.antes[1], e[2] - st.antes[2]];
    const dt = Math.max(1, t - st.tAntes) / 1000; st.antes = e; st.tAntes = t;
    const largo = Math.hypot(d[0], d[1], d[2]), lado = Math.hypot(d[0], d[2]);
    st.estado = 'seis';
    if(largo > L.brinco){ st.tirado.brinco++; d = [0, 0, 0]; st.estado = 'brinco'; }
    else if(st.coastDesde && t - st.coastDesde > L.coastMs){ st.tirado.coast++; d = [0, 0, 0]; st.estado = 'coast'; }
    else if(lado / dt > L.desliz && (quieto?.agitado ?? 1) < L.agitadoPasos){ st.tirado.desliz++; d = [0, d[1], 0]; st.estado = 'desliz'; }
    /* TELÉFONO QUIETO, MUNDO QUIETO (Carlos, 19 nov: «de repente se empieza a mover cuando yo ni siquiera me estaba
       moviendo»): si el acelerómetro y el giroscopio dicen que el teléfono no se mueve, no se suma nada aunque el VIO se
       vaya despacio. Mover la cabeza siempre gira algo; un teléfono que no gira ni se sacude no se está trasladando */
    else if((quieto?.agitado ?? 1) < L.quietoAgitado && (quieto?.giro ?? 1) < L.quietoGiro && largo > 0){ st.tirado.quieto = (st.tirado.quieto || 0) + 1; d = [0, 0, 0]; st.estado = 'quieto'; }
    const c = Math.cos(st.phi), s = Math.sin(st.phi);
    /* girar el pedazo por phi alrededor de y (de rumbo VIO a rumbo giroscopio) */
    const dx = c * d[0] + s * d[2], dz = -s * d[0] + c * d[2];
    st.pos = [st.pos[0] + dx, st.pos[1] + d[1], st.pos[2] + dz];
    st.recorrido += Math.hypot(dx, d[1], dz);
    return st;
  }
  /* volver a poner los ojos en el centro (sin tocar el giro) */
  function centrar(){ st.pos = [0, 0, 0]; st.antes = null; }
  function olvidar(){ st.alineado = false; st.antes = null; }
  return { st, paso, centrar, olvidar };
}
