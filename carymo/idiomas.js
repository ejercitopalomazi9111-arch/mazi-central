/* ══════════════════════════════════════════════════════════════════════════
   IDIOMAS EN CARYMO · cursos escritos a mano, al estilo Duolingo
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 14 nov: «falta todavía lo de idiomas… lo de Duolingo, todo».
   Se juegan con el mismo camino de la app: lección de ideas cortas, ejercicios
   (escoger, completar, escribir, unir, ordenar la frase), tarjetas, simulacro y
   examen, con XP, racha y combo. El contenido NO lo inventa la IA en vivo: está
   escrito aquí y revisado, para que una palabra nunca salga mal enseñada. Las
   cátedras del pizarrón sí las da la IA, sobre el tema de cada lección.

   Cada tema: { titulo, resumen, leccion: L(título, [[título, texto, icono]…], dato), preguntas: […] }
   ═════════════════════════════════════════════════════════════════════════ */
const L = (titulo, ideas, dato) => ({ titulo, ideas: ideas.map(([t, x, i]) => ({ titulo: t, texto: x, icono: i })), dato });
const op = (pregunta, opciones, porque, pista = '') => ({ tipo: 'opcion', pregunta, opciones, correcta: 0, porque, pista });
const hueco = (frase, respuesta, distractores, porque, pista = '') => ({ tipo: 'hueco', frase, respuesta, distractores, porque, pista });
const escribe = (pregunta, respuesta, aceptadas, porque, pista = '') => ({ tipo: 'escribir', pregunta, respuesta, aceptadas, porque, pista });
const unir = (pregunta, pares, porque) => ({ tipo: 'unir', pregunta, pares, porque });
const ordena = (frase, porque) => ({ tipo: 'ordenar', pregunta: 'Ordena la frase', pasos: frase.split(' '), porque });

