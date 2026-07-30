# Nuestra superficie de ataque — el catálogo real

Este archivo es el **conocimiento consultable** de la skill: qué usamos de verdad, por dónde nos
entran, y las trampas que ya conocemos. Se actualiza cuando cambia el stack, **sin tocar
`SKILL.md`** — que es donde vive el criterio.

Lo que va aquí son **hechos de arquitectura**, visibles para cualquiera que abra el código de una
página nuestra. No van recetas de explotación (ver la regla del acta en `SKILL.md`).

---

## 1 · Con qué está hecho todo

| Pieza | Dónde | Qué implica para el consejo |
|---|---|---|
| **HTML autónomo de un archivo** | casi todo | Todo el código viaja al navegador. **Nada es secreto.** Cualquier "validación" es una sugerencia |
| **Supabase** (auth + base + storage) | `ligas-mazi` | El único lugar donde de verdad se puede decidir quién ve qué es **la RLS.** Si una política está mal, no hay segunda línea |
| **GitHub Pages** | `mazi-central` | **No hay servidor.** No hay dónde esconder una llave, ni dónde validar, ni dónde poner un límite de peticiones |
| **localStorage** | Pacto Roto, Romero, INKWELL | Todo lo guardado ahí lo lee cualquier script de la misma página, y sobrevive al cierre |
| **Service Worker (PWA)** | Pacto Roto, Romero | Un SW cachea de más y sirve versiones viejas. También puede dejar datos que el usuario cree borrados |
| **Llaves de LLM que pega el usuario** | Pacto Roto (Groq) | Viven en `localStorage` de **su** teléfono. Nunca en el repo. Ese patrón es el correcto y se reusa |
| **Repos públicos** | todos | El código, **el historial completo**, y las actas. Lo que se subió una vez ya se subió, aunque después se borre |

---

## 2 · Por dónde nos entra alguien, en orden de qué tan probable

### 🔴 La RLS de Supabase — el único guardia que tenemos

`ligas-mazi/backend/schema.sql` tiene **13 tablas con RLS activada y 21 políticas**. Eso está bien
hecho como punto de partida. Y aquí va el hecho incómodo:

> **La llave pública en el cliente es correcta por diseño.** Está en
> `ligas-mazi/index.html` con un comentario que lo dice: *"clave pública: la RLS protege los
> datos"*. Ese comentario **es cierto y es exactamente el problema**: significa que la RLS es lo
> único que protege los datos. No es una capa de defensa: es **la** capa.

Entonces lo que el consejo audita no es la llave — es cada política, una por una, con esta
pregunta: *¿qué puede leer y escribir un usuario que ya tiene cuenta y quiere lo que no es suyo?*
Y en particular:

- **Datos de menores.** La app promete *"CURP nunca visible ni buscable"*. Eso es una promesa de
  producto que **tiene que estar sostenida por una política**, no por que la interfaz no lo muestre.
  Ocultarlo en la pantalla no lo oculta en la respuesta.
- **El marcador en vivo.** Quién puede escribir un puntaje, y de qué partido, y en qué día.
- **La cadena padre↔menor.** Es el pendiente D de Ligas Mazi. Vincular por CURP significa que un
  campo de texto decide de quién eres responsable: **ése es un permiso disfrazado de dato.**

### 🟠 Dependencias que cargamos de un CDN ajeno — y hay dos, hoy

Esto no hay que buscarlo, está a la vista:

| Dónde | Qué carga | De dónde |
|---|---|---|
| `ligas-mazi/index.html:1542` | `@supabase/supabase-js@2` | `cdn.jsdelivr.net` |
| `vitallink/index.html:1002` | `leaflet@1.9.4` | `unpkg.com` |

**Tres problemas en el mismo renglón, y el tercero es el grave:**

1. **Si el CDN no responde, no hay login.** No es hipótesis: sin ese script no existe
   `window.supabase`, y el código ya lo contempla con un `if` que simplemente no hace nada. La app
   se queda sin cuentas y sin decir por qué.
2. **`@2` no es una versión, es un rango.** Lo que cargó ayer no es necesariamente lo que carga
   hoy. Sin `integrity`, nadie verifica que sea lo que esperábamos.
