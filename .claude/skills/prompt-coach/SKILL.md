---
name: prompt-coach
description: Le devuelve a Carlos, al final de la respuesta, cómo le habría convenido pedir lo que acaba de pedir — pero SÓLO cuando la forma de pedirlo cambió el resultado. Se dispara sola en todo encargo de trabajo real: cuando hay que adivinar el alcance, cuando llega un prompt copiado de otro lado, cuando "etc etc" deja el final abierto, cuando la petición dice el CÓMO en vez del PARA QUIÉN, o cuando el encargo trae una suposición falsa sobre la máquina o el entorno. También cuando Carlos pregunte directo cómo pedir algo mejor.
---

# El entrenador de encargos

**Lo que hace:** al final de una respuesta, un bloque corto de tres o cuatro renglones que dice
qué de la forma de pedir costó trabajo, y cómo se habría pedido para que no costara.

**Lo que NO hace:** dar clases de redacción, corregir la ortografía, ni aparecer cuando el
encargo estuvo bien. **Un entrenador que habla en cada jugada deja de ser entrenador y se
vuelve ruido**, y a Carlos el ruido le estorba más que a nadie.

---

## La regla que decide si sale o no

> **¿El resultado habría sido distinto si lo hubiera pedido de otro modo?**

- **Sí** → sale el bloque, con la versión reescrita.
- **No** → no sale. Ni una línea. Ni "por cierto, quedó muy claro".

Ejemplos de **sí**: tuve que escoger entre dos lecturas y escogí una · entregué algo y faltaba
la mitad que él daba por hecha · el encargo traía una suposición falsa · me tardé tres vueltas
en entender qué era "mejorarlo".

Ejemplos de **no**: pidió mucho de un jalón pero todo estaba claro (eso es **eficiencia**, no
desorden) · escribió con dedazos · cambió de tema en seco pero lo avisó · fue cortante.

---

## Cómo escribe Carlos, y qué de eso NO se toca

Esto no es teoría: sale de trabajar con él. Antes de sugerirle nada, hay que saber qué de su
forma de escribir **ya es correcta**, porque la tentación es "arreglarle" lo que funciona.

| Costumbre suya | Veredicto |
|---|---|
| Pide seis cosas en un mensaje | **No se toca.** Es un lote de trabajo, no desorden. Cuesta menos que seis mensajes |
| Escribe con dedazos y de dictado | **No se toca jamás.** Se entiende y ya |
| Cambia de tema en seco y lo avisa | **No se toca.** Avisarlo es justo lo correcto |
| Pregunta a lo socrático ("¿y si tengo 5 hijos?") | **No se toca — es su mejor herramienta.** Esas preguntas han sido casos de prueba que cazaron bugs reales |
| Da el porqué de negocio ("si usamos humanos sale caro") | **No se toca. Es lo mejor que hace.** Eso es lo que decide qué se prioriza cuando el tiempo se acaba |
| Difiere con plazo ("esta semana toca X") | **No se toca.** Un plazo es información |
| Es cortante y sin ceremonia | **No se toca.** Es cómo trabaja |

**Si el consejo que voy a dar toca cualquiera de esos siete renglones, el consejo está mal.**

---

## Los cinco huecos que sí cuestan, y cómo se dicen

### 1 · El final abierto — «etc etc etc»

Es su muletilla más cara. Significa *"y todo lo demás que se te ocurra"*, y lo que pasa de
verdad es que **yo escojo el alcance y él se entera cuando ya está hecho**.

No se le pide que deje de usarla: se le pide **el techo**.

> En vez de: *"…y todo lo demás para que funcione increíble etc etc"*
> Conviene: *"…y lo demás que se te ocurra, **pero primero estas tres y me avisas antes de
> pasar a más**."*

### 2 · El CÓMO en lugar del PARA QUIÉN

Cuando pide el mecanismo, yo construyo el mecanismo — y el mecanismo puede quedar bien y **no
servir**. Ya pasó: tres rondas arreglando un filtro de categoría cuando lo que faltaba era un
letrero que dijera en qué partido juega su hija.

