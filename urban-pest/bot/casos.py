"""Arma urban-pest/bot/casos-borrador.json: el primer borrador de los casos del «reflejo».

  python3 urban-pest/bot/casos.py

Por qué un guion y no el JSON a mano: así cada caso se lee de corrido (pregunta, formas, respuesta)
y el guion revisa lo que importa: 10 formas o más, sin repetidas, sin precios inventados y que toda
variable {así} esté en la lista de lo que falta.

Reglas del borrador (Sylcred, e987):
  · los precios NO se inventan: van {precio_*} y se llenan con el Excel del cliente;
  · lo que no sabemos (garantía, horario, zona, factura…) va como {variable} y está en FALTA;
  · «dueno: true» = el bot contesta y además le avisa al dueño;
  · «datos» = lo que el bot tiene que pedirle al cliente para seguir.
Lo único que sí se afirma es lo que dijo Carlos del servicio: mueven todo, sacan los utensilios al
sol y fumigan el interior completo; atienden casas, negocios e industria; están en Querétaro.
"""
import json, re, unicodedata
from pathlib import Path

C = []
def caso(id, tema, formas, respuesta, datos=(), dueno=False, nota=''):
    C.append({'id': id, 'tema': tema, 'formas': formas, 'respuesta': respuesta, 'datos': list(datos), 'dueno': dueno, **({'nota': nota} if nota else {})})

# ── saludo y lo básico ─────────────────────────────────────────────────────────
caso('saludo', 'saludo', [
  'hola', 'buenas', 'buenas tardes', 'buenos días', 'buenas noches', 'qué tal', 'hola buen día',
  'holaa', 'buen dia', 'hola, información', 'hola me pueden dar informes', 'informes', 'info porfa',
  'hola quisiera información', 'que tal buenas tardes'],
  '¡Hola! Gracias por escribir a {nombre_empresa}. ¿Qué plaga tienes y en dónde es: casa, negocio o industria? Con eso te digo cómo trabajamos y te paso un precio.')

caso('que-hacen', 'servicios', [
  '¿qué servicios tienen?', 'qué hacen', 'a qué se dedican', '¿fumigan?', 'son fumigadores?',
  'qué tipo de fumigación hacen', 'qué ofrecen', 'me pasas tus servicios', 'catálogo de servicios',
  'qué incluye el servicio', 'cómo es su servicio', 'en qué consiste la fumigación'],
  'Fumigamos casas, negocios e industria (alimentos, hospitales, alimento para mascotas). Trabajamos a detalle: movemos todo, sacamos los utensilios al sol y fumigamos el interior completo, no nada más las orillas. ¿Para qué lugar lo necesitas?')

caso('diferencia', 'servicios', [
  '¿por qué son más caros?', 'en otro lado me cobran menos', 'por qué cuesta eso', 'qué los hace diferentes',
  'por qué con ustedes y no con otros', 'está caro', 'muy caro no?', 'me dieron más barato en otro lado',
  'qué tienen de especial', 'por qué vale la pena', 'hay algo más barato?', 'otros cobran la mitad'],
  'Porque no medio fumigamos: movemos muebles, sacamos los utensilios al sol y fumigamos el interior completo. Así la plaga no regresa a la semana. Si quieres, te explico qué incluye para tu caso y lo comparas con calma.',
  nota='No bajar el precio en el reflejo. Si insiste, se le avisa al dueño.')

# ── precio y cotización ───────────────────────────────────────────────────────
caso('precio-casa', 'precio', [
  '¿cuánto cuesta fumigar una casa?', 'precio de fumigación', 'cuánto cobran', 'cuanto sale', 'precio?',
  'costo de fumigar mi casa', 'cuánto me cobras por fumigar', 'en cuánto sale una fumigación',
  'qué precio tiene', 'cuanto es', 'me das precio', 'presupuesto para casa', 'cuánto por una casa de 2 pisos',
  'cuánto cuesta para cucarachas en casa'],
  'Una casa con plaga sencilla está desde {precio_casa_desde}. El precio final depende de la plaga, los metros y la distancia; un técnico lo confirma al ver el lugar. ¿Qué plaga es, cuántos metros o recámaras tiene y en qué colonia está?',
  datos=['plaga', 'metros_o_recamaras', 'colonia'])

