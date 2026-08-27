# La matriz de fuentes · verificado el 27 de agosto de 2026

Carlos trajo un prompt maestro con ~40 fuentes y la instrucción de **no inventar**: abrir cada
una, verificar contra la documentación oficial actual, y decir cuáles no se pudieron abrir.
Esto es el resultado.

> **Cómo leer la columna del veredicto.** «Sí» quiere decir *vale la pena y es compatible*, no
> *ya está instalado*. Esta sesión corre en un contenedor que se recicla: lo que se instale aquí
> desaparece. Lo que se instala de verdad va en la máquina de Carlos, y eso está en
> [`INSTALAR.md`](INSTALAR.md).

---

## Lo que se verificó y sirve

| Fuente | Qué hace | Depende de | Veredicto | Motivo |
|---|---|---|---|---|
| **PAL MCP Server**<br>`BeehiveInnovations/pal-mcp-server` | Servidor MCP que deja a Claude Code hablarle a otros CLIs (`clink`) y pedir `consensus`, `planner`, `codereview`, `debug` | Python 3.10+, `uv`, llave de al menos un proveedor | **Sí, en su máquina** | Es el puente que faltaba, y **no compite con La Sala: la alimenta.** Apache 2.0 |
| **Ollama** | Modelos corriendo en la propia máquina | RAM y, para modelos grandes, GPU | **Sí, en su máquina** | Lo que mejor sirve a LA REGLA: lo que no sale de la casa no se filtra ni sube de precio |
| **OpenCode**<br>`anomalyco/opencode` | Agente de programación de terminal, MIT | Node o el instalador propio | **Sí, opcional** | Convive con Claude Code y sirve de segundo constructor de otra casa. **No urge:** no cubre nada que hoy duela |
| **claude-mem**<br>`thedotmack/claude-mem` | Memoria persistente entre sesiones vía hooks + MCP, con SQLite y búsqueda | Node 20+, Bun y `uv` (se auto-instalan) | **Revisar antes**, no instalar hoy | Apache 2.0 y bien hecho, pero **ya tenemos el Cerebro** y se pisan. Ver abajo |
| **Z.ai / GLM** | Endpoint compatible con Anthropic para usar GLM desde Claude Code | Llave de Z.ai | **Sí, con corrección** | La guía nació desfasada. Detalles en [`MODELOS.md`](MODELOS.md) |
| **skills.sh** | Directorio de skills instalables con un comando; de Vercel Labs, **no de Anthropic** | `npx` | **Sí, como catálogo** | Sirve para mirar qué existe. Instalar de ahí es meter criterio de otro al repo: se lee primero |
| **OpenJarvis**<br>`open-jarvis/OpenJarvis` | Asistente local con voz; de Stanford (Hazy Research / Scaling Intelligence Lab), Apache 2.0 | `uv`, Node 20+, Ollama | **Sí, pero después** | Es real y es serio. No resuelve ningún agujero de los tres de la empresa — es para cuando haya aire |
| **franpradas · ahorrar uso en Claude** | Diez técnicas de ahorro de uso | — | **Sí, ya aplicadas** | Nada de evadir límites: es trabajar con las funciones normales. Varias ya están en `sala/EFICIENCIA.md` |
| **Vividsites** | Biblioteca de prompts y plantillas de sitios «cinematográficos», con MCP | Suscripción para lo premium | **Como referencia** | Sirve para mirar. Comprar plantillas contradice lo único que vendemos |
| **AiLendra · The Hub Lite** | Recursos y prompts de IA generativa; parte libre, parte de pago | Cuenta para lo premium | **Como referencia** | La parte libre tiene material aprovechable de prompts de video |

---

## Lo que se verificó y NO entra

| Fuente | Por qué no |
|---|---|
| **FreeLLMAPI**<br>`tashfeenahmed/freellmapi` | Junta las capas gratuitas de 34 proveedores bajo un endpoint. **Su propio repositorio dice que es para experimentar y aprender, no para producción**, y que la relación con cada proveedor la gobiernan los términos que aceptó el usuario. Meter la operación de la empresa ahí es apoyarla en algo que puede apagarse de un día para otro, y encima concentra llaves de muchos servicios en un solo lugar |
| **system-prompts-and-models-of-ai-tools** | Recopila system prompts de herramientas comerciales. **Como referencia técnica está bien y no se copia nada al repo.** Es GPL-3.0, así que pegar texto de ahí a nuestro código nos arrastraría a esa licencia — y de todos modos un prompt de hace meses ya no describe la herramienta de hoy |

