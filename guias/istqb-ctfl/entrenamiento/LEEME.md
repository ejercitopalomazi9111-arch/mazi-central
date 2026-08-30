# Entrenamiento ISTQB CTFL · 50 niveles

Un manual de entrenamiento de los de antes, pero que corrige solo. La persona
entra con su nombre, resuelve cincuenta problemas de dificultad creciente y al
final se lleva dos constancias impresas a su nombre.

`index.html` es **un archivo autónomo**: sin build, sin CDN y sin peticiones
externas. La tipografía va incrustada en base64 y el logo en línea, así que
funciona abriéndolo de un correo, de una memoria USB o desde el teléfono en
avión.

## Cómo se rehace

```
node taller/armar.mjs <raíz del repo> index.html
node pruebas.mjs http://127.0.0.1:8791
```

`armar.mjs` lee la fuente de `sitio/fuente/mazi.woff2` y el logo de
`marca/logo/paloma-simple.svg`, y pega las cinco tandas de niveles con la
cáscara y el motor. **No se edita `index.html` a mano**: se edita el taller y se
vuelve a armar.

## Los niveles

Cincuenta, repartidos como el examen real: 8 de fundamentos, 7 de ciclo de
vida, 5 de estáticas, **18 de técnicas** —que es donde se gana o se pierde—, 8
de gestión y 4 de herramientas y cierre.

Cuatro formatos: opción única, opción múltiple, respuesta numérica y
**localizar la línea del defecto** en un pseudocódigo numerado. Los seis niveles
de depuración son los que Carlos pidió expresamente.

Cada nivel trae **tres pistas** que acercan sin resolver, un **paso a paso**
completo para cuando la persona se atora, y un párrafo de *por qué importa* que
conecta el ejercicio con la pregunta que va a caer en el examen.

## Las constancias

Dos, al completar los cincuenta: **curso completado** y **preparado para
presentar el examen**. Llevan nombre, puesto, fecha, cuántos niveles se
resolvieron sin ayuda y un folio.

**El folio no es aleatorio**: sale del nombre y de la fecha, así que la misma
persona el mismo día ve siempre el mismo número. Un folio que cambia cada vez
que se abre la página no sirve para verificar nada.

**Y las dos dicen, en su propia letra chica, que no son la certificación ISTQB
ni la sustituyen.** Eso no es un adorno legal: una constancia que se pudiera
confundir con la credencial oficial sería un problema de verdad, para la
persona y para Grupo Mazi. Hay una prueba que falla si ese texto desaparece.

## Cinco cosas que costaron y están aquí para no volver a pagarlas

**1 · `hidden` pierde contra tu propio `display`.** El botón de las constancias
se veía desde el nivel cero, y el de «enséñame cómo se resuelve» seguía ahí
después de usarlo. La causa: `[hidden]{display:none}` es la regla de menor
especificidad del navegador y `.btn.ancho{display:block}` le gana. Se arregla
con `!important` en la regla de `[hidden]`. **Lo cazó la prueba, no leer el
código** — y con el arreglo revertido fallan dos pruebas, comprobado.

**2 · `localStorage` truena, no devuelve vacío.** En Safari privado y con las
cookies bloqueadas, leer o escribir lanza una excepción. Todas las llamadas van
en `try/catch` y la app sigue funcionando sin guardar: se avisa en el mapa que
al cerrar se pierde el avance.

**3 · El nombre de la persona nunca toca `innerHTML`.** Va siempre por
`textContent`. Los enunciados sí llevan HTML mío —negritas, tablas— y por eso
usan `innerHTML`; si algún día se mezclan los dos caminos, un nombre con
`<script>` se ejecuta en su propia constancia. Hay una prueba que entra con
`Ana <img src=x onerror=…> Pérez` y comprueba que no se ejecuta.

**4 · La Mazi es tipografía de display.** Sus cifras se leen mal a tamaño de
dato: el contador «0 de 50» parecía un error de carga. Se queda en los títulos,
que es donde aporta marca, y el contador va en la tipografía del sistema.

**5 · Los botones se pintan desde el estado.** Antes había un «Siguiente» activo
en el nivel 50 que no llevaba a ningún lado. Ahora `pintarBotones()` decide
todo en un solo sitio y se llama después de cada cambio.

## Las pruebas

`pruebas.mjs` **juega la app entera**: resuelve los cincuenta niveles con la
clave que la propia página trae, y así descubriría un nivel cuya respuesta
correcta no fuera alcanzable. Además comprueba el candado del orden, que el
avance sobreviva a recargar, que el folio no cambie entre visitas, el nombre
con HTML, y a 390 y 1100 px que nada se salga de la pantalla y que ningún
control mida menos de 44 px.

**58 pruebas.** Lo que NO pueden ver: si el contenido de un nivel está mal
explicado, si el diseño se ve feo, o si una pista es inútil. Eso se mira.
