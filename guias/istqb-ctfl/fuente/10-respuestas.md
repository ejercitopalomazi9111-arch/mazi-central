[hoja]

## Hoja de respuestas 1 · Fundamentos, ciclo de vida y pruebas estáticas

Primero la clave rápida, para que cuentes. Debajo, el porqué de cada una: esa
parte es la que de verdad te sube la calificación, porque el examen real no
repite estas preguntas, repite estos razonamientos.

| Pregunta | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| Respuesta | a | c | d | b | a | d | c | b | a | d |

| Pregunta | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
| Respuesta | c | b | a | d | b | c | a | d | c | b |

**Tu resultado:** cuenta un punto por acierto. De 14 para arriba vas bien; de
13 para abajo, relee el capítulo de las que fallaste antes de seguir.

### Por qué

**1 · a.** El defecto vive **dentro** del producto de trabajo. La equivocación
de la persona es el *error*, lo que se ve al ejecutar es el *fallo*, y la razón
de fondo es la *causa raíz*. Las cuatro opciones son definiciones reales de
cuatro cosas distintas: esta pregunta se cae sola si tienes la cadena clara.

**2 · c.** Es la excepción que el temario menciona expresamente: radiación,
campos magnéticos, contaminación. Hubo un fallo, no hubo defecto. La opción a)
es la trampa: suena a regla de oro y es falsa.

**3 · d.** Paradoja del pesticida: los mismos casos dejan de encontrar bichos
porque ya mataron los que sabían matar. Se arregla revisando y ampliando los
casos, no ejecutándolos más veces.

**4 · b.** El análisis contesta **qué** probar. Derivar los casos ya es diseño;
preparar entorno y datos es implementación; comparar resultados es ejecución.

**5 · a.** Verificar es «¿lo construimos según la especificación?». Validar es
«¿esto le sirve a quien lo va a usar?». Las dos pueden ser estáticas o
dinámicas, así que d) es falsa.

**6 · d.** Sin defectos conocidos y aun así inútil. Ése es el enunciado exacto
del principio de la falacia de la ausencia de defectos.

**7 · c.** Probar encuentra y reporta; depurar localiza y corrige. La frontera
está en el verbo: si estás cambiando código, ya no estás probando.

**8 · b.** El sesgo de confirmación hace que uno vea lo que espera ver, y quien
escribió el código espera que funcione. De ahí viene el argumento de la
independencia de las pruebas.

**9 · a.** El servicio de facturación es **otro sistema**. Integración de
componentes es entre módulos del mismo sistema; integración de sistemas es
entre sistemas distintos. Esta distinción cae casi siempre.

**10 · d.** Alfa: en casa de quien desarrolla. Beta: en casa de quien usa. Lo
que las separa es el sitio, no quién las hace.

**11 · c.** Confirmación = «¿ya quedó?». Regresión = «¿rompí algo más?». En la
práctica se hacen juntas, y en el examen se preguntan separadas.

**12 · b.** Lo funcional es *qué* hace; lo no funcional es *cómo de bien* lo
hace. Rendimiento con 500 usuarios es «cómo de bien».

**13 · a.** Mover las pruebas hacia la izquierda del calendario: revisar
requisitos, escribir casos antes que el código. No tiene nada que ver con
organigramas ni con automatizar.

**14 · d.** El análisis de impacto delimita el alcance de la regresión. Sin él
sólo quedan dos opciones malas: probar todo o probar a ciegas.

**15 · b.** Estática es sin ejecutar. La prueba de humo se ejecuta, así que es
dinámica. Las otras tres se hacen mirando, no corriendo.

**16 · c.** El autor nunca lidera una inspección: se lo lleva el moderador, y el
autor asiste, escucha y corrige. Ojo, en el walkthrough sí lo lidera el autor
— esa oposición es justo lo que se está preguntando.

**17 · a.** La ventaja no es la velocidad: es que el defecto se caza **antes** de
que exista siquiera la oportunidad de que provoque un fallo, y por eso sale
barato. Un requisito ambiguo corregido en revisión cuesta minutos; el mismo
requisito descubierto en producción cuesta una versión de emergencia.

**18 · d.** Planificación, inicio, revisión individual, comunicación y análisis
de incidencias, corrección y reporte. Las otras tres alteran el orden en algún
punto: la señal más fiable es que la revisión individual va **después** del
inicio y **antes** de la reunión.

**19 · c.** El walkthrough lo conduce el autor y sirve tanto para evaluar como
para enseñar y ponerse de acuerdo. La opción a) describe una inspección; la b),
una revisión informal.

