/* ══════════════════════════════════════════════════════════════════════════
   ESTUDIO · VIDEO
   ----------------------------------------------------------------------------
   El podcast es en video. Esto arma el episodio entero en el teléfono:

     entrada animada (título + tu música) → tus clips, con los silencios
     largos cortados («jump cuts») y el audio limpio → nombres en pantalla →
     cierre animado.

   Cómo se hace sin servidor: se dibuja todo en un <canvas> y se graba el
   canvas junto con el audio (MediaRecorder). Por eso el video tarda en salir
   lo mismo que dura: es una grabación en tiempo real, no un cálculo.

   Dos decisiones que salen de bugs conocidos de Safari en iPhone:
   · NO se pausa la grabadora entre corte y corte (en iOS pause/resume pierde
     pedazos y a veces entrega un archivo vacío). En lugar de pausar, hay DOS
     reproductores: mientras uno suena, el otro ya está posicionado en el
     siguiente tramo, y el cambio es instantáneo.
   · NO se usa `ctx.filter` (Safari lo ignoró hasta finales de 2024): el fondo
     de un video vertical en formato horizontal se oscurece, no se desenfoca.

   El reloj que manda es el del audio (AudioContext). El video se corrige
   solo si se adelanta o se atrasa más de 80 ms (cambiando su velocidad un
   poquito), que es lo que hace que la boca y la voz no se despeguen.
   ═════════════════════════════════════════════════════════════════════════ */
import { SR, tramosConVoz, envolvente, pico } from './motor.js';
import { TEMAS } from './portada.js';

export const FORMATOS = {
  horizontal: { nombre: 'Horizontal 16:9', w: 1280, h: 720, para: 'YouTube' },
  vertical:   { nombre: 'Vertical 9:16',   w: 720,  h: 1280, para: 'TikTok, Reels, Shorts' },
};

/* ── leer un video: duración, tamaño y su audio a 32 kHz ──────────────── */
export async function abrirVideo(blob, decodificar){
  const url = URL.createObjectURL(blob);
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
  await new Promise((si, no) => { v.onloadedmetadata = si; v.onerror = () => no(new Error('no se pudo abrir el video')); });
  /* los .webm de MediaRecorder dicen «Infinity»: se pide el final para saberla */
  if(!Number.isFinite(v.duration)){
    v.currentTime = 1e7; await new Promise(r => { v.ontimeupdate = r; setTimeout(r, 1500); }); v.ontimeupdate = null;
  }
  let audio;
  try{ audio = await decodificar(blob); }catch(e){ audio = new Float32Array(Math.round((v.duration || 1) * SR)); }
  const dur = Number.isFinite(v.duration) ? v.duration : audio.length / SR;
  const out = { url, dur, w: v.videoWidth, h: v.videoHeight, audio };
  v.removeAttribute('src'); v.load();
  return out;
}

/* ── el plan: qué tramos de qué clip, en qué orden ────────────────────── */
export function planear(clips, { cortar = true, maxPausa = 0.9 } = {}){
  const tramos = [];
  clips.forEach((c, k) => {
    const largo = Math.min(c.audio.length, Math.round(c.dur * SR));
    const t = cortar ? tramosConVoz(c.audio.subarray(0, largo), SR, { maxPausa, dejar: 0.4 }) : [[0, largo]];
    /* un tramo de menos de un cuarto de segundo es un parpadeo: se junta */
    t.forEach(([a, b]) => {
      const A = a / SR, B = b / SR, prev = tramos[tramos.length - 1];
      if(prev && prev.clip === k && A - prev.b < 0.25){ prev.b = B; return; }
      if(B - A >= 0.25) tramos.push({ clip: k, a: A, b: B });
    });
  });
  const total = tramos.reduce((s, t) => s + t.b - t.a, 0);
  const original = clips.reduce((s, c) => s + c.dur, 0);
  return { tramos, total, quitado: Math.max(0, original - total) };
}

