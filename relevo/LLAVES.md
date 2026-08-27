# Dónde viven las llaves

**En tu máquina, no en el repo.** No es formalidad: este repositorio es **público y con escaneo
de secretos**. Una llave commiteada la detecta GitHub, le avisa al proveedor, y **el proveedor la
revoca solo en minutos**. No es que esté mal ponerla — es que *no funciona*.

## Cómo se ponen

Un archivo fuera del repo, sólo tuyo:

```bash
mkdir -p ~/.mazi && chmod 700 ~/.mazi
nano ~/.mazi/llaves.env
```

Adentro, una línea por proveedor:

```bash
export GROQ_API_KEY="…"
export CEREBRAS_API_KEY="…"
export GEMINI_API_KEY="…"
export OPENROUTER_API_KEY="…"
export MOONSHOT_API_KEY="…"     # opcional
export ZAI_API_KEY="…"          # opcional, de pago
```

Y que sólo tú lo leas:

```bash
chmod 600 ~/.mazi/llaves.env
```

## Cómo se usan

Para una vez:

```bash
set -a; . ~/.mazi/llaves.env; set +a
node herramientas/relevo.mjs probar
```

Para siempre — al final de `~/.zshrc` o `~/.bashrc`:

```bash
[ -f ~/.mazi/llaves.env ] && . ~/.mazi/llaves.env
```

## Si una se quema

Pasa: se pega en un chat, se sube sin querer, se comparte una captura. **No es grave si se
atiende rápido** — se borra en la consola del proveedor y se crea otra. Toma dos minutos y no
hay que tocar nada del repo, porque el repo nunca la tuvo.
