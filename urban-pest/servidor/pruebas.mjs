/* Pruebas del servidor de Urban Pest, sin Cloudflare ni internet:
 *   node urban-pest/servidor/pruebas.mjs
 * La IA y Meta van de mentiras; el almacén es un Map. */
import { readFileSync } from 'node:fs';
import { reflejo, llenar } from './src/reflejo.js';
import { cotizar, aPlaga } from './src/cotizador.js';
import { firmaValida, leerAviso } from './src/meta.js';
import { Oficina, ponerPrecio } from './src/oficina.js';
import { leerJSON } from './src/cerebro.js';

let bien = 0, mal = 0;
const ok = (q, c, d = '') => { if(c){ bien++; console.log('  ✓ ' + q); } else { mal++; console.log('  ✗ ' + q + (d ? '  → ' + d : '')); } };
const casos = JSON.parse(readFileSync(new URL('../bot/casos.json', import.meta.url)));

console.log('reflejo');
ok('«oye cuánto cobran por fumigar?» → precio', reflejo('oye cuánto cobran por fumigar?', casos)?.caso.id === 'precio');
ok('«¿Dan factura?» → factura', reflejo('¿Dan factura?', casos)?.caso.id === 'factura');
ok('«fumigan bodegas industriales?» → empresa', reflejo('fumigan bodegas industriales?', casos)?.caso.id === 'empresa');
ok('las preguntas de su página contestan con SU texto (garantía, mascotas, cobertura, inspección)', ['¿dan garantía?', '¿son seguros para mascotas?', '¿atienden en San Juan del Río?', '¿qué incluye la inspección?'].map(x => reflejo(x, casos)?.caso.id).join() === 'garantia,mascotas,cobertura,inspeccion');
ok('palomas en una bodega es de palomas, no de empresa; un tlacuache es fauna', reflejo('tengo palomas en el techo de mi bodega', casos)?.caso.id === 'palomas' && reflejo('se metió un tlacuache', casos)?.caso.id === 'fauna' && reflejo('fumigan bodegas?', casos)?.caso.id === 'empresa');
ok('lo que no conoce lo deja pasar al cerebro', reflejo('mi perro se comió una cucaracha, ¿le pasa algo?', casos) === null);
ok('un saludo solo no dispara nada', reflejo('hola buenas tardes', casos) === null);
ok('llenar quita lo que falta', llenar('Son {m2} m² en {zona}', { m2: 80 }) === 'Son 80 m² en');

console.log('cotizador');
const T = { minimo: 500, mano_obra_m2: 2, costo_km: 4, radio_km: 40, margen: .3, umbral_visita_m2: 400,
  plagas: { cucaracha: { litros_m2: .05, precio_litro: 60 } }, tipos: { casa: { factor: 1 }, industria: { factor: 1.4, visita: true } }, zonas: { centro: 6 } };
const c1 = cotizar({ plaga: 'cucaracha', m2: 80, km: 6, tipo: 'casa' }, T);
ok('una casa de 80 m² a 6 km: (240 + 160) + 48 de traslado, +30 % → $590', c1.bien && c1.desde === 590, JSON.stringify(c1));
ok('una casa chiquita no baja del mínimo', cotizar({ plaga: 'cucaracha', m2: 10, km: 1 }, T).desde === 500);
const c2 = cotizar({ plaga: 'cucaracha', m2: 1000, km: 20, tipo: 'industria' }, T);
ok('una industria pide visita', c2.bien && c2.visita && c2.desde > 500, JSON.stringify(c2));
ok('sin tarifas no inventa', !cotizar({ plaga: 'cucaracha', m2: 80, km: 6 }, null).bien);
ok('dice qué falta', cotizar({ plaga: 'pulga', m2: 0 }, T).falta?.length === 3);
ok('fuera del radio lo marca', cotizar({ plaga: 'cucaracha', m2: 80, km: 70 }, T).fueraDeRadio);

