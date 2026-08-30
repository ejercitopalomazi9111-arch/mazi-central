---
name: tabla-en-un-telefono
description: Mostrar datos tabulares en una pantalla angosta sin romper la tabla ni esconder la información — qué columnas se pueden colapsar, cuándo conviene una lista de tarjetas, cómo se ordena y se filtra con el pulgar, y por qué el scroll horizontal necesita una pista. Úsala al diseñar cualquier tabla, panel o reporte, y cuando una tabla se salga de la pantalla.
---

# La tabla en un teléfono

Una tabla es la forma más densa de mostrar datos y la que peor cabe en 390 px.
Hay tres salidas y elegir mal cuesta caro.

## Las tres salidas

**1 · Scroll horizontal con la primera columna fija.** Cuando las columnas son
comparables entre sí y la gente **compara filas**. Sirve para precios,
inventarios, resultados.

- La columna que identifica la fila se queda pegada.
- **Tiene que verse que hay más a la derecha**: un degradado en el canto o una
  sombra. Sin pista, nadie desliza.
- El contenedor lleva `overflow-x: auto` y **no** el `body`: la página nunca se
  va de lado.

**2 · Lista de tarjetas.** Cuando cada fila es una entidad que se lee entera y
la gente **busca una**. Sirve para clientes, pedidos, personas.

- Una tarjeta por fila, con las dos o tres columnas importantes visibles y el
  resto en el detalle.
- Se pierde la comparación entre filas: si comparar es la tarea, ésta es la
  salida equivocada.

**3 · Columnas que se colapsan.** Se decide de antemano qué columnas
desaparecen a cada ancho, y se ofrece verlas.

- Lo que desaparece **no puede ser lo que decide**. Si el precio se colapsa, la
  tabla dejó de servir.

## Lo que se rompe siempre

**Los números bailan.** `font-variant-numeric: tabular-nums`. Sin eso una
columna alineada a la derecha se ve desalineada.

**Alineación equivocada.** Números a la derecha, texto a la izquierda, fechas a
la izquierda. Nada centrado en una columna que se compara.

**Bordes dobles.** Sin `border-collapse: collapse`, cada celda dibuja el suyo y
los interiores se ven el doble de gruesos.

**El encabezado se pierde al bajar.** En tablas largas, `position: sticky` en el
`thead`. Y si la tabla se parte entre páginas al imprimir, el encabezado se
repite.

**Ordenar sin decirlo.** La columna ordenada necesita indicio visible y
`aria-sort`, y el botón de ordenar tiene que ser un botón de verdad.

## Densidad

Dos densidades como mucho —cómoda y compacta— y que la elección **se recuerde**.
Tres es indecisión.

## Reprueba si

- La página se va de lado en 390 px por culpa de la tabla.
- Hay scroll horizontal **sin pista visual** de que lo hay.
- Una columna que decide la tarea desaparece en teléfono.
- Los dígitos de una columna numérica no caen unos sobre otros.

## Neuronas relacionadas

`datos`, `listas`, `tipografia`, `bordes`, `pagina`. En el cerebro:
`cifras-tabulares-en-tablas`, `borde-en-tabla-doble`.
