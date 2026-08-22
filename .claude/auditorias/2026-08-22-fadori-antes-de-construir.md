# Auditoría · Fadori · antes de escribir una línea

**Fecha:** 22 de agosto de 2026
**Sistema:** `fadori/` — app de la cooperativa escolar (todavía no existe código)
**Mesa:** **completa**. Lo pide la regla: hay **datos de menores** y hay **dinero**.
**Acta previa relacionada:** [`2026-08-22-fadori.md`](../veredictos/2026-08-22-fadori.md) — los cuatro
jueces ya dijeron CONSTRUIR con el alcance cortado. Esta casa no discute **si**; discute **cómo
aguanta**.

---

## ⏱ TURNO 1 · Nadia Berrones abre

**Nadia:** Es raro auditar algo que no existe, así que lo encuadro. No venimos a revisar código,
venimos a revisar **el plan**, que es cuando corregir sale barato. Y aviso lo que ya sé que va a
pasar: aquí hay tres cosas que esta casa no deja pasar nunca —menores, dinero y suplantación— y las
tres están en el brief. Verónica, arranca.

---

## ⏱ TURNO 2 · Arquitectura

**Verónica Alcázar:** La suposición enterrada del documento está en la palabra "tiempo real". El
`PROYECTO.md` dice **menú del día en tiempo real** y **fila virtual** como si la red fuera un dato.
No lo es: son doscientos teléfonos pegándose al mismo punto de acceso en el mismo minuto, en un
pasillo, con paredes. Si el pedido se manda y la app se queda pensando, el alumno **se forma**, y
ahí perdimos.

Segunda, y ésta es de diseño de datos, no de red: **el turno no lo puede calcular el teléfono.** El
brief pide una fila priorizada por complejidad, tiempo de entrega y hora del pedido. Si cada cliente
ordena la lista por su cuenta, dos alumnos van a ver "eres el 4" al mismo tiempo, y el día que uno
llegue antes que el otro se acabó la confianza en el número. **El orden se calcula en un solo lugar
y todos lo leen.** Un contador que sólo sube, del lado del servidor.

**Nayeli Cordero** *(desde el fondo)*: ¿Y eso cuánto cuesta?

**Verónica:** Nada, si se decide hoy. Carísimo si se decide cuando ya hay cien pedidos al día.

---

## ⏱ TURNO 3 · 🕳 "Cuervo" Saldaña · a ciegas

**Cuervo:** Yo no leí su código porque no hay. Leí el documento, que es lo que va a leer cualquiera
porque el repo es público.

§6. Código de alumno tipo `3B-K7`, **sin contraseña**. Bien pensado para no registrar menores, y lo
digo en serio. Pero el documento se contesta solo con un argumento que **sólo funciona en la v1**:
*"si no eres tú, no te lo dan"*. Cierto — mientras lo único que se pueda hacer con el código sea
pedir comida que hay que ir a recoger y pagar en persona.

En el momento en que existe la deuda del §7, ese mismo código sirve para **pedir a nombre de otro y
dejarle el cargo**. Y no hace falta ser un hacker: es un chiste de secundaria, y va a pasar la
primera semana.

**Damián Ocaña:** ¿Nivel?

**Cuervo:** Sin deuda, ⚪. Con deuda, 🔴. Es la misma función cambiando de color según lo que se
construya alrededor. No lo había visto así en ningún acta.

---

## ⏱ TURNO 4 · 🕳 AK Villalpando · con los planos

**AK:** No hay planos todavía, así que traigo el de Ligas Mazi, que es el que van a copiar — y lo
digo porque **se va a copiar**, es el stack que ya conocen.

En Ligas Mazi quedó abierta una pregunta de la auditoría pasada: **si la nube confía en el cliente
para saber quién es admin.** Aquí esa misma pregunta es peor. Allá, un rol mal validado te deja
editar un marcador. Acá te deja **marcar pedidos como listos**, o peor, **leer la lista completa de
quién pidió qué y quién debe cuánto**. Eso es un directorio de menores con su historial de consumo.

