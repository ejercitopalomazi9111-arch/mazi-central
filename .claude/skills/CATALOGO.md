# Catálogo de skills — instaladas y por construir

## Lo que ya está vivo

Estas se cargan solas cuando aplican. No hace falta mencionarlas.

| Skill | Qué dispara |
|---|---|
| `four-judges` | Antes de toda decisión cara o difícil de revertir. Palabra clave: **ROAST** |
| `ui-components` | Al arrancar interfaz web: elige entre Magic UI, SmoothUI, RetroUI, Unlumen y React Bits — o dice que ninguna aplica |
| `web-prompts` | Briefing de un sitio, "que se vea más caro", pulido antes de entregar |
| `scroll-cinema` | Animación por scroll tipo Apple: fotogramas en canvas |
| `remotion` | Video MP4 hecho con código, a volumen y por dato |
| `multi-agent` | Armar equipos de agentes con identidad y memoria |
| `stack-propio` | Elegir herramienta: open source auto-hospedable antes que suscripción |
| `manus` | Decidir si delegar a un agente autónomo externo |

---

## El mapa de 42 skills — de dónde salió y qué es

De un carrusel público (`juanbertorello.ia`), premisa: *"Claude por defecto diseña horrible.
Interfaces genéricas, todas iguales."*

**Advertencia honesta:** el carrusel trae **nombres y una línea de descripción**, no las skills.
No es una biblioteca que se pueda instalar desde aquí — es una **taxonomía**. Vale como mapa de
qué hueco tenemos, no como material listo.

Muchos de esos nombres corresponden a skills públicas reales. **Antes de instalar cualquiera de
fuera, léela completa**: una skill corre con nuestros permisos y hereda nuestro contexto.

### Capa 1 · Frontend y UI — *"diseño que no parece de IA"*
`frontend-design` (interfaces distintivas) · `ui-ux-pro-max` (inteligencia UI/UX) ·
`refactoring-ui` (sistema de diseño) · `top-design` (nivel Awwwards) · `web-typography`
(pairing de fuentes) · `taste-skill` (anti-slop frontend) · `microinteractions` ·
`ux-heuristics` (auditoría UX) · `design-html` (maquetado limpio) · `canvas-design` (pósters)

### Capa 2 · Imagen, gráficos y video — *"assets visuales programáticos"*
`gpt-image` · `image` (imágenes marketing) · `image-enhancer` (upscale) · `brand-guidelines`
(identidad de marca) · `theme-factory` (paletas) · `excalidraw-diagram` · `content-studio`
(carruseles y reels) · `video`

⚠️ **Choque con la regla número uno.** Cuatro de estas ocho generan imágenes. *El arte no se
dibuja por código.* Sólo entran las que organizan (marca, paletas, diagramas), no las que
inventan ilustración.

### Capas 3 y 4 · Producto e interacción — *"sistemas que responden"*
`page-cro` · `signup-flow-cro` · `onboarding-cro` · `form-cro` · `popup-cro` · `hooked-ux` ·
`improve-retention` · `design-everyday-things` · `lean-ux` · `ab-test-setup`

### Capa 5 · Comportamiento y prompts
`voice-jcb` (voz de marca fija) · `humanise-text` (quitar olor a IA) · `copywriting` ·
`copy-editing` · `storybrand-messaging` · `made-to-stick` · `content-strategy` ·
`social-content`

### Capa 6 · Confianza y evaluación — *"sistemas defensivos"*
`review` (code review) · `qa` (QA visual) · `codex` (review cross-model) · `security-review` ·
`verify-work` (verificación end-to-end) · `ship` (deploy final)

---

## Qué de esos 42 nos falta de verdad

No los 42. La mayoría son variaciones de lo mismo, y una skill mediocre estorba más de lo que
ayuda. Los que sí tapan un hueco real, en orden:

1. **Criterio de diseño** (`frontend-design` / `refactoring-ui` / `web-typography`). Es el
   hueco más grande y el que Carlos ya señaló: *"en computadora se ve feísima la página."*
   Tipografía, jerarquía, espaciado y color en una skill nuestra, no de un tercero.
2. **`humanise-text` + `voice-jcb`.** La voz de Grupo Mazi ya está descrita en `CLAUDE.md`,
   pero no como skill que se aplique al copy de un cliente. Vendemos marketing: deberíamos
   tener lo mejor en esto.
3. **`copywriting` + `storybrand-messaging`.** El texto es la mitad de la venta de una landing,
   y la skill `web-prompts` sólo cubre cómo pedirlo, no cómo escribirlo.
4. **`qa` visual.** Ya existe media herramienta: `herramientas/captura.mjs`. Falta el criterio
   de qué revisar en la captura.
5. **CRO** (`page-cro`, `form-cro`). Sólo cuando haya un cliente que pague por conversión
   medida. Antes de eso es teoría.

**Lo que NO vamos a construir:** las que generan arte. Ya está decidido y no se discute.

---

## Regla de crecimiento

Igual que con los agentes: **una skill nueva sólo cuando duela su ausencia.** Ocho skills que
se usan seguido valen más que cuarenta que se cargan una vez.

Cuando salga versión nueva de un recurso, se actualiza **sólo el archivo de `reference/`
afectado** — por eso el conocimiento consultable vive separado del criterio.
