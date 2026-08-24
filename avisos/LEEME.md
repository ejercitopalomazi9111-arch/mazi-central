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

Las materias, los maestros y los colores salen de **su horario real**, no de
suponer. Viven en `datos.js` y en ningún otro lado: si cambia el semestre, se
cambia ese archivo y ya. La herramienta no sabe nada de materias, sólo lee esa
lista.

| | |
|---|---|
| Química y Biología III | Michelle Ramírez |
| Geometría Analítica | Daniel Vázquez Alvarado |
| Programación y BD | Michelle Ramírez Almaraz |
| Física I enfoque STEAM | Daniel Vázquez |
| Inglés III | Valentín Hernández Salazar |
| Educación Física III | Diana Olvera Antonio |
| Metodología Inv. I STEAM | Omar Ávila Cruz |
| Humanidades III y Ética | Omar Ávila Cruz |
| Mto. de equipo y SO | Fernanda Rosas |
| TEC III | Fernanda Rosas Mendoza |
| Admón. y estructura de redes | Ricardo Carrillo Cue |

Más «Proyecto STEAM» y «Aviso general», que no son clases pero sí son avisos.

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

## Pruebas

19, corren solas al cargar. Revisan que ninguna materia se quede sin icono, que
el orden del periódico ponga lo de mañana primero, que ningún renglón se salga
de su tarjeta —eso no se ve hasta que el aviso ya se mandó—, que la imagen
crezca con el contenido, que las fechas salgan en español y que **ningún
control mida menos de 44 px**, que es el defecto que ya me pasó en Ligas Mazi.

Las pruebas escriben encima de lo que Carlos tenga, así que guardan y reponen.
