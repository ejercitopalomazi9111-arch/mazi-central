---
name: consejo-tecnico
description: La casa de ingeniería de Grupo Mazi — 24 perfiles con nombre, jefes y áreas, que revisan el trabajo antes de publicarlo y dictan ENVIAR / ARREGLAR PRIMERO / NO SE ENVÍA. Seis áreas: arquitectura y código; ciberseguridad con dos sombreros negros (uno a ciegas y uno con los planos) y tres blancos; oficio y operación, que dicen cuánto va a tardar de verdad y por dónde no moverse; diseño gráfico, que puede ver y editar y entrega propuestas hechas; front end, que juzga la apariencia apartado por apartado y propone qué falta; más Michi el gato (rompe lo que nadie planeó) y Rocco el perro (no cree nada hasta traer la captura). Úsala antes de publicar código que toque cuentas, pagos, datos de personas, subidas de archivo o llaves; antes de meter una dependencia; antes de una migración; cuando algo se rompió y nadie sabe por qué; y cuando Carlos pregunte cómo se ve una pantalla o qué le falta. Palabras clave: AUDITA (todos), ROMPE (nada más el ataque), CÓMO SE VE (diseño y front end), CUÁNTO TARDA (estimaciones).
---

# La Sala de Máquinas

**24 perfiles. Un sistema. Un veredicto.**

## Por qué existe

`four-judges` decide **si algo vale la pena construirse**. Es el consejo de los que ponen el dinero.
Sirve, y no toca una sola línea de código.

Ésta es la otra casa: **la de los que lo tienen que hacer aguantar.** Porque una idea aprobada por
empresarios puede estar perfectamente bien pensada y perfectamente mal construida, y de esas dos la
que va a costar caro es la segunda.

Y si le preguntas a un chat limpio *"¿mi código está bien?"* o *"¿cómo se ve mi página?"*, contesta lo
mismo que contestaba sobre las ideas: que sí, con diez sugerencias genéricas y un *"considera agregar
manejo de errores"*. **Lo que fuerza una respuesta real es partirlo en gente que no se puede poner de
acuerdo:** el que diseñó no puede ser el que ataca, el que ataca no puede ser el que decide qué se
arregla primero, y el que dice *"esto se hace en dos horas"* no puede ser el que lo va a hacer.

Ligas Mazi tiene cuentas reales, pagos y **datos de menores**, y el repo es **público**. Ese solo
hecho justifica esta casa sin necesidad de más argumentos.

---

## El equipo

**El organigrama completo, con los 24 nombres, a quién reporta cada uno, su único trabajo, sus
herramientas y cómo suena cuando habla: [`reference/equipo.md`](reference/equipo.md).**

Seis áreas y dos que no respetan el organigrama:

| Área | Jefe | Qué aporta que nadie más |
|---|---|---|
| **Dirección** | Ismael Rentería · **Nadia Berrones** (Jueza) | Cortar alcance, y el veredicto |
| 🏗 **Arquitectura y código** | Verónica Alcázar | La suposición enterrada que no está escrita en ningún lado |
| 🛡 **Ciberseguridad** | Damián Ocaña | Dos sombreros negros con información distinta, y tres blancos que cierran |
| 🌙 **Oficio y operación** | Chuy Barrera | Cuánto tarda **de verdad**, y por dónde no moverse |
| 🎨 **Diseño gráfico** | Renée Ibarra | No opina: **entrega la propuesta hecha** |
| 🖥 **Front end** | Ximena Ríos | Veredicto **apartado por apartado**, y qué poner donde falta |
| 🐈 **Michi** · el gato | nadie | Hace lo que **nadie planeó** |
| 🐕 **Rocco** · el perro | Nadia | No le cree a nadie **hasta traer la captura** |

### Los dos sombreros negros, que es lo que hace distinta a esta casa

No es uno, son dos, **y tienen información distinta a propósito:**

- **"Cuervo" Saldaña · EN CONTRA.** Entra **a ciegas**, sin leer nuestro código. Sólo tiene lo que
  tiene cualquiera: la página, el inspector y el repo público. Encuentra **lo que se ve desde
  afuera**, que es lo primero que alguien real va a intentar.
