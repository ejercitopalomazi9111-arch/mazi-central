/* ═══════════════════════════════════════════════════════════════════════════
   GUERRA DE PUERCOS 2 · LAS CARAS QUE SE ARMAN (sobres y cosméticos)
   ───────────────────────────────────────────────────────────────────────────
   «No uses arte creado por ti.» Aquí no se dibuja ningún puerco ni ninguna
   ilustración: se COMPONE, como una imprenta, con piezas que ya existen —la
   caja y el reverso de la autora, los avatares de Kenney, las telas de Poly
   Haven— más letra y marco. Igual que el logo de Grupo Mazi: se compone, no
   se inventa (regla 1 de CLAUDE.md).
   ═══════════════════════════════════════════════════════════════════════════ */
import { RAREZA, CLASES_COSMETICO, cosmetico } from './coleccion.js';
import { SOBRES } from './tienda.js';

const imgs = new Map();
export function imagen(url){
  if(!imgs.has(url)) imgs.set(url, new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = url; }));
  return imgs.get(url);
}
export const letrasListas = () => Promise.all([document.fonts.load('64px Marcador'), document.fonts.load('64px Lilita')]).catch(() => {});

export const COLOR_RAREZA = { S:'#E8B923', A:'#C0392B', B:'#2C6FA8', C:'#2E7D4F', D:'#8A6516', ESP:'#7A3FA0' };

function redondo(x, X, Y, W, H, r){ x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
function cubrir(x, im, X, Y, W, H, foco = .5){
  const k = Math.max(W / im.width, H / im.height), w = im.width * k, h = im.height * k;
  x.drawImage(im, X + (W - w) / 2, Y + (H - h) * foco, w, h);
}

/* ── EL SOBRE ────────────────────────────────────────────────────────────────
   Cara del sobre (sin la tira) y la tira de arriba, aparte, porque se rasga.
   La foto es la portada de la caja de la autora, recortada al centro (el
   puerco rosa y el nombre). */
export async function caraSobre(tipo, W = 640, H = 1000){
  await letrasListas();
  const s = SOBRES[tipo], caja = await imagen('../arte/web/caja.webp');
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  x.fillStyle = s.color; x.fillRect(0, 0, W, H);
  /* el «metal» del sobre: rayas finas en diagonal, sólo luz y sombra */
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, 'rgba(255,255,255,.28)'); g.addColorStop(.45, 'rgba(255,255,255,0)'); g.addColorStop(.55, 'rgba(0,0,0,.18)'); g.addColorStop(1, 'rgba(255,255,255,.2)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  if(caja){ x.save(); redondo(x, 40, 120, W - 80, H * .62, 26); x.clip(); cubrir(x, caja, 40, 120, W - 80, H * .62, .45); x.restore();
    x.lineWidth = 10; x.strokeStyle = '#1B0E16'; redondo(x, 40, 120, W - 80, H * .62, 26); x.stroke(); }
  /* el nombre del sobre, en la letra de plumón */
  x.textAlign = 'center'; x.fillStyle = '#1B0E16';
  x.font = '78px Marcador'; x.fillText(s.nombre.toUpperCase().replace('SOBRE ', ''), W / 2, H * .86);
  x.font = '34px Lilita'; x.fillStyle = 'rgba(27,14,22,.85)';
  x.fillText(s.puercos + ' puercos + 1 sorpresa', W / 2, H * .93);
  /* el crimpado de abajo: dientes */
  x.fillStyle = 'rgba(0,0,0,.22)';
  for(let i = 0; i < W; i += 20) x.fillRect(i, H - 22, 10, 22);
  return c;
}
export async function tiraSobre(tipo, W = 640, H = 120){
  await letrasListas();
  const s = SOBRES[tipo], c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  x.fillStyle = s.color; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(0,0,0,.22)'; for(let i = 0; i < W; i += 20) x.fillRect(i, 0, 10, 26);
  x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(0, H - 10, W, 4);
  /* la línea punteada donde se rasga */
  x.fillStyle = '#1B0E16'; for(let i = 10; i < W; i += 28) x.fillRect(i, H - 6, 16, 6);
  x.font = '40px Lilita'; x.textAlign = 'center'; x.fillStyle = '#1B0E16'; x.fillText('ABRE AQUÍ  →', W / 2, H * .62);
  return c;
}

/* ── LA CARA DE UN COSMÉTICO ────────────────────────────────────────────────
   Del mismo tamaño que una carta de la autora (420 × 582), para que en la
   mesa de resultados se acomode junto a los puercos sin verse de otro juego:
   marco rosa, la pieza en medio, su nombre y su clase. */
export async function caraCosmetico(id, W = 420, H = 582){
  await letrasListas();
  const k = cosmetico(id), c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  if(!k) return c;
  const color = COLOR_RAREZA[k.rareza];
  x.fillStyle = '#E84A8A'; redondo(x, 0, 0, W, H, 30); x.fill();
  x.fillStyle = '#1B0E16'; redondo(x, 14, 14, W - 28, H - 28, 22); x.fill();
  /* la ventana con la pieza */
  const im = await imagen(k.img);
  x.save(); redondo(x, 30, 70, W - 60, 330, 18); x.clip();
  x.fillStyle = k.clase === 'avatar' ? '#FFD6E6' : '#2A1020'; x.fillRect(30, 70, W - 60, 330);
  if(im){
    if(k.clase === 'tapete') cubrir(x, im, 30, 70, W - 60, 330);
    else { const t = Math.min((W - 100) / im.width, 290 / im.height); x.drawImage(im, W / 2 - im.width * t / 2, 235 - im.height * t / 2, im.width * t, im.height * t); }
  }
  x.restore();
  x.lineWidth = 6; x.strokeStyle = color; redondo(x, 30, 70, W - 60, 330, 18); x.stroke();
  x.textAlign = 'center';
  x.fillStyle = '#FFF0F6'; x.font = '30px Lilita'; x.fillText('COSMÉTICO · ' + CLASES_COSMETICO[k.clase].una.toUpperCase(), W / 2, 50);
  x.font = (k.nombre.length > 14 ? 44 : 56) + 'px Marcador'; x.fillStyle = '#FFF0F6'; x.fillText(k.nombre, W / 2, 462);
  x.fillStyle = color; redondo(x, W / 2 - 110, 492, 220, 50, 25); x.fill();
  x.fillStyle = '#fff'; x.font = '30px Lilita'; x.fillText(RAREZA[k.rareza].toUpperCase(), W / 2, 528);
  return c;
}
