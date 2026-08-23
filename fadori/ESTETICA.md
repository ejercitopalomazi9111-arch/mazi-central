# Fadori · el plan de la piel

> ✅ **EJECUTADO.** Este documento era el plan; ya está aplicado en `estilo.css`, `nucleo.js` y las
> cuatro pantallas. Se queda como la explicación de por qué cada color es el que es — y al final,
> en §9, lo que se hizo distinto de lo planeado y por qué.

---

## 1 · Por qué se cambia

Fadori nació con la piel de Grupo Mazi: violeta `#AC27FF` sobre morado casi negro. Está bien
para un estudio de software y **está mal para comida**, por dos razones distintas:

1. **No es de Carlos, es de la escuela.** Fadori no vende Grupo Mazi. Ponerle nuestra marca a un
   proyecto escolar confunde de quién es el trabajo.
2. **El violeta le quita apetito a la comida.** No es opinión: es la razón por la que ninguna
   cocina, ninguna panadería y ninguna carta de restaurante usa violeta. El apetito vive en la
   franja **rojo–naranja–ámbar**, y el morado es exactamente su opuesto en el círculo.

**Lo que se busca:** que al abrir la app te dé hambre antes de leer una sola palabra.

---

## 2 · La paleta

### Lo claro · el mundo del alumno y del menú

| Papel | Para qué | Hex |
|---|---|---|
| **Crema** | el fondo de todo | `#FDF8F0` |
| **Papel** | tarjetas y superficies | `#FFFDF9` |
| **Masa** | superficie hundida, campos, hover | `#F6EADA` |
| **Corteza** | líneas y bordes | `#E6D5BE` |

| Tinta | Para qué | Hex |
|---|---|---|
| **Café tinta** | todo el texto principal | `#2E1B10` |
| **Café tenue** | texto secundario | `#7A5A42` |

| Sabor | Para qué | Hex |
|---|---|---|
| **Naranja horneado** | el color de acción: botones, precios, lo tocable | `#C2410C` |
| **Naranja vivo** | fondos grandes y franjas, nunca texto chico | `#E8590C` |
| **Rescoldo** | fondo suave de acción, chips activos | `#FFE8D6` |
| **Dorado** | el acento de valor: "hoy", el destacado, filetes finos | `#8A6212` |
| **Dorado brillante** | **sólo decoración**, nunca texto | `#C8901E` |
| **Hierba** | listo, disponible, todo bien | `#3F6B23` |
| **Chile** | alerta, se acabó, adeudo | `#A62B1B` |

### Lo oscuro · la pantalla pública y el modo noche

No es el morado de Mazi: es **espresso**.

| | Hex |
|---|---|
| Fondo | `#1A0F0A` |
| Superficie | `#26160E` |
| Línea | `#3D2618` |
| Texto | `#F5E9DA` |
| Naranja de noche | `#FF8A3D` |
| Dorado de noche | `#E0A93C` |

### Los contrastes, medidos

No inventados — calculados sobre los hex de arriba:

| Par | Ratio | |
|---|---|---|
| Café tinta sobre crema | **15.51** | AAA |
| Rojo chile sobre crema | **6.66** | AA |
| Verde hierba sobre crema | **5.95** | AA |
| Café tenue sobre crema | **5.90** | AA |
| Dorado sobre crema | **5.18** | AA |
| Blanco sobre naranja horneado | **5.18** | AA |
| Naranja horneado sobre crema | **4.90** | AA |
| Blanco sobre naranja vivo | **3.58** | sólo texto grande |
| Crema sobre espresso *(pantalla pública)* | **17.79** | AAA |
| **Dorado brillante sobre crema** | **2.66** | ❌ **no se lee** |

> **La regla que sale de la tabla:** el dorado brillante `#C8901E` **nunca lleva texto encima ni
> es texto**. Es filete, es borde, es brillo. En cuanto alguien escribe una palabra en dorado
> brillante sobre crema, deja de leerse — y va a pasar si no queda escrito aquí.

---

## 3 · Cómo se reparte · 60 / 30 / 10

