/* ═══════════════════════════════════════════════════════════════════════════
   CARTELES · FRASES — qué decir de cada cosa, sin inventar nada
   ───────────────────────────────────────────────────────────────────────────
   Las frases no prometen lo que la marca no ha dicho: ni precios, ni
   «originales», ni envíos, ni sucursal. Todo manda al DM (o al WhatsApp, si
   la marca lo trae). Cada categoría sabe su género para el llamado: «pide LA
   tuya» (sudadera), «EL tuyo» (pantalón), «LOS tuyos» (tenis), «LAS tuyas»
   (botas). Lo que no se reconoce cae en «producto» con frases que sirven
   para cualquier cosa.

   categorizar(texto) lee lo que haya: título y descripción del banco, temas,
   palabras clave, nombre del archivo. Sin acentos ni mayúsculas.
   ═══════════════════════════════════════════════════════════════════════════ */

const sin = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* genero: la | el | las | los  ·  palabra: la que va calada en grande */
export const CATEGORIAS = [
  { id: 'sudadera', nombre: 'Sudaderas', genero: 'la', palabra: 'Hoodie', claves: ['sudadera', 'hoodie', 'capucha', 'sweatshirt', 'buzo'],
    k: ['Nuevo en tienda', 'Recién llegada', 'Temporada de frío', 'Sudaderas de marca', 'Otoño · Invierno', 'Hoodie season'],
    t: ['Sudaderas que sí abrigan', 'Llegó el frío. Llegaron las sudaderas.', 'Tu próxima sudadera favorita', 'Capucha arriba, estilo también', 'Para las mañanas frías', 'Combina con todo', 'Esta no dura en el rack', 'Abriga bonito', 'El básico que nunca falla', 'Cómoda y de marca', 'Frío afuera, estilo adentro', 'La que vas a usar diario'] },
  { id: 'chamarra', nombre: 'Chamarras', genero: 'la', palabra: 'Jacket', claves: ['chamarra', 'chaqueta', 'jacket', 'abrigo', 'rompevientos', 'chaleco', 'gabardina'],
    k: ['Chamarras', 'Para el frío', 'Otoño · Invierno'], t: ['Chamarras para el frío', 'Deportiva y con estilo', 'Ligera, cómoda y de marca', 'La capa que le faltaba a tu outfit'] },
  { id: 'playera', nombre: 'Playeras', genero: 'la', palabra: 'Tee', claves: ['playera', 'camiseta', 't-shirt', 'tshirt', 'remera'],
    k: ['Playeras de marca', 'Básicos', 'Nuevas en tienda'], t: ['Una para cada día de la semana', 'Playeras de marca para diario', 'Escoge tu color', 'El básico que siempre se usa', 'Clásicas que nunca fallan', 'Arma tu semana'] },
  { id: 'polo', nombre: 'Polos', genero: 'la', palabra: 'Polo', claves: ['polo'], k: ['Polos', 'Básicos'], t: ['Arreglado sin esfuerzo', 'Formal sin ser aburrido', 'El clásico de cuello'] },
  { id: 'camisa', nombre: 'Camisas', genero: 'la', palabra: 'Shirt', claves: ['camisa', 'blusa de vestir', 'shirt', 'cuadros'],
    k: ['Camisas de vestir', 'Para verte bien'], t: ['Camisas para verte bien sin esfuerzo', 'Para la oficina, la cita o la boda', 'Formal, pero con estilo', 'Lista para impresionar'] },
  { id: 'blusa', nombre: 'Blusas', genero: 'la', palabra: 'Blusa', claves: ['blusa', 'top', 'crop'], k: ['Blusas', 'Nuevas en tienda'], t: ['Ligera, bonita y de marca', 'Para verte increíble sin esfuerzo', 'Tu blusa favorita está aquí'] },
  { id: 'vestido', nombre: 'Vestidos', genero: 'el', palabra: 'Dress', claves: ['vestido', 'dress'], k: ['Vestidos', 'Nuevos en tienda'], t: ['El vestido para esa ocasión', 'Elegante sin esfuerzo', 'Para que todos volteen'] },
  { id: 'falda', nombre: 'Faldas', genero: 'la', palabra: 'Falda', claves: ['falda', 'skirt'], k: ['Faldas', 'Nuevas en tienda'], t: ['Ligera y con estilo', 'Combínala con todo'] },
  { id: 'pantalon', nombre: 'Pantalones', genero: 'el', palabra: 'Denim', claves: ['pantalon', 'jeans', 'jean', 'mezclilla', 'denim', 'jogger', 'pants'],
    k: ['Jeans de marca', 'Recién llegados'], t: ['El jeans que buscabas', 'Un buen jeans lo arregla todo', 'Combina con todo lo que ya tienes', 'Claro, oscuro o deslavado'] },
  { id: 'short', nombre: 'Shorts', genero: 'el', palabra: 'Short', claves: ['short', 'bermuda'], k: ['Shorts', 'Para el calor'], t: ['Fresco y con estilo', 'Para los días de calor'] },
  { id: 'tenis', nombre: 'Tenis', genero: 'los', palabra: 'Sneakers', claves: ['tenis', 'sneaker', 'zapatilla', 'deportivo', 'running'],
    k: ['Recién llegados', 'Tenis de marca', 'Nuevos en tienda', 'Para diario'], t: ['Tus próximos tenis favoritos', 'Pisa con estilo', 'Para caminar todo el día', 'Estrena tenis esta semana', 'Unos tenis así no se repiten', 'Del gym a la calle', 'El par que te faltaba', 'Tus pies te lo van a agradecer'] },
  { id: 'botas', nombre: 'Botas', genero: 'las', palabra: 'Boots', claves: ['bota', 'botin', 'boot'], k: ['Botas de marca', 'Otoño · Invierno', 'Recién llegadas'], t: ['Botas para la temporada', 'Pisa fuerte', 'Elegantes y cómodas', 'El toque que tu outfit pedía'] },
  { id: 'zapatos', nombre: 'Zapatos', genero: 'los', palabra: 'Shoes', claves: ['zapato', 'mocasin', 'tacon', 'zapatilla de vestir', 'flats'], k: ['Zapatos', 'Para verte bien'], t: ['Pisa con elegancia', 'El par perfecto para esa ocasión'] },
  { id: 'sandalias', nombre: 'Sandalias', genero: 'las', palabra: 'Sandals', claves: ['sandalia', 'chancla', 'huarache'], k: ['Sandalias', 'Para el calor'], t: ['Frescas y con estilo', 'Para los días de sol'] },
  { id: 'bolsa', nombre: 'Bolsas', genero: 'la', palabra: 'Bags', claves: ['bolsa', 'bolso', 'bandolera', 'tote', 'clutch', 'crossbody', 'handbag'],
    k: ['Bolsas de marca', 'Accesorios', 'Nuevas en tienda'], t: ['La bolsa que le faltaba a tu outfit', 'Cabe todo. Se ve mejor.', 'Regálatela', 'Para diario o para salir', 'El accesorio que todos notan', 'Chiquita, bonita y de marca', 'Para llevar lo importante'] },
  { id: 'cartera', nombre: 'Carteras', genero: 'la', palabra: 'Wallet', claves: ['cartera', 'monedero', 'billetera', 'wallet', 'cosmetiquera'], k: ['Carteras', 'Accesorios'], t: ['El detalle perfecto para regalar', 'Pequeña y de marca'] },
  { id: 'mochila', nombre: 'Mochilas', genero: 'la', palabra: 'Backpack', claves: ['mochila', 'backpack'], k: ['Mochilas', 'Accesorios'], t: ['Para llevar todo con estilo', 'La mochila que sí combina'] },
  { id: 'cinturon', nombre: 'Cinturones', genero: 'el', palabra: 'Belt', claves: ['cinturon', 'cinto', 'belt'], k: ['Cinturones', 'Accesorios'], t: ['El detalle que cierra el outfit', 'Cinturones de marca'] },
  { id: 'gorra', nombre: 'Gorras', genero: 'la', palabra: 'Cap', claves: ['gorra', 'gorro', 'sombrero', 'cap', 'beanie'], k: ['Gorras', 'Accesorios'], t: ['El toque final', 'Para cada outfit, una gorra'] },
  { id: 'lentes', nombre: 'Lentes', genero: 'los', palabra: 'Shades', claves: ['lentes', 'gafas', 'anteojos', 'sunglasses'], k: ['Lentes', 'Accesorios'], t: ['Para verte bien bajo el sol', 'El detalle que todos notan'] },
  { id: 'reloj', nombre: 'Relojes', genero: 'el', palabra: 'Time', claves: ['reloj', 'watch'], k: ['Relojes', 'Accesorios'], t: ['Tu tiempo, con estilo', 'El regalo que siempre queda bien'] },
  { id: 'joyeria', nombre: 'Joyería', genero: 'la', palabra: 'Shine', claves: ['arete', 'collar', 'pulsera', 'anillo', 'joyeria', 'bisuteria', 'cadena'], k: ['Joyería', 'Accesorios'], t: ['El brillo que te faltaba', 'Para regalar (o regalarte)'] },
  { id: 'locion', nombre: 'Lociones', genero: 'la', palabra: 'Scent', claves: ['locion', 'perfume', 'fragancia', 'colonia', 'eau de', 'body mist', 'splash'],
    k: ['Lociones', 'Perfumería'], t: ['Huele a que te va bien', 'El detalle que todos notan', 'Para regalar (o regalarte)', 'Tu aroma de todos los días'] },
  { id: 'cosmetico', nombre: 'Cosméticos', genero: 'el', palabra: 'Beauty', claves: ['cosmetico', 'maquillaje', 'labial', 'crema', 'skincare', 'belleza', 'rimel'], k: ['Belleza', 'Cosméticos'], t: ['Para consentirte', 'Tu rutina, completa'] },
  { id: 'termo', nombre: 'Termos', genero: 'el', palabra: 'Termo', claves: ['termo', 'vaso', 'tumbler', 'botella', 'taza'], k: ['Termos y vasos', 'Accesorios'], t: ['Tu bebida, como la dejaste', 'Frío o caliente, todo el día', 'Para que te acompañe todo el día'] },
  { id: 'tienda', nombre: 'La tienda', genero: 'el', palabra: 'Store', claves: ['estante', 'anaquel', 'bodega', 'tienda', 'exhibicion', 'repisa', 'inventario', 'almacen'],
    k: ['Todo en un solo lugar', 'Ropa · Tenis · Bolsas · Lociones · y más'], t: ['Todo en un solo lugar', 'Si no lo ves, pregúntalo', 'Ropa y accesorios de marca', 'De todo para todos'] },
  { id: 'producto', nombre: 'Productos', genero: 'el', palabra: 'New', claves: [],
    k: ['Nuevo en tienda', 'Recién llegado', 'De temporada'], t: ['Recién llegado', 'Esto no dura', 'Lo que estabas buscando', 'Hecho para ti', 'Pregunta antes de que se acabe'] },
];
export const CAT = Object.fromEntries(CATEGORIAS.map(c => [c.id, c]));

