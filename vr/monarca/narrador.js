/* EL NARRADOR DE MONARCH XR (Carlos, 19 nov: «ponle narrador tipo Stanley Parable que explique el tema, pero que si
   haces algo mientras explica […] use una voz sexy y profunda»).
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Un narrador con ironía que cuenta la historia de «alguien con un visor en la cara» y se da cuenta de lo que haces:
   si te adelantas mientras habla, si regresas, si miras para otro lado, si te quedas quieto, si plantas antes de
   que termine, qué eliges en la decisión y cómo te va en el cuestionario. El guion es NUESTRO (sólo el género se
   parece: narrador que comenta al jugador); ninguna frase sale del juego.
     · Dos voces de la casa (Google): Orus explica (n) y Charon, la grave, reacciona a lo que haces (s).
     · Los audios se hacen UNA vez y viven en medios/narrador/<id>.mp3 (node vr/monarca/narrador-armar.mjs):
       así suena igual sin internet, en la exposición, y no gasta nada en cada visita.
     · Se tocan con el MISMO AudioContext del motor (el que despierta el toque de Entrar): en iPhone un <audio>
       nuevo sin toque se queda mudo; un búfer de WebAudio no. Eso además deja PAUSAR la explicación, decir la
       reacción y SEGUIR donde iba.
     · Los DATOS del texto son los mismos del cartel (MONARCH_XR.md, verificados). La gracia va alrededor, nunca
       cambia una cifra. */

