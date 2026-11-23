/* ═══════════════════════════════════════════════════════════════════════════
   URBAN PEST · EL COTIZADOR Y EL BOT POR TIPO DE CLIENTE  (23 nov)
     node urban-pest/servidor/pruebas-tipos.mjs
   Luis: «cotizar tanto a casa, residencial, restaurante, empresas… que la cotización sea
   correcta, que no haya gastos de más». Miles de casos por tipo de cliente (casa, depa,
   condominio, restaurante, oficina, bodega, nave, hospital, escuela, hotel), de 20 a
   50,000 m², todas las plagas, con zona conocida y sin ella:
     · el precio del bot = la corrida de «Cotizar» = la fila de su Excel, al centavo;
     · el traslado una vez y de ida, horas y litros como su calibración, nada de más;
     · cuándo NO hay precio (lugar enorme, varias casas, plaga sin precio, fuera de zona);
     · y cientos de pláticas con la IA de mentiras (a veces se porta mal a propósito):
       lo que se mide es lo que el CÓDIGO deja salir.
   ⚠ Tarifas de MUESTRA (números redondos). Las suyas viven en su servidor, no en este repo
   público: contra su Excel de verdad se prueba en privado, con la misma revisión.
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs';
import { cotizar, ALIAS, aPlaga } from './src/cotizador.js';
import { corrida } from './src/corrida.js';
import { Oficina, elReflejo, metrosDe, lugarDe, esCasa, PREGUNTA_METROS, PREGUNTA_TAMANO } from './src/oficina.js';
import { leerJSON, pesos } from './src/cerebro.js';

let bien = 0, mal = 0;
const ok = (q, c, d = '') => { if(c){ bien++; console.log('  ✓ ' + q); } else { mal++; console.log('  ✗ ' + q + (d ? '\n      ' + d : '')); } };
const casos = JSON.parse(readFileSync(new URL('../bot/casos.json', import.meta.url)));
const r2 = (n) => Math.round(n * 100) / 100;

/* La MUESTRA tiene la forma de lo que sale de su Excel (centro/excel.js → aTarifas): sin `tipos`, sin `zonas`, sin radio */
const MUESTRA = { formula: { tipo: 'excel', x: 2.5, entre: .6, km: 7, traslado_aparte: true, costos: .65 }, tecnico: { costo_hora: 80, m2_hora: 330, minimo_horas: 1, personas: 1 },
  plagas: { cucaracha: { producto: 'p1', columna: 'Cucaracha alemana', material: 'Insecticida (muestra)', litros_m2: .025, precio_litro: 20 },
    hormiga: { producto: 'p2', columna: 'Hormigas', material: 'Hormiguicida (muestra)', litros_m2: .025, precio_litro: 15 },
    alacran: { producto: 'p3', columna: 'Insectos rastreros', material: 'Residual (muestra)', litros_m2: .025, precio_litro: 25 },
    arana: { producto: 'p3', columna: 'Insectos rastreros', material: 'Residual (muestra)', litros_m2: .025, precio_litro: 25 },
    mosca: { producto: 'p4', columna: 'Moscas', material: 'Mosquicida (muestra)', litros_m2: .025, precio_litro: 18 } }, km_tipico: 10 };
/* «una fila de su Excel», a mano: P = litros × costo, Q = horas × hora, S = km × $km, T = (P + Q) × x ÷ entre + S */
function fila(clave, m2, km, T = MUESTRA){
  const p = T.plagas[clave], f = T.formula, horas = Math.max(1, Math.ceil(m2 / T.tecnico.m2_hora * 2) / 2), litros = Math.round(m2 * p.litros_m2 * 100) / 100;
  const P = litros * p.precio_litro, Q = horas * T.tecnico.costo_hora, S = km * f.km;
  return { horas, litros, P, Q, S, T: r2((P + r2(Q)) * f.x / f.entre + r2(S)) };
}
let semilla = 2311; const azar = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;
const uno = (xs) => xs[Math.floor(azar() * xs.length)];

