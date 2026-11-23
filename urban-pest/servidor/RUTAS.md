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
| `GET /api/salida` | — | De dónde sale la camioneta (`{ direccion, nombre, municipio, lat, lon }`), o `null` si todavía no se guarda |
| `POST /api/salida` | `{ direccion }` | La ubica en el mapa y la guarda. Regresa `salida` y `entendi` (lo que entendió, para que el dueño confirme). También acepta coordenadas pegadas de Google Maps («20.59, -100.39») |
| `GET /api/distancia?donde=` | — | La colonia del cliente: `lugar`, `municipio`, `rumbo` (centro, norte… o «fuera de la ciudad») y, si ya está la salida, `km` de ida y `por` (`carretera` o `aprox`). Sin salida, `km: null` y `falta` |

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

## La distancia · 23 nov (Godines)

El bot dice en qué ZONA está el cliente y cobra la DISTANCIA real. En su Excel, «Kilómetros» es la **ida por carretera**
desde su bodega, con decimales, multiplicada **una vez** por su costo por km (comparado contra el mapa: San Miguel 66.2 / 63.2,
San Juan del Río 55 / 51.4, Balvanera 16 / 12.2). `src/distancia.js`, sin dependencias:

- **Dónde es.** Primero una tabla de 66 colonias, municipios y parques de la zona (geografía pública de OpenStreetMap):
  «x el centro», «aquí en milenio», «por juriquiya». Si no está, OpenStreetMap (Nominatim), acotado a la región (hasta San
  Miguel y Celaya), máximo 1 consulta por segundo y guardado en `geo:<colonia>`. Un error de red no se guarda.
- **El rumbo**, respecto al centro de Querétaro: centro, norte, noreste… o «fuera de la ciudad» (más de 30 km, o fuera de
  Querétaro, Corregidora y El Marqués).
- **Los km**: de ida por carretera (OSRM) desde la salida; si no contesta en 4 s, línea recta × 1.3 (`por: 'aprox'`).
- **Privacidad:** a OpenStreetMap sólo va el texto de la colonia (máx. 120 letras). Nunca el nombre, el teléfono ni el mensaje.

**De dónde sale la camioneta: FALTA del cliente.** Se guarda aparte, en `salida` (no en `tarifas`, que el centro reescribe
al cargar el Excel, ni en `negocio`, que va a la IA). Mientras no esté, el bot igual dice la zona y cotiza con los km típicos
de su Excel, marcados como estimados. No se deduce ni se inventa.

En el bot (`oficina.js`): antes de cotizar se ubica la colonia y se guarda en la conversación (`lugar`) por el texto de la
zona, para no volver a preguntarle al mapa; si el cliente cambia de colonia, se recalculan el lugar, los km y el precio (antes
los km de la primera zona se quedaban pegados en `datos.km`). Los km salen, en orden, de: la carretera desde la salida, su
tabla `zonas`, o `km_tipico`. «Fuera de la ciudad» cuenta como fuera de zona cuando no hay km reales contra su `radio_km`;
con km reales y radio, manda su radio. La IA recibe el lugar ya dicho («Juriquilla, en el norte de Querétaro») y lo menciona
una vez al dar el precio; **los km no se le dicen al cliente**: van en `interno` de la hoja (`km`, `km_por`, `lugar`, `nota`).

## Lo que cuenta el cotizador · 12 nov

Carlos: «todo se cuenta». Las tarifas aceptan (y el Excel del cliente debe traer):

- `plagas.<plaga>`: `material` (qué producto lleva), `litros_m2` y `precio_litro`;
- `tecnico`: `costo_hora`, `m2_hora`, `minimo_horas`, `personas` (si no se pone, 2 arriba de 600 m²);
- `vehiculo`: `gasolina_km`, `llantas_km`, `balatas_km`, `motor_km` (por km; se cuenta ida y vuelta).

Precio = (material + técnico) × factor del lugar + camioneta, más el margen. El desglose trae costo y ganancia.
Las tarifas viejas (`mano_obra_m2`, `costo_km`) siguen sirviendo.

## Su Excel · 17 nov (Godines)

