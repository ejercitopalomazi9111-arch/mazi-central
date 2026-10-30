// Presentación para la conferencia de vendedores nuevos de Grupo Mazi
const pptxgen = require('pptxgenjs');
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';              // 13.33 x 7.5
pres.title = 'Vender con Grupo Mazi';
const C = { fondo: '170A26', panel: '24133A', vino: '7E1735', morado: 'AC27FF', lila: 'C77DFF', texto: 'F2ECF7', gris: 'BFB0D0', linea: '3A2552' };
const H = 'Arial', B = 'Calibri';
const DIR = __dirname + '/';   /* necesita logo.png y las fotos (empresa/ventas/img) */

function base(titulo, kicker){
  const s = pres.addSlide(); s.background = { color: C.fondo };
  if(kicker) s.addText(kicker.toUpperCase(), { x: .6, y: .45, w: 12, h: .35, fontFace: H, fontSize: 12, bold: true, color: C.lila, charSpacing: 4, margin: 0 });
  if(titulo) s.addText(titulo, { x: .6, y: .8, w: 12.1, h: .9, fontFace: H, fontSize: 34, bold: true, color: C.texto, margin: 0, valign: 'top' });
  s.addImage({ path: DIR + 'logo.png', x: 11.75, y: 6.85, w: 1.0, h: .32, sizing: { type: 'contain', w: 1.0, h: .32 } });
  return s;
}
const tarjeta = (s, x, y, w, h, color = C.panel) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color }, line: { color: C.linea, width: 1 }, rectRadius: .12 });

// 1 · Portada
{ const s = pres.addSlide(); s.background = { color: C.fondo };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 7.5, fill: { color: C.vino, transparency: 70 }, line: { color: C.vino, transparency: 100 } });
  s.addImage({ path: DIR + 'logo.png', x: .8, y: .8, w: 3.2, h: 1.0, sizing: { type: 'contain', w: 3.2, h: 1.0 } });
  s.addText('Vender con Grupo Mazi', { x: .8, y: 2.6, w: 11.5, h: 1.3, fontFace: H, fontSize: 54, bold: true, color: C.texto, margin: 0 });
  s.addText('Qué vendemos, a quién, cómo se cierra y qué contestar cuando te digan «está caro».', { x: .8, y: 3.95, w: 10.5, h: .9, fontFace: B, fontSize: 22, color: C.gris, margin: 0 });
  s.addText('Conferencia para vendedores nuevos · 2026', { x: .8, y: 6.4, w: 8, h: .4, fontFace: H, fontSize: 13, bold: true, color: C.lila, charSpacing: 3, margin: 0 });
  s.addNotes('Bienvenida. Idea central de toda la plática: no vendes páginas, vendes clientes nuevos para el negocio del otro, y te quedas con él (mantenimiento).'); }

// 2 · Quiénes somos
{ const s = base('Entregamos rápido y nos quedamos', 'Quiénes somos');
  s.addText('«Si no existe la herramienta, se construye la herramienta.»', { x: .6, y: 1.9, w: 12, h: .7, fontFace: B, fontSize: 24, italic: true, color: C.lila, margin: 0 });
  const p = [['Rápido', 'Una página Esencial queda en 3 a 5 días. La competencia tarda semanas.'], ['Barato', 'Todos nuestros precios están abajo del promedio del mercado, medido en octubre de 2026.'], ['Nos quedamos', 'Después de entregar damos mantenimiento: el cliente no se queda solo con su página.']];
  p.forEach(([t, d], i) => { const x = .6 + i * 4.15; tarjeta(s, x, 3.0, 3.9, 3.2);
    s.addText(t, { x: x + .3, y: 3.25, w: 3.3, h: .6, fontFace: H, fontSize: 24, bold: true, color: C.texto, margin: 0 });
    s.addText(d, { x: x + .3, y: 3.95, w: 3.3, h: 2.0, fontFace: B, fontSize: 17, color: C.gris, margin: 0, valign: 'top' }); });
  s.addNotes('Las tres cosas que nos distinguen. Si el cliente sólo se lleva una, que sea «se quedan conmigo después».'); }

