/* ══════════════════════════════════════════════════════════════════════════
   ESTUDIO · la música de entrada y de cierre, hecha aquí
   ----------------------------------------------------------------------------
   Una intro de podcast tiene que ser TUYA: si bajas la misma pista libre que
   usan mil canales, tu entrada suena a la de otros. Aquí se compone sola —
   acordes, bajo, batería y una melodía corta que se repite como firma— a
   partir de un estilo y una semilla. La misma semilla da la misma canción,
   así que la que te guste se puede volver a sacar idéntica.

   Todo es síntesis con matemáticas (osciladores, ruido, cuerda pulsada de
   Karplus-Strong y una reverberación de Schroeder), sin muestras de audio de
   nadie: no hay licencia que cuidar.
   ═════════════════════════════════════════════════════════════════════════ */
import { SR, lufs, limitar, dbALineal, filtrar } from './motor.js';

export const ESTILOS = {
  lofi:      { nombre: 'Lo-fi',     bpm: 78,  swing: 0.58, prog: [[2, 'm7'], [5, '7'], [1, 'maj7'], [6, 'm7']] },
  pop:       { nombre: 'Pop',       bpm: 112, swing: 0.5,  prog: [[1, ''], [5, ''], [6, 'm'], [4, '']] },
  noticiero: { nombre: 'Noticiero', bpm: 100, swing: 0.5,  prog: [[1, 'm'], [6, ''], [3, ''], [7, '']], menor: true },
  acustico:  { nombre: 'Acústico',  bpm: 92,  swing: 0.54, prog: [[1, ''], [6, 'm'], [4, ''], [5, '']] },
};

/* número al azar que se puede repetir (mulberry32) */
export function azar(semilla){
  let a = (semilla >>> 0) || 1;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const MAYOR = [0, 2, 4, 5, 7, 9, 11], MENOR = [0, 2, 3, 5, 7, 8, 10];
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
/* el acorde de un grado de la escala: midi de cada nota */
function acorde(raiz, grado, tipo, menor){
  const esc = menor ? MENOR : MAYOR;
  const base = raiz + esc[(grado - 1) % 7];
  const T = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11] }[tipo] || [0, 4, 7];
  /* en menor el grado ya trae su color: se respeta la tercera de la escala */
  return T.map(i => base + i);
}