ok('dentro de la zona se atiende todo', cotizar({ plaga: 'cucaracha', m2: 80, km: 10 }, T).atiende === 'si');
ok('fuera de zona: industria sí (con visita)', cotizar({ plaga: 'cucaracha', m2: 500, km: 70, tipo: 'industria' }, T).atiende === 'si');
ok('fuera de zona: casa chica no se cubre', cotizar({ plaga: 'cucaracha', m2: 90, km: 70, tipo: 'casa' }, T).atiende === 'no');
ok('fuera de zona: casa grande, caso por caso', cotizar({ plaga: 'cucaracha', m2: 260, km: 70, tipo: 'casa' }, T).atiende === 'caso-por-caso');
ok('fuera de zona sale más caro por el traslado', cotizar({ plaga: 'cucaracha', m2: 260, km: 70 }, T).desde > cotizar({ plaga: 'cucaracha', m2: 260, km: 10 }, T).desde);
ok('la nota nunca dice «desde»', !/desde/i.test(cotizar({ plaga: 'cucaracha', m2: 80, km: 6 }, T).nota));
console.log('meta');
const secreto = 'secreto-de-prueba', cuerpo = '{"hola":1}';
const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
const firma = 'sha256=' + [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(cuerpo)))].map(b => b.toString(16).padStart(2, '0')).join('');
ok('firma buena pasa', await firmaValida(cuerpo, firma, secreto));
ok('firma mala no pasa', !(await firmaValida(cuerpo + ' ', firma, secreto)));
ok('sin secreto no pasa nada', !(await firmaValida(cuerpo, firma, '')));
const wa = leerAviso({ object: 'whatsapp_business_account', entry: [{ changes: [{ value: { contacts: [{ wa_id: '524420000000', profile: { name: 'Ana' } }], messages: [{ from: '524420000000', id: 'w1', timestamp: '1700000000', type: 'text', text: { body: 'hola' } }] } }] }] });
ok('WhatsApp: lee texto y nombre', wa[0]?.texto === 'hola' && wa[0].nombre === 'Ana' && wa[0].canal === 'whatsapp');
const ig = leerAviso({ object: 'instagram', entry: [{ messaging: [{ sender: { id: 'ig1' }, message: { mid: 'm1', text: 'precio?' } }, { sender: { id: 'yo' }, message: { mid: 'm2', text: 'eco', is_echo: true } }] }] });
ok('Instagram: lee el mensaje y tira el eco', ig.length === 1 && ig[0].canal === 'instagram' && ig[0].texto === 'precio?');

console.log('oficina');
const hacer = (opc = {}) => {
  const M = new Map([['casos', casos], ['tarifas', T], ['personales', ['524421111111']]]);
  const salidas = [], llamadas = [];
  let reloj = 1_700_000_000_000;
  const of = new Oficina({
    almacen: { get: async k => M.get(k), put: async (k, v) => M.set(k, structuredClone(v)), list: async p => [...M].filter(([k]) => k.startsWith(p)) },
    env: { DUENO_WA: '524429999999' }, reloj: () => reloj,
    enviar: async (env, canal, chat, texto) => { salidas.push({ canal, chat, texto }); return { bien: true }; },
    pensar: async (a) => { llamadas.push(a); return opc.pensar ? opc.pensar(a, llamadas.length) : { bien: true, respuesta: 'r', necesita_dueno: false, motivo: '', razon: 'x', datos: {} }; },
  });
  return { of, M, salidas, llamadas, avanza: (ms) => { reloj += ms; } };
};
let n = 0; const msj = (texto, chat = '524420000000', extra = {}) => ({ canal: 'whatsapp', chat, id: 'id' + (++n), texto, cuando: 0, ...extra });

