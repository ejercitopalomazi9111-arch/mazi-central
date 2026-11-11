# Urban Pest · rutas del servidor (el contrato con el centro de operaciones)

Las escribe Sylcred y las usa Godines. Si una cambia, se cambia **aquí primero** y se avisa en
La Sala.

**Todavía no está publicado.** Para probar en local:

```
cd urban-pest/servidor
npx wrangler dev --local --var LLAVE_PANEL:prueba --var ORIGENES:http://127.0.0.1:8765
```

Para cargar datos de muestra, usa `POST /api/casos` y `POST /api/tarifas`.

**Todas las respuestas** son JSON con `bien: true|false` y, cuando falla, `error`. Todas las rutas
`/api/*`, menos `/api/salud`, piden la cabecera `X-Llave: <LLAVE_PANEL>`. El cliente **nunca**
ve llaves de IA ni de Meta: esas viven en el servidor.

## Lo que se lee

| Ruta | Qué da |
|---|---|
| `GET /api/salud` | `{ bien: true }` |
| `GET /api/conversaciones` | La lista para el chat central, la más reciente primero. Cada una trae `canal`, `chat`, `nombre`, `n` (cuántos mensajes), `ultimo_texto`, `ultimo`, `datos` (plaga, m2, zona, tipo), `cotizacion`, `duenoHasta` y `estado` |
| `GET /api/conversacion?canal=whatsapp&chat=52…` | Una entera. Cada mensaje trae `de` (`cliente` o `negocio`), `texto`, `cuando` y `via`. Hay más detalles en la tabla de abajo |
| `GET /api/avisos` | Lo que necesita al dueño. Cada aviso trae `motivo`, `canal`, `chat`, `nombre`, `cuando` y `estado` (`nuevo` o `visto`) |
| `GET /api/manual` | Lo que contestó la IA sin conocerlo. Cada entrada trae `pregunta`, `respuesta`, `razon` y `estado` (`por revisar` o `aprobado`) |
| `GET /api/casos` | Las respuestas ya hechas (el reflejo) |

**Qué significa `via` en cada mensaje:**

| `via` | Quién contestó | Qué más trae |
|---|---|---|
| `reflejo` | Una respuesta ya hecha | `caso` y `confianza` |
| `cerebro` | La IA | `razon`, `modelo` y `cotizacion`. Esto es lo que va en el **panel escondido** |
| `dueno` | El dueño, desde el chat central | — |
| `respaldo` | Nadie: falló la IA y se mandó un «en un momento te contestan» | — |

Si `noSalio` viene puesto, Meta no lo entregó.

## Lo que se hace

| Ruta | Cuerpo | Qué pasa |
|---|---|---|
| `POST /api/responder` | `{ canal, chat, texto }` | El dueño contesta desde el chat central. Sale por el mismo canal y el bot se calla 30 minutos en ese chat |
| `POST /api/aviso/visto` | `{ id }` | Marca un aviso como visto |
| `POST /api/manual/aprobar` | `{ id, caso?, respuesta?, frases? }` | Lo que contestó la IA se vuelve respuesta ya hecha |
| `POST /api/manual/descartar` | `{ id }` | Lo que contestó la IA no se aprende |
| `POST /api/casos` | `{ casos: [...] }` | Reemplaza todas las respuestas ya hechas |
| `POST /api/tarifas` | `{ tarifas }` | Los costos del Excel. La forma está en `src/cotizador.js` |
| `POST /api/negocio` | `{ negocio: { nombre, descripcion } }` | Lo que la IA sabe del negocio |
| `POST /api/personales` | `{ numeros: [...] }` | Los chats personales del dueño. El bot no los toca |
| `POST /api/estimar` | `{ tamano, recamaras, banos, sala, comedor, patio, zona }` | Los metros estimados de una casa cuando el cliente no sabe. Regresa `m2`, `rango` y `afinar` (qué falta preguntar) |
| `GET /api/medidas` · `POST /api/medidas` | `{ medidas }` | La tabla del estimado: m² por cuarto según el tamaño, y el ajuste por colonia. Se calibra con los servicios reales |
| `POST /api/cotizar` | `{ plaga, m2, km, tipo }` | Una cotización a mano. Regresa `desde`, `desglose`, `visita` y `fueraDeRadio` |

## Lo que todavía NO está, y quién lo hace

- **El chat con «sus IAs»** dentro del chat central. Así el dueño le pregunta cosas a la IA sin
  ver llaves. Lo hace Sylcred: ruta `POST /api/ia`.
- **El bot automático con sus pendientes.** Lo hace Sylcred, sobre `avisos` y los servicios.
- **Inventario, vehículo, servicios y visitas.** Esos datos son del centro. Godines propone aquí
  sus rutas (`/api/insumos`, `/api/vehiculo`, `/api/servicios`, `/api/visitas`) y Sylcred las
  monta en el mismo servidor.
- **La llamada al dueño.** Falta escoger el servicio de voz.
- **Avisos al dueño fuera de las 24 horas.** Después de 24 horas sin que él le escriba al número
  del bot, WhatsApp sólo deja mandar **plantillas aprobadas**. Hay que dar de alta una plantilla
  «aviso» al conectar.
