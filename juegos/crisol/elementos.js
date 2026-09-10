/* ═══════════════════════════════════════════════════════════════════════════
   CRISOL · LA TABLA DE ELEMENTOS
   ---------------------------------------------------------------------------
   Todo lo que sabe el juego sobre la materia vive AQUÍ, en datos, no en el
   motor. Eso no es orden por gusto: es lo que hace que meter el elemento
   número doscientos cueste cinco renglones en vez de tocar la simulación.
   Carlos pidió «absolutamente todos los elementos» — pues así se llega.

   Cada elemento:
     nom       cómo se llama en pantalla
     col       color base. La variación por partícula la pone el motor
     estado    'solido' · 'polvo' · 'liquido' · 'gas' · 'energia'
     dens      densidad. Decide quién se hunde en quién. El vacío es 0
     nace      a qué temperatura aparece, si nace caliente
     calor     HORNO ETERNO: mantiene su temperatura pase lo que pase. Sólo la
               lava y el fuego. ⚠ Al principio marqué así también los metales y
               vidrios fundidos «porque están calientes», y con eso NUNCA se
               enfriaban: el vidrio fundido se quedaba a 1804° para siempre y
               jamás volvía a ser vidrio. Estar caliente y calentar son dos
               cosas y hacen falta dos campos.
     fus       a qué temperatura se funde, y en qué se convierte  [°C, 'id']
     ebu       a qué temperatura hierve, y en qué                 [°C, 'id']
     cond      conductividad TÉRMICA, 0 a 1
     elec      conductividad ELÉCTRICA: 0 aislante · 1 conductor
     arde      qué tan fácil prende, 0 a 1. 0 = no arde
     calorArde cuánto calor suelta al arder
     vida      cuántos pasos vive antes de convertirse en `muere`
     dureza    resistencia al ácido y a la explosión, 0 a 1
   ═════════════════════════════════════════════════════════════════════════ */