{ const t = hacer(); const r = await t.of.atender(msj('cuánto cuesta fumigar?'));
  ok('pregunta conocida: contesta el reflejo sin gastar IA', r.hecho === 'reflejo' && !t.llamadas.length && t.salidas[0]?.texto.includes('plaga')); }
{ const t = hacer(); const r = await t.of.atender(msj('cuánto cuesta fumigar?', '524421111111'));
  ok('chat personal del dueño: ni lo toca', r.hecho === 'personal' && !t.salidas.length); }
{ const t = hacer(); const m = msj('cuánto cuesta fumigar?'); await t.of.atender(m); const r = await t.of.atender(m);
  ok('Meta repite el aviso: no contesta dos veces', r.hecho === 'repetido' && t.salidas.length === 1); }
{ const t = hacer({ pensar: (a, i) => i === 1
    ? { bien: true, respuesta: 'Va, ¿en qué colonia?', necesita_dueno: false, motivo: '', razon: 'faltaba zona', datos: { plaga: 'cucaracha', m2: 80, zona: 'Centro', tipo: 'casa' } }
    : { bien: true, respuesta: `Te saldría aproximadamente en $${a.cotizacion.desde}`, necesita_dueno: false, motivo: '', razon: 'con precio', datos: {} } });
  const r = await t.of.atender(msj('tengo cucarachas en mi casa del centro, son como 80 metros'));
  ok('con los datos completos cotiza y la IA da el aproximado', r.hecho === 'cerebro' && t.llamadas.length === 2 && /aproximadamente en \$590/.test(t.salidas[0]?.texto), JSON.stringify(t.salidas));
  ok('lo que contestó la IA queda en el manual', [...t.M.keys()].some(k => k.startsWith('manual:'))); }
{ const t = hacer({ pensar: () => ({ bien: true, respuesta: 'Te paso con el encargado', necesita_dueno: true, motivo: 'queja', razon: 'enojado', datos: {} }) });
  await t.of.atender(msj('llevan tres veces y siguen las cucarachas, qué onda'));
  ok('si hace falta el dueño, le llega aviso por WhatsApp', t.salidas.some(s => s.chat === '524429999999' && s.texto.includes('queja')) && [...t.M.keys()].some(k => k.startsWith('aviso:'))); }
{ const t = hacer({ pensar: () => ({ bien: false, error: 'La IA contestó 529' }) });
  const r = await t.of.atender(msj('pregunta rarísima'));
  ok('si la IA falla, el cliente no se queda colgado y el dueño se entera', r.hecho === 'respaldo' && t.salidas.length === 2); }
{ const t = hacer(); await t.of.atender(msj('cuánto cuesta fumigar?'));
  await t.of.contestaDueno('whatsapp', '524420000000', 'Yo te atiendo, soy el dueño');
  const r = await t.of.atender(msj('ok gracias, ¿y dan factura?'));
  ok('cuando el dueño contesta, el bot se calla en ese chat', r.hecho === 'dueno-contesta' && t.salidas.length === 2);
  t.avanza(31 * 60e3); const r2 = await t.of.atender(msj('¿dan factura?'));
  ok('…y a la media hora vuelve', r2.hecho === 'reflejo'); }
{ const t = hacer(); let r;
  for(let i = 0; i < 22; i++) r = await t.of.atender(msj('pregunta ' + i + ' de algo raro'));
  ok('tope de 20 respuestas por hora en un chat', r.hecho === 'tope' && t.salidas.filter(s => s.chat === '524420000000').length === 20); }

