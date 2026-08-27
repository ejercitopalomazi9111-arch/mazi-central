# Modelos y endpoints · verificado el 27 de agosto de 2026

Todo lo de aquí se comprobó contra la documentación oficial del proveedor, no contra la guía
que lo mencionaba. **Donde la guía y la documentación no coincidieron, se anota la diferencia**
en vez de escoger callado.

---

## GLM · Z.ai — la guía nació desfasada

La guía que trajo Carlos (el Google Doc) manda escribir esto en la configuración de Claude Code:

```
ANTHROPIC_DEFAULT_SONNET_MODEL="glm-5.2[1m]"
ANTHROPIC_DEFAULT_OPUS_MODEL="glm-5.2[1m]"
```

**La documentación oficial de Z.ai para Claude Code hoy documenta `glm-5.3` y `glm-5.3-flash`.**

Qué sí y qué no, campo por campo — que es como hay que revisarlas, porque **no todo lo de una
guía desfasada es falso** y descartarla entera pierde lo que sí servía:

| Lo que dice la guía | Estado | Nota |
|---|---|---|
| `ANTHROPIC_BASE_URL="https://api.z.ai/api/anthropic"` | ✅ confirmado | Es el endpoint compatible con Anthropic |
| `API_TIMEOUT_MS="3000000"` | ✅ confirmado | Aparece igual en la documentación oficial |
| `ANTHROPIC_AUTH_TOKEN="<llave de Z.ai>"` | ✅ confirmado | **Va en variable de entorno. Nunca en el repo** |
| `glm-5.2[1m]` como modelo por defecto | ⚠️ **desfasado** | Hoy la documentación pone `glm-5.3` / `glm-5.3-flash` |
| `OPENAI_BASE_URL="https://api.z.ai/api/coding/paas/v4"` | ⚠️ **no confirmado** | La página general del API documenta `https://api.z.ai/api/paas/v4/`. La ruta con `/coding/` es la del Coding Plan y no la pude ver en la documentación pública |
| «753B parámetros, 1M de contexto, licencia MIT» | ⚠️ **no verificado directamente** | GLM-5.2 sí existe y salió en junio de 2026 con contexto de 1M reportado. Las cifras exactas no las confirmé en documentación oficial, así que no las escribo como hechos |
| «10 veces más barato que Claude Code» | ❌ **no se cita** | Los precios se mueven. Cotizar por una cifra de una guía es como se pierde dinero |

**Cómo se pone, si lo quiere probar.** En su máquina, no en el repo:

```bash
export ANTHROPIC_BASE_URL="https://api.z.ai/api/anthropic"
export ANTHROPIC_AUTH_TOKEN="…"          # la llave de Z.ai, NUNCA en un archivo del repo
export API_TIMEOUT_MS="3000000"
```

Y antes de fijar el nombre del modelo, abrir `docs.z.ai` y copiar el que esté documentado ese
día. **Que ya nos haya pasado una vez es la razón de este párrafo.**

---

## Ollama · modelos en su propia máquina

Es el que mejor sirve a LA REGLA: lo que no sale de la casa no se filtra, no sube de precio y
no lo apaga nadie.

**Antes de bajar nada, la cuenta de la RAM.** La regla de dedo es que un modelo cuantizado a
4 bits pide más o menos **la mitad de su número de parámetros en gigas** —un 7B ronda 4-5 GB,
un 13B ronda 8-9— y arriba de eso, sin GPU, no es que vaya lento: es inservible. La cifra exacta
la dice la ficha de cada modelo, y ahí es donde hay que mirar.

**Para qué sí:** clasificar, extraer, resumir a volumen, y cualquier cosa con datos que no
deben salir. **Para qué no:** razonar sobre código difícil. Un modelo local no sustituye a uno
grande, y confundir eso lleva a culpar al proyecto de lo que es un límite del modelo.

> No pude leer la página de instalación de Ollama desde esta sesión —la portada de la
> documentación remite a un `quickstart` que no me devolvió contenido—, así que **no escribo
> aquí comandos de instalación que no verifiqué**. Van en [`INSTALAR.md`](INSTALAR.md) como paso
> que él corre mirando la página oficial.

---

## Cómo se escoge modelo para cada papel

El detalle del criterio está en la skill [`delegar`](../.claude/skills/delegar/SKILL.md). El
resumen:

| Papel | Qué se busca |
|---|---|
| Constructor | Que siga instrucciones largas y use herramientas bien |
| **Revisor** | **De otra casa que el constructor.** Es el requisito, no una preferencia |
| Lector de bultos | Ventana de contexto grande de verdad |
| Barato y privado | Que corra en su máquina |

**Los modelos cambian más rápido que esta tabla.** Lo que no cambia es la columna de la derecha:
por eso está escrita en criterios y no en nombres.

---

## Los nombres de modelo NO se memorizan

Cada vez que haya que escribir un nombre de modelo en configuración real, se abre la
documentación del proveedor ese día. Un nombre de modelo tiene la vida útil de una fruta, y
escribir el de una guía de hace meses es el defecto `error-guia-desfasada` del Cerebro, que
está ahí justamente porque ya nos pasó.
