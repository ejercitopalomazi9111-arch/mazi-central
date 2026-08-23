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

## Cómo se revisó

```bash
./ver.sh Fadori-STEAM.pptx          # una imagen por lámina — para MIRARLA
python3 medir.py Fadori-STEAM.pptx  # el metro, sobre el render de verdad
```

- `medir.py` → **pasa**: nada partido, nada encimado, nada fuera del papel.
- `validate.py --original formato-institucional.pptx` → pasa.
- `markitdown` → el texto llegó completo, sin sobras de plantilla, sin "2025".
- Y se miraron las 19 láminas renderizadas, una por una.

## La metida de pata que hay que dejar escrita

La primera versión de `medir.py` medía las **cajas declaradas en el XML** y
daba `✓ nada se encima` mientras la presentación se veía así:

```
Objetiv
o
  Justificación      ← encimado
```

Carlos tuvo que mandar capturas de su teléfono para que me enterara. El
defecto era **del medidor**: un título que no cabe se parte en dos renglones y
crece hacia abajo (las cajas traen `spAutoFit`), pero la caja declarada no se
mueve ni un EMU. Midiendo cajas eso es invisible.

Y encima yo daba por hecho que **LibreOffice estaba roto** en el contenedor
porque fallaba hasta con un `.txt`. No estaba roto: estaba **incompleto** —
sólo venían `libreoffice-core` y `libreoffice-common`, sin un solo filtro de
documento. Un `apt-get install libreoffice-impress` y listo. Lo di por perdido
sin diagnosticarlo, y eso costó una entrega fea.

Ahora `medir.py` renderiza de verdad y lee las coordenadas de cada palabra
pintada. Comprobado contra `formato-institucional.pptx`, que trae 31 defectos
propios: los caza todos, incluidos «Objetiv / o», «Indic / e» y «Misió / n».

## Qué se arregló, y qué venía ya roto

Los encimados **no eran todos míos**. Rindiendo la plantilla original salió que
ya traía: la palabra «Portada» partida en «Portad / a», lo mismo «Problema»,
«Descripción», «Objetivo» y «Misión»; «Filas enormes» montada sobre su propio
pie; el nombre del instituto encima del bachillerato. Se arreglaron todos —
Carlos pidió «deja el formato puesto pero lo demás acomódalo», y los cuadros de
texto son «lo demás». Los escudos, los logos y las formas no se tocaron.

Lo que era mío y se arregló:

| Qué | Por qué pasaba |
|---|---|
| Títulos partidos en dos renglones | las láminas nuevas heredaban 92 pt en una caja de 8.45", que alcanzaba para «Visión» pero no para «¿Para qué sirve Fadori?» |
| El cuerpo leído como poema | 44.5 pt **centrado** en 7.6": once palabras salían en cinco renglones, cada uno arrancando en distinto margen |
| La misma gráfica dos láminas seguidas | «Enfoque» y «S · Ciencia» compartían captura; se veía como si nos hubiéramos quedado sin material |

## `vista.mjs`

Substituto casero: desempaca el `.pptx` **ya generado** y lo dibuja en HTML. Sale de las
coordenadas que de verdad quedaron en el archivo, no de la intención. Pero es tosco con los
grupos y las formas de geometría personalizada de la plantilla, así que **no sustituye ver el
archivo en PowerPoint**.
