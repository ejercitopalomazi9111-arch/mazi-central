# Lo que aprendimos de los anuncios de Ugoki

Carlos lo pidió el 12 de noviembre: *«genera cada uno y velo cada 0.3 segundos para que aprendas de
esos videos»*. Se estudiaron los **23 anuncios** del panel «Try it now» de joinugoki.com, cuadro por
cuadro, uno cada 0.3 s:

- McDonald's, Waze, Google, Airbnb, Spotify, Uber, PAC-MAN y Booking;
- Burger King, Apple, WhatsApp, Porsche, Hermès, Figma y Red Bull;
- Shazam, Uniqlo, Mastercard, Decathlon y Air France;
- y los tres de Ugoki.

Además se midieron sus cortes y su volumen.

**Ojo con la licencia.** Son conceptos no oficiales hechos sobre marcas ajenas, así que **ni los videos ni
sus cuadros van en este repo**. Lo que se guarda aquí es el MÉTODO. Las hojas de cuadros se rehacen así:

```
curl -O https://www.joinugoki.com/media/car/15.mp4        # el número sale de const ADS en su página
ffmpeg -i 15.mp4 -vf "fps=10/3,scale=240:-1,tile=8x8" -frames:v 1 hoja.png
```

## Los números (medidos, no a ojo)

| Medida | Lo que dio |
|---|---|
| Duración | **14.5 a 17.5 s** todos (PAC-MAN 21 s). Ninguno pasa de 18 s |
| Formato | 1024×576, 60 cuadros por segundo |
| Cortes duros | **10 de 23 tienen CERO cortes**: Apple, Spotify, WhatsApp, Airbnb, Porsche, Red Bull, Waze, PAC-MAN y dos de Ugoki. Todo es UNA toma que se transforma |
| Los que sí cortan | Comida y deporte: Uber (0.9 s por toma), Decathlon (0.9), Burger King (1.1), McDonald's (1.3) |
| Volumen | **−15 a −18 LUFS** casi todos, que es volumen de red social. Los «de lujo» (Apple, Airbnb) van a −29: suaves a propósito |

Comparado con lo nuestro: los anuncios 01 a 03 duran de 30 a 70 s y cortan cada tanto. Estos dicen lo
mismo en 15.

## La fórmula: se repite en 20 de los 23

```
0.0–1.5 s   EL SÍMBOLO NACE        una mancha, un trazo o una línea se vuelve el logo (sin letras)
1.5–2.5 s   EL SÍMBOLO SE VUELVE   el logo se encoge y SE CONVIERTE en algo del producto:
            EL PRODUCTO            el botón de la app, el ícono del chat, el reloj
2.5–10 s    LA HISTORIA EN LA UI   alguien USA el producto: busca, toca, paga, llega.
                                   El producto es el protagonista; no sale ninguna persona
10–12 s     EL CLÍMAX              algo se multiplica (cuadrícula 2×2 → 4×4), explota o se acelera
12–13 s     EL REGRESO             todo se colapsa de vuelta al símbolo
13–15 s     LA FIRMA               el nombre sale DESDE el símbolo, de lado. La frase va palabra
                                   por palabra y la ÚLTIMA palabra va en el color de acento
última      EL BUCLE               el último cuadro es el primero: se puede repetir sin costura
```

## Los trucos, uno por uno

1. **Transformar en vez de cortar.** El ojo nunca pierde el hilo porque nada desaparece: se vuelve
   otra cosa.
   - Waze: la ruta se vuelve el muñeco.
   - Porsche: una sola línea dibuja el coche, luego el tacómetro y luego el escudo.
   - Hermès: el hilo de una aguja dibuja la silla de montar, la bolsa, la calesa y la mascada.
   - Apple: las burbujas de vidrio se vuelven el centro de control y luego la manzana.
2. **Un solo trazo que no se levanta.** Porsche, Hermès, Decathlon (un pulso de corazón que se vuelve
   el logo) y Waze. Para nosotros es oro: con un trazo se dibuja una casa, una bodega o la paloma.
3. **La UI como escenario.** No se cuenta el producto: se ve funcionando.
   - Airbnb, Booking, Uber y Waze: buscar, mapa, tarjeta, reservar.
   - McDonald's y Burger King: el kiosco, el ticket que sale y el número de orden.
   - Spotify: el reproductor y la letra.
   - WhatsApp: el chat con nota de voz.

   Va con interfaz DIBUJADA, limpia, sin capturas reales.
