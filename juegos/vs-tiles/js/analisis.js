/* EXÓRCIST Lab · analizar una canción EN EL TELÉFONO, sin subirla: lo mismo que hace librosa para las
   canciones de fábrica (datos/*.json), pero en el navegador. Sale { dur, bpm, golpes, ataques, energia,
   secciones } y de ahí cartas.js arma la carta igual que con las otras.
     1. se renderiza la canción en tres bandas (grave, medio y agudo) con filtros de Web Audio;
     2. de cada banda, la «subida de energía» cuadro a cuadro (el flujo): donde sube de golpe hay un ataque;
     3. el tempo sale de la autocorrelación del flujo (de 80 a 180 golpes por minuto);
     4. la fase de los golpes, de donde la rejilla junta más ataques;
     5. las secciones, de donde la energía cambia de nivel. */
export async function analizar(buf, avance = () => {}){
  const sr = 11025, dur = buf.duration, n = Math.ceil(dur * sr), hop = 128, fps = sr / hop;
  const banda = async (tipo, f, q = .7) => { const o = new OfflineAudioContext(1, n, sr); const s = o.createBufferSource(); s.buffer = buf;
    const fl = o.createBiquadFilter(); fl.type = tipo; fl.frequency.value = f; fl.Q.value = q; s.connect(fl); fl.connect(o.destination); s.start(); return (await o.startRendering()).getChannelData(0); };
  avance('Separando graves, medios y agudos…');
  const [g, m, a] = [await banda('lowpass', 160), await banda('bandpass', 1100, .6), await banda('highpass', 3200)];
  const frames = Math.floor(n / hop);
  const env = (x) => { const e = new Float32Array(frames); for(let i = 0; i < frames; i++){ let s = 0; for(let k = 0; k < hop; k++){ const v = x[i * hop + k] || 0; s += v * v; } e[i] = Math.log1p(Math.sqrt(s / hop) * 1000); } return e; };
  avance('Buscando los golpes…');
  const E = [env(g), env(m), env(a)], flujo = E.map(e => { const d = new Float32Array(frames); for(let i = 1; i < frames; i++) d[i] = Math.max(0, e[i] - e[i - 1]); const mx = Math.max(1e-6, ...d); for(let i = 0; i < frames; i++) d[i] /= mx; return d; });
  const total = new Float32Array(frames); for(let i = 0; i < frames; i++) total[i] = flujo[0][i] * 1.3 + flujo[1][i] + flujo[2][i] * .9;
  /* los ataques: picos sobre el promedio local */
  const ataques = [], W = Math.round(fps * .35); let mxT = 0; for(const v of total) mxT = Math.max(mxT, v);
  for(let i = 2; i < frames - 2; i++){ const v = total[i]; if(v < total[i - 1] || v < total[i + 1] || v < total[i - 2] || v < total[i + 2]) continue;
    let s = 0, c = 0; for(let k = Math.max(0, i - W); k < Math.min(frames, i + W); k++){ s += total[k]; c++; } if(v < s / c * 1.5 + .04 * mxT) continue;
    const bs = [flujo[0][i] * 1.3, flujo[1][i], flujo[2][i] * 1.1]; ataques.push([+(i / fps).toFixed(3), +(v / mxT).toFixed(3), bs.indexOf(Math.max(...bs))]); }
  /* el tempo: autocorrelación del flujo */
  avance('Midiendo el tempo…');
  let mejor = 0, lagB = Math.round(fps * 60 / 120); for(let bpm = 80; bpm <= 180; bpm += .5){ const lag = fps * 60 / bpm; let s = 0;
    for(let i = 0; i + lag * 2 < frames; i += 2){ const j = Math.round(i + lag), k = Math.round(i + 2 * lag); s += total[i] * (total[j] + .5 * total[k]); }
    s *= 1 + .15 * Math.exp(-Math.pow((bpm - 128) / 30, 2)); if(s > mejor){ mejor = s; lagB = lag; } }
  const bpm = +(fps * 60 / lagB).toFixed(2), paso = 60 / bpm;
  /* la fase: donde la rejilla de golpes junta más ataques */
  let fase = 0, mf = -1; for(let f = 0; f < paso; f += .005){ let s = 0; for(let t = f; t < dur; t += paso){ s += total[Math.round(t * fps)] || 0; } if(s > mf){ mf = s; fase = f; } }
  const golpes = []; for(let t = fase; t < dur; t += paso) golpes.push(+t.toFixed(3));
  /* la energía cada medio segundo y las secciones cada 8 compases donde cambia de nivel */
  const energia = []; const rms = E.map(e => e); for(let t = 0; t < dur; t += .5){ let s = 0, c = 0; for(let i = Math.floor(t * fps); i < Math.min(frames, (t + .5) * fps); i++){ s += rms[0][i] + rms[1][i] + rms[2][i]; c++; } energia.push(c ? s / c : 0); }
  const me = Math.max(1e-6, ...energia); for(let i = 0; i < energia.length; i++) energia[i] = +(energia[i] / me).toFixed(3);
  const secciones = [0]; const bloque = paso * 32; let ant = -1;
  for(let t = fase; t < dur - bloque * .5; t += bloque){ const e = energia.slice(Math.floor(t * 2), Math.floor((t + bloque) * 2)).reduce((x, y) => x + y, 0) / Math.max(1, bloque * 2);
    if(ant >= 0 && (Math.abs(e - ant) > .08 || secciones.length < 2 && t > 20)) secciones.push(+t.toFixed(3)); ant = e; }
  return { dur: +dur.toFixed(3), bpm, golpes, ataques, energia, secciones };
}
