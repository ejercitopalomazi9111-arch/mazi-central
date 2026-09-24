/* ══════════════════════════════════════════════════════════════════════════
   EL BOT · el cerebro de reglas (Bloque 10)
   ──────────────────────────────────────────────────────────────────────────
   Contesta lo que más se pregunta por WhatsApp —precio, si hay, envío,
   horario, dónde están, cómo se paga, ofertas— y arma el pedido. Las reglas
   que no se negocian (PLAN.md §10):
     · NUNCA inventa un precio ni una existencia: todo sale del catálogo que
       recibe. Si no lo encuentra, lo dice.
     · Si no sabe, o si le piden una persona, pasa la conversación a alguien
       del equipo y se calla hasta que la devuelvan.
     · Nunca escribe primero: sólo contesta.
   Es puro (sin base ni pantalla) y se prueba en pruebas-bot.mjs. Un modelo
   de IA se puede enchufar después para conversar mejor, pero los datos
   —precio, existencias, total— siguen saliendo de aquí.

   responder(texto, { productos, categorias, negocio, estado })
     → { texto, estado, accion?: 'persona' | 'pedido', pedido?, opciones? }
   `estado` es la memoria de la conversación: { carrito: [[id, n]], opciones: [ids], foco, conPersona, dudas }.
   ═════════════════════════════════════════════════════════════════════════ */

export const normal = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[¿?¡!.,;:()"'«»]/g, ' ').replace(/\s+/g, ' ').trim();
const pesos = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 });
const piezas = (n) => n === 1 ? '1 pieza' : `${n} piezas`;
const POCAS = 5;

/* Palabras que no dicen QUÉ producto: se quitan antes de buscar. */
const RELLENO = new Set(`a al algo alguna alguno algun ahi asi buenas buenos buen dia dias tardes noches cual cuales cuanto cuanta cuantos cuantas cuesta cuestan
  cuestas sale salen vale valen precio precios de del el la los las lo le les me mi mis nos para por porfa porfavor favor que quiero quisiera queria
  querria dame deme dan dar das da mandame manda mandan mande agrega agregame agregar pon ponme poner aparta apartame llevo lleva llevar
  tienen tiene tienes tendran tendras hay habra manejan manejas venden vendes necesito ocupo busco buscando un una unos unas uno y o con sin en es
  son esta estan este estos esa ese eso si no tambien mas otro otra otros otras hola oye disculpa pregunta saber gracias bueno ok va pues
  pieza piezas pz pzs cada c u unidad unidades par ahorita hoy`.split(/\s+/));

const NUMEROS = { un: 1, uno: 1, una: 1, dos: 2, par: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, docena: 12, quince: 15, veinte: 20 };
const ORDINALES = { primero: 1, primera: 1, primer: 1, segundo: 2, segunda: 2, tercero: 3, tercera: 3, tercer: 3, cuarto: 4, cuarta: 4, quinto: 5, quinta: 5, ultimo: -1, ultima: -1 };

/* «quiero 3 ceras» → 3 · «un par de navajas» → 2 · «dame cera» → null */
export function cantidad(t){
  const n = normal(t);
  // «113 g», «250 ml», «25 mm» son del producto, no cuántas piezas quiere.
  const d = n.match(/(?:^|\s)(\d{1,3})(?!\s*(?:g|gr|grs|gramos?|ml|mm|cm|oz|kg|lt|l|w|watts?)\b)(?=\s|$)/);
  if(d) return Number(d[1]);
  if(/\bun par\b/.test(n)) return 2;
  for(const w of n.split(' ')) if(NUMEROS[w] && w !== 'un' && w !== 'una' && w !== 'uno') return NUMEROS[w];
  return null;
}

const raiz = (w) => w.length > 4 ? w.replace(/(es|s)$/, '') : w;
const palabras = (t) => normal(t).split(' ').filter((w) => w && !RELLENO.has(w) && !/^\d+$/.test(w) && w.length > 1);

/* Cómo le dice la gente vs. cómo viene en el catálogo (que llega mitad en
   inglés del proveedor). Cada negocio puede sumar las suyas en
   ajustes.bot.sinonimos: [["termo", "vaso", "tumbler"], …]. */
