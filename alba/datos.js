/* Alba · datos fijos: catálogos del registro, las fases explicadas en sencillo, fuentes y mensajes del día.
   Los poemas son fragmentos breves de autores en dominio público; las traducciones marcadas «libre»
   son nuestras. Las frases de ánimo están escritas para esta app. */
var ALBA = window.ALBA = {};

ALBA.flujo = [
  { v: 0, t: 'Nada' }, { v: 1, t: 'Manchado' }, { v: 2, t: 'Ligero' }, { v: 3, t: 'Medio' }, { v: 4, t: 'Abundante' }
];
ALBA.sintomas = [
  { id: 'colicos', t: 'Cólicos', ic: 'activity' }, { id: 'cabeza', t: 'Dolor de cabeza', ic: 'brain' },
  { id: 'hinchazon', t: 'Hinchazón', ic: 'cloud' }, { id: 'senos', t: 'Senos sensibles', ic: 'heart-pulse' },
  { id: 'acne', t: 'Acné', ic: 'sparkle' }, { id: 'espalda', t: 'Dolor de espalda', ic: 'bone' },
  { id: 'nauseas', t: 'Náuseas', ic: 'waves-horizontal' }, { id: 'cansancio', t: 'Cansancio', ic: 'battery-low' },
  { id: 'antojos', t: 'Antojos', ic: 'cookie' }, { id: 'insomnio', t: 'Insomnio', ic: 'moon-star' },
  { id: 'mareo', t: 'Mareo', ic: 'wind' }, { id: 'diarrea', t: 'Malestar estomacal', ic: 'circle-alert' }
];
ALBA.animos = [
  { id: 'feliz', t: 'Feliz', ic: 'face-grinning' }, { id: 'tranquila', t: 'Tranquila', ic: 'face-slightly-smiling' },
  { id: 'energia', t: 'Con energía', ic: 'zap' }, { id: 'sensible', t: 'Sensible', ic: 'droplet' },
  { id: 'triste', t: 'Triste', ic: 'face-slightly-frowning' }, { id: 'ansiosa', t: 'Ansiosa', ic: 'cloud-lightning' },
  { id: 'irritable', t: 'Irritable', ic: 'face-angry' }, { id: 'estresada', t: 'Estresada', ic: 'flame' }
];
ALBA.energia = [{ v: 1, t: 'Baja' }, { v: 2, t: 'Normal' }, { v: 3, t: 'Alta' }];
/* el flujo vaginal cambia a lo largo del ciclo; el elástico, como clara de huevo, suele acompañar la ovulación */
ALBA.moco = [
  { id: 'seco', t: 'Seco' }, { id: 'pegajoso', t: 'Pegajoso' }, { id: 'cremoso', t: 'Cremoso' },
  { id: 'elastico', t: 'Elástico, como clara de huevo' }, { id: 'acuoso', t: 'Acuoso' }
];

ALBA.fases = {
  menstruacion: { t: 'Menstruación', c: 'periodo',
    que: 'Tu cuerpo está renovando el endometrio. Es normal sentir cansancio, cólicos o más sensibilidad.',
    tip: 'Calor en el vientre, agua y descanso ayudan. Si el dolor no te deja hacer tu vida, coméntalo con tu ginecóloga.' },
  folicular: { t: 'Fase folicular', c: 'folicular',
    que: 'Sube el estrógeno. Muchas mujeres sienten más energía, mejor ánimo y la piel más bonita.',
    tip: 'Buen momento para empezar proyectos, moverte y hacer planes.' },
  fertil: { t: 'Ventana fértil', c: 'fertil',
    que: 'Son los días con más probabilidad de embarazo. Es una estimación hecha con tus fechas.',
    tip: 'No la uses como método anticonceptivo: los ciclos cambian y la app sólo calcula.' },
  ovulacion: { t: 'Ovulación estimada', c: 'ovulacion',
    que: 'Alrededor de hoy se libera un óvulo. Algunas notan flujo elástico o un leve dolor de un lado.',
    tip: 'Si registras tu flujo y temperatura, con los meses la estimación se afina.' },
  lutea: { t: 'Fase lútea', c: 'lutea',
    que: 'Sube la progesterona. Puede haber más hambre, más sueño o el ánimo más cambiante.',
    tip: 'Comer a tus horas, dormir bien y moverte un poco suelen ayudar.' },
  premenstrual: { t: 'Días premenstruales', c: 'spm',
    que: 'Faltan pocos días para tu periodo. La hinchazón o los cambios de ánimo son hormonales y pasan.',
    tip: 'Ten a la mano lo que te haga sentir bien. Sé amable contigo.' }
};

