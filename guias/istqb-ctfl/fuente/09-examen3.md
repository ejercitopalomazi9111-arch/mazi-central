[hoja]

## Examen 3 · Simulacro completo, cronometrado

Este es el que cuenta. **Cuarenta preguntas, sesenta minutos, un solo intento
sin interrupciones.** Mismo reparto por capítulo que el examen oficial: ocho
del I, seis del II, cuatro del III, once del IV, nueve del V y dos del VI.

Pon el cronómetro antes de leer la primera. Si te atoras más de dos minutos en
una, márcala y sigue: al final vuelves. Apruebas con **26 correctas**.
Respuestas y explicaciones en la hoja de respuestas 3.

### Capítulo I · Fundamentos

**1.** El objetivo de las pruebas **cambia según el nivel y el momento**. ¿Cuál
de estos objetivos es propio de las pruebas de aceptación y no de las de
componente?
- a) Encontrar el mayor número de defectos posible.
- b) Verificar que cada función interna devuelve lo esperado.
- c) Generar confianza en que el producto sirve para lo que se necesita.
- d) Medir la cobertura de sentencias.

**2.** Alguien teclea `>` donde iba `>=`. El programa acepta pedidos de cero
piezas y el almacén se queda vacío. Nombra las tres cosas, en orden:
- a) Error, defecto, fallo.
- b) Defecto, error, fallo.
- c) Fallo, defecto, causa raíz.
- d) Error, fallo, defecto.

**3.** ¿Cuál de estas afirmaciones sobre la **causa raíz** es correcta?
- a) Es el mismo concepto que el defecto.
- b) Es el fallo que ve la persona usuaria.
- c) Sólo aplica a defectos de seguridad.
- d) Es la razón de fondo por la que se introdujo el defecto, y corregirla evita
  defectos futuros.

**4.** Un equipo prueba un marcapasos y otro una tienda de camisetas. Los dos
usan procesos muy distintos. ¿Qué principio lo explica?
- a) Los defectos se agrupan.
- b) Las pruebas dependen del contexto.
- c) La paradoja del pesticida.
- d) Las pruebas exhaustivas son imposibles.

**5.** Un campo de texto de 10 caracteres con 100 símbolos posibles admite
10^20 entradas. Probarlas todas a un microsegundo cada una tardaría más que la
edad del universo. ¿Qué principio se ilustra y qué se hace en su lugar?
- a) Paradoja del pesticida; se renuevan los casos.
- b) Agrupación de defectos; se prueba sólo el módulo malo.
- c) Pruebas exhaustivas imposibles; se usan técnicas y riesgo para priorizar.
- d) La ausencia de defectos es una falacia; se entrega igual.

**6.** ¿Cuál de estas es una actividad de **implementación** de pruebas?
- a) Identificar las condiciones de prueba.
- b) Comparar los resultados reales con los esperados.
- c) Escribir el informe de finalización.
- d) Organizar los casos en procedimientos y preparar el entorno y los datos.

**7.** La **trazabilidad** entre la base de prueba y los casos sirve sobre todo
para:
- a) Saber el impacto de un cambio y demostrar cobertura de requisitos.
- b) Reducir el número de casos.
- c) Sustituir la documentación de diseño.
- d) Calcular la severidad de los defectos.

**8.** Un tester reporta un defecto y el desarrollador se lo toma como ataque
personal. ¿Qué recomienda el temario?
- a) Escalar de inmediato con el gerente.
- b) Dejar de reportar defectos de ese módulo.
- c) Comunicar los hallazgos de forma neutral y centrada en el producto, no en
  la persona.
- d) Documentarlo por escrito y no volver a hablarlo.

### Capítulo II · Pruebas en el ciclo de vida

**9.** En un modelo de desarrollo secuencial, ¿cuándo pueden empezar las
actividades de prueba?
- a) Sólo cuando hay código ejecutable.
- b) Desde que existe la base de prueba: se puede revisar requisitos y diseñar
  casos.
- c) Después de la prueba de sistema.
- d) Únicamente en la fase de aceptación.

**10.** Entre las buenas prácticas de prueba válidas para **cualquier** ciclo de
vida está:
- a) Que las pruebas se hagan sólo al final, para no repetir trabajo.
- b) Que el equipo de pruebas sea independiente de la empresa.
- c) Que se automatice el 100 % de los casos.
- d) Que a cada actividad de desarrollo le corresponda una actividad de prueba.

