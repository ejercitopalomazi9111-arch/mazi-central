/* INKWELL · LIBROS — lo que sube cada quien desde su teléfono: EPUB, PDF o TXT.
   Todo se queda en el teléfono (IndexedDB «inkwell-libros»): nada se publica.
   El EPUB se abre aquí mismo, sin librerías: un ZIP se lee con su directorio
   central y DecompressionStream («deflate-raw», Safari 16.4+), y el HTML de
   cada capítulo se reconstruye sólo con etiquetas de texto (sin scripts,
   estilos, enlaces ni atributos), igual que el texto de Wattpad en Tiras. */

/* ── ZIP ── */
export async function leerZip(buf){
  const b = new Uint8Array(buf), v = new DataView(buf);
  let fin = -1;
  for(let i = b.length - 22; i >= Math.max(0, b.length - 70000); i--){ if(v.getUint32(i, true) === 0x06054B50){ fin = i; break; } }
  if(fin < 0) throw new Error('Ese archivo no es un EPUB válido.');
  const total = v.getUint16(fin + 10, true); let p = v.getUint32(fin + 16, true);
  const dec = new TextDecoder();
  const mapa = new Map();
  for(let k = 0; k < total; k++){
    if(v.getUint32(p, true) !== 0x02014B50) break;
    const metodo = v.getUint16(p + 10, true), comp = v.getUint32(p + 20, true);
    const nl = v.getUint16(p + 28, true), el = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), local = v.getUint32(p + 42, true);
    const nombre = dec.decode(b.subarray(p + 46, p + 46 + nl));
    mapa.set(nombre, async () => {
      const ini = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
      const datos = b.subarray(ini, ini + comp);
      if(metodo === 0) return datos;
      if(metodo !== 8) throw new Error('Compresión no soportada');
      const s = new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(s).arrayBuffer());
    });
    p += 46 + nl + el + cl;
  }
  return mapa;
}

/* ── texto seguro ── */
const PERMITIDOS = new Set(['P', 'BR', 'B', 'I', 'EM', 'STRONG', 'U', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'HR']);
export function limpiar(nodo, doc = document){
  const sale = doc.createElement('div');
  const copiar = (de, a) => {
    for(const n of de.childNodes){
      if(n.nodeType === 3){ a.append(doc.createTextNode(n.nodeValue)); continue; }
      if(n.nodeType !== 1) continue;
      const t = n.tagName.toUpperCase().replace(/^.*:/, '');
      if(/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|IMG|IMAGE|VIDEO|AUDIO|SVG|HEAD|TITLE|LINK|META|FORM|INPUT|BUTTON)$/.test(t)) continue;
      if(PERMITIDOS.has(t)){ const e = doc.createElement(t.toLowerCase()); copiar(n, e); a.append(e); }
      else if(t === 'DIV' || t === 'SECTION' || t === 'ARTICLE'){ copiar(n, a); }
      else copiar(n, a);
    }
  };
  copiar(nodo, sale);
  return sale.innerHTML.trim();
}

const resolver = (base, href) => {
  const partes = (base + decodeURIComponent(href.split('#')[0])).split('/'), out = [];
  for(const x of partes){ if(x === '..') out.pop(); else if(x !== '.') out.push(x); }
  return out.join('/');
};

