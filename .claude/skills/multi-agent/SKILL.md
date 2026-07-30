---
name: multi-agent
description: Arma una organización de agentes IA especializados — un organigrama donde cada agente es una carpeta con su propio CLAUDE.md, su memoria en archivos y su jefe definido. Úsala cuando haya que montar un equipo de agentes, diseñar un centro de mando, dar identidad y memoria persistente a un agente, coordinar varios agentes entre sí, o cuando Carlos hable de "mi equipo IA", directores, VP o delegar áreas del negocio a la IA.
---

# Arma tu equipo IA

Una organización virtual de agentes en carpetas. Sin código, sin servidor, sin base de datos.

## El concepto

En vez de un chat genérico que empieza de cero cada vez y al que le explicas tu negocio una y
otra vez, tienes **un organigrama de agentes especializados**: tu Director de Ventas, tu
Director de Marketing, cada uno por su lado, cada uno con su rol y su memoria. Abres su
carpeta y retoma exactamente donde quedaron.

## El truco completo

Cuando Claude Code arranca en una carpeta, **lee automáticamente el `CLAUDE.md` que está
adentro**. Ese archivo dice *"eres Roxana, directora de ventas, reportas a Mauro, estas son tus
reglas"*. Ya no es Claude genérico — es Roxana.

Eso es todo. No hay más magia.

```
~/mi-empresa-agentes/          ← la casa de la organización
│
├─ vp/
│  ├─ CLAUDE.md                ← su identidad
│  └─ pendientes.md            ← su memoria
│
├─ director-ventas/
│  ├─ CLAUDE.md
│  └─ historial.md
│
├─ director-marketing/
│  └─ CLAUDE.md
│
└─ director-operacion/
   └─ CLAUDE.md

# Para hablar con un agente:  cd <su-carpeta> → claude
```

## Los cinco principios

1. **El `CLAUDE.md` es el superpoder.** Entre mejor escrita la identidad, mejor opera el
   agente. Es donde se gana o se pierde todo.
2. **Una persona = una carpeta.** No mezcles roles. Separación física es separación mental.
3. **La memoria vive en archivos.** Las conversaciones se pierden, los archivos no.
4. **Empieza chico.** 3 agentes que uses todos los días valen más que 30 que abriste una vez.
5. **El founder es humano.** Los agentes ejecutan táctico; las decisiones grandes son de Carlos.

## Cómo se arma

### Paso 1 · El organigrama, antes de tocar nada

Es el paso más importante y va **en papel**, fuera de la cabeza. Si lo dejas mental, vas a
saltarte cosas al armar las carpetas.

1. Arriba: **Carlos**, el founder. Humano, decide estratégicamente.
2. Un **VP / cofundador IA**: la mano derecha que coordina a los directores.
3. Las **áreas funcionales** del negocio: ventas, marketing, operación, finanzas, producto…
4. Un **director por área**, cada uno con objetivo claro y métrica propia.
5. Sólo si de verdad hace falta: gerentes, coords y agentes debajo.

**Regla de oro: 3 a 5 perfiles para arrancar, nunca más.** Cada agente extra es una carpeta que
mantener y un `CLAUDE.md` que ajustar.

Ejemplo mínimo viable:

```
Carlos (Founder)
└── VP / Cofundador IA
    ├── Director de Ventas
    ├── Director de Marketing
    └── Director de Operación
```

### Paso 2 · Sé brutalmente específico

Esto es lo que separa un agente útil de un Claude genérico con sombrero:

| Vago (no sirve) | Específico (sí sirve) |
|---|---|
| "Director de Ventas" | "Directora de Ventas de un restaurante mexicano que vende a corporativos, cierra deals de $50k–200k" |

Cada director debe atacar **un cuello de botella real**, no ser un rol genérico de libro de
texto. Y cada uno con una métrica de éxito de la industria concreta.

### Paso 3 · El `CLAUDE.md` de cada agente

Seis secciones, ni una menos. Plantilla completa en `templates/CLAUDE-agente.md`:

| # | Sección | Qué lleva |
|---|---|---|
| 1 | **Identidad** | Nombre, rol, empresa, a quién reporta. Lo primero que lee. |
| 2 | **Rol en una línea** | El qué hace, no el cómo. Frase corta y filosa. |
| 3 | **Equipo** | Quiénes están debajo, con rutas a sus carpetas. |
| 4 | **Reglas** | Idioma, tono, qué decide y qué **NO** decide. |
| 5 | **Cómo se presenta** | Plantilla exacta de respuesta cuando le dices "Preséntate." |
| 6 | **Memoria** | Que esa carpeta es su memoria y qué archivos guardar. |