console.log('cerebro (gratis primero)');
{ const { leerJSON, pensar } = await import('./src/cerebro.js');
  const j = leerJSON('```json\n{"respuesta":"Va","necesita_dueno":0,"motivo":"","razon":"r","datos":{"m2":"80","tipo":"bodega"}}\n```');
  ok('lee el JSON aunque venga entre ``` y lo deja con su forma', j?.respuesta === 'Va' && j.necesita_dueno === false && j.datos.m2 === 80 && j.datos.tipo === null);
  ok('sin respuesta no cuenta como JSON bueno', leerJSON('{"respuesta":""}') === null && leerJSON('nada') === null);
  const original = globalThis.fetch, pedidos = [];
  globalThis.fetch = async (url) => { pedidos.push(String(url));
    if(String(url).includes('groq')) return new Response('saturado', { status: 503 });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"respuesta":"Hola","necesita_dueno":false,"motivo":"","razon":"x","datos":{}}' }] } }] }), { status: 200 }); };
  const p = await pensar({ env: { GROQ_API_KEY: 'g', GEMINI_API_KEY: 'm', ANTHROPIC_API_KEY: 'a' }, negocio: {}, casos: [], historial: [{ de: 'cliente', texto: 'hola' }] });
  ok('si Negro (Groq) está saturado, contesta Paulina (Gemini)', p.bien && p.respuesta === 'Hola' && /gemini/.test(p.modelo), JSON.stringify(p));
  ok('de fábrica NO toca la IA de paga', !pedidos.some(u => u.includes('anthropic')));
  const sin = await pensar({ env: {}, negocio: {}, casos: [], historial: [{ de: 'cliente', texto: 'hola' }] });
  ok('sin llaves no truena: dice cuál falta', !sin.bien && /GROQ_API_KEY/.test(sin.error));
  globalThis.fetch = async (url) => String(url).includes('groq') ? new Promise(() => {})
    : new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"respuesta":"Ya","necesita_dueno":false,"motivo":"","razon":"x","datos":{}}' }] } }] }), { status: 200 });
  const t0 = Date.now(), lenta = await pensar({ env: { GROQ_API_KEY: 'g', GEMINI_API_KEY: 'm', TOPE_IA_MS: 150 }, negocio: {}, casos: [], historial: [{ de: 'cliente', texto: 'hola' }] });
  ok('si Negro se queda pensando, a los segundos contesta Paulina', lenta.bien && lenta.respuesta === 'Ya' && Date.now() - t0 < 2000, JSON.stringify(lenta));
  globalThis.fetch = original; }

console.log('medidor (no sabe cuánto mide su casa)');
{ const { estimarM2 } = await import('./src/medidor.js');
  const { aPlaga } = await import('./src/cotizador.js');
  const g = estimarM2({ tamano: 'grande', recamaras: 3, banos: 2, sala: true, comedor: true, patio: true, zona: 'Juriquilla' });
  const g2 = estimarM2({ tamano: 'grande', recamaras: 3, banos: 2, sala: true, comedor: true, patio: true, zona: 'Centro' });
  const c = estimarM2({ tamano: 'chica', recamaras: 2, banos: 1 });
  ok('casa grande de 3 recámaras: un estimado con su rango', g.bien && g.m2 > 150 && g.rango[0] < g.m2 && g.m2 < g.rango[1], JSON.stringify(g));
  ok('la misma casa en Juriquilla sale más grande que en el Centro', g.m2 > g2.m2, `${g.m2} vs ${g2.m2}`);
  ok('una casa chica de 2 recámaras sale chica', c.bien && c.m2 < 60, JSON.stringify(c));
  ok('sólo con «es mediana» ya hay estimado', estimarM2({ tamano: 'Mediana' }).m2 === 110);
  ok('«pequeña» cuenta como chica', estimarM2({ tamano: 'pequeña' }).tamano === 'chica');
  ok('sin nada, dice qué falta en vez de inventar', !estimarM2({}).bien);
  ok('dice qué preguntar para afinar', estimarM2({ tamano: 'grande' }).afinar.includes('recámaras'));
  ok('«cucarachitas güeritas», «ratones» y «comején» se entienden', aPlaga('cucarachitas güeritas') === 'cucaracha' && aPlaga('Ratones') === 'roedor' && aPlaga('comején') === 'termita'); }
{ const t = hacer({ pensar: (a, i) => i === 1
    ? { bien: true, respuesta: '¿Y en qué colonia?', necesita_dueno: false, motivo: '', razon: 'no sabe metros: quiz', datos: { plaga: 'cucarachas chiquitas', m2: null, zona: 'Centro', tipo: 'casa', tamano: 'mediana', recamaras: 2, banos: 1 } }
    : { bien: true, respuesta: `Te saldría aproximadamente en $${a.cotizacion.desde}`, necesita_dueno: false, motivo: '', razon: 'estimado', datos: {} } });
  await t.of.atender(msj('no sé cuántos metros, es mediana, 2 recámaras y un baño, en el centro, tengo cucarachas chiquitas'));
  const conv = t.M.get('conv:whatsapp:524420000000');
  ok('sin metros, cotiza con el estimado y lo marca como estimado', conv.cotizacion?.m2Estimado && conv.cotizacion.m2 > 0 && t.llamadas.length === 2, JSON.stringify(conv.cotizacion)); }

