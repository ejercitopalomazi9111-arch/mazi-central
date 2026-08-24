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
const TIPOS = [
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

const DIAS   = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const MESES  = ['enero','febrero','marzo','abril','mayo','junio','julio',
                'agosto','septiembre','octubre','noviembre','diciembre'];

if(typeof module !== 'undefined') module.exports = { MATERIAS, TIPOS, CUANDOS, DESTACADO, DIAS, MESES };
