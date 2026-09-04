# La primera prueba de trabajo conjunto · qué salió y qué falló

> Carlos pidió una página hecha por los dos agentes, **sin intervención de ninguna
> persona**. La página existe y funciona. La colaboración no ocurrió, y eso es lo
> que hay que contar aquí — porque el fallo es reproducible y ya sabemos por qué.

---

## Lo que se entregó

**La página es de Godines, completa:** `index.html`, `base.css`, `datos.js`,
`mueve.css`, `mueve.js` y `pruebas.mjs`. Está en `main`, pasa sus pruebas —
incluidas las de **sin JavaScript**, donde los siete horarios se siguen leyendo
enteros— y es la buena.

El concepto también es suyo: **«el minuto antes»**, anclado en una frase de
Carlos, *«que el papá sepa qué día y en qué lugar juega la categoría de su
hijo»*. La foto de referencia **no se publicó y no se descargó nada**: es un
menor y nadie dio permiso. «Referencia» no es «material».

## Lo que falló, que es el hallazgo

Acordamos repartirnos el trabajo: él el movimiento, yo la estructura. Publiqué
mis ganchos en La Sala y me puse a construir mi mitad.

**Nunca se enteró, y yo nunca me enteré de que ya había terminado.** Él construyó
la página entera —su estructura, sus ganchos (`data-escena="1"`…`"5"`), su
filtro— y la fusionó a `main`. Yo construí en paralelo una estructura con otros
ganchos (`data-escena="minuto"`, `data-mueve` con 18 piezas) que no encajaba con
nada. Dos páginas para el mismo encargo, ninguna de las dos hecha entre los dos.

**Por qué se pudo dar, y las dos causas están documentadas:**

| Causa | Dónde |
|---|---|
| La Sala se vació sola y se llevó lo que habíamos acordado | commit del olvido callado · `sala/servidor/sala.js` |
| Mi guardia de 24/7 disparó 82 veces sin correr una sola | [`sala/LA-GUARDIA-NO-CORRIA.md`](../sala/LA-GUARDIA-NO-CORRIA.md) |

O sea: **el canal por el que íbamos a coordinarnos se borró, y el mecanismo que
debía avisarme estaba dormido.** Ninguno de los dos falló en rojo. Los dos se
veían sanos.

## Cómo se resolvió

Se tomó **la página de Godines**, sin discusión. Está fusionada, está probada y
funciona; la mía era una mitad esperando una mitad que ya no hacía falta.
Sobrescribir trabajo fusionado por trabajo paralelo habría sido el peor final
posible para una prueba de colaboración.

Lo que sí queda de mi lado: el arreglo del olvido de La Sala, el diagnóstico de
la guardia, y este documento.

## Lo que se aprende, y vale más que la página

**Repartirse el trabajo por un canal que puede olvidar no es repartirse el
trabajo.** El acuerdo hay que dejarlo donde no se borre —el repo— antes de
empezar a construir sobre él. Un mensaje en un chat es un aviso; el reparto es
un archivo.

Y la segunda, que es la del día completo: **nada de esto falló en rojo.** La
sala se vació en silencio, la guardia disparó sin correr, y las dos cosas se
veían perfectamente bien desde afuera. Cuatro defectos distintos hoy y todos son
el mismo: algo que informa un estado y está en otro.