/* rangos de referencia: FIGO 2018 y ACOG; ventana fértil: Wilcox y cols., NEJM 1995 */
ALBA.fuentes = [
  'FIGO (2018). Sistemas de clasificación del sangrado uterino anormal: ciclos de 24 a 38 días, sangrado de hasta 8 días y variación de hasta 7–9 días.',
  'ACOG. La menstruación en niñas y adolescentes como signo vital (Opinión del Comité 651).',
  'NHS (Reino Unido). Periods and fertility in the menstrual cycle.',
  'Wilcox AJ, Weinberg CR, Baird DD. New England Journal of Medicine, 1995;333:1517–21: la ventana fértil abarca el día de la ovulación y los 5 días previos.'
];

ALBA.poemas = [
  { v: ['¿Qué es poesía?, dices mientras clavas', 'en mi pupila tu pupila azul.', '¿Qué es poesía? ¿Y tú me lo preguntas?', 'Poesía... eres tú.'], a: 'Gustavo Adolfo Bécquer', o: 'Rima XXI' },
  { v: ['Por una mirada, un mundo;', 'por una sonrisa, un cielo;', 'por un beso... ¡yo no sé', 'qué te diera por un beso!'], a: 'Gustavo Adolfo Bécquer', o: 'Rima XXIII' },
  { v: ['Hoy la tierra y los cielos me sonríen;', 'hoy llega al fondo de mi alma el sol;', 'hoy la he visto..., la he visto y me ha mirado...', '¡Hoy creo en Dios!'], a: 'Gustavo Adolfo Bécquer', o: 'Rima XVII' },
  { v: ['Los invisibles átomos del aire', 'en derredor palpitan y se inflaman;', 'el cielo se deshace en rayos de oro;', 'la tierra se estremece alborozada.'], a: 'Gustavo Adolfo Bécquer', o: 'Rima X' },
  { v: ['Dos rojas lenguas de fuego', 'que a un mismo tronco enlazadas', 'se aproximan, y al besarse', 'forman una sola llama.'], a: 'Gustavo Adolfo Bécquer', o: 'Rima XXIV' },
  { v: ['Esta tarde, mi bien, cuando te hablaba,', 'como en tu rostro y tus acciones vía', 'que con palabras no te persuadía,', 'que el corazón me vieses deseaba.'], a: 'Sor Juana Inés de la Cruz', o: 'Soneto' },
  { v: ['Amé, fui amado, el sol acarició mi faz.', '¡Vida, nada me debes! ¡Vida, estamos en paz!'], a: 'Amado Nervo', o: 'En paz' },
  { v: ['creer que un cielo en un infierno cabe,', 'dar la vida y el alma a un desengaño;', 'esto es amor, quien lo probó lo sabe.'], a: 'Lope de Vega', o: 'Desmayarse, atreverse, estar furioso' },
  { v: ['serán ceniza, mas tendrá sentido;', 'polvo serán, mas polvo enamorado.'], a: 'Francisco de Quevedo', o: 'Amor constante más allá de la muerte' },
  { v: ['Escrito está en mi alma vuestro gesto,', 'y cuanto yo escribir de vos deseo;', 'vos sola lo escribistes, yo lo leo', 'tan solo, que aun de vos me guardo en esto.'], a: 'Garcilaso de la Vega', o: 'Soneto V' },
  { v: ['¡Pues bien! Yo necesito', 'decirte que te adoro,', 'decirte que te quiero', 'con todo el corazón.'], a: 'Manuel Acuña', o: 'Nocturno a Rosario' },
  { v: ['Amar, amar, amar, amar siempre, con todo', 'el ser y con la tierra y con el cielo,', 'con lo claro del sol y lo oscuro del lodo;', 'amar por toda ciencia y amar por todo anhelo.'], a: 'Rubén Darío', o: 'Amo, amas' },
  { v: ['Caminante, no hay camino,', 'se hace camino al andar.'], a: 'Antonio Machado', o: 'Proverbios y cantares' },
  { v: ['¿Te compararé con un día de verano?', 'Tú eres más hermosa y más serena.'], a: 'William Shakespeare', o: 'Soneto 18 · traducción libre' },
  { v: ['El amor no es amor', 'si cambia cuando encuentra un cambio.'], a: 'William Shakespeare', o: 'Soneto 116 · traducción libre' },
  { v: ['¿Cómo te amo?', 'Déjame contar las maneras.'], a: 'Elizabeth Barrett Browning', o: 'Soneto 43 · traducción libre' },
  { v: ['La esperanza es esa cosa con plumas', 'que se posa en el alma', 'y canta la melodía sin palabras', 'y no se detiene nunca.'], a: 'Emily Dickinson', o: '«Hope» is the thing with feathers · traducción libre' },
  { v: ['Existo tal como soy:', 'con eso basta.'], a: 'Walt Whitman', o: 'Canto de mí mismo · traducción libre' }
];

