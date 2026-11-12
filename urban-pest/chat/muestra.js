/* Datos de MUESTRA para ver el chat central sin servidor (?muestra o sin conexión).
   Son inventados a propósito y lo dicen: nombres de mentira y números 555.
   Tienen la misma forma que el servidor (urban-pest/servidor/RUTAS.md). */
const h = (min) => Date.now() - min * 60e3;
export const MUESTRA = {
  conversaciones: [
    { canal: 'whatsapp', chat: '5215550000001', nombre: 'Mariana (muestra)', estado: 'abierta', ultimo: h(3),
      datos: { plaga: 'cucaracha', m2: 80, zona: 'Centro', tipo: 'casa' },
      cotizacion: { desde: 590, visita: false, fueraDeRadio: false, desglose: { producto: 240, mano_de_obra: 160, traslado: 50 } },
      mensajes: [
        { de: 'cliente', texto: 'Hola buenas, ¿cuánto cobran por fumigar?', cuando: h(9) },
        { de: 'negocio', via: 'reflejo', caso: 'precio', confianza: 1, texto: 'Con gusto te cotizo. ¿Qué plaga tienes, más o menos cuántos metros cuadrados es y en qué colonia estás?', cuando: h(9) },
        { de: 'cliente', texto: 'Son cucarachas en la cocina, la casa es como de 80 metros, estoy en el Centro', cuando: h(4) },
        { de: 'negocio', via: 'cerebro', modelo: 'openai/gpt-oss-120b', razon: 'Ya tenía plaga, metros, zona y tipo; di el precio aproximado de la cotización y aclaré que el técnico lo confirma.',
          texto: 'Te saldría aproximadamente en $590. Si los datos que nos diste están bien, ése es el costo; el técnico te lo confirma al ver tu casa. ¿Qué día te acomoda?', cuando: h(3) },
      ] },
    { canal: 'instagram', chat: 'ig-muestra-2', nombre: 'Bodega Norte (muestra)', estado: 'abierta', ultimo: h(22),
      datos: { plaga: 'roedor', m2: 1200, zona: 'Parque industrial', tipo: 'industria' },
      mensajes: [
        { de: 'cliente', texto: '¿Fumigan bodegas? Tenemos ratas en una nave de 1,200 m²', cuando: h(25) },
        { de: 'negocio', via: 'reflejo', caso: 'empresa', confianza: .82, texto: 'Sí, atendemos negocios e industria. Para eso vamos a ver el lugar antes de darte el precio final. ¿Qué giro es y en qué zona está?', cuando: h(25) },
        { de: 'cliente', texto: 'Alimentos, en el parque industrial. ¿Me pueden dar contrato mensual?', cuando: h(22) },
        { de: 'negocio', via: 'cerebro', modelo: 'gemini-3.8-flash', razon: 'Industria de alimentos y piden contrato: eso lo decide el dueño. Ofrecí visita y lo marqué para él.',
          texto: 'Claro. Por ser industria de alimentos lo mejor es una visita para revisar la nave; el encargado te contacta hoy para agendarla y ver lo del contrato.', cuando: h(22) },
      ] },
    { canal: 'facebook', chat: 'fb-muestra-3', nombre: 'Jorge (muestra)', estado: 'abierta', ultimo: h(95), duenoHasta: h(-10),
      datos: { plaga: null, m2: null, zona: null, tipo: null },
      mensajes: [
        { de: 'cliente', texto: '¿Dan factura?', cuando: h(100) },
        { de: 'negocio', via: 'reflejo', caso: 'factura', confianza: 1, texto: 'Sí te ayudamos con eso. En un momento te contacta el encargado para tus datos de facturación.', cuando: h(100) },
        { de: 'negocio', via: 'dueno', texto: 'Qué tal Jorge, soy el encargado. Pásame tu RFC y tu correo y te la mando hoy.', cuando: h(95) },
      ] },
  ],
  avisos: [
    { id: 'aviso:1', motivo: 'Industria de alimentos pide contrato mensual: agenda la visita.', canal: 'instagram', chat: 'ig-muestra-2', nombre: 'Bodega Norte (muestra)', cuando: h(22), estado: 'nuevo' },
    { id: 'aviso:2', motivo: 'Caso «factura»: necesita que lo veas tú.', canal: 'facebook', chat: 'fb-muestra-3', nombre: 'Jorge (muestra)', cuando: h(100), estado: 'visto' },
  ],
  manual: [
    { id: 'manual:1', pregunta: '¿Es seguro para mis perros?', respuesta: 'Te recomendamos sacar a tus mascotas durante el servicio; el técnico te dice cuánto tiempo según el producto.', razon: 'No había respuesta hecha sobre mascotas; no prometí tiempos exactos.', canal: 'whatsapp', cuando: h(300), estado: 'por revisar' },
    { id: 'manual:2', pregunta: 'Tienen garantía?', respuesta: 'Sí, el encargado te explica la garantía según el servicio que contrates.', razon: 'No sé los términos de garantía: lo mandé con el dueño.', canal: 'facebook', cuando: h(600), estado: 'por revisar' },
  ],
  ia: [
    { de: 'yo', texto: '¿Cuántas cotizaciones salieron esta semana?' },
    { de: 'ia', texto: 'Muestra: 14 cotizaciones, 9 de casa y 5 de negocio. Dos piden visita y siguen sin agendar.' },
  ],
};
