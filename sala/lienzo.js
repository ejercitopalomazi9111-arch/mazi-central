/* ══════════════════════════════════════════════════════════════════════════
   EL LIENZO DE EXPLICA · un pizarrón infinito que dibujan muchos cursores
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 12 nov: «el lápiz tarda AÑOS por letra y crea la palabra de golpe»,
   «que dibuje TODO elemento línea por línea, forma por forma», «en vez de un
   lápiz un mouse, y que puedan salir muchos cursores para crear las cosas,
   como esos videos donde cientos de cursores crean cada elemento de una
   página», «cuando sea un tema más visual, que construya formas y luego texto»,
   «como si fuera un pizarrón infinito», y «un CHINGO de elementos para
   enseñar: tablas, gráficas, imágenes, dibujos, recuadros, formas, unión de
   2 círculos o más…».

   Cómo está hecho:
   · Cada elemento de la clase se ARMA (HTML para el texto que se acomoda solo,
     SVG para las líneas) y se vuelve una lista de TAREAS: trazar una línea,
     escribir un bloque de texto letra por letra, rellenar, resaltar.
   · Las tareas van por FASES: primero las formas (cajas, ejes, círculos),
     luego los rellenos y dibujos, luego el texto, al final los acentos
     (subrayados, marcatextos, círculos alrededor de palabras).
   · Dentro de una fase, VARIOS CURSORES se reparten las tareas y trabajan al
     mismo tiempo: vuelan a donde toca, «dan clic» y dibujan.
   · Todo vive en un MUNDO que la cámara recorre: los elementos se acomodan en
     columnas (una en el teléfono, dos o tres en pantallas grandes) y la cámara
     sigue a los cursores. Con el dedo se mueve y se hace zoom; «Seguir la
     clase» regresa la cámara.
   · Un solo bucle de animación, y sólo corre mientras algo se mueve.
   Los dibujos son íconos de Lucide (ISC): son trazos, así que el cursor los
   recorre igual que una línea. Las fotos salen de Wikipedia, con su crédito.
   ═════════════════════════════════════════════════════════════════════════ */
import { DIBUJOS } from './iconos-clase.js';

const NS = 'http://www.w3.org/2000/svg';
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const f1 = (n) => Math.round(n * 10) / 10;
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const svgEl = (tag, at = {}) => { const e = document.createElementNS(NS, tag); for(const [k, v] of Object.entries(at)) if(v != null) e.setAttribute(k, v); return e; };

/* ── colores del papel: tinta fuerte para la línea, tinta clara para el relleno ── */
export const TINTAS = [
  { t: '#7E1735', c: '#F6DCE4' },   /* vino */
  { t: '#5E2387', c: '#EADCF6' },   /* morado */
  { t: '#1F5BD1', c: '#DCE7FB' },   /* azul */
  { t: '#13805A', c: '#D7F0E5' },   /* verde */
  { t: '#C2560A', c: '#FBE5D3' },   /* naranja */
  { t: '#8B1FD6', c: '#EEDDFB' },   /* morado claro de la casa, oscurecido para leerse en papel */
];
const MARCA = '#FFE45C';

/* ── azar con semilla: el mismo elemento se tiembla igual si se vuelve a dibujar ── */
let semilla = 1;
const azar = () => (semilla = (semilla * 1664525 + 1013904223) >>> 0) / 4294967296;
const tiembla = (v, k = .8) => v + (azar() - .5) * 2 * k;

/* ══ 1 · TRAZOS A MANO ════════════════════════════════════════════════════ */
export function linea(x1, y1, x2, y2, k = .8){
  const mx = (x1 + x2) / 2 + tiembla(0, k * 1.6), my = (y1 + y2) / 2 + tiembla(0, k * 1.6);
  return `M${f1(tiembla(x1, k))} ${f1(tiembla(y1, k))} Q${f1(mx)} ${f1(my)} ${f1(tiembla(x2, k))} ${f1(tiembla(y2, k))}`;
}
export function caja(x, y, w, h, r = 12, k = .8){
  r = Math.min(r, w / 2, h / 2);
  const j = (v) => f1(tiembla(v, k));
  return `M${j(x + r)} ${j(y)} L${j(x + w - r)} ${j(y)} Q${f1(x + w)} ${f1(y)} ${f1(x + w)} ${f1(y + r)} L${j(x + w)} ${j(y + h - r)} Q${f1(x + w)} ${f1(y + h)} ${f1(x + w - r)} ${f1(y + h)} L${j(x + r)} ${j(y + h)} Q${f1(x)} ${f1(y + h)} ${f1(x)} ${f1(y + h - r)} L${j(x)} ${j(y + r)} Q${f1(x)} ${f1(y)} ${f1(x + r + 3)} ${f1(y - .6)}`;
}
/* óvalo a mano: da un poquito más de una vuelta, como cuando se encierra algo con plumón */
export function ovalo(cx, cy, rx, ry, k = .8, vueltas = 1.06){
  const n = 36, a0 = -Math.PI * .62 + tiembla(0, .2);
  let d = '';
  for(let i = 0; i <= n; i++){
    const a = a0 + i / n * Math.PI * 2 * vueltas, j = 1 + tiembla(0, .012 * k);
    d += `${i ? 'L' : 'M'}${f1(cx + Math.cos(a) * rx * j)} ${f1(cy + Math.sin(a) * ry * j)}`;
  }
  return d;
}
export function circulo(cx, cy, r, k = .6){ return ovalo(cx, cy, r, r, k, 1.0); }
export function flecha(x1, y1, x2, y2, { curva = 0, punta = 11 } = {}){
  const mx = (x1 + x2) / 2 - (y2 - y1) * curva, my = (y1 + y2) / 2 + (x2 - x1) * curva;
  const ang = Math.atan2(y2 - my, x2 - mx);
  const p1 = [x2 - punta * Math.cos(ang - .45), y2 - punta * Math.sin(ang - .45)], p2 = [x2 - punta * Math.cos(ang + .45), y2 - punta * Math.sin(ang + .45)];
  return `M${f1(x1)} ${f1(y1)} Q${f1(mx)} ${f1(my)} ${f1(x2)} ${f1(y2)} M${f1(p1[0])} ${f1(p1[1])} L${f1(x2)} ${f1(y2)} L${f1(p2[0])} ${f1(p2[1])}`;
}
/* relleno rayado (hachura) dentro de un rectángulo: se recorta con la figura que se quiera */
export function rayado(x, y, w, h, paso = 7){
  let d = '', i = 0;
  for(let s = -h; s < w; s += paso, i++){
    const a = [x + s, y + h], b = [x + s + h, y];
    d += i % 2 ? `L${f1(b[0])} ${f1(b[1])}L${f1(a[0] + paso)} ${f1(a[1])}` : `${i ? 'L' : 'M'}${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}`;
  }
  return d;
}
export function sector(cx, cy, r, a0, a1){
  const p0 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)], p1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
  return `M${f1(cx)} ${f1(cy)} L${f1(p0[0])} ${f1(p0[1])} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${f1(p1[0])} ${f1(p1[1])} Z`;
}

/* las figuras de un ícono de Lucide (circle, rect, line, polyline…) vueltas camino, para recorrerlas igual */
function figurasAPath(svgInterior){
  const doc = new DOMParser().parseFromString(`<svg xmlns="${NS}">${svgInterior}</svg>`, 'image/svg+xml');
  const n = (e, k) => +e.getAttribute(k) || 0;
  return [...doc.documentElement.children].map((e) => {
    const t = e.tagName.toLowerCase();
    if(t === 'path') return e.getAttribute('d');
    if(t === 'circle'){ const cx = n(e, 'cx'), cy = n(e, 'cy'), r = n(e, 'r'); return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`; }
    if(t === 'ellipse'){ const cx = n(e, 'cx'), cy = n(e, 'cy'), rx = n(e, 'rx'), ry = n(e, 'ry'); return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`; }
    if(t === 'line') return `M${n(e, 'x1')} ${n(e, 'y1')}L${n(e, 'x2')} ${n(e, 'y2')}`;
    if(t === 'polyline' || t === 'polygon'){ const p = (e.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number); let d = ''; for(let i = 0; i + 1 < p.length; i += 2) d += `${i ? 'L' : 'M'}${p[i]} ${p[i + 1]}`; return d + (t === 'polygon' ? 'Z' : ''); }
    if(t === 'rect'){ const x = n(e, 'x'), y = n(e, 'y'), w = n(e, 'width'), h = n(e, 'height'), r = Math.min(n(e, 'rx') || n(e, 'ry'), w / 2, h / 2);
      return r ? `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z` : `M${x} ${y}H${x + w}V${y + h}H${x}Z`; }
    return null;
  }).filter(Boolean);
}
/* el nombre que mande la IA → un dibujo que sí existe (o null) */
export function buscarDibujo(nombre){
  const k = String(nombre || '').toLowerCase().trim().replace(/\s+/g, '-');
  if(DIBUJOS[k]) return k;
  const sin = k.replace(/-\d+$/, '');
  return DIBUJOS[sin] ? sin : (Object.keys(DIBUJOS).find((x) => x.startsWith(k) || k.startsWith(x)) || null);
}

/* ══ 2 · TEXTO QUE SE ESCRIBE LETRA POR LETRA ════════════════════════════
   «**así**» resalta con marcatextos · «__así__» subraya · «((así))» lo encierra en un óvalo.
   Cada letra es un <span class="c">: aparece justo cuando el cursor pasa por ella. */
export function marcar(t){
  let h = '';
  for(const tr of String(t ?? '').split(/(\*\*[^*]+\*\*|__[^_]+__|\(\([^()]+\)\))/)){
    if(!tr) continue;
    let cl = '', s = tr;
    if(/^\*\*.*\*\*$/.test(tr)){ cl = 'm'; s = tr.slice(2, -2); }
    else if(/^__.*__$/.test(tr)){ cl = 'sub'; s = tr.slice(2, -2); }
    else if(/^\(\(.*\)\)$/.test(tr)){ cl = 'ov'; s = tr.slice(2, -2); }
    const letras = [...s].map((ch) => /\s/.test(ch) ? ' ' : `<span class="c">${esc(ch)}</span>`).join('');
    h += cl ? `<span class="${cl}">${letras}</span>` : letras;
  }
  return h;
}
const limpio = (t) => String(t ?? '').replace(/\*\*|__|\(\(|\)\)/g, '');

/* ══ 3 · LAS TAREAS ═══════════════════════════════════════════════════════
   { fase, dur, paso(k), punto(k) → [x, y] en coordenadas del elemento, fin() }  */
const VEL_TRAZO = .9;           /* px por ms: una línea de 300 px tarda un tercio de segundo, se ve trazar */
const VEL_LETRA = .032;         /* letras por ms (32 por segundo por cursor: se alcanza a leer mientras escribe) */
export function tTrazo(path, fase = 0, { vel = VEL_TRAZO, dx = 0, dy = 0, escala = 1 } = {}){
  let L = 0, listo = false;
  const medir = () => { if(!L){ L = path.getTotalLength() || 1; if(!listo){ path.style.strokeDasharray = `${L} ${L}`; path.style.strokeDashoffset = L; } } return L; };
  path.style.strokeDashoffset = '1e5'; path.style.strokeDasharray = '1e5 1e5';
  return {
    fase, get dur(){ return lim(medir() * escala / vel, 120, 1500); },
    ini(){ medir(); path.style.strokeDashoffset = L; },
    paso(k){ path.style.strokeDashoffset = L * (1 - k); },
    punto(k){ const p = path.getPointAtLength(medir() * k); return [dx + p.x * escala, dy + p.y * escala]; },
    fin(){ listo = true; path.style.strokeDasharray = 'none'; path.style.strokeDashoffset = 0; },
  };
}
export function tAparece(nodo, fase = 1, { dur = 380, desde = [0, 0], hasta = [0, 0] } = {}){
  nodo.style.opacity = 0;
  return { fase, dur, paso(k){ nodo.style.opacity = k; }, punto(k){ return [desde[0] + (hasta[0] - desde[0]) * k, desde[1] + (hasta[1] - desde[1]) * k]; }, fin(){ nodo.style.opacity = 1; } };
}
/* bloque de texto HTML: las letras se prenden en orden y el cursor va en la punta */
export function tTexto(el, letras, fase = 2){
  let pos = null, prendidas = 0;
  const medir = () => {
    if(pos) return pos;
    const r0 = el.getBoundingClientRect(), k = (r0.width / el.offsetWidth) || 1;
    pos = letras.map((c) => { const r = c.getBoundingClientRect(); return [(r.right - r0.left) / k, (r.bottom - r0.top) / k - r.height / k * .22]; });
    return pos;
  };
  return {
    fase, dur: lim(letras.length / VEL_LETRA, 60, 9000),
    ini(){ medir(); },
    paso(k){ const n = Math.min(letras.length, Math.ceil(k * letras.length)); while(prendidas < n) letras[prendidas++].classList.add('v'); },
    punto(k){ const p = medir(); return p[Math.max(0, Math.min(p.length - 1, Math.ceil(k * p.length) - 1))] || [0, 0]; },
    fin(){ for(; prendidas < letras.length; prendidas++) letras[prendidas].classList.add('v'); },
  };
}
/* un bloque largo se parte en pedazos para que VARIOS cursores lo escriban a la vez */
export function tareasDeBloque(el, bloque, fase, pedazo){
  const letras = [...bloque.querySelectorAll('.c')];
  if(!letras.length) return [];
  if(!pedazo || letras.length <= pedazo * 1.4) return [tTexto(el, letras, fase)];
  /* se corta en el espacio más cercano: cada cursor escribe palabras enteras */
  const cortes = [0]; let i = pedazo;
  while(i < letras.length - pedazo * .5){
    let j = i; while(j < letras.length && letras[j].nextSibling && letras[j].nextSibling.nodeType !== 3) j++;
    cortes.push(j + 1); i = j + 1 + pedazo;
  }
  cortes.push(letras.length);
  const t = [];
  for(let k = 0; k + 1 < cortes.length; k++) if(cortes[k + 1] > cortes[k]) t.push(tTexto(el, letras.slice(cortes[k], cortes[k + 1]), fase));
  return t;
}
/* texto SVG: se descubre con un recorte que crece al paso del cursor */
let nRecorte = 0;
function textoSVG(svg, defs, t, x, y, { tam = 15, ancla = 'middle', peso = 700, fam = 'Texto', color = '#1D1B26', fase = 2, maxAncho = 0 } = {}){
  const renglones = maxAncho ? partir(t, maxAncho, `${peso} ${tam}px ${fam}`) : [String(t)];
  const tareas = [], alto = tam * 1.25;
  const y0 = y - (renglones.length - 1) * alto / 2;
  renglones.forEach((r, i) => {
    const w = medirTexto(r, `${peso} ${tam}px ${fam}`), yy = y0 + i * alto;
    const x0 = ancla === 'middle' ? x - w / 2 : ancla === 'end' ? x - w : x;
    const id = 'rc' + (++nRecorte) + '-' + Math.random().toString(36).slice(2, 6);
    const cp = svgEl('clipPath', { id }), rect = svgEl('rect', { x: f1(x0 - 3), y: f1(yy - tam * 1.05), width: 0, height: f1(tam * 1.55) });
    cp.append(rect); defs.append(cp);
    const tx = svgEl('text', { x: f1(x), y: f1(yy + tam * .35), 'text-anchor': ancla, 'clip-path': `url(#${id})`, fill: color, 'font-size': tam, 'font-weight': peso, 'font-family': fam === 'Mano' ? 'Mano, cursive' : 'Texto, system-ui, sans-serif' });
    tx.textContent = r; svg.append(tx);
    tareas.push({ fase, dur: lim(r.length / VEL_LETRA, 60, 5000), paso(k){ rect.setAttribute('width', f1((w + 6) * k)); }, punto(k){ return [x0 + w * k, yy + tam * .35]; }, fin(){ rect.setAttribute('width', f1(w + 8)); } });
  });
  return { tareas, alto: renglones.length * alto, renglones: renglones.length };
}
let lienzoMedir = null;
export function medirTexto(t, fuente){
  lienzoMedir ||= document.createElement('canvas').getContext('2d');
  lienzoMedir.font = fuente.replace(/\bTexto\b/, 'Texto, system-ui, sans-serif').replace(/\bMano\b/, 'Mano, cursive');
  return lienzoMedir.measureText(String(t)).width;
}
export function partir(t, ancho, fuente){
  const pal = String(t ?? '').split(/\s+/).filter(Boolean), r = []; let act = '';
  for(const w of pal){ const p = act ? act + ' ' + w : w; if(act && medirTexto(p, fuente) > ancho){ r.push(act); act = w; } else act = p; }
  if(act) r.push(act);
  return r.length ? r : [''];
}

