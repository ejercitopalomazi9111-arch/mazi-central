[hoja]

## XVIII. Lo que salió mal, con nombre

Este capítulo existe porque los otros no sirven sin él. Un expediente que sólo
cuenta lo que funcionó no permite juzgar nada: el lector no sabe si es que no
hubo errores o es que no se cuentan.

Van en orden de lo que más costó.

### 1 · El artefacto servía 490 neuronas y las fuentes tenían 641

El más caro, y lo reportó Carlos dos veces antes de que se arreglara.

`todo.json` es la lista plana que consume la pantalla del cerebro. Se genera
con una orden y se guarda en el repositorio. Durante un tiempo estuvo viejo: se
escribían neuronas nuevas, se subían, y la pantalla seguía enseñando las de
antes.

**Lo que lo hizo grave no fue el desfase: fue que la comprobación decía que
todo estaba bien.** `revisar` miraba ligas rotas y campos faltantes —las dos
cosas dentro de las fuentes— y jamás comparaba las fuentes con el artefacto que
se sirve. Verde perpetuo, sin ningún mecanismo que pudiera ponerse rojo.

Hay una versión anterior del mismo defecto, peor, que está documentada dentro
del código: el archivo sólo traía las áreas y no la lista plana, así que el
servidor de La Sala leía `cerebro.neuronas` y le salía indefinido. **El cerebro
le contestaba cero a todos los agentes, siempre**, sin error y sin ruido.

El arreglo es una compuerta que compara identificadores y sale con código de
error. Se comprobó que puede reprobar quitando neuronas del artefacto a
propósito.

**La lección, que es la que gobierna todo este documento:** una comprobación
que no puede fallar no es una comprobación. Por eso las tablas de aquí las
genera el repositorio en vez de estar copiadas a mano.

### 2 · Sesenta y ocho artículos de Wikipedia que eran el menú del sitio

El normalizador de direcciones le pega una barra al final a toda ruta que no
termine en extensión de archivo. Para casi todos los sitios da igual. Para
Wikipedia, `/wiki/Brand_management/` es un título distinto que no existe, y el
sitio contesta con una página cuyo cuerpo es la navegación: «Jump to content»,
«Search», «Donate», «Create account».

Mil setecientos caracteres. El piso que existía para cazar exactamente esto
—portadas, muros de cookies, cuatrocientos cuatro con buena cara— estaba en mil
doscientos. **El filtro que se puso para este caso dejó pasar este caso.**

Lo cazó, de rebote, el paso siguiente: el reparto exige doscientas cincuenta
palabras y los sesenta y ocho archivos se quedaron fuera de todas las materias.
Por eso ninguna neurona salió de Wikipedia, aunque la casa esté en la lista de
fuentes y aunque el cuadro del capítulo III diga sesenta y ocho traídas.

El mismo mecanismo ya había mordido antes con otra forma: la barra convertía
`…/concurrent-input-mechanisms.html` en una dirección con barra que daba
cuatrocientos cuatro **y encima entraba dos veces**, con barra y sin ella,
gastando dos veces el cupo de la casa en la misma página. Eso sí se arregló
—una ruta que ya termina en archivo se deja como está— y por eso está en el
código con su comentario. Lo de Wikipedia se escapó por el otro lado.

### 3 · Setenta direcciones de Y Combinator y cero texto

Su biblioteca es una aplicación de JavaScript. El mapa del sitio sí es XML
plano —seiscientas catorce direcciones— así que el descubrimiento funcionó y
las setenta entraron a la selección. Al pedirlas llega el armazón de la
aplicación y ni una línea del artículo.

No es un defecto del código: es un límite de traer páginas con `curl`. Lo que
sí habría sido un defecto es no decirlo y dejar a Y Combinator en la lista de
fuentes como si se hubiera leído.

### 4 · Las dos bodegas mezcladas

La primera versión del cosechador de negocios apuntaba a la misma carpeta que
el departamento de diseño. Resultado: **noventa y tres artículos de negocio
dentro de los trescientos trece de diseño**, y el buscador de diseño empezó a
devolver artículos de gestión a preguntas de tipografía.

Se cazó contando archivos, no leyendo código. Es el patrón que más veces ha
funcionado en todo esto: mirar el número, no el razonamiento.

### 5 · Una regresión mía en el buscador

Al ajustar la puntuación, la búsqueda «está configurado y no lo toma» empezó a
devolver una neurona de automatización. La causa: «toma» está dentro de
«auTOMAtizar», y con la coincidencia por subcadena sumaba puntos en el título,
el síntoma, la causa y el identificador de la misma neurona. Catorce puntos
contra doce de la correcta.

Se arregló exigiendo que la coincidencia empiece en principio de palabra. Sólo
salió midiendo: leyendo el código, la puntuación parecía razonable.

### 6 · Una cita con el título mal copiado, cazada por este mismo documento

