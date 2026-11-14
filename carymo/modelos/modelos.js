/* ══════════════════════════════════════════════════════════════════════════
   MODELOS 3D DE CARYMO · qué es cada pieza
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 14 nov: «los modelos 3D que se utilizan para seleccionar una parte».
   Los modelos NO los hacemos nosotros (regla de la casa): salen de BodyParts3D,
   el atlas de anatomía del DBCLS de Japón (CC BY-SA 2.1 JP), armados por piezas
   con modelos/receta/armar.py. Lo que dice cada pieza sí es nuestro.
   ═════════════════════════════════════════════════════════════════════════ */
export const CREDITO = 'Modelos: BodyParts3D, © The Database Center for Life Science (CC BY-SA 2.1 JP).';

export const MODELOS = [
  { id: 'cerebro', titulo: 'Cerebro', materia: 'Biología', icono: 'brain', archivo: 'glb/cerebro.glb', giro: [0, 0, 0],
    frase: 'Toca cada parte y descubre qué hace.',
    partes: {
      frontal: { nombre: 'Lóbulo frontal', texto: 'Planea, decide y controla los impulsos. Aquí vive la personalidad y se mueven los músculos a voluntad.', dato: 'Es lo último del cerebro en madurar: termina cerca de los 25 años.' },
      parietal: { nombre: 'Lóbulo parietal', texto: 'Recibe el tacto, el dolor y la temperatura, y sabe dónde está tu cuerpo en el espacio.', dato: 'Te deja tocarte la nariz con los ojos cerrados.' },
      temporal: { nombre: 'Lóbulo temporal', texto: 'Oye y entiende lo que oye: sonidos, palabras y música. También guarda recuerdos.', dato: 'Aquí está el área de Wernicke, la que entiende el lenguaje.' },
      occipital: { nombre: 'Lóbulo occipital', texto: 'Es el centro de la vista: arma lo que ven los ojos en formas, colores y movimiento.', dato: 'Está atrás, lo más lejos posible de los ojos.' },
      insula: { nombre: 'Ínsula', texto: 'Escondida entre lóbulos, siente lo que pasa dentro del cuerpo: hambre, asco, latidos.', dato: 'Se enciende cuando algo te da asco.' },
      limbico: { nombre: 'Sistema límbico', texto: 'Las emociones y la memoria: miedo, gusto, y guardar lo que aprendes.', dato: 'El hipocampo, parte de él, convierte lo que estudias en recuerdo.' },
      cerebelo: { nombre: 'Cerebelo', texto: 'Coordina el equilibrio y los movimientos finos: caminar, escribir, andar en bici.', dato: 'Es chico, pero tiene más de la mitad de las neuronas del cerebro.' },
      tronco: { nombre: 'Tronco encefálico', texto: 'Mantiene lo automático: respirar, el latido del corazón, tragar y dormir.', dato: 'Une el cerebro con la médula espinal.' },
      diencefalo: { nombre: 'Diencéfalo', texto: 'El tálamo reparte lo que llega de los sentidos; el hipotálamo controla hambre, sed y temperatura.', dato: 'El hipotálamo manda sobre las hormonas del cuerpo.' },
    } },
  { id: 'corazon', titulo: 'Corazón', materia: 'Biología', icono: 'heart', archivo: 'glb/corazon.glb', giro: [0, 0, 0],
    frase: 'Rojo lleva oxígeno; azul ya lo entregó.',
    partes: {
      'ventriculo-izq': { nombre: 'Ventrículo izquierdo', texto: 'La cámara más fuerte: empuja la sangre con oxígeno a todo el cuerpo por la aorta.', dato: 'Su pared es hasta tres veces más gruesa que la del derecho.' },
      'ventriculo-der': { nombre: 'Ventrículo derecho', texto: 'Manda la sangre sin oxígeno a los pulmones por la arteria pulmonar.', dato: 'Trabaja con menos fuerza: los pulmones están cerca.' },
      'auricula-izq': { nombre: 'Aurícula izquierda', texto: 'Recibe la sangre que regresa de los pulmones, ya con oxígeno.', dato: 'Le llegan cuatro venas pulmonares.' },
      'auricula-der': { nombre: 'Aurícula derecha', texto: 'Recibe la sangre que regresa del cuerpo, sin oxígeno.', dato: 'Aquí nace el latido: en el nodo sinusal.' },
      aorta: { nombre: 'Aorta', texto: 'La arteria más grande: saca la sangre del ventrículo izquierdo hacia todo el cuerpo.', dato: 'Mide unos 2.5 cm de ancho, como una manguera.' },
      pulmonar: { nombre: 'Tronco pulmonar', texto: 'Lleva la sangre del ventrículo derecho a los pulmones para cargar oxígeno.', dato: 'Es la única arteria que lleva sangre sin oxígeno.' },
      'cava-sup': { nombre: 'Vena cava superior', texto: 'Trae la sangre de la cabeza y los brazos a la aurícula derecha.', dato: 'Junto con la inferior, es la vena más grande.' },
    } },
  { id: 'esqueleto', titulo: 'Esqueleto', materia: 'Biología', icono: 'bone', archivo: 'glb/esqueleto.glb', giro: [0, 0, 0],
    frase: '206 huesos, ocho grupos.',
    partes: {
      craneo: { nombre: 'Cráneo', texto: 'Protege el cerebro y da forma a la cara. Son 22 huesos, casi todos soldados.', dato: 'La mandíbula es el único hueso del cráneo que se mueve.' },
      columna: { nombre: 'Columna vertebral', texto: 'Sostiene el cuerpo y protege la médula espinal. 33 vértebras en cinco zonas.', dato: 'Cervical, dorsal, lumbar, sacro y cóccix.' },
      costillas: { nombre: 'Costillas y esternón', texto: 'La caja torácica protege corazón y pulmones, y se mueve al respirar.', dato: 'Son 12 pares de costillas.' },
      pelvis: { nombre: 'Pelvis', texto: 'Une la columna con las piernas, carga el peso del tronco y protege los órganos de abajo.', dato: 'En las mujeres es más ancha.' },
      brazos: { nombre: 'Brazos y hombros', texto: 'Clavícula y omóplato forman el hombro; húmero, radio y cúbito, el brazo.', dato: 'El radio está del lado del pulgar.' },
      piernas: { nombre: 'Piernas', texto: 'Fémur, rótula, tibia y peroné: cargan todo el cuerpo al caminar y correr.', dato: 'El fémur es el hueso más largo y fuerte.' },
      manos: { nombre: 'Manos', texto: 'Carpo, metacarpo y falanges: 27 huesos en cada mano para movimientos finos.', dato: 'Entre las dos manos tienen más de la cuarta parte de tus huesos.' },
      pies: { nombre: 'Pies', texto: 'Tarso, metatarso y falanges: 26 huesos que reparten el peso y forman el arco.', dato: 'El calcáneo, el talón, es el hueso más grande del pie.' },
    } },
];