**20 · b.** Trozos pequeños y retroalimentación rápida. Documentos enormes
cansan y bajan la tasa de hallazgos; que el autor se defienda mata la revisión;
y sin criterios de entrada se revisa basura.

[hoja]

## Hoja de respuestas 2 · Técnicas de diseño

| Pregunta | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| Respuesta | b | c | a | d | c | a | b | d | a | d |

| Pregunta | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
| Respuesta | c | c | b | a | d | c | b | b | a | d |

**Tu resultado:** este examen es el más técnico. De 14 para arriba, el capítulo
IV lo tienes. De 13 para abajo, vuelve a las páginas de particiones, límites y
cobertura antes de intentar el simulacro completo.

### Por qué

**1 · b.** Tres particiones: la válida (100 a 999), la inválida por abajo
(menor que 100) y la inválida por arriba (mayor que 999). El error clásico es
contar sólo la válida, o contar cuatro incluyendo «vacío» cuando la
especificación no lo menciona.

**2 · c.** Dos valores: el límite y su vecino de fuera. Abajo, 100 y 99;
arriba, 999 y 1000. La opción b) son seis valores, que es el método de **tres**
valores; la a) se queda corta porque no cruza el límite.

**3 · a.** La especificación define tres particiones: 0–5, 5.01–20 y más de 20.
Un caso por partición, tres casos. Si además consideraras el peso negativo como
partición inválida serían cuatro, pero la especificación no lo menciona, y en
el examen se cuenta lo que la especificación dice, no lo que uno imagina.

**4 · d.** Tabla de decisión = combinaciones de condiciones. Estados que cambian
con eventos es transición de estados; cobertura de código es caja blanca.

**5 · c.** 2 elevado a 4 = 16 columnas. La regla es 2^n para n condiciones
booleanas; con tres serían 8 y con cinco, 32. Por eso se colapsan: 16 columnas
ya son incómodas y con seis condiciones tendrías 64.

**6 · a.** El guion es «da igual»: en esa regla, el resultado no depende de esa
condición. Es exactamente lo que permite colapsar la tabla.

**7 · b.** 0-switch = cada transición **válida** una vez. Visitar cada estado es
menos exigente; las secuencias de dos transiciones son 1-switch; las inválidas
son una cobertura aparte.

**8 · d.** Las transiciones inválidas contestan la pregunta interesante: ¿qué
pasa si mando un evento que no toca? Ahí es donde salen los sistemas que se
quedan colgados o hacen algo absurdo.

**9 · a.** Sentencias ejecutables: leer N, la decisión, imprimir "positivo" e
imprimir "fin". Con N = 7 se ejecutan las cuatro, o sea 100 %. Ramas: la
decisión tiene dos salidas y sólo recorriste la verdadera, o sea 50 %. Esta
pregunta, con otros números, aparece en casi todos los simulacros.

**10 · d.** Ramas es la cobertura más fuerte de las dos: si recorriste todas las
salidas de todas las decisiones, forzosamente pisaste todas las sentencias. Al
revés no: el ejemplo de la pregunta 9 lo demuestra con 100 % de sentencias y
50 % de ramas.

**11 · c.** Tres casos: (A>0, B>0) cubre las dos salidas verdaderas; (A>0,
B≤0) cubre la falsa de la interna; (A≤0) cubre la falsa de la externa. Con dos
casos siempre te queda una salida sin recorrer, porque para llegar a la
decisión interna hace falta que la externa sea verdadera.

**12 · c.** Adivinación de errores = experiencia. «Aquí siempre meten el campo
vacío», «esta fecha va a reventar en febrero». Se apoya en listas de defectos
típicos, no en la especificación ni en el código.

**13 · b.** Exploratorias: se diseña, se ejecuta y se evalúa a la vez, dentro de
una sesión con tiempo limitado. No son «probar sin pensar»: llevan carta de
sesión y bitácora.

**14 · a.** La carta de sesión dice qué se va a explorar, con qué objetivo y
por cuánto tiempo. Es lo que separa la prueba exploratoria del picoteo.

**15 · d.** Card (la tarjeta), Conversation (la conversación) y Confirmation
(los criterios de aceptación). La tarjeta es la excusa para la conversación, y
la confirmación es lo que la convierte en algo probable.

**16 · c.** En ATDD los criterios de aceptación se convierten en casos **antes**
de escribir el código, y por eso el código nace ya con su prueba.

**17 · b.** Dado / Cuando / Entonces describe un escenario concreto. Los
criterios orientados a reglas son listas de condiciones, sin narrativa.

