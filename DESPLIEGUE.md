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

Sale una dirección tipo **`https://mazi-central.<tu-subdominio>.workers.dev`**.

> **Anótala.** La vas a necesitar en el paso 2.

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
ORIGENES = "https://mazi-central.<tu-subdominio>.workers.dev,http://localhost:8777"
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

1. Abre **`<la dirección del paso 1>/fadori/mostrador.html`** en la tablet.
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
