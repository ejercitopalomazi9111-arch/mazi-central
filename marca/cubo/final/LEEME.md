# El logo de Grupo Mazi · el cubo

Lo eligió Carlos el 28 de octubre de 2026, de la hoja del cubo:

- **Fondo negro y «MAZI» en blanco**, con las letras juntas en una sola pieza (Space Grotesk Bold).
- **El cubo oscuro** con la cara de arriba morada (`#AC27FF`).

| Archivo | Qué es |
|---|---|
| `logo-negro.svg` | el logo con su fondo negro |
| `logo.svg` | el mismo sin fondo, para poner sobre algo oscuro |
| `cubo.svg` | el cubo solo |
| `animacion.html` | la animación: cae la cuña, cae encima la M cubo, se vuelve el cubo y entra el nombre |
| `armar.py` | saca todo lo de arriba y `piezas.js`, con las letras ya convertidas en trazos |

```
python3.13 marca/cubo/final/armar.py
node herramientas/video/armar.mjs marca/cubo/final/animacion.html marca/cubo/final/salida/Grupo-Mazi-logo-animado.mp4
```

**La animación.** Carlos: *«que caiga primero la forma del hueco entre las patas de la M y luego la M
cubo sobre de éste, volviéndose el cubo»*.

- El cubo se arma de dos piezas:
  - la cuña, que es el hueco entre las patas de la M;
  - la M cubo, que son las dos caras de los lados con las patas al filo, más el techo morado.
- La primera versión era un reloj de arena: la cuña se escurría y dejaba una Z. Carlos la descartó: *«la Z está muy fea»*.
- Mientras el cubo está entero se pinta de una sola pieza. En dos piezas se notaría la costura.
- Al caer, el saltito es de 3 unidades. Más salto deja ver el hueco negro entre las piezas.

**Colores:**

| Parte | Color |
|---|---|
| fondo | `#0B0B0F` |
| letra | `#FFFFFF` |
| techo | `#AC27FF` |
| cara izquierda | `#34343D` |
| cara derecha | `#52525D` |

`logo-tinta.svg` es `logo.svg` con las letras en morado oscuro (#170A26), para fondos claros:
`sed "s/#FFFFFF/#170A26/g" logo.svg > logo-tinta.svg`.
