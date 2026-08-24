# Avisos y tareas · 3.1

La herramienta de Carlos como **jefe de grupo**. Se escriben los pendientes y
escupe **una imagen** lista para el chat del grupo, con el formato de la
escuela, un icono por materia y otro por tipo de pendiente.

**Vive en** `avisos/index.html`. Sin build, sin servidor, sin librerías.

## El problema que resuelve

Cada tarde arma el aviso del grupo. Unas veces lo escribe a mano en la libreta
y le toma foto; otras lo diseña, y eso le cuesta media hora. Las dos formas
tienen el mismo defecto: la información se pierde, no se puede buscar, y cada
aviso se ve distinto del anterior.

## Por qué IMAGEN y no texto

El chat del grupo es de WhatsApp. Un texto largo se pierde entre mensajes; una
imagen se ve completa de un vistazo, se guarda y se reenvía. **Es el formato
que Carlos ya usaba** — esto no cambia su método, le quita el trabajo manual.

## Los datos del grupo

Las materias y los colores salen de **su horario real**, no de suponer. Viven en
`datos.js` y en ningún otro lado: si cambia el semestre, se cambia ese archivo y
ya. La herramienta no sabe nada de materias, sólo lee esa lista.

Química y Biología III · Geometría Analítica · Programación y BD ·
Física I enfoque STEAM · Inglés III · Educación Física III ·
Metodología Inv. I STEAM · Humanidades III y Ética · Mto. de equipo y SO ·
TEC III · Admón. y estructura de redes.

Más «Proyecto STEAM» y «Aviso general», que no son clases pero sí son avisos.

### Aquí NO va el nombre de quien imparte

Lo hubo, y **no lo leía nadie**: ni la ficha, ni el cartel, ni una sola prueba.
Eran los nombres completos de ocho maestros reales publicándose en un sitio web
y en un repositorio público a cambio de nada.

La pista de que estaba muerto la daba el propio archivo: **tres personas
aparecían escritas de dos formas distintas** —unas veces con el segundo
apellido y otras sin él—. Si alguien lo hubiera visto en pantalla alguna vez,
se habría notado.

Si algún día la ficha va a mostrar quién imparte, se vuelve a añadir — pero con
el repositorio ya en privado (`DESPLIEGUE.md` · paso 4). El alumno del 3.1 no
necesita el apellido de su maestro para saber qué materia le toca: para eso
están el nombre de la materia, su color y su icono.

## De quién viene, cuando no viene de una materia

Carlos: *«muchas veces dirección da avisos y me gustaría poder ponerlos allí
mismo».* Un aviso de dirección **no es de una materia**: no tiene tarea, no
tiene maestro y pesa distinto. Por eso hay tres entradas propias —
**Dirección**, **Prefectura** y **Sociedad de alumnos** — con su icono y su
color, en vez de disfrazarlas de «Aviso general».

## «Muy importante»

Cualquier pendiente se puede **destacar**. Los destacados:

1. **suben hasta arriba**, antes que lo de mañana — si un aviso de dirección
   queda enterrado a la mitad, da igual haberlo puesto;
2. se pintan **a color entero** con letra crema. Si sólo cambiaran de lugar, en
   un aviso de doce pendientes nadie notaría cuál es el importante.

Es lo que en los avisos que hacía Carlos a mano era la banda de «MUY
IMPORTANTE».

## Los iconos NO son emoji

Están dibujados con trazos en `iconos.js`. La razón: cada teléfono dibuja sus
propios emoji, así que el mismo aviso se vería distinto en el de Carlos y en el
de un alumno — y al pasarlo a imagen se congela el del aparato que lo generó.
Éstos se ven igual en todos lados porque los dibujamos nosotros.

Son 19: uno por materia y uno por tipo de pendiente.

## Dos decisiones que parecen chiquitas y no lo son

**La fecha arranca siempre en hoy, los pendientes NO se borran.** Casi siempre
el aviso de hoy es el de ayer con dos cosas cambiadas, así que la lista se
queda y sólo se edita. Pero si la fecha también se guardara, el error más fácil
del mundo sería mandar el aviso de hoy fechado ayer, y nadie revisa eso antes
de darle enviar.

**Al escribir el título la ficha NO se redibuja.** Sólo se redibuja al cambiar
materia, tipo o «para cuándo», que son los que cambian el icono. Si se
redibujara con cada letra, el teclado del teléfono se cierra a media palabra.
Se descubrió probándolo con un navegador de verdad, no leyendo el código.

## La imagen

Se arma con `canvas` en dos pasadas: la primera **mide** para saber qué alto
necesita, la segunda **dibuja**. Sin la pasada de medición habría que adivinar
el alto, y con contenido variable eso siempre sale mal por un lado o por el
otro.

Sale a **2160 px de ancho** — nítida en cualquier teléfono. En iPhone el botón
de descarga a veces no hace nada, así que además se enseña la imagen:
manteniéndola apretada se guarda o se comparte, y esa vía funciona en todos
lados.

## Diez plantillas, porque no todos los días son iguales

Carlos hace avisos de cinco pendientes y avisos de sesenta. **No se leen igual.**
Y mandar el mismo cartel idéntico todos los días hace que la gente deje de
mirarlo.

