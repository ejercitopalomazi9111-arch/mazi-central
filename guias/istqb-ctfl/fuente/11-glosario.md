[hoja]

## Glosario · los términos que sí caen

No están todos los del glosario oficial, que pasa de mil entradas. Están los
que aparecen en las preguntas, con la definición en el idioma en que se piensa,
no en el que se traduce. Al lado, entre paréntesis, el término en inglés,
porque el examen se puede presentar en inglés y porque los materiales que vas a
encontrar después están casi todos en ese idioma.

### Los cuatro que se confunden entre sí

- **Error** (*error, mistake*) — la equivocación humana. Alguien entendió mal,
  se distrajo o tecleó de más.
- **Defecto** (*defect, fault, bug*) — la imperfección que queda dentro del
  producto de trabajo. Puede llevar años ahí sin que nadie lo note.
- **Fallo** (*failure*) — lo que se ve cuando el defecto se ejecuta. Es el
  único de los cuatro que ocurre en tiempo real.
- **Causa raíz** (*root cause*) — por qué se introdujo el defecto. Corregirla
  evita la familia entera de defectos parecidos.

### Fundamentos

- **Base de prueba** (*test basis*) — todo lo que sirve para saber qué debería
  hacer el sistema: requisitos, historias, diseño, contratos, incluso el
  sistema anterior.
- **Condición de prueba** (*test condition*) — un aspecto concreto que hay que
  probar. Todavía no es un caso: es «hay que probar el descuento de socio».
- **Caso de prueba** (*test case*) — condiciones previas, entradas, resultado
  esperado y condiciones posteriores. Si no tiene resultado esperado, no es un
  caso de prueba.
- **Oráculo de prueba** (*test oracle*) — la fuente que dice cuál es el
  resultado correcto. Puede ser la especificación, el sistema anterior o una
  persona experta.
- **Cobertura** (*coverage*) — qué porcentaje de un conjunto definido
  (sentencias, ramas, requisitos, particiones) ejercieron las pruebas.
- **Producto de trabajo de prueba** (*test work product*) — cualquier cosa que
  produce el proceso de pruebas: plan, casos, datos, reportes, informes.
- **Verificación** (*verification*) — ¿lo construimos conforme a lo
  especificado?
- **Validación** (*validation*) — ¿esto resuelve lo que la persona necesitaba?
- **Trazabilidad** (*traceability*) — el hilo que conecta requisito, condición,
  caso, ejecución y defecto. Sirve para análisis de impacto y para demostrar
  cobertura.
- **Depuración** (*debugging*) — localizar y corregir el defecto. No es una
  actividad de prueba.

### Ciclo de vida y niveles

- **Shift left** — llevar las actividades de prueba lo más temprano posible.
- **Prueba de componente** (*component / unit testing*) — un módulo aislado.
- **Integración de componentes** (*component integration testing*) — las
  interfaces entre módulos del mismo sistema.
- **Integración de sistemas** (*system integration testing*) — las interfaces
  con otros sistemas o servicios externos.
- **Prueba de sistema** (*system testing*) — el comportamiento del sistema
  completo.
- **Aceptación de usuario** (*user acceptance testing, UAT*) — la hace quien va
  a usarlo, para decidir si lo acepta.
- **Aceptación operativa** (*operational acceptance testing*) — respaldos,
  restauración, migración, tareas de mantenimiento.
- **Prueba alfa** (*alpha testing*) — en las instalaciones de quien desarrolla.
- **Prueba beta** (*beta testing*) — en el entorno real de quien usa.
- **Prueba de confirmación** (*confirmation / re-testing*) — comprobar que la
  corrección funcionó.
- **Prueba de regresión** (*regression testing*) — comprobar que el cambio no
  rompió lo que ya funcionaba.
- **Prueba de humo** (*smoke testing*) — un puñado de casos rápidos para saber
  si vale la pena seguir probando esta versión.
- **Prueba funcional** — qué hace el sistema.
- **Prueba no funcional** — cómo de bien lo hace: rendimiento, usabilidad,
  seguridad, portabilidad, fiabilidad, mantenibilidad, compatibilidad.
- **Caja negra** (*black-box*) — se diseña desde la especificación, sin mirar
  el código.
- **Caja blanca** (*white-box*) — se diseña desde la estructura interna.
- **Análisis de impacto** (*impact analysis*) — determinar qué toca un cambio,
  para dimensionar la regresión.

### Pruebas estáticas

- **Prueba estática** (*static testing*) — examinar sin ejecutar.
- **Revisión informal** — sin proceso ni documentación obligatoria.
- **Walkthrough / revisión guiada** — la conduce el autor; sirve para evaluar,
  formar y consensuar.
- **Revisión técnica** — la conducen personas técnicas, con documentación y
  decisiones registradas.