export const SINONIMOS = [
  ['cera', 'wax', 'pomada', 'pomade', 'paste', 'modelador', 'modeladora'],   // «pasta» no: en tintes es decolorante
  ['mate', 'matte', 'mat', 'opaco'],
  ['navaja', 'blade', 'cuchilla', 'razor', 'rastrillo', 'hoja'],
  ['shampoo', 'champu', 'champo'],
  ['tinte', 'color', 'coloracion', 'colorante'],
  ['aceite', 'oil'],
  ['secadora', 'secador', 'dryer'],
  ['plancha', 'alaciadora', 'flat'],
  ['maquina', 'cortadora', 'clipper', 'recortadora', 'trimmer', 'patillera', 'rasuradora', 'shaver'],
  ['tijera', 'scissor', 'shear'],
  ['cepillo', 'brush'],
  ['crema', 'cream'],
  ['laca', 'spray', 'fijador'],
  ['oxidante', 'peroxido', 'developer', 'revelador'],
  ['acondicionador', 'conditioner', 'enjuague'],
];
function variantes(w, grupos){
  const r = raiz(w), salida = new Set([r]);
  for(const g of grupos) if(g.some((x) => raiz(x) === r)) g.forEach((x) => salida.add(raiz(x)));
  return [...salida];
}

/* Busca en el catálogo. Cada palabra (o su sinónimo) tiene que aparecer en el
   nombre, la marca o la categoría. Si ninguno las tiene todas, gana el que
   tenga más —siempre que sean al menos la mitad— y el resultado sale marcado
   `parcial` para que el bot no lo presente como si fuera lo que pidieron.
   Por prefijo sólo con 5 letras o más: «cera» no es «cerámica». */
export function buscar(t, productos, categorias = [], extra = []){
  const grupos = [...SINONIMOS, ...(extra || [])].map((g) => g.map(normal));
  const ws = palabras(t).map((w) => variantes(w, grupos));
  if(!ws.length) return [];
  const cat = new Map(categorias.map((c) => [c.id, normal(c.nombre)]));
  const puntuados = productos.map((p) => {
    const tokens = normal(`${p.n} ${p.m || ''} ${cat.get(p.c) || ''} ${p.sku || ''}`).split(' ').filter(Boolean).map(raiz);
    const s = ws.filter((vs) => vs.some((w) => tokens.some((k) => k === w || (w.length >= 5 && k.startsWith(w))))).length;
    return { p, s };
  });
  const mejor = Math.max(0, ...puntuados.map((x) => x.s));   // el 0 evita el -Infinity de un catálogo vacío
  if(!mejor || mejor < Math.ceil(ws.length / 2)) return [];
  const salida = puntuados.filter((x) => x.s === mejor).map((x) => x.p)
    .sort((a, b) => (a.x ? 1 : 0) - (b.x ? 1 : 0) || a.n.length - b.n.length);
  salida.parcial = mejor < ws.length;
  return salida;
}

/* Qué tanto hay, en palabras. Nunca un número que no esté en el catálogo. */
const hayTexto = (p) => p.x ? 'Ahorita se nos acabó.' : p.q <= POCAS ? `Me ${p.q === 1 ? 'queda 1' : `quedan ${p.q}`}.` : 'Sí hay.';
const ficha = (p) => `${p.n} está en ${pesos(p.p)}${p.a ? ` (antes ${pesos(p.a)})` : ''}. ${hayTexto(p)}`;
const lista = (ps) => ps.map((p, i) => `${i + 1}. ${p.n} — ${pesos(p.p)}${p.x ? ' (agotado)' : ''}`).join('\n');

