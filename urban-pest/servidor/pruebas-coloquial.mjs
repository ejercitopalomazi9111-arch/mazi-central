/* ═══════════════════════════════════════════════════════════════════════════
   URBAN PEST · EL BOT CONTRA COMO ESCRIBE LA GENTE  (Godines, 17 nov)
     node urban-pest/servidor/pruebas-coloquial.mjs
   Luis, 17 nov: «prueba mil veces el bot con lenguajes coloquiales». Arma más de
   mil mensajes como llegan de verdad a un WhatsApp de Querétaro —«qué onda»,
   «oiga joven», «xfa», «q», sin acentos, en mayúsculas, con letras de más— y mide
   tres cosas del reflejo (las respuestas que salen sin gastar IA):
     · ACIERTA: contesta el caso que es;
     · SE LO PASA A LA IA: no contesta (no es error: la IA lo resuelve, sólo cuesta);
     · SE EQUIVOCA: contesta OTRO caso. Esto es lo grave y tiene que ser CERO.
   Y cómo entiende el nombre de cada plaga como la dice la gente.
   Los mensajes con datos para cotizar («tengo cucarachas en mi casa de 3
   recámaras…») tienen que IR A LA IA: si el reflejo les contesta «¿qué plaga
   tienes?», el cliente siente que no lo leyeron.
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs';
import { reflejo } from './src/reflejo.js';
import { aPlaga } from './src/cotizador.js';

const casos = JSON.parse(readFileSync(new URL('../bot/casos.json', import.meta.url)));
let bien = 0, mal = 0;
const ok = (q, c, d = '') => { if(c){ bien++; console.log('  ✓ ' + q); } else { mal++; console.log('  ✗ ' + q + (d ? '\n      ' + d : '')); } };

/* Lo que pregunta la gente, por caso. «ia» = lo que el reflejo NO debe contestar (datos para cotizar, plática). */
const INTENTOS = {
  precio: ['cuanto cuesta fumigar', 'cuanto me cobras por fumigar', 'en cuanto me sale fumigar', 'cuanto cobran por una fumigacion', 'me pasas precio', 'me das precio',
    'cuanto me costaria fumigar', 'que precio tiene la fumigacion', 'quiero una cotizacion', 'me puedes cotizar', 'cuanto cobran', 'cuanto sale una fumigada', 'me cotizan una fumigacion',
    'precio de fumigacion', 'cuanto es por fumigar', 'cuanto me sale', 'que costo tiene', 'cuanto cuesta el servicio'],
  factura: ['dan factura', 'me pueden facturar', 'necesito factura', 'ocupo factura', 'manejan factura', 'me facturan'],
  'hablar-dueno': ['quiero hablar con el dueño', 'pasame con el encargado', 'quiero hablar con una persona', 'me comunicas con el encargado', 'me puede llamar alguien',
    'quiero hablar con el encargado', 'pasame al dueño', 'puedo hablar con alguien', 'me pasas con una persona', 'quiero hablar con el jefe'],
  pagina: ['tienen pagina', 'tienen facebook', 'cual es su pagina', 'tienen pagina web', 'tienen instagram', 'tienen redes sociales', 'tienen face', 'tienen insta', 'como los encuentro en facebook'],
  palomas: ['tengo palomas en el techo', 'quitan palomas', 'hay muchas palomas en mi bodega', 'tengo pichones en la azotea', 'se me llenó de palomas la azotea', 'control de palomas'],
  fauna: ['se metio un tlacuache', 'hay murcielagos en mi casa', 'tengo un mapache en el techo', 'hay ardillas en el techo', 'se metio una zarigueya', 'hay un animal en el techo'],
  empresa: ['fumigan empresas', 'fumigan restaurantes', 'trabajan con negocios', 'fumigan bodegas', 'hacen fumigacion industrial', 'atienden fabricas', 'fumigan hospitales'],
  mascotas: ['es peligroso para mi perro', 'le hace daño a mis gatos', 'es seguro para los niños', 'los productos son seguros para mascotas', 'es toxico', 'es toxico para mi perrito',
    'le hace daño a mi perro', 'es peligroso para los niños'],
  garantia: ['dan garantia', 'tienen garantia', 'y si vuelven a salir', 'que pasa si no se van', 'si regresa la plaga', 'y si regresan las cucarachas'],
  cobertura: ['atienden fuera de queretaro', 'van a san juan del rio', 'llegan hasta celaya', 'que zonas cubren', 'van a mi municipio', 'llegan a celaya'],
  inspeccion: ['que incluye la inspeccion', 'que hacen en la visita', 'como es el diagnostico', 'que revisan'],
  licencia: ['tienen licencia sanitaria', 'estan certificados', 'tienen permiso de salud', 'tienen licencia de cofepris', 'tienen repse', 'son una empresa registrada'],
  experiencia: ['cuantos años tienen', 'cuanto tiempo llevan', 'tienen experiencia', 'son nuevos', 'desde cuando trabajan', 'cuantos años llevan'],
  productos: ['que productos usan', 'que quimicos usan', 'que le echan', 'que veneno usan', 'los productos tienen registro'],
  'salir-casa': ['cuanto tiempo hay que salir', 'tenemos que salir de la casa', 'cuantas horas me salgo', 'puedo quedarme en la casa mientras fumigan', 'cuando puedo regresar a mi casa',
    'tengo que salirme de la casa'],
  preparar: ['que tengo que hacer antes', 'como preparo la casa', 'tengo que mover los muebles', 'que hago antes de que lleguen', 'tengo que sacar las cosas'],
  despues: ['es normal que sigan saliendo', 'despues de fumigar salen mas', 'siguen saliendo cucarachas despues de fumigar', 'veo cucarachas muertas', 'salen mas despues de la fumigacion'],
  reagendar: ['quiero cambiar mi cita', 'puedo mover la cita', 'cambiar la fecha', 'no voy a poder ese dia', 'cancelar la cita', 'me cambias la cita'],
  'confirmar-cita': ['a que hora llegan', 'sigue en pie la cita', 'confirman mi cita', 'ya vienen', 'a que hora viene el tecnico'],
  empleo: ['buscan personal', 'tienen vacantes', 'estan contratando', 'busco trabajo', 'quiero trabajar con ustedes', 'les mando mi curriculum'],
  proveedor: ['soy proveedor', 'vendo productos para fumigar', 'les ofrezco mis servicios', 'somos distribuidores', 'quiero ofrecerles mis productos'],
  queja: ['quiero poner una queja', 'no quede conforme', 'el servicio estuvo mal', 'tengo una queja', 'quiero reclamar', 'no funciono la fumigacion'],
  'no-se-que-plaga': ['no se que plaga es', 'no se que bicho es', 'que es este bicho', 'me ayudas a saber que es', 'no se que animal es'],
  ia: ['tengo cucarachas en mi casa de 3 recamaras en juriquilla', 'hay un chorro de hormigas en la cocina', 'mi casa es mediana y tengo alacranes', 'son como 120 metros',
    'en el refugio', 'es de dos pisos', 'tengo chinches en la cama', 'es una casa chica en el centro', 'hay ratas en el patio de atras', 'mi depa esta en milenio',
    'tiene 2 baños y patio', 'son cucarachitas guerinas en la cocina', 'tengo cucarachas en una casa de 100 m2 en juriquilla cuanto cuesta',
    'cuanto me sale fumigar mi casa de 3 recamaras en el campanario por cucarachas', 'tengo hormigas en el jardin, cuanto me cobras si es una casa grande',
    'hola buenas tardes', 'ok gracias', 'si', 'mañana en la tarde', 'va', 'sale pues'],
};

