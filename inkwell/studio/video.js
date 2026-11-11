/* INKWELL Studio · el cómic animado (Carlos, 10 nov: «mételo pero específico para edición de cómics»).
   Toma las páginas de una obra y arma un video vertical para TikTok o Reels:
   · la cámara va de viñeta en viñeta (en orden de lectura) y se acerca despacito mientras lees;
   · los globos, textos y onomatopeyas de cada viñeta aparecen a su tiempo, con un saltito;
   · una onomatopeya sacude la cámara;
   · portada con el título al empezar y cierre «Hecho en Inkwell» al final;
   · música opcional (un archivo del teléfono) que baja al terminar.
   Todo se dibuja en un lienzo con una sola función del tiempo, así que la vista previa y el video son lo mismo. */
import { dibujar } from './lienzo.js';

export const VELOCIDADES = { lento: 1.4, normal: 1, rapido: .7 };
const TEXTOS = new Set(['globo', 'ono', 'texto']);
const dentro = (c, m) => { const x = c.x + c.w / 2, y = c.y + c.h / 2; return x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + m.h; };
const suave = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* el orden de lectura de las viñetas: por renglones (con tolerancia) y de izquierda a derecha */
export function ordenLectura(marcos){
  const r = [...marcos].sort((a, b) => a.y - b.y);
  const filas = [];
  for(const m of r){ const f = filas.find((x) => Math.abs(x[0].y - m.y) < Math.max(40, m.h * .25)); if(f) f.push(m); else filas.push([m]); }
  return filas.flatMap((f) => f.sort((a, b) => a.x - b.x));
}

/* el guion: tomas con su cámara, sus textos y su tiempo */
export async function armarGuion(obra, { velocidad = 'normal' } = {}){
  const k = VELOCIDADES[velocidad] || 1, tomas = [], paginas = [];
  for(const p of obra.paginas){
    const completo = document.createElement('canvas'), sinTextos = document.createElement('canvas');
    await dibujar(completo, obra, p);
    const tapadas = p.capas.filter((c) => TEXTOS.has(c.tipo) && !c.oculta);
    tapadas.forEach((c) => { c.oculta = true; });
    try{ await dibujar(sinTextos, obra, p); } finally { tapadas.forEach((c) => { delete c.oculta; }); }
    const pi = paginas.push({ completo, sinTextos, ancho: p.ancho, alto: p.alto }) - 1;
    const marcos = ordenLectura(p.capas.filter((c) => c.tipo === 'marco' && !c.oculta));
    const textos = tapadas.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const grupos = marcos.length ? marcos.map((m) => ({ cam: m, items: textos.filter((c) => dentro(c, m)) })) : [{ cam: { x: 0, y: 0, w: p.ancho, h: p.alto }, items: textos }];
    /* lo que no cae en ninguna viñeta aparece con la última toma de la página */
    if(marcos.length){ const sueltos = textos.filter((c) => !marcos.some((m) => dentro(c, m))); grupos[grupos.length - 1].items.push(...sueltos); }
    for(const g of grupos){
      const pad = Math.max(g.cam.w, g.cam.h) * .05;
      const cam = { x: g.cam.x - pad, y: g.cam.y - pad, w: g.cam.w + pad * 2, h: g.cam.h + pad * 2 };
      let t = .55 * k;
      const items = g.items.map((c) => { const t0 = t; t += (.75 + Math.min(80, String(c.texto || '').length) * .04) * k; return { x: c.x, y: c.y, w: c.w, h: c.h, t0, sacude: c.tipo === 'ono' }; });
      const dura = Math.max(2.2 * k, Math.min(10, t + .9 * k));
      tomas.push({ pagina: pi, cam, items, dura });
    }
  }
  return { tomas, paginas, titulo: obra.titulo || 'Mi cómic', autor: obra.autor || '' };
}

/* cuánto dura todo y en qué toma cae un segundo t */
const PORTADA = 2.2, CIERRE = 2.4, PASO = .7;
export function duracion(g){ return PORTADA + g.tomas.reduce((a, x) => a + x.dura, 0) + CIERRE; }
function dondeVa(g, t){
  let s = t - PORTADA;
  for(let i = 0; i < g.tomas.length; i++){ if(s < g.tomas[i].dura) return { i, s }; s -= g.tomas[i].dura; }
  return null;
}

/* ── pintar un cuadro del video en el segundo t ── */
export function pintarCuadro(ctx, g, t, { W, H, pluma = null } = {}){
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0B0610'; ctx.fillRect(0, 0, W, H);
  const total = duracion(g);
  if(t < PORTADA) portada(ctx, g, t, W, H);
  else if(t >= total - CIERRE) cierre(ctx, g, t - (total - CIERRE), W, H, pluma);
  else{
    const d = dondeVa(g, t); if(d) toma(ctx, g, d.i, d.s, W, H);
  }
  ctx.restore();
}
/* la cámara de una viñeta: entre «que quepa toda» y «que llene la pantalla», y si la viñeta no cabe completa,
   la recorre de lado a lado (o de arriba abajo) mientras lees: p va de 0 al empezar la toma a 1 al terminar */
