# MAZI XR · ENGINEERING_LOG

Un obstáculo por entrada. Se agrega abajo; no se reabre una investigación que ya está aquí, se continúa.
Niveles de prueba: **documentado** · **implementado** · **probado en navegador** · **probado en iPhone** · **medido**.

---

## 001 · 6DoF en iPhone desde la web (19 nov 2026)

- **Función:** caminar por el cuarto y que lo virtual se quede en su lugar del mundo.
- **Problema:** Safari en iPhone no trae WebXR (`immersive-ar`) → la web sólo tenía orientación (3DoF).
- **Tipo (§4):** B/D. El hardware puede (cámara + IMU); el navegador no lo da hecho, pero una librería lo calcula sin esa API.
- **Rutas estudiadas:**

| Ruta | Qué es | Licencia | iPhone Safari | Veredicto |
|---|---|---|---|---|
| **visloc-rs (VIO en WebAssembly)** | cámara + giroscopio + acelerómetro → pose métrica | MIT / Apache-2.0 | su demo dice «live on a phone» | **elegida** |
| AlvaAR | SLAM visual en WebAssembly | **GPL-3.0** | sí | sólo cámara (la IMU estaba «en su hoja de ruta»); GPL obligaría a abrir MAZI XR |
| Zappar Instant World Tracking | WebAR comercial | términos de Zappar | sí | depende de su ecosistema y licencia |
| 8th Wall | motor WebAR | framework MIT, SLAM en binario aparte | sí | el SLAM no es abierto |
| ARKit nativo | app de iPhone | — | no es web | queda como **comparación** (are/MaziXR.swiftpm) |

- **Hecho:** su página VIO completa vive en `vr/espacial/` (copia fiel, MIT/Apache, licencias incluidas, telemetría apagada) más lo de MAZI encima:
  - **modo Visor:** dos ojos (IPD 63 mm, campo 80°) con la pose 6DoF; sin la imagen de la cámara (la cámara sigue rastreando);
  - **objetos anclados al mundo** al aparecer el cubo: piso de 4×4 m, cuatro postes y una «tele»; viven en coordenadas del mundo del VIO (z arriba), así que al caminar cambia la cámara, no los objetos.
- **Prueba (`vr/pruebas-espacial.mjs`):** con la caminata grabada de un iPhone que trae la demo (ADVIO, CC BY-NC: NO va en el repo):
  - el VIO llega a «track»;
  - la cámara recorre 0.7 m en 6 s y lo anclado no se mueve ni una milésima;
  - el visor pinta lo anclado en los dos ojos (118 y 118 pixeles morados);
  - sin errores.
- **Nivel:** probado en navegador con datos reales de iPhone. **Falta: iPhone físico en vivo** (permisos, deriva, luz, desenfoque).
- **Limitaciones abiertas:**
  - La cámara trasera no está entre los ojos → hace falta el desplazamiento fijo cámara→ojos (calibración).
  - La deriva no se ha medido en vivo.
  - Las posiciones no se guardan entre sesiones (eso pide mapa + relocalización, etapa aparte).
  - Al girar el teléfono el VIO se reinicia: hay que arrancar ya en horizontal, dentro del visor.
- **Siguiente:** que Carlos lo abra en el iPhone y diga si el cubo se queda quieto al caminar → luego meterlo como «Mixta 6DoF» dentro de Mazi VR.

## 002 · El giroscopio del DualShock 4 desde Safari (19 nov 2026)

- **Función:** que el control tenga su propia orientación (y luego posición) para apuntar.
- **Problema:** la Gamepad API de Safari da botones y palancas, **no** los sensores.
- **Tipo (§4):** B. El control sí trae giroscopio y acelerómetro; Safari no los expone.
- **Rutas:**

