# La investigación del departamento de negocios

El expediente completo: de dónde se leyó, qué se leyó, qué salió de cada
lectura, qué se construyó con eso y qué salió mal. **161 hojas**, con las
direcciones de todo lo que se citó y de todo lo que se leyó.

`investigacion-negocios.pdf` es el entregable. Lo demás está aquí para poder
rehacerlo.

## Qué hay

| Archivo | Qué es |
| `investigacion-negocios.pdf` | el documento, en papel de Grupo Mazi |
| `investigacion.txt` | el texto que se pega en el cuerpo de la herramienta de reportes. Es lo que produce el PDF |
| `fuente/` | los diecinueve pedazos en los que está escrito, con saltos de línea para leerlos |
| `taller/` | los cuatro programas que lo arman, lo revisan y lo imprimen |

## Cómo se rehace

Hace falta el repo servido en `http://127.0.0.1:8791` (por ejemplo con
`python3 -m http.server 8791` desde la raíz) y Playwright.

```
node taller/armar.mjs                    /tmp/inv-crudo.txt
node ../../guias/istqb-ctfl/taller/reflujo.mjs /tmp/inv-crudo.txt /tmp/inv-flujo.txt
node taller/poner-indice.mjs             /tmp/inv-flujo.txt investigacion.txt
node taller/documento.mjs                investigacion.txt investigacion-negocios.pdf
node ../../guias/istqb-ctfl/taller/revisar-marcado.mjs investigacion.txt
```

## Lo que hay que saber antes de tocarlo

**1 · Las tablas las escribe el repositorio, no el texto.** `fuente/` lleva
marcas como `[[neuronas:ventas]]` o `[[fuentes:todas]]` y `taller/armar.mjs`
las sustituye leyendo `cerebro/neuronas/*.json`, `reparto.json`, `cosecha.json`
y las diez piezas de `taller-negocios/`. Ninguna cifra ni ninguna dirección
está escrita a mano dos veces. Es la lección del desfase de `todo.json`: un
artefacto que copia a mano miente el día que la fuente cambia.

**2 · `armar.mjs` puede reprobar, y esa es la idea.** Si una neurona cita un
artículo entre comillas angulares —y no dice «vía» ni «citado en»— ese artículo
tiene que existir en la cosecha. Si no aparece, el documento **no se arma** y
dice qué cita falla. Ya cazó una: un título mal copiado que sonaba perfecto.

**3 · Un bloque, un renglón.** `reflujo.mjs` existe porque el lector de marcado
junta los renglones sueltos de un párrafo pero no los de una viñeta. Está
explicado en el LEEME de la guía del ISTQB, que es de donde sale.

**4 · El índice se calcula iterando.** `poner-indice.mjs` pagina, lee dónde
cayó cada capítulo, reescribe el índice y vuelve a paginar hasta que dos
vueltas dan lo mismo. Converge en dos.

**5 · `documento.mjs` mide los desbordes contra la HOJA y contra el PIE**, no
contra el contenedor del texto —que se desborda junto con la tabla y por eso
la primera versión decía «ninguno» sobre once tablas cortadas—. El capítulo
XVIII del documento lo cuenta entero.

## Lo que se arregló en la herramienta de reportes

Armar esto destapó un defecto del paginador de `reportes/index.html`: **una
tabla más alta que una hoja entera no se partía** si llegaba a una hoja donde
no cabía ni una de sus filas. Se abría hoja nueva y se pegaba completa, y como
la hoja recorta, se veía como una fila cortada por el pie.

Está arreglado y tiene prueba con mutación en `reportes/pruebas-impresion.mjs`.
La guía del ISTQB sigue dando sus 83 hojas exactas, que era la comprobación que
había que hacer antes de tocar una herramienta compartida.
