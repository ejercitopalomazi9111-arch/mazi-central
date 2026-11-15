# Estudio para los videos del inversionista

Lo que se aplica en cada video. Sale de los clásicos de animación, de cómo trabaja el motion design
profesional, de lo que retiene en Reels/TikTok/Shorts y de la guía de sonido que subió Carlos
(Openverse + Real SFX + Earshot). Es de memoria y de lectura previa: se marca qué es regla de oficio y
qué es criterio nuestro.

## 1 · Movimiento (los 12 principios de Disney, Thomas y Johnston · *The Animator's Survival Kit*, Williams)
- **Anticipación**: antes de salir disparado, el elemento retrocede un poco (4–6 cuadros). Sin eso,
  un movimiento rápido se ve «brincado».
- **Acomodo con rebote (overshoot)**: llega, se pasa un 4–8 % y regresa. Es lo que hace que el 3D
  «se acomode» como pidió Carlos. Curva tipo `back.out(1.4)` o resorte.
- **Seguimiento y acción traslapada**: las piezas no se paran juntas; la cola llega 2–4 cuadros
  después que la cabeza (el logo vivo ya lo hace con resortes).
- **Arcos**: lo que viaja lejos va en curva, nunca en línea recta.
- **Entrada lenta / salida lenta**: nada se mueve con velocidad constante salvo lo mecánico.
  Entradas `expo.out`, salidas `expo.in`, y los cambios grandes en 12–18 cuadros.
- **Escalonado (stagger)**: listas y cuadrículas entran con 2–3 cuadros de diferencia y en la
  dirección en la que se lee.
- **Exageración con medida**: el *wiggle* va en los acentos (un sello que cae, una cifra que llega),
  no en todo; si todo tiembla, nada destaca.

## 2 · Motion graphics con intención (lo que pidió Carlos)
- **Cada línea llega a algún lado**: una línea que se dibuja conecta dos cosas (un problema con su
  herramienta, un año con un hito). Si no conecta nada, se quita.
- **Transiciones por coincidencia (match cut)**: la forma con la que termina una escena es la forma
  con la que empieza la siguiente (el círculo del logo se vuelve el botón de la app).
- **Jerarquía en el tiempo**: un solo protagonista por momento; lo demás espera o se atenúa.
- **Cámara quieta**: el movimiento lo hacen los elementos. Si acaso, un empuje lento (dolly 2–4 %)
  durante una toma larga.
- **Ritmo**: en piezas cortas, un cambio visual cada 1.5–3 s; en la historia larga, se respira
  más, pero nunca más de 5 s sin que algo cambie.
- **3D**: sólo modelos de calidad con HDRI y PBR. Si no hay uno bueno, se resuelve con 2.5D
  (capas planas con profundidad y luz), que se ve más caro que un modelo malo.

## 3 · Ganchos (lo que retiene en Reels, TikTok y Shorts)
- Los primeros **1–2 s** deciden. El gancho es visual **y** dicho a la vez, y sin logo al
  principio.
- Fórmulas que funcionan: **pérdida** («Perdimos todo en una noche»), **contraste** («Esto antes
  costaba $30,000. Ahora…»), **pregunta abierta** («¿Por qué una barbería necesita su propio
  sistema?»), **resultado primero** (enseñar lo terminado y luego cómo).
- **Bucles abiertos**: prometer algo que se resuelve al final («al final te enseño la que más
  vendemos»).
- **Subtítulos grandes** en el tercio de en medio: la mayoría ve sin sonido.
- **Final que regresa al inicio** cuando se puede: el video se repite solo y la plataforma lo
  cuenta como otra vista.
- Para el inversionista no es meme, pero tampoco folleto: ritmo de redes con acabado de marca.

## 4 · Sonido (la guía de Carlos + oficio)
- **Cada sonido tiene una función**: pop para aparecer, clic para tocar, *whoosh* para desplazar,
  impacto para llegar con peso. Lo decorativo que ya se entiende va sin sonido.
- **Whoosh**: la subida acompaña el movimiento y el **pico cae en la llegada**.
- **Pop, clic e impacto**: el primer ataque audible, exacto en el cuadro del evento.
- **Riser** (sube 1–2 s) antes de una revelación y **silencio de 0.3–0.6 s** justo antes del golpe:
  el silencio hace más que el volumen.
- La **voz manda**: la música baja durante las frases (*ducking*) y ningún efecto tapa una
  palabra; si choca, se baja el efecto, no se sube la voz.
- Fuentes: Openverse con **CC0** primero, CC BY sólo con crédito, nada «no comercial». Lo que no
  exista se genera aquí (`sala/sonidos/hacer.py`) y se apunta como generado.
- Mezcla a **−14 LUFS** integrados y pico real de **−1 dBTP**; se mide otra vez después de
  codificar y se revisa en mono (bocina de teléfono).
- Entrega: MP4, WAV de efectos sueltos, hoja de efectos (tiempo, archivo, volumen, fuente) y
  créditos.

## 5 · Lo que no se hace
- Nada estilo 2005–2012: biseles, brillos de plástico, transiciones de PowerPoint, letras que giran.
- Nada de 3D chafa, ni de emojis, ni de arte inventado donde existe uno real con licencia.
- No se nombran marcas ajenas (películas, plataformas, proveedores ni servidores).
