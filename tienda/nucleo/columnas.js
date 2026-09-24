/* ══════════════════════════════════════════════════════════════════════════
   COLUMNAS · entender el Excel que manda un cliente
   ──────────────────────────────────────────────────────────────────────────
   Nadie manda el Excel limpio. El título está en el renglón 4 porque arriba va
   el logo; «Precio» se llama «P. Público», «PVP» o «Precio venta c/IVA»; la
   existencia dice «12 pzas»; el precio trae «$1,250.00». Aquí se entiende eso
   sin preguntar, y lo que no se entiende se deja para que la persona lo elija.

   Módulo puro, sin DOM: lo prueban pruebas-columnas.mjs en Node.
   ═════════════════════════════════════════════════════════════════════════ */
import { sinAcentos } from './clasificar.js';

/* Qué puede ser cada columna, y cómo suele llamarse. El orden de CAMPOS es el
   orden de preferencia cuando dos columnas se pelean el mismo nombre. */
export const CAMPOS = [
  { id: 'nombre', etiqueta: 'Nombre del producto', obligatorio: true,
    nombres: /^(nombre|producto|articulo|descripcion corta|nombre del producto|item|concepto|descripcion del producto)$|^(nombre|producto|articulo)\b/ },
  { id: 'precio', etiqueta: 'Precio', obligatorio: true,
    nombres: /^(precio|pvp|p\.? ?publico|precio publico|precio venta|precio de venta|venta|precio al publico|p\.? ?venta|importe|costo al publico)\b|^precio/ },
  { id: 'precio_antes', etiqueta: 'Precio antes (oferta)',
    nombres: /(precio (antes|anterior|regular|lista|de lista|normal|original)|^antes$|^lista$|precio sin descuento)/ },
  { id: 'marca', etiqueta: 'Marca', nombres: /^(marca|fabricante|brand|proveedor|laboratorio)\b/ },
  { id: 'categoria', etiqueta: 'Categoría', nombres: /^(categoria|tipo|linea|familia|departamento|seccion|grupo|clase|rubro)\b/ },
  { id: 'codigo_barras', etiqueta: 'Código de barras',
    nombres: /(codigo de barras|cod\.? ?barras|^ean|^upc|barcode|^cb$|^gtin)/ },
  { id: 'sku', etiqueta: 'SKU o clave', nombres: /^(sku|clave|cve|codigo|cod|codigo interno|id|no\.? ?parte|numero de parte|modelo|referencia|ref)\b/ },
  { id: 'existencias', etiqueta: 'Existencias',
    nombres: /^(exist(encias?)?|exis|stock|inventario|inv|cantidad|piezas|pzas|pz|disponibles?|unidades|cant|qty)\b/ },
  { id: 'descripcion', etiqueta: 'Descripción', nombres: /^(descripcion|detalle|detalles|caracteristicas|notas)\b/ },
];

const limpia = (t) => sinAcentos(t).replace(/[_:*#]+/g, ' ').replace(/\s+/g, ' ').trim();

/* El renglón de títulos: el primero, de los 15 de arriba, que tenga al menos
   dos celdas que parezcan nombre de columna conocido. Si ninguno, el primero
   con tres textos. Devuelve el índice, o 0. */
export function encabezado(filas){
  const tope = Math.min(filas.length, 15);
  let respaldo = -1;
  for(let i = 0; i < tope; i++){
    const celdas = (filas[i] || []).map((c) => limpia(c)).filter(Boolean);
    const conocidas = celdas.filter((c) => CAMPOS.some((k) => k.nombres.test(c))).length;
    if(conocidas >= 2) return i;
    if(respaldo < 0 && celdas.filter((c) => /[a-z]/.test(c) && !/^\$?[\d.,]+$/.test(c)).length >= 3) respaldo = i;
  }
  return Math.max(0, respaldo);
}

/* { campo: índice de columna }. Cada columna se usa una vez; si nada coincide
   con «nombre», se toma la columna con más texto: casi siempre es ésa. */
export function mapear(titulos, muestra = []){
  const t = titulos.map(limpia);
  const usadas = new Set(), mapa = {};
  for(const k of CAMPOS){
    const i = t.findIndex((x, j) => x && !usadas.has(j) && k.nombres.test(x));
    if(i >= 0){ mapa[k.id] = i; usadas.add(i); }
  }
  // En México media lista de precios llama «Descripción» al nombre del
  // producto. Si no hubo columna de nombre, ésa es.
  if(mapa.nombre == null && mapa.descripcion != null){ mapa.nombre = mapa.descripcion; delete mapa.descripcion; }
  if(mapa.nombre == null && muestra.length){
    let mejor = -1, largo = 0;
    for(let j = 0; j < t.length; j++){
      if(usadas.has(j)) continue;
      const l = muestra.reduce((s, f) => s + (typeof f[j] === 'string' && !/^\$?[\d.,\s]+$/.test(f[j]) ? f[j].length : 0), 0);
      if(l > largo){ largo = l; mejor = j; }
    }
    if(mejor >= 0) mapa.nombre = mejor;
  }
  return mapa;
}

/* «$1,250.00» · «1250» · «1.250,50» (europeo) · «12 pzas» · 12 → número o null. */
export function leerNumero(v){
  if(v == null || v === '') return null;
  if(typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).trim().replace(/[^\d.,-]/g, '');
  if(!s || s === '-' ) return null;
  const coma = s.lastIndexOf(','), punto = s.lastIndexOf('.');
  if(coma > punto && s.length - coma === 3) s = s.replace(/\./g, '').replace(',', '.');  // 1.250,50
  else s = s.replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/* Códigos: Excel convierte 7501234567890 en 7.50123E+12 o en número. Se
   devuelve como texto, sin «.0» y sin notación científica. */
export function leerCodigo(v){
  if(v == null || v === '') return '';
  if(typeof v === 'number') return Number.isInteger(v) ? BigInt(Math.round(v)).toString() : String(v);
  const s = String(v).trim();
  if(/^\d+(\.\d+)?e\+\d+$/i.test(s)) return BigInt(Math.round(Number(s))).toString();
  return s.replace(/\.0+$/, '');
}

export const normalNombre = (t) => limpia(t).replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();
