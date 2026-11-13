# CARYMO · lo que pidió Carlos el 13 de noviembre (segunda tanda)

> **Para quien me releve** (Luna o quien sea). Lo hace Sylcred en la rama `claude/juego-oregon-3kmicc`, PR #348.
> Si me quedo sin uso, sigue en el orden de abajo. Palomita aquí y en el tablero del Pizarrón de La Sala
> («CARYMO · segunda tanda (13 nov)»); el aviso va en el chat de GRUPAZ.
> Carlos ya dio su sí para **publicar** («Publica…»): fusionar a `main` y publicar el servidor de la sala
> (`cd sala/servidor && npx wrangler deploy`, con la llave de Cloudflare en `/tmp/claude-0/llave-cloudflare`).

## Ya hecho en la rama (falta publicar)
- [x] Abajo, sólo tres pestañas: Estudiar, Comunidad y Tú. En Tú, la mascota a la vista y botones a todo lo demás.
- [x] La clase en el pizarrón sin estorbo: la cabecera de «Ya la vi» se dobla; abajo, atrás, play y siguiente, y lo demás en «más».
- [x] Apuntes por carpetas, primero por tipo y luego por materia, y en el horario la línea de cuánto falta para el examen.
- [x] Avisos con notificación, 10 sonidos nuevos, racha con amigos, personaje de perfil con ropa, y las mascotas sin voz.

## Lo nuevo, en orden

1. **Publicar** lo de arriba (fusionar el #348 y publicar el servidor de la sala).
2. **Arreglos rápidos**
   - Que la mascota no vuelva a saludar cada vez que cambias de pestaña: una vez por visita.
   - La barra de controles de la clase, más redonda: los botones sólo con contorno, y que crezca cuando hace falta.
3. **La estética**. «Te estás alejando mucho»: volver a las 113 capturas de Knowunity, que están en el banco de La Sala, carpeta «Referencias Knowunity» (resumen en `sala/RELEVO-LUNA.md`). Rehacer con eso Tú, Horario, Apuntes y el vestidor:
   - tarjetas grandes y redondas;
   - colores sólidos de la casa;
   - títulos grandes;
   - iconos en círculos de color.
4. **Sin internet, desde que abres la app**
   - Un trabajador de fondo «primero la red, si no, lo guardado» (nunca «primero lo guardado»: ver la neurona de INKWELL), que guarda la app entera.
   - Lo que ya está en el teléfono funciona sin red: el plan, las lecciones, las cátedras ya hechas, los apuntes y el cuarto de la mascota. Lo que se hace sin red se manda cuando vuelve.
   - **Cátedras hechas de antemano**: al crear un plan, en segundo plano, se preparan las clases del pizarrón (al menos la base) y se guardan en el teléfono. Si el alumno le cambia algo, eso ya gasta.
5. **Mascotas: adoptar y coleccionar** (economía «chingona»)
   - Al crear tu cuenta adoptas una de las cuatro básicas: perrito, gatito, paloma o tigre blanco.
   - Las demás llegan después, por progreso: se «abre» un regalo y llega la siguiente a tu colección. Se cuidan entre todas.
   - Tu adoptada es la principal y las demás son tus instructoras.
   - Al entrar, y en momentos clave como subir de grado o terminar un plan, entran todas persiguiéndose para ponerte a estudiar.
6. **Copas de ligas** (Luna ya iba con las ligas: coordinar con ella)
   - Varias copas; cada una abierta ciertos días y con cupo limitado.
   - Si te bajan, tu copa se destruye; si subes, desbloqueas la siguiente.
   - Cada copa abre la compra de distintos accesorios. De regalo, sólo unos 3 por categoría; lo demás se compra.
7. **Modo diálogo con un amigo** (mismo plan)
   - Una lección conjunta: un diálogo o explicación con huecos, y cada quien llena los suyos con palabras dadas.
   - Al final sale lo que «dijeron» los dos (con lo chistoso de los errores), luego la versión correcta, y calificación para ambos.
   - Sirve para idiomas y para todo.
8. **Grupo del salón**
   - Los del salón se unen a un grupo.
   - Ahí se suben apuntes y material importante, que luego se usan al crear planes.
   - Tareas con aviso al teléfono.
9. **Bitácora de desarrollo (devlog)**: en la pantalla de inicio, medio escondida, que no estorbe. Todo el progreso y por qué se creó cada cosa.
10. **Para el artista**: lista de cómo entregar las mascotas, pieza por pieza. Ya va en el mensaje de Sylcred a Carlos (y aquí abajo).

## Fuera de CARYMO
- Spotify: sumar a «Me gusta» de Carlos las ~90 rolas de sus capturas de «Guardado» (13 nov).

## Para el artista: cómo entregar cada mascota
- **Formato:** SVG, o PNG de 2048 px con fondo transparente; cada pieza en su capa o en su archivo, con el nombre de la pieza.
- **Una lámina armada** de cómo se ve completa, de frente y en pose neutra, más una de 3/4 si se puede.
- **Piezas separadas, cada una completa** (lo que queda tapado también se dibuja, para que al moverse no se vean huecos):
  - cuerpo o torso;
  - cabeza;
  - cada oreja;
  - cola;
  - cada brazo o ala, partido en la articulación (hombro → codo → mano);
  - cada pierna o pata (cadera → rodilla → pie);
  - pelitos o mechones sueltos que se muevan aparte;
  - panza o mancha, si va encima del cuerpo.
- **La cara, por partes:**
  - ojo abierto, ojo cerrado y ojo feliz (arco), cada uno para izquierdo y derecho;
  - pupila y brillo aparte;
  - cejas;
  - boca neutra, sonriendo, abierta, triste y sorprendida;
  - cachetes.
- **El punto de giro de cada pieza** (hombro, codo, cadera, base de la cola, cuello), marcado con un puntito en una capa aparte.
- **Sombra** de piso aparte, y sombras o brillos del cuerpo en su propia capa (no pegados al color).
- **Colores en hexadecimal**, y el contorno, si lleva, del mismo grosor en todas las piezas.
