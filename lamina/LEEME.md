# Lámina · el atlas del departamento de diseño

Un archivo autónomo con las **350 piezas** de conocimiento del departamento
dentro: sin build, sin CDN y sin una sola petición a un servidor ajeno. La
tipografía va en base64 y el logo en línea.

`index.html` es el entregable. **No se edita a mano**: se edita el taller y se
vuelve a armar.

```
node lamina/taller/armar.mjs . lamina/index.html
node lamina/pruebas.mjs http://127.0.0.1:8791
```

`armar.mjs` lee las neuronas de `cerebro/neuronas/` —sólo las áreas que **no**
existían en `main`, que son las 350 del departamento—, las descripciones de las
21 skills, la fuente y el logo, y lo pega todo con la cáscara y el motor. Si
alguna vez hay menos de 350 piezas, **truena a propósito**.

## La dirección de arte

**La referencia no sale del sector.** Sale del atlas anatómico del siglo XIX y
del plano de ingeniería: filete de un pelo, márgenes anchos, número de lámina en
romano, llamadas numeradas con su clave, y **un solo color saturado** —el
espécimen— sobre papel y tinta.

Es la propia regla de la casa aplicada a sí misma: si todas las referencias son
de competidores, el resultado converge con ellos por construcción. Un sitio de
un departamento de diseño que se pareciera a otros sitios de departamentos de
diseño se estaría contradiciendo en su primera pantalla.

Lo que eso da, en concreto:

| Decisión | De dónde sale |
|---|---|
| Serif del sistema para el cuerpo (Georgia primero) | la lámina es un documento, no una app. Y no cuesta una petición |
| Mazi sólo en los títulos | es tipografía de display: sus cifras se leen mal a tamaño de dato |
| Monoespaciada en la anotación al margen | la marginalia del plano técnico |
| Dos columnas por encima de 64rem | la columna estrecha de anotaciones del atlas |
| El violeta **sólo** en el filete de portada, las cifras y los números de lámina | un espécimen por lámina, no un tema teñido |
| Trama de 32 px casi invisible | el papel milimetrado, no una cuadrícula de maqueta |

## Cinco cosas que costaron

**1 · Dos elementos con el mismo `id`.** La sección y su rejilla se llamaban las
dos `atlas`, y `getElementById` devolvía la sección. Lo destapó una captura que
salía en el sitio equivocado.

**2 · `scroll-behavior: smooth` hace que una captura salga a medio camino.** No
es un defecto de la página: es de quien mide. En las pruebas se pide
`behavior:'instant'`. Es la misma familia del defecto de «dos lecturas iguales»:
antes de arrancar, el scroll suave también da el mismo valor dos veces.

**3 · Filtrar por área no es buscar el nombre del área.** Escribir «sombras»
encuentra 21 piezas —hay sombras mencionadas en otras áreas— y el área tiene 15.
Tocar el área del atlas tiene que dar **exactamente** las 15. Son dos caminos
distintos y estaban compartiendo uno.

**4 · Una frase de relleno devolvía 228 de 350.** «mexico sin acentos ni nada»
casaba con «sin», «ni» y «nada», que salen en casi todas. Se quitan las palabras
vacías, las que aparecen en más de un tercio del registro, y se corta por debajo
de una cuarta parte de la mejor puntuación.

**5 · La cabecera de cada ficha medía 23 px.** Por debajo de los 44 que exige el
dedo. Lo cazó la prueba de proporciones, no la vista.

## Las pruebas

`pruebas.mjs`, **52 comprobaciones**. Las que valen la pena mencionar:

- **Que el registro cuadre**: 350 piezas, 42 áreas, los conteos del atlas suman
  350, el índice lista 350, y **todas** las piezas traen «cómo cazarlo» y al
  menos dos señales.
- **Que el buscador acierte**: «va a tirones» tiene que poner arriba la del
  difuminado; «sombra sucia», la de la sombra negra. Si el orden se rompe, la
  prueba lo dice.
- **Que se lea con el JavaScript apagado**: el atlas, el índice de las 350, los
  21 instrumentos, las 8 fuentes y el texto entero, y **nada** oculto ni a media
  transición.
- **Que el tema esté puesto antes de pintar**: se recarga y se lee el atributo en
  el primer momento posible. Si se aplicara después, habría un destello.
- **El contraste, medido en los dos temas** sobre los cinco pares que importan.

Lo que las pruebas **no** pueden ver: si la dirección de arte es buena. Eso se
mira.
