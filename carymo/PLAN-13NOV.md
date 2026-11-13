# CARYMO · lo que pidió Carlos el 13 de noviembre

> Este archivo es la **hoja de ruta**: qué se pidió, qué ya está, cómo se va a hacer y cómo seguirle.
> Va junto con el tablero «CARYMO · lista de Carlos (13 nov)» del **Pizarrón de La Sala**, que es la
> vista rápida con palomitas. **Quien termine algo:**
> 1. le pone palomita en el tablero;
> 2. lo marca aquí con ✅ y el número de PR;
> 3. avisa en el chat de GRUPAZ.
>
> Lo empezó Luna (la sesión de Carlos). Sylcred trabaja en CARYMO en paralelo (rama
> `claude/juego-oregon-3kmicc`), así que **antes de tocar un archivo grande se avisa en la sala**.

## 1 · Arreglos rápidos

- ✅ Quitado del pizarrón el cursor con el círculo que «señalaba» mientras hablaba la voz (#336).
  Carlos: «se ve horrible, estorba y ni siquiera sigue lo que dice la voz».
- ✅ La Sala: el botón «escuchar» de cada mensaje lee con la voz del teléfono y sigue con los de abajo (#335, #336).
- ✅ Amigos vacío dice sólo «Amigos · No hay nadie por aquí», y conectados, «Personas conectadas · Nadie
  conectado en este momento» (#337).
- ✅ Horario (#337):
  - arriba, «Ahora estás en…» con lo que falta y «Te toca…»;
  - cada día plegado; hoy viene abierto;
  - quitar clases va dentro de «Editar».

## 2 · Mascotas

**Lo que pidió Carlos:** el nombre es CARYMO, con C y con Y (el logo que mandó dice «CARIMO», mal
escrito). Hay que sumar mascotas con la **misma estética** que las de Sylcred: SVG por piezas, articuladas
como Duolingo, en `carymo/mascota.js`.

- ✅ **Paloma mejorada**, más parecida a la original. La original son las poses que mandó Carlos, que
      están en la historia de git (`git show 453185fd:carymo/mascotas/paloma-parada.webp`).
- ✅ Pingüino.
- ✅ Conejo.
- ✅ Foca.
- ✅ Ballena.
- ✅ Gatito.
- ✅ Perrito.
- [ ] **3 voces por mascota**. La elegida se guarda en el perfil, así que al volver a entrar sigue la misma.
- [ ] **La mascota dice las cosas** (si está prendida): avisos, resultados y ánimo, con su modo, no formal.
      Si está apagada, el texto normal.

**Hecho (Luna):** los 7 viven en `carymo/zoo.js` (la paloma de ahí reemplaza a la vieja) y se eligen en el perfil.

**Cómo:** cada animal es una función `svgX(id)` con las mismas piezas `data-p` (raiz, cuerpo, cabeza,
ojoI/ojoD, brazoI/brazoD, pataI/pataD, cola, cacheteI/D, sombra) más su `PIVOTE` y su `OJOS`. Con eso, el
motor (`ACCIONES`, `pintar`) los mueve sin cambiarle nada. La galería para verlos está en
`carymo/pruebas-masc/galeria.html`.

## 3 · Economía: cubitos de palomium

Es la moneda de la app. **Se gana muy poquito**, para que el día que haya pagos la gente los compre; la
suscripción de paga dará cubitos diarios por seguir la racha.

| Qué haces | Cubitos (propuesta, se ajusta) |
|---|---|
| Terminar una lección | 1 |
| Racha diaria (cada día) | 1 |
| Racha de 7 días | 3 extra |
| Estudiar juntos con un amigo | 2 |
| Racha con un amigo (cada 7 días) | 3 |
| Subir de grado en un plan | 3 |
| Terminar un plan completo | 10 |
| Subir de nivel de cuenta | 5 |

- [ ] El saldo vive en el **servidor** (`sala/servidor/estudio.js`, `est:perfil`), nunca sólo en el teléfono.
      Cada premio es un evento con id, igual que el XP, para que no se cobre dos veces.
- [ ] Tienda: **congelador de racha** (salva un día sin entrar), muebles del cuarto, comida, cosméticos y
      ropa del personaje.
- [ ] Después (cuando haya pagos): comprar cubitos y la suscripción que da cubitos diarios.

## 4 · El cuarto de la mascota (tipo Pou / Tamagotchi)

- [ ] El cuarto se compra o se desbloquea; adentro se ponen muebles (salita, cama, tapete…).
- [ ] Comida, baño y jugar.
- [ ] Si no entras o no estudias, se va sintiendo mal: tiene hambre, está sucia o está triste, y la
      mascota lo dice y lo pone en la cara.
- [ ] Los indicadores se calculan con la hora de la última vez (no hace falta que la app esté abierta).

## 5 · Apuntes

- [ ] Una pestaña de **Apuntes** con los puntos importantes de lo que has visto.
- [ ] Se guardan solos: lo del pizarrón (Explica), lo de las lecciones de tus planes y lo de los cursos.
- [ ] Hacer tus propios apuntes **con el pizarrón** y a mano.
- [ ] **Lápiz como ibisPaint / Photoshop:**
  - grosor, difuminado, transparencia y color;
  - punta que empieza delgada y termina gruesa, o delgada-gruesa-delgada (tinta de pluma);
  - pinceles hechos, y **crear y editar pinceles propios** (forma de la punta, espaciado, dispersión,
    presión, textura);
  - capas, borrador, deshacer, selección y mover.

## 6 · Tu personaje de perfil

- [ ] Un personaje propio (aparte de la mascota) que es tu foto de perfil y te distingue en el ranking y
      en amigos.
- [ ] Ropa y accesorios que se compran con cubitos.
- [ ] Más animales y cosméticos.

## 7 · Avisos y sonidos

- [ ] Recordatorios con notificación (estudiar, racha en peligro, examen cerca, la mascota tiene hambre).
      La Sala ya tiene avisos push (`sala/servidor/push.mjs`): se reusan.
- [ ] Más efectos de sonido. Los nuestros se hacen en `sala/sonidos/hacer.py`.

## 8 · Pizarrón con 200 a 300 elementos visuales nuevos

- [ ] Hoy hay 33 tipos (`ELEMENTOS` en `sala/lienzo.js`) y se repiten. Hay que sumar 200 a 300 variantes
      (familias nuevas y variaciones de las que hay) y que la IA no repita el mismo dos veces seguidas.

## 8-bis · Banco de imágenes por curso (Carlos, 13 nov)

- [ ] En el mismo banco de La Sala (`/banco`), una sección por curso con imágenes más específicas, variadas y
      técnicas (no «un corazón», sino «el sistema eléctrico del corazón»).
- [ ] Diagramas y **animaciones** que haga la IA: un corazón que late, la sangre que circula, una célula que
      se divide. Se pueden armar como piezas animadas del pizarrón (`sala/lienzo.js`).

## 9 · Varios cursos a la vez (semana de exámenes)

- [ ] Varios planes activos (programación, matemáticas, química, biología…) y cambiar entre ellos rápido.
- [ ] **Sesión de estudio:** media hora de cada uno, con pomodoros, y que pase sola al siguiente.

## 10 · Mejores imágenes

- [ ] Que no salgan sólo de Wikipedia, que muchas veces trae imágenes que no tienen nada que ver.
- [ ] Buscar en varias fuentes abiertas (Wikimedia Commons por búsqueda, Openverse, NASA, Smithsonian,
      el Met…).
- [ ] Que la IA revise que la imagen sí sea del tema antes de ponerla (Paulina ve imágenes).

## 11 · Idiomas (inglés y otros)

- [ ] Pronunciación: oír la palabra y decirla con el micrófono (reconocimiento de voz del teléfono).
- [ ] Escritura con **ortografía estricta**: en idiomas no hay tolerancia a errores de dedo.

## 12 · Animación de entrada

- [ ] Al abrir CARYMO, una entrada que se vea mamadora y den ganas de quedarse: el logo armándose, la
      mascota que llega. Una vez por sesión, que se pueda saltar con un toque y quieta con «reducir
      movimiento».