| Ruta | Estado |
|---|---|
| Gamepad API | sin sensores en Safari (probado con el control de Carlos: botones sí, giro no) |
| WebHID (`@hcodes/webhid-ds4` lee giro y acelerómetro) | Safari iOS no tiene WebHID |
| Web Bluetooth | Safari iOS no tiene Web Bluetooth |
| **App nativa como puente**: GameController lee `GCMotion` y lo pasa a la web por un socket local | la parte nativa **ya compila** (`are/`, Hito 01); falta el puente |
| **Marcador óptico en el control** (ArUco/AprilTag) con la misma cámara trasera | `js-aruco2` (BSD, JavaScript puro, trae pose) → **siguiente prototipo**: da POSICIÓN, que el giroscopio nunca da |
| Fusión giroscopio + marcador | después de tener las dos fuentes |

- **Decisión:** primero el **marcador óptico** (es 100 % web y da posición). El puente nativo queda como segunda fuente para la fusión.
- **Hecho (19 nov): marcador ArUco en el control** (`vr/espacial/control.js`, hoja para imprimir en `vr/espacial/marcador.html`):
  - detector js-aruco2 (BSD) sobre la misma imagen de la cámara, 12-15 veces por segundo;
  - pose propia con perspectiva completa: homografía → Gauss-Newton sobre el error de reproyección;
  - esquinas afinadas a fracción de pixel (paso claro→oscuro más cercano al lado, parábola, recta por mínimos cuadrados);
  - al mundo con la pose del VIO: `T_mundo_marcador = T_mundo_cámara · T_cámara_marcador`;
  - modelo del DualShock, rayo de 3 m que se pone blanco cuando le pega al cubo o a la tele, y botón **Calibrar**;
  - sin marcador no hay pose: dice «sin marcador» o «perdido», nunca inventa.
- **Medido (`vr/pruebas-marcador.mjs`, marcador de 4 cm dibujado en poses conocidas):**

| Paso | Peor posición | Peor giro |
|---|---|---|
| POSIT (de la librería) | 10.7 % a 70 cm | 3.8° |
| Homografía + Gauss-Newton | 7.8 % a 70 cm | 2.8° |
| + esquinas a fracción de pixel | **2.6 % a 70 cm** | **≤ 2° (inclinado)** |

  - **Limitación medida:** visto DE FRENTE, la inclinación se lee hasta 6.6° mal (con un marcador plano casi no hay perspectiva que la delate). El eje del RAYO queda en 2.6° aun así. Con el marcador inclinado, como queda encima del control al sostenerlo, el error es de 0.1° a 2°.
  - Mitigaciones pendientes: marcador de 6 cm (la hoja ya lo trae), varios marcadores (un cubo), y sumar el giroscopio por el puente nativo.
- **Nivel:** pose probada contra la verdad en navegador; integrado y probado sin marcador en la caminata. **Falta: el DualShock real con el marcador impreso, en el iPhone.**
- **Nunca:** integrar dos veces la aceleración para sacar posición (deriva en segundos).

## 003 · Botones con la mano (19 nov 2026)

- **Problema:** «casi agarro el botón y no sale».
- **Causa:** cerrar la mano se leía como puño, no como clic.
- **Hecho:** cerrar la mano sobre un botón = clic (`vr/pruebas-agarrar.mjs`).
- **Probado y revertido:** imán de 5° alrededor de los botones. Carlos: «estaba mejor antes del imán».

## 004 · La app nativa salía «verde» sin código (19 nov 2026)

- **Problema:** XcodeGen tomó la carpeta `MaziXR.swiftpm` como recurso: .ipa de 14 KB, compilación «exitosa».
- **Arreglo:** fuentes carpeta por carpeta, y la compilación falla si el binario pesa menos de 100 KB o no trae `DiagnosticView`.
- **Nivel:** compila en la Mac de GitHub. **Sin instalar en iPhone todavía** (camino: SideStore, `are/INSTALAR.md`).

## 005 · Pruebas de la VR sin tarjeta gráfica (19 nov 2026)

- **Problema:** con el Tem Shop, el Chromium de pruebas bajó a 7 cuadros por segundo y perdía botones de 80 ms.
- **Arreglo:** las pruebas de tiempos corren con el fondo simple; el Tem Shop tiene su prueba propia.
- **Pendiente:** medir el Tem Shop en el iPhone.

## 006 · El 6DoF en el iPhone de verdad, y dentro del motor (19 nov 2026)

