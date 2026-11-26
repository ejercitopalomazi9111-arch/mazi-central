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

/* ── CON AIRE (Carlos, 26 nov: «comparar objetos… alterar densidad de aire, densidad de atmósfera, resistencias») ──
   El aire empuja contra el movimiento: F = ½·ρ·Cd·A·v² (ρ densidad del aire, Cd qué tan «aerodinámico» es, A el área
   que le pega al aire). Dividido entre la masa queda a = −k·|v|·v, con k = ρ·Cd·A / (2m). Ya no hay fórmula cerrada para
   el tiro: se suma paso a paso (Runge-Kutta de 4.º orden, 1/240 s). Sin aire (ρ = 0) da lo mismo que las fórmulas del
   libro; eso lo comprueba vr/pruebas-fisica.mjs. */
export const OBJETOS = {
  balon:     { nombre: 'Balón',      en: 'Soccer ball',   m: .43,  d: .22,  cd: .25, archivo: 'balon.glb', e: .75,     color: '#F7A23B' },
  beisbol:   { nombre: 'Béisbol',    en: 'Baseball',      m: .145, d: .074, cd: .35, archivo: 'beisbol.glb', e: .55,   color: '#5BC0EB' },
  manzana:   { nombre: 'Manzana',    en: 'Apple',         m: .18,  d: .085, cd: .5,  archivo: 'manzana.glb', e: .2,   color: '#FF5A6E' },
  americano: { nombre: 'Americano',  en: 'Football',      m: .41,  d: .17,  cd: .2,  archivo: 'americano.glb', e: .6, color: '#9BE564' },
  piedra:    { nombre: 'Piedra',     en: 'Rock',          m: 1.2,  d: .11,  cd: .8,  archivo: 'piedra.glb', e: .25,    color: '#D8C8E8' },
};
/* gravedad (m/s²) y densidad del aire al nivel del suelo (kg/m³). Júpiter no tiene suelo: se toma donde la presión es
   de 1 bar. Fuentes: NASA Planetary Fact Sheets (nssdc.gsfc.nasa.gov/planetary/factsheet). */
/* e = coeficiente de restitución contra un piso duro (qué fracción de la velocidad le queda al rebotar; valores típicos
   medidos, aproximados): el balón inflado rebota mucho, la manzana y la piedra casi nada. */
