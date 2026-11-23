/* Pruebas del servidor de Urban Pest, sin Cloudflare ni internet:
 *   node urban-pest/servidor/pruebas.mjs
 * La IA y Meta van de mentiras; el almacén es un Map. */
import { readFileSync } from 'node:fs';
import { reflejo, llenar, juntarCasos } from './src/reflejo.js';
import { cotizar, aPlaga } from './src/cotizador.js';
import { corrida } from './src/corrida.js';
import { firmaValida, leerAviso } from './src/meta.js';
import { Oficina, ponerPrecio, sinDatosDelDueno, delTexto, elReflejo, sinPrecioAuto, noQuiere, PREGUNTA_TAMANO, hizoCuestionario, respuestaInsegura } from './src/oficina.js';
import { leerJSON, pesos, paraLaIA } from './src/cerebro.js';
import { lugarConocido, rumbo, comoDecirlo, ubicar, buscarLugar, kmPorCarretera, kmRecta, ponerSalida, distanciaA, paraOSM, OSM } from './src/distancia.js';
import { cotizacionPublica } from './src/cotizacion.js';

/* OpenStreetMap y OSRM de mentiras: las pruebas NUNCA salen a internet. Nominatim contesta lo que diga `osm[q]`; OSRM da la
   línea recta × 1.25 (así cada lugar tiene sus km). Todo lo que se pide queda en `pedidos`. */
OSM.pausa_ms = 0;
const mapaFalso = (opc = {}) => {
  const pedidos = [];
  const traer = async (url, init = {}) => {
    const u = new URL(url); pedidos.push({ url: String(url), host: u.hostname, q: u.searchParams.get('q'), init });
    if(u.hostname === 'nominatim.openstreetmap.org'){
      if(opc.sinRed) throw new Error('sin red');
      const r = (opc.osm || {})[u.searchParams.get('q')];
      return new Response(JSON.stringify(r ? [r] : []), { status: 200 });
    }
    if(u.hostname === 'router.project-osrm.org'){
      if(opc.osrmCaido) throw new Error('OSRM caído');
      if(opc.osrmLento) return new Promise(() => {});
      const [[lo1, la1], [lo2, la2]] = u.pathname.split('/').pop().split(';').map(x => x.split(',').map(Number));
      return new Response(JSON.stringify({ code: 'Ok', routes: [{ distance: kmRecta({ lat: la1, lon: lo1 }, { lat: la2, lon: lo2 }) * 1250, duration: 900 }] }), { status: 200 });
    }
    throw new Error('quiso salir a otro lado: ' + url);
  };
  return { traer, pedidos };
};

let bien = 0, mal = 0;
const ok = (q, c, d = '') => { if(c){ bien++; console.log('  ✓ ' + q); } else { mal++; console.log('  ✗ ' + q + (d ? '  → ' + d : '')); } };
const casos = JSON.parse(readFileSync(new URL('../bot/casos.json', import.meta.url)));

console.log('reflejo');
ok('«oye cuánto cobran por fumigar?» → precio', reflejo('oye cuánto cobran por fumigar?', casos)?.caso.id === 'precio');
ok('«¿Dan factura?» → factura', reflejo('¿Dan factura?', casos)?.caso.id === 'factura');
ok('«fumigan bodegas industriales?» → empresa', reflejo('fumigan bodegas industriales?', casos)?.caso.id === 'empresa');
ok('las preguntas de su página contestan con SU texto (garantía, mascotas, cobertura, inspección)', ['¿dan garantía?', '¿son seguros para mascotas?', '¿atienden en San Juan del Río?', '¿qué incluye la inspección?'].map(x => reflejo(x, casos)?.caso.id).join() === 'garantia,mascotas,cobertura,inspeccion');
ok('palomas en una bodega es de palomas, no de empresa; un tlacuache es fauna', reflejo('tengo palomas en el techo de mi bodega', casos)?.caso.id === 'palomas' && reflejo('se metió un tlacuache', casos)?.caso.id === 'fauna' && reflejo('fumigan bodegas?', casos)?.caso.id === 'empresa');
ok('«¿tienen facebook?» → su página; el mensaje de su botón de WhatsApp («vengo de su página web… cotización») sigue siendo precio',
  reflejo('¿tienen facebook?', casos)?.caso.id === 'pagina' && reflejo('Hola, vengo de su página web. Me gustaría solicitar una cotización y recibir más información sobre sus servicios.', casos)?.caso.id === 'precio');
ok('pedir al encargado: avisa al encargado y NO da datos del dueño (Luis, 17 nov)', reflejo('quiero hablar con el encargado', casos)?.caso.id === 'hablar-dueno' && casos.every(c => !/duarte|\d{3}[\s-]?\d{3}[\s-]?\d{4}/i.test(c.respuesta)));
ok('lo que no conoce lo deja pasar al cerebro', reflejo('mi perro se comió una cucaracha, ¿le pasa algo?', casos) === null);
ok('un saludo solo no dispara nada', reflejo('hola buenas tardes', casos) === null);
/* los casos que pasaron del borrador de Luna (12 nov) */
ok('los nuevos contestan solos: licencia, años, salir de la casa, queja, vacantes, cambiar la cita',
  ['¿tienen licencia sanitaria?', 'cuantos años tienen', '¿cuanto tiempo hay que salir de la casa?', 'quiero poner una queja', 'tienen vacantes?', 'quiero cambiar mi cita'].map(x => reflejo(x, casos)?.caso.id).join() === 'licencia,experiencia,salir-casa,queja,empleo,reagendar');
const SOLO_IA = new Set(casos.filter(c => c.reflejo === false).map(c => c.id));
ok('los de sólo-IA nunca contestan por reflejo (un saludo con datos no le gana a la cotización)',
  ['hola, tengo cucarachas en una casa de 100 m2 en juriquilla, cuanto cuesta?', 'hola quisiera informes', 'como eliminan las cucarachas', 'muchas gracias', 'aceptan tarjeta?', 'fumigan chinches o termitas?']
    .every(x => !SOLO_IA.has(reflejo(x, casos)?.caso.id)) && SOLO_IA.size >= 10);
