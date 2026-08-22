# Fadori · Proyecto Sin Filas

> App de la cooperativa escolar. Proyecto de escuela de Carlos, modalidad **STEAM**.
> Este archivo es el **acta de arranque**: qué problema resuelve, con qué evidencia, qué se va a
> construir y qué NO. Se escribe antes de tocar código a propósito.

---

## 1 · El problema, medido

No es "estaría padre tener una app". Es un problema con números que Carlos ya observó:

| Dato | Valor |
|---|---|
| Duración del recreo | **30 minutos** |
| Tiempo que se pierde en la fila | **15 a 20 minutos** |
| Porcentaje del recreo consumido por la fila | **50 – 67 %** |

### La cadena de consecuencias

Y esto es lo que hace que el proyecto valga: **el problema no se queda en la fila.**

1. **La fila se come el recreo.** Entre quince y veinte de treinta minutos.
2. **El pasillo se inunda.** Los que esperan no tienen dónde estar, así que se quedan parados
   frente a la cooperativa.
3. **La prefecta no puede pasar.** El pasillo bloqueado le impide hacer su ronda.
4. **Se pierde la supervisión de los alumnos lejanos.** Si la prefecta está atorada, no llega a
   donde no hay nadie mirando.
5. **Nadie sabe cuándo está listo su pedido**, así que no se van — se quedan haciendo bulto.
6. **Los alumnos no alcanzan a despejarse.** Menos tiempo de comer y de moverse.
7. **Regresan al salón con energía sin gastar** → más desorden y más destrozos en clase.

> **Esto es lo que hace bueno el proyecto para STEAM:** no es una app por hacer una app. Es una
> intervención en un sistema con un efecto medible en cadena, y el efecto final —el comportamiento
> en el salón— está a cuatro pasos de la causa. Eso es exactamente lo que una rúbrica de STEAM
> quiere ver.

### Cómo se mide si funcionó

Sin esto, el proyecto es una opinión. Hay que medir **antes** de instalar nada:

| Métrica | Cómo se mide | Meta |
|---|---|---|
| Minutos en fila por alumno | Cronómetro, 20 alumnos al azar, 3 días | Bajar de ~17 a **menos de 5** |
| Personas paradas frente a la cooperativa | Conteo cada 5 min durante el recreo | Bajar a la mitad |
| ¿La prefecta pudo hacer su ronda completa? | Sí / no, diario | De "casi nunca" a "casi siempre" |
| Pedidos atendidos por recreo | Contarlos | Que **suba**, no que baje |

**El punto 4 importa mucho:** si la app baja las filas pero también baja las ventas, la cooperativa
la va a apagar. La solución tiene que servirle a las dos partes.

---

## 2 · Quiénes lo usan

Tres personas distintas, tres necesidades que no se parecen:

| Quién | Qué quiere | Cuánto tiempo tiene |
|---|---|---|
| **El alumno** | Comer sin perder su recreo | 30 min, con prisa |
| **La cooperativa** | Despachar más rápido y no equivocarse | Las manos ocupadas |
| **La escuela / prefectura** | Que el pasillo esté despejado | Mirando, no usando |

**El alumno es el que decide si esto vive o muere.** Si le cuesta más trabajo pedir por la app que
formarse, se forma. Punto.

---

## 3 · Lo que pidió Carlos

### Para el alumno
1. **Menú digitalizado** — ver qué hay sin preguntar
2. **Pedir desde la app**
3. **Asistente de presupuesto** — *"traigo 50 pesos"* y la app arma opciones: plato fuerte + bebida
   + postre, y también combinaciones que no son ese trío
4. **Productos destacados**
5. **Aviso de que el pedido está listo**
6. **Ver qué turno de la fila virtual eres**
7. **Cuántos pedidos faltan antes del tuyo** y el tiempo estimado
8. **Experiencia personalizada** — tus tendencias, lo que más consumes

### La fila virtual
9. **Prioriza por complejidad, tiempo de entrega y hora en que se pidió** — no es sólo "primero en
   llegar"

### Para la cooperativa
10. **Ver los pedidos**, con el actual **en grande**: nombre, precio, cantidad y **foto** del producto
11. **Marcar "ya lo tengo"** — con la nota de cuál es de qué pedido
12. **Marcar "pedido listo"** → le avisa al cliente
13. El cliente **va, paga y se lleva** su pedido, con **ticket virtual**
14. **Sistema de deuda** — si paga de menos, el resto queda a deber y se suma al siguiente pago,
    avisando a los dos: qué pedido, cuánto, de qué, día, fecha y hora