const JUEGO = {
  /* ── lo básico ────────────────────────────────────────────────────────── */
  /* El hueco es AIRE, no vacío, y por eso se llama así: sin un medio no hay
     resistencia del aire, no hay flotación y no hay globo. No se simula ni una
     celda —serían 153 600 partículas activas por cuadro para nada—, sólo se
     comporta como aire con la densidad de DENS_AIRE. Y sigue siendo el borrador. */
  vacio:   { nom:'Aire · borra', col:'#0B0712', estado:'gas', dens:1.2, cond:.02, grupo:'básico' },
  /* El muro es lo ÚNICO inamovible, y lo pidió Carlos por su nombre: «deja un
     muro inamovible por si quiero hacer algo especial». Ahora que los sólidos
     caen, hace falta algo que NO — o no habría suelo, ni recámara, ni cañón
     que aguante el disparo. `fijo` es esa marca: no cae, no lo empuja la
     presión, no lo rompe nada y refleja la onda entera. */
  muro:    { nom:'Muro',    col:'#5A5468', estado:'solido', dens:999,  cond:.15, dureza:1, fijo:true, grupo:'básico' },

  /* ── tierra y piedra ──────────────────────────────────────────────────── */
  arena:   { nom:'Arena',   col:'#D9B168', estado:'polvo',  dens:16, cond:.12, friccion:.75,
             fus:[1700,'vidrio'], dureza:.2, grupo:'tierra' },
  tierra:  { nom:'Tierra',  col:'#6B4A2F', estado:'polvo',  dens:15, cond:.10,
             dureza:.2, grupo:'tierra' },
  piedra:  { nom:'Piedra',  col:'#7C7687', estado:'solido', dens:25, cond:.20, friccion:.65,
             fus:[1200,'lava'], dureza:.6, grupo:'tierra' },
  grava:   { nom:'Grava',   col:'#8A8496', estado:'polvo',  dens:20, cond:.18,
             fus:[1200,'lava'], dureza:.35, grupo:'tierra' },
  sal:     { nom:'Sal',     col:'#EDE7F0', estado:'polvo',  dens:14, cond:.14,
             fus:[801,'salfun'], dureza:.15, grupo:'tierra' },
  salfun:  { nom:'Sal fundida', col:'#FFD98A', estado:'liquido', dens:13, cond:.4,
             ebu:[1465,'vapor'], nace:850, congela:[800,'sal'], grupo:'tierra' },
  vidrio:  { nom:'Vidrio',  col:'#BFE8F0', estado:'solido', dens:24, cond:.25,
             fus:[1500,'vidfun'], dureza:.45, grupo:'tierra' },
  vidfun:  { nom:'Vidrio fundido', col:'#FF9E3D', estado:'liquido', dens:23, cond:.5,
             nace:1550, congela:[1400,'vidrio'], grupo:'tierra' },
  cemento: { nom:'Cemento', col:'#9E98A8', estado:'polvo',  dens:17, cond:.15,
             dureza:.2, grupo:'tierra' },
  concreto:{ nom:'Concreto',col:'#8E8896', estado:'solido', dens:26, cond:.22,
             fus:[1400,'lava'], dureza:.75, grupo:'tierra' },

  /* ── agua y sus estados ───────────────────────────────────────────────── */
  agua:    { nom:'Agua',    col:'#2F7FD9', estado:'liquido', dens:10, cond:.60,
             ebu:[100,'vapor'], congela:[0,'hielo'], elec:.35, grupo:'agua' },
  salada:  { nom:'Agua salada', col:'#2A6FA8', estado:'liquido', dens:11, cond:.60,
             ebu:[105,'vapor'], congela:[-2,'hielo'], elec:1, grupo:'agua' },
  hielo:   { nom:'Hielo',   col:'#A8DCF0', estado:'solido', dens:9, cond:.45, friccion:.04,
             fus:[0,'agua'], dureza:.2, frio:true, grupo:'agua' },
  nieve:   { nom:'Nieve',   col:'#E8F4FA', estado:'polvo',  dens:5, cond:.20,
             fus:[0,'agua'], frio:true, grupo:'agua' },
  /* ── LAS DENSIDADES DE LOS GASES SON RELATIVAS AL AIRE (1.2) ──────────
     Y salen de la masa molar de verdad dividida entre la del aire (29 g/mol):
     H₂ 2/29 → 0.08 · CH₄ 16/29 → 0.66 · H₂O 18/29 → 0.75 · O₂ 32/29 → 1.43 ·
     CO₂ 44/29 → 1.83. Antes eran todas 1, 2 o 3 y todos los gases subían por
     igual, lo cual es falso y además rompe dos cosas: el CO₂ pesa vez y media
     lo que el aire —por eso se acumula en el suelo, asfixia en un sótano y
     apaga fuegos— y un globo es imposible si da lo mismo con qué lo llenes. */
  vapor:   { nom:'Vapor',   col:'#B9C9D6', estado:'gas',    dens:0.75, cond:.30,
             congela:[99,'agua'], grupo:'agua' },
  hielose: { nom:'Hielo seco', col:'#D6EEF5', estado:'polvo', dens:8, cond:.25,
             fus:[-78,'co2'], frio:true, grupo:'agua' },
  co2:     { nom:'CO₂',     col:'#7A8A94', estado:'gas',    dens:1.83, cond:.15,
             ahoga:true, grupo:'gases' },

  /* ── fuego, calor y sus restos ────────────────────────────────────────── */
  fuego:   { nom:'Fuego',   col:'#FF6A1A', estado:'energia', dens:0.3, cond:.9,
             vida:52, muere:'humo', calor:true, grupo:'fuego' },
  humo:    { nom:'Humo',    col:'#4A4453', estado:'gas',    dens:0.6, cond:.10,
             vida:220, muere:'vacio', grupo:'fuego' },
  ceniza:  { nom:'Ceniza',  col:'#4F4954', estado:'polvo',  dens:12, cond:.12,
             dureza:.1, grupo:'fuego' },
  lava:    { nom:'Lava',    col:'#FF4A16', estado:'liquido', dens:22, cond:.85,
             congela:[900,'piedra'], calor:true, grupo:'fuego' },
  obsidiana:{nom:'Obsidiana',col:'#2A2135',estado:'solido', dens:27, cond:.20,
             fus:[1300,'lava'], dureza:.85, grupo:'fuego' },
  termita: { nom:'Termita', col:'#B5651D', estado:'polvo',  dens:18, cond:.3,
             arde:.85, calorArde:2600, dureza:.1, grupo:'fuego' },

  /* ── combustibles ─────────────────────────────────────────────────────── */
  aceite:  { nom:'Aceite',  col:'#5A4520', estado:'liquido', dens:8, cond:.20, friccion:.02,
             arde:.7, calorArde:700, ebu:[300,'gasnat'], grupo:'combustible' },
  gasnat:  { nom:'Gas',     col:'#93A05A', estado:'gas',    dens:0.66, cond:.10,
             arde:1, calorArde:900, grupo:'combustible' },
  polvora: { nom:'Pólvora', col:'#3E3A44', estado:'polvo',  dens:13, cond:.15,
             arde:1, calorArde:1400, explota:9, dureza:.05, grupo:'combustible' },
  /* ⚠ `inestable:.5` la hacía explotar SOLA a los pocos segundos de ponerla:
     Carlos no alcanzaba ni a construir con ella. La nitroglicerina de verdad
     no detona por existir — detona por GOLPE, y eso ahora se mide con la
     velocidad de impacto. `golpe` es a qué velocidad revienta. */
  nitro:   { nom:'Nitroglicerina', col:'#C8B96A', estado:'liquido', dens:12, cond:.2,
             arde:1, calorArde:2200, explota:22, golpe:2.2, grupo:'combustible' },
  /* Tela de globo: un sólido LIGERO, que es lo que hace falta para que un
     globo vuele. Con madera no vuela —pesa diecinueve veces el aire— igual
     que en la vida real: los globos se hacen de película fina justo por eso.
     Sigue pesando el doble que el aire, así que sola tampoco vuela: hay que
     llenarla de algo más ligero. Ahí es donde entra el helio. */
  globo:   { nom:'Tela de globo', col:'#E85A8A', estado:'solido', dens:2.5, cond:.2,
             dureza:.02, arde:.6, calorArde:400, grupo:'básico' },
  madera:  { nom:'Madera',  col:'#7A5230', estado:'solido', dens:19, cond:.12, friccion:.55,
             arde:.35, calorArde:600, dureza:.25, grupo:'combustible' },
  carbon:  { nom:'Carbón',  col:'#26222C', estado:'polvo',  dens:14, cond:.16,
             arde:.5, calorArde:1100, dureza:.15, grupo:'combustible' },

  /* ── gases ────────────────────────────────────────────────────────────── */
  hidrogeno:{nom:'Hidrógeno',col:'#C9D8FF',estado:'gas',   dens:0.08, cond:.5,
             arde:1, calorArde:1200, explota:7, sube:2, grupo:'gases' },
  oxigeno: { nom:'Oxígeno',  col:'#8FD8FF', estado:'gas',   dens:1.43, cond:.2,
             aviva:true, grupo:'gases' },

  /* ── metales y electricidad ───────────────────────────────────────────── */
  metal:   { nom:'Metal',   col:'#9AA3B0', estado:'solido', dens:30, cond:.95, friccion:.25,
             elec:1, fus:[1450,'metfun'], dureza:.8, ferroso:.5, grupo:'eléctrico' },
  metfun:  { nom:'Metal fundido', col:'#FFB03D', estado:'liquido', dens:29, cond:.95,
             elec:1, congela:[1400,'metal'], nace:1500, grupo:'eléctrico' },
  cobre:   { nom:'Cobre',   col:'#C87A45', estado:'solido', dens:31, cond:1,
             elec:1, fus:[1085,'metfun'], dureza:.7, grupo:'eléctrico' },
  bateria: { nom:'Batería', col:'#FFC53D', estado:'solido', dens:40, cond:.4,
             elec:1, fuente:true, dureza:.6, grupo:'eléctrico' },
  /* `luz` es cuánto alumbra cuando le llega corriente. La luz se reparte de
     verdad por la habitación y la bloquean los sólidos: ver luzPaso(). */
  lampara: { nom:'Lámpara', col:'#6E6A55', estado:'solido', dens:28, cond:.3, luz:20,
             elec:1, lampara:true, dureza:.4, grupo:'eléctrico' },
  aislante:{ nom:'Aislante',col:'#3A3446', estado:'solido', dens:20, cond:.05,
             elec:0, dureza:.5, grupo:'eléctrico' },
  mercurio:{ nom:'Mercurio',col:'#B9C2CC', estado:'liquido', dens:34, cond:.7,
             elec:1, congela:[-39,'metal'], grupo:'eléctrico' },

  /* ── electrónica de verdad ──────────────────────────────────────────────
     ⚠ Carlos: «todo lo de lógica y eléctrica está medio raro de operar».
     Tenía razón y el problema era que faltaban las piezas intermedias. Sin
     interruptor no puedes ENCENDER nada a voluntad; sin resistencia no puedes
     limitar corriente; sin pulsador ni reloj no hay señales que cambien solas.
     Quedaba «pinta batería y cable y a ver qué pasa», que no es operar: es
     mirar. */
  interruptor:{nom:'Interruptor', col:'#7A9E5A', estado:'solido', dens:28, cond:.3,
             elec:1, interruptor:true, dureza:.5, grupo:'eléctrico',
             ayuda:'Tócalo para abrir y cerrar el paso' },
  resistencia:{nom:'Resistencia', col:'#B58A3A', estado:'solido', dens:28, cond:.5,
             elec:1, resiste:.55, dureza:.4, grupo:'eléctrico',
             ayuda:'Deja pasar menos corriente y SE CALIENTA' },
  pulsador:{ nom:'Pulsador',  col:'#5A9E9E', estado:'solido', dens:28, cond:.3,
             elec:1, pulso:14, dureza:.5, grupo:'eléctrico',
             ayuda:'Late solo: enciende y apaga cada tanto' },
  /* ── GENERADOR ──────────────────────────────────────────────────────────
     Carlos, punto 4: «debe ser posible generar energía, transportarla,
     almacenarla, convertirla de un tipo a otro… La energía no debe aparecer ni
     desaparecer arbitrariamente. Debe existir conservación de energía dentro
     de los límites de la simulación».
     Hasta ahora el motor CONSUMÍA y nada GENERABA: la corriente sólo salía de
     pilas que aparecían llenas. Esto cierra el circuito. Un generador toma la
     energía cinética de lo que se mueve a su lado, la convierte en corriente
     — y FRENA lo que se la dio, que es la mitad que casi nunca se implementa
     y sin la cual esto sería una fuente de energía gratis. */
  generador:{nom:'Generador', col:'#C58A3D', estado:'solido', dens:33, cond:.5,
             elec:1, genera:.55, dureza:.5, grupo:'eléctrico',
             ayuda:'Convierte el movimiento de al lado en corriente, y frena lo que lo mueve' },
  motor:   { nom:'Motor',     col:'#9E5A7A', estado:'solido', dens:32, cond:.4,
             elec:1, motor:true, dureza:.5, grupo:'eléctrico',
             ayuda:'Con corriente, empuja lo que tenga encima' },

  /* ── automatización · lo que pidió Carlos por su nombre ─────────────────
     «relojes de arena que no dejen pasar electricidad hasta que haya pasado
     cierto tiempo y que se puedan apagar al tiempo, interruptores pistones
     observadores repetidores de señal, que las baterías se acaben y puedan
     recargarse». Cada uno resuelve algo que sin él no se puede hacer:
     sin retardo no hay secuencias, sin observador nada reacciona a lo que
     pasa en el mundo, y sin repetidor la corriente se muere a los 110 pasos
     de distancia y no puedes cablear la sala entera. */
  reloj:   { nom:'Reloj de arena', col:'#D9A441', estado:'solido', dens:29, cond:.3,
             elec:1, retardo:90, dureza:.4, grupo:'automatización',
             ayuda:'Deja pasar la señal DESPUÉS de un rato. Tócalo para reiniciarlo' },
  repetidor:{nom:'Repetidor', col:'#5AA36E', estado:'solido', dens:29, cond:.3,
             elec:1, repite:true, dureza:.4, grupo:'automatización',
             ayuda:'Refresca la señal: sin él la corriente se muere de lejos' },
  observador:{nom:'Observador', col:'#A36E5A', estado:'solido', dens:30, cond:.3,
             elec:1, observa:true, dureza:.5, grupo:'automatización',
             ayuda:'Suelta un pulso cuando CAMBIA lo que tiene encima' },
  piston:  { nom:'Pistón',    col:'#6E8AA3', estado:'solido', dens:34, cond:.4,
             elec:1, piston:5, dureza:.6, grupo:'automatización',
             ayuda:'Con corriente, EMPUJA con fuerza hacia arriba' },
  resorte: { nom:'Resorte',   col:'#9EA35A', estado:'solido', dens:24, cond:.5,
             elec:1, resorte:2.6, dureza:.35, grupo:'automatización',
             ayuda:'Guarda el golpe que recibe y lo devuelve' },
  pila:    { nom:'Pila recargable', col:'#D9C441', estado:'solido', dens:38, cond:.4,
             elec:1, pila:2600, dureza:.5, grupo:'automatización',
             ayuda:'Como la batería pero SE ACABA. Con calor se recarga' },

  /* ── pirotecnia ─────────────────────────────────────────────────────────
     «Asegúrate de que pueda crear pirotecnia». Las estrellas son sales
     metálicas de verdad: el estroncio da rojo, el bario verde, el cobre azul
     y el sodio dorado. Es la química que hay detrás de un castillo. */
  estRoja: { nom:'Estrella roja', col:'#FF3B4E', estado:'polvo', dens:14, cond:.2,
             arde:.9, calorArde:900, chispa:'#FF3B4E', explota:4, grupo:'pirotecnia',
             ayuda:'Estroncio: arde en rojo' },
  estVerde:{ nom:'Estrella verde', col:'#3BFF6E', estado:'polvo', dens:14, cond:.2,
             arde:.9, calorArde:900, chispa:'#3BFF6E', explota:4, grupo:'pirotecnia',
             ayuda:'Bario: arde en verde' },
  estAzul: { nom:'Estrella azul', col:'#3B8AFF', estado:'polvo', dens:14, cond:.2,
             arde:.9, calorArde:900, chispa:'#3B8AFF', explota:4, grupo:'pirotecnia',
             ayuda:'Cobre: arde en azul' },
  estOro:  { nom:'Estrella dorada', col:'#FFD43B', estado:'polvo', dens:14, cond:.2,
             arde:.9, calorArde:900, chispa:'#FFD43B', explota:4, grupo:'pirotecnia',
             ayuda:'Sodio: arde en dorado' },
  /* ⚠ SIN `arde`, Y ESO ES LO QUE LA HACE MECHA. Con `arde:.5` el bloque
     genérico de combustión —que corre ANTES— la convertía en fuego de golpe y
     su propio contador no llegaba a ejecutarse nunca: avanzaba dos celdas y
     se paraba. Es la segunda vez hoy que el orden dentro del paso decide qué
     reglas existen; la primera fue la estrella de pirotecnia. Una pieza con
     lógica propia no puede llevar además la genérica. */
  mecha:   { nom:'Mecha',     col:'#8A7A5A', estado:'solido', dens:18, cond:.2,
             mecha:true, dureza:.05, grupo:'pirotecnia',
             ayuda:'Se quema despacio y en línea: para retrasar la tronada' },
  chispa:  { nom:'Chispa',    col:'#FFF3C4', estado:'energia', dens:1, cond:.9,
             vida:90, muere:'humo', calor:true, grupo:'pirotecnia',
             ayuda:'Lo que sale volando de una estrella' },

  /* ── magnetismo ─────────────────────────────────────────────────────────
     Lo pidió por su nombre. `iman` atrae lo ferroso; `electroiman` sólo
     mientras le llegue corriente, que es lo que lo hace útil para máquinas. */
  iman:    { nom:'Imán',      col:'#C43A3A', estado:'solido', dens:33, cond:.6,
             elec:1, iman:9, dureza:.65, grupo:'magnetismo',
             ayuda:'Atrae metales de lejos' },
  electroiman:{nom:'Electroimán', col:'#8A3A6A', estado:'solido', dens:33, cond:.6,
             elec:1, electroiman:11, dureza:.6, grupo:'magnetismo',
             ayuda:'Igual, pero SÓLO con corriente' },
  limadura:{ nom:'Limadura',  col:'#8A8F98', estado:'polvo',  dens:20, cond:.8,
             elec:1, ferroso:1, dureza:.1, grupo:'magnetismo',
             ayuda:'Polvo de hierro: lo mueven los imanes' },

  /* ── VÁLVULA ────────────────────────────────────────────────────────────
     Carlos la pidió por su nombre y con su comportamiento: «cerrada restringe
     el flujo; abierta permite que el contenido salga dependiendo de la
     diferencia de presión; la presión debe acumularse si el recipiente está
     cerrado; una apertura pequeña debe producir un flujo diferente a una
     grande».
     Cerrada es un sólido normal y ya está: contiene. Abierta deja de estorbar
     y el gas sale por la diferencia de presión, que es la que ya calcula el
     campo — la apertura grande deja pasar más porque son más celdas abiertas,
     no porque nadie lo haya programado.
     Se acciona tocándola, o con corriente: por eso lleva `elec`. */
  valvula: { nom:'Válvula', col:'#5AA3A3', estado:'solido', dens:29, cond:.3,
             elec:1, valvula:true, dureza:.55, grupo:'automatización',
             ayuda:'Tócala para abrir y cerrar. Cerrada contiene la presión; abierta la deja salir' },

  /* ── compuertas lógicas · con esto se PROGRAMA dentro del juego ───────── */
  gAND:    { nom:'Y (AND)',  col:'#3DFFC5', estado:'solido', dens:40, cond:.2,
             elec:1, puerta:'and', dureza:.5, grupo:'lógica' },
  gOR:     { nom:'O (OR)',   col:'#3DC5FF', estado:'solido', dens:40, cond:.2,
             elec:1, puerta:'or',  dureza:.5, grupo:'lógica' },
  gNOT:    { nom:'NO (NOT)', col:'#FF3D9E', estado:'solido', dens:40, cond:.2,
             elec:1, puerta:'not', dureza:.5, grupo:'lógica' },
  diodo:   { nom:'Diodo',    col:'#AC27FF', estado:'solido', dens:40, cond:.2,
             elec:1, puerta:'diodo', dureza:.5, grupo:'lógica' },
  /* Las que faltaban. Con `padre` distinguiendo entrada de salida, todas
     funcionan con el mismo código: cambia una línea del switch. */
  nand:    { nom:'NO-Y (NAND)', col:'#8A6FD1', estado:'solido', dens:28, cond:.3,
             elec:1, puerta:'nand', dureza:.5, grupo:'lógica',
             ayuda:'Se apaga sólo cuando le llegan las DOS señales' },
  nor:     { nom:'NO-O (NOR)', col:'#6F8AD1', estado:'solido', dens:28, cond:.3,
             elec:1, puerta:'nor',  dureza:.5, grupo:'lógica',
             ayuda:'Enciende sólo si NO le llega ninguna señal' },
  xor:     { nom:'O-exclusiva (XOR)', col:'#D18A6F', estado:'solido', dens:28, cond:.3,
             elec:1, puerta:'xor',  dureza:.5, grupo:'lógica',
             ayuda:'Enciende con UNA señal, no con dos. Es el sumador' },
  xnor:    { nom:'XNOR', col:'#6FD18A', estado:'solido', dens:28, cond:.3,
             elec:1, puerta:'xnor', dureza:.5, grupo:'lógica',
             ayuda:'Enciende cuando las dos entradas están IGUALES' },

  /* ── química agresiva ─────────────────────────────────────────────────── */
  /* H₃O⁺ · el ion hidronio. Corrosivo y de vida corta: se recombina. */
  hidronio:{ nom:'Hidronio H₃O⁺', col:'#B6FF6E', estado:'liquido', dens:10.4, cond:.5,
             corroe:.16, vida:420, muere:'agua', dureza:0, grupo:'química',
             ayuda:'El ion que hace ácido a un ácido. Corroe, y con el tiempo vuelve a ser agua' },
  acido:   { nom:'Ácido',   col:'#8FE03D', estado:'liquido', dens:11, cond:.4,
             corroe:.35, grupo:'química' },
  uranio:  { nom:'Uranio',  col:'#5FE04A', estado:'polvo',  dens:38, cond:.4,
             radia:true, dureza:.5, grupo:'química' },

  /* ── vida, apenas la semilla de lo que viene ──────────────────────────── */
  planta:  { nom:'Planta',  col:'#3FA83F', estado:'solido', dens:18, cond:.15,
             arde:.6, calorArde:500, crece:true, dureza:.1, grupo:'vida' },
  semilla: { nom:'Semilla', col:'#8FBF4A', estado:'polvo',  dens:13, cond:.15,
             arde:.5, calorArde:400, germina:true, dureza:.05, grupo:'vida' },
};


