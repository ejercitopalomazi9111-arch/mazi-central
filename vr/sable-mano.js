/* MAZI VR · EL SABLE PEGADO A LA PALMA (guía de Carlos, 19 nov: «seguimiento y fijación de los sables… implementa una
   calibración inicial»).
   Antes el sable salía de la muñeca hacia la PUNTA del dedo medio: al cerrar la mano (agarrar el mango) la punta se dobla
   hacia la palma y el sable daba la vuelta o temblaba. Ahora sale de un MARCO RÍGIDO de la palma, hecho con puntos que no
   se doblan: muñeca → nudillo del índice («adelante») y nudillo del meñique → nudillo del índice («lado»). Doblar los
   dedos no lo mueve.
     · DE FÁBRICA el sable apunta hacia «adelante» (como si la mano abierta fuera el sable).
     · CALIBRAR: pones la mano como vas a agarrar el sable (abierta o en puño) y apuntas hacia ARRIBA casi un segundo; se guarda
       hacia dónde queda «arriba» dentro del marco de tu palma, una vez por mano. Desde ahí el sable sale así siempre.
     · SUAVE SIN RETRASO: se filtra el giro con más fuerza cuando la mano está casi quieta (quita el temblor) y casi nada
       cuando corta rápido (el corte no llega tarde).
     · SI LA MANO SE PIERDE un instante (sale de la cámara), el sable se queda donde iba hasta 0.3 s en vez de desaparecer.
   Sin dependencias: vectores como [x, y, z]. Se prueba en Node (vr/pruebas-sable-mano.mjs). */
export const LLAVE_CAL = 'mazivr-sable-cal';
export const SABLE = { sostener: .3, quieta: 1.5, rapida: 12, suaveQuieta: .25, calSeg: .8, calMin: 5, calAbanico: 10 };
const resta = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1e-9; return [a[0] / l, a[1] / l, a[2] / l]; };
const mezcla = (a, b, k) => unit([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]);
export const anguloEntre = (a, b) => Math.acos(Math.max(-1, Math.min(1, punto(unit(a), unit(b)))));

/** el marco de la palma: x = lado (meñique → índice), y = adelante (muñeca → índice) hecho perpendicular, z = x × y */
export function marco(adelante, lado){
  const y = unit(adelante), x0 = unit(lado), x = unit(resta(x0, y.map((v) => v * punto(x0, y)))), z = cruz(x, y);
  return { x, y, z };
}
export const aMundo = (M, l) => unit([M.x[0] * l[0] + M.y[0] * l[1] + M.z[0] * l[2], M.x[1] * l[0] + M.y[1] * l[1] + M.z[1] * l[2], M.x[2] * l[0] + M.y[2] * l[1] + M.z[2] * l[2]]);
export const aPalma = (M, w) => unit([punto(M.x, w), punto(M.y, w), punto(M.z, w)]);

export function cargarCal(){ try{ return JSON.parse(localStorage.getItem(LLAVE_CAL) || 'null') || {}; }catch{ return {}; } }
export function guardarCal(cal){ try{ localStorage.setItem(LLAVE_CAL, JSON.stringify(cal)); }catch{} }

/** un sable por mano. cal: { '-1': [x,y,z], '1': [x,y,z] } (hacia dónde sale el sable dentro del marco de la palma) */
export function crearSable(lado, op = {}){
  const L = { ...SABLE, ...op };
  const st = { lado, local: op.cal?.[lado] || [0, 1, 0], dir: null, base: null, t: -1, visto: -1, sostenido: false, cal: null };
  /** mano: { adelante, lado, palma } en el mundo (o null si no se ve); t en segundos */
  function paso(mano, t){
    if(!mano || !mano.adelante || !mano.lado){
      st.sostenido = st.dir && t - st.visto <= L.sostener; return st.sostenido ? { base: st.base, dir: st.dir, sostenido: true } : null;
    }
    const M = marco(mano.adelante, mano.lado), crudo = aMundo(M, st.local);
    /* el filtro: qué tan rápido gira (rad/s) decide cuánto se suaviza */
    const dt = st.t >= 0 ? Math.max(1 / 240, Math.min(.2, t - st.t)) : 1 / 60;
    if(!st.dir || t - st.visto > L.sostener) st.dir = crudo;
    else { const w = anguloEntre(st.dir, crudo) / dt, k = Math.max(0, Math.min(1, (w - L.quieta) / (L.rapida - L.quieta)));
      /* por tiempo: «suave» es cuánto se acerca en 1/60 s; a menos cuadros por segundo se acerca más por cuadro */
      const a = 1 - Math.pow(1 - L.suaveQuieta, dt * 60);
      st.dir = mezcla(st.dir, crudo, a + (1 - a) * k); }
    st.base = [...mano.palma]; st.t = t; st.visto = t; st.sostenido = false;
    /* calibrando: se junta «arriba» visto desde la palma mientras la mano esté firme */
    /* por TIEMPO, no por lecturas: lo mismo a 60 que a 10 cuadros por segundo */
    if(st.cal){ st.cal.push({ u: aPalma(M, [0, 1, 0]), t });
      const prom = unit(st.cal.reduce((s, m) => [s[0] + m.u[0], s[1] + m.u[1], s[2] + m.u[2]], [0, 0, 0]));
      const abanico = Math.max(...st.cal.map((m) => anguloEntre(m.u, prom))) * 180 / Math.PI;
      if(abanico > L.calAbanico) st.cal = st.cal.slice(-1);   /* se movió: empieza a contar de nuevo */
      else if(st.cal.length >= L.calMin && t - st.cal[0].t >= L.calSeg){ st.local = prom; st.cal = null; st.dir = aMundo(M, prom); return { base: st.base, dir: st.dir, sostenido: false, calibrado: prom }; }
    }
    return { base: st.base, dir: st.dir, sostenido: false };
  }
  const calibrar = () => { st.cal = []; };
  const olvidar = () => { st.local = [0, 1, 0]; st.cal = null; };
  return { st, paso, calibrar, olvidar };
}