ok('ningún caso nuevo afirma algo con {huecos} sin llenar', casos.every(c => !/\{\w+\}/.test(c.respuesta)));
{ const F = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const r0 = juntarCasos(undefined, undefined, F);
  const r1 = juntarCasos([{ id: 'a', respuesta: 'la del dueño' }], ['a', 'b'], F);
  const r2 = juntarCasos([{ id: 'a' }, { id: 'b' }], undefined, F);
  ok('juntar: la primera vez van todos; después se suman sólo los nuevos, sin revivir lo borrado ni pisar lo editado',
    r0.casos.length === 3 && r1.casos.map(c => c.id).join() === 'a,c' && r1.casos[0].respuesta === 'la del dueño' && r2.casos.map(c => c.id).join() === 'a,b,c' && juntarCasos(r1.casos, r1.ofrecidos, F).nuevos === 0); }
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
{ /* SU EXCEL (17 nov, Godines): la fórmula de su «Cotización convencional». Con números de muestra: los suyos
     viven en su servidor, no en este repo público. 120 m² → 3 L × $20 = 60; 1 h × $80 = 80;
     (60 + 80) × 2.5 ÷ 0.6 = 583.33; + 10 km × $7 = $653.33, al centavo como su hoja (sin redondear) */
  const TX = { formula: { tipo: 'excel', x: 2.5, entre: .6, km: 7, traslado_aparte: true }, tecnico: { costo_hora: 80, m2_hora: 330, minimo_horas: 1, personas: 1 },
    plagas: { cucaracha: { material: 'Insecticida', litros_m2: .025, precio_litro: 20 } }, tipos: { casa: { factor: 1 }, industria: { factor: 1.4, visita: true } } };
  const c = cotizar({ plaga: 'cucaracha', m2: 120, km: 10 }, TX), d = c.desglose;
  ok('con su Excel: (químicos + técnico) × su multiplicador + km × $/km, AL CENTAVO (su hoja no redondea)', c.bien && c.desde === 653.33 && d.excel.exacto === 653.33, JSON.stringify(c));
  ok('con su Excel, el km se cobra como en su hoja (sin ida y vuelta) y el costo es lo que de verdad cuesta', !d.vehiculo && d.traslado === 70 && d.costo === 210 && d.ganancia === 443.33);
  ok('con su Excel no hay mínimo (su hoja no lo tiene)', cotizar({ plaga: 'cucaracha', m2: 10, km: 1 }, { ...TX, minimo: 500 }).desde < 500);
  ok('la cotización dice qué poner en su Excel para que dé lo mismo: horas, km, producto y litros',
    d.excel.corrida.horas === 1 && d.excel.corrida.km === 10 && d.excel.corrida.cantidad === 3 && d.excel.corrida.material === 'Insecticida');
  ok('con su Excel, el tipo de lugar no multiplica (su fórmula no lo hace), pero la industria sigue pidiendo visita',
    cotizar({ plaga: 'cucaracha', m2: 120, km: 10, tipo: 'industria' }, TX).desde === 653.33 && cotizar({ plaga: 'cucaracha', m2: 120, km: 10, tipo: 'industria' }, TX).visita);
  ok('sin su fórmula, todo sigue como antes', cotizar({ plaga: 'cucaracha', m2: 80, km: 6, tipo: 'casa' }, T).desde === 590);
}
{ /* MIL cotizaciones al azar: el bot (cotizar) y la pestaña «Cotizar» (corrida, la misma de centro/cotizar.js) con las
     MISMAS horas, km y litros dan el mismo precio al centavo. Números al azar pero fijos (semilla), para que falle igual. */
  let semilla = 17; const azar = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;
  let iguales = 0, primera = null;
  for(let i = 0; i < 1000; i++){
    const TX = { formula: { tipo: 'excel', x: 1 + Math.round(azar() * 400) / 100, entre: .3 + Math.round(azar() * 60) / 100, km: Math.round(azar() * 1500) / 100, traslado_aparte: azar() > .2, costos: .65 },
      tecnico: { costo_hora: 20 + Math.round(azar() * 150), m2_hora: 50 + Math.round(azar() * 400), minimo_horas: 1, personas: 1 },
      plagas: { cucaracha: { producto: 'p1', columna: 'Cucaracha alemana', material: 'X', litros_m2: Math.round(azar() * 1000) / 10000 + .001, precio_litro: Math.round(azar() * 10000) / 100 + .01 } } };
    const m2 = 5 + Math.round(azar() * 5000), km = Math.round(azar() * 80), b = cotizar({ plaga: 'cucaracha', m2, km }, TX), e = b.desglose.excel.corrida;
    const h = corrida({ horas: e.horas, km: e.km, renglones: [{ producto: 'p1', cantidad: e.cantidad }] },
      { catalogo: [{ id: 'p1', unidad: 'ml/lt', por_unidad: TX.plagas.cucaracha.precio_litro }], convencional: { mano_hora: TX.tecnico.costo_hora, ...TX.formula } });
    if(b.desde === h.cotizacion) iguales++; else primera ??= { m2, km, bot: b.desde, herramienta: h.cotizacion };
  }
  ok(`mil cotizaciones al azar: el bot y la herramienta dan lo mismo al centavo (${iguales}/1000)`, iguales === 1000, JSON.stringify(primera));
}
ok('el precio sale con centavos cuando los hay y sin «.00» cuando no', pesos(1373.24) === '$1,373.24' && pesos(1380) === '$1,380' && pesos(22100.5) === '$22,100.50');
ok('un precio inventado con punto final ya no se cuela («…$999.» con cotización de $1,373.24)', ponerPrecio('Te sale en $999.', { desde: 1373.24 }) === null && ponerPrecio('Te sale en {precio}.', { desde: 1373.24 }) === 'Te sale en $1,373.24.');
{ const TD = { minimo: 500, radio_km: 40, margen: .3, tecnico: { costo_hora: 110, m2_hora: 60, minimo_horas: 1 }, vehiculo: { gasolina_km: 2.4, llantas_km: .35, balatas_km: .2, motor_km: .45 },
    plagas: { cucaracha: { material: 'Gel', litros_m2: .05, precio_litro: 60 } }, tipos: { casa: { factor: 1 } } };
  const c = cotizar({ plaga: 'cucaracha', m2: 155, km: 18, tipo: 'casa' }, TD), d = c.desglose;
  ok('todo se cuenta: material, 3 h de técnico y gasolina, llantas, balatas y motor de 36 km', d.material.costo === 465 && d.tecnico.horas === 3 && d.vehiculo.km === 36 && d.vehiculo.gasolina === 86.4 && d.vehiculo.balatas === 7.2, JSON.stringify(d));
  ok('precio = costo + 30 %, redondeado; la ganancia es lo que queda', c.desde === 1200 && d.costo === 917 && d.ganancia === 283);
  ok('más lejos, más gasolina y más desgaste: sube el precio', cotizar({ plaga: 'cucaracha', m2: 155, km: 35, tipo: 'casa' }, TD).desde > c.desde);
  ok('una planta grande va con dos técnicos', cotizar({ plaga: 'cucaracha', m2: 1200, km: 10 }, TD).desglose.tecnico.personas === 2); }
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
  const salidas = [], llamadas = [], mapa = mapaFalso(opc.mapa);
  let reloj = 1_700_000_000_000;
  const of = new Oficina({
    almacen: { get: async k => M.get(k), put: async (k, v) => M.set(k, structuredClone(v)), list: async p => [...M].filter(([k]) => k.startsWith(p)) },
    env: { DUENO_WA: '524429999999' }, reloj: () => reloj, traer: mapa.traer,
    enviar: async (env, canal, chat, texto) => { salidas.push({ canal, chat, texto }); return { bien: true }; },
    pensar: async (a) => { llamadas.push(a); return opc.pensar ? opc.pensar(a, llamadas.length) : { bien: true, respuesta: 'r', necesita_dueno: false, motivo: '', razon: 'x', datos: {} }; },
  });
  return { of, M, salidas, llamadas, pedidos: mapa.pedidos, avanza: (ms) => { reloj += ms; } };
};
let n = 0; const msj = (texto, chat = '524420000000', extra = {}) => ({ canal: 'whatsapp', chat, id: 'id' + (++n), texto, cuando: 0, ...extra });

