/* ══════════════════════════════════════════════════════════════════════════
   ESTUDIO · el motor de audio del podcast
   ----------------------------------------------------------------------------
   Todo en JavaScript puro sobre Float32Array: sin servidor, sin librerías y
   sin OfflineAudioContext (que en un iPhone pide memoria para una copia
   entera del episodio por cada paso). Así corre igual en el teléfono que en
   Node, que es donde se prueba.

   Se trabaja en MONO a 32 kHz. Es lo que usa un podcast hablado: la voz no
   tiene nada arriba de 16 kHz, y en mono un episodio de 20 minutos cabe en
   la memoria de un teléfono (150 MB contra 600 en estéreo a 48 kHz).

   El volumen se lleva a −19 LUFS en mono, que es el −16 que piden Apple y
   compañía para estéreo (un archivo mono suena 3 dB más fuerte al repartirse
   en dos bocinas), con el pico por debajo de −1.5 dB.
   ═════════════════════════════════════════════════════════════════════════ */

export const SR = 32000;
export const META_LUFS = -19;
export const TECHO_DB = -1.5;

export const dbALineal = (db) => Math.pow(10, db / 20);
export const linealADb = (v) => 20 * Math.log10(Math.max(v, 1e-9));

/* ── filtros biquad (recetario de R. Bristow-Johnson) ─────────────────── */
function coef(tipo, f, sr, q, gananciaDb){
  const w = 2 * Math.PI * f / sr, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if(tipo === 'pasaaltos'){
    b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al;
  } else if(tipo === 'pasabajos'){
    b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al;
  } else if(tipo === 'repisa-alta'){
    const A = Math.pow(10, gananciaDb / 40), r = 2 * Math.sqrt(A) * al;
    b0 = A * ((A + 1) + (A - 1) * cw + r); b1 = -2 * A * ((A - 1) + (A + 1) * cw);
    b2 = A * ((A + 1) + (A - 1) * cw - r); a0 = (A + 1) - (A - 1) * cw + r;
    a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - r;
  } else throw new Error('filtro desconocido: ' + tipo);
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
/* aplica el filtro EN SU LUGAR y devuelve el mismo arreglo */
export function filtrar(x, tipo, f, sr = SR, q = Math.SQRT1_2, gananciaDb = 0){
  const [b0, b1, b2, a1, a2] = coef(tipo, f, sr, q, gananciaDb);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for(let i = 0; i < x.length; i++){
    const x0 = x[i], y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0; x[i] = y0;
  }
  return x;
}

/* ── cuánto suena: LUFS integrados (BS.1770, mono) ────────────────────────
   Ponderación K (repisa de +4 dB arriba de 1.7 kHz y pasaaltos de 38 Hz),
   bloques de 400 ms cada 100 ms, compuerta absoluta de −70 y relativa de −10.
   Es la medida con la que las plataformas deciden si tu podcast suena bajito. */
export function lufs(x, sr = SR){
  if(!x.length) return -Infinity;
  const k = filtrar(filtrar(Float32Array.from(x), 'repisa-alta', 1681.97, sr, Math.SQRT1_2, 4), 'pasaaltos', 38.135, sr, 0.5003);
  const bloque = Math.round(0.4 * sr), paso = Math.round(0.1 * sr);
  const ms = [];
  if(k.length < bloque){
    let s = 0; for(let i = 0; i < k.length; i++) s += k[i] * k[i];
    ms.push(s / k.length);
  } else {
    /* suma corrida: cada bloque cuesta lo mismo sin importar su largo */
    const acum = new Float64Array(k.length + 1);
    for(let i = 0; i < k.length; i++) acum[i + 1] = acum[i] + k[i] * k[i];
    for(let i = 0; i + bloque <= k.length; i += paso) ms.push((acum[i + bloque] - acum[i]) / bloque);
  }
  const L = (z) => -0.691 + 10 * Math.log10(Math.max(z, 1e-12));
  const absol = ms.filter(z => L(z) > -70);
  if(!absol.length) return -Infinity;
  const media1 = absol.reduce((a, b) => a + b, 0) / absol.length;
  const rel = absol.filter(z => L(z) > L(media1) - 10);
  return L(rel.reduce((a, b) => a + b, 0) / rel.length);
}

export function pico(x){
  let m = 0; for(let i = 0; i < x.length; i++){ const a = Math.abs(x[i]); if(a > m) m = a; }
  return m;
}

/* ── nivel de 20 ms en 20 ms, en dB: la base de los silencios y el ruido ── */
export function niveles(x, sr = SR, ms = 20){
  const n = Math.max(1, Math.round(sr * ms / 1000)), cuadros = Math.ceil(x.length / n);
  const out = new Float32Array(cuadros);
  for(let c = 0; c < cuadros; c++){
    let s = 0; const a = c * n, b = Math.min(x.length, a + n);
    for(let i = a; i < b; i++) s += x[i] * x[i];
    out[c] = 10 * Math.log10(Math.max(s / Math.max(1, b - a), 1e-12));
  }
  return { db: out, n };
}
/* el piso de ruido: el percentil 10 de los cuadros, que en una grabación con
   pausas es el aire del cuarto */
export function pisoDeRuido(x, sr = SR){
  const { db } = niveles(x, sr);
  const orden = Float32Array.from(db).sort();
  return orden[Math.floor(orden.length * 0.1)] ?? -90;
}

/* ── quitar los silencios largos ──────────────────────────────────────────
   No se quitan TODOS: una plática sin pausas suena a robot. Cada silencio de
   más de `maxPausa` se acorta a `dejar` segundos, guardando un pedacito al
   principio y otro al final para que la respiración no se corte, y se une
   con un fundido de 10 ms para que no truene. */
export function recortarSilencios(x, sr = SR, { maxPausa = 0.7, dejar = 0.35 } = {}){
  const quedan = tramosConVoz(x, sr, { maxPausa, dejar });
  const quitado = x.length - quedan.reduce((s, [a, b]) => s + b - a, 0);
  const fundido = Math.round(0.01 * sr);
  const out = new Float32Array(x.length - quitado);
  let o = 0;
  quedan.forEach(([a, b], k) => {
    for(let s = a; s < b; s++, o++){
      let g = 1;
      if(k > 0 && s - a < fundido) g = (s - a) / fundido;
      if(k < quedan.length - 1 && b - s <= fundido) g = Math.min(g, (b - s) / fundido);
      out[o] = x[s] * g;
    }
  });
  return { datos: out, quitado: quitado / sr, cortes: quedan.length - 1 };
}

/* Los tramos que se QUEDAN, en muestras [desde, hasta). Es lo mismo que usa
   recortarSilencios, pero sin tocar el audio: el video lo necesita así para
   cortar la imagen en los mismos puntos que el sonido (cortes «jump cut»). */
export function tramosConVoz(x, sr = SR, { maxPausa = 0.7, dejar = 0.35 } = {}){
  const { db, n } = niveles(x, sr);
  const piso = pisoDeRuido(x, sr);
  const umbral = Math.min(Math.max(piso + 10, -55), -28);
  const quedan = [];
  let i = 0, desde = 0;
  const minCuadros = Math.ceil(maxPausa * sr / n);
  const mitad = Math.round(dejar / 2 * sr);
  while(i < db.length){
    if(db[i] < umbral){
      let j = i; while(j < db.length && db[j] < umbral) j++;
      if(j - i >= minCuadros){
        const a = Math.max(desde, i * n + mitad), b = Math.min(x.length, j * n) - mitad;
        if(b > a){ quedan.push([desde, a]); desde = b; }
      }
      i = j;
    } else i++;
  }
  quedan.push([desde, x.length]);
  return quedan.filter(([a, b]) => b > a);
}

/* ── bajar el ruido de fondo (expansor hacia abajo) ──────────────────────
   Lo que queda abajo del piso de ruido + 8 dB se baja hasta 18 dB; la voz no
   se toca. No es magia: el ruido que suena ENCIMA de la voz se queda. Pero
   el siseo entre frase y frase, que es lo que más se nota, se va. */
export function bajarRuido(x, sr = SR){
  const piso = pisoDeRuido(x, sr);
  const umbral = piso + 8, piso_g = dbALineal(-18);
  const ataque = Math.exp(-1 / (0.003 * sr)), suelta = Math.exp(-1 / (0.12 * sr));
  const envA = Math.exp(-1 / (0.01 * sr));
  let env = 0, g = 1;
  for(let i = 0; i < x.length; i++){
    const a = x[i] * x[i];
    env = envA * env + (1 - envA) * a;
    const lvl = 10 * Math.log10(env + 1e-12);
    const meta = lvl >= umbral ? 1 : Math.max(piso_g, dbALineal((lvl - umbral) * 1.5));
    g = meta > g ? ataque * g + (1 - ataque) * meta : suelta * g + (1 - suelta) * meta;
    x[i] *= g;
  }
  return x;
}

/* ── compresor: que lo bajito y lo fuerte queden cerca ───────────────────
   Umbral −24 dB, razón 3:1, rodilla suave de 6 dB. Es lo que hace que el que
   habla lejos del teléfono no se pierda y el que se ríe no reviente. */
export function comprimir(x, sr = SR, { umbral = -24, razon = 3, rodilla = 6 } = {}){
  const at = Math.exp(-1 / (0.005 * sr)), re = Math.exp(-1 / (0.15 * sr));
  let env = -90;
  for(let i = 0; i < x.length; i++){
    const lvl = linealADb(Math.abs(x[i]));
    env = lvl > env ? at * env + (1 - at) * lvl : re * env + (1 - re) * lvl;
    const sobre = env - umbral;
    let red = 0;
    if(2 * sobre <= -rodilla) red = 0;
    else if(2 * Math.abs(sobre) < rodilla) red = (1 / razon - 1) * Math.pow(sobre + rodilla / 2, 2) / (2 * rodilla);
    else red = (1 / razon - 1) * sobre;
    x[i] *= dbALineal(red);
  }
  return x;
}

/* ── limitador con anticipación ───────────────────────────────────────────
   Mira 5 ms hacia adelante y baja ANTES de que llegue el pico: así ningún
   golpe pasa del techo y no se oye el bombeo de un limitador que reacciona
   tarde. */
export function limitar(x, sr = SR, techoDb = TECHO_DB){
  const techo = dbALineal(techoDb), L = Math.max(1, Math.round(0.005 * sr));
  const need = new Float32Array(x.length);
  for(let i = 0; i < x.length; i++){ const a = Math.abs(x[i]); need[i] = a > techo ? techo / a : 1; }
  /* mínimo corrido de [i, i+L] con una cola monótona */
  const minimo = new Float32Array(x.length), cola = new Int32Array(x.length + L + 1);
  let h = 0, t = 0;
  for(let j = 0; j < Math.min(L, x.length); j++){ while(t > h && need[cola[t - 1]] >= need[j]) t--; cola[t++] = j; }
  for(let i = 0; i < x.length; i++){
    const j = i + L;
    if(j < x.length){ while(t > h && need[cola[t - 1]] >= need[j]) t--; cola[t++] = j; }
    while(cola[h] < i) h++;
    minimo[i] = need[cola[h]];
  }
  const re = Math.exp(-1 / (0.06 * sr));
  let g = 1;
  for(let i = 0; i < x.length; i++){
    g = minimo[i] < g ? minimo[i] : re * g + (1 - re) * minimo[i];
    if(g > minimo[i]) g = minimo[i];
    x[i] *= g;
  }
  return x;
}

/* llevar a una meta de LUFS (y luego limitar, porque subir puede pasarse) */
export function aMeta(x, sr = SR, meta = META_LUFS){
  const l = lufs(x, sr);
  if(Number.isFinite(l)){ const g = dbALineal(meta - l); for(let i = 0; i < x.length; i++) x[i] *= g; }
  return limitar(x, sr);
}

/* ── todo junto ───────────────────────────────────────────────────────────
   El orden importa: primero el zumbido (si no, el compresor lo «oye» como
   voz), luego el ruido, luego los silencios (con el ruido ya abajo se
   distinguen mejor), luego emparejar y al final el volumen de plataforma. */
export function limpiar(entrada, sr = SR, op = {}){
  const o = Object.assign({ zumbido: true, ruido: true, silencios: true, parejo: true, maxPausa: 0.7 }, op);
  const antes = { segundos: entrada.length / sr, lufs: lufs(entrada, sr) };
  let x = Float32Array.from(entrada);
  if(o.zumbido) filtrar(x, 'pasaaltos', 80, sr);
  if(o.ruido) bajarRuido(x, sr);
  let quitado = 0, cortes = 0;
  if(o.silencios){ const r = recortarSilencios(x, sr, { maxPausa: o.maxPausa }); x = r.datos; quitado = r.quitado; cortes = r.cortes; }
  if(o.parejo) comprimir(x, sr);
  aMeta(x, sr, META_LUFS);
  return { datos: x, antes, despues: { segundos: x.length / sr, lufs: lufs(x, sr), pico: linealADb(pico(x)) }, quitado, cortes };
}

/* ── juntar varios pedazos en uno, con un respiro entre ellos ──────────── */
export function unir(pedazos, sr = SR, respiro = 0.4){
  const hueco = Math.round(respiro * sr);
  const total = pedazos.reduce((s, p) => s + p.length, 0) + hueco * Math.max(0, pedazos.length - 1);
  const out = new Float32Array(total); let o = 0;
  pedazos.forEach((p, k) => { out.set(p, o); o += p.length + (k < pedazos.length - 1 ? hueco : 0); });
  return out;
}

/* ── la envolvente de la voz, para bajar la música cuando alguien habla ── */
export function envolvente(x, sr = SR){
  const at = Math.exp(-1 / (0.03 * sr)), re = Math.exp(-1 / (0.45 * sr));
  const out = new Float32Array(x.length); let e = 0;
  for(let i = 0; i < x.length; i++){
    const a = Math.abs(x[i]);
    e = a > e ? at * e + (1 - at) * a : re * e + (1 - re) * a;
    out[i] = e;
  }
  return out;
}

/* ── armar el episodio ────────────────────────────────────────────────────
   intro (música, con tu frase de entrada encima si la grabaste) → episodio →
   cierre. La música se baja sola ~15 dB cuando hay voz encima («ducking»), se
   desvanece al entrar el episodio y vuelve a subir al final. Todo se lleva a
   −19 LUFS al terminar. */
export function armar({ intro = null, vozIntro = null, episodio, cierre = null }, sr = SR, op = {}){
  const o = Object.assign({ entraVoz: 2.2, cruce: 1.6, bajaDb: -15, musicaDb: -4 }, op);
  const s = (seg) => Math.round(seg * sr);
  const gMus = dbALineal(o.musicaDb);
  let introLen = intro ? intro.length : 0;
  const vozIni = s(o.entraVoz);
  if(intro && vozIntro) introLen = Math.max(introLen, vozIni + vozIntro.length + s(2.5));
  const epIni = intro ? Math.max(0, introLen - s(o.cruce)) : 0;
  const epFin = epIni + episodio.length;
  const cierreIni = cierre ? Math.max(epIni, epFin - s(1.0)) : epFin;
  const total = Math.max(epFin, cierre ? cierreIni + cierre.length : 0, introLen);
  const voz = new Float32Array(total), mus = new Float32Array(total);

  voz.set(episodio, epIni);
  if(intro && vozIntro) voz.set(vozIntro.subarray(0, Math.max(0, Math.min(vozIntro.length, total - vozIni))), vozIni);
  if(intro){
    /* la música de entrada: si la voz la alarga, se repite con fundido */
    for(let i = 0; i < introLen && i < total; i++) mus[i] += intro[i % intro.length] * gMus;
    /* se va desvaneciendo durante el cruce con el episodio */
    const desde = Math.max(0, epIni - s(0.4)), hasta = introLen;
    for(let i = desde; i < hasta && i < total; i++) mus[i] *= Math.max(0, 1 - (i - desde) / Math.max(1, hasta - desde));
  }
  if(cierre){
    const sube = s(1.5);
    for(let i = 0; i < cierre.length && cierreIni + i < total; i++){
      mus[cierreIni + i] += cierre[i] * gMus * Math.min(1, i / sube);
    }
  }
  /* bajar la música donde hay voz */
  const env = envolvente(voz, sr), baja = dbALineal(o.bajaDb);
  const ref = Math.max(1e-4, pico(env) * 0.25);
  const out = new Float32Array(total);
  for(let i = 0; i < total; i++){
    const k = Math.min(1, env[i] / ref);
    out[i] = voz[i] + mus[i] * (1 - (1 - baja) * k);
  }
  /* un respiro de fundido al principio y al final para que no truene */
  const f = s(0.02);
  for(let i = 0; i < f && i < total; i++){ out[i] *= i / f; out[total - 1 - i] *= i / f; }
  aMeta(out, sr, META_LUFS);
  return { datos: out, marcas: { introFin: introLen / sr, episodio: [epIni / sr, epFin / sr], cierre: cierre ? cierreIni / sr : null } };
}

/* ── exportar ─────────────────────────────────────────────────────────── */
export function aWav(x, sr = SR){
  const buf = new ArrayBuffer(44 + x.length * 2), v = new DataView(buf);
  const w = (o, t) => { for(let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + x.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, x.length * 2, true);
  for(let i = 0; i < x.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x[i])) * 32767, true);
  return new Uint8Array(buf);
}

