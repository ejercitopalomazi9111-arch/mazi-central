/* ══════════════════════════════════════════════════════════════════════════
   JABONERA · EXPORTAR A EXCEL DE VERDAD
   ──────────────────────────────────────────────────────────────────────────
   Un `.xlsx` auténtico, con varias hojas, encabezados en negrita, fechas que
   Excel reconoce como fechas y pesos con formato de moneda. Sin una sola
   dependencia: un .xlsx es un ZIP con unos XML dentro, y eso cabe aquí.

   POR QUÉ NO UN CSV, que habría sido cuatro líneas:
   · un CSV es UNA tabla, y aquí hacen falta siete (resumen, por baño, por
     día, visitas, entregas, baños, productos). Siete archivos sueltos se
     pierden y no se pueden presentar;
   · en un CSV las fechas llegan como texto y Excel en español las malinterpreta
     según la computadora — 05/01 puede ser 5 de enero o 1 de mayo;
   · y los números con decimales cambian de significado según la coma o el
     punto del sistema. En un .xlsx el número viaja como número.

   EL ZIP VA SIN COMPRIMIR (método 0, «store»). No hace falta: son unos
   kilobytes de XML, y comprimir obligaría a traer un deflate entero. Excel,
   LibreOffice y Google Sheets abren un ZIP sin comprimir igual de bien.
   ═════════════════════════════════════════════════════════════════════════ */
/* ⚠ TODO EL ARCHIVO VA DENTRO DE UNA FUNCIÓN, y no es manía. Estos módulos se
   cargan con <script src> clásico —no como módulos ES, porque un módulo ES no
   carga desde `file://` y ahí se acabaría el «lo abro en la compu del salón»—
   y los scripts clásicos COMPARTEN el ámbito global. Los tres declaraban
   `const API` al final y el segundo reventaba con «Identifier 'API' has
   already been declared», dejando la página en blanco. En node no pasaba
   porque ahí cada archivo tiene su propio ámbito: sólo se vio abriéndolo en
   un navegador de verdad. */
