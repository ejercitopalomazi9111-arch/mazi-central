---
name: foco-y-teclado
description: Recorrer una pantalla entera sólo con el teclado y arreglar lo que aparece — anillo de foco visible, orden lógico, trampas de foco en modales, y todo lo accionable alcanzable. Úsala antes de entregar cualquier pantalla, al añadir un modal o un menú, y cuando alguien no pueda usar algo sin ratón.
---

# El recorrido con teclado

Es la revisión más barata que existe y la que más defectos reales encuentra.
Diez minutos, sin herramientas.

## El procedimiento

1. Cargar la pantalla y **soltar el ratón**.
2. Pulsar Tab desde el principio hasta el final.
3. En cada parada anotar: **¿se ve dónde estoy?** y **¿tiene sentido que sea el
   siguiente?**
4. Activar con Enter y con Espacio.
5. Salir con Escape de todo lo que se abra.

## Lo que reprueba

**No se ve el foco.** El defecto más común, y casi siempre por un
`outline: none` sin sustituto. Anillo propio de 2–3 px, `outline-offset` de 2 px
para que no se confunda con el borde del elemento, y `:focus-visible` para que
no salga al hacer clic con el ratón.

**El orden no sigue a la lectura.** Suele venir de posicionar con CSS algo que
en el marcado está en otro sitio. Se arregla en el marcado, no con `tabindex`
positivo — que además rompe el orden del resto de la página.

**Hay algo accionable que Tab no alcanza.** Casi siempre un `div` con un
escuchador de clic. Se convierte en `button`: se gana foco, Enter, Espacio y el
rol, gratis.

**El modal no atrapa el foco.** Se abre y Tab sigue recorriendo la página de
detrás. El modal necesita: foco al abrir, ciclo dentro, Escape para cerrar,
`inert` o equivalente sobre el resto, y **devolver el foco** al elemento que lo
abrió.

**El menú desplegable no se recorre con flechas.** En un combo o una lista de
sugerencias, las flechas mueven la **opción activa** mientras el foco real se
queda en el campo de texto. Mover el foco a la lista rompe la escritura.

**Hay un salto de contenido y no hay «saltar al contenido».** En un sitio con
navegación larga, el primer Tab debería ofrecer saltársela.

## Lo que no cuenta como pasar

Que funcione con ratón. Que el lector de pantalla lo lea. Que «se vea el
elemento activo» porque cambió de color: **el cambio de color no es foco** si
no se distingue del estado de cursor encima.

## La comprobación que se puede automatizar

Recorrer todos los elementos enfocables y comprobar que cada uno tiene un
estilo de foco distinto del de reposo. Es una prueba que sí puede reprobar, a
diferencia de «revisamos accesibilidad».

## Neuronas relacionadas

`accesibilidad`, `navegacion`, `interfaz`, `gestos`, `bordes`. En el cerebro:
`sombra-de-foco-no-es-decorativa`, `outline-offset-para-que-se-vea`,
`el-teclado-no-recorre-las-sugerencias`.
