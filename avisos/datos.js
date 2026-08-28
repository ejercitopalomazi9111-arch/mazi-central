/* ══════════════════════════════════════════════════════════════════════════
   LOS DATOS DEL 3.1 · lo que cambia cada semestre vive AQUÍ y en ningún otro
   lado. Salen del horario que mandó Carlos, no de suponer.

   Si cambia el horario, se cambia este archivo y ya: la herramienta no sabe
   nada de materias, sólo lee esta lista.
   ═════════════════════════════════════════════════════════════════════════ */

/* Cada materia trae su dibujo y su color. El color NO es decoración: es lo que
   deja que el alumno encuentre su materia de un vistazo sin leer. */
const MATERIAS = [
  { id:'quimbio',  nombre:'Química y Biología III',   corto:'Química y Bio',   maestro:'Michelle Ramírez',        icono:'matraz',   color:'#3F6B45' },
  { id:'geometria',nombre:'Geometría Analítica',      corto:'Geometría',       maestro:'Daniel Vázquez Alvarado', icono:'escuadra', color:'#1E5083' },
  { id:'progra',   nombre:'Programación y BD',        corto:'Programación',    maestro:'Michelle Ramírez Almaraz',icono:'codigo',   color:'#8C2D18' },
  { id:'fisica',   nombre:'Física I enfoque STEAM',   corto:'Física',          maestro:'Daniel Vázquez',          icono:'atomo',    color:'#123A5E' },
  { id:'ingles',   nombre:'Inglés III',               corto:'Inglés',          maestro:'Valentín Hernández Salazar', icono:'globo', color:'#5D2469' },
  { id:'efisica',  nombre:'Educación Física III',     corto:'Educación Física',maestro:'Diana Olvera Antonio',    icono:'pelota',   color:'#3F6B45' },
  { id:'metodo',   nombre:'Metodología Inv. I STEAM', corto:'Metodología',     maestro:'Omar Ávila Cruz',         icono:'lupa',     color:'#8A6516' }  /* el dorado #B98A2E medía 3.07 de contraste sobre el papel: no se leía */,
  { id:'etica',    nombre:'Humanidades III y Ética',  corto:'Humanidades',     maestro:'Omar Ávila Cruz',         icono:'balanza',  color:'#5D2469' },
  { id:'mtto',     nombre:'Mto. de equipo y SO',      corto:'Mantenimiento',   maestro:'Fernanda Rosas',          icono:'monitor',  color:'#1E5083' },
  { id:'tec',      nombre:'TEC III',                  corto:'TEC',             maestro:'Fernanda Rosas Mendoza',  icono:'engrane',  color:'#8C2D18' },
  { id:'redes',    nombre:'Admón. y estructura de redes', corto:'Redes',       maestro:'Ricardo Carrillo Cue',    icono:'red',      color:'#123A5E' },
  { id:'steam',    nombre:'Proyecto STEAM',           corto:'Proyecto STEAM',  maestro:'',                        icono:'steam',    color:'#5D2469' },
  { id:'general',  nombre:'Aviso general',            corto:'General',         maestro:'',                        icono:'megafono', color:'#7C1D24' },

  /* ── DE QUIÉN VIENE, cuando no viene de una materia ──────────────────
     Carlos: «muchas veces dirección da avisos y me gustaría poder ponerlos
     allí mismo». Un aviso de dirección NO es de una materia: no tiene tarea,
     no tiene maestro y pesa distinto. Por eso son entradas propias y no un
     «Aviso general» disfrazado. */
  { id:'direccion', nombre:'Dirección',               corto:'Dirección',       maestro:'', icono:'edificio', color:'#7C1D24', oficial:true },
  { id:'prefectura',nombre:'Prefectura',              corto:'Prefectura',      maestro:'', icono:'escudo',   color:'#4A4E69', oficial:true }  /* pizarra, para que no se funda con la banda de «Muy importante», que es #5A1319 */,
  { id:'sociedad',  nombre:'Sociedad de alumnos',     corto:'Sociedad',        maestro:'', icono:'personas', color:'#123A5E', oficial:true },
];

/* El tipo dice QUÉ hay que hacer. Va aparte de la materia porque un alumno
   busca de las dos formas: «qué tengo de inglés» y «qué tengo que traer». */
const TIPOS_PEND = [
  { id:'tarea',    nombre:'Tarea',        icono:'hoja',    verbo:'Hacer'   },
  { id:'material', nombre:'Material',     icono:'caja',    verbo:'Traer'   },
  { id:'examen',   nombre:'Examen',       icono:'examen',  verbo:'Estudiar'},
  { id:'proyecto', nombre:'Proyecto',     icono:'carpeta', verbo:'Avanzar' },
  { id:'entrega',  nombre:'Entrega',      icono:'entrega', verbo:'Entregar'},
  { id:'aviso',    nombre:'Aviso',        icono:'campana', verbo:''        },
];

/* «Destacar» sube el aviso hasta arriba y lo pinta a color entero. Sirve para
   lo de dirección y para cualquier cosa que no se puede perder — es lo que en
   los avisos de Carlos era la banda de «MUY IMPORTANTE». */
const DESTACADO = { nombre:'Muy importante' };