export const LINEAS = {
  /* ── lo que explica cada escena (Orus) ── */
  'e-bienvenida': ['n', 'Ésta es la historia de alguien con un visor en la cara. Un día, sin que nadie se lo pidiera, decidió seguir a una mariposa monarca. Mira a tu alrededor. Cuando quieras, elige Empezar. Yo espero. Es lo que mejor hago.'],
  'e-mariposa': ['n', 'Ésta es la monarca. La hembra pone sus huevos sólo en el algodoncillo, también llamado asclepia. Es lo único que comen sus orugas. Ni una hoja más. Ya adulta, toma néctar de muchas flores. Se vuelve menos especial con la edad, como todos.'],
  'e-ciclo': ['n', 'Del huevo sale una oruga que sólo come algodoncillo, y muda de piel cinco veces para crecer. Luego se vuelve crisálida, y de ahí sale la mariposa. En verano, de huevo a adulta tarda menos de treinta días. Con frío, más. Nadie quiere levantarse cuando hace frío.'],
  'e-flores': ['n', 'Ya adulta, la monarca necesita néctar para el camino. Y aquí entras tú. Hay cinco lugares en el pasto. Planta una flor en cada uno, y mira cómo llega. Es la parte de la historia en la que por fin haces algo útil.'],
  'e-migracion': ['n', 'Cada otoño viajan más de tres mil kilómetros hasta el centro de México. Desde Canadá, unos cuatro mil quinientos. Y aquí está lo increíble: ninguna hace sola la ida y la vuelta. Es un viaje de varias generaciones. La que viaja al sur vive hasta unos nueve meses. Las de verano, apenas unas semanas.'],
  'e-santuario': ['n', 'Pasan el invierno en once o doce montañas de Michoacán y del Estado de México, de octubre a finales de marzo, en bosques de oyamel. La Reserva de la Biosfera Mariposa Monarca mide cincuenta y seis mil doscientas cincuenta y nueve hectáreas, y es Patrimonio Mundial desde dos mil ocho. Mira a tu alrededor. Despacio. Están dormidas.'],
  'e-tala': ['n', 'Ahora, la parte que nadie quiere oír. Entre febrero de dos mil veinticuatro y febrero de dos mil veinticinco se degradaron dos punto cincuenta y cinco hectáreas del corazón de la reserva. Tala ilegal: uno punto ochenta y cinco. Incendios: cero punto cincuenta y ocho. Sequía: cero punto once. Parecen números chiquitos. Pero en la última temporada, todas las colonias juntas ocuparon menos de tres hectáreas.'],
  'e-campo': ['n', 'Sin algodoncillo no hay orugas. Y sin orugas, no hay migración. Así de sencillo. Así de frágil. En dos mil veintidós, la UICN la puso En Peligro. En dos mil veintitrés, Vulnerable. Mejoró. Un poco. No lo celebres todavía.'],
  'e-decision': ['n', 'Y ahora, una prueba de carácter. Tu familia tiene un terreno con oyameles junto al santuario. Una empresa ofrece pagar por talarlo. ¿Qué haces? Creo que ya sé lo que vas a elegir. Pero adelante. Sorpréndeme.'],
  'e-cuestionario': ['n', 'Hora de saber si estuviste poniendo atención. Cinco preguntas. Sin presión. Bueno, con un poquito.'],
  'e-final': ['n', 'Temporada dos mil veinticinco, dos mil veintiséis: dos punto noventa y tres hectáreas de colonias, sesenta y cuatro por ciento más que el año anterior. Pero una temporada buena no es una tendencia. El máximo fue de dieciocho punto diecinueve hectáreas, entre mil novecientos noventa y seis y noventa y siete. El mínimo, cero punto sesenta y siete, entre dos mil trece y catorce. Y así termina la historia de alguien que siguió a una mariposa. O tal vez apenas empieza.'],

  /* ── el cuestionario: las preguntas (Orus) y lo que pasa al contestar (Charon) ── */
  'q-1': ['n', '¿Dónde pone sus huevos la monarca?'],
  'q-2': ['n', '¿En qué orden cambia la monarca?'],
  'q-3': ['n', '¿Una sola mariposa hace la ida y la vuelta?'],
  'q-4': ['n', '¿Qué árbol domina en su santuario?'],
  'q-5': ['n', '¿Qué degradó más bosque entre dos mil veinticuatro y dos mil veinticinco?'],
  'q-1-mal': ['s', 'Mmm. No. Era en el algodoncillo. Lo dije con toda claridad.'],
  'q-2-mal': ['s', 'No. Huevo, oruga, crisálida, mariposa. En ese orden. Siempre en ese orden.'],
  'q-3-mal': ['s', 'No. Son varias generaciones. Ninguna hace sola la ida y la vuelta.'],
  'q-4-mal': ['s', 'No. Era el oyamel. Lo tenías enfrente hace un minuto.'],
  'q-5-mal': ['s', 'No. Fue la tala ilegal. Uno punto ochenta y cinco hectáreas.'],
  'r-bien-1': ['s', 'Correcto. Sabía que podías.'],
  'r-bien-2': ['s', 'Exacto. Me estás impresionando.'],
  'r-bien-3': ['s', 'Correcto. Así me gusta.'],
  'r-bien-4': ['s', 'Muy bien. Sigue así.'],
  'r-perfecto': ['s', 'Cinco de cinco. Perfecto. Debo admitir que me tienes impresionado.'],
  'r-medio': ['s', 'Nada mal. Hay margen. Pero nada mal.'],
  'r-cero': ['s', 'Cero. Interesante. Estuviste aquí todo este tiempo, ¿verdad? Físicamente, digo.'],

  /* ── la decisión (Charon): la consecuencia es la misma del cartel ── */
  'r-talar': ['s', 'Talar. Claro. Hay dinero ahora. Pero el bosque tarda décadas en volver, y las mariposas pierden su refugio de invierno. No te juzgo. Bueno. Un poquito.'],
  'r-conservar': ['s', 'Conservar. Qué elegancia. El bosque se queda. Aunque tu familia no recibe nada por cuidarlo. Y entonces la pregunta es otra: ¿quién debería pagar por conservar?'],
  'r-turismo': ['s', 'Turismo. Me gusta cómo piensas. Las visitas guiadas pueden dar ingresos sin talar. Siempre que se respeten los límites, para no molestar a las colonias.'],

  /* ── lo que haces mientras habla (Charon) ── */
  'r-prisa-1': ['s', '¿Ya? Iba a la mitad. Pero adelante. Tú mandas.'],
  'r-prisa-2': ['s', 'Otra vez con prisa. Ella viaja miles de kilómetros y tú no aguantas un párrafo.'],
  'r-prisa-3': ['s', 'Está bien. Me salto lo aburrido. Que, al parecer, era todo.'],
  'r-atras': ['s', '¿Regresas? Nadie regresa nunca. Me halagas.'],
  'r-lejos-1': ['s', 'La historia está enfrente. Pero adelante, admira el horizonte.'],
  'r-lejos-2': ['s', 'Te estoy hablando a ti. Sí. A ti. Aquí enfrente.'],
  'r-quieto-1': ['s', 'Sigo aquí. Cuando quieras, elige algo.'],
  'r-quieto-2': ['s', 'Ella vuela más de tres mil kilómetros. Tú sólo tienes que elegir un botón.'],
  'r-flor-1': ['s', 'Una flor. Ya la vio. No te emociones: son cinco.'],
  'r-flor-hablando': ['s', 'Plantas antes de que termine de explicar. Me gusta tu iniciativa.'],
  'r-flores-todas': ['s', 'Cinco flores en su camino. Cinco lugares para tomar néctar. Mírala.'],
  'r-voz-off': ['s', '¿Me apagas? Muy bien. Lee tú solo.'],
  'r-voz-on': ['s', 'Sabía que me extrañarías.'],
  'r-creditos': ['s', 'Todas las personas que hicieron posible esto. Y yo. Sobre todo yo.'],
  'r-otra-vez': ['s', '¿Otra vez? Me encanta. Desde el principio, entonces.'],
};
export const VOCES = { n: 'google:Orus', s: 'google:Charon' };

