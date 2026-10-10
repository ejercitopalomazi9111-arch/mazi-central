/* ANUNCIOS DE LA ESCUELA · la tanda de comerciales de adentro
   ----------------------------------------------------------------------------
   Los usan dos lugares: la pantalla de turnos de Fadori (entre pedazos del
   podcast, en el recreo) y el estudio del podcast (para meterlos en el
   episodio). Por eso viven aquí y se dibujan en un <canvas>: lo mismo sirve
   para una pantalla en vivo que para un video que se exporta.

   Son anuncios INTERNOS: la escuela, el grupo, los proyectos y los torneos.
   Nada de publicidad de fuera. Los textos son de arranque y se cambian en la
   pantalla; las fechas de los torneos van vacías a propósito: una fecha
   inventada en un anuncio es peor que ninguna.

   La transición es la de los canales de televisión: el logo sale de un
   destello, gira sobre sí mismo, crece, brilla, y se va a su lugar en el
   anuncio. Si el anuncio no trae logo, el emblema es su icono en un círculo. */

const ICONOS = {"graduation-cap": "<path d=\"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z\"/><path d=\"M22 10v6\"/><path d=\"M6 12.5V16a6 3 0 0 0 12 0v-3.5\"/>", "users": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/><path d=\"M16 3.128a4 4 0 0 1 0 7.744\"/><path d=\"M22 21v-2a4 4 0 0 0-3-3.87\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/>", "smartphone": "<rect width=\"14\" height=\"20\" x=\"5\" y=\"2\" rx=\"2\" ry=\"2\"/><path d=\"M12 18h.01\"/>", "mic": "<path d=\"M12 19v3\"/><path d=\"M19 10v2a7 7 0 0 1-14 0v-2\"/><rect x=\"9\" y=\"2\" width=\"6\" height=\"13\" rx=\"3\"/>", "hand-heart": "<path d=\"M11 14h2a2 2 0 0 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16\"/><path d=\"m14.45 13.39 5.05-4.694C20.196 8 21 6.85 21 5.75a2.75 2.75 0 0 0-4.797-1.837.276.276 0 0 1-.406 0A2.75 2.75 0 0 0 11 5.75c0 1.2.802 2.248 1.5 2.946L16 11.95\"/><path d=\"m2 15 6 6\"/><path d=\"m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a1 1 0 0 0-2.75-2.91\"/>", "briefcase": "<path d=\"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16\"/><rect width=\"20\" height=\"14\" x=\"2\" y=\"6\" rx=\"2\"/>", "atom": "<circle cx=\"12\" cy=\"12\" r=\"1\"/><path d=\"M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z\"/><path d=\"M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z\"/>", "trophy": "<path d=\"M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2\"/><path d=\"M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2\"/><path d=\"M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3\"/><path d=\"M4 22h16\"/><path d=\"M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z\"/><path d=\"M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3\"/>", "volleyball": "<path d=\"M11 7a16 16 20 0 1 10.98 4.362\"/><path d=\"M12 12a13 13 0 0 1-8.66 5\"/><path d=\"M16.83 13.634a16 16 0 0 1-9.267 7.328\"/><path d=\"M20.66 17A13 13 0 0 0 12 12a13 13 0 0 1 0-10\"/><path d=\"M8.17 15.366a16 16 0 0 1-1.713-11.69\"/><circle cx=\"12\" cy=\"12\" r=\"10\"/>", "megaphone": "<path d=\"M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z\"/><path d=\"M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14\"/><path d=\"M8 6v8\"/>", "calendar": "<path d=\"M8 2v3\"/><path d=\"M16 2v3\"/><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M3 9h18\"/>", "star": "<path d=\"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z\"/>", "heart": "<path d=\"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5\"/>", "book-open": "<path d=\"M12 5v16\"/><path d=\"M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z\"/>", "palette": "<path d=\"M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z\"/><circle cx=\"13.5\" cy=\"6.5\" r=\".5\" fill=\"currentColor\"/><circle cx=\"17.5\" cy=\"10.5\" r=\".5\" fill=\"currentColor\"/><circle cx=\"6.5\" cy=\"12.5\" r=\".5\" fill=\"currentColor\"/><circle cx=\"8.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"/>", "music": "<path d=\"M9 18V5l12-2v13\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><circle cx=\"18\" cy=\"16\" r=\"3\"/>", "utensils-crossed": "<path d=\"m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8\"/><path d=\"M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7\"/><path d=\"m2.1 21.8 6.4-6.3\"/><path d=\"m19 5-7 7\"/>"};

