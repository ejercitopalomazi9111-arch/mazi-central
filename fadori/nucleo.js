/* ============================================================================
   FADORI · NÚCLEO — Proyecto Sin Filas · Grupo Mazi
   ----------------------------------------------------------------------------
   Todo lo que no se ve: los datos, la fila y el medidor. Las cuatro pantallas
   (alumno, mostrador, pantalla pública y medidor) hablan SÓLO con este archivo.

   Por qué está partido así — regla §2 de la casa, "conectar sí, depender no":
   el motor de datos es un adaptador nuestro con dos implementaciones. Hoy corre
   el motor LOCAL, que no necesita cuenta de nadie y funciona sin internet. El
   día que la escuela autorice el servidor, se cambia el motor y NINGUNA
   pantalla se entera. El externo queda abajo y reemplazable.

   Regla 4 del catálogo: el turno se calcula en UN SOLO LUGAR. Ese lugar es
   colaOrdenada(), aquí abajo. Nadie más ordena la fila.
   ==========================================================================*/
(function (global) {
'use strict';

/* ══════════════════════════════════════════════════════════════════════════
   0 · LAS PERILLAS
   Lo que la cooperativa puede cambiar sin tocar código. Vive en los datos,
   no aquí: esto nada más son los valores de arranque.
   ═════════════════════════════════════════════════════════════════════════ */
const CONFIG_BASE = {
  recreoInicia: '10:30',      /* hora de la chicharra */
  recreoMinutos: 30,
  topeporAlumno: 3,           /* F16 · cuántos pedidos por recreo */
  topeAdelantos: 4,           /* F10 · nadie se atrasa más de N turnos */
  limiteDeuda: 8000,          /* F28 · en centavos. Arranca en un plato fuerte */
  despachadores: 1,           /* F23 */
  aceptaAnticipados: true,    /* F13 */
  nombreLugar: 'Cooperativa',
  /* El pasador de la pantalla de la cooperativa. Se cambia desde Ajustes. */
  pasador: '1234',
};

/* Las categorías mandan el orden del menú y los colores de las fichas.
   El tono NO sale de una paleta bonita: sale del alimento. Guisado, masa
   dorada, pan tostado, fruta. Y las BEBIDAS son el único acento frío de toda
   la app, a propósito: eso las hace ver frescas —que es justo lo que se vende
   de una bebida— y rompe la monotonía cálida antes de que empalague. */
const CATEGORIAS = [
  { id:'fuerte',  nombre:'Plato fuerte', emoji:'🍲', tono:'#C2410C' },  /* guisado, caldo */
  { id:'antojo',  nombre:'Antojitos',    emoji:'🌮', tono:'#D98324' },  /* masa dorada */
  { id:'torta',   nombre:'Tortas y sándwiches', emoji:'🥪', tono:'#A8763E' },  /* pan tostado */
  { id:'dulce',   nombre:'Dulces y postres', emoji:'🍩', tono:'#B34A6B' },  /* fruta */
  { id:'bebida',  nombre:'Bebidas',      emoji:'🥤', tono:'#3E7C8C' },  /* el único frío */
  { id:'botana',  nombre:'Botanas',      emoji:'🥨', tono:'#8A6212' },  /* fritura, sal */
];

/* ══════════════════════════════════════════════════════════════════════════
   EL MENÚ DE VERDAD · el de la cafetería del Rembrandt
   Lo mandó Carlos el 9 de octubre con fotos del mostrador: precios de ellos,
   no inventados.

   Las fotos (fotos/menu/, créditos en fotos/CREDITOS.md), pedidas «de modo
   más aesthetic» y luego «con imágenes de internet, del mismo modelo»:
   · lo empaquetado es la foto de catálogo del producto EXACTO que se vende
     ahí (Chedraui, Open Food Facts), RECORTADA sobre un fondo suave del
     color de su categoría; si hay varios sabores salen juntos;
   · la comida va en foto completa, con licencia libre (Openverse). Son de
     relleno: Carlos va a ir subiendo las de verdad desde el mostrador, y
     esas NO se pisan nunca (ver la migración 6 → 7).
   Lo que no tiene foto enseña SU dibujito (`emoji`), no el de la categoría:
   una pizza con un taco encima se ve mal.

   Lo que NO está, a propósito, porque falta el dato:
   · «tacos de choriqueso»: llegó sin precio. No se inventa: lo da de alta la
     cooperativa con su precio.
   · Las dos «Galletas» ($25 y $15) llegaron sin decir cuál es cuál: van con
     su precio en el nombre hasta que se sepa.
   Los alérgenos son los evidentes (pan = gluten, queso = leche…); la
   cooperativa los corrige en el mostrador. Los segundos de preparación son
   semilla: F40 los cambia por lo medido en cuanto haya despachos. */
const MENU_BASE = [
  /* ── comida ── */
  { nombre:'Banderilla', emoji:'🌭', cat:'antojo', precio:4500, seg:60, desc:'Salchicha empanizada en su palito.', al:['gluten','huevo','lacteos'], foto:'fotos/menu/banderilla.jpg' },
  { nombre:'Enchiladas verdes', emoji:'🫔', cat:'fuerte', precio:4500, seg:90, desc:'En salsa verde, con crema y queso.', al:['lacteos','picante'], foto:'fotos/menu/enchiladas-verdes.jpg' },
  { nombre:'Torta de milanesa', emoji:'🥪', cat:'torta', precio:5000, seg:60, desc:'Milanesa empanizada en telera, con todo.', al:['gluten','huevo','lacteos'], foto:'fotos/torta-milanesa.jpg' },
  { nombre:'Hamburguesa', emoji:'🍔', cat:'torta', precio:4500, seg:90, desc:'Carne a la plancha en pan, con queso.', al:['gluten','lacteos'], foto:'fotos/menu/hamburguesa.jpg' },
  { nombre:'Hot dog', emoji:'🌭', cat:'torta', precio:2500, seg:45, desc:'Salchicha en pan, con sus aderezos.', al:['gluten'], foto:'fotos/menu/hot-dog.jpg' },
  { nombre:'Molletes', emoji:'🥖', cat:'torta', precio:2500, seg:50, desc:'Bolillo con frijoles y queso gratinado.', al:['gluten','lacteos'] },
  { nombre:'Pizza individual', emoji:'🍕', cat:'antojo', precio:2500, seg:60, desc:'Una pizza chica para ti solo.', al:['gluten','lacteos'], foto:'fotos/menu/pizza-individual.jpg' },
  { nombre:'Taco de arrachera', emoji:'🌮', cat:'antojo', precio:2000, seg:45, desc:'Precio por taco.', al:[], foto:'fotos/menu/taco-de-arrachera.jpg' },
  { nombre:'Taco de bistec', emoji:'🌮', cat:'antojo', precio:2000, seg:45, desc:'Precio por taco. Tres te salen en $50: pide la orden.', al:[], foto:'fotos/menu/taco-de-bistec.jpg' },
  { nombre:'Orden de 3 tacos de bistec', emoji:'🌮', cat:'antojo', precio:5000, seg:60, desc:'Tres tacos de bistec por $50.', al:[], foto:'fotos/menu/taco-de-bistec.jpg' },
  { nombre:'Taco de chorizo', emoji:'🌮', cat:'antojo', precio:2000, seg:45, desc:'Precio por taco. Tres te salen en $50: pide la orden.', al:[], foto:'fotos/menu/taco-de-chorizo.jpg' },
  { nombre:'Orden de 3 tacos de chorizo', emoji:'🌮', cat:'antojo', precio:5000, seg:60, desc:'Tres tacos de chorizo por $50.', al:[], foto:'fotos/menu/taco-de-chorizo.jpg' },
  { nombre:'Quesadilla', emoji:'🫓', cat:'antojo', precio:2000, seg:50, desc:'Tortilla con queso, a la plancha.', al:['lacteos'], foto:'fotos/menu/quesadilla.jpg' },
  { nombre:'Quesadilla con carne', emoji:'🫓', cat:'antojo', precio:2500, seg:55, desc:'Con queso y carne.', al:['lacteos'], foto:'fotos/menu/quesadilla-con-carne.jpg' },
  { nombre:'Maruchan', emoji:'🍜', cat:'antojo', precio:3500, seg:60, desc:'Instant Lunch con camarón, con su agua caliente.', al:['gluten','soya','mariscos'], foto:'fotos/menu/maruchan.jpg' },
  /* ── bebidas ── */
  { nombre:'Coca-Cola 600 ml', emoji:'🥤', cat:'bebida', precio:3000, seg:8, desc:'Sabor original, botella de 600.', al:[], foto:'fotos/menu/coca-600.jpg' },
  { nombre:'Coca-Cola chica', emoji:'🥤', cat:'bebida', precio:2000, seg:8, desc:'Normal o sin azúcar: dile cuál.', al:[], foto:'fotos/menu/coca-chica.jpg' },
  { nombre:'Arizona', emoji:'🥫', cat:'bebida', precio:2500, seg:8, desc:'Lata. Sandía o Mucho Mango, según haya.', al:[], foto:'fotos/menu/arizona.jpg' },
  { nombre:'Boing', emoji:'🧃', cat:'bebida', precio:2500, seg:8, desc:'Uva, guayaba o mango, de 500 ml.', al:[], foto:'fotos/menu/boing.jpg' },
  { nombre:'Gatorade', emoji:'🧴', cat:'bebida', precio:3000, seg:8, desc:'Botella de 600 ml.', al:[], foto:'fotos/menu/gatorade.jpg' },
  { nombre:'Agua 600 ml', emoji:'💧', cat:'bebida', precio:1000, seg:6, desc:'Agua natural.', al:[], foto:'fotos/menu/agua-600.jpg' },
  { nombre:'Agua de litro', emoji:'💧', cat:'bebida', precio:2000, seg:6, desc:'Agua natural.', al:[], foto:'fotos/menu/agua-litro.jpg' },
  { nombre:'Agua mineral', emoji:'🫧', cat:'bebida', precio:2500, seg:6, desc:'Peñafiel, 600 ml.', al:[], foto:'fotos/menu/agua-mineral.jpg' },
  { nombre:'Yakult', emoji:'🥛', cat:'bebida', precio:1500, seg:6, desc:'Botellita de 80 ml.', al:['lacteos'], foto:'fotos/menu/yakult.jpg' },
  { nombre:'Café capuchino', emoji:'☕', cat:'bebida', precio:2500, seg:40, desc:'Calientito.', al:['lacteos'], foto:'fotos/menu/cafe-capuchino.jpg' },
  /* ── papas (la foto es de su anaquel) ── */
  { nombre:'Takis Fuego', emoji:'🔥', cat:'botana', precio:2500, seg:6, desc:'Barcel, bolsa.', al:['gluten','picante'], foto:'fotos/menu/takis.jpg' },
  { nombre:'Doritos Dinamita', emoji:'🔺', cat:'botana', precio:2500, seg:6, desc:'Flamin’ Hot o Chile Limón: dile cuál.', al:['picante'], foto:'fotos/menu/doritos.jpg' },
  { nombre:'Tostitos salsa verde', emoji:'🌶️', cat:'botana', precio:2500, seg:6, desc:'Sabritas, bolsa.', al:['picante'], foto:'fotos/menu/tostitos.jpg' },
  { nombre:'Cheetos Flamin’ Hot', emoji:'🔥', cat:'botana', precio:2500, seg:6, desc:'Xtra Flamin’ Hot, bolsa.', al:['lacteos','picante'], foto:'fotos/menu/cheetos.jpg' },
  { nombre:'Crujientes', emoji:'🔥', cat:'botana', precio:2500, seg:6, desc:'Sabritas Receta Crujiente Flamin’ Hot.', al:['gluten','picante'], foto:'fotos/menu/crujientes.jpg' },
  { nombre:'Chip’s jalapeño', emoji:'🥔', cat:'botana', precio:2500, seg:6, desc:'Barcel, bolsa.', al:['picante'], foto:'fotos/menu/chips.jpg' },
  { nombre:'Cacahuates japoneses', emoji:'🥜', cat:'botana', precio:1000, seg:6, desc:'Kurumaya, bolsita.', al:['cacahuate','gluten','soya'], foto:'fotos/menu/cacahuates.jpg' },
  /* ── dulces ── */
  { nombre:'Snickers', emoji:'🍫', cat:'dulce', precio:2500, seg:6, desc:'Barra de chocolate.', al:['cacahuate','lacteos','soya'], foto:'fotos/menu/snickers.jpg' },
  { nombre:'Milky Way', emoji:'🍫', cat:'dulce', precio:2500, seg:6, desc:'Barra de chocolate.', al:['lacteos','soya'], foto:'fotos/menu/milky-way.jpg' },
  { nombre:'M&M’s', emoji:'🍬', cat:'dulce', precio:2500, seg:6, desc:'De cacahuate.', al:['lacteos','soya'], foto:'fotos/menu/mym.jpg' },
  { nombre:'Kinder Delice', emoji:'🧁', cat:'dulce', precio:2000, seg:6, desc:'Pastelito de cacao.', al:['gluten','lacteos','huevo'], foto:'fotos/menu/kinder-delice.jpg' },
  { nombre:'Carlos V', emoji:'🍫', cat:'dulce', precio:1500, seg:6, desc:'Chocolate con leche.', al:['lacteos','soya'], foto:'fotos/menu/carlos-v.jpg' },
  { nombre:'Brownie', emoji:'🍫', cat:'dulce', precio:1500, seg:6, desc:'De chocolate.', al:['gluten','lacteos','huevo'], foto:'fotos/menu/brownie.jpg' },
  { nombre:'Galletas de $25', emoji:'🍪', cat:'dulce', precio:2500, seg:6, desc:'Pregunta cuáles hay.', al:['gluten','lacteos','huevo'], foto:'fotos/menu/galletas-25.jpg' },
  { nombre:'Galletas de $15', emoji:'🍪', cat:'dulce', precio:1500, seg:6, desc:'Pregunta cuáles hay.', al:['gluten','lacteos','huevo'], foto:'fotos/menu/galletas-15.jpg' },
  { nombre:'Peelerz', emoji:'🍬', cat:'dulce', precio:2500, seg:6, desc:'Gomitas Amos que se pelan. Plátano o uva.', al:[], foto:'fotos/menu/peelerz.jpg' },
  { nombre:'Halls', emoji:'🍬', cat:'dulce', precio:1500, seg:6, desc:'Pastillas. Pregunta los sabores.', al:[], foto:'fotos/menu/halls.jpg' },
  { nombre:'Tutsi Pop', emoji:'🍭', cat:'dulce', precio:1000, seg:6, desc:'Paleta con chicle.', al:[], foto:'fotos/menu/tutsi-pop.jpg' },
  { nombre:'Pelonetas', emoji:'🍬', cat:'dulce', precio:1000, seg:6, desc:'Pelón Pelonetes, bolsita.', al:['picante'], foto:'fotos/menu/pelonetas.jpg' },
  { nombre:'Pelón', emoji:'🌶️', cat:'dulce', precio:500, seg:6, desc:'Pelón Pelo Rico.', al:['picante'], foto:'fotos/menu/pelon.jpg' },
  { nombre:'Tix Tix', emoji:'🍬', cat:'dulce', precio:500, seg:6, desc:'Paleta ácida de Sonric’s.', al:[], foto:'fotos/menu/tix-tix.jpg' },
  { nombre:'Mazapán', emoji:'🥜', cat:'dulce', precio:500, seg:6, desc:'De la Rosa.', al:['cacahuate'], foto:'fotos/menu/mazapan.jpg' },
  { nombre:'Paleta de mango', emoji:'🍭', cat:'dulce', precio:500, seg:6, desc:'Vero Mango Intenso, con chile.', al:['picante'], foto:'fotos/menu/paleta-mango.jpg' },
  { nombre:'Paleta de elote', emoji:'🍭', cat:'dulce', precio:500, seg:6, desc:'Vero Elotes Intenso.', al:[], foto:'fotos/menu/paleta-elote.jpg' },
  { nombre:'Tarrito', emoji:'🍯', cat:'dulce', precio:500, seg:6, desc:'Paleta Vero Tarrito.', al:[], foto:'fotos/menu/tarrito.jpg' },
];

/* las descripciones de fábrica de la versión 7, para saber cuáles no tocó nadie */
const MENU_DESC_7 = {
  'Banderilla': 'Salchicha empanizada en su palito.',
  'Enchiladas verdes': 'En salsa verde, con crema y queso.',
  'Torta de milanesa': 'Milanesa empanizada en telera, con todo.',
  'Hamburguesa': 'Carne a la plancha en pan, con queso.',
  'Hot dog': 'Salchicha en pan, con sus aderezos.',
  'Molletes': 'Bolillo con frijoles y queso gratinado.',
  'Pizza individual': 'Una pizza chica para ti solo.',
  'Taco de arrachera': 'Precio por taco.',
  'Taco de bistec': 'Precio por taco. Tres te salen en $50: pide la orden.',
  'Orden de 3 tacos de bistec': 'Tres tacos de bistec por $50.',
  'Taco de chorizo': 'Precio por taco. Tres te salen en $50: pide la orden.',
  'Orden de 3 tacos de chorizo': 'Tres tacos de chorizo por $50.',
  'Quesadilla': 'Tortilla con queso, a la plancha.',
  'Quesadilla con carne': 'Con queso y carne.',
  'Maruchan': 'Sopa instantánea, con su agua caliente.',
  'Coca-Cola 600 ml': 'Botella de 600.',
  'Coca-Cola chica': 'Normal o sin azúcar: dile cuál.',
  'Arizona': 'Lata grande. Sandía o mucho mango, según haya.',
  'Boing': 'Uva, guayaba o mango, según haya.',
  'Gatorade': 'Botella.',
  'Agua 600 ml': 'Agua natural.',
  'Agua de litro': 'Agua natural.',
  'Agua mineral': 'Con gas.',
  'Yakult': 'Leche fermentada.',
  'Café capuchino': 'Calientito.',
  'Takis Fuego': 'Bolsa.',
  'Doritos Dinamita': 'Flamin’ Hot.',
  'Tostitos salsa verde': 'Bolsa.',
  'Cheetos Flamin’ Hot': 'Bolsa.',
  'Crujientes': 'Flamin’ Hot.',
  'Chip’s jalapeño': 'Papas.',
  'Cacahuates japoneses': 'Bolsita.',
  'Snickers': 'Chocolate.',
  'Milky Way': 'Chocolate.',
  'M&M’s': 'Chocolate.',
  'Kinder Delice': 'Pastelito de chocolate.',
  'Carlos V': 'Chocolate.',
  'Brownie': 'De chocolate.',
  'Galletas de $25': 'Pregunta cuáles hay.',
  'Galletas de $15': 'Pregunta cuáles hay.',
  'Peelers': '',
  'Halls': 'Pastillas.',
  'Tutsi Pop': 'Paleta.',
  'Pelonetas': '',
  'Pelón': '',
  'Tix Tix': '',
  'Mazapán': 'De cacahuate.',
  'Paleta de mango': '',
  'Paleta de elote': '',
  'Tarrito': '',
};

/* El menú de ARRANQUE de antes, el inventado (pozole, chilaquiles…). Ya no
   se siembra: se queda aquí porque las migraciones viejas lo nombran y porque
   la 5 → 6 necesita saber cuáles platillos eran de relleno para retirarlos.
   Lo que sigue es el comentario original:
   El menú de arranque. La cooperativa lo cambia entero desde su pantalla:
   esto es para que la app sirva desde el primer minuto, no una lista fija.
   Las fotos son REALES y con licencia libre, bajadas de Wikimedia Commons:
   el crédito de cada una está en fotos/CREDITOS.md. Nada de dibujitos de
   relleno — regla de la casa: si la imagen ya existe, se busca; no se
   inventa. La cooperativa las reemplaza por las suyas cuando quiera.
   Los segundos de preparación son la SEMILLA del estimado; en cuanto haya
   despachos reales, F40 los reemplaza con lo medido. */
const MENU_VIEJO = [
  { nombre:'Guisado del día con arroz', cat:'fuerte', precio:4500, seg:95,
    desc:'El guisado que toque hoy, con arroz y su tortilla.', al:['picante'] , foto:'fotos/guisado.jpg'},
  { nombre:'Pozole', cat:'fuerte', precio:5000, seg:80,
    desc:'Caldo de maíz cacahuazintle con su lechuga, rábano y limón.', al:['picante'] , foto:'fotos/pozole.jpg'},
  { nombre:'Chilaquiles', cat:'fuerte', precio:4000, seg:75,
    desc:'Totopos bañados en salsa, con crema y queso.', al:['lacteos','picante'] , foto:'fotos/chilaquiles.jpg'},
  { nombre:'Torta de jamón', cat:'torta', precio:3000, seg:45,
    desc:'Telera con jamón, queso, aguacate y jitomate.', al:['gluten','lacteos'] , foto:'fotos/torta-jamon.jpg'},
  { nombre:'Torta de milanesa', cat:'torta', precio:3800, seg:60,
    desc:'Milanesa empanizada en telera, con todo.', al:['gluten','huevo','lacteos'] , foto:'fotos/torta-milanesa.jpg'},
  { nombre:'Sándwich', cat:'torta', precio:2500, seg:25,
    desc:'Pan de caja con jamón y queso.', al:['gluten','lacteos'] , foto:'fotos/sandwich.jpg'},
  { nombre:'Quesadilla', cat:'antojo', precio:2000, seg:50,
    desc:'Tortilla de maíz con queso, a la plancha.', al:['lacteos'] , foto:'fotos/quesadilla.jpg'},
  { nombre:'Tacos dorados', cat:'antojo', precio:2500, seg:55,
    desc:'Tres tacos dorados con lechuga, crema y queso.', al:['lacteos'] , foto:'fotos/tacos-dorados.jpg'},
  { nombre:'Tamal', cat:'antojo', precio:2000, seg:20,
    desc:'De masa, al vapor.', al:[] , foto:'fotos/tamal.jpg'},
  { nombre:'Agua del día', cat:'bebida', precio:1200, seg:12,
    desc:'El sabor que toque hoy.', al:[] , foto:'fotos/agua.jpg'},
  { nombre:'Refresco', cat:'bebida', precio:1800, seg:8, desc:'De lata.', al:[] , foto:'fotos/refresco.jpg'},
  { nombre:'Jugo', cat:'bebida', precio:1500, seg:8, desc:'De caja.', al:[] , foto:'fotos/jugo.jpg'},
  { nombre:'Gelatina', cat:'dulce', precio:1200, seg:10, desc:'Con leche.', al:['lacteos'] , foto:'fotos/gelatina.jpg'},
  { nombre:'Galletas', cat:'dulce', precio:1000, seg:6, desc:'Paquete chico.',
    al:['gluten','lacteos','huevo'] , foto:'fotos/galletas.jpg'},
  { nombre:'Pastelito', cat:'dulce', precio:1500, seg:6, desc:'Empaquetado.',
    al:['gluten','lacteos','huevo','soya'] , foto:'fotos/pastelito.jpg'},
  { nombre:'Papas', cat:'botana', precio:1500, seg:6, desc:'Bolsa chica.', al:[] , foto:'fotos/papas.jpg'},
  { nombre:'Cacahuates', cat:'botana', precio:1200, seg:6, desc:'Japoneses.',
    al:['cacahuate','gluten','soya'] , foto:'fotos/cacahuates.jpg'},
];

/* ══════════════════════════════════════════════════════════════════════════
   0-bis · LOS ALÉRGENOS
   Esto no es adorno de diseño: en una escuela hay chavos alérgicos y hoy la
   app no dice nada de lo que lleva cada platillo. Es lo único de todo el
   catálogo que puede mandar a alguien al hospital.

   Y la línea que NO se cruza: las alergias del ALUMNO se guardan sólo en su
   teléfono, en una llave aparte, y nunca entran al registro que ve la
   cooperativa. Un dato de salud de un menor en una base compartida es
   exactamente lo que la regla de "cero datos de más" existe para evitar.
   ═════════════════════════════════════════════════════════════════════════ */
const ALERGENOS = [
  { id:'gluten',   nombre:'Gluten',        emoji:'🌾' },
  { id:'lacteos',  nombre:'Leche',         emoji:'🥛' },
  { id:'huevo',    nombre:'Huevo',         emoji:'🥚' },
  { id:'soya',     nombre:'Soya',          emoji:'🫘' },
  { id:'cacahuate',nombre:'Cacahuate',     emoji:'🥜' },
  { id:'nuez',     nombre:'Nueces',        emoji:'🌰' },
  { id:'mariscos', nombre:'Pescado y mariscos', emoji:'🦐' },
  { id:'ajonjoli', nombre:'Ajonjolí',      emoji:'🫓' },
  { id:'picante',  nombre:'Picante',       emoji:'🌶️' },
];

/* ══════════════════════════════════════════════════════════════════════════
   1 · UTILERÍA
   ═════════════════════════════════════════════════════════════════════════ */
const ahora = () => Date.now();

function id(pre){
  return (pre||'') + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

/* Código corto para el ticket (F24). Sin I ni O para que nadie confunda un
   uno con una i cuando lo lea en voz alta. */
const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function codigo(n){
  let s = '';
  for(let i=0;i<(n||4);i++) s += ALFA[Math.floor(Math.random()*ALFA.length)];
  return s;
}

function pesos(centavos){
  return '$' + (Math.round(centavos)/100).toLocaleString('es-MX',
    { minimumFractionDigits:2, maximumFractionDigits:2 });
}

function minutosDe(seg){
  if(seg < 60) return 'menos de un minuto';
  const m = Math.round(seg/60);
  return m + (m===1 ? ' minuto' : ' minutos');
}

/* Limpia lo que escribe una persona: sin apellidos, sin correos, sin nada
   que no haga falta. Regla 5: cero datos de más. */
function limpiaNombre(t){
  return String(t||'').replace(/\s+/g,' ').trim().slice(0,24);
}
function limpiaGrupo(t){
  return String(t||'').toUpperCase().replace(/\s+/g,'').slice(0,6);
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · EL ADAPTADOR DE DATOS
   Una sola interfaz: leer(), escribir(), alCambiar(). Hoy la cumple el motor
   local; mañana la cumple el del servidor sin que nadie más cambie.
   ═════════════════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════════════════
   EL CANDADO CONTRA LOS DIÁLOGOS DEL NAVEGADOR · F46
   Carlos los pidió fuera TODOS: *"solo quiero que la app responda nada más"*.
   Y tiene razón de sobra — un alert dice "ejercitopalomazi9111-arch.github.io
   dice", trae un botón de "no permitir más diálogos" que deja la pantalla
   muerta hasta recargar, y en una tablet colgada frente a media escuela se ve
   prestado.

   Quitarlos uno por uno no basta: el que se cuele mañana vuelve a salir. Así
   que aquí se tapan los tres de raíz. Cada pantalla registra su propio aviso
   con `FADORI.avisaCon(fn)` y todo lo que alguien mande por alert sale por
   ahí. `confirm` devuelve false y `prompt` devuelve null: si algo se coló, lo
   seguro es NO hacer la acción, nunca hacerla a ciegas.
   ═════════════════════════════════════════════════════════════════════════ */
let AVISA = null;
function avisaCon(fn){ AVISA = typeof fn === 'function' ? fn : null; }
if(typeof window !== 'undefined'){
  const decir = (m, tono) => {
    const t = String(m == null ? '' : m);
    if(AVISA){ try{ AVISA(t, tono); return; }catch(e){} }
    console.warn('[fadori] aviso sin pantalla dónde salir:', t);
  };
  window.alert   = (m) => { decir(m); };
  window.confirm = (m) => { decir(m, 'malo'); return false; };
  window.prompt  = (m) => { decir(m, 'malo'); return null; };
}

const LLAVE = 'fadori_v1';

function estadoVacio(){
  return {
    version: 4,
    config: Object.assign({}, CONFIG_BASE),
    productos: [],
    alumnos: {},      /* codigo -> {codigo, nombre, grupo, deuda, terminos, favorito} */
    pedidos: [],
    eventos: [],      /* la materia prima del medidor (F43) */
    conteos: [],      /* el contador manual de la fila física */
    recreo: null,     /* {id, abierto, inicio, fin} */
  };
}

const MotorLocal = {
  nombre: 'local',
  _canal: null,
  _oyentes: [],

  leer(){
    try{
      const crudo = localStorage.getItem(LLAVE);
      if(!crudo) return null;
      const d = JSON.parse(crudo);
      return (d && d.version) ? d : null;
    }catch(e){ return null; }
  },

  escribir(d){
    try{
      localStorage.setItem(LLAVE, JSON.stringify(d));
    }catch(e){
      /* Si se llenó la memoria, lo primero que se tira son los eventos viejos:
         el medidor duele menos que perder un pedido. */
      d.eventos = d.eventos.slice(-400);
      try{ localStorage.setItem(LLAVE, JSON.stringify(d)); }
      catch(e2){
        /* Y si aun así no cupo, esto NO se traga en silencio. Antes se
           perdía una foto y nadie se enteraba hasta que un alumno decía
           "no la veo". Un guardado que falla callado es lo peor que puede
           hacer un programa con los datos de alguien. */
        console.error('Fadori: no cupo en la memoria del aparato', e2);
        this._avisar();
        throw new Error('la memoria de este aparato ya está llena');
      }
    }
    this._avisar();
  },

  /* Entre pestañas del mismo aparato el aviso es inmediato. Sirve para la
     demostración: el teléfono del alumno y la pantalla del mostrador abiertos
     al mismo tiempo, sincronizados. */
  alCambiar(fn){
    this._oyentes.push(fn);
    if(!this._canal && typeof BroadcastChannel !== 'undefined'){
      this._canal = new BroadcastChannel('fadori');
      this._canal.onmessage = () => this._oyentes.forEach(f => f());
    }
    /* y por si el navegador no tiene BroadcastChannel */
    global.addEventListener('storage', (e) => {
      if(e.key === LLAVE) this._oyentes.forEach(f => f());
    });
  },

  _avisar(){
    if(this._canal){ try{ this._canal.postMessage('cambio'); }catch(e){} }
  },
};

/* ══════════════════════════════════════════════════════════════════════════
   EL MOTOR DE SERVIDOR · F48
   Ya no es un hueco. El servidor vive en `servidor/` y es un Durable Object
   de Cloudflare.

   ── Lo que hay que entender antes de tocar esto ───────────────────────────
   El servidor va ENCIMA del motor local, no en su lugar. Todo lo que se
   escribe cae primero en el aparato —igual que siempre— y de ahí se empuja.
   Por eso, si se cae el internet, se cae Cloudflare o la escuela apaga el
   wifi, no se detiene nada: el alumno pide, la señora despacha, y cuando
   vuelve la red se ponen de acuerdo solos.

   Un servidor que se vuelve indispensable hace que la app falle MÁS. La regla
   3 de la casa dice que nada se detiene si algo falla, y "conéctale un
   servidor para que nunca falle" sólo se cumple de esta manera.

   ── Cómo sabe qué mandar ──────────────────────────────────────────────────
   No se manda el documento entero: se mandan los REGISTROS que cambiaron, y
   gana el más reciente de cada uno. Para saber cuáles cambiaron sin tener que
   tocar las cincuenta funciones que escriben, se le saca una huella a cada
   registro en cada guardado y se compara con la anterior. El que cambió se
   estampa con la hora y sale en el siguiente empujón.
   ═════════════════════════════════════════════════════════════════════════ */

/* ── El tema · F49 ────────────────────────────────────────────────────
   Tres estados y no dos: "automático" es el que casi todos van a dejar, y es
   el que hace que la app se ponga oscura de noche sin que nadie toque nada.
   Es POR APARATO, no por alumno: el modo oscuro es de los ojos de quien
   sostiene el teléfono, no de la cuenta. */
/* ── El menú de la semana · F50 ──────────────────────────────────────
   Lo pidió Carlos: *"poder programar los platillos del día dentro de la
   semana, por ejemplo viernes hay pizza, lunes otra cosa pero no pizza"*.

   Se guarda en el platillo, no en un calendario aparte: `dias` es la lista de
   días en que ese platillo se ofrece. Vacía = todos los días, que es lo que
   ya son los diecisiete de arranque y por eso la migración no rompe nada.

   Por qué en el platillo y no en un calendario: un calendario obliga a
   capturar la semana entera cada lunes. Así, la cooperativa marca UNA vez
   "la pizza es de viernes" y se olvida para siempre. La regla se escribe
   donde vive la cosa. */
const DIAS = [
  { n:1, corto:'L',  nombre:'Lunes' },
  { n:2, corto:'M',  nombre:'Martes' },
  { n:3, corto:'Mi', nombre:'Miércoles' },
  { n:4, corto:'J',  nombre:'Jueves' },
  { n:5, corto:'V',  nombre:'Viernes' },
  { n:6, corto:'S',  nombre:'Sábado' },
  { n:0, corto:'D',  nombre:'Domingo' },
];

function diaDeHoy(cuando){ return new Date(cuando || ahora()).getDay(); }

/* ¿este platillo toca hoy? */
function tocaHoy(p, cuando){
  if(!p || !Array.isArray(p.dias) || !p.dias.length) return true;   /* siempre */
  return p.dias.indexOf(diaDeHoy(cuando)) >= 0;
}

/* qué se ofrece un día dado. Sirve para la vista de la semana del mostrador
   y para poder contestar "¿qué día hay pizza?" sin que nadie adivine. */
function menuDelDia(n){
  return productos(false).filter(p =>
    p.disponible && (!Array.isArray(p.dias) || !p.dias.length || p.dias.indexOf(n) >= 0));
}

function nombreDelDia(n){
  const d = DIAS.find(x => x.n === n);
  return d ? d.nombre : '—';
}

/* el texto que ve el alumno cuando algo no es de hoy */
function cuandoTocaTexto(p){
  if(!p || !Array.isArray(p.dias) || !p.dias.length) return '';
  const nombres = DIAS.filter(d => p.dias.indexOf(d.n) >= 0).map(d => d.nombre.toLowerCase());
  if(!nombres.length) return 'no está programado ningún día';
  if(nombres.length === 1) return 'sólo los ' + nombres[0];
  return 'los ' + nombres.slice(0, -1).join(', ') + ' y ' + nombres[nombres.length - 1];
}

const LLAVE_TEMA = 'fadori_tema';

function tema(){
  try{ return localStorage.getItem(LLAVE_TEMA) || 'auto'; }catch(e){ return 'auto'; }
}
function esOscuro(t){
  const q = t || tema();
  if(q === 'oscuro') return true;
  if(q === 'claro')  return false;
  try{ return !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); }
  catch(e){ return false; }
}
function aplicarTema(){
  try{
    document.documentElement.dataset.tema = esOscuro() ? 'oscuro' : 'claro';
    /* la barra del navegador también, si no se ve un cintillo claro arriba
       de una app oscura y parece que se partió la pantalla */
    const m = document.querySelector('meta[name="theme-color"]');
    if(m){
      const fondo = getComputedStyle(document.body).backgroundColor;
      if(fondo) m.setAttribute('content', fondo);
    }
  }catch(e){}
}
function ponerTema(t){
  const q = (t === 'claro' || t === 'oscuro') ? t : 'auto';
  try{ localStorage.setItem(LLAVE_TEMA, q); }catch(e){}
  aplicarTema();
  return q;
}
/* si está en automático y el teléfono cambia de modo, la app cambia con él */
try{
  if(window.matchMedia){
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const alCambiarTema = () => { if(tema() === 'auto') aplicarTema(); };
    if(mq.addEventListener) mq.addEventListener('change', alCambiarTema);
    else if(mq.addListener) mq.addListener(alCambiarTema);
  }
}catch(e){}

const LLAVE_API   = 'fadori_servidor';   /* la dirección, fuera del documento */
const LLAVE_SYNC  = 'fadori_sync';       /* (viejo) hasta qué hora ya había mandado */
const LLAVE_PEND  = 'fadori_pendientes'; /* lo que cambié aquí y falta mandar */
const LLAVE_APARATO = 'fadori_aparato';   /* quién es este teléfono para el servidor */
const LLAVE_ADMIN   = 'fadori_llave_mostrador';
const LLAVE_MIOS    = 'fadori_mios';      /* los alumnos que se dieron de alta o entraron AQUÍ */

/* Cada teléfono tiene un id al azar. Es lo que hace que un alumno sea de su
   teléfono: el servidor no deja que otro aparato le cancele el pedido, le
   cambie el nombre o pida a su nombre. */
function aparatoId(){
  let v = '';
  try{ v = localStorage.getItem(LLAVE_APARATO) || ''; }catch(e){}
  if(!/^[a-f0-9]{32}$/.test(v)){
    const b = new Uint8Array(16);
    try{ crypto.getRandomValues(b); }catch(e){ for(let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256); }
    v = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    try{ localStorage.setItem(LLAVE_APARATO, v); }catch(e){}
  }
  return v;
}
/* La llave del mostrador la da el SERVIDOR al poner el pasador. Sin ella, lo
   que se toca en la pantalla de la cooperativa no sale de la tablet. */
function llaveMostrador(){
  try{
    const j = JSON.parse(localStorage.getItem(LLAVE_ADMIN) || 'null');
    if(j && /^[a-f0-9]{64}$/.test(j.token || '') && (j.vence || 0) > ahora()) return j.token;
  }catch(e){}
  return '';
}
function cabezasSync(){
  const h = { 'content-type': 'application/json', 'x-fadori-aparato': aparatoId() };
  const l = llaveMostrador(); if(l) h['x-fadori-admin'] = l;
  return h;
}
function misCodigos(){
  try{
    const v = JSON.parse(localStorage.getItem(LLAVE_MIOS) || 'null');
    if(Array.isArray(v)) return v;
    const yo = localStorage.getItem('fadori_yo');
    return yo ? [yo] : [];
  }catch(e){ return []; }
}
function apuntarMio(cod){
  const v = misCodigos(); if(v.indexOf(cod) < 0) v.push(cod);
  try{ localStorage.setItem(LLAVE_MIOS, JSON.stringify(v.slice(-10))); }catch(e){}
}
const CAJONES = ['productos', 'alumnos', 'pedidos', 'conteos', 'eventos'];

/* El servidor de fábrica. Antes la dirección sólo se podía pegar a mano en
   los ajustes del mostrador, y el teléfono del alumno no tiene ajustes: cada
   uno se quedaba en «local», todos sacaban turno 1 y ningún pedido salía del
   teléfono (lo cazó Carlos probando con cinco alumnos). Ahora, publicada, la
   app se conecta sola; en local y en las pruebas sigue sin servidor. */
const SERVIDOR_DE_FABRICA = 'https://fadori.palomazi9111.workers.dev';
const SIN_SERVIDOR = 'local';            /* «quitar el servidor» a propósito */
function servidorDeFabrica(){
  try{
    const h = location.hostname || '';
    return /(^|\.)mazi-central\.palomazi9111\.workers\.dev$/.test(h) ? SERVIDOR_DE_FABRICA : '';
  }catch(e){ return ''; }
}
function direccionServidor(){
  let v = '';
  try{ v = localStorage.getItem(LLAVE_API) || ''; }catch(e){}
  if(v === SIN_SERVIDOR) return '';
  return v || servidorDeFabrica();
}
function ponerServidor(url){
  const u = String(url || '').trim().replace(/\/+$/, '');
  if(u && !/^https?:\/\//.test(u)) throw new Error('La dirección tiene que empezar con https://');
  /* sin dirección = «trabajar sola» a propósito; si sólo se borrara, volvería
     a entrar el servidor de fábrica en la siguiente recarga */
  try{ localStorage.setItem(LLAVE_API, u || SIN_SERVIDOR); }catch(e){}
  return u;
}

/* los registros de cada cajón, como lista, con su id */
function registrosDe(d, cajon){
  if(cajon === 'alumnos'){
    return Object.keys(d.alumnos || {}).map(k =>
      Object.assign({ id: k }, d.alumnos[k]));
  }
  return (d[cajon] || []).filter(r => r && r.id);
}

/* la huella: si cambia, el registro cambió. Se le quita la `t` para que
   estampar la hora no cuente como cambio y se vuelva un perro persiguiéndose
   la cola. */
function huellaDe(r){
  const c = {};
  for(const k in r) if(k !== 't' && k !== '_r') c[k] = r[k];
  try{ return JSON.stringify(c); }catch(e){ return String(Math.random()); }
}

/* La pausa dura lo que dura el código que está corriendo ahora mismo: se
   suelta sola en cuanto termina, aunque una prueba truene a la mitad. Una
   pausa que dependiera de que alguien la quitara se quedaría puesta el día
   que una prueba falle, y entonces ningún pedido saldría nunca. */
/* El mostrador es el dueño del menú. Lo que tenía guardado de antes de
   conectarse nunca se había mandado (sólo sale lo que cambia), así que la
   primera vez que se conecta lo sube entero una vez: precios, agotados,
   platillos propios y ajustes. */
function subirMenu(){
  if(!llaveMostrador()) return false;
  const d = estado(), t = ahora(), M = MotorServidor, pend = M._pend();
  pend.productos = pend.productos || {};
  d.productos.forEach(p => { p.t = Math.max(t, (p.t || 0) + 1); pend.productos[p.id] = p.t; });
  if(d.config){ d.config.t = Math.max(t, (d.config.t || 0) + 1); pend.config = d.config.t; }
  M._guardarPend(pend);
  MOTOR.escribir(d);
}

let syncEnPausa = false;
function pausarSync(){
  syncEnPausa = true;
  setTimeout(() => { syncEnPausa = false; }, 0);
}

const MotorServidor = {
  nombre: 'servidor',
  _huellas: null,      /* cajon -> {id: huella} */
  _reloj: 0,
  _oyentes: [],
  _ws: null,
  _empujando: false,
  _ultimoT: 0,
  _otraVez: false,
  _reintento: 2000,
  ultimoIntento: 0,
  enLinea: false,
  pendientes: 0,

  leer(){ return MotorLocal.leer(); },

  escribir(d){
    /* Las pruebas que corren solas al cargar cada pantalla hacen pedidos de
       mentira y al final reponen lo que había. Con servidor, esos pedidos se
       habrían ido a TODOS los aparatos de la escuela. Mientras corren, nada
       sale del aparato. */
    if(syncEnPausa){ MotorLocal.escribir(d); return; }
    this.estampar(d);
    MotorLocal.escribir(d);          /* primero al aparato. SIEMPRE. */
    this.empujar();                  /* y luego, si se puede, al servidor */
  },

  alCambiar(fn){
    MotorLocal.alCambiar(fn);
    this._oyentes.push(fn);
  },

  _avisar(){ this._oyentes.forEach(f => { try{ f(); }catch(e){} }); },

  /* ── Le pone la hora a lo que de verdad cambió ──────────────────────── */
  estampar(d){
    if(!this._huellas){
      this._huellas = {};
      for(const c of CAJONES){
        this._huellas[c] = {};
        registrosDe(d, c).forEach(r => { this._huellas[c][r.id] = huellaDe(r); });
      }
      this._huellaConfig = huellaDe(d.config || {});
      return;                        /* la primera vez sólo se toma la foto */
    }
    /* Un reloj que SIEMPRE avanza. `ahora()` tiene resolución de milisegundo,
       así que dos cambios en el mismo milisegundo saldrían con la misma hora;
       si esa hora es justo la marca del último empujón, el segundo cambio
       nunca se manda y ese pedido se queda en el aparato para siempre. Un
       milisegundo de más no le hace daño a nadie; un pedido perdido sí. */
    const t = Math.max(ahora(), (this._ultimoT || 0) + 1);
    this._ultimoT = t;
    /* Y además, quien cambia un registro le gana a la versión que tenía
       enfrente, diga lo que diga su reloj. Gana el más reciente por hora, y
       las horas de los aparatos NO coinciden: el servidor iba medio segundo
       adelante, así que «tomar» un pedido justo después de que le pusieran
       turno salía con hora "vieja" y se tiraba callado — la señora lo tomaba
       y al alumno nunca le salía «preparando». Con un teléfono adelantado
       cinco minutos, nadie le habría podido cambiar nada en cinco minutos. */
    const nueva = (vieja) => {
      const n = Math.max(t, (Number(vieja) || 0) + 1);
      if(n > this._ultimoT) this._ultimoT = n;
      return n;
    };
    let pend = null;
    const apuntar = (c, id, n) => { pend = pend || this._pend(); (pend[c] = pend[c] || {})[id] = n; };
    for(const c of CAJONES){
      registrosDe(d, c).forEach(r => {
        const h = huellaDe(r);
        if(this._huellas[c][r.id] !== h){
          this._huellas[c][r.id] = h;
          if(c === 'alumnos'){ if(d.alumnos[r.id]) apuntar(c, r.id, d.alumnos[r.id].t = nueva(d.alumnos[r.id].t)); }
          else apuntar(c, r.id, r.t = nueva(r.t));
        }
      });
    }
    const hc = huellaDe(d.config || {});
    if(hc !== this._huellaConfig){ this._huellaConfig = hc; d.config.t = nueva(d.config.t); pend = pend || this._pend(); pend.config = d.config.t; }
    if(pend) this._guardarPend(pend);
  },

  /* ── Lo que todavía no sabe el servidor ─────────────────────────────── */
  /* Qué falta mandar: la LISTA de lo que se cambió aquí, no "todo lo que sea
     más nuevo que la última vez". Antes era lo segundo, y bastaba con que
     llegara un registro de un teléfono con el reloj adelantado para que la
     marca brincara al futuro y todo lo de este aparato se diera por mandado
     sin haber salido. Además así no se re-manda lo que llegó de otro lado. */
  /* Un pedido de ESTE teléfono que el servidor no aceptó se marca cancelado
     con el motivo, sin volverlo a mandar (si se estampara, iría y vendría). */
  marcarRechazados(porId, alumnosRech){
    const ids = Object.keys(porId); if(!ids.length) return false;
    alumnosRech = alumnosRech || {};
    const d = MotorLocal.leer(); if(!d) return false;
    const mios = misCodigos(), motivo = {
      tope: 'Ya tienes los pedidos que se permiten por recreo.', agotado: 'Se acabó algo de lo que pediste.',
      'no existe': 'Ese platillo ya no está en el menú.', ajeno: 'Este teléfono no puede pedir a nombre de ese alumno.',
      actualiza: 'Actualiza la app y vuelve a pedir.', vacio: 'El pedido estaba vacío.' };
    let toco = false;
    d.pedidos.forEach(p => {
      if(!porId[p.id] || p.turno || mios.indexOf(p.alumno) < 0 || p.estado === 'cancelado') return;
      p.estado = 'cancelado'; p.cancelado = ahora();
      p.rechazo = alumnosRech[p.alumno] === 'tope'
        ? 'Este teléfono ya dio de alta a muchos alumnos hoy. Pídelo desde el teléfono del alumno o con su código.'
        : motivo[porId[p.id]] || 'El servidor no lo aceptó.';
      if(this._huellas && this._huellas.pedidos) this._huellas.pedidos[p.id] = huellaDe(p);
      toco = true;
    });
    if(toco){ MotorLocal.escribir(d); D = d; }
    return toco;
  },

  porMandar(d){
    const pend = this._pend();
    const cambios = {};
    let cuantos = 0;
    for(const c of CAJONES){
      const p = pend[c] || {};
      cambios[c] = registrosDe(d, c).filter(r => p[r.id] != null);
      cuantos += cambios[c].length;
    }
    if(pend.config != null && d.config){ cambios.config = d.config; cuantos++; }
    return { cambios, cuantos };
  },

  _pend(){
    try{
      const crudo = localStorage.getItem(LLAVE_PEND);
      if(crudo) return JSON.parse(crudo) || {};
      /* aparato que viene de la versión con marca de hora: lo que tenía
         pendiente según la marca vieja entra a la lista una sola vez */
      const visto = this._visto(), d = MotorLocal.leer(), p = {};
      if(d && localStorage.getItem(LLAVE_SYNC)){
        for(const c of CAJONES) registrosDe(d, c).forEach(r => {
          if((r.t || 0) > (visto[c] || 0)) (p[c] = p[c] || {})[r.id] = r.t; });
        if(d.config && (d.config.t || 0) > (visto.config || 0)) p.config = d.config.t;
      }
      return p;
    }catch(e){ return {}; }
  },
  _guardarPend(p){
    try{ localStorage.setItem(LLAVE_PEND, JSON.stringify(p)); }catch(e){}
  },

  _visto(){
    try{ return JSON.parse(localStorage.getItem(LLAVE_SYNC) || '{}') || {}; }
    catch(e){ return {}; }
  },
  _guardarVisto(v){
    try{ localStorage.setItem(LLAVE_SYNC, JSON.stringify(v)); }catch(e){}
  },

  /* ── El empujón ─────────────────────────────────────────────────────── */
  async empujar(){
    const api = direccionServidor();
    if(!api) return;
    if(syncEnPausa){ clearTimeout(this._tras); this._tras = setTimeout(() => this.empujar(), 30); return; }
    if(this._empujando){ this._otraVez = true; return; }
    this._empujando = true;
    try{
      const d = MotorLocal.leer(); if(!d) return;
      const { cambios, cuantos } = this.porMandar(d);
      this.pendientes = cuantos;
      this.ultimoIntento = ahora();

      const completo = !!this._completo && !!llaveMostrador();
      const r = await fetch(api + '/api/sync?casa=' + encodeURIComponent(this.casa()), {
        method: 'POST', headers: cabezasSync(),
        body: JSON.stringify({ desde: completo ? 0 : this._reloj, cambios }),
      });
      if(!r.ok) throw new Error('el servidor contestó ' + r.status);
      const res = await r.json();

      /* Lo que el servidor no aceptó. Si es porque falta el pasador (el
         mostrador sin llave), se queda en la lista hasta que entre. Lo demás
         no se va a aceptar nunca: se tacha, y si era un pedido de este
         teléfono se le dice al alumno en vez de dejarlo esperando un turno
         que no va a llegar. */
      const rech = {};
      (res.rechazados || []).forEach(x => { (rech[x.cajon] = rech[x.cajon] || {})[x.id] = x.por || 'no'; });
      this.faltaPasador = (res.rechazados || []).some(x => x.por === 'pasador');

      /* lo que mandé ya está allá: se tacha de la lista. Si mientras viajaba
         se volvió a cambiar (su hora en la lista es más nueva que la que
         salió), se queda para el siguiente empujón. */
      const pend = this._pend();
      for(const c of CAJONES){
        (cambios[c] || []).forEach(x => {
          if(rech[c] && rech[c][x.id] === 'pasador') return;
          if(pend[c] && pend[c][x.id] != null && (x.t || 0) >= pend[c][x.id]) delete pend[c][x.id];
        });
      }
      if(cambios.config && pend.config != null && (cambios.config.t || 0) >= pend.config &&
         !(rech.config && rech.config.config === 'pasador')) delete pend.config;
      this._guardarPend(pend);
      const tumbados = this.marcarRechazados(rech.pedidos || {}, rech.alumnos || {});

      const cambio = this.mezclar(res.cambios || {}, completo);
      if(completo) this._completo = false;
      this._reloj = Math.max(this._reloj, res.reloj || 0);
      if(tumbados) this._avisar();
      this.enLinea = true;
      this._reintento = 2000;
      this.pendientes = 0;
      if(cambio) this._avisar();
    }catch(e){
      /* Aquí NO se avienta el error: quedarse sin red no es un error del
         alumno y no tiene por qué salirle en pantalla. Lo suyo ya está
         guardado en su aparato; esto se vuelve a intentar solo. */
      this.enLinea = false;
      this._reintento = Math.min(this._reintento * 2, 60000);
      clearTimeout(this._alarma);
      this._alarma = setTimeout(() => this.empujar(), this._reintento);
    }finally{
      this._empujando = false;
      if(this._otraVez){ this._otraVez = false; setTimeout(() => this.empujar(), 60); }
    }
  },

  /* Lo que llega de afuera no se cree a ciegas. Un pedido sin renglones
     —de una versión vieja, de una prueba, de un aparato con otra versión de
     la app— tumbaba la pantalla entera del mostrador con las manos ocupadas.
     Que llegue basura es cuestión de tiempo; que tumbe el mostrador, no. */
  sanear(cajon, r){
    const c = Object.assign({}, r);
    delete c._r;
    if(cajon === 'pedidos'){
      if(!Array.isArray(c.renglones)) c.renglones = [];
      c.renglones = c.renglones.filter(x => x && x.prod);
      if(typeof c.estado !== 'string' || ESTADOS.indexOf(c.estado) < 0) c.estado = 'en_cola';
      if(typeof c.total !== 'number') c.total = totalDe(c.renglones);
      if(typeof c.creado !== 'number') c.creado = ahora();
      if(typeof c.pagado !== 'number') c.pagado = 0;
      if(typeof c.folio !== 'string') c.folio = codigo(4);
      if(typeof c.nombre !== 'string') c.nombre = 'Sin nombre';
    }
    if(cajon === 'productos'){
      if(!Array.isArray(c.alergenos)) c.alergenos = [];
      if(!Array.isArray(c.dias)) c.dias = [];
      if(typeof c.precio !== 'number') c.precio = 0;
      if(typeof c.nombre !== 'string') c.nombre = '—';
    }
    return c;
  },

  /* ── Meter lo que llegó, sin pisar lo que es más nuevo aquí ─────────── */
  mezclar(cambios, forzar){
    const d = MotorLocal.leer(); if(!d) return false;
    let tocado = false;
    /* «Forzar» (la bajada completa al poner el pasador o el código) sirve para
       traer la versión completa de lo que llegó recortado. NO para pisar lo
       que este aparato cambió y todavía no sube: eso es más nuevo que lo del
       servidor por definición. Pasó el día del menú de verdad: la tablet puso
       su pasador, la bajada completa le regresó el pozole viejo encima del
       retirado, y el retiro se perdió. */
    const pend = forzar ? this._pend() : null;
    const pendiente = (c, rid) => !!(pend && pend[c] && pend[c][rid] != null);

    for(const c of CAJONES){
      const lista = cambios[c] || [];
      for(const r of lista){
        if(!r || !r.id) continue;
        if(c === 'alumnos'){
          const v = d.alumnos[r.id];
          if(!v || (forzar && !pendiente(c, r.id)) || (r.t || 0) > (v.t || 0)){
            const copia = this.sanear('alumnos', r); delete copia.id;
            d.alumnos[r.id] = copia; tocado = true;
          }
          continue;
        }
        if(!Array.isArray(d[c])) d[c] = [];
        const i = d[c].findIndex(x => x && x.id === r.id);
        const copia = this.sanear(c, r);
        if(i < 0){ d[c].push(copia); tocado = true; }
        else if((forzar && !pendiente(c, r.id)) || (r.t || 0) > (d[c][i].t || 0)){ d[c][i] = copia; tocado = true; }
      }
    }
    if(cambios.config && (cambios.config.t || 0) > (d.config.t || 0)){
      const cc = Object.assign({}, cambios.config); delete cc._r;
      /* el pasador ya no viaja: el de esta tablet se queda como estaba */
      const pase = d.config.pasador;
      d.config = Object.assign({}, CONFIG_BASE, cc);
      if(!('pasador' in cc) && pase) d.config.pasador = pase;
      tocado = true;
    }

    if(tocado){
      d.pedidos.sort((a, b) => (a.creado || 0) - (b.creado || 0));
      d.eventos.sort((a, b) => (a.t || 0) - (b.t || 0));
      /* se refresca la foto de huellas para no volver a mandar lo que
         acaba de llegar de allá */
      this._huellas = null; this.estampar(d);
      MotorLocal.escribir(d);
      D = d;
    }
    return tocado;
  },

  /* Para que la cooperativa vea de un vistazo si esto está hablando con el
     servidor o no. Sin este dato, "no me aparece el pedido" no se puede
     diagnosticar: no se sabe si falló la red o falló la app. */
  estado(){
    const api = direccionServidor();
    if(!api) return { modo:'local', texto:'Sin servidor · cada aparato por su cuenta' };
    if(this.enLinea) return { modo:'enlinea', texto:'Conectado al servidor', api };
    return {
      modo:'sinred',
      texto: this.pendientes
        ? 'Sin conexión · '+this.pendientes+' cambios esperando'
        : 'Sin conexión · se reintenta solo',
      api,
    };
  },

  /* probar la dirección ANTES de guardarla: pegar una URL mal escrita y no
     enterarte hasta el recreo es exactamente lo que no queremos */
  async probar(url){
    const u = String(url || '').trim().replace(/\/+$/, '');
    if(!u) throw new Error('Falta la dirección.');
    if(!/^https?:\/\//.test(u)) throw new Error('Tiene que empezar con https://');
    let r;
    try{ r = await fetch(u + '/api/salud', { method:'GET' }); }
    catch(e){
      /* "Failed to fetch" no le dice nada a la señora de la cooperativa */
      throw new Error('No se pudo llegar a esa dirección. Revisa que esté bien escrita '+
                      'y que esta tablet tenga internet.');
    }
    if(!r.ok) throw new Error('Esa dirección contestó ' + r.status + '. Revísala.');
    const j = await r.json().catch(() => null);
    if(!j || j.quien !== 'fadori') throw new Error('Ahí hay algo, pero no es Fadori.');
    return true;
  },

  casa(){
    try{ return localStorage.getItem('fadori_casa') || 'rembrandt'; }catch(e){ return 'rembrandt'; }
  },

  /* ── El socket: no trae datos, trae "hubo cambio, ven por él" ───────── */
  enchufar(){
    const api = direccionServidor();
    if(!api || typeof WebSocket === 'undefined') return;
    try{ if(this._ws) this._ws.close(); }catch(e){}
    const l = llaveMostrador();
    const url = api.replace(/^http/, 'ws') + '/api/vivo?casa=' + encodeURIComponent(this.casa()) +
      '&aparato=' + aparatoId() + (l ? '&admin=' + l : '');
    try{
      const ws = new WebSocket(url);
      this._ws = ws;
      ws.onmessage = (e) => {
        if(e.data === 'pong') return;
        let m = null; try{ m = JSON.parse(e.data); }catch(err){ return; }
        if(!m) return;
        /* el servidor manda el cambio mismo, ya recortado a lo que este
           aparato puede ver: no hace falta volver a preguntar. Si se perdió
           alguno (el reloj no cuadra), entonces sí se pregunta. */
        if(m.tipo === 'cambios'){
          if(m.antes === this._reloj){
            const cambio = this.mezclar(m.cambios || {});
            this._reloj = m.reloj;
            if(cambio) this._avisar();
          } else if(m.reloj > this._reloj) this.empujar();
          return;
        }
        if(m.tipo === 'reloj' && m.reloj > this._reloj) this.empujar();
      };
      ws.onopen  = () => { this.enLinea = true; this.empujar(); };
      ws.onclose = () => {
        if(this._ws !== ws) return;          /* uno viejo que se cerró al cambiarlo: no se reconecta */
        this.enLinea = false; clearTimeout(this._reconecta);
        this._reconecta = setTimeout(() => this.enchufar(), 4000); };
      ws.onerror = () => { try{ ws.close(); }catch(e){} };
      clearInterval(this._latido);
      this._latido = setInterval(() => {
        try{ if(ws.readyState === 1) ws.send('ping'); }catch(e){}
      }, 30000);
    }catch(e){ /* sin socket se sigue trabajando: queda el reloj de abajo */ }
  },

  /* Y por si el socket no pasa el wifi de la escuela: preguntar cada rato.
     Es el cinturón además de los tirantes, y cuesta un pedido de 200 bytes. */
  arrancar(){
    if(!direccionServidor()) return;
    /* La foto de huellas se toma AQUÍ, antes de que nadie toque nada. Si se
       tomara en el primer guardado, ese primer cambio quedaría dentro de la
       foto y nunca saldría: el primer pedido del alumno se quedaba en su
       teléfono. */
    if(!this._huellas){ const d0 = MotorLocal.leer(); if(d0) this.estampar(d0); }
    this.enchufar();
    /* Con el socket abierto, preguntar cada 15 s sobra: los cambios llegan
       solos. Se pregunta cada 2 min por si acaso, cada 15 s sólo si el socket
       no pasa, y NADA con la app en segundo plano. Con 80 teléfonos, eso es
       la diferencia entre caber en el plan gratis o acabárselo en dos recreos. */
    clearInterval(this._ronda);
    this._ronda = setInterval(() => {
      if(typeof document !== 'undefined' && document.hidden) return;
      const vivo = this._ws && this._ws.readyState === 1;
      if(vivo && ahora() - (this.ultimoIntento || 0) < 120000) return;
      this.empujar();
    }, 15000);
    if(typeof document !== 'undefined' && !this._alVolver){
      this._alVolver = () => {
        if(document.hidden) return;
        if(!this._ws || this._ws.readyState > 1) this.enchufar();
        this.empujar();
      };
      document.addEventListener('visibilitychange', this._alVolver);
    }
    this.empujar();
  },

  /* ── el mostrador entra: el pasador lo revisa el SERVIDOR ───────────── */
  async entrarMostrador(pase){
    const api = direccionServidor();
    let r;
    try{
      r = await fetch(api + '/api/entrar?casa=' + encodeURIComponent(this.casa()), {
        method: 'POST', headers: cabezasSync(), body: JSON.stringify({ pasador: String(pase || '') }) });
    }catch(e){ return { sinRed: true }; }
    const j = await r.json().catch(() => ({}));
    if(r.status === 200 && j.token){
      try{ localStorage.setItem(LLAVE_ADMIN, JSON.stringify({ token: j.token, vence: j.vence })); }catch(e){}
      /* Lo que esta tablet bajó ANTES de la llave venía recortado (sin
         nombres, sin alumnos, sin fiados). Con la llave se vuelve a bajar
         todo desde cero y la versión completa gana. */
      this._completo = true;
      this.enchufar(); this.empujar();
      return { ok: true };
    }
    return { ok: false, error: j.error || ('El servidor contestó ' + r.status) };
  },
  async salirMostrador(){
    const api = direccionServidor(), l = llaveMostrador();
    try{ localStorage.removeItem(LLAVE_ADMIN); }catch(e){}
    if(api && l){ try{ await fetch(api + '/api/salir?casa=' + encodeURIComponent(this.casa()),
      { method: 'POST', headers: Object.assign(cabezasSync(), { 'x-fadori-admin': l }), body: '{}' }); }catch(e){} }
    this.enchufar();
  },
  async pasadorAlServidor(n){
    const api = direccionServidor();
    if(!api) return { ok: true };
    if(!llaveMostrador()) return { ok: false, error: 'Entra con el pasador actual para poder cambiarlo.' };
    try{
      const r = await fetch(api + '/api/pasador?casa=' + encodeURIComponent(this.casa()),
        { method: 'POST', headers: cabezasSync(), body: JSON.stringify({ nuevo: String(n) }) });
      const j = await r.json().catch(() => ({}));
      return r.ok ? { ok: true } : { ok: false, error: j.error || 'No se pudo.' };
    }catch(e){ return { ok: false, error: 'Sin conexión: el pasador no se cambió en el servidor.' }; }
  },
  /* «Ya tenías código»: el alumno ya no está en este teléfono, así que se le
     pregunta al servidor (que pone un tope a los intentos) */
  async porCodigo(cod){
    const api = direccionServidor();
    let r;
    try{
      r = await fetch(api + '/api/codigo?casa=' + encodeURIComponent(this.casa()),
        { method: 'POST', headers: cabezasSync(), body: JSON.stringify({ codigo: cod }) });
    }catch(e){ throw new Error('Sin conexión. Inténtalo con internet.'); }
    const j = await r.json().catch(() => ({}));
    if(r.status === 429) throw new Error(j.error || 'Demasiados intentos. Espera unos minutos.');
    if(r.status !== 200 || !j.alumno) return null;
    const a = Object.assign({}, j.alumno, { t: j.alumno.t || ahora() });
    /* forzado: este teléfono ya tenía esos pedidos SIN nombre (como ve los de
       todos), con la misma hora; la versión completa tiene que ganar */
    this.mezclar({ alumnos: [a], pedidos: j.pedidos || [] }, true);
    return a;
  },
};

let MOTOR = MotorLocal;

/* Si hay dirección guardada, el motor de servidor entra solo. Y si no la hay,
   todo sigue exactamente como estaba: local, sin cuenta de nadie y sin
   internet. */
function elegirMotor(){
  MOTOR = direccionServidor() ? MotorServidor : MotorLocal;
  return MOTOR.nombre;
}
elegirMotor();

/* ══════════════════════════════════════════════════════════════════════════
   3 · EL ESTADO
   ═════════════════════════════════════════════════════════════════════════ */
let D = null;

/* El id de un platillo de arranque sale de su NOMBRE, no del azar. Con id al
   azar cada aparato sembraba su propio menú con otros ids, y el pedido del
   alumno llegaba al mostrador pidiendo un platillo que el mostrador no
   conocía: salía el turno, pero no qué cocinar. */
function idBase(nombre){
  return 'pb-' + String(nombre).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function productoDeBase(p, i){
  return {
    id: idBase(p.nombre),
    nombre: p.nombre,
    cat: p.cat,
    precio: p.precio,
    segPrep: p.seg,
    desc: p.desc || '',
    alergenos: (p.al || []).slice(),
    foto: p.foto || '',
    dias: [],                    /* vacío = todos los días (F50) */
    disponible: true,
    destacado: false,            /* F02 · el platillo del día lo escoge la cooperativa */
    existencias: null,           /* null = sin control de inventario */
    orden: i,
  };
}
function siembra(){
  const d = estadoVacio();
  d.version = 8;
  d.productos = MENU_BASE.map(productoDeBase);
  return d;
}

/* ── Las migraciones ──────────────────────────────────────────────────
   El menú se siembra UNA sola vez, la primera. Todo lo que se le agregue
   después —descripciones, alérgenos, fotos— no le llega solo a quien ya
   tenía la app abierta: hay que traérselo aquí. Y sí pasó: las fotos del
   menú no aparecían en el teléfono de quien había entrado antes de que
   existieran. Cada cosa nueva del arranque necesita su renglón en esta
   función, o le llega sólo a quien instala de cero. */
function migrar(d){
  const antes = d.version || 1;
  d.config = Object.assign({}, CONFIG_BASE, d.config || {});
  ['productos','pedidos','eventos','conteos'].forEach(k => { if(!Array.isArray(d[k])) d[k] = []; });
  if(!d.alumnos) d.alumnos = {};
  d.productos.forEach(p => {
    if(!Array.isArray(p.alergenos)) p.alergenos = [];
    if(!Array.isArray(p.dias)) p.dias = [];
    if(typeof p.desc !== 'string') p.desc = '';
    if(typeof p.foto !== 'string') p.foto = '';
  });

  /* 1 → 2 · las fotos del menú de arranque. Sólo a los que se llaman igual
     que un platillo sembrado y NO tienen foto propia: si la cooperativa ya
     le puso la suya, no se toca. */
  if(antes < 2){
    const porNombre = {};
    MENU_VIEJO.forEach(b => { if(b.foto) porNombre[b.nombre] = b.foto; });
    d.productos.forEach(p => {
      if(!p.foto && porNombre[p.nombre]) p.foto = porNombre[p.nombre];
      if(!p.desc && !p.alergenos.length){
        const b = MENU_VIEJO.find(x => x.nombre === p.nombre);
        if(b){ p.desc = b.desc || ''; p.alergenos = (b.al || []).slice(); }
      }
    });
  }

  /* 2 → 3 · id en eventos y conteos. Sin id no se pueden mezclar con los de
     otro aparato: cada sincronización los volvería a meter. */
  if(antes < 3){
    d.eventos.forEach(e => { if(!e.id) e.id = id('e'); });
    d.conteos.forEach(c => { if(!c.id) c.id = id('c'); });
  }

  /* 3 → 4 · los días de la semana. Vacío = todos los días, así que a un menú
     que ya existía no le cambia absolutamente nada. */
  if(antes < 4){
    d.productos.forEach(p => { if(!Array.isArray(p.dias)) p.dias = []; });
  }

  /* 4 → 5 · los platillos de arranque toman su id de fábrica (ver idBase), y
     con ellos los pedidos y eventos que los nombraban. Lo que la cooperativa
     dio de alta ella misma no se toca. */
  if(antes < 5){
    const usados = new Set(d.productos.map(p => p.id)), cambio = {};
    d.productos.forEach(p => {
      if(!MENU_VIEJO.some(b => b.nombre === p.nombre)) return;
      const nuevo = idBase(p.nombre);
      if(p.id === nuevo || usados.has(nuevo)) return;
      cambio[p.id] = nuevo; usados.add(nuevo); p.id = nuevo;
    });
    if(Object.keys(cambio).length){
      d.pedidos.forEach(o => (o.renglones || []).forEach(r => { if(cambio[r.prod]) r.prod = cambio[r.prod]; }));
      d.eventos.forEach(e => { if(cambio[e.prod]) e.prod = cambio[e.prod]; });
    }
  }

  /* 5 → 6 · EL MENÚ DE VERDAD. Los platillos de relleno (pozole,
     chilaquiles… los que sembró la app y nadie vende) se RETIRAN: quedan
     como «borrado» para que el historial siga diciendo qué se pidió y para
     que el retiro viaje al servidor y a los demás aparatos (un registro que
     sólo se quita de aquí vuelve en la siguiente sincronización). Los del
     menú real entran, o se actualizan si ya estaban (torta de milanesa,
     quesadilla). Lo que la cooperativa dio de alta ella misma no se toca.
     Cada registro tocado se estampa con hora nueva: así le gana a la copia
     vieja del servidor en vez de que la vieja lo pise. */
  if(antes < 6){
    const t = ahora(), toca = (p) => { p.t = Math.max(t, (p.t || 0) + 1); };
    const reales = new Set(MENU_BASE.map(b => b.nombre));
    d.productos.forEach(p => {
      const deRelleno = MENU_VIEJO.some(b => b.nombre === p.nombre) && p.id === idBase(p.nombre);
      if(deRelleno && !reales.has(p.nombre) && !p.borrado){ p.borrado = true; p.disponible = false; p.destacado = false; toca(p); }
    });
    MENU_BASE.forEach((b, i) => {
      const pid = idBase(b.nombre);
      let p = d.productos.find(x => x.id === pid);
      if(!p){ p = productoDeBase(b, i); d.productos.push(p); }
      else {
        Object.assign(p, { nombre: b.nombre, cat: b.cat, precio: b.precio, desc: b.desc || '',
          alergenos: (b.al || []).slice(), orden: i, borrado: false });
        if(!p.foto || /^fotos\/[^/]+\.jpg$/.test(p.foto)) p.foto = b.foto || '';
      }
      toca(p);
    });
    /* lo de la cooperativa, después del menú */
    let o = MENU_BASE.length;
    d.productos.forEach(p => { if(!p.id.startsWith('pb-')) p.orden = o++; });
  }

  /* 6 → 7 · las fotos parejas del menú. Sólo se cambia la foto que sigue
     siendo NUESTRA (vacía o de fotos/): la que subió la cooperativa viene
     como imagen incrustada y ésa no se toca. */
  if(antes < 7){
    const t = ahora();
    MENU_BASE.forEach(b => {
      const p = d.productos.find(x => x.id === idBase(b.nombre));
      if(!p || p.borrado) return;
      const nuestra = !p.foto || /^fotos\//.test(p.foto);
      if(nuestra && p.foto !== (b.foto || '')){ p.foto = b.foto || ''; p.t = Math.max(t, (p.t || 0) + 1); }
    });
  }

  /* 7 → 8 · las fotos de catálogo del modelo exacto, y «Peelers» se llama
     como su empaque: Peelerz. El nombre viejo se retira (el id sale del
     nombre) y el nuevo entra; las fotos nuestras se refrescan con la misma
     regla de la 6 → 7. */
  if(antes < 8){
    const t = ahora(), toca = (p) => { p.t = Math.max(t, (p.t || 0) + 1); };
    const viejo = d.productos.find(x => x.id === 'pb-peelers');
    if(viejo && !viejo.borrado){ viejo.borrado = true; viejo.disponible = false; toca(viejo); }
    MENU_BASE.forEach((b, i) => {
      const pid = idBase(b.nombre);
      let p = d.productos.find(x => x.id === pid);
      if(!p){
        if(antes < 6) return;            /* lo agrega la 5 → 6 */
        p = productoDeBase(b, i); if(viejo && b.nombre === 'Peelerz') p.precio = viejo.precio;   /* el precio que le hayan puesto */
        d.productos.push(p); toca(p); return;
      }
      if(p.borrado) return;
      const nuestra = !p.foto || /^fotos\//.test(p.foto);
      let cambio = false;
      if(nuestra && p.foto !== (b.foto || '')){ p.foto = b.foto || ''; cambio = true; }
      /* la descripción de fábrica se actualiza si nadie la cambió a mano */
      const descVieja = (MENU_DESC_7[b.nombre] || '');
      if(b.desc && p.desc !== b.desc && (!p.desc || p.desc === descVieja)){ p.desc = b.desc; cambio = true; }
      if(cambio) toca(p);
    });
  }

  d.version = 8;
  return antes;
}

function cargar(){
  D = MOTOR.leer();
  if(!D){ D = siembra(); MOTOR.escribir(D); arrancarSync(); return D; }
  const antes = migrar(D);
  /* si de verdad se migró, se guarda: si no, cada carga vuelve a hacerlo */
  if(antes < 8){ try{ MOTOR.escribir(D); }catch(e){} }
  if(!limpiadoLocal){ limpiadoLocal = true; if(limpiarLocal(D)) MotorLocal.escribir(D); }
  arrancarSync();
  return D;
}

/* El teléfono no tiene por qué guardar lo de los demás, ni para siempre. En
   el de un alumno se queda SU gente, la fila de hoy sin nombres y el menú;
   en el mostrador, dos meses. Antes cada teléfono traía los nombres y los
   códigos de toda la escuela (y con ellos, cómo hacerse pasar por cualquiera),
   y la memoria del aparato se llenaba en un par de meses. Va ANTES de la foto
   de la sincronía, para que borrar no cuente como un cambio que mandar. */
let limpiadoLocal = false;
function limpiarLocal(d){
  if(MOTOR.nombre !== 'servidor') return false;
  /* La pantalla de la cooperativa NUNCA se limpia como teléfono de alumno,
     aunque todavía no tenga llave: se abre, carga, y el pasador se pone
     después. Limpiarla ahí borraba a los alumnos y con ellos los fiados. */
  try{ if(/mostrador|medidor/.test(location.pathname)) return false; }catch(e){}
  const t = ahora(), hoy = new Date(t).toDateString();
  const antesP = d.pedidos.length, antesE = d.eventos.length;
  if(llaveMostrador()){
    d.pedidos = d.pedidos.filter(p => (p.creado || 0) > t - 60 * 864e5);
    return d.pedidos.length !== antesP;
  }
  const mios = misCodigos();
  let toco = false;
  Object.keys(d.alumnos).forEach(k => { if(mios.indexOf(k) < 0){ delete d.alumnos[k]; toco = true; } });
  d.pedidos = d.pedidos.filter(p => mios.indexOf(p.alumno) >= 0
    ? (p.creado || 0) > t - 30 * 864e5
    : new Date(p.creado || 0).toDateString() === hoy);
  d.pedidos.forEach(p => {
    if(mios.indexOf(p.alumno) >= 0 || !p.nombre || p.nombre === 'Sin nombre') return;
    p.nombre = 'Sin nombre'; p.grupo = ''; p.alumno = null; p.nota = ''; toco = true;
  });
  d.eventos = d.eventos.filter(e => (e.t || 0) > t - 3 * 864e5);
  if(d.conteos.length){ d.conteos = []; toco = true; }
  return toco || d.pedidos.length !== antesP || d.eventos.length !== antesE;
}

/* la sincronía se prende una sola vez, y sólo si hay dirección guardada */
let syncPrendida = false;
function arrancarSync(){
  if(syncPrendida || MOTOR.nombre !== 'servidor') return;
  syncPrendida = true;
  try{ MotorServidor.arrancar(); }catch(e){ console.warn('Fadori: no arrancó la sincronía', e); }
}

function guardar(){ MOTOR.escribir(D); }

function estado(){ return D || cargar(); }

/* ══════════════════════════════════════════════════════════════════════════
   4 · EL MEDIDOR · F43
   Cada cambio deja huella. De aquí sale TODO el reporte, sin que nadie
   capture nada a mano — que es justo lo que hace que el proyecto se defienda
   solo: los números los recogió la app, no la memoria de alguien.
   ═════════════════════════════════════════════════════════════════════════ */
function anotar(tipo, datos){
  /* con id, porque el servidor mezcla por registro: sin id, cada
     sincronización volvería a meter el mismo evento */
  D.eventos.push(Object.assign({ id: id('e'), t: ahora(), tipo }, datos || {}));
  if(D.eventos.length > 5000) D.eventos = D.eventos.slice(-4000);
}

/* ══════════════════════════════════════════════════════════════════════════
   4-bis · EL PASADOR DE LA COOPERATIVA
   ----------------------------------------------------------------------
   ⚠️ Esto es un PASADOR, no una cerradura, y hay que decirlo con todas sus
   letras: el número vive en el mismo aparato que lo comprueba, así que
   cualquiera que sepa abrir las herramientas del navegador lo ve. Sirve
   para lo que de verdad pasa en una escuela —que un alumno abra la
   pantalla de la cooperativa de curioso y le mueva— y NO sirve contra
   alguien que se lo proponga. La cerradura de verdad llega con el
   servidor, donde el rol vive en la base de datos y no en el teléfono.
   ═════════════════════════════════════════════════════════════════════════ */
const LLAVE_PASE = 'fadori_pase_mostrador';

/* Cuánto dura abierto. Reportado por un compañero de Carlos que probó la app:
   «el de la cooperativa, al poner su contraseña, no necesita ponerla a cada
   rato cada que actualiza el navegador».

   Tenía razón y la causa era `sessionStorage`: muere al cerrar la pestaña, y
   en un teléfono el sistema descarta pestañas en cuanto se abre WhatsApp. O
   sea que a media venta, a la señora de la cooperativa le volvía a pedir el
   pasador. Eso no protege nada: lo que consigue es que acaben poniendo 1234 y
   dejándolo pegado en un papel junto a la caja.

   Ahora vive en `localStorage` y dura 14 horas SIN USARSE, que cubre una
   jornada escolar completa con margen. Cada vez que se usa la pantalla se
   renueva el plazo, así que durante el día no vuelve a preguntar.

   Y hay que decirlo con todas sus letras: esto lo hace MENOS cerradura, no
   más. Sigue siendo un pasador contra el alumno curioso, y ahora además queda
   abierto en ese aparato hasta que le den «Cerrar la caja». Quien agarre ese
   teléfono desbloqueado entra. La cerradura de verdad llega con el servidor,
   donde el rol vive en la base de datos y no en el teléfono. */
const PASE_DURA = 14 * 60 * 60 * 1000;

function pasadorOk(intento){
  const d = estado();
  const bueno = String(d.config.pasador || CONFIG_BASE.pasador);
  if(String(intento || '').trim() !== bueno) return false;
  renovarPase();
  return true;
}
/* el pasador que el servidor aceptó se guarda en la tablet para poder entrar
   sin internet; se escribe directo, sin contar como cambio que mandar */
function recordarPasador(n){
  const d = estado(); d.config.pasador = String(n);
  if(MotorServidor._huellas) MotorServidor._huellaConfig = huellaDe(d.config);
  MotorLocal.escribir(d);
}
function renovarPase(){
  try{ localStorage.setItem(LLAVE_PASE, String(ahora())); }catch(e){}
}
function pasoElPasador(){
  try{
    /* El pase viejo vivía en sessionStorage. A quien lo tenga abierto en este
       momento no se le corta la sesión a media venta: se le traspasa. */
    if(sessionStorage.getItem(LLAVE_PASE) === '1'){
      sessionStorage.removeItem(LLAVE_PASE); renovarPase(); return true;
    }
    const t = Number(localStorage.getItem(LLAVE_PASE) || 0);
    if(!t) return false;
    if(ahora() - t > PASE_DURA){ localStorage.removeItem(LLAVE_PASE); return false; }
    renovarPase();                       // se usó: el plazo vuelve a empezar
    return true;
  }catch(e){ return true; }
}
function cerrarMostrador(){
  try{ localStorage.removeItem(LLAVE_PASE); sessionStorage.removeItem(LLAVE_PASE); }catch(e){}
}
function cambiarPasador(nuevo){
  const n = String(nuevo || '').trim();
  if(!/^\d{4,8}$/.test(n)) throw new Error('El pasador va de 4 a 8 números.');
  estado().config.pasador = n; guardar(); return n;
}

/* ══════════════════════════════════════════════════════════════════════════
   5 · QUIÉN ES · F06 · identidad sin registro
   Primer nombre e inicial del apellido, y grupo. Sin contraseña, sin correo, sin apellidos, sin
   foto. Cientos de menores sin una base de datos de menores.
   ═════════════════════════════════════════════════════════════════════════ */
const LLAVE_YO = 'fadori_yo';

/* Dar de alta a una persona SIN quedarse como ella en este aparato.
   Existe aparte de `registrar` por una razón concreta: cuando la cooperativa
   apunta un fiado desde el mostrador, el mostrador NO debe convertirse en ese
   alumno. Antes había una sola función y guardaba `fadori_yo`: apuntar un
   fiado le habría cambiado la identidad a la pantalla del mostrador. */
function nuevaPersona(nombre, grupo){
  const d = estado();
  const n = limpiaNombre(nombre), g = limpiaGrupo(grupo);
  if(!n) throw new Error('Falta el nombre.');
  if(!g) throw new Error('Falta el grupo.');
  const cod = codigo(4);
  d.alumnos[cod] = { codigo:cod, nombre:n, grupo:g, deuda:0, terminos:0, creado:ahora() };
  guardar();
  return d.alumnos[cod];
}

function registrar(nombre, grupo){
  const a = nuevaPersona(nombre, grupo);
  try{ localStorage.setItem(LLAVE_YO, a.codigo); }catch(e){}
  apuntarMio(a.codigo);
  return a;
}

/* Buscar a alguien por nombre, grupo o código. Lo usa el mostrador para saber
   a quién se le fía cuando el pedido se levantó sin código. */
function buscarPersonas(texto){
  const d = estado();
  const q = normalizaBusqueda(texto);
  const todos = Object.values(d.alumnos);
  if(!q) return todos.sort((a,b) => a.nombre.localeCompare(b.nombre)).slice(0, 20);
  return todos
    .filter(a => normalizaBusqueda(a.nombre + ' ' + a.grupo + ' ' + a.codigo).indexOf(q) >= 0)
    .sort((a,b) => (b.deuda - a.deuda) || a.nombre.localeCompare(b.nombre))
    .slice(0, 20);
}

/* Sin acentos y en minúsculas: en una escuela nadie escribe "Ramírez" con
   acento cuando trae las manos ocupadas. */
function normalizaBusqueda(t){
  return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();
}

function yo(){
  const d = estado();
  let cod = null;
  try{ cod = localStorage.getItem(LLAVE_YO); }catch(e){}
  return (cod && d.alumnos[cod]) ? d.alumnos[cod] : null;
}

function entrarComo(cod){
  const d = estado();
  const a = d.alumnos[String(cod||'').toUpperCase()];
  if(!a) return null;
  try{ localStorage.setItem(LLAVE_YO, a.codigo); }catch(e){}
  apuntarMio(a.codigo);
  return a;
}
/* con servidor, el alumno de otro teléfono no está aquí: se le pregunta */
async function entrarConCodigo(cod){
  const c = String(cod || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const aqui = entrarComo(c);
  if(aqui || MOTOR.nombre !== 'servidor') return aqui;
  const a = await MotorServidor.porCodigo(c);
  if(!a) return null;
  D = MotorLocal.leer() || D;
  return entrarComo(c);
}

function salir(){ try{ localStorage.removeItem(LLAVE_YO); }catch(e){} }

/* F29 · los términos se firman una sola vez y queda la fecha */
function aceptarTerminos(cod){
  const d = estado();
  const a = d.alumnos[cod]; if(!a) return null;
  a.terminos = ahora();
  anotar('terminos', { alumno:cod });
  guardar();
  return a;
}

/* ══════════════════════════════════════════════════════════════════════════
   6 · EL MENÚ
   ═════════════════════════════════════════════════════════════════════════ */
function productos(soloDisponibles){
  const d = estado();
  /* los borrados no salen en ningún menú; siguen existiendo para que el
     historial diga qué se pidió y para que el borrado viaje a los demás */
  const lista = d.productos.filter(p => !p.borrado).sort((a,b) => (a.orden||0) - (b.orden||0));
  /* F50 · lo que no toca hoy no sale en el menú del alumno. Sale en el del
     mostrador (soloDisponibles = false) porque ahí se administra la semana. */
  return soloDisponibles
    ? lista.filter(p => p.disponible && existenciasOk(p) && tocaHoy(p))
    : lista;
}

function existenciasOk(p){
  return p.existencias === null || p.existencias === undefined || p.existencias > 0;
}

function producto(pid){ return estado().productos.find(p => p.id === pid) || null; }

/* F33 · agotado y de vuelta, en un toque. Lo agotado sale del menú del alumno
   al instante, que es como se evita el pedido de algo que ya no hay. */
function marcarDisponible(pid, si){
  const p = producto(pid); if(!p) return;
  p.disponible = !!si;
  anotar(si ? 'producto_vuelve' : 'producto_agotado', { prod:pid });
  guardar();
}

function guardarProducto(datos){
  const d = estado();
  if(datos.id){
    const p = producto(datos.id);
    if(p) Object.assign(p, datos);
  } else {
    d.productos.push(Object.assign({
      id:id('p'), foto:'', disponible:true, destacado:false, desc:'', alergenos:[], dias:[],
      existencias:null, segPrep:40, orden:d.productos.length,
    }, datos));
  }
  guardar();
}

/* El dibujito de un platillo sin foto: el suyo si es del menú de fábrica,
   si no el de su categoría. Se saca de MENU_BASE y no se guarda en el
   registro: así no viaja ni hay que migrarlo. */
const EMOJI_BASE = {};
MENU_BASE.forEach(b => { if(b.emoji) EMOJI_BASE[idBase(b.nombre)] = b.emoji; });
function emojiDe(p){
  if(!p) return '🍽️';
  return EMOJI_BASE[p.id] || (CATEGORIAS.find(c => c.id === p.cat) || {}).emoji || '🍽️';
}

/* Borrar es MARCAR, no quitar: quitado de aquí, el servidor lo devolvía en
   la siguiente sincronización y el platillo «borrado» reaparecía. */
function borrarProducto(pid){
  const p = estado().productos.find(x => x.id === pid);
  if(!p) return;
  p.borrado = true; p.disponible = false; p.destacado = false;
  guardar();
}

/* ══════════════════════════════════════════════════════════════════════════
   7 · LOS PEDIDOS
   ═════════════════════════════════════════════════════════════════════════ */
const ESTADOS = ['en_cola','preparando','listo','entregado','cancelado','apartado'];
const VIVOS = ['en_cola','preparando','listo'];

function totalDe(renglones){
  return (renglones || []).reduce((s, r) => {
    const p = producto(r.prod);
    return s + (p ? p.precio * r.cant : 0);
  }, 0);
}

function segundosDe(renglones){
  return (renglones || []).reduce((s, r) => {
    const p = producto(r.prod);
    return s + (p ? (segReales(p.id) || p.segPrep || 40) * r.cant : 0);
  }, 0);
}

/* F16 · el tope por alumno, para que nadie pida treinta tortas de broma */
function pedidosDeHoy(cod){
  const d = estado(), desde = arranqueDelDia();
  return d.pedidos.filter(p => p.alumno === cod && p.creado >= desde &&
    p.estado !== 'cancelado');
}

function arranqueDelDia(){
  const h = new Date(); h.setHours(0,0,0,0); return h.getTime();
}

/* F27/F28 · la deuda bloquea, pero NUNCA se enseña en pantalla que vea otro
   alumno. Que un compañero vea lo que debes es humillación, no
   administración. */
function puedePedir(cod){
  const d = estado(), a = d.alumnos[cod];
  if(!a) return { puede:false, por:'Todavía no has puesto tu nombre.' };
  if(!a.terminos) return { puede:false, por:'Falta aceptar las condiciones de uso.' };
  if(a.deuda >= d.config.limiteDeuda)
    return { puede:false, por:'Tienes '+pesos(a.deuda)+' pendientes. Hay que pagar para volver a pedir.' };
  const hoy = pedidosDeHoy(cod).length;
  if(hoy >= d.config.topeporAlumno)
    return { puede:false, por:'Ya hiciste '+hoy+' pedidos hoy, que es el máximo.' };
  return { puede:true };
}

/* F03 · pedir · F05 · para varios · F13 · con anticipación */
function pedir(cod, renglones, opciones){
  const d = estado();
  const o = opciones || {};
  const permiso = o.origen === 'mostrador' ? { puede:true } : puedePedir(cod);
  if(!permiso.puede) throw new Error(permiso.por);
  const limpios = (renglones||[])
    .filter(r => r && r.prod && r.cant > 0)
    .map(r => ({ prod:r.prod, cant:Math.min(10, Math.max(1, r.cant|0)),
                 para: limpiaNombre(r.para || ''), listo:false }));
  if(!limpios.length) throw new Error('El pedido está vacío.');

  const p = {
    id: id('o'),
    folio: codigo(4),
    alumno: cod || null,
    nombre: cod && d.alumnos[cod] ? d.alumnos[cod].nombre : limpiaNombre(o.nombre || 'Mostrador'),
    grupo:  cod && d.alumnos[cod] ? d.alumnos[cod].grupo  : limpiaGrupo(o.grupo || ''),
    renglones: limpios,
    total: totalDe(limpios),
    pagado: 0,
    creado: ahora(),
    estado: 'en_cola',
    anticipado: !!o.anticipado,
    /* la nota la escribe el alumno y la LEE la cooperativa. Si no sale en la
       pantalla de despachar, es un campo decorativo y mejor no tenerlo. */
    nota: String(o.nota || '').slice(0, 140).trim(),
    origen: o.origen || 'app',
    despachador: null,
    tomado: 0, listoEn: 0, entregado: 0,
    /* Con servidor el turno lo pone ÉL: cada aparato contaría por su cuenta
       "van tres, me toca el cuatro" y saldrían tres turnos 4. Llega en
       cuanto el pedido cruza; mientras tanto la pantalla muestra "…". */
    turno: MOTOR.nombre === 'servidor' ? null : siguienteTurno(),
  };
  d.pedidos.push(p);
  anotar('pedido', { pedido:p.id, alumno:cod, total:p.total,
    anticipado:p.anticipado, origen:p.origen, seg:segundosDe(limpios) });
  guardar();
  return p;
}

/* Con servidor, el turno tarda un parpadeo en llegar. Mientras tanto se
   muestra "…" y NUNCA la palabra null, que es lo que sale si nadie lo cuida.
   Es un detalle chico y es exactamente de los que se ven en una captura. */
function verTurno(p){
  return (p && p.turno != null && p.turno !== '') ? String(p.turno) : '…';
}

function siguienteTurno(){
  const d = estado(), desde = arranqueDelDia();
  const hoy = d.pedidos.filter(p => p.creado >= desde);
  return hoy.length + 1;
}

function pedido(oid){ return estado().pedidos.find(p => p.id === oid) || null; }

function pedidosDe(cod){
  return estado().pedidos.filter(p => p.alumno === cod)
    .sort((a,b) => b.creado - a.creado);
}

/* ══════════════════════════════════════════════════════════════════════════
   8 · LA FILA · F10 · el único lugar donde se ordena
   No es "primero en llegar": atender primero lo rápido baja la espera
   promedio de TODOS. Pero con tope obligatorio — sin él, el que pidió el
   plato fuerte nunca come, y eso se nota al tercer día.
   ═════════════════════════════════════════════════════════════════════════ */
function colaOrdenada(){
  const d = estado();
  const vivos = d.pedidos.filter(p => p.estado === 'en_cola' || p.estado === 'preparando');
  const t = ahora();

  const conPeso = vivos.map(p => {
    const seg = segundosDe(p.renglones);
    /* el peso convierte "qué tan tardado" en "cuántos segundos de ventaja
       pierde": un pedido de 90 s cede el paso a uno de 20 s, pero sólo
       durante los primeros minutos */
    return { p, seg, espera: t - p.creado };
  });

  return conPeso.sort((a, b) => {
    /* 1 · lo que ya está en la plancha nunca se reordena */
    if((a.p.estado === 'preparando') !== (b.p.estado === 'preparando'))
      return a.p.estado === 'preparando' ? -1 : 1;
    /* 2 · F13 · los anticipados entran primero: por eso sirve pedir antes */
    if(a.p.anticipado !== b.p.anticipado) return a.p.anticipado ? -1 : 1;
    /* 3 · EL TOPE. Quien lleve esperando más que el tope se vuelve intocable
       y se ordena sólo por antigüedad. Es lo que impide que el plato fuerte
       se quede para el final para siempre. */
    const topeMs = topeEnMs();
    const aVieja = a.espera > topeMs, bVieja = b.espera > topeMs;
    if(aVieja !== bVieja) return aVieja ? -1 : 1;
    if(aVieja && bVieja) return a.p.creado - b.p.creado;
    /* 4 · y sólo entonces, lo rápido primero, sin olvidar quién llegó antes */
    return (a.p.creado + a.seg*1000) - (b.p.creado + b.seg*1000);
  }).map(x => x.p);
}

/* El tope se expresa en turnos y se traduce a tiempo con el ritmo real de
   despacho, que es lo que hace que se comporte igual un día lento que uno
   rápido. */
function topeEnMs(){
  const d = estado();
  return d.config.topeAdelantos * Math.max(20, ritmoDespacho()) * 1000;
}

/* Segundos que cuesta despachar un pedido, medidos. Si todavía no hay
   medición, se usa el estimado del menú. */
function ritmoDespacho(){
  const d = estado();
  const ds = d.eventos.filter(e => e.tipo === 'entregado' && e.dur > 0).slice(-40);
  if(ds.length >= 5){
    const suma = ds.reduce((s,e) => s + e.dur, 0);
    return (suma / ds.length) / Math.max(1, d.config.despachadores);
  }
  return 36 / Math.max(1, d.config.despachadores);   /* los 36 s que midió Carlos */
}

/* Segundos reales por producto (F40), que además alimentan el estimado del
   alumno (F09) y la prioridad de la fila (F10). El dato se mide solo. */
function segReales(pid){
  const d = estado();
  const ms = d.eventos.filter(e => e.tipo === 'renglon_listo' && e.prod === pid).slice(-20);
  if(ms.length < 3) return 0;
  return Math.round(ms.reduce((s,e) => s + e.dur, 0) / ms.length);
}

/* F09 · cuántos van antes que el tuyo y cuánto falta */
function lugarDe(oid){
  const cola = colaOrdenada();
  const i = cola.findIndex(p => p.id === oid);
  if(i < 0) return null;
  const antes = cola.slice(0, i);
  const seg = antes.reduce((s, p) => s + segundosDe(p.renglones), 0)
              / Math.max(1, estado().config.despachadores);
  return { lugar: i + 1, antes: i, segundos: Math.round(seg), total: cola.length };
}

/* ══════════════════════════════════════════════════════════════════════════
   9 · EL VEREDICTO · F12 · "alcanzas / no alcanzas"
   La función que ninguna fila física puede hacer ni contratando a diez
   personas: decir la verdad temprano. Lo ve el alumno y NADIE MÁS.
   ═════════════════════════════════════════════════════════════════════════ */
function ventanaRecreo(){
  const d = estado();
  const [h, m] = String(d.config.recreoInicia || '10:30').split(':').map(Number);
  const hoy = new Date(); hoy.setHours(h||10, m||30, 0, 0);
  const inicio = hoy.getTime();
  return { inicio, fin: inicio + (d.config.recreoMinutos || 30) * 60000 };
}

function enRecreo(){
  const w = ventanaRecreo(), t = ahora();
  return t >= w.inicio && t < w.fin;
}

/* Fuera de la ventana el recreo que cuenta es el SIGUIENTE, completo: pedir a
   las siete de la mañana es un anticipado, no un "ya no alcanzas". Devolver
   cero ahí hacía que la app le dijera "hoy no alcanzas" a alguien que pidió
   antes de que empezara el recreo, que es exactamente al revés. */
/* La cuenta regresiva que se ve SIEMPRE. Devuelve en qué momento del día
   estamos y cuántos segundos faltan para lo que toca — que empiece el recreo
   si todavía no, o que se acabe si ya empezó. */
function cuentaRegresiva(){
  const w = ventanaRecreo(), t = ahora();
  if(t < w.inicio) return { estado:'antes',   segundos: Math.round((w.inicio - t)/1000) };
  if(t < w.fin)    return { estado:'durante', segundos: Math.round((w.fin - t)/1000) };
  return { estado:'despues', segundos:0 };
}

/* mm:ss cuando falta poco, "12 min" cuando falta harto. Nadie necesita los
   segundos a veinte minutos del final, y a los dos minutos sí. */
function relojCorto(seg){
  if(seg >= 600) return Math.round(seg/60) + ' min';
  const m = Math.floor(seg/60), s2 = seg % 60;
  return m + ':' + String(s2).padStart(2,'0');
}

function quedanSegundosDeRecreo(){
  const d = estado(), w = ventanaRecreo(), t = ahora();
  if(t < w.inicio || t >= w.fin) return (d.config.recreoMinutos || 30) * 60;
  return Math.max(0, Math.round((w.fin - t) / 1000));
}

function veredicto(oid){
  const l = lugarDe(oid);
  if(!l) return null;
  const p = pedido(oid);
  const mio = segundosDe(p.renglones);
  const falta = l.segundos + mio;
  const queda = quedanSegundosDeRecreo();
  const alcanza = falta <= queda;
  return {
    lugar: l.lugar, antes: l.antes, segundos: falta, quedan: queda, alcanza,
    frase: alcanza
      ? 'Vas en el ' + l.lugar + ' · alcanzas, como en ' + minutosDe(falta)
      : 'Vas en el ' + l.lugar + ' · hoy no alcanzas',
  };
}

/* F14 · si hoy no alcanzaste, tu pedido se guarda y entras primero mañana.
   Convierte el peor momento de la app en el que te hace volver. */
function apartarParaManana(oid){
  const p = pedido(oid); if(!p) return null;
  p.estado = 'apartado';
  anotar('apartado', { pedido:oid, alumno:p.alumno });
  guardar();
  return p;
}

/* F15 · "voy en camino" / "hoy no puedo ir". Sin esto la comida se hace y
   nadie la recoge: la señora perdió el ingrediente y el lugar en la fila. */
function voyEnCamino(oid){
  const p = pedido(oid); if(!p) return null;
  p.enCamino = ahora();
  anotar('en_camino', { pedido:oid });
  guardar();
  return p;
}

function cancelar(oid, quien){
  const p = pedido(oid); if(!p) return null;
  p.estado = 'cancelado';
  p.cancelado = ahora();
  anotar('cancelado', { pedido:oid, quien: quien || 'alumno' });
  guardar();
  return p;
}

/* ── SE ACABÓ · F45 ───────────────────────────────────────────────────
   Lo preguntó Carlos y no había respuesta: *"si se acaba un producto y varios
   en la fila lo pidieron, no pasa nada"*. Y era cierto — agotar sacaba el
   platillo del menú, pero los pedidos que ya lo traían se quedaban ahí,
   esperando algo que nunca iba a salir, y el alumno se enteraba hasta llegar
   al mostrador.

   Las tres reglas que ordenan esto:

   1 · **El renglón no se borra, se marca.** `sinSurtir` deja la huella. Si se
       borrara, nadie podría contar cuántas veces se acabó algo con gente
       formada, que es EL dato que le sirve a la cooperativa para comprar mejor
       la próxima semana.
   2 · **El total baja solo.** Nadie paga lo que no le dieron, y no depende de
       que alguien se acuerde de restarlo.
   3 · **El lugar en la fila se respeta.** La culpa fue nuestra, no del alumno.
       Si cambia lo que se acabó por otra cosa, conserva su turno y su hora de
       llegada. Mandarlo al final por un error de la cooperativa es castigarlo
       por algo que no hizo. */

/* el corazón: le pega a todos los pedidos vivos que traigan ese producto */
function avisarFalta(pid){
  const d = estado(), falta = producto(pid);
  if(!falta) return { producto:'', tocados:[], cancelados:[] };
  const tocados = [], cancelados = [];

  d.pedidos.forEach(p => {
    if(VIVOS.indexOf(p.estado) < 0) return;
    let cambio = false;
    p.renglones.forEach(r => {
      /* lo que YA está servido no se toca: eso ya salió de la cocina */
      if(r.prod === pid && !r.sinSurtir && !r.listo){ r.sinSurtir = ahora(); cambio = true; }
    });
    if(!cambio) return;

    p.total = totalDe(p.renglones.filter(r => !r.sinSurtir));
    const nombres = (p.avisoFalta && p.avisoFalta.nombres || []).slice();
    if(nombres.indexOf(falta.nombre) < 0) nombres.push(falta.nombre);
    p.avisoFalta = { nombres, t: ahora() };
    tocados.push(p.id);

    /* la huella del faltante se deja SIEMPRE, muera o no el pedido. Si sólo
       se anotara cuando sobrevive, el corte del día dejaría fuera justo al
       que peor le fue: el que se quedó sin nada. */
    anotar('sin_surtir', { pedido:p.id, prod:pid });

    if(!p.renglones.some(r => !r.sinSurtir)){
      /* no le quedó nada que darle. Se cancela, pero marcado como culpa
         nuestra: así el alumno lo puede revivir cambiando el platillo. */
      p.estado = 'cancelado';
      p.cancelado = ahora();
      p.porFalta = true;
      anotar('cancelado', { pedido:p.id, quien:'mostrador', por:'agotado', prod:pid });
      cancelados.push(p.id);
    }
  });

  guardar();
  return { producto: falta.nombre, tocados, cancelados };
}

/* lo que toca la señora: "se acabó". Saca del menú Y avisa a la fila. */
function seAcabo(pid){
  marcarDisponible(pid, false);
  return avisarFalta(pid);
}

/* a quiénes les pega, ANTES de tocar nada. Sirve para preguntar bien. */
function aQuienLePega(pid){
  return estado().pedidos.filter(p => VIVOS.indexOf(p.estado) >= 0 &&
    p.renglones.some(r => r.prod === pid && !r.sinSurtir && !r.listo));
}

/* F45b · qué le ofrezco a cambio.
   El orden importa y no es capricho: primero de su mismo tipo —quien quería
   una torta quiere comer, no beber—, después que NO cueste más que lo que ya
   iba a gastar, y nunca algo que choque con sus alergias. Ofrecerle algo más
   caro a un niño con veinte pesos es burlarse de él. */
function enLugarDe(pid, cuantas){
  const falta = producto(pid) || { precio: 0, cat: '' };
  const mias = misAlergias();
  const libres = productos(true).filter(p =>
    p.id !== pid && !(p.alergenos || []).some(a => mias.indexOf(a) >= 0));

  /* Nada más caro de lo que ya iba a pagar. No es una preferencia: es que
     el niño trae UNA moneda contada, y ofrecerle algo de treinta y ocho
     cuando venía por uno de treinta es burlarse de él con una pantalla. */
  const alcanza = libres.filter(p => p.precio <= falta.precio);
  const lista = alcanza.length ? alcanza
    : libres.slice().sort((a,b) => a.precio - b.precio).slice(0, 1);

  const puntua = (p) => {
    let n = 0;
    if(p.cat === falta.cat) n += 1000;              /* mismo tipo de hambre */
    n -= (falta.precio - p.precio) / 100;           /* lo más parecido de precio */
    return n;
  };
  return lista.sort((a,b) => puntua(b) - puntua(a)).slice(0, cuantas || 3);
}

/* F45c · el alumno cambia lo que no hubo por otra cosa.
   Conserva turno y hora de llegada — ver la regla 3. Y si el pedido se había
   cancelado porque no le quedaba nada, revive: sólo el que se cayó por falta
   nuestra, nunca el que el alumno canceló por su cuenta. */
function cambiarRenglon(oid, i, nuevoPid){
  const p = pedido(oid); if(!p || !p.renglones[i]) return null;
  const nuevo = producto(nuevoPid);
  if(!nuevo || !nuevo.disponible || !existenciasOk(nuevo))
    throw new Error('De eso tampoco hay ya.');
  const r = p.renglones[i];
  const antes = r.prod;
  r.prod = nuevoPid; r.sinSurtir = 0; r.listo = false;

  if(p.estado === 'cancelado' && p.porFalta){
    p.estado = 'en_cola'; p.cancelado = 0; p.porFalta = false;
    anotar('revivido', { pedido:oid });
  }
  p.total = totalDe(p.renglones.filter(x => !x.sinSurtir));
  if(!p.renglones.some(x => x.sinSurtir)) p.avisoFalta = null;
  anotar('cambio_por_falta', { pedido:oid, de:antes, a:nuevoPid });
  guardar();
  return p;
}

/* "mejor déjalo así" · se quita el renglón y el pedido sigue con lo demás */
function renunciarA(oid, i){
  const p = pedido(oid); if(!p || !p.renglones[i]) return null;
  p.renglones.splice(i, 1);
  p.total = totalDe(p.renglones.filter(x => !x.sinSurtir));
  if(!p.renglones.some(x => x.sinSurtir)) p.avisoFalta = null;
  if(!p.renglones.length){
    p.estado = 'cancelado'; p.cancelado = ahora(); p.porFalta = false;
    anotar('cancelado', { pedido:oid, quien:'alumno', por:'agotado' });
  }
  anotar('renuncia', { pedido:oid });
  guardar();
  return p;
}

/* F45d · "a ÉSTE no se lo puedo dar" · un solo renglón de un solo pedido.
   Distinto de agotar: aquí no se acabó para todos, se acabó para él —se cayó
   al piso, salió mal, era el último—. El menú no se toca. */
function noSePuede(oid, i){
  const p = pedido(oid); if(!p || !p.renglones[i]) return null;
  const r = p.renglones[i];
  if(r.sinSurtir) return p;
  r.sinSurtir = ahora();
  const prod = producto(r.prod) || { nombre:'eso' };
  p.total = totalDe(p.renglones.filter(x => !x.sinSurtir));
  const nombres = (p.avisoFalta && p.avisoFalta.nombres || []).slice();
  if(nombres.indexOf(prod.nombre) < 0) nombres.push(prod.nombre);
  p.avisoFalta = { nombres, t: ahora() };
  anotar('sin_surtir', { pedido:oid, prod:r.prod });
  if(!p.renglones.some(x => !x.sinSurtir)){
    p.estado = 'cancelado'; p.cancelado = ahora(); p.porFalta = true;
    anotar('cancelado', { pedido:oid, quien:'mostrador', por:'agotado', prod:r.prod });
  }
  guardar();
  return p;
}

/* los renglones que están esperando que el alumno decida */
function faltantesDe(p){
  if(!p) return [];
  return p.renglones.map((r,i) => r.sinSurtir ? { i, r,
    prod: producto(r.prod) || { nombre:'—', precio:0 } } : null).filter(Boolean);
}

/* ══════════════════════════════════════════════════════════════════════════
   10 · EL MOSTRADOR
   ═════════════════════════════════════════════════════════════════════════ */
/* F23 · varios despachadores sin chocar: el primero que toma el pedido se
   queda con él, y a los demás les desaparece de la cola. */
function tomar(oid, quien){
  const p = pedido(oid); if(!p) return null;
  if(p.estado !== 'en_cola') return null;
  p.estado = 'preparando';
  p.despachador = quien || 'mostrador';
  p.tomado = ahora();
  anotar('tomado', { pedido:oid, quien:p.despachador });
  guardar();
  return p;
}

/* F20 · "ya lo tengo", renglón por renglón */
function renglonListo(oid, i, si){
  const p = pedido(oid); if(!p || !p.renglones[i]) return null;
  const r = p.renglones[i];
  r.listo = si === undefined ? true : !!si;
  if(r.listo){
    const desde = p.tomado || p.creado;
    anotar('renglon_listo', { pedido:oid, prod:r.prod,
      dur: Math.round((ahora() - desde)/1000) });
    /* descontar inventario (F33/F37) */
    const prod = producto(r.prod);
    if(prod && typeof prod.existencias === 'number'){
      prod.existencias = Math.max(0, prod.existencias - r.cant);
      /* si con éste se acabó, la fila se entera sola: es el caso que más
         pasa de verdad —el inventario llega a cero surtiendo un pedido— y
         nadie va a acordarse de tocar "se acabó" con las manos ocupadas */
      if(prod.existencias === 0 && prod.disponible){
        prod.disponible = false;
        anotar('producto_agotado', { prod: prod.id });
        avisarFalta(prod.id);
      }
    }
  }
  guardar();
  return p;
}

/* F21 · pedido listo → le avisa al cliente */
function marcarListo(oid){
  const p = pedido(oid); if(!p) return null;
  p.estado = 'listo';
  p.listoEn = ahora();
  p.renglones.forEach(r => r.listo = true);
  anotar('listo', { pedido:oid, dur: Math.round((ahora() - (p.tomado||p.creado))/1000) });
  guardar();
  return p;
}

/* F26 · el ticket · F27 · la deuda
   ──────────────────────────────────────────────────────────────────────────
   ⚠ Lo que aquí se arregló, porque costó dinero de verdad: la deuda sólo se
   apuntaba `if(falta > 0 && p.alumno …)`, y un pedido levantado en el
   mostrador (F22) SIEMPRE nace con `alumno: null`. O sea: la pantalla de
   cobro decía "queda a deber $12", la señora entregaba, y Fiados contestaba
   "nadie debe nada". Lo que faltó no se apuntaba en ningún lado — ni en el
   alumno, ni en el pedido, ni en los eventos. Se perdía en silencio.

   La regla ahora es una sola: **una deuda siempre es de alguien.** Si falta
   dinero y no se sabe de quién es, esto NO entrega el pedido: avisa. Es
   preferible un paso más en el mostrador que dinero que se evapora. */
function entregar(oid, pagado, aQuien){
  const d = estado();
  const p = pedido(oid); if(!p) return null;
  const paga = Math.max(0, Math.round(pagado || 0));
  const falta = p.total - paga;

  /* Se decide ANTES de tocar el pedido: si esto truena a media entrega, el
     pedido se quedaba marcado como entregado y sin cobrar. */
  let deudor = null;
  if(falta > 0){
    const cod = String(aQuien || p.alumno || '').toUpperCase();
    deudor = (cod && d.alumnos[cod]) ? d.alumnos[cod] : null;
    if(!deudor) throw new Error('Faltan ' + pesos(falta) +
      ' y no se sabe a quién fiárselos. Hay que apuntar de quién es la deuda.');
  }

  p.pagado = paga;
  p.estado = 'entregado';
  p.entregado = ahora();
  if(deudor){
    deudor.deuda += falta;
    p.debio = falta;
    p.deudor = deudor.codigo;
    anotar('deuda', { pedido:oid, alumno:deudor.codigo, monto:falta });
  }
  anotar('entregado', { pedido:oid, total:p.total, pagado:paga,
    dur: Math.round((p.entregado - (p.tomado || p.creado))/1000),
    espera: Math.round((p.entregado - p.creado)/1000) });
  guardar();
  return p;
}

/* F30 · perdonar o ajustar una deuda. El botón tiene que existir porque va a
   hacer falta — y queda registrado quién y cuándo. */
function ajustarDeuda(cod, nuevaEnCentavos, quien){
  const d = estado(), a = d.alumnos[cod]; if(!a) return null;
  const antes = a.deuda;
  a.deuda = Math.max(0, Math.round(nuevaEnCentavos));
  anotar('deuda_ajuste', { alumno:cod, antes, despues:a.deuda, quien: quien || 'cooperativa' });
  guardar();
  return a;
}

function abonar(cod, centavos){
  const d = estado(), a = d.alumnos[cod]; if(!a) return null;
  a.deuda = Math.max(0, a.deuda - Math.max(0, Math.round(centavos)));
  anotar('abono', { alumno:cod, monto:centavos });
  guardar();
  return a;
}

/* ══════════════════════════════════════════════════════════════════════════
   11 · EL CONTADOR MANUAL · para el "antes"
   Los días en que la app todavía no está publicada, o para contar la fila
   física que convive con la virtual. Es como se captura la línea base sin
   depender de la memoria de nadie.
   ═════════════════════════════════════════════════════════════════════════ */
function contarFila(cuantos, nota){
  const d = estado();
  d.conteos.push({ id: id('c'), t:ahora(), n:Math.max(0, cuantos|0), nota: String(nota||'').slice(0,80) });
  guardar();
}

/* ══════════════════════════════════════════════════════════════════════════
   12 · EL REPORTE · F38 y F43
   ═════════════════════════════════════════════════════════════════════════ */
function resumenDelDia(desde){
  const d = estado();
  const t0 = desde || arranqueDelDia();
  const hoy = d.pedidos.filter(p => p.creado >= t0);
  const entregados = hoy.filter(p => p.estado === 'entregado');
  const vivos = hoy.filter(p => VIVOS.indexOf(p.estado) >= 0);

  const dur = entregados.map(p => Math.round((p.entregado - (p.tomado||p.creado))/1000))
                        .filter(n => n > 0);
  const esperas = entregados.map(p => Math.round((p.entregado - p.creado)/1000))
                            .filter(n => n > 0);
  const prom = (a) => a.length ? Math.round(a.reduce((s,n)=>s+n,0)/a.length) : 0;

  /* qué se vendió */
  const porProducto = {};
  entregados.forEach(p => p.renglones.forEach(r => {
    const k = r.prod;
    if(!porProducto[k]) porProducto[k] = { prod:k, nombre:(producto(k)||{}).nombre||'—', unidades:0, dinero:0 };
    porProducto[k].unidades += r.cant;
    porProducto[k].dinero += ((producto(k)||{}).precio||0) * r.cant;
  }));

  const agotados = d.eventos.filter(e => e.tipo === 'producto_agotado' && e.t >= t0)
    .map(e => ({ nombre:(producto(e.prod)||{}).nombre || '—', hora:new Date(e.t) }));

  /* F45 · lo que se quedó a deber la cooperativa: cuántas veces hubo alguien
     formado pidiendo algo que ya no había. ESTE es el número que sirve para
     comprar mejor la semana que entra — "se acabó el pozole" no dice nada;
     "se acabó el pozole con nueve formados" dice exactamente cuánto faltó. */
  const faltantes = {};
  d.eventos.filter(e => e.tipo === 'sin_surtir' && e.t >= t0).forEach(e => {
    const k = e.prod;
    if(!faltantes[k]) faltantes[k] = { prod:k, nombre:(producto(k)||{}).nombre||'—', pedidos:0 };
    faltantes[k].pedidos++;
  });

  return {
    pedidos: hoy.length,
    entregados: entregados.length,
    anticipados: hoy.filter(p => p.anticipado).length,
    cancelados: hoy.filter(p => p.estado === 'cancelado').length,
    apartados: hoy.filter(p => p.estado === 'apartado').length,
    noAlcanzaron: vivos.length,
    dinero: entregados.reduce((s,p) => s + p.pagado, 0),
    facturado: entregados.reduce((s,p) => s + p.total, 0),
    deudaNueva: entregados.reduce((s,p) => s + (p.debio||0), 0),
    despachoPromedio: prom(dur),
    esperaPromedio: prom(esperas),
    ventas: Object.values(porProducto).sort((a,b) => b.unidades - a.unidades),
    agotados,
    /* cuántos pedidos se quedaron sin algo, y de qué */
    seQuedaronSin: Object.values(faltantes).sort((a,b) => b.pedidos - a.pedidos),
    filaAhora: colaOrdenada().length,
  };
}

/* La fila minuto a minuto: cuántos turnos vivos había en cada momento. Sale
   de los eventos, no de un cronómetro: es el "antes y después" del reporte. */
function curvaDeFila(desde){
  const d = estado();
  const t0 = desde || arranqueDelDia();
  const evs = d.eventos.filter(e => e.t >= t0 &&
    (e.tipo === 'pedido' || e.tipo === 'entregado' || e.tipo === 'cancelado'))
    .sort((a,b) => a.t - b.t);
  const puntos = []; let n = 0;
  evs.forEach(e => {
    n += (e.tipo === 'pedido') ? 1 : -1;
    if(n < 0) n = 0;
    puntos.push({ t:e.t, n });
  });
  return puntos;
}

/* Todo exportable, en formato nuestro. Regla §2: los datos son de la
   escuela, no de la herramienta. */
function aCSV(filas, columnas){
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  };
  return [columnas.map(c => esc(c.titulo)).join(',')]
    .concat(filas.map(f => columnas.map(c => esc(c.valor(f))).join(',')))
    .join('\n');
}

function csvDePedidos(desde){
  const d = estado(), t0 = desde || arranqueDelDia();
  const hora = (ms) => ms ? new Date(ms).toLocaleTimeString('es-MX', {hour12:false}) : '';
  return aCSV(d.pedidos.filter(p => p.creado >= t0), [
    { titulo:'folio',        valor:p => p.folio },
    { titulo:'turno',        valor:p => p.turno },
    { titulo:'grupo',        valor:p => p.grupo },
    { titulo:'estado',       valor:p => p.estado },
    { titulo:'origen',       valor:p => p.origen },
    { titulo:'anticipado',   valor:p => p.anticipado ? 'sí' : 'no' },
    { titulo:'nota',         valor:p => p.nota || '' },
    { titulo:'articulos',    valor:p => p.renglones.reduce((s,r)=>s+r.cant,0) },
    { titulo:'total_pesos',  valor:p => (p.total/100).toFixed(2) },
    { titulo:'pagado_pesos', valor:p => (p.pagado/100).toFixed(2) },
    { titulo:'pidio',        valor:p => hora(p.creado) },
    { titulo:'tomado',       valor:p => hora(p.tomado) },
    { titulo:'entregado',    valor:p => hora(p.entregado) },
    { titulo:'espera_seg',   valor:p => p.entregado ? Math.round((p.entregado-p.creado)/1000) : '' },
    { titulo:'despacho_seg', valor:p => p.entregado ? Math.round((p.entregado-(p.tomado||p.creado))/1000) : '' },
  ]);
}

function csvDeConteos(){
  const d = estado();
  return aCSV(d.conteos, [
    { titulo:'fecha', valor:c => new Date(c.t).toLocaleDateString('es-MX') },
    { titulo:'hora',  valor:c => new Date(c.t).toLocaleTimeString('es-MX', {hour12:false}) },
    { titulo:'formados', valor:c => c.n },
    { titulo:'nota',  valor:c => c.nota },
  ]);
}

function bajarCSV(nombre, texto){
  const b = new Blob(['﻿' + texto], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = nombre;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* F31 · cierre de ciclo: saldar o perdonar lo pendiente y borrar los datos.
   Si nadie escribe cuándo se borra, no se borra nunca. */
function cerrarCiclo(){
  const d = estado();
  const resumen = resumenDelDia(0);
  D = siembra();
  D.productos = d.productos;      /* el menú se queda; la gente no */
  D.config = d.config;
  guardar();
  return resumen;
}

/* ── Mis alergias · SÓLO en este teléfono ────────────────────────────────
   No entran a `alumnos`, que es lo que la cooperativa ve y exporta. Un dato
   de salud de un menor no vive en una base compartida por comodidad. */
const LLAVE_ALERGIAS = 'fadori_mis_alergias';

function misAlergias(){
  try{ const a = JSON.parse(localStorage.getItem(LLAVE_ALERGIAS) || '[]');
       return Array.isArray(a) ? a : []; }catch(e){ return []; }
}
function guardarAlergias(lista){
  try{ localStorage.setItem(LLAVE_ALERGIAS,
    JSON.stringify((lista||[]).filter(x => ALERGENOS.some(a => a.id === x)))); }catch(e){}
}

/* Qué de lo que llevas choca con lo que marcaste. Devuelve por platillo, no
   una lista suelta: hace falta saber CUÁL quitar, no sólo que hay problema. */
function choquesDe(renglones){
  const mias = misAlergias();
  if(!mias.length) return [];
  return (renglones || []).map(r => {
    const p = producto(r.prod); if(!p) return null;
    const choca = (p.alergenos || []).filter(a => mias.indexOf(a) >= 0);
    return choca.length ? { prod:p.id, nombre:p.nombre, alergenos:choca } : null;
  }).filter(Boolean);
}

/* ══════════════════════════════════════════════════════════════════════════
   13 · F39 · EL ASISTENTE DE PRESUPUESTO
   "Traigo 50 pesos" → opciones que caben. Y no sólo el trío de siempre.
   ═════════════════════════════════════════════════════════════════════════ */
function opcionesPara(centavos, cuantas){
  const disp = productos(true);
  const tope = Math.max(0, centavos|0);
  const combos = [];

  const porCat = (c) => disp.filter(p => p.cat === c);
  const barato = (a) => a.slice().sort((x,y) => x.precio - y.precio);
  const rico   = (a) => a.slice().sort((x,y) => y.precio - x.precio);

  const mete = (titulo, piezas) => {
    if(!piezas.length || piezas.some(p => !p)) return;
    const total = piezas.reduce((s,p) => s + p.precio, 0);
    if(total > tope) return;
    const llave = piezas.map(p => p.id).sort().join('|');
    if(combos.some(c => c.llave === llave)) return;
    combos.push({ llave, titulo, piezas, total, sobra: tope - total });
  };

  /* el trío clásico */
  rico(porCat('fuerte')).forEach(f => barato(porCat('bebida')).forEach(b =>
    barato(porCat('dulce')).forEach(d => mete('Comida completa', [f,b,d]))));
  /* y las que NO son ese trío, que es lo que pidió Carlos */
  rico(porCat('fuerte')).forEach(f => barato(porCat('bebida')).forEach(b =>
    mete('Plato fuerte y algo de tomar', [f,b])));
  rico(porCat('torta')).forEach(t => barato(porCat('bebida')).forEach(b =>
    barato(porCat('botana')).forEach(s => mete('Torta, bebida y botana', [t,b,s]))));
  rico(porCat('antojo')).forEach(a => rico(porCat('antojo')).forEach(a2 => {
    if(a.id !== a2.id) mete('Dos antojitos', [a,a2]);
  }));
  rico(porCat('torta')).forEach(t => barato(porCat('bebida')).forEach(b =>
    mete('Torta y bebida', [t,b])));
  rico(porCat('dulce')).forEach(d => rico(porCat('bebida')).forEach(b =>
    mete('Sólo algo dulce', [d,b])));

  /* Con poco dinero no hay combinaciones, y antes eso significaba mandar al
     alumno al diablo con un "no te alcanza para nada" — aunque sí alcanzara
     para una cosa. Si no salió ningún combo, se ofrecen las piezas sueltas
     que sí caben, de la más cara a la más barata: con veinte pesos lo que
     quieres saber es qué es lo mejor que puedes comprar, no que no puedes. */
  if(!combos.length){
    /* una sola cosa: el título es el nombre del platillo, no seis tarjetas
       que dicen todas "Alcanza para" */
    rico(disp.filter(p => p.precio <= tope)).forEach(p => mete(p.nombre, [p]));
  }

  /* lo que más aprovecha el dinero primero, y con variedad de encabezado */
  const vistos = {};
  return combos
    .sort((a,b) => a.sobra - b.sobra)
    .filter(c => { const n = (vistos[c.titulo]||0); vistos[c.titulo] = n+1; return n < 2; })
    .slice(0, cuantas || 6);
}

/* "Llévate algo más" · lo que le falta a este pedido para ser una comida.
   NO es vender por vender: mira qué categorías trae el carrito y ofrece las
   que faltan —lo de tomar, lo dulce— empezando por lo más barato y por lo
   que esa persona ya pide seguido. En un recreo de treinta minutos, volver
   al menú por la bebida cuesta más que el refresco. */
function sugerenciasPara(renglones, cod, cuantas){
  const dentro = (renglones || []).map(r => r.prod);
  const cats = dentro.map(id => (producto(id) || {}).cat);
  const disp = productos(true).filter(p => dentro.indexOf(p.id) < 0);

  /* el orden de lo que más falta: primero de tomar, luego algo dulce */
  const faltan = ['bebida','dulce','botana','antojo']
    .filter(c => cats.indexOf(c) < 0);

  /* lo que esa persona ya pide seguido va primero dentro de su categoría */
  const mios = {};
  if(cod) misNumeros(cod).favoritos.forEach(f => { mios[f.prod] = f.veces; });

  const puntua = (p) => (mios[p.id] || 0) * 1000 - p.precio;
  const salida = [];
  faltan.forEach(c => {
    const dela = disp.filter(p => p.cat === c).sort((a,b) => puntua(b) - puntua(a));
    if(dela.length) salida.push(dela[0]);
  });
  /* si no falta ninguna categoría, se ofrece lo barato que no lleve */
  if(!salida.length){
    disp.sort((a,b) => puntua(b) - puntua(a)).slice(0,4).forEach(p => salida.push(p));
  }
  return salida.slice(0, cuantas || 3);
}

/* F41 · lo tuyo: tus tendencias, tus más pedidos, cuánto llevas gastado */
function misNumeros(cod){
  const mios = pedidosDe(cod).filter(p => p.estado === 'entregado');
  const cuenta = {};
  mios.forEach(p => p.renglones.forEach(r => {
    cuenta[r.prod] = (cuenta[r.prod] || 0) + r.cant;
  }));
  const favoritos = Object.keys(cuenta)
    .map(k => ({ prod:k, nombre:(producto(k)||{}).nombre || '—', veces:cuenta[k] }))
    .sort((a,b) => b.veces - a.veces);
  return {
    pedidos: mios.length,
    gastado: mios.reduce((s,p) => s + p.pagado, 0),
    favoritos,
    /* F04 · "lo de siempre": el último pedido entregado, tal cual */
    loDeSiempre: mios.length ? mios[0].renglones.map(r => ({ prod:r.prod, cant:r.cant })) : null,
  };
}

/* F42 · sugerencias y errores, a una bandeja que revisa Carlos, con la
   pantalla en la que estaba abierta para no tener que adivinar */
function sugerir(texto, pantalla, cod){
  const d = estado();
  anotar('sugerencia', { texto:String(texto||'').slice(0,600),
    pantalla: pantalla || '', alumno: cod || null });
  guardar();
  return true;
}

function sugerencias(){
  return estado().eventos.filter(e => e.tipo === 'sugerencia')
    .sort((a,b) => b.t - a.t);
}

/* ══════════════════════════════════════════════════════════════════════════
   14 · LO QUE VE EL MUNDO
   ═════════════════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════════════════
   LOS AVISOS · sonido, letrero y notificación del teléfono
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «activa alertas sonoras y visuales en el sitio web tmb así como las
   notificaciones habituales del teléfono».

   · Con la app abierta: suena (WebAudio, sin archivos), vibra y sale un
     letrero grande arriba. Se nota aunque el teléfono esté sobre la mesa.
   · Con la app en segundo plano o cerrada: notificación del teléfono, que
     manda el SERVIDOR (Web Push). En iPhone eso sólo existe si la app está
     en la pantalla de inicio (iOS 16.4+): es regla de Apple, no nuestra, y
     la app lo dice con esas palabras en vez de fallar callada.
   · El navegador no deja sonar nada hasta que la persona toca la pantalla
     una vez: el primer toque «despierta» el audio.
   ═════════════════════════════════════════════════════════════════════════ */
const LLAVE_SONIDO = 'fadori_sonido';
const Avisos = {
  _audio: null,
  sonidoPrendido(){ try{ return localStorage.getItem(LLAVE_SONIDO) !== '0'; }catch(e){ return true; } },
  ponerSonido(si){ try{ localStorage.setItem(LLAVE_SONIDO, si ? '1' : '0'); }catch(e){} },
  despertarAudio(){
    try{
      const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return;
      if(!this._audio) this._audio = new AC();
      if(this._audio.state === 'suspended') this._audio.resume();
    }catch(e){}
  },
  /* tres sonidos, distintos a propósito: el de «ya está» se reconoce sin ver */
  sonar(tipo){
    if(!this.sonidoPrendido()) return;
    this.despertarAudio();
    const ac = this._audio; if(!ac) return;
    const notas = { listo: [660, 880, 1175], sigue: [523, 784], falta: [440, 330], nuevo: [880, 1175], cambio: [587, 740], prueba: [660, 880, 1175] }[tipo] || [660, 880];
    try{
      const t0 = ac.currentTime + .02;
      notas.forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + i * .16);
        g.gain.exponentialRampToValueAtTime(0.35, t0 + i * .16 + .02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * .16 + .32);
        o.connect(g); g.connect(ac.destination);
        o.start(t0 + i * .16); o.stop(t0 + i * .16 + .34);
      });
    }catch(e){}
  },
  vibrar(p){ try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} },
  /* el letrero grande de arriba. Se quita solo o con un toque. */
  letrero(tipo, titulo, cuerpo){
    if(typeof document === 'undefined') return;
    let n = document.getElementById('fadoriAlerta');
    if(!n){
      n = document.createElement('div'); n.id = 'fadoriAlerta'; n.setAttribute('role', 'alert');
      n.addEventListener('click', () => { n.className = 'alerta-grande'; });
      document.body.appendChild(n);
    }
    n.innerHTML = '<b></b><span></span><small>Toca para cerrar</small>';
    n.querySelector('b').textContent = titulo; n.querySelector('span').textContent = cuerpo || '';
    n.className = 'alerta-grande ' + tipo + ' sale';
    clearTimeout(this._quita);
    this._quita = setTimeout(() => { n.className = 'alerta-grande ' + tipo; }, tipo === 'listo' ? 15000 : 7000);
  },
  /* todo junto: lo que se hace cuando algo de verdad importa */
  avisar(tipo, titulo, cuerpo, tag){
    this.letrero(tipo, titulo, cuerpo);
    this.sonar(tipo);
    this.vibrar(tipo === 'listo' ? [200, 100, 200, 100, 400] : [120, 80, 120]);
    /* con la app escondida, la notificación del teléfono (si hay permiso). Si
       además llega la del servidor, trae el mismo `tag` y la reemplaza: no
       salen dos. */
    if(typeof document !== 'undefined' && document.hidden) this.notificar(titulo, cuerpo, tag);
  },
  async notificar(titulo, cuerpo, tag){
    try{
      if(!('Notification' in window) || Notification.permission !== 'granted') return;
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      const op = { body: cuerpo || '', tag: tag || 'fadori', renotify: true, icon: 'marca/icon-192.png' };
      if(reg) await reg.showNotification(titulo, op); else new Notification(titulo, op);
    }catch(e){}
  },

  esIOS(){ return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); },
  instalada(){ try{ return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }catch(e){ return false; } },
  /* en qué está: 'activos' · 'faltaPermiso' · 'negados' · 'instalar' (iPhone sin pantalla de inicio) · 'no' */
  estado(){
    if(typeof window === 'undefined') return 'no';
    if(!('Notification' in window)) return this.esIOS() && !this.instalada() ? 'instalar' : 'no';
    if(Notification.permission === 'denied') return 'negados';
    if(Notification.permission === 'granted') return 'activos';
    return 'faltaPermiso';
  },
  /* tiene que llamarse desde un toque: es la única forma en que el navegador
     deja pedir el permiso */
  async activar(){
    this.despertarAudio();
    if(this.estado() === 'instalar') return { ok: false, por: 'instalar' };
    if(!('Notification' in window)) return { ok: false, por: 'no' };
    let permiso = Notification.permission;
    if(permiso === 'default') permiso = await Notification.requestPermission();
    if(permiso !== 'granted') return { ok: false, por: 'negados' };
    const push = await this.suscribir();
    return { ok: true, push };
  },
  /* el trabajador de fondo y la suscripción al servidor. Se repite en cada
     carga si ya hay permiso (la suscripción puede cambiar, o el aparato) */
  async suscribir(){
    try{
      if(!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.register('sw.js');
      await navigator.serviceWorker.ready;
      const api = direccionServidor();
      if(!api || !('PushManager' in window) || !reg.pushManager) return false;
      const casa = encodeURIComponent(MotorServidor.casa());
      const r = await fetch(api + '/api/push/clave?casa=' + casa, { headers: cabezasSync() });
      const { clave } = await r.json();
      const bytes = (t) => { const s = String(t).replace(/-/g, '+').replace(/_/g, '/'); const b = atob(s + '==='.slice((s.length + 3) % 4)); return Uint8Array.from(b, c => c.charCodeAt(0)); };
      let sub = await reg.pushManager.getSubscription();
      if(!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(clave) });
      const alta = await fetch(api + '/api/push/alta?casa=' + casa, { method: 'POST', headers: cabezasSync(), body: JSON.stringify({ sub: sub.toJSON() }) });
      return alta.ok;
    }catch(e){ return false; }
  },
};
/* el primer toque despierta el audio; y si ya había permiso, se re-suscribe */
if(typeof document !== 'undefined'){
  const despierta = () => { Avisos.despertarAudio(); document.removeEventListener('pointerdown', despierta, true); };
  document.addEventListener('pointerdown', despierta, true);
  try{ if(window.Notification && Notification.permission === 'granted') setTimeout(() => Avisos.suscribir(), 2500); }catch(e){}
}

const FADORI = {
  /* utilería */
  /* los billetes y monedas con los que de verdad llega un alumno */
  ALGO_DE_DINERO: [10, 15, 20, 30, 50, 100],
  pesos, minutosDe, codigo, id, ahora, CATEGORIAS, CONFIG_BASE, ALERGENOS,
  misAlergias, guardarAlergias, choquesDe,
  /* datos */
  cargar, guardar, estado, _migrar: migrar, avisaCon,
  DIAS, tocaHoy, menuDelDia, nombreDelDia, cuandoTocaTexto, diaDeHoy,
  tema, ponerTema, esOscuro, aplicarTema, verTurno,
  servidor: direccionServidor, ponerServidor, elegirMotor, sync: MotorServidor, pausarSync, servidorDeFabrica, subirMenu,
  aparatoId, llaveMostrador, misCodigos, entrarConCodigo, avisos: Avisos,
  entrarMostrador: (p) => MotorServidor.entrarMostrador(p), salirMostrador: () => MotorServidor.salirMostrador(),
  pasadorAlServidor: (n) => MotorServidor.pasadorAlServidor(n),
  estadoSync: () => MotorServidor.estado(), probarServidor: (u) => MotorServidor.probar(u), alCambiar: (fn) => MOTOR.alCambiar(fn), motor: () => MOTOR.nombre,
  /* quién es */
  registrar, nuevaPersona, buscarPersonas, yo, entrarComo, salir, aceptarTerminos,
  /* menú */
  productos, producto, marcarDisponible, guardarProducto, borrarProducto, existenciasOk, emojiDe,
  /* pedidos */
  pedir, pedido, pedidosDe, pedidosDeHoy, puedePedir, totalDe, segundosDe,
  cancelar, apartarParaManana, voyEnCamino,
  seAcabo, avisarFalta, aQuienLePega, noSePuede, enLugarDe, cambiarRenglon, renunciarA, faltantesDe,
  /* la fila */
  colaOrdenada, lugarDe, veredicto, quedanSegundosDeRecreo, enRecreo, ventanaRecreo,
  cuentaRegresiva, relojCorto,
  ritmoDespacho, segReales,
  /* mostrador */
  tomar, renglonListo, marcarListo, entregar, ajustarDeuda, abonar,
  /* medición */
  contarFila, resumenDelDia, curvaDeFila, csvDePedidos, csvDeConteos, bajarCSV, cerrarCiclo,
  /* el pasador */
  pasadorOk, pasoElPasador, cerrarMostrador, cambiarPasador, renovarPase, recordarPasador, PASE_DURA,
  /* cerebro */
  opcionesPara, sugerenciasPara, misNumeros, sugerir, sugerencias,
  /* para las pruebas */
  _siembra: siembra, _anotar: anotar, ESTADOS, VIVOS,
};

global.FADORI = FADORI;

})(typeof window !== 'undefined' ? window : globalThis);
