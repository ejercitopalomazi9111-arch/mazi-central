# Fadori · Catálogo completo de funciones

> **Todo entra a la v1.** Decisión de Carlos del 22 de agosto: es proyecto escolar, no negocio, y
> entregar completo es la calificación.
>
> **43 funciones: las 21 que pidió Carlos, más 22 que sumé.** Ninguna de las suyas se quitó.
> Las marcadas **(+)** son las que agrego yo; las demás son textuales de su brief.

---

## Cómo está ordenado esto

El orden **no** es de importancia: es de **construcción**. Cada bloque está armado para que, al
terminarlo, **la app ya sirva sola aunque no siga nada más**. Es la única defensa contra el riesgo
real de un proyecto con fecha: que se acabe el tiempo a la mitad de algo.

| Bloque | Qué queda funcionando al cerrarlo |
|---|---|
| **1 · El esqueleto** | Se ve el menú y se puede pedir. Ya sirve como carta digital |
| **2 · La fila virtual** | Nadie se para en el pasillo. **Aquí el proyecto ya cumple su objetivo** |
| **3 · El mostrador** | La cooperativa despacha desde la pantalla y cobra |
| **4 · El dinero** | Ticket, deuda, límites y términos firmados |
| **5 · La trastienda** | Inventario, menú de la semana, ventas del día |
| **6 · El cerebro** | Asistente de presupuesto, asistente de la cooperativa, personalización |
| **7 · El instrumento** | La app se mide sola y exporta el reporte STEAM |

---

# Bloque 1 · El esqueleto

### F01 · Menú digitalizado
Todos los productos con **foto, nombre, precio y categoría**. La foto es el producto: un alumno que
no reconoce el nombre del guiso sí reconoce la foto.

### F02 · Productos destacados
Franja de arriba. **El plato fuerte del día va siempre primero**, porque es el que cambia y el que
la gente busca.

### F03 · Pedir desde la app
Del menú al pedido en **tres toques**. La confirmación va **integrada al último toque** —mantener
apretado o deslizar— no en una pantalla aparte: cuatro toques con hambre es uno de más.

### F04 · **(+)** "Lo de siempre" · favoritos
Un toque y pides lo mismo de ayer. Es la función de comodidad más grande que existe en cualquier app
de comida, y en un recreo de 30 minutos vale el doble.

### F05 · **(+)** Pedido para varios
*"Pido por mí y por mis dos amigos."* Un turno, tres comidas, un pago. Es lo que ya hacen en la
escuela mandando a uno por todos — **y es de lo poco que baja la fila de verdad**, porque convierte
tres lugares en uno.

### F06 · **(+)** Identidad sin registro
Nombre de pila + grupo (*"Carlos G. · 3°B"*), y la app genera un **código corto** que se guarda en
el teléfono. **Sin contraseña, sin correo, sin apellidos, sin foto del alumno.** Cientos de menores
sin una base de datos de menores.

### F07 · **(+)** Funciona sin conexión
El pedido se escribe **primero en el teléfono** y se manda solo cuando hay red. En un pasillo con
doscientos teléfonos pegados al mismo punto de acceso, una app que se queda pensando es una app que
te manda a formarte.

---

# Bloque 2 · La fila virtual · *el corazón del proyecto*

### F08 · Turno en la fila virtual
Tu número, **en grande, ocupando la pantalla**. Se tiene que leer de un vistazo y con el brazo
estirado. Es la pantalla que saca a la gente del pasillo.

### F09 · Cuántos pedidos faltan antes del tuyo + tiempo estimado
El estimado sale del **tiempo real medido por producto** (F39), no de un número inventado.

### F10 · Fila priorizada por complejidad, tiempo de entrega y hora del pedido
No es "primero en llegar". Atender primero lo rápido baja el promedio de espera de todos.

**Con un tope obligatorio:** ningún pedido puede quedarse atrás más de **N turnos**. Sin ese tope, el
que pidió el plato fuerte nunca come — y eso se nota al tercer día.

### F11 · Aviso de que tu pedido está listo
Notificación al teléfono. **Y todo tiene que funcionar sin ella:** el turno se ve en pantalla, y la
señora sigue gritando nombres. La app acelera, no reemplaza. El día que se caiga, el recreo sigue.