/* ── dibujo ───────────────────────────────────────────────────────────── */
const suave = (t) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const FAM = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
function rr(g, x, y, w, h, r){ g.beginPath(); if(g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
function partir(g, texto, ancho){
  const p = String(texto || '').split(/\s+/).filter(Boolean), out = []; let r = '';
  for(const w of p){ const t = r ? r + ' ' + w : w; if(g.measureText(t).width <= ancho || !r) r = t; else { out.push(r); r = w; } }
  if(r) out.push(r); return out;
}

/* el video en el lienzo: «llenar» recorta; «completo» lo pone entero sobre
   una copia oscurecida de sí mismo */
export function dibujarCuadro(g, v, W, H, modo = 'llenar'){
  const vw = v.videoWidth || W, vh = v.videoHeight || H;
  if(modo === 'completo'){
    const kc = Math.max(W / vw, H / vh);
    g.drawImage(v, (W - vw * kc) / 2, (H - vh * kc) / 2, vw * kc, vh * kc);
    g.fillStyle = 'rgba(8,6,10,.72)'; g.fillRect(0, 0, W, H);
    const k = Math.min(W / vw, H / vh);
    g.drawImage(v, (W - vw * k) / 2, (H - vh * k) / 2, vw * k, vh * k);
  } else {
    const k = Math.max(W / vw, H / vh);
    g.drawImage(v, (W - vw * k) / 2, (H - vh * k) / 2, vw * k, vh * k);
  }
}

/* la entrada: fondo del tema, barras que bailan con la música, y el nombre */
export function dibujarEntrada(g, W, H, t, dur, d, nivel = 0){
  const T = TEMAS[d.tema] || TEMAS.noche, u = Math.min(W, H) / 720;
  const grd = g.createLinearGradient(0, 0, W, H); grd.addColorStop(0, T.fondo[0]); grd.addColorStop(1, T.fondo[1]);
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  const sale = 1 - suave((t - (dur - 0.6)) / 0.6);   /* se desvanece al final */
  g.globalAlpha = sale;
  /* las barras: 48, cada una con su fase, crecen con el nivel de la música */
  const n = 48, m = W * 0.08, bw = (W - 2 * m) / n, y0 = H * (W > H ? 0.30 : 0.33);
  g.fillStyle = T.acento;
  for(let b = 0; b < n; b++){
    const fase = Math.sin(b * 0.7 + t * 5) * 0.5 + 0.5, entra = suave((t - b * 0.012) / 0.5);
    const h = (12 + (60 + 120 * nivel) * fase) * u * entra;
    rr(g, m + b * bw + bw * 0.2, y0 - h / 2, bw * 0.6, h, bw * 0.3); g.fill();
  }
  const ancho = W - 2 * m, k = suave((t - 0.35) / 0.7);
  g.globalAlpha = sale * k; g.fillStyle = T.tinta; g.textBaseline = 'alphabetic';
  let tam = (W > H ? 92 : 84) * u; g.font = `900 ${tam}px ${FAM}`;
  let r = partir(g, d.nombre || 'Mi podcast', ancho);
  while((r.length > 3 || r.some(x => g.measureText(x).width > ancho)) && tam > 36 * u){ tam -= 4 * u; g.font = `900 ${tam}px ${FAM}`; r = partir(g, d.nombre || 'Mi podcast', ancho); }
  const yN = H * (W > H ? 0.58 : 0.55) + (1 - k) * 30 * u;
  r.forEach((x, i) => g.fillText(x, m, yN + i * tam * 1.02));
  let y = yN + (r.length - 1) * tam * 1.02 + 56 * u;
  const k2 = suave((t - 0.9) / 0.6);
  if(d.episodio){
    g.globalAlpha = sale * k2; g.font = `800 ${26 * u}px ${FAM}`;
    const txt = 'EPISODIO ' + d.episodio, w = g.measureText(txt).width + 36 * u;
    g.fillStyle = T.acento; rr(g, m, y - 30 * u, w, 44 * u, 22 * u); g.fill();
    g.fillStyle = (d.tema === 'electrico' || d.tema === 'atardecer') ? T.fondo[0] : '#fff';
    g.fillText(txt, m + 18 * u, y + 1 * u); y += 58 * u;
  }
  if(d.titulo){
    g.globalAlpha = sale * suave((t - 1.2) / 0.6); g.fillStyle = T.suave; g.font = `700 ${34 * u}px ${FAM}`;
    partir(g, d.titulo, ancho).slice(0, 2).forEach((x, i) => g.fillText(x, m, y + 4 * u + i * 42 * u));
  }
  if(d.escuela){
    g.globalAlpha = sale * suave((t - 1.5) / 0.6); g.fillStyle = T.suave; g.font = `700 ${22 * u}px ${FAM}`;
    g.fillText(String(d.escuela).toUpperCase(), m, H - m * (W > H ? 0.6 : 0.8));
  }
  g.globalAlpha = 1;
}

/* el cierre: gracias y el nombre del podcast */
export function dibujarCierre(g, W, H, t, dur, d, nivel = 0){
  const T = TEMAS[d.tema] || TEMAS.noche, u = Math.min(W, H) / 720;
  const grd = g.createLinearGradient(W, 0, 0, H); grd.addColorStop(0, T.fondo[0]); grd.addColorStop(1, T.fondo[1]);
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  const entra = suave(t / 0.6), sale = 1 - suave((t - (dur - 1.2)) / 1.2);
  g.globalAlpha = entra * sale; g.textAlign = 'center';
  const cx = W / 2, cy = H / 2;
  g.fillStyle = T.acento; const rad = (70 + 26 * nivel) * u;
  g.beginPath(); g.arc(cx, cy - 120 * u, rad, 0, Math.PI * 2); g.fill();
  g.strokeStyle = (d.tema === 'electrico' || d.tema === 'atardecer') ? T.fondo[0] : '#fff'; g.lineWidth = 9 * u; g.lineCap = 'round';
  /* un micrófono dibujado con líneas: cápsula y base */
  rr(g, cx - 18 * u, cy - 170 * u, 36 * u, 64 * u, 18 * u); g.stroke();
  g.beginPath(); g.arc(cx, cy - 122 * u, 34 * u, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.beginPath(); g.moveTo(cx, cy - 88 * u); g.lineTo(cx, cy - 72 * u); g.stroke();
  g.fillStyle = T.tinta; g.font = `900 ${64 * u}px ${FAM}`; g.fillText('¡Gracias por ver!', cx, cy + 20 * u);
  g.fillStyle = T.suave; g.font = `700 ${30 * u}px ${FAM}`;
  g.fillText(d.nombre || 'Mi podcast', cx, cy + 72 * u);
  if(d.escuela){ g.font = `700 ${22 * u}px ${FAM}`; g.fillText(String(d.escuela).toUpperCase(), cx, cy + 116 * u); }
  g.textAlign = 'left'; g.globalAlpha = 1;
}

/* el nombre en pantalla: entra de la izquierda, se queda, se va */
export function dibujarNombre(g, W, H, t, dur, p, tema){
  const T = TEMAS[tema] || TEMAS.noche, u = Math.min(W, H) / 720;
  const e = suave(t / 0.45) * (1 - suave((t - (dur - 0.45)) / 0.45));
  if(e <= 0) return;
  const m = 44 * u, y = H - (W > H ? 150 : 330) * u;
  g.font = `900 ${36 * u}px ${FAM}`; const w1 = g.measureText(p.nombre || '').width;
  g.font = `700 ${22 * u}px ${FAM}`; const w2 = g.measureText(p.rol || '').width;
  const w = Math.max(w1, w2) + 48 * u, h = (p.rol ? 92 : 64) * u, x = m - (1 - e) * (w + m);
  g.globalAlpha = Math.min(1, e * 1.4);
  g.fillStyle = 'rgba(10,8,12,.78)'; rr(g, x, y, w, h, 14 * u); g.fill();
  g.fillStyle = T.acento; rr(g, x, y, 8 * u, h, 4 * u); g.fill();
  g.fillStyle = '#fff'; g.font = `900 ${36 * u}px ${FAM}`; g.fillText(p.nombre || '', x + 26 * u, y + 44 * u);
  if(p.rol){ g.fillStyle = 'rgba(255,255,255,.75)'; g.font = `700 ${22 * u}px ${FAM}`; g.fillText(p.rol, x + 26 * u, y + 76 * u); }
  g.globalAlpha = 1;
}

/* la miniatura para YouTube (1280 × 720): un cuadro del video, oscurecido de
   un lado, con el título enorme. Es lo que decide si alguien le da clic. */
export function dibujarMiniatura(cv, v, d){
  const W = cv.width, H = cv.height, g = cv.getContext('2d'), T = TEMAS[d.tema] || TEMAS.noche, u = H / 720;
  const grd = g.createLinearGradient(0, 0, W, H); grd.addColorStop(0, T.fondo[0]); grd.addColorStop(1, T.fondo[1]);
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  if(v && v.videoWidth){ dibujarCuadro(g, v, W, H, 'llenar'); }
  const sombra = g.createLinearGradient(0, 0, W, 0);
  sombra.addColorStop(0, 'rgba(0,0,0,.85)'); sombra.addColorStop(.62, 'rgba(0,0,0,.35)'); sombra.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sombra; g.fillRect(0, 0, W, H);
  const m = 60 * u, ancho = W * 0.62;
  if(d.episodio){
    g.font = `900 ${34 * u}px ${FAM}`; const txt = 'EP. ' + d.episodio, w = g.measureText(txt).width + 40 * u;
    g.fillStyle = T.acento; rr(g, m, m, w, 58 * u, 29 * u); g.fill();
    g.fillStyle = (d.tema === 'electrico' || d.tema === 'atardecer') ? T.fondo[0] : '#fff'; g.textBaseline = 'middle';
    g.fillText(txt, m + 20 * u, m + 31 * u); g.textBaseline = 'alphabetic';
  }
  const titulo = d.titulo || d.nombre || 'Mi podcast';
  let tam = 104 * u; g.font = `900 ${tam}px ${FAM}`; let r = partir(g, titulo, ancho);
  while((r.length > 3 || r.some(x => g.measureText(x).width > ancho)) && tam > 48 * u){ tam -= 4 * u; g.font = `900 ${tam}px ${FAM}`; r = partir(g, titulo, ancho); }
  const y0 = H - m - 60 * u - (r.length - 1) * tam;
  g.lineJoin = 'round'; g.lineWidth = 10 * u; g.strokeStyle = 'rgba(0,0,0,.55)';
  r.forEach((x, i) => { g.strokeText(x, m, y0 + i * tam); g.fillStyle = i === r.length - 1 ? T.acento : '#fff'; g.fillText(x, m, y0 + i * tam); });
  if(d.titulo && d.nombre){ g.fillStyle = 'rgba(255,255,255,.85)'; g.font = `800 ${30 * u}px ${FAM}`; g.fillText(d.nombre.toUpperCase(), m, H - m + 6 * u); }
  return cv;
}

/* ── la envolvente de la música, para que las barras bailen a tiempo ─── */
function nivelesMusica(x){
  const env = envolvente(x, SR), p = pico(env) || 1, paso = Math.round(SR / 30);
  const out = new Float32Array(Math.ceil(x.length / paso));
  for(let i = 0; i < out.length; i++) out[i] = env[Math.min(env.length - 1, i * paso)] / p;
  return out;
}

/* ── exportar ─────────────────────────────────────────────────────────────
   piezas: [{ tipo:'entrada'|'cierre', audio, dur } | { tipo:'tramo', clip, a, b }]
   clips:  [{ url, audioLimpio (Float32Array del clip completo, 32 kHz) }] */
export function tipoDeVideo(){
  const M = window.MediaRecorder; if(!M || !M.isTypeSupported) return '';
  return ['video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    .find(t => M.isTypeSupported(t)) || '';
}

export async function exportar({ piezas, clips, formato = 'horizontal', modo = 'llenar', datos = {}, nombres = [], fps = 30, alto = false }, avance = () => {}, senal = {}){
  const F = FORMATOS[formato] || FORMATOS.horizontal;
  const W = alto ? Math.round(F.w * 1.5) : F.w, H = alto ? Math.round(F.h * 1.5) : F.h;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const AC = window.AudioContext || window.webkitAudioContext;
  const ac = new AC(); if(ac.state === 'suspended') await ac.resume();
  const dest = ac.createMediaStreamDestination();
  const flujo = new MediaStream([...cv.captureStream(fps).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const tipo = tipoDeVideo();
  if(!tipo) throw new Error('Este navegador no puede grabar video');
  const rec = new MediaRecorder(flujo, { mimeType: tipo, videoBitsPerSecond: alto ? 8e6 : 5e6, audioBitsPerSecond: 128000 });
  const trozos = []; rec.ondataavailable = (e) => { if(e.data && e.data.size) trozos.push(e.data); };
  const listo = new Promise(r => { rec.onstop = r; });

  /* los dos reproductores */
  const vids = [0, 1].map(() => { const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('playsinline', ''); v.style.cssText = 'position:fixed;left:-9999px;width:2px;height:2px'; document.body.appendChild(v); return v; });
  /* posicionar un reproductor en un tramo. Si ya se está posicionando en ése,
     se devuelve la MISMA promesa: si no, el segundo llamado veía el
     currentTime ya puesto y daba por hecho un salto que no había terminado */
  const posicionar = (v, p) => {
    const clave = p.clip + ':' + p.a;
    if(v._clave === clave && v._prom) return v._prom;
    v._clave = clave;
    v._prom = (async () => {
      const url = clips[p.clip].url;
      if(v.dataset.url !== url){ v.src = url; v.dataset.url = url; await new Promise(r => { v.onloadeddata = r; setTimeout(r, 4000); }); }
      if(Math.abs(v.currentTime - p.a) > 0.05){ v.currentTime = p.a; await new Promise(r => { v.onseeked = r; setTimeout(r, 4000); }); }
    })();
    return v._prom;
  };
  const buffer = (x) => { const b = ac.createBuffer(1, x.length, SR); b.copyToChannel ? b.copyToChannel(x, 0) : b.getChannelData(0).set(x); return b; };
  const bufClip = clips.map(c => c.audioLimpio ? buffer(c.audioLimpio) : null);

  /* dónde cae cada pieza en el tiempo del video final, y los nombres */
  let t = 0; const linea = piezas.map(p => { const d = p.tipo === 'tramo' ? p.b - p.a : p.dur; const o = { p, ini: t, dur: d }; t += d; return o; });
  const total = t;
  const iniEpisodio = (linea.find(x => x.p.tipo === 'tramo') || { ini: 0 }).ini;

  /* dibuja un cuadro del momento `ahora` (segundos del video final) */
  let activo = null, actual = 0, nivelesActual = null;
  function pintar(ahora){
    const L = linea[actual]; if(!L) return;
    const tl = ahora - L.ini;
    if(L.p.tipo === 'entrada') dibujarEntrada(g, W, H, tl, L.dur, datos, nivelesActual ? nivelesActual[Math.min(nivelesActual.length - 1, Math.floor(tl * 30))] : 0);
    else if(L.p.tipo === 'cierre') dibujarCierre(g, W, H, tl, L.dur, datos, nivelesActual ? nivelesActual[Math.min(nivelesActual.length - 1, Math.floor(tl * 30))] : 0);
    else if(activo && activo.readyState >= 2) dibujarCuadro(g, activo, W, H, modo);
    /* nombres: su segundo cuenta desde que empieza el episodio */
    const te = ahora - iniEpisodio;
    nombres.forEach(n => { const a = +n.en || 0, d = +n.dura || 5; if(te >= a && te <= a + d && L.p.tipo === 'tramo') dibujarNombre(g, W, H, te - a, d, n, datos.tema); });
  }

  /* arranca: primer cuadro pintado ANTES de grabar, para que no salga negro */
  if(linea[0] && linea[0].p.tipo === 'tramo') await posicionar(vids[0], linea[0].p);
  pintar(0);
  rec.start();
  const t0 = ac.currentTime + 0.25;
  let fuentes = [], cancelado = false;
  senal.cancelar = () => { cancelado = true; };
  try{
    for(actual = 0; actual < linea.length && !cancelado; actual++){
      const L = linea[actual], p = L.p, cuando = t0 + L.ini;
      nivelesActual = null;
      if(p.tipo === 'tramo'){
        const v = vids[actual % 2];
        await posicionar(v, p);
        /* el siguiente tramo se prepara en el otro reproductor mientras éste suena */
        const sig = linea[actual + 1];
        const espera = Math.max(0, (cuando - ac.currentTime) * 1000 - 30);
        await new Promise(r => setTimeout(r, espera));
        v.playbackRate = 1; v.play().catch(() => {});
        activo = v;
        if(bufClip[p.clip]){
          const s = ac.createBufferSource(), gn = ac.createGain(); s.buffer = bufClip[p.clip];
          s.connect(gn).connect(dest); const ini = Math.max(ac.currentTime, cuando);
          /* 15 ms de fundido en cada corte: sin esto, cada jump cut truena */
          gn.gain.setValueAtTime(0, ini); gn.gain.linearRampToValueAtTime(1, ini + 0.015);
          gn.gain.setValueAtTime(1, ini + L.dur - 0.015); gn.gain.linearRampToValueAtTime(0, ini + L.dur);
          s.start(ini, p.a, L.dur); fuentes.push(s);
        }
        if(sig && sig.p.tipo === 'tramo') posicionar(vids[(actual + 1) % 2], sig.p);
      } else {
        const s = ac.createBufferSource(); s.buffer = buffer(p.audio); s.connect(dest);
        s.start(Math.max(ac.currentTime, cuando)); fuentes.push(s);
        nivelesActual = nivelesMusica(p.audio);
        activo = null;
        if(linea[actual + 1] && linea[actual + 1].p.tipo === 'tramo') posicionar(vids[(actual + 1) % 2], linea[actual + 1].p);
      }
      /* pintar cuadro por cuadro hasta que se acabe la pieza */
      const fin = t0 + L.ini + L.dur;
      await new Promise(r => {
        const paso = () => {
          const ahora = ac.currentTime - t0;
          if(activo && p.tipo === 'tramo'){
            /* que el video no se despegue del audio */
            const deriva = (activo.currentTime - p.a) - (ahora - L.ini);
            activo.playbackRate = deriva > 0.08 ? 0.94 : deriva < -0.08 ? 1.06 : 1;
          }
          pintar(Math.min(ahora, L.ini + L.dur - 0.001));
          avance(Math.min(1, ahora / total), ahora, total);
          if(ac.currentTime >= fin || cancelado) r(); else setTimeout(paso, 1000 / fps / 2);
        };
        paso();
      });
      if(activo) activo.pause();
    }
  } finally{
    rec.stop();
    await listo;
    fuentes.forEach(s => { try{ s.stop(); }catch(e){} });
    vids.forEach(v => { v.removeAttribute('src'); v.load(); v.remove(); });
    flujo.getTracks().forEach(x => x.stop());
    ac.close().catch(() => {});
  }
  if(cancelado) return null;
  return new Blob(trozos, { type: tipo.split(';')[0] });
}