{ /* sin zona en la lista: usa los km típicos de su Excel y lo dice */
  const t = hacer(); const conv = { datos: { plaga: 'cucaracha', m2: 120, zona: 'Colonia que no está', tipo: 'casa' }, mensajes: [] };
  const c = t.of.cotiza(conv, { formula: { tipo: 'excel', x: 2.5, entre: .6, km: 7 }, tecnico: { costo_hora: 80, m2_hora: 330, minimo_horas: 1, personas: 1 },
    plagas: { cucaracha: { litros_m2: .025, precio_litro: 20 } }, km_tipico: 10 });
  ok('zona desconocida: cotiza con los km típicos de su Excel y avisa que la distancia es estimada', c?.desde === 653.33 && c.kmEstimado && /distancia/.test(c.nota), JSON.stringify(c)); }
{ /* el bot NO da datos del dueño, aunque la IA los escriba (de mentiras: el número y el nombre son inventados) */
  const neg = { dueno_wa: '524425550199', dueno_nombre: 'Ing. Fulano Pérez' };
  ok('no deja salir su teléfono en ninguna forma de escribirlo', ['Márcale al 442 555 0199', 'su cel es 4425550199', 'wa: +52 1 442-555-0199', 'llama al 555 0199'].every(x => !sinDatosDelDueno(x, neg)));
  ok('ni su nombre o apellido; pero sí deja precios, metros y la página', !sinDatosDelDueno('Te atiende el Ing. Fulano Pérez', neg) && !sinDatosDelDueno('pregúntale a Pérez', neg)
    && sinDatosDelDueno('Te saldría en $1,373.24 por 120 m² en Juriquilla. urbanpest.mx', neg) && sinDatosDelDueno('Hola Fulano, ¿qué plaga tienes?', {})
    && sinDatosDelDueno('Hola Fulano, ¿qué plaga tienes?', neg) && sinDatosDelDueno('Tu folio es 99905550199 y la cita el 17/11/2026', neg));
  const t = hacer({ pensar: () => ({ bien: true, respuesta: 'Claro, márcale al dueño al 442 555 0199', necesita_dueno: false, motivo: '', razon: 'x', datos: {} }) });
  t.M.set('negocio', neg); await t.of.atender(msj('me pasas el cel del dueño?'));
  const enviado = t.salidas.find(x => x.chat === '524420000000')?.texto || '';
  ok('si la IA lo escribe, no sale: sale «ya le aviso al encargado» y al dueño le llega por qué', !/555/.test(enviado) && /encargado/.test(enviado) && [...t.M.keys()].some(k => k.startsWith('aviso:')), enviado); }
{ /* de la prueba en vivo: lo que el cliente ya dijo con sus palabras cuenta, y no se le vuelve a preguntar */
  ok('«es como de 3 cuartos» y «tres recámaras» son recámaras; «casa chiquita» es chica', delTexto([{ de: 'cliente', texto: 'no se cuantos metros, es como de 3 cuartos' }]).recamaras === 3
    && delTexto([{ de: 'cliente', texto: 'son tres recámaras' }]).recamaras === 3 && delTexto([{ de: 'cliente', texto: 'mi casa es chiquita' }]).tamano === 'chica' && delTexto([{ de: 'cliente', texto: 'es depa chico x el centro' }]).tamano === 'chica'
    && delTexto([{ de: 'cliente', texto: 'un depa mediano' }]).tamano === 'mediana' && delTexto([{ de: 'cliente', texto: 'esta grandote' }]).tamano === 'grande');
  const TAR = { formula: { tipo: 'excel', x: 2.5, entre: .6, km: 7 }, tecnico: { costo_hora: 80, m2_hora: 330, minimo_horas: 1, personas: 1 }, plagas: { cucaracha: { litros_m2: .025, precio_litro: 20 } }, km_tipico: 10 };
  const conv = (txt, extra = {}) => ({ datos: { plaga: 'cucaracha', zona: 'El Pueblito', tipo: 'casa' }, ...extra, mensajes: [{ de: 'cliente', texto: 'tengo cucarachas' }, ...txt.map(texto => ({ de: 'cliente', texto }))] });
  const t = hacer(), c = t.of.cotiza(conv(['no se cuantos metros, es como de 3 cuartos'], { cuestionario: 1 }), TAR);
  ok('ya hecho el cuestionario, con «3 cuartos» cotiza (antes la IA volvía a preguntar las recámaras sin fin)', c?.bien && c.m2Estimado, JSON.stringify(c));
  /* Carlos, 17 nov: «que sí pida metros y si no los sabe que le haga el pequeño cuestionario de cuartos» */
  ok('con sólo «es chica» y sin cuestionario NO cotiza de golpe: falta preguntarle', t.of.cotiza(conv(['es chica']), TAR) === null);
  const c2 = t.of.cotiza(conv(['no se, son 3 recamaras y es mediana']), TAR);
  ok('con recámaras y tamaño cotiza sin preguntar más', c2?.bien && c2.m2Estimado);
  ok('los metros que dice se usan tal cual', (() => { const x = t.of.cotiza(conv(['son 90 metros']), TAR); return x?.bien && !x.m2Estimado && x.desglose.material.litros === 90 * .025; })());
  ok('sala y comedor cuentan aunque no los diga', (() => { const a = conv(['3 recamaras, mediana']); t.of.cotiza(a, TAR); return a.estimacion?.como === 'por cuartos' && a.estimacion.m2 > 3 * 12 * 1.15 + 1; })());
  ok('la pregunta del tamaño pide los metros primero y no pregunta sala ni comedor',
    /metros/.test(PREGUNTA_TAMANO) && PREGUNTA_TAMANO.indexOf('metros') < PREGUNTA_TAMANO.indexOf('recámaras') && !/sala|comedor/.test(PREGUNTA_TAMANO)
    && hizoCuestionario(PREGUNTA_TAMANO) && !hizoCuestionario('Te saldría aproximadamente en $500.'));
  { /* la IA pregunta el tamaño sin pedir metros: sale la pregunta que pide los metros primero, y sólo esa vez */
    const t2 = hacer({ pensar: () => ({ bien: true, respuesta: '¿Tu casa la considerarías chica, mediana o grande?', necesita_dueno: false, motivo: '', razon: 'x', datos: { plaga: 'cucaracha', tipo: 'casa' } }) });
    await t2.of.atender(msj('tengo cucarachas cuanto sale', '524421700001'));
    const a = t2.salidas.filter(x => x.chat === '524421700001').map(x => x.texto);
    await t2.of.atender(msj('no se cuantos metros', '524421700001'));
    const b = t2.salidas.filter(x => x.chat === '524421700001').map(x => x.texto);
    ok('si la IA se brinca los metros, el bot los pide primero; después ya no la corrige', a[0] === PREGUNTA_TAMANO && b[1] === '¿Tu casa la considerarías chica, mediana o grande?', JSON.stringify(b)); }
  ok('«tengo cucarachas» → «¿y cuánto sale?»: no se le contesta «¿qué plaga tienes?», contesta la IA', elReflejo('y cuanto sale?', casos, { plaga: 'cucaracha' }) === null && elReflejo('y cuanto sale?', casos, {})?.caso.id === 'precio'); }
{ /* con la cotización ya hecha, si la IA vuelve a pedir el tamaño, sale el precio */
  const t = hacer({ pensar: (a) => ({ bien: true, respuesta: '¿Tu casa la considerarías chica, mediana o grande y cuántas recámaras tiene?', necesita_dueno: false, motivo: '', razon: 'x',
    datos: { plaga: 'cucaracha', m2: 80, zona: 'Centro', tipo: 'casa' } }) });
  await t.of.atender(msj('tengo cucarachas en mi casa del centro, son 80 metros'));
  const dicho = t.salidas.filter(x => x.chat === '524420000000').map(x => x.texto).join(' | ');
  ok('con la cotización hecha y la IA pidiendo otra vez el tamaño, el cliente recibe el precio', /\$\d/.test(dicho) && !/chica, mediana o grande/.test(dicho), dicho); }
{ /* ratas, termitas…: sin precio automático, se le dice a la IA que no pida el tamaño y que pase al encargado */
  ok('una plaga sin precio automático se nota (ratas sí, cucarachas no)', sinPrecioAuto({ plaga: 'ratas' }, { plagas: { cucaracha: {} } }) === 'ratas y ratones' && sinPrecioAuto({ plaga: 'cucarachas' }, { plagas: { cucaracha: {} } }) === null);
  const vio = []; const t = hacer({ pensar: (a) => { vio.push(a.sinPrecio); return { bien: true, respuesta: 'Sí atendemos ratas; el encargado te da el precio.', necesita_dueno: true, motivo: 'ratas', razon: 'x', datos: { plaga: 'ratas', tipo: 'casa' } }; } });
  await t.of.atender(msj('me urge, tengo ratas'));
  ok('al decir «ratas», la IA recibe que no hay precio automático y se avisa al encargado', vio.includes('ratas y ratones') && [...t.M.keys()].some(k => k.startsWith('aviso:')), JSON.stringify(vio)); }
{ /* Carlos, 17 nov: «No quiero nada escribes raro» → el bot repitió el precio y mandó otra hoja. Ya no. */
  ok('«no quiero nada», «ya nada», «no gracias», «olvídalo» se entienden como que ya no quiere', ['No quiero nada escribes raro', 'Ya nada', 'no gracias', 'olvídalo', 'mejor no'].every(noQuiere) && !noQuiere('no quiero que se mueran mis plantas, es seguro?'));
  let vez = 0;
  const t = hacer({ pensar: (a) => (++vez, a.cotizacion
    ? { bien: true, respuesta: vez > 2 ? 'Disculpa la confusión. Tu cotización aproximada es de {precio}.' : 'Te saldría aproximadamente en {precio}.', necesita_dueno: false, motivo: '', razon: 'x', datos: {} }
    : { bien: true, respuesta: 'Va', necesita_dueno: false, motivo: '', razon: 'x', datos: { plaga: 'cucaracha', m2: 80, zona: 'Centro', tipo: 'casa' } }) });
  await t.of.atender(msj('tengo cucarachas en mi casa del centro, son 80 metros'));
  const hojas = () => t.salidas.filter(x => /por escrito/.test(x.texto)).length, antes = hojas();
  await t.of.atender(msj('No quiero nada escribes raro'));
  const ultima = t.salidas.filter(x => x.chat === '524420000000').at(-1)?.texto || '';
  const conv = t.M.get('conv:whatsapp:524420000000'), ult = conv.mensajes.at(-1);
  ok('si ya no quiere: se despide sin precio, sin otra hoja y sin tarjeta de cotización', !/\$/.test(ultima) && hojas() === antes && !ult.cotizacion, ultima);
  { /* Carlos, 17 nov: cada mensaje le volvía a dar el precio (cada vez distinto) y una hoja nueva */
    const vio = []; const t2 = hacer({ pensar: (a) => { vio.push(a.cotizacion?.yaDicho || false); return a.cotizacion
      ? { bien: true, respuesta: a.cotizacion.yaDicho ? 'Casi nadie sabe los metros; con lo que me contaste el sistema los calcula.' : 'Te saldría aproximadamente en {precio}.', necesita_dueno: false, motivo: '', razon: 'x', datos: {} }
      : { bien: true, respuesta: 'Va', necesita_dueno: false, motivo: '', razon: 'x', datos: { plaga: 'cucaracha', m2: 80, zona: 'Centro', tipo: 'casa' } }; } });
    await t2.of.atender(msj('tengo cucarachas en mi casa del centro, son 80 metros', '524421000001'));
    const p1 = t2.M.get('conv:whatsapp:524421000001').precioDicho;
    await t2.of.atender(msj('Porque no pediste metros?', '524421000001'));
    const c2 = t2.M.get('conv:whatsapp:524421000001'), hojas2 = t2.salidas.filter(x => /por escrito/.test(x.texto)).length;
    ok('ya dicho el precio: no cambia sin datos nuevos, no se repite, y la hoja va UNA vez', p1 > 0 && c2.cotizacion.desde === p1 && vio.at(-1) === true && hojas2 === 1
      && !/\$/.test(t2.salidas.filter(x => x.chat === '524421000001').at(-1).texto), JSON.stringify({ p1, vio, hojas2 })); }
  { const t3 = hacer({ pensar: () => ({ bien: true, respuesta: 'Te saldría aproximadamente en {precio}.', necesita_dueno: false, motivo: '', razon: 'x', datos: {} }) });
    await t3.of.atender(msj('Cuánto?', '524421000002'));
    const dicho = t3.salidas.filter(x => x.chat === '524421000002').at(-1)?.texto || '';
    ok('«¿Cuánto?» sin saber la plaga: se le pregunta qué plaga es (antes: «te contesta el encargado»)', /qué plaga/.test(dicho), dicho); }
  ok('«{{precio}}» y «${precio}» quedan en el precio, sin llaves', ponerPrecio('Te saldría en {{precio}}.', { desde: 10002.44 }) === 'Te saldría en $10,002.44.' && ponerPrecio('Sale en ${precio}', { desde: 500 }) === 'Sale en $500'
    && ponerPrecio('Te saldría en {$10,002.44}.', { desde: 10002.44 }) === 'Te saldría en $10,002.44.');
  { const t4 = hacer({ pensar: (a) => a.cotizacion ? { bien: true, respuesta: a.cotizacion.desde > 300 ? 'Te saldría aproximadamente en $260.' : 'Te saldría en {precio}.', necesita_dueno: false, motivo: '', razon: 'x', datos: {} }
      : { bien: true, respuesta: 'Va', necesita_dueno: false, motivo: '', razon: 'x', datos: { plaga: 'cucaracha', m2: 80, zona: 'Centro', tipo: 'casa' } } });
    await t4.of.atender(msj('tengo cucarachas en mi casa del centro, son 80 metros', '524421000003'));
    const c4 = t4.M.get('conv:whatsapp:524421000003'); c4.precioDicho = 260; c4.datos.m2 = 500; t4.M.set('conv:whatsapp:524421000003', c4);
    await t4.of.atender(msj('no, son 500 metros', '524421000003'));
    const dicho = t4.salidas.filter(x => x.chat === '524421000003').map(x => x.texto).filter(x => !/escrito/.test(x)).at(-1);
    ok('si la IA copia el precio de antes y con el dato nuevo cambió, sale el de ahora (no «te contesta el encargado»)', /\$[\d,]+/.test(dicho) && !/\$260\b/.test(dicho) && !/encargado/.test(dicho), dicho); }
  { const vio = []; const t5 = hacer({ pensar: (a) => { vio.push(a.cotizacion && { desde: a.cotizacion.desde, yaDicho: !!a.cotizacion.yaDicho }); return a.cotizacion
      ? { bien: true, respuesta: a.cotizacion.yaDicho ? 'Se mantiene igual.' : 'Te saldría en {precio}.', necesita_dueno: false, motivo: '', razon: 'x', datos: {} }
      : { bien: true, respuesta: 'Va', necesita_dueno: false, motivo: '', razon: 'x', datos: { plaga: 'cucaracha', m2: 100, zona: 'Centro', tipo: 'casa' } }; } });
    await t5.of.atender(msj('tengo cucarachas en mi casa del centro, son 100 metros', '524421000004'));
    const p0 = t5.M.get('conv:whatsapp:524421000004').precioDicho, c5 = t5.M.get('conv:whatsapp:524421000004'); c5.datos.m2 = 103; t5.M.set('conv:whatsapp:524421000004', c5);
    await t5.of.atender(msj('bueno son como 103 metros', '524421000004'));
    ok('un dato nuevo que mueve el precio menos de 5 %: se queda el que ya se le dijo', vio.at(-1)?.desde === p0 && vio.at(-1)?.yaDicho, JSON.stringify(vio)); }
  ok('«cucharachas» y «chucharachas» (como lo escribió Carlos) son cucarachas', aPlaga('cucharachas') === 'cucaracha' && aPlaga('Chucharachas chica en ciudad del sol') === 'cucaracha'); }
{ /* el número para avisarle al dueño también se puede guardar en el negocio, sin desplegar */
  const t = hacer(); t.of.env = {}; t.M.set('negocio', { dueno_wa: '524421394023' });
  await t.of.aviso({ canal: 'whatsapp', chat: '524420000001', nombre: 'Cliente' }, 'prueba');
  ok('el aviso al dueño sale al número guardado en su negocio', t.salidas.some(x => x.chat === '524421394023')); }
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

