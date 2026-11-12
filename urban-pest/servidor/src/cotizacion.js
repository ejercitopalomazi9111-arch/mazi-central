/* ═══════════════════════════════════════════════════════════════════════════
   URBAN PEST · LA COTIZACIÓN POR ESCRITO (el «PDF» que manda el bot)
   ───────────────────────────────────────────────────────────────────────────
   BRIEF §B: «el bot da un precio aproximado y manda la cotización en PDF». En un
   teléfono, lo que mejor funciona es un LINK a una hoja lista para imprimir o
   guardar como PDF (urban-pest/cotizacion/?c=…): no hay archivo que bajar y
   abre igual en WhatsApp, Instagram y Facebook.

   Guarda:
     cotdoc:<codigo>   { codigo, folio, fecha, vence, cliente, concepto…, precio, renglones?, origen }
     cotfolio          último folio
   El link es de sólo lectura y NO trae el teléfono ni el chat del cliente: si
   alguien lo reenvía, no expone a nadie.

   Hay dos orígenes:
     · «bot»   la arma la oficina en cuanto da un precio (una por precio distinto);
     · «mano»  la hace el dueño desde el centro, con renglones y precios suyos.
   ═══════════════════════════════════════════════════════════════════════════ */

export const VIGENCIA_DIAS = 15;
const azar = (n, abc = 'abcdefghjkmnpqrstuvwxyz23456789') => [...crypto.getRandomValues(new Uint8Array(n))].map(x => abc[x % abc.length]).join('');
const texto = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const dia = (ms) => new Date(ms).toISOString().slice(0, 10);

const NOMBRES = { cucaracha: 'cucarachas', roedor: 'ratas y ratones', hormiga: 'hormigas', chinche: 'chinches', alacran: 'alacranes', pulga: 'pulgas',
  termita: 'termitas', arana: 'arañas', mosco: 'mosquitos', mosca: 'moscas' };
const LUGAR = { casa: 'Casa', negocio: 'Negocio', industria: 'Industria' };

async function nuevoFolio(A){ const f = ((await A.get('cotfolio')) || 0) + 1; await A.put('cotfolio', f); return f; }

/** La que arma el bot: sale de la cotización del sistema, nunca de lo que escribió la IA. */
export async function cotizacionDelBot(A, conv, cot, ahora = Date.now()){
  const d = conv.datos || {};
  const codigo = azar(12), folio = await nuevoFolio(A);
  const plaga = NOMBRES[d.plaga] || texto(d.plaga, 40) || 'plagas';
  const doc = {
    codigo, folio, origen: 'bot', fecha: dia(ahora), vence: dia(ahora + VIGENCIA_DIAS * 864e5),
    cliente: texto(conv.nombre, 80) || null,
    concepto: `Control de ${plaga}`,
    lugar: LUGAR[d.tipo || 'casa'] || 'Casa', zona: texto(d.zona, 60) || null,
    m2: cot.m2 || d.m2 || null, m2Estimado: !!cot.m2Estimado,
    precio: cot.desde, moneda: 'MXN', visita: !!cot.visita,
    nota: cot.nota, ...(cot.ejemplo ? { ejemplo: true } : {}),
    /* SÓLO para el dueño (centro → Números): de dónde sale el precio, cuánto cuesta y cuánto queda, y a qué chat
       contestarle. cotizacionPublica lo quita: el cliente nunca lo ve. */
    interno: { desglose: cot.desglose || null, km: d.km ?? null, plaga: d.plaga || null, canal: conv.canal, chat: conv.chat },
  };
  await A.put('cotdoc:' + codigo, doc);
  return doc;
}

/** La que hace el dueño a mano desde el centro: varios renglones, sus precios. */
export async function cotizacionAMano(A, b, quien, ahora = Date.now()){
  const renglones = (Array.isArray(b.renglones) ? b.renglones : []).slice(0, 30)
    .map(r => ({ concepto: texto(r.concepto, 140), cantidad: Number(r.cantidad) > 0 ? Number(r.cantidad) : 1, precio: Number(r.precio) }))
    .filter(r => r.concepto && Number.isFinite(r.precio) && r.precio >= 0);
  if(!renglones.length) return { bien: false, error: 'Pon al menos un renglón con concepto y precio.', estado: 400 };
  const cliente = texto(b.cliente, 80); if(!cliente) return { bien: false, error: 'Falta a nombre de quién va.', estado: 400 };
  const dias = Math.min(90, Math.max(1, Number(b.vigencia) || VIGENCIA_DIAS));
  const codigo = azar(12), folio = await nuevoFolio(A);
  const precio = Math.round(renglones.reduce((s, r) => s + r.cantidad * r.precio, 0) * 100) / 100;
  const doc = { codigo, folio, origen: 'mano', hizo: quien || null, fecha: dia(ahora), vence: dia(ahora + dias * 864e5), cliente,
    concepto: texto(b.concepto, 140) || 'Servicio de control de plagas', lugar: texto(b.lugar, 60) || null, zona: texto(b.zona, 80) || null,
    renglones, precio, moneda: 'MXN', iva: b.iva === 'incluido' || b.iva === 'mas' ? b.iva : null, nota: texto(b.nota, 600) || null };
  await A.put('cotdoc:' + codigo, doc);
  return { bien: true, cotizacion: doc };
}

/** Lo que ve quien abre el link. Sólo lectura; trae el nombre del negocio y su respaldo. */
export async function cotizacionPublica(A, codigo){
  const doc = /^[a-z0-9]{10,16}$/.test(String(codigo || '')) ? await A.get('cotdoc:' + codigo) : null;
  if(!doc) return { bien: false, error: 'Esa cotización no existe. Pídela otra vez por WhatsApp.', estado: 404 };
  const n = (await A.get('negocio')) || {}, docs = (await A.get('documentos')) || {};
  const { hizo, interno, ...publica } = doc;
  return { bien: true, cotizacion: publica,
    negocio: { nombre: n.nombre || 'Urban Pest Control', telefono: n.telefono || null, correo: n.correo || null, garantia: n.garantia || null,
      licencia_sanitaria: docs.licencia_sanitaria || null, repse: docs.repse || null } };
}

export async function listarCotizaciones(A){
  const todas = (await A.list('cotdoc:')).map(([, v]) => v).sort((a, b) => b.folio - a.folio);
  return { bien: true, cotizaciones: todas.slice(0, 200) };
}