/* ── el precio lo pone el código (Brenda, 12 nov: el bot le escribió «aproximadamente en $X») ── */
{ const cot = { desde: 22100 };
  ok('{precio} se vuelve la cantidad con comas', ponerPrecio('Te saldría aproximadamente en {precio}.', cot) === 'Te saldría aproximadamente en $22,100.');
  ok('«$X» copiado del ejemplo NO sale', ponerPrecio('Te saldría aproximadamente en $X. Si los datos…', cot) === null);
  ok('un precio inventado NO sale', ponerPrecio('Te sale en $1,500', cot) === null);
  ok('el precio correcto escrito a mano sí sale', ponerPrecio('Te sale en $22,100', cot) === 'Te sale en $22,100');
  ok('{precio} sin cotización NO sale', ponerPrecio('Te saldría en {precio}', null) === null);
  ok('sin precio ni cotización pasa igual', ponerPrecio('¿En qué colonia estás?', null) === '¿En qué colonia estás?'); }
{ const t = hacer({ pensar: () => ({ bien: true, respuesta: 'Te saldría aproximadamente en $X. Si los datos que nos diste están bien, ése es el costo.', necesita_dueno: false, motivo: '', razon: 'r', datos: { plaga: 'chinches', m2: 2500, zona: 'Juriquilla', tipo: 'casa' } }) });
  await t.of.atender(msj('tengo chinches, son 2500 m2 en juriquilla, casa'));
  const conv = t.M.get('conv:whatsapp:524420000000'), ult = conv.mensajes.at(-1);
  ok('si la IA escribe «$X», al cliente le llega el respaldo y al dueño un aviso', ult.via === 'respaldo' && !/\$X/.test(ult.texto) && [...t.M.keys()].some(k => k.startsWith('aviso:')), ult.texto); }

{ const o = leerJSON('{"respuesta":"va","datos":{"m2":"2500 m2"}}');
  ok('«2500 m2» como texto se lee como 2500', o.datos.m2 === 2500, JSON.stringify(o.datos)); }
{ const t = hacer({ pensar: (a, i) => ({ bien: true, respuesta: a.cotizacion ? 'Te saldría aproximadamente en {precio}.' : '¿Dónde está?', necesita_dueno: false, motivo: '', razon: 'r', datos: { plaga: 'cucarachas', m2: null, zona: 'Juriquilla', tipo: 'casa' } }) });
  await t.of.atender(msj('Tengo cucarachas en mi casa en Juriquilla, mide 2500 m2. Cuánto?'));
  const ult = t.M.get('conv:whatsapp:524420000000').mensajes.filter(m => m.via !== 'cotizacion').at(-1);
  ok('si la IA no apunta los metros, se sacan del mensaje y sale el precio', ult.via === 'cerebro' && /\$\d{1,3}(,\d{3})+/.test(ult.texto), ult.texto); }