ALBA.frases = [
  'Eres más fuerte de lo que crees, y más querida de lo que imaginas.',
  'Hoy no tienes que poder con todo. Basta con que te trates bonito.',
  'Tu forma de ver el mundo lo hace más amable.',
  'Cada día contigo es mi lugar favorito.',
  'Tu cuerpo hace cosas increíbles todos los días. Escúchalo.',
  'Mereces descanso sin sentir culpa.',
  'Lo estás haciendo mejor de lo que piensas.',
  'Tu risa arregla días enteros.',
  'Eres valiente incluso los días en que no te sientes así.',
  'Lo que hoy cuesta, mañana será historia que contar.',
  'Brillas sin darte cuenta, y eso es lo más bonito.',
  'Pide ayuda cuando la necesites: eso también es fuerza.',
  'Hoy es un buen día para ser tu propia prioridad.',
  'Tu calma es un regalo para quien está a tu lado.',
  'No estás sola: aquí hay alguien que te quiere de verdad.',
  'Eres hogar.',
  'Tus sueños son tan válidos como tus días difíciles. Ve por ellos.',
  'Un paso pequeño también es avanzar.',
  'Hay personas que iluminan sin hacer ruido. Tú eres una.',
  'Que hoy te pase algo que te haga sonreír sin razón.',
  'Te mereces todo lo bonito que das.',
  'Tu sensibilidad no es debilidad: es tu manera de sentir el mundo en grande.',
  'Hoy, respira hondo. Ya llegaste hasta aquí.',
  'Me gusta quién eres cuando nadie te ve.',
  'Tu esfuerzo se nota, aunque a veces no te lo digan.',
  'Elige hoy algo que te haga bien, por pequeño que sea.',
  'Eres la casualidad más bonita que me ha pasado.',
  'Los días grises también terminan, y tú sigues aquí, entera.',
  'Confía en tu ritmo: no tienes que ir al de nadie.',
  'Que el mundo sea suave contigo hoy.',
  'Tu corazón es de esos que hacen falta.',
  'Hoy puedes empezar de nuevo, cuantas veces haga falta.',
  'Admiro cómo sigues adelante.',
  'Eres capaz de cosas que todavía no imaginas.',
  'Tu presencia hace que todo se sienta en su lugar.',
  'Lo mejor de mi día suele tener tu nombre.',
  'Ten paciencia contigo: estás floreciendo.',
  'Eres suficiente, hoy y siempre.',
  'Gracias por existir así, tal cual.',
  'Hoy te toca recibir tanto cariño como el que das.',
  'Tu luz no depende de un buen día: es tuya.'
];

/* ═════════ la guía ═════════
   Cuidados: ACOG (Dysmenorrhea: Painful Periods), NHS (Period pain) y Mayo Clinic.
   Salud sexual: OMS (Planificación familiar, manual mundial, 2022), CDC (efectividad con uso típico) e IMSS.
   Lenguaje sencillo y clínico; nada sustituye a su ginecóloga. */
