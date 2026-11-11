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

Va en dos capas, y las APIs de paga corren por cuenta del cliente.

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
- El bot da un **«desde $X»** y manda la cotización en **PDF**. Siempre aclara que el precio final
  lo confirma un técnico al ver el lugar: no es lo mismo «20 m²» que una casa del Marqués con
  cuatro patios y tres perros.
- **Regla de negocio:** a una casa de $500 no conviene ir a medir; a una industria sí. El bot
  distingue los dos casos.

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
5. Qué IA de paga se usa y con qué presupuesto al mes. La cuenta va a nombre del cliente.
6. Precios de los paquetes y fecha de entrega.
7. Teléfono al que el bot le llama cuando lo necesite.
