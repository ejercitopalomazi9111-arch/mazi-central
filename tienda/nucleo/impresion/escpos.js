/* ══════════════════════════════════════════════════════════════════════════
   ESC/POS Y STAR · el idioma de las impresoras de tickets
   ──────────────────────────────────────────────────────────────────────────
   Casi todas las térmicas del mundo hablan ESC/POS (Epson y sus cientos de
   clones: Xprinter, 3nStar, EC Line, Ghia, Bixolon, Citizen, Rongta, HOIN,
   Munbyn, las «POS-58/POS-80» genéricas…). Star habla su «Star Line Mode»,
   parecido pero con otros números. Aquí se arman los BYTES; cómo llegan a la
   impresora (USB, Bluetooth, red…) es cosa de transportes.js.

   Los acentos son el problema de siempre: cada impresora trae tablas de
   caracteres (páginas de códigos) y hay que decirle cuál usar Y mandar el
   texto en esa tabla. Si una impresora no tiene ninguna que sirva, queda el
   modo imagen (raster.js), que imprime cualquier cosa.

   Módulo puro, sin DOM: lo prueba pruebas-impresion.mjs byte por byte.
   ═════════════════════════════════════════════════════════════════════════ */

const ESC = 0x1b, GS = 0x1d;

/* ── Páginas de códigos ────────────────────────────────────────────────── */
/* Sólo lo que hace falta en español (y el signo de grados y el euro). Lo que
   no esté en la tabla se escribe sin acento: «Ó» en CP437 sale «O», nunca «?». */
const CP850 = { 'Ç': 0x80, 'ü': 0x81, 'é': 0x82, 'â': 0x83, 'ä': 0x84, 'à': 0x85, 'ç': 0x87, 'ê': 0x88, 'ë': 0x89, 'è': 0x8a,
  'ï': 0x8b, 'î': 0x8c, 'ì': 0x8d, 'Ä': 0x8e, 'É': 0x90, 'ô': 0x93, 'ö': 0x94, 'ò': 0x95, 'û': 0x96, 'ù': 0x97, 'Ö': 0x99, 'Ü': 0x9a,
  'á': 0xa0, 'í': 0xa1, 'ó': 0xa2, 'ú': 0xa3, 'ñ': 0xa4, 'Ñ': 0xa5, 'ª': 0xa6, 'º': 0xa7, '¿': 0xa8, '¡': 0xad, '«': 0xae, '»': 0xaf,
  'Á': 0xb5, 'Â': 0xb6, 'À': 0xb7, 'Ê': 0xd2, 'Ë': 0xd3, 'È': 0xd4, 'Í': 0xd6, 'Î': 0xd7, 'Ï': 0xd8, 'Ì': 0xde, 'Ó': 0xe0, 'Ô': 0xe2,
  'Ò': 0xe3, 'Ú': 0xe9, 'Û': 0xea, 'Ù': 0xeb, '°': 0xf8, '·': 0xfa, '×': 0x9e };
const CP437 = { 'Ç': 0x80, 'ü': 0x81, 'é': 0x82, 'â': 0x83, 'ä': 0x84, 'à': 0x85, 'ç': 0x87, 'ê': 0x88, 'ë': 0x89, 'è': 0x8a,
  'ï': 0x8b, 'î': 0x8c, 'ì': 0x8d, 'Ä': 0x8e, 'É': 0x90, 'ô': 0x93, 'ö': 0x94, 'ò': 0x95, 'û': 0x96, 'ù': 0x97, 'Ö': 0x99, 'Ü': 0x9a,
  'á': 0xa0, 'í': 0xa1, 'ó': 0xa2, 'ú': 0xa3, 'ñ': 0xa4, 'Ñ': 0xa5, 'ª': 0xa6, 'º': 0xa7, '¿': 0xa8, '¡': 0xad, '«': 0xae, '»': 0xaf,
  '°': 0xf8, '·': 0xfa };
export const PAGINAS = {
  cp850:   { nombre: 'PC850 (multilingüe)', tabla: CP850, escpos: 2, star: 4 },
  cp858:   { nombre: 'PC858 (850 con €)', tabla: { ...CP850, '€': 0xd5 }, escpos: 19, star: 4 },
  cp437:   { nombre: 'PC437 (EUA, sin Á É Í Ó Ú mayúsculas)', tabla: CP437, escpos: 0, star: 1 },
  wpc1252: { nombre: 'WPC1252 (Windows latino)', latin1: true, escpos: 16, star: 32 },
  ascii:   { nombre: 'Sin acentos (cualquier impresora)', tabla: {}, escpos: 0, star: 1 },
};
const sinAcento = (c) => c.normalize('NFD').replace(/[̀-ͯ]/g, '');
const REEMPLAZOS = { '“': '"', '”': '"', '‘': "'", '’': "'", '—': '-', '–': '-', '…': '...', '€': 'EUR', '•': '*', ' ': ' ' };

