/* RADIO DIVERGENTES · el podcast de Ética del 3.1
   ----------------------------------------------------------------------------
   El orden es el del pizarrón (aviso del grupo, 10 de octubre): 3 horas de
   clase por semana, 2 temas por hora, ~30 minutos cada uno → 6 temas por
   semana, 12 en dos semanas.

   Cada tema trae una GUÍA de 30 minutos: temas en pocas palabras, no frases
   para leer. Los datos los investiga cada equipo y los verifica con su
   fuente; aquí sólo va el orden de la plática y el dilema ético que la
   vuelve de Ética y no de Historia. */

export const PODCAST = {
  nombre: 'Radio Divergentes',
  materia: 'Ética',
  minutos: 30,
  temasPorHora: 2,
  horasPorSemana: 3,
};

/* la plantilla de tiempos de 30 minutos, igual para todos.
   GUIAS, NO GUIONES (Carlos, 10 de octubre: «haz los guiones menos
   específicos»): cada bloque es un tema en pocas palabras, para que el equipo
   lo platique con sus palabras y lo que investigó, no para leerlo. */
export const TIEMPOS = [
  ['0:00', 'Entrada', 'Sale sola.'],
  ['0:15', 'Saludo y gancho', 'Quiénes somos y una pregunta para abrir.'],
  ['3:00', 'Bloque 1', ''],
  ['10:00', 'Bloque 2', ''],
  ['17:00', 'Bloque 3', ''],
  ['24:00', 'El dilema', 'Cada quien su postura y por qué.'],
  ['28:00', 'Cierre', 'Lo más importante y una pregunta para el que escucha.'],
];

export const EPISODIOS = [
  { n: 1, titulo: 'Cómo surgieron las diferentes culturas en los continentes', corto: 'Culturas',
    gancho: '¿Por qué somos tan distintos?',
    bloques: ['De dónde venimos', 'Qué nos hizo distintos', '¿Hay culturas mejores?'],
    dilema: 'Respetar una costumbre aunque dañe a alguien',
    investigar: ['Origen y migraciones humanas', 'Tres culturas de continentes distintos', 'Diversidad cultural (UNESCO)'] },
  { n: 2, titulo: 'Holocausto', corto: 'Holocausto',
    gancho: '¿Cómo gente común llegó a participar?',
    bloques: ['Qué pasó', 'Cómo se llegó ahí', 'Por qué se recuerda'],
    dilema: 'Obedecer o hacerle caso a la conciencia',
    investigar: ['Fechas y cifras de una fuente seria', 'Un testimonio real', 'La banalidad del mal'],
    cuidado: 'Tono serio y respetuoso.' },
  { n: 3, titulo: 'Libro de Enoc', corto: 'Enoc',
    gancho: '¿Quién decide qué es sagrado?',
    bloques: ['Qué cuenta', 'Quién lo acepta y quién no', 'Autoridad, historia y fe'],
    dilema: 'Que una institución decida por todos',
    investigar: ['Qué tradiciones lo incluyen', 'Cómo se formó la Biblia', 'Fuentes académicas'],
    cuidado: 'Respeto a las creencias de cada quien.' },
  { n: 4, titulo: 'Impacto de las industrias de la moda en la aceptación de las personas', corto: 'Moda',
    gancho: '¿Te has vestido para que te acepten?',
    bloques: ['Quién decide qué es bonito', 'Lo que provoca', 'Lo que ha cambiado'],
    dilema: '¿Culpa de quien vende o de quien compra?',
    investigar: ['Redes sociales y autoestima', 'Una campaña inclusiva', 'Fast fashion'] },
  { n: 5, titulo: 'Chernóbil', corto: 'Chernóbil',
    gancho: '¿Decir la verdad o evitar el pánico?',
    bloques: ['Qué pasó', 'Por qué pasó', 'Lo que dejó'],
    dilema: 'Ocultar información «para no alarmar»',
    investigar: ['OIEA y OMS', 'Testimonios de la gente', 'La serie contra lo que pasó'] },
  { n: 6, titulo: 'Torres Gemelas', corto: 'Torres Gemelas',
    gancho: '¿Cuánta libertad cambiarías por seguridad?',
    bloques: ['Qué pasó', 'Lo que cambió en el mundo', 'Los estigmas que dejó'],
    dilema: 'Seguridad contra privacidad',
    investigar: ['El informe oficial', 'Leyes de vigilancia', 'Hechos contra teorías'],
    cuidado: 'Si salen teorías conspirativas, se dice que lo son.' },
  { n: 7, titulo: '¿Es mejor saber la verdad o vivir feliz?', corto: 'Verdad o felicidad',
    gancho: '¿Te conectarías a una vida feliz pero falsa?',
    bloques: ['A favor de la verdad', 'A favor de la felicidad', 'Casos de la vida real'],
    dilema: 'Decirle a tu amigo algo que le va a doler',
    investigar: ['La máquina de experiencias', 'La caverna de Platón', 'Kant y la mentira'] },
  { n: 8, titulo: 'La corrupción', corto: 'Corrupción',
    gancho: '¿La «mordida» cuenta?',
    bloques: ['Qué es', 'Por qué se normaliza', 'Cómo se combate'],
    dilema: 'Denunciar a un amigo que hace trampa',
    investigar: ['Índice de Transparencia Internacional', 'Encuesta del INEGI', 'Un caso real'] },
  { n: 9, titulo: 'La creación de la vida', corto: 'Creación de la vida',
    gancho: '¿Accidente, diseño o las dos?',
    bloques: ['Lo que cuentan las religiones', 'Lo que dice la ciencia', '¿Pueden convivir?'],
    dilema: 'Crear vida en un laboratorio',
    investigar: ['Miller y Urey', 'Un mito mesoamericano', 'Biología sintética'],
    cuidado: 'Respeto a todas las creencias.' },
  { n: 10, titulo: 'El papel del narco en la economía actual', corto: 'Narco y economía',
    gancho: '¿Cuánto toca el narco la economía de todos?',
    bloques: ['Cómo funciona como negocio', 'Lo que nos toca a todos', 'La narcocultura'],
    dilema: '¿Compartir narcocorridos es hacerles publicidad?',
    investigar: ['Tamaño del negocio, con fuente', 'Lavado de dinero', 'Narcocultura'],
    cuidado: 'Sin acusar a nadie con nombre y apellido.' },
  { n: 11, titulo: 'Gentrificación', corto: 'Gentrificación',
    gancho: 'Si suben las rentas en tu colonia, ¿ganas o pierdes?',
    bloques: ['Qué es', 'Cómo pasa', 'Quién gana y quién pierde'],
    dilema: '¿El progreso de unos justifica que otros se vayan?',
    investigar: ['Un caso en la Ciudad de México', 'El centro de Querétaro', 'Rentas por día en otras ciudades'] },
  { n: 12, titulo: 'Paranormal', corto: 'Paranormal',
    gancho: '¿Por qué creemos en fantasmas?',
    bloques: ['Leyendas y experiencias', 'Lo que explica la ciencia', 'El negocio del miedo'],
    dilema: 'Ganar dinero con el miedo de otros',
    investigar: ['Pareidolia y parálisis del sueño', 'Una leyenda queretana', 'Un fraude documentado'] },
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