- **Inspección** — la más formal: roles definidos, moderador, métricas,
  criterios de entrada y salida.
- **Análisis estático** (*static analysis*) — una herramienta revisa el código
  sin ejecutarlo: variables sin usar, código inalcanzable, complejidad,
  desviaciones del estándar.
- **Moderador** (*moderator, facilitator*) — conduce la reunión y media.
- **Escriba** (*scribe*) — registra las incidencias encontradas.

### Técnicas de caja negra

- **Partición de equivalencia** (*equivalence partitioning*) — agrupar entradas
  que el sistema trata igual, y probar una de cada grupo.
- **Análisis de valores límite** (*boundary value analysis, BVA*) — probar los
  bordes de cada partición, que es donde se rompe. Método de **dos valores**:
  el límite y su vecino de fuera. Método de **tres valores**: el límite y sus
  dos vecinos.
- **Tabla de decisión** (*decision table*) — filas de condiciones y acciones,
  columnas de reglas. Sin colapsar tiene 2^n columnas para n condiciones
  booleanas.
- **Transición de estados** (*state transition testing*) — estados, eventos,
  transiciones y acciones. Cobertura **0-switch**: cada transición válida.
  Cobertura **1-switch**: cada par de transiciones consecutivas.
### Técnicas de caja blanca

- **Cobertura de sentencias** (*statement coverage*) — porcentaje de sentencias
  ejecutables que ejercieron las pruebas.
- **Cobertura de ramas** (*branch coverage*) — porcentaje de salidas de
  decisión ejercidas. Es más fuerte que la de sentencias.
### Técnicas basadas en la experiencia

- **Adivinación de errores** (*error guessing*) — usar la experiencia sobre
  dónde suelen esconderse los defectos.
- **Prueba exploratoria** (*exploratory testing*) — diseñar, ejecutar y evaluar
  a la vez, dentro de una sesión acotada.
- **Carta de sesión** (*test charter*) — el objetivo, el alcance y el tiempo de
  una sesión exploratoria.
- **Prueba basada en listas de comprobación** (*checklist-based testing*) —
  cubrir una lista de condiciones acumulada por experiencia.
### Enfoque colaborativo

- **Las tres C** — Card, Conversation, Confirmation: la tarjeta de la historia,
  la conversación que la aclara y los criterios que la hacen comprobable.
- **INVEST** — Independiente, Negociable, Valiosa, Estimable, Small (pequeña),
  Testeable. Las seis propiedades de una buena historia de usuario.
- **ATDD** (*acceptance test-driven development*) — los casos se derivan de los
  criterios de aceptación antes de escribir el código.
- **Dado / Cuando / Entonces** (*Given / When / Then*) — formato de criterio de
  aceptación orientado a escenarios.

### Gestión

- **Plan de pruebas** (*test plan*) — alcance, objetivos, riesgos, enfoque,
  recursos, calendario, criterios de entrada y salida.
- **Criterios de entrada** (*entry criteria*) — lo que hace falta para empezar.
- **Criterios de salida** (*exit criteria*, también *definition of done*) — lo
  que hace falta para dar por terminado.
- **Estimación de tres puntos** — (optimista + 4 × probable + pesimista) ÷ 6.
- **Riesgo de proyecto** — amenaza a la ejecución del proyecto: calendario,
  presupuesto, gente.
- **Riesgo de producto** — amenaza a la calidad del producto y al daño que
  puede causar.
- **Nivel de riesgo** — probabilidad × impacto.
- **Prueba basada en riesgo** (*risk-based testing*) — se prueba más y antes lo
  que más riesgo tiene.
- **Pirámide de pruebas** (*test pyramid*) — muchas unitarias en la base, pocas
  de interfaz en la punta.
- **Cuadrantes de prueba** (*testing quadrants*) — cuatro grupos según si la
  prueba apoya al equipo o critica el producto, y si es de negocio o técnica.
- **Severidad** (*severity*) — cuánto daño causa el fallo.
- **Prioridad** (*priority*) — con cuánta urgencia hay que corregirlo. La fija
  el negocio y puede no coincidir con la severidad.
- **Gestión de la configuración** (*configuration management*) — saber qué
  versión de qué elemento se probó, para poder reproducirlo.
- **Informe de progreso** (*test progress report*) — el estado durante la
  ejecución.
- **Informe de finalización** (*test completion report*) — el resumen al
  cerrar.

### Herramientas

- **Herramienta de ejecución** — ejecuta casos automatizados y compara
  resultados.
- **Arnés de prueba** (*test harness*) — el andamiaje que permite ejecutar un
  componente aislado, con *stubs* y *drivers*.
- **Integración continua** (*continuous integration, CI*) — cada cambio se
  integra y se prueba automáticamente.
- **Deuda técnica de automatización** — el costo de mantener los scripts al día
  con el producto. Es el gasto que casi todo el mundo subestima.

---