caso('precio-negocio', 'precio', [
  'cuánto cobran a un negocio', 'precio para un local', 'fumigación para oficina cuánto', 'tengo una tienda, cuánto',
  'precio para consultorio', 'cuánto por fumigar una bodega', 'precio fumigación comercial', 'cotización para mi negocio',
  'es para un local comercial', 'fumigan oficinas? precio', 'cuanto para una escuela', 'precio para un gimnasio'],
  'Para negocio el precio sale de la plaga, los metros cuadrados y la distancia. Te paso un «desde» ahora y la cotización en PDF; el técnico confirma el precio final en la visita. ¿Qué giro es, cuántos metros tiene y en qué colonia o municipio está?',
  datos=['giro', 'metros', 'ubicacion', 'plaga'])

caso('precio-industria', 'industria', [
  'fumigan industria?', 'necesito fumigación para una planta', 'somos una empresa de alimentos', 'servicio para hospital',
  'fumigación industrial', 'tenemos una nave industrial', 'control de plagas para fábrica', 'somos planta de alimento para mascotas',
  'necesitamos un proveedor de control de plagas', 'servicio por contrato para empresa', 'programa de control de plagas',
  'cotización para industria alimentaria', 'atienden empresas?'],
  'Sí, atendemos industria: alimentos, hospitales y alimento para mascotas. En industria siempre vamos a medir antes de cotizar, para darte un precio exacto y no un aproximado. ¿Me pasas el nombre de la empresa, la ubicación, los metros aproximados y con quién agendo la visita?',
  datos=['empresa', 'ubicacion', 'metros', 'contacto'], dueno=True,
  nota='Cliente que el dueño quiere. Siempre se le avisa al momento.')

caso('cotizacion-pdf', 'precio', [
  'me mandas la cotización', 'mándame cotización por escrito', 'necesito cotización formal', 'me la pasas en pdf',
  'cotización con membrete', 'la necesito para mi jefe', 'puedes mandar presupuesto', 'me envías el presupuesto',
  'cotización por correo', 'necesito cotizar para compras', 'me hace una cotización', 'mandame el presupuesto por fa'],
  'Claro. Con estos datos te mando la cotización en PDF: nombre o empresa, dirección del lugar, plaga, metros cuadrados y, si la necesitas, a qué correo. El precio final lo confirma el técnico al ver el lugar.',
  datos=['nombre_o_empresa', 'direccion', 'plaga', 'metros', 'correo'])

caso('precio-exacto', 'precio', [
  'pero cuánto exactamente', 'dame el precio exacto', 'no quiero aproximado', 'cuánto es en total',
  'sin visita cuánto sería', 'no me puedes dar precio exacto?', 'por qué no me das el precio ya', 'necesito saber el total',
  'pero ya con todo cuánto', 'el precio final cuál es', 'y si no hay sorpresas cuánto'],
  'Te doy un «desde» porque cada lugar es distinto: no es lo mismo una casa de 20 m² que una con cuatro patios y tres perros. En casa, el técnico te confirma el precio al llegar y antes de empezar; en negocio o industria vamos a medir primero y te queda por escrito.',
  datos=['plaga', 'metros_o_recamaras', 'colonia'])

caso('visita-medir', 'precio', [
  'pueden venir a ver', 'vienen a revisar sin compromiso?', 'la visita cuesta?', 'cobran la visita',
  'pueden venir a medir', 'quiero que vengan a checar', 'inspección', 'hacen diagnóstico', 'vienen a cotizar',
  'pueden pasar a ver primero', 'quiero una revisión antes'],
  'En negocio e industria sí vamos a medir antes de cotizar. {politica_visita} ¿Qué día y a qué hora te queda bien, y cuál es la dirección?',
  datos=['direccion', 'dia_hora'], dueno=True)