/* ═══════════════════════════════════════════════════════════════════════════
   LA TABLA PERIÓDICA · los 118
   ---------------------------------------------------------------------------
   Carlos: «le faltan todos los elementos de la tabla periódica».

   Los datos son REALES —punto de fusión, de ebullición y densidad medidos—,
   no inventados. La densidad va en g/cm³ en `masa` y escalada a la unidad del
   juego en `dens`: el agua pesa 1 de verdad y 10 aquí, así que ×10. Por eso el
   osmio, que es lo más denso que existe, se hunde en absolutamente todo.

   ⚠ Y LAS DENSIDADES DE LOS SUPERPESADOS SON CALCULADAS, NO MEDIDAS. De esos
   elementos se han fabricado unos pocos átomos que duran milisegundos: nadie
   ha pesado un trozo de hasio. Van marcados con `predicho:true`, porque un
   número teórico presentado como medición es exactamente la clase de mentira
   silenciosa que este repo persigue. El más denso MEDIDO sigue siendo el
   osmio, con 22.6.

   ⚠ LO QUE NO SE INVENTA: los sintéticos pesados (del 100 en adelante) no
   tienen punto de fusión medido — se han fabricado unos pocos átomos que
   duran milisegundos. Donde no hay dato, no hay campo. Un número inventado
   ahí sería exactamente la clase de cosa que este repo lleva días pagando.

   Se identifican con `e` + símbolo (eFe, eAu, eU) para no chocar con los
   elementos de juego que ya existían: `metal` y `cobre` siguen siendo los
   fáciles de usar, y ahora además está el cobre de verdad con sus 1085°.
   ═════════════════════════════════════════════════════════════════════════ */
