---
name: web-prompts
description: Librería de prompts probados para construir sitios y productos web — landing pages, SaaS, dashboards, ecommerce, portafolios, asistentes de IA para negocios, además de pases de elevación visual, mobile-first, performance, SEO y accesibilidad. Úsala al arrancar cualquier proyecto web, al pedir "que se vea más caro", al pulir antes de entregar, o cuando haya que escribir el briefing de un sitio. Fusiona dos librerías en una sola sin duplicados.
---

# Prompts para construir web

Fusión de dos librerías. Duplicados eliminados, lo mejor de cada una conservado.

## Cómo se usan

**Estos prompts no se pegan tal cual.** Son andamios: cada uno tiene campos entre `[corchetes]`
que hay que rellenar con datos reales del proyecto. Un prompt con placeholders sin llenar
produce un sitio con placeholders sin llenar.

**El orden que funciona:**

```
1. BRIEFING      → arranca el proyecto con contexto completo
2. CONSTRUCCIÓN  → el prompt del tipo de proyecto que toque
3. ELEVACIÓN     → sube la calidad visual un escalón
4. PULIDO        → mobile, performance, accesibilidad
```

Saltarse el paso 1 es la causa número uno de sitios genéricos.

## El catálogo

| Categoría | Archivo | Qué resuelve |
|---|---|---|
| **Landing pages** | `reference/landing.md` | briefing, landing de alta conversión, hero que impacta |
| **Negocio local** | `reference/negocio-local.md` | sitio premium para negocio sin presencia, con chatbot |
| **Asistentes IA / SaaS** | `reference/asistentes-ia.md` | sistemas de captura y conversión de leads, CRM |
| **Elevación visual** | `reference/elevacion.md` | el upgrade de diseño, criterio de senior |
| **Pulido final** | `reference/pulido.md` | mobile-first, performance, accesibilidad, SEO |
| **Setup previo** | `reference/setup.md` | qué instalar para que Claude construya bien |

## Los principios que sacan estos prompts

Más importante que los prompts mismos. Esto es lo que hay que aplicar **siempre**, se use o no
un prompt del catálogo:

1. **Pide el resultado, no la técnica.** "Headline que hable del resultado final" saca mejor
   copy que "escribe un headline".
2. **Nombra la referencia.** *"Que se vea como una agencia de diseño de Nueva York"* le da al
   modelo un objetivo evaluable. "Que se vea bonito" no.
3. **Da la paleta, la tipografía y el tono por adelantado.** Si no los das, el modelo inventa —
   y lo que inventa es el promedio de internet.
4. **Especifica los números.** Botones de mínimo 44px. Espaciado vertical mínimo de 64px en
   móvil. Delay de 0.15s entre elementos escalonados. Los números se cumplen; los adjetivos no.
5. **El copy es parte del diseño.** Pide tono explícito (profesional / cercano / aspiracional) o
   te sale relleno corporativo.
6. **Móvil no es una revisión al final, es una pasada propia.** Por eso hay un prompt sólo para
   eso.
7. **Accesibilidad va en el prompt, no en la esperanza.** `prefers-reduced-motion`, contraste y
   tamaño de toque se piden explícitamente.

## Cuándo NO usar estos prompts

- **Proyectos de Grupo Mazi con HTML autónomo.** Varios de estos prompts asumen React +
  Framer Motion. Para la entrega favorita — un archivo HTML sin build ni CDN — los principios
  aplican pero los prompts hay que traducirlos. **Ojo especial:** varios piden "genera
  ilustraciones/gráficos"; eso choca de frente con la regla de arte real. Se sustituye por
  assets con licencia o capturas reales.
- **Cuando ya hay sistema de diseño.** El prompt de elevación puede fracturar la coherencia
  existente.
- **Los prompts de asistentes de IA** describen productos SaaS completos con Twilio, CRM y
  cobro mensual. Son prompts de *producto*, no de sitio web. No los uses para hacer una landing.

## Aviso honesto sobre las fuentes

Las dos librerías originales venían con **enlaces de referido y promoción de servicios de
terceros** (herramientas de prospección, plataformas de construcción con código de descuento).
Eso se descartó: aquí sólo quedó el contenido útil. Si algún prompt te suena a que empuja una
herramienta específica, es residuo de eso — ignóralo y quédate con la estructura.

## Trabaja con otras skills

- **`ui-components`** — el prompt dice *qué* construir; esa skill decide *con qué*.
- **`four-judges`** — antes de construir un producto completo (no una landing), rostízalo.
- **`multi-agent`** — un Director de Marketing usa esta skill como su caja de herramientas.
- **`manus`** — si se delega la construcción, el briefing de aquí es lo que se le manda.
