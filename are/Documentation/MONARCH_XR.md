# MONARCH XR · experiencia educativa de la mariposa monarca

Módulo de MAZI XR (mismo motor: `vr/vr.js`). Proyecto final de Ética y STEAM de Carlos, **antes de diciembre de 2026**.

## Orden de trabajo (Carlos, 19 nov)

1. **Primero el motor**: 6DoF dentro del motor, modo sin visor, modo exposición, control. Ver ENGINEERING_LOG 006-008.
2. **Después la experiencia**: QR → bienvenida → monarca 3D → migración → santuario → amenazas → cuestionario → ética → final.

## Datos verificados (fase A, 19 nov 2026)

Cada dato con su fuente y año. Lo que no está aquí no se pone en la narración.

| Dato | Fuente |
|---|---|
| La población oriental viaja **hasta ~4,800 km (3,000 millas)** desde Canadá; el USFWS también dice «más de 3,000 km» para llegar a México. Se dirá «más de 3,000 km, y desde Canadá hasta unos 4,500». | U.S. Fish & Wildlife Service (fws.gov, «phenomenal monarch migration» y la Species Status Assessment 2024) |
| La generación que migra al sur («súper generación») vive **hasta ~9 meses**; las de verano, semanas. La migración es **de varias generaciones**: ninguna mariposa hace sola la ida y la vuelta. | USFWS; Manomet; WWF «The Great Monarch Migration» |
| Pasan el invierno en **11-12 macizos montañosos** de Michoacán y el Estado de México, de octubre a finales de marzo. | U.S. Forest Service (fs.usda.gov, Monarch Butterfly Migration) |
| **Reserva de la Biosfera Mariposa Monarca**: 56,259 ha, Patrimonio Mundial de la UNESCO desde **2008**; el árbol dominante en las cumbres es el **oyamel (*Abies religiosa*)**. | UNESCO (whc.unesco.org/es/list/1290) |
| Temporada **2025-2026**: las colonias ocuparon **2.93 ha**, 64 % más que 2024-2025 (**1.79 ha**). Nueve colonias (3 en Michoacán, 6 en el Edomex); la mayor, El Rosario (1.62 ha). Máximo histórico: **18.19 ha (1996-1997)**; mínimo: **0.67 ha (2013-2014)**. | WWF México y CONANP, informe de marzo de 2026 |
| Entre feb. 2024 y feb. 2025 se degradaron **2.55 ha** del núcleo: tala ilegal 1.85, incendios 0.58, sequía 0.11. | WWF México con la UNAM (mismo informe) |
| UICN: la monarca migratoria entró como **En Peligro (2022)** y en **2023** se reclasificó como **Vulnerable**. | UICN; National Geographic (dic. 2023) |
| EE. UU. **propuso** listarla como amenazada (12 dic. 2024); **no hay decisión final**: por un acuerdo judicial, el plazo es el **6 de junio de 2030** (reportado en oct. 2026). | Federal Register 89 FR 239; DTN (oct. 2026) |
| Las hembras ponen sus huevos sólo en **algodoncillo (asclepia)**, que es lo único que comen las orugas; las adultas toman néctar de muchas flores. | National Park Service, «Milkweed and Monarchs» |

| Ciclo de vida (depende de la temperatura): **huevo ~4 días**; **oruga 9-14 días**, con **5 estadios** (muda de piel para crecer); **crisálida ~9-15 días**; en verano, de huevo a adulta **menos de 30 días**, con frío puede pasar de 60. | U.S. Forest Service, «Monarch Butterfly Monitoring in North America» (fs.usda.gov); USFWS (3-8 días el huevo, 25-49 días el ciclo); Monarch Watch (~30 días). Verificado el 19 nov 2026 |

### Correcciones y materias (25 nov 2026, Luna, con `vr/monarca/CIENCIA.md` de Godines)

| Dato | Fuente |
|---|---|
| La oruga pasa por **5 estadios**: cambia de piel **4** veces mientras crece y la quinta muda ya es crisálida. Crece unas **2,000 veces** su masa (cuenta de Matemáticas: un bebé de **3 kg** × 2,000 = **6 toneladas**). En verano, de huevo a adulta unas **4 semanas**. | Monarch Joint Venture, *Life Cycle*; CCA (2008) |
| La adulta recién salida pasa varias horas secando las alas antes de volar. | Monarch Joint Venture, *Life Cycle* |
| El algodoncillo tiene **cardenólidos**; la oruga los guarda y queda tóxica para casi todos los vertebrados (Química). | CCA (2008); NPS Acadia (2023) |
| Avanzan **50-100 millas por día** (**80-160 km**); el viaje dura hasta unos dos meses (Física: v = d / t). | U.S. Forest Service, *Migration and Overwintering* |
| La generación que baja a México **empieza** el regreso en primavera; sus hijas y nietas lo terminan. | USFWS SSA 2024; Flockhart et al. 2013 |
| UICN 2023: pasó a Vulnerable porque **revisó sus modelos**, no porque la población mejorara. | National Geographic (dic. 2023) |
| Educación física: **2024 Adult Compendium of Physical Activities** (pacompendium.com, consultado el 25 nov 2026): caminar 2.8-3.4 mph (4.5-5.5 km/h), código 17190, **3.8 MET**; correr 6-6.3 mph (10 min/milla), código 12050, **9.3 MET**. kcal ≈ MET × kg × horas (1 MET = 1 kcal/kg/h). Persona de **60 kg**, **3,000 km**: caminando a 5 km/h, **600 h** (75 días de **8 h**), **136,800 kcal**; corriendo a 10 km/h, **300 h**, **167,400 kcal**. Con la dieta de referencia de **2,000 kcal** al día, caminar equivale a unos **68** días de comida. | Compendio 2024; dieta de referencia de 2,000 kcal (NOM-051 / FDA) |
| Matemáticas del final: 2.93 ÷ 1.79 = **1.64** (64 % más). 2.93 ha = 29,300 m²; una cancha de fútbol de 105 × 68 m = 7,140 m² → unas **4 canchas**. | WWF México y CONANP (2026); medidas recomendadas de cancha (FIFA) |