export const TABLA = {
  eH: { nom:'Hidrógeno', sim:'H', z:1, col:'#8FEAB9', estado:'gas', dens:1, cond:0.12, masa:9e-05, ebuReal:-253, dureza:0.15, grupo:'⚛ no metal' },
  eHe: { nom:'Helio', sim:'He', z:2, col:'#C5AAFA', estado:'gas', dens:1, cond:0.12, masa:0.00018, ebuReal:-269, dureza:0.15, grupo:'⚛ noble' },
  eLi: { nom:'Litio', sim:'Li', z:3, col:'#FA9566', estado:'solido', dens:5, cond:0.75, masa:0.53, elec:1, fusReal:180, ebuReal:1342, dureza:0.17, grupo:'⚛ alcalino' },
  eBe: { nom:'Berilio', sim:'Be', z:4, col:'#FACC73', estado:'solido', dens:18, cond:0.75, masa:1.85, elec:1, fusReal:1287, ebuReal:2469, dureza:0.21, grupo:'⚛ alcalinotérreo' },
  eB: { nom:'Boro', sim:'B', z:5, col:'#74DBDB', estado:'solido', dens:23, cond:0.3, masa:2.34, elec:0.4, fusReal:2076, ebuReal:3927, dureza:0.23, grupo:'⚛ metaloide' },
  eC: { nom:'Carbono', sim:'C', z:6, col:'#80DBAA', estado:'solido', dens:23, cond:0.12, masa:2.27, fusReal:3550, ebuReal:4027, dureza:0.23, grupo:'⚛ no metal' },
  eN: { nom:'Nitrógeno', sim:'N', z:7, col:'#7DD8A7', estado:'gas', dens:1, cond:0.12, masa:0.00125, ebuReal:-196, dureza:0.15, grupo:'⚛ no metal' },
  eO: { nom:'Oxígeno', sim:'O', z:8, col:'#7AD5A4', estado:'gas', dens:1, cond:0.12, masa:0.00143, ebuReal:-183, dureza:0.15, grupo:'⚛ no metal' },
  eF: { nom:'Flúor', sim:'F', z:9, col:'#F8D954', estado:'gas', dens:1, cond:0.12, masa:0.0017, ebuReal:-188, dureza:0.15, grupo:'⚛ halógeno' },
  eNe: { nom:'Neón', sim:'Ne', z:10, col:'#AD92F5', estado:'gas', dens:1, cond:0.12, masa:0.0009, ebuReal:-246, dureza:0.15, grupo:'⚛ noble' },
  eNa: { nom:'Sodio', sim:'Na', z:11, col:'#F27D4E', estado:'solido', dens:10, cond:0.75, masa:0.97, elec:1, fusReal:98, ebuReal:883, dureza:0.18, grupo:'⚛ alcalino' },
  eMg: { nom:'Magnesio', sim:'Mg', z:12, col:'#EFB45B', estado:'solido', dens:17, cond:0.75, masa:1.74, elec:1, fusReal:650, ebuReal:1090, dureza:0.21, grupo:'⚛ alcalinotérreo' },
  eAl: { nom:'Aluminio', sim:'Al', z:13, col:'#95A1B1', estado:'solido', dens:27, cond:0.75, masa:2.7, elec:1, fusReal:660, ebuReal:2519, dureza:0.24, grupo:'⚛ metal' },
  eSi: { nom:'Silicio', sim:'Si', z:14, col:'#81E8E8', estado:'solido', dens:23, cond:0.3, masa:2.33, elec:0.4, fusReal:1414, ebuReal:3265, dureza:0.23, grupo:'⚛ metaloide' },
  eP: { nom:'Fósforo', sim:'P', z:15, col:'#8DE8B7', estado:'solido', dens:18, cond:0.12, masa:1.82, fusReal:44, ebuReal:281, dureza:0.21, grupo:'⚛ no metal' },
  eS: { nom:'Azufre', sim:'S', z:16, col:'#8AE5B4', estado:'solido', dens:21, cond:0.12, masa:2.07, fusReal:115, ebuReal:445, dureza:0.22, grupo:'⚛ no metal' },
  eCl: { nom:'Cloro', sim:'Cl', z:17, col:'#FAE964', estado:'gas', dens:1, cond:0.12, masa:0.0032, ebuReal:-34, dureza:0.15, grupo:'⚛ halógeno' },
  eAr: { nom:'Argón', sim:'Ar', z:18, col:'#BDA2FA', estado:'gas', dens:1, cond:0.12, masa:0.0018, ebuReal:-186, dureza:0.15, grupo:'⚛ noble' },
  eK: { nom:'Potasio', sim:'K', z:19, col:'#FA8D5E', estado:'solido', dens:9, cond:0.75, masa:0.86, elec:1, fusReal:63, ebuReal:759, dureza:0.18, grupo:'⚛ alcalino' },
  eCa: { nom:'Calcio', sim:'Ca', z:20, col:'#FAC46B', estado:'solido', dens:16, cond:0.75, masa:1.55, elec:1, fusReal:842, ebuReal:1484, dureza:0.2, grupo:'⚛ alcalinotérreo' },
  eSc: { nom:'Escandio', sim:'Sc', z:21, col:'#BD9DCD', estado:'solido', dens:30, cond:0.9, masa:2.99, elec:1, fusReal:1541, ebuReal:2836, dureza:0.25, grupo:'⚛ transición' },
  eTi: { nom:'Titanio', sim:'Ti', z:22, col:'#BA9ACA', estado:'solido', dens:45, cond:0.9, masa:4.51, elec:1, fusReal:1668, ebuReal:3287, dureza:0.3, grupo:'⚛ transición' },
  eV: { nom:'Vanadio', sim:'V', z:23, col:'#B797C7', estado:'solido', dens:61, cond:0.9, masa:6.11, elec:1, fusReal:1910, ebuReal:3407, dureza:0.35, grupo:'⚛ transición' },
  eCr: { nom:'Cromo', sim:'Cr', z:24, col:'#B494C4', estado:'solido', dens:72, cond:0.9, masa:7.15, elec:1, fusReal:1907, ebuReal:2671, dureza:0.39, grupo:'⚛ transición' },
  eMn: { nom:'Manganeso', sim:'Mn', z:25, col:'#B191C1', estado:'solido', dens:74, cond:0.9, masa:7.44, elec:1, fusReal:1246, ebuReal:2061, dureza:0.4, grupo:'⚛ transición' },
  eFe: { nom:'Hierro', sim:'Fe', z:26, col:'#AE8EBE', estado:'solido', dens:79, cond:0.9, masa:7.87, elec:1, ferroso:1, fusReal:1538, ebuReal:2862, dureza:0.41, grupo:'⚛ transición' },
  eCo: { nom:'Cobalto', sim:'Co', z:27, col:'#D3B3E3', estado:'solido', dens:89, cond:0.9, masa:8.86, elec:1, ferroso:1, fusReal:1495, ebuReal:2927, dureza:0.45, grupo:'⚛ transición' },
  eNi: { nom:'Níquel', sim:'Ni', z:28, col:'#D0B0E0', estado:'solido', dens:89, cond:0.9, masa:8.91, elec:1, ferroso:1, fusReal:1455, ebuReal:2913, dureza:0.45, grupo:'⚛ transición' },
  eCu: { nom:'Cobre', sim:'Cu', z:29, col:'#CDADDD', estado:'solido', dens:90, cond:0.9, masa:8.96, elec:1, fusReal:1085, ebuReal:2562, dureza:0.45, grupo:'⚛ transición' },
  eZn: { nom:'Zinc', sim:'Zn', z:30, col:'#CAAADA', estado:'solido', dens:71, cond:0.9, masa:7.13, elec:1, fusReal:420, ebuReal:907, dureza:0.39, grupo:'⚛ transición' },
  eGa: { nom:'Galio', sim:'Ga', z:31, col:'#AFBBCB', estado:'solido', dens:59, cond:0.75, masa:5.91, elec:1, fusReal:30, ebuReal:2204, dureza:0.35, grupo:'⚛ metal' },
  eGe: { nom:'Germanio', sim:'Ge', z:32, col:'#73DADA', estado:'solido', dens:53, cond:0.3, masa:5.32, elec:0.4, fusReal:938, ebuReal:2833, dureza:0.33, grupo:'⚛ metaloide' },
  eAs: { nom:'Arsénico', sim:'As', z:33, col:'#70D7D7', estado:'solido', dens:58, cond:0.3, masa:5.78, elec:0.4, fusReal:817, ebuReal:614, dureza:0.34, grupo:'⚛ metaloide' },
  eSe: { nom:'Selenio', sim:'Se', z:34, col:'#7CD7A6', estado:'solido', dens:48, cond:0.12, masa:4.81, fusReal:221, ebuReal:685, dureza:0.31, grupo:'⚛ no metal' },
  eBr: { nom:'Bromo', sim:'Br', z:35, col:'#FADB56', estado:'liquido', dens:31, cond:0.12, masa:3.12, fusReal:-7, ebuReal:59, dureza:0.25, grupo:'⚛ halógeno' },
  eKr: { nom:'Kriptón', sim:'Kr', z:36, col:'#AF94F7', estado:'gas', dens:1, cond:0.12, masa:0.0037, ebuReal:-153, dureza:0.15, grupo:'⚛ noble' },
  eRb: { nom:'Rubidio', sim:'Rb', z:37, col:'#F47F50', estado:'solido', dens:15, cond:0.75, masa:1.53, elec:1, fusReal:39, ebuReal:688, dureza:0.2, grupo:'⚛ alcalino' },
  eSr: { nom:'Estroncio', sim:'Sr', z:38, col:'#F1B65D', estado:'solido', dens:26, cond:0.75, masa:2.64, elec:1, fusReal:777, ebuReal:1382, dureza:0.24, grupo:'⚛ alcalinotérreo' },
  eY: { nom:'Itrio', sim:'Y', z:39, col:'#AF8FBF', estado:'solido', dens:45, cond:0.9, masa:4.47, elec:1, fusReal:1526, ebuReal:3345, dureza:0.3, grupo:'⚛ transición' },
  eZr: { nom:'Circonio', sim:'Zr', z:40, col:'#AC8CBC', estado:'solido', dens:65, cond:0.9, masa:6.51, elec:1, fusReal:1855, ebuReal:4409, dureza:0.37, grupo:'⚛ transición' },
  eNb: { nom:'Niobio', sim:'Nb', z:41, col:'#D1B1E1', estado:'solido', dens:86, cond:0.9, masa:8.57, elec:1, fusReal:2477, ebuReal:4744, dureza:0.44, grupo:'⚛ transición' },
  eMo: { nom:'Molibdeno', sim:'Mo', z:42, col:'#CEAEDE', estado:'solido', dens:102, cond:0.9, masa:10.2, elec:1, fusReal:2623, ebuReal:4639, dureza:0.49, grupo:'⚛ transición' },
  eTc: { nom:'Tecnecio', sim:'Tc', z:43, col:'#CBABDB', estado:'solido', dens:110, cond:0.9, masa:11.0, elec:1, fusReal:2157, ebuReal:4265, dureza:0.52, grupo:'⚛ transición' },
  eRu: { nom:'Rutenio', sim:'Ru', z:44, col:'#C8A8D8', estado:'solido', dens:124, cond:0.9, masa:12.4, elec:1, fusReal:2334, ebuReal:4150, dureza:0.56, grupo:'⚛ transición' },
  eRh: { nom:'Rodio', sim:'Rh', z:45, col:'#C5A5D5', estado:'solido', dens:124, cond:0.9, masa:12.4, elec:1, fusReal:1964, ebuReal:3695, dureza:0.56, grupo:'⚛ transición' },
  ePd: { nom:'Paladio', sim:'Pd', z:46, col:'#C2A2D2', estado:'solido', dens:120, cond:0.9, masa:12.0, elec:1, fusReal:1555, ebuReal:2963, dureza:0.55, grupo:'⚛ transición' },
  eAg: { nom:'Plata', sim:'Ag', z:47, col:'#BF9FCF', estado:'solido', dens:105, cond:0.9, masa:10.5, elec:1, fusReal:962, ebuReal:2162, dureza:0.5, grupo:'⚛ transición' },
  eCd: { nom:'Cadmio', sim:'Cd', z:48, col:'#BC9CCC', estado:'solido', dens:87, cond:0.9, masa:8.69, elec:1, fusReal:321, ebuReal:767, dureza:0.44, grupo:'⚛ transición' },
  eIn: { nom:'Indio', sim:'In', z:49, col:'#A1ADBD', estado:'solido', dens:73, cond:0.75, masa:7.31, elec:1, fusReal:157, ebuReal:2072, dureza:0.39, grupo:'⚛ metal' },
  eSn: { nom:'Estaño', sim:'Sn', z:50, col:'#9EAABA', estado:'solido', dens:73, cond:0.75, masa:7.29, elec:1, fusReal:232, ebuReal:2602, dureza:0.39, grupo:'⚛ metal' },
  eSb: { nom:'Antimonio', sim:'Sb', z:51, col:'#62C9C9', estado:'solido', dens:67, cond:0.3, masa:6.68, elec:0.4, fusReal:631, ebuReal:1587, dureza:0.37, grupo:'⚛ metaloide' },
  eTe: { nom:'Telurio', sim:'Te', z:52, col:'#5FC6C6', estado:'solido', dens:62, cond:0.3, masa:6.24, elec:0.4, fusReal:450, ebuReal:988, dureza:0.36, grupo:'⚛ metaloide' },
  eI: { nom:'Yodo', sim:'I', z:53, col:'#ECCD48', estado:'solido', dens:49, cond:0.12, masa:4.93, fusReal:114, ebuReal:184, dureza:0.31, grupo:'⚛ halógeno' },
  eXe: { nom:'Xenón', sim:'Xe', z:54, col:'#C9AEFA', estado:'gas', dens:1, cond:0.12, masa:0.0059, ebuReal:-108, dureza:0.15, grupo:'⚛ noble' },
  eCs: { nom:'Cesio', sim:'Cs', z:55, col:'#FA996A', estado:'solido', dens:19, cond:0.75, masa:1.87, elec:1, fusReal:28, ebuReal:671, dureza:0.21, grupo:'⚛ alcalino' },
  eBa: { nom:'Bario', sim:'Ba', z:56, col:'#FAD077', estado:'solido', dens:36, cond:0.75, masa:3.59, elec:1, fusReal:727, ebuReal:1897, dureza:0.27, grupo:'⚛ alcalinotérreo' },
  eLa: { nom:'Lantano', sim:'La', z:57, col:'#FAA7CD', estado:'solido', dens:62, cond:0.75, masa:6.15, elec:1, fusReal:920, ebuReal:3464, dureza:0.35, grupo:'⚛ lantánido' },
  eCe: { nom:'Cerio', sim:'Ce', z:58, col:'#FAA4CA', estado:'solido', dens:68, cond:0.75, masa:6.77, elec:1, fusReal:795, ebuReal:3443, dureza:0.38, grupo:'⚛ lantánido' },
  ePr: { nom:'Praseodimio', sim:'Pr', z:59, col:'#FAA1C7', estado:'solido', dens:68, cond:0.75, masa:6.77, elec:1, fusReal:935, ebuReal:3520, dureza:0.38, grupo:'⚛ lantánido' },
  eNd: { nom:'Neodimio', sim:'Nd', z:60, col:'#FA9EC4', estado:'solido', dens:70, cond:0.75, masa:7.01, elec:1, fusReal:1024, ebuReal:3074, dureza:0.38, grupo:'⚛ lantánido' },
  ePm: { nom:'Prometio', sim:'Pm', z:61, col:'#FA9BC1', estado:'solido', dens:73, cond:0.75, masa:7.26, elec:1, fusReal:1042, ebuReal:3000, dureza:0.39, grupo:'⚛ lantánido' },
  eSm: { nom:'Samario', sim:'Sm', z:62, col:'#F998BE', estado:'solido', dens:75, cond:0.75, masa:7.52, elec:1, fusReal:1072, ebuReal:1794, dureza:0.4, grupo:'⚛ lantánido' },
  eEu: { nom:'Europio', sim:'Eu', z:63, col:'#F695BB', estado:'solido', dens:52, cond:0.75, masa:5.24, elec:1, fusReal:822, ebuReal:1529, dureza:0.32, grupo:'⚛ lantánido' },
  eGd: { nom:'Gadolinio', sim:'Gd', z:64, col:'#F392B8', estado:'solido', dens:79, cond:0.75, masa:7.9, elec:1, fusReal:1313, ebuReal:3273, dureza:0.41, grupo:'⚛ lantánido' },
  eTb: { nom:'Terbio', sim:'Tb', z:65, col:'#F08FB5', estado:'solido', dens:82, cond:0.75, masa:8.23, elec:1, fusReal:1356, ebuReal:3230, dureza:0.42, grupo:'⚛ lantánido' },
  eDy: { nom:'Disprosio', sim:'Dy', z:66, col:'#ED8CB2', estado:'solido', dens:86, cond:0.75, masa:8.55, elec:1, fusReal:1412, ebuReal:2567, dureza:0.44, grupo:'⚛ lantánido' },
  eHo: { nom:'Holmio', sim:'Ho', z:67, col:'#FAB1D7', estado:'solido', dens:88, cond:0.75, masa:8.8, elec:1, fusReal:1474, ebuReal:2700, dureza:0.44, grupo:'⚛ lantánido' },
  eEr: { nom:'Erbio', sim:'Er', z:68, col:'#FAAED4', estado:'solido', dens:91, cond:0.75, masa:9.07, elec:1, fusReal:1529, ebuReal:2868, dureza:0.45, grupo:'⚛ lantánido' },
  eTm: { nom:'Tulio', sim:'Tm', z:69, col:'#FAABD1', estado:'solido', dens:93, cond:0.75, masa:9.32, elec:1, fusReal:1545, ebuReal:1950, dureza:0.46, grupo:'⚛ lantánido' },
  eYb: { nom:'Iterbio', sim:'Yb', z:70, col:'#FAA8CE', estado:'solido', dens:69, cond:0.75, masa:6.9, elec:1, fusReal:819, ebuReal:1196, dureza:0.38, grupo:'⚛ lantánido' },
  eLu: { nom:'Lutecio', sim:'Lu', z:71, col:'#FAA5CB', estado:'solido', dens:98, cond:0.75, masa:9.84, elec:1, fusReal:1663, ebuReal:3402, dureza:0.48, grupo:'⚛ lantánido' },
  eHf: { nom:'Hafnio', sim:'Hf', z:72, col:'#C4A4D4', estado:'solido', dens:133, cond:0.9, masa:13.3, elec:1, fusReal:2233, ebuReal:4603, dureza:0.59, grupo:'⚛ transición' },
  eTa: { nom:'Tantalio', sim:'Ta', z:73, col:'#C1A1D1', estado:'solido', dens:164, cond:0.9, masa:16.4, elec:1, fusReal:3017, ebuReal:5458, dureza:0.7, grupo:'⚛ transición' },
  eW: { nom:'Wolframio', sim:'W', z:74, col:'#BE9ECE', estado:'solido', dens:193, cond:0.9, masa:19.3, elec:1, fusReal:3422, ebuReal:5555, dureza:0.79, grupo:'⚛ transición' },
  eRe: { nom:'Renio', sim:'Re', z:75, col:'#BB9BCB', estado:'solido', dens:208, cond:0.9, masa:20.8, elec:1, fusReal:3186, ebuReal:5596, dureza:0.84, grupo:'⚛ transición' },
  eOs: { nom:'Osmio', sim:'Os', z:76, col:'#B898C8', estado:'solido', dens:226, cond:0.9, masa:22.6, elec:1, fusReal:3033, ebuReal:5012, dureza:0.9, grupo:'⚛ transición' },
  eIr: { nom:'Iridio', sim:'Ir', z:77, col:'#B595C5', estado:'solido', dens:225, cond:0.9, masa:22.5, elec:1, fusReal:2466, ebuReal:4428, dureza:0.9, grupo:'⚛ transición' },
  ePt: { nom:'Platino', sim:'Pt', z:78, col:'#B292C2', estado:'solido', dens:215, cond:0.9, masa:21.5, elec:1, fusReal:1768, ebuReal:3825, dureza:0.87, grupo:'⚛ transición' },
  eAu: { nom:'Oro', sim:'Au', z:79, col:'#AF8FBF', estado:'solido', dens:193, cond:0.9, masa:19.3, elec:1, fusReal:1064, ebuReal:2856, dureza:0.79, grupo:'⚛ transición' },
  eHg: { nom:'Mercurio', sim:'Hg', z:80, col:'#AC8CBC', estado:'liquido', dens:135, cond:0.9, masa:13.5, elec:1, fusReal:-39, ebuReal:357, dureza:0.6, grupo:'⚛ transición' },
  eTl: { nom:'Talio', sim:'Tl', z:81, col:'#B9C5D5', estado:'solido', dens:118, cond:0.75, masa:11.8, elec:1, fusReal:304, ebuReal:1473, dureza:0.54, grupo:'⚛ metal' },
  ePb: { nom:'Plomo', sim:'Pb', z:82, col:'#B6C2D2', estado:'solido', dens:113, cond:0.75, masa:11.3, elec:1, fusReal:327, ebuReal:1749, dureza:0.53, grupo:'⚛ metal' },
  eBi: { nom:'Bismuto', sim:'Bi', z:83, col:'#B3BFCF', estado:'solido', dens:98, cond:0.75, masa:9.79, elec:1, fusReal:271, ebuReal:1564, dureza:0.48, grupo:'⚛ metal' },
  ePo: { nom:'Polonio', sim:'Po', z:84, col:'#77DEDE', estado:'solido', dens:92, cond:0.3, masa:9.2, elec:0.4, radia:true, fusReal:254, ebuReal:962, dureza:0.46, grupo:'⚛ metaloide' },
  eAt: { nom:'Ástato', sim:'At', z:85, col:'#FAE560', estado:'solido', dens:70, cond:0.12, masa:7.0, radia:true, fusReal:302, ebuReal:337, dureza:0.38, grupo:'⚛ halógeno' },
  eRn: { nom:'Radón', sim:'Rn', z:86, col:'#B99EFA', estado:'gas', dens:1, cond:0.12, masa:0.0097, radia:true, ebuReal:-62, dureza:0.15, grupo:'⚛ noble' },
  eFr: { nom:'Francio', sim:'Fr', z:87, col:'#FA895A', estado:'solido', dens:19, cond:0.75, masa:1.87, elec:1, radia:true, fusReal:27, ebuReal:677, dureza:0.21, grupo:'⚛ alcalino' },
  eRa: { nom:'Radio', sim:'Ra', z:88, col:'#FAC067', estado:'solido', dens:55, cond:0.75, masa:5.5, elec:1, radia:true, fusReal:700, ebuReal:1737, dureza:0.33, grupo:'⚛ alcalinotérreo' },
  eAc: { nom:'Actinio', sim:'Ac', z:89, col:'#F87397', estado:'solido', dens:101, cond:0.75, masa:10.1, elec:1, radia:true, fusReal:1050, ebuReal:3198, dureza:0.49, grupo:'⚛ actínido' },
  eTh: { nom:'Torio', sim:'Th', z:90, col:'#F57094', estado:'solido', dens:117, cond:0.75, masa:11.7, elec:1, radia:true, fusReal:1750, ebuReal:4788, dureza:0.54, grupo:'⚛ actínido' },
  ePa: { nom:'Protactinio', sim:'Pa', z:91, col:'#F26D91', estado:'solido', dens:154, cond:0.75, masa:15.4, elec:1, radia:true, fusReal:1572, ebuReal:4027, dureza:0.66, grupo:'⚛ actínido' },
  eU: { nom:'Uranio', sim:'U', z:92, col:'#EF6A8E', estado:'solido', dens:191, cond:0.75, masa:19.1, elec:1, radia:true, fusReal:1135, ebuReal:4131, dureza:0.79, grupo:'⚛ actínido' },
  eNp: { nom:'Neptunio', sim:'Np', z:93, col:'#EC678B', estado:'solido', dens:202, cond:0.75, masa:20.2, elec:1, radia:true, fusReal:644, ebuReal:3902, dureza:0.82, grupo:'⚛ actínido' },
  ePu: { nom:'Plutonio', sim:'Pu', z:94, col:'#FA8CB0', estado:'solido', dens:197, cond:0.75, masa:19.7, elec:1, radia:true, fusReal:640, ebuReal:3228, dureza:0.81, grupo:'⚛ actínido' },
  eAm: { nom:'Americio', sim:'Am', z:95, col:'#FA89AD', estado:'solido', dens:120, cond:0.75, masa:12.0, elec:1, radia:true, fusReal:1176, ebuReal:2011, dureza:0.55, grupo:'⚛ actínido' },
  eCm: { nom:'Curio', sim:'Cm', z:96, col:'#FA86AA', estado:'solido', dens:135, cond:0.75, masa:13.5, elec:1, radia:true, fusReal:1345, ebuReal:3110, dureza:0.6, grupo:'⚛ actínido' },
  eBk: { nom:'Berkelio', sim:'Bk', z:97, col:'#FA83A7', estado:'solido', dens:148, cond:0.75, masa:14.8, elec:1, radia:true, fusReal:1050, ebuReal:2627, dureza:0.64, grupo:'⚛ actínido' },
  eCf: { nom:'Californio', sim:'Cf', z:98, col:'#FA80A4', estado:'solido', dens:151, cond:0.75, masa:15.1, elec:1, radia:true, fusReal:900, ebuReal:1470, dureza:0.65, grupo:'⚛ actínido' },
  eEs: { nom:'Einstenio', sim:'Es', z:99, col:'#FA7DA1', estado:'solido', dens:88, cond:0.75, masa:8.84, elec:1, radia:true, fusReal:860, ebuReal:996, dureza:0.44, grupo:'⚛ actínido' },
  eFm: { nom:'Fermio', sim:'Fm', z:100, col:'#FA7A9E', estado:'solido', dens:97, cond:0.75, masa:9.7, elec:1, radia:true, fusReal:1527, dureza:0.47, grupo:'⚛ actínido' },
  eMd: { nom:'Mendelevio', sim:'Md', z:101, col:'#FA779B', estado:'solido', dens:103, cond:0.75, masa:10.3, elec:1, radia:true, fusReal:827, dureza:0.49, grupo:'⚛ actínido' },
  eNo: { nom:'Nobelio', sim:'No', z:102, col:'#F97498', estado:'solido', dens:99, cond:0.75, masa:9.9, elec:1, radia:true, fusReal:827, dureza:0.48, grupo:'⚛ actínido' },
  eLr: { nom:'Lawrencio', sim:'Lr', z:103, col:'#F67195', estado:'solido', dens:156, cond:0.75, masa:15.6, elec:1, radia:true, fusReal:1627, dureza:0.67, grupo:'⚛ actínido' },
  eRf: { nom:'Rutherfordio', sim:'Rf', z:104, col:'#B494C4', estado:'solido', dens:232, cond:0.9, masa:23.2, elec:1, radia:true, fusReal:2100, ebuReal:5500, dureza:0.9, grupo:'⚛ transición' , predicho:true },
  eDb: { nom:'Dubnio', sim:'Db', z:105, col:'#B191C1', estado:'solido', dens:293, cond:0.9, masa:29.3, elec:1, radia:true, dureza:0.9, grupo:'⚛ transición' , predicho:true },
  eSg: { nom:'Seaborgio', sim:'Sg', z:106, col:'#AE8EBE', estado:'solido', dens:350, cond:0.9, masa:35.0, elec:1, radia:true, dureza:0.9, grupo:'⚛ transición' , predicho:true },
  eBh: { nom:'Bohrio', sim:'Bh', z:107, col:'#D3B3E3', estado:'solido', dens:371, cond:0.9, masa:37.1, elec:1, radia:true, dureza:0.9, grupo:'⚛ transición' , predicho:true },
  eHs: { nom:'Hasio', sim:'Hs', z:108, col:'#D0B0E0', estado:'solido', dens:407, cond:0.9, masa:40.7, elec:1, radia:true, dureza:0.9, grupo:'⚛ transición' , predicho:true },
  eMt: { nom:'Meitnerio', sim:'Mt', z:109, col:'#CDADDD', estado:'solido', dens:374, cond:0.9, masa:37.4, elec:1, radia:true, dureza:0.9, grupo:'⚛ transición' , predicho:true },
  eDs: { nom:'Darmstadtio', sim:'Ds', z:110, col:'#CAAADA', estado:'solido', dens:348, cond:0.9, masa:34.8, elec:1, radia:true, dureza:0.9, grupo:'⚛ transición' , predicho:true },
  eRg: { nom:'Roentgenio', sim:'Rg', z:111, col:'#C7A7D7', estado:'solido', dens:287, cond:0.9, masa:28.7, elec:1, radia:true, dureza:0.9, grupo:'⚛ transición' , predicho:true },
  eCn: { nom:'Copernicio', sim:'Cn', z:112, col:'#C4A4D4', estado:'solido', dens:237, cond:0.9, masa:23.7, elec:1, radia:true, ebuReal:357, dureza:0.9, grupo:'⚛ transición' , predicho:true },
  eNh: { nom:'Nihonio', sim:'Nh', z:113, col:'#A9B5C5', estado:'solido', dens:160, cond:0.75, masa:16.0, elec:1, radia:true, fusReal:427, ebuReal:1127, dureza:0.68, grupo:'⚛ metal' , predicho:true },
  eFl: { nom:'Flerovio', sim:'Fl', z:114, col:'#A6B2C2', estado:'liquido', dens:140, cond:0.75, masa:14.0, elec:1, radia:true, fusReal:-73, ebuReal:107, dureza:0.62, grupo:'⚛ metal' , predicho:true },
  eMc: { nom:'Moscovio', sim:'Mc', z:115, col:'#A3AFBF', estado:'solido', dens:135, cond:0.75, masa:13.5, elec:1, radia:true, fusReal:400, ebuReal:1100, dureza:0.6, grupo:'⚛ metal' , predicho:true },
  eLv: { nom:'Livermorio', sim:'Lv', z:116, col:'#A0ACBC', estado:'solido', dens:129, cond:0.75, masa:12.9, elec:1, radia:true, fusReal:364, ebuReal:762, dureza:0.58, grupo:'⚛ metal' , predicho:true },
  eTs: { nom:'Teneso', sim:'Ts', z:117, col:'#F4D550', estado:'solido', dens:72, cond:0.12, masa:7.2, radia:true, fusReal:427, ebuReal:610, dureza:0.39, grupo:'⚛ halógeno' , predicho:true },
  eOg: { nom:'Oganesón', sim:'Og', z:118, col:'#A98EF1', estado:'gas', dens:500, cond:0.12, masa:5.0, radia:true, ebuReal:-8, dureza:0.32, grupo:'⚛ noble' , predicho:true },
};

