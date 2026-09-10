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

export const ELEMENTOS = {
  /* ── lo básico ────────────────────────────────────────────────────────── */
  vacio:   { nom:'Vacío',   col:'#0B0712', estado:'gas',    dens:0,    cond:.02, grupo:'básico' },
  muro:    { nom:'Muro',    col:'#5A5468', estado:'solido', dens:999,  cond:.15, dureza:1, grupo:'básico' },

  /* ── tierra y piedra ──────────────────────────────────────────────────── */
  arena:   { nom:'Arena',   col:'#D9B168', estado:'polvo',  dens:16, cond:.12,
             fus:[1700,'vidrio'], dureza:.2, grupo:'tierra' },
  tierra:  { nom:'Tierra',  col:'#6B4A2F', estado:'polvo',  dens:15, cond:.10,
             dureza:.2, grupo:'tierra' },
  piedra:  { nom:'Piedra',  col:'#7C7687', estado:'solido', dens:25, cond:.20,
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
  hielo:   { nom:'Hielo',   col:'#A8DCF0', estado:'solido', dens:9, cond:.45,
             fus:[0,'agua'], dureza:.2, frio:true, grupo:'agua' },
  nieve:   { nom:'Nieve',   col:'#E8F4FA', estado:'polvo',  dens:5, cond:.20,
             fus:[0,'agua'], frio:true, grupo:'agua' },
  vapor:   { nom:'Vapor',   col:'#B9C9D6', estado:'gas',    dens:2, cond:.30,
             congela:[99,'agua'], grupo:'agua' },
  hielose: { nom:'Hielo seco', col:'#D6EEF5', estado:'polvo', dens:8, cond:.25,
             fus:[-78,'co2'], frio:true, grupo:'agua' },
  co2:     { nom:'CO₂',     col:'#7A8A94', estado:'gas',    dens:3, cond:.15,
             ahoga:true, grupo:'gases' },

  /* ── fuego, calor y sus restos ────────────────────────────────────────── */
  fuego:   { nom:'Fuego',   col:'#FF6A1A', estado:'energia', dens:1, cond:.9,
             vida:52, muere:'humo', calor:true, grupo:'fuego' },
  humo:    { nom:'Humo',    col:'#4A4453', estado:'gas',    dens:1, cond:.10,
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
  aceite:  { nom:'Aceite',  col:'#5A4520', estado:'liquido', dens:8, cond:.20,
             arde:.7, calorArde:700, ebu:[300,'gasnat'], grupo:'combustible' },
  gasnat:  { nom:'Gas',     col:'#93A05A', estado:'gas',    dens:2, cond:.10,
             arde:1, calorArde:900, grupo:'combustible' },
  polvora: { nom:'Pólvora', col:'#3E3A44', estado:'polvo',  dens:13, cond:.15,
             arde:1, calorArde:1400, explota:9, dureza:.05, grupo:'combustible' },
  /* ⚠ `inestable:.5` la hacía explotar SOLA a los pocos segundos de ponerla:
     Carlos no alcanzaba ni a construir con ella. La nitroglicerina de verdad
     no detona por existir — detona por GOLPE, y eso ahora se mide con la
     velocidad de impacto. `golpe` es a qué velocidad revienta. */
  nitro:   { nom:'Nitroglicerina', col:'#C8B96A', estado:'liquido', dens:12, cond:.2,
             arde:1, calorArde:2200, explota:22, golpe:2.2, grupo:'combustible' },
  madera:  { nom:'Madera',  col:'#7A5230', estado:'solido', dens:19, cond:.12,
             arde:.35, calorArde:600, dureza:.25, grupo:'combustible' },
  carbon:  { nom:'Carbón',  col:'#26222C', estado:'polvo',  dens:14, cond:.16,
             arde:.5, calorArde:1100, dureza:.15, grupo:'combustible' },

  /* ── gases ────────────────────────────────────────────────────────────── */
  hidrogeno:{nom:'Hidrógeno',col:'#C9D8FF',estado:'gas',   dens:1, cond:.5,
             arde:1, calorArde:1200, explota:7, sube:2, grupo:'gases' },
  oxigeno: { nom:'Oxígeno',  col:'#8FD8FF', estado:'gas',   dens:2, cond:.2,
             aviva:true, grupo:'gases' },

  /* ── metales y electricidad ───────────────────────────────────────────── */
  metal:   { nom:'Metal',   col:'#9AA3B0', estado:'solido', dens:30, cond:.95,
             elec:1, fus:[1450,'metfun'], dureza:.8, grupo:'eléctrico' },
  metfun:  { nom:'Metal fundido', col:'#FFB03D', estado:'liquido', dens:29, cond:.95,
             elec:1, congela:[1400,'metal'], nace:1500, grupo:'eléctrico' },
  cobre:   { nom:'Cobre',   col:'#C87A45', estado:'solido', dens:31, cond:1,
             elec:1, fus:[1085,'metfun'], dureza:.7, grupo:'eléctrico' },
  bateria: { nom:'Batería', col:'#FFC53D', estado:'solido', dens:40, cond:.4,
             elec:1, fuente:true, dureza:.6, grupo:'eléctrico' },
  lampara: { nom:'Lámpara', col:'#6E6A55', estado:'solido', dens:28, cond:.3,
             elec:1, lampara:true, dureza:.4, grupo:'eléctrico' },
  aislante:{ nom:'Aislante',col:'#3A3446', estado:'solido', dens:20, cond:.05,
             elec:0, dureza:.5, grupo:'eléctrico' },
  mercurio:{ nom:'Mercurio',col:'#B9C2CC', estado:'liquido', dens:34, cond:.7,
             elec:1, congela:[-39,'metal'], grupo:'eléctrico' },

  /* ── compuertas lógicas · con esto se PROGRAMA dentro del juego ───────── */
  gAND:    { nom:'Y (AND)',  col:'#3DFFC5', estado:'solido', dens:40, cond:.2,
             elec:1, puerta:'and', dureza:.5, grupo:'lógica' },
  gOR:     { nom:'O (OR)',   col:'#3DC5FF', estado:'solido', dens:40, cond:.2,
             elec:1, puerta:'or',  dureza:.5, grupo:'lógica' },
  gNOT:    { nom:'NO (NOT)', col:'#FF3D9E', estado:'solido', dens:40, cond:.2,
             elec:1, puerta:'not', dureza:.5, grupo:'lógica' },
  diodo:   { nom:'Diodo',    col:'#AC27FF', estado:'solido', dens:40, cond:.2,
             elec:1, puerta:'diodo', dureza:.5, grupo:'lógica' },

  /* ── química agresiva ─────────────────────────────────────────────────── */
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
   REACCIONES · qué pasa cuando dos cosas se tocan
   [A, B, → A pasa a ser, → B pasa a ser, probabilidad, calor que suelta]
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
  ['hidrogeno','oxigeno','agua', 'vacio',   .0,   0],   /* sólo con chispa */
  ['vapor', 'hielo',  'agua',    'agua',    .3,   0],
  ['uranio','agua',   'uranio',  'vapor',   .12,  260],
  ['termita','oxigeno','fuego',  'fuego',   .5,   2600],
  ['semilla','agua',  'planta',  'vacio',   .06,  0],
  ['semilla','tierra','semilla', 'tierra',  0,    0],
];