/** La categoría de una foto por lo que dice de ella. Gana la clave más larga que aparezca. */
export function categorizar(...textos) {
  const t = ' ' + sin(textos.flat().join(' ')).replace(/[^a-z0-9 -]+/g, ' ').replace(/\s+/g, ' ') + ' ';
  /* gana la que aparece PRIMERO (en español el sustantivo va antes: «botas de piel con cadena»);
     si dos empiezan igual, la clave más larga */
  let mejor = null, pos = Infinity, largo = 0;
  for (const c of CATEGORIAS) for (const k of c.claves) {
    const kk = sin(k), m = new RegExp(`[ -]${kk.replace(/-/g, '\\-')}(s|es)?(?=[ -])`).exec(t);
    if (m && (m.index < pos || (m.index === pos && kk.length > largo))) { mejor = c.id; pos = m.index; largo = kk.length; }
  }
  return mejor || 'producto';
}

/** «Pide la tuya» / «el tuyo» / «los tuyos» / «las tuyas». */
export function tuyo(cat) {
  const g = (CAT[cat] || CAT.producto).genero;
  return { la: 'la tuya', el: 'el tuyo', las: 'las tuyas', los: 'los tuyos' }[g];
}
export function llamados(cat, { whatsapp = '', historia = false } = {}) {
  const t = tuyo(cat);
  if (historia) return ['Responde esta historia', `Responde y aparta ${t}`, 'Mándanos DM'];
  const base = [`Pide ${t} por DM`, `Aparta ${t}`, 'Mándanos DM'];
  if (['sudadera', 'chamarra', 'playera', 'polo', 'camisa', 'blusa', 'vestido', 'falda', 'pantalon', 'short'].includes(cat)) base.push('Pregunta por tu talla');
  if (['tenis', 'botas', 'zapatos', 'sandalias'].includes(cat)) base.push('Pregunta por tu número');
  if (whatsapp) base.push(`WhatsApp ${whatsapp}`);
  return base;
}

/** Un repartidor de frases que no repite hasta agotar la lista (por categoría). */
export function repartidor(azar = Math.random) {
  const filas = new Map();
  const de = (clave, lista) => {
    let f = filas.get(clave);
    if (!f || !f.length) { f = lista.slice(); for (let i = f.length - 1; i > 0; i--) { const j = Math.floor(azar() * (i + 1)); [f[i], f[j]] = [f[j], f[i]]; } filas.set(clave, f); }
    return f.pop();
  };
  return {
    kicker: cat => de('k' + cat, (CAT[cat] || CAT.producto).k),
    titular: cat => de('t' + cat, (CAT[cat] || CAT.producto).t),
    llamado: (cat, op) => de('c' + cat + (op?.historia ? 'h' : ''), llamados(cat, op)),
    palabra: cat => (CAT[cat] || CAT.producto).palabra,
  };
}