Llegó el Excel del cliente (`CorridaCotizacion.xlsx`). **No está en el repo, y no debe entrar: el repo es
público y trae sus costos y su lista de clientes.** Se carga desde el centro (pestaña «Cotizar» → «Cargar tu
Excel»): el teléfono lo lee y guarda en el servidor sólo lo que sirve, con `POST /api/tarifas`.

| Ruta | Qué hace |
|---|---|
| `GET /api/tarifas` | Lo guardado (o `null`). La pestaña «Cotizar» lo lee para cotizar con su Excel, también sin internet |
| `POST /api/tarifas { tarifas }` | Ahora rechaza un cuerpo sin `tarifas` (antes guardaba `undefined`) |

Lo que agrega el Excel a las tarifas:

- `formula: { tipo: 'excel', x, entre, km, traslado_aparte }`: su «Cotización convencional»,
  **precio = (químicos + técnico) × x ÷ entre + km × $km**. El km es el que él anota (de su bodega al lugar),
  sin ida y vuelta, y sin factor por tipo de lugar: así lo hace su hoja. La industria sigue pidiendo visita.
- `tecnico.costo_hora` (lo que cobra la hora) y `plagas.<plaga>.precio_litro` (el costo por litro de mezcla del
  producto que más usa en esa columna de su Excel). `litros_m2` (0.025) y `m2_hora` (330) **no vienen en el
  Excel**: salen del único ejemplo suyo con cuartos medidos y se calibran con el dueño.
- `km_tipico`: la mediana de los km de sus últimas cotizaciones. Si todavía no está de dónde sale la camioneta
  (`salida`) y la zona del cliente no está en `zonas`, el bot cotiza con eso y la nota dice que la distancia es estimada.
- `excel`: el catálogo completo (90 productos), su fórmula y la de su hoja «JADP», para la pestaña «Cotizar».

Ratas, termitas, chinches y pulgas **no** se cotizan solas: en su Excel van con bloques, polvo o mucho más
producto que una aspersión, y las ve él.

**Orden al publicar:** primero se fusiona y se despliega este servidor, y DESPUÉS se carga el Excel. Con el
servidor viejo, las tarifas nuevas cotizarían sin su sobreprecio (el código viejo no conoce `formula`).

**Al centavo (Luis, 17 nov).** El bot cotiza con `corrida.js`, la misma cuenta de la pestaña «Cotizar» (copia exacta), sin
mínimo ni redondeo. Cada cotización trae `desglose.excel.corrida` = horas, km, producto y litros: puestos en su Excel o en
«Cotizar», dan el mismo precio. En «Números» sale como «Para sacarla igual en tu Excel» con el botón «Abrirla en Cotizar».

**Lo que se aprendió probándolo con la IA de verdad (17 nov).** `pruebas-coloquial.mjs` corre más de mil mensajes como
escribe la gente contra el reflejo (cero equivocados) y, en privado, el bot entero se probó con la IA real y su Excel:

- con datos para cotizar en el mensaje (o dichos antes), los casos de precio, factura, empresa y mascotas no contestan por
  reflejo: contesta la IA y cotiza (`elReflejo`). Un mensaje que nombra una plaga y sólo se parece a un caso, también;
- la plaga se apunta en cuanto la dice, aunque conteste el reflejo;
- «3 cuartos», «tres recámaras», «casa chiquita» cuentan aunque la IA no los apunte (`delTexto`);
- con la cotización hecha, si la IA vuelve a pedir el tamaño o la colonia, sale el precio (`pideLoQueYaHay`);
- una plaga sin precio automático (ratas, termitas, chinches…) se le avisa a la IA: no pide tamaño y pasa al encargado.

**Lo que el bot nunca dice:** el nombre y el teléfono del dueño. `negocio.dueno_nombre` y `negocio.dueno_wa` (en `POST
/api/negocio`) alimentan la compuerta `sinDatosDelDueno` que revisa cada respuesta antes de mandarla.

**El número para avisarle al dueño:** la variable `DUENO_WA` o, sin desplegar, `POST /api/negocio
{ negocio: { dueno_wa: '524421394023' } }`. Es el 442 139 4023 que dio el cliente (el mismo de su página).
Sirve hasta que se conecte WhatsApp (falta su acceso a Meta).
