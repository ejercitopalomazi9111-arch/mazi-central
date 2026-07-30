---
name: four-judges
description: Consejo de cuatro jueces que rostiza una idea antes de construirla — el Creyente la defiende, el Escéptico la ataca, el Inversionista revisa si aparece dinero real, y el Juez dicta un veredicto único (CONSTRUIR / ARREGLAR PRIMERO / MATAR). Úsala ANTES de comprometer trabajo serio: una idea de negocio o producto, elegir arquitectura, empezar un proyecto nuevo, un cambio caro o difícil de revertir, o cuando Carlos pida opinión sobre si algo vale la pena. Palabra clave que la dispara: ROAST.
---

# El Consejo que Rostiza Ideas

Cuatro agentes. Una idea. Un veredicto.

## Por qué existe

Si preguntas "¿mi idea es buena?" en un chat limpio, el modelo se cura en salud: te adula y te
suelta diez pros y diez contras genéricos que no te sirven para decidir nada.

**La magia no está en un prompt ingenioso.** Está en cuatro lentes separados discutiendo sobre
la MISMA idea, con un juez obligado a tomar partido. Partirlo en creyente, escéptico,
inversionista y juez es lo que fuerza una respuesta real en vez de un lambisconeo.

Diez minutos de consejo contra seis meses construyendo lo equivocado.

## Cuándo se dispara

**Siempre, antes de entregar o comprometerse a algo caro:**

- Una idea de negocio, producto o funcionalidad nueva
- Elegir arquitectura, stack o proveedor
- Cualquier cosa difícil de revertir (migración, esquema de base de datos, contrato)
- Cuando Carlos pregunta "¿esto vale la pena?" o dice **ROAST**
- Antes de arrancar un proyecto nuevo completo

**Cuándo NO:** para chambitas obvias, arreglos de bug, cambios de una línea o cosas ya
decididas. El consejo es para decisiones, no para tareas. Rostizar un `fix` de typo es perder
el tiempo de todos.

## Cómo se corre

El orden es todo el punto: **el Juez sólo falla después de haber escuchado a los tres.**

```
IDEA → Creyente → Escéptico → Inversionista → Juez → VEREDICTO
```

Cada juez recibe la idea **y lo que dijeron los anteriores**. El Escéptico lee al Creyente. El
Inversionista lee a los dos. El Juez lee todo.

Los cuatro prompts van **textuales** en `reference/prompts.md`. No los parafrasees: el sesgo
está escrito a propósito.

### En la práctica dentro de Claude Code

Se puede correr de dos formas:

1. **En una sola pasada** (lo normal): tomas los cuatro lentes uno tras otro en la misma
   respuesta, respetando el orden y sin dejar que uno contamine al otro. Cada sección lleva su
   encabezado.
2. **Con subagentes** (para ideas grandes): un `Agent` por juez, en serie, pasándole a cada uno
   la salida del anterior. Sólo vale la pena cuando la idea es gorda y quieres que cada lente
   investigue por su cuenta. **No lo hagas sin que Carlos lo pida** — cada subagente arranca en
   frío y cuesta.

## Lo que entrega cada juez

| Juez | Su único trabajo | Cierra con |
|---|---|---|
| **Creyente** | El argumento más fuerte y honesto A FAVOR | la única apuesta sobre la que descansa todo |
| **Escéptico** | Matar la idea si merece morir | la falla fatal: si es cierta, no se construye |
| **Inversionista** | ¿Aparece dinero real y qué tan rápido? | si pondría su propio dinero, sí o no |
| **Juez** | Un veredicto, sin quedarse en la valla | CONSTRUIR · ARREGLAR PRIMERO · MATAR |

El Juez además entrega **la prueba de 10 minutos** que hay que correr antes de escribir una
sola línea de código. Esa prueba es el entregable más valioso del consejo — es lo que convierte
la opinión en experimento.

## El acta se escribe como junta · igual que en la Sala de Máquinas

Carlos lo pidió el 30 de julio para las auditorías **y aplica igual aquí**: quiere ver el debate, no
el resumen. Turnos numerados · cada juez en primera persona · **las interrupciones se escriben** ·
los desacuerdos se dejan colgando hasta que el Juez falla · y el Juez cierra diciendo **qué le
rechaza a los otros tres**.

Las reglas completas están en
[`consejo-tecnico/SKILL.md`](../consejo-tecnico/SKILL.md) §*Cómo se escribe el acta*. **El resumen va
hasta abajo; el valor está en el camino.**

## La memoria del consejo

Cada veredicto se guarda para que mañana no empieces de cero. En este repo:

```
.claude/veredictos/AAAA-MM-DD-nombre-de-la-idea.md
```

Plantilla en `templates/veredicto.md`. Antes de rostizar algo, **revisa si ya hay veredicto
previo sobre esa idea** — si lo hay, el consejo arranca sabiendo qué se decidió y por qué, y
juzga qué cambió desde entonces.

## Reglas de honestidad

- **El Escéptico no suaviza.** Si la respuesta suena diplomática, no hiciste el trabajo.
- **El Inversionista no habla de visión.** Números o nada.
- **El Juez no se queda en la valla.** "Depende" no es un veredicto.
- **Si el veredicto es MATAR, se dice.** Aunque Carlos ya se haya ilusionado. Para eso es el
  consejo — si sólo va a confirmar lo que él ya quería, no sirve de nada y mejor ni correrlo.
- El veredicto es **consejo, no orden**. Carlos decide. Si él reafirma después de oírlo, se
  construye y punto.

## Trabaja con otras skills

- **`multi-agent`** — si el veredicto es CONSTRUIR y el proyecto es grande, ahí se arma el
  equipo que lo va a ejecutar.
- **`web-prompts`** — si lo aprobado es un sitio o landing, de ahí sale el prompt de arranque.
- **`ui-components`** — el Juez puede pedir que se defina la librería antes de construir.