/* ── instrumentos: cada uno SUMA a la pista que le pasan ──────────────── */
function env(t, a, d, s, r, dur){
  if(t < a) return t / a;
  if(t < a + d) return 1 - (1 - s) * (t - a) / d;
  if(t < dur) return s;
  return Math.max(0, s * (1 - (t - dur) / r));
}
function piano(p, f, t0, dur, vol){
  /* piano eléctrico: FM suave que se apaga, como un Rhodes */
  const a = Math.round(t0 * SR), n = Math.round((dur + 0.6) * SR);
  for(let i = 0; i < n && a + i < p.length; i++){
    const t = i / SR, I = 1.6 * Math.exp(-t * 3);
    const v = Math.sin(2 * Math.PI * f * t + I * Math.sin(2 * Math.PI * f * t)) * env(t, 0.004, 0.35, 0.45, 0.5, dur);
    p[a + i] += v * vol * Math.exp(-t * 0.8);
  }
}
function pad(p, f, t0, dur, vol, brillo = 0.5){
  const a = Math.round(t0 * SR), n = Math.round((dur + 0.8) * SR);
  const des = [0.997, 1, 1.004];
  let lp = 0; const k = 0.04 + brillo * 0.12;
  for(let i = 0; i < n && a + i < p.length; i++){
    const t = i / SR; let s = 0;
    for(const d of des){ const ph = (f * d * t) % 1; s += 2 * ph - 1; }
    lp += k * (s / 3 - lp);
    p[a + i] += lp * vol * env(t, 0.35, 0.3, 0.8, 0.8, dur);
  }
}
function bajo(p, f, t0, dur, vol){
  const a = Math.round(t0 * SR), n = Math.round((dur + 0.08) * SR);
  for(let i = 0; i < n && a + i < p.length; i++){
    const t = i / SR;
    const s = Math.tanh(1.8 * (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)));
    p[a + i] += s * vol * env(t, 0.006, 0.12, 0.7, 0.07, dur);
  }
}
function cuerda(p, f, t0, vol, rnd, dur = 1.6){
  /* Karplus-Strong: un ruido corto que da vueltas en un retardo y se apaga */
  const N = Math.max(2, Math.round(SR / f)), buf = new Float32Array(N);
  for(let i = 0; i < N; i++) buf[i] = rnd() * 2 - 1;
  const a = Math.round(t0 * SR), n = Math.round(dur * SR); let j = 0;
  for(let i = 0; i < n && a + i < p.length; i++){
    const s = buf[j], sig = buf[(j + 1) % N];
    buf[j] = 0.4985 * (s + sig);
    p[a + i] += s * vol; j = (j + 1) % N;
  }
}
function bombo(p, t0, vol){
  const a = Math.round(t0 * SR), n = Math.round(0.45 * SR); let ph = 0;
  for(let i = 0; i < n && a + i < p.length; i++){
    const t = i / SR, f = 45 + 85 * Math.exp(-t * 28);
    ph += 2 * Math.PI * f / SR;
    p[a + i] += Math.sin(ph) * Math.exp(-t * 7) * vol + (i < 40 ? (1 - i / 40) * 0.3 * vol : 0);
  }
}
function tarola(p, t0, vol, rnd){
  const a = Math.round(t0 * SR), n = Math.round(0.25 * SR); let prev = 0;
  for(let i = 0; i < n && a + i < p.length; i++){
    const t = i / SR, r = rnd() * 2 - 1, hp = r - prev; prev = r;
    p[a + i] += (hp * 0.7 * Math.exp(-t * 18) + Math.sin(2 * Math.PI * 185 * t) * 0.5 * Math.exp(-t * 30)) * vol;
  }
}
function platillo(p, t0, vol, rnd, abierto = false){
  const a = Math.round(t0 * SR), n = Math.round((abierto ? 0.3 : 0.06) * SR); let p1 = 0, p2 = 0;
  for(let i = 0; i < n && a + i < p.length; i++){
    const t = i / SR, r = rnd() * 2 - 1, h = r - 2 * p1 + p2; p2 = p1; p1 = r;
    p[a + i] += h * 0.25 * vol * Math.exp(-t * (abierto ? 12 : 60));
  }
}
function tambor(p, f, t0, vol){
  const a = Math.round(t0 * SR), n = Math.round(0.9 * SR); let ph = 0;
  for(let i = 0; i < n && a + i < p.length; i++){
    const t = i / SR; ph += 2 * Math.PI * f * (1 + 0.25 * Math.exp(-t * 20)) / SR;
    p[a + i] += Math.sin(ph) * Math.exp(-t * 4.5) * vol;
  }
}
function subida(p, t0, dur, vol, rnd){
  /* ruido que sube y se abre: el «ssshhh» antes del golpe final */
  const a = Math.round(t0 * SR), n = Math.round(dur * SR); let lp = 0;
  for(let i = 0; i < n && a + i < p.length; i++){
    const k = i / n; lp += (0.02 + 0.5 * k * k) * ((rnd() * 2 - 1) - lp);
    p[a + i] += lp * vol * k * k;
  }
}
function crepitar(p, vol, rnd){
  /* el vinilo del lo-fi: chasquidos sueltos y un siseo muy bajito */
  let lp = 0;
  for(let i = 0; i < p.length; i++){
    lp += 0.08 * ((rnd() * 2 - 1) - lp);
    p[i] += lp * vol * 0.25 + (rnd() < 0.00025 ? (rnd() * 2 - 1) * vol * 3 : 0);
  }
}

/* ── reverberación de Schroeder: cuatro peines y dos pasatodo ─────────── */
function reverb(x, mezcla = 0.22, tam = 1){
  const peines = [1557, 1617, 1491, 1422].map(d => Math.round(d * tam * SR / 44100));
  const pasa = [225, 556].map(d => Math.round(d * SR / 44100));
  const out = new Float32Array(x.length);
  for(const d of peines){
    const b = new Float32Array(d); let j = 0, lp = 0;
    for(let i = 0; i < x.length; i++){
      const y = b[j]; lp = 0.8 * lp + 0.2 * y; b[j] = x[i] + lp * 0.8; j = (j + 1) % d; out[i] += y * 0.25;
    }
  }
  for(const d of pasa){
    const b = new Float32Array(d); let j = 0;
    for(let i = 0; i < out.length; i++){ const bi = b[j], y = -out[i] + bi; b[j] = out[i] + bi * 0.5; out[i] = y; j = (j + 1) % d; }
  }
  for(let i = 0; i < x.length; i++) x[i] = x[i] * (1 - mezcla) + out[i] * mezcla;
  return x;
}

