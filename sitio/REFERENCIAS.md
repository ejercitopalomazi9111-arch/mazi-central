# Referencias de efectos — qué tomamos y qué no

**Fecha:** 30 de julio de 2026
**Quién las trajo:** Carlos — una guía en Google Docs, ocho demos de efectos hechas en Framer, y
`uiprompts.app`.
**Qué es este archivo:** el criterio, con los números medidos. Para no volver a discutirlo, y para
que cuando digamos que no a algo bonito quede escrito **por qué**.

> **La regla que ordena todo esto:** las ideas se toman, el stack no. Una referencia sirve para saber
> **qué** se quiere lograr; cómo se logra lo decide nuestro presupuesto, no el de quien la hizo.

---

## 1 · Lo que midió Saúl, y decide la discusión

Las ocho demos están hechas en **Framer**. Medí una completa —`x-ray`, de las más simples— pidiendo
todos sus scripts:

| Qué carga | Peso |
|---|---|
| `InteractiveGrid_prod.mjs` (el efecto) | **706 KB** |
| `framer.mjs` (el runtime de Framer) | **413 KB** |
| `motion.mjs` (Framer Motion) | **146 KB** |
| `react.mjs` | **141 KB** |
| resto | 12 KB |
| **Total JavaScript** | **1,421 KB** |
| **+ HTML** | 67 KB |
| | **≈ 1.5 MB por UN efecto** |

**Contra lo nuestro:**

| | Peso |
|---|---|
| Presupuesto de la portada (`PLAN.md` §4, Tomás) | **< 200 KB** |
| Bloque 1 ya construido: fuente + logo + CSS + JS | **≈ 50 KB** |
| Una sola demo de éstas | **≈ 1,500 KB** |

> **Un efecto cuesta siete veces el presupuesto de toda la página, y treinta veces lo que pesa hoy.**

Y eso en un teléfono con datos, que es el aparato de referencia de la casa — no una laptop con fibra.

**Nota de honestidad sobre cómo medí:** primero intenté medirlas con el navegador y me salieron
**0 KB en las ocho**, porque el navegador de esta caja no sale a internet. Estuve a punto de reportar
esos ceros. También detecté una librería (`ogl`) que resultó ser **falso positivo**: la cadena venía
de `ia_archiver`, dentro de un filtro de bots. Las dos cosas se corrigieron midiendo con `curl`, que
sí sale. Lo escribo porque un número mal medido es peor que no tener número.

---

## 2 · El problema que nadie mide: **seis de las ocho necesitan mouse**

| Demo | Qué hace | ¿Existe en un teléfono? |
|---|---|---|
| hover text repeat | el texto se repite al pasar el cursor | ❌ no hay `hover` |
| liquid images | la imagen se deforma bajo el cursor | ❌ |
| 3d distort | la malla se deforma bajo el cursor | ❌ |
| x-ray reveal | se destapa lo que hay debajo del cursor | ❌ |
| hover mask | la máscara sigue al cursor | ❌ |
| 3d rug | el "pelo" se peina al pasar el cursor | ❌ |
| neural background | fondo animado solo | ✅ |
| 3d paper plane | avión que vuela solo | ✅ |

**En un teléfono no existe el cursor.** `hover` se simula con el primer toque, y en la práctica eso
significa que el efecto se dispara **al intentar tocar otra cosa** o no se dispara nunca.

Nuestro visitante llega de **Instagram y de un reenvío de WhatsApp**, o sea que llega en teléfono.
**Seis de las ocho referencias están diseñadas para un aparato que nuestro visitante no está usando.**

*(Pilar y Ximena, y es el mismo argumento por el que el sitio se diseña teléfono primero.)*

---

## 3 · Las ideas SÍ se toman — y tres se construyen baratas

Lo valioso de esas demos no es el código: es **qué logran**. Tres se hacen con lo que ya tenemos.

