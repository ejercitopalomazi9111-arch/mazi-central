# Toydarians · las dos listas de 20

Lo pidió Carlos: *«ponte una lista de 20 cosas para hacer y una a godines y
trabajen ambos en ello»*.

El reparto sale del [`CONTRATO.md`](CONTRATO.md): **Godines manda en el contenido
y la estructura, Sylcred en el movimiento y la medición.** Cada lista es de quien
la encabeza — el otro no la toca sin decirlo.

**Están ordenadas.** La 1 de cada lista es la que más cambia la página; la 20, la
que menos. Si sólo da tiempo de cinco, son las cinco primeras y no cinco
cualesquiera.

Se marca `[x]` al terminar, **y sólo después de correr la compuerta y mirarlo.**

---

## Lista de Sylcred · movimiento, medición y detalle

### Lo que se ve de inmediato

- [ ] **1 · La intro dura 5 s y bloquea el scroll.** Tiene botón SALTAR, así que
      hay salida — pero cinco segundos en un teléfono es una eternidad y Carlos
      ya tumbó una vez el scroll secuestrado. Bajarla a ~1.8 s, y que la segunda
      visita del mismo aparato la salte sola con `sessionStorage`. **Acuerdo con
      Godines: la intro es suya, esto se propone, no se impone.**
- [ ] **2 · Nada anuncia que la ficha se puede abrir.** Las tarjetas dicen «VER A
      DETALLE» pero no se mueven al pasar el dedo ni al enfocar. Falta el estado
      de reposo→encima→activo, que es lo que hace que una rejilla se sienta viva.
- [ ] **3 · El «+4» de las fotos no invita a nada.** Es la señal de que cada
      ficha tiene galería y hoy es una etiqueta muerta. Que se note que se puede
      abrir.
- [ ] **4 · El escalonado sólo entra, nunca sale.** Al subir de vuelta, todo ya
      está puesto. Un segundo pase —más sutil— haría que la página se sienta
      viva en las dos direcciones sin marear.
- [ ] **5 · La barra no reacciona al scroll.** Ni se compacta ni marca en qué
      sección estás, y hay cuatro secciones largas. Un indicador de posición
      cuesta poco y orienta mucho.

### Detalle y oficio

- [ ] **6 · Los botones no tienen estado «pulsado».** En teléfono, sin `:active`
      visible, la gente toca dos veces porque no sabe si registró.
- [ ] **7 · Falta el estado de foco visible en las tarjetas.** Hay
      `:focus-visible` global, pero no se probó recorriendo la página entera con
      teclado. Hacerlo y arreglar lo que aparezca.
- [ ] **8 · Las 282 fotos entran todas de golpe.** Ninguna lleva `loading="lazy"`
      ni `decoding="async"`. En un teléfono con datos eso se paga en la primera
      pantalla. Medir antes y después, no suponer.
- [ ] **9 · El polvo WebGL cuelga de un `id="polvo"` que no existe.** 900
      partículas y dos shaders que nunca se dibujan. **Decide Godines** si se
      enchufa o se quita; yo lo mido y lo dejo listo para cualquiera de las dos.
- [ ] **10 · Falta la comprobación de `getElementById` huérfanos en la
      compuerta.** Es lo que habría cazado el punto 9 solo. Quedó a medias y hay
      que terminarla o quitarla — a medias no sirve.
- [ ] **11 · La compuerta no mide proporción de imagen.** El logo estirado pasó
      por delante de ella sin que dijera nada. Comparar natural contra pintada,
      **saltándose las que llevan `object-fit`** — si no, da falsos positivos:
      ya me pasó al medirlo a mano.
- [ ] **12 · Ni un solo `prefers-reduced-motion` probado de punta a punta.** Está
      declarado, pero sólo se comprobó en el revelado. Recorrer la página entera
      con la preferencia puesta.

### Rendimiento y aguante

- [ ] **13 · La página pesa 371 KB y mide 26 000 px de alto en teléfono.**
      Medir el tiempo hasta que se ve algo, y decidir con el número.
- [ ] **14 · Las otras dos tipografías siguen por `<link>` a Google.** Bungee ya
      está empotrada; éstas no, y son ~200 KB. Medir cuánto cuesta de verdad
      empotrar sólo los pesos que se usan.
- [ ] **15 · Nadie ha probado la página con la red lenta.** Es el caso normal de
      un teléfono en la calle, que es donde va a estar el cliente.
- [ ] **16 · El scroll no se ha medido en fotogramas.** «Se siente fluido» no es
      un dato; hay que ver si algún efecto tira frames en un teléfono modesto.

### Lo que nadie ha mirado

