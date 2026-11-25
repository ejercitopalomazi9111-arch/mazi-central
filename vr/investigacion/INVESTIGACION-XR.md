# Investigación XR · 19 de noviembre de 2026

Pedido de Carlos: cómo mejorar el rastreo y los puntitos; qué problemas tuvieron las grandes empresas con cada visor,
lentes y sistema operativo, y cómo los resolvieron; qué enseñan las películas; cómo mejorar todo el sistema; y algo
«muy estilo Iron Man» con hologramas, guantes y maquetas.

**Regla de este documento:** sólo va lo que se encontró en una fuente (lista al final). Lo que no se pudo comprobar
dice «sin comprobar». Las cifras de ventas son estimaciones de terceros, no datos de las empresas.

---

## 0. Lo que cambia para nosotros (en corto)

1. **En Android, el 6DoF bueno ya existe en el navegador** (WebXR + ARCore en Chrome). Hay que usarlo cuando esté y
   dejar nuestro VIO sólo para iPhone. Es el salto más grande y el más barato.
2. **En iPhone, Safari sigue sin WebXR** (mediados de 2026; varias fuentes coinciden). La única vía para un 6DoF de
   nivel Apple es una app propia con ARKit. Ya sabemos empaquetar con Capacitor (CARYMO): se puede hacer igual para
   Mazi VR.
3. **Latencia antes que todo.** Oculus fijó el objetivo en menos de 20 ms y lo bajó con «time warp»: dibujar con la pose
   PREDICHA para el momento en que la imagen llega al ojo. Nosotros dibujamos con la última pose medida. Predecir con
   el giroscopio es poco código y quita mareo.
4. **Los puntitos tienen que significar algo.** Sólo pintar los puntos que se confirmaron en varios cuadros, con color
   por confianza, y avisar «pared lisa / poca luz» antes de que el rastreo se caiga.
5. **Seguridad: no repetir el error del límite fijo de Quest.** La crítica a Meta fue que el aviso llegaba hasta que ya
   te saliste. El nuestro avisa antes (pared a partir del 80 %), y así se queda.
6. **Manos: nada de brazos en alto.** Lo que más cansa es sostener la mano levantada («brazo de gorila»). Meta pone lo
   que se toca seguido más abajo y alterna toque directo (cerca) con rayo + pellizco (lejos).
7. **Iron Man sí va**, y se arma con lo que ya tenemos (manos de MediaPipe, sables con marco de la palma, agarre):
   un «Taller» con hologramas que se arman, se separan en piezas y se giran con las dos manos. Plan en §5.

---

## 1. Rastreo y puntitos: qué hacer

### Cómo está hoy (para no reinventar)

- Giro de cabeza: giroscopio del teléfono (rápido, nunca se pierde). Posición: nuestro VIO (visloc-rs en un
  trabajador), sumado por pedazos con filtros contra brincos, deslizamiento sin pasos y «coast» largo (`seis.js`).
- Ancla de cuarto con hoja ArUco (`ancla.js`), puntitos vivos y mapa por cubitos de 4 cm (`nube.js`), límites y zona
  (`limites.js`), manos estables (`manos-estables.js`) y sables con marco de la palma (`sable-mano.js`).

### Mejoras, en orden de lo que más se nota