| Idea que vale | Cómo la haríamos nosotros | Costo |
|---|---|---|
| **X-ray / máscara que revela** | `mask-image` con un degradado radial movido por CSS. **No necesita WebGL ni librería** — es una propiedad de CSS. En teléfono se ata al **scroll** en vez de al cursor, que es lo que sí existe | ~30 líneas |
| **Fondo "neural" vivo** | Ya lo tenemos resuelto mejor: degradado + grano en SVG, **cero kilobytes**. Si algún día se quiere movimiento, un canvas 2D con puntos y líneas pesa ~2 KB | ya está |
| **Texto que se arma / se repite** | La fábrica de tipografías dibuja las letras **trazo por trazo**. Podemos animar el trazado, que es más nuestro que cualquier efecto comprado | ya existe `tipos.mjs` |

**Las cinco de 3D no se toman**, y no por pobreza: por criterio. Un avión de papel volando no prueba
nada de lo que vendemos, cuesta megabytes, y **es lo que tiene el sitio de al lado que también lo
compró.**

---

## 4 · La guía de Google Docs — y dónde sí aplica

La guía (`@vanessaroa___`) recomienda: **Claude Code + Framer Motion + la skill UIUX Pro Max +
21st.dev**.

**Es una buena guía, y para el sitio público no aplica.** Nuestro `PLAN.md` ya decidió cero
librerías y cero CDN, y no es dogma: es que la portada tiene que abrir en menos de 1.5 s en un
teléfono con datos, y React + Framer Motion arrancan en 300 KB antes de que haya una sola letra en
pantalla.

**Pero hay un lugar donde ese stack es exactamente el correcto, y conviene decirlo:**

| Proyecto | ¿Framer Motion + 21st.dev? |
|---|---|
| **El sitio público** | ❌ No. El peso es el producto: si tarda, perdimos |
| **Panel Mazi** (Fase 2) | ✅ **Sí.** Es una app interna, con cuentas, que se usa sentado. Ahí React y una librería de componentes ahorran semanas y el peso no importa igual |
| **El taller de herramientas** | ⚠️ Depende. La carcasa no; una herramienta pesada podría, cargada con `import()` |

**Y `UIUX Pro Max`:** antes de instalar cualquier skill de fuera se lee completa (`CATALOGO.md`).
Una skill corre con nuestros permisos y hereda nuestro contexto. Ésa está pendiente de revisión, no
descartada.

---

## 5 · `uiprompts.app` — el veredicto

**Qué es:** biblioteca de *prompts* para generar sitios "cinematográficos". 111 diseños, 20 gratis,
**$49 USD de por vida** los 111. Tiene servidor MCP.

**A favor:** lo que se compra es **criterio, no código** — cómo se describe un efecto para que salga
bien. Eso es justo el hueco que `CLAUDE.md` §11 reconoce. Y $49 una vez no es una suscripción, así
que no choca con LA REGLA §2.

**En contra, y pesa más:** **111 sitios que va a usar todo el mundo.** Nuestra tesis entera
(`PLAN.md` §0) es que **el sitio ES una herramienta** y que lo que nos distingue no se puede copiar
porque hay que **haberlo construido**. Un sitio armado con los mismos prompts que los demás es
exactamente lo contrario, por bonito que quede.

> **Recomendación: los 20 gratis, sí — como referencia de lenguaje.** Los $49, **no todavía**. Se
> revisa si algún día vendemos landings a volumen, donde velocidad de producción vale más que ser
> distintos. Para el sitio de la casa, no.

---

## 6 · Lo que sí me llevo de todo esto

1. **La vara de calidad.** Esas demos se sienten caras, y el sitio tiene que sentirse así. La
   diferencia es que nosotros lo vamos a lograr con **peso**, no con librerías: 50 KB que abren al
   instante también se sienten caros, y ésa es una sensación que no se compra.
2. **La máscara que revela, atada al scroll.** La única de las ocho que entra al plan, y cuesta 30
   líneas de CSS.
3. **El apunte para el Panel Mazi:** cuando llegue la Fase 2, esa guía se saca del cajón y se usa.

**Y la regla que queda escrita:** cuando algo se vea increíble, la primera pregunta no es *"¿cómo lo
hago?"* sino **"¿cuánto pesa y funciona con el dedo?"**. Con esas dos preguntas, seis de estas ocho
se caen antes de escribir una línea.
