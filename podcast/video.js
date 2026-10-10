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
import { SR, tramosConVoz, envolvente, pico, niveles, pisoDeRuido } from './motor.js';
import { TEMAS } from './portada.js';
import { dibujarIdent, dibujarAnuncio, DURA_IDENT, DURA_ANUNCIO } from '../fadori/anuncios.js';
import { dibujarPaloma, PALOMA } from './marca/paloma-anim.js';

/* la tanda de anuncios de la escuela: logo del canal, cada anuncio con su
   logo que gira, y el logo del canal otra vez para regresar */
export const TANDA = { abre: 2.6, cierra: 2.2, cada: DURA_IDENT + DURA_ANUNCIO };
export const duraTanda = (n) => TANDA.abre + n * TANDA.cada + TANDA.cierra;

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

/* ── «me equivoqué»: de dónde a dónde se borra ───────────────────────────
   Quien se equivoca casi siempre se calla un momento y repite la frase. Al
   tocar el botón se borra desde el principio de la frase que estaba diciendo
   (el último silencio de al menos 0.35 s antes del toque) hasta el toque. Si
   no hay silencio en los 20 s de antes, se borran los últimos 8 s. */
export function corteDeError(audio, t){
  const { db, n } = niveles(audio, SR), piso = pisoDeRuido(audio, SR);
  const umbral = Math.min(Math.max(piso + 10, -55), -28), paso = n / SR;
  let i = Math.min(db.length - 1, Math.floor((t - 0.4) / paso));
  const tope = Math.max(0, Math.floor((t - 20) / paso)), minSil = Math.ceil(0.35 / paso);
  /* primero se salta la voz hacia atrás hasta un silencio largo */
  while(i > tope){
    if(db[i] < umbral){
      let j = i; while(j > tope && db[j] < umbral) j--;
      if(i - j >= minSil) return [Math.max(0, (i + 1) * paso - 0.1), t + 0.15];
      i = j;
    } else i--;
  }
  return [Math.max(0, t - 8), t + 0.15];
}

/* restar intervalos: [a,b] menos una lista de cortes */
function restar(a, b, cortes){
  let partes = [[a, b]];
  for(const [x, y] of cortes){
    const nuevas = [];
    for(const [p, q] of partes){
      if(y <= p || x >= q){ nuevas.push([p, q]); continue; }
      if(x > p) nuevas.push([p, x]);
      if(y < q) nuevas.push([y, q]);
    }
    partes = nuevas;
  }
  return partes;
}

/* ── el plan: qué tramos de qué clip, en qué orden ──────────────────────
   Cada clip puede traer su edición a mano:
     ed.ini / ed.fin   recortar el principio y el final
     ed.cortes         pedazos a quitar [[a,b], …]
     marcas            los toques de «me equivoqué» durante la grabación
     cartel            un letrero de 2.5 s antes del clip («Bloque 2 · …») */