Mínimo **800 caracteres de contenido específico** por agente. Menos que eso y sale genérico.

## Cómo se opera

### Cambiar de agente
Sales del actual, entras a la carpeta del siguiente. Cada uno arranca con SU identidad.
Para tener varios en paralelo: una pestaña de terminal por agente.

### Memoria entre sesiones
Claude recuerda **dentro** de una sesión; si cierras, se pierde. El truco:

- **Al cerrar:** *"Guarda un resumen de esta conversación en `historial-AAAA-MM-DD.md` con
  decisiones, pendientes y próximos pasos."*
- **Al volver:** *"Lee los archivos de tu carpeta y dime dónde nos quedamos."*
- **Para que lo haga solo**, esta línea va en cada `CLAUDE.md`:
  > *"Al arrancar cada sesión, lee siempre los archivos de tu carpeta para retomar contexto."*

### Coordinar entre agentes
El VP no adivina lo que sabe el Director. Dos formas:

- **A · Mensajero manual:** el director escribe en `status.md`, tú le dices al VP que lo lea.
  Funciona siempre, es tedioso.
- **B · Permiso global (mejor):** arrancas al VP con acceso a toda la organización
  (`claude --add-dir ~/mi-empresa-agentes`) y en su `CLAUDE.md` le dices qué carpetas puede
  consultar. Ya lee a sus directores solo.

### La rutina diaria

| Momento | Con quién | Qué pides |
|---|---|---|
| **Mañana** (15 min) | el VP | *"Dame mi brief: qué se cumplió ayer, qué urge hoy."* |
| **Durante el día** | el director que toque | lo suyo, sin mezclar |
| **Cierre** (10 min) | el VP | *"Resume el día: qué se ejecutó, qué quedó, qué hay mañana."* |

### Expandir
Un perfil nuevo **sólo cuando lo necesites de verdad** — cuando digas *"esto se lo encargaría a
alguien específico"*. Misma fórmula: carpeta + `CLAUDE.md`.

## El atajo

Para no hacerlo a mano hay un prompt que entrevista, diseña el organigrama y construye todas
las carpetas y los `CLAUDE.md` en automático. Está en `templates/prompt-arquitecto.md` — de
cero a organización en ~15 minutos.

## Errores comunes

| Síntoma | Por qué | Cómo se arregla |
|---|---|---|
| "No recuerda quién es" | No leyó su `CLAUDE.md`, o está mal escrito el nombre | Que se llame exacto `CLAUDE.md`, mayúsculas, dentro de su carpeta |
| "Los agentes se mezclan" | Arrancaste en la carpeta equivocada | `pwd` antes de abrir |
| "Olvida lo de ayer" | Cerraste sin guardar resumen | Costumbre de pedir el resumen al cerrar |
| "Responde genérico" | El `CLAUDE.md` está vago | Reescribirlo específico: industria, cliente, tono, qué decide y qué no |
| "Tengo 20 abiertos y me abruma" | Quisiste todo a la vez | Sólo VP + 1 director abiertos |

**El 90% de los problemas se resuelve con dos comandos:** `pwd` (en qué carpeta estás) y `ls`
(si no ves `CLAUDE.md`, el agente no tiene identidad).

## Límites honestos

- **Vive en una computadora, un usuario.** No es multi-usuario ni compartible con el equipo tal
  cual. Para eso hay que montar servidor, y eso ya es otro proyecto.
- **La memoria es manual.** Nadie guarda el resumen por ti si no lo pides o no lo pusiste en el
  `CLAUDE.md`.
- **Respalda la carpeta.** GitHub, iCloud o Dropbox. Si se muere el disco, se muere la
  organización.
- **Más agentes ≠ mejor.** El costo de mantener crece con cada uno y la calidad baja si los
  `CLAUDE.md` se quedan a medias.

## Trabaja con otras skills

- **`four-judges`** — antes de armar un equipo grande, rostiza la idea. Puede que no necesites
  cinco agentes sino uno bien escrito.
- **`web-prompts`** y **`ui-components`** — un Director de Producto o de Marketing las usa
  directo para su trabajo.
- **`manus`** — un agente puede delegarle a Manus tareas largas y autónomas.
