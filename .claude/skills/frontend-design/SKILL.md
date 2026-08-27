---
name: frontend-design
description: Criterio de diseño para que las interfaces se vean hechas por alguien con gusto y no por una plantilla — tipografía, escala, espaciado, color, jerarquía, profundidad y densidad. Úsala cuando el trabajo tenga que quedar bonito de verdad, cuando algo "se ve genérico" o "se ve de IA", al elegir tipografías y paleta, al arrancar una interfaz nueva, o cuando la cátedra encuentre problemas de pulido.
---

# Diseño de interfaz

El hueco más grande que teníamos. Carlos lo señaló solo: *"en computadora se ve feísima la
página."*


## Escoger la estética ANTES de pedirla

Si uno no escoge, el modelo escoge — y lo que escoge es el promedio de internet. Ése es
exactamente el aspecto que Carlos llama *"se ve de IA"*.

Diez estéticas con **cuándo sí, cuándo no y cómo se portan en teléfono**, en
[`reference/tendencias.md`](reference/tendencias.md): glassmorfismo, neumorfismo, claymorfismo,
brutalismo, oscuro con un acento, editorial, cinemático por scroll, bento, degradado con grano
y retro.

Se decide en tres preguntas: **qué vende el cliente**, **cuánto contenido hay** y **si se ve
primero en teléfono** — que con Carlos siempre es que sí.

Dos avisos que cambian decisiones:
- El **neumorfismo** tiene un problema de contraste de nacimiento. Si todo es del mismo color,
  quien ve poco no distingue qué se puede tocar.
- El **brutalismo a medias** —bordes finos, sombras suavecitas— no se ve brutalista: se ve
  descuidado. Se compromete o no se usa.


## El diagnóstico de por qué algo "se ve de IA"

Casi siempre son las mismas seis cosas. Revísalas en este orden — están puestas por cuánto
arreglan:

| # | Síntoma | Causa | Arreglo |
|---|---|---|---|
| 1 | Todo se ve igual de importante | **no hay jerarquía** | tres niveles nada más: principal, secundario, terciario. Y que se noten |
| 2 | Se ve apretado o disperso sin razón | **espaciado inventado** | una escala fija, nada de números al azar |
| 3 | Muchos tamaños de letra parecidos | **escala tipográfica floja** | 4–6 tamaños en toda la app, con saltos que se vean |
| 4 | Colores que no se hablan | **paleta improvisada** | un neutro, un acento, y ya |
| 5 | Todo centrado y flotando | **sin estructura** | rejilla, márgenes y anchos máximos |
| 6 | Bordes redondos y sombras al azar | **sin sistema** | un radio, dos elevaciones |

## Las escalas — donde se gana o se pierde

**Deja de inventar números.** Un sistema, y todo sale de ahí.

### Espaciado

Escala de 4px. Sólo estos valores:
```
4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128
```
Si necesitaste `padding: 13px`, estás improvisando. **Los saltos grandes son los que crean
jerarquía**: separar bloques con 64 y elementos con 8 comunica más que cualquier línea divisoria.

### Tipografía

Escala con salto notorio. Cuatro a seis tamaños, no doce:
```
12 · 14 · 16 · 20 · 28 · 40 · 64
```
- **16px es el mínimo del cuerpo.** Menos, y en teléfono la gente hace zoom.
- **Los saltos tienen que ser visibles.** 16 y 18 se pelean; 16 y 28 se entienden.
- **Interlínea:** 1.5 para texto corrido, 1.1–1.2 para títulos grandes.
- **Ancho de línea:** 45–75 caracteres. Más ancho y se pierde el renglón. `max-width: 65ch`.

### Peso y contraste

La jerarquía se hace con **tamaño, peso y color** — no con los tres al mismo tiempo. Elige dos.

```
Título      →  grande + peso fuerte + color pleno
Subtítulo   →  mediano + peso normal + color pleno
Cuerpo      →  base   + peso normal + color pleno
Secundario  →  base   + peso normal + color atenuado
```

## Color

**Un neutro y un acento.** Punto. La tentación de meter cinco colores es exactamente lo que
hace que se vea de plantilla.

- **Neutros:** 5–7 pasos del fondo al texto. Ahí vive el 90% de la interfaz.
- **Acento:** uno. Para lo que importa: el botón principal, el estado activo, el dato clave.
  Si todo es acento, nada lo es.