**Lo que NO se dirá:** que una mariposa viaja 9,000 km ida y vuelta; que la población «ya se recuperó» (una temporada buena no es una tendencia); cifras sin año.

## Medios ya elegidos

En `vr/monarca/LEEME.md`: monarca escaneada de Virginia Tech (CC BY), cinco fotos 360° de Poly Haven (CC0) y el mapa de Natural Earth.

## Compatibilidad (lo que se promete y lo que no)

- **iPhone (Safari):** no trae WebXR inmersivo. El motor pinta su propio estéreo con el giroscopio; 6DoF con el VIO web (ENGINEERING_LOG 006).
- **Android (Chrome):** el mismo estéreo propio funciona igual. WebXR depende del aparato: se investigará `immersive-ar` (ARCore) como fuente de 6DoF más firme. No se promete hasta probarlo en un Android real.
- **Sin visor:** el modo pantalla del motor (tocar para elegir).
- **No salir de la experiencia:** la página bloquea sus propios botones (modo exposición). Bloquear el botón de inicio o el cambio de apps **no lo puede hacer una página web**: eso es **Acceso guiado** en iPhone y **Fijar pantalla** en Android. Se escribirá la guía para el docente.

## Estado · primera versión (19 nov 2026)

Hecho en `vr/monarca/monarca.js` (entra desde Juegos → Monarca, o directo y en exposición con `/vr/?monarca`):
bienvenida, la monarca escaneada, migración con el mapa y la ruta que se dibuja, santuario con colonia, dos amenazas,
dilema ético, cuestionario de 4, final con créditos; narrador con voz (ver abajo; se apaga con «Voz»); salida del
docente (Opciones o PS 5 veces, o 5 toques en la esquina); fotos, modelo y mapa guardados para usarse sin internet.
QR imprimible: `vr/monarca/qr.html`. Guía del docente: `vr/monarca/DOCENTE.md`.
Prueba: `node vr/pruebas-monarca.mjs` (recorre todo como alumno y revisa que cada cifra en pantalla esté en la tabla de arriba).

**Hecho después:** escena «Su ciclo de vida» (huevo, oruga, crisálida y adulta con sus días, del Forest Service) y una pregunta más; minijuego «Flores en el camino» (plantas 5 flores reales de Poly Haven y la monarca llega a tomar néctar; no es algodoncillo porque no hay modelo libre de asclepia y no se va a fingir).

**El narrador (19 nov, pedido de Carlos «tipo Stanley Parable»):** `vr/monarca/narrador.js`. Un narrador con ironía cuenta
«la historia de alguien con un visor en la cara» con los MISMOS datos del cartel (en palabras; nada cambia de cifra) y se da
cuenta de lo que haces: te adelantas mientras explica, regresas, miras a otro lado 3 s, te quedas quieto 25 s, plantas antes
de que termine, qué decides, si aciertas o fallas cada pregunta, cuántas sacaste, «Otra vez» y apagar la voz. Explica con
Orus y reacciona con Charon, la grave (voces de Google de la casa). Guion propio: del juego sólo se toma el género. Los 46
audios están hechos de antemano (`node vr/monarca/narrador-armar.mjs`, 2 MB) y se guardan para sonar sin internet; si
uno falta, lo lee la voz del teléfono. Al cambiar un renglón: se corre ese comando (sólo pide lo que cambió).

**Las travesuras (19 nov, Carlos: «que prevea cualquier estupidez que se le ocurra al jugador»):** `vr/monarca/travesuras.js`
lee cada cuadro la cabeza (mirar a otro lado, de espaldas, al piso, al cielo, ladeada, dar vueltas, decir sí o no con la
cabeza, cero movimiento = visor en la mesa), el cuerpo con 6DoF (agacharse, saltar, pegarse al cartel, irse caminando,
obstáculo real), las manos (tocar la mariposa, manos arriba, dos puños, saludar, pellizcar el aire, jugar con ellas mientras
explica), el teléfono (cámara tapada, teléfono parado, agitarlo, salir de la página y volver) y el control (machacar
botones, stick apretado, Opciones en exposición), más el ritmo: ignorarlo por completo sube de tono cinco veces y a la
quinta **avanza solo**; adelante-atrás-adelante, prender y apagar la voz, tocar el puntaje, contestar sin leer, plantar
las cinco flores de golpe, terminar en menos de un minuto («Récord. No aprendiste nada»), sacar 5 de 5 sin escuchar
(«Sospechoso»), la tercera vuelta y regresar a la experiencia. Habla como mucho cada 7 s (lo de seguridad se salta la
fila) y lo que interrumpe una explicación la pausa y sigue donde iba. Prueba: `node vr/pruebas-travesuras.mjs`.

**Falta:** videos con licencia, más minijuegos (guiar a la monarca por la ruta), y probarla en un iPhone y un Android de
verdad con el visor (en especial que el narrador suene desde el primer toque).
