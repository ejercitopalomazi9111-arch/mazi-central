# Las cuatro librerías, a detalle

Consultado julio 2026. Si algo no cuadra con lo que ves en el sitio, gana el sitio y se
actualiza **sólo esta sección**, no la skill entera.

---

## Magic UI · magicui.design

**Se describe como:** librería de UI *para design engineers* — desarrolladores a quienes les
importa la calidad del diseño.

- **150+ componentes y efectos animados**, gratis y de código abierto
- **Stack:** React · TypeScript · Tailwind CSS · Motion
- **Se vende como el compañero perfecto de shadcn/ui**

**Para qué es buena**
- Landing pages — es su caso de uso estrella
- Proyectos donde el diseño es el argumento
- Startups y portafolios que necesitan impresionar rápido

**Cuándo no**
- Apps internas o dashboards: 150 efectos animados es exactamente lo que no necesita una
  herramienta de trabajo diario.

---

## SmoothUI · smoothui.dev

**Se describe como:** *"los cimientos que ya conoces, con el pulido que llevabas queriendo."*

- **50+ componentes React** animados con Motion y GSAP
- **Stack:** React 19 · TypeScript · Server Components · Tailwind CSS v4
- **Compatible con shadcn/ui**, misma forma de instalar
- **Consciente de `prefers-reduced-motion`** de fábrica ← esto lo distingue
- Acceso programático a su API, pensado para desarrollo asistido por IA

**Componentes con nombre propio:** Dynamic Island · Number Flow · Siri Orb · Animated Tabs ·
Phototab · Social Selector · User Account Avatar · Scrollable Card Stack · Power Off Slide ·
Animated Tags · Image Metadata Preview · Grid Loader · Wave Text · Apple Invites

**Para qué es buena**
- Producto real, no escaparate: donde el movimiento tiene que *servir*
- Proyectos que ya usan shadcn/ui — se mete sin fricción
- Equipos que sí se toman en serio la accesibilidad

**Cuándo no**
- Si el proyecto no es React 19 / Tailwind v4, vas a pelear con versiones.

---

## RetroUI · retroui.dev

**Se describe como:** *"no todo sitio web tiene que verse igual."* Sistema de diseño
neobrutalista — bordes gruesos, sombras duras, color a gritos.

- **50+ componentes** + **158 bloques listos** (heroes, pricing, feature grids, pantallas de
  autenticación, FAQs, footers, interfaces de IA)
- **Stack:** React · TypeScript · Tailwind CSS v4 · Radix UI o Base UI por debajo
- Instalación con el CLI de shadcn, o copy-paste
- **Extras:** kit de Figma, servidor MCP, listo para RTL, modo oscuro
- Su bandera: **"el código es tuyo"**

**Categorías:** interactivos (Button, Switch, Checkbox, Dialog, Accordion, Tabs) · datos
(Avatar, Badge, Breadcrumb, Card, Calendar) · retroalimentación (Alert)

**Para qué es buena**
- Cuando la marca necesita **no parecerse a nadie**
- Landings, sitios de agencia creativa, herramientas de desarrollador, open source
- Cuando hay prisa: 158 bloques listos es el atajo más rápido de las cuatro

**Cuándo no**
- Clientes conservadores (banca, salud, corporativo serio). El neobrutalismo es una postura, y
  no todos la quieren.
- No lo mezcles con componentes neutros: su gracia es la coherencia del estilo completo.

---

## Unlumen UI · ui.unlumen.com

**Se describe como:** *"una colección de componentes reutilizables que copias y pegas en tus
apps."* Interfaces pulidas y animadas con detalle intencional.

- **Stack:** Tailwind CSS + Motion
- Sigue los patrones de shadcn/ui; evolucionó del proyecto *animate UI*

**La filosofía, que es lo más útil de esta librería:** su autor (Léo) parte de que el diseño
comunica confianza y cuidado **en segundos**. En vez de encabezar con funcionalidades, prioriza
la reacción emocional inmediata del usuario: *¿esto se ve legítimo? ¿se ve hecho con
intención?* La referencia declarada es Vercel — animaciones, color y tipografía coherentes
construyendo una experiencia que vale la pena.

**Para qué es buena**
- Sobriedad cara. Cuando quieres que se vea premium **sin gritar**
- Productos tipo Vercel / Linear

