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
  /* ── el tutorial (vr/tutorial.js lo lleva; Monarch le pone su voz) ── */
  't-hola': ['n', 'Hola. Soy la voz que te va a acompañar. Antes de empezar, vamos a practicar tantito. Nada difícil, lo prometo.'],
  't-mirar': ['n', 'Primero, mueve la cabeza. Mira hacia tu izquierda, donde va esa mariposa. Y ahora hacia tu derecha.'],
  't-mirar-bien': ['s', 'Perfecto. Ya sabes mirar. Lo más difícil del día.'],
  't-manos': ['n', 'Ahora levanta una mano frente a ti, como si saludaras a la cámara del teléfono.'],
  't-manos-bien': ['s', 'Ahí está tu mano. Sí, sigue siendo tuya. No ha desarrollado una civilización independiente. Todavía.'],
  't-sin-manos': ['n', 'Si no veo tus manos, no pasa nada: también puedes elegir mirando fijo, con el control o tocando la pantalla.'],
  't-apuntar': ['n', 'Ahora apunta con el dedo al botón que tienes enfrente. O simplemente míralo.'],
  't-elegir': ['n', 'Muy bien. Para elegirlo, junta la punta del pulgar con la del índice, como un pellizco. O míralo fijo un momento.'],
  't-elegir-otra': ['s', 'Bien, vamos a intentarlo otra vez. No te preocupes, el botón no muerde. Aunque, por la manera en que lo estás evitando, empiezo a sospechar que te hizo algo.'],
  't-listo': ['s', 'Listo. Ya sabes mirar, apuntar y elegir. Ahora sí, vamos con la monarca.'],
  't-saltar': ['s', '¿Ya sabes usar esto? Muy bien. Nos saltamos la práctica.'],
  /* ── lo que explica cada escena (Orus) ── */
  'e-bienvenida': ['n', 'Ésta es la historia de alguien con un visor en la cara. Un día, sin que nadie se lo pidiera, decidió seguir a una mariposa monarca. Mira a tu alrededor. Cuando quieras, elige Empezar. Yo espero. Es lo que mejor hago.'],
  'e-mariposa': ['n', 'Ésta es la monarca. La hembra pone sus huevos sólo en el algodoncillo, también llamado asclepia. Es lo único que comen sus orugas. Y aquí entra la química: el algodoncillo trae unas sustancias amargas, los cardenólidos. La oruga las guarda en su cuerpo y por eso a casi ningún animal le gusta comérsela. Nada mal para algo tan chiquito. Ya adulta, toma néctar de muchas flores.'],
  'e-ciclo': ['n', 'Del huevo sale una oruga que sólo come algodoncillo. Pasa por cinco etapas: cambia de piel cuatro veces mientras crece, y la quinta vez que se la quita ya es crisálida. En ese tiempo aumenta unas dos mil veces su masa. Echa la cuenta: si un bebé de tres kilos creciera igual, pesaría seis toneladas. En verano, de huevo a adulta tarda unas cuatro semanas. Con frío, más. Nadie quiere levantarse cuando hace frío.'],
  'e-flores': ['n', 'Ya adulta, la monarca necesita néctar para el camino. Y aquí entras tú. Hay cinco lugares en el pasto. Planta una flor en cada uno, y mira cómo llega. Te toca ayudar.'],
  'e-migracion': ['n', 'Las que salen del norte vuelan más de tres mil kilómetros hasta el centro de México, y nunca en línea recta. Avanzan de ochenta a ciento sesenta kilómetros por día: física pura, distancia entre tiempo. La que baja a México vive hasta unos nueve meses, y en primavera empieza el regreso: pone sus huevos en el sur de Estados Unidos, y sus hijas y nietas terminan el viaje al norte. Las de verano viven apenas unas semanas.'],
  'e-santuario': ['n', 'Pasan el invierno en once o doce montañas de Michoacán y del Estado de México, de octubre a finales de marzo, en bosques de oyamel. La Reserva de la Biosfera Mariposa Monarca mide cincuenta y seis mil doscientas cincuenta y nueve hectáreas, y es Patrimonio Mundial desde dos mil ocho. Mira a tu alrededor. Despacio. No están dormidas: están casi quietas por el frío, ahorrando grasa. En los días tibios bajan a beber agua.'],
  'e-tala': ['n', 'Ahora, la parte que nadie quiere oír. Entre febrero de dos mil veinticuatro y febrero de dos mil veinticinco se degradaron dos punto cincuenta y cinco hectáreas del corazón de la reserva. Tala ilegal: uno punto ochenta y cinco. Incendios: cero punto cincuenta y ocho. Sequía: cero punto once. Parecen números chiquitos. Pero en la última temporada, todas las colonias juntas ocuparon menos de tres hectáreas.'],
  'e-campo': ['n', 'Sin algodoncillo no hay orugas. Y sin orugas, no hay migración. Así de sencillo. Así de frágil. En dos mil veintidós, la UICN puso a la monarca migratoria En Peligro. En dos mil veintitrés, Vulnerable. No porque haya mejorado: revisaron sus cálculos, y cae más despacio de lo que se creía. Pero sigue cayendo.'],
  'e-decision': ['n', 'Y ahora, una prueba de carácter. Tu familia tiene un terreno con oyameles junto al santuario. Una empresa ofrece pagar por talarlo. ¿Qué haces? Creo que ya sé lo que vas a elegir. Pero adelante. Sorpréndeme.'],
  'e-cuestionario': ['n', 'Hora de saber qué tanto se quedó contigo. Unas cuantas preguntas, de todas tus materias. Sin presión. Bueno, con un poquito.'],
  'e-final': ['n', 'Temporada dos mil veinticinco, dos mil veintiséis: dos punto noventa y tres hectáreas de colonias. Haz la cuenta: entre uno punto setenta y nueve del año anterior, da uno punto sesenta y cuatro. Sesenta y cuatro por ciento más. Son como cuatro canchas de fútbol, para millones de mariposas. Pero una temporada buena no es una tendencia. El máximo fue de dieciocho punto diecinueve hectáreas, entre mil novecientos noventa y seis y noventa y siete. El mínimo, cero punto sesenta y siete, entre dos mil trece y catorce. Y así termina la historia de alguien que siguió a una mariposa. O tal vez apenas empieza.'],

  /* ── el cuestionario: las preguntas (Orus) y lo que pasa al contestar (Charon) ── */
  'q-1': ['n', '¿Dónde pone sus huevos la monarca?'],
  'q-2': ['n', '¿En qué orden cambia la monarca?'],
  'q-3': ['n', '¿Una sola mariposa termina el regreso hasta Canadá?'],
  'q-4': ['n', '¿Qué árbol domina en su santuario?'],
  'q-5': ['n', '¿Qué degradó más bosque entre dos mil veinticuatro y dos mil veinticinco?'],
  'q-1-mal': ['s', 'Mmm. No. Era en el algodoncillo. Lo dije con toda claridad.'],
  'q-2-mal': ['s', 'No. Huevo, oruga, crisálida, mariposa. En ese orden. Siempre en ese orden.'],
  'q-3-mal': ['s', 'No. La que baja a México empieza el regreso, pero lo terminan sus hijas y sus nietas.'],
  'q-4-mal': ['s', 'No. Era el oyamel. Lo tenías enfrente hace un minuto.'],
  'q-5-mal': ['s', 'No. Fue la tala ilegal. Uno punto ochenta y cinco hectáreas.'],
  'r-bien-1': ['s', 'Correcto. Sabía que podías.'],
  'r-bien-2': ['s', 'Exacto. Me estás impresionando.'],
  'r-bien-3': ['s', 'Correcto. Así me gusta.'],
  'r-bien-4': ['s', 'Muy bien. Sigue así.'],
  'r-perfecto': ['s', 'Todas bien. Perfecto. Debo admitir que me tienes impresionado.'],
  'r-medio': ['s', 'Nada mal. Hay margen. Pero nada mal.'],
  'r-cero': ['s', 'Cero. Bueno: ahora ya sabes cuánto hay por descubrir. Otra vuelta y lo dominas.'],

  /* ── la decisión (Charon): la consecuencia es la misma del cartel ── */
  'r-talar': ['s', 'Talar. Hay dinero ahora. Pero el bosque tarda en volver, y las mariposas pierden su refugio de invierno. Es una decisión difícil. Por eso vale la pena pensarla.'],
  'r-conservar': ['s', 'Conservar. Qué elegancia. El bosque se queda. Aunque tu familia no recibe nada por cuidarlo. Y entonces la pregunta es otra: ¿quién debería pagar por conservar?'],
  'r-turismo': ['s', 'Turismo. Me gusta cómo piensas. Las visitas guiadas pueden dar ingresos sin talar. Siempre que se respeten los límites, para no molestar a las colonias.'],

  /* ── lo que haces mientras habla (Charon) ── */
  'r-prisa-1': ['s', '¿Ya? Iba a la mitad. Pero adelante. Tú mandas.'],
  'r-prisa-2': ['s', 'Otra vez con prisa. Ella viaja miles de kilómetros sin saltarse ni un tramo.'],
  'r-prisa-3': ['s', 'Está bien. Me salto lo aburrido. Que, al parecer, era todo.'],
  'r-atras': ['s', '¿Regresas? Nadie regresa nunca. Me halagas.'],
  'r-lejos-1': ['s', 'La historia está enfrente. Pero adelante, admira el horizonte.'],
  'r-lejos-2': ['s', 'Te estoy hablando a ti. Sí. A ti. Aquí enfrente.'],
  'r-quieto-1': ['s', 'Sigo aquí. Cuando quieras, elige algo.'],
  'r-quieto-2': ['s', 'Ella vuela miles de kilómetros. Tú sólo tienes que elegir un botón.'],
  'r-flor-1': ['s', 'Una flor. Ya la vio. No te emociones: son cinco.'],
  'r-flor-hablando': ['s', 'Plantas antes de que termine de explicar. Me gusta tu iniciativa.'],
  'r-flores-todas': ['s', 'Cinco flores en su camino. Cinco lugares para tomar néctar. Mírala.'],
  'r-voz-off': ['s', '¿Me apagas? Muy bien. Lee tú solo.'],
  'r-voz-on': ['s', 'Sabía que me extrañarías.'],
  'r-creditos': ['s', 'Todas las personas que hicieron posible esto. Y yo. Sobre todo yo.'],
  'r-otra-vez': ['s', '¿Otra vez? Me encanta. Desde el principio, entonces.'],

  /* ── TODO LO DEMÁS que se le pueda ocurrir (travesuras.js lo detecta) ── */
  'r-lejos-3': ['s', 'Sigues viendo para allá. ¿Hay algo más interesante que una especie en peligro? No contestes.'],
  'r-atras-mira': ['s', 'Le diste la espalda a la historia entera. Valiente. La historia sigue aquí enfrente, esperándote.'],
  'r-piso': ['s', '¿Buscas algo en el piso? Las monarcas vuelan. Hacia arriba. Bueno, enfrente.'],
  'r-cielo': ['s', 'Sí, es el cielo. Es bonito. La explicación también, y está aquí abajo.'],
  'r-ladeado': ['s', 'Ladear la cabeza no hace que el texto se lea mejor. Ya lo comprobé.'],
  'r-vueltas-1': ['s', 'Das vueltas y vueltas. Como la migración, pero sin llegar a ningún lado.'],
  'r-vueltas-2': ['s', 'Si te mareas, no es mi culpa. Que quede grabado que te lo dije.'],
  'r-no-cabeza': ['s', '¿Me dices que no con la cabeza? Qué lástima. Los datos no cambian porque no te gusten.'],
  'r-si-cabeza': ['s', 'Sí, sí. Asientes como si estuvieras escuchando. Te creo. Más o menos.'],
  'r-sin-cabeza': ['s', 'Nadie se queda tan quieto. ¿Te quitaste el visor? ¿Me dejaste hablando solo? Otra vez.'],
  'r-agachado': ['s', '¿Buscas algo allá abajo? Las mariposas andan bastante más arriba.'],
  'r-salto': ['s', '¿Un salto? Las mariposas despegan con más elegancia. Pero vas bien.'],
  'r-cerca-cartel': ['s', 'No tienes que acercarte tanto. El texto no muerde. Yo tampoco.'],
  'r-lejos-cuerpo': ['s', '¿A dónde vas? La historia se queda aquí. Regrésate tantito.'],
  'r-zona': ['s', 'Cuidado. Eso de ahí es de verdad. Yo no me hago responsable de tus espinillas.'],
  'r-manos-juega': ['s', 'Veo tus manos. Las mueves mucho. Ellas tampoco están escuchando.'],
  'r-saludo': ['s', 'Hola. Sí, hola. Yo también te saludo. Ahora, ¿seguimos?'],
  'r-punos': ['s', '¿Puños arriba? Si es para festejar, todavía falta tantito.'],
  'r-pellizcos': ['s', 'Pellizcas el aire como si te debiera dinero. Los botones están enfrente.'],
  'r-manos-arriba': ['s', '¿Manos arriba? ¿Te rindes? Todavía no termina.'],
  'r-tocar-mariposa': ['s', 'No la toques. Sus alas están cubiertas de escamas muy delicadas. Bueno, ésta es virtual. Pero no la toques.'],
  'r-oscuro': ['s', 'Se apagó todo. Algo está tapando la cámara. Sin luz, ni yo ni las mariposas vemos nada.'],
  'r-machaca': ['s', 'Aprietas botones como si fuera un juego de peleas. No lo es. Respira.'],
  'r-stick': ['s', 'El control gira la vista, no la historia. Ya diste como diez vueltas.'],
  'r-opciones': ['s', 'Ese botón no te va a sacar de aquí. Sólo el docente sabe cómo. Y no te lo va a decir.'],
  'r-voz-juega': ['s', 'Prendes, apagas, prendes. No soy un foco.'],
  'r-pingpong': ['s', 'Adelante, atrás, adelante. Decídete. La mariposa ya se fue tres veces.'],
  'r-puntaje': ['s', 'Sí, ése es tu puntaje. Tocarlo no lo cambia.'],
  'r-puntaje-2': ['s', 'Lo sigues tocando. Sigue diciendo lo mismo. Así funcionan los números.'],
  'r-creditos-2': ['s', 'Ya leíste los créditos. Sí, sigo saliendo yo.'],
  'r-otra-vez-2': ['s', '¿Otra vez? ¿Otra? Muy bien. Pero ahora sí pon atención.'],
  'r-record': ['s', 'Terminaste en menos de un minuto. Récord de velocidad. La próxima, vamos por el récord de atención.'],
  'r-sospechoso': ['s', 'Te saltaste casi todo y las contestaste todas bien. Sospechoso. Muy sospechoso.'],
  'r-rapido-resp': ['s', '¿Contestaste sin leer? Qué confianza. Ojalá te dure.'],
  'r-flores-rapido': ['s', 'Cinco flores en cinco segundos. Eso no es jardinería: es una carrera.'],
  'r-quieto-3': ['s', 'Un minuto sin hacer nada. La monarca, a estas alturas, ya iba muy lejos.'],
  'r-quieto-4': ['s', 'Te voy a contar un secreto: esto sólo funciona si haces algo. Cualquier cosa. Por favor.'],
  'r-quieto-5': ['s', 'Está bien. Avanzo yo. Alguien tiene que hacerlo.'],
  'r-volviste': ['s', 'Volviste. Te guardé tu lugar.'],
  'r-vertical': ['s', 'Pusiste el teléfono parado. Esta historia se ve con el teléfono en horizontal.'],
  'r-agitar': ['s', '¿Estás agitando el teléfono? Las respuestas no salen así. No es una bola mágica.'],
  'r-largo': ['s', 'Llevas un buen rato aquí. Me halaga. Pero allá afuera también hay mariposas de verdad.'],
  /* ── las materias (Carlos, 25 nov: «asócialo a educación física, matemáticas, física, ética, STEAM, química y
     biología… mantenimiento de cómputo… técnicas de expresión y comunicación»). Cifras en MONARCH_XR.md ── */
  'e-cuerpo': ['n', 'Una pregunta para tu clase de educación física. ¿Y si el viaje lo hicieras tú? Una persona de sesenta kilos, tres mil kilómetros. Elige: caminando o corriendo.'],
  'r-cuerpo-camina': ['s', 'Caminando, a cinco kilómetros por hora: seiscientas horas. Ocho horas diarias, y llegas en setenta y cinco días. Gastarías unas ciento treinta y siete mil kilocalorías: la comida de más de dos meses. Ella lo hace en unos dos meses, con néctar y su propia grasa.'],
  'r-cuerpo-corre': ['s', 'Corriendo, a diez kilómetros por hora: trescientas horas, la mitad. Pero gastarías unas ciento sesenta y siete mil kilocalorías: más que caminando. Llegas antes, pero te cuesta más energía. Así funciona el ejercicio intenso.'],
  'q-6': ['n', '¿Por qué a casi ningún animal le gusta comerse a la monarca?'],
  'q-7': ['n', 'Para recorrer los tres mil kilómetros, ¿qué gasta más energía en total?'],
  'q-8': ['n', 'De uno punto setenta y nueve a dos punto noventa y tres hectáreas. ¿Cuánto creció?'],
  'q-6-mal': ['s', 'No. Es la química: guarda los cardenólidos del algodoncillo, y sabe muy mal.'],
  'q-7-mal': ['s', 'No. Corriendo llegas antes, pero en total gastas más energía.'],
  'q-8-mal': ['s', 'No. Dos punto noventa y tres entre uno punto setenta y nueve: sesenta y cuatro por ciento más.'],
  'r-materias': ['s', 'Biología, química, física, matemáticas, educación física, ética y tecnología. Todo con una mariposa. Ya ves que no era sólo un bicho bonito.'],
  'r-como-funciona': ['s', 'Este visor es un teléfono: el giroscopio sigue tu cabeza, la cámara ve tus manos y el procesador dibuja todo muchas veces por segundo. Si lo sientes caliente, dale un descanso.'],
  'r-como-contamos': ['s', 'Te lo conté en segunda persona, con preguntas, con ironía y con datos que tienen fuente. Amable al principio, y con más chispa cuando te distraías. Así se le habla a un público para que no se duerma.'],
  'r-calor': ['s', 'Llevamos un buen rato. Tu teléfono trae la cámara, el tres de y tus manos al mismo tiempo. Si se siente caliente, una pausa le hace bien. Las computadoras también se cansan; nada más que ellas se calientan.'],
  /* ── la memoria (memoria.js): lo que hiciste antes, recordado escenas después ── */
  'm-manos-migracion': ['s', 'Y así como ellas cruzan miles de kilómetros guiadas por señales del ambiente, yo sigo intentando guiar tu atención. Aunque admito que tus manos han demostrado ser un destino muy popular.'],
  'm-manos-1': ['s', 'Por cierto, sigo pensando en lo mucho que te gustan tus manos. Son buenas manos. Ahora, a las mariposas.'],
  'm-manos-2': ['s', 'Dato curioso: la monarca no tiene manos. Tú sí, y ya las revisaste bastante. Siguen ahí, te lo prometo.'],
  'm-lejos-santuario': ['s', 'Aquí sí puedes mirar para todos lados. Es más: te lo pido. Ya practicaste bastante hace rato.'],
  'm-lejos-1': ['s', 'Hace rato te perdiste mirando el horizonte. Ahora que regresaste, esto es lo importante.'],
  'm-prisa-tala': ['s', 'Te he visto saltarte explicaciones. Ésta no te la saltes, por favor. Es la que más importa.'],
  'm-prisa-1': ['s', 'Vienes con prisa desde el principio. Está bien, la monarca también tiene un viaje largo. Pero ella no se salta los tramos.'],
  'm-mariposa-flores': ['s', 'Esta vez puedes ayudarla sin tocarla. Las flores también cuentan como cariño.'],
  'm-mariposa-1': ['s', 'Por cierto, la mariposa de hace rato sigue un poco nerviosa. La tocaste bastante.'],
  'm-quieto-migracion': ['s', 'Hace rato te quedaste quieto un buen tiempo. Las monarcas también descansan, pero en invierno. Y esto todavía es otoño.'],
  'm-quieto-1': ['s', 'Te noto más despierto que hace rato. Así me gusta.'],
  'm-vueltas-migracion': ['s', 'Después de tantas vueltas de hace rato, por fin entiendes a la monarca: ella tampoco viaja en línea recta.'],
  'm-vueltas-1': ['s', 'Ya no estás dando vueltas. Se agradece. El narrador también se marea.'],
  'm-cielo-santuario': ['s', 'Ahora sí, mira hacia arriba, como hace rato. Pero esta vez hay algo que ver.'],
  'm-piso-flores': ['s', 'Hace rato buscabas algo en el piso. Buenas noticias: ahora el piso es lo importante.'],
  /* ── la maceta (maceta.js) ── */
  'e-maceta': ['n', 'Ahora, jardinería de precisión. Vas a sembrar una planta para las mariposas. Primero, toma la bolsa de tierra y llévala a la maceta.'],
  'k-primero': ['s', 'Eso todavía no. Primero lo primero. La mariposa te está señalando qué sigue.'],
  'k-otra': ['s', 'Ésa no. Mira dónde se posó la mariposa: ésa es la que sigue.'],
  'k-hoyo': ['s', 'Tierra lista. Ahora toma la pala y haz un hoyo.'],
  'k-semilla': ['s', 'Perfecto. Toma una semilla del semillero y ponla en el hoyo.'],
  'k-cubrir': ['s', 'Ahora cúbrela con tierra. Con la pala otra vez.'],
  'k-regar': ['s', 'Falta el agua. La regadera, por favor.'],
  'k-crece': ['s', 'Y ahora, paciencia. Mucha paciencia. Bueno, la vamos a acelerar un poquito.'],
  'k-lista': ['s', 'Una planta nueva para el ecosistema. Y mira quién llegó a visitarla.'],
  'r-tarda-maceta': ['s', 'No hay ninguna prisa. La naturaleza tardó millones de años en desarrollar estos mecanismos. Aunque, sinceramente, esperaba que llenar una maceta nos llevara un poquito menos.'],
  'r-regresa-exp': ['s', 'Regresaste. Sabía que volverías.'],
};
export const VOCES = { n: 'google:Orus', s: 'google:Charon' };