/* ═══════════════════════════════════════════════════════════════════════════
   REACCIONES · qué pasa cuando dos cosas se tocan
   [A, B, → A pasa a ser, → B pasa a ser, probabilidad, calor que suelta, ENCIENDE]

   El séptimo campo es la temperatura MÍNIMA para que la reacción ocurra, y
   nació de un reporte de Carlos: «coloqué hidrógeno y oxígeno pero no sé cómo
   volverlo agua». Y tenía razón — la reacción existía desde el principio con
   probabilidad CERO y un comentario que decía «sólo con chispa». Esa chispa
   nunca se implementó: era una regla que no podía dispararse nunca, con una
   nota explicando por qué. Un `TODO` disfrazado de código.
   `null` quiere decir «se queda igual». Están en una tabla y no en `if`s por
   la misma razón que los elementos: para que crezcan sin tocar el motor.
   ═════════════════════════════════════════════════════════════════════════ */
export const REACCIONES = [
  ['lava',  'agua',   'piedra',  'vapor',   .85,  0],
  ['lava',  'salada', 'piedra',  'vapor',   .85,  0],
  ['lava',  'hielo',  'piedra',  'vapor',   .9,   0],
  ['lava',  'nieve',  'piedra',  'vapor',   .9,   0],
  ['agua',  'sal',    'salada',  'vacio',   .35,  0],
  ['agua',  'cemento','concreto','concreto',.28,  0],
  ['salada','cemento','concreto','concreto',.28,  0],
  ['acido', 'agua',   'acido',   'vacio',   .06,  12],
  ['fuego', 'aceite', 'fuego',   'fuego',   .55,  700],
  ['fuego', 'gasnat', 'fuego',   'fuego',   .95,  900],
  ['fuego', 'polvora','fuego',   'fuego',   .95,  1400],
  ['fuego', 'agua',   'humo',    'vapor',   .75,  0],
  ['fuego', 'salada', 'humo',    'vapor',   .75,  0],
  ['fuego', 'hielo',  'vacio',   'agua',    .6,   0],
  ['fuego', 'nieve',  'vacio',   'agua',    .7,   0],
  ['fuego', 'oxigeno','fuego',   'fuego',   .8,   200],
  ['fuego', 'planta', 'fuego',   'fuego',   .35,  500],
  ['fuego', 'semilla','fuego',   'ceniza',  .4,   400],
  /* La de verdad: 2H₂ + O₂ → 2H₂O. Necesita chispa —500°— y suelta MUCHO
     calor, que es lo que la vuelve peligrosa y lo que hace que se propague
     sola en cuanto empieza. */
  ['hidrogeno','oxigeno','agua',    'vapor',  .85,  2200, 500],
  /* Hidronio, H₃O⁺: el ion que hace que un ácido sea ácido. Sale de meterle
     un protón al agua, y aquí eso es agua + ácido. Corroe. */
  ['agua',     'acido',  'hidronio','acido',  .12,  30],
  ['hidronio', 'agua',   'hidronio','hidronio',.05, 10],
  ['vapor', 'hielo',  'agua',    'agua',    .3,   0],
  ['uranio','agua',   'uranio',  'vapor',   .12,  260],
  ['termita','oxigeno','fuego',  'fuego',   .5,   2600],
  ['semilla','agua',  'planta',  'vacio',   .06,  0],
  ['semilla','tierra','semilla', 'tierra',  0,    0],
];

