# Herramientas por construir

El apunte que pidió Carlos. LA REGLA dice que todo lo que la empresa use lo construimos nosotros
— pero si la herramienta todavía no existe y hacerla en el momento cuesta más que la chamba que
estoy haciendo, **se anota aquí, se resuelve hoy con el externo, y se construye cuando haya
presupuesto y tiempo.**

Sin este archivo la regla se vuelve un olvido: usamos el externo "temporalmente" y nadie
regresa. Aquí queda la deuda a la vista.

## Cómo se lee

- **Falta** — qué no tenemos.
- **Hoy se resuelve con** — el externo que estamos usando mientras.
- **Costo de construirla** — mi estimación honesta. Si me equivoco, se corrige.
- **Cada cuánto duele** — lo que decide la prioridad. Algo caro que necesitamos a diario sube;
  algo barato que usamos una vez al año se queda abajo.

---

## Pendientes

### 1. Vectorizador de imagen a SVG

- **Falta:** convertir un PNG plano (un logo generado, un boceto) en trazos vectoriales
  editables, con paleta controlada y sin trazos basura.
- **Hoy se resuelve con:** `imagetracerjs` (librería open source, corre local — no es un
  servicio) y, si no alcanza, `image_vectorize` de Adobe vía MCP.
- **Costo de construirla:** alto. Un trazador decente es marching squares + simplificación
  Ramer-Douglas-Peucker + ajuste de Bézier + manejo de huecos. Días, no horas, y es un problema
  resuelto desde los ochenta.
- **Cada cuánto duele:** cada vez que hay identidad nueva. Varias veces por cliente.
- **Veredicto:** **no construir por ahora.** Envolverlo en nuestro adaptador
  (`herramientas/vectorizar.mjs`) para que cambiar de motor sea cambiar una función.

### 2. Generación de imagen desde aquí

- **Falta:** que yo pueda generar imágenes sin que Carlos las pida a otra IA y me las mande.
  Hoy el ciclo es: yo escribo el prompt → él lo corre en su teléfono → me manda capturas. Eso
  mete media hora de ida y vuelta en cada intento.
- **Hoy se resuelve con:** Carlos y sus IAs. Funciona, pero él es el cuello de botella.
- **Costo de construirla:** medio. No es construir un modelo — es conectar uno (Firefly por el
  MCP de Adobe, o una API de imagen) detrás de nuestro adaptador. El problema real es que las
  llamadas cuestan dinero y hay que decidir presupuesto.
- **Cada cuánto duele:** en cada iteración de arte. Es lo que más nos ha frenado.
- **Veredicto:** **hablarlo con Carlos.** Necesita decisión de presupuesto, no código.

### 3. Medición propia (analítica)

- **Falta:** saber quién entra al sitio y qué hace, sin entregarle el dato a Google.
- **Hoy se resuelve con:** nada. El sitio todavía no existe.
- **Costo de construirla:** medio-bajo si es auto-hospedada (Umami, Plausible — ver la skill
  `stack-propio`); alto si se escribe desde cero.
- **Cada cuánto duele:** todavía no duele. Duele el día que haya tráfico.
- **Veredicto:** **auto-hospedar, no escribir.** Es la Fase 6 del plan.

### 4. Publicador de redes

- **Falta:** publicar en todas las redes desde un panel nuestro.
- **Hoy se resuelve con:** publicar a mano.
- **Costo de construirla:** medio para las que tienen API abierta (YouTube, X, Telegram,
  Bluesky, Pinterest); **imposible legalmente** para Meta, TikTok y LinkedIn sin revisión de
  app. Ver `PLAN.md`. Automatizar con un navegador haciéndose pasar por él **tumba cuentas** —
  eso no se construye.
- **Cada cuánto duele:** diario, en cuanto arranque el marketing.
- **Veredicto:** **construir la mitad que sí se puede**, y para el resto un "listo para
  publicar" de un toque.

---

## Movidas de aquí (histórico)

Cuando algo se construya, baja a esta lista con la fecha. Sirve para saber si el apunte se
respeta o sólo crece.

*(vacío por ahora)*
