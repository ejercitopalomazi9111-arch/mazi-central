/* ══════════════════════════════════════════════════════════════════════════
   INKWELL · una serie en UN archivo
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «poder descargar la tira con todos los episodios en uno solo por
   serie». Dos formatos, los dos los abre Libros del iPhone sin instalar nada:
   · CÓMIC → PDF. Cada imagen es una página del ancho de la tira, una debajo
     de otra; con «Desplazamiento vertical» se lee como en Webtoon. Antes de
     cada capítulo va una página con su nombre.
   · TEXTO → EPUB, con un capítulo por archivo y su índice.
   Hechos a mano, sin librerías: un PDF de imágenes JPEG y un ZIP sin
   comprimir son formatos chicos y estables. El archivo se arma por pedazos
   (Blob de partes) para no juntar cientos de megas en un solo texto.
   ═════════════════════════════════════════════════════════════════════════ */

/* ── tamaño de un JPEG leyendo su cabecera (SOF), sin decodificarlo ── */
export function tamanoJpeg(b){
  if(b[0] !== 0xFF || b[1] !== 0xD8) return null;
  let p = 2;
  while(p + 9 < b.length){
    if(b[p] !== 0xFF){ p++; continue; }
    const m = b[p + 1], largo = (b[p + 2] << 8) | b[p + 3];
    if(m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC)
      return { alto: (b[p + 5] << 8) | b[p + 6], ancho: (b[p + 7] << 8) | b[p + 8], componentes: b[p + 9] };
    p += 2 + largo;
  }
  return null;
}

/* Texto para el PDF en WinAnsi (las fuentes base traen á, é, ñ, ¿…). */
const winAnsi = (s) => {
  const out = [];
  for(const ch of String(s)){
    const c = ch.codePointAt(0);
    if(ch === '(' || ch === ')' || ch === '\\'){ out.push(92, c); continue; }
    if(c < 128) out.push(c); else if(c >= 160 && c <= 255) out.push(c);
    else out.push(({ 8211: 150, 8212: 151, 8216: 145, 8217: 146, 8220: 147, 8221: 148, 8230: 133 })[c] || 63);
  }
  return Uint8Array.from(out);
};
const enc = new TextEncoder();
const ascii = (s) => enc.encode(s);