/* ── RESISTENCIA ESTRUCTURAL, SEPARADA EN TRES ─────────────────────────
   Carlos: «no quiero que simplemente se rompa todo al mismo tiempo; la
   simulación debe comparar resistencia a la compresión, a la tracción, al
   corte, elasticidad, deformación, masa, geometría…». Y puso el caso exacto:
   un recipiente de concreto con un tapón de madera y presión dentro.

   Un solo número —`dureza`— no puede contestar eso, porque los materiales NO
   fallan igual en cada modo, y ahí está justamente la gracia:

     · el CONCRETO aguanta muchísimo a compresión y casi nada a tracción.
       Por eso el concreto de verdad va armado con varilla: la varilla pone
       la tracción que al concreto le falta.
     · la MADERA aguanta bien a tracción a lo largo de la fibra y se raja al
       CORTE con poco. Un tapón de madera en un tubo falla por corte.
     · el METAL aguanta parecido en los tres, y por eso sirve de refuerzo.
     · el VIDRIO es frágil: compresión alta, tracción ridícula.

   Los números están en la misma escala arbitraria, pero las PROPORCIONES
   entre modos son las de los materiales de verdad — que es lo que decide
   quién se rompe primero, y es lo único que aquí importa.

   `elastico` es cuánto se deforma antes de romperse: la madera se dobla, el
   vidrio no. Sirve para que un refuerzo reparta carga en vez de partirse. */