export const IDIOMAS = [
  {
    id: 'idi-ingles-1', idioma: 'Inglés', titulo: 'Inglés desde cero', color: '#2F5DA8', icono: 'languages', nivel: 'A1',
    frase: 'Saluda, preséntate, pide de comer y muévete en otro país.',
    unidades: [
      { titulo: 'Lo básico', frase: 'Tus primeras palabras.', temas: [
        { titulo: 'Saludos', resumen: 'Hello, good morning, goodbye y cómo estás.',
          leccion: L('Saludos', [
            ['Hola', '**Hello** es «hola». Entre amigos también se dice **Hi**.', 'hand'],
            ['Según la hora', '**Good morning** (buenos días), **good afternoon** (buenas tardes) y **good night** (buenas noches, al despedirte).', 'sun'],
            ['¿Cómo estás?', '**How are you?** Y contestas: **I\'m fine, thank you** (estoy bien, gracias).', 'sparkles'],
          ], 'Good night es sólo para despedirte en la noche; para saludar de noche se dice good evening.'),
          preguntas: [
            op('¿Cómo se dice «buenos días»?', ['Good morning', 'Good night', 'Good bye', 'Good afternoon'], 'Morning es «mañana» (la parte del día).'),
            hueco('___, how are you?', 'Hello', ['Goodbye', 'Night', 'Thanks'], 'Para empezar una plática se saluda con hello.'),
            unir('Une cada saludo con su significado', [['Hello', 'Hola'], ['Goodbye', 'Adiós'], ['Thank you', 'Gracias'], ['Good afternoon', 'Buenas tardes']], 'Son las palabras que más vas a usar.'),
            escribe('Escribe en inglés: «gracias»', 'thank you', ['thanks', 'thank u'], 'Thank you, o más corto: thanks.', 'Empieza con th.'),
            ordena('How are you today', 'En inglés la pregunta empieza con la palabra de pregunta: how.'),
          ] },
        { titulo: 'Preséntate', resumen: 'My name is, I\'m from, nice to meet you.',
          leccion: L('Preséntate', [
            ['Tu nombre', '**My name is Ana** = «me llamo Ana». También: **I\'m Ana**.', 'user'],
            ['De dónde eres', '**I\'m from Mexico** = «soy de México».', 'map-pin'],
            ['Mucho gusto', '**Nice to meet you** = «mucho gusto». Te contestan: **Nice to meet you too**.', 'handshake'],
          ], 'I\'m es la forma corta de I am (yo soy / yo estoy).'),
          preguntas: [
            op('¿Qué significa «My name is Luis»?', ['Me llamo Luis', 'Mi amigo es Luis', 'Luis es mi papá', 'Yo soy de Luis'], 'Name es «nombre»: «mi nombre es Luis».'),
            hueco('I\'m ___ Mexico.', 'from', ['to', 'in', 'of'], 'From = «de» cuando hablas de dónde vienes.'),
            ordena('Nice to meet you', 'Así se dice «mucho gusto».'),
            escribe('Completa: «I ___ Ana» (soy Ana)', 'am', ['\'m'], 'I am Ana, o corto: I\'m Ana.', 'Dos letras.'),
            op('Te dicen «Nice to meet you». ¿Qué contestas?', ['Nice to meet you too', 'Goodbye', 'I\'m from', 'Good night'], 'Too = «también»: igualmente.'),
          ] },
        { titulo: 'Números del 1 al 10', resumen: 'One, two, three… ten.',
          leccion: L('Números del 1 al 10', [
            ['Del 1 al 5', '**one, two, three, four, five**.', 'hash'],
            ['Del 6 al 10', '**six, seven, eight, nine, ten**.', 'hash'],
            ['¿Cuántos?', '**How many?** = «¿cuántos?». **I have two brothers** = «tengo dos hermanos».', 'hash'],
          ], 'Ojo: eight (8) suena «eit».'),
          preguntas: [
            op('¿Qué número es «seven»?', ['7', '6', '8', '11'], 'Seven = siete.'),
            unir('Une cada número', [['three', '3'], ['five', '5'], ['nine', '9'], ['ten', '10']], 'Repítelos en voz alta: así se quedan.'),
            escribe('Escribe en inglés el número 2', 'two', ['2'], 'Two suena «tu».', 'Suena «tu».'),
            hueco('I have ___ brothers (tengo dos hermanos).', 'two', ['ten', 'one', 'eight'], 'Dos = two.'),
            op('¿Cómo se pregunta «¿cuántos?»?', ['How many?', 'How are you?', 'What time?', 'Where?'], 'How many = cuántos.'),
          ] },
        { titulo: 'Colores', resumen: 'Red, blue, green, yellow, black y white.',
          leccion: L('Colores', [
            ['Los primeros', '**red** (rojo), **blue** (azul), **yellow** (amarillo), **green** (verde).', 'palette'],
            ['Blanco y negro', '**white** (blanco) y **black** (negro).', 'circle'],
            ['El color va antes', 'En inglés el color va **antes** de la cosa: **a red car** = «un carro rojo».', 'arrow-left-right'],
          ], 'Purple es «morado», el color de CARYMO.'),
          preguntas: [
            op('¿Cómo se dice «verde»?', ['Green', 'Grey', 'Red', 'Blue'], 'Green = verde.'),
            hueco('I have a ___ car (un carro azul).', 'blue', ['car', 'is', 'the'], 'El color va antes del sustantivo: a blue car.'),
            unir('Une cada color', [['red', 'rojo'], ['yellow', 'amarillo'], ['black', 'negro'], ['white', 'blanco']], 'Los colores salen en todos lados.'),
            ordena('I like the purple shirt', 'El color (purple) va antes de la cosa (shirt).'),
            escribe('Escribe «morado» en inglés', 'purple', ['violet'], 'Purple = morado.', 'Empieza con p.'),
          ] },
      ] },
      { titulo: 'Tu día', frase: 'Hablar de ti y de los tuyos.', temas: [
        { titulo: 'El verbo to be', resumen: 'I am, you are, he is: ser y estar en uno.',
          leccion: L('El verbo to be', [
            ['Ser y estar', 'En inglés **to be** es «ser» y también «estar». **I am happy** = estoy feliz; **I am a student** = soy estudiante.', 'sparkles'],
            ['Cómo cambia', '**I am**, **you are**, **he is**, **she is**, **we are**, **they are**.', 'list'],
            ['Corto', 'Se junta: **I\'m**, **you\'re**, **he\'s**, **she\'s**, **we\'re**, **they\'re**.', 'scissors'],
          ], 'Truco: I con am, he/she/it con is, y todos los demás con are.'),
          preguntas: [
            hueco('She ___ my sister.', 'is', ['am', 'are', 'be'], 'She va con is.'),
            hueco('We ___ students.', 'are', ['is', 'am', 'be'], 'We va con are.'),
            op('¿Qué significa «I am tired»?', ['Estoy cansado', 'Soy alto', 'Tengo hambre', 'Me voy'], 'To be también es «estar»: estoy cansado.'),
            escribe('Escribe la forma corta de «they are»', 'they\'re', ['theyre', 'they’re'], 'They are → they\'re.', 'Con apóstrofo.'),
            ordena('You are my best friend', 'Sujeto (you) + verbo (are) + lo demás.'),
          ] },
        { titulo: 'La familia', resumen: 'Mother, father, brother, sister.',
          leccion: L('La familia', [
            ['Papás', '**mother** (mamá) y **father** (papá). De cariño: **mom** y **dad**.', 'heart'],
            ['Hermanos', '**brother** (hermano) y **sister** (hermana).', 'users'],
            ['Más familia', '**grandmother** (abuela), **grandfather** (abuelo), **son** (hijo), **daughter** (hija).', 'house'],
          ], 'Parents es «papás» (los dos), no «parientes».'),
          preguntas: [
            op('¿Qué significa «sister»?', ['Hermana', 'Hermano', 'Tía', 'Hija'], 'Sister = hermana.'),
            unir('Une a la familia', [['mother', 'mamá'], ['father', 'papá'], ['brother', 'hermano'], ['daughter', 'hija']], 'Las palabras de la familia.'),
            op('¿Qué son «parents»?', ['Los papás', 'Los parientes', 'Los primos', 'Los amigos'], 'Es un falso amigo: parents = papá y mamá.', 'No es lo que parece.'),
            hueco('My ___ is a teacher (mi mamá es maestra).', 'mother', ['father', 'brother', 'son'], 'Mamá = mother.'),
            ordena('This is my little brother', 'Little brother = hermano menor.'),
          ] },
        { titulo: 'Comida y bebida', resumen: 'Water, bread, chicken, I\'m hungry.',
          leccion: L('Comida y bebida', [
            ['Lo de todos los días', '**water** (agua), **bread** (pan), **eggs** (huevos), **chicken** (pollo), **rice** (arroz).', 'utensils'],
            ['Hambre y sed', '**I\'m hungry** = tengo hambre. **I\'m thirsty** = tengo sed.', 'cup-soda'],
            ['Me gusta', '**I like pizza** = me gusta la pizza. **I don\'t like** = no me gusta.', 'thumbs-up'],
          ], 'En inglés el hambre se «es»: I am hungry, no «I have hungry».'),
          preguntas: [
            op('¿Cómo se dice «tengo hambre»?', ['I\'m hungry', 'I have hungry', 'I\'m thirsty', 'I like hungry'], 'Con to be: I am hungry.'),
            unir('Une cada comida', [['water', 'agua'], ['bread', 'pan'], ['chicken', 'pollo'], ['rice', 'arroz']], 'Comida de todos los días.'),
            hueco('I don\'t ___ coffee (no me gusta el café).', 'like', ['love', 'have', 'am'], 'Don\'t like = no me gusta.'),
            escribe('Escribe en inglés «agua»', 'water', [], 'Water = agua.', 'Empieza con w.'),
            ordena('I am very thirsty', 'Very = muy.'),
          ] },
        { titulo: 'En el restaurante', resumen: 'Pedir, preguntar el precio y pagar.',
          leccion: L('En el restaurante', [
            ['Pedir', '**I would like a coffee, please** = quisiera un café, por favor. Corto: **I\'d like…**', 'coffee'],
            ['El precio', '**How much is it?** = ¿cuánto cuesta?', 'receipt'],
            ['La cuenta', '**The check, please** = la cuenta, por favor.', 'credit-card'],
          ], 'Please (por favor) y thank you (gracias) abren todas las puertas.'),
          preguntas: [
            op('¿Cómo pides la cuenta?', ['The check, please', 'How much water?', 'Good night', 'I like money'], 'Check = la cuenta.'),
            hueco('How ___ is it? (¿cuánto cuesta?)', 'much', ['many', 'are', 'old'], 'Para dinero se usa how much.'),
            ordena('I would like a sandwich please', 'I would like = quisiera: es la forma amable de pedir.'),
            op('¿Qué significa «I\'d like a soda»?', ['Quisiera un refresco', 'No me gusta el refresco', 'Tengo un refresco', 'Me gustó el refresco'], 'I\'d like = I would like = quisiera.'),
            escribe('Escribe en inglés «por favor»', 'please', ['pls'], 'Please = por favor.', 'Empieza con p.'),
          ] },
      ] },
      { titulo: 'De viaje', frase: 'Para moverte sin perderte.', temas: [
        { titulo: '¿Dónde está?', resumen: 'Where is, left, right, straight.',
          leccion: L('¿Dónde está?', [
            ['Preguntar', '**Where is the bathroom?** = ¿dónde está el baño?', 'map-pin'],
            ['Izquierda y derecha', '**left** (izquierda), **right** (derecha), **straight** (derecho).', 'arrow-left-right'],
            ['Cerca y lejos', '**It\'s near** = está cerca. **It\'s far** = está lejos.', 'navigation'],
          ], 'Turn left = da vuelta a la izquierda.'),
          preguntas: [
            op('¿Cómo preguntas dónde está el baño?', ['Where is the bathroom?', 'What is the bathroom?', 'How is the bathroom?', 'Who is the bathroom?'], 'Where = dónde.'),
            unir('Une cada dirección', [['left', 'izquierda'], ['right', 'derecha'], ['near', 'cerca'], ['far', 'lejos']], 'Te van a decir esto cuando preguntes.'),
            hueco('Turn ___ at the bank (da vuelta a la derecha en el banco).', 'right', ['left', 'far', 'where'], 'Derecha = right.'),
            ordena('My hotel is near the park', 'Near = cerca de.'),
            escribe('Escribe en inglés «izquierda»', 'left', [], 'Left = izquierda.', 'Cuatro letras.'),
          ] },
        { titulo: 'La hora', resumen: 'What time is it, o\'clock, half past.',
          leccion: L('La hora', [
            ['Preguntar', '**What time is it?** = ¿qué hora es?', 'clock'],
            ['En punto', '**It\'s three o\'clock** = son las tres en punto.', 'clock-3'],
            ['Y media', '**It\'s half past four** = son las cuatro y media.', 'clock-4'],
          ], 'También se dice con números: «It\'s four thirty» (4:30).'),
          preguntas: [
            op('¿Qué significa «What time is it?»', ['¿Qué hora es?', '¿Qué tiempo hace?', '¿Cuánto tiempo?', '¿Cuándo es?'], 'Time aquí es «hora».'),
            hueco('It\'s five ___ (son las cinco en punto).', 'o\'clock', ['half', 'time', 'past'], 'En punto = o\'clock.'),
            op('«It\'s half past two» es…', ['Las dos y media', 'Las dos en punto', 'Las doce', 'Las tres y media'], 'Half past = y media.'),
            ordena('What time is the class', 'Para preguntar la hora de algo: what time is…'),
            escribe('Escribe en inglés la hora 7:00 (con o\'clock)', 'seven o\'clock', ['it\'s seven o\'clock', 'seven oclock', '7 o\'clock'], 'Seven o\'clock.', 'Siete en punto.'),
          ] },
        { titulo: 'En el aeropuerto', resumen: 'Passport, ticket, gate y flight.',
          leccion: L('En el aeropuerto', [
            ['Tus papeles', '**passport** (pasaporte), **ticket** (boleto), **boarding pass** (pase de abordar).', 'ticket'],
            ['Dónde subir', '**gate** = la puerta de abordar. **flight** = el vuelo.', 'plane'],
            ['Te preguntan', '**Where are you going?** = ¿a dónde vas? Contestas: **I\'m going to New York**.', 'globe'],
          ], 'Delayed = retrasado: lo vas a ver en las pantallas.'),
          preguntas: [
            op('¿Qué es «gate»?', ['La puerta de abordar', 'El boleto', 'La maleta', 'El avión'], 'Gate = puerta (de abordar).'),
            unir('Une cada palabra', [['passport', 'pasaporte'], ['flight', 'vuelo'], ['ticket', 'boleto'], ['delayed', 'retrasado']], 'Lo que ves en un aeropuerto.'),
            hueco('I\'m going ___ London.', 'to', ['from', 'in', 'at'], 'Ir a un lugar: going to.'),
            ordena('Where is gate number five', 'Where is… = ¿dónde está…?'),
            escribe('Escribe en inglés «vuelo»', 'flight', [], 'Flight = vuelo.', 'Empieza con f.'),
          ] },
      ] },
    ],
  },
  {
    id: 'idi-frances-1', idioma: 'Francés', titulo: 'Francés: primeros pasos', color: '#3B5BDB', icono: 'languages', nivel: 'A1',
    frase: 'Saluda, preséntate y cuenta hasta diez en francés.',
    unidades: [
      { titulo: 'Bonjour', frase: 'Lo primero que se dice.', temas: [
        { titulo: 'Saludos', resumen: 'Bonjour, salut, au revoir, merci.',
          leccion: L('Saludos en francés', [
            ['Hola', '**Bonjour** = buenos días / hola (formal). **Salut** = hola entre amigos.', 'hand'],
            ['Adiós', '**Au revoir** = adiós. **À bientôt** = hasta pronto.', 'door-open'],
            ['Gracias', '**Merci** = gracias. **S\'il vous plaît** = por favor.', 'heart'],
          ], 'En la tarde-noche se saluda con bonsoir.'),
          preguntas: [
            op('¿Qué significa «merci»?', ['Gracias', 'Por favor', 'Hola', 'Adiós'], 'Merci = gracias.'),
            unir('Une cada saludo', [['Bonjour', 'Buenos días'], ['Au revoir', 'Adiós'], ['Salut', 'Hola (amigos)'], ['Bonsoir', 'Buenas noches']], 'Los saludos de todos los días.'),
            hueco('___, comment ça va? (hola, ¿cómo estás?)', 'Salut', ['Merci', 'Au', 'Non'], 'Entre amigos: salut.'),
            escribe('Escribe en francés «gracias»', 'merci', [], 'Merci.', 'Empieza con m.'),
          ] },
        { titulo: 'Preséntate', resumen: 'Je m\'appelle, je suis mexicain.',
          leccion: L('Preséntate en francés', [
            ['Tu nombre', '**Je m\'appelle Ana** = me llamo Ana.', 'user'],
            ['De dónde eres', '**Je suis mexicain** (hombre) / **mexicaine** (mujer) = soy mexicano / mexicana.', 'map-pin'],
            ['Mucho gusto', '**Enchanté** (hombre) / **enchantée** (mujer) = encantado / encantada.', 'handshake'],
          ], 'En francés casi nunca se pronuncia la última consonante: mexicain suena «mexicán».'),
          preguntas: [
            op('¿Qué significa «Je m\'appelle Luis»?', ['Me llamo Luis', 'Llamo a Luis', 'Soy amigo de Luis', 'Luis me llama'], 'Je m\'appelle = me llamo.'),
            hueco('Je ___ mexicaine (soy mexicana).', 'suis', ['m\'appelle', 'ai', 'es'], 'Je suis = yo soy.'),
            ordena('Je suis très contente', 'Très = muy.'),
          ] },
      ] },
    ],
  },
];