// 3 · Qué vendemos
{ const s = base('Seis cosas, una sola empresa', 'Qué vendemos');
  const v = [['Páginas web', 'desde $2,000'], ['Herramientas a la medida', 'desde $10,000'], ['Video y foto', 'desde $1,200'], ['Marca y diseño', 'desde $250'], ['Redes y publicidad', 'desde $1,500/mes'], ['Tiempos y movimientos', 'desde $3,000']];
  v.forEach(([t, p], i) => { const col = i % 3, fil = Math.floor(i / 3), x = .6 + col * 4.15, y = 2.0 + fil * 2.3; tarjeta(s, x, y, 3.9, 2.0);
    s.addText(t, { x: x + .3, y: y + .3, w: 3.3, h: .9, fontFace: H, fontSize: 22, bold: true, color: C.texto, margin: 0, valign: 'top' });
    s.addText(p, { x: x + .3, y: y + 1.3, w: 3.3, h: .45, fontFace: B, fontSize: 18, color: C.lila, bold: true, margin: 0 }); });
  s.addNotes('No hay que saberse todo. Hay que saber que si un cliente pide algo de esta lista, lo hacemos. Lo técnico lo resolvemos nosotros.'); }

// 4 · Los tres paquetes web
{ const s = base('Lo que más se vende: las tres páginas', 'Páginas web');
  const p = [['Esencial', '$2,000', '3 a 5 días', ['Una página con lo importante', 'Productos con foto y precio', 'WhatsApp, llamada, mapa y horarios']], ['Completa', '$6,500', '1 a 2 semanas', ['Todo lo de Esencial', 'Pedidos y citas que llegan armados por WhatsApp', 'De regalo: 2 videos para redes']], ['A la medida', 'desde $9,000', 'se dice antes', ['3D o interactiva', 'Carrito, cotizador o reservas', 'Panel para que el cliente cambie precios']]];
  p.forEach(([t, pr, tiempo, l], i) => { const x = .6 + i * 4.15, rec = i === 1; tarjeta(s, x, 1.95, 3.9, 4.6, rec ? C.vino : C.panel);
    if(rec) s.addText('LA QUE MÁS CONVIENE', { x: x + .3, y: 2.1, w: 3.3, h: .3, fontFace: H, fontSize: 11, bold: true, color: 'FFD7E3', charSpacing: 2, margin: 0 });
    s.addText(t, { x: x + .3, y: 2.45, w: 3.3, h: .6, fontFace: H, fontSize: 26, bold: true, color: C.texto, margin: 0 });
    s.addText(pr, { x: x + .3, y: 3.05, w: 3.3, h: .7, fontFace: H, fontSize: 32, bold: true, color: rec ? 'FFFFFF' : C.lila, margin: 0 });
    s.addText(l.map((x2, k) => ({ text: x2, options: { bullet: true, breakLine: k < l.length - 1 } })), { x: x + .3, y: 3.85, w: 3.4, h: 1.9, fontFace: B, fontSize: 15, color: C.texto, margin: 0, paraSpaceAfter: 6, valign: 'top' });
    s.addText('Lista en ' + tiempo + ' · 3 meses de mantenimiento incluidos', { x: x + .3, y: 5.85, w: 3.3, h: .55, fontFace: B, fontSize: 12, color: C.gris, margin: 0 }); });
  s.addNotes('Empuja la Completa: el cliente siente que se lleva más (los videos) y a nosotros nos deja mejor margen. La Esencial es la puerta de entrada.'); }

