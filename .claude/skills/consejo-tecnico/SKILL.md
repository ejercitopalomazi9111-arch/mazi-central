---
name: consejo-tecnico
description: Consejo de seis ingenieros que rompe el código ANTES de que lo rompa alguien más — la Arquitecta juzga la estructura, el Sombrero Negro ataca el sistema como un intruso, el Sombrero Blanco prioriza los arreglos, el Medidor pone números de peso y velocidad, el de Guardia juzga si sobrevive a las 3 de la mañana, y el Juez Técnico dicta ENVIAR / ARREGLAR PRIMERO / NO SE ENVÍA. Úsala antes de publicar código que toque cuentas, pagos, datos de menores, subidas de archivo, llaves o cualquier cosa con usuarios de verdad; antes de meter una dependencia nueva; antes de una migración de base de datos; antes de hacer público un repo; y cuando algo se rompió en producción y no se sabe por qué. Palabras clave: AUDITA (el consejo entero) y ROMPE (nada más el ataque).
---

# La Sala de Máquinas

Seis ingenieros. Un sistema. Un veredicto.

## Por qué existe

`four-judges` decide **si algo vale la pena construirse**. Es el consejo de los que ponen el
dinero. Sirve, y no toca una sola línea de código.

Este es el otro. **El consejo de los que lo tienen que hacer aguantar.** Porque una idea aprobada
por empresarios puede estar perfectamente bien pensada y perfectamente mal construida, y de esas
dos la que te va a costar caro es la segunda.

Y si le preguntas a un chat limpio *"¿mi código está bien?"*, te contesta lo mismo que el otro te
contestaba sobre tu idea: que sí, con diez sugerencias genéricas y un *"considera agregar manejo de
errores"*. **Lo que fuerza una respuesta real es partirlo en lentes que no se pueden poner de
acuerdo:** el que diseñó no puede ser el que ataca, y el que ataca no puede ser el que decide qué se
arregla primero.

Ligas Mazi tiene cuentas reales, pagos y **datos de menores**, y el repo es **público**. Ese solo
hecho justifica esta skill sin necesidad de más argumentos.

## Cuándo se dispara

**Antes de publicar, siempre que el código toque algo de esto:**

- **Cuentas, sesiones o contraseñas** — cualquier cosa con login
- **Pagos**, o números que representen dinero
- **Datos de personas**, y con prioridad absoluta **datos de menores** (Ligas Mazi)
- **Subidas de archivos** — imágenes, logos, cualquier cosa que un desconocido pueda mandar
- **Llaves, tokens o secretos**, incluidos los que viven en el navegador
- **Reglas de acceso**: quién puede ver qué, quién puede escribir qué (RLS de Supabase)

**Y también:**

- Antes de **meter una dependencia nueva** — qué se lleva, quién la mantiene, qué licencia trae
- Antes de una **migración de base de datos** o un cambio de esquema
- Antes de **hacer público un repo**, o cuando ya lo es y nadie lo ha revisado con esos ojos
- Cuando algo **se rompió en producción** y no sabemos por qué
- Cuando Carlos dice **AUDITA** (el consejo entero) o **ROMPE** (nada más el Sombrero Negro)

**Cuándo NO:** un cambio de una línea · un typo · CSS · copy · un juego de un jugador que corre
sin datos y sin cuentas · cuando Carlos ya decidió y sólo falta hacerlo. Auditar un cambio de
color es perderle el tiempo a todos, igual que rostizar un `fix` de typo.

> **La regla de oro para no volverse insoportable:** este consejo se convoca por **superficie
> expuesta**, no por tamaño del cambio. Cinco líneas que tocan una regla de acceso valen auditoría;
> quinientas que sólo mueven pixeles, no.

## Cómo se corre

El orden es todo el punto, y no es el mismo que en `four-judges`:

```
SISTEMA → Arquitecta → 🕳 Negro → 🛡 Blanco → Medidor → de Guardia → Juez → VEREDICTO
```

Cada uno recibe el sistema **y lo que dijeron los anteriores**. Dos dependencias son obligatorias
y son la razón del orden:

1. **El Blanco lee al Negro.** No se puede priorizar un arreglo sin la lista de ataques. Un
   Sombrero Blanco que opina antes de que alguien ataque está adivinando.
2. **El Juez lee a los cinco.** Igual que allá: falla al final o no falla.

Los seis prompts van **textuales** en [`reference/prompts.md`](reference/prompts.md). No los
parafrasees: el sesgo de cada uno está escrito a propósito.

El catálogo de **nuestra superficie real de ataque** —qué usamos, por dónde nos entran, y las
trampas que ya conocemos de Supabase, GitHub Pages, PWA y llaves en el navegador— vive en
[`reference/superficie.md`](reference/superficie.md). Ése es el que se actualiza cuando cambia el
stack, sin tocar la skill.

**En una sola pasada** es lo normal: los seis lentes uno tras otro, cada uno con su encabezado, sin
que uno contamine al otro. **Con subagentes** sólo si Carlos lo pide, o si el sistema es tan grande
que cada lente necesita leer archivos distintos.

## Lo que entrega cada uno

| Lente | Su único trabajo | Cierra con |
|---|---|---|
| 🏗 **La Arquitecta** | Juzgar la estructura, no el estilo. Qué se rompe cuando esto crezca | la pieza que va a estorbar en seis meses |
| 🕳 **El Sombrero Negro** | Entrar. Abusarlo. Llevarse algo | el camino más corto al daño más grande |
| 🛡 **El Sombrero Blanco** | Priorizar: qué se tapa hoy, qué se vigila, qué se acepta | los tres arreglos de hoy, en orden |
| 📉 **El Medidor** | Números o nada. Bytes, milisegundos, memoria, en teléfono con datos | el número que no pasa y por cuánto |
| 🌙 **El de Guardia** | ¿Se puede arreglar dormido? ¿Se entiende en un año? ¿Se revierte? | qué hace falta para poder dormir |
| ⚖️ **El Juez Técnico** | Un veredicto, sin quedarse en la valla | `ENVIAR` · `ARREGLAR PRIMERO` · `NO SE ENVÍA` |