/* ── EPUB → { titulo, autor, portada (Blob), capitulos: [{ titulo, html }] } ── */
export async function leerEpub(buf){
  const zip = await leerZip(buf), dec = new TextDecoder();
  const texto = async (n) => { const f = zip.get(n); if(!f) throw new Error('Al EPUB le falta ' + n); return dec.decode(await f()); };
  const xml = (s) => new DOMParser().parseFromString(s, 'application/xml');
  const cont = xml(await texto('META-INF/container.xml'));
  const ruta = cont.getElementsByTagName('rootfile')[0]?.getAttribute('full-path');
  if(!ruta) throw new Error('Ese EPUB no dice dónde está su índice.');
  const base = ruta.includes('/') ? ruta.slice(0, ruta.lastIndexOf('/') + 1) : '';
  const opf = xml(await texto(ruta));
  const dc = (n) => opf.getElementsByTagNameNS('*', n)[0]?.textContent?.trim() || '';
  const items = new Map();
  for(const it of opf.getElementsByTagNameNS('*', 'item')) items.set(it.getAttribute('id'), { href: it.getAttribute('href'), tipo: it.getAttribute('media-type') || '', props: it.getAttribute('properties') || '' });
  // portada
  let portada = null;
  let idPortada = [...items].find(([, x]) => /cover-image/.test(x.props))?.[0];
  if(!idPortada) idPortada = [...opf.getElementsByTagNameNS('*', 'meta')].find((m) => m.getAttribute('name') === 'cover')?.getAttribute('content');
  const ip = idPortada && items.get(idPortada);
  if(ip && /^image\//.test(ip.tipo) && zip.get(resolver(base, ip.href))){
    try{ portada = new Blob([await zip.get(resolver(base, ip.href))()], { type: ip.tipo }); }catch{ portada = null; }
  }
  // capítulos en el orden del lomo (spine)
  const capitulos = [];
  for(const ref of opf.getElementsByTagNameNS('*', 'itemref')){
    const it = items.get(ref.getAttribute('idref'));
    if(!it || !/html/.test(it.tipo) || /\bnav\b/.test(it.props)) continue;
    const f = zip.get(resolver(base, it.href)); if(!f) continue;
    const doc = new DOMParser().parseFromString(dec.decode(await f()), 'text/html');
    const html = limpiar(doc.body || doc.documentElement);
    if(!html.replace(/<[^>]+>/g, '').trim()) continue;
    const t = (doc.querySelector('h1,h2,h3')?.textContent || doc.title || '').trim();
    capitulos.push({ titulo: t || `Parte ${capitulos.length + 1}`, html });
  }
  if(!capitulos.length) throw new Error('No encontré texto en ese EPUB.');
  return { titulo: dc('title') || 'Sin título', autor: dc('creator'), portada, capitulos };
}

/* ── TXT → capítulos por renglones «Capítulo …» (o uno solo) ── */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function leerTxt(buf, nombre = 'Sin título'){
  let s = new TextDecoder('utf-8').decode(buf);
  if(s.includes('�')) s = new TextDecoder('windows-1252').decode(buf);
  s = s.replace(/\r\n?/g, '\n');
  const lineas = s.split('\n'), capitulos = [];
  let actual = null;
  const nuevo = (t) => { actual = { titulo: t, partes: [] }; capitulos.push(actual); };
  for(const l of lineas){
    if(/^\s*(cap[ií]tulo|chapter|parte)\s+\S+/i.test(l) && l.trim().length < 80){ nuevo(l.trim()); continue; }
    if(!actual) nuevo(nombre);
    actual.partes.push(l);
  }
  const html = (partes) => partes.join('\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const caps = capitulos.map((c) => ({ titulo: c.titulo, html: html(c.partes) })).filter((c) => c.html);
  if(!caps.length) throw new Error('Ese archivo de texto está vacío.');
  return { titulo: nombre, autor: '', portada: null, capitulos: caps };
}

/* ── la base del teléfono ── */
function abrir(){
  return new Promise((ok, mal) => {
    const q = indexedDB.open('inkwell-libros', 1);
    q.onupgradeneeded = () => q.result.createObjectStore('libros', { keyPath: 'id' });
    q.onsuccess = () => ok(q.result); q.onerror = () => mal(q.error);
  });
}
export async function tx(modo, fn){
  const d = await abrir();
  return new Promise((ok, mal) => {
    const t = d.transaction('libros', modo), st = t.objectStore('libros'); let res;
    const r = fn(st); if(r) r.onsuccess = () => { res = r.result; };
    t.oncomplete = () => ok(res); t.onerror = () => mal(t.error);
  });
}
export const todos = async () => ((await tx('readonly', (st) => st.getAll())) || []).sort((a, b) => (b.abierto || b.agregado) - (a.abierto || a.agregado));
export const uno = (id) => tx('readonly', (st) => st.get(id));
export const guardar = (l) => tx('readwrite', (st) => st.put(l));
export const quitar = (id) => tx('readwrite', (st) => st.delete(id));

/* un archivo del teléfono → registro listo para guardar */
export async function importar(file){
  const nombre = file.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim() || 'Sin título';
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const buf = await file.arrayBuffer();
  const base = { id: 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), agregado: Date.now(), avance: { cap: 0, y: 0 } };
  if(ext === 'epub' || file.type === 'application/epub+zip') return { ...base, tipo: 'epub', ...(await leerEpub(buf)) };
  if(ext === 'txt' || file.type === 'text/plain') return { ...base, tipo: 'txt', ...leerTxt(buf, nombre) };
  if(ext === 'pdf' || file.type === 'application/pdf') return { ...base, tipo: 'pdf', titulo: nombre, autor: '', portada: null, pdf: new Blob([buf], { type: 'application/pdf' }) };
  throw new Error(`«${file.name}» no es EPUB, PDF ni TXT.`);
}