15. **Límite de deuda** que bloquea nuevos pedidos hasta pagar
16. **Gestor de ventas del día** — qué se vendió, cuántas unidades
17. **Inventario** — marcar agotado / disponible de nuevo
18. **Menú del día en tiempo real**, y **programar la semana**, con imágenes
19. **Asistente para la cooperativa** — qué se vendió más y menos, reporte semanal, estadísticas,
    tiempo de entrega por producto

### Para Carlos
20. **Botón de sugerencias y reportes de error** para revisarlos él

### Más adelante
21. **Pago desde la app**

---

## 4 · Lo que queda fuera de la v1

**Nada.** Carlos lo decidió el 22 de agosto: es proyecto escolar, se entrega completo (§10).

La única función que él mismo marcó como *"más adelante"* es **el pago desde la app** (F32), porque
cobrar dinero de menores necesita pasarela, cuenta y permiso de la escuela — meses de trámite, no de
código. Aun así **se le deja el hueco hecho** desde ahora, para que el día que se autorice sea
conectar y no rehacer.

Catálogo completo: [`FUNCIONES.md`](FUNCIONES.md).

---

## 5 · La decisión técnica más importante — y por qué no es la que parece

**El cuello de botella NO es pedir. Es despachar.**

La app puede recibir 200 pedidos en el primer minuto del recreo, y eso **no hace que la comida
salga más rápido**. Si se digitaliza sólo el pedido, lo único que se logra es cambiar una fila de
cuerpos por una fila de números — y encima se enoja más gente, porque ahora ven exactamente cuánto
llevan esperando.

> ⚠️ **El riesgo real del proyecto: mover la fila, no quitarla.**

Lo que de verdad quita la fila son tres cosas, y sólo una es software:

1. **Que el alumno no tenga que estar parado ahí** → el aviso de "listo" y el turno visible. *(software)*
2. **Que la cooperativa despache en el orden más eficiente**, no en el que llegó → la fila
   priorizada por complejidad. *(software, y es la pieza más lista del brief de Carlos)*
3. **Que se pueda preparar por adelantado** → pedir **antes** del recreo, desde el salón. *(esto no
   es software, es una regla de la escuela — y es la que más minutos regala)*

**La número 3 es la palanca más grande y no depende de programar.** Si los alumnos pueden pedir
durante la clase anterior, la cooperativa arranca el recreo con veinte pedidos ya hechos en vez de
con cero. Hay que negociarla con la escuela, y va en el reporte del proyecto porque **es parte de la
solución, no un detalle de implementación**.

---

## 6 · Cómo se identifica un alumno sin registrarlo

Problema real: son cientos de menores de edad. Registrarlos con nombre, correo y contraseña es
mucho dato, mucho soporte y un problema de privacidad para un proyecto escolar.

**Propuesta: un código de alumno, sin contraseña.**

- El alumno abre la app y escribe **su nombre y su grupo** (ej. *"Carlos G. · 3°B"*)
- La app genera un **código corto** (ej. `3B-K7`) que se guarda en su teléfono
- Ese código es lo que ve la cooperativa en el pedido
- **No hay contraseña, no hay correo, no hay dato sensible**

**Lo que esto NO protege:** alguien podría escribir el nombre de otro. En una cooperativa escolar
donde el pedido se recoge en persona y se paga en el mostrador, eso se resuelve solo: si no eres tú,
no te lo dan.

**Lo que sí resuelve:** la deuda queda amarrada a alguien identificable, y la experiencia
personalizada (§3.8) funciona sin pedirle datos a un menor.

---

## 7 · El sistema de deuda · lo que hay que pensar bien

Es la parte más delicada del proyecto, porque **involucra dinero de menores y confianza de la
cooperativa**.

Lo que pidió Carlos está bien planteado. Lo que hay que definir con la cooperativa **antes** de
programarlo:

- **¿Cuál es el límite razonable?** Carlos dice "razonable" — hay que ponerle número. Sugerencia:
  el precio de un plato fuerte. Si debes más que una comida, no pides otra
- **¿Quién puede perdonar una deuda?** Tiene que existir el botón, porque va a pasar
- **¿Qué pasa al final del ciclo escolar?** Las deudas no se pueden quedar colgando
- **¿La deuda se ve en público?** **No.** Que un alumno vea la deuda de otro es humillación, no
  administración

---

## 8 · Estética y comodidad · la prioridad de siempre

