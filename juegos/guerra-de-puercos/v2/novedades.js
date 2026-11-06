/* ═══════════════════════════════════════════════════════════════════════════
   GUERRA DE PUERCOS 2 · LO NUEVO (el dev log)
   ───────────────────────────────────────────────────────────────────────────
   Carlos, 6 nov: «hazlo dentro del estilo de todo el juego y divídelo en
   pequeños bloques de cada actualización en un menú que deje divisar el juego
   usual, con un botón para volver fácilmente». Es una hoja del juego: atrás se
   sigue viendo la mesa. Primero la lista de versiones; al tocar una, su bloque
   con el antes y el después. Las fotos son capturas reales de cada versión
   (devlog/*.webp).
   ═══════════════════════════════════════════════════════════════════════════ */
const F = (n) => 'devlog/' + n + '.webp';
export const VERSION_ACTUAL = '2.6';
export const NOVEDADES = [
  { ver: '2.6', fecha: '6 de noviembre, noche', titulo: 'Sobres a tu modo y cartas de cerca', foto: 'v26-donde',
    puntos: [
      'El sobre se abre donde lo sueltes: arrástralo a cualquier lado, o tócalo y se abre en medio.',
      'Después de la primera carta, la pila se recorre a la izquierda y lo que sale se acomoda a la derecha.',
      'La carta se queda medio segundo más en grande; si la tocas, se va a la mesa al instante.',
      'Ver una carta de cerca: gírala con el dedo, acércala con dos dedos y voltéala para ver el dorso. También en tu colección.',
      'Cuando sale algo chido (legendaria, épica o líder): suspenso antes de voltearse, rayos de luz, destello, confeti y letrero grande.',
      'Arreglo: al guardar ya no parpadea la mesa, y la envoltura que dejaste tirada se queda para el siguiente sobre.',
      'Arreglo: los letreros de rareza y el número de sobres ya no se ponen encima de la carta que abres.',
      'Cosméticos parejos: 12 avatares, 12 tapetes, 12 mascotas y 12 dorsos.',
    ],
    antes: [['1-monton', 'Siempre a la izquierda']], despues: [['v26-donde', 'Donde lo sueltes']],
    extras: [['v26-de-cerca', 'Una carta de cerca'], ['v26-envoltura', 'La envoltura se queda']] },
  { ver: '2.5', fecha: '6 de noviembre', titulo: 'Líderes, tu mazo y los sobres en 3D', foto: 'v2-caratula',
    puntos: [
      'La carátula de la caja al abrir el juego.',
      '10 puercos líderes: escoges uno gratis al crear tu cuenta y cada uno da una ventaja al empezar. Los demás salen en el Sobre de Líderes (1,500 monedas).',
      'Tu mazo de 64, armado a mano con las cartas que sí tienes (máximo 3 iguales y tope de legendarias). Empiezas con 30 de regalo.',
      'Los sobres dan 5 cartas y salen menos repetidas.',
      'Los sobres se amontonan en la mesa, en 3D y gorditos: tocas el de arriba, lo abres, tocas una carta para verla en grande y la envoltura va al bote (o se queda tirada, reventada).',
      'Dos en un teléfono: lo que eliges va boca abajo a la mesa, el otro lo ve y pone lo suyo; la cámara se pone de lado y se voltean las dos a la vez.',
      'Las cartas se reparten en 2.5 segundos.',
      'Mascota pingüino y tapete de puros pingüinos.',
      'Chistes de las cartas mientras carga la mesa.',
      'Arreglo: las monedas y los sobres ya no se pierden con tu cuenta en dos teléfonos.',
    ],
    antes: [['v24-inicio', 'Se entraba directo'], ['v21-sobres', 'Sobres en una lista']],
    despues: [['v2-caratula', 'La carátula'], ['1-monton', 'El montón en la mesa']],
    extras: [['v2-lideres', 'Escoge tu líder'], ['v2-lider-intro', 'Tu líder al empezar'], ['v2-mazo', 'Tu mazo de 64'], ['v2-lideres-col', 'Tus líderes'],
      ['v2-tienda', 'Sobre de Líderes'], ['4-mesa', 'Lo que te salió'], ['5-grande', 'Una carta en grande'], ['6-arrastrando', 'La envoltura al bote'],
      ['v2-dos-boca-abajo', 'Boca abajo'], ['v2-dos-choque-1', 'La cámara de lado'], ['v2-pinguinos', 'Puros pingüinos']] },
  { ver: '2.3', fecha: '5 de noviembre, noche', titulo: 'Jugar con otros', foto: 'v24-modos',
    puntos: ['Dos en este teléfono, con cortina entre turnos.', 'A distancia con un código de 4 letras o un link: nadie ve las cartas del otro.', 'Amigos: se agregan por apodo y se retan.'],
    antes: [['v23-inicio', 'Sólo contra la máquina']], despues: [['v24-modos', 'Tres formas de jugar']] },
  { ver: '2.2', fecha: '5 de noviembre, tarde', titulo: 'Cuentas, tienda y tabla de líderes', foto: 'v23-tienda',
    puntos: ['Tu cuenta con apodo y contraseña, sin datos personales.', 'Tabla de líderes: victorias, dinero, cartas y partidas.', 'Tienda de sobres con las monedas que ganas jugando.', 'Partidas más cortas: 80 de vida (unas 12 rondas en vez de 31).'],
    antes: [['v22-inicio', 'Sin cuenta']], despues: [['v23-tienda', 'La tienda']] },
  { ver: '2.1', fecha: '5 de noviembre', titulo: 'La mesa en 3D contra la máquina', foto: 'v22-choque',
    puntos: ['Las cartas se juegan en una mesa en 3D.', 'El choque: forcejean 2.5 segundos, la que pierde se rompe en pedazos y el daño vuela a la vida.'],
    antes: [['v1-inicio', 'Un menú de botones']], despues: [['v22-mesa', 'La mesa'], ['v22-choque', 'El choque']] },
  { ver: '2.0', fecha: '5 de noviembre, mañana', titulo: 'Todo nuevo: colección y sobres', foto: 'v21-inicio',
    puntos: ['Una colección que no se pierde: puercos, soporte y cosméticos.', 'Abrir sobres como de verdad: rasgar, jalar y voltear carta por carta.', 'Las cartas siguen siendo las de la autora.'],
    antes: [['v1-juego', 'Las 100 cartas en lista']], despues: [['v21-inicio', 'La versión 2'], ['v21-sobres', 'Tus sobres']] },
  { ver: '1', fecha: 'agosto y septiembre', titulo: 'La primera versión', foto: 'v1-inicio',
    puntos: ['El juego de la amiga, pasado al teléfono para su hermanito.', 'Contra la máquina, de dos y con alguien lejos.', 'Sigue en la Central para quien la prefiera.'],
    antes: [], despues: [['v1-inicio', 'El menú'], ['v1-juego', 'Las cartas']] },
];

