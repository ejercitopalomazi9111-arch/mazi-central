---
name: web-motion
description: El ecosistema de animación web — qué herramienta usar para cada tipo de movimiento (GSAP, Motion, Anime.js, Lenis, Rive, Lottie, React Bits, WebGL) y de dónde sacar referencias reales. Úsala cuando pidan "que se mueva", scroll suave, animación por scroll, microinteracciones, o cuando haya que decidir con qué se anima un proyecto. Incluye el presupuesto de peso y cuándo NO animar.
---

# Movimiento en web

**Los mejores sitios animados no usan una sola librería.** Usan la correcta para cada trabajo.

## El árbol de decisión

```
¿Qué se tiene que mover?
│
├── Scroll suave, con inercia (el "feel" de sitio caro)
│   └── Lenis — se combina con cualquier otra
│
├── Un objeto REAL que gira o se arma al bajar
│   └── scroll-cinema (skill propia) — fotogramas en canvas, sin framework
│
├── Secuencia coreografiada: varias cosas en orden, con línea de tiempo
│   └── GSAP + ScrollTrigger — nadie le gana en esto
│
├── Microinteracciones en React (hover, entrada, cambio de estado)
│   └── Motion (antes Framer Motion) — o SmoothUI / Magic UI ya resueltas
│
├── Animación que RESPONDE al usuario (estados, personaje que reacciona)
│   └── Rive — el diseñador define el comportamiento, no el programador
│
├── Animación ya hecha por un diseñador en After Effects
│   └── Lottie — la biblioteca más grande de animaciones listas
│
├── Fondo espectacular (fluido, prismas, partículas)
│   └── React Bits (ver ui-components) — WebGL ya empaquetado
│
└── HTML autónomo, sin build, sin framework
    └── Anime.js vendorizada — la de la casa
```

## La tabla

| Herramienta | Su fuerte | Cuándo NO |
|---|---|---|
| **GSAP** | líneas de tiempo complejas, scroll coreografiado, morphing de SVG | para un fade simple es matar moscas a cañonazos |
| **Motion** | microinteracciones en React, física de resorte | fuera de React no aplica |
| **Anime.js** | ligera, sin dependencias, JS puro | no tiene scroll trigger de fábrica |
| **Lenis** | scroll suave con inercia | si el sitio es de lectura, el scroll "raro" molesta |
| **Rive** | animación interactiva por estados, editor visual | necesita que alguien la haga en su editor |
| **Lottie** | reproducir animación hecha en After Effects | los archivos pesados matan el rendimiento |
| **React Bits** | fondos WebGL y texto animado | batería y GPU en teléfonos de gama baja |
| **`scroll-cinema`** | objeto real girando al hacer scroll | es la más pesada de todas |

## La combinación que usan los sitios buenos

No es una librería, es un reparto:

```
Lenis        → el feel del scroll
GSAP         → las secuencias coreografiadas
Lottie/Rive  → lo que hizo el diseñador
CSS          → todo lo simple (hover, foco, transiciones de estado)
```

**Y la regla que más importa:** lo simple se hace con CSS. Meter una librería para un `hover`
es peso que se paga en cada carga.

## Presupuesto de peso

Antes de instalar nada:

| Técnica | Costo aproximado |
|---|---|
| CSS puro | 0 |
| Anime.js | ~17 KB |
| Motion | ~30–50 KB |
| GSAP + ScrollTrigger | ~70–100 KB |
| Lottie + un archivo | 60 KB + el JSON (a veces cientos de KB) |
| WebGL / React Bits | pesado, y consume GPU y batería |
| `scroll-cinema` | **el más caro** — megas de imágenes |

**Una sola librería de animación por proyecto.** Motion + GSAP + WebGL en el mismo bundle es
peso triplicado y peleas entre sí.

## Cuándo NO animar

Decirlo es parte del trabajo:

- **`prefers-reduced-motion` activo.** Se apaga. Sin excepción, sin negociación.
- **Cuando compite con el contenido.** Si vienen a leer o a comprar, el movimiento estorba.
- **En una landing de conversión.** Retrasa el CTA.
- **Cuando no comunica nada.** El movimiento dice de dónde vino algo o a dónde va. Si no dice
  nada, es decoración y sobra.
- **Más de una animación grande por pantalla.** Compiten y cansan.

## De dónde sacar referencias

- **[Codrops](https://tympanus.net/codrops/)** — desde 2009. Tutoriales, casos de estudio y
  demos interactivas de web creativa. Su *Webzibition* tiene 2,000+ sitios curados. **Es la
  mejor fuente para el laboratorio de animación**: son técnicas explicadas, no sólo inspiración.
  ⚠️ Revisa su licencia antes de usar código en trabajo de cliente.
- **[React Bits](https://reactbits.dev/)** — 140+ componentes, fuerte en fondos y texto animado.
  Cada uno con vista previa en vivo y parámetros que se pueden tocar.
- **Awwwards** — para ver qué se está premiando. Cuidado: mucho de ahí es imposible de mantener
  y pésimo en teléfono.

**Cómo usarlas bien:** se toman como **referencia de técnica**, no para copiar. Ver un efecto,
entender por qué funciona, y decidir si el proyecto lo aguanta.

## Para el laboratorio de animación del sitio

El plan (`CLAUDE.md` §6-bis) pide 4–6 demos en vivo. Con lo de aquí:

| Demo | Con qué |
|---|---|
| Texto que se arma | Anime.js o React Bits |
| Cuadrícula que reacciona al dedo | canvas puro o React Bits |
| Números que cuentan | Anime.js — es su especialidad |
| Barra que rasca la animación | Lenis + GSAP, o control manual |
| Tarjeta que se transforma | Motion, o CSS con `view-transition` |

**Al menos una debe correr sin framework** — es el argumento de que sabemos hacerlo a mano y no
sólo pegar librerías.

## Trabaja con otras skills

- **`scroll-cinema`** — la técnica más cara, cuando de verdad hay un objeto que mostrar.
- **`ui-components`** — React Bits, Magic UI y SmoothUI traen movimiento ya resuelto.
- **`frontend-design`** — el criterio de tiempos y curvas.
- **`revision-web`** — la cátedra verifica `prefers-reduced-motion` y que sólo se animen
  `transform` y `opacity`.

## Fuentes

- [Mejores librerías de animación 2026 · Alignify](https://alignify.co/tools/animation-library)
- [Herramientas de animación web 2026 · ThemeSelection](https://themeselection.com/blog/web-animation-tools/)
- [Codrops](https://tympanus.net/codrops/)