> ⚠️ **En iPhone la notificación sólo llega si la app está instalada en la pantalla de inicio.**
> Se resuelve con un cartel en el salón y treinta segundos de explicación, no programando. **Falta
> confirmarlo en un iPhone real antes de prometerlo.**

### F12 · **(+)** Aviso de "alcanzas / no alcanzas"
El turno nunca sale solo. Sale con veredicto:

- *"Vas en el 38 · **alcanzas**, como en 11 minutos"*
- *"Vas en el 71 · **hoy no alcanzas**. ¿Te lo apartamos para mañana?"*

Con fila física, "no alcancé" se descubre **cuando ya perdiste el recreo**. La app lo sabe al minuto
dos. **Decirle la verdad temprano le devuelve el recreo aunque no le dé de comer**, y es la única
función de todo el catálogo que una fila física no puede hacer ni contratando a diez personas.

**Lo ve el alumno y nadie más.** Una pantalla pública de "los que no alcanzaron" es exhibir a un
menor.

### F13 · **(+)** Pedir con anticipación, desde el salón
Pides en la clase anterior y la cooperativa arranca el recreo con pedidos ya hechos en vez de con
cero. **Es la única palanca que sube la capacidad sin contratar a nadie**, y por lo tanto lo único
que hace que más gente alcance a comer.

Necesita permiso de la escuela. Va en el reporte del proyecto porque **es parte de la solución, no
un detalle de implementación**.

### F14 · **(+)** Apartar para mañana
Si hoy no alcanzaste, tu pedido se guarda y entras primero mañana. Convierte el peor momento de la
app en el que te hace volver.

### F15 · **(+)** "Voy en camino" / "hoy no puedo ir"
El alumno avisa. Sin esto, la comida se hace y nadie la recoge: **la señora perdió el ingrediente y
el lugar en la fila**, y es el problema económico número uno de pedir sin pagar por adelantado.

### F16 · **(+)** Tope de pedidos por alumno por recreo
Sin tope, alguien pide treinta tortas de broma el primer día y los pedidos reales quedan atrás.

### F17 · **(+)** Pantalla pública de turnos
Opcional, en una tablet o pantalla junto a la cooperativa, como en el banco. **Para quien no traiga
teléfono.** Muestra **números, nunca nombres**.

### F18 · **(+)** Sonido y vibración distintos para "ya casi" y "listo"
Para no tener que sacar el teléfono cada treinta segundos.

---

# Bloque 3 · El mostrador · *la pantalla de la cooperativa*

> Se usa **con las manos ocupadas, sucias y muchas veces con sol pegando**. Fondo claro y letras
> negras —al revés que la del alumno—, botones del tamaño de la palma, cero menús anidados.
> **Si necesita dos toques para despachar, ya perdió contra la libreta.**

### F19 · Ver los pedidos, con el actual en grande
Nombre, precio, cantidad y **foto del producto**. Un pedido a la vez ocupando toda la pantalla.

### F20 · "Ya lo tengo", renglón por renglón
Con la nota de cuál renglón es de qué pedido, para los pedidos de varias cosas.

### F21 · "Pedido listo" → le avisa al cliente

### F22 · **(+)** Modo mostrador · pedidos de a pie
La señora mete el pedido de alguien que llegó **sin app**. Sin esto, la fila física queda fuera del
sistema, el turno miente y **las mediciones miden la mitad de la operación**. Es la función que
mantiene un solo mundo en vez de dos.

### F23 · **(+)** Varios despachadores a la vez
Si atienden dos o tres personas, cada una toma pedidos de la cola **sin chocar** con las otras. Afecta
directamente cuántos alcanzan a comer.

### F24 · **(+)** Código en el ticket
Un código corto (o QR) que identifica el pedido. Resuelve el caso real de **dos "Carlos G." en 3°B**:
el código los distingue, el nombre gritado no.

### F25 · **(+)** Modo a mano · si se cae la app
Un botón que congela y **muestra la lista completa para despachar en papel**. La operación no se
detiene nunca, pase lo que pase con la red o con el servidor.

---

# Bloque 4 · El dinero

### F26 · Ticket virtual
Al pagar y recoger. Con qué pidió, cuánto, día, fecha y hora.

### F27 · Sistema de deuda
Si paga de menos, **el resto queda a deber y se suma al siguiente pago**. Se avisa **a los dos** —
alumno y cooperativa — con: **qué pedido, cuánto, de qué, día, fecha y hora**.

