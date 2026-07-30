---
name: remotion
description: Hacer video MP4 real con código React — Remotion. Úsala cuando haya que producir video programático: reels y carruseles a volumen, videos personalizados por dato (uno por cliente, por partido, por producto), animaciones de marca repetibles, o subtítulos y visualizaciones automáticas. Incluye el modelo de licencia, que cobra por render arriba de 3 personas, y cuándo NO conviene.
---

# Remotion — video con código

Videos MP4 de verdad, escritos como componentes de React.

## Qué es

En vez de arrastrar clips en una línea de tiempo, **escribes el video**. Cada fotograma es un
render de React; Remotion los arma y los codifica en un MP4 real.

Tres formas de trabajarlo:
- **Programática** — conectas datos y el video sale de ahí. *Aquí está el valor.*
- **Interactiva** — Remotion Studio, arrastrar y soltar, y los cambios vuelven al código.
- **Agéntica** — un agente de código convierte la idea en video.

## ⚠️ La licencia — léela antes de venderle esto a nadie

Esto es lo que casi nadie menciona cuando lo recomienda:

| Licencia | Para quién | Costo |
|---|---|---|
| **Gratis** | individuos y equipos de **hasta 3 personas** | $0, uso comercial ilimitado |
| **Empresa** | equipos de **4 o más** | **$0.01 USD por render**, mínimo $100/mes |
| **Creador** | poco volumen | $25/mes por asiento |
| **Enterprise** | consultoría y términos a la medida | desde $500/mes |

**Qué significa para Grupo Mazi:** hoy, con equipo chico, **es gratis y con uso comercial
permitido**. En cuanto el equipo llegue a 4 personas, la factura arranca en **$100 USD al mes
mínimo** — unos $2,000 pesos mensuales.

Eso choca de frente con la regla de la casa: *nada de depender de externos*. Remotion es
justo el tipo de herramienta que se vuelve cara **cuando el negocio crece**, que es el peor
momento para descubrirlo.

**La postura correcta:** úsalo, pero **con la salida planeada desde el día uno**. La lógica de
qué se anima y con qué datos vive en código nuestro; Remotion es sólo el motor que renderiza.
Si mañana cobra, se cambia el motor sin rehacer el contenido.

## Cuándo SÍ vale la pena

Remotion gana en **una sola cosa**, pero la gana por goleada: **video por dato, a volumen**.

| Caso | Por qué gana |
|---|---|
| **Un video por cliente** | 50 clientes, 50 videos personalizados, un render |
| **Ligas Mazi** | resumen en video de cada partido con el marcador real, automático |
| **Reels a volumen** | mismo formato, contenido distinto, sin abrir un editor |
| **Subtítulos automáticos** | texto sincronizado, calculado, no puesto a mano |
| **Animación de marca repetible** | el intro que siempre es igual, sin volver a exportarlo |
| **Datos que se mueven** | gráficas animadas desde números reales |

La regla: **si vas a hacer el video una sola vez, no uses Remotion.** Si vas a hacer el mismo
video cien veces con datos distintos, no uses otra cosa.

## Cuándo NO

- **Video de una sola vez.** Un comercial, un reel suelto. Sale más rápido en un editor normal
  y no arrastras un proyecto de React para eso.
- **Video con metraje real de protagonista.** Remotion brilla en gráficos, texto y movimiento
  programado. Para material grabado, un editor de verdad va mejor.
- **Cuando el equipo pase de 3.** Ahí cambia el cálculo y hay que decidir a conciencia.
- **Para "arte" generado.** Regla número uno de la casa: el arte no se dibuja por código. Los
  gráficos animados, la tipografía y las transiciones sí son legítimos — un personaje
  ilustrado por código, no.

## Lo que encaja con el negocio

De todo el catálogo, dos usos justifican aprenderlo:

**1 · Resúmenes automáticos de Ligas Mazi.** Termina el partido → sale un video vertical con el
marcador, los anotadores y el escudo de cada equipo. Los papás lo comparten solos. Eso es
marketing que se produce a sí mismo, y es exactamente el tipo de detalle por el que una liga
paga.

**2 · El contenido para redes** (Fase 5 del plan). El generador de posts saca el texto desde
hitos reales de proyecto; Remotion lo convierte en video con la misma plantilla de marca. El
cuello de botella de "no tenemos presencia en redes" es producción, y esto la automatiza.

## Cómo se arranca

```bash
npx create-video@latest
cd mi-video
npm run dev        # abre Remotion Studio para ver y ajustar
npm run build      # renderiza el MP4
```

Un video es un componente que recibe el fotograma actual y devuelve lo que se ve en él. La
duración, la resolución y los fotogramas por segundo son configuración, no arrastre de bloques.

**Antes de escribir código en serio, lee la documentación oficial** — la API cambia entre
versiones mayores y esta skill guarda criterio, no sintaxis.

## Alternativas antes de comprometerse

- **`ffmpeg` puro** — para composiciones simples y repetitivas es gratis para siempre, sin
  licencia que se despierte. Feo de escribir, pero nuestro.
- **Grabar un HTML animado con Playwright** — se anima con Anime.js, se captura fotograma a
  fotograma, se arma con ffmpeg. Más trabajo, cero dependencias con licencia. **Es el camino
  que más respeta la regla de la casa**, y ya tenemos medio armado el arnés de captura.
- **`scroll-cinema` al revés** — si el destino es la web y no un MP4, quizá ni necesitas video.

## Trabaja con otras skills

- **`scroll-cinema`** — el hermano para web. Uno produce archivo, el otro produce experiencia.
- **`web-prompts`** — el video de portada del sitio puede salir de aquí.
- **`four-judges`** — antes de meter una dependencia con licencia por render, rostízala.
- **`multi-agent`** — un Director de Marketing usaría esto para producir a volumen.

## Fuente

[remotion.dev](https://www.remotion.dev/) — consultado julio 2026. **Verifica la licencia antes
de comprometer al negocio**: los precios de arriba son de esa fecha y este es justo el dato que
cambia.
