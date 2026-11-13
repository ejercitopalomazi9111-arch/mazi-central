/* ══════════════════════════════════════════════════════════════════════════
   ACADEMIA GRUPO MAZI · los cursos para vendedores, dentro de CARYMO
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 13 nov: «cárgale todo el contexto de Grupo Mazi, de dónde venimos,
   quiénes somos, cómo hemos crecido, cómo vendemos. Métele cursos, lo que
   tenemos de las presentaciones de ventas… lo que sea importante y que
   podamos darle a los vendedores… que en caso de que tengamos vendedores les
   podamos decir: si quieres estudiar cómo trabajar con Grupo Mazi, ahí mismo
   lo puedes hacer».

   Estos cursos NO los escribe la IA: están escritos aquí, con los datos de
   empresa/ventas (Guía del vendedor y la presentación «Vender con Grupo
   Mazi»), empresa/servicios/PRECIOS.md y CLAUDE.md §1. Así un precio nunca
   sale inventado y el curso abre al instante, sin gastar IA. Las cátedras del
   pizarrón sí las da la IA, pero con la hoja de HECHOS de abajo pegada: sólo
   puede contar lo que dice ahí.

   ⚠ Lo que NO va, a propósito:
     · la Chuleta de Carlos es «para ti, no para repartir»: de ahí sólo entran
       los datos del mercado y las preguntas que sí se le contestan al vendedor;
     · el porcentaje de comisión NO está decidido: el curso dice que lo
       confirma Carlos, y no inventa un número;
     · no se nombra como cliente a nadie que no lo sea (ICAMP no va).
   Si cambia un precio: se cambia aquí, en servicios.html y en PRECIOS.md.
   ═════════════════════════════════════════════════════════════════════════ */

/* la hoja de hechos que reciben las cátedras del pizarrón */
export const HECHOS = `Grupo Mazi es una empresa de servicios de Querétaro, fundada y dirigida por Carlos (Palomazi). Cobra por proyecto y sus colaboradores y vendedores cobran comisión por proyecto.
Lema: «Si no existe la herramienta, se construye la herramienta». Regla de la casa: todo lo que la empresa usa lo construimos nosotros; nos conectamos con servicios externos, pero no dependemos de ellos.
Qué vende (seis líneas): web, software, marketing, video y fotografía, gestión de negocios, y tiempos y movimientos.
Lo que nos distingue: entregamos rápido (una página Esencial en 3 a 5 días), precios abajo del promedio del mercado, y nos quedamos después de entregar (mantenimiento).
Precios: Página Esencial $2,000 (3 a 5 días); Página Completa $6,500 (1 a 2 semanas, pedidos y citas por WhatsApp, 2 videos de regalo; es la que más conviene); Página A la medida desde $9,000 (carrito, reservas, cotizador o panel); las tres traen 3 meses de mantenimiento incluidos. Mantenimiento $450 al mes (Esencial: hasta 4 cambios chicos, respuesta en 48 h) o $650 (Plus: hasta 10 cambios, una promoción al mes, atención el mismo día); el año pagado completo son 12 meses por el precio de 10. 2 videos para redes $1,200. Menú digital con QR $900. Tienda en línea desde $12,000. Manejo de redes $2,900 al mes ($5,500 con 4 videos). Sesión de fotos $1,500.
Mercado (octubre de 2026, cifras orientativas): página sencilla $6,500 a $25,000 (el freelance más barato unos $4,000); sitio de negocio $15,000 a $40,000; tienda $18,000 a $40,000; mantenimiento $500 a $3,000 al mes con freelance y $2,500 a $8,000 con agencias; redes $3,500 a $12,000 al mes.
Condiciones: 50 % para empezar y 50 % al entregar; 2 rondas de ajustes incluidas y después $450 la hora; la fecha corre desde que tenemos el material del cliente; dominio y página a nombre del cliente; IVA aparte si quiere factura; lo que no entra en el plan, con 15 % de descuento; pagos o etapas los autoriza Carlos; lo presencial sólo dentro de Querétaro y fuera con viáticos del cliente.
Cómo se vende: negocios con cara al público en Querétaro que ya venden por WhatsApp. Cinco pasos: pregunta, enseña un trabajo en tu celular, propón UN paquete, cierra con 50 %, acompaña y a los 3 meses ofrece el mantenimiento. Trabajos que se enseñan: Smiley's (pizzería), District Roll (menú con pedido por WhatsApp) y Fadori (pedidos sin filas en una cafetería escolar).
Historia: empezó construyendo herramientas propias (Ligas Mazi, Fadori) y en octubre de 2026 cerró su primera venta grande a un cliente de fuera: la página completa de Smiley's por $6,000, pagada a $1,000 por semana.
Contacto: WhatsApp 442 883 3786 · grupomazi.oficial@gmail.com.`;