**Cuándo no**
- Si necesitas volumen de componentes ya resueltos, las otras tres traen más.

**Nota:** la documentación vive detrás de un redirect a `unlumen-ui-docs.vercel.app`. Si un
enlace directo falla, entra por `ui.unlumen.com` y navega.

---

## React Bits · reactbits.dev · `github.com/DavidHDev/react-bits`

**Se describe como:** *"la librería más grande y creativa de componentes React animados."*

- **140+ componentes** gratuitos y personalizables, con altas semanales
- **Cuatro variantes de cada componente:** JS+CSS · JS+Tailwind · TS+CSS · TS+Tailwind
- **Licencia MIT + Commons Clause** — uso personal y comercial permitido
- Instalación por CLI (`shadcn` o `jsrepo`) o copy-paste
- Presume dependencias mínimas y código *tree-shakeable*

**Cuatro categorías:** animaciones de texto · animaciones generales · componentes de UI ·
**fondos animados**

**Lo que la distingue: los fondos.** Es donde ninguna de las otras cuatro compite. Piezas con
nombre propio: *Liquid Ether* (fluido que reacciona al cursor, con parámetros de viscosidad,
fuerza del mouse y resolución), *Ferrofluid*, *Lightfall*, *Prism*, *Dark Veil*, *Silk*,
*Floating Lines*, *Light Pillar*.

También trae componentes de interacción poco comunes: *Gooey Nav*, *Pixel Card*, *Spotlight
Card*, *Border Glow*, *Flying Posters*, *Card Swap*, *Glass Icons*, *Decay Card*, *Flowing
Menu*, *Elastic Slider*, *Counter*, *Infinite Menu*, *Stepper*, *Bounce Cards*.

**Para qué es buena**
- Portadas que tienen que impresionar en los primeros dos segundos
- Cuando el cliente pide "algo con movimiento" y no sabe describir qué
- Texto animado — es la más completa de las cinco en eso

**Cuándo no**
- **Los fondos WebGL cuestan batería y GPU.** En un teléfono de gama baja —que es medio mercado
  de Grupo Mazi— un fluido interactivo a pantalla completa se siente pesado. Probar en el
  dispositivo real, no en la laptop.
- Si el sitio es de lectura o de conversión, un fondo que se mueve compite con el contenido.
- ⚠️ **Commons Clause:** permite construir sitios para clientes, pero restringe **vender el
  software en sí**. Si algún día se empaqueta una plantilla para revenderla, hay que leer la
  licencia completa antes.

**Con qué se compara:** para el mismo efecto de "se ve caro", la alternativa sin React es
`scroll-cinema` (fotogramas por scroll). React Bits pesa menos y es interactivo; `scroll-cinema`
funciona sin framework y muestra un objeto real. Distinta herramienta, mismo objetivo.

---

## Lo que las cinco tienen en común

1. **React.** Ninguna sirve para HTML autónomo. (React Bits ofrece variante con CSS plano en vez
   de Tailwind, pero React sigue siendo obligatorio.)
2. **Copy-paste, patrón shadcn.** El código queda en tu repo. No hay dependencia que te pueda
   dejar tirado — encaja con la regla de Grupo Mazi.
3. **Motion** es el denominador común de la animación (SmoothUI le suma GSAP; React Bits mete
   WebGL para los fondos).
4. Todas presumen ser compatibles o complementarias de shadcn/ui, así que **shadcn como base +
   una de estas encima** es el camino de menor resistencia.

## Qué combinar con qué

- **shadcn (base) + Magic UI (portada)** — lo estructural sobrio, el hero con efecto. La más
  común y la más segura.
- **shadcn + SmoothUI** — producto real. Instalación idéntica, cero fricción.
- **shadcn + React Bits (sólo el fondo)** — un fondo animado y el resto neutro. Funciona bien
  **si es un solo fondo**; meter cinco piezas WebGL en una página la mata.
- **RetroUI solo** — no lo mezcles. Su gracia es la coherencia del estilo entero.
- **Nunca dos librerías de animación distintas.** Motion + GSAP + WebGL en el mismo bundle es
  peso triplicado y peleas entre sí. Se elige una y se complementa con piezas sueltas.