**11.** ¿Qué nivel de prueba busca defectos en las **interfaces entre módulos
del mismo sistema**?
- a) Prueba de integración de componentes.
- b) Prueba de componente.
- c) Prueba de sistema.
- d) Prueba de aceptación.

**12.** Las **pruebas de aceptación operativa** comprueban típicamente:
- a) Que los cálculos de negocio son correctos.
- b) Que la interfaz cumple el manual de marca.
- c) Respaldo y restauración, migración de datos y tareas de mantenimiento.
- d) Que el código alcanza cierta cobertura de ramas.

**13.** El equipo cambia una librería de fechas que usa todo el sistema. ¿Qué
tipo de prueba es imprescindible?
- a) De confirmación.
- b) De humo, únicamente.
- c) De aceptación de usuario, únicamente.
- d) De regresión.

**14.** ¿Cuál de estos es un **desencadenante** de pruebas de mantenimiento?
- a) La primera versión del producto.
- b) Una migración a otra plataforma o el retiro del sistema.
- c) El diseño de la arquitectura.
- d) La firma del contrato.

### Capítulo III · Pruebas estáticas

**15.** ¿Qué productos de trabajo pueden someterse a prueba estática?
- a) Sólo el código fuente.
- b) Sólo los requisitos.
- c) Sólo lo que tenga formato ejecutable.
- d) Prácticamente cualquiera: requisitos, diseño, código, casos de prueba,
  contratos.

**16.** El **líder de revisión** y el **moderador** son roles distintos porque:
- a) El líder decide qué se revisa y organiza; el moderador conduce la reunión y
  media.
- b) Son sinónimos, cambia el nombre según el país.
- c) El moderador es quien escribe el producto de trabajo.
- d) El líder sólo aparece en revisiones informales.

**17.** ¿Cuál de estos tipos de revisión es el **más formal**?
- a) Revisión informal.
- b) Walkthrough.
- c) Revisión técnica.
- d) Inspección.

**18.** Un análisis estático de código puede detectar:
- a) Que el cálculo del IVA da un resultado equivocado.
- b) Que el tiempo de respuesta supera dos segundos.
- c) Variables no usadas, código inalcanzable y desviaciones del estándar de
  codificación.
- d) Que a la persona usuaria no le gusta el flujo.

### Capítulo IV · Técnicas de prueba

**19.** Una promoción aplica si el cliente es socio **y** el monto supera 1000
pesos. ¿Qué técnica modela mejor esto?
- a) Tabla de decisión.
- b) Análisis de valores límite.
- c) Transición de estados.
- d) Cobertura de sentencias.

**20.** Un campo de edad válido acepta de 18 a 65. Con el método de **tres
valores**, los valores a probar en el extremo inferior son:
- a) 18 y 19
- b) 18, 19, 20
- c) 0, 17, 18
- d) 17, 18, 19

**21.** ¿Cuántos casos hacen falta para el 100 % de cobertura de particiones de
equivalencia en ese campo de edad, contando válidas e inválidas?
- a) 2
- b) 3
- c) 4
- d) 6

**22.** Un cajero automático pasa de «en espera» a «tarjeta insertada», de ahí a
«PIN válido», de ahí a «operación» y regresa a «en espera». El modelo tiene 4
estados y 6 transiciones válidas. Para el 100 % de cobertura 0-switch hay que
ejercer:
- a) 3 transiciones
- b) 4 transiciones
- c) 6 transiciones
- d) 12 transiciones

**23.** ¿Qué diferencia hay entre cobertura 0-switch y 1-switch?
- a) Ninguna, son nombres alternativos.
- b) 0-switch cubre transiciones sueltas; 1-switch cubre pares consecutivos de
  transiciones.
- c) 0-switch cubre estados; 1-switch cubre transiciones.
- d) 1-switch sólo aplica a transiciones inválidas.

**24.** Observa:

| Línea | Código |
| 1 | leer edad |
| 2 | si edad >= 18 entonces |
| 3 | · acceso = "permitido" |
| 4 | si no |
| 5 | · acceso = "denegado" |
| 6 | fin si |
| 7 | imprimir acceso |

Contando como sentencias ejecutables las líneas 1, 2, 3, 5 y 7, con el único
caso edad = 30 la cobertura de **sentencias** es:
- a) 40 %
- b) 60 %
- c) 80 %
- d) 100 %

**25.** Con ese mismo caso único, la cobertura de **ramas** es:
- a) 25 %
- b) 50 %
- c) 75 %
- d) 100 %

