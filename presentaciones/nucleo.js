/* ══════════════════════════════════════════════════════════════════════════
   PRESENTACIONES · el núcleo: abrir un .pptx, entenderlo y cambiarlo en lote
   ──────────────────────────────────────────────────────────────────────────
   Lo pidió Carlos: «una herramienta tipo la de reportes para poder hacer
   presentaciones y editarlas rápido, como funciones para cambiar cientos de
   diapositivas a la vez: cambiar el fondo y así».

   UN .pptx ES UN ZIP DE XML. Aquí no se convierte a otro formato ni se
   «reconstruye»: se abre el zip, se tocan SÓLO los nodos que el cambio pide
   y se vuelve a cerrar. Lo que la herramienta no entiende (animaciones,
   gráficas, notas, SmartArt) pasa intacto. Ésa es la diferencia con los
   editores que importan y exportan: esos pierden lo que no conocen.

   ⚠ POWERPOINT ES ESTRICTO CON EL ORDEN DE LOS HIJOS. Un <a:latin> antes de
   un <a:solidFill> dentro de <a:rPr> es XML válido y PowerPoint lo rechaza
   como «archivo dañado» (LibreOffice lo abre sin chistar, así que probar sólo
   con LibreOffice no basta). Por eso todo lo que se inserta pasa por
   `meterEnOrden()` con el orden del esquema.

   Módulo de navegador (usa DOMParser y el JSZip vendorizado). Lo prueba
   pruebas.mjs dentro de Chromium, contra presentaciones reales.
   ═════════════════════════════════════════════════════════════════════════ */

export const NS = {
  p: 'http://schemas.openxmlformats.org/presentationml/2006/main',
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  rel: 'http://schemas.openxmlformats.org/package/2006/relationships',
  ct: 'http://schemas.openxmlformats.org/package/2006/content-types',
};
const T_IMAGEN = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
const T_LAYOUT = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout';
const T_MASTER = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster';
const T_TEMA = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme';
export const EMU_PT = 12700;