caso('formas-pago', 'pago', [
  'cómo se paga', 'aceptan tarjeta?', 'puedo pagar con transferencia', 'aceptan efectivo', 'formas de pago',
  'se paga antes o después', 'hay que dar anticipo?', 'pagan con tarjeta', 'meses sin intereses?', 'pago al terminar?',
  'cómo les pago', 'aceptan depósito'],
  '{formas_pago}')

caso('factura', 'pago', [
  'dan factura?', 'facturan?', 'necesito factura', 'me pueden facturar', 'es con factura?', 'el precio incluye iva?',
  'necesito CFDI', 'es más iva?', 'me das factura para la empresa', 'facturan a persona moral', 'precio con iva o sin iva'],
  '{factura}')

caso('descuento', 'precio', [
  'hay descuento?', 'me haces descuento', 'tienen promoción', 'si son dos casas me dejas más barato?',
  'precio especial', 'promo', 'descuento por contrato', 'si los contrato cada mes sale menos?', 'no me lo dejas en menos?',
  'precio de amigo', 'hay paquetes'],
  'Eso lo ve directamente el encargado; ya le pasé tu mensaje. Mientras, ¿me dices qué plaga es y dónde, para que tenga todo a la mano?',
  datos=['plaga', 'ubicacion'], dueno=True)

# ── plagas ─────────────────────────────────────────────────────────────────────
caso('plagas-que', 'plagas', [
  'qué plagas eliminan', 'qué bichos fumigan', 'contra qué fumigan', 'qué plagas atienden', 'fumigan de todo?',
  'qué tipo de plagas', 'todas las plagas?', 'fumigan cualquier insecto', 'qué controlan', 'qué animales eliminan',
  'para qué plagas sirve'],
  '{lista_plagas} ¿Cuál es la que tienes?')

for pid, nombre, formas in [
  ('cucarachas', 'cucarachas', ['tengo cucarachas', 'cucarachas en la cocina', 'salen cucarachas en el baño', 'fumigan cucarachas?',
    'plaga de cucarachas', 'cucarachas alemanas', 'cucarachas chiquitas', 'me salen cucarachas en la noche', 'cucas', 'hay cucarachas en el local', 'cucarachas en el drenaje']),
  ('chinches', 'chinches', ['tengo chinches', 'chinches en la cama', 'me pican en la noche', 'chinches en el colchón', 'fumigan chinches?',
    'creo que son chinches', 'plaga de chinches', 'picaduras en la cama', 'chinche de cama', 'manchitas en el colchón', 'chinches en el sillón']),
  ('termitas', 'termitas', ['tengo termitas', 'termitas en la madera', 'se están comiendo los muebles', 'polilla en la madera',
    'fumigan termitas?', 'comején', 'termitas en el closet', 'aserrín en los muebles', 'termita de madera seca', 'tratamiento para termitas', 'la puerta tiene termitas']),
  ('ratas', 'roedores', ['tengo ratas', 'ratones en la casa', 'hay un ratón', 'control de roedores', 'fumigan ratas?', 'veo excremento de rata',
    'ratas en la bodega', 'se oyen ratones en el techo', 'ratones en la cocina', 'desratización', 'plaga de ratas']),
  ('alacranes', 'alacranes', ['hay alacranes', 'me salió un alacrán', 'fumigan alacranes?', 'alacranes en el patio', 'escorpiones',
    'picó un alacrán', 'alacranes en la casa', 'temporada de alacranes', 'tratamiento contra alacranes', 'salen alacranes en la noche', 'alacrán en el baño']),
  ('hormigas', 'hormigas', ['tengo hormigas', 'hormigas en la cocina', 'hormigas en el jardín', 'fumigan hormigas?', 'hormiguero',
    'hormigas chiquitas', 'hormigas rojas', 'hormigas que pican', 'plaga de hormigas', 'hormigas en la pared', 'hormigas por todos lados']),
  ('aranas', 'arañas', ['hay muchas arañas', 'arañas en la casa', 'araña violinista', 'fumigan arañas?', 'telarañas por todos lados',
    'viuda negra', 'arañas en el jardín', 'me picó una araña', 'arañas en el techo', 'plaga de arañas', 'arañitas']),
  ('pulgas', 'pulgas y garrapatas', ['tengo pulgas', 'garrapatas', 'pulgas en el perro y en la casa', 'fumigan pulgas?', 'garrapatas en el patio',
    'plaga de pulgas', 'nos pican pulgas', 'pulgas en la alfombra', 'garrapatas en las paredes', 'mi perro trae pulgas', 'chaquistes']),
  ('moscas-mosquitos', 'moscas y mosquitos', ['hay muchas moscas', 'mosquitos', 'zancudos', 'moscas en el negocio', 'fumigan mosquitos?',
    'moscas de la fruta', 'mosquitos en la noche', 'nebulización', 'plaga de moscas', 'moscos', 'mosquitos del dengue']),
]:
  caso('plaga-' + pid, 'plagas', formas,
    f'Sí atendemos {nombre}. ' + '{tratamiento_' + pid.replace('-', '_') + '} ¿Es en casa o en negocio, cuántos metros o recámaras tiene y en qué colonia? Con eso te paso el precio.',
    datos=['tipo_lugar', 'metros_o_recamaras', 'colonia'])

