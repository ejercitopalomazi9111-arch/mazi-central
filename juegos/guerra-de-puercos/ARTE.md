# El arte de Guerra de Puercos

Lo que subió Carlos el 27 de agosto: **102 archivos** de carta, más cinco piezas
que no son cartas. Llegaron a la raíz del repositorio con nombres de UUID
(`0567c4bd-e7c7-….jpeg`), que es como los deja la subida por la web de GitHub.
Aquí quedaron ordenados y catalogados.

## Dónde está cada cosa

| Carpeta | Qué hay |
|---|---|
| `arte/cartas/` | las 102, renombradas `NNN-nombre.jpeg` |
| `arte/materiales/` | la caja, la hoja de comando, el reverso y las dos láminas de líderes |
| `cartas.json` | el catálogo: número, nombre, puntos, nivel y ruta del arte |

## Qué dice el catálogo

**100 cartas únicas** en 102 archivos, que es exactamente lo que promete la
caja. La cuenta cierra porque hay dos duplicados exactos.

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

## Tres cosas que salieron al catalogar

1. **`Goku` está dos veces** (023 y 047) con los mismos 98 pts y nivel S. Es el
   mismo archivo subido dos veces.
2. **`Terremoto` está dos veces** (024 y 063), 69 pts nivel B las dos. Igual.
3. **`Troll` está dos veces con valores DISTINTOS**: la 048 vale 53 y es nivel C,
   la 088 vale 56 y es nivel B. Éste no es un duplicado: son dos cartas que se
   llaman igual y no valen lo mismo. **Hay que decidir cuál se queda**, porque
   en la mesa dos cartas con el mismo nombre y distinto valor se discuten.

## Por qué el arte NO se publica

`build.mjs` lo deja fuera a propósito, y la razón chica es que son ~55 MB.

La grande: entre las 100 hay Pacman, Kirby, Goku, Mario, Sonic, Bugs Bunny,
Scooby, Roblox, Minecraft, Paw Patrol, Godzilla, Alien, Terminator, Transformers,
Bob Esponja, He-Man, Rick y Morty y una veintena más de marcas que no son
nuestras. Colgarlas del dominio de una empresa que vende servicios es el mismo
flanco por el que Torre Infinita salió del sitio (§7 del CLAUDE.md) — y ahí ni
siquiera había una caja que dice «100 CARTAS» con un precio detrás.

El repositorio sí las guarda: son el material de trabajo del juego y el catálogo
se arma con ellas. Publicarlas es otra decisión, y es de Carlos y de su amiga.
