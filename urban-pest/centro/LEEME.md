# El centro de operaciones · Urban Pest

La app de control del dueño (BRIEF §C). La pantalla y sus rutas las hizo Sylcred el 12 de
noviembre; el 13 Godines le puso **que funcione sin internet**, **datos de muestra** para probarla
de pie y **las dos compuertas** de la skill `app-de-campo`.

## Probarlo ahora, sin servidor

Abre `urban-pest/centro/?muestra`. Todo funciona de verdad (marcar hecho, cobrar, sacar insumo,
registrar revisión) sobre datos que dicen «de muestra». Nada sale del teléfono y nada es del
cliente: lo que sólo él sabe va como **FALTA** (registro de cada producto, placas).

## Cómo funciona sin internet

| Pieza | Qué hace |
|---|---|
| `sin-red.js` | Guarda en el teléfono lo que llega con señal (la réplica). Sin señal contesta desde ahí, aplica lo que el dueño hace y lo apunta en una cola que se manda en orden al volver |
| `motor.js` | **Copia exacta** de `servidor/src/centro.js`: sin señal rigen las mismas reglas (seguimiento a 15 días, garantía a $0, el inventario no queda en negativo). No se edita: se vuelve a copiar |
| `sw.js` | Guarda la página, el estilo y los íconos para que abra sin señal. Un cambio publicado se ve en la segunda apertura |
| `muestra.js` | Los datos de `?muestra` |

Arriba de la pantalla sale una franja sólo cuando hay algo que decir: «Sin internet. Ves lo
guardado el…», «2 cambios por enviar», o «No entró: … (y por qué)». Lo que el servidor rechaza al
volver la señal **nunca se pierde callado**.

## Las compuertas (las dos se vieron rojas rompiendo el código a propósito)

```
node urban-pest/centro/pruebas.mjs            # el motor sin red: 32 comprobaciones
node urban-pest/centro/pruebas-pantalla.mjs   # la pantalla con Playwright, sin internet de verdad, «Calcular», uso fácil y los recorridos: 56
```

Si `pruebas.mjs` dice que `motor.js` ya no es copia exacta, es que cambiaron las reglas del
servidor: `cp urban-pest/servidor/src/centro.js urban-pest/centro/motor.js` y volver a correr.

## Lo que falta, dicho derecho

1. **Un cambio puede llegar dos veces** si la señal se cae justo después de mandarlo y antes de
   recibir la respuesta. La ventana es chica, pero en inventario duplica una salida. Cada cambio
   ya viaja con un `idem` único; falta que el servidor lo use (guardar `idem:<id>` unos días y
   contestar lo mismo si se repite). Es del servidor, de Sylcred.
2. **«Hoy» en el servidor es el día de Londres, no el de Querétaro.** `index.js` llama
   `tablero(A)`, `numeros(A)`, `estadoCita(A, b, quien)` y `listarVehiculos(A)` sin pasar la
   fecha, y el valor por omisión es `new Date().toISOString()` (UTC). Desde las 6 de la tarde el
   tablero con señal ya enseña los servicios de mañana como «de hoy» y los de hoy como atrasados.
   Sin señal este centro usa la fecha del teléfono, que es la correcta. También es del servidor.
3. **Los números del mes y lo que hizo el bot** no se pueden recalcular sin señal: se enseña lo
   último que se bajó.
4. **Chat central, cotización a mano y carpeta** son otras páginas: todavía necesitan internet.
5. **FALTA del cliente:** el registro de cada producto, las placas y los mínimos reales de su
   inventario.

## La cara (15 nov, Godines)

Luis: «se ve muy mal, hazlo de acuerdo a la estética, con animaciones e imágenes». El centro ya no usa el verde
genérico del chat: lleva la marca de Urban Pest, la misma de su página (`../web/LEEME.md`).

- **Colores:** marino `#143361`, azul `#165D9B`, naranja `#F29923`. Los tokens del chat se redefinen aquí; la hoja
  `../chat/estilo.css` no se toca.
