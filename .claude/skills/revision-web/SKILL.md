---
name: revision-web
description: La cátedra — revisión exhaustiva de una página antes de entregarla, con las reglas de interfaz de Vercel como checklist (interacción, animación, layout, contenido, accesibilidad, rendimiento, tema oscuro, hidratación) más el pase visual real en navegador. Úsala SIEMPRE antes de entregar cualquier interfaz web, cuando algo "se ve feo pero no sé por qué", o cuando haya que auditar un sitio existente.
---

# La cátedra

Revisión exhaustiva antes de entregar. **No es opcional.**

## Por qué existe

Carlos lo dijo directo: *"en computadora se ve feísima la página."* Eso pasa cuando se
construye mirando un solo tamaño de pantalla y se entrega sin pasar una lista. Esta skill es la
lista.

Está armada sobre las **reglas de interfaz de Vercel** — un cuerpo de estándares de calidad de
UI basado en WCAG, rendimiento y principios de UX. Se usan como checklist, no como dogma.

## El orden de la revisión

Cuatro pasadas. **En este orden**, porque cada una encuentra cosas que la siguiente ya no ve.

```
1. INTERACCIÓN  → ¿se puede usar? (teclado, toque, foco)
2. ESTRUCTURA   → ¿está bien armado? (layout, semántica, contenido)
3. SENSACIÓN    → ¿se siente bien? (animación, tema, pulido)
4. REALIDAD     → ¿se ve bien de verdad? (navegador real, tamaños reales)
```

La cuarta usa la skill **`agent-browser`**: no se firma una revisión sin haber visto la
pantalla. Leer el código no cuenta.

---

## 1 · Interacción

- [ ] **Todo lo interactivo se alcanza con Tab**, en orden lógico
- [ ] **Anillo de foco visible** — nunca `outline: none` sin reemplazo
- [ ] **Área de toque ≥ 24px**, y **≥ 44px en teléfono**
- [ ] Los enlaces son `<a href>`; los botones son `<button>`. No `<div>` con `onClick`
- [ ] **Nunca bloquear pegar** en un campo (romper el pegado de contraseñas es hostil)
- [ ] **Nunca deshabilitar el zoom** (`user-scalable=no` está prohibido)
- [ ] Los formularios aceptan texto libre **antes** de validar — no pelear mientras se escribe

## 2 · Estructura

- [ ] **Semántica nativa primero**: `<nav>`, `<main>`, `<button>`, `<label>`. ARIA sólo cuando
      no exista el elemento correcto
- [ ] **Jerarquía de encabezados sin saltos** (h1 → h2 → h3), un solo `<h1>`
- [ ] `aria-label` **preciso**; lo decorativo va con `aria-hidden`
- [ ] **El estado nunca se comunica sólo con color** — siempre una segunda señal (ícono, texto)
- [ ] **Flex y grid antes que medir con JavaScript**
- [ ] El texto que puede desbordarse tiene truncado o `line-clamp`; los hijos de flex llevan
      `min-w-0` (esa es la causa número uno de textos que rompen el layout)
- [ ] **Imágenes con ancho y alto explícitos** para que no salte la página al cargar

## 3 · Sensación

- [ ] **`prefers-reduced-motion` respetado** en toda animación. Sin excepción
- [ ] **Sólo se animan `transform` y `opacity`** — son las que no obligan al navegador a
      recalcular
- [ ] **Nunca animar `top`, `left`, `width` ni `height`.** Ahí nacen los tirones
- [ ] Las animaciones son **interrumpibles** — si el usuario actúa, la animación cede
- [ ] `color-scheme: dark` en el `<html>` cuando hay tema oscuro
- [ ] Los `<select>` nativos llevan color explícito (si no, en oscuro salen ilegibles)

## 4 · Rendimiento

- [ ] Una acción del usuario responde en **menos de 500 ms** (o muestra que está trabajando)
- [ ] Listas de **más de 50 elementos** virtualizadas
- [ ] La primera pantalla **no depende de JavaScript** para verse
- [ ] Fuentes con `font-display: swap`, y sólo los pesos que se usan
- [ ] Imágenes en formato moderno y del tamaño en que se muestran

## 5 · Realidad — el pase que nadie hace

Con **`agent-browser`**, capturar y mirar en:

- [ ] **Teléfono** — 390×844 (iPhone de Carlos)
- [ ] **Laptop** — 1440×900
- [ ] **Pantalla ancha** — 1920×1080 o más
- [ ] **Horizontal en teléfono**
- [ ] **Tema claro y tema oscuro**
- [ ] **Con el texto al 200%** (mucha gente navega así)

Y revisar en las capturas: ¿algo se encima? ¿algo se sale? ¿hay ríos de espacio vacío en
pantalla ancha? ¿se lee sin acercar?

## 6 · Copy

Las reglas de Vercel también cubren texto, y casi nadie las aplica:

- [ ] **Voz activa** y orientada a la acción ("Guardar cambios", no "Los cambios serán guardados")
- [ ] **Terminología consistente** — si es "equipo" en un lado, no es "grupo" en otro
- [ ] **Los errores se escriben en positivo** y dicen qué hacer, no sólo qué falló
- [ ] Español de México en todo lo que ve el usuario

---

## Cómo se reporta

No entregues una lista de 40 quejas. **Ordena por lo que le duele al usuario:**

1. **Rompe el uso** — no se puede usar con teclado, el botón no se alcanza, el texto no se lee
2. **Rompe la confianza** — se encima, se sale, se ve inacabado
3. **Rompe el pulido** — espaciado disparejo, animación con tirón, jerarquía floja
4. **Nota para después** — deuda que no urge

Y de cada hallazgo: **qué está mal, dónde, y el arreglo concreto.** "Mejorar la accesibilidad"
no es un hallazgo; "el botón de enviar mide 32px de alto, súbelo a 44" sí.

## Trabaja con otras skills

- **`agent-browser`** — la pasada 5 no existe sin ella. Son pareja.
- **`frontend-design`** — esta skill dice qué está mal; esa dice cómo se ve bien.
- **`web-prompts`** — su pase de pulido es un subconjunto de esta cátedra.
- **`four-judges`** — si la revisión destapa un problema de fondo (no de pulido), rostízalo.

## Fuentes

- [Vercel · Web Interface Guidelines](https://vercel.com/design/guidelines) — 100 reglas en 17
  categorías, sobre WCAG y buenas prácticas de rendimiento
- [Reglas en formato agente (MUST / SHOULD / NEVER)](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/refs/heads/main/AGENTS.md)
- [Vercel · Web Interface Guidelines como comando](https://vercel.com/changelog/web-interface-guidelines-now-available-as-an-agent-command)
