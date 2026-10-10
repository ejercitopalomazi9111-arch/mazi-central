/* RADIO DIVERGENTES · el podcast de Ética del 3.1
   ----------------------------------------------------------------------------
   El orden es el del pizarrón (aviso del grupo, 10 de octubre): 3 horas de
   clase por semana, 2 temas por hora, ~30 minutos cada uno → 6 temas por
   semana, 12 en dos semanas.

   Cada tema trae una ESCALETA de 30 minutos: no son datos (esos los investiga
   cada equipo y los verifica con su fuente), son las preguntas que ordenan la
   plática y el dilema ético que la vuelve de Ética y no de Historia. Lo que
   sí es dato —una fecha, una cifra— va marcado para verificar. */

export const PODCAST = {
  nombre: 'Radio Divergentes',
  materia: 'Ética',
  minutos: 30,
  temasPorHora: 2,
  horasPorSemana: 3,
};

/* la plantilla de tiempos de 30 minutos, igual para todos */
export const TIEMPOS = [
  ['0:00', 'Entrada', 'La animación con la música (sale sola).'],
  ['0:15', 'Saludo y gancho', 'Quiénes somos, de qué hablamos hoy y la pregunta que lo abre.'],
  ['3:00', 'Bloque 1', ''],
  ['10:00', 'Bloque 2', ''],
  ['17:00', 'Bloque 3', ''],
  ['24:00', 'El dilema', 'Cada quien dice su postura y por qué. Que haya desacuerdo: es Ética.'],
  ['28:00', 'Cierre', 'Una frase con lo más importante y la pregunta que le dejamos al que escucha.'],
];