/* Cómo lo escribe la gente */
const PREFIJOS = ['', 'hola ', 'buenas ', 'buenas tardes, ', 'que onda ', 'oiga ', 'disculpe ', 'joven ', 'una pregunta ', 'hola buen dia ', 'oye ', 'buenas noches ', 'jefe ', 'hola, '];
const SUFIJOS = ['', '?', '??', ' porfa', ' por favor', ' xfa', ' gracias', '!!', ' plis', ' amigo', '???', ' 🙏'];
const sinAcentos = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const ESTILOS = [
  (s) => s,
  (s) => s.charAt(0).toUpperCase() + s.slice(1),
  (s) => s.toUpperCase(),
  (s) => sinAcentos(s),
  (s) => s.replace(/\bque\b/g, 'q').replace(/\bpor\b/g, 'x'),
  (s) => s.replace(/\bque\b/g, 'k').replace(/\bquiero\b/g, 'kiero'),
  (s) => '¿' + s.charAt(0).toUpperCase() + s.slice(1),
  (s) => s.replace(/([aeiou])(\W*)$/, '$1$1$1$2'),
  (s) => s.replace(/\bpara\b/g, 'pa').replace(/\bestan\b/g, 'tan'),
  (s) => s.replace(/,/g, '').replace(/\s+/g, '  '),
];

