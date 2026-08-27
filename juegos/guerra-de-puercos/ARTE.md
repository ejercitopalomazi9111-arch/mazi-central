# El arte de Guerra de Puercos

Lo que subió Carlos el 27 de agosto: **102 archivos** de carta, más cinco piezas
que no son cartas. Llegaron a la raíz del repositorio con nombres de UUID
(`0567c4bd-e7c7-….jpeg`), que es como los deja la subida por la web de GitHub.
Aquí quedaron ordenados y catalogados.

> **Este juego es de la amiga de Carlos, no nuestro.** Se ordena y se cataloga
> para que se pueda trabajar con él; **no se le cambia nada al diseño**. Si algo
> parece un error, se pregunta antes de tocarlo — ya pasó una vez y no lo era.

## Dónde está cada cosa

| Carpeta | Qué hay |
|---|---|
| `arte/cartas/` | las 102, renombradas `NNN-nombre.jpeg` |
| `arte/materiales/` | la caja, la hoja de comando, el reverso y las dos láminas de líderes |
| `cartas.json` | el catálogo: número, nombre, puntos, nivel y ruta del arte |

## Qué dice el catálogo

**100 cartas únicas** en 102 archivos, que es exactamente lo que promete la
caja. La cuenta cierra porque hay dos archivos repetidos.

| Nivel | Cuántas |
|---|---|
| S | 6 |
| A | 25 |
| B | 21 |
| C | 28 |
| D | 20 |
| Penalización | 1 · *Carnitas*, −5 |
| Bonificación | 1 · *Alcancía*, +5 |

Los puntos van de **16** (*Normal*) a **100** (*Shin Godzilla*).

## Los dos «Troll» son a propósito

La carta 048 vale 53 y es nivel C; la 088 vale 56 y es nivel B. **No es un
error y no se corrige:** son dos cartas distintas que se llaman igual —una es
el troll de internet y la otra el de mitología—, y ahí está el chiste. Se
tratan igual, con su mismo nombre.

Queda escrito aquí porque a primera vista parece un defecto y alguien lo va a
querer «arreglar». Yo lo reporté como defecto y Carlos me corrigió.

**Repetidos de verdad**, éstos sí son el mismo archivo subido dos veces:

- `Goku` — 023 y 047, ambos 98 pts nivel S
- `Terremoto` — 024 y 063, ambos 69 pts nivel B

Son los dos que hacen que 102 archivos den 100 cartas.

## El arte se queda en el repositorio, no en el sitio

`build.mjs` deja fuera `juegos/guerra-de-puercos/arte/`: son ~55 MB que el
sitio no usa, y además **el juego no es de Grupo Mazi**. Colgarlo del dominio
de la empresa sería publicar el proyecto de alguien más sin que nadie lo haya
pedido.

Sobre las marcas que aparecen en las cartas —hay bastantes que no son de la
casa—: **quedan como están**. Es su proyecto y Carlos habla con ella
directamente. Aquí no se decide nada de eso.