/* ── la cotización por escrito (12 nov) ── */
{ const t = hacer({ pensar: (a) => ({ bien: true, respuesta: a.cotizacion ? 'Te saldría aproximadamente en {precio}.' : '¿Dónde está?', necesita_dueno: false, motivo: '', razon: 'r', datos: { plaga: 'cucarachas', m2: 120, zona: 'Juriquilla', tipo: 'casa' } }) });
  await t.of.atender(msj('Tengo cucarachas en mi casa de Juriquilla, 120 m2', '5244200001', { nombre: 'Ana' }));
  const ms = t.M.get('conv:whatsapp:5244200001').mensajes.filter(m => m.de === 'negocio');
  const link = ms.at(-1).texto.match(/\?c=([a-z0-9]+)/)?.[1];
  ok('al dar un precio, el bot manda el link de la cotización por escrito', ms.length === 2 && !!link && ms.at(-1).via === 'cotizacion', ms.map(m => m.texto).join(' | '));
  await t.of.atender(msj('¿y eso incluye todo?', '5244200001'));
  ok('si repite el mismo precio, no vuelve a mandar el link', t.M.get('conv:whatsapp:5244200001').mensajes.filter(m => m.via === 'cotizacion').length === 1);
  const { cotizacionPublica } = await import('./src/cotizacion.js');
  const A = { get: async k => t.M.get(k), put: async (k, v) => t.M.set(k, v), list: async p => [...t.M].filter(([k]) => k.startsWith(p)) };
  const pub = await cotizacionPublica(A, link), c = pub.cotizacion;
  ok('la hoja trae el MISMO precio que dijo el bot y no trae teléfono ni chat', pub.bien && ms[0].texto.includes('$' + c.precio.toLocaleString('en-US')) && !JSON.stringify(pub).includes('5244200001') && c.cliente === 'Ana', JSON.stringify(c));
  ok('un link inventado da 404', (await cotizacionPublica(A, 'zzzzzzzzzzzz')).estado === 404 && (await cotizacionPublica(A, '../../x')).estado === 404); }
{ const { cotizacionAMano } = await import('./src/cotizacion.js');
  const M = new Map(), A = { get: async k => M.get(k), put: async (k, v) => M.set(k, v), list: async p => [...M].filter(([k]) => k.startsWith(p)) };
  const r = await cotizacionAMano(A, { cliente: 'Planta X', renglones: [{ concepto: 'Servicio mensual', cantidad: 12, precio: 3500 }, { concepto: 'Estaciones de cebo', cantidad: 20, precio: 180 }, { concepto: '', precio: 5 }] }, 'Dueño');
  ok('la cotización a mano suma sus renglones y tira los vacíos', r.bien && r.cotizacion.precio === 45600 && r.cotizacion.renglones.length === 2, JSON.stringify(r));
  ok('a mano sin cliente o sin renglones no se guarda', (await cotizacionAMano(A, { renglones: [{ concepto: 'x', precio: 1 }] })).estado === 400 && (await cotizacionAMano(A, { cliente: 'x', renglones: [] })).estado === 400); }

