/* ============================================================
   EL PACTO ROTO — data.js
   Contenido del mundo: gramática de magia, clases, razas,
   reinos, facciones, bestiario, recetas, materiales, tablas.
   ============================================================ */
window.DATA = (function () {

  /* ---------- GRAMÁTICA DE MAGIA ---------- */
  // Sigilos = elemento (al centro). Signos = forma (alrededor, dentro del anillo).
  const SIGILOS = {
    fuego:  { g:'◉', nombre:'Fuego',  efecto:'calor, combustión' },
    agua:   { g:'≈', nombre:'Agua',   efecto:'fluido, frío' },
    tierra: { g:'△', nombre:'Tierra', efecto:'masa, piedra' },
    viento: { g:'✳', nombre:'Viento', efecto:'movimiento, presión' },
    luz:    { g:'☼', nombre:'Luz',    efecto:'luz, revelación' },
  };
  const SIGNOS = {
    columna:     { g:'↑', nombre:'Columna',     efecto:'chorro dirigido', inv:'implosión' },
    dispersion:  { g:'⁂', nombre:'Dispersión',  efecto:'sale por todos lados', inv:'absorbe' },
    arco:        { g:'⌒', nombre:'Arco',        efecto:'barrera, cúpula', inv:'apertura' },
    espiral:     { g:'⟳', nombre:'Espiral',     efecto:'rotación', inv:'frenado' },
    repeticion:  { g:'∥', nombre:'Repetición',  efecto:'multiplica', inv:'anula' },
    reduccion:   { g:'▽', nombre:'Reducción',   efecto:'encoge', inv:'expande' },
    cadena:      { g:'⌇', nombre:'Cadena',      efecto:'ata, conecta', inv:'libera' },
    contencion:  { g:'⊙', nombre:'Contención',  efecto:'encierra', inv:'estalla' },
    cristal:     { g:'⟠', nombre:'Cristal',     efecto:'solidifica', inv:'disuelve' },
    chispa:      { g:'⌁', nombre:'Chispa',      efecto:'ignición', inv:'apaga' },
    persistencia:{ g:'⊹', nombre:'Persistencia',efecto:'dura más', inv:'efímero' },
    vector:      { g:'⟨', nombre:'Vector',      efecto:'dirección', inv:'retroceso' },
  };
  // Ejemplos derivados — calibran al árbitro (few-shot).
  const EJEMPLOS_SELLO = [
    '≈ + ↑ = chorro de agua a presión',
    '≈ + ⁂ = lluvia',
    '◉ + ⊙ + ⊹ = fuego contenido que dura → linterna',
    '△ + ▽ = pulverizar piedra',
    '◉ + ⁂ + ▽(invertido) + anillo débil = bomba de humo',
    '✳ + ⟠(invertido) + ⌇ + ⊹ = caballos de aire atados a ti',
    '☼ + ⌇ = jaula de luz que ata',
    '△ + ⟠ + ⌇ SOBRE CARNE = petrificación parcial (PROHIBIDO)',
  ];

  /* ---------- CLASES ---------- */
  const CLASES = {
    grabador: {
      nombre:'Grabador', rol:'el que dibuja',
      stats:{ fue:2, int:5, mana:5, suerte:3 },
      activas:['Trazo Rápido','Tinta Compartida','Lectura de Sello','Corrección','Sello Diferido'],
      ultimate:'Sello Anidado — mete un hechizo dentro de otro anillo y combina efectos',
      pasiva:'Mano Firme — la limpieza del trazo se corrige sola',
      evo:{ nombre:'Trazador Herético', cond:'dibujar sobre carne y sobrevivir tres veces' },
      bonus_sello:2, desc:'Vive del anillo. Débil de cuerpo, letal con la pluma.'
    },
    vinculo: {
      nombre:'Vínculo', rol:'el que domestica',
      stats:{ fue:3, int:3, mana:3, suerte:5 },
      activas:['Llamado','Ofrenda','Calmar','Rastreo','Marca de Manada'],
      ultimate:'Pacto — el animal deja de ser mascota y pelea con turno propio',
      pasiva:'Ninguna bestia huye de ti primero',
      evo:{ nombre:'Señor de Bestias', cond:'domesticar cinco especies distintas' },
      bonus_sello:0, desc:'Nunca estás solo. El monte te obedece antes que a nadie.'
    },
    rompesellos: {
      nombre:'Rompesellos', rol:'el anti-mago',
      stats:{ fue:5, int:2, mana:2, suerte:4 },
      activas:['Golpe Seco','Interrupción','Guardia','Carga','Desarme'],
      ultimate:'Ruptura — anula todo sello activo en un radio',
      pasiva:'Resistencia a magia según nivel',
      evo:{ nombre:'Caballero Moralis', cond:'quebrar diez sellos enemigos' },
      bonus_sello:-1, desc:'La magia se rompe con los puños. Los Moralis te querrán de su lado.'
    },
    tintero: {
      nombre:'Tintero', rol:'economía, cocina, alquimia',
      stats:{ fue:3, int:4, mana:4, suerte:4 },
      activas:['Mezclar Tinta','Cocinar','Tasar','Regatear','Conservar'],
      ultimate:'Tinta Propia — creas tinta que ninguna tienda vende',
      pasiva:'Todo cuesta menos y todo dura más',
      evo:{ nombre:'Alquimista del Árbol Plateado', cond:'destilar una poción legendaria' },
      bonus_sello:1, desc:'El oficio es poder. Cocina, destila, regatea, sobrevive.'
    },
  };

  /* ---------- RAZAS ---------- */
  const RAZAS = {
    ceniza:   { nombre:'Hijo de la Ceniza', mods:{ int:1, mana:1 }, sesgo:'grabadores',
                desc:'Del Norte frío. Memoria larga; recuerdan que la magia fue de todos.' },
    pardo:    { nombre:'Pardo del Valle',   mods:{ fue:1, suerte:1 }, sesgo:'pueblos',
                desc:'Gente de labranza y camino. Nadie los mira dos veces — y eso conviene.' },
    petreo:   { nombre:'Pétreo',            mods:{ fue:2, mana:-1 }, sesgo:'ruinas',
                desc:'Nacidos junto a las Ruinas. Piel dura, sangre lenta, terca voluntad.' },
    errante:  { nombre:'Errante del Yermo',  mods:{ suerte:2, fue:-1 }, sesgo:'salvaje',
                desc:'Sin reino. Leen el monte y las bestias como quien lee un libro.' },
    marcado:  { nombre:'Marcado',           mods:{ mana:2, int:-1 }, sesgo:'inframundo',
                desc:'Algo del inframundo les tocó al nacer. Los evitan; ellos ya se acostumbraron.' },
  };

  /* ---------- MUNDO: reinos, facciones ---------- */
  const FACCIONES = {
    sombreros:  { nombre:'Sombreros Puntiagudos', color:'gold',
                  desc:'La orden que monopoliza la magia y le borró al mundo su recuerdo.' },
    moralis:    { nombre:'Caballeros Moralis', color:'blood',
                  desc:'Cazadores anti-magia. Persiguen a quien dibuja sobre carne y le borran la memoria.' },
    brimhats:   { nombre:'Sombreros de Ala', color:'verd',
                  desc:'Herejes. Creen que la magia debe volver a ser de todos. Reclutan a los cazados.' },
    valle:      { nombre:'Ligas del Valle', color:'verd',
                  desc:'Pueblos libres, gremios, contrabandistas. No aman a nadie, comercian con todos.' },
    corte:      { nombre:'La Corte de Ceniza', color:'gold',
                  desc:'El reino del Norte. Reyes viejos que fingen no saber de magia.' },
  };

  // Nodos del mapa (x,y en %). region -> escuela pictórica.
  const NODOS = {
    velamuerta:{ nombre:'Umbral de Vela Muerta', region:'ruinas', x:50, y:82, tipo:'pueblo',
      faccion:'valle', nivel:1, desc:'Un puesto de piedra a la sombra de las Ruinas. Aquí empieza todo.',
      con:['puentecorvo','ermita'], servicios:['posada','herreria','tienda','atelier'] },
    puentecorvo:{ nombre:'Puente del Cuervo', region:'ruinas', x:26, y:64, tipo:'pueblo',
      faccion:'valle', nivel:3, desc:'Un pueblo colgado sobre el vacío de una prisión sin fondo.',
      con:['velamuerta','ciudadela','yermo'], servicios:['posada','tienda','cocina','muelle'] },
    ermita:{ nombre:'Ermita del Roble', region:'norte', x:72, y:62, tipo:'refugio',
      faccion:'corte', nivel:2, desc:'Una abadía sola en el robledal. Los monjes callan de más.',
      con:['velamuerta','corte'], servicios:['posada','alquimia','artesania'] },
    ciudadela:{ nombre:'Ciudadela de los Sombreros', region:'ruinas', x:14, y:42, tipo:'ciudad',
      faccion:'sombreros', nivel:6, desc:'La fortaleza de la orden. Aquí la magia es de ellos y de nadie más.',
      con:['puentecorvo','corte'], servicios:['tienda','atelier','orbes'] },
    corte:{ nombre:'La Corte de Ceniza', region:'norte', x:60, y:32, tipo:'ciudad',
      faccion:'corte', nivel:5, desc:'El trono del Norte, blanco de nieve y de mentiras.',
      con:['ermita','ciudadela','mar'], servicios:['posada','tienda','herreria','cocina','alquimia','artesania','orbes'] },
    yermo:{ nombre:'El Yermo', region:'salvaje', x:34, y:88, tipo:'salvaje',
      faccion:null, nivel:4, desc:'Tierra de nadie. Bestias, cazadores y cosas sin nombre.',
      con:['puentecorvo','umbral'], servicios:['caza','pesca'] },
    mar:{ nombre:'La Isla de los Callados', region:'mar', x:84, y:20, tipo:'refugio',
      faccion:'brimhats', nivel:7, desc:'Cipreses negros sobre el agua. Los herejes se esconden aquí.',
      con:['corte'], servicios:['posada','atelier','artesania'] },
    umbral:{ nombre:'Umbral de la Ceniza Viva', region:'inframundo', x:20, y:96, tipo:'inframundo',
      faccion:null, nivel:9, desc:'Una grieta que respira. Del otro lado no hay reglas, ni memoria, ni salida fácil.',
      con:['yermo'], servicios:['atelier'], locked:true, lockHint:'Se abre cuando el Rastro te consuma o cuando halles la llave.' },
  };

  /* ---------- BESTIARIO ---------- */
  // art = id del catálogo museo para el retrato/escena.
  const BESTIARIO = {
    espectro_ceniza:{ nombre:'Espectro de Ceniza', nivel:1, hp:14, region:'ruinas', art:'ruinas_torre',
      desc:'Un jirón de humo con forma de hombre. Recuerda apenas quién fue.' },
    can_prision:{ nombre:'Can de la Prisión', nivel:2, hp:20, region:'ruinas', art:'ruinas_puente',
      desc:'Perro de piedra y hambre. Guarda puentes que no llevan a ningún lado.', domesticable:true },
    yokai_hueso:{ nombre:'Yōkai de Hueso', nivel:4, hp:34, region:'salvaje', art:'salvaje_bruja',
      desc:'Un esqueleto que se ríe de tu miedo. Kuniyoshi lo pintó; tú lo vas a pelear.' },
    lobo_yermo:{ nombre:'Lobo del Yermo', nivel:3, hp:26, region:'salvaje', art:'salvaje_combate',
      desc:'Flaco, veloz, con ojos de brasa. Caza en grupo.', domesticable:true },
    caminante_niebla:{ nombre:'Caminante de la Niebla', nivel:5, hp:40, region:'norte', art:'norte_wanderer',
      desc:'De espaldas siempre, mirando un abismo de niebla. No voltea nunca.' },
    saturno:{ nombre:'El Devorador', nivel:8, hp:80, region:'inframundo', art:'goya_saturno',
      desc:'Come a sus propios hijos. Goya lo vio; ojalá tú no.' },
    moralis_patrulla:{ nombre:'Patrulla Moralis', nivel:6, hp:55, region:'*', art:'guerra_ira', moralis:true,
      desc:'Vienen por tu Rastro. Su Ruptura te anula el sello a media formación. Dibujar frente a ellos es suicidio.' },
    pesadilla:{ nombre:'La Pesadilla', nivel:7, hp:60, region:'inframundo', art:'pesadilla',
      desc:'Se sienta sobre tu pecho mientras duermes. Fuseli la conoció.' },
    triunfo:{ nombre:'Hueste de la Muerte', nivel:9, hp:100, region:'guerra', art:'bruegel_muerte',
      desc:'No es un enemigo. Es un ejército. Bruegel lo pintó marchando.' },
  };

  /* ---------- MATERIALES / ÍTEMS ---------- */
  // sheet: hoja LPC; i: índice en la hoja (col,row) 32px; o museo.
  const FOOD_SHEET = { fv:'arte/lpc/food/fruits-veggies.png', ap:'arte/lpc/food/animal-products.png', bp:'arte/lpc/food/bread-pastry.png' };
  const MATS = {
    // ingredientes de cocina (sprites LPC food)
    manzana:  { nombre:'Manzana',    tipo:'ingrediente', sheet:'fv', col:0, row:0 },
    zanahoria:{ nombre:'Zanahoria',  tipo:'ingrediente', sheet:'fv', col:1, row:2 },
    seta:     { nombre:'Seta',       tipo:'ingrediente', sheet:'fv', col:3, row:5 },
    trigo:    { nombre:'Trigo',      tipo:'ingrediente', sheet:'bp', col:0, row:0 },
    carne:    { nombre:'Carne cruda',tipo:'ingrediente', sheet:'ap', col:2, row:1 },
    pescado:  { nombre:'Pescado',    tipo:'ingrediente', sheet:'ap', col:4, row:3 },
    huevo:    { nombre:'Huevo',      tipo:'ingrediente', sheet:'ap', col:0, row:2 },
    // materiales de herrería / artesanía (sin sprite → glifo)
    mena:     { nombre:'Mena de hierro', tipo:'metal', glifo:'⛰' },
    lingote:  { nombre:'Lingote',        tipo:'metal', glifo:'▬' },
    carbon:   { nombre:'Carbón',         tipo:'metal', glifo:'◆' },
    gema:     { nombre:'Gema en bruto',  tipo:'gema',  glifo:'❖' },
    cuero:    { nombre:'Cuero',          tipo:'fibra', glifo:'▤' },
    madera:   { nombre:'Madera',         tipo:'fibra', glifo:'▮' },
    // hierbas de alquimia
    ceniza_h: { nombre:'Ceniza viva',   tipo:'hierba', glifo:'✺' },
    raiz:     { nombre:'Raíz amarga',   tipo:'hierba', glifo:'⚘' },
    esporas:  { nombre:'Esporas',       tipo:'hierba', glifo:'❀' },
    lagrima:  { nombre:'Lágrima de piedra', tipo:'hierba', glifo:'◇' },
  };

  /* ---------- RECETAS ---------- */
  // Cada oficio: recetas descubribles. reqs = {mat:qty}. base define stats del ítem.
  const RECETAS = {
    cocina:[
      { id:'guiso',   nombre:'Guiso del camino', reqs:{carne:1, zanahoria:1}, buff:{hp:12}, desc:'Cura y reconforta.' },
      { id:'pan',     nombre:'Pan de trigo',     reqs:{trigo:2},              buff:{hp:6},  desc:'Aguanta el hambre.' },
      { id:'caldo',   nombre:'Caldo de seta',    reqs:{seta:2, huevo:1},      buff:{mana:10}, desc:'Despeja la mente, sube maná.' },
      { id:'asado',   nombre:'Pescado asado',    reqs:{pescado:2},            buff:{hp:10, suerte:1}, desc:'Comida de pescador con suerte.' },
    ],
    herreria:[
      { id:'daga',    nombre:'Daga', reqs:{lingote:1}, slot:'arma', base:{ataque:4}, desc:'Rápida y honesta.' },
      { id:'espada',  nombre:'Espada corta', reqs:{lingote:2, carbon:1}, slot:'arma', base:{ataque:8}, desc:'El acero del Valle.' },
      { id:'peto',    nombre:'Peto de placas', reqs:{lingote:3, cuero:1}, slot:'armadura', base:{defensa:6}, desc:'Pesa, pero para eso es.' },
      { id:'hoja_gema',nombre:'Hoja engemada', reqs:{lingote:2, gema:1, carbon:1}, slot:'arma', base:{ataque:11, mana:2}, desc:'El filo canta cuando dibujas.' },
    ],
    alquimia:[
      { id:'sanadora', nombre:'Poción sanadora', reqs:{raiz:1, ceniza_h:1}, efecto:{hp:30}, desc:'Sella la carne.' },
      { id:'mana',     nombre:'Elixir de maná',  reqs:{esporas:1, lagrima:1}, efecto:{mana:25}, desc:'La tinta vuelve a fluir.' },
      { id:'humo',     nombre:'Bomba de humo',   reqs:{ceniza_h:1, esporas:1}, efecto:{huir:true}, desc:'Desaparece de un combate.' },
      { id:'antimoralis',nombre:'Bruma del olvido', reqs:{lagrima:2, ceniza_h:1}, efecto:{rastro:-1}, desc:'Confunde a quien te rastrea. Baja el Rastro.' },
    ],
    artesania:[
      { id:'cebo',    nombre:'Cebo trenzado', reqs:{cuero:1, esporas:1}, uso:'domesticar', desc:'Atrae bestias.' },
      { id:'caña',    nombre:'Caña de pescar', reqs:{madera:2, cuero:1}, uso:'pesca', desc:'Para el muelle.' },
      { id:'trampa',  nombre:'Trampa de caza', reqs:{madera:1, lingote:1}, uso:'caza', desc:'Para el monte.' },
      { id:'foco',    nombre:'Foco de tinta', reqs:{madera:1, gema:1}, slot:'foco', base:{focos:1}, desc:'Guarda un hechizo para auto-lanzarlo.' },
    ],
  };

  /* ---------- PESCA / CAZA ---------- */
  const PECES = [
    { nombre:'Carpa gris', mat:'pescado', dif:1, peso:'—' },
    { nombre:'Anguila de puente', mat:'pescado', dif:2, peso:'larga' },
    { nombre:'Siluro ciego', mat:'pescado', dif:3, peso:'enorme', raro:true },
  ];
  const CAZA = [
    { nombre:'Liebre', mat:'carne', dif:1 },
    { nombre:'Ciervo del yermo', mat:'carne', dif:2, extra:'cuero' },
    { nombre:'Jabalí de ceniza', mat:'carne', dif:3, extra:'cuero', peligro:true },
  ];

  /* ---------- RASTRO / MORALIS ---------- */
  const RASTRO = [
    { nivel:0, estado:'Limpio', efecto:'Nadie te busca.' },
    { nivel:1, estado:'Sospecha', efecto:'Un Moralis preguntó por ti en el pueblo.' },
    { nivel:2, estado:'Marca', efecto:'Te borraron un hechizo del grimorio. No te dicen cuál.' },
    { nivel:3, estado:'Cacería', efecto:'Patrullas activas. Los pueblos leales cierran la puerta.' },
    { nivel:4, estado:'Sombrero de Ala', efecto:'Facción enemiga completa. Los herejes te reclutan. Sin vuelta.' },
  ];

  /* ---------- MOTOR DE REGLAS (modo sin datos) ---------- */
  // Eventos de exploración por región para el narrador local.
  const EVENTOS = {
    ruinas:[
      { t:'Una escalera sube hacia un techo que no existe. En el escalón más alto, algo brilla.',
        art:'ruinas_arco', ops:[{t:'Subir por el brillo', r:{xp:6}, loot:['gema']},{t:'Dar la vuelta', r:{}}] },
      { t:'Un espectro de ceniza barre el suelo con manos que ya no tiene. No te ha visto.',
        art:'ruinas_torre', enemigo:'espectro_ceniza' },
      { t:'Piedra floja. Bajo ella, mena de hierro y un hueso con marcas de dientes.',
        art:'ruinas_puente', ops:[{t:'Recoger la mena', r:{}, loot:['mena','mena']},{t:'Seguir', r:{}}] },
    ],
    norte:[
      { t:'Un caminante te da la espalda frente al mar de niebla. No voltea, ni cuando lo llamas.',
        art:'norte_wanderer', ops:[{t:'Ponerte a su lado', r:{mana:4}},{t:'Dejarlo con su abismo', r:{}}] },
      { t:'Nieve, una iglesia sin puertas, y huellas que entran pero no salen.',
        art:'norte_invierno', ops:[{t:'Entrar', r:{xp:8}, loot:['ceniza_h']},{t:'No entrar', r:{}}] },
      { t:'Dos figuras contemplan la luna sobre un roble muerto. Te hacen sitio sin hablar.',
        art:'luna', ops:[{t:'Contemplar con ellas', r:{mana:6, moral:1}},{t:'Seguir camino', r:{}}] },
    ],
    salvaje:[
      { t:'Un lobo del yermo te mide desde los matorrales. Flaco. Tiene hambre y crías.',
        art:'salvaje_combate', enemigo:'lobo_yermo' },
      { t:'Rastro fresco de ciervo. El monte huele a lluvia por venir.',
        art:'salvaje_bruja', ops:[{t:'Rastrear (caza)', r:{}, ir:'caza'},{t:'Ignorar', r:{}}] },
    ],
    inframundo:[
      { t:'El suelo respira. Doré dibujó este lugar y ni él le puso salida.',
        art:'dore_satan', ops:[{t:'Avanzar hacia el fondo', r:{rastro:1, xp:14}},{t:'Retroceder', r:{}}] },
      { t:'Un jardín de deleites que terminó en hoguera. Algo te llama por tu nombre viejo.',
        art:'goya_saturno', enemigo:'saturno' },
    ],
    mar:[
      { t:'Cipreses negros sobre agua quieta. Una barca te espera sin remero.',
        art:'bocklin_isla', ops:[{t:'Subir a la barca', r:{xp:10}},{t:'Quedarte en la orilla', r:{}}] },
    ],
    guerra:[
      { t:'Dos reinos se rompen en el valle. El cielo es de John Martin y el suelo, de Bruegel.',
        art:'guerra_ira', ops:[{t:'Cruzar entre los ejércitos', r:{rastro:0, xp:12}},{t:'Rodear', r:{}}] },
    ],
  };

  return { SIGILOS, SIGNOS, EJEMPLOS_SELLO, CLASES, RAZAS, FACCIONES, NODOS,
           BESTIARIO, MATS, FOOD_SHEET, RECETAS, PECES, CAZA, RASTRO, EVENTOS };
})();
