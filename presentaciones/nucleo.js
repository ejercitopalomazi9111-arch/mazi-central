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
  const rels = await relaciones(deck, 'ppt/presentation.xml');
  const tam = todos(pres.documentElement, NS.p, 'sldSz')[0];
  deck.ancho = Number(tam?.getAttribute('cx')) || 12192000;
  deck.alto = Number(tam?.getAttribute('cy')) || 6858000;
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
  return deck;
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
      const detras = relleno && relleno.alfa > 0.5 ? relleno.hex : bg;
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
      f.relleno = spPr && await leerRelleno(deck, ruta, spPr, pal);
      const ln = hijo(spPr, NS.a, 'ln');
      if(ln && !hijo(ln, NS.a, 'noFill')){ const c = colorDe(hijo(ln, NS.a, 'solidFill'), pal); if(c) f.borde = { color: c.hex, ancho: (num(ln, 'w') || 12700) }; }
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