**26.** ¿Cuál es la relación correcta entre las dos coberturas?
- a) La de sentencias es más fuerte que la de ramas.
- b) Son independientes por completo.
- c) La de ramas sólo se mide en pruebas de sistema.
- d) La de ramas es más fuerte: alcanzar 100 % de ramas implica 100 % de
  sentencias.

**27.** ¿Cuál de estas es una técnica **basada en la experiencia**?
- a) Pruebas exploratorias.
- b) Tabla de decisión.
- c) Análisis de valores límite.
- d) Cobertura de ramas.

**28.** Una **lista de comprobación** (checklist) en pruebas sirve para:
- a) Sustituir la especificación.
- b) Calcular el esfuerzo del proyecto.
- c) Apoyarse en experiencia acumulada y no olvidar condiciones típicas.
- d) Medir cobertura estructural.

**29.** En el enfoque colaborativo, ¿quién debería escribir los criterios de
aceptación?
- a) Sólo la persona de negocio.
- b) Sólo quien programa.
- c) La herramienta de gestión de pruebas.
- d) Negocio, desarrollo y pruebas juntos, en la conversación.

### Capítulo V · Gestión de las pruebas

**30.** ¿Cuál de estos pertenece a los **criterios de salida** y no a los de
entrada?
- a) Se ejecutó la cobertura planificada y los defectos abiertos están dentro
  del umbral acordado.
- b) El entorno de prueba está disponible.
- c) La base de prueba está aprobada.
- d) Los datos de prueba están cargados.

**31.** Con estimación de tres puntos, si el optimista son 6 días, el más
probable 9 y el pesimista 18, la estimación es:
- a) 9 días
- b) 10 días
- c) 11 días
- d) 12 días

**32.** El **riesgo de producto** se refiere a:
- a) Que el proyecto se retrase.
- b) Que el proveedor de la herramienta quiebre.
- c) Que el producto falle y provoque daño a alguien o a la organización.
- d) Que el equipo rote.

**33.** En pruebas basadas en riesgo, el nivel de riesgo se calcula con:
- a) Severidad × prioridad.
- b) Número de defectos ÷ casos ejecutados.
- c) Cobertura × esfuerzo.
- d) Probabilidad × impacto.

**34.** **Severidad** y **prioridad** son distintas porque:
- a) Son sinónimos con distinto nombre.
- b) La severidad es el daño que causa el fallo; la prioridad es la urgencia de
  corregirlo.
- c) La severidad la fija negocio; la prioridad la fija la herramienta.
- d) La prioridad sólo existe en proyectos ágiles.

**35.** Una errata en el logo de la portada es:
- a) Severidad baja y prioridad posiblemente alta.
- b) Severidad alta y prioridad alta.
- c) Severidad alta y prioridad baja.
- d) No es un defecto.

**36.** ¿Qué contiene un buen **reporte de defecto**?
- a) El nombre de quien lo provocó.
- b) Sólo una captura de pantalla.
- c) Identificador, pasos para reproducir, resultado esperado y real, entorno,
  severidad y prioridad.
- d) La corrección propuesta, escrita en código.

**37.** La **gestión de la configuración** en pruebas garantiza que:
- a) Los casos se ejecuten en orden alfabético.
- b) Se sepa exactamente qué versión de qué elemento se probó y se pueda
  reproducir.
- c) El equipo use la misma herramienta.
- d) Los defectos se cierren en 24 horas.

**38.** En la **pirámide de pruebas**, la base ancha corresponde a:
- a) Pruebas de interfaz de usuario, lentas y frágiles.
- b) Pruebas unitarias: muchas, rápidas y baratas.
- c) Pruebas manuales exploratorias.
- d) Pruebas de aceptación de usuario.

### Capítulo VI · Herramientas

**39.** Un riesgo real de la automatización de pruebas es:
- a) Subestimar el mantenimiento de los scripts y confiar de más en la
  herramienta.
- b) Que encuentre demasiados defectos.
- c) Que las pruebas se ejecuten demasiado rápido.
- d) Que sustituya a la gestión de la configuración.

**40.** Antes de adoptar una herramienta en toda la organización conviene:
- a) Hacer una prueba piloto, evaluar los resultados y definir cómo se usará.
- b) Comprar la licencia más cara disponible.
- c) Automatizar primero las pruebas exploratorias.
- d) Eliminar las pruebas manuales.

---