export function codificar(texto, pagina = 'cp850'){
  const p = PAGINAS[pagina] || PAGINAS.cp850;
  const salida = [];
  for(const c of String(texto)){
    const n = c.codePointAt(0);
    if(n < 0x80){ salida.push(n); continue; }
    if(p.latin1 && n <= 0xff){ salida.push(n); continue; }
    if(p.tabla?.[c] != null){ salida.push(p.tabla[c]); continue; }
    for(const x of (REEMPLAZOS[c] ?? sinAcento(c))) salida.push(x.codePointAt(0) < 0x80 ? x.codePointAt(0) : 0x3f);
  }
  return salida;
}

/* ── Acomodar texto en N columnas ──────────────────────────────────────── */
export function partir(texto, columnas){
  const renglones = [];
  for(const parrafo of String(texto).split('\n')){
    let r = '';
    for(const palabra of parrafo.split(/\s+/).filter(Boolean)){
      if(palabra.length > columnas){ if(r){ renglones.push(r); r = ''; } for(let i = 0; i < palabra.length; i += columnas) renglones.push(palabra.slice(i, i + columnas)); continue; }
      if(!r) r = palabra; else if(r.length + 1 + palabra.length <= columnas) r += ' ' + palabra; else { renglones.push(r); r = palabra; }
    }
    renglones.push(r);
  }
  return renglones;
}
/* «Cera mate ........ $250.00»: izquierda y derecha en el mismo renglón; si
   no caben, la izquierda se parte y la derecha va en el último renglón. */
export function dosLados(izq, der, columnas){
  der = String(der);
  const hueco = columnas - der.length - 1;
  if(hueco < 4) return [...partir(izq, columnas), der.padStart(columnas)];
  const ls = partir(izq, hueco);
  const ultimo = ls.pop();
  return [...ls, ultimo.padEnd(columnas - der.length) + der];
}

/* ── El armador ────────────────────────────────────────────────────────── */
/* conf: { dialecto: 'escpos'|'star', columnas, pagina, paginaNumero?, corte: 'parcial'|'total'|'no',
           avance: renglones antes de cortar, cajon: bool, qr: bool } */
