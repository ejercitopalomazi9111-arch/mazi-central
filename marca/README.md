# La marca de Grupo Mazi

El logo original lo hizo Carlos hace 15 años. No queda el archivo ni contacto con quien lo pasó
a 3D, así que se reconstruyó: él generó candidatos con IA a partir de su memoria, eligió, y aquí
se convirtieron en vector real.

## Los archivos

| Archivo | Qué es |
|---|---|
| `logo/paloma.svg` | **La marca.** 9 trazos. |
| `logo/paloma-simple.svg` | La misma con los contornos más simplificados, para tamaños chicos. |
| `piezas/ave.svg` | El ave ya vectorizada y limpia. Insumo de `armar.mjs`. |
| `piezas/ave-simple.svg` | Igual, más simplificada. |
| `piezas/arco.svg` | El arco solo, de la opción 4. |
| `fuente/plana-color-bueno.png` | La generación plana. **De aquí sale el ave** y de aquí salió el color. |
| `fuente/opcion-4.png` | La opción 4, la más parecida al original. **De aquí sale el arco.** |

Las piezas están guardadas a propósito: el contenedor se reinicia y se lleva los temporales, así
que `armar.mjs` no debe depender de regenerarlas.

## Los colores, medidos de la imagen (no inventados)

| | hex | de dónde |
|---|---|---|
| violeta | `#AD21ED` | promedio de los 182 712 px violetas de la imagen plana |
| hueso | `#EAE5E3` | promedio de los píxeles claros |
| negro | `#010101` | el negro del arco en la opción 4 |
| vacío | `#120C1A` | el fondo que eligió el generador, casi idéntico al `#100A18` de la casa |

## Cómo se reproduce

Con las piezas ya guardadas, sólo hace falta armar:

```sh
node marca/armar.mjs marca/piezas/ave.svg marca/piezas/arco.svg marca/logo/paloma.svg \
  --arco "515,233" --encima --barras "402,0,126,7,22,42,28,20,64" --estrella 1.6

node marca/armar.mjs marca/piezas/ave-simple.svg marca/piezas/arco.svg \
  marca/logo/paloma-simple.svg \
  --arco "515,233" --encima --barras "402,0,126,7,22,42,28,20,64" --estrella 1.6
```

Y si algún día hay que rehacer las piezas desde las imágenes fuente:

```sh
# el ave (de la imagen plana)
node herramientas/vectorizar.mjs marca/fuente/plana-color-bueno.png marca/piezas/ave.svg \
  --colores "#120C1A,#AD21ED,#EAE5E3,#21132D" --quitar "#120C1A" \
  --fusionar "#21132D:#AD21ED" --escala 3 --cerrar "#AD21ED:3" --pulir "#AD21ED:3:3" \
  --minarea 120 --capas --suave 2 \
  --sinzona "1200,580,208,188"   `# la estrellita que dejó el generador` \
  --sinzona "575,435,90,120" --sinzona "745,435,90,120"  `# las comillas de esa imagen: fuera` \
  --sinzona "430,55,560,205"     `# su arco, se reemplaza por el de la 4`

# el arco (de la opción 4)
node herramientas/vectorizar.mjs marca/fuente/opcion-4.png marca/piezas/arco.svg \
  --colores "#130E14,#010101,#F2F2F2,#9B34B4" --quitar "#130E14,#9B34B4" \
  --minarea 60 --capas --recortar --escala 3 \
  --pulir "#010101:2:2" --pulir "#F2F2F2:2:2" --suave 2 \
  --solozona "#010101:250,20,300,150" --solozona "#F2F2F2:480,20,300,150"
