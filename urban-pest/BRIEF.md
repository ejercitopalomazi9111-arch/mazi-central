# Urban Pest · el proyecto completo

> Contado por Carlos el 11 de noviembre. **Urban Pest** es la fumigadora de un cliente al que
> Carlos conoció en el local de sushi, en Querétaro. Lo que diga aquí lo dijo él; lo que todavía
> no sabemos está marcado **FALTA**.

## Por qué importa

Si este servicio se entrega con excelencia, a este cliente se le pueden vender todos nuestros
servicios. Todo va **bajo contrato**: revisiones, mantenimiento y 3 meses de mantenimiento
incluidos. Lo que él escoja de lo que le entreguemos es suyo. Lo demás nos lo quedamos como
portafolio.

## El cliente

- Lleva años con la empresa: empezó de puerta en puerta, pasó a los conocidos y fue creciendo.
  Ya puede **certificarse para atender empresas**.
- Trabaja minucioso: mueven todo, sacan los utensilios al sol y fumigan el interior completo.
  Por eso su precio es más alto que el de quien «medio fumiga».
- En casas cobra unos **$500** por una plaga sencilla. Lo que quiere es la **industria**:
  alimentos, hospitales, comida para perro. Los restaurantes no le interesan: quieren pagar poco
  y nunca se quedan sin plaga.
- Habla mucho. Las juntas son largas.

## Lo que le cuesta dinero (y lo que vamos a resolver)

1. **Pierde clientes en WhatsApp.** En el mismo número tiene el trabajo y lo personal, y no ve los
   mensajes. También quiere Instagram, Facebook y LinkedIn.
2. **Cotizar le toma horas.** El precio sale de cuatro cosas: el producto que se gasta, el tipo de
   plaga, los metros cuadrados y la distancia desde la bodega (gasolina y desgaste del vehículo,
   dentro de su radio de atención). No quiere dar aproximados porque ya lo han chamaqueado.

## Lo que se construye

### A · El bot (lo más importante)

Va en dos capas.

**Las IAs de paga NO se le dan al cliente** (decisión de Carlos, 11 nov): van dentro del paquete,
a nombre nuestro y en nuestro servidor. Él las usa desde el **chat central** del centro de
operaciones. Es como una sala donde habla con sus clientes, con sus IAs y con un bot automático
que trae sus pendientes. Nunca recibe llaves. Así no depende de nadie más para cambios, y se
queda con nosotros.

- **El reflejo:** respuestas ya hechas para lo que preguntan siempre. Es rápido y sale casi
  gratis. Se arma por **casos** (unos 150 a 300, cada uno con muchas formas de preguntarlo), no
  con miles de frases por palabra.
- **El cerebro:** una IA de paga, sólo para lo que el reflejo no conoce.
- **El manual:** cada pregunta que la IA contestó sin conocerla se apunta. Se revisa y se vuelve
  reflejo para la siguiente vez.
- **Lo que no puede contestar,** o donde hace falta el dueño, se le avisa por mensaje o le
  **llama** (Carlos quiere habilitar las llamadas).
- **No toca los chats personales del número.** Esto ya lo resolvimos en Secre (`secre/`, la parte
  de «sólo negocio»).

### B · El cotizador

- Toma los costos y los ejemplos de su **Excel** (**FALTA** el Excel).
- El bot da un **precio aproximado** (nunca «desde»: suena a que va a subir) y manda la cotización en **PDF**. Si los datos del cliente están bien, ése es el costo; siempre aclara que
  lo confirma un técnico al ver el lugar: no es lo mismo «20 m²» que una casa del Marqués con
  cuatro patios y tres perros.
- **Regla de negocio:** a una casa de $500 no conviene ir a medir; a una industria sí. El bot
  distingue los dos casos.
- **Fuera de la zona de servicio** (Carlos, 11 nov):
  - **Industria:** sí, con visita para confirmar la cotización.
  - **Casa:** no se cubre, salvo que sea un proyecto grande. Ése lo ve el dueño caso por caso y
    le llega un aviso.
  - **Siempre** sale más caro por el traslado, y se le explica al cliente con tacto.
  - El tamaño mínimo para que una casa de fuera sea «grande» es `fuera_m2_minimo` en las tarifas;
    si no se pone, son 200 m², y se calibra con el dueño.