El arreglo es el mismo de siempre y hay que escribirlo antes de la primera tabla: **el rol vive en
la base, no en el teléfono.** Quién es cooperativa lo dice una tabla que el cliente no puede editar,
y las reglas de acceso se escriben **al crear la tabla**, no después. Ponerlas después es cómo
quedan tablas abiertas.

**Nadia:** Anotado. Eso no es sugerencia, es condición de arranque.

---

## ⏱ TURNO 5 · 🛡 Los blancos

**Damián Ocaña:** Priorizo lo de los dos negros: 1) rol en la base, 2) el turno del lado del
servidor, 3) la deuda no se construye hasta que exista el 1.

**Paola Rentería** *(datos y menores)*: Me toca lo que nadie quiere oír. Nombre + grupo + qué comió
+ cuánto debe, de un menor de edad, guardado en un servidor, **es dato personal** y cae bajo la
LFPDPPP. Lo que eso obliga es menos de lo que la gente cree y más de lo que este documento tiene
hoy: **aviso de privacidad en español que se entienda**, propósito limitado, y quién es el
responsable. No hay registro ante nadie ni certificación que pagar —eso ya lo aclaramos en julio—
pero **sí hay que escribirlo**.

Y tres reglas de diseño que valen más que el aviso:

1. **Nombre de pila y grupo. Sin apellidos.** "Carlos G. · 3°B" ya distingue en una escuela y
   guarda mucho menos.
2. **Cero fotos de alumnos.** Fotos de la comida, todas las que quieran.
3. **Se borra al cerrar el ciclo escolar.** Si nadie escribe cuándo se borra, no se borra nunca.

**Paola:** Y la que más me importa: **la deuda no se muestra en ninguna pantalla que vea otro
alumno.** El documento ya lo dice y quiero que quede en acta, porque es la que se rompe sin querer
el día que alguien ponga una lista bonita de pedidos con su saldo al lado.

**Emilio Nava:** Paso. Lo mío es aplicación y todavía no hay.

---

## ⏱ TURNO 6 · 🌙 Oficio y operación

**Chuy Barrera:** Tengo el hallazgo que le va a doler al proyecto y no es de seguridad.

La función número 5 del brief —**"un aviso que te diga cuando está listo tu pedido"**— es el corazón
del asunto. Es lo que despeja el pasillo: si no te avisan, te quedas parado ahí. Todo el proyecto
cuelga de ese aviso.

Y en iPhone, una página web **no puede mandarte una notificación** a menos que el usuario haya
**instalado la app en su pantalla de inicio**. Desde iOS 16.4 se puede, pero sólo así. Un alumno que
abre el link en Safari y no lo instala **no recibe nada**.

*(silencio)*

**Nayeli:** O sea que la función principal depende de que doscientos adolescentes hagan
"Compartir → Agregar a inicio".

**Chuy:** Exacto. Y eso no se arregla programando: se arregla en el salón, con un cartel y dos
minutos de explicación. Es hermano de la palanca del §5 — otra parte de la solución que no es
código.

**Rocco** *(entra, deja algo en la mesa)*: 🐕 Yo esto no lo he visto correr. Es de las cosas que
suenan verdaderas y cambian con cada versión de iOS. **No lo den por bueno hasta que alguien
instale una PWA en un iPhone real y le llegue la notificación con la pantalla apagada.** Traigo la
captura cuando haya iPhone.

**Nadia:** Correcto. Se anota como **hallazgo por confirmar**, no como hecho.

**Chuy:** Y el plan B se diseña desde hoy, porque va a hacer falta aunque funcione: **la pantalla
del turno tiene que servir sin notificación.** El alumno abre la app, ve su número enorme, y la
señora **sigue gritando nombres** como siempre. La app acelera, no reemplaza. El día que la app se
caiga, el recreo tiene que seguir.

