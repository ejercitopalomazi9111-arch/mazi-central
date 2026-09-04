[hoja]

## Examen 2 · Técnicas de diseño

Veinte preguntas del capítulo IV, que es el que más pesa. Varias piden
**calcular**: hazlas con papel, como en el examen real. Respuestas en la hoja
de respuestas 2.

**1.** Un campo acepta valores de 100 a 999. ¿Cuántas particiones de
equivalencia hay, contando válidas e inválidas?
- a) 2
- b) 3
- c) 4
- d) 6

**2.** Para el mismo campo, ¿cuáles son los valores límite con el método de
**dos valores**?
- a) 100 y 999
- b) 99, 100, 101, 998, 999, 1000
- c) 99, 100, 999, 1000
- d) 0, 100, 999, 9999

**3.** Un sistema de envío cobra así: de 0 a 5 kg, tarifa fija; de 5.01 a 20 kg,
tarifa por kilo; más de 20 kg, no se acepta. Según esa especificación, ¿cuántos
casos hacen falta como mínimo para el 100 % de cobertura de particiones?
- a) 3
- b) 4
- c) 5
- d) 6

**4.** ¿Cuándo conviene una tabla de decisión?
- a) Cuando el sistema tiene estados que cambian con eventos.
- b) Cuando hay que medir cobertura de código.
- c) Cuando no hay especificación escrita.
- d) Cuando el resultado depende de varias condiciones combinadas.

**5.** Una tabla de decisión con **cuatro** condiciones booleanas tiene, sin
colapsar:
- a) 4 columnas
- b) 8 columnas
- c) 16 columnas
- d) 32 columnas

**6.** En una tabla de decisión colapsada, un guion en una condición significa:
- a) Que la condición no aplica ni afecta al resultado en esa regla.
- b) Que la condición es siempre falsa.
- c) Que falta información.
- d) Que la regla es inválida.

**7.** En pruebas de transición de estados, la cobertura **0-switch** exige:
- a) Visitar cada estado al menos una vez.
- b) Ejercer cada transición válida al menos una vez.
- c) Ejercer también las transiciones inválidas.
- d) Recorrer todas las secuencias posibles de dos transiciones.

**8.** ¿Qué encuentra la cobertura de transiciones **inválidas** que la de
válidas no encuentra?
- a) Defectos de rendimiento.
- b) Código muerto.
- c) Requisitos ambiguos.
- d) Qué hace el sistema ante un evento que no debería recibir en ese estado.

**9.** Observa este pseudocódigo:

| Línea | Código |
| 1 | leer N |
| 2 | si N > 0 entonces |
| 3 | · imprimir "positivo" |
| 4 | fin si |
| 5 | imprimir "fin" |

Con el único caso N = 7, ¿qué coberturas obtienes?
- a) 100 % sentencias y 50 % ramas.
- b) 100 % sentencias y 100 % ramas.
- c) 50 % sentencias y 100 % ramas.
- d) 75 % sentencias y 50 % ramas.

**10.** ¿Cuál de estas afirmaciones es cierta?
- a) 100 % de cobertura de sentencias garantiza 100 % de cobertura de ramas.
- b) Las dos se garantizan mutuamente.
- c) Ninguna de las dos garantiza a la otra.
- d) 100 % de cobertura de ramas garantiza 100 % de cobertura de sentencias.

**11.** Este código:

| Línea | Código |
| 1 | leer A, B |
| 2 | si A > 0 entonces |
| 3 | · si B > 0 entonces |
| 4 | · imprimir "ambos" |
| 5 | · fin si |
| 6 | fin si |

¿Cuántos casos hacen falta como mínimo para el 100 % de cobertura de ramas?
- a) 1
- b) 2
- c) 3
- d) 4

**12.** La técnica de **adivinación de errores** se basa en:
- a) La especificación formal del sistema.
- b) La estructura interna del código.
- c) La experiencia sobre dónde suelen aparecer defectos.
- d) Un modelo de estados.

**13.** Las pruebas **exploratorias** se caracterizan porque:
- a) Se diseñan por completo antes de ejecutarse.
- b) El diseño, la ejecución y la evaluación ocurren a la vez.
- c) Sólo pueden hacerse con herramientas.
- d) Sustituyen a las técnicas de caja negra.

**14.** ¿Qué es una **carta de sesión** en pruebas exploratorias?
- a) El objetivo y el alcance de una sesión con tiempo limitado.
- b) El reporte de defecto que se genera al final.
- c) La lista completa de casos de prueba a ejecutar.
- d) El permiso del cliente para probar en producción.

**15.** Las tres C de una historia de usuario son:
- a) Código, Compilación, Certificación.
- b) Cliente, Contrato, Costo.
- c) Cobertura, Criterio, Caso.
- d) Card, Conversation, Confirmation.

**16.** En ATDD, los casos de prueba se derivan:
- a) Del código ya escrito.
- b) De los defectos encontrados en producción.
- c) De los criterios de aceptación, **antes** de implementar.
- d) Del modelo de estados.

**17.** El formato **Dado / Cuando / Entonces** corresponde a criterios de
aceptación:
- a) Orientados a reglas.
- b) Orientados a escenarios.
- c) Orientados a código.
- d) Orientados a riesgo.

**18.** Un formulario tiene un campo «tipo de cliente» con tres valores
posibles y un campo «monto» con dos particiones. Si se quisiera cubrir todas
las combinaciones, ¿cuántos casos serían?
- a) 5
- b) 6
- c) 9
- d) 12

**19.** ¿Cuál de estas técnicas es de **caja blanca**?
- a) Cobertura de ramas.
- b) Análisis de valores límite.
- c) Tabla de decisión.
- d) Transición de estados.

**20.** El principal valor de medir cobertura de código es:
- a) Demostrar que el software no tiene defectos.
- b) Sustituir las pruebas funcionales.
- c) Estimar el esfuerzo del proyecto.
- d) Saber qué parte del código no ejerció ninguna prueba.

---