4. **Contar con números que corren.**
   - Spotify: 45 177 → 73 492 minutos.
   - Air France: la altitud de 0 a 11 000.
   - Decathlon: los BPM.
   - Uber: los minutos que bajan 4 → 3 → 2 → 1.
   - Porsche: las revoluciones.

   El número que gira se lee como emoción.
5. **Armar capa por capa con una palabra por capa.** McDonald's y Burger King arman la hamburguesa
   ingrediente por ingrediente: PAN, CARNE, QUESO... Cada capa entra con su palabra en grande, una cada
   0.3 s, al ritmo del sonido.
6. **La exageración como chiste.** En Booking los letreros de urgencia («quedan 2», «1 433 personas
   viendo») se van amontonando hasta tapar todo y rematan en «Plus que 0,5 chambre». Uber hace «Où
   allez-vous ?» con letra gigante que llena la pantalla.
7. **La cuadrícula que se multiplica.** Es el clímax de McDonald's, Burger King, Figma y Decathlon: un
   cuadro se parte en 4, luego en 16, con colores alternados.
8. **Cambio de paleta cada 0.3 s.** Hermès cambia los colores de la mascada y Figma los del póster, con
   el mismo dibujo y siete combinaciones seguidas. Da energía sin mover nada.
9. **El texto escrito como persona.** Muchos abren escribiendo en una barra de búsqueda, letra por
   letra y con cursor. Ugoki lo usa como marca: la barra de «prompt» aparece en casi todos.
10. **La firma.** Logo → el nombre sale deslizándose desde detrás del símbolo → frase corta (3 a 5
    palabras) que entra palabra por palabra → la última palabra en el color de acento: «Ici, c'est toi
    **le roi.**», «Venez comme vous **êtes.**», «Rien de grand ne se fait **seul.**».
11. **Fondos de UN color plano con un viñeteo suave**: el morado de Apple, el verde de Spotify, el azul
    de Decathlon. Nada de fotos de stock. El único que usa fotografía es Air France, y la mete dentro de
    la ventanilla del avión, como marco.

## Cómo se aplica a lo nuestro

- **Duración nueva de fábrica para redes: 15 s**, con la fórmula de arriba. El de 30 a 70 s queda para
  YouTube y la página.
- **La M cubo ya cumple el paso 1** (el símbolo nace). Falta que se **vuelva el producto**: la M se
  encoge y se vuelve el botón «Cotizar» de una página, la burbuja de un chat o el ícono de una app, y
  ahí empieza la historia en la interfaz.
- **Urban Pest:** un trazo que dibuja la bodega, luego la planta con sus trampas numeradas, luego la
  carpeta que se abre con el reporte firmado. El contador va de «0 plagas» a «auditoría aprobada». La
  firma es «Urban Pest · sin que se **note.**»
- **Para las barberías y los restaurantes, el armado por capas** (el truco 5): la navaja, el
  degradado, la línea, el corte terminado, cada uno con su palabra.
- **Sin cortes por defecto.** Si una escena no se puede transformar en la siguiente, ahí sí se corta.
  Pero el ritmo de comida (una toma por segundo) es la excepción, no la regla.
- **Volumen: −16 LUFS** para Instagram y TikTok. El motor ya normaliza en `armar.mjs`: se ajusta ahí.

## Para animar el logo (de la skill `logo-animation`, en la bodega)

Llegó el 12 de noviembre con los cursos que pasó Carlos, y cuadra con lo de arriba:

- **UNA técnica por logo**: que se dibuje con un trazo, que se arme por piezas o que se transforme. No las tres.
- **El remate dura de 0.8 a 2.5 s.**
- **El orden**: primero la base, luego los acentos y **al final el nombre**, para que el ojo termine en él.
- **Si hay sonido, el cuadro en que el logo queda quieto cae EXACTO en el golpe del audio.** Primero se escoge el
  audio y se busca el pico; después se acomoda la animación.
- **Nunca se deforma la marca.** Escalar y desvanecer sí; inclinar o aplastar casi nunca.
  - El «squash» que le pusimos a veces a la paloma va contra esto.
  - La regla de Carlos —«se tiene que NOTAR la M cubo volviéndose el cubo completo»— es una transformación, y
    entonces es la ÚNICA técnica de esa animación.
- **Siempre un cuadro final quieto** para «reducir movimiento» y para la portada.

Para un anuncio se montan de la bodega `animation-principles`, `logo-animation`, `beat-sync-editing`,
`shot-composition` y `motion-art-direction` (iart-ai, MIT), y se desmontan al terminar.