| # | Qué | Por qué (de dónde sale) | Costo |
|---|---|---|---|
| R1 | **Android: usar WebXR `immersive-ar` (ARCore)** cuando el navegador lo ofrezca; nuestro VIO queda de respaldo | El 6DoF de ARCore es el de Google, con anclas, choque con superficies y profundidad. Chrome en Android, Quest y Vision Pro tienen WebXR; Safari de iPhone no | medio (sesión WebXR + adaptar cámara y mixta) |
| R2 ✅ | **Predicción de la pose** (hecha el 19 nov en `vr/prediccion.js`; prendida de fábrica, `?nopred` la apaga. Se apagó un rato por error: lo que se veía mal eran las manos) («time warp» casero): girar la vista con la velocidad del giroscopio por el tiempo que tarda en salir el cuadro (~16–30 ms) | Oculus: la latencia alta es mareo; su respuesta fue time warp y time warp asíncrono | bajo |
| R3 | **Puntos con confianza**: un punto entra al mapa sólo si se vio en ≥3 cuadros y su reproyección es chica; se pinta más tenue mientras es nuevo; los viejos que ya no se confirman se apagan | Hoy entra lo que el VIO ubique una vez: el «contorno de la cama» se ensucia con puntos sueltos | bajo |
| R4 ✅ | **Aviso de lugar difícil** (hecho el 19 nov: «Poca textura» con menos de 25 puntos vivos por 1.5 s) antes de perderse: si los puntos vivos bajan de un umbral, «Poca textura» o «Poca luz» en el HUD, y el color de los puntos cambia | Meta documentó que su rastreo sufre con luces de navidad y superficies difíciles; avisar antes es mejor que caerse | bajo |
| R5 | **Escala**: fijar la escala del VIO con algo de tamaño conocido (la hoja ArUco mide lo que imprimimos; o la altura de los ojos sobre el piso que ya calcula `limites.js`) | Una sola cámara no sabe el tamaño real: la escala se va desviando | medio |
| R6 | **Relocalizar**: al recuperar el rastreo, buscar la hoja ArUco o los puntos del mapa para volver al mismo lugar en vez de empezar de cero | Quest guarda mapas del espacio («Space Setup») justo para eso | medio |
| R7 | **iPhone nativo** (app con ARKit, empaquetada como CARYMO) para quien quiera el mejor 6DoF en iPhone | Sin WebXR en Safari, es la única vía a un rastreo de nivel Apple | alto (y pasa por App Store) |
| R8 | Evaluar **AlvaAR** (SLAM en WebAssembly, basado en ORB-SLAM2/OV²SLAM) como segundo motor | Existe y corre en el navegador, pero es **GPL v3** (obliga a abrir el código si se distribuye) y su último cambio fue en 2023 | medio; decisión de licencia |
| R9 | 8th Wall ya no es opción: el servicio cerró en febrero de 2026; abrieron el motor con MIT **sin** el SLAM (el SLAM sólo va en un binario cerrado) | — | no aplica |

---

## 2. Lo que les pasó a los grandes y cómo lo arreglaron

| Producto | Qué falló | Cómo lo resolvieron (o no) | Lo que aplicamos |
|---|---|---|---|
| **Nintendo Virtual Boy (1995)** | Dolores de cabeza y vista cansada; rojo y negro por costo; sin rastreo de cabeza; 22 juegos y se retiró en 1996 | No se resolvió: se canceló | Comodidad primero; nunca un efecto que cansa la vista por ahorrar |
| **Oculus Rift DK1 → DK2** | DK1 borroso al girar (persistencia alta) y sin posición: mareo | DK2: pantalla OLED de baja persistencia, 75 Hz, cámara infrarroja + sensor para la posición; objetivo de latencia menor a 20 ms; time warp | R2 (predicción). Y su consejo: que se pueda esquivar no significa que haya que obligar a moverse |
| **Oculus Insight (Quest)** | Rastreo sin cámaras externas; los controles se confundían con luces (navidad) | SLAM con varias cámaras y fusión de sensores; filtros contra manchas de luz | R4: avisar en lugares difíciles |
| **Quest · manos (Hand Tracking 2.0 / 2.1)** | Manos que se pierden al ir rápido o al cruzarse | 2.0 mejor con movimientos rápidos y manos encimadas; 2.1 mejor pellizco, menos pérdida y **predicción** de dónde va la mano | Predicción también para las manos; sostener la pose 0.3 s al perderla (ya está en los sables) |
| **Quest · límite (Guardian)** | El límite fijo nuevo avisa hasta que ya saliste (crítica de UploadVR) | Meta lo dejó como predeterminado; recomienda 2×2 m para moverse | Nuestro aviso empieza ANTES (80 % del radio); no cambiarlo |
| **HTC Vive / Valve Index (Lighthouse)** | Gran precisión, pero estaciones en la pared y configuración | La industria pasó a rastreo desde el visor por comodidad | Nada de hardware extra para el usuario normal (la hoja ArUco es opcional) |
| **Cardboard / Daydream (teléfono en visor)** | Calor, batería, meter el teléfono es fricción, pocos teléfonos compatibles; los visores autónomos los mataron. Carmack: si hay que sacar el teléfono de la funda, «lo usarás dos veces» | Google lo cerró en 2019 y abrió el código de Cardboard | ES NUESTRO CASO: entrar en 1 toque (el QR ya lo hace), sesiones cortas, cuidar el calor (bajar resolución de cámara si se calienta) |
| **PS VR2** | Pocos juegos propios, sin PC al inicio, ventas que bajaron | Adaptador para PC tarde y sin varias funciones | El contenido manda: MONARCH y las experiencias valen más que el motor solo |
| **Windows Mixed Reality** | Nadie lo adoptó; sin visores nuevos desde 2019 | Microsoft lo declaró obsoleto en diciembre de 2023 | No depender de una plataforma ajena (regla §2 de la casa) |
| **HoloLens / IVAS (Ejército de EE. UU.)** | Náusea, dolor de cabeza y vista cansada (más del 80 % de quienes los tuvieron, antes de 3 h); visión estrecha; el brillo delataba al soldado | Bajar el campo de 80° a 70°, arreglar humedad y caídas del software | Medir la comodidad en sesiones reales; el brillo y el contraste pueden molestar |
| **Magic Leap 1 → 2** | Prometieron de más; campo de visión de «baraja de cartas»; ventas muy abajo | ML2 duplicó el campo (~70°) y se fue a empresas | No prometer en el video lo que no hace el producto |
| **Google Glass** | Privacidad («glasshole»): nadie sabía si lo grababan; prometió de más en su video | Se fue a empresas (Boeing, DHL, GE) y se cerró en 2023; los lentes nuevos de Google no toman fotos ni video por privacidad | La cámara de la mixta nunca se guarda ni se manda; decirlo en pantalla |
| **Apple Vision Pro / visionOS** | Precio, peso e incomodidad; arranque lento; poco que hacer. La mirada + pellizco sí fue bien recibida; escribir largo no | Correa de otra marca y batería fuera de la cabeza ayudan; modelo M5 | Copiar lo bueno: mirada para apuntar, pellizco para elegir, efecto de «encima» discreto, contenido al nivel de los ojos, pocos saltos de profundidad |
| **Meta Ray-Ban Display + Neural Band (2025)** | Útil a medias; distrae; la pulsera EMG «increíble y rara»; pide intención clara | Gesto con la muñeca abajo, sin levantar la mano a la cámara | Lo mismo con nuestras manos: gestos que funcionen con la mano baja |
| **Meta Orion (prototipo 2024)** | Lentes AR caros de hacer | Carburo de silicio para ~70°; el cómputo en una cajita aparte; pulsera EMG; se quedó como prototipo interno | El calor y el cálculo pesado van FUERA de la cara (para nosotros: trabajadores de fondo y bajar carga) |
| **Samsung Galaxy XR / Android XR (2025–26)** | Reseñas mixtas («kit de desarrollo pulido»); en abril de 2026 una actualización metió una fuga de memoria que lo volvía lento a los 20–30 min | Arreglo de emergencia en unas semanas | Prueba de sesión LARGA (30 min) antes de publicar; medir memoria |
| **8th Wall (WebAR)** | Servicio de paga que cerró | Abrió el motor sin SLAM | Otra razón para tener nuestro motor |

