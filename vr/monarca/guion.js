/* EL GUION DE MONARCH EN DOS IDIOMAS (Carlos, 25 nov: «pon también el juego en inglés; al abrir, que elija el idioma el que
   controla la experiencia»). Lo que se DICE vive en narrador.js (español) y narrador-en.js (inglés); aquí vive lo que se
   VE: títulos, cifras clave (sin carteles, rotulos.js), botones, preguntas y materias.
   Cada texto es { es, en }; t(x, idioma) elige. Las cifras son las mismas en los dos idiomas y TODAS están en
   are/Documentation/MONARCH_XR.md (la prueba lo revisa). */
export const t = (x, l = 'es') => (x && typeof x === 'object' && !Array.isArray(x) ? (x[l] ?? x.es) : x);

export const UI = {
  idioma: { es: 'Idioma · Language', en: 'Idioma · Language' },
  entrega: { es: 'Entrega el visor', en: 'Hand over the headset' }, listoOperador: { es: 'Listo', en: 'Ready' }, ponte: { es: 'Ponle el visor y toca «Listo»', en: 'Put the headset on them and tap «Ready»' },
  empezar: { es: 'Empezar', en: 'Start' }, siguiente: { es: 'Siguiente', en: 'Next' }, atras: { es: 'Atrás', en: 'Back' },
  vozSi: { es: 'Voz: Sí', en: 'Voice: On' }, vozNo: { es: 'Voz: No', en: 'Voice: Off' },
  plantar: { es: 'Plantar', en: 'Plant' }, listo: { es: '¡Listo!', en: 'Done!' },
  correcto: { es: 'Correcto', en: 'Correct' }, casi: { es: 'Casi', en: 'Almost' }, era: { es: 'Era', en: 'It was' },
  materias: { es: 'Materias', en: 'Subjects' }, funciona: { es: 'Cómo funciona', en: 'How it works' },
  contamos: { es: 'Cómo te lo contamos', en: 'How we told it' }, creditos: { es: 'Créditos', en: 'Credits' },
  otraVez: { es: 'Otra vez', en: 'Again' }, de: { es: 'de', en: 'of' }, fuente: { es: 'Fuente', en: 'Source' },
  aqui: { es: 'Aquí', en: 'Here' }, saltar: { es: 'Palma arriba: saltar tutorial', en: 'Palm up: skip tutorial' },
  tutorial: { es: 'Tutorial', en: 'Tutorial' },
};

