/* ═══════════════════════════════════════════════════════════════════════════
   URBAN PEST · SU EXCEL, DENTRO DEL CENTRO  (Godines, 17 nov)
   ───────────────────────────────────────────────────────────────────────────
   Lee su «CorridaCotizacion.xlsx» EN EL TELÉFONO —no se sube a ningún lado— y
   saca sólo tres cosas:
     · el catálogo: producto, costo, contenido del envase, dosis y unidad
       → cuánto le cuesta cada aplicación (su columna F);
     · su fórmula, leída de SUS fórmulas: lo que cobra por hora de técnico, por
       kilómetro, y cuánto multiplica el costo para llegar al precio;
     · qué producto usa más en cada columna de plaga, para que el bot cotice
       con lo mismo que él.
   La lista de clientes que trae el Excel NO se lee ni se guarda.

   ⚠ El repo es PÚBLICO. Por eso ni sus costos ni su fórmula viven en este
   archivo: viven en su servidor, detrás de su llave (POST /api/tarifas). Aquí
   sólo está CÓMO se leen. Si cambia sus precios, vuelve a cargar el Excel.

   Sin dependencias: un .xlsx es un ZIP con XML adentro. El ZIP se abre con
   DecompressionStream (navegador y Node 18+) y el XML se lee con expresiones,
   para que corra igual en las pruebas de Node.
   ═══════════════════════════════════════════════════════════════════════════ */

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const desXml = (s) => String(s).replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e] ?? m));
const attrs = (s) => Object.fromEntries([...String(s).matchAll(/([\w:]+)="([^"]*)"/g)].map(m => [m[1], desXml(m[2])]));

/* ── el ZIP ─────────────────────────────────────────────────────────────── */
function abrirZip(buf){
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let fin = -1;
  for(let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if(dv.getUint32(i, true) === 0x06054b50){ fin = i; break; }
  if(fin < 0) throw new Error('Ese archivo no es un Excel (.xlsx). Si lo tienes en .xls, guárdalo como .xlsx y vuelve a intentar.');
  const n = dv.getUint16(fin + 10, true), archivos = {};
  let p = dv.getUint32(fin + 16, true);
  for(let k = 0; k < n && dv.getUint32(p, true) === 0x02014b50; k++){
    /* los tamaños salen del directorio central: el encabezado local puede traerlos en cero */
    const metodo = dv.getUint16(p + 10, true), tam = dv.getUint32(p + 20, true), ln = dv.getUint16(p + 28, true);
    const le = dv.getUint16(p + 30, true), lc = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    archivos[new TextDecoder().decode(u8.subarray(p + 46, p + 46 + ln))] = { metodo, tam, off };
    p += 46 + ln + le + lc;
  }
  return async (nombre) => {
    const a = archivos[nombre]; if(!a) return null;
    const ini = a.off + 30 + dv.getUint16(a.off + 26, true) + dv.getUint16(a.off + 28, true), datos = u8.slice(ini, ini + a.tam);
    if(a.metodo === 0) return new TextDecoder().decode(datos);
    if(a.metodo !== 8) throw new Error('El Excel viene comprimido de una forma que no conozco.');
    return new Response(new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  };
}

/* ── referencias: «F726» ↔ columna 6, fila 726 ───────────────────────────── */
const aNum = (l) => [...l].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);
const aLetra = (n) => { let s = ''; for(; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; };
const partir = (r) => { const m = /^([A-Z]+)(\d+)$/.exec(r); return m ? { c: aNum(m[1]), f: +m[2] } : null; };
/* Una fórmula compartida (<f t="shared" si="0"/>) sólo trae el texto en la primera celda.
   Las demás se reconstruyen corriendo las referencias relativas, como hace Excel. */
function correr(formula, dc, df){
  return formula.replace(/("[^"]*")|(\$?)([A-Z]{1,3})(\$?)(\d+)(?![\d(])/g, (m, cad, d1, l, d2, n) => cad ? cad
    : `${d1}${d1 ? l : aLetra(aNum(l) + dc)}${d2}${d2 ? n : +n + df}`);
}

/** Lee el libro entero: { hojas: [{ nombre, celdas: { A1: { v, f } } }] } */
export async function leerXlsx(buf){
  const leer = abrirZip(buf);
  const compartidas = [...((await leer('xl/sharedStrings.xml')) || '').matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map(m => [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => desXml(t[1])).join(''));
  const libro = await leer('xl/workbook.xml'), rels = (await leer('xl/_rels/workbook.xml.rels')) || '';
  if(!libro) throw new Error('Ese archivo no es un Excel (.xlsx).');
  const destino = Object.fromEntries([...rels.matchAll(/<Relationship\b([^>]*)\/?>/g)].map(m => attrs(m[1])).map(a => [a.Id, a.Target]));
  const hojas = [];
  for(const m of libro.matchAll(/<sheet\b([^>]*)\/?>/g)){
    const a = attrs(m[1]), t = destino[a['r:id']]; if(!t) continue;
    const xml = await leer(t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, '')); if(!xml) continue;
    const celdas = {}, maestras = {};
    for(const c of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){
      const ca = attrs(c[1]), dentro = c[2] || '', ref = ca.r; if(!ref) continue;
      const fm = /<f\b([^>]*?)(?:\/>|>([\s\S]*?)<\/f>)/.exec(dentro), vm = /<v>([\s\S]*?)<\/v>/.exec(dentro);
      let v = vm ? desXml(vm[1]) : null;
      if(ca.t === 's' && v != null) v = compartidas[+v] ?? '';
      else if(ca.t === 'inlineStr') v = [...dentro.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => desXml(t[1])).join('');
      else if(ca.t === 'b') v = v === '1';
      else if(v != null && ca.t !== 'str' && ca.t !== 'e' && v !== '' && !isNaN(+v)) v = +v;
      let f = null;
      if(fm){
        const fa = attrs(fm[1]); f = fm[2] ? desXml(fm[2]) : null;
        if(fa.t === 'shared'){
          if(f) maestras[fa.si] = { f, ref };
          else if(maestras[fa.si]){ const a0 = partir(maestras[fa.si].ref), a1 = partir(ref); f = correr(maestras[fa.si].f, a1.c - a0.c, a1.f - a0.f); }
        }
      }
      if(v != null || f) celdas[ref] = { v, f };
    }
    hojas.push({ nombre: a.name, celdas });
  }
  if(!hojas.length) throw new Error('El Excel no trae hojas que se puedan leer.');
  return { hojas };
}

/* ── lo que se saca de su Excel ──────────────────────────────────────────── */
const moda = (xs) => { const n = new Map(); let mejor = null, max = 0; for(const x of xs){ const k = n.get(x) + 1 || 1; n.set(x, k); if(k >= max){ max = k; mejor = x; } } return mejor; };
const filasDe = (celdas) => { const filas = new Map(); for(const [r, c] of Object.entries(celdas)){ const p = partir(r); if(!p) continue; if(!filas.has(p.f)) filas.set(p.f, {}); filas.get(p.f)[aLetra(p.c)] = c; } return filas; };
/* su Excel guarda el resultado de muchas fórmulas como TEXTO («52.00»): también cuenta como número */
const num = (c) => { if(!c) return null; const v = typeof c.v === 'string' ? (c.v.trim() && !isNaN(+c.v.replace(/,/g, '')) ? +c.v.replace(/,/g, '') : NaN) : c.v; return typeof v === 'number' && isFinite(v) ? v : null; };
const txt = (c) => (c && typeof c.v === 'string') ? c.v.replace(/\s+/g, ' ').trim() : '';

/* Una celda que es pura cuenta de números (=1000/3000, =11/10000): se calcula aquí con todos los decimales, porque el
   valor que guarda su Excel viene redondeado. Sólo números, + − × ÷ y paréntesis; cualquier otra cosa → null. */
export function cuenta(f){
  const t = String(f || '').replace(/^=/, '').replace(/\s/g, ''); if(!t || !/^[\d.+\-*/()]+$/.test(t)) return null;
  let i = 0;
  const prim = () => { if(t[i] === '('){ i++; const v = sum(); if(t[i++] !== ')') throw 0; return v; } if(t[i] === '-'){ i++; return -prim(); }
    const m = /^\d+(\.\d+)?|^\.\d+/.exec(t.slice(i)); if(!m) throw 0; i += m[0].length; return +m[0]; };
  const pro = () => { let v = prim(); while(t[i] === '*' || t[i] === '/'){ const o = t[i++], w = prim(); v = o === '*' ? v * w : v / w; } return v; };
  const sum = () => { let v = pro(); while(t[i] === '+' || t[i] === '-'){ const o = t[i++], w = pro(); v = o === '+' ? v + w : v - w; } return v; };
  try { const v = sum(); return i === t.length && Number.isFinite(v) ? v : null; } catch { return null; }
}
const valorDe = (c) => c?.f ? cuenta(c.f) : num(c);

/** El catálogo empieza en la fila cuyo A dice «Producto» y B «Costo del producto». */
function catalogo(filas){
  const cab = [...filas.keys()].sort((a, b) => a - b).find(f => /^producto$/i.test(txt(filas.get(f).A)) && /costo/i.test(txt(filas.get(f).B)));
  if(cab == null) return { cab: null, productos: [] };
  const productos = [];
  for(const f of [...filas.keys()].filter(f => f > cab).sort((a, b) => a - b)){
    const r = filas.get(f), nombre = txt(r.A); if(!nombre) continue;
    const costo = valorDe(r.B), contenido = valorDe(r.C), dosis = valorDe(r.D), unidad = txt(r.E);
    /* su columna F ya es «costo por unidad de aplicación». Si es su fórmula de siempre (B×D÷C) se
       calcula aquí con todos los decimales: el Excel guarda el resultado redondeado a 2 y con eso
       una cotización salía 12 centavos abajo. Si F es otra cosa (un número o una mezcla), vale F. */
    const fF = String(r.F?.f || '').replace(/[\s$()]/g, '');
    /* costo, envase y dosis valen con todos sus decimales (si la dosis es una cuenta, =11/10000, se calcula) */
    const exacta = /^(B\d+\*D\d+|D\d+\*B\d+)\/C\d+$/.test(fF) && costo > 0 && dosis > 0 && contenido > 0 ? costo * dosis / contenido : null;
    const por = exacta ?? num(r.F) ?? (contenido == null && dosis == null ? costo : null);
    if(!(por > 0)) continue;
    productos.push({ id: 'f' + f, fila: f, nombre, costo, contenido, dosis, unidad, por_unidad: por });
  }
  /* dos productos con el mismo nombre (dos presentaciones): se distinguen por el envase */
  const veces = productos.reduce((m, p) => m.set(p.nombre, (m.get(p.nombre) || 0) + 1), new Map());
  for(const p of productos) if(veces.get(p.nombre) > 1 && p.contenido) p.nombre += ` (envase ${p.contenido.toLocaleString('en-US')})`;
  return { cab, productos };
}

/** Las columnas de plaga del encabezado (fila 1): Roedores, Cucaracha alemana, … Monitoreo. */
const COLUMNAS_PLAGA = /roedor|cucaracha|mosca|mosquito|rastrero|hormiga|exterior|otros|termita|monitoreo/i;
function columnas(filas){
  const uno = filas.get(1) || {}, cols = [];
  for(const [l, c] of Object.entries(uno)) if(COLUMNAS_PLAGA.test(txt(c))) cols.push({ col: l, nombre: txt(c) });
  return cols.sort((a, b) => aNum(a.col) - aNum(b.col));
}

/** Las filas de cotización (arriba del catálogo, con fórmula en T). Las últimas son las de ahora. */
const RECIENTES = 120;
function cotizaciones(filas, hasta){
  return [...filas.keys()].filter(f => f > 1 && (hasta == null || f < hasta) && filas.get(f).T?.f).sort((a, b) => a - b).slice(-RECIENTES).map(f => ({ f, r: filas.get(f) }));
}

export function deExcel(libroLeido, archivo = ''){
  const hojas = libroLeido.hojas;
  const conv = hojas.find(h => /convencional/i.test(h.nombre)) || hojas[0], jadpH = hojas.find(h => /jadp/i.test(h.nombre));
  const filas = filasDe(conv.celdas), { cab, productos } = catalogo(filas);
  if(!productos.length) throw new Error('No encontré la tabla de productos (la que empieza con «Producto | Costo del producto | Contenido del envase | Dosis»).');
  const recientes = cotizaciones(filas, cab);

  /* su fórmula, leída de sus fórmulas: la que más usa en las últimas cotizaciones */
  const de = (col, re) => recientes.map(({ r }) => re.exec(String(r[col]?.f || '').replace(/\s/g, ''))).filter(Boolean);
  const mano = moda(de('Q', /^\(?B\d+\*([\d.]+)\)?$/).map(m => +m[1]));
  const km = moda(de('S', /^\(?R\d+\*([\d.]+)\)?$/).map(m => +m[1]));
  const sube = moda(de('T', /\*([\d.]+)\)\/([\d.]+)/).map(m => m[1] + '/' + m[2]));
  const reparto = moda(de('U', /^T\d+\*([\d.]+)$/).map(m => +m[1]));
  if(mano == null || km == null || !sube) throw new Error('Encontré los productos, pero no la fórmula de la cotización (las columnas Q, S y T).');
  const [x, entre] = sube.split('/').map(Number);
  /* ¿el traslado se suma después de subir el precio, o entra al costo que se sube? (antes lo hacía de las dos formas) */
  const trasladoAparte = moda(recientes.map(({ r }) => /\)\+S\d+\)*$/.test(String(r.T?.f || '').replace(/\s/g, '')))) ?? true;

  /* el producto que más usa en cada columna de plaga, contando las referencias a su catálogo */
  const porFila = new Map(productos.map(p => [p.fila, p]));
  const cols = columnas(filas).map(({ col, nombre }) => {
    const usados = recientes.flatMap(({ r }) => [...String(r[col]?.f || '').matchAll(/\$?F\$?(\d+)/g)].map(m => +m[1]).filter(n => porFila.has(n)));
    const p = porFila.get(moda(usados));
    return { col, nombre, producto: p ? p.id : null, veces: usados.length };
  });

  /* km típico: la mediana de lo que anotó en las últimas cotizaciones (sin las de 0 km) */
  const kms = recientes.map(({ r }) => num(r.R)).filter(n => n > 0).sort((a, b) => a - b);
  const km_tipico = kms.length ? kms[Math.floor(kms.length / 2)] : null;

  /* la hoja JADP, si viene: su otra forma de cotizar, para comparar */
  let jadp = null;
  if(jadpH){
    const fj = filasDe(jadpH.celdas), rj = cotizaciones(fj, catalogo(fj).cab);
    const ult = (col, re) => { for(let i = rj.length - 1; i >= 0; i--){ const m = re.exec(String(rj[i].r[col]?.f || '').replace(/\s/g, '')); if(m) return m; } return null; };
    const q = ult('Q', /B\d+\*([\d.]+)/), s = ult('S', /\(R\d+\*([\d.]+)\/([\d.]+)\)\*([\d.]+)/), t = ult('T', /P\d+\)\*([\d.]+)\)\+\(P\d+\+Q\d+\+S\d+\)\)\*([\d.]+)/);
    if(q && s && t) jadp = { mano_hora: +q[1], gasolina_litro: +s[1], km_litro: +s[2], viajes: +s[3], quimicos_x: +t[1], margen: +t[2] };
  }

  return {
    archivo: String(archivo).slice(0, 80), cargado: new Date().toISOString().slice(0, 10),
    catalogo: productos.map(({ fila, ...p }) => p),
    convencional: { mano_hora: mano, km, x, entre, traslado_aparte: trasladoAparte, costos: reparto ?? null },
    jadp, columnas: cols, km_tipico, cotizaciones_leidas: recientes.length,
  };
}