/* combinaciones fijas (semilla): la prueba falla igual cada vez */
let semilla = 2026; const azar = (n) => (semilla = (semilla * 1103515245 + 12345) % 2147483648) % n;
const mensajes = [];
for(const [intento, frases] of Object.entries(INTENTOS)) for(const f of frases){
  const veces = intento === 'ia' ? 8 : 9;
  for(let i = 0; i < veces; i++){
    const texto = ESTILOS[azar(ESTILOS.length)](PREFIJOS[azar(PREFIJOS.length)] + f + SUFIJOS[azar(SUFIJOS.length)]);
    mensajes.push({ intento, texto });
  }
}

console.log(`reflejo · ${mensajes.length} mensajes como los escribe la gente`);
const resultado = { acierta: 0, ia: 0, equivoca: 0 }, errores = [], fugas = [], porCaso = {};
for(const m of mensajes){
  const r = reflejo(m.texto, casos), id = r?.caso.id || null, c = (porCaso[m.intento] ??= { n: 0, acierta: 0 });
  c.n++;
  if(m.intento === 'ia'){ if(id){ resultado.equivoca++; errores.push(`«${m.texto}» → contestó «${id}» y era para la IA`); } else { resultado.acierta++; c.acierta++; } }
  else if(id === m.intento){ resultado.acierta++; c.acierta++; }
  else if(!id){ resultado.ia++; fugas.push(`«${m.texto}» (${m.intento})`); }
  else { resultado.equivoca++; errores.push(`«${m.texto}» → «${id}», era «${m.intento}»`); }
}
const pct = (n) => (100 * n / mensajes.length).toFixed(1) + ' %';
console.log(`  acierta ${resultado.acierta} (${pct(resultado.acierta)}) · se lo pasa a la IA ${resultado.ia} (${pct(resultado.ia)}) · se equivoca ${resultado.equivoca} (${pct(resultado.equivoca)})`);
for(const [k, c] of Object.entries(porCaso)) if(c.acierta < c.n) console.log(`    ${k}: ${c.acierta}/${c.n}`);
ok('son más de mil mensajes', mensajes.length >= 1000, mensajes.length);
ok('NUNCA contesta un caso equivocado (lo grave: el cliente pregunta una cosa y le contestan otra)', resultado.equivoca === 0, errores.slice(0, 15).join('\n      '));
ok('acierta al menos 9 de cada 10 (lo demás no se pierde: lo contesta la IA)', resultado.acierta / mensajes.length >= .9, fugas.slice(0, 25).join('\n      '));

/* TANDA NUEVA (no se usó para afinar los casos): frases que el bot nunca vio. Mide qué tan bien generaliza, sin
   trampa. Aquí se exige CERO equivocados; el acierto se reporta tal cual (lo que no acierta lo contesta la IA). */
const NUEVAS = {
  precio: ['que tan caro sale fumigar', 'cuanto me cobrarias', 'cuanto cobras por fumigar una casa', 'precio por fumigar', 'cuanto vale la fumigacion', 'que precios manejan'],
  factura: ['expiden factura', 'se puede facturar', 'me das factura'],
  'hablar-dueno': ['me puedes marcar', 'necesito hablar con alguien', 'me comunican con el dueño', 'con quien puedo hablar'],
  pagina: ['tienen pagina de internet', 'donde los veo en redes', 'como se llama su facebook'],
  palomas: ['se me meten las palomas', 'tengo un nido de palomas'],
  fauna: ['se metio un murcielago', 'hay un tlacuache en el patio'],
  empresa: ['dan servicio a empresas', 'tengo una fabrica', 'fumigan en hospitales'],
  mascotas: ['mi perro puede estar en la casa', 'es seguro para mi bebe', 'mis gatos corren peligro'],
  garantia: ['tiene garantia el servicio', 'si no funciona regresan'],
  cobertura: ['llegan a corregidora', 'cubren el marques', 'van hasta san juan del rio'],
  licencia: ['tienen permisos', 'estan registrados ante salud'],
  experiencia: ['hace cuanto empezaron', 'cuanta experiencia tienen'],
  productos: ['con que fumigan', 'que usan para fumigar'],
  'salir-casa': ['cuanto tiempo hay que estar fuera', 'nos salimos de la casa'],
  preparar: ['que debo hacer antes de la fumigacion', 'hay que mover algo'],
  despues: ['siguen saliendo despues de que fumigaron', 'despues de la fumigacion veo mas'],
  reagendar: ['puedo cambiar el dia', 'quiero cancelar', 'se puede reprogramar'],
  'confirmar-cita': ['si vienen hoy', 'a que hora pasan'],
  empleo: ['hay chamba', 'necesitan gente', 'ocupan personal'],
  proveedor: ['les vendo productos', 'tengo productos para ustedes'],
  queja: ['estoy molesto con el servicio', 'no me gusto el servicio', 'siguen igual y ya pague'],
  'no-se-que-plaga': ['que bicho es este', 'no se como se llama el bicho'],
  ia: ['tengo unas cucarachitas en el baño, la casa es chica', 'vivo en zibata y hay hormigas', 'hay alacranes en mi jardin y es casa de 2 pisos',
    'como en cuanto me saldria si son 3 cuartos y tengo cucarachas', 'tengo ratones en la cocina de mi depa', 'es en el centro historico, casa vieja'],
};
const nuevas = [];
for(const [intento, frases] of Object.entries(NUEVAS)) for(const f of frases) for(let i = 0; i < 6; i++)
  nuevas.push({ intento, texto: ESTILOS[azar(ESTILOS.length)](PREFIJOS[azar(PREFIJOS.length)] + f + SUFIJOS[azar(SUFIJOS.length)]) });
