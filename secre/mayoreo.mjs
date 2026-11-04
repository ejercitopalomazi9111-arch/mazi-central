/* ══════════════════════════════════════════════════════════════════════════
   SECRE · las fotos del grupo de Mayoreo → el banco → el grupo de All's
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 4 de noviembre: «en el grupo de mayoreo mandan fotos de la ropa que
   estoy vendiendo. Quiero que Secre tome las fotos, sólo las fotos, sin el
   texto, las suba al banco y las mande todas al grupo de All's… a la hora de
   subir la foto le ponga el precio que nos cuesta (el que ponen ahí es nuestro
   costo) y le sumamos 200, 250 o hasta 300… y cuando pregunten de una, diga
   qué tallas hay y en cuánto».

   Aquí va lo que no depende de WhatsApp: leer precio y tallas del texto, la
   huella de una foto (para reconocerla cuando la reenvían o le sacan captura)
   y el precio de venta. El costo NUNCA sale a un cliente.
   ═════════════════════════════════════════════════════════════════════════ */
import sharp from 'sharp';

const plano = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* «$350», «350 pesos», «precio 350», «a 350», «350.00». Si hay varios, el primero */
export function leerCosto(texto){
  const t = plano(texto);
  const m = /\$\s*(\d{2,6}(?:[.,]\d{2})?)/.exec(t) || /(?:precio|costo|cuesta|a|en|\bp\.?)\s*:?\s*(\d{2,6})(?:\s*(?:pesos|mxn|\.00))?\b/.exec(t) || /\b(\d{2,6})\s*(?:pesos|mxn|varos)\b/.exec(t);
  if(!m) return null;
  const n = Number(m[1].replace(',', '.'));
  return Number.isFinite(n) && n >= 20 && n <= 100000 ? Math.round(n) : null;
}

/* las tallas que trae un texto: letras (XS…XXL, CH/M/G/EG), números (26…44) o «unitalla» */
const LETRAS = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', '2xl', '3xl', 'ch', 'g', 'eg', 'xg'];
export function leerTallas(texto){
  const t = plano(texto);
  if(/uni\s*talla|talla\s*unica/.test(t)) return ['Unitalla'];
  const zona = (/tallas?\s*:?\s*([^\n]+)/.exec(t) || [])[1] || (/\b(xs|s|m|l|xl|ch|eg)\b[\s,/-]+\b(xs|s|m|l|xl|xxl|g|eg)\b/.test(t) ? t : '');
  if(!zona) return [];
  const out = [];
  for(const w of zona.split(/[^a-z0-9]+/)){
    if(LETRAS.includes(w)) out.push(w.toUpperCase());
    else if(/^\d{2}$/.test(w) && +w >= 22 && +w <= 48) out.push(w);
    else if(/^\d{1,2}(\.\d)?$/.test(w) && /calzado|tenis|zapato|numero/.test(t)) out.push(w);
  }
  return [...new Set(out)];
}

/* qué es, en pocas palabras: el texto sin precio ni tallas, primer renglón con letras */
export function leerDescripcion(texto){
  const r = String(texto || '').split('\n').map(x => x.replace(/uni\s*talla|talla\s*unica|(precio|costo)\s*:?\s*\$?\s*\d[\d.,]*|\$\s*\d[\d.,]*|\b\d+\s*(pesos|mxn)\b|tallas?\s*:?.*$/gi, '').replace(/[*_~]+/g, '').trim()).filter(x => /[a-záéíóúñ]{3}/i.test(x));
  return (r[0] || '').slice(0, 120);
}

export const precioVenta = (costo, margen = 250) => costo ? Math.round(costo + margen) : null;

/* la huella de una foto: 64 bits (dHash de 9×8 en grises, promediando cada bloque).
   La misma foto reenviada, recomprimida o en captura queda a pocos bits; otra, lejos */
export async function huella(buf){
  const { data } = await sharp(buf).rotate().greyscale().resize(9, 8, { fit: 'fill', kernel: 'cubic' }).raw().toBuffer({ resolveWithObject: true });
  let bits = '';
  for(let y = 0; y < 8; y++) for(let x = 0; x < 8; x++) bits += data[y * 9 + x] > data[y * 9 + x + 1] ? '1' : '0';
  return BigInt('0b' + bits).toString(16).padStart(16, '0');
}
export function distancia(a, b){
  if(!a || !b) return 64;
  let x = BigInt('0x' + a) ^ BigInt('0x' + b), n = 0;
  while(x){ n += Number(x & 1n); x >>= 1n; }
  return n;
}
/* el producto más parecido a una huella (null si ninguno está lo bastante cerca) */
export function masParecido(productos, h, tope = 10){
  let mejor = null, d = 65;
  for(const p of productos || []){ const k = distancia(p.huella, h); if(k < d){ d = k; mejor = p; } }
  return mejor && d <= tope ? { producto: mejor, distancia: d } : null;
}

