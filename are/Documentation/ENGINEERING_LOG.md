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
