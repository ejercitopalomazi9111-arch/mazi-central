# Cómo se publica esto · lista para Carlos

> Todo lo que se podía hacer sin tu cuenta ya está hecho y probado. **Aquí está lo que sólo tú
> puedes hacer**, en el orden en que hay que hacerlo y con lo que se rompe si se hace al revés.
>
> Tiempo real: **unos 25 minutos**. Cuesta **cero pesos** — todo cabe en los planes gratis.

---

## El orden importa, y aquí está el porqué

**No hagas el repo privado primero.** En cuanto lo cierres, GitHub Pages deja de servir **todo el
sitio de Grupo Mazi**, no sólo Fadori — servir un repo privado es función de paga de GitHub. Así
que primero se levanta la casa nueva y luego se cierra la vieja:

```
1 · Cloudflare Pages   →   el sitio vive en otro lado
2 · El servidor        →   Fadori deja de ser una copia por aparato
3 · Conectar los dos   →   pegar la dirección y abrir la puerta
4 · Repo privado       →   ya se puede, porque Pages sí sirve repos privados
```

---

## 1 · El sitio en Cloudflare Pages · ~8 min

1. Crea la cuenta en **dash.cloudflare.com** (gratis, sin tarjeta).
2. **Workers & Pages → Create → Pages → Connect to Git**, autoriza GitHub y escoge
   `ejercitopalomazi9111-arch/mazi-central`.
3. Configuración:
   - **Production branch:** `main`
   - **Build command:** *déjalo vacío*
   - **Build output directory:** `/`

   No hay build. El sitio es HTML, CSS y JS tal cual — por eso esto es un formulario y no una
   pelea.
4. **Save and Deploy.**

Sale una dirección tipo **`https://mazi-central.pages.dev`**. Fadori queda en
`https://mazi-central.pages.dev/fadori/`.

> **Anótala.** La vas a necesitar en el paso 3.

**Qué NO se rompe:** el sitio no tiene una sola ruta absoluta —lo verifiqué— así que funciona igual
en `github.io`, en `pages.dev` o en un dominio tuyo el día que compres uno.

---

## 2 · El servidor · ~7 min

Desde tu computadora, con el repo clonado:

```bash
cd mazi-central/servidor
npx wrangler login          # abre el navegador y te pide entrar a Cloudflare
npx wrangler deploy
```

Sale una dirección tipo **`https://fadori.<tu-subdominio>.workers.dev`**.

> **Anótala también.**

**Antes de correr `deploy`, edita una línea.** En `servidor/wrangler.toml`, la línea `ORIGENES`
tiene que traer la dirección de tu Pages del paso 1:

```toml
ORIGENES = "https://mazi-central.pages.dev,http://localhost:8777"
```

Sin eso el navegador bloquea las llamadas y parece que el servidor no sirve, cuando en realidad
está haciendo su trabajo: **no tiene comodín a propósito**. Un `*` ahí le abriría la puerta a
cualquier página del mundo para escribir en los pedidos de la escuela.

Si te equivocas, se arregla sin volver a desplegar:
`npx wrangler secret put` no — es una variable normal: edita el `.toml` y `npx wrangler deploy`
otra vez.

**Para comprobar que quedó:**
```bash
curl https://fadori.<tu-subdominio>.workers.dev/api/salud
# {"bien":true,"quien":"fadori",...}
```

---

## 3 · Conectar los dos · ~2 min

1. Abre **`https://mazi-central.pages.dev/fadori/mostrador.html`** en la tablet.
2. Pasador (el de arranque es `1234`).
3. **Ajustes → El servidor** → pega la dirección del paso 2 → **Probar y guardar**.

La app la prueba **antes** de guardarla. Si la dirección está mal, te lo dice ahí mismo en vez de
dejarte descubrirlo a media hora del recreo.

De ahí en adelante el renglón de arriba dice **"Conectado al servidor"** en verde. Si algún día
dice ámbar *"Sin conexión · N cambios esperando"*, no hay nada que hacer: se reintenta solo.

**Repite el paso en cada aparato** que vaya a sincronizarse (la pantalla de turnos del pasillo, y
la app del alumno si quieres que sincronice — aunque para el alumno lo normal es que ya venga con
la dirección puesta; eso lo dejamos para cuando sepamos la dirección buena).

---

## 4 · El repo privado · ~1 min

**Ahora sí**, con el sitio ya viviendo en Pages:

**GitHub → mazi-central → Settings → General → hasta abajo, Danger Zone → Change repository
visibility → Private.**

- **Cloudflare Pages sigue publicando**, porque sí sirve repos privados en el plan gratis. Eso es
  justamente lo que GitHub cobra.
- La dirección `ejercitopalomazi9111-arch.github.io/mazi-central` deja de funcionar. Si alguien la
  tiene guardada, hay que pasarle la nueva.
- El repo de **`torre-infinita` es aparte** y sigue público. Ése es el que tiene arte de Nintendo y
  es el que más urge cerrar, más que éste.

---

## Lo demás que necesito de ti, cuando puedas

| Qué | Para qué | Urgencia |
|---|---|---|
| **Aprobar el comando de las skills de Cloudflare** | me lo bloqueó el permiso de la sesión. Son dos líneas y me deja trabajar con Cloudflare directo | cuando quieras |
| **Autorizar Canva** en claude.ai → Configuración → Conectores | para las presentaciones. Si no, las hago en Adobe Express, que sí está conectado | cuando decidas dónde |
| **Decidir el dominio** | `fadori.mx` o lo que sea. Cuesta ~300 al año. Sin él, `pages.dev` funciona perfecto | sin prisa |

---

## Lo que hay que saber antes de que esto lo usen alumnos de verdad

**El servidor de hoy no tiene cerradura.** Cualquiera que sepa la dirección puede escribir en él.
Para la demostración y para una escuela en su propio wifi alcanza; para producción con cien niños,
no. Es lo mismo que ya dice el LEEME sobre el pasador del mostrador, y es lo primero que hay que
conectar el día que la escuela apruebe el proyecto.

**Lo que sí está resuelto desde hoy:**

- Si se cae el internet, se cae Cloudflare o apagan el wifi, **la app no se detiene**: cada aparato
  sigue trabajando con su copia y se ponen de acuerdo cuando vuelva la red.
- **El turno lo pone el servidor**, así que dos alumnos que piden en el mismo segundo nunca reciben
  el mismo número. Está probado con dos navegadores de verdad, no de dicho.
- **Nadie pierde un pedido** en una sincronización: se mezcla registro por registro, no documento
  contra documento.

---

*Fadori · Grupo Mazi · si no existe la herramienta, se construye la herramienta.*