/* paginas: [{ tipo:'imagen', jpeg:Uint8Array, ancho, alto, gris? } | { tipo:'titulo', texto, sub? }] → Blob PDF */
export function pdf(paginas, { titulo = 'INKWELL', ancho: anchoTitulo = 800 } = {}){
  const partes = [], xref = [];
  let pos = 0;
  const poner = (x) => { const b = typeof x === 'string' ? ascii(x) : x; partes.push(b); pos += b.length; };
  let n = 2;                                          // 1 = catálogo, 2 = páginas
  const objetos = [];                                  // [num, () => escribir]
  const kids = [];
  const fuente = ++n;
  objetos.push([fuente, () => poner(`${fuente} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n`)]);
  for(const p of paginas){
    const pag = ++n, cont = ++n;
    kids.push(pag);
    if(p.tipo === 'imagen'){
      const img = ++n;
      objetos.push([img, () => {
        poner(`${img} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.ancho} /Height ${p.alto} /ColorSpace /${p.gris ? 'DeviceGray' : 'DeviceRGB'} /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`);
        poner(p.jpeg); poner('\nendstream\nendobj\n');
      }]);
      const c = `q ${p.ancho} 0 0 ${p.alto} 0 0 cm /Im Do Q`;
      objetos.push([pag, () => poner(`${pag} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.ancho} ${p.alto}] /Resources << /XObject << /Im ${img} 0 R >> >> /Contents ${cont} 0 R >>\nendobj\n`)]);
      objetos.push([cont, () => poner(`${cont} 0 obj\n<< /Length ${c.length} >>\nstream\n${c}\nendstream\nendobj\n`)]);
    } else {
      const W = anchoTitulo, H = Math.round(W * 0.5);
      const t1 = winAnsi(p.texto), t2 = p.sub ? winAnsi(p.sub) : null;
      const tam = Math.max(18, Math.min(44, Math.floor((W - 80) / Math.max(8, t1.length) * 1.9)));
      const linea = (bytes, size, y, gris) => [ascii(`${gris} g BT /F ${size} Tf 40 ${y} Td (`), bytes, ascii(') Tj ET\n')];
      const trozos = [ascii(`0.07 0.06 0.09 rg 0 0 ${W} ${H} re f\n`), ...linea(t1, tam, Math.round(H / 2), '0.95'), ...(t2 ? linea(t2, 18, Math.round(H / 2) - tam - 6, '0.65') : [])];
      const largo = trozos.reduce((s, b) => s + b.length, 0);
      objetos.push([pag, () => poner(`${pag} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F ${fuente} 0 R >> >> /Contents ${cont} 0 R >>\nendobj\n`)]);
      objetos.push([cont, () => { poner(`${cont} 0 obj\n<< /Length ${largo} >>\nstream\n`); trozos.forEach(poner); poner('\nendstream\nendobj\n'); }]);
    }
  }
  const info = ++n;
  poner('%PDF-1.4\n'); poner(Uint8Array.of(0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A));   // binario: que nadie lo trate como texto
  xref[1] = pos; poner(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R /PageLayout /OneColumn >>\nendobj\n`);
  xref[2] = pos; poner(`2 0 obj\n<< /Type /Pages /Kids [${kids.map((k) => k + ' 0 R').join(' ')}] /Count ${kids.length} >>\nendobj\n`);
  for(const [num, escribir] of objetos.sort((a, b) => a[0] - b[0])){ xref[num] = pos; escribir(); }
  xref[info] = pos;
  poner(`${info} 0 obj\n<< /Title (`); poner(winAnsi(titulo)); poner(`) /Producer (INKWELL) >>\nendobj\n`);
  const inicioXref = pos;
  let tabla = `xref\n0 ${info + 1}\n0000000000 65535 f \n`;
  for(let i = 1; i <= info; i++) tabla += String(xref[i] || 0).padStart(10, '0') + ' 00000 n \n';
  poner(tabla + `trailer\n<< /Size ${info + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`);
  return new Blob(partes, { type: 'application/pdf' });
}

/* ── ZIP sin comprimir (lo que pide EPUB para el «mimetype») ── */
const TABLA = (() => { const t = new Uint32Array(256); for(let i = 0; i < 256; i++){ let c = i; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; } return t; })();
export function crc32(b){ let c = 0xFFFFFFFF; for(let i = 0; i < b.length; i++) c = TABLA[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
export function zip(archivos){                         // [{ nombre, datos: Uint8Array|string }]
  const partes = [], central = [];
  const hoy = new Date(), fecha = ((hoy.getFullYear() - 1980) << 9) | ((hoy.getMonth() + 1) << 5) | hoy.getDate();
  let pos = 0;
  for(const a of archivos){
    const nombre = enc.encode(a.nombre), datos = typeof a.datos === 'string' ? enc.encode(a.datos) : a.datos, crc = crc32(datos);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034B50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(12, fecha, true);
    h.setUint32(14, crc, true); h.setUint32(18, datos.length, true); h.setUint32(22, datos.length, true); h.setUint16(26, nombre.length, true);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014B50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(14, fecha, true);
    c.setUint32(16, crc, true); c.setUint32(20, datos.length, true); c.setUint32(24, datos.length, true); c.setUint16(28, nombre.length, true); c.setUint32(42, pos, true);
    partes.push(new Uint8Array(h.buffer), nombre, datos); central.push(new Uint8Array(c.buffer), nombre);
    pos += 30 + nombre.length + datos.length;
  }
  const tamCentral = central.reduce((s, b) => s + b.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054B50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamCentral, true); fin.setUint32(16, pos, true);
  return new Blob([...partes, ...central, new Uint8Array(fin.buffer)], { type: 'application/zip' });
}

/* ── EPUB: capitulos = [{ titulo, html }] (html ya limpio) ── */
const x = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/* el HTML limpio viene del navegador: a XHTML hay que cerrar <br> */
const xhtml = (html) => html.replace(/<br\s*>/gi, '<br/>').replace(/&nbsp;/g, '&#160;');
export function epub({ titulo, autor = '', id, capitulos }){
  const uid = 'urn:inkwell:' + (id || Date.now());
  const caps = capitulos.map((c, i) => ({ ...c, archivo: `cap${String(i + 1).padStart(4, '0')}.xhtml` }));
  const archivos = [
    { nombre: 'mimetype', datos: 'application/epub+zip' },
    { nombre: 'META-INF/container.xml', datos: '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/libro.opf" media-type="application/oebps-package+xml"/></rootfiles></container>' },
    { nombre: 'OEBPS/libro.opf', datos: `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="es"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">${x(uid)}</dc:identifier><dc:title>${x(titulo)}</dc:title><dc:creator>${x(autor || 'Desconocido')}</dc:creator><dc:language>es</dc:language><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta></metadata><manifest><item id="nav" href="indice.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="estilo.css" media-type="text/css"/>${caps.map((c, i) => `<item id="c${i}" href="${c.archivo}" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine>${caps.map((c, i) => `<itemref idref="c${i}"/>`).join('')}</spine></package>` },
    { nombre: 'OEBPS/estilo.css', datos: 'body{font-family:serif;line-height:1.6;margin:0 5%}h1{font-size:1.4em;margin:1.5em 0 1em;text-align:center}p{margin:0 0 .8em;text-indent:1.2em}' },
    { nombre: 'OEBPS/indice.xhtml', datos: `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="es"><head><title>${x(titulo)}</title></head><body><nav epub:type="toc"><h1>${x(titulo)}</h1><ol>${caps.map((c) => `<li><a href="${c.archivo}">${x(c.titulo)}</a></li>`).join('')}</ol></nav></body></html>` },
    ...caps.map((c) => ({ nombre: 'OEBPS/' + c.archivo, datos: `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="es"><head><title>${x(c.titulo)}</title><link rel="stylesheet" href="estilo.css"/></head><body><h1>${x(c.titulo)}</h1>${xhtml(c.html)}</body></html>` })),
  ];
  return new Blob([zip(archivos)], { type: 'application/epub+zip' });
}