| Plantilla | Cómo es | Aguanta |
|---|---|---|
| **Tablero** | Tarjetas grandes, una columna | ~12 |
| **Periódico** | Dos columnas | ~34 |
| **Lista** | Un renglón por pendiente | los días de muchísimo |
| **Pizarrón** | Fondo oscuro, letra clara | ~12 |
| **Gaceta** | Tres columnas apretadas | ~60 |
| **Cuaderno** | Papel de libreta, bandas azules | ~12 |
| **Urgente** | Todo en rojo, apretado | ~34 |
| **Dos y media** | Dos columnas con tarjetas grandes | ~20 |
| **Boleta** | Una columna angosta, como un recibo | ~16 |
| **Mural** | Cuatro columnas, para pegar en la pared | ~80 |

**No son diez pieles del mismo cartel:** cada una cambia algo que se nota —
columnas, si va apretada, el color del papel, el de las bandas. Hay una prueba
que lo mide: si dos plantillas acaban con la misma huella, falla.

## Tipografía

Cinco, y **sólo las que existen en cualquier aparato**. El cartel se convierte
en imagen en el teléfono de Carlos, así que una tipografía de internet saldría
cambiada por otra sin avisar. Hay una prueba que rechaza cualquier familia que
apunte a un servidor.

## El color del recuadro

Cada materia **tiñe su tarjeta un 9 %** y colorea su orilla. Poco a propósito:
si el tinte pesa, seis tarjetas seguidas parecen un arcoíris y deja de leerse
cuál importa. Hay dos pruebas — que los tintes sean distintos entre sí, y que
cada uno siga pareciéndose al papel (contraste menor a 1.35).

## Un defecto que sólo salió con la plantilla oscura

Los colores de materia están hechos **para papel claro**. En «Pizarrón»,
«GEOMETRÍA» en azul marino sobre una tarjeta azul marino **no se leía**. Ahora
el color se aclara automáticamente hasta pasar 4.5:1 contra el fondo que le
toca, y la prueba lo mide en **las diez plantillas × las dieciséis materias**,
no en una.

## Crece en todas direcciones, no sólo hacia abajo

Carlos: *«no hagas que crezca solo hacia abajo, haz que lo haga en todas
direcciones».* Tenía razón: con muchos pendientes de mucho texto, un lienzo de
ancho fijo se vuelve una tira de veinte mil píxeles que nadie scrollea. **Un
periódico no se hace más largo — se hace de más columnas.**

Así que el **ancho de columna se queda quieto** —eso es lo que mantiene el texto
del mismo tamaño y por tanto igual de legible— y lo que crece es el **número de
columnas**. Más columnas = lienzo más ancho y más bajito, hasta seis.

Medido con 40 pendientes de mucho texto cada uno (cinco renglones de detalle):

| Plantilla | Antes · ancho fijo | Ahora |
|---|---|---|
| Tablero | 21 834 px de alto | 8 352 × 10 960 · **1:1.31** |
| Periódico | — | 6 288 × 13 778 · 1:2.19 |
| Lista | — | 5 256 × 8 000 · **1:1.52** |

## «Sigue vigente»

Hay avisos de dirección que valen un día y otros que valen semanas. Los de
semanas se marcan como **fijados**: llevan un sello «SIGUE» y **no se borran al
vaciar la lista**. Los de semanas no se pueden estar reescribiendo cada tarde.

Es distinto de «Muy importante»: uno es cuánto **pesa**, el otro cuánto **dura**.
Un pendiente puede ser las dos cosas, una, o ninguna.

## Tres defectos que sólo salieron RENDERIZANDO

1. **El texto impreso encima de sí mismo.** En la plantilla Lista el título va
   en negritas y los detalles en normal, pegados en el mismo renglón. El primer
   intento dibujaba todo el renglón en normal y encima el título en negritas —
   pero las negritas son más anchas, así que no coinciden y sale un borrón. Se
   arregló con `fluir()`, que acomoda trozos de distinta fuente en un párrafo.

2. **El encabezado de la tarjeta se encimaba.** En columna angosta
   «PROGRAMACIÓN» se montaba sobre «Examen · JUE 3 SEP». Ahora la tarjeta mide
   los dos y, si no caben, baja la etiqueta a su propio renglón — en vez de
   recortar el nombre de la materia, que es lo que el alumno usa para encontrar
   lo suyo.

3. **Una prueba que no probaba nada.** La de «una banda nunca se queda sola al
   pie de una columna» pasaba igual con el defecto puesto: con pendientes de
   verdad ese caso **no ocurre nunca** —se barrió de 4 a 28 pendientes sin la
   guarda y no salió ni uno—, porque una banda mide 40 px y el corte casi
   siempre lo cruza una tarjeta. Ahora se le da al reparto una lista armada a
   propósito para que el corte caiga justo ahí. Se prueba el contrato, no la
   suerte de los datos.

## Los colores se miden, no se escogen a ojo

El color de la materia se usa como **texto chico** sobre el papel, y en una
ficha destacada el **texto crema va encima del color**. Las dos veces tiene que
pasar 4.5:1.

Al medirlos salieron dos malos: el dorado de Metodología daba **3.07** —o sea
que no se leía— y Prefectura era exactamente el color de la banda de «Muy
importante», así que la tarjeta se fundía con su propio encabezado. Ninguno de
los dos se ve a ojo; salieron midiendo, y ahora hay una prueba que los mide.

## Pruebas

51, corren solas al cargar. Revisan que ninguna materia se quede sin icono, que
el orden del periódico ponga lo de mañana primero, que ningún renglón se salga
de su tarjeta —eso no se ve hasta que el aviso ya se mandó—, que la imagen
crezca con el contenido, que las fechas salgan en español y que **ningún
control mida menos de 44 px**, que es el defecto que ya me pasó en Ligas Mazi.

Las pruebas escriben encima de lo que Carlos tenga, así que guardan y reponen.
