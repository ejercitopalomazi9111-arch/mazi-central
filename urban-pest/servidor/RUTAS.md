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
| `POST /api/cotizar` | `{ plaga, m2, km, tipo }` | Una cotización a mano. Regresa `desde` (el aproximado), `desglose`, `visita`, `fueraDeRadio` y `atiende` (`si`, `caso-por-caso` o `no`) |

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

## La carpeta de cumplimiento (industria) · 12 nov

Pública, sin llave (la abre el jefe de calidad con el link de SU planta; sólo lectura):

| Ruta | Qué |
|---|---|
| `GET /api/carpeta?c=<codigo>` | La planta (sin su contacto), los documentos de Urban Pest, las estaciones con su último estado, los servicios y la actividad por mes |

Del panel (llave o acceso):

| Ruta | Qué |
|---|---|
| `GET /api/plantas` · `POST /api/plantas {nombre, giro, direccion, contacto}` | Lista y alta. El alta regresa el `codigo` del link |
| `POST /api/plantas/estaciones {planta, estaciones:[{n, zona, tipo}]}` | El mapa de trampas |
| `POST /api/plantas/ejemplo` | La planta de muestra para enseñar (no se duplica) |
| `POST /api/servicios {planta, fecha, tecnico, tipo, productos:[{nombre, registro, cantidad}], estaciones:[{n, estado}], hallazgos, recomendaciones, recibio:{nombre, puesto}, firma}` | Un servicio. Exige el registro de cada producto (NOM-251 5.10.9) y quién recibió |
| `POST /api/servicios/quitar {planta, folio, motivo}` | Lo saca de la carpeta y lo deja en `quitado:` con quién y cuándo |
| `GET/POST /api/documentos {licencia_sanitaria, repse, razon_social, responsable_tecnico}` | Salen en cada constancia (5.10.11) |

La página es `urban-pest/carpeta/index.html` (`?c=` la carpeta, `&folio=` la constancia para imprimir, `?registrar` el dueño).

## La cotización por escrito · 12 nov

Cuando el bot da un precio que calculó el sistema (y la zona se atiende), manda un segundo mensaje con el link
a la hoja: `urban-pest/cotizacion/?c=<codigo>`. Es una por precio: si el cliente vuelve a preguntar lo mismo, no
se repite. El link no trae el teléfono ni el chat del cliente. La dirección se cambia con `URL_COTIZACION` en el
entorno del worker (cuando tenga su dominio).

| Ruta | Qué hace |
|---|---|
| `GET /api/cotizacion?c=<codigo>` | **Sin llave.** La cotización y los datos del negocio (nombre, teléfono, correo y, si ya están, licencia sanitaria y REPSE) |
| `GET /api/cotizaciones` | Las últimas 200, del bot y a mano |
| `POST /api/cotizaciones {cliente, renglones:[{concepto, cantidad, precio}], titulo?, lugar?, zona?, vigencia?, iva?, nota?}` | La que hace el dueño a mano. Suma sus renglones |

La página: `?c=` la hoja (con «Guardar como PDF» y «Agendar por WhatsApp»), `?nueva` el formulario a mano.

## El centro de operaciones · 12 nov

Página: `urban-pest/centro/` (Hoy · Servicios · Inventario · Vehículo, con atajos al chat central, la cotización a
mano y la carpeta de plantas). Entra con la llave de Grupo Mazi o con un código de acceso.

| Ruta | Qué hace |
|---|---|
| `GET /api/tablero` | Lo de hoy: servicios del día y atrasados, seguimientos que tocan, por cobrar, insumos bajos, vehículo que ya toca y lo que hizo el bot hoy |
| `GET /api/numeros` | El mes: cotizado, lo que costaría hacerlo, la ganancia y lo cobrado; y cada cotización con su desglose (material, técnico, gasolina, llantas, balatas, motor) y a qué chat contestar. El cliente nunca ve esto: la hoja pública quita `interno` |
| `GET /api/citas` · `POST /api/citas {id?, cliente, fecha, hora?, telefono?, direccion?, zona?, plaga?, tecnico?, precio?, nota?}` | Agendar o corregir un servicio |
| `POST /api/citas/estado {id, estado}` | pendiente → hecho → cerrado (cobrado), o cancelado. Al pasar a «hecho» se agenda solo el seguimiento a 15 días |
| `POST /api/citas/seguimiento {id, sigue_plaga, nota?}` | Si la plaga sigue, crea un servicio de garantía a $0 (lo que promete su página) |
| `GET /api/insumos` · `POST /api/insumos {id?, nombre, registro?, unidad?, minimo?}` | El inventario |
| `POST /api/insumos/mover {id, delta, motivo?, cita?}` | Entrada (+) o salida (−). Se lleva con movimientos y no deja quedar en negativo |
| `GET /api/vehiculos` · `POST /api/vehiculos {id?, nombre, placas?, km?}` | Los vehículos, con sus próximas revisiones |
| `POST /api/vehiculos/revision {vehiculo, tipo, fecha, km?, costo?, proxima_fecha?, proxima_km?, nota?}` | Aceite, llantas, verificación… Sale «ya toca» a 7 días o a 500 km |

## Lo que cuenta el cotizador · 12 nov

Carlos: «todo se cuenta». Las tarifas aceptan (y el Excel del cliente debe traer):

- `plagas.<plaga>`: `material` (qué producto lleva), `litros_m2` y `precio_litro`;
- `tecnico`: `costo_hora`, `m2_hora`, `minimo_horas`, `personas` (si no se pone, 2 arriba de 600 m²);
- `vehiculo`: `gasolina_km`, `llantas_km`, `balatas_km`, `motor_km` (por km; se cuenta ida y vuelta).

Precio = (material + técnico) × factor del lugar + camioneta, más el margen. El desglose trae costo y ganancia.
Las tarifas viejas (`mano_obra_m2`, `costo_km`) siguen sirviendo.
