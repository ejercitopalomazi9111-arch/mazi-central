#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   EL CATÁLOGO QUE VE LA PANTALLA · `node barberia/datos/adelgazar.mjs`
   ──────────────────────────────────────────────────────────────────────────
   `catalogo-muestra.json` pesa ~750 KB y trae variantes, etiquetas y hasta
   cuatro fotos por producto. El teléfono no necesita nada de eso para pintar la
   tienda: necesita nombre, marca, precio, una foto y en qué categoría va.

   Las CATEGORÍAS son la parte que importa. Odara trae 66 tipos, con «SHAMPOOS»,
   «Shampoo» y «SHAMPOO» como tres distintos. Un cliente no puede navegar eso.
   Aquí se reparten en ocho, con reglas de palabras — que es lo que el
   importador con IA va a hacer mejor en el bloque 4. Esto es el suelo: lo que se
   consigue sin modelo. Si el modelo no le gana a esto, no sirve.

   El orden de las reglas IMPORTA: gana la primera que encaja. «Máquina de
   tinte» tiene que caer en Color y no en Máquinas, así que Color va antes.
   ═════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const AQUI = dirname(new URL(import.meta.url).pathname);

export const CATEGORIAS = [
  { id:'color',      nombre:'Color y tinte',          icono:'gota',
    reglas:/tint|per[oó]xid|aclarant|decolor|oxidant|coloraci|\bcolor\b|matiz|revelador/i },
  { id:'maquinas',   nombre:'Máquinas y cortadoras',  icono:'maquina',
    reglas:/m[aá]quina|recortad|cortador|trimmer|clipper|shaver|cuchilla|patillera|rasuradora/i },
  { id:'barba',      nombre:'Barba y afeitado',       icono:'navaja',
    reglas:/barb[ae](?!r[ií]a y corte)|afeitad|after ?shave|navaja|rasurad|bigote/i },
  { id:'corte',      nombre:'Tijeras y corte',        icono:'tijera',
    reglas:/tijera|barber[ií]a y corte|peine|capa|brocha|atomizador|cepillo/i },
  { id:'peinado',    nombre:'Ceras, geles y peinado', icono:'tarro',
    reglas:/cera|gel|pomad|fijador|spray|laca|mousse|crema para peinar|estiliz|acabado|texturi/i },
  { id:'cuidado',    nombre:'Shampoo y tratamiento',  icono:'botella',
    reglas:/shamp|acondicion|tratamient|mascarill|ampolleta|serum|s[eé]rum|aceite|cabello|capilar|keratin|ritual|nutri|repara/i },
  { id:'aparatos',   nombre:'Secadoras y planchas',   icono:'secadora',
    reglas:/secador|plancha|rizador|tenaza|ondulad|cepillo el[eé]ctric|difusor/i },
  { id:'accesorios', nombre:'Accesorios',             icono:'caja',
    reglas:/./ },
];

/* Odara vende para barbería Y para salón. El cliente sólo barbería, y una tienda
   de barbero enseñando esmalte de uñas o pestañas postizas se ve mal justo
   enfrente de quien la va a comprar. Se miden por TIPO, que es lo que Odara
   usa para separar sus secciones; el nombre engaña («Kit barba y cejas»). */
const NO_ES_BARBERIA = /u[ñn]as|manicur|pedicur|maquilla|pesta[ñn]|cejas|depila|fundidor|cosm[eé]tic|piel|acetona|removedor|mascota|l[aá]mpara|pulidora|corporal/i;
export const esDeBarberia = (p) => !NO_ES_BARBERIA.test(p.tipo || '');

export function categoriaDe(p){
  const texto = [p.tipo, p.nombre, ...(p.etiquetas || [])].join(' ');
  return CATEGORIAS.find(c => c.reglas.test(texto)).id;
}

/* Shopify redimensiona en su propia red con `width=`. Una foto de 2000 px para
   una tarjeta de 160 px es lo que hace que la tienda tarde en un teléfono. */
const chica = (url) => url ? url + (url.includes('?') ? '&' : '?') + 'width=480' : null;

if(import.meta.url === `file://${process.argv[1]}`){
  const crudo = JSON.parse(readFileSync(join(AQUI, 'catalogo-muestra.json'), 'utf8'));
  const productos = crudo.productos
    .filter(p => p.fotos && p.fotos.length && esDeBarberia(p))
    .map(p => ({
      id: String(p.id),
      n: p.nombre,
      m: p.marca,
      c: categoriaDe(p),
      p: p.precio,
      ...(p.precio_antes && p.precio_antes > p.precio ? { a: p.precio_antes } : {}),
      ...(p.disponible ? {} : { x: 1 }),                 /* x = agotado */
      f: chica(p.fotos[0]),
    }));
  const salida = {
    aviso: 'MUESTRA. Productos reales de odara.mx para diseñar. No se publica fuera del taller.',
    categorias: CATEGORIAS.map(({ id, nombre, icono }) => ({ id, nombre, icono })),
    productos,
  };
  writeFileSync(join(AQUI, '..', 'catalogo.json'), JSON.stringify(salida));
  const cuenta = {};
  for(const p of productos) cuenta[p.c] = (cuenta[p.c] || 0) + 1;
  console.log(productos.length + ' productos');
  for(const c of CATEGORIAS) console.log('  ' + String(cuenta[c.id] || 0).padStart(4) + '  ' + c.nombre);
}