/* ══ 4 · LOS ELEMENTOS ════════════════════════════════════════════════════
   Cada uno: { tipo, span (columnas que ocupa), seccion?, armar(el, w, ctx) → tareas }.
   armar recibe el elemento YA puesto en la página (para medir) y su ancho. */
const ancho2 = new Set(['tabla', 'linea', 'diagrama', 'mapa', 'barras', 'lineas', 'arbol', 'pasos', 'matriz', 'venn', 'causas', 'ciclo', 'comparar', 'escala', 'partes']);

/* lo común: el SVG de atrás (líneas), el contenido HTML encima, y cómo se leen sus tareas */
function base(el, html){
  el.innerHTML = `<svg class="trz" aria-hidden="true"><defs></defs><g class="fondos"></g><g class="marcas"></g></svg><div class="cont">${html}</div>`;
  return { svg: el.firstElementChild, defs: el.firstElementChild.firstElementChild, cont: el.lastElementChild };
}
function rectDe(el, nodo){
  const r0 = el.getBoundingClientRect(), k = (r0.width / el.offsetWidth) || 1, r = nodo.getBoundingClientRect();
  return { x: (r.left - r0.left) / k, y: (r.top - r0.top) / k, w: r.width / k, h: r.height / k };
}
function rectsDe(el, nodo){
  const r0 = el.getBoundingClientRect(), k = (r0.width / el.offsetWidth) || 1;
  return [...nodo.getClientRects()].map((r) => ({ x: (r.left - r0.left) / k, y: (r.top - r0.top) / k, w: r.width / k, h: r.height / k })).filter((r) => r.w > 2);
}
function renglonesDe(el, nodo){
  const r0 = el.getBoundingClientRect(), k = (r0.width / el.offsetWidth) || 1, rg = document.createRange();
  rg.selectNodeContents(nodo);
  const out = [];
  for(const r of rg.getClientRects()){
    if(r.width < 2) continue;
    const x = { x: (r.left - r0.left) / k, y: (r.top - r0.top) / k, w: r.width / k, h: r.height / k };
    const mismo = out.find((o) => Math.abs(o.y - x.y) < 6);
    if(mismo){ const x2 = Math.max(mismo.x + mismo.w, x.x + x.w); mismo.x = Math.min(mismo.x, x.x); mismo.w = x2 - mismo.x; mismo.h = Math.max(mismo.h, x.h); } else out.push(x);
  }
  return out;
}
function trazo(svg, d, { color, ancho = 2.4, relleno = 'none', clase = '', fase = 0, opac } = {}){
  const p = svgEl('path', { d, fill: relleno, stroke: color, 'stroke-width': ancho, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: clase || null, opacity: opac });
  svg.append(p); return tTrazo(p, fase);
}
/* relleno de color pastel que aparece después de la raya */
function relleno(svg, d, color, fase = 1, opac = 1){
  const p = svgEl('path', { d, fill: color, stroke: 'none', 'fill-opacity': opac });
  (svg.querySelector(':scope > .fondos') || svg).append(p);
  return tAparece(p, fase, { dur: 320 });
}
/* las tareas de todo el texto de un elemento y sus acentos (marcatextos, subrayado, óvalo) */
function tareasTexto(el, svg, ctx, fase = 2){
  const t = [];
  for(const b of el.querySelectorAll('[data-b]')) t.push(...tareasDeBloque(el, b, +(b.dataset.f || fase), ctx.pedazo));
  for(const m of el.querySelectorAll('.m')) for(const r of rectsDe(el, m)){
    const p = svgEl('path', { d: linea(r.x - 2, r.y + r.h * .55, r.x + r.w + 2, r.y + r.h * .55, .5), stroke: MARCA, 'stroke-width': f1(r.h * .62), 'stroke-linecap': 'round', fill: 'none', opacity: .75 });
    (svg.querySelector(':scope > .marcas') || svg).append(p); t.push(tTrazo(p, 3, { vel: 1.1 }));
  }
  for(const m of el.querySelectorAll('.sub')) for(const r of rectsDe(el, m)) t.push(trazo(svg, linea(r.x, r.y + r.h - 1, r.x + r.w, r.y + r.h + 1, 1), { color: ctx.tinta.t, ancho: 2.2, fase: 3 }));
  for(const m of el.querySelectorAll('.ov')){ const rs = rectsDe(el, m); if(!rs.length) continue; const x = Math.min(...rs.map((r) => r.x)), y = Math.min(...rs.map((r) => r.y)), x2 = Math.max(...rs.map((r) => r.x + r.w)), y2 = Math.max(...rs.map((r) => r.y + r.h));
    t.push(trazo(svg, ovalo((x + x2) / 2, (y + y2) / 2, (x2 - x) / 2 + 9, (y2 - y) / 2 + 6), { color: '#D9433A', ancho: 2.2, fase: 3 })); }
  return t;
}
/* un dibujo de Lucide, trazo por trazo, dentro del SVG de atrás, en (x, y) con lado `lado` */
function dibujo(svg, nombre, x, y, lado, color, fase = 1, { relleno: rell } = {}){
  const k = buscarDibujo(nombre); if(!k) return [];
  const esc2 = lado / 24, g = svgEl('g', { transform: `translate(${f1(x)} ${f1(y)}) scale(${f1(esc2 * 100) / 100})` });
  svg.append(g);
  return figurasAPath(DIBUJOS[k]).map((d) => {
    const p = svgEl('path', { d, fill: rell || 'none', stroke: color, 'stroke-width': f1(2.2 / esc2 * 1.1), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    g.append(p); return tTrazo(p, fase, { dx: x, dy: y, escala: esc2 });
  });
}
const titulito = (t, color) => t ? `<div class="t" data-b style="color:${color}">${marcar(t)}</div>` : '';

export const ELEMENTOS = {
  /* ── títulos y texto ── */
  titulo: { seccion: true, armar(el, w, z, ctx){
    const { svg } = base(el, `${z.icono && buscarDibujo(z.icono) ? '<div class="ico-hueco"></div>' : ''}<h2 class="gran" data-b style="color:${ctx.tinta.t}">${marcar(z.texto)}</h2>${z.sub ? `<div class="subt" data-b>${marcar(z.sub)}</div>` : ''}`);
    const t = [];
    if(el.querySelector('.ico-hueco')) t.push(...dibujo(svg, z.icono, 0, 6, 46, ctx.tinta.t, 0));
    const h2 = el.querySelector('h2'), rs = renglonesDe(el, h2), ult = rs[rs.length - 1];
    if(ult) t.push(trazo(svg, `M${f1(ult.x)} ${f1(ult.y + ult.h + 2)} C${f1(ult.x + ult.w * .3)} ${f1(ult.y + ult.h + 9)} ${f1(ult.x + ult.w * .7)} ${f1(ult.y + ult.h - 2)} ${f1(ult.x + ult.w + 8)} ${f1(ult.y + ult.h + 4)}`, { color: ctx.tinta2.t, ancho: 3.2, fase: 3 }));
    return [...t, ...tareasTexto(el, svg, ctx)];
  } },
  texto: { armar(el, w, z, ctx){
    const ic = z.icono && buscarDibujo(z.icono);
    const { svg } = base(el, `<div class="${ic ? 'con-ico' : ''}">${ic ? '<span class="ico-hueco"></span>' : ''}<p class="p" data-b>${marcar(z.texto)}</p></div>`);
    return [...(ic ? dibujo(svg, z.icono, 2, 4, 40, ctx.tinta.t, 0) : []), ...tareasTexto(el, svg, ctx)];
  } },
  lista: { armar(el, w, z, ctx){
    const estilo = z.estilo || (z.numerada ? 'numeros' : 'puntos');
    const { svg } = base(el, `${titulito(z.titulo, ctx.tinta.t)}<ul class="lis">${z.items.map((it, i) => `<li><span class="bala"${estilo === 'numeros' ? ' data-b data-f="1"' : ''}>${estilo === 'numeros' ? `<span class="c">${i + 1}</span>` : ''}</span><span data-b>${marcar(it)}</span></li>`).join('')}</ul>`);
    const t = [];
    for(const b of el.querySelectorAll('.bala')){ const r = rectDe(el, b), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      if(estilo === 'checks'){ t.push(trazo(svg, caja(r.x + 2, r.y + 2, r.w - 4, r.h - 4, 5, .5), { color: ctx.tinta.t, fase: 0 })); t.push(trazo(svg, `M${f1(cx - 6)} ${f1(cy)} L${f1(cx - 1.5)} ${f1(cy + 5)} L${f1(cx + 8)} ${f1(cy - 7)}`, { color: ctx.tinta2.t, ancho: 3, fase: 3 })); }
      else if(estilo === 'flechas') t.push(trazo(svg, flecha(r.x, cy, r.x + r.w - 2, cy, { punta: 7 }), { color: ctx.tinta.t, fase: 0 }));
      else if(estilo === 'numeros'){ t.push(relleno(svg, circulo(cx, cy, r.w / 2), ctx.tinta.c, 0)); t.push(trazo(svg, circulo(cx, cy, r.w / 2 - 1), { color: ctx.tinta.t, fase: 0 })); }
      else t.push(trazo(svg, circulo(cx, cy, 4.5, .3), { color: ctx.tinta.t, ancho: 3, relleno: ctx.tinta.t, fase: 0 })); }
    return [...t, ...tareasTexto(el, svg, ctx)];
  } },
  definicion: { armar(el, w, z, ctx){
    const ic = z.icono && buscarDibujo(z.icono);
    const { svg } = base(el, `<div class="tarjeta">${ic ? '<span class="ico-esq"></span>' : ''}<div class="pest" data-b style="color:${ctx.tinta.t}">${marcar(z.termino || '')}</div><p class="p" data-b>${marcar(z.texto)}</p></div>`);
    const c = rectDe(el, el.querySelector('.tarjeta')), pe = rectDe(el, el.querySelector('.pest'));
    const t = [relleno(svg, caja(c.x, c.y, c.w, c.h, 16, 0), '#FFFFFF', 0), trazo(svg, caja(c.x, c.y, c.w, c.h, 16), { color: ctx.tinta.t, ancho: 2.6, fase: 0 }),
      relleno(svg, caja(pe.x - 8, pe.y - 2, pe.w + 16, pe.h + 4, 10, .4), ctx.tinta.c, 1)];
    if(ic){ const r = rectDe(el, el.querySelector('.ico-esq')); t.push(...dibujo(svg, z.icono, r.x, r.y, r.w, ctx.tinta.t, 1)); }
    return [...t, ...tareasTexto(el, svg, ctx)];
  } },
  formula: { armar(el, w, z, ctx){
    const { svg } = base(el, `<div class="tarjeta formula"><div class="ex" data-b>${marcar(z.expresion || '')}</div>${z.texto ? `<p class="p chico" data-b>${marcar(z.texto)}</p>` : ''}
      ${(z.variables || []).length ? `<div class="vars">${z.variables.map((v) => `<div class="var"><b data-b style="color:${ctx.tinta.t}">${marcar(v.simbolo)}</b><i class="fl"></i><span data-b>${marcar(v.significado)}</span></div>`).join('')}</div>` : ''}</div>`);
    const c = rectDe(el, el.querySelector('.tarjeta')), e = rectDe(el, el.querySelector('.ex'));
    const t = [relleno(svg, caja(c.x, c.y, c.w, c.h, 14, 0), '#FFFFFF', 0), trazo(svg, caja(c.x, c.y, c.w, c.h, 14), { color: ctx.tinta.t, fase: 0 }),
      trazo(svg, caja(e.x - 8, e.y - 4, e.w + 16, e.h + 8, 8), { color: ctx.tinta2.t, ancho: 2, fase: 3 })];
    for(const f of el.querySelectorAll('.var .fl')){ const r = rectDe(el, f); t.push(trazo(svg, flecha(r.x, r.y + r.h / 2, r.x + r.w, r.y + r.h / 2, { punta: 6 }), { color: '#6B6677', ancho: 1.8, fase: 1 })); }
    return [...t, ...tareasTexto(el, svg, ctx)];
  } },
  cita: { armar(el, w, z, ctx){
    const { svg } = base(el, `<div class="cita"><span class="ico-cita"></span><p class="mano" data-b>${marcar(z.texto)}</p>${z.autor ? `<small data-b>— ${marcar(z.autor)}</small>` : ''}</div>`);
    const r = rectDe(el, el.querySelector('.ico-cita')), c = rectDe(el, el.querySelector('.cita'));
    return [...dibujo(svg, 'quote', r.x, r.y, r.w, ctx.tinta.t, 0), trazo(svg, linea(c.x + 2, c.y + 44, c.x + 2, c.y + c.h, .5), { color: ctx.tinta.c, ancho: 5, fase: 0 }), ...tareasTexto(el, svg, ctx)];
  } },
  nota: { armar(el, w, z, ctx){
    const { svg } = base(el, `<div class="nota-a">${z.titulo ? `<div class="t" data-b style="color:${ctx.tinta.t}">${marcar(z.titulo)}</div>` : ''}<p class="mano chica" data-b>${marcar(z.texto)}</p></div>`);
    const c = rectDe(el, el.querySelector('.nota-a'));
    el.style.setProperty('--giro', (azar() > .5 ? 1 : -1) * 1.4 + 'deg');
    return [relleno(svg, caja(c.x, c.y, c.w, c.h, 4, .3), ctx.tinta.c, 0), trazo(svg, caja(c.x, c.y, c.w, c.h, 4, .4), { color: ctx.tinta.t, ancho: 1.6, fase: 0 }),
      relleno(svg, caja(c.x + c.w / 2 - 34, c.y - 10, 68, 20, 2, .3), '#E7E3DA', 1, .85), ...tareasTexto(el, svg, ctx)];
  } },
  ojo: { armar(el, w, z, ctx){
    const { svg } = base(el, `<div class="ojo-a"><span class="ico-hueco"></span><div><div class="t" data-b style="color:#C2560A">${marcar(z.titulo || '¡Ojo!')}</div><p class="p" data-b>${marcar(z.texto)}</p></div></div>`);
    const c = rectDe(el, el.querySelector('.ojo-a')), r = rectDe(el, el.querySelector('.ico-hueco'));
    return [relleno(svg, caja(c.x, c.y, c.w, c.h, 14, 0), '#FFF4E5', 0), trazo(svg, caja(c.x, c.y, c.w, c.h, 14), { color: '#C2560A', ancho: 2.4, fase: 0, clase: 'guiones' }),
      ...dibujo(svg, 'triangle-alert', r.x, r.y, r.w, '#C2560A', 1), ...tareasTexto(el, svg, ctx)];
  } },
  dato: { armar(el, w, z, ctx){
    const { svg } = base(el, `<div class="dato-a"><div class="num" data-b style="color:${ctx.tinta.t}">${marcar(z.numero)}</div><p class="p" data-b>${marcar(z.texto)}</p></div>`);
    const n = rectDe(el, el.querySelector('.num')), cx = n.x + n.w / 2, cy = n.y + n.h / 2, R = Math.max(n.w, n.h) / 2 + 12;
    const t = [];
    for(let i = 0; i < 12; i++){ const a = i / 12 * Math.PI * 2; t.push(trazo(svg, linea(cx + Math.cos(a) * R, cy + Math.sin(a) * R * .7, cx + Math.cos(a) * (R + 12), cy + Math.sin(a) * (R + 12) * .7, .3), { color: ctx.tinta2.t, ancho: 2.4, fase: 3 })); }
    return [...tareasTexto(el, svg, ctx), ...t];
  } },
  ejemplo: { armar(el, w, z, ctx){
    const { svg } = base(el, `<div class="tarjeta"><div class="t" data-b style="color:${ctx.tinta.t}">${marcar(z.titulo || 'Ejemplo')}</div>${(z.pasos || []).map((p, i) => `<div class="paso-ej"><span class="bala" data-b data-f="1"><span class="c">${i + 1}</span></span><span data-b>${marcar(p)}</span></div>`).join('')}${z.resultado ? `<div class="resul" data-b>${marcar(z.resultado)}</div>` : ''}</div>`);
    const c = rectDe(el, el.querySelector('.tarjeta'));
    const t = [relleno(svg, caja(c.x, c.y, c.w, c.h, 14, 0), '#FFFFFF', 0), trazo(svg, caja(c.x, c.y, c.w, c.h, 14), { color: ctx.tinta.t, fase: 0 })];
    for(const b of el.querySelectorAll('.bala')){ const r = rectDe(el, b); t.push(trazo(svg, circulo(r.x + r.w / 2, r.y + r.h / 2, r.w / 2), { color: ctx.tinta.t, fase: 0 })); }
    const res = el.querySelector('.resul'); if(res){ const r = rectDe(el, res); t.push(trazo(svg, linea(r.x, r.y + r.h + 2, r.x + r.w, r.y + r.h + 2, .4), { color: ctx.tinta2.t, ancho: 2.4, fase: 3 }), trazo(svg, linea(r.x, r.y + r.h + 7, r.x + r.w, r.y + r.h + 7, .4), { color: ctx.tinta2.t, ancho: 2.4, fase: 3 })); }
    return [...t, ...tareasTexto(el, svg, ctx)];
  } },
  pregunta: { armar(el, w, z, ctx){
    const { svg } = base(el, `<div class="tarjeta preg-a"><div class="t" data-b style="color:${ctx.tinta.t}">Piénsalo</div><p class="p" data-b>${marcar(z.pregunta)}</p><button class="ver-resp" type="button">Ver la respuesta</button><p class="p resp" hidden>${esc(limpio(z.respuesta))}</p></div>`);
    const c = rectDe(el, el.querySelector('.tarjeta'));
    el.querySelector('.ver-resp').addEventListener('click', (e) => { e.stopPropagation(); e.target.hidden = true; el.querySelector('.resp').hidden = false; });
    return [relleno(svg, caja(c.x, c.y, c.w, c.h, 14, 0), ctx.tinta.c, 0), trazo(svg, caja(c.x, c.y, c.w, c.h, 14), { color: ctx.tinta.t, fase: 0, clase: 'guiones' }), ...tareasTexto(el, svg, ctx)];
  } },
  resumen: { armar(el, w, z, ctx){
    const { svg } = base(el, `<div class="tarjeta"><div class="t" data-b style="color:${ctx.tinta.t}">${marcar(z.titulo || 'En resumen')}</div><ul class="lis">${(z.puntos || []).map((p) => `<li><span class="bala"></span><span data-b>${marcar(p)}</span></li>`).join('')}</ul></div>`);
    const c = rectDe(el, el.querySelector('.tarjeta'));
    const t = [relleno(svg, caja(c.x, c.y, c.w, c.h, 18, 0), '#FFFDF2', 0), trazo(svg, caja(c.x, c.y, c.w, c.h, 18), { color: ctx.tinta.t, ancho: 3, fase: 0 }), trazo(svg, caja(c.x + 5, c.y + 5, c.w - 10, c.h - 10, 14, .6), { color: ctx.tinta.t, ancho: 1.2, fase: 0 })];
    for(const b of el.querySelectorAll('.bala')){ const r = rectDe(el, b); t.push(...dibujo(svg, 'star', r.x + 1, r.y + 1, r.w - 2, ctx.tinta2.t, 0)); }
    return [...t, ...tareasTexto(el, svg, ctx)];
  } },
  codigo: { armar(el, w, z, ctx){
    const { svg } = base(el, `<div class="codigo-a">${z.lenguaje ? `<div class="len">${esc(z.lenguaje)}</div>` : ''}<pre data-b>${[...String(z.codigo || '')].map((ch) => ch === '\n' ? '\n' : ch === ' ' ? ' ' : `<span class="c">${esc(ch)}</span>`).join('')}</pre></div>`);
    const c = rectDe(el, el.querySelector('.codigo-a'));
    return [relleno(svg, caja(c.x, c.y, c.w, c.h, 12, 0), '#1E1428', 0), ...tareasTexto(el, svg, { ...ctx, pedazo: 0 })];
  } },
  imagen: { armar(el, w, z, ctx){
    const { svg } = base(el, `<figure class="img-a"><div class="marco-img"><img alt="${esc(z.pie || z.buscar || '')}" decoding="async"></div>${z.pie ? `<figcaption data-b>${marcar(z.pie)}</figcaption>` : ''}<small class="credito"></small></figure>`);
    const m = rectDe(el, el.querySelector('.marco-img')), img = el.querySelector('img');
    const t = [trazo(svg, caja(m.x - 4, m.y - 4, m.w + 8, m.h + 8, 10), { color: ctx.tinta.t, ancho: 2.4, fase: 0 })];
    /* la foto entra «barriéndose» de izquierda a derecha detrás del cursor */
    img.style.clipPath = 'inset(0 100% 0 0)';
    t.push({ fase: 1, dur: 900, paso(k){ img.style.clipPath = `inset(0 ${f1((1 - k) * 100)}% 0 0)`; }, punto(k){ return [m.x + m.w * k, m.y + m.h * (.5 + Math.sin(k * 9) * .3)]; }, fin(){ img.style.clipPath = 'none'; } });
    const sinFoto = () => { const mc = el.querySelector('.marco-img'); mc.classList.add('sin'); mc.innerHTML = `<span>No encontré una foto de «${esc(z.buscar)}» que cargue. Toca para buscarla:</span> <a href="https://es.wikipedia.org/w/index.php?search=${encodeURIComponent(z.buscar)}" target="_blank" rel="noopener">Wikipedia</a>`; };
    buscarImagen(z.buscar).then((r) => {
      if(!r){ sinFoto(); return; }
      /* si una dirección falla, se prueba la siguiente; si fallan todas, se dice (nunca un recuadro vacío) */
      let i = 0;
      img.onerror = () => { i++; if(r.fuentes && r.fuentes[i]) img.src = r.fuentes[i]; else sinFoto(); };
      img.src = (r.fuentes && r.fuentes[0]) || r.src; el.querySelector('.credito').innerHTML = `Foto: <a href="${esc(r.pagina)}" target="_blank" rel="noopener">Wikipedia · ${esc(r.titulo)}</a>`;
    });
    return [...t, ...tareasTexto(el, svg, ctx)];
  } },
  icono: { armar(el, w, z, ctx){
    const lado = Math.min(150, w * .42);
    const { svg } = base(el, `<div class="dib-a"><div class="hueco-dib" style="width:${lado}px;height:${lado}px"></div>${z.texto ? `<p class="mano" data-b>${marcar(z.texto)}</p>` : ''}</div>`);
    const r = rectDe(el, el.querySelector('.hueco-dib'));
    return [relleno(svg, circulo(r.x + r.w / 2, r.y + r.h / 2, r.w * .62), ctx.tinta.c, 0), ...dibujo(svg, z.icono, r.x + r.w * .1, r.y + r.h * .1, r.w * .8, ctx.tinta.t, 1), ...tareasTexto(el, svg, ctx)];
  } },

  /* ── organizar ideas ── */
  comparar: { armar(el, w, z, ctx){
    const lados = [z.a, z.b];
    const { svg } = base(el, `${titulito(z.titulo, ctx.tinta.t)}<div class="dos">${lados.map((l, i) => `<div class="lado"><h4 data-b style="color:${(i ? ctx.tinta2 : ctx.tinta).t}">${marcar(l.nombre)}</h4><ul class="lis">${l.puntos.map((p) => `<li><span class="bala"></span><span data-b>${marcar(p)}</span></li>`).join('')}</ul></div>`).join('')}</div>`);
    const t = [];
    el.querySelectorAll('.lado').forEach((l, i) => { const r = rectDe(el, l), tn = i ? ctx.tinta2 : ctx.tinta;
      t.push(relleno(svg, caja(r.x, r.y, r.w, r.h, 14, 0), tn.c, 0, .55), trazo(svg, caja(r.x, r.y, r.w, r.h, 14), { color: tn.t, fase: 0 }));
      for(const b of l.querySelectorAll('.bala')){ const q = rectDe(el, b); t.push(trazo(svg, i ? `M${f1(q.x + 3)} ${f1(q.y + q.h / 2)} L${f1(q.x + q.w - 3)} ${f1(q.y + q.h / 2)}` : `M${f1(q.x + 3)} ${f1(q.y + q.h / 2)} L${f1(q.x + q.w - 3)} ${f1(q.y + q.h / 2)} M${f1(q.x + q.w / 2)} ${f1(q.y + 3)} L${f1(q.x + q.w / 2)} ${f1(q.y + q.h - 3)}`, { color: tn.t, ancho: 2.6, fase: 1 })); } });
    const ls = [...el.querySelectorAll('.lado')].map((l) => rectDe(el, l));
    if(ls.length === 2){ const cx = (ls[0].x + ls[0].w + ls[1].x) / 2, cy = ls[0].y + 26;
      const g = textoSVG(svg, svg.querySelector('defs'), 'VS', cx, cy, { tam: 16, peso: 700, color: '#fff', fase: 2 });
      t.push(relleno(svg, circulo(cx, cy, 18, 0), ctx.tinta.t, 1), ...g.tareas); }
    return [...t, ...tareasTexto(el, svg, ctx)];
  } },
  pasos: { armar(el, w, z, ctx){
    const { svg } = base(el, `${titulito(z.titulo, ctx.tinta.t)}<ol class="pasos-a">${z.pasos.map((p, i) => `<li><span class="bala" data-b data-f="1"><span class="c">${i + 1}</span></span><div><b data-b>${marcar(p.titulo)}</b>${p.texto ? `<p class="p chico" data-b>${marcar(p.texto)}</p>` : ''}</div></li>`).join('')}</ol>`);
    const t = [], balas = [...el.querySelectorAll('.bala')].map((b) => rectDe(el, b));
    balas.forEach((r, i) => { const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      t.push(relleno(svg, circulo(cx, cy, r.w / 2, 0), TINTAS[i % TINTAS.length].c, 0), trazo(svg, circulo(cx, cy, r.w / 2), { color: TINTAS[i % TINTAS.length].t, fase: 0 }));
      if(balas[i + 1]){ const n = balas[i + 1]; t.push(trazo(svg, flecha(cx, cy + r.h / 2 + 4, cx, n.y - 4, { punta: 7 }), { color: '#9C93A8', ancho: 2, fase: 1 })); } });
    return [...t, ...tareasTexto(el, svg, ctx)];
  } },
  linea: { armar(el, w, z, ctx){
    const { svg } = base(el, `${titulito(z.titulo, ctx.tinta.t)}<div class="eje-a">${z.eventos.map((e) => `<div class="ev"><span class="punto"></span><div class="fecha" data-b style="color:${ctx.tinta.t}">${marcar(e.fecha)}</div><p class="p chico" data-b>${marcar(e.texto)}</p></div>`).join('')}</div>`);
    const ps = [...el.querySelectorAll('.punto')].map((p) => rectDe(el, p)); if(!ps.length) return tareasTexto(el, svg, ctx);
    const x = ps[0].x + ps[0].w / 2, t = [trazo(svg, flecha(x, ps[0].y - 6, x, ps[ps.length - 1].y + 30, { punta: 9 }), { color: ctx.tinta.t, ancho: 3, fase: 0 })];
    ps.forEach((p, i) => t.push(relleno(svg, circulo(x, p.y + p.h / 2, 8, 0), '#FFFFFF', 0), trazo(svg, circulo(x, p.y + p.h / 2, 8), { color: TINTAS[i % TINTAS.length].t, ancho: 3, relleno: '#fff', fase: 1 })));
    return [...t, ...tareasTexto(el, svg, ctx)];
  } },
  tabla: { armar(el, w, z, ctx){
    const cols = Math.max(z.columnas.length, ...z.filas.map((f) => f.length));
    const { svg } = base(el, `${titulito(z.titulo, ctx.tinta.t)}<table class="tab-a">${z.columnas.length ? `<tr>${z.columnas.map((c) => `<th><span data-b style="color:${ctx.tinta.t}">${marcar(c)}</span></th>`).join('')}</tr>` : ''}${z.filas.map((f) => `<tr>${Array.from({ length: cols }, (_, i) => `<td><span data-b>${marcar(f[i] || '')}</span></td>`).join('')}</tr>`).join('')}</table>`);
    const tb = el.querySelector('table'), R = rectDe(el, tb), filas = [...tb.rows].map((r) => rectDe(el, r)), celdas = [...(tb.rows[0] || { cells: [] }).cells].map((c) => rectDe(el, c));
    const t = [];
    if(z.columnas.length && filas[0]) t.push(relleno(svg, caja(R.x, R.y, R.w, filas[0].h, 10, 0), ctx.tinta.c, 1));
    t.push(trazo(svg, caja(R.x, R.y, R.w, R.h, 10), { color: ctx.tinta.t, ancho: 2.4, fase: 0 }));
    filas.slice(1).forEach((r, i) => t.push(trazo(svg, linea(R.x + 4, r.y, R.x + R.w - 4, r.y, .5), { color: i === 0 && z.columnas.length ? ctx.tinta.t : '#B9B2C4', ancho: i === 0 && z.columnas.length ? 2.2 : 1.3, fase: 0 })));
    celdas.slice(1).forEach((c) => t.push(trazo(svg, linea(c.x, R.y + 4, c.x, R.y + R.h - 4, .5), { color: '#B9B2C4', ancho: 1.3, fase: 0 })));
    return [...t, ...tareasTexto(el, svg, ctx)];
  } },

  /* ── diagramas en SVG ── */
  diagrama: { armar(el, w, z, ctx){ return armarDiagrama(el, w, z, ctx); } },
  venn: { armar(el, w, z, ctx){ return armarVenn(el, w, z, ctx); } },
  barras: { armar(el, w, z, ctx){ return armarBarras(el, w, z, ctx); } },
  lineas: { armar(el, w, z, ctx){ return armarLineas(el, w, z, ctx); } },
  pastel: { armar(el, w, z, ctx){ return armarPastel(el, w, z, ctx); } },
  mapa: { armar(el, w, z, ctx){ return armarMapa(el, w, z, ctx); } },
  ciclo: { armar(el, w, z, ctx){ return armarCiclo(el, w, z, ctx); } },
  piramide: { armar(el, w, z, ctx){ return armarPiramide(el, w, z, ctx, false); } },
  embudo: { armar(el, w, z, ctx){ return armarPiramide(el, w, z, ctx, true); } },
  matriz: { armar(el, w, z, ctx){ return armarMatriz(el, w, z, ctx); } },
  arbol: { armar(el, w, z, ctx){ return armarArbol(el, w, z, ctx); } },
  causas: { armar(el, w, z, ctx){ return armarCausas(el, w, z, ctx); } },
  escala: { armar(el, w, z, ctx){ return armarEscala(el, w, z, ctx); } },
  partes: { armar(el, w, z, ctx){ return armarPartes(el, w, z, ctx); } },
};
export const TIPOS = Object.keys(ELEMENTOS);

/* un SVG del tamaño del elemento para los tipos que son puro dibujo */
function lienzoSVG(el, w, h, z, ctx){
  const tit = z.titulo ? `<div class="t" data-b style="color:${ctx.tinta.t}">${marcar(z.titulo)}</div>` : '';
  el.innerHTML = `${tit}<svg class="dib" width="${f1(w)}" height="${f1(h)}" viewBox="0 0 ${f1(w)} ${f1(h)}" aria-hidden="true"><defs></defs><g class="fondos"></g><g class="marcas"></g></svg>`;
  const svg = el.querySelector('svg.dib'), defs = svg.querySelector('defs');
  const oy = svg.getBoundingClientRect().top - el.getBoundingClientRect().top;
  const k = (el.getBoundingClientRect().width / el.offsetWidth) || 1;
  /* las tareas del dibujo están en coordenadas del SVG; el cursor las necesita en las del elemento */
  const mover = (ts) => ts.map((t) => ({ ...t, get dur(){ return t.dur; }, ini: t.ini && t.ini.bind(t), paso: t.paso.bind(t), fin: t.fin.bind(t), punto: (q) => { const [x, y] = t.punto(q); return [x, y + oy / k]; } }));
  const tit2 = tareasTexto(el, svg, ctx);
  return { svg, defs, mover, tareasTitulo: tit2 };
}
const t2 = (svg, d, o) => trazo(svg, d, o);

function armarDiagrama(el, w, z, ctx){
  const W = w, SALTO = 64, fuente = '700 14px Texto';
  const entra = new Map(z.nodos.map((n) => [n.id, 0])); z.flechas.forEach((f) => entra.set(f.a, (entra.get(f.a) || 0) + 1));
  const nivel = new Map(); const raices = z.nodos.filter((n) => !entra.get(n.id));
  const cola = (raices.length ? raices : [z.nodos[0]]).map((n) => n.id); cola.forEach((id) => nivel.set(id, 0));
  while(cola.length){ const id = cola.shift(); for(const f of z.flechas) if(f.de === id && !nivel.has(f.a)){ nivel.set(f.a, nivel.get(id) + 1); cola.push(f.a); } }
  z.nodos.forEach((n) => { if(!nivel.has(n.id)){ nivel.set(n.id, 0); } });
  const filas = []; z.nodos.forEach((n) => { const l = nivel.get(n.id); (filas[l] = filas[l] || []).push(n); });
  const pos = new Map(); let y = 10;
  filas.filter(Boolean).forEach((fila) => { const g = 12, cw = Math.min(210, (W - g * (fila.length + 1)) / fila.length);
    const rens = fila.map((n) => partir(n.texto, cw - 16, fuente).slice(0, 4)), h = Math.max(46, 16 + Math.max(...rens.map((r) => r.length)) * 18);
    fila.forEach((n, i) => pos.set(n.id, { x: g + i * (cw + g) + (W - (fila.length * cw + (fila.length + 1) * g)) / 2, y, w: cw, h, ren: rens[i] }));
    y += h + SALTO; });
  const H = y - SALTO + 14;
  const { svg, defs, mover, tareasTitulo } = lienzoSVG(el, W, H, z, ctx);
  const t = [];
  z.nodos.forEach((n, i) => { const p = pos.get(n.id), tn = TINTAS[(ctx.n + nivel.get(n.id)) % TINTAS.length];
    t.push(relleno(svg, caja(p.x, p.y, p.w, p.h, 12, 0), tn.c, 1), t2(svg, caja(p.x, p.y, p.w, p.h, 12), { color: tn.t, fase: 0 }));
    p.ren.forEach((r, k) => t.push(...textoSVG(svg, defs, r, p.x + p.w / 2, p.y + p.h / 2 + (k - (p.ren.length - 1) / 2) * 18, { tam: 14, fase: 2 }).tareas)); });
  for(const f of z.flechas){ const a = pos.get(f.de), b = pos.get(f.a); if(!a || !b) continue;
    const x1 = a.x + a.w / 2, x2 = b.x + b.w / 2;
    if(b.y > a.y){ t.push(t2(svg, flecha(x1, a.y + a.h + 2, x2, b.y - 4, { curva: x1 === x2 ? 0 : .08 }), { color: '#4A4656', ancho: 2.2, fase: 1 }));
      if(f.texto) t.push(...textoSVG(svg, defs, f.texto, (x1 + x2) / 2 + 8, (a.y + a.h + b.y) / 2, { tam: 15, fam: 'Mano', ancla: 'start', color: ctx.tinta2.t, fase: 3 }).tareas); }
    else {
      const izq = a.x + a.w / 2 < W / 2;
      const ax = izq ? a.x : a.x + a.w, bx = izq ? b.x - 4 : b.x + b.w + 4, lado = izq ? Math.max(4, Math.min(a.x, b.x) - 22) : Math.min(W - 4, Math.max(a.x + a.w, b.x + b.w) + 22);
      const ay = a.y + a.h / 2, by = b.y + b.h / 2, k = 9, s = izq ? 1 : -1;
      t.push(t2(svg, `M${f1(ax)} ${f1(ay)} C${f1(lado)} ${f1(ay)} ${f1(lado)} ${f1(by)} ${f1(bx)} ${f1(by)} M${f1(bx - k * s)} ${f1(by - k * .6)} L${f1(bx)} ${f1(by)} L${f1(bx - k * s)} ${f1(by + k * .6)}`, { color: '#4A4656', ancho: 2.2, fase: 1 }));
      if(f.texto) t.push(...textoSVG(svg, defs, f.texto, lado + (izq ? 4 : -4), (ay + by) / 2, { tam: 15, fam: 'Mano', ancla: izq ? 'start' : 'end', color: ctx.tinta2.t, fase: 3 }).tareas);
    } }
  return [...tareasTitulo, ...mover(t)];
}

function armarVenn(el, w, z, ctx){
  const cs = z.conjuntos.slice(0, 3), n = cs.length;
  const W = w, R = n === 3 ? Math.min(W * .27, 125) : Math.min(W * .3, 130), H = n === 3 ? R * 3.3 + 74 : R * 2.3 + 70;
  const cx = W / 2, cy = n === 3 ? R * 1.35 + 30 : R + 46;
  const centros = n === 3 ? [[cx - R * .58, cy - R * .2], [cx + R * .58, cy - R * .2], [cx, cy + R * .8]] : [[cx - R * .6, cy], [cx + R * .6, cy]];
  const { svg, defs, mover, tareasTitulo } = lienzoSVG(el, W, H, z, ctx);
  const t = [], colores = cs.map((_, i) => TINTAS[(ctx.n + i * 2) % TINTAS.length]);
  centros.forEach(([x, y], i) => { t.push(relleno(svg, circulo(x, y, R, 0), colores[i].c, 1, .7), t2(svg, circulo(x, y, R), { color: colores[i].t, ancho: 2.8, fase: 0 })); });
  /* la UNIÓN: la parte que comparten se raya, para que se vea que ahí se juntan los temas */
  const idA = 'va' + (++nRecorte), idB = 'vb' + nRecorte;
  defs.append(Object.assign(svgEl('clipPath', { id: idA }), {}), svgEl('clipPath', { id: idB }));
  defs.querySelector('#' + idA).append(svgEl('circle', { cx: centros[0][0], cy: centros[0][1], r: R }));
  defs.querySelector('#' + idB).append(svgEl('circle', { cx: centros[1][0], cy: centros[1][1], r: R }));
  const g1 = svgEl('g', { 'clip-path': `url(#${idA})` }), g2 = svgEl('g', { 'clip-path': `url(#${idB})` }); g1.append(g2); svg.append(g1);
  const rp = svgEl('path', { d: rayado(cx - R, cy - R * 1.2, R * 2, R * 2.4, 8), fill: 'none', stroke: ctx.tinta.t, 'stroke-width': 1.6, opacity: .55 }); g2.append(rp);
  t.push(tTrazo(rp, 1, { vel: 3 }));
  /* nombres de cada conjunto y sus puntos, en la parte que es sólo suya */
  const fuera = n === 3 ? [[-1.05, -.55], [1.05, -.55], [0, 1.25]] : [[-.95, 0], [.95, 0]];
  centros.forEach(([x, y], i) => {
    const c = cs[i], [fx, fy] = fuera[i];
    const tx = x + fx * R * .38, ty = y + fy * R * .38;
    const nombreY = n === 3 && i === 2 ? y + R + 20 : y - R - 12;
    t.push(...textoSVG(svg, defs, c.nombre, n === 3 && i < 2 ? x + fx * R * .15 : x, nombreY, { tam: 21, fam: 'Mano', color: colores[i].t, fase: 2 }).tareas);
    (c.puntos || []).slice(0, 3).forEach((p, k) => t.push(...textoSVG(svg, defs, p, tx, ty + (k - 1) * 17 - (n === 3 && i === 2 ? 0 : 0), { tam: 12.5, fase: 2, maxAncho: R * .78 }).tareas));
  });
  /* el centro: lo que nace de juntar los temas */
  const centro = n === 3 ? [cx, cy + R * .1] : [cx, cy];
  if(z.centro){
    const ren = partir(z.centro, R * .7, '700 14px Texto'), pw = Math.min(R * .95, Math.max(...ren.map((r) => medirTexto(r, '700 14px Texto'))) + 18), ph = ren.length * 17.5 + 12;
    t.push(relleno(svg.querySelector(':scope > .marcas') ? svg : svg, caja(centro[0] - pw / 2, centro[1] - ph / 2, pw, ph, 10, 0), '#FFFFFF', 3, .94));
    const pastilla = svg.querySelector(':scope > .fondos').lastElementChild; svg.append(pastilla);
    t.push(t2(svg, caja(centro[0] - pw / 2, centro[1] - ph / 2, pw, ph, 10, .3), { color: ctx.tinta.t, ancho: 1.8, fase: 3 }));
    t.push(...textoSVG(svg, defs, z.centro, centro[0], centro[1], { tam: 14, color: ctx.tinta.t, fase: 3, maxAncho: R * .7 }).tareas);
  }
  if(z.comun && z.comun.length){ const ty = H - 18; t.push(t2(svg, flecha(centro[0], ty - 18, centro[0], centro[1] + 22, { curva: .12, punta: 8 }), { color: ctx.tinta2.t, ancho: 2, fase: 3 }));
    t.push(...textoSVG(svg, defs, z.comun.join(' · '), cx, ty, { tam: 14, fam: 'Mano', color: ctx.tinta2.t, fase: 3, maxAncho: W - 30 }).tareas); }
  return [...tareasTitulo, ...mover(t)];
}

function ejes(svg, x0, y0, x1, y1){ return [t2(svg, flecha(x0, y0, x0, y1 - 6, { punta: 8 }), { color: '#4A4656', ancho: 2, fase: 0 }), t2(svg, flecha(x0, y0, x1 + 6, y0, { punta: 8 }), { color: '#4A4656', ancho: 2, fase: 0 })]; }
const numero = (v) => Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
function armarBarras(el, w, z, ctx){
  const d = z.datos.slice(0, 10), W = w, H = 250, x0 = 38, y0 = H - 46, top = 22, ancho = W - x0 - 14;
  const max = Math.max(...d.map((x) => x.valor), 0) || 1;
  const { svg, defs, mover, tareasTitulo } = lienzoSVG(el, W, H, z, ctx);
  const t = [...ejes(svg, x0, y0, W - 10, top)], paso = ancho / d.length, bw = Math.min(54, paso * .62);
  for(let k = 1; k <= 4; k++){ const yy = y0 - (y0 - top - 10) * k / 4; t.push(t2(svg, linea(x0 + 2, yy, W - 12, yy, .2), { color: '#E1DCE8', ancho: 1, fase: 0 })); t.push(...textoSVG(svg, defs, numero(max * k / 4), x0 - 6, yy, { tam: 10.5, ancla: 'end', color: '#6B6677', fase: 2 }).tareas); }
  d.forEach((b, i) => { const h = (y0 - top - 10) * (b.valor / max), x = x0 + paso * i + (paso - bw) / 2, tn = TINTAS[(ctx.n + i) % TINTAS.length];
    t.push(relleno(svg, `M${f1(x)} ${f1(y0)} V${f1(y0 - h)} H${f1(x + bw)} V${f1(y0)} Z`, tn.c, 1));
    t.push(t2(svg, `M${f1(x)} ${f1(y0)} L${f1(tiembla(x, .5))} ${f1(y0 - h)} L${f1(x + bw)} ${f1(tiembla(y0 - h, .5))} L${f1(x + bw)} ${f1(y0)}`, { color: tn.t, ancho: 2.4, fase: 0 }));
    t.push(...textoSVG(svg, defs, numero(b.valor) + (z.unidad ? ' ' + z.unidad : ''), x + bw / 2, y0 - h - 10, { tam: 12, color: tn.t, fase: 3 }).tareas);
    t.push(...textoSVG(svg, defs, b.etiqueta, x + bw / 2, y0 + 16, { tam: 11.5, fase: 2, maxAncho: paso - 4 }).tareas); });
  return [...tareasTitulo, ...mover(t)];
}
function armarLineas(el, w, z, ctx){
  const p = z.puntos.slice(0, 14), W = w, H = 240, x0 = 40, y0 = H - 42, top = 20;
  const vals = p.map((x) => x.y), max = Math.max(...vals), min = Math.min(0, ...vals), rango = (max - min) || 1;
  const { svg, defs, mover, tareasTitulo } = lienzoSVG(el, W, H, z, ctx);
  const t = [...ejes(svg, x0, y0, W - 10, top)], paso = (W - x0 - 24) / Math.max(1, p.length - 1);
  const XY = p.map((q, i) => [x0 + 10 + paso * i, y0 - (y0 - top - 14) * (q.y - min) / rango]);
  t.push(t2(svg, XY.map(([x, y], i) => `${i ? 'L' : 'M'}${f1(x)} ${f1(y)}`).join(''), { color: ctx.tinta.t, ancho: 3, fase: 1 }));
  XY.forEach(([x, y], i) => { t.push(t2(svg, circulo(x, y, 4.5, .2), { color: ctx.tinta.t, relleno: '#fff', ancho: 2.4, fase: 1 }));
    t.push(...textoSVG(svg, defs, String(p[i].x), x, y0 + 16, { tam: 11, fase: 2 }).tareas);
    if(p.length <= 8) t.push(...textoSVG(svg, defs, numero(p[i].y), x, y - 12, { tam: 11, color: ctx.tinta.t, fase: 3 }).tareas); });
  if(z.ejeY) t.push(...textoSVG(svg, defs, z.ejeY, x0 + 6, top - 4, { tam: 12, ancla: 'start', color: '#6B6677', fase: 2 }).tareas);
  return [...tareasTitulo, ...mover(t)];
}
function armarPastel(el, w, z, ctx){
  const d = z.datos.slice(0, 8), W = w, R = Math.min(W * .26, 100), H = R * 2 + 40 + Math.ceil(d.length / 2) * 22, cx = W / 2, cy = R + 16;
  const total = d.reduce((s, x) => s + x.valor, 0) || 1;
  const { svg, defs, mover, tareasTitulo } = lienzoSVG(el, W, H, z, ctx);
  const t = [t2(svg, circulo(cx, cy, R), { color: '#4A4656', ancho: 2.4, fase: 0 })];
  let a = -Math.PI / 2;
  d.forEach((s, i) => { const b = a + s.valor / total * Math.PI * 2, tn = TINTAS[(ctx.n + i) % TINTAS.length], m = (a + b) / 2;
    t.push(relleno(svg, sector(cx, cy, R, a, b), tn.c, 1), t2(svg, linea(cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R, .3), { color: '#4A4656', ancho: 2, fase: 0 }));
    t.push(...textoSVG(svg, defs, Math.round(s.valor / total * 100) + '%', cx + Math.cos(m) * R * .62, cy + Math.sin(m) * R * .62, { tam: 13, color: tn.t, fase: 2 }).tareas);
    const lx = i % 2 ? W / 2 + 10 : 14, ly = cy + R + 30 + Math.floor(i / 2) * 22;
    t.push(relleno(svg, caja(lx, ly - 7, 14, 14, 3, 0), tn.t, 2), ...textoSVG(svg, defs, s.etiqueta, lx + 22, ly, { tam: 13, ancla: 'start', fase: 2, maxAncho: W / 2 - 40 }).tareas);
    a = b; });
  return [...tareasTitulo, ...mover(t)];
}
function armarMapa(el, w, z, ctx){
  const ramas = z.ramas.slice(0, 6), W = w, fuente = '700 13px Texto';
  const angosto = W < 520;
  /* en el teléfono, las ramas van en dos columnas abajo del centro; en pantalla grande, alrededor */
  const cajas = ramas.map((r) => { const bw = angosto ? (W - 36) / 2 : 150; const ren = partir(r.texto, bw - 18, fuente).slice(0, 3); const hijos = (r.hijos || []).slice(0, 4).map((h) => partir('· ' + h, bw - 8, '600 12px Texto').slice(0, 2)); return { r, bw, ren, hijos, h: 14 + ren.length * 16 + 6 }; });
  let H, cx = W / 2, cy, pos;
  if(angosto){
    cy = 50; const filas = Math.ceil(cajas.length / 2); let y = 116; pos = [];
    for(let f = 0; f < filas; f++){ const par = cajas.slice(f * 2, f * 2 + 2); const alto = Math.max(...par.map((c) => c.h + c.hijos.flat().length * 15 + 10));
      par.forEach((c, i) => pos.push({ c, x: i ? W / 2 + 6 : 12, y })); y += alto + 22; }
    H = y;
  } else {
    cy = 210; H = 430; const rx = W / 2 - 100, ry = 150;
    pos = cajas.map((c, i) => { const a = -Math.PI / 2 + i / cajas.length * Math.PI * 2; return { c, x: cx + Math.cos(a) * rx - c.bw / 2, y: cy + Math.sin(a) * ry - c.h / 2 }; });
  }
  const { svg, defs, mover, tareasTitulo } = lienzoSVG(el, W, H, z, ctx);
  const cw = Math.min(W * .62, 230), cren = partir(z.centro, cw - 30, '700 18px Mano');
  const ch = 26 + cren.length * 20;
  const t = [relleno(svg, ovalo(cx, cy, cw / 2, ch / 2 + 6, 0, 1), ctx.tinta.c, 1), t2(svg, ovalo(cx, cy, cw / 2, ch / 2 + 6), { color: ctx.tinta.t, ancho: 3, fase: 0 })];
  cren.forEach((r, k) => t.push(...textoSVG(svg, defs, r, cx, cy + (k - (cren.length - 1) / 2) * 20, { tam: 20, fam: 'Mano', color: ctx.tinta.t, fase: 2 }).tareas));
  if(angosto && pos.length){ const ult = pos[pos.length - 1]; t.push(t2(svg, linea(cx, cy + ch / 2 + 6, cx, ult.y + ult.c.h / 2, .4), { color: ctx.tinta.t, ancho: 3, fase: 0 })); }
  pos.forEach(({ c, x, y }, i) => { const tn = TINTAS[(ctx.n + i + 1) % TINTAS.length], bx = x + c.bw / 2;
    if(angosto){ const izq = x < cx, ym = y + c.h / 2; t.push(t2(svg, `M${f1(cx)} ${f1(ym - 10)} Q${f1(cx)} ${f1(ym)} ${f1(izq ? x + c.bw : x)} ${f1(ym)}`, { color: tn.t, ancho: 2.6, fase: 0 })); }
    else { const desde = [cx + (bx - cx) * .32, cy + (y + c.h / 2 - cy) * .32];
      t.push(t2(svg, `M${f1(desde[0])} ${f1(desde[1])} Q${f1((desde[0] + bx) / 2 + tiembla(0, 14))} ${f1((desde[1] + y) / 2)} ${f1(bx)} ${f1(y - 2)}`, { color: tn.t, ancho: 2.6, fase: 0 })); }
    t.push(relleno(svg, caja(x, y, c.bw, c.h, 12, 0), tn.c, 1), t2(svg, caja(x, y, c.bw, c.h, 12), { color: tn.t, fase: 0 }));
    c.ren.forEach((r, k) => t.push(...textoSVG(svg, defs, r, bx, y + 18 + k * 16, { tam: 13, color: tn.t, fase: 2 }).tareas));
    let yy = y + c.h + 16; c.hijos.flat().forEach((r) => { t.push(...textoSVG(svg, defs, r, x + 4, yy, { tam: 12, ancla: 'start', peso: 600, fase: 2 }).tareas); yy += 15; }); });
  return [...tareasTitulo, ...mover(t)];
}
function armarCiclo(el, w, z, ctx){
  const e = z.etapas.slice(0, 8), n = e.length, W = w, bw0 = Math.min(120, W * .34), R = Math.min((W - bw0) / 2 - 6, 150), H = R * 2 + 110, cx = W / 2, cy = R + 55;
  const { svg, defs, mover, tareasTitulo } = lienzoSVG(el, W, H, z, ctx);
  const t = [], bw = Math.min(120, W * .34);
  const pts = e.map((_, i) => { const a = -Math.PI / 2 + i / n * Math.PI * 2; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R, a]; });
  pts.forEach(([x, y, a], i) => { const b = pts[(i + 1) % n], a0 = a + .38, a1 = b[2] - .38 + (i === n - 1 ? Math.PI * 2 : 0);
    const p0 = [cx + Math.cos(a0) * R, cy + Math.sin(a0) * R], p1 = [cx + Math.cos(a1) * R, cy + Math.sin(a1) * R];
    const tg = a1 + Math.PI / 2, k = 9;
    t.push(t2(svg, `M${f1(p0[0])} ${f1(p0[1])} A${R} ${R} 0 0 1 ${f1(p1[0])} ${f1(p1[1])} M${f1(p1[0] - k * Math.cos(tg - .5))} ${f1(p1[1] - k * Math.sin(tg - .5))} L${f1(p1[0])} ${f1(p1[1])} L${f1(p1[0] - k * Math.cos(tg + .5))} ${f1(p1[1] - k * Math.sin(tg + .5))}`, { color: '#6B6677', ancho: 2.2, fase: 1 })); });
  pts.forEach(([x, y], i) => { const tn = TINTAS[(ctx.n + i) % TINTAS.length], ren = partir(e[i], bw - 14, '700 13px Texto').slice(0, 3), h = 14 + ren.length * 16;
    t.push(relleno(svg, caja(x - bw / 2, y - h / 2, bw, h, 14, 0), '#FFFFFF', 0), relleno(svg, caja(x - bw / 2, y - h / 2, bw, h, 14, 0), tn.c, 1, .8), t2(svg, caja(x - bw / 2, y - h / 2, bw, h, 14), { color: tn.t, fase: 0 }));
    ren.forEach((r, k) => t.push(...textoSVG(svg, defs, r, x, y + (k - (ren.length - 1) / 2) * 16, { tam: 13, color: tn.t, fase: 2 }).tareas)); });
  if(z.centro) t.push(...textoSVG(svg, defs, z.centro, cx, cy, { tam: 19, fam: 'Mano', color: ctx.tinta.t, fase: 3, maxAncho: R * 1.1 }).tareas);
  return [...tareasTitulo, ...mover(t)];
}
function armarPiramide(el, w, z, ctx, embudo){
  const nv = z.niveles.slice(0, 7), n = nv.length, W = w, alto = 46, H = n * alto + 20, base = Math.min(W - 20, 460), x0 = (W - base) / 2;
  const { svg, defs, mover, tareasTitulo } = lienzoSVG(el, W, H, z, ctx);
  const t = [];
  nv.forEach((txt, i) => { const k0 = embudo ? 1 - i / n * .75 : (i) / n, k1 = embudo ? 1 - (i + 1) / n * .75 : (i + 1) / n;
    const wa = embudo ? base * k0 : base * Math.max(.3, k0), wb = embudo ? base * k1 : base * k1, y = 10 + i * alto, tn = TINTAS[(ctx.n + i) % TINTAS.length];
    const d = `M${f1(W / 2 - wa / 2)} ${f1(y)} L${f1(W / 2 + wa / 2)} ${f1(y)} L${f1(W / 2 + wb / 2)} ${f1(y + alto)} L${f1(W / 2 - wb / 2)} ${f1(y + alto)} Z`;
    t.push(relleno(svg, d, tn.c, 1), t2(svg, d, { color: tn.t, ancho: 2.4, fase: 0 }));
    t.push(...textoSVG(svg, defs, txt, W / 2, y + alto / 2, { tam: 13.5, color: tn.t, fase: 2, maxAncho: Math.max(80, Math.min(wa, wb) - 16) }).tareas); });
  void x0;
  return [...tareasTitulo, ...mover(t)];
}
function armarMatriz(el, w, z, ctx){
  const W = w, H = Math.min(W, 380), m = 26, cx = W / 2, cy = H / 2;
  const { svg, defs, mover, tareasTitulo } = lienzoSVG(el, W, H, z, ctx);
  const t = [t2(svg, flecha(m, cy, W - m, cy, { punta: 9 }), { color: '#4A4656', ancho: 2.2, fase: 0 }), t2(svg, flecha(cx, H - m, cx, m, { punta: 9 }), { color: '#4A4656', ancho: 2.2, fase: 0 })];
  const q = (z.cuadrantes || []).slice(0, 4), cs = [[cx - (W / 2 - m) / 2, cy - (H / 2 - m) / 2], [cx + (W / 2 - m) / 2, cy - (H / 2 - m) / 2], [cx - (W / 2 - m) / 2, cy + (H / 2 - m) / 2], [cx + (W / 2 - m) / 2, cy + (H / 2 - m) / 2]];
  q.forEach((txt, i) => { const tn = TINTAS[(ctx.n + i) % TINTAS.length], [x, y] = cs[i];
    t.push(relleno(svg, caja(x - (W / 2 - m) / 2 + 8, y - (H / 2 - m) / 2 + 8, W / 2 - m - 16, H / 2 - m - 16, 12, 0), tn.c, 1, .7), ...textoSVG(svg, defs, txt, x, y, { tam: 13.5, color: tn.t, fase: 2, maxAncho: W / 2 - m - 30 }).tareas); });
  if(z.ejeX) t.push(...textoSVG(svg, defs, z.ejeX, W - m, cy + 18, { tam: 15, fam: 'Mano', ancla: 'end', color: '#4A4656', fase: 3 }).tareas);
  if(z.ejeY) t.push(...textoSVG(svg, defs, z.ejeY, cx + 8, m + 4, { tam: 15, fam: 'Mano', ancla: 'start', color: '#4A4656', fase: 3 }).tareas);
  return [...tareasTitulo, ...mover(t)];
}
function armarArbol(el, w, z, ctx){
  const hijos = (z.hijos || []).slice(0, 5), W = w, fuente = '700 13px Texto';
  const bw = Math.min(150, (W - 12 * (hijos.length + 1)) / Math.max(1, hijos.length));
  const nietosMax = Math.max(0, ...hijos.map((h) => (h.hijos || []).length));
  const H = 70 + 80 + 56 + nietosMax * 30 + 20;
  const { svg, defs, mover, tareasTitulo } = lienzoSVG(el, W, H, z, ctx);
  const rw = Math.min(220, W - 40), ry = 14, rh = 46, t = [];
  t.push(relleno(svg, caja(W / 2 - rw / 2, ry, rw, rh, 14, 0), ctx.tinta.c, 1), t2(svg, caja(W / 2 - rw / 2, ry, rw, rh, 14), { color: ctx.tinta.t, ancho: 2.6, fase: 0 }), ...textoSVG(svg, defs, z.raiz, W / 2, ry + rh / 2, { tam: 15, color: ctx.tinta.t, fase: 2, maxAncho: rw - 20 }).tareas);
  const yb = ry + rh + 26, yh = yb + 26;
  const total = hijos.length * bw + (hijos.length - 1) * 12, x0 = (W - total) / 2;
  if(hijos.length > 1) t.push(t2(svg, linea(x0 + bw / 2, yb, x0 + total - bw / 2, yb, .4), { color: '#6B6677', ancho: 2, fase: 0 }));
  t.push(t2(svg, linea(W / 2, ry + rh, W / 2, yb, .3), { color: '#6B6677', ancho: 2, fase: 0 }));
  hijos.forEach((h, i) => { const x = x0 + i * (bw + 12), tn = TINTAS[(ctx.n + i + 1) % TINTAS.length], ren = partir(h.texto, bw - 14, fuente).slice(0, 3), hh = 14 + ren.length * 16;
    t.push(t2(svg, flecha(x + bw / 2, yb, x + bw / 2, yh - 2, { punta: 6 }), { color: '#6B6677', ancho: 2, fase: 0 }));
    t.push(relleno(svg, caja(x, yh, bw, hh, 12, 0), tn.c, 1), t2(svg, caja(x, yh, bw, hh, 12), { color: tn.t, fase: 0 }));
    ren.forEach((r, k) => t.push(...textoSVG(svg, defs, r, x + bw / 2, yh + 16 + k * 16, { tam: 13, color: tn.t, fase: 2 }).tareas));
    (h.hijos || []).slice(0, 5).forEach((nt, k) => { const yy = yh + hh + 22 + k * 30; t.push(t2(svg, linea(x + 10, yh + hh, x + 10, yy, .3), { color: tn.t, ancho: 1.6, fase: 1 }), t2(svg, linea(x + 10, yy, x + 18, yy, .2), { color: tn.t, ancho: 1.6, fase: 1 }));
      t.push(...textoSVG(svg, defs, partir(nt, bw - 22, '600 12px Texto')[0], x + 22, yy, { tam: 12, ancla: 'start', peso: 600, fase: 2 }).tareas); }); });
  return [...tareasTitulo, ...mover(t)];
}
function armarCausas(el, w, z, ctx){
  const cs = z.causas.slice(0, 8), W = w, paso = 54, H = 60 + Math.ceil(cs.length / 2) * paso + 80, x = W / 2;
  const { svg, defs, mover, tareasTitulo } = lienzoSVG(el, W, H, z, ctx);
  const ey = H - 56, t = [t2(svg, flecha(x, 16, x, ey - 6, { punta: 10 }), { color: '#4A4656', ancho: 3, fase: 0 })];
  const ew = Math.min(260, W - 30);
  t.push(relleno(svg, caja(x - ew / 2, ey, ew, 46, 12, 0), ctx.tinta.c, 1), t2(svg, caja(x - ew / 2, ey, ew, 46, 12), { color: ctx.tinta.t, ancho: 2.6, fase: 0 }), ...textoSVG(svg, defs, z.efecto, x, ey + 23, { tam: 15, color: ctx.tinta.t, fase: 2, maxAncho: ew - 20 }).tareas);
  cs.forEach((c, i) => { const izq = i % 2 === 0, y = 36 + Math.floor(i / 2) * paso, tn = TINTAS[(ctx.n + i + 1) % TINTAS.length], bx = izq ? 10 : W - 10, sx = x, sy = y + 30;
    t.push(t2(svg, `M${f1(bx)} ${f1(y + 10)} L${f1(izq ? sx - 26 : sx + 26)} ${f1(y + 10)} L${f1(sx)} ${f1(sy)}`, { color: tn.t, ancho: 2, fase: 1 }));
    t.push(...textoSVG(svg, defs, c, bx, y, { tam: 13, ancla: izq ? 'start' : 'end', color: tn.t, fase: 2, maxAncho: W / 2 - 34 }).tareas); });
  return [...tareasTitulo, ...mover(t)];
}
function armarEscala(el, w, z, ctx){
  const W = w, H = 150, y = 70, x0 = 20, x1 = W - 20;
  const { svg, defs, mover, tareasTitulo } = lienzoSVG(el, W, H, z, ctx);
  const t = [t2(svg, flecha(x1 - 30, y, x0, y, { punta: 9 }), { color: ctx.tinta.t, ancho: 3, fase: 0 }), t2(svg, flecha(x0 + 30, y, x1, y, { punta: 9 }), { color: ctx.tinta2.t, ancho: 3, fase: 0 })];
  t.push(...textoSVG(svg, defs, z.izquierda, x0, y + 30, { tam: 17, fam: 'Mano', ancla: 'start', color: ctx.tinta.t, fase: 2, maxAncho: W * .4 }).tareas, ...textoSVG(svg, defs, z.derecha, x1, y + 30, { tam: 17, fam: 'Mano', ancla: 'end', color: ctx.tinta2.t, fase: 2, maxAncho: W * .4 }).tareas);
  (z.marcas || []).slice(0, 6).forEach((m, i) => { const xx = x0 + 20 + (x1 - x0 - 40) * lim(m.pos / 100, 0, 1), arriba = i % 2 === 0;
    t.push(t2(svg, linea(xx, y - 9, xx, y + 9, .2), { color: '#4A4656', ancho: 2.4, fase: 1 }));
    t.push(...textoSVG(svg, defs, m.texto, xx, arriba ? y - 22 : y + 58, { tam: 12.5, fase: 2, maxAncho: 110 }).tareas); });
  return [...tareasTitulo, ...mover(t)];
}
function armarPartes(el, w, z, ctx){
  const ps = z.partes.slice(0, 8), W = w, lado = Math.min(150, W * .4), filas = Math.ceil(ps.length / 2), H = Math.max(lado + 40, filas * 52 + 30);
  const { svg, defs, mover, tareasTitulo } = lienzoSVG(el, W, H, z, ctx);
  const cx = W / 2, cy = H / 2, t = [relleno(svg, circulo(cx, cy, lado * .62, 0), ctx.tinta.c, 0), ...dibujo(svg, z.icono, cx - lado * .4, cy - lado * .4, lado * .8, ctx.tinta.t, 0)];
  ps.forEach((p, i) => { const izq = i % 2 === 0, fila = Math.floor(i / 2), y = 30 + fila * ((H - 50) / Math.max(1, filas - 1 || 1)), x = izq ? 8 : W - 8, tn = TINTAS[(ctx.n + i + 1) % TINTAS.length];
    const destino = [cx + (izq ? -1 : 1) * lado * .32, cy + (y - cy) * .3];
    t.push(t2(svg, `M${f1(izq ? x + 92 : x - 92)} ${f1(y + 6)} L${f1(destino[0])} ${f1(destino[1])}`, { color: tn.t, ancho: 1.6, fase: 3 }), t2(svg, circulo(destino[0], destino[1], 3.2, .1), { color: tn.t, relleno: tn.t, fase: 3 }));
    t.push(...textoSVG(svg, defs, p, x, y, { tam: 13, ancla: izq ? 'start' : 'end', color: tn.t, fase: 2, maxAncho: Math.min(120, W / 2 - lado * .45) }).tareas); });
  return [...tareasTitulo, ...mover(t)];
}

/* un elemento ya terminado, en el flujo normal de una página (los apuntes) */
export function armarFijo(caja, z, n, w){
  const def = ELEMENTOS[z.tipo] || ELEMENTOS.texto;
  const el = document.createElement('div'); el.className = 'el fijo ' + z.tipo; el.style.width = w + 'px';
  caja.append(el);
  semilla = 7919 * (n + 1) + 104729;
  const ctx = { n, tinta: TINTAS[n % TINTAS.length], tinta2: TINTAS[(n + 2) % TINTAS.length], pedazo: 0 };
  let tareas = [];
  try{ tareas = def.armar(el, w, z, ctx) || []; }
  catch(e){ console.warn('No pude armar', z.tipo, e); const b = base(el, `<p class="p" data-b>${marcar(z.texto || z.titulo || '')}</p>`); tareas = tareasTexto(el, b.svg, ctx); }
  for(const x of tareas){ x.ini && x.ini(); x.fin(); }
  return el;
}

/* ══ 5 · FOTOS DE WIKIPEDIA ═══════════════════════════════════════════════ */
const fotosVistas = new Map();
export function buscarImagen(titulo){
  if(!titulo) return Promise.resolve(null);
  if(fotosVistas.has(titulo)) return fotosVistas.get(titulo);
  const p = (async () => {
    try{
      const r = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(String(titulo).replace(/ /g, '_'))}?redirect=true`, { headers: { accept: 'application/json' } });
      if(!r.ok) return null;
      const j = await r.json(), mini = j.thumbnail, orig = j.originalimage;
      if(!(mini && mini.source) && !(orig && orig.source)) return null;
      /* varias direcciones, de la mejor a la más segura: la de 640 px SÓLO si el original es más grande
         (si no, Wikimedia no la genera y la foto sale rota), luego la miniatura tal cual, luego el original */
      const fuentes = [];
      if(mini && mini.source && orig && orig.width >= 700 && /\/\d+px-/.test(mini.source)) fuentes.push(mini.source.replace(/\/(\d+)px-/, '/640px-'));
      if(mini && mini.source) fuentes.push(mini.source);
      if(orig && orig.source && !/\.svg$/i.test(orig.source) && (orig.width || 0) <= 2400) fuentes.push(orig.source);
      return { src: fuentes[0], fuentes, titulo: j.title || titulo, pagina: (j.content_urls && j.content_urls.mobile && j.content_urls.mobile.page) || `https://es.wikipedia.org/wiki/${encodeURIComponent(titulo)}` };
    }catch{ return null; }
  })();
  fotosVistas.set(titulo, p); return p;
}

