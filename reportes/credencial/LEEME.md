# Los logos de la credencial

| Archivo | Qué es | De dónde salió |
|---|---|---|
| `logo-acc.jpg` | Advanced Critical Care · el original que mandó Carlos | él |
| `logo-acc.png` | el mismo, **sin fondo** | derivado |
| `parche-fire-rescue.jpg` | el parche bordado, original | él |
| `emblema-fire-rescue.png` | el casco y las llamas, **sin fondo y sin el rótulo** | derivado |
| `escudo-ems.jpg` | EMS Paramedic · todavía no se usa, guardado para después | él |
| `qr-instagram.jpg` | el QR del perfil, puesto de base y cambiable | él |

## Por qué hay `.png` además del `.jpg`

Los originales son JPG con fondo blanco. Encima del azul marino de la credencial eso se ve como una
caja blanca. Se les quitó el fondo con **el canvas de un navegador sin cabeza** —la única
herramienta de imagen que hay en este contenedor— desvaneciendo el borde en vez de cortarlo, que es
lo que deja el diente de sierra al imprimir.

Los `.jpg` se conservan **como fuente**: si hay que volver a derivar el recorte, se parte de ellos y
no de una copia de una copia.

## Cómo se limpió el parche

El parche trae su propio rótulo —*ADVANCED CRITICAL CARE* arriba a la izquierda y *FIRE RESCUE*
abajo— y en el pie de la credencial estorba, porque la tarjeta ya lo dice con su tipografía.

**Recortarlo por CSS no servía:** el rótulo de arriba está **al lado** del casco, no encima, así que
ninguna ventana rectangular lo excluye sin comerse las llamas. Se midió el archivo y se borraron las
dos franjas del rótulo, y de ahí salió `emblema-fire-rescue.png`, que ya entra completo y se acomoda
con `background-size: contain` sin un solo número mágico.

Lo que se midió antes de borrar:

| | |
|---|---|
| Zona de color (casco y llamas) | x **17.8 – 81.4 %** · y **19.1 – 66.9 %** |
| Rótulo de arriba | no pasa de x **56 %** ni de y **31 %** |
| Rótulo de abajo | empieza después de y **67.5 %** |
| Aspecto del emblema resultante | **1.80** (832 × 463) |

## La medida de la credencial

De la imagen que mandó Carlos: **1.654** de alto sobre ancho, que da **63.5 × 105 mm**. Se puede
cambiar desde la pestaña **Credencial**, porque cada imprenta pide lo suyo.

## La tipografía

La credencial arranca en **Arial**, la de su diseño original, y **nunca** hereda la de Grupo Mazi.
Se elige desde la pestaña **Credencial → Lo que es igual en todas**, y ahí está Mazi como una opción
más para el día que la quiera.

> Cuidado con esto: la clase `.rotulo` es la de los rótulos de sección de la interfaz, que sí llevan
> la tipografía de la casa. Reusarla dentro de una tarjeta le cuela la letra de Mazi al diseño de
> alguien más. Ya pasó una vez.

## Llenar muchas de un jalón

**Pegar una lista** acepta una persona por renglón, con las columnas separadas por **tabulador**
—que es como pega una hoja de cálculo— o por **|**. Si la primera fila trae los nombres de las
columnas, se acomodan solas; si no, se toma este orden:

`apellidos | nombres | nivel | empleado | num | acred | sangre | alergias | tel | familiar | inicio | vence | otras`

Las acreditaciones extra separadas por coma se convierten en renglones.

## Cómo salen a la imprenta

**Cuatro por hoja carta**, con marcas de corte. Primero todos los frentes, luego los reversos **en
espejo por renglón**, para que al voltear la hoja por el lado largo cada reverso caiga sobre su
frente. Eso es lo que más se equivoca haciéndolo a mano y lo que más papel tira.

## La geometría, copiada del original

Tres cosas que Carlos corrigió mirando la tarjeta impresa, y que no se adivinan:

1. **Arriba el azul es un TRIÁNGULO de esquina**, no una banda que cruza toda la tarjeta. La roja
   corre en paralelo y sí llega hasta el borde derecho.
2. **Abajo es una recta y un triángulo**: el azul tiene el borde superior plano hasta poco más de
   la mitad y de ahí sube en diagonal a la derecha. La roja corre pegada a esa subida.
3. **Las bandas rojas no son rojo plano.** Llevan veteado azul encima —tres degradados suaves— que
   es lo que las hace ver impresas en vez de plásticas. Sin eso la tarjeta se ve barata y es lo
   primero que se nota.

Y bajo el logo va la **línea de pulso** roja, que es parte del candado de marca y no del archivo
del logo.

## Al imprimir