**Sin comprobar en esta ronda:** Snap Spectacles, Xreal, Viture, Rokid, Even Realities, Pico, Varjo, Bigscreen, PS VR
(el primero), Gear VR, Quest Pro. Quedan para otra pasada.

### Las cinco lecciones que se repiten en todos

1. **Comodidad y mareo matan más productos que la falta de funciones** (Virtual Boy, DK1, IVAS, Vision Pro).
2. **Prometer de más en el video cobra caro** (Magic Leap, Glass).
3. **La fricción de entrar decide si se usa** (Cardboard/Daydream, Vision Pro tarda en arrancar).
4. **Sin contenido, el mejor hardware se queda en el cajón** (PS VR2, WMR, Vision Pro).
5. **Privacidad de la cámara desde el diseño** (Glass).

---

## 3. Películas: qué se toma y qué no

| Película | Qué enseña | Ojo |
|---|---|---|
| **Iron Man / Avengers** (Cantina Creative hizo los HUD; Perception, hologramas y la mesa de Stark) | Cada pantalla cuenta una historia; el holograma se arma por capas; capas de datos alrededor de un objeto principal | Es para CÁMARA: transparencias y brillos por todos lados cansan la vista en un visor (Apple pide pocos efectos de encima) |
| **Minority Report** (John Underkoffler, MIT; luego g-speak de Oblong, guantes, primer cliente Boeing) | Un vocabulario de gestos chico y constante; las dos manos para escalar y girar | Brazos arriba todo el rato cansa («brazo de gorila»); en su versión real el obstáculo fue el costo y la costumbre |
| **Ready Player One, Tron, Black Mirror, Her** | Sin comprobar en esta ronda; idea general: la inmersión total sin cuerpo, la voz como interfaz (Her) | Pendiente de investigar con fuentes |