caso('plaga-abejas', 'plagas', [
  'tengo un panal', 'hay abejas', 'avispas en el techo', 'panal de avispas', 'quitan panales?', 'enjambre de abejas',
  'abejas en la pared', 'avispero', 'matan abejas?', 'abejas en el árbol', 'colmena en la casa'],
  '{abejas}', datos=['ubicacion'], dueno=True,
  nota='Las abejas normalmente se reubican, no se fumigan. Confirmar con el dueño qué hace él.')

caso('plaga-palomas', 'plagas', [
  'palomas en el techo', 'quitan palomas?', 'murciélagos', 'tengo murciélagos', 'control de aves', 'palomas en la bodega',
  'tlacuache', 'zarigüeya', 'víboras', 'serpiente en el patio', 'animal en el techo'],
  'Eso no es fumigación de insectos; lo ve directo el encargado y ya le pasé tu mensaje. ¿Me dices qué animal es y dónde está?',
  datos=['animal', 'ubicacion'], dueno=True)

caso('no-se-que-plaga', 'plagas', [
  'no sé qué bicho es', 'te mando foto del bicho', 'qué es esto?', 'encontré este insecto', 'me puedes decir qué plaga es',
  'no sé qué es pero pica', 'son unos bichitos negros', 'unos gusanitos', 'qué animal es este', 'te paso foto', 'identificas este bicho?'],
  'Mándame una foto, de cerca y con buena luz, y dime dónde lo encontraste. Se la paso al técnico para identificarlo y decirte qué tratamiento lleva.',
  datos=['foto', 'donde'], dueno=True)

# ── seguridad y preparación ───────────────────────────────────────────────────
caso('ninos-mascotas', 'seguridad', [
  'es seguro con niños?', 'tengo bebé', 'tengo perros, les hace daño?', 'y los gatos?', 'es tóxico?', 'es peligroso el químico?',
  'tengo pájaros', 'tengo peces', 'es seguro para mascotas', 'estoy embarazada, hay problema?', 'qué químicos usan',
  'el producto es veneno?', 'mi hijo tiene asma'],
  'Usamos {productos} y te damos indicaciones claras: cuánto tiempo salir, cuándo pueden regresar los niños y las mascotas, y qué tapar (peceras, jaulas, trastes de comida). Si hay bebé, embarazo o alguien con asma, dínoslo antes para tomar precauciones extra.',
  dueno=False, nota='Si mencionan embarazo o asma, se le avisa al dueño.')