Carlos lo repite en cada proyecto y aquí tiene una razón extra: **el usuario tiene 30 minutos y
hambre.** No hay margen para "¿dónde le pico?".

Principios para este proyecto:

- **Pedir en tres toques o menos** desde que abre la app
- **El turno y el "listo" tienen que verse desde la puerta**, sin desbloquear el teléfono si se
  puede (notificación grande y clara)
- **La pantalla de la cooperativa se usa con las manos ocupadas y sucias**: botones enormes, un
  pedido a la vez en grande, cero menús anidados
- **Foto de cada producto.** Un alumno que no reconoce el nombre del guiso sí reconoce la foto
- Objetivos táctiles de **44px mínimo**, como en Ligas Mazi

---

## 9 · Qué falta que decida Carlos

1. **¿La escuela deja pedir antes del recreo?** Es la palanca más grande (§5)
2. **¿Cuál es el límite de deuda en pesos?**
3. **¿Cuántos productos tiene el menú típico?** Cambia todo el diseño de la pantalla de pedido
4. **¿Cuántas personas despachan en la cooperativa?** Si es una sola, la fila priorizada es
   crítica; si son tres, menos
5. **¿Hay wifi en la escuela o los alumnos gastan datos?** Decide si la app tiene que funcionar sin
   conexión
6. **¿Cuánto tiempo hay para entregar el proyecto?**

---

## 10 · Lo que decidieron los dos consejos

Esta acta pasó por las dos casas antes de tocar código.

- **Los cuatro jueces** — [`.claude/veredictos/2026-08-22-fadori.md`](../.claude/veredictos/2026-08-22-fadori.md)
  **CONSTRUIR**, con el alcance cortado a la mitad, como proyecto escolar.
  **ARREGLAR PRIMERO** como negocio: falta el número de antes y después.
- **La sala de máquinas** — [`.claude/auditorias/2026-08-22-fadori-antes-de-construir.md`](../.claude/auditorias/2026-08-22-fadori-antes-de-construir.md)
  **ARREGLAR PRIMERO**, y se arregla en el papel: diez hallazgos, cuatro de ellos antes de crear la
  primera tabla.

### El alcance de la v1 · **completo. Decisión de Carlos, 22 de agosto**

> *"Sobre lo de dejar cosas fuera de la v1 me niego. No es negocio, es proyecto escolar esta vez,
> así que hay que entregarlo TODO lo más rápido posible desde la v1. No quites NINGUNA de las
> funciones que te di, a lo mucho súmale más."*

**Los dos consejos recomendaron cortar el alcance a la mitad. Carlos lo escuchó y decidió lo
contrario, y la decisión es válida:** el argumento del corte era de negocio —no quemar meses antes
de saber si se vende— y aquí no hay venta que proteger. Es una entrega escolar con fecha, donde
**entregar completo es la calificación**.

Lo que **no** desaparece con la decisión es el riesgo; nada más se muda de lugar: **deja de ser
riesgo de producto y se vuelve riesgo de calendario.** Se administra construyendo en el orden del
[`FUNCIONES.md`](FUNCIONES.md), que está puesto para que **cada bloque terminado ya sirva solo**:
si el tiempo se acaba a la mitad, lo entregado funciona en vez de quedar a medias.

**El catálogo completo —las 21 funciones de Carlos más 22 que sumé yo— vive en
[`FUNCIONES.md`](FUNCIONES.md).**

### Las tres cosas que la decisión sí obliga a cambiar

1. **La deuda entra a la v1**, y con ella su condición: **términos de uso que se firman una sola vez**
   —conformidad de la deuda + aviso de privacidad— y quedan registrados con fecha y hora. Lo pidió
   Carlos y es exactamente lo que la auditoría necesitaba para bajar ese hallazgo de 🔴 a manejable.
   Sigue en pie lo de Paola: **la deuda no se ve en ninguna pantalla que vea otro alumno.**
2. **La app se mide sola.** Los números dejan de depender de que alguien se pare con un cronómetro:
   la propia app cuenta la fila, el despacho, la espera y quién no alcanzó, y además trae un
   **contador manual** para capturar el "antes" los días que todavía no esté publicada. Es la
   función 38 del catálogo y es la que le da el reporte al proyecto STEAM.
3. **Los números medidos a mano dejan de ser la base del diseño.** Sirvieron para entender la forma
   del problema —la cooperativa está saturada, y casi la mitad de los que se forman no alcanza— y
   ahí se quedan, como sospecha bien fundada. **La cifra buena la va a dar la app.**