/* Cuándo. El orden importa: así se ordena el periódico. */
const CUANDOS = [
  { id:'manana',  nombre:'Para mañana',    urgente:true  },
  { id:'semana',  nombre:'Esta semana',    urgente:false },
  { id:'fecha',   nombre:'Próximas fechas', urgente:false },
  { id:'pronto',  nombre:'Sin fecha aún',  urgente:false },
];

/* ══ LAS PLANTILLAS ═══════════════════════════════════════════════════════
   Tres formas de sacar el mismo aviso. No es decoración: es que un aviso de
   cinco pendientes y uno de sesenta NO se leen igual, y Carlos hace de los dos.
   Además, mandar el mismo cartel idéntico todos los días hace que la gente deje
   de mirarlo. Que cambie ayuda a que se vea.

   `holgado` es cuántos pendientes aguanta antes de que convenga otra: se usa
   para sugerirle la buena, no para prohibirle nada. */
const PLANTILLAS = [
  { id:'tablero',   nombre:'Tablero',   que:'Tarjetas grandes, una columna. La más fácil de leer.',
    columnas:1, holgado:12 },
  { id:'periodico', nombre:'Periódico', que:'Dos columnas, más apretado. Para cuando ya no cabe.',
    columnas:2, holgado:34 },
  { id:'lista',     nombre:'Lista',     que:'Un renglón por pendiente. Para los días de muchísimo.',
    columnas:2, holgado:999, compacta:true },

  /* ── las otras siete ──────────────────────────────────────────────────
     Carlos: «crea otras 7 plantillas diferentes para tener buena variedad».
     No son siete pieles del mismo cartel: cada una cambia algo que se NOTA —
     cuántas columnas, si va apretada, el color del papel y el de las bandas.
     Un cartel que cambia se sigue mirando; uno idéntico todos los días deja de
     verse a la semana. */
  { id:'pizarron',  nombre:'Pizarrón',  que:'Fondo oscuro, letra clara. Se ve distinto de todo lo demás.',
    columnas:1, holgado:12, papel:'#1A2230', tinta:'clara', bandas:['#B4232A','#2C4A6E'] },
  { id:'gaceta',    nombre:'Gaceta',    que:'Tres columnas apretadas, como un periódico de verdad.',
    columnas:3, holgado:60, compacta:true },
  { id:'cuaderno',  nombre:'Cuaderno',  que:'Papel de libreta y bandas azules. Se siente escrito a mano.',
    columnas:1, holgado:12, papel:'#FBFAF4', bandas:['#1E5083','#123A5E'] },
  { id:'urgente',   nombre:'Urgente',   que:'Todo en rojo y apretado. Para el día antes de entregas.',
    columnas:2, holgado:34, papel:'#FFF4F1', bandas:['#8C1C1C','#B4232A'] },
  { id:'pizarra',   nombre:'Dos y media',que:'Dos columnas con tarjetas grandes. El punto medio.',
    columnas:2, holgado:20, papel:'#F5F1E8' },
  { id:'boleta',    nombre:'Boleta',    que:'Una sola columna angosta, como un recibo. Fácil de leer de corrido.',
    columnas:1, holgado:16, compacta:true, papel:'#FFFDF6' },
  { id:'mural',     nombre:'Mural',     que:'Cuatro columnas. Para pegar impreso en la pared del salón.',
    columnas:4, holgado:80, compacta:true, papel:'#F7F3EA' },
];

/* ══ LAS TIPOGRAFÍAS ══════════════════════════════════════════════════════
   Carlos: «pon que pueda cambiar la fuente aquí también» —la de Reportes ya lo
   tenía—. Van las que existen en cualquier teléfono y computadora, no las
   bonitas de internet: el cartel se convierte en IMAGEN en el aparato de
   Carlos, así que si la tipografía no está instalada ahí, el navegador pone
   otra y la imagen sale con la de repuesto sin avisar. */
const FUENTES = [
  /* La de la casa. Es la ÚNICA que no viene con el aparato, así que se carga
     con @font-face desde `sitio/fuente/` —que es nuestro, no un servicio de
     fuera— y el dibujo espera a que esté antes de pintar. Cubre letras,
     acentos, números y ¿¡; le faltan «—», «%», «+» y «#», y ésos caen solos a
     la de repuesto sin que se note. */
  { id:'mazi',    nombre:'Mazi · la de la casa', propia:true,
    fam:'"Mazi", system-ui, -apple-system, sans-serif' },
  { id:'sistema', nombre:'La del sistema',
    fam:'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif' },
  { id:'palo',    nombre:'Palo seco (Arial)', fam:'Arial,"Liberation Sans",Helvetica,sans-serif' },
  { id:'serif',   nombre:'Con remates (Georgia)', fam:'Georgia,"Times New Roman",serif' },
  { id:'estrecha',nombre:'Estrecha', fam:'"Arial Narrow","Liberation Sans Narrow",Arial,sans-serif' },
  { id:'maquina', nombre:'De máquina', fam:'"Courier New",Courier,monospace' },
];

const DIAS   = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const MESES  = ['enero','febrero','marzo','abril','mayo','junio','julio',
                'agosto','septiembre','octubre','noviembre','diciembre'];

if(typeof module !== 'undefined') module.exports = { MATERIAS, TIPOS_PEND, CUANDOS, DESTACADO, PLANTILLAS, FUENTES, DIAS, MESES };
