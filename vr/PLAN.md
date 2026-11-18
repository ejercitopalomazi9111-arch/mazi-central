# Mazi VR · el «Quest» propio

Carlos, 18 de noviembre: un visor de realidad virtual sin pantalla, su **iPhone 13** adentro y un **control de
PlayStation**. Se quiere: realidad mixta con la cámara (por un hoyo en el visor), manos rastreadas, el control
visto por la cámara para usarlo como mano o herramienta, cosas virtuales en su cuarto, moverse y girar, cine,
juegos (un modo tipo sables en VS Tiles), La Sala adentro, y **todo manejable sin sacar el teléfono del visor**
(con el control, con gestos o con los dos).

## Cómo se hace: web primero, app nativa después

Se arranca como **página (PWA)** en `vr/`, publicada con todo lo demás:

- Funciona hoy, sin Mac y sin pagarle a Apple.
- Se agrega al inicio del iPhone (Compartir → Agregar a inicio) y abre a pantalla completa, como app.

La **app nativa** (ARKit) se hace después, para lo que la página no puede:

- caminar de verdad;
- dejar cosas fijas en el cuarto;
- usar el giroscopio del control.

Para eso hacen falta dos cosas, las mismas que para subir CARYMO a la App Store:

- una Mac (puede ser rentada en la nube);
- la cuenta de desarrollador de Apple, de USD 99 al año.

## Lo que el iPhone NO deja, y la vuelta (verificado el 18 nov)

| Lo que se pidió | Qué pasa | La vuelta |
|---|---|---|
| Ver la pantalla del teléfono y otras apps adentro | **Apple no deja que una app muestre a otras apps**, ni web ni nativa | Lo que se quiera ver se trae adentro: videos, páginas, La Sala, juegos |
| Netflix y Crunchyroll | Su protección (DRM) **pinta negro** el video dentro de una escena 3D. Es a propósito y vale para cualquiera | Videos propios cargados al entrar; Netflix sólo en su app |
| Caminar de verdad (6 ejes) | Safari en iPhone **no tiene WebXR**; la página sólo sabe hacia dónde giras | Ahora se camina con el stick; con ARKit (nativa) se camina de a de veras |
| Giroscopio del control | Safari no lo da | Nativa (GameController lo da con el DualShock 4 y el DualSense) |
| Ni un toque | Para giroscopio, cámara y sonido el iPhone exige **un toque** cada vez que abre | Un toque en «Entrar» antes de meterlo al visor; después, todo con el control |

## Fases

1. ✅ **El visor** (18 nov). Ya hace esto:
   - pinta dos ojos y corrige la curva del lente;
   - mueve la vista con el giroscopio;
   - realidad mixta con la cámara (prefiere la ultra gran angular para que llene la vista);
   - el inicio en arco, con cine para videos propios y ajustes (lente, ojos, campo, tamaño, cámara), que se guardan;
   - se maneja con el control, y sin control, mirando fijo un botón.

   Pruebas: `node vr/pruebas.mjs`.
2. 🟡 **Las manos** (18 nov, primera parte). MediaPipe Hand Landmarker; el motor ya vivía en el repo, en
   `presentaciones/vendor/mediapipe`, y el modelo va en `vr/modelos/`.
   - **Hecho:** la mano se dibuja encima de la tuya y el índice es un puntero (la línea del ojo a la punta del
     dedo). **Pellizcar** elige y la **palma abierta** quieta un momento regresa. Las manos se apagan en Ajustes.
   - **Pruebas:** `node vr/pruebas-gestos.mjs` revisa los gestos con manos armadas a mano;
     `node vr/pruebas-manos.mjs` usa una foto real en la cámara simulada.
   - **Falta:**
     - el puño para agarrar y mover cosas;
     - que la cámara vea el control para usarlo como mano: barra de luz del DualShock 4, o una calcomanía de
       color en el DualSense.
2-bis. ✅ **El cine con la web** (18 nov). Un teclado en el visor que se maneja con el control, con las manos o con un
   teclado Bluetooth. Tiene cuatro puertas:
   - **YouTube:** busca La Sala (`/api/sala/vr/buscar`) y se ve con el reproductor oficial.
   - **Películas libres:** Internet Archive (dominio público).
   - **Enlace:** cualquier dirección: YouTube, un video directo o una página.
   - **Mis videos.**

   Lo de otros sitios no se puede pintar dentro de la escena, así que va **encima**, una copia por ojo. Las esquinas
   siguen al lente (`alLente` en `vr.js`), y el ojo derecho va callado, siguiendo al izquierdo.

   Pruebas: `node vr/pruebas-cine.mjs` y `node sala/servidor/pruebas-youtube.mjs`.

   **Ojo con el sonido:** el iPhone sólo deja sonar un video si hubo un toque.
   - Los videos directos se «desbloquean» al tocar Entrar.
   - YouTube puede arrancar callado. Lo destraba tocar la pantalla una vez o una tecla del control del visor si va en
     modo teclado.
   - Las páginas ajenas sólo se ven: no se puede tocar adentro.

2-ter. ✅ **Leer: INKWELL adentro** (18 nov). Lee lo que ya está bajado en el teléfono, sin internet:
   - **Tiras:** Webtoon (imágenes) y Wattpad (texto), sólo los capítulos bajados.
   - **Libros:** EPUB y TXT. El PDF todavía no.
   - Abre en el primer capítulo sin leer y sigue solo con el siguiente, como «Leer seguido».
   - Marca leído igual que INKWELL (la serie, el historial de la Biblioteca y el avance del libro).

   | Botón | Hace |
   |---|---|
   | Sticks arriba/abajo | leer (más empuje, más rápido) |
   | Flechas | una pantalla |
   | X | lee solo / pausa |
   | L1 / R1 | capítulo anterior / siguiente |
   | L2 / R2 | acercar / alejar |
   | Círculo | a la biblioteca (guarda dónde ibas) |

   Sin control, mirar la orilla de abajo de la ventana avanza; con las manos, igual apuntando.
   Pruebas: `node vr/pruebas-lector.mjs`.
3. **Sables en VS Tiles.**
   - Los bloques salen del ritmo de las canciones que ya tiene VS Tiles.
   - Se cortan con las manos o con el control visto por la cámara.
4. **La Sala adentro.**
   - Las sillas como figuras alrededor y el hilo en un panel.
   - Hablar con la voz (micrófono; la regla ya está en `_headers`).
5. **La app nativa** con ARKit:
   - caminar de verdad y anclar cosas en el cuarto;
   - las manos con Vision;
   - el giroscopio del control.

## Controles

| Botón | Hace |
|---|---|
| X | elegir · pausa en el cine |
| Círculo | atrás |
| Triángulo | realidad mixta sí/no |
| Cuadrado | recentrar (el menú queda enfrente) |
| Options | al inicio |
| Flechas | mover la selección · en ajustes, cambiar valores · en el cine, acercar/alejar la pantalla |
| L1 / R1 | −10 s / +10 s en el cine |
| Stick izquierdo | caminar (en el cuarto virtual) |
| Stick derecho | girar a saltos de 30° (marea menos que girar suave) |

En la computadora, el teclado hace de control para probar:

- Enter = X, Esc = Círculo, R = Cuadrado, M = Triángulo, H = Options;
- las flechas son las flechas, y Q/E son L1/R1;
- el ratón gira la cabeza.

## Falta de Carlos

- **Marca y modelo del visor.** Sirve para el lente; si trae un código QR de Cardboard, una foto.
- **¿DualShock 4 o DualSense?** Decide cómo la cámara encuentra el control.