### Las cuatro condiciones antes de la primera tabla

1. **El rol de "cooperativa" vive en la base, no en el teléfono.** Las reglas de acceso se escriben
   al crear la tabla, no después.
2. **El turno se calcula en un solo lugar**, del lado del servidor. Si lo ordena cada teléfono, dos
   alumnos ven el mismo número.
3. **Aviso de privacidad, nombre de pila + grupo (sin apellidos), cero fotos de alumnos, borrado al
   cerrar el ciclo escolar.**
4. **El número medido** (§11).

### Lo que no vio nadie hasta la junta

- **En iPhone, el aviso de "listo" sólo llega si la PWA está instalada en la pantalla de inicio.**
  La función principal del proyecto depende de que los alumnos hagan "Compartir → Agregar a inicio".
  Eso se resuelve con un cartel en el salón, no programando. **Falta confirmarlo en un iPhone real.**
- **Todo tiene que funcionar sin el aviso:** turno grande en pantalla, y la señora sigue gritando
  nombres. La app acelera, no reemplaza.
- **La fila física y la virtual van a convivir semanas**, y quien se formó va a sentir que se le
  adelantan los del teléfono. Es un pleito en el pasillo que no arregla el código: lo arregla una
  regla anunciada.
- **El que pide y no llega.** Comida hecha que nadie pagó. No estaba escrito qué pasa ahí.

---

## 11 · Lo primero que hay que hacer, y no es programar

**Un recreo. Un cronómetro. Una hoja con tres columnas.**

1. **Diez pedidos seguidos:** segundos desde *"¿qué le doy?"* hasta que el alumno se va con su
   comida.
2. **Cuántos pedidos** se despacharon en todo el recreo.
3. **Cuánta gente hay formada** al minuto 5, al 10 y al 15.

Y luego la multiplicación que decide el proyecto entero: `promedio de segundos × total de pedidos`.

| Resultado | Qué significa |
|---|---|
| **Menor** que el recreo | El cuello es la fila y la organización. **La app es la solución** y se construye como está planeada |
| **Mayor o parecido** | El cuello es el despacho. **El proyecto no es de filas: es de preparación por adelantado.** La app sigue existiendo, pero su pantalla principal deja de ser el turno |

Esos tres números también son el **antes** de la sección "cómo se mide si funcionó" (§1), o sea que
la medición no es un trámite: es la mitad del proyecto STEAM.

---

## 12 · La medición · **hecha**, y lo que de verdad enseña

Carlos midió el 22 de agosto, y corrigió el conteo el mismo día:

| Qué | Medido |
|---|---|
| Tiempo por pedido *(percibido)* | ~3 minutos |
| **Pedidos despachados por recreo** | **~50** |
| **Gente formada al minuto 5 · 10 · 15** | **82 · 76 · 64** |

### El objetivo, dicho por Carlos y que manda sobre todo lo demás

> *"Yo no voy a desaparecer la fila, sólo la quiero volver virtual."*

**Eso es lo correcto y es lo que se construye.** Este documento estuvo un rato midiendo el proyecto
contra una promesa que nadie hizo —"que la espera se acorte"— y ése no es el trato. El trato es
**sacar la fila del pasillo**, y los números de abajo dicen que es exactamente la intervención que
cabe.

### Lo que sale de los números

```
50 pedidos ÷ 30 minutos = 1.67 por minuto = 36 segundos de despacho por pedido
50 pedidos × 36 segundos = 30 minutos       = EL RECREO COMPLETO
```

36 segundos es un número creíble para la transacción real —preguntar, agarrar, entregar, cobrar,
dar cambio—, y **cuadra por sí solo con el conteo de la fila**: entre el minuto 5 y el 15 se atienden
unos 17, y la fila baja 18. O sea que casi nadie se forma después del minuto 5: **todos llegan de
golpe cuando suena la chicharra** y de ahí sólo se drena.

Los 3 minutos que sintió Carlos no son el despacho: son **la espera percibida**. También es dato,
pero mide otra cosa.

### El hallazgo nuevo, que no se veía antes y es el más fuerte del proyecto

Ochenta y dos personas se forman. Cincuenta alcanzan.

| | |
|---|---|
| Formados al minuto 5 | **82** |
| Despachados en todo el recreo | **~50** |
| **Todavía formados cuando suena la campana** | **~39** |
| **Porcentaje de la fila que no alcanza** | **48 %** |