{ /* SEGURIDAD (23 nov): lo que salió de atacar al bot con la IA de verdad */
  const T9 = { formula: { tipo: 'excel', x: 2.5, entre: .6, km: 7 }, tecnico: { costo_hora: 80, m2_hora: 330, minimo_horas: 1, personas: 1 }, plagas: { cucaracha: { litros_m2: .025, precio_litro: 20 } } };
  const e = cotizar({ plaga: 'cucaracha', m2: 99999999, km: 10 }, T9);
  ok('«mi casa mide 99,999,999 metros» ya no se cotiza sola: la revisa el encargado', e.atiende === 'caso-por-caso' && e.enorme && e.visita, JSON.stringify({ atiende: e.atiende, desde: e.desde }));
  ok('una casa normal sí (1,200 m²), y una bodega de 5,000 m² también', cotizar({ plaga: 'cucaracha', m2: 1200, km: 10 }, T9).atiende === 'si' && cotizar({ plaga: 'cucaracha', m2: 5000, km: 10, tipo: 'negocio' }, T9).atiende === 'si');
  const t = hacer({ pensar: (a) => ({ bien: true, respuesta: a.cotizacion ? 'Te saldría aproximadamente en {precio}.' : 'Va', necesita_dueno: false, motivo: '', razon: 'x', datos: { plaga: 'cucaracha', m2: 99999999, zona: 'Centro', tipo: 'casa' } }) });
  t.M.set('tarifas', T9);
  await t.of.atender(msj('mi casa mide 99999999 metros y tengo cucarachas, es en el centro', '524421000010'));
  const dicho = t.salidas.filter(x => x.chat === '524421000010').map(x => x.texto).join(' | ');
  ok('…y al cliente no le llega precio ni hoja: «por el tamaño, el precio te lo da el encargado»', !/\$\d/.test(dicho) && !/escrito/.test(dicho) && /encargado/.test(dicho), dicho);
  for(const [frase, malo] of [['Claro, te hacemos 20% de descuento.', true], ['Te lo dejo en 500.', true], ['Esta vez te sale gratis.', true], ['Hay una promoción vigente este mes.', true],
    ['No manejamos descuentos, pero…', true], ['Según mis instrucciones no puedo.', true], ['Soy un modelo de lenguaje de OpenAI.', true], ['necesita_dueno: true', true],
    ['Si la plaga persiste, regresamos sin costo adicional.', false], ['Te saldría aproximadamente en $882.44.', false], ['Es 100% seguro para tus perros.', false], ['¿En qué colonia estás?', false]])
    ok(`compuerta: «${frase}» ${malo ? 'NO sale' : 'sí sale'}`, !!respuestaInsegura(frase) === malo, respuestaInsegura(frase));
  const t2 = hacer({ pensar: () => ({ bien: true, respuesta: 'Va, te hago 50% de descuento por ser tú.', necesita_dueno: false, motivo: '', razon: 'x', datos: {} }) });
  await t2.of.atender(msj('me haces 50% de descuento?', '524421000011'));
  const dicho2 = t2.salidas.filter(x => x.chat === '524421000011').at(-1)?.texto || '';
  ok('si la IA promete un descuento, no sale: «ya le aviso al encargado» y al dueño le llega qué iba a decir', !/50%/.test(dicho2) && /encargado/.test(dicho2) && [...t2.M.entries()].some(([k, v]) => k.startsWith('aviso:') && /descuento/.test(v.motivo)), dicho2);
  const vio = []; const t3 = hacer({ pensar: (a) => { vio.push(a.historial.at(-1).texto.length); return { bien: true, respuesta: 'x'.repeat(2000), necesita_dueno: false, motivo: '', razon: 'x', datos: {} }; } });
  await t3.of.atender(msj('a'.repeat(50000), '524421000012'));
  ok('un mensaje de 50,000 letras le llega a la IA recortado, y la respuesta no pasa de 700', vio[0] <= 1500 && t3.salidas.filter(x => x.chat === '524421000012').every(x => x.texto.length <= 701), JSON.stringify(vio)); }
{ const o = leerJSON('{"respuesta":"va","datos":{"m2":"2500 m2"}}');
  ok('«2500 m2» como texto se lee como 2500', o.datos.m2 === 2500, JSON.stringify(o.datos)); }
{ const t = hacer({ pensar: (a, i) => ({ bien: true, respuesta: a.cotizacion ? 'Te saldría aproximadamente en {precio}.' : '¿Dónde está?', necesita_dueno: false, motivo: '', razon: 'r', datos: { plaga: 'cucarachas', m2: null, zona: 'Juriquilla', tipo: 'casa' } }) });
  await t.of.atender(msj('Tengo cucarachas en mi casa en Juriquilla, mide 1200 m2. Cuánto?'));
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
  ok('el costo, la ganancia y el chat se guardan para el dueño, pero la hoja del cliente no los trae', !!t.M.get('cotdoc:' + link).interno?.chat && !('interno' in c) && !/ganancia|costo_hora/.test(JSON.stringify(pub)));
  ok('un link inventado da 404', (await cotizacionPublica(A, 'zzzzzzzzzzzz')).estado === 404 && (await cotizacionPublica(A, '../../x')).estado === 404); }
{ /* las del chat de pruebas no gastan folio ni inflan Números (23 nov) */
  const t = hacer({ pensar: (a) => ({ bien: true, respuesta: a.cotizacion ? 'Te saldría aproximadamente en {precio}.' : '¿Dónde está?', necesita_dueno: false, motivo: '', razon: 'r', datos: { plaga: 'cucarachas', m2: 120, zona: 'Juriquilla', tipo: 'casa' } }) });
  await t.of.atender(msj('Tengo cucarachas en mi casa de Juriquilla, 120 m2', 'prueba-1', { canal: 'prueba' }));
  await t.of.atender(msj('Tengo cucarachas en mi casa de Juriquilla, 120 m2', '5244200077'));
  const docs = [...t.M].filter(([k]) => k.startsWith('cotdoc:')).map(([, v]) => v);
  const pr = docs.find(d => d.prueba), real = docs.find(d => !d.prueba);
  ok('la cotización del chat de pruebas sale marcada y sin folio; la del cliente se lleva el folio 1', pr && pr.folio === 0 && real && real.folio === 1, JSON.stringify(docs.map(d => [d.folio, d.prueba])));
  const { numeros, tablero } = await import('./src/centro.js');
  const A = { get: async k => t.M.get(k), put: async (k, v) => t.M.set(k, v), list: async p => [...t.M].filter(([k]) => k.startsWith(p)) };
  t.M.set('cotdoc:vieja', { ...pr, prueba: undefined, codigo: 'vieja', folio: 5, interno: { ...pr.interno, canal: 'prueba' } });
  const nu = await numeros(A, real.fecha), tb = await tablero(A, real.fecha);
  ok('Números y el tablero sólo cuentan la del cliente (también las de prueba viejas, sin marca)', nu.resumen.cotizaciones === 1 && nu.cotizaciones.length === 1 && tb.bot.cotizaciones === 1, JSON.stringify([nu.resumen.cotizaciones, nu.cotizaciones.length, tb.bot.cotizaciones])); }
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