3. **Ese script corre con todos los permisos de la página** — la misma página que maneja sesiones,
   pagos y datos de menores. Un CDN comprometido no "afecta un gráfico": lo ve todo.

**Y es una violación directa de LA REGLA (`CLAUDE.md` §2):** no hay adaptador, no hay copia nuestra,
y si mañana se cae o cambia, se cae el negocio. La regla ya dice cómo se resuelve —
**vendorizar**, como ya se hizo con `anime.min.js` en la misma carpeta: bajarlo al repo, versión
fija, y se acabó. `anime.min.js` es la prueba de que en este proyecto ya sabemos hacerlo bien; la
inconsistencia es que a uno sí y al otro no.

### 🟠 Lo que un usuario sube

Ligas Mazi acepta **logos de equipo**. Todo lo que un desconocido puede subir es superficie:

- Qué tipos de archivo se aceptan de verdad (no lo que dice el `accept` del input, que es
  decorativo)
- Qué tamaño máximo, y qué pasa con un archivo de 80 MB en el teléfono de otro
- **SVG es código.** Un SVG subido y servido en la misma página no es una imagen: es un script con
  disfraz
- Quién puede sobrescribir el logo de qué equipo

### 🟡 El historial del repo

Los repos son públicos **con todo su historial**. Borrar una llave en un commit nuevo no la borra:
sigue en el commit viejo, y los escáneres automáticos leen el historial. La única respuesta a una
llave subida es **rotarla**, no borrarla.

Aplica también a: correos, CURP de prueba, capturas con datos reales, y respaldos de base de datos.

### 🟡 El teléfono como almacén

`localStorage` no tiene permisos. Si guardamos ahí una llave de LLM (Pacto Roto) o una partida, la
lee cualquier script que corra en esa página. Con nuestro código sólo, está bien. La regla que lo
mantiene bien: **nada de scripts ajenos en una página que guarda algo del usuario** — que es
exactamente el punto de arriba.

---

## 3 · Las trampas que ya conocemos

De cosas que ya nos pasaron, no de un libro:

| Trampa | Cómo se ve | De dónde salió |
|---|---|---|
| **Cadena de esperas sin protección** | Un eslabón truena y el estado queda muerto para siempre | El softlock de Torre Infinita al morir: `ready` se quedaba en falso |
| **Parece que funciona porque otra cosa sigue viva** | El ratón "sí servía" porque los botones eran de otra escena | El mismo bug. Por eso se reproduce, no se supone |
| **Escritorio sólo centrado** | Se diseñó para teléfono y en PC se centró la tarjeta. No es pulido: falta layout | Ligas Mazi en 1920 px |
| **Objetivos táctiles chicos** | 161×36 cuando el mínimo es 44 | `#segIn` y `#segUp` de Ligas Mazi |
| **La captura mentía** | El pasto salió mal porque estaba en modo depuración, no porque el arte estuviera mal | Torre Infinita. **Confirmar antes de arreglar** |
| **Ocultar en la interfaz ≠ proteger** | "CURP nunca visible" es una promesa de pantalla; el dato viaja igual si la política lo permite | Ligas Mazi, pendiente de auditar |

---

## 4 · Lo primero que hay que auditar, y por qué

**Ligas Mazi, y no está a discusión:** es lo único nuestro con **cuentas reales, pagos y datos de
menores**, corriendo en un repo **público**, con la RLS como única defensa. Todo lo demás de la casa
—los juegos, el sitio, las herramientas— corre sin datos de nadie o sin cuentas.

Orden sugerido cuando se convoque:

1. **Las 21 políticas de RLS**, una por una, contra la pregunta de *"¿y si el usuario quiere lo que
   no es suyo?"*
2. **La promesa del CURP**: que esté sostenida por política, no por interfaz
3. **Vendorizar `supabase-js`** y quitar la dependencia de jsdelivr (y de paso leaflet en VitalLink)
4. **Las subidas de logo**: tipo, tamaño, SVG, y quién puede sobrescribir a quién
5. **El pendiente D (padre↔menor por CURP)** — se audita **antes** de construirlo, porque es un
   permiso, no un formulario