/* MP3 con LAME (lamejs, LGPL, en vendor/). Va por pedazos y cede el turno
   cada tanto: un episodio de 20 minutos tarda medio minuto en un teléfono y
   la pantalla no se puede quedar congelada mientras. */
export async function aMp3(x, sr = SR, kbps = 96, lame = globalThis.lamejs, avance = () => {}){
  if(!lame || !lame.Mp3Encoder) throw new Error('Falta el codificador de MP3');
  const enc = new lame.Mp3Encoder(1, sr, kbps), trozo = 1152 * 20, partes = [];
  const pcm = new Int16Array(trozo);
  for(let i = 0; i < x.length; i += trozo){
    const n = Math.min(trozo, x.length - i);
    for(let k = 0; k < n; k++) pcm[k] = Math.max(-1, Math.min(1, x[i + k])) * 32767;
    const mp3 = enc.encodeBuffer(n === trozo ? pcm : pcm.subarray(0, n));
    if(mp3.length) partes.push(new Uint8Array(mp3));
    if((i / trozo) % 25 === 0){ avance(i / x.length); await new Promise(r => setTimeout(r, 0)); }
  }
  const fin = enc.flush(); if(fin.length) partes.push(new Uint8Array(fin));
  avance(1);
  const total = partes.reduce((s, p) => s + p.length, 0), out = new Uint8Array(total);
  let o = 0; for(const p of partes){ out.set(p, o); o += p.length; }
  return out;
}

/* mm:ss para que la persona lo lea */
export function tiempo(seg){
  if(!Number.isFinite(seg)) return '—';
  const m = Math.floor(seg / 60), s = Math.round(seg % 60);
  return m + ':' + String(s === 60 ? 59 : s).padStart(2, '0');
}
