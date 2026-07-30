---
name: find-skill
description: Enrutador de capacidades — decide qué skill(s) usar para la tarea que hay enfrente, en qué orden, y cuándo no usar ninguna. Úsala al empezar cualquier trabajo nuevo, cuando la tarea toca varias áreas a la vez, cuando no está claro con qué empezar, o cuando Carlos pregunte "¿qué sabes hacer?". También detecta huecos: si no hay skill para algo que ya salió tres veces, lo propone.
---

# Encuentra la skill

El índice vivo. **Se consulta al empezar, no cuando ya te atoraste.**

## Cómo se usa

Toma la tarea que tienes enfrente y bájala por esta tabla. Si más de una aplica, se corren en
el orden de la columna de la derecha.

| Lo que hay enfrente | Skill | Orden |
|---|---|---|
| Una idea, una decisión cara, "¿esto vale la pena?" | `four-judges` | **siempre primero** |
| Arrancar un sitio, escribir un briefing | `web-prompts` | tras el veredicto |
| Elegir librería de componentes | `ui-components` | antes de escribir código |
| Que se vea bonito de verdad, tipografía, jerarquía | `frontend-design` | durante |
| Animación por scroll tipo Apple | `scroll-cinema` | durante |
| Librería de animación, movimiento, scroll suave | `web-motion` | durante |
| Video MP4 con código, a volumen | `remotion` | durante |
| Ver la pantalla, probar en navegador, QA visual | `agent-browser` | durante y antes de entregar |
| Revisar una página a fondo antes de entregar | `revision-web` | **siempre al final** |
| Elegir herramienta para la empresa o un cliente | `stack-propio` | al decidir stack |
| Armar equipo de agentes con memoria | `multi-agent` | proyectos grandes |
| Delegar a un agente autónomo externo | `manus` | al repartir trabajo |
| Construir un servidor MCP | `mcp-builder` *(global)* | durante |

## Los flujos que ya están cableados

**Proyecto web nuevo, de cero a entregado:**
```
four-judges → web-prompts (briefing) → ui-components (con qué)
→ frontend-design (que se vea bien) → construir
→ agent-browser (verlo funcionando) → revision-web (la cátedra) → entregar
```

**Sólo una animación:**
```
web-motion (¿cuál técnica?) → scroll-cinema o ui-components → agent-browser (probarla)
```

**Decidir una herramienta para el negocio:**
```
stack-propio (¿hay open source?) → four-judges (¿aguanta el mantenimiento?)
```

**Proyecto grande con varias áreas:**
```
four-judges → multi-agent (quién ejecuta) → manus (qué se delega afuera)
```

## Cuándo NO usar ninguna

Decirlo también es trabajo:

- **Arreglar un bug.** Se reproduce y se arregla. Ninguna skill sustituye leer el código.
- **Cambios de una línea.** Cargar contexto cuesta más que el cambio.
- **Cuando Carlos ya decidió.** Las skills dan criterio, no vetan. Si él ya dijo cómo, se hace.
- **Preguntas directas.** Si pregunta algo, se le contesta. No se le monta un proceso encima.

## Detectar huecos

Cuando una tarea **no encaje en ninguna fila** de arriba, no la fuerces. Anótalo. Si el mismo
tipo de tarea aparece **tres veces sin skill que la cubra**, propón construirla — con nombre,
qué dispararía y qué evitaría repetir.

Los huecos ya detectados y su prioridad están en `.claude/skills/CATALOGO.md`.

**Regla de crecimiento:** una skill nueva sólo cuando duela su ausencia. Ocho que se usan
seguido valen más que cuarenta que se cargaron una vez.

## Qué hacer si dos skills se contradicen

Pasa, y es información. El orden de autoridad:

1. **`CLAUDE.md`** — las reglas de la casa y las decisiones de Carlos ganan siempre.
2. **La skill más específica** — `scroll-cinema` sabe más de fotogramas que `web-motion`.
3. **La más reciente** — si una se actualizó con una fuente nueva, esa manda.

Si aun así hay pleito real, dilo en voz alta en vez de elegir en silencio.