export function planear(clips, { cortar = true, maxPausa = 0.9 } = {}){
  const tramos = [], orden = [];
  clips.forEach((c, k) => {
    const largo = Math.min(c.audio.length, Math.round(c.dur * SR));
    const ed = c.edicion || {}, ini = Math.max(0, +ed.ini || 0), fin = Math.min(c.dur, ed.fin ? +ed.fin : c.dur);
    const quitar = (ed.cortes || []).concat((c.marcas || []).map(t => corteDeError(c.audio.subarray(0, largo), t)));
    const permitidos = restar(ini, fin, quitar);
    const voz = cortar ? tramosConVoz(c.audio.subarray(0, largo), SR, { maxPausa, dejar: 0.4 }).map(([a, b]) => [a / SR, b / SR]) : [[0, c.dur]];
    const ads = (c.anuncios || []).slice(0, 3);
    if(ads.length) orden.push({ tipo: 'tanda', ids: ads, dur: duraTanda(ads.length) });
    if(c.cartel && String(c.cartel).trim()) orden.push({ tipo: 'cartel', texto: String(c.cartel).trim(), dur: 2.5 });
    for(const [va, vb] of voz) for(const [pa, pb] of permitidos){
      const A = Math.max(va, pa), B = Math.min(vb, pb);
      if(B - A < 0.25) continue;
      /* un tramo pegadito al anterior del mismo clip se junta: un corte de
         un cuarto de segundo es un parpadeo, no un corte */
      const prev = tramos[tramos.length - 1];
      if(prev && prev.clip === k && A - prev.b < 0.25 && A >= prev.a){ prev.b = Math.max(prev.b, B); continue; }
      const t = { clip: k, a: A, b: B };
      tramos.push(t); orden.push(Object.assign({ tipo: 'tramo' }, t));
    }
  });
  /* el orden guarda copias: si se juntó un tramo, se actualiza su copia */
  const porClave = new Map(tramos.map(t => [t.clip + ':' + t.a, t]));
  orden.forEach(o => { if(o.tipo === 'tramo'){ const t = porClave.get(o.clip + ':' + o.a); if(t) o.b = t.b; } });
  const total = tramos.reduce((s, t) => s + t.b - t.a, 0);
  const original = clips.reduce((s, c) => s + c.dur, 0);
  return { tramos, orden, total, quitado: Math.max(0, original - total),
    carteles: orden.filter(o => o.tipo === 'cartel').length,
    tandas: orden.filter(o => o.tipo === 'tanda').length,
    extra: orden.filter(o => o.tipo !== 'tramo').reduce((s, o) => s + o.dur, 0) };
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
  if(d.logo) return entradaConLogo(g, W, H, t, dur, d, nivel, T, u, sale);
  g.globalAlpha = sale;
  /* las barras: 48, cada una con su fase, crecen con el nivel de la música */
  const n = 48, m = W * 0.08, bw = (W - 2 * m) / n, y0 = H * (W > H ? 0.26 : 0.24);
  g.fillStyle = T.acento;
  for(let b = 0; b < n; b++){
    const fase = Math.sin(b * 0.7 + t * 5) * 0.5 + 0.5, entra = suave((t - b * 0.012) / 0.5);
    const h = (12 + (60 + 120 * nivel) * fase) * u * entra;
    rr(g, m + b * bw + bw * 0.2, y0 - h / 2, bw * 0.6, h, bw * 0.3); g.fill();
  }
  /* el bloque de texto (nombre, episodio y título) se mide primero y se
     centra en el espacio que queda abajo de las barras: con un nombre largo
     se achica en vez de salirse por abajo */
  const ancho = W - 2 * m, k = suave((t - 0.35) / 0.7);
  const arriba = y0 + 120 * u, piso = H - (d.escuela ? m * (W > H ? 1.2 : 1.4) : m * 0.8);
  let tam = (W > H ? 92 : 84) * u, r;
  const altoBloque = (tt, rr) => rr.length * tt * 1.02 + (d.episodio ? 58 * u : 0) + (d.titulo ? 46 * u : 0);
  for(;; tam -= 4 * u){
    g.font = `900 ${tam}px ${FAM}`; r = partir(g, d.nombre || 'Mi podcast', ancho);
    if((r.length <= 3 && r.every(x => g.measureText(x).width <= ancho) && altoBloque(tam, r) <= piso - arriba) || tam <= 36 * u) break;
  }
  const yIni = arriba + Math.max(0, (piso - arriba - altoBloque(tam, r)) / 2) + tam * 0.8;
  g.globalAlpha = sale * k; g.fillStyle = T.tinta; g.textBaseline = 'alphabetic';
  const yN = yIni + (1 - k) * 30 * u;
  r.forEach((x, i) => g.fillText(x, m, yN + i * tam * 1.02));
  let y = yIni + (r.length - 1) * tam * 1.02 + 56 * u;
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
    const lt = partir(g, d.titulo, ancho)[0] || '';
    g.fillText(lt, m, y + 4 * u);
  }
  if(d.escuela){
    g.globalAlpha = sale * suave((t - 1.5) / 0.6); g.fillStyle = T.suave; g.font = `700 ${22 * u}px ${FAM}`;
    g.fillText(String(d.escuela).toUpperCase(), m, H - m * (W > H ? 0.6 : 0.8));
  }
  g.globalAlpha = 1;
}

/* Con logo: el logo entra creciendo y flota con la música (la paloma
   «respira»); el número y el título del episodio salen a su lado (horizontal)
   o abajo (vertical). Las barras bailan al pie. */