caso('salir-casa', 'preparacion', [
  'cuánto tiempo hay que salir', 'tenemos que salirnos?', 'cuántas horas fuera', 'a qué hora podemos regresar',
  'hay que salir de la casa?', 'puedo quedarme adentro?', 'cuánto tarda en secar', 'cuánto dura el olor',
  'cuándo puedo entrar', 'se puede dormir ahí esa noche?', 'tiempo de espera para entrar'],
  'Hay que salir {horas_fuera} con niños y mascotas. Al regresar, abre puertas y ventanas unos minutos para ventilar. El técnico te dice la hora exacta según el producto que use.')

caso('preparar', 'preparacion', [
  'qué tengo que hacer antes', 'cómo preparo la casa', 'tengo que mover los muebles?', 'guardo la comida?', 'qué hago con los trastes',
  'hay que vaciar la alacena?', 'preparación para fumigar', 'qué debo tener listo', 'recomendaciones antes de la fumigación',
  'tengo que limpiar antes?', 'qué hago con la ropa'],
  'Nosotros movemos los muebles y sacamos los utensilios al sol, así que no tienes que cargar nada. Sólo guarda la comida en recipientes cerrados o en el refri, y ten a la mano a las mascotas para salir. {preparacion_extra}')

caso('despues', 'preparacion', [
  'qué hago después de fumigar', 'puedo trapear?', 'cuándo puedo limpiar', 'es normal que salgan más cucarachas?',
  'siguen saliendo bichos', 'salen muertas, es normal?', 'cuándo lavo los trastes', 'puedo barrer', 'qué cuidados después',
  'después de fumigar salieron más', 'cuánto tarda en hacer efecto'],
  'Es normal ver plaga muerta o desorientada los primeros días: está saliendo de donde se escondía. {cuidados_despues} Si después de {dias_efecto} días sigues viendo plaga viva, escríbenos.')

caso('cuanto-tarda', 'servicio', [
  'cuánto tarda la fumigación', 'cuánto se tardan', 'cuántas horas es el servicio', 'cuánto dura', 'es rápido?',
  'en cuánto acaban', 'cuánto tiempo están en la casa', 'tarda mucho?', 'se tardan todo el día?', 'cuánto tiempo toma'],
  'Depende del tamaño y de la plaga. Como movemos todo y fumigamos el interior completo, tardamos un poco más que una fumigación rápida. {duracion_servicio}')

# ── garantía y frecuencia ─────────────────────────────────────────────────────
caso('garantia', 'garantia', [
  'tiene garantía?', 'dan garantía', 'y si regresan las cucarachas?', 'si no funciona qué pasa', 'cuánto dura la garantía',
  'regresan si sigue la plaga?', 'repasan gratis?', 'qué pasa si siguen saliendo', 'garantizado?', 'si vuelven los bichos',
  'tienen garantía por escrito'],
  '{garantia}')

caso('cada-cuando', 'frecuencia', [
  'cada cuánto hay que fumigar', 'cuánto dura el efecto', 'cada cuándo se recomienda', 'cuánto tiempo protege',
  'con una vez basta?', 'hay que repetir?', 'cada cuántos meses', 'fumigan cada mes?', 'necesito varias aplicaciones?',
  'cuánto me dura limpia la casa', 'es de una sola vez?'],
  '{frecuencia} En negocio e industria conviene un programa con visitas fijas; si te interesa, te lo cotizo.')

caso('contrato', 'frecuencia', [
  'tienen planes mensuales', 'servicio por contrato', 'iguala mensual', 'mantenimiento cada mes', 'póliza de fumigación',
  'contrato anual', 'programa preventivo', 'visitas periódicas', 'servicio recurrente', 'quiero que vengan cada mes', 'paquete anual'],
  'Sí. Para negocio e industria armamos un programa con visitas periódicas y reportes. Lo ve el encargado para ajustarlo a tu lugar; ya le avisé. ¿Qué giro es y dónde está?',
  datos=['giro', 'ubicacion'], dueno=True)