// 5 · El dinero que se repite
{ const s = base('El negocio de verdad es el mantenimiento', 'Lo que más paga a la larga');
  s.addText([{ text: '$450', options: { fontSize: 66, bold: true, color: C.lila } }, { text: '  al mes', options: { fontSize: 26, color: C.gris } }], { x: .6, y: 2.0, w: 6, h: 1.2, fontFace: H, margin: 0 });
  s.addText('Plan Esencial: hasta 4 cambios chicos al mes, respuesta en 48 h.', { x: .6, y: 3.2, w: 5.8, h: .8, fontFace: B, fontSize: 18, color: C.texto, margin: 0 });
  s.addText([{ text: '$650', options: { fontSize: 66, bold: true, color: C.lila } }, { text: '  al mes', options: { fontSize: 26, color: C.gris } }], { x: 6.9, y: 2.0, w: 6, h: 1.2, fontFace: H, margin: 0 });
  s.addText('Plan Plus: hasta 10 cambios, una promoción al mes y atención el mismo día.', { x: 6.9, y: 3.2, w: 5.8, h: .8, fontFace: B, fontSize: 18, color: C.texto, margin: 0 });
  tarjeta(s, .6, 4.45, 12.1, 1.9);
  s.addText([{ text: 'Cómo decirlo: ', options: { bold: true, color: C.lila } }, { text: '«Es como un seguro: tu página siempre al día y alguien que te contesta.» Los primeros 3 meses ya van incluidos, así que el cliente no paga nada hasta que ya vio que funciona. Pagando el año completo, son 12 meses por el precio de 10.', options: { color: C.texto } }], { x: .9, y: 4.6, w: 11.5, h: 1.6, fontFace: B, fontSize: 18, margin: 0, valign: 'middle' });
  s.addNotes('Diez clientes en mantenimiento son de $4,500 a $6,500 al mes que llegan solos. Ningún vendedor debe cerrar una página sin mencionar el mantenimiento.'); }

// 6 · A quién
{ const s = base('A quién venderle (y ya lo hicimos)', 'Prospectos');
  s.addText([
    { text: 'Negocios con cara al público en Querétaro', options: { bold: true, breakLine: true } },
    { text: 'Restaurantes, barberías, cafeterías, tiendas de ropa, consultorios, escuelas, talleres.', options: { breakLine: true } },
    { text: ' ', options: { breakLine: true } },
    { text: 'La señal de que te van a comprar', options: { bold: true, breakLine: true } },
    { text: 'Contestan pedidos a mano por WhatsApp, tienen el menú en una foto borrosa o te dicen «sí, tengo Facebook».', options: { breakLine: true } },
    { text: ' ', options: { breakLine: true } },
    { text: 'Lo que puedes enseñarles', options: { bold: true, breakLine: true } },
    { text: 'Smiley\'s (pizzería), District Roll (menú con pedido por WhatsApp) y Fadori (pedidos sin filas en una cafetería escolar).' }
  ], { x: .6, y: 1.95, w: 6.4, h: 4.6, fontFace: B, fontSize: 17, color: C.texto, margin: 0, valign: 'top' });
  ['smileys', 'district', 'fadori-00700'].forEach((f, i) => { s.addImage({ path: DIR + f + '.jpg', x: 7.4 + i * 1.85, y: 1.9, w: 1.7, h: 3.68, sizing: { type: 'cover', w: 1.7, h: 3.68 } }); });
  s.addText('Ábrelas en tu celular frente al cliente: verla funcionando vende más que cualquier explicación.', { x: 7.4, y: 5.75, w: 5.3, h: .7, fontFace: B, fontSize: 13, italic: true, color: C.gris, margin: 0 });
  s.addNotes('Nunca digas que alguien es cliente si no lo es. Enseña sólo lo que ya está entregado.'); }