### F28 · Límite de deuda que bloquea nuevos pedidos
Al llegar al límite, no se puede pedir hasta pagar. **El límite lo pone la cooperativa**, no el
código; sugerencia de arranque: el precio de un plato fuerte.

### F29 · **(+)** Términos de uso, firmados una sola vez
Lo pidió Carlos y es lo que hace legítima la deuda. **Una pantalla, una vez, y ya:**

- conformidad con el sistema de deuda y su límite
- aviso de privacidad en español que se entienda: qué se guarda, para qué, quién es responsable
- se registra **con fecha y hora** de aceptación

**Y la regla que no se rompe: la deuda de un alumno no aparece en ninguna pantalla que vea otro
alumno.** Que un compañero vea lo que debes es humillación, no administración.

### F30 · **(+)** Perdonar o ajustar una deuda
El botón tiene que existir porque va a hacer falta. Sólo la cooperativa, y queda registrado quién y
cuándo.

### F31 · **(+)** Cierre de ciclo escolar
Saldar o perdonar lo pendiente y **borrar los datos**. Si nadie escribe cuándo se borra, no se borra
nunca.

### F32 · Pago desde la app
Marcado por Carlos como *"más adelante"*. **Se diseña desde ahora el hueco donde entra** —el ticket
y el estado del pedido ya contemplan "pagado en línea"— para que el día que la escuela lo autorice
sea conectar, no rehacer.

---

# Bloque 5 · La trastienda

### F33 · Inventario · agotado / disponible de nuevo
Un toque. Lo agotado desaparece del menú del alumno **al instante**, que es como se evita el pedido
de algo que ya no hay.

### F34 · Menú del día en tiempo real
El plato fuerte cambia diario y se sube en el momento, con imagen.

### F35 · Programar la semana, con imágenes
Lo mismo pero por adelantado, para no hacerlo con prisa cada mañana.

### F36 · Gestor de ventas del día
Qué se vendió, cuántas unidades, cuánto entró.

### F37 · **(+)** Alertas de inventario
*"Te quedan 3 de X."* Avisar antes de que se acabe vale más que reportar que se acabó.

### F38 · **(+)** Cierre de recreo, de un vistazo
Al sonar la campana, la señora ve en una pantalla: **cuánto vendió, cuántos despachó, cuántos no
alcanzaron, qué se agotó primero y a qué hora**. Es el resumen que hoy no existe en ningún lado.

---

# Bloque 6 · El cerebro

### F39 · Asistente de presupuesto
*"Traigo 50 pesos"* → la app arma opciones que caben: plato fuerte + bebida + postre, **y también
combinaciones que no son ese trío**. Es la función más querible de todo el brief.

### F40 · Asistente para la cooperativa
Qué se vendió más y qué menos, **reporte semanal**, estadísticas, y **tiempo de entrega real por
producto** — que además es lo que alimenta el estimado del alumno (F09) y la prioridad de la fila
(F10). El dato se mide solo; no hay que capturarlo.

### F41 · Experiencia personalizada
Tus tendencias, tus productos más consumidos, cuánto llevas gastado.

### F42 · Botón de sugerencias y reportes de error
Del alumno y de la cooperativa, **a una bandeja que revisa Carlos**. Con qué pantalla estaba abierta
cuando se reportó, para no tener que adivinar.

---

# Bloque 7 · El instrumento · *la app se mide sola*

### F43 · **(+)** Medidor del proyecto
**Lo pidió Carlos y es lo que le da el reporte al proyecto STEAM.** La app no sólo resuelve el
problema: lo **documenta**, sin que nadie tenga que pararse con un cronómetro.

**Mide solo, todos los días:**

| Qué | Cómo lo saca |
|---|---|
| Cuánta gente hay en la fila, minuto a minuto | Cuenta los turnos sin despachar |
| Segundos reales de despacho por pedido | De "ya lo tengo" a "listo" a "cobrado" |
| Cuánto esperó cada alumno | De que pidió a que recogió |
| **Cuántos pidieron y no alcanzaron** | Turnos vivos cuando termina el recreo |
| Tiempo de entrega por producto | Promedio por platillo |
| Cuántos pidieron con anticipación | Y cuántos minutos ahorró eso |

