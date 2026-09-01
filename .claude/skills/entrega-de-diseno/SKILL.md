---
name: entrega-de-diseno
description: La compuerta antes de decir que una pantalla está lista — la lista completa de lo que tiene que ser cierto, con la regla de que leer el código no cuenta y que cada punto se comprueba mirando o midiendo. Úsala SIEMPRE antes de entregar, antes de decir «ya quedó», y cuando haya que decidir si algo se puede enseñar al cliente.
---

# La compuerta de entrega

Nada se entrega sin pasar esto. **Leer el código no cuenta**: cada punto se
comprueba mirando la pantalla o midiendo.

## 1 · Se mira, no se lee

- [ ] Captura a **390 px** y a **1440 px**.
- [ ] Recorrido real de la pantalla, no del código.

El defecto que se cazó mirando y que ninguna prueba veía: un icono de 544 px de
ancho que se estiraba a exactamente el ancho de su panel. No desbordaba, así que
la comprobación de desbordes lo dejaba pasar. **«No se desborda» no es «mide lo
que debe».**

## 2 · Proporciones

- [ ] La página **no se va de lado** en ningún ancho.
- [ ] Nada se sale de su contenedor.
- [ ] Ningún control mide menos de **44 px**.
- [ ] Ningún botón parte su nombre en dos renglones.
- [ ] Los `input` son de **16 px o más** (si no, iOS hace zoom solo).

## 3 · Contraste y color

- [ ] Cada par texto/fondo medido contra el fondo **real**.
- [ ] Bordes de controles a **3:1** como mínimo.
- [ ] En **escala de grises** no se pierde información.
- [ ] Los dos temas, claro y oscuro, revisados a brillo bajo.

## 4 · Teclado

- [ ] Recorrido completo con Tab, y en cada parada **se ve dónde estoy**.
- [ ] Todo lo accionable es alcanzable.
- [ ] Escape cierra lo que se abre; los modales atrapan el foco y lo devuelven.

## 5 · Estados

- [ ] Los **ocho estados** de cada componente, o escrito por qué alguno no aplica.
- [ ] Los **tres vacíos**: sin datos, sin resultados, error de carga.

## 6 · Movimiento

- [ ] Sin JavaScript, el contenido se ve **completo y estático**.
- [ ] `prefers-reduced-motion` lo **apaga**, no lo suaviza.
- [ ] Nada anima la opacidad **sobre texto**.
- [ ] Scroll por encima de 50 fps con la CPU ralentizada 6×.

## 7 · Contenido

- [ ] Ningún dato **inventado**. Lo que no está confirmado, no se publica.
- [ ] Ninguna foto de banco haciéndose pasar por la cosa real.
- [ ] Comillas, rayas y espacios del español.
- [ ] El texto no se podría pegar en otro producto sin cambiar una palabra.

## 8 · La pasada de detalles

- [ ] Título de pestaña, favicon, `theme-color`, miniatura social, idioma.
- [ ] `::selection`, cursores, anillo de foco.
- [ ] Cifras tabulares donde haya columnas de números.
- [ ] **Un detalle propio** que alguien pueda recordar al día siguiente.

## 9 · Lo que se dice al entregar

No «ya quedó». Se dice:

1. **Qué se cambió** y por qué, en una lista concreta.
2. **Qué se midió** y con qué número.
3. **Qué NO se comprobó** y qué haría falta para comprobarlo.

Un punto que no se comprobó se dice. Una guía que afirma que algo está medido
sin decir cuándo ni con qué comando **no es una medición: es un reporte**.

## Neuronas relacionadas

Todas. En particular `entrega`, `accesibilidad`, `rendimiento-visual`,
`detalles`, `contenido`.
