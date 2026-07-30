# Catálogo de skills — instaladas y por construir

## Lo que ya está vivo

Estas se cargan solas cuando aplican. No hace falta mencionarlas.

**Empieza por `find-skill`** — es el enrutador: decide cuál(es) usar y en qué orden.

| Skill | Qué dispara |
|---|---|
| `find-skill` | **El índice.** Qué skill toca, en qué orden, y cuándo ninguna |
| `four-judges` | Antes de toda decisión cara o difícil de revertir. Palabra clave: **ROAST** |
| `consejo-tecnico` | **El consejo de ingenieros.** Antes de publicar código con cuentas, pagos, datos de personas, subidas de archivo o llaves. Palabras: **AUDITA** y **ROMPE** |
| `frontend-design` | Que se vea bonito de verdad: tipografía, escala, jerarquía, layout |
| `revision-web` | **La cátedra.** Revisión exhaustiva antes de entregar, con las reglas de Vercel |
| `agent-browser` | Ver y usar la pantalla de verdad. Nunca decir "ya quedó" sin esto |
| `ui-components` | Elegir entre Magic UI, SmoothUI, RetroUI, Unlumen y React Bits |
| `web-motion` | Con qué se anima: GSAP, Motion, Anime.js, Lenis, Rive, Lottie |
| `web-prompts` | Briefing de un sitio, "que se vea más caro", pulido |
| `scroll-cinema` | Animación por scroll tipo Apple: fotogramas en canvas |
| `remotion` | Video MP4 hecho con código, a volumen y por dato |
| `multi-agent` | Armar equipos de agentes con identidad y memoria |
| `stack-propio` | Elegir herramienta: open source auto-hospedable antes que suscripción |
| `manus` | Decidir si delegar a un agente autónomo externo |
| `mcp-builder` *(global)* | Construir servidores MCP. Ya viene instalada, no hay que hacerla |

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

**Nota sobre la regla del arte** (actualizada por Carlos): el arte de **relleno y ambiente** se
busca real con licencia; el arte **único que él pide** —un logo, un ícono, una identidad— sí se
genera. Así que estas skills no están vetadas: se usan cuando la pieza tiene que ser suya, no
como sustituto barato de un asset que ya existe.
`brand-guidelines` y `theme-factory` **ya vienen instaladas globalmente**.

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

> **De esta capa ya no hace falta casi nada.** `qa` y `verify-work` los cubren `agent-browser` +
> `revision-web`. Y **`review` + `security-review` los cubre `consejo-tecnico`**, que además hace algo
> que ninguna de las dos hacía: separar al que ataca del que prioriza el arreglo, y clasificar los
> hallazgos en *sangra / duele / estorba / se acepta* para que no todo parezca urgente.

---

## Qué de esos 42 nos falta de verdad

No los 42. La mayoría son variaciones de lo mismo, y una skill mediocre estorba más de lo que
ayuda. Los que sí tapan un hueco real, en orden:

1. ~~**Criterio de diseño**~~ → **hecho**: `frontend-design`. Era el hueco más grande, el que
   Carlos señaló con *"en computadora se ve feísima la página."*
2. ~~**QA visual**~~ → **hecho**: `agent-browser` + `revision-web`, con dos herramientas propias.
2-bis. ~~**Code review y seguridad**~~ → **hecho**: `consejo-tecnico`. Se construyó el 30 de julio
   porque Ligas Mazi tiene cuentas reales, pagos y datos de menores en un repo público, y nadie lo
   había revisado con esos ojos. **Primera auditoría pendiente y ya con orden sugerido** en
   `consejo-tecnico/reference/superficie.md`.
3. **`humanise-text` + `voice-jcb`.** La voz de Grupo Mazi está descrita en `CLAUDE.md`, pero no
   como skill que se aplique al copy de un cliente. Vendemos marketing: deberíamos tener lo
   mejor en esto. **Es el hueco más grande que queda.**
4. **`copywriting` + `storybrand-messaging`.** El texto es la mitad de la venta de una landing,
   y `web-prompts` sólo cubre cómo pedirlo, no cómo escribirlo.
5. **CRO** (`page-cro`, `form-cro`). Sólo cuando haya un cliente que pague por conversión
   medida. Antes de eso es teoría.

---

## Regla de crecimiento

Igual que con los agentes: **una skill nueva sólo cuando duela su ausencia.** Ocho skills que
se usan seguido valen más que cuarenta que se cargan una vez.

Cuando salga versión nueva de un recurso, se actualiza **sólo el archivo de `reference/`
afectado** — por eso el conocimiento consultable vive separado del criterio.