ALBA.guia = {
  cuidados: [
    { ic: 'activity', t: 'Cólicos fuertes: qué hacer ahora', abierta: true, items: [
      'Calor en el vientre bajo: bolsa de agua caliente o parche térmico de 15 a 20 minutos. Pon una tela en medio y no te duermas con ella encima.',
      'Un antiinflamatorio como ibuprofeno o naproxeno funciona mejor si lo tomas en cuanto empieza el dolor o el sangrado, con algo de comida. Sigue la dosis del empaque o la que te indique tu médica.',
      'Si no puedes tomar antiinflamatorios (úlcera, problemas de riñón, asma que empeora con aspirina, alergia o embarazo), el paracetamol es una alternativa. Si dudas, pregunta en la farmacia.',
      'Muévete suave: caminar, estirarte o yoga ligero ayudan a que el útero se relaje.',
      'Acuéstate de lado con las rodillas hacia el pecho y date un masaje circular suave en el vientre bajo.',
      'Toma agua y algo tibio, como manzanilla o jengibre. Esos días baja el café, el alcohol y la sal.',
      'Descansa: dormir bien hace que el dolor se sienta menos.'
    ] },
    { ic: 'siren', t: 'Ve a urgencias si…', alerta: true, items: [
      'El dolor es muy fuerte, repentino o de un solo lado, sobre todo si tu periodo está retrasado o podrías estar embarazada.',
      'Tienes fiebre, escalofríos o flujo con mal olor junto con el dolor.',
      'Te desmayas, te mareas mucho o te sientes muy débil.',
      'El sangrado empapa una toalla o un tampón cada hora durante dos horas seguidas, o salen coágulos más grandes que una moneda de diez pesos.',
      'El dolor no cede con analgésicos y no te deja moverte.'
    ], nota: 'Emergencias en México: 911.' },
    { ic: 'stethoscope', t: 'Haz cita con tu ginecóloga si…', items: [
      'Los cólicos te hacen faltar a la escuela o al trabajo casi cada mes.',
      'El dolor es nuevo, distinto al de siempre o empeora con los meses.',
      'Te duelen las relaciones sexuales, o te duele al orinar o al ir al baño durante el periodo.',
      'Tu periodo dura más de 8 días, tus ciclos son de menos de 21 o de más de 35 días, o cambian mucho de un mes a otro.',
      'Sangras entre periodos o después de las relaciones.',
      'Los cambios de ánimo antes del periodo afectan tu vida o tus relaciones.'
    ], nota: 'El dolor menstrual muy fuerte no es algo que tengas que aguantar: tiene tratamiento, y a veces es señal de endometriosis u otra condición que se puede atender.' },
    { ic: 'heart-pulse', t: 'Otros malestares del periodo', pares: [
      ['Náuseas o diarrea', 'Son comunes por las mismas sustancias que causan los cólicos. Come poco y seguido y toma agua o suero. Si no retienes líquidos, consulta.'],
      ['Dolor de cabeza', 'Agua, descanso y un analgésico. Si tienes migraña con aura y tomas pastillas con estrógeno, coméntalo con tu médica.'],
      ['Hinchazón', 'Menos sal, más agua y moverte un poco. Suele bajar cuando empieza el periodo.'],
      ['Senos sensibles', 'Un brasier cómodo y calor o frío local. Si notas una bolita que no se va después del periodo, que te la revisen.'],
      ['Cansancio', 'Duerme un poco más. Si sangras mucho, come hierro (frijoles, lentejas, espinaca, carne) y pide que te revisen anemia si te sientes muy cansada o pálida.'],
      ['Ánimo bajo o ansiedad', 'Es hormonal y pasa. Ayudan el ejercicio, dormir y hablarlo. Si sientes que no puedes más o piensas en hacerte daño, busca ayuda ya: Línea de la Vida, 800 911 2000, las 24 horas.']
    ] },
    { ic: 'calendar-clock', t: 'Si tu periodo se retrasa', items: [
      'El estrés, los viajes, enfermarte o los cambios de peso pueden moverlo unos días.',
      'Si hubo relaciones sin protección, una prueba de embarazo es confiable desde el primer día de retraso, mejor con la primera orina de la mañana.',
      'Si pasan tres meses sin periodo, consulta.'
    ] },
    { ic: 'shopping-bag', t: 'Tu kit para esos días', items: [
      'Bolsa de agua caliente o parches térmicos.', 'El analgésico que te funcione.', 'Toallas, tampones o tu copa, y una muda de ropa interior.',
      'Una botella de agua y algo de comer.', 'Una infusión que te guste.'
    ] }
  ],
  sexual: [
    { ic: 'heart-handshake', t: 'Lo primero', abierta: true, items: [
      'Una vida sexual sana se basa en el consentimiento: se vale decir que no, o parar, en cualquier momento.',
      'Y en cuidarse: de un embarazo que no buscan y de las infecciones. Hablarlo en pareja es parte del cuidado.'
    ] },
    { ic: 'shield-check', t: 'Métodos y qué hace cada uno', tabla: [
      ['Condón externo', 'Barrera que impide el paso de los espermatozoides.', '87 de 100', true],
      ['Condón interno', 'Barrera que se coloca dentro de la vagina.', '79 de 100', true],
      ['Pastilla', 'Hormonas que evitan la ovulación. Una diaria, a la misma hora.', '93 de 100', false],
      ['Parche o anillo', 'Las mismas hormonas: el parche se cambia cada semana y el anillo cada mes.', '93 de 100', false],
      ['Inyección', 'Hormonas cada mes o cada tres meses.', '96 de 100', false],
      ['Implante', 'Varilla pequeña en el brazo con hormonas. Dura de 3 a 5 años.', 'Más de 99', false],
      ['DIU de cobre', 'Sin hormonas, dentro del útero. Dura 10 años o más.', 'Más de 99', false],
      ['DIU hormonal', 'Libera una hormona dentro del útero. Dura de 3 a 8 años.', 'Más de 99', false],
      ['Operaciones', 'Salpingoclasia (en ella) o vasectomía (en él). Son permanentes.', 'Más de 99', false],
      ['Calendario o apps', 'Evitar los días fértiles estimados.', '77 de 100', false],
      ['Retiro', 'Salir antes de eyacular.', '80 de 100', false]
    ], nota: 'Cuántas de cada 100 parejas no se embarazan en un año con el uso de la vida real (CDC/OMS). Sólo el condón protege de infecciones; combinarlo con otro método da la mejor protección. En los centros de salud públicos suelen ser gratuitos. Alba no es un método anticonceptivo.' },
    { ic: 'shopping-bag', t: 'Qué comprar', pares: [
      ['Condones', 'De látex, o de poliuretano si hay alergia al látex. Revisa la caducidad y que el empaque tenga aire (que no esté roto).'],
      ['Lubricante', 'A base de agua o de silicón: son seguros con el condón. Los aceites (coco, vaselina, cremas) rompen el látex.'],
      ['Prueba de embarazo', 'Para tener en casa. Es confiable desde el primer día de retraso.'],
      ['Anticonceptivo de emergencia', 'La «pastilla del día siguiente» (levonorgestrel) se vende sin receta en farmacias. Tenerla a la mano ayuda si algo falla.'],
      ['Pruebas de ovulación', 'Sólo si buscan embarazo: detectan la hormona que sube antes de ovular.']
    ] },
    { ic: 'list-checks', t: 'Cómo usar el condón', pasos: [
      'Revisa la fecha y ábrelo con los dedos, nunca con los dientes ni con tijeras.',
      'Colócalo antes de cualquier contacto genital.',
      'Aprieta la punta para sacar el aire y desenróllalo hasta la base.',
      'Si sientes que se rompe o se sale, detente y pon uno nuevo.',
      'Al terminar, sujétalo de la base al retirarlo y tíralo a la basura, no al escusado.',
      'Uno nuevo cada vez, y nunca dos al mismo tiempo: se rompen.'
    ] },
    { ic: 'pill', t: 'Si algo falló', items: [
      'Si el condón se rompió o no usaron método, la pastilla de emergencia funciona mejor entre más pronto se tome: idealmente en las primeras 24 horas y hasta 72 horas (3 días).',
      'No es abortiva y no sirve como método de rutina.',
      'Si después tu periodo se retrasa más de una semana, haz una prueba de embarazo.'
    ] },
    { ic: 'test-tube', t: 'Prueba de embarazo, paso a paso', pasos: [
      'Úsala desde el primer día de retraso; con la primera orina de la mañana es más confiable.',
      'Sigue las instrucciones de la marca: casi siempre son unos segundos en la orina y esperar de 3 a 5 minutos.',
      'Una línea tenue también cuenta como positivo: confírmalo con tu médica.',
      'Si sale negativa y el periodo no llega, repítela en unos días.'
    ] },
    { ic: 'sparkles', t: 'Cuidados e higiene', items: [
      'Orinar después de las relaciones ayuda a prevenir infecciones urinarias.',
      'Lávate por fuera con agua y jabón neutro. Las duchas vaginales alteran tu flora y no se recomiendan.',
      'Usa ropa interior de algodón y cámbiate pronto la ropa mojada.',
      'Si hay ardor, comezón, flujo con mal olor, llagas o dolor, consulta: casi todo se trata fácil.'
    ] },
    { ic: 'shield-plus', t: 'Infecciones de transmisión sexual', items: [
      'El condón es el único método que protege de las ITS.',
      'Hacerse pruebas de VIH, sífilis y hepatitis es parte de cuidarse. En México hay pruebas gratuitas en centros de salud y en los CAPASITS.',
      'La vacuna contra el VPH previene el cáncer cervicouterino: pregunta si te toca.',
      'Papanicolaou o prueba de VPH, cada cuanto te indique tu ginecóloga.'
    ] },
    { ic: 'heart', t: 'Si duele', items: [
      'Las relaciones no deberían doler. Ayudan el lubricante, tomarse su tiempo y decir lo que cada quien siente.',
      'Si el dolor sigue, coméntalo con tu ginecóloga: tiene solución.'
    ] }
  ]
};
ALBA.fuentesGuia = [
  'ACOG. Dysmenorrhea: Painful Periods (FAQ046).',
  'NHS. Period pain · Heavy periods.',
  'OMS. Planificación familiar: un manual mundial para proveedores (2022).',
  'CDC. Effectiveness of family planning methods (uso típico).',
  'IMSS · Secretaría de Salud. Métodos anticonceptivos y pruebas gratuitas.'
];
