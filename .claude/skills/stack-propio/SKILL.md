---
name: stack-propio
description: Catálogo de herramientas open source auto-hospedables que reemplazan servicios de pago — analítica, documentos, diseño, automatización, agenda, contraseñas, modelos de IA locales, transcripción y descarga de medios. Úsala cuando haya que elegir herramienta para la empresa o para un cliente, cuando alguien proponga una suscripción, o cuando toque cumplir la regla de "todo lo que la empresa use lo construimos o lo hospedamos nosotros".
---

# El stack propio

Herramientas open source que se hospedan uno mismo. **Esta skill existe para servir a la regla
de la casa** (`CLAUDE.md` §2): *conectar sí, depender no.*

## Cómo se usa esta skill

Cuando aparezca la necesidad de una herramienta, el orden de preguntas es:

1. **¿La construimos nosotros?** Si es el corazón del negocio (Panel Mazi, cotizador,
   portal del cliente), sí. Se construye.
2. **¿Hay una open source auto-hospedable?** Si es infraestructura genérica —analítica,
   agenda, contraseñas— no tiene sentido reinventarla. Se toma de esta lista.
3. **¿Sólo existe de pago y cerrada?** Se usa **detrás de un adaptador nuestro**, y se anota
   como deuda a cambiar.

Nunca al revés. La suscripción es la última opción, no la primera.

## El catálogo

| # | Herramienta | Reemplaza a | Para qué nos sirve |
|---|---|---|---|
| 1 | **Plausible Analytics** | Google Analytics | **Fase 6 del plan.** Analítica sin cookies, enfocada en privacidad. Más simple y más barata. |
| 2 | **AppFlowy** | Notion | Documentos, wikis y tableros de proyecto. Base para la documentación interna. |
| 3 | **Penpot** | Figma | Diseño y prototipado. Alternativa real, no un juguete. |
| 4 | **n8n** | Zapier | Automatización con 400+ integraciones y nodos de IA. *"Ideal si Zapier ya te sale caro."* |
| 5 | **Cal.com** | Calendly | Agenda de reuniones y reservas. Directo al **portal del cliente** (Fase 4). |
| 6 | **Bitwarden** | 1Password / LastPass | Gestor de contraseñas, auditado, con plan gratis. Para las llaves del negocio y de clientes. |
| 7 | **Ollama** | APIs de LLM de pago | Modelos open-weight corriendo local. Privado, offline, sin factura por token. |
| 8 | **Whisper** | servicios de transcripción | Voz a texto en decenas de idiomas, local y gratis. |
| 9 | **yt-dlp** | descargadores de pago | Video y audio de 1,000+ sitios. Hace el trabajo base por $0. |
| 10 | **Fooocus** | Midjourney y similares | Imágenes locales con Stable Diffusion XL. **Ver la advertencia de abajo.** |

Detalle de cada una, con criterio de cuándo sí y cuándo no, en `reference/catalogo.md`.

## Las que ya encajan en el plan, hoy

Tres tienen lugar reservado en el roadmap de Grupo Mazi:

- **Plausible → Fase 6 (medición propia).** El plan ya dice "contador de visitas nuestro en vez
  de Google Analytics". Plausible es exactamente eso, ya hecho y auditable.
- **Cal.com → Fase 4 (portal del cliente).** Agendar juntas sin mandar al cliente a Calendly.
- **n8n → Fase 2 y 5.** Pega el Panel Mazi con WhatsApp, correo y redes sin construir cada
  integración a mano.

## Fooocus y la regla del arte

Genera imágenes con IA localmente. La regla de la casa (`CLAUDE.md` §3.1) es que **el arte por
defecto es real, no inventado** — pero con una excepción explícita de Carlos: *si él pide una
pieza generada, se genera.*

Cómo se aplica aquí:

- **Relleno y ambiente** (texturas, fondos, sprites, ilustración de escena) → **arte real con
  licencia**. Met, Wikimedia Commons, OpenGameArt, Kenney, packs libres de itch.io, bajados al
  repo con crédito. Fooocus **no**.
- **Pieza única que Carlos pide** (un logo, un ícono, una identidad) → **sí se genera**.
  Pedirle una imagen de Wikipedia a alguien que quiere su logo es absurdo.
- **Maquetas internas** para decidir composición antes de buscar el asset real → sí, y se tiran.

El criterio: *¿existe ya y sólo hay que encontrarlo?* → se busca. *¿Tiene que ser único y de
él?* → se crea. Si dudo, pregunto.

## Lo que auto-hospedar cuesta de verdad

Nadie lo dice en los carruseles de Instagram, así que va aquí:

- **Un servidor.** Casi todas necesitan uno corriendo. Eso son entre $5 y $20 USD al mes, más el
  tiempo de mantenerlo.
- **Actualizaciones.** Un servicio de pago se parcha solo. El tuyo lo parchas tú, y si no lo
  haces, te lo hackean.
- **Respaldos.** Si se muere el disco y no había respaldo, se murió el negocio.
- **Tiempo, que es el recurso más caro que tenemos.**

**La honestidad:** auto-hospedar **no siempre es más barato**. Es más *libre*. Sale a cuenta
cuando el servicio de pago escala con el uso —y te empieza a cobrar por crecer— o cuando los
datos no pueden salir de nuestras manos.

**Empieza por lo gratis y sin servidor.** Bitwarden tiene plan gratis en la nube; Plausible
tiene versión hospedada barata; Ollama, Whisper y yt-dlp corren en tu propia computadora sin
servidor ninguno. Auto-hospedar lo pesado viene después, cuando el negocio lo aguante.

## Trabaja con otras skills

- **`four-judges`** — antes de montar un servidor para auto-hospedar algo, rostízalo: ¿cuánto
  cuesta mantenerlo contra lo que ahorra?
- **`multi-agent`** — Ollama permite correr agentes locales sin factura por token.
- **`ui-components`** — Penpot para diseñar antes de construir.
- **`manus`** — Ollama es la alternativa local cuando delegar afuera no es opción por privacidad.

## Fuente

Recopilación de repos públicos de GitHub. **Verifica licencia y estado del proyecto antes de
comprometer al negocio con cualquiera** — el open source cambia de licencia y a veces se
abandona, y eso es justo lo que no se puede descubrir en producción.