**Nayeli Cordero** *(cuánto tarda, en tres cubetas)*:
- **Firme:** menú con fotos, pedido, turno, pantalla de despacho, agotado/disponible. Son las
  mismas formas que ya existen en Ligas Mazi. Se hace.
- **Con cuidado:** la fila priorizada (hay que ponerle números a "complejidad" producto por
  producto, y eso lo tiene en la cabeza la señora, no nosotros) y el aviso de listo.
- **Minado:** la deuda, el pago, y el asistente de estadísticas. La deuda por lo que dijo Cuervo; el
  asistente porque necesita meses de historial que hoy no existen.

---

## ⏱ TURNO 7 · 🎨 Diseño gráfico

**Renée Ibarra:** No opino, propongo. Dos pantallas, dos mundos, y el error caro sería hacerlas del
mismo estilo.

**La del alumno** se ve con una mano, caminando, con hambre y ruido. Fotos grandes de comida —la
foto es el producto—, precio legible sin acercarse, y cuando ya pidió, **el turno ocupa la pantalla
completa**: número gigante, nada más. Que se vea desde el otro lado del pasillo y a un metro de
distancia.

**La de la cooperativa** se ve con las manos ocupadas, sucias, y muchas veces con sol pegando. Fondo
claro y letras negras —al revés que el alumno—, un pedido a la vez ocupando todo, dos botones del
tamaño de la palma: **"lo tengo"** y **"listo"**. Cero menús anidados. Si necesita dos toques para
despachar, ya perdió contra la libreta.

**Mateo** *(paso)*: nada que agregar hasta que haya qué ver.

---

## ⏱ TURNO 8 · 🖥 Front end

**Ximena Ríos:** Tres cosas, apartado por apartado.

**Menú:** el brief pide productos destacados. Bien, pero **el destacado va arriba y es el plato del
día**, porque es el que cambia y el que la gente busca. Los demás van en cuadrícula de dos.

**Pedido:** *tres toques* lo dice el documento y estoy de acuerdo, pero falta el que se olvida — la
**confirmación**. Un alumno con prisa toca de más. Sin un "¿así?" antes de mandar, la señora prepara
comida que nadie pidió. Y ese "¿así?" tiene que ser un toque, no un modal con dos botones chiquitos.

**El asistente de presupuesto:** es la función más querible del brief entero y no va en la v1 según
el veredicto. Estoy de acuerdo con posponerla **y quiero que quede escrito por qué**, porque el día
que la vean funcionando se van a preguntar por qué no estaba desde el principio: **no quita ni un
minuto de fila**. Es lo que hace que la app se quiera; no es lo que hace que el proyecto sirva.
Primero que sirva.

---

## ⏱ TURNO 9 · 🐈 Michi

**Michi:** *(se sube a la mesa)* Todos aprobaron el ciclo "pido, me avisan, voy, pago". Yo hice
otras cosas.

1. **Pedí y no fui.** La comida está hecha, nadie la pagó, y la señora perdió el ingrediente y el
   lugar en la fila. Nadie en este documento escribió qué pasa ahí. **Es el problema económico
   número uno de pedir sin pagar por adelantado**, y va a ocurrir el día uno.
2. **Pedí treinta tortas de broma.** No hay tope. La cola de la cooperativa se llena de basura y los
   pedidos reales quedan atrás.
3. **Somos dos "Carlos G." en 3°B.** El código los distingue; **la señora gritando el nombre, no.**
4. **Pedí, y luego cambié mi pedido cuando ya estaba en el sartén.** ¿Se puede cancelar? ¿Hasta
   cuándo?
5. **Me formé igual.** Nadie va a apagar la fila física el primer día. Durante semanas van a
   convivir la fila de carne y la de números — **y quien se formó va a sentir que se le adelantan
   los del teléfono.** Eso es un pleito en el pasillo, y no lo resuelve el código: lo resuelve una
   regla anunciada.

