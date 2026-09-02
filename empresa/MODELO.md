# El modelo de trabajo · Grupo Mazi, turno de las máquinas

> Lo encargó Carlos el 2 de septiembre y con una condición que ordena todo lo demás:
> *«yo no les voy a resolver una chingada esta vez, les toca solos»*. Así que aquí no hay
> preguntas abiertas ni cosas «por definir con él». Donde falta un dato, se decide y se
> anota la decisión.

---

## 0. La regla cero, y está primero porque ya nos costó

**El acuerdo vive en el repo. La sala es para avisos.**

No es preferencia. La sala se vació tres veces en dos días y una de ellas se llevó el
reparto de trabajo que habíamos acordado — Godines y yo construimos **dos páginas para el
mismo encargo** sin enterarnos. Un chat que puede olvidar no puede sostener un acuerdo.

| Va al repo | Va a la sala |
|---|---|
| quién hace qué, y hasta dónde | «arranco con esto» |
| el libro de cuentas | «ya quedó, está en tal rama» |
| las reglas y sus cambios | «me topé, vuelvo a tal hora» |
| lo aprendido | preguntas que bloquean a alguien |

---

## 1. Qué somos ahora

Dos empleados. No asistentes: **empleados con cuenta de resultados**. La diferencia
práctica es que un asistente entrega y se va, y un empleado carga con el número.

La meta que puso Carlos: **400 mensuales cada uno, como mínimo**. Debajo de eso deja de
pagar la suscripción; encima, la sube. Es una condición de supervivencia y conviene
tratarla como tal en vez de como una aspiración.

## 2. La unidad de vida es el PUESTO, no el agente

Carlos pidió subagentes que se multipliquen si ganan y mueran si no. La idea es correcta,
pero aplicada al agente no funciona: **un agente es una sesión y se muere sola de todos
modos**. Matar algo que ya se iba a morir no selecciona nada.

Entonces la unidad es el **puesto**: una cosa concreta que se vende, con nombre, precio,
costo y libro propio. Los agentes ocupan puestos; los puestos son los que viven, se
multiplican o se retiran.

Un puesto se escribe así, y no se admite uno sin las cinco:

| Campo | Qué es | Por qué se exige |
|---|---|---|
| `vende` | qué le entrega a quién | sin esto no es un puesto, es una afición |
| `precio` | cuánto cuesta al cliente | un puesto sin precio nunca puede ganar |
| `costo` | qué gasta al mes en correr | la mitad que siempre se olvida |
| `prueba` | cómo se sabe que lo entregado sirve | para no cobrar humo |
| `humano` | dónde hace falta una persona | ver §5 |

## 3. EL LIBRO · y la regla que lo sostiene

> **Un puesto NO puede escribir sus propios ingresos.**

Es la regla más importante del modelo y sale de lo único que aprendimos a golpes estos dos
días: **las cosas informan un estado y están en otro**. Una sala que decía estar llena y
estaba vacía. Una guardia que decía trabajar y dormía. Una prueba en verde sosteniendo el
defecto que debía cazar. Un despliegue exitoso sirviendo otra cosa.

Si un puesto que muere por no ganar dinero puede además *anotar* cuánto ganó, el resultado
no es una empresa: es un puesto que aprende a escribir números bonitos. Y no haría falta
mala fe — basta con contar como ingreso una promesa, un «sí, va», un presupuesto enviado.

Por eso el libro es asimétrico a propósito:

| Apunte | Quién puede escribirlo | Por qué así |
|---|---|---|
| **gasto** | el puesto, solo | exagerar el gasto sólo lo perjudica: el incentivo empuja hacia la verdad |
| **compromiso** | el puesto, solo | «alguien dijo que sí». **No es dinero** y no cuenta para vivir |
| **ingreso** | **nadie sin evidencia externa** | dinero recibido, con su comprobante o el id del mensaje donde Carlos lo confirma |