function entradaConLogo(g, W, H, t, dur, d, nivel, T, u, sale){
  const L = d.logo, horiz = W > H, m = W * 0.07;
  const e = suave(t / 0.9), flota = Math.sin(t * 2.2) * 6 * u * e;
  const zona = horiz ? { x: m, y: H * 0.08, w: W * 0.42, h: H * 0.74 } : { x: m, y: H * 0.08, w: W - 2 * m, h: H * 0.48 };
  const k = Math.min(zona.w / L.width, zona.h / L.height) * (0.9 + 0.1 * e) * (1 + nivel * 0.015);
  const lw = L.width * k, lh = L.height * k;
  if(d.logoVector){
    /* la paloma en vectores: se dibuja sola, aletea y le laten los audífonos
       con la música; las letras de abajo (del logo original) entran después */
    const x0 = zona.x + (zona.w - lw) / 2, y0 = zona.y + (zona.h - lh) / 2;
    const altoPaloma = lh * PALOMA.alto / L.height;
    g.globalAlpha = sale;
    dibujarPaloma(g, x0 + lw / 2, y0 + altoPaloma / 2, altoPaloma, t, { color: d.tinta || '#fff', nivel, dibuja: 1.3 });
    const resto = L.height - PALOMA.alto;
    if(resto > 10){
      g.globalAlpha = sale * suave((t - 1.2) / 0.6);
      g.drawImage(L, 0, PALOMA.alto, L.width, resto, x0, y0 + altoPaloma + (1 - suave((t - 1.2) / 0.6)) * 20 * u, lw, resto * k);
    }
  } else {
    g.globalAlpha = sale * e;
    g.drawImage(L, zona.x + (zona.w - lw) / 2, zona.y + (zona.h - lh) / 2 + flota, lw, lh);
  }
  /* las barras al pie */
  const n = 56, bw = (W - 2 * m) / n, yB = H - (horiz ? 60 : 90) * u;
  g.fillStyle = T.acento;
  for(let b = 0; b < n; b++){
    const fase = Math.sin(b * 0.6 + t * 5) * 0.5 + 0.5, h = (6 + (24 + 50 * nivel) * fase) * u * suave((t - b * 0.01) / 0.5);
    rr(g, m + b * bw + bw * 0.22, yB - h / 2, bw * 0.56, h, bw * 0.28); g.fill();
  }
  /* el episodio */
  const col = horiz ? { x: W * 0.55, w: W * 0.45 - m } : { x: m, w: W - 2 * m };
  let y = horiz ? H * 0.40 : H * 0.62;
  const k2 = suave((t - 0.8) / 0.6);
  g.textAlign = horiz ? 'left' : 'center';
  const cx = horiz ? col.x : W / 2;
  if(d.episodio){
    g.globalAlpha = sale * k2; g.font = `900 ${30 * u}px ${FAM}`;
    const txt = 'EPISODIO ' + d.episodio, w = g.measureText(txt).width + 40 * u;
    g.fillStyle = T.acento; rr(g, horiz ? cx : cx - w / 2, y - 34 * u, w, 50 * u, 25 * u); g.fill();
    g.fillStyle = '#fff'; g.fillText(txt, horiz ? cx + 20 * u : cx, y + 2 * u); y += 74 * u;
  }
  if(d.titulo){
    g.globalAlpha = sale * suave((t - 1.1) / 0.6); g.fillStyle = T.tinta;
    let tam = 54 * u; g.font = `900 ${tam}px ${FAM}`; let r = partir(g, d.titulo, col.w);
    while((r.length > 4 || r.some(x => g.measureText(x).width > col.w)) && tam > 26 * u){ tam -= 2 * u; g.font = `900 ${tam}px ${FAM}`; r = partir(g, d.titulo, col.w); }
    r.forEach((x, i) => g.fillText(x, cx, y + i * tam * 1.08)); y += r.length * tam * 1.08;
  }
  if(d.escuela){
    g.globalAlpha = sale * suave((t - 1.4) / 0.6); g.fillStyle = T.suave; g.font = `700 ${24 * u}px ${FAM}`;
    g.fillText(String(d.escuela).toUpperCase(), cx, y + 20 * u);
  }
  g.textAlign = 'left'; g.globalAlpha = 1;
}

