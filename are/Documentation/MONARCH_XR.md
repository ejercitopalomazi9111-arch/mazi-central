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
dilema ético, cuestionario de 4, final con créditos; voz del teléfono que lee cada cartel (se apaga con «Voz»); salida del
docente (Opciones o PS 5 veces, o 5 toques en la esquina); fotos, modelo y mapa guardados para usarse sin internet.
QR imprimible: `vr/monarca/qr.html`. Guía del docente: `vr/monarca/DOCENTE.md`.
Prueba: `node vr/pruebas-monarca.mjs` (recorre todo como alumno y revisa que cada cifra en pantalla esté en la tabla de arriba).

**Hecho después:** escena «Su ciclo de vida» (huevo, oruga, crisálida y adulta con sus días, del Forest Service) y una pregunta más; minijuego «Flores en el camino» (plantas 5 flores reales de Poly Haven y la monarca llega a tomar néctar; no es algodoncillo porque no hay modelo libre de asclepia y no se va a fingir).

**Falta:** videos con licencia, más minijuegos (guiar a la monarca por la ruta), voz grabada en vez de la del
teléfono, y probarla en un iPhone y un Android de verdad con el visor.