**Y el contador manual, para el "antes":** una pantalla con un botón grande para **contar a mano** a
la gente formada —los días en que la app todavía no está publicada, o para contar la fila física que
convive con la virtual. Es como se captura la línea base sin depender de la memoria de nadie.

**Todo exportable a CSV**, para meterlo al reporte y a la gráfica de antes y después.

> **Por qué esto importa más de lo que parece:** una app que dice "resolvimos el problema de las
> filas" es una opinión. Una app que **enseña la gráfica de cómo bajó**, con datos que ella misma
> recogió, es un proyecto STEAM que se defiende solo.

---

# Bloque 8 · Cuando se acaba algo · *el hueco que encontró Carlos*

### F45 · **(+)** Se acabó, y la fila ya lo había pedido

Salió de una pregunta suya, que es como salen casi todos los huecos de verdad:

> *"Y si se acaba un producto y varios en la fila lo pidieron, no pasa nada. No hay manera de
> eliminar un pedido que al final no entregaste, ni les llega el aviso de que su pedido no se
> puede realizar, y se les dan sugerencias."*

Y era exacto. "Se acabó" sacaba el platillo del menú **para los que todavía no habían pedido**, y a
los que ya estaban formados no les pasaba absolutamente nada: seguían esperando algo que no iba a
salir y se enteraban al llegar al mostrador, que es justo el viaje que esta app existe para
ahorrarse.

**Lo que hace ahora, en las dos direcciones:**

| Del lado de la cooperativa | Qué pasa |
|---|---|
| Toca **"Se acabó"** | Antes de quitarlo le dice **cuántos pedidos de la fila lo traen y a quiénes**, y le da a escoger: *quitarlo y avisarles* o *sólo quitarlo* (para cuando ya les dijo en persona) |
| Toca **"no hay"** en un renglón | Es "a ÉSTE no se lo puedo dar" — se cayó, salió mal, era el último. **No toca el menú**, sólo ese pedido |
| Se le acaba el **inventario** surtiendo | La fila se entera **sola**. Nadie va a acordarse de tocar un botón con las manos ocupadas |
| Cierra el día | El corte dice **de qué faltó y a cuánta gente formada**. "Se acabó el pozole" no dice nada; "se acabó el pozole con nueve formados" dice cuánto comprar mañana |

| Del lado del alumno | Qué ve |
|---|---|
| Le vibra y le sale un punto rojo | En "Mi turno", aunque esté en otra pantalla |
| Un cartel pegado a su turno | **"Se acabó la torta. Perdón, la falla fue de aquí."** |
| El total ya bajado | *No pagas lo que no te dieron* |
| Tres cosas que sí hay | Del mismo tipo, y **nunca más caras** de lo que ya iba a pagar |
| Un botón para dejarlo así | Se lleva lo demás, o cancela si no le quedaba nada |

**Las tres reglas que sostienen todo esto:**

1. **El renglón no se borra, se marca.** Si se borrara, nadie podría contar cuántas veces se acabó
   algo con gente formada — y ése es el dato que sirve para comprar mejor.
2. **El total baja solo.** Nadie paga lo que no le dieron, y no depende de que alguien se acuerde.
3. **El lugar en la fila se respeta.** Si el alumno cambia lo que se acabó por otra cosa, conserva
   su turno y su hora de llegada; si su pedido se había caído entero, **revive con el mismo
   número**. Mandarlo al final por un error de la cooperativa es castigarlo por algo que no hizo.

---

## Las cinco reglas de construcción que aplican a todo

1. **Teléfono primero.** Objetivos táctiles de **44px mínimo**, texto de 16px o más en los campos.
2. **Dos mundos visuales opuestos:** el alumno oscuro y con fotos grandes; la cooperativa clara, de
   alto contraste y botones enormes.
3. **Nada se detiene si algo falla.** Sin red se pide igual (F07); sin app se despacha igual (F25);
   sin notificación se ve el turno igual (F11).
4. **El rol de "cooperativa" vive en la base de datos, no en el teléfono**, y el turno se calcula en
   un solo lugar del lado del servidor. Se decide antes de la primera tabla o sale carísimo después.
5. **Cero datos de más.** Nombre de pila y grupo, sin apellidos, sin correo, sin contraseña, sin
   fotos de alumnos, y borrado al cerrar el ciclo.

---

*Catálogo de funciones · Grupo Mazi · Fadori · Proyecto Sin Filas · 22 de agosto de 2026*