/* el cartel entre bloques: fondo del tema, una raya que cruza y el texto */
export function dibujarCartel(g, W, H, t, dur, texto, d){
  const T = TEMAS[d.tema] || TEMAS.noche, u = Math.min(W, H) / 720;
  const grd = g.createLinearGradient(0, 0, W, H); grd.addColorStop(0, T.fondo[0]); grd.addColorStop(1, T.fondo[1]);
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  const e = suave(t / 0.35) * (1 - suave((t - (dur - 0.35)) / 0.35)), m = W * 0.08;
  g.globalAlpha = e;
  const raya = suave(t / 0.6);
  g.fillStyle = T.acento; rr(g, m, H / 2 + 46 * u, (W - 2 * m) * raya, 8 * u, 4 * u); g.fill();
  g.fillStyle = T.tinta; let tam = (W > H ? 72 : 60) * u; g.font = `900 ${tam}px ${FAM}`;
  let r = partir(g, texto, W - 2 * m);
  while((r.length > 2 || r.some(x => g.measureText(x).width > W - 2 * m)) && tam > 30 * u){ tam -= 3 * u; g.font = `900 ${tam}px ${FAM}`; r = partir(g, texto, W - 2 * m); }
  r.forEach((x, i) => g.fillText(x, m + (1 - e) * -30 * u, H / 2 + 20 * u - (r.length - 1 - i) * tam * 1.05));
  if(d.logoChico){ const L = d.logoChico, h = 70 * u, w = L.width * h / L.height; g.globalAlpha = e * 0.8; g.drawImage(L, W - m - w, H / 2 + 70 * u, w, h); }
  g.globalAlpha = 1;
}
/* el «fiu» del cartel: ruido que sube y baja, 0.8 s */
export function fiu(){
  const n = Math.round(0.8 * SR), x = new Float32Array(n); let lp = 0, s = 12345;
  for(let i = 0; i < n; i++){
    s = (s * 1103515245 + 12345) >>> 0; const r = (s / 4294967296) * 2 - 1, k = i / n;
    lp += (0.02 + 0.3 * Math.sin(Math.PI * k)) * (r - lp);
    x[i] = lp * 0.25 * Math.sin(Math.PI * k);
  }
  return x;
}

/* la marca de agua: el logo chico en la esquina mientras hablan */
export function dibujarMarca(g, W, H, d){
  const L = d.logoChico; if(!L) return;
  const u = Math.min(W, H) / 720, h = 74 * u, w = L.width * h / L.height, m = 26 * u;
  g.globalAlpha = 0.6; g.drawImage(L, W - m - w, m, w, h); g.globalAlpha = 1;
}

