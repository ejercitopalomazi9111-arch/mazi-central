# CARYMO en App Store y Play Store · qué falta y cómo se hace

> Para Carlos. Lo técnico ya está hecho (app nativa, widgets, íconos, «Borrar cuenta», privacidad y la compilación
> automática). Lo que queda son **dos cuentas** que sólo tú puedes abrir y **unos datos** que me pasas.
> Precios y reglas revisados el **14 de noviembre de 2026**; antes de pagar, confírmalos en la página oficial.

## 1. Las dos cuentas (esto lo haces tú)

| | Apple (App Store) | Google (Play Store) |
|---|---|---|
| Dónde | developer.apple.com/programs/enroll | play.google.com/console |
| Cuánto | **USD 99 al año** (se cobra en pesos) | **USD 25 una sola vez** |
| Qué piden | Cuenta de Apple con verificación en dos pasos, INE, tarjeta | Cuenta de Google, INE, comprobante de domicilio, tarjeta |
| Cuánto tarda | De 1 a 3 días en aprobarte | De 1 a 3 días en verificarte |
| Ojo | Necesitas un iPhone para la verificación | **Cuenta personal nueva = 12 probadores durante 14 días** antes de poder publicar (abajo) |

**Persona o empresa.** Como persona sale tu nombre en la tienda («Carlos …»). Como empresa sale «Grupo Mazi», pero pide
**número D-U-N-S** (gratis, tarda 1-2 semanas) y documentos de la empresa. Con cuenta de empresa, Google **no** pide los 12
probadores. Si quieres que diga Grupo Mazi, pide el D-U-N-S primero (dnb.com, «D-U-N-S Number lookup» → México).

## 2. Lo que me pasas cuando tengas las cuentas

Nada de esto va en el chat ni en el repo: va en **GitHub → el repo → Settings → Secrets and variables → Actions → New
repository secret**. Te guío cuando llegues ahí; son copiar y pegar.

**Apple** (App Store Connect → Usuarios y acceso → Integraciones → Claves de la API, rol «App Manager»):
- `ASC_LLAVE_P8_BASE64` — el archivo `.p8` que se descarga **una sola vez**
- `ASC_LLAVE_ID` — el «ID de clave»
- `ASC_EMISOR_ID` — el «ID del emisor»
- `APPLE_TEAM_ID` — tu Team ID (developer.apple.com → Membresía)

Y en developer.apple.com → Identificadores, crear:
- el App ID **`mx.grupomazi.carymo`** con la capacidad **App Groups**
- el App ID **`mx.grupomazi.carymo.widget`** con **App Groups**
- el grupo **`group.mx.grupomazi.carymo`** y marcarlo en los dos

(Con la llave de la API, Xcode hace los certificados solo.)

**Google**: la llave para firmar la app la genero yo y te la paso **en archivo** para que la guardes tú (si se pierde, no
se puede actualizar la app nunca). Se carga como `CARYMO_KEYSTORE_BASE64`, `CARYMO_KEYSTORE_CLAVE` y `CARYMO_KEY_ALIAS`.
Además activa «Firma de apps de Google Play» (viene de fábrica).

## 3. Publicar (lo hago yo cuando estén los secretos)

En GitHub → Actions → **CARYMO app** → **Run workflow** → «Armar y subir para las tiendas» = sí:
- **iPhone:** se compila en una Mac de GitHub y **se sube sola a TestFlight**. Ahí la pruebas en tu iPhone (app
  «TestFlight») y desde App Store Connect se manda a revisión. Apple tarda de 1 a 3 días en revisarla.
- **Android:** sale el archivo `.aab` firmado. La **primera vez** se sube a mano en Play Console (Prueba cerrada); de ahí
  en adelante se puede automatizar.

### Los 12 probadores de Google (sólo cuenta personal)
1. Play Console → Pruebas → **Prueba cerrada** → subir el `.aab`.
2. Agregar **al menos 12 correos de Gmail** de gente real (amigos, el grupo 3.1, la familia).
3. Que la instalen desde el enlace que da Google y **la usen de verdad**, unos minutos casi todos los días.
4. A los **14 días seguidos** con 12 o más dentro, se pide «Acceso a producción». Google contesta en unos días.

Si en la prueba alguien la desinstala, cuenta; lo que reinicia los 14 días es pausar la prueba.

## 4. Lo que llenas en cada tienda (yo te lo dejo escrito para copiar y pegar)

- **Nombre:** CARYMO · **Subtítulo:** «Estudia con tu mascota» (o el que digas)
- **Descripción corta y larga** — te las escribo cuando abras las cuentas
- **Categoría:** Educación · **Precio:** gratis · **Sin anuncios**
- **Privacidad:** `https://mazi-central.palomazi9111.workers.dev/carymo/privacidad.html`
- **Borrar cuenta (Google lo pide como enlace):** la misma página, sección `#borrar`
- **Edad:** 13+ (la app tiene chat y comunidad). No va en la sección «Niños»: esa trae reglas extra que hoy no conviene
- **Seguridad de datos (Google) / Etiquetas de privacidad (Apple):** usuario y nombre, avance de estudio, lo que la persona
  escribe; nada se vende ni se usa para anuncios; todo se puede borrar. Te lo dejo contestado pregunta por pregunta
- **Capturas:** iPhone de 6.9" y 6.5", y Android teléfono. Las saco yo de la app
- **Cuenta de prueba para el revisor de Apple:** usuario y contraseña de una cuenta de CARYMO con avance (la creo yo)

## 5. Lo que ya está hecho (para que no se pierda)

| Pieza | Dónde |
|---|---|
| La app nativa (la web de CARYMO empaquetada, funciona sin internet) | `carymo-app/` · `node armar-web.mjs && npx cap sync` |
| Widgets de Android: «Mascota» (2×2) y «Racha y mascota» (4×2) | `android/app/src/main/java/mx/grupomazi/carymo/Widget*.java` |
| Widgets de iPhone: chico, mediano y dos de pantalla de bloqueo (racha) | `ios/App/CarymoWidget/CarymoWidget.swift` (iOS 17 o más nuevo) |
| Lo que les pasa la app a los widgets (foto del cuarto + datos) | `carymo/widget.js` → `CarymoWidget.guardar` |
| Íconos y pantalla de arranque de CARYMO | `assets/` → `npx @capacitor/assets generate` |
| «Borrar cuenta» dentro de la app (lo exigen las dos tiendas) | `carymo/cuenta.js` · servidor `comunidad.js` y `estudio.js` |
| Privacidad | `carymo/privacidad.html` |
| Compilación automática (APK de Android y prueba de iPhone en Mac) | `.github/workflows/carymo-app.yml` |

## 6. Lo que todavía no hace la app (y no detiene la publicación)

- **Avisos al teléfono dentro de la app.** En la web llegan por el navegador; dentro de la app hace falta el servicio de
  avisos de Apple y el de Google (gratis los dos, pero se configuran con las cuentas). Va en cuanto existan las cuentas.
- **La reestructura tipo Duolingo** sigue en su propia fila de pendientes; la app se actualiza sola en cuanto se publique
  una versión nueva.