# ── agenda, zona, horario ─────────────────────────────────────────────────────
caso('agendar', 'agenda', [
  'quiero agendar', 'cuándo pueden venir', 'tienen espacio mañana?', 'pueden hoy?', 'quiero la fumigación',
  'aparta una fecha', 'para el sábado se puede?', 'quiero contratar', 'cuándo hay lugar', 'agéndame', 'va, cuándo vienen',
  'me interesa, qué día'],
  'Va. Para apartar: nombre, dirección, plaga, qué día y a qué hora te queda mejor. Te confirmo el horario en un momento.',
  datos=['nombre', 'direccion', 'plaga', 'dia_hora'], dueno=True)

caso('urgente', 'agenda', [
  'es urgente', 'pueden venir ya?', 'emergencia', 'hoy mismo', 'necesito que vengan ahorita', 'es urgente por favor',
  'cuánto tardan en llegar', 'servicio urgente', 'tengo una inspección mañana', 'me van a clausurar', 'lo antes posible'],
  'Entendido, le aviso ahorita al encargado para ver si hay un técnico disponible hoy. ¿Me pasas la dirección y qué plaga es?',
  datos=['direccion', 'plaga'], dueno=True, nota='Prioridad alta: se le avisa al dueño, y si es negocio con inspección, por llamada.')

caso('horario', 'agenda', [
  'qué horario tienen', 'a qué hora abren', 'trabajan en domingo?', 'hasta qué hora atienden', 'trabajan sábados?',
  'abren hoy?', 'días de servicio', 'trabajan en la noche?', 'pueden en la tarde?', 'horario de atención', 'trabajan festivos?'],
  '{horario}')

caso('zona', 'agenda', [
  'hasta dónde llegan', 'atienden en Corregidora?', 'van a El Marqués?', 'llegan a San Juan del Río?', 'qué zonas cubren',
  'están en Querétaro?', 'cobran por venir lejos?', 'van fuera de la ciudad', 'dónde están ubicados', 'atienden Juriquilla?',
  'van a Celaya?', 'cuál es su zona'],
  'Estamos en Querétaro. {zona} Si estás más lejos, también vamos, y el traslado se suma al precio. ¿En qué colonia o municipio estás?',
  datos=['ubicacion'])

caso('reagendar', 'agenda', [
  'quiero cambiar la fecha', 'no voy a poder ese día', 'podemos mover la cita', 'reagendar', 'cancelo la cita',
  'se me cruzó algo', 'pueden otro día', 'quiero cancelar', 'cambio de horario', 'la pasamos para la otra semana'],
  'Sin problema. ¿Qué día y hora te quedan mejor? Le aviso al encargado para moverla.',
  datos=['dia_hora'], dueno=True)

caso('confirmar-cita', 'agenda', [
  'sigue en pie la cita?', 'a qué hora llegan', 'ya vienen?', 'ya vienen en camino?', 'confirmo cita', 'mañana vienen verdad',
  'cuánto les falta', 'quién viene', 'están por llegar?', 'no han llegado'],
  'Déjame confirmarlo con el técnico y te digo en un momento.', dueno=True)

# ── confianza y papeles ───────────────────────────────────────────────────────
caso('licencia', 'confianza', [
  'tienen licencia sanitaria?', 'están certificados?', 'tienen permiso de Cofepris?', 'son empresa registrada?',
  'dan constancia de fumigación', 'necesito certificado de fumigación', 'me dan comprobante para protección civil',
  'tienen RFC', 'documentos para auditoría', 'dan bitácora del servicio', 'licencia para fumigar'],
  '{licencias} Al terminar te damos {constancia}.',
  nota='Carlos dijo que el dueño «ya puede certificarse para atender empresas»: confirmar qué tiene hoy antes de afirmar nada.')

caso('experiencia', 'confianza', [
  'cuánto tiempo tienen', 'desde cuándo trabajan', 'tienen experiencia?', 'tienen referencias', 'tienen reseñas',
  'quién los recomienda', 'son confiables?', 'a quién le han trabajado', 'tienen página?', 'dónde los veo', 'tienen Facebook'],
  'Llevamos {anos} años en Querétaro; empezamos de puerta en puerta y seguimos por recomendación. Aquí puedes ver más: {pagina_web}')

