# Propuesta del diseñador · 29 de octubre

La mandó uno de los diseñadores (boceto a línea: paloma, estrella, «MAZI» con rizos y una cola de
plumas). Carlos: *«por ahora vectoriza y maybe hazlo un poco más género neutro»*, y luego
*«maybe simplificado un poco · y haz una versión de ícono más básica que se vea bien en chico, como
la A con la estrella y las alas simples · la versión fiel mantenla»*. **El color lo manda el
diseñador después.**

| Archivo | Qué es |
|---|---|
| `fiel.svg` | El boceto tal cual, en vector limpio. **Se queda como está** |
| `neutra.svg` | Misma paloma y cola, línea más firme; letras en Cinzel sin los rizos de la M y la I |
| `simplificada.svg` | Lo mismo con menos plumas adentro, letras sólidas y estrellas limpias |
| `icono.svg` · `icono-oscuro.svg` | La A con la estrella y dos alas lisas; se lee hasta en 32 px |
| `propuestas.png` | Las cuatro juntas, para verlas en el teléfono |

**No va al sitio publicado:** vive en `empresa/` a propósito, porque `marca/` se publica entero y esto
es una propuesta, no la marca. Si se aprueba, se pasa a `marca/`.

Se rehacen con `python3.13 empresa/marca/propuesta-diseñador/vectorizar.py` (OpenCV, fontTools y
potrace). Letra de la versión neutra: Cinzel, SIL Open Font License.

## Pendiente · dicho por Carlos el 29 de octubre

Mandó el boceto limpio (`boceto-limpio.png`) con: *«Mantén esta A y los detalles de la m y la I»*.
O sea: en la neutra y la simplificada **NO se cambian la A, ni los rizos de la M y la I por Cinzel**;
se quedan las letras del dibujo (vectorizadas como en `fiel.svg`) y lo «neutro» va por otro lado.
Luego dijo *«por ahora ignoremos el tema logo»*: queda en pausa con esto anotado, junto con la página
que cambia de logo (`web/logos/`) y el emblema de la M de cubo con alas.