**18 · b.** 3 × 2 = 6 combinaciones. La trampa es sumar (5) o elevar al
cuadrado (9). Y ojo con el enunciado: pide **todas** las combinaciones, no la
cobertura mínima de particiones, que serían 3 + 2 = 5 casos bien repartidos.

**19 · a.** Cobertura de ramas mira la estructura interna, así que es caja
blanca. Las otras tres se diseñan desde la especificación, sin abrir el código.

**20 · d.** La cobertura no dice que lo probado esté bien; dice qué parte del
código **nadie tocó**. Es un detector de huecos, no un certificado de calidad.

[hoja]

## Hoja de respuestas 3 · Simulacro completo

| Pregunta | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| Respuesta | c | a | d | b | c | d | a | c | b | d |

| Pregunta | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
| Respuesta | a | c | d | b | d | a | d | c | a | d |

| Pregunta | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 |
| Respuesta | b | c | b | c | b | d | a | c | d | a |

| Pregunta | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 |
| Respuesta | b | c | d | b | a | c | b | b | a | a |

**Tu resultado, con la misma vara que el examen oficial:**

| Aciertos | Qué significa |
| 26 o más | Aprobado. Preséntalo. |
| 22 a 25 | Cerca. Repasa los capítulos de las que fallaste y repite el simulacro en una semana. |
| 21 o menos | Todavía no. Vuelve a la guía completa antes de volver a examinarte. |

### Por qué

**1 · c.** Cada nivel tiene su objetivo. En componente se busca defectos y
cobertura; en aceptación se busca **confianza** y evidencia de que el producto
sirve. Las opciones a) y b) son objetivos de niveles tempranos y la d) es una
métrica de caja blanca.

**2 · a.** La cadena siempre es la misma: alguien se equivoca (**error**), eso
deja algo mal en el producto (**defecto**), y al ejecutar se manifiesta
(**fallo**). Si te la aprendes en ese orden, tres o cuatro preguntas del examen
real se contestan solas.

**3 · d.** La causa raíz explica **por qué** apareció el defecto: una
especificación ambigua, falta de formación, prisa. Corregir el defecto arregla
un caso; corregir la causa raíz evita los siguientes.

**4 · b.** Marcapasos y camisetas no se prueban igual porque el riesgo no es el
mismo. Ése es el principio de dependencia del contexto, y es el que justifica
que no haya una receta única.

**5 · c.** Es el argumento clásico de la imposibilidad de las pruebas
exhaustivas: el espacio de entradas es astronómico. Por eso existen las
técnicas de diseño y la priorización por riesgo.

**6 · d.** Implementación es la carpintería: armar procedimientos, cargar datos,
dejar el entorno listo. Identificar condiciones es análisis, comparar
resultados es ejecución, y el informe es cierre.

**7 · a.** La trazabilidad sirve para dos cosas concretas: analizar impacto
cuando algo cambia, y demostrar ante quien pregunte qué requisito está cubierto
por qué caso.

**8 · c.** El temario es explícito con esto: hablar del producto, no de la
persona, y presentar el hallazgo como información, no como acusación. Es
contenido de examen, no cortesía.

**9 · b.** En cascada, las pruebas **dinámicas** esperan al código, pero las
actividades de prueba empiezan con el primer documento revisable. Confundir
«prueba» con «ejecutar» es lo que hace fallar esta pregunta.

**10 · d.** La correspondencia una a una entre actividad de desarrollo y
actividad de prueba es la buena práctica que aplica a cualquier modelo. Las
demás opciones son o malas prácticas o exageraciones.

**11 · a.** Entre módulos del mismo sistema: integración de componentes. Entre
sistemas distintos: integración de sistemas. Es la misma distinción de la
pregunta 9 del examen 1, planteada al revés.

**12 · c.** La aceptación operativa la hace quien va a operar el sistema:
respaldos, restauración, migraciones, tareas programadas, seguridad de
operación. No mira reglas de negocio.

**13 · d.** Cambiar algo que usa todo el sistema es el caso de libro de la
regresión: no estás comprobando la corrección de un defecto, estás comprobando
que no rompiste lo que ya funcionaba.

**14 · b.** Los desencadenantes de mantenimiento son modificaciones,
migraciones y retiro. La primera versión no es mantenimiento: es desarrollo.

**15 · d.** Todo producto de trabajo legible es candidato: requisitos, historias
de usuario, diseño, código, casos de prueba, guías, contratos, hasta modelos.
Es una de las preguntas más fáciles del capítulo III y se falla por leer de
prisa.