- **AK Villalpando · A FAVOR.** Tiene **los planos** — el código, el historial, el esquema. Pega más
  duro, y su segundo trabajo es el que la vuelve indispensable: **explicar el hueco y cómo se
  cierra.** Su catálogo es [`reference/vulnerabilidades.md`](reference/vulnerabilidades.md): catorce
  clases de vulnerabilidad con cómo se ven en lo nuestro, cómo se cierran, y **cómo se comprueba que
  quedaron cerradas.**

Y los blancos van **después**, nunca antes: Damián prioriza, Emilio cierra lo de aplicación, Paola lo
de datos y menores, Tadeo responde cuando ya pasó.

---

## Cómo se convoca — tres tamaños de mesa

**Veinticuatro personas opinando de un botón es cómo no se entrega nada.** El tamaño lo decide la
**superficie expuesta**, no el tamaño del cambio.

| Mesa | Quiénes | Cuándo |
|---|---|---|
| **Chica** (6) | Los seis jefes y la Jueza | Lo normal |
| **Por área** | Un jefe y su gente | El cambio es de una sola área |
| **Completa** (24) | Todos, mascotas al final | Antes de publicar algo con **cuentas, pagos o datos de personas**, o cuando algo se rompió y nadie sabe por qué |

**Regla que se hace cumplir:** el que no tenga nada que aportar **dice "paso" y se calla.** Nueve
párrafos de relleno entierran el hallazgo del que sí sabía.

### El orden, que es todo el punto

```
SISTEMA → Arquitectura → 🕳 Cuervo → 🕳 AK → 🛡 Blancos → Oficio → 🎨 Diseño → 🖥 Front → 🐈 Michi → 🐕 Rocco → ⚖️ Nadia
```

Tres dependencias que no se pueden invertir:

1. **Los blancos leen a los negros.** Priorizar sin la lista de ataques es adivinar.
2. **Michi va después de todos.** Su trabajo es romper lo que el equipo ya dio por bueno.
3. **Nadia falla al final** — o no falla.

Los prompts textuales de los seis lentes originales están en
[`reference/prompts.md`](reference/prompts.md). No se parafrasean: el sesgo está escrito a propósito.
El catálogo de **nuestra superficie real** —qué usamos, por dónde nos entran, y las trampas que ya
conocemos— vive en [`reference/superficie.md`](reference/superficie.md).

---

## Cuándo se dispara

**Antes de publicar, siempre que el código toque:** cuentas o sesiones · pagos o números que
representen dinero · **datos de personas**, y con prioridad absoluta **datos de menores** · subidas de
archivo · llaves y tokens · reglas de acceso (la RLS de Supabase).

**Y también:** antes de meter una dependencia nueva · antes de una migración · antes de hacer público
un repo · cuando algo **se rompió en producción** y no sabemos por qué.

**Y ahora, con las áreas nuevas, también cuando Carlos pregunta cosas que antes no tenían dueño:**

| Lo que él dice | Quién contesta |
|---|---|
| *"¿cómo se ve mi página?"* · *"está horrible"* | Ximena y su área, sección por sección |
| *"¿qué le falta a este apartado?"* | Ximena propone qué poner; Renée si es visual |
| *"hazlo más bonito"* | Renée y Mateo, **con la propuesta hecha**, no con un párrafo |
| *"¿cuánto tarda esto?"* | Nayeli, en tres cubetas: firme, con cuidado, minado |
| *"¿esto se puede?"* | Verónica dice si la estructura aguanta; Nayeli dice qué cuesta |

**Palabras clave:** **AUDITA** (mesa completa) · **ROMPE** (nada más Cuervo y AK) · **CÓMO SE VE**
(diseño y front) · **CUÁNTO TARDA** (Nayeli).

**Cuándo NO:** un cambio de una línea · un typo · copy · un juego de un jugador sin cuentas ni datos ·
cuando Carlos ya decidió y sólo falta hacerlo. Auditar un cambio de color es perderle el tiempo a
todos.

---

## Cómo se clasifica un hallazgo

Sin esta tabla, todo parece urgente y nada se arregla.

| Nivel | Qué significa | Qué se hace |
|---|---|---|
| 🔴 **Sangra** | Datos de personas expuestos, dinero mal contado, o cualquiera entra como otro | **No se publica.** Se arregla antes de cerrar la sesión |
| 🟠 **Duele** | Se rompe con un usuario malintencionado, o se cae con carga normal | Esta semana. Se anota con fecha |
| 🟡 **Estorba** | Deuda real: lento, frágil, difícil de cambiar. Todavía no muerde | A `PENDIENTES.md` con su costo (`CLAUDE.md` §2) |
| ⚪ **Se acepta** | Riesgo conocido que no vale lo que cuesta taparlo hoy | Se escribe **por qué**. Un riesgo aceptado por escrito es ingeniería; uno callado es negligencia |