console.log('cotizador por tipo de cliente (miles de casos)');
{ /* cómo lo clasificaría la IA: sólo hay casa, negocio e industria, y se prueban las que caben en cada tipo */
  const TIPOS = { casa: ['casa'], departamento: ['casa'], condominio: ['casa', 'negocio'], restaurante: ['negocio'], oficina: ['negocio'], bodega: ['negocio', 'industria'],
    nave: ['industria'], hospital: ['negocio', 'industria'], escuela: ['negocio'], hotel: ['negocio'] };
  const DICHOS = Object.entries(ALIAS).flatMap(([k, ds]) => ds.map(d => [k, d]));
  const por = {}, fallas = [];
  for(let i = 0; i < 5000; i++){
    const cliente = uno(Object.keys(TIPOS)), tipo = uno(TIPOS[cliente]), [clave, dicho] = uno(DICHOS);
    const m2 = Math.max(20, Math.round(Math.exp(Math.log(20) + azar() * Math.log(50000 / 20)))), km = azar() < .3 ? MUESTRA.km_tipico : Math.round(azar() * 900) / 10;
    const c = cotizar({ plaga: dicho, m2, km, tipo }, MUESTRA), malo = (q) => fallas.push(`${cliente}/${tipo} ${m2} m² ${km} km «${dicho}»: ${q}`), antes = fallas.length;
    if(aPlaga(dicho) !== clave) malo('no se entiende la plaga');
    if(!MUESTRA.plagas[clave]){ if(c.bien) malo('plaga sin precio automático y dio precio ' + c.desde); }
    else if(!c.bien) malo('no cotizó');
    else {
      const e = c.desglose.excel.corrida, s = fila(clave, m2, km), p = MUESTRA.plagas[clave];
      const h = corrida({ horas: e.horas, km: e.km, renglones: [{ producto: p.producto, cantidad: e.cantidad }] },
        { catalogo: [{ id: p.producto, unidad: 'ml/lt', por_unidad: p.precio_litro }], convencional: { mano_hora: MUESTRA.tecnico.costo_hora, ...MUESTRA.formula } });
      if(e.horas !== s.horas || e.cantidad !== s.litros || e.km !== km) malo(`horas/litros/km: ${e.horas} h ${e.cantidad} L ${e.km} km`);
      if(c.desde !== h.cotizacion || c.desde !== s.T) malo(`bot ${c.desde} · Cotizar ${h.cotizacion} · fila ${s.T}`);
      if(c.desglose.traslado !== r2(s.S)) malo(`traslado ${c.desglose.traslado} ≠ ${r2(s.S)} (una vez, de ida)`);
      if(c.desglose.costo !== r2(r2(s.P) + r2(s.Q) + r2(s.S)) || c.desglose.factor !== 1 || h.lineas.length !== 1) malo('algo de más en el costo');
      if(cotizar({ plaga: dicho, m2, km, tipo: tipo === 'casa' ? 'industria' : 'casa' }, MUESTRA).desde !== c.desde) malo('el tipo cambió el precio (su hoja no lo hace)');
      const f = pesos(c.desde);
      if(!/^\$\d{1,3}(,\d{3})*(\.\d{2})?$/.test(f) || Number(f.replace(/[$,]/g, '')) !== c.desde) malo('formato ' + f);
      const enorme = m2 > (tipo === 'casa' ? 1500 : 20000);
      if(enorme !== !!c.enorme || (enorme && (c.atiende !== 'caso-por-caso' || !c.visita)) || (!enorme && c.atiende !== 'si')) malo(`atiende ${c.atiende}`);
      if(tipo === 'industria' && !c.visita) malo('industria sin visita');
    }
    (por[cliente] ??= [0, 0])[0]++; if(fallas.length === antes) por[cliente][1]++;
  }
  ok(`5,000 cotizaciones (${Object.entries(por).map(([k, [n, b]]) => `${k} ${b}/${n}`).join(', ')}): bot = Cotizar = la fila, al centavo; traslado una vez; nada de más`,
    !fallas.length, fallas.slice(0, 4).join('\n      '));
  let sube = true, ah = 0, al = 0;
  for(let m = 20; m <= 50000; m += 7){ const e = cotizar({ plaga: 'cucaracha', m2: m, km: 10 }, MUESTRA).desglose.excel.corrida; if(e.horas < ah || e.cantidad < al) sube = false; ah = e.horas; al = e.cantidad; }
  ok('horas y litros nunca bajan al crecer los m² (20 → 50,000), y nunca menos de una hora', sube && cotizar({ plaga: 'cucaracha', m2: 20, km: 0 }, MUESTRA).desglose.excel.corrida.horas === 1);
}
{ /* FALLA 1 · con las tarifas que salen de su Excel (no traen `tipos`), a la industria no se le marcaba visita */
  const n = cotizar({ plaga: 'cucaracha', m2: 3000, km: 12, tipo: 'industria' }, MUESTRA);
  ok('una nave de 3,000 m² se confirma con visita aunque las tarifas no traigan `tipos`; una casa no', n.visita && !cotizar({ plaga: 'cucaracha', m2: 120, km: 12 }, MUESTRA).visita, JSON.stringify(n.visita));
  ok('…y si las tarifas dicen otra cosa, mandan las tarifas', !cotizar({ plaga: 'cucaracha', m2: 3000, km: 12, tipo: 'industria' }, { ...MUESTRA, tipos: { industria: { visita: false } } }).visita);
  const R = { ...MUESTRA, radio_km: 40 };
  ok('fuera de zona: industria sí y con visita; casa chica no; casa grande caso por caso',
    cotizar({ plaga: 'cucaracha', m2: 3000, km: 70, tipo: 'industria' }, R).atiende === 'si' && cotizar({ plaga: 'cucaracha', m2: 3000, km: 70, tipo: 'industria' }, R).visita
    && cotizar({ plaga: 'cucaracha', m2: 90, km: 70 }, R).atiende === 'no' && cotizar({ plaga: 'cucaracha', m2: 260, km: 70 }, R).atiende === 'caso-por-caso'); }

