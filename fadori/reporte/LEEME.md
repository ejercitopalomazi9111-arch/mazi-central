# El modelo de reporte del Proyecto Sin Filas

Un archivo, `index.html`, con **dos vidas**:

- **En pantalla** es un formulario que se llena con el pulgar y se guarda solo en ese teléfono.
- **Al imprimir** es un documento: sin botones, sin cajas de color, sin las ayudas.

Por eso casi cada regla de color o de borde tiene su gemela en `@media print` apagándola. Si se
le agrega un adorno nuevo, **se apaga ahí también o sale impreso**.

## Qué trae ya escrito y qué no

Lo que ya está fijado —el problema, la cadena de siete consecuencias, las cuatro metas— sale de
[`../PROYECTO.md`](../PROYECTO.md) y **no se vuelve a escribir en cada reporte**: es el acta de
arranque del proyecto. Lo que tiene caja naranja es lo que sólo Carlos puede contestar.

Las metas de la tabla de mediciones **no se cambian aunque salgan mal**. Que salgan mal también
es un resultado, y uno que la rúbrica premia si se explica.

## De dónde salen los números

De `medidor.html`, que baja dos archivos:

| Archivo | Qué trae | Para qué renglón |
|---|---|---|
| pedidos | `espera_seg` de punta a punta y `despacho_seg` de la cooperativa | minutos en fila = promedio de `espera_seg` ÷ 60 |
| pedidos | un renglón por pedido | pedidos atendidos por recreo |
| conteos | cuánta gente había parada, con su hora | personas frente a la cooperativa |

## Las tres cosas que sólo salieron al imprimirlo de verdad

Ninguna se veía en el teléfono, y las tres habrían llegado así a la entrega:

1. **`display:block` sobre un `<td>` deja de ser celda.** La regla que da caja a todo lo
   editable convertía cada celda en bloque: la fila entera se apilaba en una columna y las de la
   derecha salían vacías. A 390 px se veía casi bien.
2. **`border:0` de la misma regla dejaba las tablas sin renglones interiores.** Sólo se veían
   las líneas de las columnas que NO son editables, así que parecía un rectángulo beige.
3. **El color de línea de pantalla es casi blanco en papel.** `#E6D5BE` tiene contraste contra
   el fondo crema y ninguno contra el blanco de una hoja.

Cómo se comprueba, que es el único modo de verlas:

```bash
python3 -m http.server 8801
node ../../herramientas/captura.mjs http://127.0.0.1:8801/fadori/reporte/ /tmp/rep.png --ancho 390 --alto 844 --completa
# y el impreso, que es el que importa:
#   render a PDF con media:print y mirar cada hoja
```