/* ══ 6 · EL PIZARRÓN INFINITO: mundo, cámara, cursores ═══════════════════ */
const FLECHA_RATON = '<path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"/>';
const NOMBRES = ['Negro', 'Paulina', 'Sylcred', 'Luna', 'Godines'];
const COLORES_CURSOR = ['#7E1735', '#AC27FF', '#1F5BD1', '#13805A', '#C2560A', '#5E2387', '#D9433A', '#0E8A9A'];
export const MODOS_CURSORES = { uno: 1, varios: 4, monton: 16 };

export function crearLienzo(vista, { modo = 'monton', maestro = 'Negro', alMoverCamara, alClic, alTerminar } = {}){
  vista.classList.add('lienzo');
  vista.innerHTML = `<div class="mundo"><svg class="conectores" aria-hidden="true"></svg></div><div class="cursores" aria-hidden="true"></div>`;
  const mundo = vista.firstElementChild, conectores = mundo.firstElementChild, capaCur = vista.lastElementChild;
  const cam = { x: 16, y: 16, s: 1, tx: 16, ty: 16, ts: 1, libre: false };
  const piezas = [];
  let cols = 1, colW = 360, gap = 44, alturas = [0], margenAbajo = 0, margenArriba = 0;
  let gen = 0, corriendo = false, ultimoT = 0, foco = null;
  const activos = new Set();
  const cursores = [];

  function medidas(){
    const vw = vista.clientWidth;
    cols = vw >= 1100 ? 3 : vw >= 700 ? 2 : 1;
    colW = cols === 1 ? Math.min(560, vw - 28) : Math.min(420, (vw - 40 - gap * (cols - 1)) / cols);
  }
  medidas(); alturas = new Array(cols).fill(0);
  const anchoDe = (span) => span * colW + (span - 1) * gap;

  /* ── poner un elemento en el mundo ── */
  function poner(z, n){
    const def = ELEMENTOS[z.tipo] || ELEMENTOS.texto;
    const seccion = !!def.seccion;
    const span = seccion ? cols : Math.min(cols, ancho2.has(z.tipo) || z.ancho === 'doble' ? 2 : 1);
    const w = anchoDe(span);
    const el = document.createElement('div'); el.className = 'el ' + z.tipo; el.style.width = w + 'px'; el.style.visibility = 'hidden';
    el.style.left = '0px'; el.style.top = (Math.max(...alturas) + 4000) + 'px';
    mundo.append(el);
    semilla = 7919 * (n + 1) + 104729;
    const tinta = TINTAS[n % TINTAS.length], tinta2 = TINTAS[(n + 2) % TINTAS.length];
    const ctx = { n, tinta, tinta2, pedazo: MODOS_CURSORES[modo] > 1 ? 70 : 0 };
    let tareas = [];
    try{ tareas = def.armar(el, w, z, ctx) || []; }
    catch(e){ console.warn('No pude armar', z.tipo, e); const b = base(el, `<p class="p" data-b>${marcar(z.texto || z.titulo || z.centro || '')}</p>`); tareas = tareasTexto(el, b.svg, ctx); }
    const h = el.offsetHeight;
    /* dónde cae: un título abre fila nueva a todo lo ancho; lo demás va a la columna más baja */
    let c = 0, y;
    if(seccion){ y = Math.max(...alturas) + (piezas.length ? gap * 1.3 : 0); alturas = alturas.map(() => y + h); }
    else {
      let mejor = Infinity;
      for(let i = 0; i + span <= cols; i++){ const m = Math.max(...alturas.slice(i, i + span)); if(m < mejor - 1){ mejor = m; c = i; } }
      y = mejor + (piezas.length ? gap : 0);
      for(let i = c; i < c + span; i++) alturas[i] = y + h;
    }
    const x = c * (colW + gap);
    el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.visibility = '';
    const p = { el, x, y, w, h, z, n, tareas };
    /* «conecta»: una flecha de la pieza anterior a ésta, como en un pizarrón donde todo se relaciona */
    const ant = piezas[piezas.length - 1];
    if(z.conecta && ant){
      const a = [ant.x + ant.w / 2, ant.y + ant.h + 4], b = [x + w / 2, y - 6];
      const lado = Math.abs(a[0] - b[0]) > 10;
      const pa = svgEl('path', { d: lado ? flecha(ant.x + ant.w + 4, ant.y + ant.h / 2, x - 6, y + 20, { curva: .15 }) : flecha(a[0], a[1], b[0], b[1], { curva: .05 }), fill: 'none', stroke: tinta.t, 'stroke-width': 2.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      conectores.append(pa);
      const tr = tTrazo(pa, 0); tr.abs = true; p.tareas.unshift(tr); p.conector = pa;
    }
    piezas.push(p);
    actualizarTamMundo();
    return p;
  }
  function actualizarTamMundo(){
    const W = cols * colW + (cols - 1) * gap, H = Math.max(...alturas) + 400;
    conectores.setAttribute('width', W); conectores.setAttribute('height', H); conectores.style.width = W + 'px'; conectores.style.height = H + 'px';
  }
  function quitarDesde(i){
    while(piezas.length && piezas[piezas.length - 1].n >= i){ const p = piezas.pop(); p.el.remove(); p.conector?.remove(); }
    /* las columnas se vuelven a medir con lo que quedó */
    alturas = new Array(cols).fill(0);
    for(const p of piezas){ const c0 = Math.round(p.x / (colW + gap)), span = Math.round((p.w + gap) / (colW + gap)); for(let k = c0; k < c0 + span && k < cols; k++) alturas[k] = Math.max(alturas[k], p.y + p.h); }
  }
  function limpiar(){
    gen++; for(const a of [...activos]) a.forzar(); activos.clear();
    piezas.length = 0; mundo.querySelectorAll('.el').forEach((e) => e.remove()); conectores.innerHTML = '';
    for(const c of cursores.splice(1)) c.nodo.remove();
    medidas(); alturas = new Array(cols).fill(0); foco = null; cam.libre = false;
  }

  /* ── cursores ── */
  function nuevoCursor(nombre, color, desde){
    const nodo = document.createElement('div'); nodo.className = 'cur';
    nodo.innerHTML = `<svg viewBox="0 0 24 24"><g fill="${color}" stroke="#fff" stroke-width="1.6" stroke-linejoin="round">${FLECHA_RATON}</g></svg>${nombre ? `<span class="etq" style="background:${color}">${esc(nombre)}</span>` : ''}`;
    capaCur.append(nodo);
    const c = { nodo, x: desde[0], y: desde[1], color, nombre, visible: true };
    cursores.push(c); return c;
  }
  function principal(){
    if(!cursores[0]){ const v = aMundo(vista.clientWidth * .85, vista.clientHeight * .3); nuevoCursor(maestro, COLORES_CURSOR[0], v); }
    return cursores[0];
  }
  const aMundo = (sx, sy) => [(sx - cam.x) / cam.s, (sy - cam.y) / cam.s];
  function desdeOrilla(){
    const vw = vista.clientWidth, vh = vista.clientHeight, lado = Math.floor(azar() * 4);
    const s = lado === 0 ? [-30, azar() * vh] : lado === 1 ? [vw + 30, azar() * vh] : lado === 2 ? [azar() * vw, -30] : [azar() * vw, vh + 30];
    return aMundo(s[0], s[1]);
  }
  function clic(c){
    alClic && alClic();
    const r = document.createElement('i'); r.className = 'clic'; r.style.borderColor = c.color;
    r.style.transform = `translate3d(${f1(cam.x + c.x * cam.s)}px, ${f1(cam.y + c.y * cam.s)}px, 0)`;
    capaCur.append(r); setTimeout(() => r.remove(), 340);
  }

  /* ── un solo bucle ── */
  function arrancar(){ if(!corriendo){ corriendo = true; ultimoT = performance.now(); requestAnimationFrame(bucle); } }
  function anima(dur, fn, g){
    return new Promise((listo) => {
      const a = { t0: null, forzar(){ fn(1); listo(); },
        actualizar(now){ if(g !== gen){ fn(1); listo(); return true; } if(this.t0 == null) this.t0 = now; const k = dur <= 0 ? 1 : Math.min(1, (now - this.t0) / dur); fn(k); if(k >= 1){ listo(); return true; } return false; } };
      activos.add(a); arrancar();
    });
  }
  function bucle(now){
    const dt = Math.min(64, now - ultimoT); ultimoT = now;
    for(const a of [...activos]) if(a.actualizar(now)) activos.delete(a);
    /* la cámara: sigue a los cursores que trabajan, sin brincos */
    if(!cam.libre && foco) apuntar();
    const kk = 1 - Math.exp(-dt / 260);
    const mov = Math.abs(cam.tx - cam.x) + Math.abs(cam.ty - cam.y) + Math.abs(cam.ts - cam.s) * 400;
    if(mov > .05){ cam.x += (cam.tx - cam.x) * kk; cam.y += (cam.ty - cam.y) * kk; cam.s += (cam.ts - cam.s) * kk; ponerCamara(); }
    for(const c of cursores){ const t = `translate3d(${f1(cam.x + c.x * cam.s)}px, ${f1(cam.y + c.y * cam.s)}px, 0)`; if(c._t !== t){ c.nodo.style.transform = t; c._t = t; } }
    if(activos.size || mov > .05) requestAnimationFrame(bucle); else corriendo = false;
  }
  function ponerCamara(){
    mundo.style.transform = `translate3d(${f1(cam.x)}px, ${f1(cam.y)}px, 0) scale(${Math.round(cam.s * 1000) / 1000})`;
    vista.style.backgroundPosition = `${f1(cam.x)}px ${f1(cam.y)}px`; vista.style.backgroundSize = `${f1(24 * cam.s)}px ${f1(24 * cam.s)}px`;
    alMoverCamara && alMoverCamara(cam);
  }
  /* a dónde mira la cámara: la pieza que se dibuja; si es más alta que la pantalla, baja con los cursores */
  function apuntar(){
    const p = foco; if(!p) return;
    const vw = vista.clientWidth, vh = vista.clientHeight - margenAbajo - margenArriba;
    const s = lim((vw - 24) / p.w, .32, 1.12) * empuje;
    cam.ts = s; cam.tx = vw / 2 - (p.x + p.w / 2) * s;
    if(p.h * s <= vh - 20) cam.ty = margenArriba + (vh - p.h * s) / 2 - p.y * s;
    else {
      const trab = cursores.filter((c) => c.trabajando), cy = trab.length ? trab.reduce((a, c) => a + c.y, 0) / trab.length : p.y;
      const ty = margenArriba + vh * .45 - cy * s;
      cam.ty = lim(ty, margenArriba + vh - (p.y + p.h) * s - 16, margenArriba + 12 - p.y * s);
    }
  }
  function enfocar(p, inmediato = false){
    foco = p; cam.libre = false; apuntar();
    if(inmediato){ cam.x = cam.tx; cam.y = cam.ty; cam.s = cam.ts; ponerCamara(); }
    arrancar();
  }

  /* ── dibujar una pieza con todos sus cursores ── */
  let turnoDibujo = 0;
  function retirarMaestro(miTurno){
    setTimeout(() => {
      const c = cursores[0];
      if(!c || miTurno !== turnoDibujo || c.trabajando || c.fuera) return;
      const [x, y] = desdeOrilla(), ox = c.x, oy = c.y, g = gen;
      c.fuera = true;
      anima(650, (k) => { const e = k * k * (3 - 2 * k); c.x = ox + (x - ox) * e; c.y = oy + (y - oy) * e; }, g);
    }, 900);
  }
  async function dibujar(p, durObjetivo = 6000){
    const g = gen; foco = p; arrancar();
    const miTurno = ++turnoDibujo; if(cursores[0]) cursores[0].fuera = false;
    const fases = [...new Set(p.tareas.map((t) => t.fase))].sort((a, b) => a - b);
    const maxK = MODOS_CURSORES[modo] || 1;
    /* ¿cuánto tardaría a velocidad normal? Si se pasa de lo que dura la voz, todo va más rápido (nunca más lento) */
    let estimado = 0;
    for(const f of fases){ const ts = p.tareas.filter((t) => t.fase === f), k = Math.min(maxK, ts.length); const suma = ts.reduce((a, t) => a + t.dur + 160, 0); estimado += Math.max(...ts.map((t) => t.dur), suma / k); }
    /* el dibujo ocupa buena parte de lo que dura la voz: si iba a acabar muy pronto se va más despacio
       (hasta 1.8 veces), y si no le alcanza el tiempo, más rápido (nunca más de 4 veces) */
    const prisa = lim(estimado / Math.max(1500, durObjetivo * .7), .55, 4);
    principal().trabajando = false;
    for(const f of fases){
      if(g !== gen) break;
      const cola = p.tareas.filter((t) => t.fase === f);
      const k = Math.min(maxK, cola.length);
      const equipo = [principal()];
      const otros = NOMBRES.filter((x) => x !== maestro);
      while(equipo.length < k){ const i = equipo.length; equipo.push(cursores.find((c) => !c.ocupado && !equipo.includes(c)) || nuevoCursor(otros[i - 1] || '', COLORES_CURSOR[i % COLORES_CURSOR.length], desdeOrilla())); }
      equipo.forEach((c) => { c.ocupado = true; });
      await Promise.all(equipo.map((c) => trabajador(c, cola, p, prisa, g)));
      equipo.forEach((c) => { c.ocupado = false; c.trabajando = false; });
    }
    /* si lo cortaron a la mitad (pausa, «siguiente»), la pieza se termina de golpe: nunca se queda a medias */
    if(g !== gen) dibujarYa(p);
    /* los ayudantes se van por la orilla; el maestro se queda */
    despedir(g); retirarMaestro(miTurno);
    if(g === gen && alTerminar) alTerminar(p);
    return g === gen;
  }
  async function trabajador(c, cola, p, prisa, g){
    while(cola.length && g === gen){
      const t = cola.shift();
      t.ini && t.ini();
      const abs = (q) => { const [x, y] = t.punto(q); return t.abs ? [x, y] : [p.x + x, p.y + y]; };
      const [x0, y0] = abs(0);
      const dist = Math.hypot(x0 - c.x, y0 - c.y), dur = lim(dist / 1.5, 140, 520) / Math.sqrt(prisa);
      const ox = c.x, oy = c.y;
      c.trabajando = true;
      await anima(dur, (k) => { const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; c.x = ox + (x0 - ox) * e; c.y = oy + (y0 - oy) * e; }, g);
      if(g !== gen){ t.fin(); break; }
      clic(c);
      await anima(t.dur / prisa, (k) => { t.paso(k); const [x, y] = abs(k); c.x = x; c.y = y; }, g);
      t.fin();
    }
    while(cola.length){ const t = cola.shift(); t.ini && t.ini(); t.fin(); }
  }
  function despedir(g){
    for(const c of cursores.slice(1)){ if(c.ocupado) continue;
      const [x, y] = desdeOrilla(), ox = c.x, oy = c.y;
      c.ocupado = true;
      anima(420, (k) => { c.x = ox + (x - ox) * k * k; c.y = oy + (y - oy) * k * k; }, g).then(() => { const i = cursores.indexOf(c); if(i > 0){ cursores.splice(i, 1); c.nodo.remove(); } }); }
  }
  function dibujarYa(p){ for(const t of p.tareas){ t.ini && t.ini(); t.fin(); } }
  function detener(){ gen++; for(const a of [...activos]) a.forzar(); activos.clear(); }

  /* ── la pantalla no se queda quieta mientras la voz sigue ──
     Carlos, 13 nov: «que no se quede tanto tiempo la pantalla quieta mientras explica algo».
     Ya dibujada la pieza, el maestro va señalando lo importante (lo marcado, las viñetas, los
     nodos) con un halo que late, y la cámara se acerca poquito y despacio. Regresa con qué parar. */
  let empuje = 1;
  function recorrer(p){
    if(!p || !p.el) return () => {};
    const g = gen; let vivo = true;
    turnoDibujo++;                       // así no se retira el maestro a media explicación
    const c = principal(); c.fuera = false;
    const r0 = p.el.getBoundingClientRect(), k0 = cam.s || 1, pts = [];
    for(const n of p.el.querySelectorAll('mark, .m, .bala, li, .nodo, .ev, .celda, h3, b, .p')){
      const r = n.getBoundingClientRect(); if(r.width < 3 || r.height < 3) continue;
      pts.push([p.x + (r.left - r0.left + Math.min(r.width, 180) * .5) / k0, p.y + (r.top - r0.top + r.height * .6) / k0]);
      if(pts.length >= 12) break;
    }
    if(pts.length < 3) for(let i = 0; i < 4; i++) pts.push([p.x + p.w * (.2 + .6 * ((i * .37) % 1)), p.y + p.h * (.2 + .6 * (i / 3))]);
    const halo = document.createElement('div'); halo.className = 'halo'; mundo.append(halo);
    const t0 = performance.now();
    anima(9000, (k) => { empuje = 1 + .055 * (k * k * (3 - 2 * k)); }, g);
    (async () => {
      for(let i = 0; vivo && g === gen; i++){
        const [x, y] = pts[i % pts.length], ox = c.x, oy = c.y;
        const d = Math.hypot(x - ox, y - oy), dur = lim(d * 2.2, 520, 1100);
        await anima(dur, (k) => { const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; c.x = ox + (x - ox) * e; c.y = oy + (y - oy) * e + Math.sin(k * Math.PI) * -14; }, g);
        if(!vivo || g !== gen) break;
        halo.style.transform = `translate3d(${f1(x)}px, ${f1(y)}px, 0)`; halo.classList.remove('v'); void halo.offsetWidth; halo.classList.add('v');
        await anima(900 + (i % 3) * 260, () => {}, g);
      }
    })();
    return () => { vivo = false; halo.classList.remove('v'); setTimeout(() => halo.remove(), 450); empuje = 1; arrancar(); return performance.now() - t0; };
  }

  /* ── ver todo / seguir / gestos ── */
  function caja0(){ if(!piezas.length) return null; const x0 = Math.min(...piezas.map((p) => p.x)), y0 = Math.min(...piezas.map((p) => p.y)), x1 = Math.max(...piezas.map((p) => p.x + p.w)), y1 = Math.max(...piezas.map((p) => p.y + p.h)); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }
  function verTodo(){
    const b = caja0(); if(!b) return;
    const vw = vista.clientWidth, vh = vista.clientHeight - margenAbajo - margenArriba;
    let s = lim(Math.min((vw - 24) / b.w, (vh - 24) / b.h), .12, 1.1);
    if(s < .34) s = lim(Math.min((vw - 24) / b.w, 1.1) * .62, .2, 1.1);
    cam.libre = true; foco = null; cam.ts = s; cam.tx = (vw - b.w * s) / 2 - b.x * s; cam.ty = margenArriba + (b.h * s < vh ? (vh - b.h * s) / 2 : 12) - b.y * s; arrancar();
  }
  function seguir(){ cam.libre = false; if(foco) apuntar(); else if(piezas.length) enfocar(piezas[piezas.length - 1]); arrancar(); }
  /* arrastrar, pellizcar, rueda, doble toque */
  const dedos = new Map(); let base0 = null, ultimoToque = 0;
  vista.addEventListener('pointerdown', (e) => {
    if(e.target.closest('button, a, input, .ver-resp')) return;
    dedos.set(e.pointerId, [e.clientX, e.clientY]);
    try{ vista.setPointerCapture(e.pointerId); }catch{}
    base0 = { cx: cam.x, cy: cam.y, cs: cam.s, dedos: new Map(dedos) };
    const ahora = performance.now();
    if(dedos.size === 1 && ahora - ultimoToque < 300){ dobleToque(e); }
    ultimoToque = ahora;
  });
  vista.addEventListener('pointermove', (e) => {
    if(!dedos.has(e.pointerId) || !base0) return;
    dedos.set(e.pointerId, [e.clientX, e.clientY]);
    const r = vista.getBoundingClientRect();
    const ps = [...dedos.values()], qs = [...base0.dedos.values()];
    if(ps.length === 1 && qs.length >= 1){
      const dx = ps[0][0] - qs[0][0], dy = ps[0][1] - qs[0][1];
      if(Math.abs(dx) + Math.abs(dy) < 4 && !cam.libre) return;
      soltarCamara(); cam.tx = cam.x = base0.cx + dx; cam.ty = cam.y = base0.cy + dy; ponerCamara(); arrancar();
    } else if(ps.length >= 2 && qs.length >= 2){
      const d0 = Math.hypot(qs[0][0] - qs[1][0], qs[0][1] - qs[1][1]), d1 = Math.hypot(ps[0][0] - ps[1][0], ps[0][1] - ps[1][1]);
      const m0 = [(qs[0][0] + qs[1][0]) / 2 - r.left, (qs[0][1] + qs[1][1]) / 2 - r.top], m1 = [(ps[0][0] + ps[1][0]) / 2 - r.left, (ps[0][1] + ps[1][1]) / 2 - r.top];
      const s = lim(base0.cs * d1 / (d0 || 1), .12, 3);
      const wx = (m0[0] - base0.cx) / base0.cs, wy = (m0[1] - base0.cy) / base0.cs;
      soltarCamara(); cam.s = cam.ts = s; cam.x = cam.tx = m1[0] - wx * s; cam.y = cam.ty = m1[1] - wy * s; ponerCamara(); arrancar();
    }
  });
  const soltarDedo = (e) => { dedos.delete(e.pointerId); base0 = dedos.size ? { cx: cam.x, cy: cam.y, cs: cam.s, dedos: new Map(dedos) } : null; };
  vista.addEventListener('pointerup', soltarDedo); vista.addEventListener('pointercancel', soltarDedo);
  vista.addEventListener('wheel', (e) => {
    e.preventDefault(); soltarCamara();
    if(e.ctrlKey || e.metaKey){ const r = vista.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, s = lim(cam.s * Math.exp(-e.deltaY * .01), .12, 3);
      const wx = (mx - cam.x) / cam.s, wy = (my - cam.y) / cam.s; cam.s = cam.ts = s; cam.x = cam.tx = mx - wx * s; cam.y = cam.ty = my - wy * s; }
    else { cam.x = cam.tx = cam.x - e.deltaX; cam.y = cam.ty = cam.y - e.deltaY; }
    ponerCamara(); arrancar();
  }, { passive: false });
  function soltarCamara(){ if(!cam.libre){ cam.libre = true; vista.dispatchEvent(new CustomEvent('camara-libre')); } }
  function dobleToque(e){
    const r = vista.getBoundingClientRect(), [wx, wy] = aMundo(e.clientX - r.left, e.clientY - r.top);
    const p = piezas.find((q) => wx >= q.x && wx <= q.x + q.w && wy >= q.y && wy <= q.y + q.h);
    if(p){ foco = p; cam.libre = true; const vw = vista.clientWidth, vh = vista.clientHeight - margenAbajo - margenArriba, s = lim(Math.min((vw - 24) / p.w, (vh - 24) / p.h * 1.6), .3, 1.6); cam.ts = s; cam.tx = vw / 2 - (p.x + p.w / 2) * s; cam.ty = margenArriba + 12 - p.y * s; arrancar(); }
  }
  const ro = new ResizeObserver(() => { if(!cam.libre && foco){ apuntar(); arrancar(); } });
  ro.observe(vista);

  return {
    poner, dibujar, dibujarYa, quitarDesde, limpiar, detener, enfocar, verTodo, seguir, recorrer,
    margenes(arriba, abajo){ margenArriba = arriba; margenAbajo = abajo; if(foco && !cam.libre){ apuntar(); arrancar(); } },
    modo(m){ if(MODOS_CURSORES[m]) modo = m; return modo; },
    maestro(nombre){ maestro = nombre; if(cursores[0]){ cursores[0].nombre = nombre; const e = cursores[0].nodo.querySelector('.etq'); if(e) e.textContent = nombre; } },
    get piezas(){ return piezas; }, get libre(){ return cam.libre; }, get camara(){ return { ...cam }; }, get cursores(){ return cursores.length; },
  };
}