> **Casi la mitad de los que se forman pierden el recreo parados y se van sin comer.**

Con fila física eso es invisible: es "no alcancé" y ya. **Con fila virtual la app lo sabe desde el
minuto 2** — sabe cuántos hay adelante y a qué ritmo se despacha, o sea que sabe quién no va a
alcanzar antes de que esa persona gaste su recreo averiguándolo.

Y eso convierte un dato triste en la mejor función del proyecto: **avisar "no alcanzas hoy" es un
servicio.** El alumno se va a comer lo que trae, a jugar o a sentarse, en vez de perder treinta
minutos de pie para nada. Ninguna fila física puede hacer eso.

### La fila virtual sí resuelve el problema de Carlos · eslabón por eslabón

Del §1, con la fila vuelta virtual y **sin acortar un solo minuto de espera**:

| # | Eslabón | ¿Se resuelve? |
|---|---|---|
| 1 | La fila se come el recreo | Parcial — se sigue esperando, pero **esperas sentado** |
| 2 | El pasillo se inunda | ✅ **Sí.** Es el efecto directo |
| 3 | La prefecta no puede pasar | ✅ **Sí** |
| 4 | Se pierde la supervisión de los lejanos | ✅ **Sí** |
| 5 | Nadie sabe cuándo está listo | ✅ **Sí.** Es la función del turno y el aviso |
| 6 | No alcanzan a despejarse | ✅ **Sí** — el tiempo de espera se vuelve tiempo de comer y convivir |
| 7 | Regresan con energía sin gastar | ✅ Se sigue del 6 |

**Seis de siete, sin tocar la capacidad.** Por eso el proyecto se sostiene completo aunque la espera
dure lo mismo.

### Y la única palanca que sí acorta la fila, para cuando se quiera

La cooperativa está **saturada al 100%**: los 30 minutos ocupados, sin holgura. Reordenar una fila
saturada cambia quién espera, no cuánto. Lo único que sube la capacidad sin contratar a nadie es que
**parte de la comida ya esté hecha cuando suena la chicharra**:

| Pedidos hechos antes del recreo | Alcanzan a comer, de 82 | Se quedan sin |
|---|---|---|
| 0 (hoy) | 50 | **39** |
| 10 | 60 | 22 |
| 20 | 70 | 12 |
| **30** | **80** | **2** |

**Con treinta pedidos anticipados, prácticamente todos comen.** Ése es el argumento para negociar
con la escuela, y es mucho más fuerte que "menos espera": no es comodidad, es que **hoy la mitad de
los que se forman no come**.

### Qué cambia en el diseño

- **La pantalla del turno es la principal, y estaba bien.** Es la que saca a la gente del pasillo.
  Se diseña para verse de un vistazo, con el número grande, y para que la app se pueda cerrar.
- **Junto al turno va el tiempo estimado y el aviso honesto:** *"vas en el 38 · alcanzas"* o *"vas en
  el 71 · hoy no alcanzas, ¿te avisamos mañana?"*. La honestidad aquí es la función, no un detalle.
- **Pedir con anticipación entra a la v1** — no como comodidad, sino porque es lo único que hace que
  más gente coma. Con un modo **"pendientes de mañana"** en la pantalla de la cooperativa, o la
  ventaja se pierde.
- **La fila priorizada por complejidad necesita un tope.** Saturado, atender primero lo rápido baja
  el promedio de todos pero **deja sin comer al que pidió el plato fuerte**. Ningún pedido puede
  quedarse atrás más de N turnos.
- **Las metas del §1 se corrigen a las que la aritmética permite:**

| Métrica | Antes | Meta honesta |
|---|---|---|
| Gente parada frente a la cooperativa | 74 en promedio | **menos de 15**, desde el día uno |
| Alumnos que se forman y no alcanzan | **39 (48%)** | **menos de 10**, con pedidos anticipados |
| Minutos de pie en el pasillo | ~17 por alumno | **menos de 3** — sólo ir por el pedido |
| Pedidos atendidos por recreo | 50 | **que suba**, nunca que baje |

### El número para el reporte STEAM

> **Cada recreo, 82 alumnos se forman y sólo 50 alcanzan a comprar. Los otros 39 pasan hasta media
> hora de pie en un pasillo y regresan al salón sin comer.**

Se entiende sin explicar nada, sale de una medición propia, y es el "antes" contra el que se compara
todo lo demás.

*Acta de arranque · Grupo Mazi · Fadori · Proyecto Sin Filas*
