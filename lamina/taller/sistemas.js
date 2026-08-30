/* ══════════════════════════════════════════════════════════════════════════
   LOS SEIS SISTEMAS · el primer nivel del atlas
   ──────────────────────────────────────────────────────────────────────────
   ⚠ ESTA AGRUPACIÓN ES EDITORIAL Y POR ESO ESTÁ ESCRITA, NO DEDUCIDA. La
   versión anterior sacaba las áreas comparando contra `origin/main` con un
   `git ls-tree`: funcionaba mientras las áreas nuevas no estuvieran fusionadas,
   y el día que se fusionaron el atlas se quedó VACÍO sin que nada avisara. Un
   contenido que depende del estado de una rama no es contenido: es un efecto
   secundario.

   Cada sistema tiene su TONO, y el tono se hereda: el área lo aclara, la pieza
   lo usa para su acento. Así un color siempre quiere decir lo mismo — en el
   menú, en la ficha y en el campo de puntos del fondo.

   Ninguno de los seis tonos cae entre 270° y 310°, que es donde vive el
   violeta de la casa. No es casualidad: esto es el portafolio del
   departamento, no material de Grupo Mazi.
   ═════════════════════════════════════════════════════════════════════════ */
export const SISTEMAS = [
  { id:'ve',  n:1, nombre:'Lo que se ve',        tono:168,
    lema:'Forma, color y peso. Lo que la pantalla es antes de que nadie la toque.',
    areas:['color','tipografia','reticula','escala','superficie','profundidad',
           'sombras','bordes','iconos'] },
  { id:'mueve', n:2, nombre:'Lo que se mueve',   tono:196,
    lema:'El tiempo como material: qué se anima, qué espera y qué marea.',
    areas:['movimiento','paralaje','espera','gestos','medios','lienzo'] },
  { id:'lee', n:3, nombre:'Lo que se lee',       tono:224,
    lema:'Palabras, cifras e imágenes — y las maneras de que digan algo que no es.',
    areas:['contenido','datos','idiomas','marca','comercio','cognitiva','imagen'] },
  { id:'usa', n:4, nombre:'Lo que se usa',       tono:340,
    lema:'Lo que pasa cuando alguien toca. Controles, formularios y caminos.',
    areas:['interfaz','formularios','navegacion','busqueda','listas','edicion',
           'acceso','avisos','accesibilidad'] },
  { id:'sostiene', n:5, nombre:'Lo que se sostiene', tono:20,
    lema:'Que aguante seis meses y cinco personas: sistema, criterio y detalle.',
    areas:['sistema','estilos','detalles','pagina','diseno','referencias','oficio'] },
  { id:'entrega', n:6, nombre:'Lo que se entrega', tono:48,
    lema:'El último metro: lo que cuesta, lo que se imprime y lo que se promete.',
    areas:['rendimiento-visual','impresion','privacidad','entrega'] },
];