/* crearNarrador({ actx, base, alHablar }) → { decir(ids), callar(), pausar(), seguir(), hablando(), clip, precargar() }
   · decir(['r-prisa-1', 'e-mariposa']) corta lo que suene y dice la fila en orden.
   · interrumpir('r-lejos-1') pausa lo que suena, dice la reacción y sigue donde iba. */
import { LINEAS_EN } from './narrador-en.js';
/* idioma(): 'es' o 'en' (lo elige el operador al entrar). base(id, idioma) da la dirección del audio */
export function crearNarrador({ actx, base, sinVoz = () => false, alFallar = () => {}, idioma = () => 'es' }){
  const LIN = () => (idioma() === 'en' ? LINEAS_EN : LINEAS);
  const linea = (id) => LIN()[id];
  const llave = (id) => idioma() + ':' + id;
  /* MEMORIA (Carlos, 19 nov: «en MONARCH no suena el narrador»): antes se DECODIFICABAN los 89 audios al entrar, ~100 MB de
     sonido crudo encima del 3D y las manos, y en el iPhone eso fallaba callado. Ahora se bajan comprimidos (3 MB en total)
     y se decodifica sólo lo que va a sonar, guardando los últimos `GUARDAR` ya decodificados. */
  const GUARDAR = 8;
  const crudos = {}, bajando = {}, bufs = new Map();
  let fila = [], fuente = null, actual = null, desde = 0, inicio = 0, pausado = null, gen = 0, porVoz = false;
  const dichos = [], pedidos = [], errores = [];   /* lo que empezó a sonar, lo que se pidió y lo que falló (pruebas y depurar) */
  const ctx = () => (typeof actx === 'function' ? actx() : actx);
  const fallar = (id, e) => { const m = `${id}: ${e?.message || e}`; errores.push(m); try{ alFallar(m); }catch{} return null; };
  function bajar(id){
    const k = llave(id);
    if(crudos[k]) return Promise.resolve(crudos[k]);
    return bajando[k] || (bajando[k] = fetch(base(id, idioma())).then((r) => { if(!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then((a) => (crudos[k] = a)).catch((e) => fallar(id, e)).finally(() => { delete bajando[k]; }));
  }
  async function cargar(id){
    const k = llave(id);
    if(bufs.has(k)){ const b = bufs.get(k); bufs.delete(k); bufs.set(k, b); return b; }
    const a = await bajar(id), c = ctx(); if(!a || !c) return null;
    /* decodeAudioData se queda con el arreglo: se le pasa una copia para poder decodificarlo otra vez después */
    const b = await new Promise((ok, no) => { try{ const p = c.decodeAudioData(a.slice(0), ok, no); p?.catch?.(no); }catch(e){ no(e); } }).catch((e) => fallar(id, e || 'no se pudo leer'));
    if(!b) return null;
    bufs.set(k, b); while(bufs.size > GUARDAR) bufs.delete(bufs.keys().next().value);
    return b;
  }
  /* sólo baja los archivos comprimidos (no decodifica) */
  const precargar = (ids) => Promise.all((ids || Object.keys(LIN())).map(bajar));
  function parar(){ if(fuente){ fuente.onended = null; try{ fuente.stop(); }catch{} fuente = null; } try{ speechSynthesis.cancel(); }catch{} }
  /* sin audio (archivo que falta o no se pudo leer): la voz del teléfono con el mismo texto */
  function porTelefono(id, fin0){
    /* si el teléfono nunca avisa que terminó (sin voces instaladas, o Safari que se calla), se sigue solo al tiempo que
       tardaría en leerlo: el narrador nunca se queda atorado */
    let listo = false; const fin = () => { if(listo) return; listo = true; clearTimeout(tope); fin0(); };
    const tope = setTimeout(fin, (Math.max(1.5, (linea(id)?.[1] || '').length / 14) + 1.5) * 1000);
    try{ const L = linea(id); const u = new SpeechSynthesisUtterance(L[1]); u.lang = idioma() === 'en' ? 'en-US' : 'es-MX'; u.rate = 1;
      const en = idioma() === 'en', v = speechSynthesis.getVoices().find((x) => (en ? /en[-_]US/i : /es[-_]MX/i).test(x.lang)) || speechSynthesis.getVoices().find((x) => (en ? /^en/i : /^es/i).test(x.lang)); if(v) u.voice = v;
      u.pitch = L[0] === 's' ? .7 : 1; u.onend = u.onerror = fin; speechSynthesis.speak(u); }catch{ fin(); }
  }
  async function tocar(id, offset, g){
    actual = id; desde = offset; if(!offset) dichos.push(id);
    const b = await cargar(id); if(g !== gen) return;
    const c = ctx();
    const fin = () => { if(g !== gen) return; fuente = null; actual = null; siguiente(g); };
    if(!b || !c){ porTelefono(id, fin); inicio = performance.now() / 1000; porVoz = true; return; }
    porVoz = false;
    /* en el iPhone el estado también puede ser «interrupted» (llamada, bloqueo): cualquier cosa que no sea «running» se reanuda */
    if(c.state !== 'running') c.resume().catch(() => {});
    const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.onended = fin;
    inicio = c.currentTime; s.start(0, Math.max(0, Math.min(offset || 0, b.duration - .05))); fuente = s;   /* nunca negativo: al reanudar, la cuenta podía quedar en −0.3 s y el audio tronaba */
  }
  function siguiente(g){
    if(g !== gen) return;
    if(!fila.length){ if(pausado){ const p = pausado; pausado = null; tocar(p.id, p.en, g); } return; }
    tocar(fila.shift(), 0, g);
  }
  function decir(ids){
    gen++; parar(); pausado = null; actual = null;
    fila = (ids || []).filter((id) => linea(id)); pedidos.push(...fila);
    if(sinVoz() || !fila.length){ fila = []; return; }
    siguiente(gen);
  }
  function interrumpir(id){
    if(sinVoz() || !linea(id)) return; pedidos.push(id);
    const c = ctx(), b = actual && bufs.get(llave(actual));
    if(actual && actual.startsWith('e-') && b && c && fuente) pausado = { id: actual, en: desde + (c.currentTime - inicio) - .4 };
    gen++; parar(); fila = []; const g = gen; tocar(id, 0, g);
  }
  /* a la cola: sin cortar lo que suena (si no suena nada, se dice ya) */
  function encolar(id){ if(sinVoz() || !linea(id)) return; pedidos.push(id); if(!actual && !fila.length){ fila = [id]; siguiente(gen); } else fila.push(id); }
  function callar(){ gen++; parar(); fila = []; pausado = null; actual = null; }
  /* lo que falta del clip que suena (en segundos); 0 si nada suena */
  function falta(){
    const c = ctx(), b = actual && bufs.get(llave(actual));
    if(!actual) return 0; if(!b || !c) return 1;
    return Math.max(0, b.duration - (desde + c.currentTime - inicio));
  }
  /* LO QUE SE ESTÁ DICIENDO, para los subtítulos: el renglón y qué tanto va (0..1). Con audio, por el reloj del clip;
     con la voz del teléfono, calculado a ~14 letras por segundo */
  function progreso(){
    if(!actual || !linea(actual)) return null;
    const texto = linea(actual)[1], c = ctx(), b = bufs.get(llave(actual));
    let f;
    if(b && c && !porVoz) f = (desde + c.currentTime - inicio) / b.duration;
    else f = (performance.now() / 1000 - inicio) / Math.max(1.5, texto.length / 14);
    return { id: actual, texto, f: Math.max(0, Math.min(1, f)) };
  }
  return { decir, interrumpir, encolar, callar, precargar, falta, progreso, get actual(){ return actual; }, dichos, pedidos, errores, get ocupado(){ return !!actual || fila.length > 0; } };
}