export const LUGARES = {
  tierra:  { nombre: 'Tierra',  en: 'Earth',   g: 9.81,  rho: 1.225 },
  luna:    { nombre: 'Luna',    en: 'Moon',    g: 1.62,  rho: 0 },
  marte:   { nombre: 'Marte',   en: 'Mars',    g: 3.71,  rho: .020 },
  venus:   { nombre: 'Venus',   en: 'Venus',   g: 8.87,  rho: 65 },
  jupiter: { nombre: 'Júpiter', en: 'Jupiter', g: 24.79, rho: .16 },
};
export const kArrastre = (o, rho) => rho * o.cd * Math.PI * (o.d / 2) ** 2 / (2 * o.m);
export const vTerminal = (o, rho, g) => { const k = kArrastre(o, rho); return k > 0 ? Math.sqrt(g / k) : Infinity; };
const DT = 1 / 240;
/* p: { g, rho, objeto (de OBJETOS), v0, angulo, h }. Devuelve los puntos cada 1/240 s hasta tocar el piso. */
export function simular(modo, p){
  const g = p.g ?? GRAVEDADES.tierra, h = p.h ?? 0, o = p.objeto || OBJETOS.balon, k = kArrastre(o, p.rho ?? 0);
  const th = modo === 'parabolico' ? (p.angulo ?? 45) * RAD : modo === 'vertical' ? 90 * RAD : 0;
  const v0 = modo === 'caida' ? 0 : p.v0;
  let x = 0, y = h, vx = modo === 'parabolico' ? v0 * Math.cos(th) : 0, vy = v0 * Math.sin(th), t = 0;
  if(modo === 'vertical') vx = 0;
  const acel = (vx, vy) => { const s = Math.hypot(vx, vy); return [-k * s * vx, -g - k * s * vy]; };
  const puntos = [{ t, x, y, vx, vy }]; let hMax = y, botes = 0, primero = null, tPrimero = 0, vPrimero = 0;
  if(y <= 0 && vy <= 0) return { puntos, tVuelo: 0, alcance: 0, hMax: 0, vFinal: 0, k, primero: 0, tPrimero: 0, botes: 0 };
  while(t < 120){
    const [a1x, a1y] = acel(vx, vy), [a2x, a2y] = acel(vx + a1x * DT / 2, vy + a1y * DT / 2), [a3x, a3y] = acel(vx + a2x * DT / 2, vy + a2y * DT / 2), [a4x, a4y] = acel(vx + a3x * DT, vy + a3y * DT);
    const nx = x + DT * (vx + DT / 6 * (a1x + a2x + a3x)), ny = y + DT * (vy + DT / 6 * (a1y + a2y + a3y));
    const nvx = vx + DT / 6 * (a1x + 2 * a2x + 2 * a3x + a4x), nvy = vy + DT / 6 * (a1y + 2 * a2y + 2 * a3y + a4y);
    if(ny <= 0){   /* toca el piso dentro de este paso: se busca el instante exacto (y = 0) con la cúbica del paso */
      let f = y / (y - ny);
      for(let i = 0; i < 4; i++){ const yy = y + vy * f * DT + (a1y) * (f * DT) ** 2 / 2; const dy = vy + a1y * f * DT; if(Math.abs(dy) > 1e-9) f = Math.min(1, Math.max(0, f - yy / (dy * DT))); }
      const tt = t + f * DT, s = { t: tt, x: x + (nx - x) * f, y: 0, vx: vx + (nvx - vx) * f, vy: vy + (nvy - vy) * f };
      puntos.push(s);
      if(primero == null){ primero = s.x; tPrimero = tt; vPrimero = Math.hypot(s.vx, s.vy); }
      /* REBOTE (Carlos, 26 nov: «ponle rebote»): sale para arriba con e veces la velocidad con que llegó; el piso le quita
         un poco de lo de lado. Si ya casi no sube (menos de 2 cm), se queda. */
      const e = p.rebote ? (o.e ?? 0) : 0, vyR = -s.vy * e;
      if(e > 0 && vyR * vyR / (2 * g) > .02 && botes < 12){
        botes++; t = tt; x = s.x; y = 0; vx = s.vx * .85; vy = vyR; puntos.push({ t, x, y, vx, vy }); continue;
      }
      return { puntos, tVuelo: tt, alcance: s.x, hMax, vFinal: vPrimero, k, primero, tPrimero, botes };
    }
    x = nx; y = ny; vx = nvx; vy = nvy; t += DT; if(y > hMax) hMax = y;
    puntos.push({ t, x, y, vx, vy });
  }
  const u = puntos.at(-1); return { puntos, tVuelo: u.t, alcance: u.x, hMax, vFinal: Math.hypot(u.vx, u.vy), k, primero: primero ?? u.x, tPrimero: tPrimero || u.t, botes };
}
/* dónde va en el instante t (entre dos pasos, en línea recta: a 1/240 s no se nota) */
export function enInstante(sim, t){
  const P = sim.puntos; if(t <= 0) return P[0]; if(t >= sim.tVuelo) return P.at(-1);
  /* búsqueda binaria: con rebotes los pasos ya no caen parejos cada 1/240 s */
  let lo = 0, hi = P.length - 1; while(hi - lo > 1){ const m = (lo + hi) >> 1; if(P[m].t <= t) lo = m; else hi = m; }
  const a = P[lo], b = P[hi], f = (t - a.t) / Math.max(1e-9, b.t - a.t);
  return { t, x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, vx: a.vx + (b.vx - a.vx) * f, vy: a.vy + (b.vy - a.vy) * f };
}