caso('productos', 'seguridad', [
  'qué producto usan', 'qué químico es', 'es orgánico?', 'es ecológico?', 'huele feo?', 'deja olor?',
  'mancha las paredes?', 'mancha los muebles?', 'es en gel o en spray', 'usan gas?', 'es de marca'],
  '{productos} Te decimos qué se aplicó y las indicaciones al terminar.')

# ── personas que no vienen a contratar ────────────────────────────────────────
caso('empleo', 'otros', [
  'tienen vacantes?', 'buscan trabajadores', 'quiero trabajar con ustedes', 'contratan?', 'tienen empleo',
  'busco chamba', 'necesitan ayudante?', 'vacante de técnico', 'dónde mando mi CV', 'están contratando'],
  'Gracias por el interés. Le paso tu mensaje al encargado; si hay lugar, te escribe él.', dueno=True)

caso('proveedor', 'otros', [
  'soy proveedor de químicos', 'les ofrezco productos', 'vendo equipo de fumigación', 'quiero ofrecerles un servicio',
  'les interesa publicidad?', 'distribuidor de insecticidas', 'tengo una propuesta', 'le vendo uniformes', 'proveedor', 'cotización de producto'],
  'Gracias. Le dejo tu mensaje al encargado; si le interesa, te contacta.', dueno=True,
  nota='No contesta más que esto. No es cliente.')

caso('queja', 'otros', [
  'estoy molesto', 'no quedó bien', 'el servicio fue malo', 'quiero hablar con el dueño', 'me dejaron sucio',
  'no llegaron', 'queja', 'me quedaron mal', 'quiero mi dinero', 'el técnico fue grosero', 'no funcionó nada'],
  'Lo siento mucho. Ya le pasé tu mensaje al encargado para que te contacte él directamente. ¿Me dices qué pasó y la fecha del servicio?',
  datos=['que_paso', 'fecha'], dueno=True, nota='Nunca discute. Siempre al dueño, y por llamada.')

caso('humano', 'otros', [
  'quiero hablar con una persona', 'eres un bot?', 'me comunicas con alguien', 'pásame al encargado', 'hablar con el dueño',
  'eres robot?', 'quiero que me llamen', 'me puedes llamar', 'número para llamar', 'atiéndeme tú no el bot', 'hay alguien ahí?'],
  'Soy el asistente de {nombre_empresa} y te ayudo con lo que pueda. Si prefieres hablar con el encargado, ya le avisé y te contacta en cuanto pueda. ¿A qué número y en qué horario te llama?',
  datos=['telefono', 'horario_llamada'], dueno=True)

caso('gracias', 'cierre', [
  'gracias', 'muchas gracias', 'ok gracias', 'va', 'perfecto', 'sale', 'ok', 'de acuerdo', 'gracias, lo pienso', 'luego te aviso',
  'lo consulto y te digo', 'gracias por la info', 'excelente'],
  '¡Con gusto! Aquí estamos cuando lo necesites.')