(function(){
'use strict';


/* ── CRC-32, que el ZIP exige por cada archivo ─────────────────────────── */
const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for(let n = 0; n < 256; n++){
    let c = n;
    for(let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes){
  let c = 0xFFFFFFFF;
  for(let i = 0; i < bytes.length; i++) c = TABLA_CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

const utf8 = s => new TextEncoder().encode(s);

/* ── el ZIP ────────────────────────────────────────────────────────────── */
function armarZip(archivos){
  const partes = [], central = [];
  let offset = 0;

  const u16 = n => [n & 0xFF, (n >>> 8) & 0xFF];
  const u32 = n => [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF];

  for(const { nombre, datos } of archivos){
    const nom = utf8(nombre);
    const crc = crc32(datos);
    /* Fecha fija (1980-01-01). Un .xlsx no usa la fecha del ZIP para nada, y
       fijarla hace que dos exportaciones del mismo dato den el mismo archivo
       — que es lo que permite comprobarlo en una prueba. */
    const cab = [
      ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0),
      ...u16(0), ...u16(0x0021),
      ...u32(crc), ...u32(datos.length), ...u32(datos.length),
      ...u16(nom.length), ...u16(0),
    ];
    partes.push(new Uint8Array(cab), nom, datos);

    central.push([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0),
      ...u16(0), ...u16(0x0021),
      ...u32(crc), ...u32(datos.length), ...u32(datos.length),
      ...u16(nom.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(0), ...u32(offset),
      ...Array.from(nom),
    ]);
    offset += cab.length + nom.length + datos.length;
  }

  const dir = new Uint8Array(central.flat());
  const fin = new Uint8Array([
    ...u32(0x06054b50), ...u16(0), ...u16(0),
    ...u16(archivos.length), ...u16(archivos.length),
    ...u32(dir.length), ...u32(offset), ...u16(0),
  ]);

  const total = partes.reduce((s,p) => s + p.length, 0) + dir.length + fin.length;
  const out = new Uint8Array(total);
  let p = 0;
  for(const t of [...partes, dir, fin]){ out.set(t, p); p += t.length; }
  return out;
}

/* ── XML ───────────────────────────────────────────────────────────────── */
const esc = s => String(s ?? '')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;')
  /* Excel rompe el archivo entero si le llega un carácter de control. */
  .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'');

/** Columna 1 → A, 27 → AA. */
function letraCol(n){
  let s = '';
  while(n > 0){ const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - 1 - r) / 26; }
  return s;
}

/** Fecha → número de serie de Excel. El día 0 es el 30/12/1899, y la fecha
 *  se pasa a hora LOCAL primero: si no, una visita de las 08:00 en México
 *  aparece en Excel a las 14:00 y el análisis por hora se va al carajo. */
function serieExcel(ts){
  const d = new Date(ts);
  return (d.getTime() - d.getTimezoneOffset() * 60000) / 86400000 + 25569;
}

/* Estilos: 0 normal · 1 encabezado · 2 dos decimales · 3 pesos · 4 fecha ·
   5 entero · 6 título de sección. */
const ESTILO = { texto:0, numero:2, dinero:3, fecha:4, entero:5 };

const ESTILOS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3">
<numFmt numFmtId="164" formatCode="#,##0.00"/>
<numFmt numFmtId="165" formatCode="&quot;$&quot;#,##0.00"/>
<numFmt numFmtId="166" formatCode="dd/mm/yyyy\\ hh:mm"/>
</numFmts>
<fonts count="3">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="13"/><color rgb="FF0E5C63"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF0E5C63"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FFBFCBC9"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7">
<xf numFmtId="0"   fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0"   fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="1"   fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0"   fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function hojaXML(hoja){
  const cols = hoja.columnas;
  const anchos = cols.map((c,i) =>
    `<col min="${i+1}" max="${i+1}" width="${c.ancho || 16}" customWidth="1"/>`).join('');

  const celda = (fila, col, valor, tipo) => {
    const ref = letraCol(col) + fila;
    if(valor === null || valor === undefined || valor === '')
      return `<c r="${ref}"/>`;
    if(tipo === 'fecha')
      return `<c r="${ref}" s="4"><v>${serieExcel(valor)}</v></c>`;
    if(tipo && tipo !== 'texto' && typeof valor === 'number' && isFinite(valor))
      return `<c r="${ref}" s="${ESTILO[tipo] ?? 0}"><v>${valor}</v></c>`;
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(valor)}</t></is></c>`;
  };

  const filas = [];
  filas.push(`<row r="1" ht="22" customHeight="1">` +
    cols.map((c,i) => `<c r="${letraCol(i+1)}1" s="1" t="inlineStr"><is><t>${esc(c.titulo)}</t></is></c>`).join('') +
    `</row>`);
  hoja.filas.forEach((f, n) => {
    filas.push(`<row r="${n+2}">` +
      f.map((v,i) => celda(n+2, i+1, v, cols[i]?.tipo)).join('') + `</row>`);
  });

  const ref = `A1:${letraCol(Math.max(cols.length,1))}${hoja.filas.length + 1}`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${anchos}</cols>
<sheetData>${filas.join('')}</sheetData>
<autoFilter ref="${ref}"/>
</worksheet>`;
}

/** Nombre de hoja válido para Excel: 31 caracteres y sin : \\ / ? * [ ] */
function nombreHoja(s, usados){
  let n = String(s).replace(/[:\\/?*\[\]]/g,'-').slice(0,31).trim() || 'Hoja';
  let i = 2;
  while(usados.has(n.toLowerCase())){ const suf = ' ' + i++; n = n.slice(0, 31-suf.length) + suf; }
  usados.add(n.toLowerCase());
  return n;
}

/** hojas: [{ nombre, columnas:[{titulo,ancho,tipo}], filas:[[...]] }] → Uint8Array */
function libro(hojas){
  const usados = new Set();
  const hs = hojas.map((h,i) => ({ ...h, nombre: nombreHoja(h.nombre, usados), idx: i+1 }));

  const archivos = [
    { nombre:'[Content_Types].xml', datos: utf8(
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${hs.map(h => `<Override PartName="/xl/worksheets/sheet${h.idx}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
</Types>`)},
    { nombre:'_rels/.rels', datos: utf8(
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`)},
    { nombre:'xl/workbook.xml', datos: utf8(
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${hs.map(h => `<sheet name="${esc(h.nombre)}" sheetId="${h.idx}" r:id="rId${h.idx}"/>`).join('')}</sheets>
</workbook>`)},
    { nombre:'xl/_rels/workbook.xml.rels', datos: utf8(
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${hs.map(h => `<Relationship Id="rId${h.idx}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${h.idx}.xml"/>`).join('\n')}
<Relationship Id="rId${hs.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`)},
    { nombre:'xl/styles.xml', datos: utf8(ESTILOS_XML) },
    ...hs.map(h => ({ nombre:`xl/worksheets/sheet${h.idx}.xml`, datos: utf8(hojaXML(h)) })),
  ];
  return armarZip(archivos);
}

const API = { libro, armarZip, crc32, letraCol, serieExcel, nombreHoja, hojaXML };
if(typeof module !== 'undefined') module.exports = API;
globalThis.EXCEL = API;
})();