- **Letras:** Archivo (títulos y cifras) e Inter (lo demás), en `fuentes/`.
- **Logo:** en piezas (`marca/`, las cortó Luna). Al entrar se arma pieza por pieza y sube la cortina, una vez por
  sesión; no bloquea los toques. `sello.webp` y `palabra-clara.webp` son el logo para fondo azul.
- **Fotos:** las dos de la página nueva (Pexels) en duotono marino: `ciudad.webp` en «Hoy» y `planta.webp` en
  Inventario. Nada de insectos ni de fumigadores (Carlos, 11 nov). Los dibujos de cada sección son SVG hechos aquí.
- **Movimiento:** sólo transform y recortes; con «reducir movimiento» se mueve menos, sin apagarse.
- Todo va en el cascarón de `sw.js` (v2): sin internet abre igual, con su cara.

## Cotizar: su Excel dentro del centro (17 nov, Godines)

La sexta pestaña. Es su «CorridaCotizacion.xlsx» hecha pantalla:

- **«Cargar tu Excel».** El teléfono lo lee (`excel.js`, sin dependencias: un .xlsx es un ZIP con XML) y guarda en
  su servidor SÓLO el catálogo (90 productos con costo, envase y dosis), su fórmula y qué producto usa en cada
  plaga. La lista de clientes no se lee. El Excel no entra al repo: es público. Si cambia precios, lo vuelve a cargar.
- **La corrida** (`cotizar.js`): horas, km y lo que se aplica (plaga → su producto de siempre, cantidad en litros de
  mezcla, bloques, m²…). Da su «Cotización» con SU fórmula, AL CENTAVO como su columna T (sin redondear), el desglose (químicos, técnico,
  camioneta), su reparto de costos y utilidad y, de comparación, lo que daría su hoja JADP. Probada contra filas de su Excel: da
  lo mismo al centavo (las filas 630 y 636 de la convencional y la 9 de JADP).
- **«Hacer la hoja para el cliente».** Usa `POST /api/cotizaciones` (la cotización a mano): el cliente ve un solo
  renglón con el precio; el desglose es del dueño. Sale el link y el botón para mandarlo por WhatsApp.
- **Sin internet** cotiza con lo último bajado (copia en el teléfono). Hacer la hoja sí pide señal.
- **Con `?muestra`** trae productos y números DE MUESTRA (`EXCEL_MUESTRA` en `muestra.js`). Ahí también se puede
  cargar su Excel de verdad: se queda en ese teléfono y no se manda a ningún lado.

El bot cotiza con lo mismo (`servidor/RUTAS.md`, «Su Excel»).

**La distancia (23 nov, Godines).** Debajo de «Kilómetros», **«Calcular»** toma la zona, pregunta `GET /api/distancia` y
llena los km de IDA por carretera desde la bodega, como su Excel («Juriquilla · norte · 18.5 km por carretera»). El renglón
**«La camioneta sale de»** guarda la bodega con `POST /api/salida` y dice qué dirección entendió el mapa. **FALTA del cliente:
la dirección de su bodega**; sin ella, «Calcular» dice la zona y el rumbo y pide la bodega. Con `?muestra` no se calcula
(no hay servidor). En «Números», el traslado de cada cotización del bot dice con qué km se cotizó.

## Fácil de usar, y nada aparece de golpe (23-26 nov)

Luis: «que lo use perfectamente un señor de 45 hasta 70, 80 o 90 años, e incluso un niño» y «ningún elemento aparezca
de la nada: todo se transforma en su siguiente fase». Medido con Playwright a 360, 390, 768 px y con la letra al 200 %.

- **Letra:** cuerpo de 17 px y nada que se lea abajo de 15 px; la barra de abajo va a 13-14 px con su ícono y, si de
  plano no cabe (letra al 200 %), se desliza de lado con la pestaña en la que estás siempre a la vista.