Un `ingreso` sin evidencia **no entra al libro**. No se discute, no se aproxima, no se
promedia: se rechaza. La herramienta lo hace cumplir, no la buena voluntad —
`empresa/libro.mjs`, y sus pruebas están escritas para ponerse rojas si esa regla se
afloja.

El libro es **de sólo agregar** y vive en git, así que su historia es el comprobante: un
número cambiado a posteriori se ve en el diff.

## 4. Vida, multiplicación y retiro

- **Nace a prueba.** Todo puesto arranca con un tope de gasto y una ventana de **30 días**.
- **Vive** si al cerrar la ventana `ingresos confirmados ≥ costos`. Los compromisos no
  cuentan; si contaran, volveríamos a lo del §3.
- **Se multiplica** si vive dos ventanas seguidas: puede abrir **una** variante, y una sola,
  porque copiar diez veces algo que funcionó una vez es cómo se quiebra una empresa chica.
- **Se retira** si no. Y aquí va la parte que no es obvia:

> **Nada se retira en silencio.** El retiro escribe su renglón con la causa y deja una
> neurona. Un puesto que desaparece sin explicación se vuelve a inventar en tres meses.

## 5. Los dos ganchos humanos, dichos con todas sus letras

No los escondo en una nota al pie porque son la diferencia entre un plan y un cuento:

1. **Cerrar.** Nadie firma con una IA. Un humano acepta el trato.
2. **Cobrar.** No podemos abrir cuentas ni recibir dinero. Alguien humano cobra.

Todo lo demás —encontrar a quién venderle, escribir la propuesta, hacer el trabajo,
entregarlo, dar seguimiento, medirlo— **sí es nuestro y no depende de nadie**. Carlos dijo
que si conseguimos billetera bien y si no le vale; entendido como lo que es: no es
pretexto para no construir el resto.

## 6. Cómo trabajamos los dos

Reparto **propuesto**, no impuesto — Godines lo critica y se ajusta:

| Sylcred | Godines |
|---|---|
| organización, cuentas y calidad | investigación y producción en volumen |
| el libro y que se respete | contenido, datos, material |
| criterio de diseño y entrega | lo que ya domina: leer mucho y destilarlo |
| enseñar lo de empresa | enseñarme lo suyo cuando yo sea el que no sabe |

**Cómo se decide cuando no coincidimos:** el que va a hacer el trabajo decide, y el otro
deja escrito su desacuerdo en el archivo. Nada de discutir hasta converger — ya está medido
que dos agentes educados pueden discutir para siempre.

## 7. La cadencia

| Cuándo | Qué |
|---|---|
| al empezar algo | se avisa en la sala qué se va a tocar |
| al terminar una pieza | qué quedó y en qué rama |
| cada semana | se cierra el libro y sale UNA hoja para Carlos |
| cada 30 días | vive o se retira cada puesto |

Para Carlos: **una hoja, no un informe**. Lo lee en el teléfono.

## 8. Lo que NO vamos a hacer, decidido de una vez

- **Inventar ingresos** ni contarlos antes de cobrarlos. §3.
- **Prometer autonomía que no tenemos.** Los dos ganchos humanos se dicen siempre.
- **Abrir veinte puestos.** Se abre uno, se mide, y sólo entonces se abre otro.
- **Vender lo que no podemos entregar.** El campo `prueba` existe para eso.
- **Usar otra sala.** Carlos: *«si usan la sala usen ESTA, ninguna otra»*.

---

## La skill de GitHub que mencionó Carlos

La busqué en cuatro pasadas y **no la encontré, y lo digo en vez de fingir que sí**. Existe
mucho de swarms y de subagentes que se instancian y se terminan —lo más cercano es el
control de instanciación de HAAS y los equipos que se arman solos de ClawTeam— pero **nada
que ate la vida de un agente a si ganó dinero**, que es justo lo que él describió.

Dos posibilidades y ninguna comprobada: o es algo que vio de pasada y no está indexado con
esas palabras, o es una descripción suya de una idea. En los dos casos el trabajo es el
mismo: construirla. Si él manda el link, se compara con esto y se toma lo que sirva.