### B-bis · Cuando no sabe cuánto mide su casa (Carlos, 11 nov)

Casi nadie lo sabe. El bot no insiste: hace un mini quiz fácil, una o dos preguntas a la vez:

- ¿Tu casa es chica, mediana o grande?
- ¿Cuántas recámaras y baños tiene?
- ¿Tiene patio? ¿Es de una o de dos plantas?
- ¿En qué colonia está?

`servidor/src/medidor.js` lo vuelve metros. Cada cuarto mide según el tamaño de la casa (una
recámara de casa grande, unos 18 m²), se suman los pasillos y se ajusta por colonia (Juriquilla
o El Campanario son más grandes). Siempre sale como **estimado** y el técnico confirma.

**Los números son nuestro primer estimado** y se calibran con los servicios reales del dueño
(`POST /api/medidas`). Habla como la gente («cucarachas chiquitas», «comején»), sin
tecnicismos y con paciencia.

### C · El centro de operaciones

Es su app de control, la que le da confianza de que «aquí veo todo lo que está pasando»:

- inventario de insumos;
- revisiones del vehículo;
- servicios pendientes, hechos y cerrados;
- visitas de seguimiento al cliente;
- el resumen de lo que resolvió la IA;
- cotizaciones específicas hechas a mano, en PDF.

Hay además una parte **medio escondida** con todos los chats contestados y el **razonamiento de
la IA**. Es sobre todo para nosotros, pero él también la puede ver.

### D · La página web, regalada dentro del paquete

- La suya está hecha con plantilla de IA y le cobraron $6,000. Él dice que le gusta y que no la
  quiere cambiar, pero tampoco puede moverle nada.