/* una miniatura chica para el banco (JPG de 320 px) y el tamaño de la foto */
export async function miniatura(buf){
  const img = sharp(buf).rotate(), meta = await img.metadata();
  const mini = await img.clone().resize(320, 320, { fit: 'inside' }).jpeg({ quality: 70 }).toBuffer();
  return { mini, ancho: meta.width || 0, alto: meta.height || 0 };
}

/* cómo se le dice el producto a un cliente: precio de venta y tallas, sin el costo */
export function textoProducto(p){
  return `${p.desc || 'producto de All\'s'}${p.marca ? ' · ' + p.marca : ''}${p.precio ? ` · $${p.precio.toLocaleString('en-US')}` : ' · precio por confirmar'}${p.tallas && p.tallas.length ? ` · tallas: ${p.tallas.join(', ')}` : ''}`;
}

/* ── el pie de una foto que se vende (Carlos, 4 nov: «debería decir el precio, las tallas y la
   marca: sudadera café M True Religion 1200, sin la descripción de Paulina») ──
   La descripción del banco es para BUSCAR la foto, no para venderla: nunca sale en el pie. */
const MARCAS = ['True Religion', 'Nike', 'Adidas', 'Puma', 'Jordan', 'New Balance', 'Converse', 'Vans', 'Reebok', 'Under Armour', 'Fila', 'Skechers', 'Zara', 'Bershka', 'Pull&Bear', 'Shein', 'H&M', 'Guess', 'Michael Kors', 'MK', 'Coach', 'Kate Spade', 'Tommy Hilfiger', 'Tommy', 'Calvin Klein', 'CK', 'Levi\'s', 'Polo Ralph Lauren', 'Ralph Lauren', 'Lacoste', 'Hollister', 'Abercrombie', 'American Eagle', 'Aeropostale', 'Gap', 'Old Navy', 'Nautica', 'Náutica', 'Carolina Herrera', 'Victoria\'s Secret', 'Pink', 'Hugo Boss', 'Armani', 'Versace', 'Gucci', 'Louis Vuitton', 'Prada', 'Dior', 'Chanel', 'Balenciaga', 'Burberry', 'Fendi', 'Supreme', 'Essentials', 'Fear of God', 'Champion', 'The North Face', 'Columbia', 'Stanley', 'Owala', 'Yeti', 'Hydro Flask', 'Cloe', 'Westies', 'Andrea', 'Flexi', 'Steve Madden', 'Nine West', 'Ferrioni', 'Oscar de la Renta'];
export function leerMarca(texto){
  const t = ' ' + plano(texto).replace(/[^a-z0-9&' ]+/g, ' ') + ' ';
  const m = /\bmarca\s*:?\s*([a-z0-9&' ]{2,30}?)(?=\s*(?:$|·|,|\btalla|\bprecio|\$|\d))/.exec(plano(texto));
  if(m && m[1].trim()) return MARCAS.find(x => plano(x) === m[1].trim()) || m[1].trim().replace(/\b\w/g, c => c.toUpperCase());
  for(const x of MARCAS) if(t.includes(' ' + plano(x) + ' ')) return x;
  return '';
}
/* el precio de VENTA que trae una nota del banco: «venta $1,200», «precio 1200»; el costo no cuenta */
export function leerVenta(notas){
  const t = plano(notas).replace(/costo\s*:?\s*\$?\s*[\d.,?]+/g, ' ');
  const m = /(?:venta|precio)\s*:?\s*\$?\s*(\d[\d,]*)/.exec(t) || /\$\s*(\d[\d,]*)/.exec(t);
  const n = m ? Number(m[1].replace(/,/g, '')) : NaN;
  return Number.isFinite(n) && n >= 20 ? n : null;
}
export function datosVenta(f = {}, prod = null){
  const notas = String(f.notas || ''), pal = [...(f.palabras || []), ...(f.temas || [])].join(' ');
  const titulo = String(f.titulo || '').trim() || String(f.nombre || '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_-]+/g, ' ').trim();
  const tallas = (prod && prod.tallas && prod.tallas.length) ? prod.tallas : leerTallas(notas).length ? leerTallas(notas) : leerTallas(pal);
  return {
    nombre: String((prod && prod.desc) || titulo).replace(/^(fotografia|foto|imagen)\s+(frontal\s+)?de\s+(una?\s+)?/i, '').trim() || "Producto de All's",
    marca: (prod && prod.marca) || leerMarca(notas) || leerMarca(`${titulo} ${pal}`),
    tallas, precio: (prod && prod.precio) || leerVenta(notas),
  };
}
export function pieVenta(f, prod){
  const d = datosVenta(f, prod), nom = d.nombre.charAt(0).toUpperCase() + d.nombre.slice(1);
  const linea = [d.marca, d.tallas.length ? (d.tallas.length > 1 ? 'Tallas ' : 'Talla ') + d.tallas.join(', ') : '', d.precio ? '$' + d.precio.toLocaleString('en-US') : 'Pregunta el precio'].filter(Boolean).join(' · ');
  return `*${nom}*\n${linea}`;
}
