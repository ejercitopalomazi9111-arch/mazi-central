# La presentación del proyecto STEAM

`Fadori-STEAM.pptx` · 19 diapositivas · Bachillerato Rembrandt · Instituto Tecnológico en
Programación · grupo 3.1 · ciclo **Agosto – Diciembre 2026**.

## Va sobre el formato institucional, y eso no se toca

Carlos lo dijo con todas sus letras: *"debes usar el formato institucional ósea los logos las
formas etc eso es inamovible pero lo que sí puedes cambiar es todo lo demás."*

Así que la presentación **no se dibuja de cero**: se parte de
`formato-institucional.pptx` —el archivo real de la escuela, con sus escudos, sus formas y su
lienzo de 20″ × 11.25″— y encima se cambia únicamente el contenido.

- Las 10 láminas originales conservan su decoración y su letra a dos tonos; sólo se les
  reemplaza el texto, uno por uno.
- Las 9 láminas nuevas **nacen clonando la lámina 8** (la más limpia: decoración + título +
  un cuerpo), así que traen el formato de la escuela puesto de fábrica.
- Los escudos Rembrandt y DGETI son grupos que viven dentro de cada lámina. No se tocan.

## Cómo se rehace

```bash
python3 rehacer.py          # → Fadori-STEAM.pptx
```

Las capturas (`01`–`08`) salen de la app de verdad, no son maquetas. Si la app cambia, se
vuelven a sacar y se corre `rehacer.py` otra vez.

`armar.mjs` es el generador **viejo**, el que dibujaba la presentación desde cero antes de que
apareciera la plantilla de la escuela. Se queda de referencia; ya no es el que manda.

## La regla que manda

**Máximo 15 palabras por diapositiva**, contando el título. Está en la rúbrica, y al final de
`rehacer.py` hay un contador que las cuenta y avisa cuál se pasa. Los cinco nombres del equipo
no cuentan: la rúbrica los pide.

## Qué cubre, contra la rúbrica

| Lo que pide la rúbrica | Dónde está |
|---|---|
| Integrantes en la primera página | 1 |
| Índice | 3 |
| Proyecto-problema, nombre y descripción | 4 · 5 · 6 |
| Justificar en base a la problemática | 8 |
| Misión · Visión | 9 · 10 |
| Propósito general · específico | 11 · 12 |
| Enfoque (cualitativo / cuantitativo / deductivo) | 13 |
| Imágenes y su relación con cada apartado de STEAM | 14 a 18, una por letra |
| ¿Qué? ¿Por qué? ¿Cómo? ¿Para qué? | 5 · 4 · 7 · 8 |
| Estado actual | 19 |
| Ortografía | revisada, con acentos |

## Cómo se revisó — y qué NO se pudo revisar

- `validate.py --original formato-institucional.pptx` → **pasa**, con la plantilla de base
  para que sus propios defectos no se lean como míos.
- `markitdown` → el texto llegó completo, sin sobras de plantilla, sin "2025".
- `python3 medir.py Fadori-STEAM.pptx formato-institucional.pptx` → **el metro de la casa**.
  Lee las coordenadas reales de las 19 láminas y busca lo único que se puede comprobar sin
  ojos: algo fuera del lienzo, o una foto encimada sobre un cuadro de texto. Le pasas la
  plantilla como segundo argumento para que su decoración sangrada no cuente como defecto.
  **Ya cazó uno:** en "¿Cómo funciona?" el cuerpo heredado de la lámina 8 medía 15.49″ de
  ancho y le pasaba por encima a las tres capturas. Se subió a 2.50″ y quedaron 0.85″ de aire.
  Y se comprobó que el metro sirve volviendo a meter el bug a propósito: lo cazó otra vez.

**Lo que falta y hay que decirlo:** LibreOffice está roto en este contenedor —falla hasta
abriendo un `.txt`, y también con la plantilla original, así que no es culpa del archivo—.
Eso significa que **nadie la ha visto renderizada**. La geometría está medida, no vista.
Ábrela una vez y dime qué se ve mal.

## `vista.mjs`

Substituto casero: desempaca el `.pptx` **ya generado** y lo dibuja en HTML. Sale de las
coordenadas que de verdad quedaron en el archivo, no de la intención. Pero es tosco con los
grupos y las formas de geometría personalizada de la plantilla, así que **no sustituye ver el
archivo en PowerPoint**.