- **Dedos:** botones de 52 px, filtros y atajos de 48-52, y 12 px entre uno y otro.
- **Palabras:** «Cobrados», «en 5 días», «piezas», «+ Entró / − Salió», «Lo último: salieron 17». «pzas» sigue siendo
  como lo guarda el motor (es copia del servidor): sólo cambia en pantalla.
- **Antes de lo que no tiene vuelta, se pregunta:** «Cancelar servicio» se convierte en «Sí, cancelarlo» y el botón de al
  lado en «No, déjalo así». Un error se queda escrito en la tarjeta, no en una ventanita.
- **Transiciones** (`transicion()`, `claves()`, `flip()` en `index.html`): View Transitions donde existe y FLIP a mano
  donde no (Safari 17). La pestaña se desliza hacia su lado; al tocar algo, cada tarjeta es la MISMA y viaja a su lugar
  nuevo, la que se va sale de lado, las cifras cuentan desde lo que decían y el nivel del insumo baja desde donde
  estaba. 150-250 ms, sólo transform (la opacidad, sólo en lo que se va o llega, completa a la mitad del viaje).
  La pantalla nueva se arma escondida y se cambia de un jalón: la vieja nunca se queda en blanco esperando datos.
- **«Reducir movimiento»** apaga todo lo de este apartado (ni View Transitions, ni FLIP, ni el nivel). Lo de antes
  (la entrada corta de cada pantalla, el logo) sigue como se decidió el 14 nov: reduce, no apaga.
- Las pruebas (`pruebas-pantalla.mjs`, parte 4) lo vigilan: objetivos de 48 px, texto de 15 px, que «Cancelar» pregunte,
  que las transiciones corran, que con «reducir movimiento» no corra ninguna y que con la letra al 200 % nada se salga.

## Los recorridos: cada cosa se convierte en su siguiente paso (26 nov)

Carlos: «no hablo de la letra; hablo del FLUJO… y hazlo muy bonito». Lo que se toca se transforma EN SU LUGAR (View
Transitions con el mismo `view-transition-name` antes y después, recortado a su borde; FLIP donde no hay):

| Recorrido | Cómo va | Toques (antes → ahora, con los mismos datos) |
|---|---|---|
| Agendar | el botón naranja «Agendar un servicio» crece y se vuelve un panel marino de 5 pasos: ¿para quién? → ¿qué plaga? (un toque) → ¿dónde? → ¿cuándo? (Hoy / Mañana / pasado, un toque) → ¿cuánto? con el resumen. Al «Agendar», el panel se encoge y se vuelve la tarjeta en su lugar de la lista, a la vista y marcada | 10 → 10 (ya no se escribe la plaga ni se abre el calendario; una pregunta por paso) |
| Hacer y cobrar | la tarjeta de hoy se abre en su detalle (Llamar, WhatsApp, Cómo llegar). «Ya lo hice» se vuelve «¿Cuánto te pagó?» con el precio puesto; «Ya me pagó $500» o «Me paga después». La tarjeta viaja a «Cobrado hoy» o a «Por cobrar» y su revisión de 15 días se agenda sola | 2 → 2 (y ahora apunta cuánto pagó) |
| Cobrar | en «Por cobrar», «Ya me pagó $500»: un toque y la tarjeta viaja a «Cobrado hoy»; la cifra del día cuenta | 1 → 1 |
| Cotizar | el precio se arma a la vista (cuenta desde lo que decía); «Mandar al cliente» convierte el cuadro del precio en la hoja que va a ver el cliente, con «Mandar por WhatsApp» y «Hacer cambios» | 5 → 5 |
| Inventario | «Salió» / «Entró» se vuelve un paso corto: ¿cuántos? con − / + y 1, 2, 5, 10; la barrita y el número bajan desde donde estaban | 3 → 4 (sin teclado: 1, 2, 5, 10 de un toque) |

En Servicios, la tarjeta que deja la lista se encoge en su filtro («Por cobrar 2»). Siempre UNA acción naranja por
paso y «Atrás» por el mismo camino. Las tiras cuadro por cuadro se sacan con Playwright (ver la parte 5 de las pruebas).

