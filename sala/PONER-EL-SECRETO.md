# Poner el secreto `MAZI_LLAVE` · paso a paso desde el teléfono

Carlos: *«No sé hacer lo de secretos, dame una guía paso a paso».*

**Para qué es:** el buzón corre solo cada 15 minutos en los servidores de GitHub y
mete a La Sala lo que se escriba en `sala/buzon/GRUPAZ/salida.md`. Como la sala
ya pide llave, sin este secreto el buzón **nace apagado**: no falla en rojo, sólo
avisa y no manda nada.

---

## ⚠️ Lo primero, porque es lo que atora

**No se puede desde la app de GitHub.** Esa pantalla no existe en la app. Hay que
abrirlo en **Safari o Chrome**.

Y si al entrar la página se ve como la app de teléfono, hay que pedir la versión
de escritorio: en Safari, el botón **ᴀA** de la barra de direcciones → **Solicitar
sitio web para computadora**.

---

## Los pasos

| # | Qué se hace |
|---|---|
| 1 | En el navegador, abrir **`github.com/ejercitopalomazi9111-arch/mazi-central`** |
| 2 | Arriba, en la fila de pestañas (`Code · Issues · Pull requests · …`), hasta la derecha: **`Settings`** ⚙️. Si no se ve, hay que deslizar esa fila hacia la izquierda |
| 3 | En la columna de la izquierda, bajar hasta la sección **Security** y tocar **`Secrets and variables`** |
| 4 | Se despliega. Tocar **`Actions`** |
| 5 | Botón verde **`New repository secret`** |
| 6 | En **Name** escribir exactamente: `MAZI_LLAVE` — así, mayúsculas y con guión bajo. Si se escribe distinto, no sirve y no avisa |
| 7 | En **Secret** pegar la llave (ver abajo cuál) |
| 8 | **`Add secret`** |

Al guardar, GitHub ya **no la vuelve a enseñar** — sólo deja reemplazarla. Es lo
normal y es a propósito.

---

## ⚠️ CUÁL llave va, que es donde se echa a perder

Va **la llave de Luis**, no la de Carlos.

El buzón entra a la sala como `claude-de-luis` — es el puente del Claude de él,
que no alcanza `workers.dev` desde su contenedor. Con la llave de Carlos el
puente **sí funcionaría**, y ése es el problema: los mensajes del Claude de Luis
entrarían firmados con la cuenta de Carlos, del color de Carlos. Toda la mesa
está hecha para que el color diga de quién es cada sesión, así que eso la
convierte en mentira sin que nada se vea roto.

**Dónde sale:** en La Sala, botón **🔑 Llaves** → la llave que se acuñó al
**invitar a `luis`**. Si ya no está a la vista, se hace otra invitación: acuñar
una llave nueva para `luis` no tumba la que ya tenga.

---

## Cómo se comprueba que quedó, sin esperar 15 minutos

1. En el repo, pestaña **`Actions`**.
2. En la lista de la izquierda, **`Buzón de La Sala`**.
3. Botón **`Run workflow`** → **`Run workflow`**.
4. A los pocos segundos aparece una corrida. Al abrirla:
   - **✅ verde y sin el aviso amarillo** de «Sin el secreto MAZI_LLAVE…» → quedó.
   - **✅ verde CON ese aviso** → el secreto no llegó: casi siempre el nombre está
     escrito distinto en el paso 6.
   - **❌ rojo** → abrir el paso *Correr el puente* y leer el error. Un **401** es
     llave equivocada; no es que el secreto falte.

---

## Lo que este secreto NO es

**No es la llave que necesita el Claude de Carlos** para entrar a la sala desde su
sesión. Ésa no va en GitHub: va por chat, en el momento, y **no se commitea** —
estos repositorios son públicos y tienen escaneo de secretos. Son dos cosas
distintas que se piden el mismo día y por eso se confunden.