/* ── el centro de operaciones (12 nov) ── */
{ const C = await import('./src/centro.js');
  const M = new Map(), A = { get: async k => M.get(k), put: async (k, v) => M.set(k, structuredClone(v)), list: async p => [...M].filter(([k]) => k.startsWith(p)) };
  const { cita } = await C.guardarCita(A, { cliente: 'Ana', fecha: '2026-11-12', hora: '10:00', plaga: 'cucarachas', precio: '$1,200' }, 'Dueño');
  ok('un servicio se agenda con su precio limpio', cita?.estado === 'pendiente' && cita.precio === 1200);
  ok('sin cliente o con fecha mala no se agenda', (await C.guardarCita(A, { fecha: '2026-11-12' })).estado === 400 && (await C.guardarCita(A, { cliente: 'x', fecha: '12/11/26' })).estado === 400);
  const h = await C.estadoCita(A, { id: cita.id, estado: 'hecho' }, 'Técnico', '2026-11-12');
  ok('al marcarlo hecho se agenda solo el seguimiento a 15 días', h.cita.seguimiento?.fecha === '2026-11-27' && !h.cita.seguimiento.hecho, JSON.stringify(h.cita.seguimiento));
  let tab = await C.tablero(A, '2026-11-27');
  ok('el tablero enseña el seguimiento el día que toca', tab.seguimientos.length === 1 && tab.por_cobrar.length === 1);
  const g = await C.seguimientoHecho(A, { id: cita.id, sigue_plaga: true }, 'Dueño');
  ok('si la plaga sigue, sale un servicio de garantía a $0', g.garantia?.precio === 0 && g.garantia.estado === 'pendiente' && g.cita.seguimiento.hecho);
  const { insumo } = await C.guardarInsumo(A, { nombre: 'Gel cucarachicida', unidad: 'g', minimo: 100 });
  await C.moverInsumo(A, { id: insumo.id, delta: 300, motivo: 'Compra' }, 'Dueño');
  await C.moverInsumo(A, { id: insumo.id, delta: -30, cita: cita.id }, 'Técnico');
  const r1 = await C.moverInsumo(A, { id: insumo.id, delta: -40 }, 'Técnico'), r2 = await C.moverInsumo(A, { id: insumo.id, delta: -1000 }, 'Técnico');
  ok('el inventario se lleva con movimientos y no queda en negativo', r1.insumo.cantidad === 230 && r1.insumo.movimientos.length === 3 && r2.estado === 400);
  await C.moverInsumo(A, { id: insumo.id, delta: -150 });
  tab = await C.tablero(A, '2026-11-28');
  ok('con 80 g y mínimo de 100, el gel sale como insumo bajo', tab.insumos_bajos.length === 1 && tab.insumos_bajos[0].cantidad === 80);
  const { vehiculo } = await C.guardarVehiculo(A, { nombre: 'Camioneta', km: 41000 });
  await C.revisionVehiculo(A, { vehiculo: vehiculo.id, tipo: 'aceite', fecha: '2026-08-01', km: 41000, proxima_km: 46000 });
  await C.revisionVehiculo(A, { vehiculo: vehiculo.id, tipo: 'verificación', fecha: '2026-06-01', proxima_fecha: '2026-12-01' });
  ok('la verificación a 3 días sale urgente; el aceite a 5,000 km no', (await C.tablero(A, '2026-11-28')).vehiculo.map(x => x.tipo).join() === 'verificación');
  await C.guardarVehiculo(A, { id: vehiculo.id, km: 45700 });
  ok('al acercarse a los km del aceite, también sale', (await C.tablero(A, '2026-11-28')).vehiculo.map(x => x.tipo).sort().join() === 'aceite,verificación'); }