console.log('lo que dice el cliente');
{ /* FALLA 2 · «24.100 m²» se leía 24.1 m²: una planta de alimentos salía en cientos de pesos, con su hoja */
  ok('los metros como los escribe la gente: «24.100 m²», «1,200 metros», «3 mil metros», «80 mts», «120.5 m2»',
    metrosDe('planta de alimentos de 24.100 m² en el marqués') === 24100 && metrosDe('son 1,200 metros') === 1200 && metrosDe('nave de 3 mil metros') === 3000
    && metrosDe('depa de 80 mts') === 80 && metrosDe('120.5 m2') === 120.5 && metrosDe('mide 2500 m2.') === 2500 && metrosDe('tengo cucarachas') === null);
  ok('…y lo que apunta la IA también («24.100» → 24,100; «2500 m2» → 2,500)', leerJSON('{"respuesta":"va","datos":{"m2":"24.100"}}').datos.m2 === 24100 && leerJSON('{"respuesta":"va","datos":{"m2":"2500 m2"}}').datos.m2 === 2500
    && leerJSON('{"respuesta":"va","datos":{"m2":"80.5"}}').datos.m2 === 80.5);
  /* FALLA 3 · qué es el lugar, aunque la IA no lo apunte */
  const L = (t) => lugarDe([{ de: 'cliente', texto: t }]);
  ok('restaurante, hotel, escuela, consultorio y bodega son negocio; nave y planta de alimentos, industria',
    ['tengo un restaurante', 'hotel de 30 habitaciones', 'escuela primaria', 'tengo un consultorio dental', 'bodega de 400 m2', 'necesito factura para mi empresa'].every(t => L(t).tipo === 'negocio')
    && ['nave industrial 3,000 m2', 'planta de alimentos en el marqués', 'una fábrica de muebles'].every(t => L(t).tipo === 'industria'));
  ok('una casa sigue siendo casa: «casa de dos plantas», «vivo en un fraccionamiento», «tengo cucarachas en la cocina»',
    ['mi casa es de dos plantas de 120 m2', 'vivo en un fraccionamiento en juriquilla', 'tengo cucarachas en la cocina', 'depa en un edificio de milenio'].every(t => !L(t).tipo && !L(t).varias));
  ok('varias casas: «condominio de 40 casas», «12 departamentos», «administro un fraccionamiento»',
    ['soy administrador de un condominio de 40 casas', 'cotización para 12 departamentos de 60 m2', 'administro un fraccionamiento en zibata'].every(t => L(t).varias));
  ok('si la IA ya dijo que es casa, manda la IA; varias casas nunca son una', esCasa({ datos: { tipo: 'casa' }, mensajes: [{ de: 'cliente', texto: 'trabajo en una oficina' }] })
    && !esCasa({ datos: { tipo: 'casa' }, mensajes: [{ de: 'cliente', texto: 'condominio de 40 casas' }] }) && !esCasa({ datos: {}, mensajes: [{ de: 'cliente', texto: 'tengo un hotel' }] }));
  /* FALLA 4 · a un restaurante el reflejo le preguntaba «¿tu casa la considerarías chica, mediana o grande?» */
  ok('«tengo un restaurante, ¿cuánto cobran?», «mi negocio», «hotel», «condominio»: no reciben la pregunta de la casa (contesta la IA)',
    ['tengo un restaurante, cuanto cobran por fumigar?', 'cuanto me cobran por fumigar mi negocio', 'tengo un hotel de 30 habitaciones, cuanto cobran', 'administro un condominio, cuanto cobran por fumigar areas comunes', 'me pasas precio para fumigar un restaurante']
      .every(t => elReflejo(t, casos, {}) === null));
  ok('…ni si ya dijo antes que es negocio o industria; a una casa, o sin saber qué es, sí', elReflejo('cuanto cobran?', casos, { tipo: 'negocio' }) === null && elReflejo('cuanto me sale?', casos, { tipo: 'industria' }) === null
    && elReflejo('cuanto cobran?', casos, {}, [{ de: 'cliente', texto: 'tengo un restaurante' }, { de: 'cliente', texto: 'cuanto cobran?' }]) === null
    && elReflejo('cuanto cobran?', casos, { tipo: 'casa' })?.caso.id === 'precio' && elReflejo('cuanto cuesta fumigar', casos, {})?.caso.id === 'precio');
  ok('lo demás del reflejo sigue igual: «fumigan restaurantes?» → empresa; «dan factura? es para la empresa» → factura',
    elReflejo('fumigan restaurantes?', casos, {})?.caso.id === 'empresa' && elReflejo('dan factura? es para la empresa', casos, {})?.caso.id === 'factura'); }