| Cuánto | Qué | Dónde |
|---|---|---|
| **60 %** | crema y papel | el fondo, las tarjetas, el aire |
| **30 %** | café y la foto de la comida | el texto y las imágenes, que son las que mandan |
| **10 %** | naranja y dorado | botones, precios, el destacado del día |

**El error a evitar es pintar de naranja media pantalla.** Naranja de área grande cansa la vista
en dos minutos y **compite con la comida**. El naranja tiene que ser lo que el ojo persigue, no
en lo que el ojo se ahoga. Si la pantalla se ve naranja, está mal hecha.

---

## 4 · Los seis detalles que dan hambre de verdad

El color solo no lo logra. Esto es lo que separa "una app naranja" de "una app que da hambre":

### 1 · El blanco NUNCA es `#FFFFFF`
Blanco puro es frío y **vuelve gris la comida** que va encima. Por eso el fondo es crema
`#FDF8F0` y las tarjetas son `#FFFDF9`. La diferencia se ve poquísimo aislada y se ve muchísimo
con una foto de comida al lado.

### 2 · Las sombras son café, nunca grises
`rgba(70, 40, 20, .12)` en vez de `rgba(0,0,0,.12)`. Una sombra gris debajo de una foto de comida
la ensucia; una sombra café la asienta. Es el cambio más barato de toda la lista y el que más se
nota.

### 3 · El texto es café profundo, no negro
`#2E1B10` en vez de `#000`. Negro sobre crema se lee clínico, de receta médica. Café sobre crema
se lee horneado. Mismo contraste, otra sensación.

### 4 · Cada categoría tiene el color de su comida, no un color de la paleta
Hoy los mosaicos de categoría salen de una lista de tonos bonitos. Deben salir **del alimento**:

| | Tono | De dónde sale |
|---|---|---|
| Plato fuerte | `#C2410C` | guisado, caldo |
| Antojitos | `#D98324` | masa dorada, aceite |
| Tortas | `#A8763E` | pan tostado |
| Dulces | `#B34A6B` | fruta, gelatina |
| Bebidas | `#3E7C8C` | **el único frío de toda la app**, y a propósito |
| Botanas | `#8A6212` | fritura, sal |

Las bebidas son el único acento frío. Eso las hace ver **frescas**, que es justo lo que se vende
de una bebida — y de paso rompe la monotonía cálida antes de que empalague.

### 5 · El dorado es filete, no relleno
Dorado en área grande = plástico dorado = barato. Dorado en línea de medio milímetro, en el borde
de la tarjeta del día, en el subrayado del precio = caro. **La regla: si el dorado ocupa más de un
5 % de la pantalla, quítalo.**

### 6 · La foto crece y el marco se encoge
El producto **es** la foto. La ficha del menú pasa de `4/3` a `1/1` en el listado y a `3/2` en el
destacado, el radio de la esquina baja de 16 a 12 px —esquinas muy redondas se leen a juguete, no
a comida— y el texto se aprieta debajo. Menos caja, más comida.

---

## 5 · Pantalla por pantalla

### El alumno · `index.html`
El cambio grande. Crema, café y naranja; foto grande; el precio en naranja horneado y el "hoy"
con filete dorado. La barra del pedido, que hoy es un vidrio morado, pasa a **papel con sombra
café** — se lee como una nota de la cuenta, que es lo que es.

### El mostrador · `mostrador.html`
**Aquí se cambia lo mínimo, y es una decisión, no una flojera.** Esta pantalla se usa con las
manos ocupadas y con sol pegando: **la legibilidad le gana al apetito**. Se queda clara y de
altísimo contraste, y lo único que cambia es que el azul `#1F5AE0` pasa a naranja horneado
`#C2410C` para que se vea de la misma familia. Los botones no se hacen más bonitos ni más chicos.

### La pantalla pública · `pantalla.html`
**Se invierte.** Fondo espresso `#1A0F0A` con números en crema: 17.79 de contraste, que es lo que
hace falta para leerla desde el otro lado del pasillo. Los listos en verde hierba. Sigue sin
mostrar un solo nombre.