**16 · a.** El líder de revisión decide el alcance, las personas y el momento;
el moderador conduce la sesión, cuida el tono y media si hay fricción. En
equipos pequeños los junta la misma persona, pero el temario los distingue.

**17 · d.** La escala va de menos a más formal: informal, walkthrough, técnica,
inspección. La inspección es la única con roles definidos, métricas y criterios
de entrada y salida.

**18 · c.** Una herramienta de análisis estático ve la estructura del código:
variables sin usar, código inalcanzable, complejidad, incumplimiento del
estándar. Lo que **no** puede ver es si la lógica de negocio es correcta.

**19 · a.** Dos condiciones combinadas con «y» piden tabla de decisión. Cuatro
combinaciones posibles, cuatro columnas.

**20 · d.** Tres valores: el límite y sus dos vecinos. Para el 18 son 17, 18 y
19. La opción a) es el método de dos valores.

**21 · b.** Tres particiones: menor que 18, de 18 a 65, mayor que 65. Un caso
por partición.

**22 · c.** 0-switch es una prueba por transición válida. Hay 6, hacen falta 6.
La opción b) es el número de **estados**, que es la confusión que la pregunta
está buscando.

**23 · b.** 0-switch: cada transición suelta. 1-switch: cada par de transiciones
consecutivas, que es donde salen los defectos de secuencia. El número del
nombre es cuántos «saltos extra» encadenas.

**24 · c.** Con edad = 30 se ejecutan las líneas 1, 2, 3 y 7. La 5 no. Cuatro de
cinco sentencias = 80 %.

**25 · b.** La decisión tiene dos salidas y sólo recorriste la verdadera: 50 %.
Para llegar al 100 % necesitas un segundo caso, por ejemplo edad = 15.

**26 · d.** Ramas es la más fuerte. Las preguntas 24 y 25 son la demostración:
80 % de sentencias con 50 % de ramas. Nunca verás lo contrario.

**27 · a.** Exploratorias, adivinación de errores y listas de comprobación son
las tres basadas en experiencia. Las otras opciones son de especificación o de
estructura.

**28 · c.** La checklist es memoria de equipo: condiciones que ya nos mordieron
alguna vez y no queremos volver a olvidar.

**29 · d.** Los criterios de aceptación salen de la conversación entre las tres
partes. Si los escribe una sola, vuelves a tener el problema que el enfoque
colaborativo quiere evitar.

**30 · a.** Entrada es lo que hace falta **para empezar**; salida es lo que hace
falta **para dar por terminado**. Cobertura ejecutada y defectos bajo umbral es
salida; entorno, base de prueba y datos son entrada.

**31 · b.** (6 + 4 × 9 + 18) ÷ 6 = (6 + 36 + 18) ÷ 6 = 60 ÷ 6 = **10 días**.
El error frecuente es promediar los tres a secas, que daría 11.

**32 · c.** Riesgo de producto = el producto falla y hace daño. Riesgo de
proyecto = el proyecto se retrasa, se queda sin gente o sin presupuesto. Las
opciones a), b) y d) son las tres de proyecto.

**33 · d.** Probabilidad de que ocurra por impacto si ocurre. Severidad y
prioridad son atributos del defecto ya encontrado, que es otra cosa.

**34 · b.** Severidad: cuánto daño hace el fallo. Prioridad: con cuánta urgencia
hay que arreglarlo. La decide el negocio y puede no coincidir con la severidad,
como demuestra la pregunta siguiente.

**35 · a.** El sistema funciona perfecto, así que la severidad es baja. Pero
sale en la portada y lo ve todo el mundo, así que puede ser lo primero que se
corrija. Es el ejemplo canónico de severidad baja con prioridad alta.

**36 · c.** El reporte tiene que permitir **reproducir** y **decidir**: pasos,
esperado, real, entorno, severidad y prioridad. Nunca lleva culpables ni
promete la corrección.

**37 · b.** Sin gestión de configuración no sabes qué versión probaste, y un
resultado que no se puede reproducir no sirve como evidencia.

**38 · b.** Base ancha: muchas pruebas unitarias, rápidas y baratas. Punta
estrecha: pocas de interfaz, lentas y frágiles. La pirámide invertida es
justamente el antipatrón.

**39 · a.** El costo escondido de automatizar es el mantenimiento: la suite
envejece con el producto. El segundo riesgo es confiar de más y dejar de mirar.

**40 · a.** Piloto primero: en un proyecto acotado, con criterios de evaluación,
y luego se decide. Comprar para toda la organización sin piloto es la forma más
cara de descubrir que la herramienta no encajaba.

---