const RESISTENCIA = {
  /*                    compresión, tracción, corte, elástico */
  concreto:  { compresion:30, traccion: 3, corte: 4, elastico:0.05 },
  piedra:    { compresion:40, traccion: 4, corte: 5, elastico:0.03 },
  obsidiana: { compresion:45, traccion: 3, corte: 4, elastico:0.02 },
  vidrio:    { compresion:30, traccion: 3, corte: 3, elastico:0.02 },
  madera:    { compresion:12, traccion: 9, corte: 2, elastico:0.55 },
  metal:     { compresion:60, traccion:60, corte:40, elastico:0.35 },
  cobre:     { compresion:45, traccion:45, corte:30, elastico:0.45 },
  hielo:     { compresion: 5, traccion: 1, corte: 1, elastico:0.02 },
  globo:     { compresion: 1, traccion: 6, corte: 1, elastico:0.90 },
  aislante:  { compresion:10, traccion: 4, corte: 3, elastico:0.30 },
  ceniza:    { compresion: 2, traccion: 0.4, corte:0.5, elastico:0.10 },
};

/* ── UN ICONO POR ELEMENTO ──────────────────────────────────────────────
   Carlos: «ponles iconos más claros a cada cosa por favor, no se entiende
   bien qué es cada cosa sólo por el nombre». Va por elemento donde importa y
   por FAMILIA en los 118 —que ahí el símbolo químico ya dice más que
   cualquier dibujito, y un emoji distinto para cada uno sería ruido—.
   Es una tabla y no un `if`, por la misma razón que todo lo demás aquí:
   para que crezca sin tocar el motor. */
