# Referencias #3 · anuncios de producto formales

Lo pidió Carlos el 29 de octubre: *«2 publicidades super formales y profesionales con modelos 3D
existentes gratuitos, por ejemplo de computadora… busca animaciones chingonsísimas en la web y
revísalas frame by frame»*. YouTube y Vimeo no dejan bajar desde aquí; se bajaron 39 animaciones de
producto de Dribbble (búsquedas «laptop 3d animation» y «3d product animation tech») y se revisaron
cuadro por cuadro con `herramientas/tiraje.py` las seis más formales. Los videos son de sus autores y
no se suben; esto es lo que se aprende de ellos.

| Referencia | Qué hace, cuadro por cuadro | Dónde lo usamos |
|---|---|---|
| Laptop morada bajo persiana | Toma casi quieta, 10 s; una rendija de luz barre el piso y la pantalla tiñe la mesa | 14: la rendija y la luz de la pantalla |
| Laptop «Re—hex» | Arranca en la pantalla llena (la letra se arma con puntos) y la cámara **sale de la pantalla** hasta ver la laptop; luego cambia el color de acento en cada golpe | 14: entrar y salir de la pantalla |
| Anillo | Cortes secos cada ~1.7 s; el anillo queda **en el mismo lugar** y cambia el mundo (bosque, desierto, macro, lago) | 14: los cortes de continuidad (fondo vino, morado, negro) |
| Cargador | Una tela descubre el producto; luego **macros** de bordes y puertos, cada una con un solo deslizamiento lento | 14 y 15: las macros |
| Cámara de seguridad | Una tarjeta crece a pantalla completa; el objeto en silueta, **la luz se prende en ola**; al final se echa para atrás | 14: las teclas que se prenden; 15: la toma de los tres juntos |
| Laptop en cuarto de colores | Tomas de 3 s, cada una más cerrada que la anterior | 15: el orden de cada acto (macro → de frente → giro → entrar) |

## Las reglas que salieron

1. **Corte seco en el golpe**, nunca a la mitad del compás. Cada toma, un solo movimiento lento.
2. **El aparato entero se gana**: primero el detalle (borde, lente, teclado), después el todo.
3. **La luz cuenta la historia**: oscuro → rendija → teclas → pantalla.
4. **Letra chica y callada**: un renglón a la vez, entra de una máscara, sin rebote. Formal es eso.
5. **Nada de brillos de plantilla** (destellos, glitch): cansan y se ven baratos.

Se implementó en `marca/anuncios/formal.js` (tomas, renglones, cierre) y `estudio.js` (los aparatos).