/* el curso → plan de CARYMO (mismo camino, cátedras, tarjetas, simulacro y examen) */
export function planDeIdioma(curso, armarCamino){
  const unidades = armarCamino({ unidades: curso.unidades.map((u) => ({ titulo: u.titulo, frase: u.frase, temas: u.temas.map((t) => ({ titulo: t.titulo, resumen: t.resumen })) })) });
  const contenido = {};
  unidades.forEach((u, i) => u.temas.forEach((t, j) => { const o = curso.unidades[i].temas[j]; contenido[t.id] = { leccion: o.leccion, preguntas: o.preguntas }; }));
  return { id: 'p-' + curso.id, curso: curso.id, idioma: curso.idioma, titulo: curso.titulo, materia: curso.idioma, color: curso.color, fecha: '', notas: curso.frase,
    creado: Date.now(), unidades, contenido, progreso: {}, forma: 2 };
}

/* ── ortografía estricta en idiomas (PLAN-13NOV §11: «en idiomas no hay tolerancia a errores de dedo») ──
   En el resto de CARYMO se perdonan acentos y errores de dedo; en un idioma, «tank you» no es «thank you» y «merci»
   sin la i no existe. Aquí sólo se perdona lo que no es ortografía: mayúsculas, espacios de más, el punto o el signo
   final, y el apóstrofo curvo del teclado del iPhone (’) contra el recto ('). Los acentos SÍ cuentan (café ≠ cafe). */
export const limpiaEstricta = (t) => String(t ?? '').normalize('NFC').toLowerCase().replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim().replace(/^[¿¡]+|[.!?¿¡…]+$/g, '').trim();
export function respuestaEstricta(dada, buenas){
  const d = limpiaEstricta(dada); if(!d) return { bien: false };
  for(const b of buenas) if(limpiaEstricta(b) === d) return { bien: true, exacta: true, de: b };
  return { bien: false };
}