export class Ticket{
  constructor(conf = {}){
    this.c = { dialecto: 'escpos', columnas: 48, pagina: 'cp850', corte: 'parcial', avance: 4, qr: true, ...conf };
    this.b = [];
    this.star = this.c.dialecto === 'star';
    this.iniciar();
  }
  crudo(...xs){ for(const x of xs) Array.isArray(x) ? this.b.push(...x) : this.b.push(x); return this; }
  iniciar(){
    this.crudo(ESC, 0x40);
    const n = this.c.paginaNumero ?? PAGINAS[this.c.pagina]?.[this.star ? 'star' : 'escpos'] ?? 0;
    return this.star ? this.crudo(ESC, GS, 0x74, n) : this.crudo(ESC, 0x74, n);
  }
  alinear(a){ const n = { izq: 0, centro: 1, der: 2 }[a] ?? 0; return this.star ? this.crudo(ESC, GS, 0x61, n) : this.crudo(ESC, 0x61, n); }
  negritas(si){ return this.star ? this.crudo(ESC, si ? 0x45 : 0x46) : this.crudo(ESC, 0x45, si ? 1 : 0); }
  grande(si){ return this.star ? this.crudo(ESC, 0x69, si ? 1 : 0, si ? 1 : 0) : this.crudo(GS, 0x21, si ? 0x11 : 0x00); }
  renglon(t = ''){ return this.crudo(codificar(t, this.c.pagina), 0x0a); }
  texto(t, { alinear = 'izq', negritas = false, grande = false } = {}){
    const cols = grande ? Math.floor(this.c.columnas / 2) : this.c.columnas;
    this.alinear(alinear); if(negritas) this.negritas(true); if(grande) this.grande(true);
    for(const r of partir(t, cols)) this.renglon(r);
    if(grande) this.grande(false); if(negritas) this.negritas(false); this.alinear('izq');
    return this;
  }
  par(izq, der, { negritas = false } = {}){ if(negritas) this.negritas(true); for(const r of dosLados(izq, der, this.c.columnas)) this.renglon(r); if(negritas) this.negritas(false); return this; }
  raya(c = '-'){ return this.renglon(c.repeat(this.c.columnas)); }
  saltar(n = 1){ for(let i = 0; i < n; i++) this.crudo(0x0a); return this; }
  qrCodigo(datos, tam = 6){
    if(!this.c.qr) return this;
    const d = codificar(datos, 'ascii'), n = d.length + 3;
    this.alinear('centro');
    if(this.star){
      // Star Line Mode: ESC GS y S 0 (modelo 2), S 1 (corrección M), S 2 (tamaño), D 1 (datos), P (imprimir)
      this.crudo(ESC, GS, 0x79, 0x53, 0x30, 2, ESC, GS, 0x79, 0x53, 0x31, 1, ESC, GS, 0x79, 0x53, 0x32, tam);
      this.crudo(ESC, GS, 0x79, 0x44, 0x31, 0x00, d.length & 0xff, d.length >> 8, d, ESC, GS, 0x79, 0x50);
    }else{
      this.crudo(GS, 0x28, 0x6b, 4, 0, 0x31, 0x41, 0x32, 0x00);          // modelo 2
      this.crudo(GS, 0x28, 0x6b, 3, 0, 0x31, 0x43, tam);                // tamaño del módulo
      this.crudo(GS, 0x28, 0x6b, 3, 0, 0x31, 0x45, 0x31);               // corrección M
      this.crudo(GS, 0x28, 0x6b, n & 0xff, n >> 8, 0x31, 0x50, 0x30, d); // guardar datos
      this.crudo(GS, 0x28, 0x6b, 3, 0, 0x31, 0x51, 0x30);               // imprimir
    }
    this.crudo(0x0a); return this.alinear('izq');
  }
  /* bits: { ancho (px, múltiplo de 8), alto, datos: Uint8Array empaquetada 1 bit/px, 1 = negro } */
  imagen(bits){
    const bx = bits.ancho / 8;
    if(this.star){
      // Star: ESC GS S 1 xL xH yL yH 0 datos (imagen de banda completa)
      this.crudo(ESC, GS, 0x53, 1, bx & 0xff, bx >> 8, bits.alto & 0xff, bits.alto >> 8, 0, [...bits.datos]);
    }else{
      // GS v 0: raster de un golpe. En tiras de 255 renglones: hay firmwares que no aguantan más.
      for(let y = 0; y < bits.alto; y += 255){
        const h = Math.min(255, bits.alto - y);
        this.crudo(GS, 0x76, 0x30, 0, bx & 0xff, bx >> 8, h & 0xff, h >> 8, [...bits.datos.subarray(y * bx, (y + h) * bx)]);
      }
    }
    return this;
  }
  cajon(){ return this.star ? this.crudo(0x07) : this.crudo(ESC, 0x70, 0, 25, 250); }
  cortar(){
    this.saltar(this.c.avance);
    if(this.c.corte === 'no') return this;
    const total = this.c.corte === 'total';
    return this.star ? this.crudo(ESC, 0x64, total ? 2 : 3) : this.crudo(GS, 0x56, total ? 0x41 : 0x42, 0);
  }
  bytes(){ return Uint8Array.from(this.b); }
}

/* ── Imagen a bits (lo usa el modo imagen y el logo) ───────────────────── */
/* rgba: datos de un canvas. Umbral con tramado de Floyd-Steinberg: una foto
   o un logo con degradado se ven como grises y no como mancha negra. */
export function aBits(rgba, ancho, alto, { tramado = true, umbral = 128 } = {}){
  const anchoB = Math.ceil(ancho / 8) * 8;
  const g = new Float32Array(ancho * alto);
  for(let i = 0; i < ancho * alto; i++){
    const a = rgba[i * 4 + 3] / 255;
    g[i] = 255 - a * (255 - (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]));
  }
  const datos = new Uint8Array(anchoB / 8 * alto);
  for(let y = 0; y < alto; y++) for(let x = 0; x < ancho; x++){
    const i = y * ancho + x, viejo = g[i], nuevo = viejo < umbral ? 0 : 255;
    if(nuevo === 0) datos[y * anchoB / 8 + (x >> 3)] |= 0x80 >> (x & 7);
    if(tramado){
      const e = viejo - nuevo;
      if(x + 1 < ancho) g[i + 1] += e * 7 / 16;
      if(y + 1 < alto){ if(x) g[i + ancho - 1] += e * 3 / 16; g[i + ancho] += e * 5 / 16; if(x + 1 < ancho) g[i + ancho + 1] += e / 16; }
    }
  }
  return { ancho: anchoB, alto, datos };
}