/* las escenas: id, foto 360°, la monarca, materias, cifras clave (en = qué tanto va la explicación cuando aparecen) */
export const ESCENAS = [
  { id: 'bienvenida', cielo: 'alps_field', monarca: 'vuela', titulo: { es: 'MONARCH', en: 'MONARCH' }, boton: { es: 'Empezar', en: 'Start' },
    claves: [] },
  { id: 'mariposa', cielo: 'alps_field', monarca: 'cerca', titulo: { es: 'La monarca', en: 'The monarch' }, materias: ['bio', 'qui'],
    fuente: 'NPS, Milkweed and Monarchs, 2023 · CCA, 2008',
    claves: [{ grande: { es: 'Algodoncillo', en: 'Milkweed' }, chico: { es: 'lo único que come la oruga', en: 'the only food of the caterpillar' }, en: .15 },
      { grande: { es: 'Cardenólidos', en: 'Cardenolides' }, chico: { es: 'química de defensa', en: 'chemical defense' }, en: .5 }] },
  { id: 'ciclo', cielo: 'alps_field', monarca: 'cerca', titulo: { es: 'Su ciclo de vida', en: 'Its life cycle' }, materias: ['bio', 'mat'],
    fuente: 'Monarch Joint Venture · CCA, 2008',
    etapas: [[{ es: 'Huevo', en: 'Egg' }, { es: '~4 días', en: '~4 days' }], [{ es: 'Oruga', en: 'Caterpillar' }, { es: '9 a 14 días', en: '9 to 14 days' }],
      [{ es: 'Crisálida', en: 'Chrysalis' }, { es: '9 a 15 días', en: '9 to 15 days' }], [{ es: 'Adulta', en: 'Adult' }, { es: 'seca sus alas', en: 'dries its wings' }]],
    claves: [{ grande: '5', chico: { es: 'etapas de oruga · 4 mudas', en: 'caterpillar stages · 4 molts' }, en: .12, pos: [-1.55, .55] },
      { grande: '× 2,000', chico: { es: 'su masa', en: 'its mass' }, en: .35, pos: [1.55, .55] },
      { grande: { es: '3 kg → 6 toneladas', en: '3 kg → 6 tonnes' }, chico: { es: 'si un bebé creciera igual', en: 'if a baby grew the same' }, en: .5, pos: [-1.55, .02] },
      { grande: { es: '4 semanas', en: '4 weeks' }, chico: { es: 'de huevo a adulta, en verano', en: 'egg to adult, in summer' }, en: .78, pos: [1.55, .02] }] },
  { id: 'flores', cielo: 'alps_field', monarca: 'vuela', juego: 'flores', titulo: { es: 'Flores en el camino', en: 'Flowers on the way' }, materias: ['bio', 'steam'],
    fuente: 'National Park Service', claves: [] },
  { id: 'maceta', cielo: 'alps_field', juego: 'maceta', titulo: { es: 'Tu maceta', en: 'Your pot' }, materias: ['bio', 'steam'], claves: [] },
  { id: 'migracion', cielo: null, mapa: true, titulo: { es: 'La migración', en: 'The migration' }, materias: ['fis', 'bio', 'steam'],
    fuente: 'USFWS, 2024 · U.S. Forest Service',
    claves: [{ grande: '+3,000 km', chico: { es: 'desde el norte', en: 'from the north' }, en: .08, pos: [-1.3, .62] },
      { grande: { es: '80-160 km/día', en: '80-160 km/day' }, chico: 'v = d / t', en: .3, pos: [1.3, .62] },
      { grande: { es: '9 meses', en: '9 months' }, chico: { es: 'vive la que baja', en: 'the one that flies south lives' }, en: .52, pos: [-1.3, .05] },
      { grande: { es: 'hijas y nietas', en: 'daughters, granddaughters' }, chico: { es: 'terminan el regreso', en: 'finish the return' }, en: .72, pos: [1.3, .05] }] },
  { id: 'cuerpo', cielo: 'alps_field', monarca: 'vuela', titulo: { es: '¿Y si fueras tú?', en: 'What if it were you?' }, materias: ['ef', 'mat'],
    fuente: { es: 'Compendio de Actividad Física, 2024', en: 'Compendium of Physical Activities, 2024' },
    claves: [{ grande: '60 kg', chico: { es: 'una persona', en: 'one person' }, en: .3 }, { grande: '3,000 km', chico: { es: 'la ruta', en: 'the route' }, en: .45 }],
    opciones: [
      [{ es: 'Caminando', en: 'Walking' }, [{ grande: '600 h', chico: { es: 'a 5 km/h · 75 días de 8 h', en: 'at 5 km/h · 75 days of 8 h' } },
        { grande: '136,800 kcal', chico: '3.8 MET × 60 kg × 600 h' }, { grande: { es: '68 días', en: '68 days' }, chico: { es: 'de comida de 2,000 kcal', en: 'of 2,000 kcal food' } }]],
      [{ es: 'Corriendo', en: 'Running' }, [{ grande: '300 h', chico: { es: 'a 10 km/h · la mitad', en: 'at 10 km/h · half the time' } },
        { grande: '167,400 kcal', chico: '9.3 MET × 60 kg × 300 h' }, { grande: { es: 'más energía', en: 'more energy' }, chico: { es: 'llegas antes, gastas más', en: 'you arrive sooner, you spend more' } }]]] },
  { id: 'santuario', cielo: 'misty_pines', monarca: 'colonia', titulo: { es: 'El santuario', en: 'The sanctuary' }, materias: ['bio', 'fis'],
    fuente: 'U.S. Forest Service · CONANP · UNESCO',
    claves: [{ grande: { es: '11-12 montañas', en: '11-12 mountains' }, chico: { es: 'Michoacán y Edomex', en: 'Michoacán and State of Mexico' }, en: .1 },
      { grande: { es: 'Oyamel', en: 'Oyamel fir' }, chico: 'Abies religiosa', en: .3 },
      { grande: '56,259 ha', chico: { es: 'la Reserva', en: 'the Reserve' }, en: .45 },
      { grande: '2008', chico: { es: 'Patrimonio Mundial', en: 'World Heritage' }, en: .62 }] },
  { id: 'tala', cielo: 'barnaslingan_02', titulo: { es: 'Amenaza: el bosque', en: 'Threat: the forest' }, materias: ['eti', 'mat'], fuente: { es: 'WWF México y UNAM, 2026', en: 'WWF Mexico and UNAM, 2026' },
    claves: [{ grande: '2.55 ha', chico: { es: 'degradadas en un año', en: 'degraded in one year' }, en: .2 },
      { grande: '1.85 ha', chico: { es: 'tala ilegal', en: 'illegal logging' }, en: .45, pos: [-1.05, .05] }, { grande: '0.58 ha', chico: { es: 'incendios', en: 'fires' }, en: .55, pos: [0, -.05] },
      { grande: '0.11 ha', chico: { es: 'sequía', en: 'drought' }, en: .62, pos: [1.05, .05] }] },
  { id: 'campo', cielo: 'misty_farm_road', titulo: { es: 'Amenaza: sin algodoncillo', en: 'Threat: no milkweed' }, materias: ['bio', 'eti'], fuente: 'National Park Service · UICN · National Geographic, 2023',
    claves: [{ grande: { es: 'Sin algodoncillo', en: 'No milkweed' }, chico: { es: 'no hay orugas', en: 'no caterpillars' }, en: .1 },
      { grande: { es: '2022: En Peligro', en: '2022: Endangered' }, chico: 'UICN', en: .45 }, { grande: { es: '2023: Vulnerable', en: '2023: Vulnerable' }, chico: { es: 'revisó sus cálculos', en: 'revised its models' }, en: .62 }] },
  { id: 'decision', cielo: 'misty_pines', titulo: { es: 'Tú decides', en: 'You decide' }, materias: ['eti'], claves: [],
    opciones: [
      [{ es: 'Talar', en: 'Log it' }, { es: 'Hay dinero ahora, pero el bosque tarda en volver y las mariposas pierden su refugio de invierno.', en: 'Money now, but the forest takes a long time to come back and the butterflies lose their winter shelter.' }],
      [{ es: 'Conservar', en: 'Protect it' }, { es: 'El bosque queda, pero tu familia no recibe nada por cuidarlo. ¿Quién debería pagar por conservar?', en: 'The forest stays, but your family gets nothing for caring for it. Who should pay for conservation?' }],
      [{ es: 'Turismo', en: 'Tourism' }, { es: 'Las visitas guiadas pueden dar ingresos sin talar, si se respetan los límites para no molestar a las colonias.', en: 'Guided visits can bring income without logging, if the limits are respected so the colonies are not disturbed.' }]] },
  { id: 'cuestionario', cielo: 'alps_field', titulo: { es: 'Cuestionario', en: 'Quiz' } },
  { id: 'final', cielo: 'misty_pines', monarca: 'vuela', titulo: { es: 'Temporada 2025-2026', en: 'Season 2025-2026' }, materias: ['mat'], fuente: { es: 'WWF México y CONANP, 2026', en: 'WWF Mexico and CONANP, 2026' },
    claves: [{ grande: '2.93 ha', chico: { es: 'de colonias', en: 'of colonies' }, en: .05 }, { grande: '2.93 ÷ 1.79 = 1.64', chico: { es: '64 % más', en: '64% more' }, en: .15 },
      { grande: { es: '≈ 4 canchas', en: '≈ 4 soccer fields' }, chico: { es: 'de fútbol de 105 × 68 m', en: 'of 105 × 68 m' }, en: .28 },
      { grande: '18.19 ha', chico: { es: 'máximo, 1996-97', en: 'highest, 1996-97' }, en: .5 }, { grande: '0.67 ha', chico: { es: 'mínimo, 2013-14', en: 'lowest, 2013-14' }, en: .62 }] },
];
/* el cuestionario: [pregunta, opciones, cuál es] */
export const PREGUNTAS = [
  [{ es: '¿Dónde pone sus huevos la monarca?', en: 'Where does the monarch lay its eggs?' }, [{ es: 'En cualquier flor', en: 'On any flower' }, { es: 'En el algodoncillo', en: 'On milkweed' }, { es: 'En el oyamel', en: 'On the oyamel fir' }], 1],
  [{ es: '¿En qué orden cambia la monarca?', en: 'In what order does the monarch change?' }, [{ es: 'Oruga, huevo, mariposa', en: 'Caterpillar, egg, butterfly' }, { es: 'Huevo, oruga, crisálida, mariposa', en: 'Egg, caterpillar, chrysalis, butterfly' }, { es: 'Crisálida, oruga, mariposa', en: 'Chrysalis, caterpillar, butterfly' }], 1],
  [{ es: '¿Una sola mariposa termina el regreso hasta Canadá?', en: 'Does a single butterfly finish the return to Canada?' }, [{ es: 'Sí, cada año', en: 'Yes, every year' }, { es: 'No: lo terminan sus hijas y nietas', en: 'No: its daughters and granddaughters do' }, { es: 'Sólo las de verano', en: 'Only the summer ones' }], 1],
  [{ es: '¿Qué árbol domina en su santuario?', en: 'Which tree dominates its sanctuary?' }, [{ es: 'El oyamel', en: 'The oyamel fir' }, { es: 'El pino de playa', en: 'The beach pine' }, { es: 'La palmera', en: 'The palm tree' }], 0],
  [{ es: '¿Qué degradó más bosque en 2024-2025?', en: 'What degraded the most forest in 2024-2025?' }, [{ es: 'La sequía', en: 'Drought' }, { es: 'Los incendios', en: 'Fires' }, { es: 'La tala ilegal', en: 'Illegal logging' }], 2],
  [{ es: '¿Por qué casi ningún animal se la come?', en: 'Why do almost no animals eat it?' }, [{ es: 'Por su color', en: 'Because of its color' }, { es: 'Guarda los cardenólidos', en: 'It stores cardenolides' }, { es: 'Vuela muy rápido', en: 'It flies very fast' }], 1],
  [{ es: '3,000 km: ¿qué gasta más energía en total?', en: '3,000 km: what uses more energy in total?' }, [{ es: 'Caminando', en: 'Walking' }, { es: 'Corriendo', en: 'Running' }, { es: 'Igual', en: 'The same' }], 1],
  [{ es: 'De 1.79 ha a 2.93 ha: ¿cuánto creció?', en: 'From 1.79 ha to 2.93 ha: how much did it grow?' }, ['64 %', '29 %', '164 %'], 0],
];
export const NOMBRE_MATERIA = {
  bio: { es: 'Biología', en: 'Biology' }, qui: { es: 'Química', en: 'Chemistry' }, fis: { es: 'Física', en: 'Physics' }, mat: { es: 'Matemáticas', en: 'Math' },
  ef: { es: 'Educación física', en: 'Physical education' }, eti: { es: 'Ética', en: 'Ethics' }, steam: 'STEAM',
  comp: { es: 'Mantenimiento de cómputo', en: 'Computer maintenance' }, com: { es: 'Expresión y comunicación', en: 'Expression and communication' },
};
export const MATERIAS = [
  ['bio', { es: 'ciclo de vida, metamorfosis, diapausa y migración de varias generaciones', en: 'life cycle, metamorphosis, diapause and a multi-generation migration' }],
  ['qui', { es: 'los cardenólidos del algodoncillo: la defensa de la oruga', en: 'milkweed cardenolides: the caterpillar’s defense' }],
  ['fis', { es: 'velocidad (v = d / t): 80 a 160 km por día; el frío del santuario', en: 'speed (v = d / t): 80 to 160 km per day; the cold of the sanctuary' }],
  ['mat', { es: 'proporciones y porcentajes: 2,000 veces su masa, 64 % más colonias', en: 'ratios and percentages: 2,000 times its mass, 64% more colonies' }],
  ['ef', { es: 'METs y calorías: caminar contra correr 3,000 km', en: 'METs and calories: walking versus running 3,000 km' }],
  ['eti', { es: 'el dilema del bosque: talar, conservar o turismo', en: 'the forest dilemma: log, protect or tourism' }],
  ['steam', { es: 'mapa de la ruta, plantar con tus manos y realidad virtual', en: 'route map, planting with your hands and virtual reality' }],
  ['comp', { es: 'el visor es un teléfono: sensores, cámara, procesador y calor', en: 'the headset is a phone: sensors, camera, processor and heat' }],
  ['com', { es: 'un narrador en segunda persona, con ironía y datos con fuente', en: 'a second-person narrator, with irony and sourced facts' }],
];
export const FUNCIONA = {
  es: ['El giroscopio sigue tu cabeza.', 'La cámara ve tus manos.', 'El procesador dibuja todo muchas veces por segundo.', 'Cuídalo: sin sol directo, lente limpia y descanso si se calienta.'],
  en: ['The gyroscope follows your head.', 'The camera sees your hands.', 'The processor draws everything many times per second.', 'Take care of it: no direct sun, clean lens, and a break if it gets hot.'],
};
export const CONTAMOS = {
  es: ['Narrador en segunda persona.', 'Preguntas, ironía y datos con fuente.', 'Amable al principio, con más chispa cuando te distraías.'],
  en: ['A second-person narrator.', 'Questions, irony and sourced facts.', 'Kind at first, a bit cheekier when you got distracted.'],
};
export const CREDITOS = {
  es: ['Monarca escaneada: Virginia Tech University Libraries (CC BY 4.0).', 'Ciclo de vida: fotos de SidPix y USFWS en Flickr (CC BY 2.0).', 'Flores y fotos 360°: Poly Haven (CC0). Mapa: Natural Earth.',
    'Datos: USFWS, US Forest Service, Monarch Joint Venture, CCA, UNESCO, WWF México, CONANP, UNAM, UICN, NPS.', 'Calorías: Compendio de Actividad Física para Adultos, 2024.'],
  en: ['Scanned monarch: Virginia Tech University Libraries (CC BY 4.0).', 'Life cycle: photos by SidPix and USFWS on Flickr (CC BY 2.0).', 'Flowers and 360° photos: Poly Haven (CC0). Map: Natural Earth.',
    'Data: USFWS, US Forest Service, Monarch Joint Venture, CEC, UNESCO, WWF Mexico, CONANP, UNAM, IUCN, NPS.', 'Calories: 2024 Adult Compendium of Physical Activities.'],
};
