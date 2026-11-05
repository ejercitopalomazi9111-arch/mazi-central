/* EL CATÁLOGO DE MUESTRA de las tiendas de barbería. Fotos reales de Unsplash (licencia libre, créditos en
   img/prod/CREDITOS.md). Los precios son de muestra, a nivel Querétaro 2026; cada página escoge, renombra y
   reprecia lo suyo con elegir(). */
const F = (n) => new URL(`../img/prod/${n}.webp`, import.meta.url).href;

export const CATALOGO = [
  { id: 'arcilla', cat: 'Cabello', nombre: 'Pomada de arcilla', nota: 'Fijación fuerte, acabado mate · 85 g', precio: 320, fotos: [F('pomada-arcilla'), F('pomada-mano')], insignia: 'Más vendida',
    desc: 'Para el fade y los cortes con textura: sostiene todo el día sin verse mojado ni dejar el pelo tieso. Se lava solo con agua.', uso: 'Una pizca del tamaño de un chícharo, frótala en las palmas hasta que se caliente y péinate con los dedos con el cabello seco.',
    variantes: [{ nombre: '85 g', precio: 320 }, { nombre: '150 g', precio: 480 }] },
  { id: 'brillo', cat: 'Cabello', nombre: 'Pomada de brillo', nota: 'Base agua, fijación media · 100 g', precio: 290, fotos: [F('pomada-brillo'), F('pomada-grasa')],
    desc: 'El clásico peinado de raya con brillo, sin la grasa de antes. Se puede re-peinar durante el día.', uso: 'Con el cabello húmedo o seco, aplica y peina con peine fino para marcar la raya.' },
  { id: 'tonico', cat: 'Cabello', nombre: 'Tónico de sal marina', nota: 'Volumen y textura de playa · 100 ml', precio: 280, fotos: [F('tonico-pomada'), F('tonico-repisa')], insignia: 'Nuevo',
    desc: 'Le da cuerpo al cabello fino antes de secar. La base perfecta antes de la pomada de arcilla.', uso: 'Rocía 4 o 5 veces en el cabello húmedo y seca con secadora, levantando desde la raíz.' },
  { id: 'spray', cat: 'Cabello', nombre: 'Spray texturizador', nota: 'Acabado natural, sin residuo · 150 ml', precio: 270, fotos: [F('spray-texturizador')],
    desc: 'Textura sin peso para cortes medianos y largos. Ideal para el look despeinado que sí está peinado.', uso: 'A 20 cm de distancia, sobre el cabello seco, y acomoda con los dedos.' },
  { id: 'aceite', cat: 'Barba', nombre: 'Aceite para barba', nota: 'Sándalo y cedro · 30 ml', precio: 260, fotos: [F('aceite-barba'), F('aceite-y-cera')], insignia: 'Más vendido',
    desc: 'Quita la comezón de la barba nueva y le da brillo sano a la larga. Huele a madera, no a perfume.', uso: 'De 3 a 5 gotas en la palma, frota y pásalas por la barba desde la raíz. Mejor después de bañarte.',
    variantes: [{ nombre: '30 ml', precio: 260 }, { nombre: '50 ml', precio: 390 }] },
  { id: 'balsamo', cat: 'Barba', nombre: 'Bálsamo para barba', nota: 'Peina y suaviza · 100 ml', precio: 290, fotos: [F('balsamo-barba')],
    desc: 'Para la barba que se esponja: la doma, la suaviza y la deja en su lugar sin verse grasosa.', uso: 'Un poco en las manos, aplica en la barba y péinala con peine de madera.' },
  { id: 'peine', cat: 'Barba', nombre: 'Peine de madera', nota: 'Peral, hecho a mano', precio: 180, fotos: [F('peine-madera'), F('peine-latas')],
    desc: 'La madera no hace estática ni jala el pelo. Diente ancho para barba, fino para bigote.', uso: 'Péinate en el sentido del crecimiento, con bálsamo o aceite.' },
  { id: 'brocha', cat: 'Afeitado', nombre: 'Brocha de afeitar', nota: 'Pelo sintético suave, mango de resina', precio: 450, fotos: [F('brocha-premium'), F('brocha-madera')],
    desc: 'Hace espuma de verdad y levanta el pelo antes de la navaja. El primer paso de un buen afeitado en casa.', uso: 'Humedécela con agua caliente, carga el jabón en círculos y aplica en la cara con movimientos circulares.',
    variantes: [{ nombre: 'Resina negra', precio: 450 }, { nombre: 'Mango de madera', precio: 520 }] },
  { id: 'navaja', cat: 'Afeitado', nombre: 'Navaja clásica', nota: 'Acero, con estuche · de colección', precio: 1250, fotos: [F('navaja-clasica'), F('navajas')],
    desc: 'La navaja de barbero de toda la vida. Para quien ya se afeita en casa y quiere el acabado de la barbería.', uso: 'Siempre a 30 grados y a favor del pelo. Si nunca la has usado, pídele a tu barbero la primera clase en tu cita.' },
  { id: 'rastrillo', cat: 'Afeitado', nombre: 'Kit de rastrillo', nota: 'Rastrillo de seguridad, brocha y tazón', precio: 990, antes: 1180, fotos: [F('kit-rastrillo'), F('navaja-brocha')],
    desc: 'Todo para afeitarte como en la barbería, sin irritación: el rastrillo de doble filo corta limpio y una sola hoja dura semanas.', uso: 'Prepara con agua caliente, haz espuma con la brocha y pasa el rastrillo sin presionar, dejando que el peso haga el trabajo.' },
  { id: 'facial', cat: 'Piel', nombre: 'Rutina facial', nota: 'Limpiador, tónico y crema', precio: 690, fotos: [F('facial-linea')],
    desc: 'Tres pasos para la piel después del corte o el afeitado: limpia, cierra el poro e hidrata sin brillo.', uso: 'Mañana y noche: limpiador, tónico con algodón y una capa ligera de crema.' },
  { id: 'kit-arranque', cat: 'Kits', nombre: 'Kit de arranque', nota: 'Pomada, tónico y aceite', precio: 690, antes: 860, fotos: [F('trio'), F('repisa-negra')], insignia: '−20 %',
    desc: 'Lo que más se llevan en un solo paquete: tónico para el volumen, pomada para fijar y aceite para la barba.', uso: 'Tónico con el cabello húmedo, pomada ya seco y aceite en la barba después de bañarte.' },
  { id: 'cofre', cat: 'Kits', nombre: 'Cofre del caballero', nota: 'Para regalar: barba, cabello y afeitado', precio: 1490, antes: 1790, fotos: [F('kit-cofre'), F('cofre-maquina')], insignia: 'Regalo',
    desc: 'El regalo que sí se usa: aceite, bálsamo, peine de madera, brocha y pomada, en un cofre de madera que se queda en su repisa.', uso: 'Lo entregamos envuelto y con tarjeta escrita a mano. Pídelo con un día de anticipación.' },
  { id: 'herramientas', cat: 'Kits', nombre: 'Kit pro de casa', nota: 'Máquina de detalle, tijera y peine', precio: 1890, fotos: [F('herramientas')],
    desc: 'Para mantener el corte entre cita y cita: la máquina de detalle para la nuca y las patillas, tijera de precisión y peine.', uso: 'Sólo para retocar contornos. El corte completo, en la silla.' },
];

/* una página escoge del catálogo y le cambia lo que quiera: elegir(['arcilla', ['aceite', { precio: 280 }], …]) */
export const elegir = (lista) => lista.map(x => { const [id, cambio] = Array.isArray(x) ? x : [x, {}]; const p = CATALOGO.find(c => c.id === id); return p ? { ...p, ...cambio } : null; }).filter(Boolean);