```

## Las perillas, y por qué están en ese número

- **`--cerrar 3`** — qué tan lejos del cuerpo se dividen las plumas. 0 finas, 3 intermedias,
  6 sólidas. Carlos eligió 3.
- **`--pulir 3:3` + `--suave 2`** — el borde que sale del cierre viene escalonado y el trazador lo
  convierte en zigzag; Carlos lo describió como z-fighting alrededor de las plumas. El pulido es
  un filtro de mayoría que tumba los dientes sin mover la silueta.

  El tercer número son las **pasadas**, y no es un detalle: el filtro usa una ventana CUADRADA, así
  que una sola pasada de radio grande deja las esquinas cuadradas. Tres pasadas de radio chico
  aproximan un desenfoque gaussiano y las esquinas salen curvas.
- **`--escala 3`** — supermuestreo, y es lo que más ayudó con lo tosco de las plumas. El trazador
  sigue el borde de PÍXELES: a 1× una pluma fina tiene el borde escalonado y ningún filtro lo
  arregla, porque la información no está. A 3× ese mismo borde tiene tres veces más puntos, y al
  devolver las coordenadas al sistema original queda con precisión de un tercio de píxel.

  Ojo con una trampa: `pathomit` de imagetracer es **longitud** de borde, no área. Al escalarlo
  por E² en vez de E se comía la estrella entera.
- **`--encima` + `--arco 515,233`** — con el arco detrás, sus puntas asomaban por los huecos
  ENTRE las plumas y parecía entretejido con el ala. Acortarlo sólo movía el problema: la punta
  seguía cortándose contra el ala, y para que dejara de pasar había que hacerlo tan chico que se
  leía como accesorio pegado. Encima, la punta se lee continua y se apoya donde el ala ya tiene
  masa. El 515 es el punto medio entre dos anchos que él comparó.
- **`--estrella 1.6`** — la estrella del pecho es el único trazo hueso que trae el ave (el arco
  usa su propio blanco), así que se puede escalar sola. Va respecto a su propio centro:
  agrandarla no la mueve de sitio. 1.6 la deja del tamaño que tiene en las referencias de Carlos.

### `--barras 402,0,126,7,22,42,28,20,64`

`y, dentro, fuera, grosorDentro, grosorFuera, ángulo, separación, curva, retranqueo`.

Son **dos por lado**, en diagonal hacia afuera y abajo. No son rectángulos: cada una es una cuña
que nace fina (7), se ensancha hacia afuera (22), se arquea y termina en domo.

Las cuatro **apuntan** a un mismo punto sobre el eje del ave, pero arrancan a `retranqueo` de él,
así que convergen sin tocarse. El primer intento fue un disco en el vértice con las barras
naciendo pegadas: se combinaban en una sola pieza, que es justo lo que él no quería. **Apuntar no
es tocarse.**

Lo que en esto **no es gusto, es aritmética** — y costó varias vueltas descubrirlo:

- **La separación va PERPENDICULAR** a la barra, no en vertical. Eso es lo que hace que el par se
  lea como un signo igual inclinado y no como dos rayas sueltas apuntando al mismo lado.
- **Sin vértice, la separación tiene que superar el grosor exterior.** Con separación 14 y grosor
  20 los bordes se solapaban y las dos barras se fundían en una figura. Carlos dijo que parecía un
  diente y tenía razón: geométricamente ERA una pieza.
- **Con vértice, el hueco en el nacimiento vale `2·retranqueo·sen(apertura/2) − grosorDentro`.**
  La herramienta lo calcula y avisa cuando no alcanza, para no descubrirlo mirando la captura.
- **Juntar el par obliga a adelgazarlo.** Bajar la separación reduce la apertura, y con menos
  apertura el hueco del nacimiento se cierra. Por eso el grosor interior bajó de 15 a 7 cuando él
  pidió las líneas más juntas: es el precio, y se paga ahí.
- **La altura y el alcance se mueven juntos.** El cuerpo se angosta hacia la cadera —98 px de ancho
  en y=420 contra 57 en y=470— así que un mismo alcance nace dentro del ave a una altura y fuera a
  otra.

## Una sola versión, y es a propósito

En fondo oscuro el negro real desaparece: las barras de la cadera y la mitad oscura del arco dejan
de existir. Se probaron dos salidas — subirle el tono al negro (`--negro`) y ponerle un filo claro
alrededor (`--contorno`, que Carlos trajo con una referencia). **Las dos funcionan y ninguna se
usa**, por decisión suya:

> *"para lo de fondo oscuro yo pienso que está bien que lo dejemos sin contorno, le da dinamismo al
> logo — en fondos claros es un logo donde está la línea negra y en fondos oscuros es la línea
> clara"*

Y tiene razón: la marca no es la misma imagen en todos lados, cambia de lectura según dónde vive.
Sobre hueso manda la línea negra; sobre vacío manda la clara. Eso no es un defecto que haya que
tapar, es cómo respira.

Las dos banderas siguen en `armar.mjs` por si un soporte las pide —una serigrafía a un color, un
bordado, el logo encima de una foto— pero el de la casa va limpio.

## Por qué el proceso es así, y no "dibújalo en código"

Se intentó primero: `original.mjs` genera el ave por geometría a partir de la descripción de
Carlos, con plumas, cola, estrella y arco paramétricos. **Quedó mal** y él lo dijo sin anestesia.
Dibujar una silueta orgánica a punta de números es pelear con la mano atada cuando existe la vía
buena: generar la imagen y vectorizarla. El archivo se queda porque la prueba de tamaño y el
andamiaje de comparación sirven.

Cuatro trampas del camino, para no repetirlas:

1. **El antialiasing se cuenta como un color.** La primera pasada sacó una capa fantasma de 309
   trazos que era puro borde. Se arregla pre-cuantizando a la paleta antes de trazar.
2. **El motor recentra la paleta.** Con varios ciclos de cuantización pedía `#AD21ED` y devolvía
   `#AC21EC`. Chico el corrimiento, pero rompe el descarte por color. Un ciclo.
3. **El tono intermedio del delineado, si se descarta, deja HUECOS.** Eran las rayas negras que
   cruzaban las alas: no eran contornos, era el fondo asomándose. Se fusiona con el violeta, no se
   descarta. Esta la cazó Carlos, no yo.
4. **Nada de comandos `A` en los paths.** Todo `armar.mjs` asume coordenadas absolutas en pares
   —`M L Q C Z`— y de eso dependen `mover` y `cajaDe`, y con ellos el recorte y la colocación del
   arco. Hacer el disco y las puntas redondas con arcos de SVG descuadró el lienzo entero
   (`viewBox -6 -28 1247 842`), porque `A rx ry rot flag flag x y` no son pares de coordenadas.
   Los círculos y los domos van con cúbicas.