export const ANUNCIOS = [
  { id: 'rembrandt', marca: 'Instituto Rembrandt', titulo: 'Orgullo Rembrandt', texto: 'Lo que construimos aquí, lo hacemos juntos.',
    color: '#002060', color2: '#0B2F77', acento: '#F2C94C', logo: 'marca/escudo-rembrandt.png', icono: 'graduation-cap', fondoLogo: '#FFFFFF' },
  { id: 'grupo31', marca: 'Grupo 3.1', titulo: 'Esto lo hace el 3.1', texto: 'Radio Divergentes, Fadori y lo que sigue.',
    color: '#A3242F', color2: '#3B0B12', acento: '#EDE6DC', logo: 'marca/paloma.png', icono: 'users' },
  { id: 'fadori', marca: 'Fadori', titulo: 'Pide sin hacer fila', texto: 'Escanea el código, pide desde tu teléfono y vuelve cuando salga tu número.',
    color: '#C2410C', color2: '#5C1A04', acento: '#FFE8D6', logo: 'marca/icon-192.png', icono: 'smartphone', qr: 'qr/abrir.svg' },
  { id: 'divergentes', marca: 'Radio Divergentes', titulo: 'El podcast de Ética', texto: 'Temas que dividen opiniones, cuatro voces en la mesa. Aquí, en el recreo.',
    color: '#4A1219', color2: '#0E0B0D', acento: '#EDE6DC', logo: 'marca/paloma.png', icono: 'mic' },
  { id: 'sociales', marca: 'Proyectos sociales', titulo: 'Súmate a un proyecto social', texto: 'Pregunta en tu grupo cómo participar.',
    color: '#1F6B4A', color2: '#0B3324', acento: '#C9F0D8', icono: 'hand-heart' },
  { id: 'negocios', marca: 'Desarrollo de negocios', titulo: 'Emprende desde la escuela', texto: 'Los proyectos de negocio de los grupos, ya funcionando.',
    color: '#8A6212', color2: '#3D2A05', acento: '#FBE3A8', icono: 'briefcase' },
  { id: 'steam', marca: 'Modalidad STEAM', titulo: 'Ciencia, tecnología, ingeniería, arte y matemáticas', texto: 'Proyectos que se construyen, no que se memorizan.',
    color: '#3B2FA8', color2: '#15104A', acento: '#D9D4FF', icono: 'atom' },
  { id: 'futbol', marca: 'Torneo de fútbol', titulo: 'Torneo de fútbol', texto: 'Arma tu equipo e inscríbete con tu grupo.',
    color: '#15803D', color2: '#06361A', acento: '#DCFCE7', icono: 'trophy', fecha: '' },
  { id: 'voleibol', marca: 'Torneo de voleibol', titulo: 'Torneo de voleibol', texto: 'Arma tu equipo e inscríbete con tu grupo.',
    color: '#0E7490', color2: '#06313D', acento: '#CFFAFE', icono: 'volleyball', fecha: '' },
];
/* los canales: con qué logo se abre y se cierra la tanda */
export const CANALES = { rembrandt: 'rembrandt', divergentes: 'divergentes', fadori: 'fadori' };

/* lo guardado (cambios a los de fábrica y anuncios nuevos) encima de los de fábrica */
export function mezclarAnuncios(guardado){
  const g = guardado || {}, cambios = g.cambios || {}, nuevos = g.nuevos || [];
  return ANUNCIOS.map(a => Object.assign({}, a, { activo: true }, cambios[a.id] || {}))
    .concat(nuevos.map(a => Object.assign({ color: '#2E1B10', color2: '#120A06', acento: '#FFE8D6', icono: 'megaphone', activo: true }, a)));
}

/* ── carga de imágenes ─────────────────────────────────────────────── */
const cache = new Map();
function cargar(src){
  if(!src) return Promise.resolve(null);
  if(cache.has(src)) return cache.get(src);
  const p = new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  cache.set(src, p); return p;
}
function iconoSVG(nombre, color){
  const cuerpo = ICONOS[nombre] || ICONOS.megaphone;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="' +
    color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + cuerpo + '</svg>');
}
/* Deja listo lo que se dibuja: el logo, el icono y el código QR */
export async function prepararAnuncio(a){
  const ruta = (r) => r ? (/^(data:|blob:|https?:)/.test(r) ? r : new URL('./' + r, import.meta.url).href) : '';
  const [logo, icono, qr] = await Promise.all([cargar(a.logoData || ruta(a.logo)), cargar(iconoSVG(a.icono, a.acento || '#fff')), cargar(ruta(a.qr))]);
  return { a, logo, icono, qr };
}