- **Medido por Carlos en su iPhone 13 (`/vr/espacial/`):** el cubo se queda en su lugar casi siempre; **a veces se desliza lejos «al azar»**. Él mismo lo atribuye a que mapeó en una zona muy difícil. Primer resultado en aparato real: **funciona, con deriva en zonas pobres**.
- **Decisión de motor:** el 6DoF ya no vive sólo en su página. `vr/espacial/vio.js` es el VIO de visloc-rs **sin interfaz**, usando LA MISMA cámara del motor (en el iPhone abrir la cámara dos veces calla la primera). `vr/seis.js` convierte la pose de la cámara a dónde están tus ojos. Se prende en Mazi VR → Ajustes → 6DoF.
- **Diseño del filtro (`vr/seis.js`):**
  - el GIRO sigue saliendo del giroscopio (60+ por segundo, nunca se pierde); del VIO sólo la POSICIÓN;
  - la posición se suma por pedazos, girados al marco del giroscopio con un ángulo que se acerca despacio;
  - rastreo perdido → te quedas donde estabas, y al volver no te teletransporta aunque el VIO cambie de origen;
  - brinco de más de 30 cm entre cuadros → se tira;
  - **deslizarse sin dar pasos** (VIO > 35 cm/s y el acelerómetro sin pasos) → se tira lo horizontal: es el caso que vio Carlos;
  - «coast» (sin puntos de cámara) más de 0.3 s → se tira;
  - desplazamiento cámara→ojos: ESTIMADO para iPhone 13 (5.3 cm, 1.8 cm, 6 cm), sin medir.
- **Pruebas:** `vr/pruebas-seis.mjs` 10/10 (caminatas inventadas con la verdad conocida: girar en tu lugar no te mueve, brincos, desliz, pérdida, coast); `vr/pruebas-seis-motor.mjs` con la caminata real de iPhone (ADVIO): el motor llega a «track», tus ojos recorren ~1 m en 6 s y el menú no se mueve ni una milésima.
- **Nivel:** probado en navegador con datos reales de iPhone. **Falta:** que Carlos lo pruebe dentro de Mazi VR y diga si el desliz bajó.
- **Limitación honesta:** el freno al desliz es una regla, no magia. Si el VIO se va DESPACIO (menos de 35 cm/s) estando parado, o se va mientras caminas, todavía se nota. La cura de fondo es un mapa con relocalización (cerrar el ciclo), etapa aparte.
- **Siguiente para Android:** WebXR `immersive-ar` en Chrome con ARCore daría un 6DoF mucho más firme que el VIO web; se dibujaría nuestro estéreo encima. Por investigar y probar en un Android real; no se promete.

## 007 · Botones que sólo funcionaban una vez (19 nov 2026)

- **Síntoma (cazado por la prueba del modo exposición):** sin control conectado, Opciones con el teclado sacaba a Inicio una vez y luego ya no.
- **Causa:** el arreglo de botones del cuadro se llenaba con huecos (`ahora[i] = true` sólo para lo apretado); `map` y `forEach` se saltan los huecos, así que `antes[i]` se quedaba en «apretado» para siempre.
- **Alcance real:** también los gestos de las manos sin control (la palma que abre el menú) funcionaban UNA vez.
- **Arreglo:** el arreglo nace lleno de falsos (`new Array(17).fill(false)`).

## 008 · Modo sin visor y modo exposición en el motor (19 nov 2026)

- **Sin visor:** una sola vista, el teléfono es una ventana que se mueve con el giroscopio y **tocar** un botón lo elige; mirar fijo NO elige (abría «Leer» solo al entrar). Con visor, tocar la pantalla equivale a X (el botón de los visores de cartón toca la pantalla).
- **Exposición (`kiosco`):** Opciones, PS y Triángulo no sacan de la experiencia; la salida del docente la pone cada experiencia.
- **Prueba:** `vr/pruebas-seis-motor.mjs` (tocar «Leer» lo abre; nada se abre solo; en exposición Opciones no saca y fuera sí).

## 009 · Errores que dicen qué, dónde y cuándo (19 nov 2026)

