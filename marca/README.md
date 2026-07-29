# La marca de Grupo Mazi

El logo original lo hizo Carlos hace 15 años. No queda el archivo ni contacto con quien lo pasó
a 3D, así que se reconstruyó: él generó candidatos con IA a partir de su memoria, eligió, y aquí
se convirtieron en vector real.

## Las piezas y de dónde salió cada una

| Archivo | Qué es |
|---|---|
| `fuente/plana-color-bueno.png` | La generación plana. **De aquí sale el ave** y de aquí salió el color exacto. |
| `fuente/opcion-4.png` | La opción 4, la más parecida al original. **De aquí sale el arco.** |
| `logo/paloma.svg` | **La marca.** Negro real. Para fondo claro e impresión. |
| `logo/paloma-oscuro.svg` | Para fondo oscuro: el negro sube a `#4A4458` para que exista. |
| `logo/paloma-simple.svg` | Contornos más simplificados, para tamaños chicos. |
| `logo/arco-de-la-4.svg` | El arco solo, por si hay que recolocarlo. |

## Los colores, medidos de la imagen (no inventados)

| | hex | de dónde |
|---|---|---|
| violeta | `#AD21ED` | promedio de los 182 712 px violetas de la imagen plana |
| hueso | `#EAE5E3` | promedio de los píxeles claros |
| oscuro del arco | `#21132D` | muestreo de la mitad izquierda del arco |
| vacío | `#120C1A` | el fondo que eligió el generador, casi idéntico al `#100A18` de la casa |

## Cómo se reproduce

```sh
# 1 · el ave (de la imagen plana)
node herramientas/vectorizar.mjs marca/fuente/plana-color-bueno.png /tmp/ave.svg \
  --colores "#120C1A,#AD21ED,#EAE5E3,#21132D" --quitar "#120C1A" \
  --fusionar "#21132D:#AD21ED" --cerrar "#AD21ED:3" --pulir "#AD21ED:3" \
  --minarea 120 --capas --suave 2 \
  --sinzona "1200,580,208,188"   `# la estrellita que dejó el generador` \
  --sinzona "575,435,90,120" --sinzona "745,435,90,120"  `# las comillas: Carlos las quitó` \
  --sinzona "430,55,560,205"     `# el arco de esta imagen, se reemplaza por el de la 4`

# 2 · el arco (de la opción 4)
node herramientas/vectorizar.mjs marca/fuente/opcion-4.png /tmp/arco.svg \
  --colores "#130E14,#010101,#F2F2F2,#9B34B4" --quitar "#130E14,#9B34B4" \
  --minarea 60 --capas --recortar \
  --solozona "#010101:250,20,300,150" --solozona "#F2F2F2:480,20,300,150"

# 3 · armar
node marca/armar.mjs /tmp/ave.svg /tmp/arco.svg marca/logo/paloma.svg \
  --arco "560,252" --encima --barras "470,22,128,20"

# 4 · la versión para fondo oscuro
node marca/armar.mjs /tmp/ave.svg /tmp/arco.svg marca/logo/paloma-oscuro.svg \
  --arco "560,252" --encima --barras "470,22,128,20" --negro "#4A4458"
```

Las perillas y por qué están en ese número:

- **`--cerrar 3`** — qué tan lejos del cuerpo se dividen las plumas. 0 finas, 3 intermedias,
  6 sólidas. Carlos eligió 3.
- **`--pulir 3` + `--suave 2`** — el borde que sale del cierre viene escalonado y el trazador lo
  convierte en zigzag; Carlos lo describió como z-fighting alrededor de las plumas. El pulido es
  un filtro de mayoría que tumba los dientes sin mover la silueta. De paso el archivo baja de
  11 KB a 6.
- **`--encima` + `--arco 560,252`** — con el arco detrás, sus puntas asomaban por los huecos
  ENTRE las plumas y el arco parecía entretejido con el ala. Acortarlo sólo movía el problema:
  la punta seguía cortándose contra el ala, y para que dejara de pasar había que hacerlo tan
  chico que se leía como accesorio pegado. Encima, la punta se lee continua y se apoya donde el
  ala ya tiene masa.
- **`--barras 470,22,128,20`** — las dos líneas perpendiculares de la cintura. La altura no es a
  ojo: se midió el ave fila por fila y la cintura está en y=470, donde el cuerpo va de 675 a 732
  y el ala no vuelve hasta 833. Separadas 22 px del eje para que se lean como DOS y no como una
  barra atravesando el ave.
- **`--negro`** — el negro real desaparece en fondo oscuro: las barras y la mitad oscura del arco
  dejan de existir. La versión oscura lo sube a `#4A4458`, que conserva la dualidad
  oscuro/claro y sí se ve.

## Por qué el proceso es así, y no "dibújalo en código"

Se intentó primero: `original.mjs` genera el ave por geometría a partir de la descripción de
Carlos, con plumas, cola, estrella y arco paramétricos. **Quedó mal** y él lo dijo sin
anestesia. Dibujar una silueta orgánica a punta de números es pelear con la mano atada cuando
existe la vía buena: generar la imagen y vectorizarla. El archivo se queda porque la prueba de
tamaño y el andamiaje de comparación sirven.

Los tres problemas que costaron encontrar, para no repetirlos:

1. **El antialiasing se cuenta como un color.** La primera pasada sacó una capa fantasma de 309
   trazos que era puro borde. Se arregla pre-cuantizando a la paleta antes de trazar.
2. **El motor recentra la paleta.** Con varios ciclos de cuantización pedía `#AD21ED` y devolvía
   `#AC21EC`. Chico el corrimiento, pero rompe el descarte por color. Un ciclo.
3. **El tono intermedio del delineado, si se descarta, deja HUECOS.** Eran las rayas negras que
   cruzaban las alas: no eran contornos, era el fondo asomándose. Se fusiona con el violeta, no
   se descarta. Esta la cazó Carlos, no yo.