**Nadia:** El 1 y el 5 son los buenos. El 5 sobre todo, porque no lo vio nadie y es el que puede
tumbar el proyecto sin un solo error de software.

---

## ⏱ TURNO 10 · 🐕 Rocco

**Rocco:** Traigo lo que falta, no lo que sobra. **Nadie en esta mesa ha visto el número.** El
documento dice 15 a 20 minutos de fila y todos lo repetimos toda la junta como si estuviera medido.
Está **observado**, que no es lo mismo.

Antes de la primera tabla, quiero: cuántos segundos tarda un despacho, cuántos pedidos hay por
recreo, y cuánta gente está formada a los 5, 10 y 15 minutos. Es un recreo con el cronómetro del
teléfono. **Si el despacho por sí solo ya se come el recreo, esta junta cambia de tema completo** —
deja de ser una app de filas y se vuelve una de preparación por adelantado.

---

## ⏱ TURNO 11 · ⚖️ Nadia falla

**VEREDICTO: `ARREGLAR PRIMERO`** — y se arregla en el papel, que es donde sale barato. Nada de esto
bloquea empezar; todo esto bloquea **empezar mal**.

**Lo que rechazo de mi propia gente:**

- **A Ximena**, su "tres toques más confirmación". Cuatro toques con hambre es uno de más. La
  confirmación va **integrada al último toque** —mantener apretado, o deslizar— no como pantalla
  aparte.
- **A Cuervo**, el 🔴. Hoy no hay deuda, así que hoy no sangra. Queda **⚪ aceptado con condición
  escrita**: el día que se construya la deuda, sube a 🔴 automáticamente y esta acta se reabre.
- **A mí misma**, de la auditoría pasada: dejé la pregunta de los roles en la nube abierta en Ligas
  Mazi "para después". Ya reapareció en otro proyecto. **No se vuelve a quedar abierta.**

### Los hallazgos

| # | Área | Nivel | Qué es | Cuándo |
|---|---|---|---|---|
| 1 | Ciberseguridad | ⚪→🔴 | El código sin contraseña es inofensivo hasta que exista la deuda. Condición escrita: si se construye la deuda, se reabre | al construir §7 |
| 2 | Ciberseguridad | 🟠 | El rol de "cooperativa" tiene que vivir en la base, no en el teléfono. Reglas de acceso **al crear** la tabla | antes de la 1ª tabla |
| 3 | Datos / menores | 🟠 | Aviso de privacidad, nombre de pila + grupo (sin apellidos), cero fotos de alumnos, borrado al cerrar el ciclo | antes de guardar el 1er dato |
| 4 | Arquitectura | 🟠 | El turno se calcula en un solo lugar, del lado del servidor. Nunca en el cliente | antes de la 1ª tabla |
| 5 | Oficio | 🟡 *(por confirmar)* | En iPhone el aviso de "listo" **exige que la PWA esté instalada en la pantalla de inicio**. Rocco trae la captura | antes de prometer la función |
| 6 | Oficio | 🟡 | Todo tiene que funcionar sin el aviso: turno visible en pantalla y la señora sigue gritando nombres | diseño desde hoy |
| 7 | Producto (Michi) | 🟠 | El que pide y no llega. No está escrito qué pasa con esa comida | antes del piloto |
| 8 | Producto (Michi) | 🟡 | Tope de pedidos por alumno por recreo. Sin tope, se llena de broma | v1 |
| 9 | Operación (Michi) | 🟠 | **La fila física y la virtual van a convivir semanas.** Quien se formó va a sentir que se le adelantan. Se resuelve con una regla anunciada, no con código | antes del piloto |
| 10 | Evidencia (Rocco) | 🟠 | Nadie ha medido el despacho. Un recreo con cronómetro **antes** de la primera tabla | ya |

### La prueba que reproduce

**Un recreo, un cronómetro, tres columnas en una hoja.**

