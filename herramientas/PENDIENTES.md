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

### 5. Vendorizar `supabase-js` y `leaflet` — la deuda que ya está en producción

**Ésta no es una herramienta que falte: es una dependencia que ya estamos corriendo en vivo**, y la
encontró la skill `consejo-tecnico` el día que se construyó, sin necesidad de auditar nada — está a
la vista en el código.

| Dónde | Qué carga de un CDN ajeno |
|---|---|
| `ligas-mazi/index.html:1542` | `@supabase/supabase-js@2` desde `cdn.jsdelivr.net` |
| `vitallink/index.html:1002` | `leaflet@1.9.4` desde `unpkg.com` |

- **Falta:** que esas dos librerías vivan en el repo, con versión fija, como ya vive
  `anime.min.js` en la misma carpeta de Ligas Mazi.
- **Hoy se resuelve con:** el CDN. Funciona… mientras responda.
- **Por qué duele, y son tres cosas:**
  1. **Si jsdelivr no contesta, Ligas Mazi se queda sin login.** El código lo contempla con un
     `if` que simplemente no hace nada, así que falla en silencio.
  2. **`@2` no es una versión, es un rango**, y sin `integrity` nadie verifica que llegó lo que
     esperábamos.
  3. **Ese script corre con todos los permisos de la página** — la misma que maneja sesiones,
     pagos y datos de menores. Un CDN comprometido no rompe un gráfico: lo ve todo.
- **Costo de construirla:** **bajísimo.** Bajar el archivo, fijar la versión, cambiar el `src`.
  Menos de una hora contando la prueba. Ya sabemos hacerlo: `anime.min.js` está vendorizado.
- **Cada cuánto duele:** cada vez que alguien abre Ligas Mazi.
- **Veredicto:** **hacerlo ya.** Es la relación costo-beneficio más obvia del archivo, y es
  violación directa de LA REGLA §2 sin el matiz que la perdona — porque el matiz aplica cuando
  construir cuesta más que la chamba, y aquí cuesta menos.

### 6. Revisar la skill `UIUX Pro Max` antes de instalarla

- **Falta:** decidir si entra al catálogo. La trajo Carlos el 30 de julio en una guía junto con
  Framer Motion y 21st.dev.
- **Hoy se resuelve con:** `frontend-design`, que ya cubre criterio visual.
- **Por qué no se instaló de una:** una skill de fuera **corre con nuestros permisos y hereda
  nuestro contexto** (`CATALOGO.md` lo dice con todas sus letras). Se lee completa antes.
- **Cada cuánto duele:** poco. Ya hay criterio de diseño en la casa.
- **Veredicto:** **leerla cuando toque el Bloque 2**, no antes.

### 7. El stack de React para el Panel Mazi (Fase 2)

- **Falta:** decidir librería de componentes y de animación para el panel interno.
- **Hoy se resuelve con:** nada, la Fase 2 no ha empezado.
- **Lo que ya sabemos, y viene de las referencias del 30 de julio**
  ([`sitio/REFERENCIAS.md`](../sitio/REFERENCIAS.md)): **Framer Motion + 21st.dev NO van en el sitio
  público** —pesan 300 KB antes de la primera letra— **pero sí encajan en el Panel Mazi**, que es una
  app interna que se usa sentado y donde el peso no manda.
- **Veredicto:** **queda decidido de antemano.** Cuando arranque la Fase 2, ese stack se evalúa
  primero en vez de empezar de cero.

---

## Movidas de aquí (histórico)

Cuando algo se construya, baja a esta lista con la fecha. Sirve para saber si el apunte se
respeta o sólo crece.

### 30 de julio de 2026 · Exportar la tipografía a fuente instalable

Era el pendiente #3, anotado con la condición de construirlo **"cuando haya un documento real
que lo pida"**. El sitio lo pidió: Carlos pidió que la tipografía se pudiera usar en la página.

- **Se construyó:** [`herramientas/fuente.mjs`](fuente.mjs) — la fundidora. Convierte cualquier
  alfabeto de `tipos.mjs` en `.ttf` + `.woff2` + el `@font-face` + una página de prueba.
- **Salida:** `sitio/fuente/mazi.woff2`, **9 KB**, 107 glifos.
- **Sobre LA REGLA:** `opentype.js` y `wawoff2` son librerías abiertas que corren en nuestra
  máquina. No hay servicio de nadie en medio, no hay cuenta que nos cierren, no hay nada que
  subir. Eso es stack propio (`CLAUDE.md` §2), no un externo.
- **Lo que sí fue nuestro:** las cuatro trampas — sentido de giro de los contornos (si dos
  trazos que se cruzan giran al revés, el cruce sale hueco), los anillos que NO se deben
  normalizar por separado o pierden su hueco, aplanar las Béziers de los discos, y adelgazar con
  Ramer-Douglas-Peucker para que el archivo no pese absurdo.