# ── revisión y salida ──────────────────────────────────────────────────────────
FALTA = {
  'nombre_empresa': 'Nombre comercial exacto (¿«Urban Pest»?)',
  'precio_casa_desde': 'Precio «desde» de una casa con plaga sencilla (Carlos dijo unos $500; confirmar con el Excel)',
  'politica_visita': 'Si la visita para medir cuesta o es gratis, y si se descuenta del servicio',
  'formas_pago': 'Efectivo, transferencia, tarjeta; si hay anticipo',
  'factura': 'Si factura, a quién, y si los precios llevan IVA',
  'lista_plagas': 'Qué plagas atiende y cuáles NO',
  'tratamiento_cucarachas': 'Cómo trata cada plaga (una o dos líneas, sin tecnicismos)',
  'tratamiento_chinches': '',
  'tratamiento_termitas': '',
  'tratamiento_ratas': '',
  'tratamiento_alacranes': '',
  'tratamiento_hormigas': '',
  'tratamiento_aranas': '',
  'tratamiento_pulgas': '',
  'tratamiento_moscas_mosquitos': '',
  'abejas': 'Qué hace con abejas y avispas (¿reubica, retira, no atiende?)',
  'productos': 'Qué productos usa y si tienen registro (Cofepris)',
  'horas_fuera': 'Cuánto tiempo hay que salir del lugar',
  'preparacion_extra': 'Algo más que el cliente deba preparar',
  'cuidados_despues': 'Qué no hacer después (trapear, etc.) y por cuántos días',
  'dias_efecto': 'A los cuántos días ya no debería verse plaga viva',
  'duracion_servicio': 'Cuánto tarda el servicio, por tamaño',
  'garantia': 'Si hay garantía, cuánto dura y qué cubre',
  'frecuencia': 'Cada cuánto recomienda fumigar una casa',
  'horario': 'Días y horas de servicio y de atención',
  'zona': 'Zona que cubre sin cobro extra (radio desde la bodega)',
  'licencias': 'Licencias y certificaciones que tiene HOY',
  'constancia': 'Qué documento entrega al terminar',
  'anos': 'Años que lleva trabajando',
  'pagina_web': 'Dirección de la página (la nueva, cuando esté)',
}
UMBRAL = 10

def plano(s):
    return re.sub(r'[^a-z0-9 ]', '', unicodedata.normalize('NFD', s.lower()).encode('ascii', 'ignore').decode()).strip()

def revisar():
    errores, ids = [], set()
    for c in C:
        if c['id'] in ids: errores.append(f"id repetido: {c['id']}")
        ids.add(c['id'])
        if len(c['formas']) < UMBRAL: errores.append(f"{c['id']}: sólo {len(c['formas'])} formas")
        vistas = {}
        for f in c['formas']:
            k = plano(f)
            if k in vistas: errores.append(f"{c['id']}: forma repetida «{f}»")
            vistas[k] = 1
        if re.search(r'\$\s?\d', c['respuesta']): errores.append(f"{c['id']}: trae un precio escrito a mano")
        for v in re.findall(r'\{(\w+)\}', c['respuesta']):
            if v not in FALTA: errores.append(f"{c['id']}: la variable {{{v}}} no está en FALTA")
    # una misma forma no puede caer en dos casos
    duenos = {}
    for c in C:
        for f in c['formas']:
            k = plano(f)
            if k in duenos and duenos[k] != c['id']: errores.append(f"«{f}» está en {duenos[k]} y en {c['id']}")
            duenos[k] = c['id']
    return errores

if __name__ == '__main__':
    e = revisar()
    if e:
        print('\n'.join(e)); raise SystemExit(1)
    usadas = {v for c in C for v in re.findall(r'\{(\w+)\}', c['respuesta'])}
    salida = {
        'que_es': 'Primer borrador de los casos del reflejo del bot de Urban Pest. Lo arma urban-pest/bot/casos.py; se edita allá, no aquí.',
        'como_leerlo': {
            'formas': 'Maneras reales de preguntarlo, como llegan por WhatsApp (con faltas y sin acentos también).',
            'respuesta': 'Lo que contesta el bot. Lo que va entre llaves {así} se llena con los datos del cliente (ver «falta»).',
            'datos': 'Lo que el bot le pide a la persona para seguir.',
            'dueno': 'true = además de contestar, se le avisa al dueño.',
        },
        'casos': C,
        'falta': {k: v or f'Cómo trata {k[11:].replace("_", " y ")} (una o dos líneas, sin tecnicismos)' for k, v in FALTA.items() if k in usadas},
        'cuenta': {'casos': len(C), 'formas': sum(len(c['formas']) for c in C), 'al_dueno': sum(c['dueno'] for c in C)},
    }
    p = Path(__file__).with_name('casos-borrador.json')
    p.write_text(json.dumps(salida, ensure_ascii=False, indent=1) + '\n')
    print(f"{len(C)} casos · {salida['cuenta']['formas']} formas · {salida['cuenta']['al_dueno']} avisan al dueño → {p.name}")