- **Pedido de Carlos:** «que el código de error sea tan claro que sepas exactamente dónde falló, cómo y cuándo».
- **Hecho (`fallo()` en `vr/vr.js`):** código (E-MOTOR, E-VISTA, E-CUADRO, E-6DOF, E-6DOF-VIO, E-CAMARA, E-PAGINA, E-PROMESA) + pieza y función o archivo:línea + mensaje + hora, vista y segundos desde que abriste. Sale 5 s en el visor, en la consola y se guarda: la pantalla de entrada enseña el último. Una vista que truena ya no tumba el motor entero.
- **Pendiente sabido:** en `pruebas-lector.mjs`, «L2 + sticks» midió 22.9° contra 25° pedidos (prueba de tiempo en un Chromium sin tarjeta gráfica). No se confirmó si ya pasaba antes; Carlos pidió no gastar más tiempo ahí.

## 010 · El ancla del cuarto: corregir la deriva con una hoja impresa (19 nov 2026)

- **Problema:** el 6DoF por cámara se va desviando poco a poco; en zonas con poca textura se nota rápido (lo que vio Carlos). El filtro de 006 frena los deslices absurdos, pero no regresa lo que ya se fue.
- **Rutas consideradas:** mapa con relocalización (cerrar el ciclo; es la cura de fondo, pero el VIO web no la trae: etapa aparte), ARKit nativo (necesita instalar la app), y **un punto fijo conocido en el cuarto**: una hoja impresa con un marcador ArUco. Se eligió la hoja porque es 100 % web, se puede hacer hoy y además sirve para dejar cosas en el mismo lugar entre sesiones.
- **Hecho (`vr/ancla.js` + `vigilarAncla` en `vr/vr.js`):**
  - con 6DoF prendido, 4 veces por segundo se busca la hoja (ArUco id 1, 14 cm; el control usa el id 0);
  - la primera vez que se ve, se guarda dónde quedó; después, si se ve corrida, se mueve tu cuerpo para cancelar la mitad de la diferencia cada vez (sin brincos);
  - sólo con buena lectura: reproyección < 1.5 px, a menos de 3 m, la hoja de más de 40 px y la cabeza casi quieta;
  - **el giro sólo se corrige con lecturas confiables**: una hoja plana vista de frente no delata hacia dónde mira (8.6° de error medido, con la posición a 4 mm). Se toma el giro si la hoja está acostada en el escritorio (su giro en el plano sí se lee bien) o si la pared se ve de lado (más de 25°). La posición, siempre.
- **Medido (`vr/pruebas-ancla.mjs`, 8/8):** pared de lado a 1.4 m: 1.7 cm y 0.05°; hoja en el escritorio: 1.5 cm y 0.05°; con 25 cm y 6° de deriva el mundo regresa a 0.0 cm y 0.01° de la primera lectura, a la mitad por paso; con la cabeza girando rápido no corrige.
- **La hoja:** segunda página de `vr/espacial/marcador.html` (cuadro negro de 14 cm, comprobado en el PDF de carta).
- **Nivel:** probado en navegador con la hoja dibujada en lugares conocidos. **Falta:** el cuarto de Carlos.
- **Siguiente:** guardar dónde quedan las cosas respecto a la hoja, para que al volver a entrar aparezcan en el mismo lugar del cuarto (persistencia).

## 011 · El menú en su mismo lugar del cuarto entre sesiones (19 nov 2026)

- **Qué hace:** con la hoja del ancla vista con giro confiable (acostada en el escritorio, o la pared vista de lado), el inicio se pone donde quedó la vez pasada RESPECTO a la hoja. La primera vez se guarda solo («Cuarto guardado»); «Al centro» (Cuadro) lo vuelve a guardar donde lo dejes («Al centro · guardado»).
- **Por qué hace falta la hoja:** el giroscopio del iPhone empieza cada sesión con otro rumbo y otro origen; sin un punto fijo del cuarto, «el mismo lugar» no existe para el motor.
- **Prueba:** `vr/pruebas-ancla-sala.mjs` 4/4. Con el mundo de la segunda sesión girado 69°, −155° o 180° y movido, el menú cae en el mismo lugar del cuarto (error 0).
- **Nivel:** probado en Node. **Falta:** el cuarto de Carlos.