export const EPISODIOS = [
  { n: 1, titulo: 'Cómo surgieron las diferentes culturas en los continentes', corto: 'Culturas',
    gancho: '¿Por qué hablamos, comemos y creemos distinto si somos la misma especie?',
    bloques: ['De dónde salimos y cómo nos fuimos repartiendo por los continentes (las rutas de migración).',
      'Qué hizo distinta a cada cultura: geografía, clima, recursos y contacto con otros pueblos. Un ejemplo de tres continentes.',
      '¿Hay culturas «mejores»? Etnocentrismo contra relativismo cultural.'],
    dilema: '¿Hay que respetar una costumbre aunque dañe a alguien de esa misma cultura?',
    investigar: ['Teorías del poblamiento de América y del origen africano', 'Tres culturas de continentes distintos y qué las formó', 'Qué dice la UNESCO sobre diversidad cultural'] },
  { n: 2, titulo: 'Holocausto', corto: 'Holocausto',
    gancho: '¿Cómo personas comunes terminaron participando en algo así?',
    bloques: ['Qué fue, cuándo y a quiénes persiguieron (fechas y cifras: verificar en la fuente).',
      'Cómo se llegó ahí: propaganda, leyes que quitaron derechos poco a poco, deshumanización.',
      'Memoria: un testimonio de sobreviviente y por qué se sigue enseñando.'],
    dilema: 'Obedecer o hacer caso a la conciencia: ¿«sólo seguía órdenes» es excusa? (Hannah Arendt y «la banalidad del mal»).',
    investigar: ['Yad Vashem y el Museo del Holocausto de EE. UU. (USHMM) para fechas y cifras', 'Un testimonio real (con su fuente)', 'Qué es la banalidad del mal'],
    cuidado: 'Tono serio y respetuoso: nada de bromas. Si ponen imágenes, que no sean gráficas sin avisar.' },
  { n: 3, titulo: 'Libro de Enoc', corto: 'Enoc',
    gancho: '¿Por qué un libro que algunos consideran sagrado quedó fuera de la Biblia de la mayoría?',
    bloques: ['Qué es y qué cuenta (los «vigilantes», los gigantes, los viajes de Enoc).',
      'Quién lo acepta como sagrado y quién no: el canon de cada tradición.',
      '¿Quién decide qué libro es sagrado? Autoridad, historia y fe.'],
    dilema: '¿Es correcto que una institución decida por todos qué textos valen?',
    investigar: ['Qué iglesias lo incluyen en su canon', 'Cómo se formó el canon bíblico', 'Fuentes académicas, no sólo videos de misterio'],
    cuidado: 'Hablar con respeto de las creencias de cada quien: se analiza, no se burla.' },
  { n: 4, titulo: 'Impacto de las industrias de la moda en la aceptación de las personas', corto: 'Moda',
    gancho: '¿Alguna vez te pusiste algo sólo para que te aceptaran?',
    bloques: ['Cómo la industria define «lo bonito»: tallas, modelos, filtros y redes.',
      'Lo que provoca: autoestima, comparación, bullying, trastornos alimentarios.',
      'Lo que cambió (inclusión, body positive) y lo que no; y quién cose la ropa barata (fast fashion).'],
    dilema: '¿La culpa es de la industria que vende o de quien compra y comparte?',
    investigar: ['Estudios sobre redes sociales y autoestima en adolescentes (con fuente)', 'Una campaña inclusiva y una que salió mal', 'Condiciones de trabajo en el fast fashion'] },
  { n: 5, titulo: 'Chernóbil', corto: 'Chernóbil',
    gancho: '¿Qué pesa más: decir la verdad o evitar el pánico?',
    bloques: ['Qué pasó en el reactor 4 en abril de 1986 (verificar detalles en la fuente).',
      'Por qué pasó: el diseño, la prueba, los errores y una cultura del secreto.',
      'Consecuencias: evacuación, la zona de exclusión, la salud de la gente.'],
    dilema: '¿Un gobierno tiene derecho a ocultar información «para no alarmar»?',
    investigar: ['Organismo Internacional de Energía Atómica y OMS', '«Voces de Chernóbil», de Svetlana Alexiévich (testimonios)', 'Diferencia entre la serie y lo que pasó'] },
  { n: 6, titulo: 'Torres Gemelas', corto: 'Torres Gemelas',
    gancho: '¿Cuánta libertad cambiarías por sentirte seguro?',
    bloques: ['Qué pasó el 11 de septiembre de 2001.',
      'Lo que cambió en el mundo: guerras, aeropuertos, vigilancia.',
      'Estigmas: cómo se trató después a musulmanes y migrantes.'],
    dilema: 'Seguridad contra privacidad: ¿está bien que el gobierno vigile a todos para prevenir ataques?',
    investigar: ['El informe de la Comisión del 11-S', 'Leyes de vigilancia que vinieron después', 'Separar hechos de teorías conspirativas'],
    cuidado: 'Si salen teorías conspirativas, se dice que lo son y qué dicen las fuentes.' },
  { n: 7, titulo: '¿Es mejor saber la verdad o vivir feliz?', corto: 'Verdad o felicidad',
    gancho: 'Si una máquina te diera una vida feliz pero falsa, ¿te conectarías? (la máquina de experiencias de Nozick; la pastilla roja de Matrix).',
    bloques: ['Por qué la verdad: autonomía, dignidad, «una vida sin examen no vale la pena» (Sócrates).',
      'Por qué la felicidad: mentiras piadosas, ignorancia que protege.',
      'Casos reales: un diagnóstico médico, un secreto de familia, una infidelidad.'],
    dilema: 'Tu mejor amigo te pide que no le digas algo que le dolería saber. ¿Se lo dices?',
    investigar: ['La máquina de experiencias de Robert Nozick', 'La alegoría de la caverna de Platón', 'Kant y la mentira'] },
  { n: 8, titulo: 'La corrupción', corto: 'Corrupción',
    gancho: 'Darle «mordida» al policía para que no te infraccione, ¿es corrupción?',
    bloques: ['Qué es y sus tipos: la grande y la de todos los días.',
      'Por qué se normaliza: «el que no transa no avanza».',
      'Cómo nos afecta y cómo se combate: transparencia, denuncia, cultura.'],
    dilema: 'Si sabes que un amigo hace trampa, ¿lo denuncias?',
    investigar: ['Índice de Percepción de la Corrupción de Transparencia Internacional (el año más reciente)', 'Encuesta del INEGI sobre calidad e impacto gubernamental', 'Un caso real y cómo terminó'] },
  { n: 9, titulo: 'La creación de la vida', corto: 'Creación de la vida',
    gancho: '¿Venimos de un accidente químico, de un diseño, o se puede creer en las dos cosas?',
    bloques: ['Explicaciones religiosas y mitos: el Génesis, el Popol Vuh y otro de otra cultura.',
      'Lo que dice la ciencia: el origen de la vida (el experimento de Miller y Urey) y la evolución.',
      '¿Se contradicen o pueden convivir?'],
    dilema: '¿Deberíamos crear vida en un laboratorio (biología sintética, clonación)?',
    investigar: ['El experimento de Miller-Urey', 'Un mito de creación de Mesoamérica', 'Qué es la biología sintética'],
    cuidado: 'Respeto a todas las creencias del equipo y del que escucha.' },
  { n: 10, titulo: 'El papel del narco en la economía actual', corto: 'Narco y economía',
    gancho: '¿Cuánto del dinero que se mueve en una ciudad tiene que ver con el narco?',
    bloques: ['Cómo funciona como negocio: producción, rutas, lavado de dinero.',
      'Lo que toca la economía de todos: empleo, extorsión, cobro de piso, precios.',
      'La narcocultura: corridos, series, moda. ¿Refleja o promueve?'],
    dilema: '¿Escuchar o compartir narcocorridos es hacerles publicidad?',
    investigar: ['Estimaciones del tamaño del negocio (siempre con su fuente y su año)', 'Qué es el lavado de dinero', 'Un estudio sobre narcocultura'],
    cuidado: 'Nada de acusar a personas con nombre y apellido; sólo lo que esté publicado por fuentes serias.' },
  { n: 11, titulo: 'Gentrificación', corto: 'Gentrificación',
    gancho: 'Si en tu colonia abren cafés caros y suben las rentas, ¿ganas o pierdes?',
    bloques: ['Qué es y de dónde viene la palabra (Ruth Glass, Londres).',
      'Cómo pasa: inversión, turismo, rentas por día, trabajo remoto. Un caso de México (y uno de Querétaro si lo encuentran).',
      'Quién gana, quién pierde y qué se puede hacer.'],
    dilema: '¿El progreso de unos justifica que otros tengan que irse de su barrio?',
    investigar: ['Un caso documentado en la Ciudad de México', 'Qué ha pasado en el centro de Querétaro', 'Regulaciones a las rentas por día en otras ciudades'] },
  { n: 12, titulo: 'Paranormal', corto: 'Paranormal',
    gancho: '¿Por qué tanta gente cree en fantasmas aunque no se pueda probar?',
    bloques: ['Experiencias y leyendas: La Llorona y una leyenda de Querétaro.',
      'Lo que explica la ciencia: pareidolia, sesgo de confirmación, parálisis del sueño.',
      'El negocio del miedo: programas, «cazafantasmas», gente que cobra por «limpias».'],
    dilema: '¿Está mal ganar dinero con el miedo o la fe de otros?',
    investigar: ['Qué es la pareidolia y la parálisis del sueño', 'Una leyenda queretana (con su fuente)', 'Un caso de fraude paranormal documentado'] },
];

/* en qué semana y qué hora de clase toca cada tema, según el orden */
export function cuando(n){
  const porSemana = PODCAST.temasPorHora * PODCAST.horasPorSemana;
  const semana = Math.floor((n - 1) / porSemana) + 1;
  const hora = Math.floor(((n - 1) % porSemana) / PODCAST.temasPorHora) + 1;
  return { semana, hora };
}

/* la escaleta del tema, en texto: para copiarla a las notas del equipo */
export function guion(ep){
  const t = TIEMPOS.map(([m, q, d], i) => {
    const b = i >= 2 && i <= 4 ? ep.bloques[i - 2] : '';
    const txt = i === 1 ? 'Gancho: ' + ep.gancho : i === 5 ? ep.dilema : b || d;
    return m + ' · ' + q + ' — ' + txt;
  });
  return [PODCAST.nombre + ' · Episodio ' + ep.n + ': ' + ep.titulo, '', ...t, '',
    'Para investigar:', ...ep.investigar.map(x => '• ' + x),
    ...(ep.cuidado ? ['', 'Ojo: ' + ep.cuidado] : []),
    '', 'Fechas y cifras: cada una con su fuente.'].join('\n');
}