/* el material para descargar (lo que se le da al vendedor; la Chuleta NO) */
export const MATERIAL = [
  { titulo: 'Guía del vendedor', detalle: 'Lo que necesitas para salir a vender esta semana', href: '../empresa/ventas/Guia-del-vendedor.pdf', icono: 'book-open' },
  { titulo: 'Vender con Grupo Mazi', detalle: 'La presentación de la conferencia, en PDF', href: '../empresa/ventas/Vender-con-Grupo-Mazi.pdf', icono: 'presentation' },
];

/* una lección: 3 o 4 ideas cortas (una por pantalla) y un dato para recordar */
const L = (titulo, ideas, dato) => ({ titulo, ideas: ideas.map(([t, x, i]) => ({ titulo: t, texto: x, icono: i })), dato });

export const CURSOS = [
  /* ───────────────────────────── 1 ───────────────────────────── */
  {
    id: 'acad-quienes', titulo: 'Conoce Grupo Mazi', color: '#7E1735', icono: 'school',
    frase: 'De dónde venimos, quiénes somos y qué nos hace distintos.',
    unidades: [
      { titulo: 'Quiénes somos', frase: 'La empresa en cinco minutos.', temas: [
        { titulo: 'Qué es Grupo Mazi', resumen: 'Empresa de servicios de Querétaro que cobra por proyecto, con seis líneas de trabajo.',
          leccion: L('Qué es Grupo Mazi', [
            ['Una empresa de servicios', 'Grupo Mazi es una **empresa de servicios** de Querétaro. La fundó y la dirige Carlos.', 'building'],
            ['Seis líneas', 'Hacemos **web**, software, marketing, video y foto, gestión de negocios, y tiempos y movimientos.', 'layers'],
            ['Por proyecto', 'Cobramos **por proyecto**, no por hora suelta. Y quien vende o colabora cobra comisión.', 'coins'],
            ['Nuestro lema', '«Si no existe la herramienta, **se construye** la herramienta.»', 'hammer'],
          ], 'Seis líneas, una empresa: si el cliente pide algo de la lista, lo hacemos.'),
          preguntas: [
            { tipo: 'opcion', pregunta: '¿Cómo cobra Grupo Mazi su trabajo?', opciones: ['Por proyecto', 'Por hora suelta', 'Con una suscripción fija', 'Sólo con comisión del cliente'], correcta: 0, porque: 'Cobramos por proyecto. Quien vende cobra comisión por cada proyecto que cierra.', pista: 'Piensa en cómo se paga una página completa.' },
            { tipo: 'hueco', frase: 'El lema de la casa es: «Si no existe la herramienta, se ___ la herramienta.»', respuesta: 'construye', distractores: ['compra', 'renta', 'busca'], porque: 'Es la idea que nos mueve: lo que no existe, lo hacemos nosotros.', pista: 'Es lo contrario de comprarla hecha.' },
            { tipo: 'escribir', pregunta: '¿En qué ciudad está Grupo Mazi?', respuesta: 'Querétaro', aceptadas: ['Queretaro', 'Qro'], porque: 'Somos de Querétaro, y lo presencial se hace dentro de Querétaro.', pista: 'Empieza con Q.' },
            { tipo: 'clasificar', pregunta: 'Clasifica: ¿lo hace Grupo Mazi o no es lo nuestro?', grupos: [{ nombre: 'Lo hacemos', items: ['Páginas web', 'Video para redes', 'Software a la medida'] }, { nombre: 'No es lo nuestro', items: ['Reparar celulares', 'Vender ropa por mayoreo'] }], porque: 'Las seis líneas son web, software, marketing, video y foto, gestión de negocios, y tiempos y movimientos.' },
            { tipo: 'unir', pregunta: 'Conecta cada línea con lo que le resuelve al cliente', pares: [['Web', 'Que lo encuentren y le escriban'], ['Video y foto', 'Contenido para sus redes'], ['Tiempos y movimientos', 'Que su operación sea más rápida'], ['Marketing', 'Que más gente lo conozca']], porque: 'No hace falta saberse todo lo técnico: basta con saber qué problema resuelve cada línea.' },
            { tipo: 'opcion', pregunta: '¿Quién fundó y dirige Grupo Mazi?', opciones: ['Carlos', 'Un corporativo de Monterrey', 'Una franquicia extranjera', 'Un grupo de inversionistas'], correcta: 0, porque: 'Carlos (Palomazi) la fundó y la dirige. Las decisiones de precio pasan por él.', pista: 'Es a quien le preguntas antes de mover un precio.' },
          ] },
        { titulo: 'Lo que nos distingue', resumen: 'Entregamos rápido, cobramos abajo del mercado y nos quedamos después de entregar.',
          leccion: L('Tres cosas que nos distinguen', [
            ['Rápido', 'Una página Esencial queda en **3 a 5 días**. La competencia tarda semanas.', 'timer'],
            ['Abajo del mercado', 'Todos nuestros precios están **abajo del promedio** del mercado, medido en octubre de 2026.', 'trending-down'],
            ['Nos quedamos', 'Después de entregar damos **mantenimiento**: el cliente no se queda solo con su página.', 'handshake'],
          ], 'Si el cliente sólo se lleva una idea, que sea: «se quedan conmigo después».'),
          preguntas: [
            { tipo: 'opcion', pregunta: '¿En cuánto tiempo queda una página Esencial?', opciones: ['3 a 5 días', '1 a 2 meses', 'Un día', '6 semanas'], correcta: 0, porque: 'La Esencial queda en 3 a 5 días, contando desde que tenemos el material del cliente.', pista: 'Menos de una semana.' },
            { tipo: 'hueco', frase: 'Lo que más nos distingue es que después de entregar nos ___ con el cliente.', respuesta: 'quedamos', distractores: ['peleamos', 'olvidamos', 'despedimos'], porque: 'Entregamos rápido y nos quedamos mucho tiempo: eso es el mantenimiento.', pista: 'Lo contrario de irse.' },
            { tipo: 'error', pregunta: 'Un vendedor explicó así lo que nos distingue. ¿Qué parte está mal?', pasos: ['Entregamos rápido', 'Nuestros precios están abajo del promedio', 'Lo hacemos en corto, no a la larga… y nos tardamos', 'Damos mantenimiento después de entregar'], error: 2, correccion: 'Entregamos rápido y nos quedamos mucho tiempo', porque: 'La frase «lo hacemos a la larga» se retiró porque suena a que nos tardamos, y justo entregamos rápido.' },
            { tipo: 'escribir', pregunta: '¿Cómo se llama el servicio que damos después de entregar una página?', respuesta: 'mantenimiento', aceptadas: ['el mantenimiento', 'plan de mantenimiento'], porque: 'El mantenimiento mantiene la página al día y es lo que más paga a la larga.', pista: 'Como un seguro para la página.' },
            { tipo: 'clasificar', pregunta: '¿Esto nos distingue o es algo que NO decimos?', grupos: [{ nombre: 'Nos distingue', items: ['Entregamos rápido', 'Estamos abajo del mercado', 'Nos quedamos después'] }, { nombre: 'No lo decimos', items: ['Somos los más caros porque somos los mejores', 'Lo hacemos a la larga'] }], porque: 'Las tres que nos distinguen son: rápido, abajo del mercado y nos quedamos.' },
          ] },
      ] },
      { titulo: 'De dónde venimos', frase: 'Cómo empezó todo y cómo hemos crecido.', temas: [
        { titulo: 'Nuestra historia', resumen: 'Empezamos haciendo herramientas propias y en octubre de 2026 cerramos la primera venta grande.',
          leccion: L('Cómo empezamos', [
            ['Herramientas propias', 'Empezamos construyendo **nuestras propias herramientas**: Ligas Mazi y Fadori, entre otras.', 'wrench'],
            ['Fadori', '**Fadori** quita las filas en una cafetería escolar: pides desde el celular y una pantalla avisa tu turno.', 'coffee'],
            ['Primera venta grande', 'En octubre de 2026 cerramos la página completa de **Smiley\'s**: $6,000, pagada a $1,000 por semana.', 'pizza'],
            ['Seguimos creciendo', 'Después vinieron el menú de **District Roll** y las páginas para barberías.', 'trending-up'],
          ], 'Smiley\'s se pagó en abonos semanales: los pagos bien acordados también cierran ventas.'),
          preguntas: [
            { tipo: 'opcion', pregunta: '¿Cuál fue la primera venta grande a un cliente de fuera?', opciones: ['La página completa de Smiley\'s', 'Un comercial para la tele', 'Una app para un banco', 'Un logo para una escuela'], correcta: 0, porque: 'Smiley\'s, una pizzería, compró su página completa por $6,000 en octubre de 2026.', pista: 'Es una pizzería.' },
            { tipo: 'hueco', frase: 'Smiley\'s pagó su página de $6,000 en abonos de ___ por semana.', respuesta: '$1,000', distractores: ['$500', '$2,000', '$3,000'], porque: 'Seis abonos semanales de $1,000. Un buen acuerdo de pagos también cierra una venta.', pista: 'Seis semanas para llegar a $6,000.' },
            { tipo: 'unir', pregunta: 'Conecta cada trabajo con lo que hace', pares: [['Smiley\'s', 'Página de una pizzería'], ['District Roll', 'Menú con pedido por WhatsApp'], ['Fadori', 'Pedidos sin filas en una cafetería escolar'], ['Ligas Mazi', 'Plataforma para ligas de baloncesto']], porque: 'Son los trabajos que puedes abrir en tu celular para enseñarlos.' },
            { tipo: 'ordenar', pregunta: 'Ordena cómo ha crecido Grupo Mazi', pasos: ['Construimos herramientas propias', 'Cerramos la primera venta grande (Smiley\'s)', 'Hicimos el menú de District Roll', 'Formamos un equipo de vendedores'], porque: 'Primero lo propio, luego la primera venta, después más clientes y ahora el equipo de ventas.' },
            { tipo: 'escribir', pregunta: '¿Cómo se llama la app que quita las filas en la cafetería escolar?', respuesta: 'Fadori', aceptadas: [], porque: 'Fadori: pides desde el celular y una pantalla avisa tu turno.', pista: 'Empieza con F.' },
          ] },
        { titulo: 'Nuestra forma de trabajar', resumen: 'Todo lo que usamos lo construimos, entramos a la operación del cliente y cuidamos la marca.',
          leccion: L('Así trabajamos', [
            ['Lo construimos nosotros', 'Todo lo que la empresa usa **lo construimos nosotros**. Nos conectamos con otros, pero no dependemos de ellos.', 'hammer'],
            ['Nos quedamos', 'No cerramos chambas sueltas: **entramos a la operación** del cliente y nos quedamos.', 'handshake'],
            ['Nuestra imagen', 'Nuestros colores son **vino** y morado; nuestro logo es la paloma y la M que se vuelve cubo.', 'palette'],
            ['Equipo con IA', 'Trabajamos con **socios de IA** que construyen y revisan, y personas que deciden.', 'bot'],
          ], 'Conectar sí, depender no: si un servicio externo falla, se cambia la pieza, no el negocio.'),
          preguntas: [
            { tipo: 'opcion', pregunta: '¿Qué dice la regla de la casa sobre los servicios externos?', opciones: ['Nos conectamos con ellos, pero no dependemos de ellos', 'Todo se hace con servicios externos', 'Nunca usamos nada de nadie', 'Sólo usamos lo que el cliente elija'], correcta: 0, porque: 'Conectar sí, depender no: lo que usamos lo construimos, y lo externo queda abajo y se puede cambiar.', pista: 'Conectar sí…' },
            { tipo: 'hueco', frase: 'No cerramos chambas sueltas: entramos a la ___ del cliente y nos quedamos.', respuesta: 'operación', distractores: ['casa', 'oficina', 'familia'], porque: 'Nos volvemos parte de cómo trabaja el negocio, y por eso nos quedamos.', pista: 'Es cómo funciona el negocio por dentro.' },
            { tipo: 'clasificar', pregunta: '¿Va con nuestra imagen o no?', grupos: [{ nombre: 'Va con la marca', items: ['Color vino', 'Morado oscuro', 'La M que se vuelve cubo'] }, { nombre: 'No va', items: ['Color rosa', 'Logos hechos con emojis'] }], porque: 'Los colores son vino, morado oscuro y morado claro, y el logo es la paloma con la M cubo.' },
            { tipo: 'escribir', pregunta: '¿Cuál es el color principal de Grupo Mazi, junto con el morado?', respuesta: 'vino', aceptadas: ['guinda', 'color vino'], porque: 'Vino y morado oscuro son los protagonistas; el morado claro resalta.', pista: 'Como el color de una copa de tinto.' },
          ] },
      ] },
    ],
  },
  /* ───────────────────────────── 2 ───────────────────────────── */
  {
    id: 'acad-precios', titulo: 'Lo que vendemos y cuánto cuesta', color: '#5B2A86', icono: 'award',
    frase: 'Los paquetes, los precios y por qué el mantenimiento es el negocio.',
    unidades: [
      { titulo: 'Las tres páginas', frase: 'Lo que más se vende.', temas: [
        { titulo: 'Esencial, Completa y A la medida', resumen: 'Los tres paquetes de página, para quién es cada uno y cuánto cuestan.',
          leccion: L('Las tres páginas', [
            ['Esencial · $2,000', 'Para quien **no tiene nada** en internet. Queda en 3 a 5 días. Es la puerta de entrada.', 'store'],
            ['Completa · $6,500', 'Para quien ya vende por WhatsApp: pedidos y citas **llegan armados**. Trae 2 videos de regalo.', 'star'],
            ['A la medida · desde $9,000', 'Lo que su competencia no tiene: **carrito, reservas**, cotizador o panel para cambiar precios.', 'gem'],
            ['Las tres incluyen', '**3 meses de mantenimiento** van incluidos en las tres páginas.', 'package'],
          ], 'Empuja la Completa: el cliente se lleva más (los videos) y a nosotros nos deja mejor margen.'),
          preguntas: [
            { tipo: 'opcion', pregunta: '¿Cuánto cuesta la Página Completa?', opciones: ['$6,500', '$2,000', '$9,000', '$12,000'], correcta: 0, porque: 'La Completa cuesta $6,500 y trae 2 videos de regalo.', pista: 'Es la de en medio.' },
            { tipo: 'unir', pregunta: 'Conecta cada página con su precio', pares: [['Esencial', '$2,000'], ['Completa', '$6,500'], ['A la medida', 'desde $9,000'], ['Menú digital con QR', '$900']], porque: 'Son los precios de la Guía del vendedor.' },
            { tipo: 'hueco', frase: 'La Página Completa trae de regalo ___ videos para redes.', respuesta: '2', distractores: ['5', '10', '1'], porque: 'Dos videos de regalo: por eso el cliente siente que se lleva más.', pista: 'Un par.' },
            { tipo: 'clasificar', pregunta: '¿Qué página le propones a cada negocio?', grupos: [{ nombre: 'Esencial', items: ['Taller que no tiene nada en internet', 'Consultorio nuevo sin página'] }, { nombre: 'Completa', items: ['Barbería que agenda citas por WhatsApp', 'Pizzería que toma pedidos a mano'] }], porque: 'Quien no tiene nada empieza con la Esencial; quien ya vende por WhatsApp gana más con la Completa.' },
            { tipo: 'escribir', pregunta: '¿Cuántos meses de mantenimiento vienen incluidos en las tres páginas?', respuesta: '3', aceptadas: ['tres', '3 meses', 'tres meses'], porque: 'Tres meses incluidos: el cliente no paga mantenimiento hasta que ya vio que funciona.', pista: 'Un trimestre.' },
            { tipo: 'opcion', pregunta: 'Un restaurante quiere que sus clientes aparten mesa en línea y paguen con carrito. ¿Qué le ofreces?', opciones: ['Página A la medida', 'Página Esencial', 'Sólo un menú con QR', 'Nada, eso no lo hacemos'], correcta: 0, porque: 'Carrito y reservas son de la página A la medida, desde $9,000.', pista: 'Es lo que su competencia no tiene.' },
          ] },
        { titulo: 'Más servicios', resumen: 'Videos, menú con QR, tienda, redes y fotos: los demás precios que más se piden.',
          leccion: L('Lo demás que vendemos', [
            ['Videos para redes', '**2 videos** para Instagram o TikTok cuestan $1,200.', 'film'],
            ['Menú digital con QR', 'Para restaurantes y cafeterías: **$900**.', 'utensils'],
            ['Tienda en línea', 'Desde **$12,000**. En el mercado anda de $18,000 a $40,000.', 'shopping-cart'],
            ['Redes y fotos', 'Manejo de redes **$2,900 al mes**. Sesión de fotos, $1,500 (sólo en Querétaro).', 'camera'],
          ], 'Si el cliente pide algo de las seis líneas que no conoces, dile: «lo checo con el equipo y te confirmo hoy».'),
          preguntas: [
            { tipo: 'opcion', pregunta: '¿Cuánto cuestan 2 videos para redes?', opciones: ['$1,200', '$600', '$3,500', '$12,000'], correcta: 0, porque: 'Dos videos para redes cuestan $1,200.', pista: 'Mil y algo.' },
            { tipo: 'unir', pregunta: 'Conecta cada servicio con su precio', pares: [['Menú digital con QR', '$900'], ['Tienda en línea', 'desde $12,000'], ['Manejo de redes', '$2,900 al mes'], ['Sesión de fotos', '$1,500']], porque: 'Son los precios vigentes, todos abajo del promedio del mercado.' },
            { tipo: 'hueco', frase: 'La sesión de fotos se hace sólo dentro de ___; fuera, el cliente paga los viáticos.', respuesta: 'Querétaro', distractores: ['México', 'Jalisco', 'Monterrey'], porque: 'Todo lo presencial es en Querétaro; fuera, sólo casos especiales y con viáticos del cliente.', pista: 'Donde estamos.' },
            { tipo: 'escribir', pregunta: '¿Desde cuánto cuesta una tienda en línea con nosotros? (sólo el número)', respuesta: '12000', aceptadas: ['12,000', '$12,000', '12 mil', 'doce mil'], porque: 'Desde $12,000, cuando en el mercado va de $18,000 a $40,000.', pista: 'Doce…' },
          ] },
      ] },
      { titulo: 'El mantenimiento', frase: 'El dinero que se repite cada mes.', temas: [
        { titulo: 'Los planes de mantenimiento', resumen: 'Esencial de $450 y Plus de $650 al mes, qué incluye cada uno y por qué es lo que más paga.',
          leccion: L('El negocio de verdad', [
            ['Esencial · $450 al mes', 'Hasta **4 cambios chicos** al mes y respuesta en 48 horas.', 'wrench'],
            ['Plus · $650 al mes', 'Hasta **10 cambios**, una promoción al mes y atención el mismo día.', 'sparkles'],
            ['Lo que más paga', 'Diez clientes en mantenimiento son de **$4,500 a $6,500** al mes que llegan solos.', 'piggy-bank'],
            ['Año completo', 'Pagando el año completo son **12 meses por el precio de 10**.', 'calendar'],
          ], '«Es como un seguro: tu página siempre al día y alguien que te contesta.»'),
          preguntas: [
            { tipo: 'opcion', pregunta: '¿Cuánto cuesta el mantenimiento Plus al mes?', opciones: ['$650', '$450', '$250', '$1,200'], correcta: 0, porque: 'El Plus cuesta $650: hasta 10 cambios, una promoción al mes y atención el mismo día.', pista: 'Es el más completo de los dos.' },
            { tipo: 'hueco', frase: 'Pagando el año completo, el mantenimiento son 12 meses por el precio de ___.', respuesta: '10', distractores: ['6', '11', '12'], porque: 'Dos meses de regalo por pagar el año.', pista: 'Te regalan dos.' },
            { tipo: 'clasificar', pregunta: '¿Esto es del plan Esencial o del Plus?', grupos: [{ nombre: 'Esencial ($450)', items: ['Hasta 4 cambios al mes', 'Respuesta en 48 horas'] }, { nombre: 'Plus ($650)', items: ['Hasta 10 cambios al mes', 'Una promoción al mes', 'Atención el mismo día'] }], porque: 'El Esencial es para páginas Esenciales; el Plus, para Completas y A la medida.' },
            { tipo: 'error', pregunta: 'Así cerró una venta un vendedor nuevo. ¿Qué paso estuvo mal?', pasos: ['Preguntó cómo le llegan los clientes', 'Le enseñó Smiley\'s en su celular', 'Le propuso la Página Completa', 'Cerró con el 50 % sin mencionar el mantenimiento'], error: 3, correccion: 'Cerró con el 50 % y le explicó el mantenimiento', porque: 'Nunca se cierra una página sin explicar el mantenimiento: es lo que más paga a la larga.' },
            { tipo: 'escribir', pregunta: '¿Cuánto cuesta al mes el plan de mantenimiento Esencial? (sólo el número)', respuesta: '450', aceptadas: ['$450', '450 pesos'], porque: '$450 al mes: abajo del freelance más barato del mercado, que cobra $500.', pista: 'Menos de quinientos.' },
            { tipo: 'opcion', pregunta: '¿Qué es un «cambio chico» en el mantenimiento?', opciones: ['Algo de menos de 20 minutos que no cambia cómo funciona la página', 'Rehacer el diseño completo', 'Agregar un carrito de compras', 'Cambiar de dominio y de negocio'], correcta: 0, porque: 'Precios, fotos, horarios o promociones. Lo demás se cotiza con 15 % de descuento.', pista: 'Es rápido y no cambia cómo funciona.' },
          ] },
      ] },
    ],
  },
  /* ───────────────────────────── 3 ───────────────────────────── */
  {
    id: 'acad-vender', titulo: 'Cómo vender con Grupo Mazi', color: '#170A26', icono: 'graduation-cap',
    frase: 'A quién buscar, cómo se cierra, qué contestar y cómo ganas.',
    unidades: [
      { titulo: 'A quién venderle', frase: 'Encuentra al cliente que ya nos necesita.', temas: [
        { titulo: 'El cliente ideal', resumen: 'Negocios con cara al público en Querétaro y las señales de que van a comprar.',
          leccion: L('A quién buscar', [
            ['Cara al público', 'Negocios en Querétaro que atienden gente: **restaurantes, barberías**, cafeterías, ropa, consultorios, escuelas, talleres.', 'store'],
            ['La señal de compra', 'Contestan **pedidos a mano** por WhatsApp o tienen el menú en una foto borrosa.', 'message-circle'],
            ['«Sí tengo Facebook»', 'Si lo dicen con cara de que **no les sirve**, ahí hay una venta.', 'search'],
            ['Enséñalo funcionando', 'Abre **Smiley\'s**, District Roll o Fadori en tu celular. Que lo toquen.', 'phone'],
          ], 'Verlo funcionar vende más que cualquier explicación.'),
          preguntas: [
            { tipo: 'opcion', pregunta: '¿Cuál es la mejor señal de que un negocio nos va a comprar?', opciones: ['Contesta pedidos a mano por WhatsApp', 'Ya tiene una página que le funciona', 'No atiende al público', 'Está fuera de México'], correcta: 0, porque: 'Si contesta a mano, la Página Completa le ahorra tiempo: los pedidos le llegan armados.', pista: 'Le quita tiempo todos los días.' },
            { tipo: 'clasificar', pregunta: '¿Es buen prospecto o no?', grupos: [{ nombre: 'Buen prospecto', items: ['Barbería que agenda por WhatsApp', 'Cafetería con el menú en una foto', 'Taller sin nada en internet'] }, { nombre: 'Todavía no', items: ['Fábrica que no atiende al público', 'Negocio con página nueva que le funciona'] }], porque: 'Buscamos negocios con cara al público que pierden tiempo o clientes por no tener lo nuestro.' },
            { tipo: 'hueco', frase: 'Lo que más vende es enseñar un trabajo nuestro funcionando en tu ___.', respuesta: 'celular', distractores: ['folleto', 'tarjeta', 'correo'], porque: 'Que lo toquen ellos mismos: verlo funcionar convence más que explicarlo.', pista: 'Lo traes en la bolsa.' },
            { tipo: 'escribir', pregunta: '¿Qué pizzería puedes enseñar como trabajo nuestro?', respuesta: 'Smiley\'s', aceptadas: ['Smileys', 'Smiley', 'smiles'], porque: 'Smiley\'s es la página completa que entregamos en octubre de 2026.', pista: 'Su nombre suena a sonrisa en inglés.' },
          ] },
      ] },
      { titulo: 'Cómo se cierra', frase: 'Cinco pasos y las respuestas que necesitas.', temas: [
        { titulo: 'Los cinco pasos', resumen: 'Pregunta, enseña, propón un paquete, cierra con el 50 % y acompaña.',
          leccion: L('Cinco pasos para cerrar', [
            ['1 · Pregunta', '«¿Cómo te llegan los clientes hoy? ¿Qué te quita más tiempo?» **Escucha** más de lo que hablas.', 'message-circle'],
            ['2 · Enseña', 'Abre un trabajo nuestro **parecido a su negocio** en tu celular.', 'phone'],
            ['3 · Propón UN paquete', 'El que resuelve lo que te dijo. Si le sueltas **toda la lista**, se confunde y lo pospone.', 'target'],
            ['4 y 5 · Cierra y acompaña', '**50 % para empezar**, pide su material ese día, avisa cada avance y a los 3 meses ofrece el mantenimiento.', 'handshake'],
          ], 'El error más común: soltar la lista de precios completa. Un solo paquete.'),
          preguntas: [
            { tipo: 'ordenar', pregunta: 'Ordena los cinco pasos para cerrar una venta', pasos: ['Pregunta cómo le llegan los clientes', 'Enseña un trabajo en tu celular', 'Propón un solo paquete', 'Cierra con el 50 %', 'Acompaña y ofrece el mantenimiento'], porque: 'Primero entiendes su problema, luego le enseñas, le propones UNA solución, cierras y te quedas.' },
            { tipo: 'error', pregunta: '¿Qué paso de esta venta estuvo mal?', pasos: ['Preguntó qué le quita más tiempo', 'Le enseñó District Roll en su celular', 'Le leyó la lista completa de precios', 'Cerró con el 50 % y pidió sus fotos'], error: 2, correccion: 'Le propuso un solo paquete, el que resuelve su problema', porque: 'Con la lista completa el cliente se confunde y lo pospone.' },
            { tipo: 'opcion', pregunta: '¿Cuánto paga el cliente para empezar?', opciones: ['El 50 %', 'El 100 %', 'Nada, paga al final', 'El 10 %'], correcta: 0, porque: '50 % para empezar y 50 % al entregar. Sin el primer pago no se empieza.', pista: 'La mitad.' },
            { tipo: 'hueco', frase: 'La fecha de entrega corre desde que tenemos el ___ del cliente: sus fotos, precios y textos.', respuesta: 'material', distractores: ['dinero completo', 'contrato', 'logo'], porque: 'Por eso se le pide el material el mismo día que cierra.', pista: 'Fotos, precios y textos.' },
            { tipo: 'unir', pregunta: 'Conecta cada paso con lo que dices', pares: [['Pregunta', '¿Cómo te llegan los clientes hoy?'], ['Enseña', 'Mira, tócalo tú en mi celular'], ['Cierra', 'Empezamos con el 50 % y me pasas tus fotos'], ['Acompaña', 'Ya va el avance, mira cómo quedó']], porque: 'Cada paso tiene su frase: así nunca te quedas en blanco.' },
          ] },
        { titulo: 'Las objeciones', resumen: 'Qué contestar cuando dicen «está caro», «ya tengo Facebook» o «mi sobrino me la hace».',
          leccion: L('Qué contestar', [
            ['«Está caro»', 'Estamos **abajo del promedio**: una página sencilla va de $6,500 a $25,000. Y hay etapas o pagos.', 'scale'],
            ['«Ya tengo Facebook»', 'Se **complementan**: en Facebook no te encuentra quien busca en Google, y los pedidos no llegan armados.', 'globe'],
            ['«Mi sobrino me la hace»', 'Perfecto si te la mantiene. Nosotros **contestamos a los seis meses**, y la página queda a tu nombre.', 'users'],
            ['Si no sabes algo', '«Lo **checo con el equipo** y te confirmo hoy.» Siempre es mejor que inventar.', 'info'],
          ], 'No discutas: dale la razón en lo que tenga razón y regresa a su problema.'),
          preguntas: [
            { tipo: 'opcion', pregunta: 'El cliente dice «está caro». ¿Qué contestas?', opciones: ['Que estamos abajo del promedio y se puede por etapas o en pagos', 'Que le hago un descuento por mi cuenta', 'Que entonces no le vendo', 'Que la competencia es mala'], correcta: 0, porque: 'Una página sencilla en el mercado va de $6,500 a $25,000. Si aún no le alcanza, la Esencial, etapas o pagos (que autoriza Carlos).', pista: 'Datos, no pleito.' },
            { tipo: 'unir', pregunta: 'Conecta cada objeción con su respuesta', pares: [['«Ya tengo Facebook»', 'Se complementan: Google y pedidos armados'], ['«Mi sobrino me la hace»', 'Nosotros contestamos a los seis meses'], ['«Está caro»', 'Estamos abajo del promedio y hay pagos'], ['«No tengo tiempo»', 'Sólo necesitamos tus fotos, precios y 20 minutos']], porque: 'Cada objeción tiene su respuesta corta. Dales la razón y regresa a su problema.' },
            { tipo: 'escribir', pregunta: 'No sabes contestar algo. ¿Qué dices? Completa: «Lo checo con el ___ y te confirmo hoy»', respuesta: 'equipo', aceptadas: ['el equipo'], porque: 'Siempre es mejor confirmar que inventar.', pista: 'Los que hacemos el trabajo.' },
            { tipo: 'clasificar', pregunta: '¿Se puede prometer o no?', grupos: [{ nombre: 'Sí se dice', items: ['2 rondas de ajustes incluidas', 'La página queda a tu nombre', 'Factura con IVA si la necesitas'] }, { nombre: 'Nunca se promete', items: ['Cambios ilimitados', 'Una fecha sin tener su material', 'Un descuento sin preguntarle a Carlos'] }], porque: 'Casi todas las broncas nacen en la venta. Estas reglas evitan el 90 %.' },
            { tipo: 'hueco', frase: 'Después de las 2 rondas de ajustes, los cambios cuestan $___ la hora.', respuesta: '450', distractores: ['100', '1,000', '250'], porque: 'Se dice ANTES de empezar, no cuando ya pidió el cambio.', pista: 'Igual que el mantenimiento Esencial.' },
          ] },
      ] },
      { titulo: 'Cómo ganas', frase: 'Tu comisión y cómo pasar a tu cliente.', temas: [
        { titulo: 'Tu comisión', resumen: 'Cobras comisión por proyecto desde que el cliente paga el primer 50 %.',
          leccion: L('Así ganas', [
            ['Por proyecto', 'Cobras **comisión** por cada proyecto que cierres. El porcentaje te lo confirma Carlos.', 'coins'],
            ['Un «sí» no es venta', 'Tu comisión cuenta desde que el cliente **paga el primer 50 %**, no desde que dice «sí, va».', 'banknote'],
            ['Cuida a los tuyos', 'Los clientes en **mantenimiento** siguen pagando cada mes: cuídalos.', 'heart'],
            ['Pasa al cliente', 'Al WhatsApp **442 883 3786** con el nombre del negocio, qué quiere y su presupuesto.', 'phone'],
          ], 'Tu tarea esta semana: platica con tres negocios de tu colonia.'),
          preguntas: [
            { tipo: 'opcion', pregunta: '¿Desde cuándo cuenta tu comisión?', opciones: ['Desde que el cliente paga el primer 50 %', 'Desde que dice «sí, va»', 'Desde que le mandas la cotización', 'Desde que le enseñas un trabajo'], correcta: 0, porque: 'Un «sí» todavía no es una venta: cuenta cuando entra el primer pago.', pista: 'Cuando hay dinero de verdad.' },
            { tipo: 'escribir', pregunta: '¿A qué número de WhatsApp le pasas tu cliente? (sólo los números)', respuesta: '4428833786', aceptadas: ['442 883 3786', '442-883-3786'], porque: 'El WhatsApp de la empresa, con el nombre del negocio, qué quiere y su presupuesto.', pista: 'Empieza con 442.' },
            { tipo: 'hueco', frase: 'Al pasar un cliente mandas el nombre del negocio, qué quiere y su ___.', respuesta: 'presupuesto', distractores: ['dirección', 'cumpleaños', 'horario'], porque: 'Con el presupuesto se arma la propuesta que le alcanza.', pista: 'Cuánto puede gastar.' },
            { tipo: 'ordenar', pregunta: 'Ordena lo que pasa desde que encuentras un cliente', pasos: ['Platicas con el negocio', 'Lo pasas al WhatsApp de la empresa', 'El cliente paga el primer 50 %', 'Empieza a contar tu comisión'], porque: 'La comisión cuenta desde el primer pago, no antes.' },
            { tipo: 'opcion', pregunta: '¿Quién te confirma el porcentaje de comisión?', opciones: ['Carlos', 'El cliente', 'Lo decides tú', 'Otro vendedor'], correcta: 0, porque: 'El porcentaje y la fecha de pago los confirma Carlos.', pista: 'El dueño de la empresa.' },
          ] },
      ] },
    ],
  },
];

/* el curso → plan de CARYMO (mismo camino, cátedras, tarjetas, simulacro y examen), con todo su contenido ya escrito */
export function planDeCurso(curso, armarCamino){
  const unidades = armarCamino({ unidades: curso.unidades.map((u) => ({ titulo: u.titulo, frase: u.frase, temas: u.temas.map((t) => ({ titulo: t.titulo, resumen: t.resumen })) })) });
  const contenido = {};
  unidades.forEach((u, i) => u.temas.forEach((t, j) => { const o = curso.unidades[i].temas[j]; contenido[t.id] = { leccion: o.leccion, preguntas: o.preguntas }; }));
  return { id: 'p-' + curso.id, curso: curso.id, academia: true, titulo: curso.titulo, materia: 'Grupo Mazi', color: curso.color, fecha: '', notas: curso.frase,
    creado: Date.now(), unidades, contenido, progreso: {}, forma: 2 };
}