El Juez además entrega **la prueba que reproduce**: un comando, un script o una secuencia concreta
que confirma o tumba el hallazgo más grave. Ése es el entregable más valioso del consejo, igual que
la prueba de 10 minutos allá — y aquí además es obligación de la casa: **`CLAUDE.md` regla 7 dice
reproducir el bug antes de arreglarlo.** Un hallazgo sin reproducción es una sospecha, y las
sospechas no se arreglan: se confirman.

## Cómo se clasifica un hallazgo

Sin esta tabla, todo parece urgente y nada se arregla.

| Nivel | Qué significa | Qué se hace |
|---|---|---|
| 🔴 **Sangra** | Datos de personas expuestos, dinero mal contado, o cualquiera puede entrar como otro | **No se publica.** Se arregla antes de cerrar la sesión |
| 🟠 **Duele** | Se rompe con un usuario malintencionado, o se cae con carga normal | Se arregla esta semana. Se anota con fecha |
| 🟡 **Estorba** | Deuda real: lento, frágil, difícil de cambiar. Todavía no muerde | A `PENDIENTES.md` con su costo, como manda §2 de `CLAUDE.md` |
| ⚪ **Se acepta** | Riesgo conocido que no vale lo que cuesta taparlo hoy | Se escribe **por qué se acepta**. Un riesgo aceptado por escrito no es negligencia; uno callado sí |

**Lo último es lo que más se olvida y lo que más vale.** Aceptar un riesgo a propósito es una
decisión de ingeniería válida. No escribirla es cómo se convierte en una sorpresa.

## Las dos reglas que no se rompen

### 1 · El Sombrero Negro ataca lo nuestro, y nada más

Su trabajo es pensar como quien nos quiere hacer daño, sobre **nuestros propios sistemas**, para
taparlo. Eso es todo el alcance:

- Ataca **nuestro** código, nuestros repos, nuestros despliegues. Nunca de un tercero.
- Entrega **hallazgo + cómo se reproduce + cómo se tapa.** No entrega una herramienta para tumbar
  a nadie.
- La reproducción se hace con **datos de prueba**, jamás con datos de un usuario real. Si sólo se
  puede reproducir con datos reales, se anonimiza o se reproduce en una copia.

### 2 · Lo que se escribe en el acta, y lo que NUNCA

**Los repos son públicos** (`CLAUDE.md` §3 regla 6). O sea que el acta de auditoría **la puede leer
el atacante.** Entonces:

| En el acta sí va | En el acta NUNCA va |
|---|---|
| Qué área está afectada | La receta paso por paso para explotarlo |
| Qué tan grave es | Rutas exactas, cargas útiles, consultas que funcionan |
| Que ya se arregló, y cuándo | Datos de un usuario real, aunque sea de ejemplo |
| Que se aceptó, y por qué | Llaves, tokens, correos, CURP — ni de prueba |

**Mientras un hallazgo 🔴 esté abierto, en el acta va una línea y nada más:** área, nivel, y *"en
proceso"*. El detalle se le dice a Carlos **en el chat**, y se escribe completo **después de que
está tapado.** Publicar el mapa de una puerta abierta es peor que no auditar.

## La memoria del consejo

Un archivo por auditoría, para que la siguiente no empiece de cero:

```
.claude/auditorias/AAAA-MM-DD-nombre-del-sistema.md
```

Plantilla en [`templates/auditoria.md`](templates/auditoria.md). **Antes de auditar algo, revisa si
ya tiene acta** — si la tiene, el consejo arranca sabiendo qué se encontró, qué se arregló y **qué
riesgos se aceptaron a propósito**, y su primer trabajo es ver si siguen siendo aceptables.

## Trabaja con otras skills

- **`revision-web`** es la cátedra de **entrega**: que se vea bien, que cargue, que sea accesible.
  Este consejo es el de **aguante**: que no se rompa y que no se lo lleven. Van juntas y en ese
  orden — primero que aguante, luego que luzca. No se sustituyen.
- **`agent-browser`** es cómo se reproduce. La prueba del Juez casi siempre se corre con
  `herramientas/navegador.mjs`, porque un ataque de navegador se demuestra en un navegador.
- **`four-judges`** decide **si se construye**; éste decide **si se publica**. Un proyecto grande
  pasa por los dos, en momentos distintos.
- **`stack-propio`** hereda del Medidor y del de Guardia: lo que ellos midan de una dependencia es
  el insumo para decidir si se auto-hospeda o se depende.

## Cómo se ve cuando sirve

Un ejemplo real de la casa, para calibrar el tono. El softlock de Torre Infinita al morir: el
input moría porque `GameOverScene` habilitaba el control hasta el final de una cadena anidada de
`delayedCall` **sin protección** — si un eslabón tronaba, `ready` se quedaba en falso para siempre.
Y **parecía** funcionar con el ratón porque los botones eran de otra escena que seguía viva.

Ése es exactamente el hallazgo que este consejo produce y que una revisión de estilo nunca: no es
un error de sintaxis ni de formato, es **una suposición sobre el orden de las cosas**. El de Guardia
lo pesca preguntando *"¿y si esto falla a la mitad?"*, y la reproducción es lo que lo convirtió de
sospecha en arreglo.