**Lo que sí copiamos:** el armado por capas (malla de alambre → sólido), las piezas que «explotan» con líneas guía,
girar con las dos manos, un asistente de voz.
**Lo que no:** paneles flotando arriba de la cabeza, demasiadas transparencias juntas, textos chiquitos.

---

## 4. Mejorar el sistema completo (fuera del rastreo)

1. **Entrar en un toque** desde el QR directo a la experiencia (MONARCH ya lo hace); recordar ajustes.
2. **Sesión larga sin degradarse**: prueba de 30 minutos que mida cuadros por segundo y memoria (lo que le pasó a
   Galaxy XR).
3. **Calor**: si los cuadros bajan, bajar primero la resolución de la cámara y del dibujo, y avisar.
4. **Comodidad**: viñeta al moverse con el stick, giro por saltos (ya está), nada de movimiento que el cuerpo no hizo.
5. **Interfaz**: blancos de al menos 2.5–3° de tamaño y 12 mm entre ellos (guía de Meta); paneles entre 42 y 46 cm si
   se tocan directo; rayo + pellizco para lo lejano; nunca mirada y rayo a la vez.
6. **Privacidad**: la imagen de la cámara no sale del teléfono; un renglón que lo diga.
7. **Pruebas como persona**: un «niño de 4 años» para la VR (tocar todo, girar, tapar la cámara) como el de Puercos.

---

## 5. El Taller estilo Iron Man (plan)

**Qué es:** una vista nueva de Mazi VR («Taller»). En la mesa frente a ti aparece un holograma (motor, dron, la
monarca, un corazón de CARYMO) que se puede agarrar, girar, separar en piezas y volver a armar con las manos.

**Cómo se ve:** material de holograma propio (borde brillante según el ángulo, líneas que corren, parpadeo al aparecer),
en cian con acentos morados de la casa. Al aparecer se dibuja primero en alambre y luego se llena, de abajo hacia arriba.

**Los guantes:** al entrar, cada mano recibe su «guante»: segmentos de luz sobre los huesos de la mano (los 21 puntos de
MediaPipe) que se arman pieza por pieza, como el traje. Es interfaz, no ilustración (regla 1 de la casa); si se quiere un
guante de armadura con modelo, se busca uno libre en Sketchfab con crédito.

**Gestos (pocos y siempre iguales):**

| Gesto | Hace |
|---|---|
| Pellizco con una mano sobre una pieza | la agarras y la mueves |
| Pellizco con las dos manos | escalar y girar todo (separar o juntar las manos) |
| Abrir las dos manos de golpe | «explotar» en piezas, con líneas guía |
| Juntar las manos | volver a armar |
| Palma hacia arriba | menú en la palma (cambiar modelo, reiniciar) |
| Aventar una pieza hacia afuera | quitarla (vuelve con «armar») |
| Voz: «explota», «arma», «gira», «siguiente» | lo mismo sin manos (reconocimiento de voz del navegador; hay que comprobar en el iPhone) |

**Contra el brazo de gorila:** la mesa a la altura de la cintura, a 45 cm; el menú en la palma, no arriba; todo se puede
hacer también con el control y con la mirada.

**Modelos (no se hacen a mano):** paquetes libres de Kenney y Quaternius (CC0) y modelos con piezas separadas de
Sketchfab con licencia CC y crédito. Que el modelo venga en partes es requisito, si no, no se puede «explotar».

**Fases:**
1. Material de holograma + un modelo con piezas + agarrar/girar/escalar con dos manos.
2. Explotar/armar con líneas guía + guantes de luz.
3. Voz y menú en la palma.
4. Maquetas propias: subir un GLB y separarlo por piezas.

**Límites honestos:** con la cámara de un teléfono las manos se pierden fuera de su vista y con poca luz; el iPhone no
vibra desde una página (el control de PlayStation sí puede en algunos navegadores, sin comprobar en Safari).

---

## Fuentes

