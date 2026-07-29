---
name: ui-components
description: Elige y usa la librería de componentes correcta para cada proyecto web — Magic UI, SmoothUI, RetroUI, Unlumen UI o React Bits. Úsala al arrancar cualquier interfaz web (landing, SaaS, dashboard, portafolio, ecommerce), cuando haya que decidir stack visual, cuando pidan animaciones, fondos animados o "que se vea premium", o cuando el proyecto ya use shadcn/ui y haya que extenderlo. Incluye matriz de decisión y cuándo NO usar ninguna.
---

# Librerías de componentes UI

Cinco librerías, cinco personalidades. La habilidad no es conocerlas: es **saber cuál toca**.

## Primero: ¿toca alguna?

Antes de recomendar nada, checa que aplique. **Ninguna de estas cuatro sirve si:**

- El proyecto no es React. Las cuatro son React + Tailwind. Para HTML autónomo — que es la
  entrega favorita de Grupo Mazi — **no aplican**: ahí se escribe a mano con Anime.js
  vendorizada.
- El proyecto ya tiene sistema de diseño propio y meter otro lo va a fracturar.
- Es un prototipo de un día donde instalar y configurar cuesta más que escribir el CSS.

Decirlo es parte del trabajo. Recomendar una librería que no encaja es peor que no recomendar.

## El árbol de decisión

```
¿Es React + Tailwind?
├── NO → ninguna. HTML autónomo + Anime.js (ver CLAUDE.md, regla 2 y 3)
│        Si querían "efecto caro", ve a la skill `scroll-cinema`.
└── SÍ
    ├── ¿Se necesita un FONDO animado espectacular (WebGL, fluidos, prismas)?
    │   └── React Bits — 140+ piezas, la más fuerte en fondos y texto animado
    ├── ¿La marca quiere DESTACAR y romper el molde?
    │   └── RetroUI — neobrutalismo, bordes gruesos, sombras duras, color fuerte
    ├── ¿Es una landing / sitio de marketing que tiene que IMPRESIONAR?
    │   └── Magic UI — 150+ efectos animados, hecho para portadas
    ├── ¿Es una app / SaaS donde el movimiento debe SERVIR, no lucirse?
    │   └── SmoothUI — física de resortes, respeta reduced-motion
    └── ¿Se busca sobriedad premium, tipo Vercel/Linear?
        └── Unlumen UI — detalle intencional, sin gritar
```

## Tabla comparativa

| | **Magic UI** | **SmoothUI** | **RetroUI** | **Unlumen UI** | **React Bits** |
|---|---|---|---|---|---|
| **Filosofía** | para *design engineers* | los cimientos que ya conoces, con el pulido que faltaba | "no todo sitio tiene que verse igual" | el diseño comunica confianza en segundos | la más grande y creativa en animación |
| **Volumen** | 150+ efectos | 50+ componentes | 50+ componentes + 158 bloques | colección enfocada | **140+**, con altas semanales |
| **Animación** | Motion | Motion + GSAP | mínima | Motion | propia, WebGL incluido |
| **Stack** | React · TS · Tailwind · Motion | React 19 · TS · Tailwind v4 · RSC | React · TS · Tailwind v4 · Radix/Base UI | React · Tailwind · Motion | React — **4 variantes**: JS/TS × CSS/Tailwind |
| **Licencia** | abierta | abierta | abierta, "el código es tuyo" | abierta | **MIT + Commons Clause** ⚠️ |
| **Instalación** | copy-paste / shadcn | igual que shadcn | CLI de shadcn | patrones de shadcn | CLI de `shadcn` o `jsrepo`, o copy-paste |
| **Fuerte en** | landings, portafolios | apps reales, accesibilidad | identidad distinta, bloques listos | sobriedad cara | **fondos y texto animado** |

Detalle de cada una en `reference/librerias.md`.

⚠️ **Commons Clause en React Bits:** permite uso personal y comercial, pero **restringe vender
el software en sí**. Para nosotros —que construimos sitios *para* clientes— no estorba. Si algún
día se empaqueta una plantilla para revenderla, ahí sí hay que leer la licencia completa.

## Cómo recomendar bien

1. **Pregunta el tipo de proyecto y el tono** antes de proponer. "Landing de agencia" y
   "dashboard interno" no llevan la misma librería aunque las dos sean React.
2. **Una principal, no cuatro.** Mezclar librerías de animación distintas (Motion + GSAP +
   otra) infla el bundle y pelea entre sí. Se elige una y se complementa con componentes
   sueltos sólo si de verdad falta algo.
3. **Las cuatro son copy-paste, no dependencia.** Siguen el patrón de shadcn: el código queda
   en tu repo y es tuyo. Eso encaja con la regla de Grupo Mazi — *conectar sí, depender no*.
   Dilo como argumento cuando toque.
4. **Accesibilidad no es opcional.** Si la librería no respeta `prefers-reduced-motion`
   (SmoothUI sí lo trae de fábrica), se agrega a mano. Siempre.
5. **RetroUI trae 158 bloques listos** (heroes, pricing, FAQ, auth, footers). Cuando hay prisa
   y el estilo encaja, es el atajo más rápido de los cuatro.

## Combinaciones que sí funcionan

- **shadcn/ui (base) + Magic UI (portada)** — lo estructural sobrio, el hero con efecto. La
  combinación más común y la más segura.
- **shadcn/ui + SmoothUI** — para producto real. Instalación idéntica, cero fricción.
- **RetroUI solo** — no lo mezcles. Su gracia es la coherencia del estilo entero; meterle
  componentes neutros lo desarma.

## Trabaja con otras skills

- **`web-prompts`** — de ahí sale el prompt de arranque del proyecto; esta skill define con qué
  se construye.
- **`four-judges`** — si la decisión de stack es cara o difícil de revertir, rostízala antes.
- **`manus`** — si se va a delegar la construcción, hay que decirle explícitamente qué librería
  usar, o elige la que sea.