---

## Lo que NO se pudo abrir · sin inventar nada

**Las 16 páginas de Notion** que trae el prompt maestro piden autenticación. Se probó una a
mano (`Setup-Guide-Claude-Design`) y la respuesta fue explícita: redirige y pide sesión. Las
demás son del mismo espacio y del mismo tipo, así que la conclusión es la misma:

| Fuente | Qué pasó |
|---|---|
| Setup Guide · Claude Design | pide sesión de Notion |
| The Autopilot Video Stack · Claude Code + Arcads | pide sesión |
| 100 Secret Claude Commands | pide sesión |
| 100 Secret ChatGPT Codes | pide sesión |
| Adobe x Claude Setup Guide | pide sesión |
| Setup Guide · Claude Chrome Extension | pide sesión |
| Claude Code + Ollama Setup Guide | pide sesión |
| Setup Guide · RuFlo 60-Agent Claude Swarm | pide sesión |
| Arcads AI Clone Setup Guide | pide sesión |
| Reasoning Model Test Guide | pide sesión |
| Claude Finance Agents Guide | pide sesión |
| Claude Setup Guide | pide sesión |
| Thumb Magic Workflow Guide | pide sesión |
| Miro Fish Setup Guide | pide sesión |
| Founder OS | pide sesión |
| My 10 Favorite AI Prompts | pide sesión |
| Setup Guide · Claude Code OpenClaw Replacement | pide sesión |

**Cómo desbloquearlas, si le interesa alguna:** en Notion, `Compartir → Publicar en la web`.
Con eso quedan legibles sin cuenta y las puedo leer. O manda la captura, que para él es más
rápido y vale igual.

**También quedó fuera:** el archivo de Google Drive (`1g9cELuNSspYJs…`) pide permiso. El Google
**Doc** sí abrió — es la guía de GLM 5.2, y de ahí salió la corrección de [`MODELOS.md`](MODELOS.md).

**Kimi Work** no traía enlace, sólo la mención de una guía. Sin fuente que abrir, no se dice nada
de él.

---

## La decisión que hay que tomar: claude-mem contra el Cerebro

Es el único choque real de toda la lista, y no se resuelve solo.

|  | **El Cerebro** (nuestro) | **claude-mem** (de afuera) |
|---|---|---|
| Qué guarda | Neuronas escritas a mano: errores con su causa y su arreglo, piezas del proyecto, decisiones con su porqué | Todo lo que hace el agente, comprimido por IA |
| Cómo se recupera | Búsqueda por señales en lenguaje de persona, más un grafo con comunidades | Búsqueda semántica híbrida (SQLite + Chroma) |
| Quién lo llena | Yo, a propósito, cuando algo costó | Solo, en automático |
| Dónde vive | En el repo. Llega a toda máquina y todo modelo que lo lea | En `~/.claude-mem/` de una máquina |
| Corre en | Cualquier lado. Es JSON y un `.mjs` | Node 20+, Bun, `uv` |

**Lo que yo haría:** quedarnos con el Cerebro y **no** instalar claude-mem todavía. La razón no
es orgullo de casa: es que **guardan cosas distintas**. El Cerebro guarda lo que costó y por
qué, curado; claude-mem guarda todo y lo comprime. Lo primero es lo que hace barato explicarle
el proyecto a otro modelo; lo segundo es lo que hace que no se te olvide qué hiciste el martes.

**Lo que sí vale la pena robarle:** el gancho de `SessionStart`, para que el Cerebro se cargue
solo al abrir sesión en vez de tener que acordarse. Eso es un archivo de configuración, no una
dependencia.

**Y una advertencia honesta:** si algún día se instala, hay que respaldar `~/.claude-mem/`
antes de tocarlo. Su instalador toca configuración y hooks del entorno.

---

## Lo que aprendí verificando, y ya es neurona

- **Una guía es una foto, no el estado de las cosas.** La de GLM pedía un modelo que ya tenía
  sucesor documentado. Pero la base y el timeout sí estaban bien: por eso se verifica **campo
  por campo** y no de bulto. → `error-guia-desfasada`
- **Instalar en un contenedor que se recicla es teatro.** Lo que tiene que existir mañana va al
  repo. → `error-instalar-en-lo-que-se-recicla`
- **Un `curl … | bash` se descarga y se lee antes de correrlo.** Si no se puede leer, eso ya es
  la respuesta. → `error-curl-a-ciegas`