const foto = ([n, t]) => `<figure><img loading="lazy" alt="${t}" src="${F(n)}"><figcaption>${t}</figcaption></figure>`;
export function listaNovedades(){
  return `<div class="nv"><h3>Lo nuevo</h3><p class="nota">Cada actualización del juego, desde la primera. Toca una para ver el antes y el después.</p>
    <div class="nv-lista">${NOVEDADES.map((v, i) => `<button class="nv-fila" data-nv="${i}">
      <img alt="" src="${F(v.foto)}"><span><b class="nv-ver">${v.ver}</b><strong>${v.titulo}</strong><small>${v.fecha}</small></span></button>`).join('')}</div>
    <button class="btn suave" data-h="nada">Volver al juego</button></div>`;
}
export function bloqueNovedad(i){
  const v = NOVEDADES[i];
  return `<div class="nv"><div class="nv-cabeza"><button class="btn-chico" data-nv-lista>‹ Todas</button><b class="nv-ver">${v.ver}</b><small>${v.fecha}</small></div>
    <h3>${v.titulo}</h3>
    <ul class="nv-puntos">${v.puntos.map(p => `<li>${p}</li>`).join('')}</ul>
    ${v.antes.length ? `<div class="nv-par"><div><p class="nv-etq">Antes</p>${v.antes.map(foto).join('')}</div><div><p class="nv-etq ya">Después</p>${v.despues.map(foto).join('')}</div></div>`
      : `<div class="nv-tira">${v.despues.map(foto).join('')}</div>`}
    ${v.extras ? `<p class="nv-etq ya">Lo que se añadió</p><div class="nv-tira">${v.extras.map(foto).join('')}</div>` : ''}
    <div class="dos"><button class="btn suave" data-nv-lista>‹ Todas</button><button class="btn" data-h="nada">Volver al juego</button></div></div>`;
}