/* ══ LOS DEMÁS TEMAS DE FÍSICA DE 3.er SEMESTRE (Carlos, 26 nov: «cualquier otro que puedas creer que es parte de un plan de
   estudios de una preparatoria… física de 3er semestre, bachillerato modalidad DGETI») ══
   Lo que lleva Física en el bachillerato tecnológico: cinemática (MRU, MRUA, caída, tiros: arriba), movimiento circular,
   las leyes de Newton con fricción y plano inclinado, trabajo y energía (y su conservación), la ley de Hooke con el
   movimiento armónico, y la cantidad de movimiento en los choques. Cada uno devuelve sus puntos en el tiempo (para
   animarlo y graficarlo) y los números que el alumno debería sacar a mano. */
const muestrear = (tFin, f, dt = 1 / 120) => { const P = []; const n = Math.max(1, Math.ceil(tFin / dt)); for(let i = 0; i <= n; i++) P.push(f(Math.min(tFin, i * dt))); return P; };
/* MOVIMIENTO CIRCULAR UNIFORME: radio r (m), periodo T (s) */
export function circular({ r, T, vueltas = 2 }){
  const w = 2 * Math.PI / T, v = w * r, ac = v * v / r;
  const puntos = muestrear(vueltas * T, (t) => ({ t, th: w * t, x: r * Math.cos(w * t), y: r * Math.sin(w * t), v, ac }));
  return { puntos, tVuelo: vueltas * T, w, v, ac, f: 1 / T, formula: 'v = 2πr / T     ω = 2π / T     a = v² / r' };
}
/* PLANO INCLINADO Y FUERZAS: ángulo θ (°), fricción μ, masa m (kg), empuje F (N, a lo largo del plano, hacia abajo),
   largo L (m). Con θ = 0 es la segunda ley de Newton en el piso. Se toma el mismo μ para arrancar y para deslizar. */
export function plano({ angulo, mu, m, F = 0, L = 5, g = GRAVEDADES.tierra }){
  const th = angulo * RAD, P = m * g, N = P * Math.cos(th), Px = P * Math.sin(th), empuja = Px + F, fMax = mu * N;
  const semueve = empuja > fMax + 1e-9, fr = semueve ? fMax : empuja, a = semueve ? (empuja - fMax) / m : 0;
  const t = semueve ? Math.sqrt(2 * L / a) : 0, tFin = semueve ? t : 2;
  const puntos = muestrear(tFin, (tt) => ({ t: tt, s: semueve ? .5 * a * tt * tt : 0, v: semueve ? a * tt : 0 }));
  const vFin = a * t;
  return { puntos, tVuelo: tFin, semueve, P, N, Px, fr, a, tBajar: t, vFin, trabajoFr: -fr * L * (semueve ? 1 : 0), trabajoNeto: (empuja - fr) * L * (semueve ? 1 : 0), Ec: .5 * m * vFin * vFin,
    formula: 'ΣF = m·a     N = m·g·cosθ     f = μ·N     a = (m·g·senθ + F − f) / m' };
}
/* PÉNDULO Y ENERGÍA: largo L (m), ángulo inicial θ0 (°), masa m (kg). Sin aproximar senθ ≈ θ (RK4): la energía se
   conserva y el periodo de ángulos grandes sale un poco más largo que 2π√(L/g), como en la realidad. */
