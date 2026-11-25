/* EL MOTOR DEL SIMULADOR DE FÍSICA (Carlos, 25 nov: «un simulador de físicas… movimiento parabólico, movimiento rectilíneo
   uniformemente acelerado, entre otros… gráfico, interactivo»). Sólo cuentas, sin pantalla: se prueba en Node
   (vr/pruebas-fisica.mjs) contra las fórmulas del libro.
   Unidades del SI: m, s, m/s, m/s². El eje y apunta hacia arriba; el piso es y = 0.
   Movimientos:
     mru        x = x0 + v·t                                   (velocidad constante)
     mrua       x = x0 + v0·t + ½·a·t²,  v = v0 + a·t          (aceleración constante; frena si a < 0)
     caida      y = h − ½·g·t²,          v = −g·t              (caída libre desde h)
     vertical   y = h + v0·t − ½·g·t²,   v = v0 − g·t          (tiro vertical hacia arriba)
     parabolico x = v0·cosθ·t,  y = h + v0·senθ·t − ½·g·t²    (tiro parabólico desde altura h) */
export const GRAVEDADES = { tierra: 9.81, luna: 1.62, marte: 3.71, jupiter: 24.79 };
export const MODOS = ['mru', 'mrua', 'caida', 'vertical', 'parabolico'];
const RAD = Math.PI / 180;

/* el estado en el instante t (para el tiro, se detiene al tocar el piso) */
export function estado(modo, p, t){
  const g = p.g ?? GRAVEDADES.tierra, h = p.h ?? 0;
  if(modo === 'mru'){ return { t, x: (p.x0 ?? 0) + p.v * t, y: 0, vx: p.v, vy: 0, ax: 0, ay: 0 }; }
  if(modo === 'mrua'){
    /* si frena (a opuesta a v0), se queda quieto al llegar a 0: un coche que frena no se echa de reversa */
    const a = p.a, v0 = p.v0, tAlto = a * v0 < 0 ? -v0 / a : Infinity, tt = Math.min(t, tAlto);
    return { t, x: (p.x0 ?? 0) + v0 * tt + .5 * a * tt * tt, y: 0, vx: t >= tAlto ? 0 : v0 + a * tt, vy: 0, ax: t >= tAlto ? 0 : a, ay: 0, detenido: t >= tAlto };
  }
  if(modo === 'caida' || modo === 'vertical' || modo === 'parabolico'){
    const th = modo === 'parabolico' ? (p.angulo ?? 45) * RAD : modo === 'vertical' ? 90 * RAD : 0;
    const v0 = modo === 'caida' ? 0 : p.v0, vx0 = modo === 'parabolico' ? v0 * Math.cos(th) : 0, vy0 = v0 * Math.sin(th);
    const tv = tiempoVuelo(modo, p), tt = Math.min(t, tv);
    return { t, x: vx0 * tt, y: Math.max(0, h + vy0 * tt - .5 * g * tt * tt), vx: t >= tv ? 0 : vx0, vy: t >= tv ? 0 : vy0 - g * tt, ax: 0, ay: t >= tv ? 0 : -g, enPiso: t >= tv };
  }
  throw new Error('modo desconocido: ' + modo);
}
/* cuánto tarda en tocar el piso (raíz positiva de h + vy0·t − ½gt² = 0) */
export function tiempoVuelo(modo, p){
  const g = p.g ?? GRAVEDADES.tierra, h = p.h ?? 0;
  const th = modo === 'parabolico' ? (p.angulo ?? 45) * RAD : modo === 'vertical' ? 90 * RAD : 0;
  const vy0 = modo === 'caida' ? 0 : p.v0 * Math.sin(th);
  return (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * h)) / g;
}
/* los números que el alumno debería sacar a mano */
export function resumen(modo, p){
  const g = p.g ?? GRAVEDADES.tierra, h = p.h ?? 0;
  if(modo === 'mru') return { v: p.v, formula: 'x = x0 + v·t' };
  if(modo === 'mrua'){ const r = { formula: 'x = x0 + v0·t + ½·a·t²', formulaV: 'v = v0 + a·t' };
    if(p.a * p.v0 < 0){ r.tAlto = -p.v0 / p.a; r.distanciaAlto = -p.v0 * p.v0 / (2 * p.a); } return r; }
  const tv = tiempoVuelo(modo, p);
  if(modo === 'caida') return { tVuelo: tv, vFinal: g * tv, formula: 'y = h − ½·g·t²' };
  if(modo === 'vertical') return { tVuelo: tv, tSubida: p.v0 / g, hMax: h + p.v0 * p.v0 / (2 * g), formula: 'y = h + v0·t − ½·g·t²' };
  const th = (p.angulo ?? 45) * RAD, vx0 = p.v0 * Math.cos(th), vy0 = p.v0 * Math.sin(th);
  return { tVuelo: tv, alcance: vx0 * tv, hMax: h + Math.max(0, vy0 * vy0 / (2 * g)), tSubida: Math.max(0, vy0 / g),
    formula: 'x = v0·cosθ·t   y = h + v0·senθ·t − ½·g·t²' };
}
/* la trayectoria completa en n puntos (para dibujar la curva que predice el tiro) */
export function trayectoria(modo, p, n = 60, tMax = null){
  const tv = tMax ?? (['caida', 'vertical', 'parabolico'].includes(modo) ? tiempoVuelo(modo, p) : 6);
  return Array.from({ length: n + 1 }, (_, i) => estado(modo, p, tv * i / n));
}
