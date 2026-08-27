# Qué corre en TU máquina

Todo lo de este archivo se corre **en la computadora de Carlos**, no en una sesión remota.
La razón, sin adornarla: una sesión remota vive en un contenedor que se recicla, y lo que se
instale ahí desaparece con él. Lo único que sobrevive es lo que está en el repo.

Nada de aquí es urgente. **Ordenado por lo que de verdad cambia algo**, no por lo que suena
más impresionante.

---

## 1 · El Cerebro al arrancar cada sesión · gratis, 2 minutos

Lo más barato de la lista y lo que más se nota. Hoy el Cerebro hay que acordarse de usarlo;
con esto se anuncia solo.

```bash
node cerebro/cerebro.mjs buscar "lo que sea"     # ya funciona, sin instalar nada
node cerebro/cerebro.mjs revisar                 # que ninguna liga esté rota
```

Para que se cargue solo al abrir sesión, se le agrega un gancho de `SessionStart` en
`.claude/settings.json`. **Eso lo hago yo cuando me digas** — toca configuración del entorno y
prefiero que sea a propósito y no de sorpresa.

---

## 2 · PAL MCP Server · el puente a otros CLIs

Para que Claude Code le pueda hablar a Codex, Gemini o Qwen desde adentro de la conversación.
Apache 2.0.

```bash
git clone https://github.com/BeehiveInnovations/pal-mcp-server.git
cd pal-mcp-server
less run-server.sh          # LEERLO ANTES. Es la regla, no una formalidad
./run-server.sh
```

Pide Python 3.10+ y `uv`, y al menos una llave de proveedor por variable de entorno.
**Ninguna de esas llaves entra al repo.**

Antes de escribir la configuración MCP, abrir el README del repositorio ese día: los nombres de
las herramientas y las banderas cambian, y copiar los de una guía vieja es el defecto
`error-guia-desfasada`.

---

## 3 · Ollama · modelos en tu propia máquina

Lo que mejor sirve a LA REGLA. Página oficial: `ollama.com`.

**Antes de bajar nada, la cuenta de la RAM.** Un modelo cuantizado a 4 bits pide más o menos la
mitad de sus parámetros en gigas; arriba de lo que tengas, sin GPU, no va lento: no va.

No escribo aquí el comando de instalación porque **no lo pude verificar** desde esta sesión, y
copiar uno de memoria es exactamente lo que esta carpeta existe para no hacer. Se abre la página
oficial y se copia de ahí.

---

## 4 · GLM por Z.ai · si quieres probarlo

Las variables confirmadas y la corrección de la guía están en [`MODELOS.md`](MODELOS.md).
Resumen: la base y el timeout de tu guía sí sirven, el nombre del modelo ya no.

---

## Lo que NO instales

- **FreeLLMAPI.** Su propio repositorio dice que no es para producción. Ver [`MATRIZ.md`](MATRIZ.md).
- **claude-mem, por ahora.** Se pisa con el Cerebro y guarda cosas distintas. Si algún día lo
  instalas, respalda `~/.claude-mem/` antes: su instalador toca ganchos y configuración.

---

## Donde me detengo y te toca a ti

Estas cuatro siguen esperándote, y ninguna la puedo hacer yo:

1. **Los dos proyectos de Cloudflare:** `sala` (raíz `sala/servidor`) y `puercos`
   (raíz `juegos/servidor`). Sin eso La Sala sólo corre en local.
2. **Los colores de las cuentas**, cuando quieras fijarlos:
   `wrangler secret put COLORES` → `carlos:#AC27FF,luis:#FF7A18`.
3. **Publicar en la web las páginas de Notion** que quieras que lea (`Compartir → Publicar en
   la web`). Hoy las 16 piden sesión.
4. **Las fechas del debate y la elección**, y el reglamento de la escuela.