/* el cierre: gracias y el nombre del podcast */
export function dibujarCierre(g, W, H, t, dur, d, nivel = 0){
  const T = TEMAS[d.tema] || TEMAS.noche, u = Math.min(W, H) / 720;
  const grd = g.createLinearGradient(W, 0, 0, H); grd.addColorStop(0, T.fondo[0]); grd.addColorStop(1, T.fondo[1]);
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  const entra = suave(t / 0.6), sale = 1 - suave((t - (dur - 1.2)) / 1.2);
  g.globalAlpha = entra * sale; g.textAlign = 'center';
  const cx = W / 2, cy = H / 2;
  if(d.logoChico){
    const L = d.logoChico, h = (190 + 20 * nivel) * u, w = L.width * h / L.height;
    g.drawImage(L, cx - w / 2, cy - 90 * u - h, w, h);
  } else {
  g.fillStyle = T.acento; const rad = (70 + 26 * nivel) * u;
  g.beginPath(); g.arc(cx, cy - 120 * u, rad, 0, Math.PI * 2); g.fill();
  g.strokeStyle = (d.tema === 'electrico' || d.tema === 'atardecer') ? T.fondo[0] : '#fff'; g.lineWidth = 9 * u; g.lineCap = 'round';
  /* un micrófono dibujado con líneas: cápsula y base */
  rr(g, cx - 18 * u, cy - 170 * u, 36 * u, 64 * u, 18 * u); g.stroke();
  g.beginPath(); g.arc(cx, cy - 122 * u, 34 * u, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.beginPath(); g.moveTo(cx, cy - 88 * u); g.lineTo(cx, cy - 72 * u); g.stroke();
  }
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

/* ── LA TARJETA DE QUIÉN HABLA · estilo reality ───────────────────────
   Tres bloques inclinados que entran uno tras otro desde la izquierda: el
   nombre en una franja blanca, el APODO enorme en el color de su asiento
   (con un brillo que lo cruza) y lo que hace en una franja oscura. A la
   izquierda, el número de su asiento. Cada asiento tiene su color: el
   presentador va con el del podcast. */
export const COLORES_ASIENTO = ['', '#F59E0B', '#3B82F6', '#22C55E', '#A855F7', '#EC4899'];
export function colorDeAsiento(k, tema){ const T = TEMAS[tema] || TEMAS.noche; return k === 0 ? T.acento : COLORES_ASIENTO[k % COLORES_ASIENTO.length] || T.acento; }
export function dibujarTarjeta(g, W, H, t, dur, p, tema, k = 0){
  if(t < 0 || t > dur) return;
  const u = Math.min(W, H) / 720, horiz = W > H, col = colorDeAsiento(k, tema);
  const sale = (x) => { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 3); };
  const entra = (d) => sale((t - d) / 0.5), vete = suave((t - (dur - 0.45)) / 0.45);
  const x0 = (horiz ? 64 : 40) * u, maxW = W - x0 * 2 - 90 * u;
  const nombre = String(p.nombre || '').toUpperCase(), apodo = String(p.apodo || '').trim(), rol = String(p.rol || '');
  /* si algo no cabe, todo se achica parejo */
  let k1 = 1;
  const medir = () => {
    g.font = `800 ${40 * u * k1}px ${FAM}`; const wN = g.measureText(nombre).width;
    g.font = `italic 900 ${84 * u * k1}px ${FAM}`; const wA = apodo ? g.measureText('«' + apodo.toUpperCase() + '»').width : 0;
    g.font = `700 ${29 * u * k1}px ${FAM}`; const wR = g.measureText(rol).width;
    return { wN, wA, wR };
  };
  let m = medir();
  const mayor = Math.max(m.wN + 40 * u, m.wA + 60 * u, m.wR + 40 * u);
  if(mayor > maxW){ k1 = maxW / mayor; m = medir(); }
  const hN = 60 * u * k1, hA = apodo ? 112 * u * k1 : 0, hR = rol ? 52 * u * k1 : 0;
  const alto = hN + hA + hR, y0 = H - (horiz ? 70 : 300) * u - alto;
  const insc = 0.22;                              /* la inclinación */
  const bloque = (x, y, w, h, color) => { g.beginPath(); g.moveTo(x + insc * h, y); g.lineTo(x + w + insc * h, y); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.closePath(); g.fillStyle = color; g.fill(); };
  const corre = (d, w) => (1 - entra(d)) * -(w + x0 + 120 * u) - vete * (W * 0.6);
  const xT = x0 + 108 * u * k1;
  g.save(); g.globalAlpha = 1 - vete * 0.6;
  /* el asiento */
  const s = hN + hA, xs = x0 + corre(0, 80 * u);
  bloque(xs, y0, 96 * u * k1, s, col);
  g.fillStyle = '#fff'; g.font = `900 ${64 * u * k1}px ${FAM}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(k + 1), xs + 48 * u * k1 + insc * s / 2, y0 + s / 2 + 2 * u);
  g.textAlign = 'left';
  /* el nombre */
  const wN = m.wN + 40 * u * k1, xn = xT + corre(0.08, wN);
  bloque(xn, y0, wN, hN, '#FFFFFF');
  g.fillStyle = '#121014'; g.font = `800 ${40 * u * k1}px ${FAM}`; g.fillText(nombre, xn + 18 * u * k1 + insc * hN / 2, y0 + hN / 2 + 1);
  /* el apodo, con su brillo */
  if(apodo){
    const wA = m.wA + 84 * u * k1, xa = xT - insc * hA + corre(0.18, wA), ya = y0 + hN;
    bloque(xa, ya, wA, hA, col);
    g.fillStyle = '#FFFFFF'; g.font = `italic 900 ${84 * u * k1}px ${FAM}`;
    g.fillText('«' + apodo.toUpperCase() + '»', xa + 28 * u * k1 + insc * hA / 2, ya + hA / 2 + 3 * u);
    const b = (t - 0.55) / 0.6;
    if(b > 0 && b < 1){
      g.save(); g.beginPath(); g.moveTo(xa + insc * hA, ya); g.lineTo(xa + wA + insc * hA, ya); g.lineTo(xa + wA, ya + hA); g.lineTo(xa, ya + hA); g.closePath(); g.clip();
      const bx = xa + (wA + 200 * u) * b - 100 * u, gr = g.createLinearGradient(bx - 60 * u, 0, bx + 60 * u, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(xa, ya, wA + hA, hA); g.restore();
    }
  }
  /* lo que hace */
  if(rol){
    const wR = m.wR + 40 * u * k1, xr = xT - insc * (hA + hR) + corre(0.28, wR), yr = y0 + hN + hA;
    bloque(xr, yr, wR, hR, 'rgba(12,10,14,.86)');
    g.fillStyle = 'rgba(255,255,255,.92)'; g.font = `700 ${29 * u * k1}px ${FAM}`; g.fillText(rol, xr + 18 * u * k1 + insc * hR / 2, yr + hR / 2 + 1);
  }
  g.restore(); g.textBaseline = 'alphabetic';
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
  if(d.logoChico){ const L = d.logoChico, h = 150 * u, w = L.width * h / L.height; g.drawImage(L, W - m - w, m - 10 * u, w, h); }
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
  /* las tarjetas de quién sale: al empezar el clip donde aparece, una tras
     otra, 4.8 s cada una */
  const tarjetas = [];
  clips.forEach((c, k) => {
    if(!c.salen || !c.salen.length) return;
    const L0 = linea.find(x => x.p.tipo === 'tramo' && x.p.clip === k); if(!L0) return;
    c.salen.forEach((per, j) => tarjetas.push({ per, en: L0.ini + 0.6 + j * 5.2, dura: 4.8 }));
  });

  /* dibuja un cuadro del momento `ahora` (segundos del video final) */
  let activo = null, actual = 0, nivelesActual = null;
  function pintar(ahora){
    const L = linea[actual]; if(!L) return;
    const tl = ahora - L.ini;
    if(L.p.tipo === 'entrada') dibujarEntrada(g, W, H, tl, L.dur, datos, nivelesActual ? nivelesActual[Math.min(nivelesActual.length - 1, Math.floor(tl * 30))] : 0);
    else if(L.p.tipo === 'cierre') dibujarCierre(g, W, H, tl, L.dur, datos, nivelesActual ? nivelesActual[Math.min(nivelesActual.length - 1, Math.floor(tl * 30))] : 0);
    else if(L.p.tipo === 'cartel') dibujarCartel(g, W, H, tl, L.dur, L.p.texto, datos);
    else if(L.p.tipo === 'canal') dibujarIdent(g, W, H, tl, L.p.P, { dur: L.dur, aterriza: false });
    else if(L.p.tipo === 'ident') dibujarIdent(g, W, H, tl, L.p.P, { dur: L.dur, aterriza: true });
    else if(L.p.tipo === 'anuncio') dibujarAnuncio(g, W, H, tl, L.p.P, { dur: L.dur });
    else if(activo && activo.readyState >= 2){ dibujarCuadro(g, activo, W, H, modo); if(datos.marcaAgua) dibujarMarca(g, W, H, datos); }
    /* nombres: su segundo cuenta desde que empieza el episodio */
    const te = ahora - iniEpisodio;
    if(L.p.tipo === 'tramo'){
      nombres.forEach(n => { if(n.en === '' || n.en == null) return; const a = +n.en || 0, d = +n.dura || 5; if(te >= a && te <= a + d) dibujarTarjeta(g, W, H, te - a, d, n, datos.tema, n.asiento || 0); });
      tarjetas.forEach(x => { if(ahora >= x.en && ahora <= x.en + x.dura) dibujarTarjeta(g, W, H, ahora - x.en, x.dura, x.per, datos.tema, x.per.asiento || 0); });
    }
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
        /* el anuncio va callado: el «fiu» ya sonó en su logo */
        const au = p.audio || (p.tipo === 'anuncio' ? new Float32Array(SR / 10) : fiu());
        const s = ac.createBufferSource(); s.buffer = buffer(au); s.connect(dest);
        s.start(Math.max(ac.currentTime, cuando)); fuentes.push(s);
        nivelesActual = nivelesMusica(au);
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