/* ── utilería de dibujo ────────────────────────────────────────────── */
const FAM = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const lim = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
const suave = (t) => { t = lim(t); return t * t * (3 - 2 * t); };
const sale = (t) => { t = lim(t); return 1 - Math.pow(1 - t, 3); };
const rebote = (t) => { t = lim(t); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
function rr(g, x, y, w, h, r){ g.beginPath(); if(g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
function partir(g, texto, ancho){
  const p = String(texto || '').split(/\s+/).filter(Boolean), out = []; let r = '';
  for(const w of p){ const t = r ? r + ' ' + w : w; if(g.measureText(t).width <= ancho || !r) r = t; else { out.push(r); r = w; } }
  if(r) out.push(r); return out;
}
/* el tamaño más grande al que el texto cabe en la caja */
function ajustar(g, texto, ancho, alto, max, min, peso, inter = 1.08){
  for(let s = max; s >= min; s -= Math.max(1, Math.round(s * 0.06))){
    g.font = peso + ' ' + s + 'px ' + FAM;
    const l = partir(g, texto, ancho);
    if(l.length * s * inter <= alto && l.every(x => g.measureText(x).width <= ancho)) return { s, l };
  }
  g.font = peso + ' ' + min + 'px ' + FAM;
  return { s: min, l: partir(g, texto, ancho) };
}

/* dónde va cada cosa del anuncio: lo usan la tarjeta Y la transición, para
   que el logo aterrice exactamente donde luego se queda */
export function acomodo(W, H){
  const u = Math.min(W, H) / 720, horiz = W >= H;
  const m = (horiz ? 64 : 48) * u;
  const lado = (horiz ? 150 : 170) * u;
  return { u, horiz, m, logo: { x: m + lado / 2, y: m + lado / 2 + (horiz ? 0 : 20 * u), r: lado / 2 } };
}

/* el emblema: el logo en su disco, o el icono si no hay logo */
function emblema(g, P, cx, cy, r, giro = 1, brillo = 0){
  const a = P.a;
  g.save(); g.translate(cx, cy); g.scale(Math.max(0.02, Math.abs(giro)), 1);
  const reverso = giro < 0;
  /* el disco: color de acento con un aro */
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2);
  g.fillStyle = a.fondoLogo || (P.logo ? 'rgba(255,255,255,.08)' : a.color2 || '#111'); g.fill();
  g.lineWidth = Math.max(2, r * 0.06); g.strokeStyle = a.acento || '#fff'; g.stroke();
  if(!reverso){
    const im = P.logo || P.icono;
    if(im){
      const k = (P.logo ? 1.5 : 1.15) * r / Math.max(im.width, im.height);
      g.save(); g.beginPath(); g.arc(0, 0, r * 0.93, 0, Math.PI * 2); g.clip();
      g.drawImage(im, -im.width * k / 2, -im.height * k / 2, im.width * k, im.height * k);
      g.restore();
    }
  } else {
    /* el reverso de la moneda: liso, del color del acento */
    g.beginPath(); g.arc(0, 0, r * 0.82, 0, Math.PI * 2); g.fillStyle = a.acento || '#fff'; g.globalAlpha = .25; g.fill(); g.globalAlpha = 1;
  }
  if(brillo > 0){
    /* el destello que cruza el emblema */
    g.save(); g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.clip();
    const x = (-1.4 + 2.8 * brillo) * r, grd = g.createLinearGradient(x - r * .4, -r, x + r * .4, r);
    grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(.5, 'rgba(255,255,255,.65)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(-r, -r, 2 * r, 2 * r); g.restore();
  }
  g.restore();
}

/* ── LA TRANSICIÓN · el logo que gira, como en la tele ──────────────────
   0.00–0.45  un destello del color de la marca se abre desde el centro
   0.15–1.35  el emblema sale chiquito, gira tres medias vueltas y crece
   1.20–1.65  un brillo le cruza y salen anillos
   1.65–dur   (si `aterriza`) se va a su lugar en la tarjeta del anuncio */
export const DURA_IDENT = 2.3;
export function dibujarIdent(g, W, H, t, P, { dur = DURA_IDENT, aterriza = true } = {}){
  const a = P.a, L = acomodo(W, H), cx = W / 2, cy = H / 2, R = Math.hypot(W, H) / 2;
  /* el fondo: del color de la marca, con rayos que giran */
  const abre = sale(t / 0.45);
  g.save();
  g.beginPath(); g.arc(cx, cy, R * abre + 1, 0, Math.PI * 2); g.clip();
  const grd = g.createRadialGradient(cx, cy, 0, cx, cy, R);
  grd.addColorStop(0, a.color); grd.addColorStop(1, a.color2 || a.color);
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  g.globalAlpha = .10 * (1 - suave((t - 1.6) / .6));
  g.fillStyle = a.acento || '#fff';
  const rayos = 14;
  for(let k = 0; k < rayos; k++){
    const ang = k / rayos * Math.PI * 2 + t * 0.6;
    g.beginPath(); g.moveTo(cx, cy);
    g.arc(cx, cy, R, ang, ang + Math.PI / rayos / 1.4); g.closePath(); g.fill();
  }
  g.globalAlpha = 1;
  g.restore();
  /* los anillos que salen cuando brilla */
  for(let k = 0; k < 3; k++){
    const p = (t - 1.25 - k * 0.12) / 0.7;
    if(p > 0 && p < 1){
      g.beginPath(); g.arc(cx, cy, Math.min(W, H) * (0.18 + 0.4 * sale(p)), 0, Math.PI * 2);
      g.strokeStyle = a.acento || '#fff'; g.globalAlpha = (1 - p) * .55; g.lineWidth = 6 * L.u * (1 - p) + 1; g.stroke(); g.globalAlpha = 1;
    }
  }
  /* el emblema: sale, gira y crece */
  const p = (t - 0.15) / 1.2, grande = Math.min(W, H) * 0.2;
  if(p > 0){
    const ang = (1 - sale(p)) * Math.PI * 3;          /* tres medias vueltas que frenan */
    let r = grande * (0.2 + 0.8 * rebote(p)), x = cx, y = cy;
    const viaje = aterriza ? suave((t - 1.65) / (dur - 1.65 - 0.05)) : 0;
    if(viaje > 0){ x = cx + (L.logo.x - cx) * viaje; y = cy + (L.logo.y - cy) * viaje; r = r + (L.logo.r - r) * viaje; }
    /* el halo */
    const h = g.createRadialGradient(x, y, r * .6, x, y, r * 2.2);
    h.addColorStop(0, 'rgba(255,255,255,.35)'); h.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = h; g.globalAlpha = 1 - viaje; g.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4); g.globalAlpha = 1;
    emblema(g, P, x, y, r, Math.cos(ang), lim((t - 1.2) / 0.45));
  }
  /* el nombre de la marca, debajo, cuando ya dejó de girar */
  if(!aterriza){
    const q = suave((t - 1.2) / 0.4) * (1 - suave((t - dur + 0.35) / 0.35));
    if(q > 0){
      g.globalAlpha = q; g.fillStyle = a.acento || '#fff'; g.textAlign = 'center'; g.textBaseline = 'top';
      g.font = '800 ' + Math.round(34 * L.u) + 'px ' + FAM;
      g.fillText(String(a.marca || '').toUpperCase(), cx, cy + grande * 1.25 + 10 * L.u * (1 - q));
      g.globalAlpha = 1; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    }
  }
}

/* ── LA TARJETA DEL ANUNCIO ─────────────────────────────────────────── */
export const DURA_ANUNCIO = 7;
export function dibujarAnuncio(g, W, H, t, P, { dur = DURA_ANUNCIO, conLogo = true } = {}){
  const a = P.a, L = acomodo(W, H), u = L.u, m = L.m;
  const grd = g.createLinearGradient(0, 0, W, H); grd.addColorStop(0, a.color); grd.addColorStop(1, a.color2 || a.color);
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  /* las franjas diagonales, apenas */
  g.save(); g.globalAlpha = .06; g.fillStyle = a.acento || '#fff';
  const paso = 46 * u, corre = (t * 18 * u) % (paso * 2);
  for(let x = -H + corre; x < W + H; x += paso * 2){ g.beginPath(); g.moveTo(x, 0); g.lineTo(x + paso, 0); g.lineTo(x + paso - H, H); g.lineTo(x - H, H); g.closePath(); g.fill(); }
  g.restore();
  /* el icono enorme de marca de agua */
  if(P.icono){
    const s = Math.min(W, H) * 0.95;
    g.globalAlpha = .08; g.drawImage(P.icono, W - s * 0.78, H - s * 0.82, s, s); g.globalAlpha = 1;
  }
  const entra = (d) => sale((t - d) / 0.55), fuera = 1 - suave((t - (dur - 0.45)) / 0.45);
  /* el emblema en su lugar, con su nombre al lado */
  if(conLogo) emblema(g, P, L.logo.x, L.logo.y, L.logo.r, 1, lim((t - 0.2) / 0.6) < 1 ? lim((t - 0.2) / 0.6) : 0);
  g.globalAlpha = fuera;
  g.fillStyle = a.acento || '#fff'; g.textBaseline = 'middle';
  g.font = '800 ' + Math.round(28 * u) + 'px ' + FAM;
  const xMarca = L.logo.x + L.logo.r + 24 * u;
  g.globalAlpha = fuera * entra(0.1);
  g.fillText(String(a.marca || '').toUpperCase(), xMarca, L.logo.y);
  /* el título grande y el texto: se miden juntos y se centran en el espacio
     que queda abajo del logo, un poco cargados hacia arriba */
  const derecha = (P.qr && a.qr) ? (L.horiz ? 320 : 0) * u : 0;
  const ancho = W - 2 * m - derecha;
  const arriba = L.logo.y + L.logo.r + 30 * u, abajo = H - m - (P.qr && a.qr && !L.horiz ? 250 * u : 0);
  const libre = abajo - arriba - (a.fecha ? 80 * u : 0);
  const T = ajustar(g, a.titulo, ancho, libre * (a.texto ? 0.6 : 0.9), Math.round((L.horiz ? 132 : 104) * u), Math.round(40 * u), '900', 1.02);
  const altoT = T.l.length * T.s * 1.02;
  const X = a.texto ? ajustar(g, a.texto, Math.min(ancho, 980 * u), libre - altoT - 70 * u, Math.round(46 * u), Math.round(24 * u), '600', 1.25) : { s: 0, l: [] };
  const bloque = altoT + 56 * u + X.l.length * X.s * 1.25 + (a.fecha ? 80 * u : 0);
  const top = arriba + Math.max(0, (abajo - arriba - bloque) * 0.42);
  g.textBaseline = 'top';
  T.l.forEach((ln, i) => {
    const e = entra(0.25 + i * 0.08);
    g.globalAlpha = fuera * e; g.fillStyle = '#FFFFFF';
    g.font = '900 ' + T.s + 'px ' + FAM;
    g.fillText(ln, m, top + i * T.s * 1.02 + (1 - e) * 30 * u);
  });
  let y = top + altoT + 20 * u;
  /* la raya de acento */
  g.globalAlpha = fuera; g.fillStyle = a.acento || '#fff';
  g.fillRect(m, y, 140 * u * entra(0.5), 9 * u);
  y += 36 * u;
  X.l.forEach((ln, i) => { const e = entra(0.65 + i * 0.06); g.globalAlpha = fuera * e * .92; g.fillStyle = '#FFFFFF';
    g.font = '600 ' + X.s + 'px ' + FAM; g.fillText(ln, m, y + i * X.s * 1.25 + (1 - e) * 20 * u); });
  y += X.l.length * X.s * 1.25 + 24 * u;
  if(a.fecha){
    const e = entra(0.9); g.globalAlpha = fuera * e;
    g.font = '800 ' + Math.round(28 * u) + 'px ' + FAM;
    const w = g.measureText(a.fecha).width + 44 * u;
    rr(g, m, y, w, 54 * u, 27 * u); g.fillStyle = a.acento || '#fff'; g.fill();
    g.fillStyle = a.color2 || '#000'; g.textBaseline = 'middle'; g.fillText(a.fecha, m + 22 * u, y + 27 * u);
  }
  if(P.qr && a.qr){
    const s = L.horiz ? 240 * u : 210 * u, x = L.horiz ? W - m - s : W - m - s, yq = L.horiz ? (H - s) / 2 + 30 * u : H - m - s;
    const e = entra(0.8); g.globalAlpha = fuera * e;
    rr(g, x - 14 * u, yq - 14 * u, s + 28 * u, s + 28 * u, 22 * u); g.fillStyle = '#fff'; g.fill();
    g.drawImage(P.qr, x, yq, s, s);
  }
  g.globalAlpha = 1; g.textBaseline = 'alphabetic';
}