/* ── la canción ───────────────────────────────────────────────────────────
   segundos: cuánto dura (se redondea al compás y se le pone cola).
   final: 'golpe' (acaba con un acorde y se apaga, para la entrada) o
          'fundido' (se va desvaneciendo, para el cierre). */
export function jingle({ estilo = 'lofi', segundos = 12, semilla = 1, final = 'golpe' } = {}){
  const E = ESTILOS[estilo] || ESTILOS.lofi, rnd = azar(semilla * 7919 + estilo.length);
  const raiz = [48, 50, 51, 53, 55, 57][Math.floor(rnd() * 6)];   /* Do, Re, Mib, Fa, Sol, La */
  const tiempo = 60 / E.bpm, compas = tiempo * 4;
  const compases = Math.max(2, Math.round(segundos / compas));
  const largo = compases * compas + (final === 'golpe' ? 2.4 : 0.6);
  const n = Math.ceil(largo * SR);
  const ritmo = new Float32Array(n), armonia = new Float32Array(n), melodia = new Float32Array(n);
  const esc = E.menor ? MENOR : MAYOR;
  const corchea = (k) => k * tiempo / 2 + (k % 2 ? (E.swing - 0.5) * tiempo : 0);

  /* la firma: 5 notas de la pentatónica que se repiten cada dos compases */
  const penta = E.menor ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9];
  const motivo = Array.from({ length: 5 }, () => penta[Math.floor(rnd() * 5)]);
  const ritmoMotivo = [0, 1, 3, 4, 6].map(k => k + (rnd() < 0.5 ? 0 : 1)).sort((a, b) => a - b);

  for(let c = 0; c < compases; c++){
    const t0 = c * compas, [grado, tipo] = E.prog[c % E.prog.length];
    const ac = acorde(raiz, grado, tipo, E.menor);
    const fBajo = hz(ac[0] - 12);
    const ultimo = c === compases - 1, primero = c === 0;

    if(estilo === 'lofi'){
      ac.forEach(m => piano(armonia, hz(m + 12), t0, compas * 0.9, 0.11));
      bajo(ritmo, fBajo, t0, tiempo * 1.5, 0.32); bajo(ritmo, fBajo, t0 + tiempo * 2.5, tiempo, 0.26);
      if(!primero){
        bombo(ritmo, t0, 0.55); bombo(ritmo, t0 + corchea(5), 0.4);
        tarola(ritmo, t0 + tiempo, 0.22, rnd); tarola(ritmo, t0 + tiempo * 3, 0.22, rnd);
      }
      for(let k = 0; k < 8; k++) platillo(ritmo, t0 + corchea(k), k % 2 ? 0.18 : 0.28, rnd);
    } else if(estilo === 'pop'){
      ac.forEach(m => pad(armonia, hz(m), t0, compas, 0.06, 0.7));
      for(let k = 0; k < 8; k++){
        cuerda(armonia, hz(ac[k % ac.length] + 12 + (k >= 4 ? 12 : 0) * (k % 2)), t0 + corchea(k), 0.16, rnd, 0.9);
        bajo(ritmo, fBajo, t0 + corchea(k), tiempo * 0.42, 0.24);
      }
      if(!primero) for(let b = 0; b < 4; b++) bombo(ritmo, t0 + b * tiempo, 0.6);
      tarola(ritmo, t0 + tiempo, 0.28, rnd); tarola(ritmo, t0 + tiempo * 3, 0.28, rnd);
      for(let k = 1; k < 8; k += 2) platillo(ritmo, t0 + corchea(k), 0.3, rnd, k === 7);
    } else if(estilo === 'noticiero'){
      ac.forEach(m => pad(armonia, hz(m), t0, compas, 0.07, 0.9));
      for(let k = 0; k < 16; k++) bajo(ritmo, fBajo * (k % 4 === 3 ? 2 : 1), t0 + k * tiempo / 4, tiempo * 0.2, 0.2);
      [0, 1.5, 2.5].forEach(b => ac.forEach(m => pad(armonia, hz(m + 12), t0 + b * tiempo, tiempo * 0.25, 0.05, 1)));
      tambor(ritmo, fBajo * 1.5, t0, 0.5); if(c % 2) tambor(ritmo, fBajo * 2, t0 + tiempo * 3.5, 0.35);
      for(let k = 0; k < 8; k++) platillo(ritmo, t0 + corchea(k), 0.22, rnd);
      if(ultimo) subida(ritmo, t0, compas, 0.35, rnd);
    } else {   /* acústico */
      const rasgueo = [0, 1.5, 2, 3];
      rasgueo.forEach((b, r) => ac.concat([ac[0] + 12]).forEach((m, k) =>
        cuerda(armonia, hz(m + 12), t0 + b * tiempo + k * 0.012 * (r % 2 ? -1 : 1) + 0.02, 0.12, rnd, 1.8)));
      bajo(ritmo, fBajo, t0, tiempo * 1.8, 0.26); bajo(ritmo, hz(ac[2] - 12), t0 + tiempo * 2, tiempo * 1.8, 0.22);
      if(!primero){ bombo(ritmo, t0, 0.35); bombo(ritmo, t0 + tiempo * 2, 0.3); }
      for(let k = 0; k < 8; k++) platillo(ritmo, t0 + corchea(k), 0.16, rnd);
    }

    /* la firma, una octava arriba, en los compases pares (y en el último no,
       para dejarle aire al golpe) */
    if(c % 2 === 0 && !ultimo){
      motivo.forEach((g, k) => {
        const m = raiz + 24 + g, t = t0 + corchea(ritmoMotivo[k]);
        if(estilo === 'acustico' || estilo === 'pop') cuerda(melodia, hz(m), t, 0.2, rnd, 1.2);
        else piano(melodia, hz(m), t, tiempo * 0.7, 0.14);
      });
    }
  }

  /* el final: un acorde de tónica con golpe, o nada si es fundido */
  const tFin = compases * compas;
  if(final === 'golpe'){
    const ac = acorde(raiz, 1, E.menor ? 'm' : (estilo === 'lofi' ? 'maj7' : ''), E.menor);
    ac.forEach(m => (estilo === 'acustico' || estilo === 'pop'
      ? cuerda(armonia, hz(m + 12), tFin, 0.16, rnd, 2.3) : piano(armonia, hz(m + 12), tFin, 1.6, 0.13)));
    bajo(ritmo, hz(ac[0] - 12), tFin, 1.2, 0.3); bombo(ritmo, tFin, 0.6);
    platillo(ritmo, tFin, 0.6, rnd, true);
    if(estilo === 'noticiero') tambor(ritmo, hz(ac[0] - 12) * 1.5, tFin, 0.7);
  }
  if(estilo === 'lofi') crepitar(ritmo, 0.05, rnd);

  reverb(armonia, estilo === 'lofi' ? 0.25 : 0.2, estilo === 'noticiero' ? 1.2 : 1);
  reverb(melodia, 0.3, 1.1);
  const out = new Float32Array(n);
  for(let i = 0; i < n; i++) out[i] = ritmo[i] + armonia[i] + melodia[i];
  if(estilo === 'lofi') filtrar(out, 'pasabajos', 5200, SR, 0.6);   /* tibio, como cinta */
  filtrar(out, 'pasaaltos', 35, SR);

  /* que entre sin chasquido y, si es cierre, que se vaya despacito */
  const fi = Math.round(0.03 * SR);
  for(let i = 0; i < fi; i++) out[i] *= i / fi;
  const fo = Math.round((final === 'golpe' ? 0.5 : Math.min(3, largo * 0.35)) * SR);
  for(let i = 0; i < fo; i++) out[n - 1 - i] *= i / fo;

  /* nivel de música de fondo: −20 LUFS, un poco abajo de la voz (−19) */
  const l = lufs(out); if(Number.isFinite(l)){ const g = dbALineal(-20 - l); for(let i = 0; i < n; i++) out[i] *= g; }
  limitar(out);
  return out;
}