### El medidor · `medidor.html`
Papel de reporte: crema, café, y la línea de la gráfica en naranja horneado en vez de violeta. Es
la pantalla que va a acabar en capturas dentro del reporte STEAM, así que tiene que verse como un
documento serio y no como una app.

---

## 6 · La tipografía

La de hoy es la del sistema y **no está mal**: es la que mejor se lee en un teléfono y no pesa
nada. Lo que cambia no es la fuente, es cómo se usa:

- **Los títulos, más apretados y más grandes.** `letter-spacing:-.03em` ya está; súbelos de peso
  a 800 y de tamaño un escalón.
- **Los precios en cifras tabulares** (`font-variant-numeric: tabular-nums`) para que una
  columna de precios quede alineada. Ya está en los turnos; falta en el menú.
- **Nada de mayúsculas en frases largas.** Las etiquetas de las cifras hoy van en versalitas con
  `letter-spacing`, y ahí sí funciona. En un nombre de platillo, no.

**Si un día se quiere carácter de verdad**, el lugar es **una sola palabra**: el logotipo
"Fadori" en una serif con remates gruesos, tipo rótulo de fonda. Una fuente titular en todos los
encabezados se ve amateur; una fuente titular en el nombre y nada más se ve hecho por alguien.

---

## 7 · Lo que NO se hace

| No | Por qué |
|---|---|
| **Fotos de stock de comida** | son de otro país y de otra cooperativa. Se ve falso al segundo. Las fotos las sube la cooperativa desde su pantalla |
| **Texturas de madera o de mantel** | es el cliché número uno de las apps de comida y ensucia el fondo detrás de las fotos |
| **Degradados naranja de pantalla completa** | cansan y compiten con la comida |
| **Emoji como identidad** | los mosaicos con emoji son un **relleno mientras no hay foto**, no el diseño. En cuanto haya fotos reales, desaparecen |
| **Modo oscuro en la pantalla del alumno** | el menú se ve mejor en claro, y dos pieles que mantener no valen la pena en un proyecto escolar |

---

## 8 · Cuánto cuesta

Casi todo vive en las variables de `:root` en `estilo.css`, así que:

| Paso | Qué se toca |
|---|---|
| 1 · La paleta | las variables de `:root` y de `body.mostrador` |
| 2 · Las sombras café | tres reglas de `box-shadow` |
| 3 · Los tonos de categoría | `CATEGORIAS` en `nucleo.js` |
| 4 · La ficha del menú | `.plato` en `estilo.css` |
| 5 · La pantalla pública invertida | `body.publica` |

Los pasos 1 y 2 **solos ya cambian la sensación de la app entera**, y son los más baratos. Si el
tiempo se acaba a la mitad, se acaba después del 2 y se ve bien.

---

---

## 9 · Lo que salió distinto del plan

Dos cosas cambiaron al construirlo. Van escritas porque un plan que no se corrige con lo que se
ve en pantalla no sirve de nada.

### El mosaico de categoría va **lavado**, no saturado

El plan decía "cada categoría tiene el color de su comida" y daba los tonos. Aplicados **a saturación
completa**, un menú sin fotos queda como un muro de naranja — que contradice la regla del propio §3:
*si la pantalla se ve naranja, está mal hecha*. Los tonos son los mismos, pero se mezclan con crema
al 84 % y al 66 % para el degradado. El color sigue diciendo de qué es cada cosa y deja de competir
con la comida.

Y el destacado lleva **tope de altura** (200 px). Sin tope, la tarjeta del día a `3/2` en una
pantalla de teléfono se come el doblez completo.

### El blanco del mostrador se entibió

El plan decía "lo único que cambia es que el azul pasa a naranja". Se cambió también el gris azulado
`#F4F6FA` por un hueso `#F7F3EC`, porque con el blanco frío la pantalla de la cooperativa se veía de
**otra app**. El contraste no se tocó: subió de 16.16 a **16.65**. Los botones siguen de 56 px y
siguen sin adornos: ahí la legibilidad le gana al apetito, y eso sí se respetó completo.

---

*Fadori · Grupo Mazi · estética · planeada y ejecutada el 22 de agosto de 2026*