const INTENCIONES = [
  ['persona', /\b(persona|humano|asesor|asesora|alguien|encargad[oa]|dueno|gerente|queja|reclam|factura|facturar|hablar con)\b/],
  ['saludo', /^(hola|buen[oa]s?( dias| tardes| noches)?|que tal|hey|holi)\b/],
  ['gracias', /^(gracias|muchas gracias|mil gracias|ok gracias|va gracias|perfecto gracias)\b/],
  ['horario', /\b(horario|abren|abierto|cierran|cerrado|a que hora|que horas|dias abren)\b/],
  ['ubicacion', /\b(donde (estan|quedan|se ubican)|direccion|ubicacion|sucursal|local|como llego)\b/],
  ['envio', /\b(envio|envios|envian|mandan|domicilio|entregan|llevan|reparto|costo de envio)\b/],
  ['pago', /\b(pago|pagar|pagos|tarjeta|transferencia|efectivo|clabe|cuenta bancaria|deposito|aceptan)\b/],
  ['ofertas', /\b(oferta|ofertas|promo|promocion|promociones|descuento|descuentos|rebaja)\b/],
  ['vaciar', /\b(cancela|cancelar|borra todo|vaciar|ya no quiero nada|empezar de nuevo)\b/],
  ['quitar', /\b(quita|quitar|quitame|sin el|sin la|ya no quiero)\b/],
  ['carrito', /\b(cuanto llevo|que llevo|mi pedido|mi carrito|el total|cuanto es|cuanto seria|cuanto va)\b/],
  ['confirmar', /^(es todo|seria todo|eso es todo|asi esta bien|confirmo|confirmar|listo|ya|nada mas|solo eso)\b/],
  ['agregar', /\b(quiero|quisiera|dame|deme|mandame|agrega|agregame|ponme|aparta|apartame|me llevo|llevo|me das|me mandas|pideme|necesito|ocupo)\b/],
  ['precio', /\b(cuanto|precio|cuesta|cuestan|vale|valen|sale|salen|tienen|tiene|hay|manejan|venden)\b/],
];
export const intencion = (t) => { const n = normal(t); return (INTENCIONES.find(([, re]) => re.test(n)) || [null])[0]; };

function eleccion(t, opciones){
  const n = normal(t);
  const m = n.match(/^(?:el |la |opcion |numero )?(\d{1,2})$/);
  if(m){ const i = Number(m[1]); return i >= 1 && i <= opciones.length ? opciones[i - 1] : null; }
  for(const w of n.split(' ')) if(ORDINALES[w]) return ORDINALES[w] === -1 ? opciones[opciones.length - 1] : opciones[ORDINALES[w] - 1] || null;
  return null;
}
const esSolaCantidad = (t) => /^(\d{1,3}|un par|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce)( piezas?| pz| pzs)?$/.test(normal(t));
const esSi = (t) => /^(si|sip|simon|claro|va|dale|ok|okey|orale|esa|ese|esta bien|si porfa|si por favor)\b/.test(normal(t));

function resumen(carrito, porId){
  let total = 0;
  const lineas = carrito.map(([id, n]) => { const p = porId.get(id); total += p.p * n; return `• ${n} × ${p.n} — ${pesos(p.p * n)}`; });
  return { texto: lineas.join('\n'), total };
}

function envioTexto(negocio, total){
  const e = negocio?.ajustes?.envio;
  if(!e || (e.costo == null && e.gratis_desde == null && !e.zona)) return null;
  const partes = [];
  if(e.zona) partes.push(`Llevamos a ${e.zona}.`);
  if(Number(e.costo) > 0){
    partes.push(`El envío cuesta ${pesos(e.costo)}${e.gratis_desde != null ? ` y es gratis desde ${pesos(e.gratis_desde)}` : ''}.`);
    if(total != null && e.gratis_desde != null && total < Number(e.gratis_desde)) partes.push(`Te faltan ${pesos(Number(e.gratis_desde) - total)} para el envío gratis.`);
  }else partes.push('El envío es gratis.');
  if(e.tiempo) partes.push(`Llega ${e.tiempo}.`);
  if(e.recoger !== false) partes.push('También puedes pasar a recoger.');
  return partes.join(' ');
}

function pagoTexto(negocio, n){
  const p = negocio?.ajustes?.pagos;
  if(!p) return null;
  const formas = [p.efectivo && 'efectivo', p.tarjeta && 'tarjeta', p.transferencia && 'transferencia'].filter(Boolean);
  if(!formas.length) return null;
  let t = `Aceptamos ${formas.join(', ').replace(/, ([^,]*)$/, ' y $1')}. Puedes pagar al recibir o antes.`;
  if(p.transferencia && p.clabe && /transfer|clabe|deposit|cuenta/.test(n)) t += `\nPara transferencia: ${p.banco || 'banco'} · CLABE ${p.clabe}${p.titular ? ` · a nombre de ${p.titular}` : ''}.`;
  return t;
}

