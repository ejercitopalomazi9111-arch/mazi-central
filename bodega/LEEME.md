# La bodega

**2,945 skills guardadas y dormidas.** Ninguna cuesta nada hasta que se pone a trabajar.

## Por qué están dormidas

Claude Code lee la **descripción** de todo lo que esté en `.claude/skills/` **en cada turno**,
para decidir cuál se dispara. Con 17 skills eso son ~4 KB y no se nota. Con dos mil son cientos
de KB en cada turno: la sesión se ahoga antes de empezar a trabajar, y encima el enrutador
escoge peor porque tiene dos mil descripciones parecidas enfrente.

Por eso:

```
bodega/skills/<nombre>/   ← 2,945. Claude NO las lee. Están dormidas
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

## Licencias

| | |
|---|---|
| MIT | 1,974 |
| Apache-2.0 | 850 |
| otra | 15 |
| **sin licencia** | **64** |

Las 64 sin licencia están marcadas para poder sacarlas de un jalón. Este repo es público:
apoyarse en trabajo de otro sin saber bajo qué términos es el mismo flanco de Torre Infinita.

## Lo que hay que tener presente

**Una skill es un texto que yo obedezco.** Meter 2,945 de desconocidos es, en principio, la vía
más limpia para que alguien me dé órdenes sin pasar por Carlos. Por eso:

- La bodega **no se publica al sitio** — `build.mjs` tiene lista de lo que sube y `bodega` no está.
- Nada se monta solo. Se monta a propósito, una a la vez.
- Antes de apoyarse en una que toque cuentas, llaves o datos de personas, se lee.
- NVIDIA publicó **SkillSpector**, un escáner de seguridad para skills. Está en la bodega y es
  el siguiente paso obvio: pasarle las 2,945 antes de confiar en ninguna.