1. Diez pedidos seguidos: segundos desde "¿qué le doy?" hasta que el alumno se va con su comida.
2. Cuenta total de pedidos del recreo.
3. Cuánta gente hay formada al minuto 5, al 10 y al 15.

Luego: `promedio × total`. Si eso ya es mayor que el recreo, **el proyecto es de preparación por
adelantado, no de filas**, y la pantalla principal de la app deja de ser el turno.

Eso confirma o tumba el hallazgo 10, que es el que sostiene a todos los demás.

---

## ⏱ TURNO 12 · Rocco vuelve con el número · 22 de agosto, mismo día

**Rocco:** 🐕 Traigo la medición, y traigo también la corrección que Carlos hizo el mismo día. **No
son cien pedidos: son unos cincuenta.** La fila contada: **82 al minuto 5, 76 al 10, 64 al 15.**

**Verónica:** Cincuenta en treinta minutos son **treinta y seis segundos por despacho**. Y ése sí es
un número creíble para la transacción real: preguntar, agarrar, entregar, cobrar, dar cambio.

**Rocco:** Y cuadra solo. Entre el minuto 5 y el 15 se atienden diecisiete y la fila baja dieciocho.
O sea que **casi nadie se forma después del minuto 5**: llegan todos de golpe con la chicharra y de
ahí sólo se drena. Los tres números se sostienen entre ellos. Eso es lo que me faltaba para creerles.

**Chuy:** Cincuenta por treinta y seis segundos siguen siendo **treinta minutos**. El recreo
completo. La saturación no cambió, sólo cambió la aritmética que llega a ella.

**Verónica** *(interrumpe)*: Esperen. Hagan la resta que nadie hizo.

*(pausa)*

**Verónica:** Se forman **ochenta y dos**. Alcanzan **cincuenta**. **Treinta y nueve siguen formados
cuando suena la campana.**

**Ximena:** Casi la mitad de la fila pierde el recreo de pie **y se va sin comer.**

**Nadia:** Eso no está escrito en ninguna parte del acta de arranque. Ni en la cadena de siete
eslabones. ¿Alguien lo había visto?

*(nadie contesta)*

**Nadia:** Ése es el hallazgo del proyecto, y llevábamos dos juntas sin verlo porque estábamos
midiendo minutos de espera en vez de contar gente.

---

## ⏱ TURNO 13 · Carlos corrige el encuadre, y la casa se corrige a sí misma

**Nadia:** Antes de seguir hay que leer lo que dijo Carlos, porque nos endereza:

> *"Yo no voy a desaparecer la fila, sólo la quiero volver virtual."*

**Ximena:** Entonces llevamos dos actas discutiendo contra una promesa que él nunca hizo. Yo incluida.

**Nadia:** Yo sobre todo. En el turno 11 fallé que "se cae la promesa, no el proyecto" — y la promesa
que se caía era **nuestra**, no la de él. Él siempre dijo fila **virtual**, no fila **corta**. Es un
error de lectura de esta casa y va en acta con mi nombre.

**Renée:** Y volverla virtual **sí** resuelve lo que le duele. Cuento los eslabones del §1: el
pasillo, la prefecta, la supervisión, el saber cuándo está listo, el despejarse, la energía en el
salón. **Seis de siete, sin subir la capacidad ni un pedido.** El único que queda a medias es el
primero, y a medias porque **se sigue esperando, pero sentado.**

**Michi** *(desde la mesa)*: Y mi hallazgo 9 mejora, no empeora. Si la fila **es** virtual por
diseño y no un carril paralelo que se le adelanta a la de carne, el pleito del pasillo se
desactiva: no hay dos filas, hay una y está en el teléfono. Lo que hay que evitar es el modo mixto
por accidente.

---

## ⏱ TURNO 14 · Lo que el número le agrega al producto

**Ximena:** Los treinta y nueve que no alcanzan son una función, no una tragedia.

