# Setup previo — qué instalar antes de construir

Los prompts rinden mucho más si el entorno está preparado. Tres piezas, unos 5 minutos.

---

## 1 · Claude Code

Dos caminos:

**Con terminal**
```bash
# Mac / Linux
curl -fsSL https://claude.ai/install.sh | bash

# Windows (PowerShell)
irm https://claude.ai/install.ps1 | iex
```
No requiere instalar Node.js por separado; el instalador configura todo.

**Sin terminal:** descarga la app de escritorio desde `claude.ai/download`. Claude Code viene
integrado como pestaña.

---

## 2 · Librería de animación

```bash
pnpm add motion
```

Motion (antes Framer Motion) es el estándar del ecosistema React para transiciones, efectos de
scroll y microinteracciones. Es también el denominador común de las cuatro librerías de la
skill `ui-components`.

**Excepción de Grupo Mazi:** para la entrega favorita — un archivo HTML autónomo, sin build ni
CDN — no se usa Motion sino **Anime.js vendorizada en el repo**. Ver `CLAUDE.md`, regla 3.

---

## 3 · Criterio de diseño inyectado

El paso que casi todos omiten, y el que más levanta la calidad. En vez de esperar a que el
modelo tenga buen gusto por accidente, se le dan criterios explícitos de tipografía, jerarquía
visual, espaciado, color y composición que consulta **cada vez** que toca algo visual.

Existen skills públicas que hacen esto (por ejemplo `ui-ux-pro-max-skill` de nextlevelbuilder
en GitHub). **Antes de instalar cualquiera de fuera, léela completa** — una skill se ejecuta
con tus permisos y hereda tu contexto.

**La ruta que encaja con la regla de Grupo Mazi** — *conectar sí, depender no* — es tener el
criterio en una skill **nuestra**, no de un tercero. Es exactamente el mismo movimiento que
esta carpeta de skills.

---

## Cómo se nota que el setup está completo

- Diseño con intención: jerarquía visual, espaciado consistente, paletas coherentes
- Animación con propósito: movimiento que guía al usuario, no que lo distrae
- Componentes reutilizables: navbars, heroes, cards, footers con consistencia
- Responsive por defecto, sin tener que pedirlo cada vez

Si tienes que pedir "hazlo responsive" en cada componente, el setup está incompleto.