function camara(cam, W, H, p = 0){
  const cabe = Math.min(W / cam.w, H / cam.h), llena = Math.max(W / cam.w, H / cam.h);
  const s = Math.min(llena, Math.sqrt(cabe * llena)), vw = W / s, vh = H / s, e = suave(Math.max(0, Math.min(1, p)));
  return { s, x: vw < cam.w ? cam.x + vw / 2 + (cam.w - vw) * e : cam.x + cam.w / 2, y: vh < cam.h ? cam.y + vh / 2 + (cam.h - vh) * e : cam.y + cam.h / 2 };
}
function toma(ctx, g, i, s, W, H){
  const tm = g.tomas[i], pg = g.paginas[tm.pagina], prev = g.tomas[i - 1];
  /* la cámara viaja desde la toma anterior (si es de la misma página) y luego se acerca despacito */
  const recorre = (s - PASO * .5) / Math.max(.5, tm.dura - PASO);
  let c = camara(tm.cam, W, H, recorre);
  if(prev && prev.pagina === tm.pagina && s < PASO){ const a = camara(prev.cam, W, H, 1), e = suave(s / PASO); c = { s: a.s + (c.s - a.s) * e, x: a.x + (c.x - a.x) * e, y: a.y + (c.y - a.y) * e }; }
  const zoom = 1 + .03 * Math.min(1, Math.max(0, (s - PASO) / Math.max(1, tm.dura - PASO)));
  let dx = 0, dy = 0;
  for(const it of tm.items) if(it.sacude){ const q = s - it.t0; if(q > 0 && q < .45){ const f = (1 - q / .45) * 14; dx += Math.sin(q * 90) * f; dy += Math.cos(q * 70) * f * .6; } }
  const k = c.s * zoom;
  /* la cámara no se sale de la página: si cabe, se recorre hacia adentro en lugar de enseñar negro */
  const vw = W / k, vh = H / k;
  c = { ...c, x: vw >= pg.ancho ? pg.ancho / 2 : Math.min(pg.ancho - vw / 2, Math.max(vw / 2, c.x)), y: vh >= pg.alto ? pg.alto / 2 : Math.min(pg.alto - vh / 2, Math.max(vh / 2, c.y)) };
  ctx.setTransform(k, 0, 0, k, W / 2 - c.x * k + dx, H / 2 - c.y * k + dy);
  ctx.drawImage(pg.sinTextos, 0, 0);
  /* los textos de las tomas anteriores de esta página ya están; los de ésta aparecen a su tiempo */
  for(let j = 0; j <= i; j++){
    const o = g.tomas[j]; if(o.pagina !== tm.pagina) continue;
    for(const it of o.items){
      const q = j < i ? 99 : s - it.t0; if(q <= 0) continue;
      const e = Math.min(1, q / .28), salto = q < .28 ? 1 + Math.sin(e * Math.PI) * .12 : 1;
      ctx.save(); ctx.globalAlpha = e;
      const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
      ctx.translate(cx, cy); ctx.scale(salto * (.6 + .4 * e), salto * (.6 + .4 * e)); ctx.translate(-cx, -cy);
      const pad = 6; ctx.drawImage(pg.completo, it.x - pad, it.y - pad, it.w + pad * 2, it.h + pad * 2, it.x - pad, it.y - pad, it.w + pad * 2, it.h + pad * 2);
      ctx.restore();
    }
  }
  /* entre páginas: un fundido a tinta */
  const fin = tm.dura - s, sig = g.tomas[i + 1];
  const negro = (s < .35 && (!prev || prev.pagina !== tm.pagina)) ? 1 - s / .35 : (fin < .35 && sig && sig.pagina !== tm.pagina) ? 1 - fin / .35 : 0;
  if(negro > 0){ ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = negro; ctx.fillStyle = '#0B0610'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}
function texto(ctx, t, x, y, tam, color, letra = 'Gloock', ancho = 0){
  ctx.font = `400 ${tam}px "${letra}", Georgia, serif`; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if(!ancho){ ctx.fillText(t, x, y); return; }
  const palabras = String(t).split(/\s+/), lineas = []; let l = '';
  for(const p of palabras){ const n = l ? l + ' ' + p : p; if(ctx.measureText(n).width > ancho && l){ lineas.push(l); l = p; } else l = n; }
  if(l) lineas.push(l);
  lineas.forEach((ln, i) => ctx.fillText(ln, x, y + (i - (lineas.length - 1) / 2) * tam * 1.05));
}
function portada(ctx, g, t, W, H){
  const pg = g.paginas[0]; if(pg){ const s = Math.max(W / pg.ancho, H / pg.alto) * (1.08 - .04 * t / PORTADA); ctx.globalAlpha = .45; ctx.filter = 'blur(10px)'; ctx.drawImage(pg.completo, (W - pg.ancho * s) / 2, (H - pg.alto * s) / 2, pg.ancho * s, pg.alto * s); ctx.filter = 'none'; ctx.globalAlpha = 1; }
  const e = Math.min(1, t / .6), sale = t > PORTADA - .35 ? (PORTADA - t) / .35 : 1;
  ctx.globalAlpha = e * sale;
  texto(ctx, g.titulo, W / 2, H * .45 - (1 - e) * 30, Math.round(W * .1), '#F1EADF', 'Gloock', W * .82);
  if(g.autor) texto(ctx, 'por ' + g.autor, W / 2, H * .45 + W * .16, Math.round(W * .045), '#C77DFF', 'Crimson Pro');
  ctx.globalAlpha = 1;
}
function cierre(ctx, g, t, W, H, pluma){
  const e = Math.min(1, t / .6);
  ctx.globalAlpha = e;
  if(pluma){ const L = W * .26; ctx.save(); ctx.translate(W / 2, H * .42); ctx.rotate((1 - e) * -.4); ctx.beginPath(); ctx.arc(0, 0, L * .62, 0, Math.PI * 2); ctx.fillStyle = '#F1EADF'; ctx.fill(); ctx.drawImage(pluma, -L / 2, -L / 2, L, L); ctx.restore(); }
  texto(ctx, g.titulo, W / 2, H * .6, Math.round(W * .065), '#F1EADF', 'Gloock', W * .82);
  texto(ctx, 'Hecho en Inkwell', W / 2, H * .6 + W * .1, Math.round(W * .042), '#C77DFF', 'Crimson Pro');
  ctx.globalAlpha = 1;
}

/* ── grabar: el lienzo a tiempo real, con la música mezclada; regresa un archivo ── */
export function formatoVideo(){
  const op = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return op.find((x) => window.MediaRecorder && MediaRecorder.isTypeSupported(x)) || '';
}
export async function grabar(g, { W = 720, H = 1280, musica = null, pluma = null, avance = () => {}, cancelar = { ya: false } } = {}){
  const tipo = formatoVideo(); if(!tipo) throw new Error('Este navegador no puede grabar video.');
  const lienzo = document.createElement('canvas'); lienzo.width = W; lienzo.height = H;
  const ctx = lienzo.getContext('2d'), stream = lienzo.captureStream(30), total = duracion(g);
  let audio = null, fuente = null, ganancia = null;
  if(musica){
    audio = new (window.AudioContext || window.webkitAudioContext)();
    const buf = await audio.decodeAudioData(await musica.arrayBuffer());
    const dest = audio.createMediaStreamDestination(); ganancia = audio.createGain(); ganancia.gain.value = .9;
    fuente = audio.createBufferSource(); fuente.buffer = buf; fuente.loop = buf.duration < total;
    fuente.connect(ganancia).connect(dest);
    dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
  }
  const trozos = [], rec = new MediaRecorder(stream, { mimeType: tipo, videoBitsPerSecond: 4_000_000 });
  rec.ondataavailable = (e) => { if(e.data.size) trozos.push(e.data); };
  const listo = new Promise((ok) => { rec.onstop = ok; });
  pintarCuadro(ctx, g, 0, { W, H, pluma });
  rec.start(500); if(fuente){ fuente.start(); }
  const t0 = performance.now();
  await new Promise((ok) => {
    const paso = () => {
      const t = (performance.now() - t0) / 1000;
      if(cancelar.ya || t >= total){ ok(); return; }
      pintarCuadro(ctx, g, t, { W, H, pluma }); avance(t / total);
      if(ganancia && t > total - 1.6) ganancia.gain.value = Math.max(0, .9 * (total - t) / 1.6);
      requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  });
  pintarCuadro(ctx, g, total - .01, { W, H, pluma });
  rec.stop(); await listo;
  try{ fuente && fuente.stop(); audio && audio.close(); }catch{}
  stream.getTracks().forEach((tr) => tr.stop());
  if(cancelar.ya) return null;
  const ext = tipo.startsWith('video/mp4') ? 'mp4' : 'webm';
  return new File(trozos, `${(g.titulo || 'comic').replace(/[\\/:*?"<>|]+/g, '').slice(0, 60)} (video).${ext}`, { type: tipo.split(';')[0] });
}
