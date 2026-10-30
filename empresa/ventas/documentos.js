// Los dos documentos de la conferencia: la guía del vendedor (para repartir) y la chuleta de Carlos
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, LevelFormat } = require('docx');
const DIR = __dirname + '/';
const MORADO = '7E1FD0', VINO = '7E1735', GRIS = '555060';

const p = (t, o = {}) => new Paragraph({ spacing: { after: 120 }, ...o, children: (Array.isArray(t) ? t : [t]).map(x => typeof x === 'string' ? new TextRun({ text: x, font: 'Calibri', size: 22 }) : x) });
const b = (t) => new TextRun({ text: t, bold: true, font: 'Calibri', size: 22 });
const n = (t) => new TextRun({ text: t, font: 'Calibri', size: 22 });
const i = (t) => new TextRun({ text: t, italics: true, font: 'Calibri', size: 22, color: GRIS });
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 120 }, children: [new TextRun({ text: t, bold: true, font: 'Arial', size: 30, color: VINO })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 }, children: [new TextRun({ text: t, bold: true, font: 'Arial', size: 24, color: MORADO })] });
const li = (partes) => new Paragraph({ numbering: { reference: 'puntos', level: 0 }, spacing: { after: 80 }, children: (Array.isArray(partes) ? partes : [n(partes)]) });
const titulo = (t, sub) => [new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'GRUPO MAZI', bold: true, font: 'Arial', size: 20, color: MORADO, characterSpacing: 60 })] }),
  new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: t, bold: true, font: 'Arial', size: 44 })] }),
  new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: sub, font: 'Calibri', size: 24, color: GRIS })] })];
const borde = { style: BorderStyle.SINGLE, size: 4, color: 'D9D0E6' };
function tabla(filas, anchos){ const total = anchos.reduce((a, x) => a + x, 0);
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: anchos, rows: filas.map((f, k) => new TableRow({ children: f.map((c, j) => new TableCell({ width: { size: anchos[j], type: WidthType.DXA }, borders: { top: borde, bottom: borde, left: borde, right: borde },
    shading: k === 0 ? { type: ShadingType.CLEAR, color: 'auto', fill: 'EFE6FA' } : undefined, margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text: c, font: 'Calibri', size: 20, bold: k === 0 || j === 0 })] })] })) })) }); }
const numeracion = { config: [{ reference: 'puntos', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 260 } } } }] }] };
const pagina = { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, bottom: 1080, left: 1200, right: 1200 } } };