Con fila física, "no alcancé" se descubre **cuando ya perdiste el recreo**. Con fila virtual la app
sabe al minuto dos cuántos hay adelante y a qué ritmo se despacha — o sea que **sabe quién no va a
alcanzar antes de que esa persona gaste su recreo averiguándolo.**

Propongo que el turno nunca salga solo. Sale con veredicto:

- *"Vas en el 38 · **alcanzas**, como en 11 minutos"*
- *"Vas en el 71 · **hoy no alcanzas**. ¿Te lo apartamos para mañana?"*

**Nayeli:** Eso es cruel.

**Ximena:** Es lo contrario. Cruel es que se entere a los treinta minutos, parado. **Decirle la
verdad temprano le devuelve el recreo aunque no le dé de comer.** Y es la única función de todo el
brief que una fila física **no puede** hacer ni contratando a diez personas.

**Nadia:** Aceptada, y con una condición de Paola.

**Paola:** Gracias. **Ese aviso lo ve el alumno y nadie más.** Una pantalla pública de "los que no
alcanzaron" es exhibir a un menor. Igual que la deuda.

**Chuy:** Y aprovecho el número para lo mío: con treinta pedidos hechos **antes** de la chicharra,
alcanzan ochenta de ochenta y dos. **Prácticamente todos comen.** Eso ya no es un argumento de
comodidad para negociar con la escuela — es *"hoy la mitad de los que se forman no come, y con esto
sí"*. Con eso sí se sienta uno con la dirección.

---

## ⏱ TURNO 15 · ⚖️ Nadia refalla

**El veredicto no cambia: `ARREGLAR PRIMERO`**, y las cuatro condiciones antes de la primera tabla
siguen intactas. Lo que cambia es el alcance de la v1 y una meta que estaba mal escrita.

**Lo que rechazo, y esta vez es de mi propia acta:**

- **A mí misma, el turno 11.** Dije que el proyecto "cambiaba de tema" y no cambiaba: **cambiaba
  nuestra lectura de él.** Carlos tenía el encuadre correcto desde el principio.
- **A Ximena, nada.** Su veredicto del turno es el mejor de las tres juntas.
- **La meta del §1** —"bajar la fila de 17 a menos de 5 minutos"— queda **rechazada por imposible**
  sin pedidos anticipados. Se sustituye por dos que sí se pueden cumplir y sí se pueden medir:
  **parados en el pasillo, de 74 a menos de 15**; y **alumnos que se forman y no alcanzan, de 39 a
  menos de 10.**

### Los hallazgos nuevos

| # | Área | Nivel | Qué es | Cuándo |
|---|---|---|---|---|
| 11 | Producto | 🟠 | **39 de 82 se forman y no alcanzan a comprar.** No estaba en la cadena de consecuencias y es el dato más fuerte del proyecto | ya, va al reporte |
| 12 | Producto | 🟠 | El turno nunca sale solo: sale con *"alcanzas"* o *"hoy no alcanzas"*. Es lo único que una fila física no puede hacer | v1 |
| 13 | Datos / menores | 🟡 | El aviso de "no alcanzas" lo ve **sólo** el alumno. Nunca una pantalla pública | v1 |
| 14 | Producto | 🟡 | Pedir con anticipación sube a la v1: con 30 anticipados, alcanzan 80 de 82 | v1 |
| 15 | Operación | 🟡 | **Evitar el modo mixto por accidente.** Si la fila virtual convive con un carril físico que se adelanta, vuelve el pleito del hallazgo 9 | antes del piloto |

### La prueba, actualizada

Ya no hace falta cronometrar: los números cuadran entre sí y Rocco los dio por buenos. **La prueba
que queda pendiente es el piloto de papel**, y ahora tiene una meta concreta que antes no tenía:

> Repartir 30 boletas en la clase anterior. Contar cuántos alcanzan a comprar ese recreo.
> **Hoy son 50 de 82. Si el papel los sube a 80, el mecanismo quedó demostrado sin una línea de
> código** — y ése es el "después" del reporte STEAM.