/* crearNarrador({ actx, base, alHablar }) → { decir(ids), callar(), pausar(), seguir(), hablando(), clip, precargar() }
   · decir(['r-prisa-1', 'e-mariposa']) corta lo que suene y dice la fila en orden.
   · interrumpir('r-lejos-1') pausa lo que suena, dice la reacción y sigue donde iba. */
export function crearNarrador({ actx, base, sinVoz = () => false }){
  const bufs = {}, pidiendo = {};
  let fila = [], fuente = null, actual = null, desde = 0, inicio = 0, pausado = null, gen = 0;
  const dichos = [], pedidos = [];   /* lo que empezó a sonar y lo que se pidió decir, en orden (pruebas y depurar) */
  const ctx = () => (typeof actx === 'function' ? actx() : actx);
  function cargar(id){
    if(bufs[id] || pidiendo[id]) return pidiendo[id] || Promise.resolve(bufs[id]);
    const c = ctx(); if(!c) return Promise.resolve(null);
    return (pidiendo[id] = fetch(base(id)).then((r) => { if(!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then((a) => new Promise((ok, no) => c.decodeAudioData(a, ok, no))).then((b) => (bufs[id] = b))
      .catch(() => null).finally(() => { delete pidiendo[id]; }));
  }
  const precargar = (ids) => Promise.all((ids || Object.keys(LINEAS)).map(cargar));
  function parar(){ if(fuente){ fuente.onended = null; try{ fuente.stop(); }catch{} fuente = null; } try{ speechSynthesis.cancel(); }catch{} }
  /* sin audio (archivo que falta o no se pudo leer): la voz del teléfono con el mismo texto */
  function porTelefono(id, fin){
    try{ const u = new SpeechSynthesisUtterance(LINEAS[id][1]); u.lang = 'es-MX'; u.rate = 1;
      const v = speechSynthesis.getVoices().find((x) => /es[-_]MX/i.test(x.lang)) || speechSynthesis.getVoices().find((x) => /^es/i.test(x.lang)); if(v) u.voice = v;
      u.pitch = LINEAS[id][0] === 's' ? .7 : 1; u.onend = u.onerror = fin; speechSynthesis.speak(u); }catch{ fin(); }
  }
  async function tocar(id, offset, g){
    actual = id; desde = offset; if(!offset) dichos.push(id);
    const b = await cargar(id); if(g !== gen) return;
    const c = ctx();
    const fin = () => { if(g !== gen) return; fuente = null; actual = null; siguiente(g); };
    if(!b || !c){ porTelefono(id, fin); inicio = performance.now() / 1000; return; }
    if(c.state === 'suspended') c.resume().catch(() => {});
    const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.onended = fin;
    inicio = c.currentTime; s.start(0, Math.min(offset, Math.max(0, b.duration - .05))); fuente = s;
  }
  function siguiente(g){
    if(g !== gen) return;
    if(!fila.length){ if(pausado){ const p = pausado; pausado = null; tocar(p.id, p.en, g); } return; }
    tocar(fila.shift(), 0, g);
  }
  function decir(ids){
    gen++; parar(); pausado = null; actual = null;
    fila = (ids || []).filter((id) => LINEAS[id]); pedidos.push(...fila);
    if(sinVoz() || !fila.length){ fila = []; return; }
    siguiente(gen);
  }
  function interrumpir(id){
    if(sinVoz() || !LINEAS[id]) return; pedidos.push(id);
    const c = ctx(), b = actual && bufs[actual];
    if(actual && actual.startsWith('e-') && b && c && fuente) pausado = { id: actual, en: desde + (c.currentTime - inicio) - .4 };
    gen++; parar(); fila = []; const g = gen; tocar(id, 0, g);
  }
  function callar(){ gen++; parar(); fila = []; pausado = null; actual = null; }
  /* lo que falta del clip que suena (en segundos); 0 si nada suena */
  function falta(){
    const c = ctx(), b = actual && bufs[actual];
    if(!actual) return 0; if(!b || !c) return 1;
    return Math.max(0, b.duration - (desde + c.currentTime - inicio));
  }
  return { decir, interrumpir, callar, precargar, falta, get actual(){ return actual; }, dichos, pedidos, get ocupado(){ return !!actual || fila.length > 0; } };
}