// ── 1 · Guía del vendedor ──
const guia = new Document({ numbering: numeracion, sections: [{ properties: pagina, children: [
  ...titulo('Guía del vendedor', 'Lo que necesitas para salir a vender esta semana. Léela una vez y tenla a la mano.'),
  h1('1. Qué vendes de verdad'),
  p('No vendes «una página». Vendes que al negocio le lleguen más clientes y que deje de contestar lo mismo veinte veces al día por WhatsApp. Y vendes que alguien le conteste después de entregar: eso es lo que nos distingue.'),
  h2('Los productos que más se cierran'),
  tabla([['Producto', 'Precio', 'Para quién'],
    ['Página Esencial', '$2,000 · 3 a 5 días', 'El que no tiene nada en internet. Es la puerta de entrada.'],
    ['Página Completa', '$6,500 · 1 a 2 semanas', 'El que ya vende por WhatsApp: le llegan pedidos y citas armados. Trae 2 videos de regalo. Es la que más conviene.'],
    ['Página A la medida', 'desde $9,000', 'El que quiere algo que su competencia no tiene: 3D, carrito, reservas, panel.'],
    ['Mantenimiento', '$450 o $650 al mes', 'Todos. Los primeros 3 meses ya van incluidos en las páginas.'],
    ['Video para redes', '2 videos por $1,200', 'Cualquier negocio con Instagram o TikTok.'],
    ['Menú digital con QR', '$900', 'Restaurantes y cafeterías.']], [2600, 2400, 4800]),
  p(''),
  p([b('Lo que no es obvio: '), n('el mantenimiento es lo que más paga a la larga. Diez clientes en mantenimiento son entre $4,500 y $6,500 al mes que llegan solos. Nunca cierres una página sin explicarlo.')]),
  h1('2. A quién buscar'),
  li([b('Negocios con cara al público en Querétaro: '), n('restaurantes, barberías, cafeterías, ropa, consultorios, escuelas, talleres.')]),
  li([b('La señal de compra: '), n('contestan pedidos a mano, tienen el menú en una foto borrosa, o te dicen «sí tengo Facebook» con cara de que no les sirve.')]),
  li([b('Lo que enseñas: '), n('Smiley\'s, District Roll y Fadori, abiertos en tu celular. Que el cliente los toque. Verlo funcionar vende más que explicarlo.')]),
  h1('3. Cómo se cierra, en cinco pasos'),
  li([b('Pregunta. '), n('«¿Cómo te llegan los clientes hoy? ¿Qué es lo que más tiempo te quita?» Escucha más de lo que hablas.')]),
  li([b('Enseña. '), n('Un trabajo nuestro parecido a su negocio, en tu celular.')]),
  li([b('Propón UN paquete. '), n('El que resuelve lo que te dijo. Si le sueltas la lista completa, se confunde y lo pospone.')]),
  li([b('Cierra. '), n('50 % para empezar y 50 % al entregar. Pide sus fotos, precios y textos ese mismo día: la fecha corre desde que los tenemos.')]),
  li([b('Acompaña. '), n('Avísale cada avance. A los 3 meses, cuando se acaba el mantenimiento incluido, ofrécele el plan.')]),
  h1('4. Lo que nunca se promete'),
  li([b('Fechas sin material. '), n('Toda fecha es un estimado y corre desde que tenemos su material.')]),
  li([b('Cambios infinitos. '), n('Van 2 rondas de ajustes chicos o medianos. Pasando eso, o si cambia la idea, son $450 la hora. Se dice ANTES de empezar, no cuando ya pidió el cambio.')]),
  li([b('Descuentos por tu cuenta. '), n('Si hay que mover un precio, se le pregunta a Carlos.')]),
  li([b('Clientes que no son. '), n('Sólo se enseña lo entregado. Presumir clientes falsos es lo que más rápido quema a una empresa nueva.')]),
  li([b('Visitas fuera de Querétaro. '), n('Sólo en casos especiales, y el cliente paga los viáticos.')]),
  h1('5. Preguntas frecuentes'),
  h2('«Está caro.»'),
  p('Estamos abajo del promedio: una página sencilla en el mercado va de $6,500 a $25,000. Si aun así no le alcanza, se arma por etapas (la primera ya funciona) o en pagos. Los pagos los autoriza Carlos caso por caso.'),
  h2('«Ya tengo Facebook.»'),
  p('Se complementan. En Facebook no te encuentra quien te busca en Google, y los pedidos no te llegan armados. La página manda a la gente a tu WhatsApp con lo que quiere ya escrito.'),
  h2('«Mi sobrino me la hace» o «hay páginas gratis».'),
  p('Está bien si alguien se la va a mantener. La diferencia es que nosotros contestamos a los seis meses, y la página y el dominio quedan a su nombre.'),
  h2('«¿Y si quiero cambiar algo después?»'),
  p('Con el mantenimiento: cambios chicos (precios, fotos, horarios, promociones) entran en el plan. Regla práctica: si toma menos de 20 minutos y no cambia cómo funciona la página, es chico. Lo demás se cotiza con 15 % de descuento.'),
  h2('«¿Me dan factura?»'),
  p('Sí. Si la necesita, se agrega el IVA.'),
  h2('«¿Cuándo empiezan?»'),
  p('En cuanto paga el primer 50 % y nos manda su material. Mientras más rápido lo mande, más rápido queda.'),
  h2('No sabes algo.'),
  p('«Lo checo con el equipo y te confirmo hoy.» Siempre es mejor que inventar.'),
  h1('6. Cómo ganas'),
  p('Cobras comisión por cada proyecto que cierres. Cuenta desde que el cliente paga el primer 50 %: un «sí, va» todavía no es una venta. El porcentaje y la fecha de pago te los confirma Carlos.'),
  p([b('Contacto: '), n('WhatsApp 442 883 3786 · grupomazi.oficial@gmail.com')])
] }] });

