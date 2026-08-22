# El formato institucional

Las dos imágenes de esta carpeta **no se dibujaron ni se imitaron**: salieron del archivo
`Institutional format.docx` que mandó Carlos, que es el formato oficial del Instituto Rembrandt.

| Archivo | De dónde salió | Dónde va |
|---|---|---|
| `membrete-superior.png` | `word/media/image2.png` del .docx (el encabezado) | arriba, a sangre |
| `membrete-inferior.png` | `word/media/image1.png` del .docx (el pie) | abajo, a sangre |

## La geometría, medida del propio .docx

Está en `<w:sectPr>`, en unidades de Word (twips: 1 440 = 1 pulgada):

| Qué | En el .docx | En milímetros |
|---|---|---|
| Tamaño de página | `12240 × 15840` | **215.9 × 279.4** (carta) |
| Margen superior e inferior | `1417` | **25 mm** |
| Margen izquierdo y derecho | `1701` | **30 mm** |
| Distancia del encabezado y del pie | `0` | pegados al borde |

Por eso la herramienta arranca con lados de 30 mm: **no es un gusto, es el formato.**

## Los colores, muestreados de las imágenes

No se eligieron a ojo; se contaron los píxeles de los dos membretes:

| Color | Dónde aparece |
|---|---|
| `#002060` | azul marino de "INSTITUTO REMBRANDT" — es el de los títulos |
| `#1800AD` | azul vivo de la regla del encabezado — el de los recuadros |
| `#C00000` | rojo del pie y de la regla derecha — el de los acentos |

## Qué se le agregó encima

El .docx traía **sólo el membrete**: ni una línea de texto, ningún estilo, ninguna estructura. Todo
lo de adentro es nuevo:

- bloque de título con tipo de reporte, folio, fecha, destinatario y lugar
- jerarquía de apartados con la barra roja, y tablas con encabezado azul
- ficha de datos para los renglones de `**Campo:** valor`
- numeración *Página X de Y* y bloque de firmas que no se parte entre hojas
- evidencias fotográficas numeradas solas
- **marca de agua** con la paloma de Grupo Mazi
- **sello de verificación** calculado del contenido

## Si la escuela cambia el formato

Se reemplazan las dos imágenes con el mismo nombre y listo. Si además cambian los márgenes, se
ajustan en la pestaña **Formato** de la herramienta y se guarda con el reporte — no hay que tocar
código.

## Lo que todavía no hace

**PowerPoint.** Carlos lo pidió para después (*"iniciemos nada más con lo del PDF"*). El texto ya
queda partido en bloques, que es la mitad del trabajo de convertirlo en diapositivas.

## El registro de incidencias

Se agregó después, cuando Carlos mandó un reporte real suyo y quedó claro dónde estaba el trabajo:
los apartados de *incidencias individuales* y *resumen individual* son puro dedo repetido, y son la
mitad del documento.

Ahora se toca al alumno en una cuadrícula, se elige qué pasó, y **la hora se pone sola**. Al final,
un botón escribe los dos apartados completos con el formato que él ya usaba: nombre y hora, la
descripción, `Tipo:` y el cuadro resumen con las tarjetas contadas (dos amarillas = una roja).

**La lista del grupo y las incidencias no salen del teléfono.** Son nombres de menores: no hay
servidor, no hay respaldo automático, sólo el respaldo que él exporte a mano.

## Los tipos de documento

Once, agrupados por para qué los usa Carlos:

| Jefe de grupo | Sociedad de alumnos | Cualquiera |
|---|---|---|
| Reporte de grupo · Incidencia · Semanal de grupo · Limpieza · Aviso | Minuta · Propuesta · Informe de actividad | Solicitud · Reporte general · Libre |

## La plantilla para escribir con IA

Pestaña **Plantilla**. Genera las instrucciones **con el tipo que esté elegido**, así que no es un
texto genérico: trae el esqueleto de ese documento, quién lo firma, a quién va dirigido y las reglas
de marcado. Se copia y se pega antes de pedirle el reporte a una IA, y lo que devuelve entra sin
tocarlo.

Lo que le prohíbe expresamente: escribir el título o el membrete (van aparte), firmar o fechar (lo
pone la herramienta), usar emoji, e **inventar datos**.

## El reglamento

Del `Reglamento Bachillerato Rembrandt 2026` salieron los fundamentos que cita cada falta del
registro. Los que más se usan:

| Tema | Dónde |
|---|---|
| Celular | Aparatos electrónicos IV b — escalera de tres ocasiones |
| Respeto y groserías | Comportamiento IX d |
| Empujar o contacto indebido | Comportamiento IX b y c |
| Interrumpir el orden del salón | Faltas que ameritan suspensión, inciso b |
| Poner en riesgo la seguridad | Faltas que ameritan suspensión, inciso a |
| Uniforme | Uniformes III — de reincidir, suspensión de ese día |
| Lockers | Casillero V |
| Retardos y asistencia | Hora de llegada I |
| Permisos de salida | Salida de alumnos II c |

Y las dos consecuencias que conviene tener a la mano: **todas las faltas generan registro en el
expediente**, y **tres reportes de disciplina** llevan a notificación personal para evitar la
suspensión de tres días. Un reporte trae además **trabajo comunitario** —en el receso si la falta es
menor, en fin de semana si no.

## Apagar apartados

Un semanal no siempre lleva todos los apartados. En **Escribir** hay un interruptor por cada `##`
del documento: se apaga el que no toque ese día.

Dos decisiones que importan:

- **No se borra nada.** El texto se queda guardado en el reporte; apagarlo sólo lo saca de la
  impresión. Se vuelve a prender cuando se ocupe.
- **La numeración se recompone.** Si los apartados van con romanos y se apaga el VI, el documento
  saldría saltando de V a VII, que en algo que entregas a un tutor se ve mal. Los que quedan
  encendidos se renumeran solos.

El corte se hace sobre el **texto** y no sobre los bloques ya leídos, a propósito: así el sello de
verificación y la paginación ven exactamente lo mismo que se va a imprimir.