console.log('la oficina por tipo de cliente');
const hacer = (pensar, tarifas = MUESTRA) => {
  const M = new Map([['casos', casos], ['tarifas', tarifas], ['negocio', { nombre: 'Urban Pest', dueno_wa: '524425550199', dueno_nombre: 'Ing. Fulano Pérez' }]]), salidas = [];
  const of = new Oficina({ almacen: { get: async k => M.get(k), put: async (k, v) => M.set(k, structuredClone(v)), list: async p => [...M].filter(([k]) => k.startsWith(p)) },
    env: {}, reloj: () => 1_700_000_000_000, enviar: async (env, canal, chat, texto) => { salidas.push({ chat, texto }); return { bien: true }; }, pensar: async (a) => pensar(a) });
  return { of, M, salidas };
};
const res = (respuesta, datos = {}, extra = {}) => ({ bien: true, respuesta, necesita_dueno: false, motivo: '', razon: 'x', datos, ...extra });
let n = 0; const msj = (texto, chat) => ({ canal: 'whatsapp', chat, id: 't' + (++n), texto, cuando: 0 });
{ /* FALLA 2 en la plática: la IA no apuntó los metros y el código los leía del mensaje como 24.1 */
  const t = hacer((a) => res(a.cotizacion?.atiende === 'si' ? 'Te saldría aproximadamente en {precio}.' : a.cotizacion ? 'Por el tamaño, el encargado revisa tu caso.' : '¿En qué zona?', { plaga: 'moscas', tipo: 'industria' }));
  await t.of.atender(msj('Buen día. Solicito cotización para una planta de alimentos de 24.100 m² en El Marqués. Tenemos moscas.', 'p1'));
  const c = t.M.get('conv:whatsapp:p1'), dicho = t.salidas.map(s => s.texto).join(' | ');
  ok('«planta de alimentos de 24.100 m²»: se cotiza con 24,100 m², es enorme y NO sale precio ni hoja', c.datos.m2 === 24100 && c.cotizacion?.enorme && !/\$\d/.test(dicho) && !/escrito/.test(dicho), dicho); }
{ /* FALLA 3 en la plática: «hotel de 33 cuartos… es mediano» se cotizaba como una casa de 33 recámaras, con hoja */
  const t = hacer((a) => res(a.cotizacion?.atiende === 'si' ? 'Te saldría aproximadamente en {precio}.' : '¿Cuántos metros cuadrados mide el lugar?', { plaga: 'alacranes', zona: 'Centro' }));
  await t.of.atender(msj('hotel en el centro, 33 cuartos, alacranes', 'h1'));
  await t.of.atender(msj('es mediano', 'h1'));
  const antes = t.salidas.map(s => s.texto).join(' | ');
  await t.of.atender(msj('son 400 metros', 'h1'));
  const c = t.M.get('conv:whatsapp:h1'), hojas = [...t.M.keys()].filter(k => k.startsWith('cotdoc:'));
  ok('un hotel de 33 cuartos no se mide como casa: sin metros no hay precio; con 400 m², el de 400 m² y una sola hoja que dice «Negocio»',
    !/\$\d/.test(antes) && c.cotDicha?.desde === fila('alacran', 400, 10).T && hojas.length === 1 && t.M.get(hojas[0]).lugar === 'Negocio', antes); }
{ /* FALLA 5 · varias casas: salía el precio de UNA casa para un fraccionamiento de 62 */
  const t = hacer((a) => res(a.cotizacion?.atiende === 'si' ? 'Te saldría aproximadamente en {precio}.' : a.cotizacion ? 'Por el tamaño, el encargado revisa tu caso y te avisa.' : '¿Cuántos metros?', { plaga: 'arañas', m2: 135, tipo: 'casa' }));
  await t.of.atender(msj('buenas, administro un fraccionamiento de 62 casas en zibata, tenemos arañas', 'f1'));
  await t.of.atender(msj('cada casa es de 135 metros', 'f1'));
  const dicho = t.salidas.filter(s => s.chat === 'f1').map(s => s.texto).join(' | '), avisos = [...t.M].filter(([k]) => k.startsWith('aviso:')).map(([, v]) => v.motivo);
  ok('fraccionamiento de 62 casas «de 135 m² cada una»: sin precio ni hoja; al dueño le llega «varias casas», no «fuera de la zona»',
    !/\$\d/.test(dicho) && !/escrito/.test(dicho) && avisos.some(a => /varias casas/.test(a)) && !avisos.some(a => /fuera de la zona/.test(a)), dicho + ' || ' + avisos.join(' / ')); }
{ /* FALLA 6 · un lugar enorme que NO está fuera de zona: al dueño le llegaba «casa grande fuera de la zona» */
  const t = hacer((a) => res(a.cotizacion ? 'Por el tamaño, el encargado revisa tu caso y te avisa.' : '¿Zona?', { plaga: 'cucarachas', m2: 30000, tipo: 'industria' }));
  await t.of.atender(msj('nave de 30,000 m2 con cucarachas en el marqués', 'n1'));
  const avisos = [...t.M].filter(([k]) => k.startsWith('aviso:')).map(([, v]) => v.motivo);
  ok('nave de 30,000 m²: al dueño le llega «lugar muy grande»', avisos.some(a => /muy grande/.test(a)) && !avisos.some(a => /fuera de la zona/.test(a)), avisos.join(' / ')); }
{ /* FALLA 1 en la plática: la cotización salía ANTES de que la IA dijera que es industria, y la hoja quedaba sin visita */
  const t = hacer((a) => res(a.cotizacion?.atiende === 'si' ? 'Te saldría aproximadamente en {precio}.' : '¿Zona?', { plaga: 'moscas', m2: 50, tipo: 'industria', zona: 'Zibata' }));
  await t.of.atender(msj('hospital de 50 metros en zibata, hay moscas, necesitamos factura', 'i1'));
  const hoja = [...t.M].find(([k]) => k.startsWith('cotdoc:'))?.[1];
  ok('si la IA dice «industria» en el mismo mensaje, la hoja sale como industria y con «se confirma con una visita», al mismo precio', hoja?.lugar === 'Industria' && hoja.visita && hoja.precio === fila('mosca', 50, 10).T, JSON.stringify(hoja && { lugar: hoja.lugar, visita: hoja.visita, precio: hoja.precio })); }
{ /* FALLA 4 en la plática: la pregunta del tamaño era de casa también para un restaurante */
  const t = hacer(() => res('Te saldría aproximadamente en {precio}.', { plaga: 'cucarachas', tipo: 'negocio' }));
  await t.of.atender(msj('tengo un restaurante con cucarachas en la cocina', 'r1'));
  const t2 = hacer(() => res('¿Cuántas recámaras y baños tiene, y la considerarías chica, mediana o grande?', { plaga: 'cucarachas' }));
  await t2.of.atender(msj('tengo un restaurante con cucarachas en la cocina', 'r2'));
  const t3 = hacer(() => res('¿Cuántas recámaras y baños tiene, y la considerarías chica, mediana o grande?', { plaga: 'cucarachas', tipo: 'casa' }));
  await t3.of.atender(msj('tengo cucarachas en mi casa', 'r3'));
  ok('a un restaurante se le piden los metros del lugar, nunca «tu casa» ni recámaras (aunque la IA se los pida); a una casa, la pregunta de la casa',
    t.salidas[0]?.texto === PREGUNTA_METROS && t2.salidas[0]?.texto === PREGUNTA_METROS && t3.salidas[0]?.texto === PREGUNTA_TAMANO, JSON.stringify([t.salidas[0]?.texto, t2.salidas[0]?.texto, t3.salidas[0]?.texto])); }

