# La marca de Grupo Mazi

El logo original lo hizo Carlos hace 15 años. No queda el archivo ni contacto con quien lo pasó
a 3D, así que se reconstruyó: él generó candidatos con IA a partir de su memoria, eligió, y aquí
se convirtieron en vector real.

## Las piezas y de dónde salió cada una

| Archivo | Qué es |
|---|---|
| `fuente/plana-color-bueno.png` | La generación plana. **De aquí sale el ave** y de aquí salió el color exacto. |
| `fuente/opcion-4.png` | La opción 4, la más parecida al original. **De aquí sale el arco.** |
| `logo/paloma.svg` | La marca armada. Hoy apunta a la variante sólida. |
| `logo/paloma-finas.svg` | Plumas finas y muy divididas. La más elegante, la que peor aguanta el tamaño chico. |
| `logo/paloma-media.svg` | Intermedia. |
| `logo/paloma-solida.svg` | Masa sólida junto al cuerpo, plumas divididas sólo en el tercio exterior. |
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
  --fusionar "#21132D:#AD21ED" --cerrar "#AD21ED:6" \
  --minarea 120 --capas \
  --sinzona "1200,580,208,188"   `# la estrellita que dejó el generador` \
  --sinzona "575,435,90,120" --sinzona "745,435,90,120"  `# las comillas: Carlos las quitó` \
  --sinzona "430,55,560,205"     `# el arco de esta imagen, se reemplaza por el de la 4`

# 2 · el arco (de la opción 4)
node herramientas/vectorizar.mjs marca/fuente/opcion-4.png /tmp/arco.svg \
  --colores "#130E14,#010101,#F2F2F2,#9B34B4" --quitar "#130E14,#9B34B4" \
  --minarea 60 --capas --recortar \
  --solozona "#010101:250,20,300,150" --solozona "#F2F2F2:480,20,300,150"

# 3 · armar
node marca/armar.mjs /tmp/ave.svg /tmp/arco.svg marca/logo/paloma.svg --arco "660,285"
```

El `--cerrar` es la perilla de "qué tan lejos del cuerpo se dividen las plumas": 0 finas, 3
intermedias, 6 sólidas. El `--arco ancho,abajo` mueve y escala el arco.

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
