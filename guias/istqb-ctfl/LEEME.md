# Guía de estudio ISTQB Foundation Level (CTFL)

El curso completo, la guía de estudio, tres exámenes con sus hojas de
respuestas explicadas, un glosario, el directorio de dónde certificarse y los
enlaces comprobados. **83 hojas**, escritas para que alguien apruebe el examen
sin comprar ningún otro material.

`guia-istqb-ctfl.pdf` es el entregable. Todo lo demás está aquí para poder
rehacerlo.

## Qué hay

| Archivo | Qué es |
| `guia-istqb-ctfl.pdf` | el documento, con el papel y la marca de agua de Grupo Mazi |
| `guia.txt` | el texto que se pega en el cuerpo de la herramienta de reportes. Es lo que produce el PDF |
| `fuente/` | los trece pedazos en los que está escrita la guía, con saltos de línea para leerlos |
| `proveedores.json` | los 31 centros acreditados sacados del padrón de HASTQB, con teléfono y correo |
| `taller/` | los cinco programas que arman y revisan el documento |
| `entrenamiento/` | la **app de 50 niveles** que sale de esta guía, con sus dos constancias. Tiene su propio LEEME |

## Cómo se rehace

Hace falta el repo servido en `http://127.0.0.1:8791` (por ejemplo con
`python3 -m http.server 8791` desde la raíz) y Playwright.

```
node taller/reflujo.mjs      <fuente concatenada> guia-sin-indice.txt
node taller/poner-indice.mjs guia-sin-indice.txt  guia.txt
node taller/guia-taller.mjs  guia.txt  guia-istqb-ctfl.pdf  1,20,53
node taller/ver-hojas.mjs    guia.txt  1
node taller/revisar-marcado.mjs guia.txt
```

La fuente concatenada sale de `cat fuente/0*.md fuente/1*.md`.

## Las cuatro cosas que hay que saber antes de tocarlo

**1 · Un bloque, un renglón.** `reflujo.mjs` existe porque el lector de marcado
junta los renglones sueltos de un párrafo, pero **no los de una viñeta**: una
lista sólo absorbe renglones que empiezan con guion. Un texto envuelto a 78
columnas se parte en «lista de una línea + párrafo suelto» en cada viñeta
larga. Y un renglón de continuación con dos puntos temprano pasa por ficha de
datos y rompe el párrafo en una etiqueta. Los dos se evitan igual: cada bloque
en un solo renglón.

**2 · El índice se calcula iterando.** El número de página no se sabe antes de
paginar, y el índice mismo desplaza las páginas que numera. `poner-indice.mjs`
pagina, lee dónde cayó cada apartado, reescribe el índice y vuelve a paginar
hasta que dos vueltas dan lo mismo. Converge en dos.

**3 · El índice tiene 18 renglones y no 21 a propósito.** Con 21 la tabla no
cabe en una hoja; cuando no cabe, el paginador la manda entera a la siguiente y
deja la anterior con dos renglones. Se midió: una hoja gastada.

**4 · No hay bloques de código.** El lector no los soporta y las líneas se
juntarían en un párrafo. El pseudocódigo va en tablas de dos columnas, y la
sangría se marca con un punto al principio de la línea —está explicado dentro
de la guía, la primera vez que aparece—.

## Tres ajustes que el taller hace en memoria

Ninguno toca la herramienta. Los tres son de una línea si algún día se quieren
dejar fijos, y están en `guia-taller.mjs`:

- el lema del papel `mazi` dice «Jefatura de grupo · 3.1», que es de un reporte
  escolar. Aquí dice **Formación y certificación**.
- el rótulo sobre el título salía «Reporte de incidencia». Aquí dice **Guía de
  estudio y curso completo**.
- el folio empieza en `IR-` (Instituto Rembrandt). Aquí empieza en **`GM-`**.

**Y el orden importa:** primero el tipo de reporte, después el papel. Cambiar
de tipo mueve el papel solo (`PAPEL_POR_AREA`), así que al revés el documento
se vuelve a poner en papel del Rembrandt.

## De dónde salen los datos

El contenido está escrito contra el **temario oficial v4.0 del Foundation
Level**. Los enlaces de la última sección se abrieron uno por uno el **30 de
agosto de 2026**; los que no contestaron con contenido real no entraron —los
de Agile Alliance, por ejemplo, devuelven una pantalla de captcha, así que no
están—.

El directorio salió del **padrón oficial de proveedores acreditados de
HASTQB**, entrando ficha por ficha. Son 31 centros, 23 con CTFL y 29 con
teléfono. Donde no aparece el país es porque la ficha de origen no lo
declaraba: **no se dedujo del prefijo telefónico, porque deducirlo es
inventarlo**.