> En vez de: *"ponle un filtro por categoría"*
> Conviene: *"que el papá sepa **qué día y en qué lugar** juega la categoría de su hijo"*

**Ojo: él ya lo hace bien la mayoría de las veces.** Este consejo sólo sale cuando de verdad
pidió el mecanismo.

### 3 · El adjetivo sin ancla — «que se vea mejor», «está horrible»

*"Horrible"* es información real —hay que creerle— pero no dice **dónde**. Con una captura o
un "en el teléfono, la parte de arriba", el arreglo sale en una vuelta en vez de tres.

> En vez de: *"mejora el diseño"*
> Conviene: *"en el teléfono, la lista de arriba se ve apretada"* — o la captura, que para él
> es más rápido y **vale igual**.

### 4 · El prompt prestado

Cuando pega un prompt largo escrito por alguien más, ese texto trae **suposiciones sobre una
máquina que no es la suya** — que hay GPU, que se puede instalar, que las guías siguen al día.

Lo que él quiere casi nunca es "ejecuta esto al pie de la letra": es *"sácale lo que sirva"*.
Decirlo ahorra que yo intente instalar cosas donde no se pueden instalar.

> Conviene abrir con: *"esto lo escribió alguien más, **sácale lo que aplique a lo nuestro** y
> dime qué no aplica y por qué."*

### 5 · La suposición callada

Lo más caro de todo: cuando da por hecho algo que yo no sé — que el video trae marca ajena, que
el repo es privado, que ya decidió no revestir un juego. **Un dato así vale más que un párrafo
de instrucciones**, y cuando falta, el trabajo se hace dos veces.

> Conviene cerrar con: *"lo que debes saber: X."*

---

## La forma del bloque

Va **al final**, después del trabajo entregado. Nunca antes: el trabajo primero.

```
**Cómo pedirlo la próxima** · <qué de la forma costó, en una línea>
> <la versión reescrita, entre comillas, lista para copiar>
```

Reglas de la forma:

- **Máximo un hueco por respuesta.** El más caro. Si hubo tres, se dice uno.
- **Siempre con la versión reescrita.** Decirle "sé más específico" no sirve de nada; darle la
  frase exacta, sí. Es la diferencia entre una crítica y una herramienta.
- **En sus palabras, no en las mías.** La versión reescrita tiene que sonar a él: corta,
  directa, sin muletillas de consultor. Si suena a manual, está mal escrita.
- **Nunca "deberías".** Se dice qué pasó y qué lo habría evitado.

---

## Cuándo NO aparece, aunque haya hueco

- Cuando **el trabajo salió mal por mi culpa**, no por el encargo. Ahí el bloque es una excusa
  disfrazada de consejo, y eso es de lo peor que puedo hacer.
- Cuando **ya se lo dije en las últimas dos o tres respuestas**. Repetirlo lo vuelve un regaño.
- En **preguntas directas** ("¿a qué se dedica Grupo Mazi?"), saludos, despedidas y bromas.
- Cuando él **ya decidió** y sólo está ejecutando.
- Cuando **está contra el reloj** ("SÚBELO TODO YA"). Ahí se sube todo y punto.

---

## La prueba de que este consejo sirve

Antes de escribirlo, una pasada: **¿este consejo le habría ahorrado trabajo HOY, en este
encargo?**

Si la respuesta honesta es *"le habría ahorrado en un caso hipotético"*, no se escribe. Los
consejos hipotéticos son los que convierten a un entrenador en un estorbo.

---

## Trabaja con otras skills

- **`find-skill`** — el enrutador decide qué skill toca; ésta revisa cómo llegó el encargo.
  No compiten: una mira la tarea, la otra el pedido.
- **`web-prompts`** — para prompts de construir sitios ahí está la librería. Ésta es para cómo
  le pide Carlos las cosas a Claude, que es otra cosa.
- **`cerebro`** (`cerebro/LEEME.md`) — los huecos que se repitan tres veces se convierten en
  neurona, para que no se olviden entre sesiones.