- **Semánticos:** éxito, aviso, error. Y **nunca sólo color** — siempre con ícono o texto.

Grupo Mazi ya tiene paleta: tinta `#0E1311`, latón `#D69A2D`, verde `#4FB286`, hueso `#E8E6DF`.
**Úsala.** Coherencia entre proyectos es lo que hace que se vean de un mismo dueño.

**Contraste:** mínimo 4.5:1 en texto normal, 3:1 en texto grande. No es opcional.

## Layout — el que faltaba

Aquí está el problema concreto que tenemos hoy.

### Anchos máximos, siempre

**Nada debe estirarse hasta el borde de una pantalla de 1920px.**

```
Texto corrido      →  max-width: 65ch      (~700px)
Formulario         →  max-width: 480px
Contenido general  →  max-width: 1200px
Tablero de datos   →  puede ser más ancho, con columnas
```

Un campo de correo de 1100px de ancho es el error visual más común y el más fácil de arreglar.

### Diseñar tres tamaños, no uno

| Tamaño | Qué cambia |
|---|---|
| **Teléfono** (390) | una columna, todo apilado, controles grandes |
| **Laptop** (1440) | dos o tres columnas, navegación visible, densidad media |
| **Ancha** (1920+) | **no estirar** — centrar con ancho máximo, o usar el espacio con propósito |

**El error clásico**, y es el que tiene Ligas Mazi: se diseña para teléfono, se centra en
escritorio, y queda una tarjeta con forma de celular flotando en un vacío negro. Se ve como un
screenshot pegado, no como una app.

**La salida:** en pantalla ancha, o el contenido crece en columnas, o el fondo hace trabajo
deliberado. Centrar y dejar vacío no es una decisión de diseño; es no haber decidido.

## Profundidad

Un radio, dos elevaciones. No más.

```
--radio: 8px          (uno para todo; 4px si quieres seco, 16px si quieres suave)
--elev-1: 0 1px 2px rgba(0,0,0,.08)      tarjetas
--elev-2: 0 8px 24px rgba(0,0,0,.16)     modales, menús flotantes
```

En tema oscuro las sombras casi no se ven: **la profundidad se hace con luz**, subiendo el
fondo del elemento en vez de oscurecer abajo.

## Movimiento

Ver `web-motion` para las herramientas. El criterio:

- **Rápido:** 120–200ms para respuestas (hover, foco). 200–400ms para transiciones de estado.
  Más de 500ms se siente lento aunque se vea bonito.
- **Sale rápido, entra suave:** `ease-out` para entrar, `ease-in` para salir.
- **Sólo `transform` y `opacity`.** Animar `width` o `top` produce tirones.
- **El movimiento guía, no decora.** Si no te dice de dónde vino algo o hacia dónde va, sobra.

## Densidad

Pregunta que casi nadie se hace: **¿esto es para ver o para trabajar?**

- **Para ver** (landing, portafolio): aire generoso, tipografía grande, poco por pantalla.
- **Para trabajar** (tablero, mesa de anotación): densidad alta, tipografía chica, mucho a la
  mano. Aquí el aire generoso es un estorbo — obliga a hacer scroll para algo que debería
  estar de un vistazo.

Ligas Mazi es de los dos tipos según la pantalla, y eso hay que decidirlo pantalla por pantalla.

## Antes de dar algo por bueno

- [ ] ¿Se distinguen tres niveles de jerarquía de un vistazo?
- [ ] ¿Todos los espacios salen de la escala?
- [ ] ¿Hay 6 tamaños de letra o menos?
- [ ] ¿Un solo acento?
- [ ] ¿Todo tiene ancho máximo?
- [ ] ¿Se diseñó para 1920, o sólo se centró?
- [ ] ¿Un radio y dos elevaciones?
- [ ] ¿Se vio en las tres pantallas con `agent-browser`?

## Trabaja con otras skills

- **`revision-web`** — la cátedra encuentra qué está mal; esta skill dice cómo se ve bien.
- **`agent-browser`** — sin ver la pantalla esto es teoría.
- **`ui-components`** — las librerías ya traen decisiones tomadas; esta skill te deja juzgar si
  son las correctas y ajustarlas.
- **`web-motion`** — el movimiento con criterio.