// ── 2 · La chuleta de Carlos ──
const chuleta = new Document({ numbering: numeracion, sections: [{ properties: pagina, children: [
  ...titulo('Tu chuleta para la conferencia', 'Para ti, no para repartir. Lo que dices en cada lámina, los datos para defenderte y lo que te pueden preguntar.'),
  h1('Lo que tienes que decidir ANTES de dar la plática'),
  p([b('Esto no está escrito en ningún lado y te lo van a preguntar. '), n('No lo inventé:')]),
  li([b('El porcentaje de comisión '), n('por proyecto.')]),
  li([b('Si hay comisión en el mantenimiento '), n('(los $450 o $650 de cada mes) y por cuánto tiempo.')]),
  li([b('Cuándo se paga la comisión: '), n('¿al primer 50 %, al pago final o en una fecha fija del mes?')]),
  li([b('Las reglas de los pagos a crédito: '), n('cuántos pagos, si hay enganche, si cobra interés.')]),
  li([b('Si «Querétaro» '), n('es la zona metropolitana o todo el estado.')]),
  h1('Lámina por lámina'),
  tabla([['Lámina', 'La idea en una frase', 'Si improvisas, di…'],
    ['1 · Portada', 'No vendemos páginas: vendemos clientes nuevos para su negocio.', 'Cuéntales cómo cerraste Smiley\'s: $6,000, pagado a $1,000 por semana.'],
    ['2 · Quiénes somos', 'Rápido, barato y nos quedamos.', '«Entregamos rápido y nos quedamos mucho tiempo.» No uses «lo hacemos a la larga»: suena a que tardamos.'],
    ['3 · Qué vendemos', 'Seis líneas, una empresa.', 'No necesitan saberlo todo: si el cliente pide algo de la lista, lo hacemos.'],
    ['4 · Las tres páginas', 'La Completa es la que más conviene.', 'La Esencial está a un tercio del freelance más barato. Es el gancho.'],
    ['5 · Mantenimiento', 'El dinero que se repite.', 'Cuesta unos $500 al mes mantener las herramientas; por eso no se cobra $250.'],
    ['6 · A quién', 'Negocios locales que ya venden por WhatsApp.', 'Que abran Smiley\'s en su celular ahí mismo.'],
    ['7 · Cinco pasos', 'Un solo paquete, no la lista.', 'Pídeles que practiquen el paso 1 en parejas: dos minutos.'],
    ['8 · No se promete', 'Casi todas las broncas nacen en la venta.', 'La regla de los cambios: 2 rondas; después, $450 la hora.'],
    ['9 · Objeciones', 'Dar la razón y regresar a su problema.', 'Juega a ser el cliente difícil con uno de ellos.'],
    ['10 · Condiciones', '50/50, 2 rondas, dominio a su nombre, IVA aparte.', 'La hoja de precios en PDF es la que se manda.'],
    ['11 · Comisión', 'Aquí das tus números.', 'Ver arriba: deben estar decididos antes.'],
    ['12 · Tarea', 'Tres negocios esta semana.', 'Fija una fecha para que te cuenten cómo les fue.']], [1900, 3600, 4300]),
  h1('Datos para defenderte (medidos en octubre de 2026)'),
  li([b('Página sencilla en el mercado: '), n('de $6,500 a $25,000; el freelance más barato, unos $4,000. Nosotros: $2,000 a $6,500.')]),
  li([b('Sitio de negocio: '), n('de $15,000 a $40,000. Nosotros: desde $9,000.')]),
  li([b('Tienda en línea: '), n('de $18,000 a $40,000. Nosotros: desde $12,000.')]),
  li([b('Mantenimiento: '), n('de $500 a $3,000 al mes con freelance; las agencias, de $2,500 a $8,000. Nosotros: $450 y $650.')]),
  li([b('Manejo de redes: '), n('de $3,500 a $12,000 al mes. Nosotros: $2,900.')]),
  p(i('Son cifras de guías de agencias y freelancers mexicanos: orientativas, porque las publica gente que vende lo mismo.')),
  h1('Preguntas que te pueden hacer los vendedores'),
  h2('«¿Tengo que saber programar?»'),
  p('No. Ellos detectan el problema y cierran; lo técnico lo resolvemos nosotros.'),
  h2('«¿Puedo vender fuera de Querétaro?»'),
  p('Las páginas sí: se hacen a distancia. Lo presencial (fotos, grabaciones, citas) sólo en Querétaro; fuera, en casos especiales y con viáticos del cliente.'),
  h2('«¿Puedo hacer descuento para cerrar?»'),
  p('No por su cuenta. Que ofrezcan primero la Esencial, las etapas o los pagos, y si aun así hace falta, que te pregunten.'),
  h2('«¿Qué pasa si el cliente no paga el segundo 50 %?»'),
  p('No se entrega ni se publica hasta que paga. Por eso el primer 50 % es antes de empezar.'),
  h2('«¿A quién le paso el cliente?»'),
  p('Al WhatsApp de la empresa, 442 883 3786, con el nombre del negocio, qué quiere y su presupuesto.'),
  h1('Lo que NO se dice en la plática'),
  li('No se nombra a nadie como cliente si no lo es.'),
  li('No se prometen fechas sin material ni cambios ilimitados.'),
  li('No se enseña el código ni cómo está hecho: se enseña el resultado.')
] }] });

Promise.all([Packer.toBuffer(guia).then(x => fs.writeFileSync(DIR + 'Guia-del-vendedor.docx', x)), Packer.toBuffer(chuleta).then(x => fs.writeFileSync(DIR + 'Chuleta-de-Carlos.docx', x))]).then(() => console.log('ok'));