/* ── para el bot: sus tarifas en la forma de servidor/src/cotizador.js ───────
   Lo que el Excel NO dice, y por eso va marcado como calibración:
   · cuánta mezcla lleva un m² (0.025 L) y cuántos m² hace un técnico por hora (330):
     salen del único ejemplo de su Excel con cuartos medidos (55 cuartos de 4×5 m: 30 L
     y 3.5 h). Con eso, una casa de 120 m² da 3 L y 1 h — lo que anota en sus casas.
   Las plagas con producto en bloque, pieza o pasta (ratas, por ejemplo) no se cotizan
   por m²: el bot se las pasa al dueño. */
export const CALIBRACION = { litros_m2: .025, m2_hora: 330 };
/* Sólo las plagas que él trata con aspersión por superficie. Termitas, chinches y pulgas NO: en su Excel
   llevan mucho más producto o polvo (una casa con termita, 143 L), y eso lo cotiza él después de ver. */
const PLAGA_DE = { cucaracha: /cucaracha alemana/i, hormiga: /hormiga/i, mosca: /^moscas?$/i, mosco: /mosquito/i,
  alacran: /rastrero/i, arana: /rastrero/i, roedor: /roedor/i };
export function aTarifas(ex, previas = {}){
  const base = previas && !previas.ejemplo ? previas : {};
  const por = new Map(ex.catalogo.map(p => [p.id, p])), plagas = {};
  for(const [clave, re] of Object.entries(PLAGA_DE)){
    const col = ex.columnas.find(c => re.test(c.nombre)), p = col && por.get(col.producto);
    if(!p) continue;
    const u = p.unidad.toLowerCase().replace(/\s/g, '');
    const litros_m2 = /\/l(t|itro)?$/.test(u) ? CALIBRACION.litros_m2 : /\/m2$/.test(u) ? 1 : null;
    if(litros_m2 == null) continue;
    plagas[clave] = { producto: p.id, columna: col.nombre, material: p.nombre, precio_litro: p.por_unidad, litros_m2, de_excel: true };
  }
  const c = ex.convencional;
  return {
    ...base,
    formula: { tipo: 'excel', x: c.x, entre: c.entre, km: c.km, traslado_aparte: c.traslado_aparte, costos: c.costos },
    tecnico: { costo_hora: c.mano_hora, m2_hora: base.tecnico?.m2_hora ?? CALIBRACION.m2_hora, minimo_horas: 1, personas: 1 },
    plagas: { ...(base.plagas || {}), ...plagas },
    ...(ex.km_tipico ? { km_tipico: ex.km_tipico } : {}),
    excel: ex,
  };
}