Safari en iPhone se queda con un margen propio que no se puede apagar. Sin encoger la hoja, cada
página arrastra una **página en blanco detrás**. Por eso todo lo que se imprime —hojas y pliegos de
credenciales— lleva un `zoom` de **0.86**, ajustable desde **Formato → Al imprimir**.

## Los cuatro detalles que Carlos corrigió mirando la impresa

Ninguno se adivina desde el código. Los cuatro cambian cómo se percibe la tarjeta:

1. **Las bandas rojas son cuñas, no listones.** La de arriba se adelgaza **hacia arriba** y la de
   abajo **hacia abajo**. De grosor parejo, la división entre el azul y el blanco queda dura; en
   cuña, suave.
2. **Abajo es una recta y un triángulo.** El borde superior del azul va plano hasta pasada la mitad
   y de ahí sube en diagonal a la derecha.
3. **La marca de agua es la estrella de la vida**, no una estrella cualquiera: seis brazos a 60° y
   la vara de Asclepio. La vara y la serpiente van **caladas en el color del fondo** — dibujadas del
   mismo blanco se pierden y parece una flor.
4. **El electro es rudo, no suave.** Estaba blando porque el SVG se estiraba con
   `preserveAspectRatio="none"`, y eso deforma el trazo. Ahora la raya es un `div` y el pico va en
   su propio SVG **con la caja al aspecto exacto de su viewBox** — si la caja es más ancha, el
   dibujo se centra dentro y deja un hueco visible entre la raya y el pico.

## La tipografía y la estrella

**Condensada por decisión de Carlos:** más delgada y más alargada, que se ve más seria. La pila es
`Arial Narrow → Helvetica Neue Condensed Bold → Liberation Sans Narrow`, con `font-stretch:condensed`
de respaldo. En el iPhone entra la de Helvetica. Se puede cambiar desde la pestaña.

**`estrella-vida.png`** sale de la imagen que mandó Carlos. La que él prefería —la del resplandor
azul— trae encima la marca de agua de un banco de imágenes, así que se tomó la versión limpia y el
resplandor se hace aquí: la estrella va en blanco y se desvanece en círculo con una máscara radial.

El archivo original venía con **fondo blanco opaco**, no transparente. Sin quitarlo, al aclararlo
por filtro toda la imagen se vuelve un rectángulo blanco — que fue exactamente lo que pasó en el
primer intento.

## Lo que falló en la imprenta · 30 de septiembre

Carlos llevó las credenciales a imprimir y: perdían calidad, **la estrella salía como un cuadro
negro**, el veteado azul de las bandas rojas salía en escalones, **los hexágonos no se veían** y a
la imprenta le tomó **horas** sacar una. Además el QR no se leía, la leyenda se veía aplastada y la
raya del electro no tenía el mismo grosor que el pico.

**La causa de los primeros cinco es una sola: transparencias.** El panal iba con `opacity`, el
veteado con degradados semitransparentes y la estrella con `opacity` más `mask-image`. En el PDF eso
queda como grupos de transparencia y máscaras suaves; la impresora tiene que «aplanarlos» —lento—, y
las que no saben pintan la máscara en negro. Se comprueba sin imprenta: `pdfimages -list` enseñaba
un `smask` pegado a la estrella.

**Lo que se hizo:**

| Qué | Cómo |
|---|---|
| Fondo (panal + bandas + veteado) | se pinta en un lienzo a **600 ppp** ya mezclado y va como UNA imagen opaca (`fondoCred`) |
| Estrella de la vida | se aplana una vez sobre el azul del reverso: opaca, sin máscara (`ESTRELLA_PLANA`) |
| Hexágonos | un tono más firme para papel: `#DCE1E9` a 0.16 mm (mezclado, el de antes era un 7 % de gris) |
| QR | **vectorial**, cuadros negros sobre blanco, generado del enlace. El de Instagram (puntitos en degradado + la arroba dentro) no lo lee ni un detector a tamaño impreso |
| Leyenda | letra de ancho normal; la condensada en un párrafo de seis renglones se ve apachurrada |
| Electro | la raya también es trazo de SVG, con la misma caja y el mismo viewBox vertical que el pico |
| Formato | **CR80 · 54 × 85.6 mm** (la credencial estándar de PVC) y **una cara por página a la medida exacta**. El diseño se arma a 63.5 mm y se escala entero, así no se apachurra |

Las pruebas están en `reportes/pruebas-credencial.mjs` § «Lo que salía mal al imprimir»: medida del
PDF, ninguna máscara en fondo ni estrella, mismo grosor en el electro, QR legible desde 300 ppp.
Necesitan `zbarimg` (`apt-get install zbar-tools`) y un servidor en 8791.