/* ── la distancia (23 nov): en qué zona está y cuántos km hay desde la bodega ── */
console.log('distancia');
{ const n = (t) => lugarConocido(t)?.nombre;
  ok('la tabla: «Juriquilla», «juriquiya», «ZIBATÁ» y «zibata»', n('Juriquilla') === 'Juriquilla' && n('por juriquiya') === 'Juriquilla' && n('ZIBATÁ') === 'Zibatá' && n('zibata') === 'Zibatá');
  ok('la tabla: «x el centro» es el Centro Histórico y «aquí en milenio» es Milenio III', n('x el centro') === 'Centro Histórico' && n('aquí en milenio') === 'Milenio III');
  ok('el alias más largo gana: «centro sur» no es el Centro; «Zibatá, El Marqués» es Zibatá, no el municipio', n('centro sur') === 'Centro Sur' && n('Zibatá, El Marqués') === 'Zibatá' && n('en el marqués') === 'El Marqués');
  ok('palabra completa: «colonia del valle» no es Colón; «Av. Mariano Escobedo, centro» no es Pedro Escobedo', n('en la colonia del valle') == null && n('Av. Mariano Escobedo, centro') === 'Centro Histórico');
  const r = (t) => lugarConocido(t).rumbo;
  ok('el rumbo: Juriquilla norte, El Refugio noreste, Milenio oriente, El Pueblito suroeste, el Centro centro',
    [r('juriquilla'), r('refugio'), r('milenio'), r('pueblito'), r('centro')].join() === 'norte,noreste,oriente,suroeste,centro', [r('juriquilla'), r('refugio'), r('milenio'), r('pueblito'), r('centro')].join());
  ok('fuera de la ciudad: San Miguel, Celaya, San Juan del Río y Huimilpan; el Parque Industrial Querétaro (26 km) sigue siendo norte',
    ['sma', 'celaya', 'san juan del rio', 'huimilpan'].every(x => r(x) === 'fuera de la ciudad') && r('piq') === 'norte');
  ok('cómo se dice: «Juriquilla, en el norte de Querétaro», «el Centro Histórico de Querétaro», «El Pueblito, en Corregidora, al suroeste de la ciudad»',
    comoDecirlo(lugarConocido('juriquilla')) === 'Juriquilla, en el norte de Querétaro' && comoDecirlo(lugarConocido('el centro')) === 'el Centro Histórico de Querétaro'
    && comoDecirlo(lugarConocido('pueblito')) === 'El Pueblito, en Corregidora, al suroeste de la ciudad' && comoDecirlo(lugarConocido('sma')) === 'San Miguel de Allende, fuera de la ciudad');
  ok('a OpenStreetMap va la colonia sin relleno, y nunca más de 120 letras', paraOSM('aquí en la colonia Villas del Mesón') === 'villas del meson' && paraOSM('en El Refugio') === 'el refugio' && paraOSM('Por Villas del Mesón') === 'villas del meson' && paraOSM('x'.repeat(500)).length === 120);
}
{ const MESON = { lat: '20.7001', lon: '-100.4499', name: 'Villas del Mesón', place_rank: 24, display_name: 'Villas del Mesón, Juriquilla, Santiago de Querétaro, Municipio de Querétaro, Querétaro, México',
    address: { neighbourhood: 'Villas del Mesón', county: 'Municipio de Querétaro', state: 'Querétaro' } };
  const M = new Map(), A = { get: async k => M.get(k), put: async (k, v) => M.set(k, v), list: async p => [...M].filter(([k]) => k.startsWith(p)) };
  const m = mapaFalso({ osm: { 'villas del meson': MESON } });
  const l1 = await ubicar(A, 'Por Villas del Mesón', m.traer), l2 = await ubicar(A, 'villas del meson', m.traer);
  ok('lo que no está en la tabla lo busca en OpenStreetMap, con su municipio y su rumbo', l1?.nombre === 'Villas del Mesón' && l1.municipio === 'Querétaro' && l1.rumbo === 'norte' && l1.por === 'osm', JSON.stringify(l1));
  ok('…y la segunda vez sale de la caché (geo:), sin volver a preguntar', l2?.nombre === 'Villas del Mesón' && m.pedidos.length === 1 && M.has('geo:villas del meson'));
  const p = m.pedidos[0], u = new URL(p.url);
  ok('la consulta va acotada a la región (viewbox con SMA y Celaya, bounded, mx) y con el User-Agent de la app',
    u.searchParams.get('bounded') === '1' && u.searchParams.get('countrycodes') === 'mx' && Number(u.searchParams.get('viewbox').split(',')[0]) <= -100.84 && p.init.headers['user-agent'] === 'cotizador-plagas-qro/1.0');
  ok('lo que está en la tabla no sale a internet', (await ubicar(A, 'aquí en milenio', m.traer))?.nombre === 'Milenio III' && m.pedidos.length === 1);
  const caido = mapaFalso({ sinRed: true });
  const e = await buscarLugar(A, 'Lomas de Querétaro Sur', caido.traer);
  ok('sin red: no se ubica y el error NO se guarda en la caché (la siguiente vez se vuelve a preguntar)', !!e.error && !M.has('geo:lomas de queretaro sur'));
  const vacio = mapaFalso();
  ok('lo que OpenStreetMap no conoce se guarda como «no existe» y no se vuelve a preguntar',
    (await ubicar(A, 'Colonia Inventada Xyz', vacio.traer)) === null && (await ubicar(A, 'colonia inventada xyz', vacio.traer)) === null && vacio.pedidos.length === 1 && M.get('geo:inventada xyz')?.nada);
  const BLVD = { lat: '20.7075', lon: '-100.4506', name: 'Boulevard de Prueba', category: 'highway', place_rank: 26, address: { road: 'Boulevard de Prueba', town: 'Juriquilla', county: 'Municipio de Querétaro', state: 'Querétaro' } };
  ok('si OpenStreetMap encuentra una calle, al cliente se le dice el pueblo o la colonia donde queda', (await ubicar(A, 'boulevard de prueba', mapaFalso({ osm: { 'boulevard de prueba': BLVD } }).traer))?.nombre === 'Juriquilla');
  ok('«Querétaro» a secas es demasiado general: ni se pregunta', (await ubicar(A, 'Querétaro', vacio.traer)) === null && vacio.pedidos.length === 1);
}
{ const de = { lat: 20.593, lon: -100.3916 }, a = lugarConocido('juriquilla');
  const k = await kmPorCarretera(de, a, mapaFalso().traer);
  ok('km de ida por carretera, con un decimal', k.por === 'carretera' && k.km === Math.round(kmRecta(de, a) * 1.25 * 10) / 10, JSON.stringify(k));
  const c = await kmPorCarretera(de, a, mapaFalso({ osrmCaido: true }).traer);
  ok('OSRM caído: línea recta × 1.3, marcado «aprox»', c.por === 'aprox' && c.km === Math.round(kmRecta(de, a) * 1.3 * 10) / 10, JSON.stringify(c));
  const t0 = Date.now(), tope = OSM.tope_ms; OSM.tope_ms = 150;
  const l = await kmPorCarretera(de, a, mapaFalso({ osrmLento: true }).traer); OSM.tope_ms = tope;
  ok('OSRM que no contesta: a los segundos, aproximado (el cliente no se queda esperando)', l.por === 'aprox' && Date.now() - t0 < 2000); }
{ /* de dónde sale la camioneta: aparte, ni en tarifas ni en negocio */
  const M = new Map([['tarifas', { x: 1 }], ['negocio', { nombre: 'N' }]]), A = { get: async k => M.get(k), put: async (k, v) => M.set(k, v), list: async p => [...M].filter(([k]) => k.startsWith(p)) };
  const sinSalida = await distanciaA(A, 'Juriquilla', mapaFalso().traer);
  ok('sin salida: dice el lugar y el rumbo, sin km, y dice qué falta', sinSalida.bien && sinSalida.lugar === 'Juriquilla' && sinSalida.rumbo === 'norte' && sinSalida.km === null && /sale la camioneta/.test(sinSalida.falta));
  const BODEGA = { lat: '20.6100', lon: '-100.4000', name: 'Calle de Prueba', place_rank: 30, display_name: 'Calle de Prueba, Colonia de Prueba, Santiago de Querétaro, Municipio de Querétaro, Querétaro, México',
    address: { road: 'Calle de Prueba', county: 'Municipio de Querétaro', state: 'Querétaro' } };
  const m = mapaFalso({ osm: { 'Calle de Prueba 100, Querétaro': BODEGA } });
  const mala = await ponerSalida(A, { direccion: 'Calle que no existe 1' }, m.traer);
  ok('una dirección que no encuentra NO se guarda y dice cómo escribirla', !mala.bien && mala.estado === 404 && !M.has('salida') && /coordenadas/.test(mala.error));
  const s = await ponerSalida(A, { direccion: 'Calle de Prueba 100, Querétaro' }, m.traer);
  ok('POST /api/salida: guarda la dirección con sus coordenadas y regresa lo que entendió', s.bien && M.get('salida').lat === 20.61 && /Calle de Prueba/.test(s.entendi), JSON.stringify(s));
  ok('…aparte: las tarifas y el negocio no se tocan', M.get('tarifas').x === 1 && !('salida' in M.get('negocio')) && !('lat' in M.get('negocio')));
  const g = await ponerSalida(A, { direccion: '20.5930, -100.3916' }, m.traer);
  ok('también acepta las coordenadas pegadas de Google Maps, sin preguntarle a nadie', g.bien && M.get('salida').lat === 20.593 && m.pedidos.length === 2);
  const d = await distanciaA(A, 'por juriquilla', m.traer);
  ok('GET /api/distancia con salida: lugar, municipio, rumbo y km de ida por carretera', d.bien && d.lugar === 'Juriquilla' && d.municipio === 'Querétaro' && d.rumbo === 'norte' && d.por === 'carretera' && d.km > 10 && d.km < 25, JSON.stringify(d));
  ok('un lugar que no existe: 404 con qué escribir', (await distanciaA(A, 'Colonia Inventada Xyz', m.traer)).estado === 404); }
{ /* EL BOT: la zona en la cotización, los km de carretera UNA vez en el precio, y lo mismo que da corrida() */
  const TX = { formula: { tipo: 'excel', x: 2.5, entre: .6, km: 7, traslado_aparte: true }, tecnico: { costo_hora: 80, m2_hora: 330, minimo_horas: 1, personas: 1 },
    plagas: { cucaracha: { material: 'Insecticida', litros_m2: .025, precio_litro: 20 } }, tipos: { casa: { factor: 1 }, industria: { factor: 1.4, visita: true } }, km_tipico: 10 };
  const ia = (zona) => (a) => ({ bien: true, respuesta: a.cotizacion ? 'Te saldría aproximadamente en {precio}.' : 'Va', necesita_dueno: false, motivo: '', razon: 'x', datos: { plaga: 'cucaracha', m2: 120, zona, tipo: 'casa' } });
  { const t = hacer({ pensar: ia('Juriquilla') }); t.M.set('tarifas', TX);
    await t.of.atender(msj('tengo cucarachas en mi casa de juriquilla, 120 m2', '524421800001', { nombre: 'Ana Pérez' }));
    const conv = t.M.get('conv:whatsapp:524421800001'), cot = conv.cotizacion, vioIA = t.llamadas.at(-1).cotizacion;
    ok('sin salida: el bot dice la zona igual y cotiza con los km típicos, marcados estimados', cot.lugar?.nombre === 'Juriquilla' && cot.lugar.rumbo === 'norte' && cot.kmEstimado && cot.distancia.km === 10 && cot.distancia.por === 'tipico', JSON.stringify(cot.distancia));
    ok('la IA recibe el lugar ya dicho («Juriquilla, en el norte de Querétaro») y NO los km', paraLaIA(vioIA).lugar === 'Juriquilla, en el norte de Querétaro' && !/"km|distancia"/.test(JSON.stringify(paraLaIA(vioIA))), JSON.stringify(paraLaIA(vioIA)));
    ok('sin salida no se pregunta nada a OSRM', !t.pedidos.some(p => p.host === 'router.project-osrm.org')); }
  { const t = hacer({ pensar: ia('Juriquilla') }); t.M.set('tarifas', TX); t.M.set('salida', { direccion: 'Bodega de prueba', lat: 20.593, lon: -100.3916 });
    await t.of.atender(msj('tengo cucarachas en mi casa de juriquilla, 120 m2', '524421800002', { nombre: 'Ana Pérez' }));
    const conv = t.M.get('conv:whatsapp:524421800002'), cot = conv.cotizacion, e = cot.desglose.excel.corrida;
    const kmC = Math.round(kmRecta({ lat: 20.593, lon: -100.3916 }, lugarConocido('juriquilla')) * 1.25 * 10) / 10;
    const h = corrida({ horas: e.horas, km: kmC, renglones: [{ producto: '_', cantidad: e.cantidad }] }, { catalogo: [{ id: '_', unidad: 'ml/lt', por_unidad: 20 }], convencional: { mano_hora: 80, ...TX.formula } });
    ok('con salida: km de ida por carretera, no estimados', cot.distancia.km === kmC && cot.distancia.por === 'carretera' && !cot.kmEstimado && e.km === kmC, JSON.stringify(cot.distancia));
    ok('el precio con km de carretera es corrida() con esos mismos km, al centavo', cot.desde === h.cotizacion, `${cot.desde} vs ${h.cotizacion}`);
    ok('los km se cobran UNA vez (sin ida y vuelta): traslado = km × $/km', cot.desglose.traslado === Math.round(kmC * 7 * 100) / 100, JSON.stringify(cot.desglose.traslado));
    const doc = [...t.M].find(([k]) => k.startsWith('cotdoc:'))[1], pub = await cotizacionPublica({ get: async k => t.M.get(k) }, doc.codigo);
    ok('los km van en lo interno de la hoja y en la nota del dueño («Juriquilla · norte · X km por carretera»)', doc.interno.km === kmC && doc.interno.km_por === 'carretera' && doc.interno.nota === `Juriquilla · norte · ${kmC} km por carretera`, JSON.stringify(doc.interno.nota));
    ok('…y la hoja del cliente no los trae', pub.bien && !JSON.stringify(pub).includes(String(kmC)) && !/carretera|km_por/.test(JSON.stringify(pub)));
    ok('al cliente no se le dicen los km', t.salidas.every(x => !x.texto.includes(String(kmC)) && !/\bkm\b|kil[oó]metro/i.test(x.texto)));
    ok('a OpenStreetMap / OSRM no se manda el nombre, el teléfono ni el mensaje del cliente', t.pedidos.length > 0 && t.pedidos.every(p => !/ana|perez|5244218|cucaracha/i.test(decodeURIComponent(p.url)) && !p.init.body), t.pedidos.map(p => p.url).join(' | ')); }
  { /* una colonia que no está en la tabla: a OSM SÓLO la colonia, y la conversación la guarda (no se vuelve a preguntar) */
    const MESON = { lat: '20.7001', lon: '-100.4499', name: 'Villas del Mesón', place_rank: 24, display_name: 'Villas del Mesón', address: { county: 'Municipio de Querétaro', state: 'Querétaro' } };
    let vez = 0;
    const t = hacer({ mapa: { osm: { 'villas del meson': MESON } }, pensar: (a) => (++vez, { bien: true, respuesta: a.cotizacion ? (a.cotizacion.yaDicho ? 'Sí, incluye todo.' : 'Te saldría aproximadamente en {precio}.') : 'Va', necesita_dueno: false, motivo: '', razon: 'x',
      datos: { plaga: 'cucaracha', m2: 120, zona: 'aquí en Villas del Mesón', tipo: 'casa' } }) });
    t.M.set('tarifas', TX); t.M.set('salida', { direccion: 'Bodega de prueba', lat: 20.593, lon: -100.3916 });
    await t.of.atender(msj('soy Ana Pérez, mi cel 4421234567, tengo cucarachas aquí en Villas del Mesón, 120 m2', '524421800003', { nombre: 'Ana Pérez' }));
    await t.of.atender(msj('¿y eso incluye todo?', '524421800003'));
    const osm = t.pedidos.filter(p => p.host === 'nominatim.openstreetmap.org');
    ok('a OpenStreetMap va SÓLO la colonia («villas del meson»), una vez en toda la plática', osm.length === 1 && osm[0].q === 'villas del meson' && !/4421234567|ana|cucaracha/i.test(osm[0].url), JSON.stringify(osm.map(p => p.q)));
    ok('…y OSRM una vez: la conversación guarda el lugar con sus km', t.pedidos.filter(p => p.host === 'router.project-osrm.org').length === 1 && t.M.get('conv:whatsapp:524421800003').lugar?.km > 0); }
  { /* cambia de zona: se recalcula el lugar, los km y el precio (antes los km de la primera zona se quedaban pegados) */
    const vio = [];
    const t = hacer({ pensar: (a, i) => { vio.push(a.cotizacion && { lugar: paraLaIA(a.cotizacion).lugar, desde: a.cotizacion.desde });
      return { bien: true, respuesta: a.cotizacion ? 'Te saldría aproximadamente en {precio}.' : 'Va', necesita_dueno: false, motivo: '', razon: 'x', datos: { plaga: 'cucaracha', m2: 120, zona: i <= 2 ? 'Centro' : 'Juriquilla', tipo: 'casa' } }; } });
    t.M.set('tarifas', TX); t.M.set('salida', { direccion: 'Bodega de prueba', lat: 20.593, lon: -100.3916 });
    await t.of.atender(msj('tengo cucarachas en mi casa del centro, 120 m2', '524421800004'));
    const c1 = t.M.get('conv:whatsapp:524421800004').cotizacion;
    await t.of.atender(msj('perdón, me equivoqué: es en juriquilla', '524421800004'));
    const conv = t.M.get('conv:whatsapp:524421800004'), c2 = conv.cotizacion;
    ok('cambia de zona: el lugar, los km y el precio se recalculan', c1.lugar.nombre === 'Centro Histórico' && c2.lugar.nombre === 'Juriquilla' && c2.distancia.km > c1.distancia.km && c2.desde > c1.desde && conv.lugar.nombre === 'Juriquilla', JSON.stringify([c1.distancia, c2.distancia]));
    ok('…la IA recibe el nuevo lugar con el nuevo precio, y el km ya no se guarda en los datos (no se queda pegado)', vio.at(-1)?.lugar === 'Juriquilla, en el norte de Querétaro' && vio.at(-1).desde === c2.desde && conv.datos.km === undefined, JSON.stringify(vio)); }
  { /* fuera de la ciudad, sin salida: rigen las reglas de fuera de zona aunque los km típicos sean pocos */
    const tf = (tipo, m2) => { const t = hacer({ pensar: (a) => ({ bien: true, respuesta: a.cotizacion ? 'Te saldría aproximadamente en {precio}.' : 'Va', necesita_dueno: false, motivo: '', razon: 'x', datos: { plaga: 'cucaracha', m2, zona: 'San Miguel de Allende', tipo } }) }); t.M.set('tarifas', TX); return t; };
    const casa = tf('casa', 90); await casa.of.atender(msj('tengo cucarachas en mi casa de san miguel de allende, 90 m2', '524421800005'));
    const cc = casa.M.get('conv:whatsapp:524421800005').cotizacion, dicho = casa.salidas.filter(x => x.chat === '524421800005').map(x => x.texto).join(' | ');
    ok('San Miguel, casa chica, sin salida: fuera de zona, no se cubre y no sale precio', cc.lugar.rumbo === 'fuera de la ciudad' && cc.fueraDeRadio && cc.atiende === 'no' && !/\$\d/.test(dicho), dicho);
    const ind = tf('industria', 900); await ind.of.atender(msj('es una planta de alimentos en san miguel de allende, 900 m2, cucarachas', '524421800006'));
    const ci = ind.M.get('conv:whatsapp:524421800006').cotizacion;
    ok('San Miguel, industria: sí, con visita para confirmar', ci.fueraDeRadio && ci.atiende === 'si' && ci.visita);
    const conRadio = hacer({ pensar: (a) => ({ bien: true, respuesta: a.cotizacion ? 'Te saldría aproximadamente en {precio}.' : 'Va', necesita_dueno: false, motivo: '', razon: 'x', datos: { plaga: 'cucaracha', m2: 260, zona: 'Pedro Escobedo', tipo: 'casa' } }) });
    conRadio.M.set('tarifas', { ...TX, radio_km: 60 }); conRadio.M.set('salida', { direccion: 'Bodega de prueba', lat: 20.593, lon: -100.3916 });
    await conRadio.of.atender(msj('cucarachas en pedro escobedo, casa de 260 m2', '524421800007'));
    const cr = conRadio.M.get('conv:whatsapp:524421800007').cotizacion;
    ok('con salida y radio_km, manda su radio: Pedro Escobedo a menos de 60 km por carretera sí se atiende', cr.lugar.rumbo === 'fuera de la ciudad' && !cr.fueraDeRadio && cr.atiende === 'si', JSON.stringify({ km: cr.distancia, atiende: cr.atiende })); }
}

console.log(`\n${bien} pasan · ${mal} fallan`);
process.exit(mal ? 1 : 0);