{ /* Cientos de pláticas por tipo: la IA de mentiras entiende lo que se dijo y contesta según el sistema, y a veces se porta mal a
     propósito (olvida el tipo, no apunta los metros, pide recámaras, escribe {precio} sin cotización, inventa un precio, vuelve
     a preguntar, ofrece descuento). Lo que se revisa es lo que el código deja salir. */
  const PLAGAS = [['cucaracha', ['cucarachas', 'cucas', 'cucharachas']], ['hormiga', ['hormigas']], ['alacran', ['alacranes', 'escorpiones']], ['arana', ['arañas']],
    ['mosca', ['moscas']], ['mosco', ['mosquitos', 'zancudos']], ['roedor', ['ratas', 'ratones']], ['termita', ['termitas', 'comejen']], ['chinche', ['chinches']], ['pulga', ['pulgas']]];
  const ZONAS = ['juriquilla', 'el refugio', 'milenio', 'el centro', 'zibata', 'el pueblito', 'el marques', 'una colonia que nadie conoce'];
  const num = (m) => { const r = azar(); return m >= 1000 && r < .25 ? m.toLocaleString('en-US') : m >= 1000 && r < .4 ? m.toLocaleString('de-DE') : String(m); };
  const m2De = (a, b) => { const x = Math.exp(Math.log(a) + azar() * Math.log(b / a)); return x > 1000 ? Math.round(x / 50) * 50 : Math.round(x / 5) * 5; };
  const TIPOS = {
    casa: { ia: ['casa'], es: 'casa', m2: [40, 400], f: [(p, m, z) => [`tengo ${p} en mi casa, son ${m} metros, en ${z}`], (p, m, z) => ['hola', `tengo ${p}`, `es una casa de ${m} m2`, z]] },
    depa: { ia: ['casa'], es: 'casa', m2: [35, 160], f: [(p, m, z) => [`oiga cuanto sale fumigar un depa de ${m} metros en ${z} x ${p}`]] },
    condominio: { ia: ['casa', 'negocio', null], es: 'casa', varias: true, m2: [300, 6000], f: [(p, m, z, x) => [`soy administrador de un condominio de ${x} casas`, `areas comunes de ${m} m2, hay ${p}`, z],
      (p, m, z, x) => [`cotizacion para fumigar ${x} departamentos de ${m} m2 en ${z}, ${p}`]] },
    restaurante: { ia: ['negocio', null], es: 'negocio', m2: [40, 900], f: [(p, m, z) => [`tengo un restaurante de ${m} m² con ${p} en la cocina`, `en ${z}`], (p, m, z) => ['buenas, tengo un restaurante', 'cuanto cobran?', `hay ${p}`, `son como ${m} metros`, z]] },
    oficina: { ia: ['negocio', null], es: 'negocio', m2: [30, 2000], f: [(p, m, z) => [`oficina ${m} m2 ${p}`, z]] },
    bodega: { ia: ['negocio', 'industria', null], es: 'negocio', m2: [150, 30000], f: [(p, m, z) => [`tengo una bodega de ${m} metros con ${p} en ${z}`]] },
    nave: { ia: ['industria', null], es: 'industria', m2: [500, 50000], f: [(p, m, z) => [`nave industrial ${m} m2 ${p}`, `en ${z}`]] },
    hospital: { ia: ['industria', 'negocio', null], es: 'negocio', m2: [40, 15000], f: [(p, m, z) => [`hospital de ${m} metros en ${z}, hay ${p}, necesitamos factura`]] },
    escuela: { ia: ['negocio', null], es: 'negocio', m2: [200, 12000], f: [(p, m, z) => ['escuela primaria, necesitamos fumigar', `hay ${p}`, `son ${m} metros en total`, z]] },
    hotel: { ia: ['negocio', null], es: 'negocio', m2: [300, 10000], f: [(p, m, z, x) => [`tengo un hotel de ${x} habitaciones con ${p}`, 'cuanto cobran', `como ${m} metros en total, en ${z}`]] },
  };
  const MODOS = ['bien', 'bien', 'bien', 'olvida-tipo', 'sin-m2', 'pide-cuartos', 'precio-sin-cot', 'inventa', 'repregunta', 'descuento'];
  const por = {}, fallas = [];
  for(let i = 0; i < 500; i++){
    const k = Object.keys(TIPOS)[i % 10], ti = TIPOS[k], [clave, dichos] = uno(PLAGAS), dicho = uno(dichos), m2 = m2De(...ti.m2), zona = uno(ZONAS), x = 8 + Math.floor(azar() * 60);
    const mensajes = uno(ti.f)(dicho, num(m2), zona, x), iaTipo = uno(ti.ia), modo = uno(MODOS);
    const t = hacer(({ historial, cotizacion: c, sinPrecio }) => {
      const todo = historial.filter(h => h.de === 'cliente').map(h => h.texto.toLowerCase()).join(' ');
      const d = { plaga: todo.includes(dicho) ? dicho : null, zona: todo.includes(zona) ? zona : null, tipo: modo === 'olvida-tipo' ? null : iaTipo,
        m2: modo !== 'sin-m2' && /metro|m2|m²/.test(todo) ? m2 : null };
      if(c){
        if(modo === 'inventa') return res('Te sale en $999.', d);
        if(modo === 'repregunta' && !c.yaDicho) return res('¿Cuántos metros mide el lugar?', d);
        if(c.atiende === 'caso-por-caso') return res('Por el tamaño, el encargado revisa tu caso y te avisa.', d, { necesita_dueno: true, motivo: 'caso por caso' });
        if(c.yaDicho) return res('Sí, ese precio incluye el servicio completo.', d);
        return res('Te saldría aproximadamente en {precio}. El técnico te lo confirma al ver el lugar.' + (modo === 'descuento' ? ' Y te hago 10% de descuento.' : ''), d);
      }
      if(sinPrecio) return res(`Sí atendemos ${sinPrecio}; el precio te lo da el encargado.`, d, { necesita_dueno: true, motivo: 'sin precio' });
      if(modo === 'precio-sin-cot') return res('Te saldría aproximadamente en {precio}.', d);
      if(modo === 'pide-cuartos') return res('¿Cuántas recámaras y baños tiene, y la considerarías chica, mediana o grande?', d);
      return res(!d.plaga ? '¿Qué plaga tienes?' : !d.m2 ? (ti.es === 'casa' && !ti.varias ? '¿Sabes cuántos metros mide tu casa?' : '¿Cuántos metros mide el lugar?') : '¿En qué colonia está?', d);
    });
    const chat = 'c' + i;
    for(const texto of [...mensajes, '¿y eso incluye todo?']) await t.of.atender(msj(texto, chat));
    const conv = t.M.get('conv:whatsapp:' + chat), docs = [...t.M].filter(([kk]) => kk.startsWith('cotdoc:')).map(([, v]) => v), avisos = [...t.M].filter(([kk]) => kk.startsWith('aviso:')).map(([, v]) => v.motivo);
    const textos = conv.mensajes.filter(m => m.de === 'negocio' && m.via !== 'cotizacion'), precios = textos.flatMap(m => [...m.texto.matchAll(/\$\s?\d[\d,]*(\.\d{1,2})?/g)].map(r => r[0]));
    const tipoE = (modo === 'olvida-tipo' ? null : iaTipo) || ti.es, enorme = m2 > (tipoE === 'casa' ? 1500 : 20000), conPrecio = !!MUESTRA.plagas[clave], cot = conv.cotDicha;
    const malo = (q) => fallas.push(`${k} [${modo}] ${JSON.stringify(mensajes)}: ${q}`), antes = fallas.length;
    if(precios.length && (!cot || cot.atiende !== 'si' || precios.some(p => p !== pesos(cot.desde)))) malo('precio que no es el del sistema: ' + precios.join(' '));
    if(cot && precios.length && cot.desde !== fila(clave, m2, cot.desglose.excel.corrida.km).T) malo(`precio ${cot.desde} ≠ la fila de ${m2} m²: ${fila(clave, m2, cot.desglose.excel.corrida.km).T}`);
    if(precios.length && (!conPrecio || enorme || ti.varias)) malo('salió precio y no debía: ' + precios[0]);
    if(conPrecio && !enorme && !ti.varias && !['sin-m2', 'inventa', 'descuento'].includes(modo) && !precios.length) malo('dio plaga y metros y nunca recibió el precio');
    if(docs.length > 1 || (docs.length && (docs[0].precio !== cot?.desde || !precios.length))) malo(`${docs.length} hojas / la hoja no trae el precio que se dijo`);
    if(docs.length && (docs[0].lugar === 'Casa') !== (ti.es === 'casa')) malo('la hoja dice ' + docs[0].lugar);
    if(docs.length && conv.datos.tipo === 'industria' && !docs[0].visita) malo('industria sin visita en la hoja');
    if(ti.es !== 'casa' || ti.varias){ const m = textos.find(m => (m.via === 'reflejo' || /^Para darte el precio/.test(m.texto)) && /\btu casa\b|rec[aá]maras/i.test(m.texto)); if(m) malo('a un ' + k + ' se le preguntó por su casa: ' + m.texto); }
    if(textos.some(m => /descuento|\d+\s*%|555\s?0199|fulano|p[eé]rez/i.test(m.texto))) malo('salió un descuento o datos del dueño');
    if(!conv.cotizacion?.fueraDeRadio && avisos.some(a => /fuera de la zona/.test(a))) malo('al dueño le llegó «fuera de la zona»');
    (por[k] ??= [0, 0])[0]++; if(fallas.length === antes) por[k][1]++;
  }
  ok(`500 pláticas por tipo (${Object.entries(por).map(([k, [nn, b]]) => `${k} ${b}/${nn}`).join(', ')}): precio exacto o ninguno, una hoja, nada de «tu casa» a un negocio`,
    !fallas.length, fallas.slice(0, 4).join('\n      '));
}

console.log(`\n${bien} pasan · ${mal} fallan`);
process.exit(mal ? 1 : 0);