// 7 · Cómo se vende
{ const s = base('Cómo se cierra una venta, en cinco pasos', 'El método');
  const pasos = [['Pregunta', '¿Cómo te llegan los clientes hoy? ¿Qué te quita más tiempo?'], ['Enseña', 'Abre un trabajo nuestro en tu celular. Que lo toquen.'], ['Propón', 'Un paquete, no tres. El que resuelve lo que te dijeron.'], ['Cierra', '50 % para empezar y 50 % al entregar. Pide su material ese día.'], ['Acompaña', 'Avísales cada avance y a los 3 meses ofrece el mantenimiento.']];
  pasos.forEach(([t, d], i) => { const x = .6 + i * 2.48; tarjeta(s, x, 2.0, 2.3, 4.3);
    s.addText(String(i + 1), { x: x + .25, y: 2.15, w: 1.0, h: .9, fontFace: H, fontSize: 40, bold: true, color: C.lila, margin: 0 });
    s.addText(t, { x: x + .25, y: 3.1, w: 1.9, h: .5, fontFace: H, fontSize: 20, bold: true, color: C.texto, margin: 0 });
    s.addText(d, { x: x + .25, y: 3.7, w: 1.9, h: 2.4, fontFace: B, fontSize: 15, color: C.gris, margin: 0, valign: 'top' }); });
  s.addNotes('El error más común es soltar la lista de precios completa. El cliente se confunde y pospone. Un solo paquete, el que resuelve su problema.'); }

// 8 · Lo que no se promete
{ const s = base('Lo que nunca se promete', 'Para no meternos en broncas');
  const n = [['Fechas sin material', 'La fecha corre desde que el cliente nos da fotos y textos. Dilo antes.'], ['Cambios infinitos', 'Van 2 rondas de ajustes. Después, $450 la hora. Se dice ANTES de empezar.'], ['Descuentos por tu cuenta', 'Si hay que mover un precio, pregúntale a Carlos primero.'], ['Clientes que no son', 'Sólo se enseña lo entregado. Presumir clientes falsos nos quema rápido.'], ['Visitas fuera de Querétaro', 'Sólo casos especiales, y el cliente paga los viáticos.'], ['Cosas que no sabes', '«Lo checo con el equipo y te confirmo hoy» siempre es mejor que inventar.']];
  n.forEach(([t, d], i) => { const col = i % 2, fil = Math.floor(i / 2), x = .6 + col * 6.1, y = 1.95 + fil * 1.6; tarjeta(s, x, y, 5.9, 1.4);
    s.addText(t, { x: x + .3, y: y + .15, w: 5.3, h: .45, fontFace: H, fontSize: 18, bold: true, color: C.texto, margin: 0 });
    s.addText(d, { x: x + .3, y: y + .65, w: 5.3, h: .65, fontFace: B, fontSize: 15, color: C.gris, margin: 0, valign: 'top' }); });
  s.addNotes('Casi todas las broncas con clientes salen de algo que se prometió en la venta. Estas seis reglas evitan el 90 %.'); }

// 9 · Objeciones
{ const s = base('Cuando te digan…', 'Objeciones frecuentes');
  const o = [['«Está caro»', 'Estamos abajo del promedio: una página sencilla en el mercado va de $6,500 a $25,000. Y hay pagos o etapas.'], ['«Ya tengo Facebook»', 'En Facebook no te encuentra quien busca en Google, y no te llegan pedidos armados. Se complementan.'], ['«Mi sobrino me la hace»', 'Perfecto si te la mantiene. Nosotros sí contestamos a los 6 meses, y la página queda a tu nombre.'], ['«Hay páginas gratis»', 'Gratis hasta que quieres tu dominio, quitar anuncios o que alguien te la arregle. La tuya es tuya.'], ['«No tengo tiempo»', 'Sólo necesitamos tus fotos, tus precios y 20 minutos. Lo demás lo hacemos nosotros.']];
  o.forEach(([t, d], i) => { const y = 1.9 + i * .98; tarjeta(s, .6, y, 12.1, .85);
    s.addText(t, { x: .85, y: y + .1, w: 3.6, h: .65, fontFace: H, fontSize: 18, bold: true, color: C.lila, margin: 0, valign: 'middle' });
    s.addText(d, { x: 4.5, y: y + .1, w: 8.0, h: .65, fontFace: B, fontSize: 15, color: C.texto, margin: 0, valign: 'middle' }); });
  s.addNotes('No discutas: dale la razón en lo que tenga razón y regresa a su problema. Si insiste en precio, ofrece la Esencial o pagos.'); }