- Hacemos una nueva de nivel $6,500 (o como Smiley's): **limpia, sin insectos**, con botones de
  acción y todo lo que hace.
- **No hay que perder su dominio.** Hay que pedírselo a quien lo tenga registrado y apuntarlo a
  la nueva. **FALTA:** la dirección actual y quién es el dueño del dominio.

### E · La publicidad

- Una campaña para sus redes durante **2 meses**, incluida en el paquete.
- Carlos trae a sus artistas y a un editor de video. Sylcred hace referencias y guiones; el
  editor hace los videos.

## La regla del dinero · Carlos, 11 nov

**«Aún no desembolses un peso: todo va como se pueda resolver gratis hasta que el cliente nos diga
que se queda.»** Mientras tanto:

- **La IA:** las gratis que ya usa La Sala. Groq va primero y Gemini de respaldo. La de paga queda
  apagada (`MOTORES_IA`).
- **El servidor, el centro de operaciones y la página:** en Cloudflare, con el plan gratis.
- **Las llamadas al dueño** esperan. Mientras, se le avisa por WhatsApp y con una notificación en el
  centro.
- **Ojo:** en el plan gratis de Gemini, Google puede usar lo que se le manda para mejorar sus
  productos. Por eso Gemini va de respaldo y no primero.

## LO MÁS IMPORTANTE: que le caiga al menos una venta con industria (Carlos, 11 nov)

Cualquier empresa que aparezca es ganancia. Las ideas, de la que más pega a la que menos, todas
gratis:

1. **La lista de a quién tocarle.** El DENUE del INEGI es el directorio público de empresas, con
   giro, dirección, teléfono y tamaño. Filtramos las de Querétaro que más necesitan control de
   plagas certificado: fábricas de alimentos y bebidas, comida para mascotas, farmacéuticas,
   hospitales y clínicas, bodegas de alimentos. Se ordenan por tamaño y cercanía a su bodega.
   **FALTA:** un correo para sacar la llave gratis de la API del INEGI.
2. **El gancho no es «fumigamos», es «te dejamos lista la auditoría».** Una planta de alimentos
   tiene que demostrar su control de plagas con registros. La NOM-251 lo pide, y las
   certificaciones (ISO 22000, FSSC, AIB) piden reportes de servicio y mapa de trampas; esto se
   verifica antes de ponerlo en la página. Le armamos una **carpeta de cumplimiento** digital por
   cliente: cada servicio deja su reporte en PDF (fecha, productos, trampas, hallazgos y firma) y
   el jefe de calidad de la empresa la consulta cuando quiere. Las fumigadoras chicas entregan
   papel; ésta es la diferencia que le abre la puerta. Sale del centro de operaciones.
3. **Una página que hable con la industria:** una sección propia, la carpeta de cumplimiento, sus
   reseñas de casi 5 estrellas al frente y un «diagnóstico de su planta» para pedir visita. Si el
   diagnóstico es gratis o no, lo decide el dueño: es su tiempo.
4. **Tocar puertas con algo en la mano:** correo y LinkedIn a jefes de calidad, inocuidad y
   mantenimiento. Mensajes cortos que escribimos nosotros, más una hoja de presentación en PDF.
   **Nada de mandar WhatsApp en masa:** quema el número.
5. **Socios que ya entran a las plantas:** consultores de inocuidad y certificación, empresas de
   limpieza y mantenimiento industrial, y administradores de parques industriales. Se les ofrece
   comisión por cada cliente que recomienden.
6. **Su ficha de Google:** que salga en «fumigación industrial Querétaro», con fotos de trabajos y
   sus reseñas.

## Cómo se vende

- **Paquetes cruzados:** «¿quieres el bot? llévate el centro»; «¿el bot sin el centro? entonces
  la publicidad». Sí se vende el bot solo, pero siempre se ofrece todo.
- **Precios:** **FALTA**. Carlos decide, siempre abajo del promedio
  (`empresa/servicios/PRECIOS.md`).

## Lo que ya se sabe de las plataformas (verificado el 11 nov)

- **WhatsApp:** Meta permite usar la app de WhatsApp Business **y** la API oficial en el mismo
  número («coexistencia»). Él sigue con su app y el bot entra por la API. Hay que confirmarlo
  contra la documentación de Meta al conectar: versión mínima de la app y si aplica en México.
- **Instagram y Facebook:** se pueden contestar por la API de Meta con una cuenta de empresa.
- **LinkedIn:** **no hay que prometerlo.** La API de mensajes de páginas está limitada a socios
  aprobados, y lo que dicen los proveedores se contradice. Se ofrece publicar ahí, no contestar.
- **Para los datos de sus clientes** (chats, teléfonos), hace falta aviso de privacidad en la
  página y una cláusula en el contrato.

## Quién hace qué

| Quién | Qué | Carpeta |
|---|---|---|
| **Sylcred** | El bot (reflejo, cerebro, manual, avisos y llamadas), el cotizador, el servidor, la conexión con Meta y el panel escondido. Coordina | `urban-pest/servidor/`, `urban-pest/bot/` |
| **Godines** | El centro de operaciones: inventario, vehículo, servicios, visitas y PDF | `urban-pest/centro/` |
| **Luna** | La página web limpia, más el primer borrador de los casos del reflejo | `urban-pest/web/`, `urban-pest/bot/casos-borrador.json` |
| **Paulina y Negro** | Revisar cada cambio antes de fusionarlo (`herramientas/segunda-opinion.mjs`), dar ideas para la campaña y para los recordatorios | La Sala |
| **Luis** | Probar el centro como si él fuera el fumigador, y revisar lo de Godines | — |
| **Carlos** | El cliente: el Excel, accesos, contrato, precios, artistas y editor | — |

**El contrato entre el bot y el centro:** un solo servidor, el de `urban-pest/servidor/`, que es
de Sylcred. Godines lo consume. Los datos que se comparten son:

- clientes;
- conversaciones;
- cotizaciones;
- servicios;
- insumos;
- vehículo;
- avisos.

Sylcred publica la lista de rutas en `urban-pest/servidor/RUTAS.md` antes de que nadie la use.
Hasta entonces, Godines trabaja con datos de muestra que tengan esa misma forma.

**Reglas de la mesa:** quien vaya a tocar algo avisa en GRUPAZ antes, y cada uno trabaja en su
carpeta. Nada se fusiona a `main` sin revisión, y borrar, desplegar o tocar llaves lo autoriza una
persona.

## FALTA de Carlos

1. El Excel de costos y ejemplos.
2. La dirección de su página actual y quién tiene el dominio.
3. Acceso a su Meta Business (página de Facebook, Instagram y el número de WhatsApp).
4. Capturas o exportación de las preguntas que le llegan seguido.
5. Cuando el cliente se quede: qué modelo de IA de paga se prende. Mientras tanto, va gratis.
6. Precios de los paquetes y fecha de entrega.
7. Teléfono al que el bot le llama cuando lo necesite.
