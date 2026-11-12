# Lo que pasó Carlos el 12 de noviembre, y qué se tomó

Carlos: *«ten, más cursos para que tomes lo útil»*. Venían cuatro paquetes:

- una lista de 9 skills de animación (con prompts para instalarlas);
- la guía de @prompteafacil (Claude Code + Motion + la skill UI/UX Pro Max);
- las tres guías de tododeia (Motion, Creative y Video Editor Architect);
- tres enlaces: horizonx.so, santa-ia.com y el PDF «Diseño sin vibecoded» de Level AI.

**Nada se instaló pegando el prompt que traían.** Cada repositorio se clonó aparte, sin correr nada, y se revisó:

- su licencia: todas son MIT o Apache;
- los patrones de skill mala, los mismos de la revisión del 9 de noviembre. No salió ninguno. Lo único que
  apareció fueron manuales que enseñan a instalar uv y Claude Code con `curl | sh`, que son documentación y no
  órdenes escondidas.

## Lo que entró a la bodega (38 skills, dormidas)

| Repo | Skills | Para qué nos sirve |
|---|---|---|
| `iart-ai/motion-design-skills` | 9 · animation-principles, logo-animation, beat-sync-editing, shot-composition, motion-art-direction, color-motion, motion-background, remotion-video, after-effects | **Lo mejor del lote.** Oficio de animación para los anuncios. Lo de logos ya se pasó a `marca/anuncios/APRENDIDO-UGOKI.md` |
| `Hainrixz/video-editor-architect` | 8 · editar, aprender-estilo, entrenar-estilo, ajustar, sfx, stickers… | Editar reels con un estilo que se aprende una vez. Sirve para el podcast y los reels de Grupo Mazi. Sin la carpeta de herramientas del repo es sólo el método |
| `Hainrixz/creative-architect` | 8 · direccion-de-arte, producto, ugc, clonar-anuncio, animar… | Pensar la foto antes de gastar créditos de Higgsfield. Para All's fashion y los anuncios de producto |
| `nextlevelbuilder/ui-ux-pro-max-skill` | 6 · ui-ux-pro-max, design-system, brand, design, slides, banner-design | Catálogo de estilos, paletas y pares de letras. **Ojo:** `design` genera logos con IA, y eso va contra la regla 1 (el logo se compone, no se genera) |
| `Hainrixz/motion-architect` | 1 | Storyboard antes de animar, en 4 tamaños de redes. Se parece a nuestro motor de anuncios |
| `iart-ai/javascript-animation-skills` | 2 · javascript-animation, soundtrack | Música compuesta en código, como las entradas del podcast |
| `adithya-s-k/manim_skill` | 3 | Animaciones de matemáticas para las tareas escolares. **ManimGL no es para uso comercial** (CC BY-NC-SA) |
| `ToBeWin/HandDraw-Skill` | 1 | Videos explicativos estilo pizarrón |

Se buscan con `node herramientas/bodega.mjs buscar "…"`, se montan sólo mientras se trabaja y se desmontan al
terminar.

## Lo que NO entró, y por qué

| Qué | Por qué |
|---|---|
| `cloveric/claude-drawing-skill` (167 MB), `alchaincyf/huashu-art-motion` (75 MB), `alexgreensh/anidoodle` (16 MB) | Dibujan el arte con código. Carlos, el 30 de octubre: *«jamás usar arte creado por ti, sólo modelos ya existentes»*. Además pesan demasiado para un repo público. Si un día él pide algo de ese estilo, se clonan aparte |
| `LunaAI519/motion-skill` (35 MB) | Foto → video estilo collage con Nano Banana y Seedance vía Higgsfield. **Gasta créditos.** Ya tenemos Higgsfield conectado en `herramientas/higgsfield/`; el método se puede leer en el repo cuando haga falta |
| `JohnHeibel/ClaudeAnimationBase` | No trae SKILL.md: es un proyecto de p5.js con personajes dibujados en código (mismo motivo que arriba) |
| `pnpm add motion` (la guía de prompteafacil) | Ya está cubierto en la skill `web-motion`, y en nuestras páginas sin compilación no se usa React |
| horizonx.so | Biblioteca de plantillas de paga (USD 24.99 al mes). Choca con la regla del dinero y con «lo construimos nosotros». Sirve para mirar ideas (landings con scroll 3D), no para comprar |

## Lo que sí cambió algo en la casa

1. **`tics-de-ia` creció con la guía «Diseño sin vibecoded».** Entraron:
   - 12 tics que no teníamos;
   - las cuatro decisiones previas, con el **elemento firma** («si no hay firma, hay plantilla»);
   - un `grep` de un renglón para revisar el CSS antes de entregar.

   Se probó con la página de Urban Pest y cazó dos tics de verdad: los nombres de los clientes en mayúsculas
   naranjas y el borde blanco translúcido. Ya se quitaron. En lo de apretar las letras del título, la guía dice
   lo contrario que nosotros: quedó anotado en la skill.
2. **santa-ia.com** es una consultora que vende exactamente nuestro servicio de «gestión de negocios», y vende
   con **diez dolores** del cliente, por ejemplo:
   - «No tienes control de los gastos»;
   - «Un área completa vive de un solo Excel»;
   - «Tomas decisiones y no queda registro».

   Es buen modelo para la sección de gestión de negocios de nuestra página y para los guiones de los vendedores:
   se vende con el dolor, no con el servicio. **No se copia el texto**; se escriben los nuestros con la voz de
   Carlos.
