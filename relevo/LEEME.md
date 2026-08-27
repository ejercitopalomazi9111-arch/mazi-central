# El relevo

**Que el trabajo no se pare cuando se acabe el uso.**

Es una carrera de relevos: el primero de la fila que conteste, trabaja. Cuando se topa con su
límite se le apunta **la hora a la que vuelve** y le toca al siguiente. Nadie espera a un
corredor que no va a volver hoy.

```bash
node herramientas/relevo.mjs probar          # ¿a quién le sirve la llave hoy?
node herramientas/relevo.mjs quien           # ¿a quién le toca ahorita?
node herramientas/relevo.mjs preguntar "…"   # que conteste el que pueda
```

## La fila, y por qué está en ese orden

| # | Quién | Por qué ahí |
|---|---|---|
| 1 | **Ollama**, en tu máquina | No cuesta, no se topa y no sale de la casa. Si está apagado, se salta en un segundo |
| 2 | **Groq** | El más rápido de los gratuitos |
| 3 | **Cerebras** | Otra capa gratuita, con topes **distintos** a los de Groq — que es justo el punto de tener dos |
| 4 | **Gemini** | Ventana grande. El que sirve cuando hay un bulto que a los otros no les cabe |
| 5 | **GLM · Z.ai** | De pago pero barato. Después de los gratuitos: primero se gasta lo que no cuesta |
| 6 | **OpenRouter** | El comodín. Junta muchos proveedores, así que es el mejor último recurso |

El orden se cambia moviendo renglones en [`modelos.json`](modelos.json). No hay nada de esto
metido en el código.

## Lo más importante del diseño

**Distinguir «se acabó el uso» de «la llave está mal».** Son la misma cara para el que no mira:
las dos fallan y las dos te sacan de la fila.

Pero si una llave con un dedazo se marcara como *agotada hasta mañana*, el relevo la escondería
en silencio — siempre hay otro corredor — y tú te quedarías creyendo que se te acabó el saldo
cuando lo que pasó es que sobró un espacio al copiar. **Por eso las llaves malas gritan y no se
marcan.** El trabajo sale adelante igual, pero con el aviso a la vista.

| Lo que devuelve el proveedor | Qué significa | Qué hace el relevo |
|---|---|---|
| `429` | se acabó el uso de esta ventana | lo saca hasta la hora que él mismo diga |
| `402` | se acabó el crédito | lo saca 24 h |
| `403` **con** palabras de cuota | se acabó el uso | lo saca 12 h |
| `403` / `401` pelón | **la llave está mal** | **grita y NO lo marca** |
| `404` / modelo raro | el modelo ya no existe | avisa que revises `modelos.json` |
| `5xx` o sin conexión | mal rato del proveedor | lo saca 2 minutos |

## Las llaves

**Ninguna vive en el repo, que es público.** Cada proveedor dice cómo se llama su variable en
`modelos.json`. Ponlas en tu máquina y ya:

```bash
export GROQ_API_KEY="…"
export CEREBRAS_API_KEY="…"
export GEMINI_API_KEY="…"
export ZAI_API_KEY="…"
export OPENROUTER_API_KEY="…"
```

`probar` te dice cuáles faltan **por nombre**, sin que tengas que escribir ninguna en el chat.
No hace falta tenerlas todas: con una funciona, y con dos ya hay relevo.

## Cuando se topa, se avisa

Si están puestas `MAZI_SALA`, `MAZI_YO` y `MAZI_SERVIDOR`, el relevo publica en **La Sala** un
aviso de tipo `limite` con la hora de regreso. Así el cambio de corredor no pasa en silencio, y
en el Taller se ve el robot marcado como «se topó».

## Los nombres de modelo se pudren

Los de `modelos.json` son los que estaban documentados el **27 de agosto de 2026**. Antes de
confiar en la lista, `probar` la comprueba contra cada API en vivo y te dice cuál cambió. Es la
misma regla de siempre: una guía es una foto, no el estado de las cosas.

## Sobre usar capas gratuitas

Rotar entre cuentas **tuyas** es normal y es para lo que existen esas capas. Lo que no se hace
es abrir cuentas de más para saltarse un tope: eso es de lo que se quejan los proveedores, y
además el día que cierren la puerta se cae la operación entera. El relevo está para que un tope
no te pare la tarde, no para no tener topes.