const ICONOS = {
  vacio:'⌫', muro:'🧱', arena:'🏖', tierra:'🟫', piedra:'🪨', grava:'🪨', sal:'🧂',
  salfun:'🌡', vidrio:'🪟', vidfun:'🫗', cemento:'🪣', concreto:'🧱',
  agua:'💧', salada:'🌊', hielo:'🧊', nieve:'❄️', vapor:'♨️', hielose:'🌫', co2:'💨',
  fuego:'🔥', humo:'💨', ceniza:'🌑', lava:'🌋', obsidiana:'⬛', termita:'✨',
  aceite:'🛢', gasnat:'💨', polvora:'🧨', nitro:'💥', madera:'🪵', carbon:'⚫',
  globo:'🎈', hidrogeno:'🎈', oxigeno:'🫧',
  metal:'🔩', metfun:'🫗', cobre:'🟠', bateria:'🔋', lampara:'💡', aislante:'🚫',
  mercurio:'🌡', iman:'🧲', electroiman:'🧲', ferroso:'🧲',
  interruptor:'🎚', resistencia:'🌡', pulsador:'⏱', motor:'⚙️',
  reloj:'⏳', valvula:'🚰', repetidor:'📶', observador:'👁', piston:'🔨', resorte:'🌀', pila:'🔋',
  estRoja:'🎆', estVerde:'🎆', estAzul:'🎆', estOro:'🎆', mecha:'🧵', chispa:'✨',
  gAND:'🔀', gOR:'🔀', gNOT:'🔁', diodo:'➡️', nand:'🔀', nor:'🔀', xor:'⊕', xnor:'⊜',
  acido:'🧪', hidronio:'⚗️', uranio:'☢️', planta:'🌱', semilla:'🌰',
};
const ICONO_FAMILIA = {
  '⚛ no metal':'🔬', '⚛ noble':'🎈', '⚛ alcalino':'⚡', '⚛ alcalinotérreo':'🧱',
  '⚛ metaloide':'🔷', '⚛ halógeno':'🧪', '⚛ metal':'🔩', '⚛ transición':'⚙️',
  '⚛ lantánido':'💠', '⚛ actínido':'☢️', '⚛ post-transición':'🔗',
};

/* ── LOS GASES DE LA TABLA, POR SU MASA MEDIDA ──────────────────────────
   Los 118 traen `masa` en g/cm³ de verdad —el helio 0.00018, el nitrógeno
   0.00125— y su `dens` de juego venía puesta a 1 para todos, o sea inservible
   para flotar. El aire son 0.0012 g/cm³, así que la densidad de juego sale de
   una división y no de una tabla escrita a mano: helio 0.15 veces el aire,
   nitrógeno 1.04, oxígeno 1.19, radón 7.7. Es el mismo dato real que ya
   estaba, usado para algo. */
for(const id of Object.keys(TABLA)){
  const e = TABLA[id];
  if(e.estado === 'gas' && e.masa) e.dens = Math.round((e.masa / 0.0012) * 1.2 * 100) / 100;
}

for(const id of Object.keys(JUEGO)) if(ICONOS[id]) JUEGO[id].ico = ICONOS[id];
/* Donde no hay dato medido, se deriva de la dureza — y se deriva con la forma
   de un material frágil (mucha compresión, poca tracción), que es lo que son
   casi todos los sólidos de este juego. Es una aproximación declarada, no un
   número inventado con cara de medición. */
for(const id of Object.keys(JUEGO)){
  const e = JUEGO[id];
  if(e.estado !== 'solido' || e.fijo) continue;
  const r = RESISTENCIA[id];
  if(r){ Object.assign(e, r); continue; }
  const d = e.dureza != null ? e.dureza : 0.3;
  e.compresion = 4 + d * 46;
  e.traccion   = 0.6 + d * 6;
  e.corte      = 0.8 + d * 7;
  e.elastico   = 0.1;
}
for(const id of Object.keys(TABLA)) TABLA[id].ico = ICONO_FAMILIA[TABLA[id].grupo] || '⚛';

/* Los de juego y los 118 en una sola tabla: el motor no distingue. */
Object.assign(JUEGO, TABLA);
export const ELEMENTOS = JUEGO;
