# El reporte del Proyecto Sin Filas vive en Reportes

Aquí hubo una página suelta, `fadori/reporte/`, y ya no está. La retiró su
propio dueño: Carlos, textual — *«el coso de reportes ponlo en la herramienta
que ya tenemos como cambio de membrete y de marca de agua»*.

Y tenía razón. Aquella página repetía la maquetación, la paginación, el folio,
el sello de verificación y el impreso que [`reportes/`](../reportes/) ya hacía.
Lo único que de verdad era de Fadori era **de quién es el papel**.

## Dónde está ahora

Abre **Reportes → Reporte**, y en los tipos aparece el área
**Fadori · Proyecto Sin Filas** con «Avance del proyecto». Al escogerlo se pone
solo el membrete de Fadori —logo, franja naranja y la marca de agua de la
hamburguesa— y el botón de esqueleto pega el reporte entero.

## Qué trae escrito y qué no

Lo que ya se sabe viene puesto y no se redacta cada vez: el problema, los
treinta minutos de recreo, la cadena de siete consecuencias y las cuatro metas
con su modo de medirse. Eso sale de [`PROYECTO.md`](PROYECTO.md) y es el acta de
arranque del proyecto, no un dato del reporte.

**Las metas no se cambian aunque salgan mal.** Que salgan mal también es un
resultado, y uno que la rúbrica premia si se explica.

## De dónde salen los números

De `medidor.html`, que baja dos archivos:

| Archivo | Qué trae | Para qué renglón |
|---|---|---|
| pedidos | `espera_seg` de punta a punta | minutos en fila = promedio ÷ 60 |
| pedidos | un renglón por pedido | pedidos atendidos por recreo |
| conteos | cuánta gente había parada, con su hora | personas frente a la cooperativa |

## Lo que costó aquella página, y que conviene no volver a pagar

Tres defectos que **sólo salieron imprimiendo el PDF**, ninguno visible en el
teléfono. Se dejan escritos porque el día que alguien vuelva a maquetar un
documento a mano se los va a encontrar otra vez:

1. **`display:block` sobre un `<td>` deja de ser celda.** La fila entera se
   apilaba en una columna y las de la derecha salían vacías.
2. **`border:0` de la misma regla dejaba las tablas sin renglones interiores**,
   así que parecían un rectángulo de color.
3. **El color de línea de pantalla es casi blanco en papel.** Tiene contraste
   contra un fondo crema y ninguno contra una hoja.

Nada de eso puede volver a pasar aquí: la maquetación la hace Reportes, que ya
tiene sus 51 pruebas de app y las de impresión.