- AlvaAR: https://github.com/alanross/AlvaAR
- 8th Wall abierto sin SLAM: https://roadtovr.com/niantic-webar-platform-8th-wall-open-source/ · https://8thwall.org/blog/8th-wall-open-source
- WebXR y Safari: https://en.wikipedia.org/wiki/WebXR · https://threejsresources.com/webxr/browsers · https://immersion-3d.com/tech/webxr-getting-started/
- Oculus DK1/DK2: https://www.gamedeveloper.com/blogs/SergioHidalgo/20140729/222140/From_DK1_to_DK2_What_to_expect.php · https://www.pcgamer.com/evaluating-vr-performance-and-latency-with-futuremarks-vrmark
- Oculus Insight y manos: https://www.gamedeveloper.com/extended-reality/c-mon-and-slam-how-oculus-tackled-portable-6dof-tracking-for-the-quest · https://developers.meta.com/horizon/blog/optimizing-oculus-insight-controller-tracking-to-work-in-challenging-conditions-like-near-holiday-lights/ · https://developers.meta.com/vr/blog/hand-tracking-improvements-v2-1/ · https://uploadvr.com/quest-2-hand-tracking-2-0-upgrade/
- Límite de Quest: https://www.meta.com/help/quest/463504908043519/ · https://www.uploadvr.com/quest-new-boundary-system-is-a-dangerous-safety-regression/
- Lighthouse: https://uploadvr.com/how-vr-tracking-works/ · https://pimax.com/pose-tracking-methods-outside-in-vs-inside-out-tracking-in-vr
- Cardboard/Daydream: https://www.engadget.com/2019-10-16-google-kills-daydream-phone-vr.html · https://www.slashgear.com/1624183/why-google-cardboard-vr-discontinued
- PS VR2: https://uploadvr.com/psvr-2-first-anniversary-editorial · https://www.analyticsinsight.net/gaming/the-fall-of-playstation-vr2-what-went-wrong
- Windows MR: https://www.tomshardware.com/virtual-reality/microsoft-is-deprecating-windows-mixed-reality-it-will-be-removed-from-a-future-version-of-windows
- HoloLens/IVAS: https://www.engadget.com/microsoft-hololens-fails-us-army-tests-135010970.html · https://www.theregister.com/2022/10/13/us_army_report_microsoft_hololens/
- Magic Leap: https://techcrunch.com/2023/01/07/after-struggling-with-consumers-magic-leap-hang-its-hopes-on-enterprise · https://www.engadget.com/magic-leap-2-ar-headset-tech-dive-143046676.html
- Google Glass: https://spectrum.ieee.org/google-glass-not-dead-just-resting · https://www.slashgear.com/1057796/the-fascinating-true-story-behind-the-failure-of-google-glass
- Vision Pro: https://www.thedrum.com/news/2024/08/27/experts-reflect-the-apple-vision-pro-lessons-cost-comfort-and-marketing-strategy · https://www.macrumors.com/2025/05/16/vision-pro-buyers-feel-total-regret/ · https://daringfireball.net/2024/01/the_vision_pro
- Meta Ray-Ban Display: https://about.fb.com/news/2025/09/meta-ray-ban-display-ai-glasses-emg-wristband/ · https://www.aol.com/articles/meta-ray-ban-display-glasses-120000814.html
- Orion: https://www.meta.com/blog/orion-ar-glasses-augmented-reality/ · https://roadtovr.com/meta-orion-prototype-reveal-connect-2024/
- Galaxy XR: https://www.sammobile.com/news/galaxy-xr-slows-to-a-crawl-after-update-google-says-hotfix-is-absolute-top-priority/ · https://www.tomsguide.com/computing/augmented-reality/galaxy-xr-review · https://www.engadget.com/ar-vr/samsungs-galaxy-xr-doesnt-give-me-much-hope-for-android-xr-110000129.html
- Virtual Boy: https://en.wikipedia.org/wiki/Virtual_Boy · https://www.gamedeveloper.com/game-platforms/seeing-red-analyzing-the-pitfalls-of-the-virtual-boy
- Iron Man UI: https://www.creativebloq.com/3d/cinema-4d-secrets-iron-mans-interface-61515419 · https://www.engadget.com/2015-12-14-perception-ui-design.html · https://www.core77.com/posts/108437/The-Design-Firm-Behind-Those-Futuristic-User-Interfaces-in-the-Marvel-Cinematic-Universe
- Minority Report / g-speak: https://www.technologyreview.com/2011/04/22/195179/the-struggle-to-spread-the-minority-report-interface/ · https://news.mit.edu/index%2Ephp/2014/startup-oblong-industries-gesture-control-interface-0905
- Manos (guías): https://developers.meta.com/horizon/design/hands-ui-best-practices/ · https://developers.meta.com/horizon/design/hands-best-practices/
- visionOS: https://developer.apple.com/design/human-interface-guidelines/eyes.md · https://developer.apple.com/design/human-interface-guidelines/designing-for-visionos.md
- One Euro y MediaPipe: https://groups.google.com/g/mediapipe/c/3Xkewnq4_gU · https://ar5iv.labs.arxiv.org/html/2006.10214