- [ ] **17 · La página no se ha visto en horizontal.** Un teléfono girado es un
      ancho que no está en la compuerta (390 / 768 / 1440).
- [ ] **18 · Ni en pantalla grande de verdad.** A 1920 px puede quedar un vacío
      enorme a los lados, que es exactamente lo que le pasó a Ligas Mazi.
- [ ] **19 · Falta el favicon y las etiquetas para compartir.** Cuando alguien
      mande el link por WhatsApp hoy no sale nada. Es lo primero que verá el
      cliente.
- [ ] **20 · No hay una neurona de este proyecto en el Cerebro.** Cuatro
      defectos de hoy —el generador muerto, la compuerta que no corría, el logo
      estirado, los selectores inventados— son de los que se repiten. Si no se
      guardan, se pagan otra vez.

---

## Lista de Godines · contenido, estructura y datos

Propuesta, no orden: **es su territorio y él decide el orden.** Sale de leer la
página y de lo que ya dijo en la sala.

### Lo que la página pide a gritos

- [ ] **1 · Dos fichas siguen en «FOTO PENDIENTE».** Es lo único que se ve
      inacabado en una página por lo demás terminada.
- [ ] **2 · La intro: decidir su duración.** Ver el punto 1 de mi lista. Es suya.
- [ ] **3 · El `id="polvo"`.** Enchufarlo o quitarlo. Hoy son 900 partículas que
      viajan en cada carga y no dibujan nada.
- [ ] **4 · Las categorías están extraídas pero no puestas.** Sacaste el menú
      real —Hasbro, GI Joe, Mattel, Disney, NECA, Funko con sus subcategorías— y
      la página todavía no las usa para navegar.
- [ ] **5 · El índice de 47 renglones no se puede filtrar ni buscar.** Con 381
      números y 15 tramos, encontrar uno concreto es imposible hoy.

### Contenido que falta

- [ ] **6 · No hay ninguna pieza agotada o «ya no está».** Un coleccionista
      quiere saber qué se perdió, y eso es contenido que el cliente ya tiene.
- [ ] **7 · Los precios no aparecen.** Decidir con Carlos si van: cambia por
      completo qué es la página.
- [ ] **8 · No se dice cuándo se actualizó el catálogo.** En una vitrina de
      coleccionista, la fecha es información de confianza.
- [ ] **9 · Falta el «cómo comprar».** La página manda a la tienda pero no
      explica el paso siguiente.
- [ ] **10 · No hay nada del cliente: quién es, dónde está, desde cuándo.** Es lo
      que separa una tienda de un catálogo.

### Estructura

- [ ] **11 · 26 000 px de alto en teléfono es mucho para una sola página.**
      Quizá el índice completo merece su propia vista.
- [ ] **12 · La cabecera no dice de qué va la página en una frase.** Hoy hay que
      leer tres secciones para entenderlo.
- [ ] **13 · No hay pie con contacto ni enlaces reales del cliente.**
- [ ] **14 · Los textos no se han revisado en voz alta.** Carlos escribe con muy
      buen oído y aquí hay frases que se leen a medias.
- [ ] **15 · El aurebesh se usa de adorno pero nunca se explica.** Es la mejor
      pieza de identidad que tiene el cliente y está sin contar.

### Datos y taller

- [ ] **16 · `fotos.json` no dice de dónde salió cada foto ni cuándo.** El día
      que el cliente cambie una, no habrá cómo saber cuál está vieja.
- [ ] **17 · Nada valida el catálogo antes de generar.** Un VC repetido o un
      enlace roto entra sin que nadie chille.
- [ ] **18 · `GUIA-FOTOS.md` está escrita y el cliente no la ha visto.** Es la
      que hace que las próximas fotos lleguen usables.
- [ ] **19 · No hay forma de añadir una pieza sin tocar Python.** Si esto se
      entrega, alguien tendrá que mantenerlo.
- [ ] **20 · El repo `toydarians` sigue sin existir.** Lo intentamos los dos y
      los dos rebotamos con 403: **lo tiene que crear una persona.**

---

## Lo que no es de ninguno de los dos

| Qué | De quién |
|---|---|
| Crear el repo `toydarians` en GitHub | **Carlos o Luis.** Los dos agentes rebotan con 403 |
| Decidir si van precios | **Carlos**, es de negocio |
| Pedirle al cliente las fotos que faltan | **Carlos o Luis** |
| Dar por bueno el resultado ante el cliente | **Carlos** |

---

*Cada punto se cierra con la compuerta corrida y la pantalla mirada. Un `[x]`
puesto por haber escrito el código es exactamente el defecto que este proyecto
lleva todo el día pagando.*