ok('«chinches» en plural se entiende (antes quedaba «chinch»)', aPlaga('chinches') === 'chinche' && aPlaga('Chinches de cama') === 'chinche' && aPlaga('ratones') === 'roedor' && aPlaga('arañas') === 'arana');
/* ── la carpeta de cumplimiento (12 nov): lo que se le promete a cada planta ── */
{ const { crearPlanta, ponerEstaciones, registrarServicio, carpetaPublica, plantaEjemplo, ponerDocumentos, quitarServicio } = await import('./src/carpeta.js');
  const M = new Map(), A = { get: async (k) => M.get(k), del: async (k) => { M.delete(k); }, put: async (k, v) => { M.set(k, structuredClone(v)); }, list: async (p) => [...M.entries()].filter(([k]) => k.startsWith(p)) };
  const { planta } = await crearPlanta(A, { nombre: 'Planta Uno', giro: 'Alimentos' });
  const { planta: otra } = await crearPlanta(A, { nombre: 'Planta Dos' });
  ok('cada planta trae su link de consulta que no se adivina', planta.codigo.length >= 14 && planta.codigo !== otra.codigo);
  await ponerEstaciones(A, { planta: planta.id, estaciones: [{ n: 1, zona: 'Andén', tipo: 'cebadera' }, { n: 2, zona: 'Andén' }, { n: 2, zona: 'repetida' }] });
  const base = { planta: planta.id, fecha: '2026-11-05', tecnico: 'Juan', recibio: { nombre: 'Ana', puesto: 'Calidad' } };
  const sinReg = await registrarServicio(A, { ...base, productos: [{ nombre: 'Cebo', registro: '' }] });
  ok('un producto sin registro NO entra a la constancia (NOM-251 5.10.9)', !sinReg.bien && /registro/.test(sinReg.error), sinReg.error);
  ok('sin quién recibió no se guarda', !(await registrarServicio(A, { ...base, recibio: {} , productos: [] })).bien);
  ok('la fecha mal escrita se rechaza', !(await registrarServicio(A, { ...base, fecha: '5/11/26', productos: [] })).bien);
  const r1 = await registrarServicio(A, { ...base, productos: [{ nombre: 'Cebo', registro: 'RSCO-1' }], estaciones: [{ n: 1, estado: 'captura' }, { n: 99, estado: 'captura' }], firma: 'javascript:alert(1)' });
  await registrarServicio(A, { ...base, fecha: '2026-12-03', productos: [], estaciones: [{ n: 1, estado: 'sin actividad' }, { n: 2, estado: 'sin actividad' }] });
  const c = await carpetaPublica(A, planta.codigo);
  ok('folios seguidos', r1.folio === 1 && c.servicios.length === 2 && c.servicios[0].folio === 2);
  ok('una estación que no es de la planta no se cuela', c.servicios.find(s => s.folio === 1).estaciones.length === 1);
  ok('una «firma» que no es imagen PNG no se guarda', c.servicios.find(s => s.folio === 1).firma === null);
  ok('las estaciones repetidas cuentan una vez', c.estaciones.length === 2);
  ok('el mapa enseña el ÚLTIMO estado de cada trampa', c.estaciones[0].ultimo.estado === 'sin actividad' && c.estaciones[0].ultimo.fecha === '2026-12-03');
  ok('la tendencia por mes cuenta la actividad', c.tendencia.length === 2 && c.tendencia[0].actividad === 1 && c.tendencia[1].actividad === 0, JSON.stringify(c.tendencia));
  ok('el link de una planta no abre la otra', (await carpetaPublica(A, otra.codigo)).servicios.length === 0);
  ok('un link inventado no abre nada', !(await carpetaPublica(A, 'noexisteestelink')).bien && !(await carpetaPublica(A, '../planta:x')).bien);
  ok('el link público no enseña el contacto de la planta', !('contacto' in c.planta) && !('codigo' in c.planta));
  ok('sin licencia capturada, la carpeta NO la inventa', !c.documentos.licencia_sanitaria);
  await ponerDocumentos(A, { licencia_sanitaria: '12-AM-22-000', repse: 'AR-0000' });
  ok('la licencia capturada sale en la carpeta', (await carpetaPublica(A, planta.codigo)).documentos.licencia_sanitaria === '12-AM-22-000');
  await quitarServicio(A, { planta: planta.id, folio: 1, motivo: 'capturado por error' }, 'Prueba');
  ok('quitar un servicio lo saca de la carpeta pero deja registro de quién lo quitó', (await carpetaPublica(A, planta.codigo)).servicios.length === 1 && [...M.keys()].some(k => k.startsWith('quitado:')));
  const e1 = await plantaEjemplo(A), e2 = await plantaEjemplo(A);
  const ce = await carpetaPublica(A, e1.planta.codigo);
  ok('la planta de ejemplo sale marcada y no se duplica', ce.planta.ejemplo && e2.ya && ce.servicios.length === 3 && ce.servicios.every(s => s.ejemplo)); }

console.log(`\n${bien} pasan · ${mal} fallan`);
process.exit(mal ? 1 : 0);
