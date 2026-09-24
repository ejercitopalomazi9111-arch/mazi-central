/* ══════════════════════════════════════════════════════════════════════════
   CLASIFICAR · en qué categoría va un producto que llega de un Excel
   ──────────────────────────────────────────────────────────────────────────
   Las reglas de adelgazar.mjs sirven para UNA barbería y las escribió una
   persona. El producto se vende a cualquier giro, así que aquí no hay reglas:
   se APRENDE del catálogo que el negocio ya tiene. Cada producto con su
   categoría es un ejemplo; un producto nuevo va a donde se parecen más sus
   palabras. Es un clasificador bayesiano de palabras, del tamaño de un
   párrafo, que corre en el teléfono y no necesita modelo ni llave.

   Un negocio nuevo, sin catálogo, no tiene de dónde aprender: ahí cuentan el
   nombre de la categoría y sus `palabras` (se escriben al crearla).

   Lo importante no es acertar siempre, es SABER CUÁNDO NO SABE: cada respuesta
   trae su confianza, y la pantalla de revisión pone arriba las dudosas. Una
   persona corrige veinte, no quinientas.

   Módulo puro: sin DOM ni red. Lo usan el importador y sus pruebas en Node.
   ═════════════════════════════════════════════════════════════════════════ */

const VACIAS = new Set(('de del la las el los y e o u en con sin para por a al x un una unos unas ' +
  'ml gr g kg lt l oz pz pzs pza pack kit set mm cm pulgadas pulg no num n').split(' '));

export const sinAcentos = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* Palabras con peso: sin acentos, sin números sueltos, sin «de/para/ml», y con
   un plural ingenuo quitado («tijeras» y «tijera» cuentan igual). */
export function palabras(texto){
  const salida = [];
  for(let w of sinAcentos(texto).split(/[^a-z0-9ñ]+/)){
    if(w.length < 3 || VACIAS.has(w) || /^\d+$/.test(w)) continue;
    if(w.length > 4 && w.endsWith('es') && !w.endsWith('ces')) w = w.slice(0, -2);
    else if(w.length > 3 && w.endsWith('s')) w = w.slice(0, -1);
    salida.push(w);
  }
  return salida;
}

/* ejemplos: [{ texto, categoria }] · categorias: [{ id, nombre, palabras? }]
   El nombre y las palabras de la categoría cuentan como ejemplos con peso, así
   que el clasificador arranca aunque el catálogo esté vacío. */
export function entrenar(ejemplos, categorias = []){
  const cats = new Map();
  const cat = (id) => { if(!cats.has(id)) cats.set(id, { docs: 0, total: 0, cuenta: new Map() }); return cats.get(id); };
  const vocab = new Set();
  const sumar = (id, ws, peso = 1) => {
    const c = cat(id);
    for(const w of ws){ c.cuenta.set(w, (c.cuenta.get(w) || 0) + peso); c.total += peso; vocab.add(w); }
  };
  for(const c of categorias){
    const semilla = palabras([c.nombre, ...(c.palabras || [])].join(' '));
    cat(c.id).docs += 1;
    sumar(c.id, semilla, 3);
  }
  for(const e of ejemplos){
    if(!e.categoria) continue;
    const ws = [...new Set(palabras(e.texto))];
    cat(e.categoria).docs += 1;
    sumar(e.categoria, ws);
  }
  const docs = [...cats.values()].reduce((t, c) => t + c.docs, 0);
  return { cats, vocab: vocab.size, docs };
}

/* → [{ categoria, prob }] de la más probable a la menos, y la confianza. */
export function predecir(modelo, texto){
  const ws = [...new Set(palabras(texto))];
  const V = Math.max(1, modelo.vocab);
  const puntos = [];
  for(const [id, c] of modelo.cats){
    // Sin priorizar por tamaño de categoría: la grande no se traga a las chicas.
    let s = 0;
    for(const w of ws) s += Math.log(((c.cuenta.get(w) || 0) + 0.1) / (c.total + 0.1 * V));
    // Bayes ingenuo suma cada palabra como si fuera prueba independiente, y con
    // diez palabras jura 99 % aunque dude. Dividir entre √n lo templa: medido,
    // el error en lo «seguro» bajó de 6 % a 1.3 % (pruebas-clasificar.mjs).
    puntos.push({ categoria: id, s: s / Math.sqrt(ws.length || 1), conocidas: ws.filter((w) => c.cuenta.has(w)).length });
  }
  if(!puntos.length) return { orden: [], confianza: 0, dudoso: true, sinPistas: true };
  const max = Math.max(...puntos.map((p) => p.s));
  const suma = puntos.reduce((t, p) => t + Math.exp(p.s - max), 0);
  const orden = puntos.map((p) => ({ categoria: p.categoria, prob: Math.exp(p.s - max) / suma, conocidas: p.conocidas }))
    .sort((a, b) => b.prob - a.prob);
  // Ni una palabra conocida en ninguna categoría: no es confianza, es azar.
  const sinPistas = !orden.some((o) => o.conocidas > 0);
  const confianza = sinPistas ? 0 : orden[0].prob;
  return { orden, confianza, dudoso: sinPistas || confianza < UMBRAL, sinPistas };
}

/* Por debajo de esto va a la lista de «revisa estas». Calibrado con las
   pruebas (pruebas-clasificar.mjs): arriba de él, los errores son raros. */
export const UMBRAL = 0.6;