// 10 · Condiciones
{ const s = base('Las condiciones, para que no te agarren en curva', 'Letra grande');
  const c = [['Pago', '50 % para empezar, 50 % al entregar.'], ['Presupuesto corto', 'Por etapas o en pagos (cada caso lo ve Carlos).'], ['Cambios', '2 rondas incluidas; después $450 la hora.'], ['Dominio', 'Queda a nombre del cliente; lo paga directo.'], ['Factura', 'Si la necesita, se agrega el IVA.'], ['Mantenimiento extra', 'Lo que no entra en el plan, con 15 % de descuento.']];
  c.forEach(([t, d], i) => { const col = i % 3, fil = Math.floor(i / 3), x = .6 + col * 4.15, y = 2.0 + fil * 2.25; tarjeta(s, x, y, 3.9, 2.0);
    s.addText(t, { x: x + .3, y: y + .25, w: 3.3, h: .5, fontFace: H, fontSize: 20, bold: true, color: C.texto, margin: 0 });
    s.addText(d, { x: x + .3, y: y + .85, w: 3.3, h: 1.0, fontFace: B, fontSize: 16, color: C.gris, margin: 0, valign: 'top' }); });
  s.addNotes('La hoja de servicios y precios en PDF es la que se manda al cliente; ésta es la versión corta para que la tengas en la cabeza.'); }

// 11 · Cómo cobras tú
{ const s = base('Cómo ganas tú', 'Comisión');
  tarjeta(s, .6, 1.95, 12.1, 4.4);
  s.addText([
    { text: 'Cobras comisión por cada proyecto que cierres.', options: { bold: true, fontSize: 24, breakLine: true } },
    { text: ' ', options: { breakLine: true } },
    { text: 'El porcentaje y cuándo se paga lo explica Carlos en esta plática.', options: { color: C.lila, bold: true, breakLine: true } },
    { text: ' ', options: { breakLine: true } },
    { text: 'Tu comisión cuenta desde que el cliente paga el primer 50 %, no desde que dice «sí, va». Un «sí» no es una venta.', options: { breakLine: true } },
    { text: 'Los clientes que entran a mantenimiento siguen pagando cada mes: cuida a los tuyos.' }
  ], { x: 1.0, y: 2.2, w: 11.3, h: 3.9, fontFace: B, fontSize: 19, color: C.texto, margin: 0, valign: 'top' });
  s.addNotes('PENDIENTE DE CARLOS: el porcentaje de comisión, si hay comisión también en el mantenimiento y en qué fecha se paga. No está escrito en ningún lado; no lo inventamos.'); }

// 12 · Cierre
{ const s = pres.addSlide(); s.background = { color: C.fondo };
  s.addImage({ path: DIR + 'logo.png', x: .8, y: .8, w: 3.2, h: 1.0, sizing: { type: 'contain', w: 3.2, h: 1.0 } });
  s.addText('Tu primera tarea', { x: .8, y: 2.4, w: 11.5, h: .8, fontFace: H, fontSize: 40, bold: true, color: C.texto, margin: 0 });
  s.addText('Esta semana, platica con tres negocios de tu colonia. Pregunta cómo les llegan los clientes y enséñales un trabajo nuestro en tu celular.', { x: .8, y: 3.3, w: 11, h: 1.2, fontFace: B, fontSize: 22, color: C.gris, margin: 0 });
  s.addText([{ text: 'WhatsApp ', options: { color: C.gris } }, { text: '442 883 3786', options: { bold: true, color: C.lila } }, { text: '    ·    ', options: { color: C.gris } }, { text: 'grupomazi.oficial@gmail.com', options: { bold: true, color: C.lila } }], { x: .8, y: 5.6, w: 11.5, h: .6, fontFace: B, fontSize: 22, margin: 0 });
  s.addNotes('Cerrar con la tarea concreta. Abre preguntas.'); }

pres.writeFile({ fileName: DIR + 'Vender-con-Grupo-Mazi.pptx' }).then(f => console.log('ok', f));