export function pendulo({ L, angulo, m, g = GRAVEDADES.tierra, oscilaciones = 2 }){
  const T0 = 2 * Math.PI * Math.sqrt(L / g), dt = 1 / 240; let th = angulo * RAD, w = 0, t = 0;
  const E = (th, w) => ({ Ec: .5 * m * (L * w) ** 2, Ep: m * g * L * (1 - Math.cos(th)) });
  const al = (th) => -g / L * Math.sin(th);
  const puntos = [{ t, th, w, ...E(th, w) }]; let cruces = 0, antes = th, tCruces = [];
  while(t < oscilaciones * T0 * 1.3 && cruces < oscilaciones * 2 + 1){
    const k1t = w, k1w = al(th), k2t = w + k1w * dt / 2, k2w = al(th + k1t * dt / 2), k3t = w + k2w * dt / 2, k3w = al(th + k2t * dt / 2), k4t = w + k3w * dt, k4w = al(th + k3t * dt);
    th += dt / 6 * (k1t + 2 * k2t + 2 * k3t + k4t); w += dt / 6 * (k1w + 2 * k2w + 2 * k3w + k4w); t += dt;
    if((antes > 0) !== (th > 0)){ cruces++; tCruces.push(t - dt * th / (th - antes)); } antes = th;
    puntos.push({ t, th, w, ...E(th, w) });
  }
  const T = tCruces.length >= 3 ? tCruces[2] - tCruces[0] : T0;
  const Etotal = m * g * L * (1 - Math.cos(angulo * RAD));
  return { puntos, tVuelo: t, T, T0, Etotal, vMax: Math.sqrt(2 * g * L * (1 - Math.cos(angulo * RAD))), hMax: L * (1 - Math.cos(angulo * RAD)),
    formula: 'Ec = ½·m·v²     Ep = m·g·h     Ec + Ep = constante     T ≈ 2π√(L/g)' };
}
/* RESORTE (LEY DE HOOKE) Y MOVIMIENTO ARMÓNICO: constante k (N/m), masa m (kg), estirado x0 (m), sin fricción */
export function resorte({ k, m, x0, oscilaciones = 3 }){
  const w = Math.sqrt(k / m), T = 2 * Math.PI / w;
  const puntos = muestrear(oscilaciones * T, (t) => ({ t, x: x0 * Math.cos(w * t), v: -x0 * w * Math.sin(w * t), F: -k * x0 * Math.cos(w * t) }));
  return { puntos, tVuelo: oscilaciones * T, w, T, F0: k * x0, Ep: .5 * k * x0 * x0, vMax: x0 * w, formula: 'F = −k·x     T = 2π√(m/k)     Ep = ½·k·x²' };
}
/* CHOQUES EN UNA LÍNEA: masas m1, m2 (kg) y velocidades v1, v2 (m/s; + a la derecha). Elástico (rebotan, se conserva la
   energía) o se pegan (perfectamente inelástico). En los dos se conserva la cantidad de movimiento p = m·v.
   Salen separados 3 m (el 1 en x = 0, el 2 en x = 3) y se ven 4 s. */
export function choque({ m1, m2, v1, v2, pegan = false, sep = 3, tFin = 4 }){
  let u1, u2;
  if(pegan){ u1 = u2 = (m1 * v1 + m2 * v2) / (m1 + m2); }
  else { u1 = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2); u2 = ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2); }
  const acerca = v1 - v2, tc = acerca > 0 ? sep / acerca : Infinity;
  const puntos = muestrear(tFin, (t) => t < tc ? { t, x1: v1 * t, x2: sep + v2 * t, v1, v2 } :
    { t, x1: v1 * tc + u1 * (t - tc), x2: sep + v2 * tc + u2 * (t - tc), v1: u1, v2: u2 });
  const Ec = (a, b) => .5 * m1 * a * a + .5 * m2 * b * b;
  return { puntos, tVuelo: tFin, tChoque: tc, u1, u2, pAntes: m1 * v1 + m2 * v2, pDespues: m1 * u1 + m2 * u2, EcAntes: Ec(v1, v2), EcDespues: Ec(u1, u2), chocan: tc <= tFin,
    formula: 'p = m·v     m₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′' };
}
/* en el instante t, con cualquier serie de puntos que tenga t (búsqueda binaria e interpolación de todos los números) */
export function enTiempo(sim, t){
  const P = sim.puntos; if(t <= P[0].t) return P[0]; if(t >= P.at(-1).t) return P.at(-1);
  let lo = 0, hi = P.length - 1; while(hi - lo > 1){ const mm = (lo + hi) >> 1; if(P[mm].t <= t) lo = mm; else hi = mm; }
  const a = P[lo], b = P[hi], f = (t - a.t) / Math.max(1e-9, b.t - a.t), o = {};
  for(const k in a) o[k] = typeof a[k] === 'number' ? a[k] + (b[k] - a[k]) * f : a[k];
  return o;
}