## 012 · Prueba de Carlos dentro de Mazi VR: mal. Puntitos del rastreo y «teléfono quieto, mundo quieto» (19 nov 2026)

- **Medido por Carlos en su iPhone (6DoF dentro de Mazi VR, cuarto virtual):** «no traquea bien nada; de repente se empieza a mover cuando yo ni siquiera me estaba moviendo». Su captura: «Rastreo perdido» (el VIO reiniciándose).
- **Lo que pidió:** ver los puntitos del rastreo para saber si su entorno se está viendo bien («si tengo una cama a mi lado, que vayan poniéndose en el contorno de la cama»).
- **Hecho (`vr/nube.js`):**
  - **vivos**: los puntos que la cámara sigue en CADA cuadro (`trackXY` del VIO), pintados encima de la imagen de la cámara en la mixta: verdes rastreando, amarillos a ciegas, rojos perdido;
  - **el mapa del cuarto**: cada punto 3D que el VIO ubica (`landmarks`, cada medio segundo o cuadro clave) se queda puesto en el mundo, uno por cubito de 4 cm, con color por altura; se ve en la mixta y en el cuarto virtual. Ajustes: «Puntos» y «Borrar mapa»;
  - con 6DoF, la imagen de la cámara va a su campo REAL (67° de la lente principal) para que los puntos y lo 3D caigan sobre las cosas.
- **«Teléfono quieto, mundo quieto» (`vr/seis.js`):** si el acelerómetro casi no se sacude y el giroscopio casi no gira, no se suma ningún movimiento aunque el VIO se vaya. Mover la cabeza siempre gira algo.
- **Pruebas:** `pruebas-seis` 12/12 (nuevo: teléfono quieto con el VIO yéndose 21 cm → 0 cm; girando un poco sí cuenta); `pruebas-seis-motor` 10/10 con la caminata real (118 puntos siguiéndose y 2,262 en el mapa).
- **Honesto:** los puntos no arreglan el rastreo; enseñan DÓNDE falla (pocos puntos = pared lisa o poca luz). Si el VIO web sigue sin dar en el cuarto de Carlos, la ruta firme es ARKit nativo (`are/`) o ARCore en Android.

## 013 · Manos que no se deforman ni se voltean (19 nov 2026)

- **De la guía de Carlos** (prioridad 1 y 2): «cuando pierde de vista algunos dedos intenta inventar su posición: la mano cambia de forma, los dedos se estiran, o confunde una mano con la otra o invierte la palma».
- **Hecho (`vr/manos-estables.js`, antes del suavizado en `vr/manos.js`):**
  - **largos de hueso:** las primeras 12 lecturas aprenden cuánto mide cada hueso de esa mano (worldLandmarks, metros). Un dedo con huesos 40 % más largos o más cortos, o doblado más de 125° en una articulación, es inventado: se queda en su última forma buena, pegada a la palma de ahora (se mueve, gira y crece con ella);
  - **palma volteada de golpe:** más de 120° entre dos lecturas se sostiene hasta 3 lecturas (con la forma buena, sin girarla); si sigue, era tu mano y se acepta;
  - **lado:** izquierda o derecha sólo cambia si se repite 8 lecturas seguidas;
  - **más seguido:** si el rastreo de manos tarda menos de 14 ms, corre en cada cuadro (antes, uno sí y uno no).
- **Pruebas:** `vr/pruebas-manos-estables.mjs` 10/10 (mano sana pasa tal cual; índice estirado al doble y medio doblado al revés se quedan en su forma buena; volteo de un cuadro se ignora y uno que se mantiene se acepta; 3 lecturas de «izquierda» no cambian la derecha y 8 sí; un puño de verdad no se confunde). Las de manos, gestos, agarrar, sables y objetos siguen en verde.
- **Nivel:** probado en Node con manos inventadas. **Falta:** las manos de Carlos.