const PASAR = 'Te comunico con alguien del equipo; en un momento te contestan por aquí.';
const NO_TENGO = (que) => `Ese dato (${que}) no lo tengo a la mano. ¿Quieres que te atienda una persona? Escribe «persona».`;

export function responder(texto, { productos = [], categorias = [], negocio = {}, estado: e0 = {} } = {}){
  const estado = { carrito: [], opciones: [], foco: null, conPersona: false, dudas: 0, ...e0 };
  estado.carrito = [...(estado.carrito || [])];
  const porId = new Map(productos.map((p) => [p.id, p]));
  const n = normal(texto);
  const nombre = negocio?.marca?.nombre_corto || negocio?.nombre || 'la tienda';
  const sal = (t, { estado: cambios, ...resto } = {}) => ({ texto: t, estado: { ...estado, ...(cambios || {}) }, ...resto });

  // Con una persona atendiendo, el bot no se mete.
  if(estado.conPersona) return { texto: null, estado };
  if(!n) return sal(null);

  const agregar = (p, cuantas) => {
    if(p.x) return sal(`${p.n}: ${hayTexto(p)} ¿Te busco algo parecido?`, { estado: { foco: null, opciones: [] } });
    const ya = estado.carrito.find(([id]) => id === p.id)?.[1] || 0;
    const cabe = Math.max(0, Math.min(cuantas, p.q - ya));
    if(!cabe) return sal(`Ya llevas las ${ya} que me quedan de ${p.n}.`);
    const i = estado.carrito.findIndex(([id]) => id === p.id);
    if(i >= 0) estado.carrito[i] = [p.id, ya + cabe]; else estado.carrito.push([p.id, cabe]);
    estado.pide = null;
    const r = resumen(estado.carrito, porId);
    const aviso = cabe < cuantas ? `Sólo me quedaban ${cabe}, te las puse. ` : '';
    return sal(`${aviso}Listo: ${cabe} × ${p.n}. Llevas ${pesos(r.total)}.\n¿Algo más? Si es todo, escribe «es todo».`, { estado: { foco: null, opciones: [] } });
  };

  // 1) Contestando a una lista numerada.
  if(estado.opciones?.length){
    const id = eleccion(texto, estado.opciones);
    if(id && porId.get(id)){
      // La cantidad pudo venir antes: «un par de navajas» → lista → «el 2».
      const p = porId.get(id), c = cantidad(texto.replace(/^\s*\d{1,2}\b/, '')) || estado.pide;
      if(c) return agregar(p, c);
      return sal(`${ficha(p)}${p.x ? '' : ' ¿Cuántas te pongo?'}`, { estado: { foco: p.x ? null : p.id, opciones: [] } });
    }
  }
  // 2) Contestando «¿cuántas?» o «¿te la pongo?».
  if(estado.foco && porId.get(estado.foco)){
    if(esSolaCantidad(texto)) return agregar(porId.get(estado.foco), cantidad(texto) || 1);
    if(esSi(texto)) return agregar(porId.get(estado.foco), cantidad(texto) || 1);
  }

  const qu = intencion(texto);

  if(qu === 'persona') return sal(PASAR, { accion: 'persona', estado: { conPersona: true } });
  if(qu === 'gracias') return sal(`¡A ti! Aquí estamos para lo que necesites. — ${nombre}`, { estado: { dudas: 0 } });
  if(qu === 'saludo' && palabras(texto).length === 0)
    return sal(`¡Hola! Soy el asistente de ${nombre}. Te digo precios, si hay, y te armo tu pedido. ¿Qué necesitas?`);
  if(qu === 'horario'){ const h = negocio?.ajustes?.contacto?.horario; return sal(h ? `Nuestro horario: ${h}.` : NO_TENGO('el horario')); }
  if(qu === 'ubicacion'){ const d = negocio?.ajustes?.contacto?.direccion; return sal(d ? `Estamos en ${d}.` : NO_TENGO('la dirección')); }
  if(qu === 'envio'){ const t = envioTexto(negocio, estado.carrito.length ? resumen(estado.carrito, porId).total : null); return sal(t || NO_TENGO('el costo de envío')); }
  if(qu === 'pago'){ const t = pagoTexto(negocio, n); return sal(t || NO_TENGO('las formas de pago')); }
  if(qu === 'ofertas'){
    const of = productos.filter((p) => p.a && !p.x).sort((a, b) => (1 - b.p / b.a) - (1 - a.p / a.a)).slice(0, 5);
    if(!of.length) return sal('Ahorita no tenemos ofertas. ¿Buscas algo en particular?');
    return sal(`Estas son las ofertas de hoy:\n${lista(of)}\n¿Te interesa alguna? Dime el número.`, { estado: { opciones: of.map((p) => p.id), foco: null } });
  }
  if(qu === 'vaciar') return sal(estado.carrito.length ? 'Listo, borré tu pedido. ¿Empezamos de nuevo?' : 'No llevas nada todavía.', { estado: { carrito: [], foco: null, opciones: [] } });
  if(qu === 'carrito' || (qu === 'confirmar' && !estado.carrito.length)){
    if(!estado.carrito.length) return sal('Todavía no llevas nada. ¿Qué te mando?');
    const r = resumen(estado.carrito, porId);
    return sal(`Llevas:\n${r.texto}\nTotal: ${pesos(r.total)}.${envioTexto(negocio, r.total) ? '\n' + envioTexto(negocio, r.total) : ''}`);
  }
  if(qu === 'confirmar'){
    const r = resumen(estado.carrito, porId);
    return sal(`Tu pedido:\n${r.texto}\nTotal: ${pesos(r.total)} (más envío, si aplica).\nPara mandarlo, pásame tu nombre y tu dirección, y dime si pagas al recibir o antes.`,
      { accion: 'pedido', pedido: { renglones: estado.carrito.map(([id, c]) => ({ id, cantidad: c })), total: r.total } });
  }

  // De aquí en adelante, habla de productos.
  const hallados = buscar(texto, productos, categorias, negocio?.ajustes?.bot?.sinonimos);
  const casi = hallados.parcial ? `No tengo exactamente «${palabras(texto).join(' ')}», pero tengo esto:\n` : '';
  if(qu === 'quitar'){
    const enCarro = hallados.filter((p) => estado.carrito.some(([id]) => id === p.id));
    if(!enCarro.length) return sal('No encontré eso en lo que llevas. Escribe «mi pedido» para ver qué llevas.');
    estado.carrito = estado.carrito.filter(([id]) => id !== enCarro[0].id);
    return sal(`Quité ${enCarro[0].n}. ${estado.carrito.length ? `Llevas ${pesos(resumen(estado.carrito, porId).total)}.` : 'Ya no llevas nada.'}`);
  }
  if(hallados.length === 1){
    const p = hallados[0], c = cantidad(texto);
    if(!casi && (qu === 'agregar' || c)) return agregar(p, c || 1);
    return sal(`${casi}${ficha(p)}${p.x ? '' : ' ¿Te la aparto? Dime cuántas.'}`, { estado: { foco: p.x ? null : p.id, opciones: [], dudas: 0 } });
  }
  if(hallados.length > 1){
    const top = hallados.slice(0, 5);
    const cuantos = casi || (hallados.length > 5 ? `Tengo ${hallados.length} que coinciden. Estos son los primeros; si me dices marca o tamaño, te afino:\n` : 'Tengo estos:\n');
    return sal(`${cuantos}${lista(top)}\n¿Cuál? Dime el número.`, { estado: { opciones: top.map((p) => p.id), foco: null, dudas: 0, pide: cantidad(texto) } });
  }
  // No lo encontré o no entendí: a la segunda seguida, pasa a una persona.
  const dudas = (estado.dudas || 0) + 1;
  if(dudas >= 2) return sal(`Creo que no te estoy entendiendo. ${PASAR}`, { accion: 'persona', estado: { conPersona: true, dudas: 0 } });
  if(palabras(texto).length)
    return sal(`No encontré «${palabras(texto).join(' ')}» en lo que vendemos. ¿Lo buscas con otro nombre o marca? Si prefieres, escribe «persona».`, { estado: { dudas } });
  return sal('No te entendí bien. Puedo decirte precios, si hay, el envío o armarte tu pedido. ¿Qué buscas?', { estado: { dudas } });
}