/* ── utilidades de XML ─────────────────────────────────────────────────── */
const hijos = (el, ns, nombre) => el ? [...el.children].filter((c) => c.namespaceURI === ns && c.localName === nombre) : [];
const hijo = (el, ns, nombre) => hijos(el, ns, nombre)[0] || null;
const todos = (el, ns, nombre) => el ? [...el.getElementsByTagNameNS(ns, nombre)] : [];
const nuevo = (doc, ns, nombre, attrs = {}) => {
  const pref = { [NS.a]: 'a:', [NS.p]: 'p:', [NS.r]: 'r:' }[ns] || '';
  const e = doc.createElementNS(ns, pref + nombre);
  for(const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};
/* Orden del esquema para los elementos que esta herramienta inserta. */
const ORDEN_RPR = ['ln', 'noFill', 'solidFill', 'gradFill', 'blipFill', 'pattFill', 'grpFill', 'effectLst', 'effectDag', 'highlight',
  'uLnTx', 'uLn', 'uFillTx', 'uFill', 'latin', 'ea', 'cs', 'sym', 'hlinkClick', 'hlinkMouseOver', 'rtl', 'extLst'];
const ORDEN_CSLD = ['bg', 'spTree', 'custDataLst', 'controls', 'extLst'];
const ORDEN_FUENTES = ['latin', 'ea', 'cs', 'font', 'extLst'];
const RELLENOS = ['noFill', 'solidFill', 'gradFill', 'blipFill', 'pattFill', 'grpFill'];
export function meterEnOrden(padre, el, orden){
  const i = orden.indexOf(el.localName);
  const despues = [...padre.children].find((c) => orden.indexOf(c.localName) > i);
  padre.insertBefore(el, despues || null);
  return el;
}

/* «../media/image1.png» visto desde «ppt/slides/slide1.xml» → «ppt/media/image1.png» */
export function resolver(base, destino){
  if(destino.startsWith('/')) return destino.slice(1);
  const partes = base.split('/').slice(0, -1);
  for(const trozo of destino.split('/')){
    if(trozo === '..') partes.pop(); else if(trozo !== '.') partes.push(trozo);
  }
  return partes.join('/');
}
const relsDe = (ruta) => { const p = ruta.split('/'); const f = p.pop(); return [...p, '_rels', f + '.rels'].join('/'); };
function relativa(desde, hacia){
  const a = desde.split('/').slice(0, -1), b = hacia.split('/');
  while(a.length && b.length > 1 && a[0] === b[0]){ a.shift(); b.shift(); }
  return [...a.map(() => '..'), ...b].join('/');
}

/* ══ ABRIR ════════════════════════════════════════════════════════════════ */
export async function abrir(datos, JSZipClase = globalThis.JSZip){
  const zip = await JSZipClase.loadAsync(datos);
  const deck = { zip, partes: new Map(), sucias: new Set(), medios: new Map(), urls: new Map(), deshacer: [], _grabando: null };
  const pres = await parte(deck, 'ppt/presentation.xml');
  if(!pres) throw new Error('Eso no es una presentación de PowerPoint (.pptx).');
  const tam = todos(pres.documentElement, NS.p, 'sldSz')[0];
  deck.ancho = Number(tam?.getAttribute('cx')) || 12192000;
  deck.alto = Number(tam?.getAttribute('cy')) || 6858000;
  await leerLaminas(deck);
  return deck;
}
/* La lista de láminas sale de presentation.xml (el orden) y de sus
   relaciones. Se relee al deshacer una lámina nueva. */
async function leerLaminas(deck){
  const pres = await parte(deck, 'ppt/presentation.xml');
  const rels = await relaciones(deck, 'ppt/presentation.xml');
  deck.laminas = [];
  for(const s of todos(pres.documentElement, NS.p, 'sldId')){
    const destino = rels.get(s.getAttributeNS(NS.r, 'id'));
    if(destino) deck.laminas.push({ ruta: destino.ruta });
  }
  for(const l of deck.laminas){
    await parte(deck, l.ruta);
    const rs = await relaciones(deck, l.ruta);
    l.diseno = [...rs.values()].find((x) => x.tipo === T_LAYOUT)?.ruta || null;
    if(l.diseno){
      await parte(deck, l.diseno);
      l.maestro = [...(await relaciones(deck, l.diseno)).values()].find((x) => x.tipo === T_MASTER)?.ruta || null;
      if(l.maestro){
        await parte(deck, l.maestro);
        l.tema = [...(await relaciones(deck, l.maestro)).values()].find((x) => x.tipo === T_TEMA)?.ruta || null;
        if(l.tema) await parte(deck, l.tema);
      }
    }
  }
}

/* Las partes se leen una vez y se quedan como documento: así cien cambios
   seguidos no parsean cien veces lo mismo. */
export async function parte(deck, ruta){
  if(deck.partes.has(ruta)) return deck.partes.get(ruta);
  const f = deck.zip.file(ruta);
  if(!f) return null;
  const doc = new DOMParser().parseFromString(await f.async('string'), 'application/xml');
  deck.partes.set(ruta, doc);
  return doc;
}
export async function relaciones(deck, ruta){
  const doc = await parte(deck, relsDe(ruta));
  const m = new Map();
  if(!doc) return m;
  for(const r of todos(doc.documentElement, NS.rel, 'Relationship')){
    const destino = r.getAttribute('Target'), externa = r.getAttribute('TargetMode') === 'External';
    m.set(r.getAttribute('Id'), { id: r.getAttribute('Id'), tipo: r.getAttribute('Type'), ruta: externa ? destino : resolver(ruta, destino), externa });
  }
  return m;
}
const docDe = (deck, ruta) => deck.partes.get(ruta);

/* ══ DESHACER ═════════════════════════════════════════════════════════════
   Cada cambio es una «operación»: antes de tocar una parte se guarda cómo
   estaba. Deshacer la devuelve tal cual, byte por byte. */
export async function operacion(deck, nombre, fn){
  const antes = { nombre, partes: new Map(), medios: new Map() };
  deck._grabando = antes;
  try{ const r = await fn(); if(antes.partes.size || antes.medios.size) deck.deshacer.push(antes); return r; }
  finally{ deck._grabando = null; }
}
function tocar(deck, ruta){
  const g = deck._grabando;
  if(g && !g.partes.has(ruta)){
    const doc = deck.partes.get(ruta);
    g.partes.set(ruta, doc ? { xml: new XMLSerializer().serializeToString(doc), sucia: deck.sucias.has(ruta) } : null);
  }
  deck.sucias.add(ruta);
}
async function tocarMedio(deck, ruta){
  const g = deck._grabando;
  if(g && !g.medios.has(ruta)){
    const f = deck.zip.file(ruta);
    g.medios.set(ruta, f ? await f.async('uint8array') : null);
  }
}
export async function deshacer(deck){
  const op = deck.deshacer.pop();
  if(!op) return null;
  for(const [ruta, antes] of op.partes){
    if(antes === null){ deck.partes.delete(ruta); deck.zip.remove(ruta); deck.sucias.delete(ruta); continue; }
    deck.partes.set(ruta, new DOMParser().parseFromString(antes.xml, 'application/xml'));
    if(!antes.sucia) deck.sucias.delete(ruta);
    deck.zip.file(ruta, antes.xml);
  }
  for(const [ruta, bytes] of op.medios){
    if(bytes === null) deck.zip.remove(ruta); else deck.zip.file(ruta, bytes);
    soltarUrl(deck, ruta);
  }
  if(op.partes.has('ppt/presentation.xml')) await leerLaminas(deck);
  return op.nombre;
}

/* ══ GUARDAR ══════════════════════════════════════════════════════════════ */
export async function guardar(deck){
  const ser = new XMLSerializer();
  for(const ruta of deck.sucias){
    const doc = deck.partes.get(ruta);
    if(!doc) continue;
    let xml = ser.serializeToString(doc);
    if(!xml.startsWith('<?xml')) xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + xml;
    deck.zip.file(ruta, xml);
  }
  return deck.zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', compression: 'DEFLATE' });
}

/* ══ LAS LÁMINAS: A QUIÉN SE LE APLICA ════════════════════════════════════ */
export const cuales = (deck, sel) => sel === 'todas' || sel == null ? deck.laminas.map((_, i) => i)
  : [...new Set((Array.isArray(sel) ? sel : [sel]).map(Number).filter((i) => i >= 0 && i < deck.laminas.length))];

/* ══ COLORES ══════════════════════════════════════════════════════════════ */
const hex6 = (c) => { const h = String(c || '').replace(/^#/, '').trim(); return /^[0-9a-f]{6}$/i.test(h) ? h.toUpperCase() : /^[0-9a-f]{3}$/i.test(h) ? h.split('').map((x) => x + x).join('').toUpperCase() : null; };
export { hex6 };
function aHsl(h){
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if(mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
  const hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [hh / 6, s, l];
}
function deHsl([h, s, l]){
  const f = (p, q, t) => { if(t < 0) t += 1; if(t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  let r, g, b;
  if(!s){ r = g = b = l; } else { const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; r = f(p, q, h + 1 / 3); g = f(p, q, h); b = f(p, q, h - 1 / 3); }
  return [r, g, b].map((x) => Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}
function ajustar(h, el){
  let [hh, s, l] = aHsl(h);
  for(const m of el.children){
    const v = Number(m.getAttribute('val')) / 100000;
    if(m.localName === 'lumMod') l *= v;
    else if(m.localName === 'lumOff') l += v;
    else if(m.localName === 'tint') l = l + (1 - l) * (1 - v);
    else if(m.localName === 'shade') l *= v;
    else if(m.localName === 'satMod') s *= v;
  }
  return deHsl([hh, s, Math.min(1, Math.max(0, l))]);
}
/* El esquema de color del tema, ya con el mapa del maestro (bg1 → lt1…). */
function paleta(deck, lamina){
  const tema = lamina.tema && docDe(deck, lamina.tema), maestro = lamina.maestro && docDe(deck, lamina.maestro);
  const esq = {};
  const cs = tema && todos(tema.documentElement, NS.a, 'clrScheme')[0];
  if(cs) for(const c of cs.children){
    const v = c.firstElementChild;
    esq[c.localName] = v?.localName === 'sysClr' ? (v.getAttribute('lastClr') || '000000') : (v?.getAttribute('val') || '000000');
  }
  const mapa = maestro && todos(maestro.documentElement, NS.p, 'clrMap')[0];
  const m = (k, def) => mapa?.getAttribute(k) || def;
  return { ...esq, bg1: esq[m('bg1', 'lt1')], tx1: esq[m('tx1', 'dk1')], bg2: esq[m('bg2', 'lt2')], tx2: esq[m('tx2', 'dk2')] };
}
/* De un nodo con color adentro (<a:solidFill>, <p:bgRef>…) a «#RRGGBB». */
function colorDe(el, pal){
  if(!el) return null;
  const c = [...el.children].find((x) => ['srgbClr', 'schemeClr', 'sysClr', 'prstClr', 'scrgbClr', 'hslClr'].includes(x.localName));
  if(!c) return null;
  let h = null;
  if(c.localName === 'srgbClr') h = c.getAttribute('val');
  else if(c.localName === 'schemeClr') h = pal[c.getAttribute('val')] || null;
  else if(c.localName === 'sysClr') h = c.getAttribute('lastClr') || (c.getAttribute('val') === 'window' ? 'FFFFFF' : '000000');
  else if(c.localName === 'prstClr') h = { white: 'FFFFFF', black: '000000', red: 'FF0000', blue: '0000FF', green: '008000', yellow: 'FFFF00', gray: '808080' }[c.getAttribute('val')] || '808080';
  if(!h) return null;
  const alfa = [...c.children].find((x) => x.localName === 'alpha');
  return { hex: '#' + ajustar(h.toUpperCase(), c), alfa: alfa ? Number(alfa.getAttribute('val')) / 100000 : 1 };
}

/* ══ MEDIOS (imágenes) ════════════════════════════════════════════════════ */
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', svg: 'image/svg+xml', webp: 'image/webp', tif: 'image/tiff', tiff: 'image/tiff', emf: 'image/x-emf', wmf: 'image/x-wmf' };
export const mimeDe = (ruta) => MIME[ruta.split('.').pop().toLowerCase()] || 'application/octet-stream';
export async function urlDe(deck, ruta){
  if(deck.urls.has(ruta)) return deck.urls.get(ruta);
  const f = deck.zip.file(ruta);
  if(!f) return null;
  const u = URL.createObjectURL(new Blob([await f.async('uint8array')], { type: mimeDe(ruta) }));
  deck.urls.set(ruta, u);
  return u;
}
function soltarUrl(deck, ruta){ const u = deck.urls.get(ruta); if(u){ URL.revokeObjectURL(u); deck.urls.delete(ruta); } }

/* Todas las imágenes de la presentación con dónde se usan. Una misma imagen
   en cuarenta láminas es UNA entrada: cambiarla aquí la cambia en las cuarenta. */
export async function imagenes(deck){
  const usos = new Map();
  const anota = (ruta, i, donde) => { if(!usos.has(ruta)) usos.set(ruta, { ruta, laminas: new Set(), donde: new Set() }); const u = usos.get(ruta); if(i != null) u.laminas.add(i); u.donde.add(donde); };
  for(const [i, l] of deck.laminas.entries()){
    for(const r of (await relaciones(deck, l.ruta)).values()) if(r.tipo === T_IMAGEN && !r.externa) anota(r.ruta, i, 'lámina');
  }
  const disenos = new Set(deck.laminas.flatMap((l) => [l.diseno, l.maestro]).filter(Boolean));
  for(const d of disenos) for(const r of (await relaciones(deck, d)).values()) if(r.tipo === T_IMAGEN && !r.externa){
    const quienes = deck.laminas.map((l, i) => (l.diseno === d || l.maestro === d) ? i : null).filter((x) => x != null);
    quienes.forEach((i) => anota(r.ruta, i, 'plantilla'));
    if(!quienes.length) anota(r.ruta, null, 'plantilla');
  }
  const salida = [];
  for(const u of usos.values()){
    const f = deck.zip.file(u.ruta);
    if(!f) continue;
    salida.push({ ruta: u.ruta, laminas: [...u.laminas].sort((a, b) => a - b), enPlantilla: u.donde.has('plantilla'), bytes: f._data?.uncompressedSize || 0, mime: mimeDe(u.ruta) });
  }
  return salida.sort((a, b) => b.laminas.length - a.laminas.length || a.ruta.localeCompare(b.ruta));
}

async function asegurarTipo(deck, ext){
  const ruta = '[Content_Types].xml', doc = await parte(deck, ruta);
  const raiz = doc.documentElement;
  if(todos(raiz, NS.ct, 'Default').some((d) => d.getAttribute('Extension').toLowerCase() === ext)) return;
  tocar(deck, ruta);
  const d = doc.createElementNS(NS.ct, 'Default');
  d.setAttribute('Extension', ext); d.setAttribute('ContentType', MIME[ext] || 'application/octet-stream');
  raiz.insertBefore(d, raiz.firstElementChild);
}
const extDe = (mime) => ({ 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/gif': 'gif', 'image/svg+xml': 'svg' }[mime] || 'png');
async function medioNuevo(deck, bytes, mime){
  const ext = extDe(mime);
  let n = 1; while(deck.zip.file(`ppt/media/mazi${n}.${ext}`)) n++;
  const ruta = `ppt/media/mazi${n}.${ext}`;
  await tocarMedio(deck, ruta);
  deck.zip.file(ruta, bytes);
  await asegurarTipo(deck, ext);
  return ruta;
}
async function relNueva(deck, desde, tipo, destino){
  const rr = relsDe(desde);
  let doc = await parte(deck, rr);
  if(!doc){
    doc = new DOMParser().parseFromString(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS.rel}"/>`, 'application/xml');
    deck.partes.set(rr, doc);
    if(deck._grabando && !deck._grabando.partes.has(rr)) deck._grabando.partes.set(rr, null);
  }
  tocar(deck, rr);
  const ids = todos(doc.documentElement, NS.rel, 'Relationship').map((r) => Number(r.getAttribute('Id').replace(/\D/g, '')) || 0);
  const id = 'rId' + (Math.max(0, ...ids) + 1);
  const e = doc.createElementNS(NS.rel, 'Relationship');
  e.setAttribute('Id', id); e.setAttribute('Type', tipo); e.setAttribute('Target', relativa(desde, destino));
  doc.documentElement.appendChild(e);
  return id;
}

/* ══ OPERACIÓN · FONDO ════════════════════════════════════════════════════
   fondo: { color } · { colores:[a,b], angulo } · { imagen:{ bytes, mime } }
   `enPlantilla: true` lo pone también en los diseños y maestros, para que las
   láminas nuevas nazcan con él. */
export async function ponerFondo(deck, sel, fondo, { enPlantilla = false } = {}){
  const idx = cuales(deck, sel);
  let rutaImg = null;
  if(fondo.imagen) rutaImg = await medioNuevo(deck, fondo.imagen.bytes, fondo.imagen.mime);
  const rutas = new Set(idx.map((i) => deck.laminas[i].ruta));
  if(enPlantilla) idx.forEach((i) => { const l = deck.laminas[i]; if(l.diseno) rutas.add(l.diseno); if(l.maestro) rutas.add(l.maestro); });
  for(const ruta of rutas){
    const doc = docDe(deck, ruta);
    const csld = todos(doc.documentElement, NS.p, 'cSld')[0];
    if(!csld) continue;
    tocar(deck, ruta);
    hijos(csld, NS.p, 'bg').forEach((b) => b.remove());
    const bg = nuevo(doc, NS.p, 'bg'), pr = nuevo(doc, NS.p, 'bgPr');
    if(rutaImg){
      const id = await relNueva(deck, ruta, T_IMAGEN, rutaImg);
      const bf = nuevo(doc, NS.a, 'blipFill', { dpi: '0', rotWithShape: '1' });
      const blip = nuevo(doc, NS.a, 'blip'); blip.setAttributeNS(NS.r, 'r:embed', id);
      const st = nuevo(doc, NS.a, 'stretch'); st.appendChild(nuevo(doc, NS.a, 'fillRect'));
      bf.append(blip, nuevo(doc, NS.a, 'srcRect'), st);
      pr.appendChild(bf);
    }else if(fondo.colores?.length >= 2){
      const gf = nuevo(doc, NS.a, 'gradFill', { rotWithShape: '1' }), lst = nuevo(doc, NS.a, 'gsLst');
      fondo.colores.forEach((c, k) => {
        const gs = nuevo(doc, NS.a, 'gs', { pos: String(Math.round(k / (fondo.colores.length - 1) * 100000)) });
        gs.appendChild(nuevo(doc, NS.a, 'srgbClr', { val: hex6(c) || '000000' }));
        lst.appendChild(gs);
      });
      gf.append(lst, nuevo(doc, NS.a, 'lin', { ang: String(Math.round(((fondo.angulo ?? 90) % 360) * 60000)), scaled: '0' }));
      pr.appendChild(gf);
    }else{
      const sf = nuevo(doc, NS.a, 'solidFill');
      sf.appendChild(nuevo(doc, NS.a, 'srgbClr', { val: hex6(fondo.color) || 'FFFFFF' }));
      pr.appendChild(sf);
    }
    pr.appendChild(nuevo(doc, NS.a, 'effectLst'));
    bg.appendChild(pr);
    meterEnOrden(csld, bg, ORDEN_CSLD);
  }
  return idx.length;
}

/* ══ LOS TEXTOS DE UNA LÁMINA ═════════════════════════════════════════════ */
const tipoPh = (sp) => { const ph = todos(sp, NS.p, 'ph')[0]; return ph ? (ph.getAttribute('type') || 'body') : null; };
const esTitulo = (sp) => ['title', 'ctrTitle'].includes(tipoPh(sp));
/* Los cuerpos de texto de una lámina, con si son título o no. Incluye las
   celdas de las tablas. */
function cuerposDeTexto(doc){
  const salida = [];
  const arbol = todos(doc.documentElement, NS.p, 'spTree')[0];
  if(!arbol) return salida;
  for(const sp of todos(arbol, NS.p, 'sp')){
    const tb = hijo(sp, NS.p, 'txBody');
    if(tb) salida.push({ sp, tb, titulo: esTitulo(sp) });
  }
  /* Muchas presentaciones (las que salen de Canva, de Google o de un
     generador) no usan el marcador de título: todo es cuadro de texto suelto.
     Ahí «sólo títulos» no tocaba nada. Si la lámina no trae título formal,
     cuenta como título el texto de letra más grande, si es de 20 pt o más. */
  if(!salida.some((c) => c.titulo)){
    const tam = (c) => Math.max(0, ...todos(c.tb, NS.a, 'rPr').map((r) => Number(r.getAttribute('sz')) || 0));
    const mayor = salida.reduce((m, c) => { const t = tam(c); return t > m.t ? { c, t } : m; }, { c: null, t: 0 });
    if(mayor.c && mayor.t >= 2000) mayor.c.titulo = true;
  }
  for(const tc of todos(arbol, NS.a, 'tc')){
    const tb = hijo(tc, NS.a, 'txBody');
    if(tb) salida.push({ sp: tc, tb, titulo: false });
  }
  return salida;
}
const pasa = (c, en) => en === 'titulos' ? c.titulo : en === 'texto' ? !c.titulo : true;
function rPrDe(run){
  let rpr = hijo(run, NS.a, run.localName === 'endParaRPr' ? '__' : 'rPr');
  if(run.localName === 'endParaRPr') return run;
  if(!rpr){ rpr = nuevo(run.ownerDocument, NS.a, 'rPr', { lang: 'es-MX' }); run.insertBefore(rpr, run.firstChild); }
  return rpr;
}
const corridas = (tb) => [...todos(tb, NS.a, 'r'), ...todos(tb, NS.a, 'fld'), ...todos(tb, NS.a, 'endParaRPr')];

/* ══ OPERACIÓN · LETRA ════════════════════════════════════════════════════ */
export async function ponerFuente(deck, sel, familia, { en = 'todo', tema = true } = {}){
  familia = String(familia || '').trim();
  if(!familia) return 0;
  const idx = cuales(deck, sel);
  let n = 0;
  for(const i of idx){
    const l = deck.laminas[i], doc = docDe(deck, l.ruta);
    let toco = false;
    for(const c of cuerposDeTexto(doc)) if(pasa(c, en)) for(const run of corridas(c.tb)){
      if(!toco){ tocar(deck, l.ruta); toco = true; }
      const rpr = rPrDe(run);
      for(const k of ['latin', 'ea', 'cs']){
        hijos(rpr, NS.a, k).forEach((x) => x.remove());
        if(k === 'latin') meterEnOrden(rpr, nuevo(doc, NS.a, 'latin', { typeface: familia }), ORDEN_RPR);
      }
      n++;
    }
  }
  // La letra del tema: la usan los textos que no dicen letra propia y las láminas nuevas.
  if(tema && (sel === 'todas' || idx.length === deck.laminas.length)){
    for(const t of new Set(deck.laminas.map((l) => l.tema).filter(Boolean))){
      const doc = docDe(deck, t);
      const quien = en === 'titulos' ? ['majorFont'] : en === 'texto' ? ['minorFont'] : ['majorFont', 'minorFont'];
      for(const q of quien) for(const f of todos(doc.documentElement, NS.a, q)){
        tocar(deck, t);
        let lat = hijo(f, NS.a, 'latin');
        if(!lat) lat = meterEnOrden(f, nuevo(doc, NS.a, 'latin', { typeface: familia }), ORDEN_FUENTES);
        lat.setAttribute('typeface', familia);
      }
    }
  }
  return n;
}

/* ══ OPERACIÓN · COLOR Y TAMAÑO DEL TEXTO ═════════════════════════════════ */
export async function ponerColorTexto(deck, sel, color, { en = 'todo' } = {}){
  const h = hex6(color);
  if(!h) return 0;
  let n = 0;
  for(const i of cuales(deck, sel)){
    const l = deck.laminas[i], doc = docDe(deck, l.ruta);
    for(const c of cuerposDeTexto(doc)) if(pasa(c, en)) for(const run of corridas(c.tb)){
      tocar(deck, l.ruta);
      const rpr = rPrDe(run);
      RELLENOS.forEach((k) => hijos(rpr, NS.a, k).forEach((x) => x.remove()));
      const sf = nuevo(doc, NS.a, 'solidFill'); sf.appendChild(nuevo(doc, NS.a, 'srgbClr', { val: h }));
      meterEnOrden(rpr, sf, ORDEN_RPR);
      n++;
    }
  }
  return n;
}
/* factor: 1.1 = 10 % más grande. Lo que no dice tamaño toma el del modelo de la lámina. */
export async function escalarTexto(deck, sel, factor, { en = 'todo' } = {}){
  factor = Number(factor);
  if(!(factor > 0.2 && factor < 5)) return 0;
  let n = 0;
  for(const i of cuales(deck, sel)){
    const l = deck.laminas[i], doc = docDe(deck, l.ruta);
    for(const c of cuerposDeTexto(doc)) if(pasa(c, en)) for(const run of corridas(c.tb)){
      tocar(deck, l.ruta);
      const rpr = rPrDe(run);
      const base = Number(rpr.getAttribute('sz')) || tamanoHeredado(deck, l, c.sp, c.titulo);
      rpr.setAttribute('sz', String(Math.max(100, Math.min(400000, Math.round(base * factor / 50) * 50))));
      n++;
    }
  }
  return n;
}
function tamanoHeredado(deck, l, sp, titulo){
  const m = l.maestro && docDe(deck, l.maestro);
  const estilo = m && todos(m.documentElement, NS.p, titulo ? 'titleStyle' : 'bodyStyle')[0];
  const d = estilo && todos(estilo, NS.a, 'lvl1pPr')[0];
  const sz = d && todos(d, NS.a, 'defRPr')[0]?.getAttribute('sz');
  return Number(sz) || (titulo ? 4400 : 1800);
}

/* ══ OPERACIÓN · BUSCAR Y REEMPLAZAR ══════════════════════════════════════
   Primero corrida por corrida (respeta negritas y colores). Si la palabra
   quedó partida entre dos corridas —PowerPoint las parte por un acento o una
   corrección ortográfica—, ese párrafo se junta en una sola corrida con el
   formato de la primera y ahí se reemplaza. */
export async function reemplazarTexto(deck, sel, buscar, poner, { mayusculas = false } = {}){
  buscar = String(buscar ?? ''); poner = String(poner ?? '');
  if(!buscar) return 0;
  const re = new RegExp(buscar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), mayusculas ? 'g' : 'gi');
  let n = 0;
  for(const i of cuales(deck, sel)){
    const l = deck.laminas[i], doc = docDe(deck, l.ruta);
    for(const c of cuerposDeTexto(doc)) for(const p of todos(c.tb, NS.a, 'p')){
      const ts = todos(p, NS.a, 't');
      let aqui = 0;
      for(const t of ts){ const m = t.textContent.match(re); if(m){ tocar(deck, l.ruta); aqui += m.length; t.textContent = t.textContent.replace(re, () => poner); } }
      if(!aqui && ts.length > 1){
        const todo = ts.map((t) => t.textContent).join('');
        const m = todo.match(re);
        if(m){
          tocar(deck, l.ruta);
          ts[0].textContent = todo.replace(re, () => poner);
          ts.slice(1).forEach((t) => { const run = t.parentElement; if(run?.localName === 'r') run.remove(); else t.textContent = ''; });
          aqui = m.length;
        }
      }
      n += aqui;
    }
  }
  return n;
}

/* ══ OPERACIÓN · IMÁGENES ═════════════════════════════════════════════════ */
/* Cambia UNA imagen en todos lados donde aparece (láminas y plantillas).
   Si el tipo es el mismo, se sobrescribe el archivo: ningún XML se toca. Si
   cambia (jpg → png), se agrega el nuevo y se re-apuntan las relaciones. */
export async function cambiarImagen(deck, ruta, { bytes, mime }){
  const ext = ruta.split('.').pop().toLowerCase();
  const mismo = mimeDe(ruta) === mime || (mime === 'image/jpeg' && ['jpg', 'jpeg'].includes(ext));
  if(mismo){
    await tocarMedio(deck, ruta);
    deck.zip.file(ruta, bytes);
    soltarUrl(deck, ruta);
    return 1;
  }
  const nueva = await medioNuevo(deck, bytes, mime);
  let n = 0;
  const rutas = new Set(deck.laminas.flatMap((l) => [l.ruta, l.diseno, l.maestro]).filter(Boolean));
  for(const r of rutas){
    const rr = relsDe(r), doc = await parte(deck, rr);
    if(!doc) continue;
    for(const rel of todos(doc.documentElement, NS.rel, 'Relationship')){
      if(rel.getAttribute('TargetMode') === 'External' || resolver(r, rel.getAttribute('Target')) !== ruta) continue;
      tocar(deck, rr);
      rel.setAttribute('Target', relativa(r, nueva));
      n++;
    }
  }
  return n;
}
/* Cambia la imagen SÓLO en una lámina (las demás se quedan con la vieja). */
export async function cambiarImagenEn(deck, i, ruta, { bytes, mime }){
  const l = deck.laminas[i], rr = relsDe(l.ruta), doc = await parte(deck, rr);
  if(!doc) return 0;
  const nueva = await medioNuevo(deck, bytes, mime);
  let n = 0;
  for(const rel of todos(doc.documentElement, NS.rel, 'Relationship')){
    if(resolver(l.ruta, rel.getAttribute('Target')) !== ruta) continue;
    tocar(deck, rr); rel.setAttribute('Target', relativa(l.ruta, nueva)); n++;
  }
  return n;
}
/* Quita de las láminas elegidas los cuadros que muestran esa imagen (el
   logo viejo en las 80 láminas, por ejemplo). */
export async function quitarImagen(deck, sel, ruta){
  let n = 0;
  for(const i of cuales(deck, sel)){
    const l = deck.laminas[i], rs = await relaciones(deck, l.ruta), doc = docDe(deck, l.ruta);
    const ids = new Set([...rs.values()].filter((r) => r.ruta === ruta).map((r) => r.id));
    if(!ids.size) continue;
    for(const pic of todos(doc.documentElement, NS.p, 'pic')){
      const blip = todos(pic, NS.a, 'blip')[0];
      if(blip && ids.has(blip.getAttributeNS(NS.r, 'embed'))){ tocar(deck, l.ruta); pic.remove(); n++; }
    }
  }
  return n;
}
export async function bytesDe(deck, ruta){ const f = deck.zip.file(ruta); return f ? f.async('uint8array') : null; }

/* ══ OPERACIÓN · PALETA DEL TEMA ══════════════════════════════════════════
   Cambia los colores de acento del tema: todo lo que la presentación pinta
   «con el color del tema» (formas, gráficas, viñetas) cambia de un jalón. */
export async function ponerPaletaTema(deck, colores){
  let n = 0;
  for(const t of new Set(deck.laminas.map((l) => l.tema).filter(Boolean))){
    const doc = docDe(deck, t), cs = todos(doc.documentElement, NS.a, 'clrScheme')[0];
    if(!cs) continue;
    for(const [k, v] of Object.entries(colores)){
      const h = hex6(v), nodo = hijo(cs, NS.a, k);
      if(!h || !nodo) continue;
      tocar(deck, t);
      [...nodo.children].forEach((x) => x.remove());
      nodo.appendChild(nuevo(doc, NS.a, 'srgbClr', { val: h }));
      n++;
    }
  }
  return n;
}
export function paletaTema(deck){ return deck.laminas[0] ? paleta(deck, deck.laminas[0]) : {}; }

/* ══ OPERACIÓN · CONTRASTE ════════════════════════════════════════════════
   Al poner fondo oscuro a una presentación clara, el texto negro desaparece
   (se vio en la primera prueba: «Pedir sin fila» negro sobre negro). Esto
   revisa cada corrida contra el fondo de SU lámina y, si no llega a 4.5:1,
   la pasa a hueso o a tinta, lo que se lea mejor. Las láminas con foto de
   fondo se saltan: no hay un color contra el cual medir. */
const lum = (hex) => {
  const c = [0, 2, 4].map((k) => parseInt(hex.replace('#', '').slice(k, k + 2), 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const promedio = (hexes) => '#' + [0, 2, 4].map((k) => Math.round(hexes.reduce((s, h) => s + parseInt(h.replace('#', '').slice(k, k + 2), 16), 0) / hexes.length).toString(16).padStart(2, '0')).join('').toUpperCase();
export async function arreglarContraste(deck, sel, { claro = '#F5F2F2', oscuro = '#141018', minimo = 4.5 } = {}){
  let n = 0;
  for(const i of cuales(deck, sel)){
    const l = deck.laminas[i], m = await modelo(deck, i), pal = paleta(deck, l);
    const f = m.fondo;
    const bg = f.color || (f.degradado && promedio(f.degradado.map((g) => g.color)));
    if(!bg) continue;
    const doc = docDe(deck, l.ruta);
    for(const c of cuerposDeTexto(doc)){
      // Un texto dentro de una forma con relleno propio se mide contra la forma, no contra el fondo.
      const spPr = hijo(c.sp, NS.p, 'spPr'), relleno = spPr && colorDe(hijo(spPr, NS.a, 'solidFill'), pal);
      const detras = relleno && relleno.alfa >= 0.35 ? relleno.hex : bg;   // un recuadro de cristal (≥ 35 %) ya es el fondo del texto
      const heredado = colorDe(todos(c.sp, NS.a, 'fontRef')[0], pal)?.hex || '#' + (pal.tx1 || '000000');
      for(const run of corridas(c.tb)){
        if(run.localName !== 'endParaRPr' && !(hijo(run, NS.a, 't')?.textContent || '').trim()) continue;
        const rpr = run.localName === 'endParaRPr' ? run : hijo(run, NS.a, 'rPr');
        const actual = colorDe(rpr && hijo(rpr, NS.a, 'solidFill'), pal)?.hex || heredado;
        if(contraste(actual, detras) >= minimo) continue;
        const nuevoColor = contraste(claro, detras) >= contraste(oscuro, detras) ? claro : oscuro;
        tocar(deck, l.ruta);
        const r2 = rPrDe(run);
        RELLENOS.forEach((k) => hijos(r2, NS.a, k).forEach((x) => x.remove()));
        const sf = nuevo(doc, NS.a, 'solidFill'); sf.appendChild(nuevo(doc, NS.a, 'srgbClr', { val: nuevoColor.slice(1) }));
        meterEnOrden(r2, sf, ORDEN_RPR);
        if(run.localName !== 'endParaRPr') n++;
      }
    }
  }
  return n;
}

/* ══ LEER Y ESCRIBIR LOS TEXTOS (para la IA y para editar a mano) ═════════ */
const textoDe = (tb) => todos(tb, NS.a, 'p').map((p) => [...p.children].map((x) => x.localName === 'br' ? '\n' : (x.localName === 'r' || x.localName === 'fld') ? (hijo(x, NS.a, 't')?.textContent || '') : '').join('')).join('\n');
export function textos(deck, i){
  const l = deck.laminas[i], doc = docDe(deck, l.ruta);
  return cuerposDeTexto(doc).map((c, k) => ({ id: k, titulo: c.titulo, texto: textoDe(c.tb) })).filter((x) => x.texto.trim());
}
export function resumen(deck){
  return deck.laminas.map((_, i) => ({ lamina: i + 1, textos: textos(deck, i).map((t) => ({ forma: t.id, titulo: t.titulo, texto: t.texto.slice(0, 600) })) }));
}
/* Pone un texto nuevo en una forma conservando el formato de su primera
   corrida (letra, tamaño, color) y las viñetas de su primer párrafo. */
export async function ponerTexto(deck, i, forma, texto){
  const l = deck.laminas[i], doc = docDe(deck, l.ruta);
  const c = cuerposDeTexto(doc)[forma];
  if(!c) return 0;
  tocar(deck, l.ruta);
  const ps = todos(c.tb, NS.a, 'p');
  const molde = ps[0], moldeR = todos(c.tb, NS.a, 'r')[0];
  ps.forEach((p) => p.remove());
  for(const linea of String(texto).split('\n')){
    const p = nuevo(doc, NS.a, 'p');
    const ppr = molde && hijo(molde, NS.a, 'pPr');
    if(ppr) p.appendChild(ppr.cloneNode(true));
    if(linea){
      const r = nuevo(doc, NS.a, 'r');
      const rpr = moldeR && hijo(moldeR, NS.a, 'rPr');
      r.appendChild(rpr ? rpr.cloneNode(true) : nuevo(doc, NS.a, 'rPr', { lang: 'es-MX' }));
      const t = nuevo(doc, NS.a, 't'); t.textContent = linea; r.appendChild(t);
      p.appendChild(r);
    }
    c.tb.appendChild(p);
  }
  return 1;
}

/* ══ EL MODELO PARA DIBUJAR UNA LÁMINA ════════════════════════════════════
   Aproximado a propósito: sirve para ver QUÉ se está cambiando y reconocer
   cada lámina, no para sustituir a PowerPoint. Lo que no se sabe dibujar
   (gráficas, SmartArt) sale como un recuadro con su nombre. */
export async function modelo(deck, i){
  const l = deck.laminas[i];
  const pal = paleta(deck, l);
  const docs = [l.maestro, l.diseno, l.ruta].map((r) => r && { ruta: r, doc: docDe(deck, r) }).filter((x) => x?.doc);
  // Fondo: el de la lámina, si no el del diseño, si no el del maestro.
  let fondo = { color: '#FFFFFF' };
  for(const { ruta, doc } of [...docs].reverse()){
    const bg = todos(doc.documentElement, NS.p, 'bg')[0];
    if(!bg) continue;
    fondo = await leerRelleno(deck, ruta, hijo(bg, NS.p, 'bgPr') || hijo(bg, NS.p, 'bgRef'), pal) || fondo;
    break;
  }
  const formas = [];
  const mostrarMaestro = (d) => d.documentElement.getAttribute('showMasterSp') !== '0';
  const slideDoc = docDe(deck, l.ruta), disenoDoc = l.diseno && docDe(deck, l.diseno);
  const capas = [];
  if(l.maestro && mostrarMaestro(slideDoc) && (!disenoDoc || mostrarMaestro(disenoDoc))) capas.push({ ruta: l.maestro, soloAdorno: true });
  if(l.diseno && mostrarMaestro(slideDoc)) capas.push({ ruta: l.diseno, soloAdorno: true });
  capas.push({ ruta: l.ruta, soloAdorno: false });
  for(const capa of capas){
    const doc = docDe(deck, capa.ruta), arbol = todos(doc.documentElement, NS.p, 'spTree')[0];
    if(arbol) await recorrer(deck, l, capa.ruta, arbol, pal, formas, capa.soloAdorno, (x, y, w, h) => ({ x, y, w, h }));
  }
  return { ancho: deck.ancho, alto: deck.alto, fondo, formas };
}
async function leerRelleno(deck, ruta, el, pal){
  if(!el) return null;
  if(el.localName === 'bgRef'){ const c = colorDe(el, pal); return c ? { color: c.hex } : null; }
  const sf = hijo(el, NS.a, 'solidFill'), gf = hijo(el, NS.a, 'gradFill'), bf = hijo(el, NS.a, 'blipFill');
  if(sf){ const c = colorDe(sf, pal); return c ? { color: c.hex, alfa: c.alfa } : null; }
  if(gf){
    const paradas = todos(gf, NS.a, 'gs').map((g) => ({ pos: Number(g.getAttribute('pos')) / 1000, color: colorDe(g, pal)?.hex || '#888888' }));
    const lin = hijo(gf, NS.a, 'lin');
    return { degradado: paradas, angulo: lin ? Number(lin.getAttribute('ang')) / 60000 : 90 };
  }
  if(bf){
    const blip = hijo(bf, NS.a, 'blip'), id = blip?.getAttributeNS(NS.r, 'embed');
    const r = id && (await relaciones(deck, ruta)).get(id);
    return r && !r.externa ? { imagen: await urlDe(deck, r.ruta), rutaImagen: r.ruta } : null;
  }
  if(hijo(el, NS.a, 'noFill')) return { nada: true };
  return null;
}
/* Posición de un marcador (título, cuerpo…) que no dice dónde va: la toma
   del diseño o del maestro, como hace PowerPoint. */
function xfrmHeredado(deck, l, sp){
  const ph = todos(sp, NS.p, 'ph')[0];
  if(!ph) return null;
  const tipo = ph.getAttribute('type') || 'body', idx = ph.getAttribute('idx');
  for(const r of [l.diseno, l.maestro]){
    const d = r && docDe(deck, r);
    if(!d) continue;
    for(const cand of todos(d.documentElement, NS.p, 'sp')){
      const cp = todos(cand, NS.p, 'ph')[0];
      if(!cp) continue;
      const ct = cp.getAttribute('type') || 'body';
      const coincide = (idx != null && cp.getAttribute('idx') === idx) || ct === tipo || (tipo === 'ctrTitle' && ct === 'title') || (tipo === 'subTitle' && ct === 'body');
      if(!coincide) continue;
      const x = todos(cand, NS.a, 'xfrm')[0];
      if(x) return x;
    }
  }
  return null;
}
const num = (el, a) => Number(el?.getAttribute(a)) || 0;
async function recorrer(deck, l, ruta, arbol, pal, formas, soloAdorno, tx){
  for(const el of arbol.children){
    const nombre = el.localName;
    if(nombre === 'grpSp'){
      const x = todos(hijo(el, NS.p, 'grpSpPr'), NS.a, 'xfrm')[0];
      const off = hijo(x, NS.a, 'off'), ext = hijo(x, NS.a, 'ext'), coff = hijo(x, NS.a, 'chOff'), cext = hijo(x, NS.a, 'chExt');
      const sx = num(cext, 'cx') ? num(ext, 'cx') / num(cext, 'cx') : 1, sy = num(cext, 'cy') ? num(ext, 'cy') / num(cext, 'cy') : 1;
      const interno = (X, Y, W, H) => tx(num(off, 'x') + (X - num(coff, 'x')) * sx, num(off, 'y') + (Y - num(coff, 'y')) * sy, W * sx, H * sy);
      await recorrer(deck, l, ruta, el, pal, formas, soloAdorno, interno);
      continue;
    }
    if(!['sp', 'pic', 'graphicFrame', 'cxnSp'].includes(nombre)) continue;
    const esPh = !!todos(el, NS.p, 'ph')[0];
    if(soloAdorno && esPh) continue;
    const spPr = hijo(el, NS.p, 'spPr');
    let x = nombre === 'graphicFrame' ? hijo(el, NS.p, 'xfrm') : todos(spPr, NS.a, 'xfrm')[0];
    if(!x && esPh) x = xfrmHeredado(deck, l, el);
    if(!x) continue;
    const off = hijo(x, NS.a, 'off'), ext = hijo(x, NS.a, 'ext');
    const caja = tx(num(off, 'x'), num(off, 'y'), num(ext, 'cx'), num(ext, 'cy'));
    const f = { tipo: nombre, ...caja, rot: num(x, 'rot') / 60000, capa: soloAdorno ? 'plantilla' : 'lamina' };
    if(nombre === 'pic'){
      const blip = todos(el, NS.a, 'blip')[0], id = blip?.getAttributeNS(NS.r, 'embed');
      const r = id && (await relaciones(deck, ruta)).get(id);
      if(r && !r.externa){ f.imagen = await urlDe(deck, r.ruta); f.rutaImagen = r.ruta; }
      const src = todos(el, NS.a, 'srcRect')[0];
      if(src) f.recorte = { l: num(src, 'l') / 100000, t: num(src, 't') / 100000, r: num(src, 'r') / 100000, b: num(src, 'b') / 100000 };
    }else if(nombre === 'graphicFrame'){
      const uri = todos(el, NS.a, 'graphicData')[0]?.getAttribute('uri') || '';
      f.marcador = /table/.test(uri) ? 'Tabla' : /chart/.test(uri) ? 'Gráfica' : /diagram/.test(uri) ? 'Diagrama' : 'Objeto';
      if(f.marcador === 'Tabla') f.parrafos = todos(el, NS.a, 'tc').slice(0, 12).map((tc) => ({ runs: [{ t: textoDe(tc) }] }));
    }else{
      const geo = todos(spPr, NS.a, 'prstGeom')[0]?.getAttribute('prst');
      f.geo = geo || 'rect';
      const adj = todos(todos(spPr, NS.a, 'prstGeom')[0], NS.a, 'gd').find((g) => g.getAttribute('name') === 'adj');
      if(adj) f.redondeo = Number(String(adj.getAttribute('fmla')).replace(/\D/g, '')) / 100000;
      f.relleno = spPr && await leerRelleno(deck, ruta, spPr, pal);
      const sombra = todos(hijo(spPr, NS.a, 'effectLst'), NS.a, 'outerShdw')[0];
      if(sombra) f.sombra = { blur: num(sombra, 'blurRad'), dist: num(sombra, 'dist'), alfa: colorDe(sombra, pal)?.alfa ?? 0.35 };
      const ln = hijo(spPr, NS.a, 'ln');
      if(ln && !hijo(ln, NS.a, 'noFill')){ const c = colorDe(hijo(ln, NS.a, 'solidFill'), pal); if(c) f.borde = { color: c.hex, alfa: c.alfa, ancho: (num(ln, 'w') || 12700) }; }
      // Estilo de la forma (<p:style>): relleno del tema si no dice otro.
      if(!f.relleno && !spPr?.querySelector('*|noFill')){ const fr = todos(el, NS.a, 'fillRef')[0]; if(fr && fr.getAttribute('idx') !== '0'){ const c = colorDe(fr, pal); if(c) f.relleno = { color: c.hex }; } }
      const tb = hijo(el, NS.p, 'txBody');
      if(tb){
        f.titulo = esTitulo(el);
        const bp = hijo(tb, NS.a, 'bodyPr');
        f.ancla = bp?.getAttribute('anchor') || (f.titulo ? 'ctr' : 't');
        const auto = bp && todos(bp, NS.a, 'normAutofit')[0];
        const escala = auto ? (Number(auto.getAttribute('fontScale')) || 100000) / 100000 : 1;
        const defSz = tamanoHeredado(deck, l, el, f.titulo);
        const colTx = colorDe(todos(el, NS.a, 'fontRef')[0], pal)?.hex || '#' + (pal.tx1 || '000000');
        f.parrafos = todos(tb, NS.a, 'p').map((p) => {
          const ppr = hijo(p, NS.a, 'pPr');
          return {
            alinea: ppr?.getAttribute('algn') || null,
            viñeta: !!(ppr && (hijo(ppr, NS.a, 'buChar') || hijo(ppr, NS.a, 'buAutoNum'))),
            runs: [...p.children].filter((x) => ['r', 'fld', 'br'].includes(x.localName)).map((x) => {
              if(x.localName === 'br') return { br: true };
              const rpr = hijo(x, NS.a, 'rPr');
              return {
                t: hijo(x, NS.a, 't')?.textContent || '',
                pt: (Number(rpr?.getAttribute('sz')) || defSz) / 100 * escala,
                b: rpr?.getAttribute('b') === '1', i: rpr?.getAttribute('i') === '1',
                color: colorDe(hijo(rpr, NS.a, 'solidFill'), pal)?.hex || colTx,
                letra: hijo(rpr, NS.a, 'latin')?.getAttribute('typeface') || null,
              };
            }),
          };
        });
      }
    }
    formas.push(f);
  }
}

/* ══ ACOMODAR ═════════════════════════════════════════════════════════════
   Lo pidió Carlos: «botones que ajusten textos, imágenes y otros elementos a
   un tamaño y disposición más cómodos y bonitos, en las seleccionadas o en
   todas». Cada uno arregla UN defecto que se puede medir —texto que no cabe,
   foto estirada, cosas pegadas al borde, cuadros casi alineados, tamaños casi
   iguales— y deja en paz lo demás. Nada de «rediseñar»: si no hay defecto
   medible, no se toca. Sólo mueve lo que vive directo en la lámina (no lo de
   dentro de grupos ni lo de la plantilla).
   ═════════════════════════════════════════════════════════════════════════ */
const ORDEN_SPPR = ['xfrm', 'custGeom', 'prstGeom', 'noFill', 'solidFill', 'gradFill', 'blipFill', 'pattFill', 'grpFill', 'ln', 'effectLst', 'effectDag', 'scene3d', 'sp3d', 'extLst'];
const ORDEN_PPR = ['lnSpc', 'spcBef', 'spcAft', 'buClrTx', 'buClr', 'buSzTx', 'buSzPct', 'buSzPts', 'buFontTx', 'buFont', 'buNone', 'buAutoNum', 'buChar', 'buBlip', 'tabLst', 'defRPr', 'extLst'];
const ORDEN_BLIPFILL = ['blip', 'srcRect', 'tile', 'stretch'];

/* Las formas que viven directo en la lámina, con su caja (la propia o la heredada). */
function formasSueltas(deck, l){
  const doc = docDe(deck, l.ruta), arbol = todos(doc.documentElement, NS.p, 'spTree')[0];
  if(!arbol) return [];
  const salida = [];
  for(const el of arbol.children){
    if(!['sp', 'pic', 'graphicFrame', 'grpSp', 'cxnSp'].includes(el.localName)) continue;
    const x = el.localName === 'graphicFrame' ? hijo(el, NS.p, 'xfrm')
      : el.localName === 'grpSp' ? hijo(hijo(el, NS.p, 'grpSpPr'), NS.a, 'xfrm')
      : hijo(hijo(el, NS.p, 'spPr'), NS.a, 'xfrm');
    const fuente = x || (el.localName === 'sp' ? xfrmHeredado(deck, l, el) : null);
    if(!fuente) continue;
    const off = hijo(fuente, NS.a, 'off'), ext = hijo(fuente, NS.a, 'ext');
    const tb = hijo(el, NS.p, 'txBody');
    const texto = tb ? textoDe(tb).trim() : '';
    salida.push({ el, tipo: el.localName, x: num(off, 'x'), y: num(off, 'y'), w: num(ext, 'cx'), h: num(ext, 'cy'), rot: num(fuente, 'rot'), tb, texto, ph: tipoPh(el) });
  }
  // El título, como en cuerposDeTexto(): el marcador o, si no hay, el texto más grande.
  const titulo = salida.find((f) => ['title', 'ctrTitle'].includes(f.ph))
    || salida.filter((f) => f.texto).reduce((m, f) => { const t = Math.max(0, ...todos(f.tb, NS.a, 'rPr').map((r) => Number(r.getAttribute('sz')) || 0)); return t > m.t && t >= 2000 ? { f, t } : m; }, { f: null, t: 0 }).f;
  if(titulo) titulo.titulo = true;
  return salida;
}
function ponerCaja(deck, l, f, c){
  const doc = docDe(deck, l.ruta);
  tocar(deck, l.ruta);
  let x;
  if(f.tipo === 'graphicFrame') x = hijo(f.el, NS.p, 'xfrm');
  else if(f.tipo === 'grpSp') x = hijo(hijo(f.el, NS.p, 'grpSpPr'), NS.a, 'xfrm');
  else{
    let spPr = hijo(f.el, NS.p, 'spPr');
    if(!spPr){ spPr = nuevo(doc, NS.p, 'spPr'); const antes = hijo(f.el, NS.p, 'style') || hijo(f.el, NS.p, 'txBody'); f.el.insertBefore(spPr, antes); }
    x = hijo(spPr, NS.a, 'xfrm');
    if(!x){   // un marcador que heredaba su lugar: ahora lo trae propio
      x = nuevo(doc, NS.a, 'xfrm');
      if(f.rot) x.setAttribute('rot', String(f.rot));
      x.append(nuevo(doc, NS.a, 'off', { x: '0', y: '0' }), nuevo(doc, NS.a, 'ext', { cx: '0', cy: '0' }));
      meterEnOrden(spPr, x, ORDEN_SPPR);
    }
  }
  if(!x) return false;
  const off = hijo(x, NS.a, 'off'), ext = hijo(x, NS.a, 'ext');
  off.setAttribute('x', String(Math.round(c.x))); off.setAttribute('y', String(Math.round(c.y)));
  ext.setAttribute('cx', String(Math.max(1, Math.round(c.w)))); ext.setAttribute('cy', String(Math.max(1, Math.round(c.h))));
  Object.assign(f, c);
  return true;
}

/* ── medir texto ── */
let _lienzo = null;
function medidor(){
  if(!_lienzo) _lienzo = (globalThis.OffscreenCanvas ? new OffscreenCanvas(8, 8) : document.createElement('canvas')).getContext('2d');
  return _lienzo;
}
function letraDelTema(deck, l, titulo){
  const t = l.tema && docDe(deck, l.tema);
  const f = t && todos(t.documentElement, NS.a, titulo ? 'majorFont' : 'minorFont')[0];
  return hijo(f, NS.a, 'latin')?.getAttribute('typeface') || 'Calibri';
}
/* Los párrafos de un cuadro como los va a pintar PowerPoint: tamaño efectivo
   (con la escala de autoajuste), negrita y letra de su corrida más grande. */
function parrafosMedibles(deck, l, f){
  const bp = hijo(f.tb, NS.a, 'bodyPr');
  const na = bp && todos(bp, NS.a, 'normAutofit')[0];
  const escala = na ? (Number(na.getAttribute('fontScale')) || 100000) / 100000 : 1;
  const base = tamanoHeredado(deck, l, f.el, !!f.titulo);
  const tema = letraDelTema(deck, l, !!f.titulo);
  return todos(f.tb, NS.a, 'p').map((p) => {
    const trozos = [];
    let actual = '';
    let pt = 0, b = false, letra = null;
    for(const x of p.children){
      if(x.localName === 'br'){ trozos.push(actual); actual = ''; continue; }
      if(x.localName !== 'r' && x.localName !== 'fld') continue;
      const rpr = hijo(x, NS.a, 'rPr');
      const tam = (Number(rpr?.getAttribute('sz')) || base) / 100 * escala;
      if(tam >= pt){ pt = tam; b = /^(1|true)$/.test(rpr?.getAttribute('b') || '') || /bold|black|heavy/i.test(hijo(rpr, NS.a, 'latin')?.getAttribute('typeface') || ''); letra = hijo(rpr, NS.a, 'latin')?.getAttribute('typeface') || null; }
      actual += hijo(x, NS.a, 't')?.textContent || '';
    }
    trozos.push(actual);
    if(!pt){ const e = hijo(p, NS.a, 'endParaRPr'); pt = (Number(e?.getAttribute('sz')) || base) / 100 * escala; }
    const ppr = hijo(p, NS.a, 'pPr');
    const sangria = ppr ? Math.max(0, Number(ppr.getAttribute('marL')) || 0) / EMU_PT : 0;
    const vineta = !!(ppr && (hijo(ppr, NS.a, 'buChar') || hijo(ppr, NS.a, 'buAutoNum')));
    const ln = hijo(ppr, NS.a, 'lnSpc');
    const lnPct = Number(todos(ln, NS.a, 'spcPct')[0]?.getAttribute('val')) || 100000;
    // Canva y Google escriben el interlineado en PUNTOS fijos (spcPts): no crece ni se achica con la letra.
    const lnPts = Number(todos(ln, NS.a, 'spcPts')[0]?.getAttribute('val')) / 100 || 0;
    const antes = Number(todos(hijo(ppr, NS.a, 'spcBef'), NS.a, 'spcPts')[0]?.getAttribute('val')) / 100 || 0;
    const despues = Number(todos(hijo(ppr, NS.a, 'spcAft'), NS.a, 'spcPts')[0]?.getAttribute('val')) / 100 || 0;
    return { renglones: trozos, pt, b, letra: (letra && !letra.startsWith('+')) ? letra : tema, sangria: sangria || (vineta ? pt * 1.2 : 0), interlinea: lnPct / 100000, lnPts, extra: antes + despues };
  });
}
/* ¿Cuánto mide de alto (en pt) este texto a este factor, dentro de este ancho? */
function altoTexto(parrafos, anchoPt, factor){ return medirTexto(parrafos, anchoPt, factor).alto; }
/* Alto total y el renglón más ancho (en pt), ya partido como lo parte el cuadro. */
/* ¿Tiene el navegador esa letra? Si mide igual que una letra que no existe,
   no la tiene. Sin ella se mediría con una más angosta y el texto real se
   saldría del recuadro en la compu que SÍ la tiene. */
const _hayLetra = new Map();
export function hayLetra(letra){
  if(_hayLetra.has(letra)) return _hayLetra.get(letra);
  const cx = medidor(), muestra = 'mmmmmmmmmmlliWWQ@#';
  cx.font = '40px "No-Existe-Mazi-7", monospace'; const a = cx.measureText(muestra).width;
  cx.font = `40px "${letra.replace(/"/g, '')}", monospace`; const b = cx.measureText(muestra).width;
  const r = Math.abs(a - b) > 0.5; _hayLetra.set(letra, r); return r;
}
function medirTexto(parrafos, anchoPt, factor){
  const cx = medidor();
  let alto = 0, ancho = 0;
  for(const p of parrafos){
    const pt = p.pt * factor;
    const familia = p.letra.replace(/\s+(bold|black|heavy|semibold|medium|light|regular)$/i, '').replace(/"/g, '');
    const tiene = hayLetra(p.letra) || hayLetra(familia);
    // Sin la letra, se mide con una ANCHA (Verdana/DejaVu): mejor que sobre recuadro a que falte.
    cx.font = `${p.b ? 'bold ' : ''}${pt}px ${tiene ? `"${hayLetra(p.letra) ? p.letra.replace(/"/g, '') : familia}", ` : ''}${tiene ? 'Calibri, Carlito, Arial' : 'Verdana, "DejaVu Sans"'}, sans-serif`;
    const disponible = Math.max(10, anchoPt - p.sangria * factor);
    let lineas = 0;
    for(const r of p.renglones){
      if(!r.trim()){ lineas++; continue; }
      let linea = '';
      let n = 1;
      const mide = (t) => { const w = cx.measureText(t.trimEnd()).width; ancho = Math.max(ancho, w + p.sangria * factor); return w; };
      for(const palabra of r.split(/(\s+)/)){
        const prueba = linea + palabra;
        if(linea.trim() && cx.measureText(prueba.trimEnd()).width > disponible){ mide(linea); n++; linea = palabra.trimStart(); }
        else linea = prueba;
      }
      mide(linea);
      lineas += n;
    }
    alto += lineas * (p.lnPts ? p.lnPts * factor : pt * 1.2 * p.interlinea) + p.extra * factor;
  }
  return { alto, ancho };
}
function interior(f){
  const bp = hijo(f.tb, NS.a, 'bodyPr');
  const ins = (a, d) => { const v = bp?.getAttribute(a); return (v == null ? d : Number(v)) / EMU_PT; };
  return { ancho: f.w / EMU_PT - ins('lIns', 91440) - ins('rIns', 91440), alto: f.h / EMU_PT - ins('tIns', 45720) - ins('bIns', 45720) };
}
/* Para las pruebas: cuánto sobra (>1) o falta (<1) de alto en un cuadro. */
export function holguraTexto(deck, i, forma){
  const l = deck.laminas[i];
  const el = cuerposDeTexto(docDe(deck, l.ruta))[forma]?.sp;
  const f = formasSueltas(deck, l).find((x) => x.el === el);
  if(!f || !f.texto) return null;
  const inn = interior(f);
  return inn.alto / Math.max(1, altoTexto(parrafosMedibles(deck, l, f), inn.ancho, 1));
}
function escalarCuadro(deck, l, f, factor){
  const base = tamanoHeredado(deck, l, f.el, !!f.titulo);
  const bp = hijo(f.tb, NS.a, 'bodyPr'), na = bp && todos(bp, NS.a, 'normAutofit')[0];
  const escala = na ? (Number(na.getAttribute('fontScale')) || 100000) / 100000 : 1;
  tocar(deck, l.ruta);
  for(const run of corridas(f.tb)){
    const rpr = rPrDe(run);
    const efectivo = (Number(rpr.getAttribute('sz')) || base) * escala;
    rpr.setAttribute('sz', String(Math.max(600, Math.round(efectivo * factor / 50) * 50)));
  }
  // El interlineado y los espacios en puntos fijos se achican junto con la letra.
  for(const pts of todos(f.tb, NS.a, 'spcPts')) pts.setAttribute('val', String(Math.max(100, Math.round(Number(pts.getAttribute('val')) * factor))));
  // La escala ya quedó metida en cada tamaño: si se deja, se encoge dos veces.
  if(na){ na.removeAttribute('fontScale'); na.removeAttribute('lnSpcReduction'); }
}

/* 1 · Que el texto quepa en su cuadro: se achica lo justo (hasta 55 %). */
export async function textoQueQuepa(deck, sel){
  let n = 0;
  for(const i of cuales(deck, sel)){
    const l = deck.laminas[i];
    for(const f of formasSueltas(deck, l)){
      if(f.tipo !== 'sp' || !f.texto || f.rot) continue;
      const bp = hijo(f.tb, NS.a, 'bodyPr');
      if(bp?.getAttribute('vert') && bp.getAttribute('vert') !== 'horz') continue;
      const inn = interior(f);
      if(inn.ancho <= 4) continue;
      const ps = parrafosMedibles(deck, l, f);
      const necesita = altoTexto(ps, inn.ancho, 1);
      if(necesita <= inn.alto * 1.02) continue;
      /* «El cuadro crece con su texto» (spAutoFit, lo que exportan Canva y los
         generadores): PowerPoint no lo recalcula al abrir, así que el cuadro
         guardado se queda chico y el texto se desborda encima de lo de abajo.
         Si hay lugar hacia abajo, crece el CUADRO y la letra no se toca. */
      const cabeHasta = deck.alto - deck.ancho * MARGEN - f.y;   // el mismo margen que meterEnMargenes()
      const sobra = (f.h / EMU_PT) - inn.alto;          // los márgenes internos
      if(bp && hijo(bp, NS.a, 'spAutoFit') && (necesita + sobra) * EMU_PT <= cabeHasta){
        if(ponerCaja(deck, l, f, { x: f.x, y: f.y, w: f.w, h: Math.min(cabeHasta, (necesita + sobra) * EMU_PT * 1.02) })){ n++; continue; }
      }
      const disponible = bp && hijo(bp, NS.a, 'spAutoFit') ? Math.max(inn.alto, cabeHasta / EMU_PT - sobra) : inn.alto;
      if(disponible <= 4) continue;
      let factor = 1;
      while(factor > 0.55 && altoTexto(ps, inn.ancho, factor) > disponible) factor -= 0.04;
      escalarCuadro(deck, l, f, Math.max(0.55, factor));
      if(disponible > inn.alto) ponerCaja(deck, l, f, { x: f.x, y: f.y, w: f.w, h: Math.min(cabeHasta, (altoTexto(ps, inn.ancho, Math.max(0.55, factor)) + sobra) * EMU_PT * 1.02) });
      n++;
    }
  }
  return n;
}

/* 2 · Fotos estiradas: se recortan al centro para que tengan su forma real
   dentro del mismo hueco (como «Recortar → Rellenar» de PowerPoint). */
function medidasImagen(bytes){
  const b = bytes;
  if(b[0] === 0x89 && b[1] === 0x50) return { w: (b[16] << 24 | b[17] << 16 | b[18] << 8 | b[19]) >>> 0, h: (b[20] << 24 | b[21] << 16 | b[22] << 8 | b[23]) >>> 0 };
  if(b[0] === 0xFF && b[1] === 0xD8){
    let i = 2;
    while(i + 9 < b.length){
      if(b[i] !== 0xFF){ i++; continue; }
      const m = b[i + 1], largo = b[i + 2] << 8 | b[i + 3];
      if(m >= 0xC0 && m <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(m)) return { h: b[i + 5] << 8 | b[i + 6], w: b[i + 7] << 8 | b[i + 8] };
      i += 2 + largo;
    }
  }
  if(b[0] === 0x47 && b[1] === 0x49) return { w: b[6] | b[7] << 8, h: b[8] | b[9] << 8 };
  return null;
}
export { medidasImagen };
export async function desestirarImagenes(deck, sel){
  let n = 0;
  for(const i of cuales(deck, sel)){
    const l = deck.laminas[i], rs = await relaciones(deck, l.ruta), doc = docDe(deck, l.ruta);
    for(const f of formasSueltas(deck, l)){
      if(f.tipo !== 'pic' || !f.w || !f.h) continue;
      const bf = hijo(f.el, NS.p, 'blipFill'), blip = hijo(bf, NS.a, 'blip');
      const r = blip && rs.get(blip.getAttributeNS(NS.r, 'embed'));
      if(!r || r.externa || !hijo(bf, NS.a, 'stretch')) continue;
      const bytes = await bytesDe(deck, r.ruta), med = bytes && medidasImagen(bytes);
      if(!med?.w || !med?.h) continue;
      const src = hijo(bf, NS.a, 'srcRect');
      const c = { l: num(src, 'l') / 1e5, t: num(src, 't') / 1e5, r: num(src, 'r') / 1e5, b: num(src, 'b') / 1e5 };
      const visible = (med.w * (1 - c.l - c.r)) / (med.h * (1 - c.t - c.b));
      const hueco = f.w / f.h;
      if(Math.abs(Math.log(visible / hueco)) < 0.03) continue;   // menos de 3 %: no se nota
      // Recorte nuevo, centrado sobre lo que ya se veía.
      let { l: L, t: T, r: R, b: B } = c;
      if(visible > hueco){ const sobra = (1 - L - R) * (1 - hueco / visible); L += sobra / 2; R += sobra / 2; }
      else{ const sobra = (1 - T - B) * (1 - visible / hueco); T += sobra / 2; B += sobra / 2; }
      tocar(deck, l.ruta);
      let s = src;
      if(!s){ s = nuevo(doc, NS.a, 'srcRect'); meterEnOrden(bf, s, ORDEN_BLIPFILL); }
      for(const [k, v] of [['l', L], ['t', T], ['r', R], ['b', B]]){ const val = Math.round(v * 1e5); if(val) s.setAttribute(k, String(val)); else s.removeAttribute(k); }
      n++;
    }
  }
  return n;
}

/* 3 · Dentro de márgenes: el texto no se pega al borde (5 % del ancho) y
   nada se sale de la lámina. Lo que cubre la lámina entera (fondos, franjas)
   y los adornos sin texto pegados al borde se respetan: están ahí a propósito. */
const MARGEN = 0.05;
export async function meterEnMargenes(deck, sel, { margen = MARGEN } = {}){
  let n = 0;
  const W = deck.ancho, H = deck.alto, m = Math.round(W * margen);
  for(const i of cuales(deck, sel)){
    const l = deck.laminas[i];
    for(const f of formasSueltas(deck, l)){
      if(f.rot || f.tipo === 'cxnSp') continue;
      const completo = f.w >= W * 0.9 || f.h >= H * 0.9;
      if(completo) continue;
      const conTexto = !!f.texto;
      if(f.tipo === 'sp' && !conTexto) continue;                // adorno
      const borde = conTexto ? m : 0;
      const ancho = W - 2 * borde, alto = H - 2 * borde;
      let { x, y, w, h } = f;
      if(w > ancho || h > alto){
        if(f.tipo === 'pic' || f.tipo === 'grpSp' || f.tipo === 'graphicFrame'){ const k = Math.min(ancho / w, alto / h); w *= k; h *= k; }
        else{ w = Math.min(w, ancho); h = Math.min(h, alto); }
      }
      x = Math.min(Math.max(x, borde), W - borde - w);
      y = Math.min(Math.max(y, borde), H - borde - h);
      if(Math.abs(x - f.x) < 1 && Math.abs(y - f.y) < 1 && Math.abs(w - f.w) < 1 && Math.abs(h - f.h) < 1) continue;
      if(ponerCaja(deck, l, f, { x, y, w, h })) n++;
    }
  }
  return n;
}

/* 4 · Alinear lo que está CASI alineado: bordes izquierdos a menos de 2 % del
   ancho entre sí se juntan en el que más se repite. Lo que está lejos se deja:
   si está lejos, es a propósito. */
export async function alinearCasi(deck, sel, { tolerancia = 0.02 } = {}){
  let n = 0;
  const tol = deck.ancho * tolerancia;
  for(const i of cuales(deck, sel)){
    const l = deck.laminas[i];
    const fs = formasSueltas(deck, l).filter((f) => !f.rot && (f.texto || f.tipo === 'pic') && f.w < deck.ancho * 0.9);
    const usadas = new Set();
    for(const f of fs){
      if(usadas.has(f)) continue;
      const grupo = fs.filter((g) => !usadas.has(g) && Math.abs(g.x - f.x) <= tol);
      if(grupo.length < 2){ usadas.add(f); continue; }
      grupo.forEach((g) => usadas.add(g));
      const destino = moda(grupo.map((g) => g.x));
      for(const g of grupo) if(Math.abs(g.x - destino) >= 1 && ponerCaja(deck, l, g, { x: destino, y: g.y, w: g.w, h: g.h })) n++;
    }
  }
  return n;
}
function moda(valores){
  const cuenta = new Map();
  for(const v of valores) cuenta.set(v, (cuenta.get(v) || 0) + 1);
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}

/* 5 · Igualar tamaños: los títulos que miden CASI lo mismo quedan iguales
   (al tamaño que más se repite), y lo mismo con el texto normal. Una nota al
   pie de 10 pt no se vuelve de 24: sólo se junta lo que está a ±30 %. */
export async function igualarTamanos(deck, sel, { rango = 0.3 } = {}){
  const cuadros = [];
  for(const i of cuales(deck, sel)){
    const l = deck.laminas[i];
    for(const f of formasSueltas(deck, l)){
      if(f.tipo !== 'sp' || !f.texto) continue;
      const ps = parrafosMedibles(deck, l, f);
      const pt = Math.max(...ps.map((p) => p.pt));
      if(pt > 0) cuadros.push({ l, f, pt: Math.round(pt * 2) / 2 });
    }
  }
  let n = 0;
  for(const titulos of [true, false]){
    const grupo = cuadros.filter((c) => !!c.f.titulo === titulos);
    if(grupo.length < 2) continue;
    const meta = moda(grupo.map((c) => c.pt));
    for(const c of grupo){
      if(c.pt === meta || Math.abs(c.pt - meta) / meta > rango) continue;
      // Agrandar sólo si después cabe: si no, «que quepa» lo volvería a achicar
      // y cada «Arreglar todo» se pelearía con el anterior.
      if(meta > c.pt){ const inn = interior(c.f); if(altoTexto(parrafosMedibles(deck, c.l, c.f), inn.ancho, meta / c.pt) > inn.alto) continue; }
      escalarCuadro(deck, c.l, c.f, meta / c.pt);
      n++;
    }
  }
  return n;
}

/* 6 · Aire entre renglones: el texto de varios renglones respira (115 %) y
   entre párrafos queda un espacio. Lo que ya dice su interlineado, se respeta. */
export async function aireEntreRenglones(deck, sel){
  let n = 0;
  for(const i of cuales(deck, sel)){
    const l = deck.laminas[i], doc = docDe(deck, l.ruta);
    for(const f of formasSueltas(deck, l)){
      if(f.tipo !== 'sp' || !f.texto || f.titulo) continue;
      const ps = todos(f.tb, NS.a, 'p').filter((p) => (hijo(p, NS.a, 'r') || hijo(p, NS.a, 'fld')));
      if(ps.length < 2) continue;
      let toco = false;
      for(const p of ps){
        let ppr = hijo(p, NS.a, 'pPr');
        if(ppr && (hijo(ppr, NS.a, 'lnSpc') || hijo(ppr, NS.a, 'spcAft'))) continue;
        if(!ppr){ ppr = nuevo(doc, NS.a, 'pPr'); p.insertBefore(ppr, p.firstChild); }
        tocar(deck, l.ruta);
        const ln = nuevo(doc, NS.a, 'lnSpc'); ln.appendChild(nuevo(doc, NS.a, 'spcPct', { val: '115000' }));
        const aft = nuevo(doc, NS.a, 'spcAft'); aft.appendChild(nuevo(doc, NS.a, 'spcPts', { val: '600' }));
        meterEnOrden(ppr, ln, ORDEN_PPR); meterEnOrden(ppr, aft, ORDEN_PPR);
        toco = true;
      }
      if(toco) n++;
    }
  }
  return n;
}

/* 7 · Títulos en el mismo lugar: entre láminas, los títulos que ya están
   cerca de la posición más común se ponen exactamente ahí. Así, al pasar de
   una lámina a otra, el título no brinca. */
export async function titulosEnSuLugar(deck, sel, { tolerancia = 0.08 } = {}){
  const tit = [];
  for(const i of cuales(deck, sel)){
    const l = deck.laminas[i];
    const f = formasSueltas(deck, l).find((x) => x.titulo && x.tipo === 'sp' && !x.rot);
    if(f) tit.push({ l, f });
  }
  if(tit.length < 3) return 0;
  const clave = (f) => `${Math.round(f.x / (deck.ancho * 0.01))},${Math.round(f.y / (deck.alto * 0.01))}`;
  const comun = moda(tit.map((t) => clave(t.f)));
  const ref = tit.find((t) => clave(t.f) === comun).f;
  let n = 0;
  for(const { l, f } of tit){
    const lejos = Math.abs(f.x - ref.x) / deck.ancho + Math.abs(f.y - ref.y) / deck.alto;
    if(lejos === 0 || lejos > tolerancia) continue;
    if(ponerCaja(deck, l, f, { x: ref.x, y: ref.y, w: f.w, h: f.h })) n++;
  }
  return n;
}

/* Todo junto, en el orden que no se pisa: primero lo que mueve cajas, al
   final lo que mide si el texto cabe en la caja ya acomodada. */
export async function acomodarTodo(deck, sel){
  const r = {};
  r.estiradas = await desestirarImagenes(deck, sel);
  r.margenes = await meterEnMargenes(deck, sel);
  r.alineadas = await alinearCasi(deck, sel);
  r.titulos = await titulosEnSuLugar(deck, sel);
  r.tamanos = await igualarTamanos(deck, sel);
  r.aire = await aireEntreRenglones(deck, sel);
  r.quepa = await textoQueQuepa(deck, sel);
  r.total = Object.values(r).reduce((a, b) => a + b, 0);
  return r;
}

/* ══ RECUADRO DETRÁS DEL TEXTO ════════════════════════════════════════════
   Carlos: «un recuadro tipo sombra de estos que van atrás del texto para que
   se vean de lujo». No se mete una forma nueva detrás: al PROPIO cuadro de
   texto se le pone relleno, esquinas redondas y sombra, y se agranda hacia
   afuera exactamente lo que crece su margen interno. Así el texto no se mueve
   ni un milímetro, y el recuadro viaja con el texto si luego lo mueven.
   Sólo a cuadros de texto sin relleno propio: una forma que ya tiene color
   es un diseño, no un texto suelto.
   ═════════════════════════════════════════════════════════════════════════ */
export const ESTILOS_RECUADRO = {
  cristal:   { color: '#0B0714', alfa: 0.55, borde: { color: '#FFFFFF', alfa: 0.18 }, sombra: 0.35, redondeo: 0.14 },
  // La sombra se ve A TRAVÉS del relleno translúcido: en el claro, más opaco y sombra suave, o sale gris.
  claro:     { color: '#FFFFFF', alfa: 0.93, borde: { color: '#FFFFFF', alfa: 1 }, sombra: 0.12, redondeo: 0.14 },
  solido:    { color: '#1E1428', alfa: 0.94, borde: null, sombra: 0.4, redondeo: 0.08 },
  pildora:   { color: '#0B0714', alfa: 0.6, borde: null, sombra: 0.3, redondeo: 0.5 },
};
/* En el nombre del cuadro se anota cómo estaba (caja y márgenes), para
   quitarlo y dejarlo EXACTO. «n» = ese margen no venía escrito. */
const MARCA_RECUADRO = / ·recuadro:([-\dn_]+)(?:~([\d:,]+))?$/;
function colorTextoDe(deck, l, f){
  const pal = paleta(deck, l);
  const heredado = colorDe(todos(f.el, NS.a, 'fontRef')[0], pal)?.hex || '#' + (pal.tx1 || '000000');
  let suma = 0, n = 0;
  for(const run of todos(f.tb, NS.a, 'r')){
    const t = (hijo(run, NS.a, 't')?.textContent || '').trim().length;
    if(!t) continue;
    const c = colorDe(hijo(hijo(run, NS.a, 'rPr'), NS.a, 'solidFill'), pal)?.hex || heredado;
    suma += lum(c) * t; n += t;
  }
  return n ? suma / n : lum(heredado);
}
export async function ponerRecuadro(deck, sel, { estilo = 'auto', color, alfa, en = 'todo', relleno = 0.18 } = {}){
  let n = 0;
  for(const i of cuales(deck, sel)){
    const l = deck.laminas[i], doc = docDe(deck, l.ruta);
    for(const f of formasSueltas(deck, l)){
      if(f.tipo !== 'sp' || !f.texto || f.rot) continue;
      if(en === 'titulos' && !f.titulo) continue;
      if(en === 'texto' && f.titulo) continue;
      const cnv = todos(f.el, NS.p, 'cNvPr')[0];
      const spPr = hijo(f.el, NS.p, 'spPr');
      const ya = MARCA_RECUADRO.test(cnv?.getAttribute('name') || '');
      if(!ya && spPr && [...spPr.children].some((x) => ['solidFill', 'gradFill', 'blipFill', 'pattFill'].includes(x.localName))) continue;
      // Automático: texto oscuro → cristal claro; texto claro → cristal oscuro. Así nunca se pierde el texto ni se le cambian sus colores.
      const nombre = estilo === 'auto' ? (colorTextoDe(deck, l, f) < 0.35 ? 'claro' : 'cristal') : estilo;
      const e = { ...(ESTILOS_RECUADRO[nombre] || ESTILOS_RECUADRO.cristal) };
      if(color) e.color = color;
      if(alfa != null) e.alfa = Math.min(1, Math.max(0.1, Number(alfa)));
      if(!ya){
        const bp0 = hijo(f.tb, NS.a, 'bodyPr');
        const orig = [f.x, f.y, f.w, f.h, ...['lIns', 'rIns', 'tIns', 'bIns'].map((a) => bp0.getAttribute(a) ?? 'n')];
        const lnOrig = [];
        /* Canva escribe interlineados fijos enormes (129 pt para una letra de
           62): el texto queda pegado abajo de un renglón altísimo y el recuadro
           se ve vacío arriba. Se normaliza a 1.15× la letra, bajando el cuadro
           lo mismo que se quitó para que la línea de base no se mueva. */
        let bajar = 0;
        for(const [k, p] of todos(f.tb, NS.a, 'p').entries()){
          const pts = todos(hijo(hijo(p, NS.a, 'pPr'), NS.a, 'lnSpc'), NS.a, 'spcPts')[0];
          if(!pts) continue;
          const pm = parrafosMedibles(deck, l, { ...f, tb: f.tb }).find(() => true);
          const letraPt = Math.max(...[...p.getElementsByTagNameNS(NS.a, 'rPr')].map((r) => Number(r.getAttribute('sz')) / 100 || 0), pm?.pt || 0);
          const L = Number(pts.getAttribute('val')) / 100;
          if(letraPt && L > letraPt * 1.3){
            const nuevoL = Math.round(letraPt * 1.15 * 100);
            if(!bajar) bajar = (L - nuevoL / 100) * EMU_PT;   // sólo el primer renglón empuja el texto
            lnOrig.push(`${k}:${pts.getAttribute('val')}`);
            pts.setAttribute('val', String(nuevoL));
          }
        }
        if(bajar){ tocar(deck, l.ruta); ponerCaja(deck, l, f, { x: f.x, y: f.y + bajar, w: f.w, h: Math.max(1, f.h - bajar) }); }
        const ps = parrafosMedibles(deck, l, f);
        const pt = Math.max(10, ...ps.map((p) => p.pt));
        const pad = Math.round(pt * EMU_PT * (0.35 + relleno));
        const bp = hijo(f.tb, NS.a, 'bodyPr');
        const ins = (a, d) => { const v = bp.getAttribute(a); return v == null ? d : Number(v); };
        const L = f.x + ins('lIns', 91440), T = f.y + ins('tIns', 45720);
        const W = f.w - ins('lIns', 91440) - ins('rIns', 91440), H = f.h - ins('tIns', 45720) - ins('bIns', 45720);
        const med = medirTexto(ps, W / EMU_PT, 1);
        /* El recuadro abraza al TEXTO, no al cuadro: los de Canva miden toda
           la lámina de ancho con el texto centrado, y el recuadro salía
           enorme. Sólo se ciñe de lado si todos los párrafos dicen su
           alineación (si la heredan de la plantilla, no se sabe y se deja). */
        const alineas = todos(f.tb, NS.a, 'p').filter((p) => hijo(p, NS.a, 'r')).map((p) => hijo(p, NS.a, 'pPr')?.getAttribute('algn') || null);
        const algn = alineas.length && alineas.every((a) => a && a === alineas[0]) ? alineas[0] : (f.ph ? null : (alineas.every((a) => !a || a === 'l') ? 'l' : null));
        const tw = algn ? Math.min(W, (med.ancho * 1.1 + 4) * EMU_PT) : W;
        const ancla = bp.getAttribute('anchor') || (f.ph ? null : 't');
        const th = ancla ? Math.max(Math.min(H, med.alto * 1.04 * EMU_PT), 1) : H;
        const x0 = algn === 'ctr' ? L + (W - tw) / 2 : algn === 'r' ? L + W - tw : L;
        const y0 = ancla === 'ctr' ? T + (H - th) / 2 : ancla === 'b' ? T + H - th : T;
        const alto = med.alto * EMU_PT > H ? med.alto * 1.04 * EMU_PT : th;   // si ya se desbordaba, que el recuadro alcance todo el texto
        ponerCaja(deck, l, f, { x: x0 - pad, y: y0 - pad, w: tw + 2 * pad, h: alto + 2 * pad });
        for(const a of ['lIns', 'rIns', 'tIns', 'bIns']) bp.setAttribute(a, String(pad));
        cnv?.setAttribute('name', `${cnv.getAttribute('name') || 'Texto'} ·recuadro:${orig.map((v) => String(Math.round(Number(v)) || v)).join('_')}${lnOrig.length ? '~' + lnOrig.join(',') : ''}`);
      }
      tocar(deck, l.ruta);
      const pr = hijo(f.el, NS.p, 'spPr');
      [...pr.children].filter((x) => ['prstGeom', 'custGeom', ...RELLENOS, 'ln', 'effectLst'].includes(x.localName)).forEach((x) => x.remove());
      const geo = nuevo(doc, NS.a, 'prstGeom', { prst: e.redondeo ? 'roundRect' : 'rect' });
      const av = nuevo(doc, NS.a, 'avLst');
      if(e.redondeo) av.appendChild(nuevo(doc, NS.a, 'gd', { name: 'adj', fmla: `val ${Math.round(Math.min(0.5, e.redondeo) * 100000)}` }));
      geo.appendChild(av);
      meterEnOrden(pr, geo, ORDEN_SPPR);
      const clr = (hex, a) => { const c = nuevo(doc, NS.a, 'srgbClr', { val: hex6(hex) || '000000' }); if(a < 1) c.appendChild(nuevo(doc, NS.a, 'alpha', { val: String(Math.round(a * 100000)) })); return c; };
      const sf = nuevo(doc, NS.a, 'solidFill'); sf.appendChild(clr(e.color, e.alfa)); meterEnOrden(pr, sf, ORDEN_SPPR);
      const ln = nuevo(doc, NS.a, 'ln', { w: '9525' });
      if(e.borde){ const lf = nuevo(doc, NS.a, 'solidFill'); lf.appendChild(clr(e.borde.color, e.borde.alfa)); ln.appendChild(lf); }
      else ln.appendChild(nuevo(doc, NS.a, 'noFill'));
      meterEnOrden(pr, ln, ORDEN_SPPR);
      if(e.sombra){
        const ef = nuevo(doc, NS.a, 'effectLst');
        const sh = nuevo(doc, NS.a, 'outerShdw', { blurRad: '266700', dist: '63500', dir: '5400000', algn: 't', rotWithShape: '0' });
        sh.appendChild(clr('#000000', e.sombra)); ef.appendChild(sh);
        meterEnOrden(pr, ef, ORDEN_SPPR);
      }
      n++;
    }
  }
  return n;
}
/* Quitar: sólo los recuadros que puso esta herramienta (los reconoce por la
   marca en el nombre), y el cuadro regresa EXACTO a su caja y márgenes. */
export async function quitarRecuadro(deck, sel){
  let n = 0;
  for(const i of cuales(deck, sel)){
    const l = deck.laminas[i];
    for(const f of formasSueltas(deck, l)){
      const cnv = todos(f.el, NS.p, 'cNvPr')[0], m = (cnv?.getAttribute('name') || '').match(MARCA_RECUADRO);
      if(!m) continue;
      const [x, y, w, h, ...insets] = m[1].split('_');
      tocar(deck, l.ruta);
      const pr = hijo(f.el, NS.p, 'spPr');
      [...pr.children].filter((q) => [...RELLENOS, 'ln', 'effectLst'].includes(q.localName)).forEach((q) => q.remove());
      const geo = hijo(pr, NS.a, 'prstGeom'); if(geo){ geo.setAttribute('prst', 'rect'); geo.replaceChildren(nuevo(docDe(deck, l.ruta), NS.a, 'avLst')); }
      const bp = hijo(f.tb, NS.a, 'bodyPr');
      ['lIns', 'rIns', 'tIns', 'bIns'].forEach((a, k) => { if(insets[k] === 'n' || insets[k] == null) bp.removeAttribute(a); else bp.setAttribute(a, insets[k]); });
      const ps = todos(f.tb, NS.a, 'p');
      for(const par of (m[2] || '').split(',').filter(Boolean)){
        const [k, val] = par.split(':');
        const pts = todos(hijo(hijo(ps[Number(k)], NS.a, 'pPr'), NS.a, 'lnSpc'), NS.a, 'spcPts')[0];
        if(pts) pts.setAttribute('val', val);
      }
      ponerCaja(deck, l, f, { x: Number(x), y: Number(y), w: Number(w), h: Number(h) });
      cnv.setAttribute('name', cnv.getAttribute('name').replace(MARCA_RECUADRO, ''));
      n++;
    }
  }
  return n;
}

/* ══ LÁMINA NUEVA (copia de una que ya existe) ════════════════════════════
   Para «qué apartados sumar»: la IA propone una lámina nueva con el diseño de
   otra y sus textos. Se copia la lámina con sus relaciones MENOS las notas
   del orador y los comentarios: dos láminas que comparten las mismas notas
   es de lo que PowerPoint se queja al abrir. */
const T_NOTAS = /\/(notesSlide|comments|commentAuthors)$/;
export async function duplicarLamina(deck, i, { despues = i } = {}){
  const l = deck.laminas[i];
  if(!l) throw new Error('No existe esa lámina.');
  let n = deck.laminas.length + 1;
  while(deck.zip.file(`ppt/slides/slide${n}.xml`) || deck.partes.has(`ppt/slides/slide${n}.xml`)) n++;
  const ruta = `ppt/slides/slide${n}.xml`, rr = relsDe(ruta);
  const ser = new XMLSerializer();
  const nuevoDoc = new DOMParser().parseFromString(ser.serializeToString(docDe(deck, l.ruta)), 'application/xml');
  if(deck._grabando && !deck._grabando.partes.has(ruta)) deck._grabando.partes.set(ruta, null);
  deck.partes.set(ruta, nuevoDoc); tocar(deck, ruta);
  const relsOrigen = await parte(deck, relsDe(l.ruta));
  if(relsOrigen){
    const copia = new DOMParser().parseFromString(ser.serializeToString(relsOrigen), 'application/xml');
    for(const r of todos(copia.documentElement, NS.rel, 'Relationship')) if(T_NOTAS.test(r.getAttribute('Type'))) r.remove();
    if(deck._grabando && !deck._grabando.partes.has(rr)) deck._grabando.partes.set(rr, null);
    deck.partes.set(rr, copia); tocar(deck, rr);
  }
  // [Content_Types].xml
  const ct = await parte(deck, '[Content_Types].xml');
  tocar(deck, '[Content_Types].xml');
  const ov = ct.createElementNS(NS.ct, 'Override');
  ov.setAttribute('PartName', '/' + ruta); ov.setAttribute('ContentType', 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml');
  ct.documentElement.appendChild(ov);
  // presentation.xml: relación y lugar en la lista
  const id = await relNueva(deck, 'ppt/presentation.xml', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide', ruta);
  const pres = docDe(deck, 'ppt/presentation.xml');
  tocar(deck, 'ppt/presentation.xml');
  const lista = todos(pres.documentElement, NS.p, 'sldIdLst')[0];
  const ids = todos(lista, NS.p, 'sldId');
  const s = nuevo(pres, NS.p, 'sldId', { id: String(Math.max(255, ...ids.map((x) => Number(x.getAttribute('id')) || 0)) + 1) });
  s.setAttributeNS(NS.r, 'r:id', id);
  lista.insertBefore(s, ids[despues + 1] || null);
  await leerLaminas(deck);
  return despues + 1;
}
/* Lámina nueva con textos: { copiaDe, despues, textos: ['título', 'cuerpo'…] }.
   Los textos van en orden a los cuadros de la copia (el título primero). */
export async function laminaNueva(deck, { copiaDe, despues = copiaDe, textos = [] }){
  const j = await duplicarLamina(deck, copiaDe, { despues });
  const cuadros = textosDe(deck, j);
  cuadros.forEach((c, k) => { if(k < textos.length) ponerTextoSinc(deck, j, c.id, textos[k]); });
  // Los cuadros de la copia que no recibieron texto se vacían: no se deja texto viejo de otra lámina.
  cuadros.slice(textos.length).forEach((c) => ponerTextoSinc(deck, j, c.id, ''));
  return j;
}
function textosDe(deck, i){
  const t = textos(deck, i);
  return [...t.filter((x) => x.titulo), ...t.filter((x) => !x.titulo)];
}
function ponerTextoSinc(deck, i, forma, texto){ return ponerTexto(deck, i, forma, texto); }