Una neurona de desarrollo de negocios citaba **«From Star-power to Branding,
Firms Look for New Ways to Court Prospects»**, de Knowledge at Wharton. El
artículo existe, se leyó y sostiene lo que dice la neurona; pero se llama
**«…New Ways to Court Private Equity Deals»**. Yo copié mal el final del
título.

Nadie lo habría notado leyendo, porque un título mal copiado suena bien. Lo
cazó el programa que arma este documento, al no poder encontrar ese artículo en
la cosecha para ponerle su dirección.

De ahí salió una compuerta: **una cita que nombra un artículo entre comillas y
no dice «vía» ni «citado en» tiene que resolver contra la cosecha; si no
resuelve, el documento no se arma**. Se comprobó que puede reprobar volviendo a
poner el título mal: sale roja y nombra la cita.

Es el mejor argumento a favor de generar las tablas en vez de escribirlas. Un
documento que sólo copia no puede descubrir nada; uno que consulta, sí.

### 7 · Once tablas que se salían de la hoja, y una comprobación mía que decía que no

Este documento tiene 161 hojas y la mitad son tablas de fuentes. Al mirar la
foto de la hoja 75 se veía una fila **cortada por el pie**: la última de la
tabla, partida a media línea.

La causa está en el paginador de la herramienta de reportes, y es de las que se
esconden bien: el corte de una tabla larga sólo se intentaba cuando ya había
algo en la hoja y **con el hueco que quedaba libre**. Si en ese hueco no cabía
ni una fila, la función de corte devolvía nada, se abría hoja nueva y la tabla
entera se pegaba ahí sin volver a intentar el corte. Como la hoja recorta lo
que se sale, el resultado no parece un error: parece una fila mal cortada.
Once tablas, y la peor acababa **9 565 píxeles por debajo** del pie de su hoja.

**Y aquí la parte que me toca.** Yo tenía una comprobación de desbordes en el
programa que arma este PDF, y decía «ninguno». Dos veces:

1. La primera versión sólo medía el **ancho**. El defecto era de alto.
2. La segunda ya medía el alto, y siguió diciendo «ninguno», porque medía
   contra el contenedor del texto — que **se desborda junto con la tabla**. Un
   elemento nunca se sale de una caja que se sale con él. Hay que medir contra
   la hoja, que es lo que recorta, y contra el pie, que es lo que tapa.

Arreglado el paginador, las 161 hojas salen sin una sola fila cortada, y la
guía del ISTQB sigue dando exactamente sus 83 hojas, que es lo que había que
comprobar antes de tocar una herramienta que usan otros documentos.

La comprobación quedó en las pruebas de impresión de la herramienta, **con su
mutación**: al final anula la función de corte y exige que el desbordamiento
reaparezca. Si algún día alguien la rompe, la prueba se pone roja y dice
cuántas celdas se cortaron y por cuántos píxeles.

### 8 · Reportar como propio un fallo heredado, y no hacerlo

Cuatro pruebas del cerebro están en rojo. La tentación era contarlas como daño
de este trabajo o, peor, no contarlas. Lo que se hizo fue correr las mismas
pruebas contra la rama principal, en una copia limpia, **antes de tocar nada**.
Cuatro de las cinco que fallaban ya fallaban ahí.

Va aquí porque el error de verdad habría sido el contrario, y por poco: sin ese
paso, este documento habría dicho que la investigación rompió el grafo del
cerebro.

### 9 · Dos veces que la prueba estaba mal, no el código

**Una prueba que se salta justo el caso que falla.** El revisor de marcado se
saltaba los renglones que empiezan por almohadilla, y por eso no pudo ver que
un subtítulo salía impreso con las almohadillas delante. Se arregló y quedó el
comentario dentro del archivo.

**Un texto que se compara con el que no es.** Una comprobación buscaba una
frase en la página y fallaba sobre una página correcta. La causa es que
`innerText` devuelve el texto **renderizado**, y ese título lleva
`text-transform` a mayúsculas. La página estaba bien; la prueba comparaba mal.

### 10 · Cosas del entorno que costaron tiempo y ahora están escritas

- **El `fetch` de Node no sale de este contenedor.** Contesta 403 contra sitios
  que `curl` trae sin problema. Por eso todos los programas de cosecha llaman
  a `curl`.
- **El navegador tampoco sale.** Las pruebas se hacen contra un servidor local,
  no contra el sitio publicado.
- **`pkill -f` mata mi propio proceso.** Ha pasado cuatro veces. Se matan
  procesos por identificador, nunca por patrón.
- **Una página sin icono pide `/favicon.ico`** y produce un cuatrocientos
  cuatro en la consola. Cualquier prueba que exija «carga sin errores» falla
  para siempre por eso. Se arregló empotrando el icono.

### 11 · Y una que no es técnica

En otro trabajo de esta misma casa reporté que un cambio no había llegado, y sí
había llegado: yo había mirado las ramas del repositorio original, que no
enseñan lo que viene de una copia ajena. **Nunca se reporta una ausencia desde
una comprobación parcial.** Está aquí porque es el error con peor relación
entre lo fácil que es cometerlo y lo caro que sale.

---