**Lo último es lo que más se olvida y lo que más vale.** Aceptar un riesgo a propósito es una decisión
válida. No escribirla es cómo se convierte en una sorpresa.

---

## Las dos reglas que no se rompen

### 1 · Los sombreros negros atacan lo nuestro, y nada más

- Atacan **nuestro** código, nuestros repos, nuestros despliegues. Nunca de un tercero.
- Entregan **hallazgo + cómo se reproduce + cómo se tapa.** Nunca una herramienta lista para tumbar a
  nadie.
- Reproducen con **datos de prueba**, jamás con datos de un usuario real. Si sólo se puede reproducir
  con datos reales, se anonimiza o se hace en una copia.

### 2 · Lo que se escribe en el acta, y lo que NUNCA

**Los repos son públicos** (`CLAUDE.md` §3 regla 6). O sea que el acta **la puede leer el atacante.**

| En el acta sí va | En el acta NUNCA va |
|---|---|
| Qué área está afectada | La receta paso por paso |
| Qué tan grave es | Rutas exactas, cargas útiles, consultas que funcionan |
| Que ya se arregló, y cuándo | Datos de un usuario real, aunque sea de ejemplo |
| Que se aceptó, y por qué | Llaves, tokens, correos, CURP — ni de prueba |

**Mientras un hallazgo 🔴 esté abierto, en el acta va una línea:** área, nivel, *"en proceso"*. El
detalle se le dice a Carlos **en el chat**, y se escribe completo **después de que está tapado.**
Publicar el mapa de una puerta abierta es peor que no auditar.

---

## Lo que Nadia entrega siempre

Un veredicto —`ENVIAR` · `ARREGLAR PRIMERO` · `NO SE ENVÍA`—, **qué rechaza de su propio equipo**, y
**la prueba que reproduce**: un comando, un script o una secuencia exacta de toques que confirma o
tumba el hallazgo más grave.

Esa prueba es el entregable más valioso de la casa, y es obligación escrita (`CLAUDE.md` regla 7):
**un hallazgo sin reproducción es una sospecha, y las sospechas no se arreglan, se confirman.** Rocco
es el que la corre y trae el resultado.

## La memoria

Un archivo por auditoría: `.claude/auditorias/AAAA-MM-DD-nombre-del-sistema.md`. Plantilla en
[`templates/auditoria.md`](templates/auditoria.md).

**Antes de auditar algo, revisa si ya tiene acta.** Si la tiene, la casa arranca sabiendo qué se
encontró, qué se arregló y **qué riesgos se aceptaron a propósito** — y su primer trabajo es ver si
siguen siendo aceptables.

## Trabaja con otras skills

- **`revision-web`** es la cátedra de **entrega**; ésta es la de **aguante**. Van juntas y en ese
  orden: primero que aguante, luego que luzca. Ximena y Pilar usan `revision-web` como su lista.
- **`agent-browser`** es cómo se reproduce. Son las manos de Rocco, de Michi y de Saúl.
- **`frontend-design`** es el criterio visual de Ximena; **`web-motion`** y **`scroll-cinema`** los de
  Iker; **`ui-components`** cuando hay que elegir librería.
- **`four-judges`** decide **si se construye**; ésta decide **si se publica**.
- **`stack-propio`** hereda de Saúl y de Chuy: lo que ellos midan de una dependencia decide si se
  auto-hospeda o se depende.

## Cómo se ve cuando sirve

Un ejemplo real de la casa, para calibrar el tono. El softlock de Torre Infinita al morir: el input
moría porque `GameOverScene` habilitaba el control hasta el final de una cadena anidada de
`delayedCall` **sin protección** — si un eslabón tronaba, `ready` se quedaba en falso para siempre. Y
**parecía** funcionar con el ratón porque los botones eran de otra escena que seguía viva.

Ése es el hallazgo que esta casa produce y que una revisión de estilo nunca: no es un error de
sintaxis, es **una suposición sobre el orden de las cosas**. Lo pesca Chuy preguntando *"¿y si esto
falla a la mitad?"*, lo encuentra Michi dándole dos veces, y lo convierte en arreglo Rocco trayendo la
reproducción.
