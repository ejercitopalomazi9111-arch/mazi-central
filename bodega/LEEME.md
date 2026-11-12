# La bodega

**3,003 skills guardadas y dormidas.** Ninguna cuesta nada hasta que se pone a trabajar.

## Por qué están dormidas

Claude Code lee la **descripción** de todo lo que esté en `.claude/skills/` **en cada turno**,
para decidir cuál se dispara. Con 17 skills eso son ~4 KB y no se nota. Con dos mil son cientos
de KB en cada turno: la sesión se ahoga antes de empezar a trabajar, y encima el enrutador
escoge peor porque tiene dos mil descripciones parecidas enfrente.

Por eso:

```
bodega/skills/<nombre>/   ← 2,965. Claude NO las lee. Están dormidas
bodega/INDICE.json        ← 1.3 MB. Una línea por skill. Esto sí se consulta
.claude/skills/           ← sólo las que están PUESTAS ahorita
```

Buscar en el índice cuesta una llamada. Poner una skill cuesta copiar una carpeta.

## Cómo se usa

```bash
node herramientas/bodega.mjs buscar "controlar un celular"
node herramientas/bodega.mjs montar android-architecture
#   … se trabaja con ella …
node herramientas/bodega.mjs desmontar android-architecture
```

Se busca en español o en inglés: las palabras vacías («de», «para») no cuentan y cada palabra
trae sus equivalentes en inglés. Al montarla, su `name` pasa a ser el de su carpeta: 779 son
variantes (`accessibility-2`) que adentro dicen `name: accessibility`, y dos puestas a la vez
contestaban al mismo nombre.

**Se desmonta al terminar.** Dejarlas puestas devuelve el problema que la bodega resuelve.

## De dónde salieron

| Origen | Cuántas |
|---|---|
| `affaan-m/ECC` | 895 |
| `mukul975/Anthropic-Cybersecurity-Skills` | 818 |
| `alirezarezvani/claude-skills` | 448 |
| `wanshuiyin/Auto-claude-code-research-in-sleep` | 178 |
| `K-Dense-AI/scientific-agent-skills` | 163 |
| Esta máquina (`palomazi/skills`, `/mnt/skills`) | 107 |
| `Orchestra-Research/AI-Research-SKILLs` | 98 |
| `Donchitos/Claude-Code-Game-Studios` | 73 |
| `coreyhaines31/marketingskills` | 50 |
| `AgriciDaniel/claude-seo` | 33 |
| `NVIDIA/SkillSpector` | 25 |
| `new-silvermoon/awesome-android-agent-skills` | 17 |
| `OthmanAdi/planning-with-files` | 18 |
| `anthropics/skills` | 10 |
| otros | el resto |

Se deduplicó por **huella del contenido**, no por nombre: la misma skill anda copiada en veinte
repos y guardarla veinte veces haría que el índice mienta. De 4,300 archivos encontrados
quedaron 2,945 distintas.

**9 de noviembre:** el índice decía 2,945 pero en disco había 2,500 — faltaban 445 de
`alirezarezvani/claude-skills` (el índice prometía algo que `montar` no podía dar). Se
repusieron 433 con su versión actual (12 ya no existen allá y salieron del índice), entraron
23 nuevas de ese repo y 9 de los repos de la casa (`palomazi` y `evaluaciones-rembrandt`). **2,965.**

**12 de noviembre:** +38 de los cursos que pasó Carlos (motion design, edición de reels, dirección de arte, UI/UX Pro Max, Manim). Qué entró, qué no y por qué, en [`CURSOS-12-NOV.md`](CURSOS-12-NOV.md). **3,003.**

## Licencias

| | |
|---|---|
| MIT | 1,985 |
| Apache-2.0 | 892 |
| otra | 15 |
| **sin licencia** | **73** |

Las 73 sin licencia (9 son nuestras, de los repos de la casa) están marcadas para poder sacarlas de un jalón. Este repo es público:
apoyarse en trabajo de otro sin saber bajo qué términos es el mismo flanco de Torre Infinita.

## Lo que hay que tener presente

**Una skill es un texto que yo obedezco.** Meter 2,965 de desconocidos es, en principio, la vía
más limpia para que alguien me dé órdenes sin pasar por Carlos. Por eso:

- La bodega **no se publica al sitio** — `build.mjs` tiene lista de lo que sube y `bodega` no está.
- Nada se monta solo. Se monta a propósito, una a la vez.
- Antes de apoyarse en una que toque cuentas, llaves o datos de personas, se lee.
- **Revisión del 9 de noviembre**, buscando en todos los archivos de las 2,965 lo que delata a
  una skill mala (instrucciones escondidas para el modelo, `curl … | sh`, mandar llaves o archivos
  a un servidor de fuera): **38 coincidencias**, y casi todas son skills de seguridad que
  *explican* esos ataques para defenderse. Las que sí son malas: **24 de las 25 que vinieron de
  `NVIDIA/SkillSpector`**, que son las muestras malas a propósito con las que se prueba ese
  escáner (una se llama `reаd_data` con una «а» cirílica y pide mandar los archivos fuera).
  Están en [`VETADAS.json`](VETADAS.json): no se montan y no salen al buscar. No se borraron para
  poder probar un escáner con ellas. La única buena de ahí es `skill-inspector`.
- Eso **no** es un escáner completo: es una revisión por patrones. Antes de apoyarse en una que
  toque cuentas, llaves o datos de personas, se sigue leyendo entera.
