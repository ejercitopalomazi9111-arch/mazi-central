# Cómo se publica esto · lista para Carlos

> Todo lo que se podía hacer sin tu cuenta ya está hecho y probado. **Aquí está lo que sólo tú
> puedes hacer**, en el orden en que hay que hacerlo y con lo que se rompe si se hace al revés.
>
> Tiempo real: **unos 10 minutos**, porque el paso 1 ya está hecho. Cuesta **cero pesos** — todo cabe en los planes gratis.

---

## El orden importa, y aquí está el porqué

**No hagas el repo privado primero.** En cuanto lo cierres, GitHub Pages deja de servir **todo el
sitio de Grupo Mazi**, no sólo Fadori — servir un repo privado es función de paga de GitHub. Así
que primero se levanta la casa nueva y luego se cierra la vieja:

```
1 · El sitio           →   vive en Cloudflare, no en GitHub
2 · El servidor        →   Fadori deja de ser una copia por aparato
3 · Conectar los dos   →   pegar la dirección y abrir la puerta
4 · Repo privado       →   ya se puede: Cloudflare sí sirve repos privados
```

---

## 1 · El sitio en Cloudflare · ~5 min

> **Si ya lo intentaste y falló con `Asset too large`, no hiciste nada mal.** Cloudflare adivinó la
> configuración: puso el directorio de salida en `.` y trató de subir el repo **entero** como si
> fuera público — incluido `.git`, que pesa 55 MB. **Ya está arreglado en el repo**, así que sólo
> hay que volver a intentarlo.

### Si ya creaste el proyecto

**Workers & Pages → `mazi-central` → Deployments → Retry deployment.** Nada más. No hay que tocar
ningún ajuste: el repo ahora trae `wrangler.jsonc`, que le dice a Cloudflare exactamente qué hacer,
y un `build.mjs` que arma la carpeta con **sólo lo que va publicado**.

### Si lo vas a crear de cero

1. Crea la cuenta en **dash.cloudflare.com** (gratis, sin tarjeta).
2. **Workers & Pages → Create → Import a repository**, autoriza GitHub y escoge
   `ejercitopalomazi9111-arch/mazi-central`.
3. Deja todo como venga y dale **Deploy**. La configuración ya está en el repo.

**Ya está hecho.** El sitio vive en:

> ### https://mazi-central.palomazi9111.workers.dev

Verificado en vivo: las cinco pantallas abren, y `CLAUDE.md`, `DESPLIEGUE.md`, `servidor/`,
`.claude/` y `build.mjs` devuelven **404**. Los créditos de las fotos sí se sirven.

### Qué se publica y qué no · esto importa más de lo que parece

**GitHub Pages nunca publicó `.claude/` por su cuenta. Cloudflare sí lo haría**, junto con el
`CLAUDE.md` —que trae cosas del negocio, lo de ICAMP y los precios— y el código del servidor.

Por eso **no se sirve la raíz del repo**: `build.mjs` arma una carpeta con la lista de lo que sí va,
y esa lista está escrita a la vista en ese archivo. Si algún día algo "no se publicó", se revisa esa
lista y se acabó el misterio.

Lo comprobé sirviendo la carpeta armada: las cinco pantallas abren, y `CLAUDE.md`, `DESPLIEGUE.md`,
`servidor/` y `.claude/` devuelven **404**.

**Menos los créditos.** `CREDITOS.md` sí se publica, a propósito: hay arte y fotos con licencia
CC BY-SA en Fadori, Ligas Mazi, El Pacto Roto y Hoja de Romero, y esa licencia **obliga** a dar
crédito. Si no se publica, estaríamos usando el trabajo de otros sin cumplir lo único que pidieron a
cambio. La app de Fadori además lo enlaza hasta abajo, y hay una prueba que falla si ese enlace
desaparece.

## 2 · El servidor · ~5 min

Igual que el sitio, y **sin tocar la computadora** si no quieres: Cloudflare lo construye desde el
mismo repo.

### Desde el panel · lo más fácil

1. **Workers & Pages → Create → Import a repository** → otra vez `mazi-central`.
2. En **Root directory** pon **`servidor`**. Ése es el único campo que cambia.
3. **Deploy.**

Sale **`https://fadori.palomazi9111.workers.dev`**.

> Son dos proyectos distintos apuntando al mismo repo: uno sirve el sitio y otro corre el
> servidor. No se estorban — cada uno tiene su propia configuración en su propia carpeta, y
> mezclarlos es como se termina publicando el código del servidor.

> **Un detalle que ya te ahorré:** la configuración del servidor estaba en `wrangler.toml` y la
> del sitio en `wrangler.jsonc`. Con formatos distintos, wrangler se subía hasta la raíz del repo,
> agarraba la del **sitio** y trataba de armar la carpeta del sitio dentro de `servidor/`. Fallaba
> con `Cannot find module .../servidor/build.mjs` y no había manera de adivinar por qué. Las dos
> están ya en `.jsonc`, así que gana la de la carpeta donde estás parado.

### O desde tu computadora, si la tienes a la mano

```bash
cd mazi-central/servidor
npx wrangler login
npx wrangler deploy
```

### No hay que editar nada

La línea `ORIGENES` de `servidor/wrangler.toml` **ya trae la dirección real del sitio**:

```toml
ORIGENES = "https://mazi-central.palomazi9111.workers.dev,http://localhost:8777,http://127.0.0.1:8777"
```

Eso es lo que le da permiso a la app para hablarle al servidor. **No tiene comodín a propósito:**
un `*` ahí le abriría la puerta a cualquier página del mundo para escribir en los pedidos de la
escuela. Si algún día compras un dominio, se cambia esa línea y se vuelve a desplegar.

**Para comprobar que quedó**, abre esto en el teléfono:

`https://fadori.palomazi9111.workers.dev/api/salud`

Tiene que contestar `{"bien":true,"quien":"fadori",...}`. Si contesta eso, ya está.

---

## 3 · Conectar los dos · ~2 min

1. Abre **`https://mazi-central.palomazi9111.workers.dev/fadori/mostrador.html`** en la tablet.
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

- **Cloudflare sigue publicando**, porque sí sirve repos privados en el plan gratis. Eso es
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