const r2 = { acierta: 0, ia: 0, equivoca: 0 }, err2 = [], fug2 = new Set();
for(const m of nuevas){
  const id = reflejo(m.texto, casos)?.caso.id || null;
  if(m.intento === 'ia') { if(id){ r2.equivoca++; err2.push(`«${m.texto}» → «${id}» (era para la IA)`); } else r2.acierta++; }
  else if(id === m.intento) r2.acierta++; else if(!id){ r2.ia++; fug2.add(m.intento); } else { r2.equivoca++; err2.push(`«${m.texto}» → «${id}», era «${m.intento}»`); }
}
const p2 = (n) => (100 * n / nuevas.length).toFixed(1) + ' %';
console.log(`tanda nueva · ${nuevas.length} mensajes con frases que el bot nunca vio`);
console.log(`  acierta ${r2.acierta} (${p2(r2.acierta)}) · se lo pasa a la IA ${r2.ia} (${p2(r2.ia)}) · se equivoca ${r2.equivoca} (${p2(r2.equivoca)})`);
if(fug2.size) console.log(`    los que pasan a la IA son de: ${[...fug2].join(', ')}`);
ok('con frases nuevas tampoco contesta un caso equivocado', r2.equivoca === 0, err2.slice(0, 15).join('\n      '));

/* Cómo le dice la gente a cada plaga */
const PLAGAS = {
  cucaracha: ['cucarachas', 'cucarachitas', 'cucas', 'güeritas', 'cucarachas alemanas', 'cucarachas de drenaje', 'unas cucarachotas', 'CUCARACHAS', 'cucaracha americana', 'cucarachas chiquitas'],
  roedor: ['ratas', 'ratones', 'ratoncitos', 'una rata', 'tuzas', 'RATAS', 'unos ratones', 'ratas grandotas'],
  hormiga: ['hormigas', 'hormiguitas', 'hormigas rojas', 'hormigas negras', 'unas hormigas'],
  termita: ['termitas', 'comején', 'comejen', 'polilla de la madera', 'termitas en la madera'],
  alacran: ['alacranes', 'alacrán', 'alacrancitos', 'escorpiones', 'un alacran'],
  arana: ['arañas', 'araña', 'viuda negra', 'viudas negras', 'arañitas', 'arañas violinistas'],
  mosco: ['moscos', 'mosquitos', 'zancudos', 'moscos en la noche'],
  mosca: ['moscas', 'mosquitas', 'moscas en la cocina'],
  chinche: ['chinches', 'chinche de cama', 'chinches en el colchon'],
  pulga: ['pulgas', 'garrapatas', 'pulgas del perro'],
};
let plBien = 0, plN = 0; const plMal = [];
for(const [clave, dichos] of Object.entries(PLAGAS)) for(const d of dichos){ plN++; const r = aPlaga(d); if(r === clave) plBien++; else plMal.push(`«${d}» → ${r}, era ${clave}`); }
console.log(`plagas · ${plBien}/${plN} entendidas`);
ok('entiende el nombre de la plaga como lo dice la gente', plBien === plN, plMal.join('\n      '));

console.log(`\n${bien} pasan · ${mal} fallan`);
process.exit(mal ? 1 : 0);
