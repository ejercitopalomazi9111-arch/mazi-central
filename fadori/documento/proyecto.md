Asignatura: Metodología de la Investigación I STEAM
Docente: ______________________________
Integrantes: Renata Zoe · Brenda Natalia · Christopher Yuudai · Marco Olvera · Carlos Eduardo Gutiérrez Guevara
Modalidad: Proyecto STEAM

[img:1]

> **Fadori · Proyecto Sin Filas.** Aplicación web de pedidos con fila virtual para reducir el tiempo de espera de los alumnos en la cooperativa escolar del Bachillerato Rembrandt.

[hoja]

## Índice

| Apartado | Página |
| 1. Introducción | {{1. Introducción}} |
| 2. Planteamiento del problema | {{2. Planteamiento del problema}} |
| 3. Justificación | {{3. Justificación}} |
| 4. Objetivos | {{4. Objetivos}} |
| 5. Pregunta de investigación e hipótesis | {{5. Pregunta de investigación e hipótesis}} |
| 6. Marco referencial | {{6. Marco referencial}} |
| 7. Metodología | {{7. Metodología}} |
| 8. STEAM y su relación con el proyecto | {{8. STEAM y su relación con el proyecto}} |
| 9. Desarrollo del proyecto | {{9. Desarrollo del proyecto}} |
| 10. Resultados | {{10. Resultados}} |
| 11. Conclusiones | {{11. Conclusiones}} |
| 12. Referencias bibliográficas | {{12. Referencias bibliográficas}} |
| 13. Anexos | {{13. Anexos}} |

[hoja]

## 1. Introducción

En el Bachillerato Rembrandt el recreo dura treinta minutos y es el único momento de la jornada en que los alumnos pueden comer, descansar y convivir. Durante ese tiempo casi todos acuden a la cooperativa escolar a la vez, y se forma una fila que, según la observación del equipo, consume entre quince y veinte minutos por alumno: más de la mitad del recreo.

Este documento presenta el **Proyecto Sin Filas**, que propone y desarrolla **Fadori**, una aplicación web con la que el alumno consulta el menú, hace su pedido desde el teléfono, recibe un número de turno y pasa a la cooperativa sólo cuando su pedido está listo. La cooperativa, por su parte, recibe los pedidos ordenados, cobra, registra los fiados y consulta sus ventas del día.

El trabajo sigue la estructura de la Metodología de la Investigación: se plantea el problema, se justifica su atención, se fijan los objetivos, la pregunta de investigación y la hipótesis, se presenta el marco referencial, se describe la metodología y la relación del proyecto con el modelo STEAM, y se reportan el desarrollo, los resultados de la prueba piloto y las conclusiones. Al final se incluyen las referencias y los anexos con los instrumentos de medición y las evidencias.

## 2. Planteamiento del problema

### 2.1 Descripción del problema

La cooperativa del Bachillerato Rembrandt atiende a los alumnos en un mostrador, de forma presencial y en el orden en que llegan. Como la demanda se concentra en los primeros minutos del recreo, se forma una fila larga frente al mostrador; los pedidos se toman de viva voz, lo que provoca confusiones, y nadie sabe cuánto le falta para ser atendido, por lo que los alumnos permanecen parados en el pasillo hasta recibir su comida.

**Tabla 1.** Datos del problema observados por el equipo antes del proyecto

| Dato | Valor |
| Duración del recreo | 30 minutos (de 10:00 a 10:30) |
| Tiempo que se pierde en la fila | 15 a 20 minutos por alumno |
| Parte del recreo que consume la fila | 50 % a 67 % |
| Personas que despachan en la cooperativa | 1 |

Los tiempos son una estimación del equipo a partir de la observación directa; la medición con cronómetro forma parte de la metodología (apartado 7).

El problema no se queda en la fila. Se identificó la siguiente cadena de consecuencias:

1. La fila consume la mayor parte del recreo y deja poco tiempo para comer.
2. El pasillo frente a la cooperativa se llena de alumnos que esperan.
3. La prefectura no puede circular con libertad para hacer su ronda.
4. Se pierde la supervisión de los alumnos que están en zonas alejadas.
5. Como nadie sabe cuándo estará listo su pedido, nadie se retira de la fila.
6. Los alumnos no alcanzan a descansar ni a despejarse.
7. Al regresar al salón con energía sin gastar, aumenta el desorden en clase.

### 2.2 Delimitación

- **Espacial:** la cooperativa escolar del Bachillerato Rembrandt, en Santiago de Querétaro, Querétaro.
- **Temporal:** el ciclo escolar agosto – diciembre de 2026; la prueba piloto se realizó en el recreo, en octubre.
- **Población:** los alumnos que compran en la cooperativa y el personal que la atiende.
- **Alcance:** el proyecto ordena el pedido, la fila y el cobro. El pago con tarjeta desde la aplicación queda fuera, porque requiere una pasarela de pago y la autorización de la escuela y de los padres.

## 3. Justificación

Atender este problema es **conveniente** porque el recreo es un tiempo que la escuela destina al descanso y a la alimentación de los alumnos; si la mitad se pierde en una fila, ese propósito no se cumple. Es **relevante socialmente** porque beneficia a tres actores a la vez: el alumno recupera su tiempo, la cooperativa despacha de forma ordenada y la prefectura puede supervisar sin que el pasillo esté bloqueado.

Tiene **implicaciones prácticas** inmediatas: la solución se usa desde los teléfonos que los alumnos ya tienen y desde una computadora en la cooperativa, sin comprar equipo especial, y sigue funcionando aunque falle el internet. Además, la cooperativa obtiene un registro de sus ventas y de los fiados, que antes se llevaban de memoria o en papel.

Por último, tiene **utilidad metodológica**: la propia aplicación registra la hora en que se hace, se prepara y se entrega cada pedido, de modo que el tiempo de espera se mide con datos y no sólo con la percepción de los alumnos. Esto permite comprobar la hipótesis y repetir la medición en otros ciclos o en otras escuelas.

El proyecto también es coherente con los lineamientos vigentes para los establecimientos de consumo escolar (SEP y Secretaría de Salud, 2024), pues el menú digital sólo muestra los productos que la cooperativa da de alta y permite retirar en un momento los que ya no están permitidos o se agotaron.

## 4. Objetivos

### 4.1 Objetivo general

Reducir el tiempo de espera de los alumnos en la cooperativa del Bachillerato Rembrandt mediante una aplicación web de pedidos con fila virtual, durante el ciclo escolar agosto – diciembre de 2026.

### 4.2 Objetivos específicos

1. Medir el tiempo de espera y la cantidad de alumnos formados antes y después de usar la aplicación.
2. Diseñar y programar una aplicación con tres vistas: la del alumno, la del mostrador de la cooperativa y la pantalla de turnos.
3. Ordenar la atención con números de turno y un aviso al teléfono cuando el pedido esté listo.
4. Registrar las ventas, los cobros y los fiados para que la cooperativa lleve sus cuentas en orden.
5. Evaluar los resultados contra la meta de una espera menor de cinco minutos por alumno.

## 5. Pregunta de investigación e hipótesis

Pregunta de investigación: ¿En qué medida una aplicación de pedidos con fila virtual reduce el tiempo que los alumnos esperan en la cooperativa escolar durante el recreo?

**Hipótesis de investigación (Hi):** el uso de Fadori reduce el tiempo de espera de los alumnos en la cooperativa de entre 15 y 20 minutos a menos de 5 minutos por pedido.

**Hipótesis nula (Ho):** el uso de Fadori no reduce el tiempo de espera de los alumnos en la cooperativa.

**Variable independiente:** el uso de la aplicación Fadori. **Variable dependiente:** el tiempo de espera, en minutos, desde que se hace el pedido hasta que se entrega.

## 6. Marco referencial

### 6.1 Marco teórico

**Teoría de colas.** La teoría de colas estudia los sistemas en los que llegan «clientes» que deben esperar para recibir un servicio. Sus antecedentes están en el trabajo de Erlang (1909) sobre la congestión de las centrales telefónicas, y hoy se aplica a bancos, hospitales, restaurantes y redes de computadoras (Kleinrock, 1975; Taha, 2012). Un sistema de colas se describe por la forma en que llegan los clientes, el tiempo que toma atender a cada uno, el número de servidores y la disciplina con que se elige al siguiente, como «el primero que llega es el primero que se atiende».

Esta teoría explica por qué la fila de la cooperativa crece tanto: en los primeros minutos del recreo llegan muchos más alumnos de los que una sola persona puede atender. Digitalizar el pedido no aumenta esa capacidad; lo que sí cambia es **dónde espera el alumno** y **en qué orden** se prepara la comida. Por eso la aplicación separa la espera del lugar: el alumno espera su turno en la mesa o en el patio, no frente al mostrador.

**La psicología de la espera.** Maister (1985) mostró que la espera se percibe más larga cuando es incierta, cuando no se explica y cuando se pasa sin hacer nada. Por eso la aplicación informa el número de turno, cuántos pedidos faltan y un tiempo estimado, y avisa cuando el pedido está listo.

**Diseño centrado en el usuario.** Norman (2013) plantea que una interfaz debe dejar claro qué se puede hacer y qué está pasando en cada momento. El alumno tiene poco tiempo y la persona de la cooperativa trabaja con las manos ocupadas, así que la aplicación usa botones grandes, fotos de cada producto y pocos pasos para pedir.

### 6.2 Marco conceptual

**Tabla 2.** Conceptos clave del proyecto

| Concepto | Definición |
| Cooperativa escolar | Establecimiento de consumo escolar que prepara y vende alimentos y bebidas dentro de la escuela (SEP y Secretaría de Salud, 2024). |
| Fila virtual | Lista ordenada de pedidos que se lleva en un sistema, de modo que el cliente conserva su lugar sin estar parado en la fila. |
| Turno | Número que identifica el lugar de un pedido en la fila virtual. |
| Aplicación web progresiva | Sitio web que se instala en el teléfono como una aplicación y puede funcionar sin conexión (Mozilla, s. f.). |
| Tiempo de espera | Minutos que pasan desde que el alumno hace su pedido hasta que lo recibe. |
| Fiado | Venta que el alumno queda a deber y que se registra para pagarse después. |

### 6.3 Marco contextual

El Bachillerato Rembrandt es un bachillerato tecnológico con especialidad en programación, ubicado en Santiago de Querétaro. El recreo es de las 10:00 a las 10:30 horas y la cooperativa es atendida por una persona, que prepara, cobra y entrega. La mayoría de los alumnos cuenta con teléfono celular y la escuela tiene red inalámbrica. El proyecto lo desarrolla el grupo 3.1 como proyecto de la modalidad STEAM.

### 6.4 Antecedentes

Los sistemas de turnos con pantalla se usan desde hace años en bancos, oficinas de gobierno y servicios de salud para que las personas esperen sentadas y no formadas. En la industria de alimentos, muchas cadenas de comida rápida permiten pedir desde una aplicación y recoger el pedido cuando está listo, lo que reduce la fila en el mostrador. Fadori retoma esas ideas y las adapta a una cooperativa escolar: un recreo corto, clientes que son alumnos y una sola persona para despachar.

## 7. Metodología

### 7.1 Enfoque, tipo y diseño

La investigación tiene un **enfoque cuantitativo**, porque mide el tiempo de espera y el número de alumnos formados para comprobar la hipótesis, y sigue un razonamiento **deductivo**, que parte de la teoría de colas para explicar el problema y proponer la solución (Hernández Sampieri et al., 2014). Es una investigación **aplicada**, porque busca resolver un problema concreto de la escuela, con un **diseño preexperimental de preprueba y posprueba con un solo grupo**: se mide antes de usar la aplicación y se vuelve a medir durante su uso.

### 7.2 Población y muestra

La población la forman los alumnos del Bachillerato Rembrandt que compran en la cooperativa durante el recreo. Para la medición previa se considera una muestra de 20 alumnos elegidos al azar, cronometrados durante tres días. Para la medición posterior se toman todos los pedidos registrados por la aplicación en los días de la prueba piloto.

### 7.3 Variables

**Tabla 3.** Variables de la investigación

| Variable | Tipo | Indicador |
| Uso de la aplicación Fadori | Independiente | Pedidos hechos por la aplicación o anotados en el mostrador |
| Tiempo de espera | Dependiente | Minutos desde el pedido hasta la entrega |
| Alumnos formados frente a la cooperativa | Dependiente | Personas contadas cada cinco minutos |
| Pedidos atendidos por recreo | De control | Número de pedidos entregados |

### 7.4 Instrumentos

- **Registro automático de la aplicación:** guarda la hora en que se hace, se toma, queda listo y se entrega cada pedido.
- **Medidor de fila:** pantalla de la aplicación para contar a mano a las personas formadas y graficar la fila minuto a minuto (Imagen 9).
- **Hoja de cronometraje:** para la medición previa, con cronómetro (Anexo A).
- **Encuesta de satisfacción:** para conocer la opinión de los alumnos y del personal (Anexo B).

### 7.5 Procedimiento y cronograma

**Tabla 4.** Fases del proyecto

| Fase | Actividades | Periodo |
| 1. Diagnóstico | Observación del recreo, estimación del tiempo en fila y entrevista con la cooperativa | Agosto 2026 |
| 2. Diseño | Funciones, pantallas e identidad visual: logo, colores y tipografía | Agosto – septiembre 2026 |
| 3. Desarrollo | Programación de la aplicación, del servidor y de la pantalla de turnos | Septiembre – octubre 2026 |
| 4. Prueba piloto | Uso real en la cooperativa durante el recreo y ajustes con lo observado | Octubre 2026 |
| 5. Evaluación | Medición posterior, encuesta y comparación con la meta | Noviembre 2026 |
| 6. Entrega | Documento, presentación y exposición del proyecto | Diciembre 2026 |

## 8. STEAM y su relación con el proyecto

El modelo STEAM integra ciencia, tecnología, ingeniería, artes y matemáticas para resolver problemas reales (Yakman, 2008). En Fadori cada área tiene una función concreta:

**Tabla 5.** Relación de cada área STEAM con el proyecto

| Área | Qué se hizo | Cómo se relaciona |
| S · Ciencia | Observación del problema, hipótesis y medición antes y después | Aplica el método científico a una situación de la escuela |
| T · Tecnología | Aplicación web, servidor propio y funcionamiento sin internet | Es la herramienta que hace posible la fila virtual |
| E · Ingeniería | Diseño del sistema de colas: turnos, orden de preparación y tope de pedidos | Optimiza un proceso con restricciones reales: poco tiempo y una sola persona |
| A · Artes | Logotipo, colores, tipografía, carteles y comercial | Comunica el proyecto y hace que los alumnos lo usen |
| M · Matemáticas | Promedios, medianas, porcentajes, estimación del tiempo de espera y cuentas de los fiados | Convierte los registros en datos para evaluar la hipótesis |

## 9. Desarrollo del proyecto

Fadori se construyó como una aplicación web que se abre desde el navegador o se instala en el teléfono. Tiene cuatro vistas que comparten la misma información en tiempo real a través de un servidor.

**Vista del alumno.** Muestra el menú con foto y precio de cada producto, un buscador y el asistente «¿cuánto traes?», que arma lo que alcanza con el dinero que el alumno trae. Al pedir, el alumno recibe su número de turno con un tiempo estimado y un aviso cuando su pedido está listo (Imagen 2). Para pedir, crea su cuenta con su correo y una foto de su credencial escolar, que la cooperativa revisa y que se borra del servidor en cuanto se verifica (Imagen 3).

[img:2]

[img:3]

**Pantalla de turnos.** En una computadora o televisión muestra en grande el turno que puede pasar, los que se preparan y los que siguen; una voz anuncia cada turno y, mientras tanto, pasan avisos y anuncios de la escuela (Imagen 4). En modo tableta, quien no trae teléfono puede pedir tocando la pantalla (Imagen 5).

[img:4]

[img:5]

**Mostrador de la cooperativa.** Presenta la fila de pedidos con el que sigue en grande (Imagen 6), el cobro con una calculadora de botones grandes, pedida por la cooperativa para no usar el teclado de la computadora táctil (Imagen 7), y el control de fiados con un estado de cuenta que se puede mandar a los padres de familia, con lo que se compró, lo que se pagó y lo que falta (Imagen 8).

[img:6]

[img:7]

[img:8]

**Medidor.** Cuenta a las personas formadas, grafica la fila minuto a minuto y calcula cuánto tarda cada producto con lo que de verdad tardó, que es lo que alimenta el tiempo estimado del alumno (Imagen 9).

[img:9]

**Decisiones de diseño.** El riesgo principal del proyecto era «mover la fila y no quitarla»: recibir muchos pedidos de golpe no hace que la comida salga más rápido. Por eso la aplicación no sólo toma pedidos: ordena la preparación, estima el tiempo de cada producto, limita a cinco los pedidos por alumno y muestra en pantalla quién puede pasar. La deuda de un alumno nunca se muestra a los demás, y los datos personales se reducen al mínimo.

**Difusión.** Para que los alumnos conocieran la aplicación se diseñaron carteles con un código QR, letreros de mesa y un comercial en video (Imagen 10).

[img:10]

## 10. Resultados

La prueba piloto con la aplicación en uso real se realizó en el recreo del 20 y del 21 de octubre de 2026, con un pedido previo de prueba el 15 de octubre (Imagen 11). Los datos provienen del registro automático de la aplicación y se presentan en conjunto y sin nombres.

**Tabla 6.** Resultados de la prueba piloto (15, 20 y 21 de octubre de 2026)

| Indicador | Resultado |
| Pedidos registrados | 20 |
| Pedidos entregados | 18 |
| Pedidos cancelados | 2 |
| Tiempo de espera, mediana (del pedido a la entrega) | 3.1 minutos |
| Tiempo de espera, promedio | 6.1 minutos |
| Tiempo de espera, mínimo y máximo | 0.3 y 26.4 minutos |
| Pedidos entregados en menos de 5 minutos | 10 de 18 (56 %) |
| Tiempo de preparación, mediana (de «lo tomo» a «listo») | 0.5 minutos |
| Venta de los pedidos entregados | $835.00 (ticket promedio de $46.40) |
| Alumnos con cuenta / con credencial verificada | 24 / 10 |

Elaboración propia con el registro de la aplicación. El máximo de 26.4 minutos corresponde a un pedido hecho antes del recreo, que esperó a que la cooperativa abriera.

Frente a la estimación inicial de 15 a 20 minutos en la fila, la **mediana de 3.1 minutos** indica que la mitad de los pedidos se entregó en poco más de tres minutos, por debajo de la meta de cinco. El promedio de 6.1 minutos es mayor porque lo eleva el pedido hecho antes del recreo; sin ese caso, el promedio baja a 4.9 minutos. En total, 10 de los 18 pedidos entregados (56 %) se entregaron en menos de cinco minutos, así que la meta todavía no se cumple en todos los casos. El tiempo de preparación es corto, lo que indica que la espera se debía sobre todo a la fila y al desorden, no a la cocina.

Estos resultados son **preliminares**: la muestra es pequeña, se obtuvo en sólo dos días y puede incluir pedidos de prueba del equipo, y la medición previa fue una estimación por observación, no un cronometraje formal. Quedan pendientes la medición previa con la hoja de cronometraje, el conteo de alumnos formados con el medidor y la encuesta de satisfacción, programados para la fase de evaluación.

[img:11]

## 11. Conclusiones

El Proyecto Sin Filas cumplió su objetivo de desarrollar una aplicación funcional que ya se usa en la cooperativa del Bachillerato Rembrandt. Los resultados de la prueba piloto **apoyan de manera preliminar la hipótesis de investigación**: la mediana del tiempo de espera fue de 3.1 minutos, por debajo de la meta de cinco minutos y muy por debajo de los 15 a 20 minutos observados antes del proyecto.

El proyecto mostró que la clave no era sólo digitalizar el pedido, sino cambiar el lugar y la forma de esperar: con un turno visible y un aviso, el alumno ya no necesita estar parado frente al mostrador. También dejó a la cooperativa con herramientas que antes no tenía, como el registro de ventas, el cobro con calculadora y el control de los fiados con estado de cuenta para los padres.

Como siguientes pasos se propone completar la medición previa y posterior con los instrumentos de los anexos, ampliar la muestra a varias semanas, aplicar la encuesta de satisfacción y, con la autorización de la escuela, permitir que los alumnos hagan su pedido antes del recreo para que la cooperativa empiece con los pedidos ya preparados.

## 12. Referencias bibliográficas

Erlang, A. K. (1909). The theory of probabilities and telephone conversations. Nyt Tidsskrift for Matematik B, 20, 33–39.

Hernández Sampieri, R., Fernández Collado, C. y Baptista Lucio, P. (2014). Metodología de la investigación (6.ª ed.). McGraw-Hill.

Kleinrock, L. (1975). Queueing systems, volume 1: Theory. Wiley.

Maister, D. H. (1985). The psychology of waiting lines. En J. A. Czepiel, M. R. Solomon y C. F. Surprenant (Eds.), The service encounter (pp. 113–123). Lexington Books.

Mozilla. (s. f.). Aplicaciones web progresivas. MDN Web Docs. Recuperado el 21 de octubre de 2026, de https://developer.mozilla.org/es/docs/Web/Progressive_web_apps

Norman, D. A. (2013). The design of everyday things (ed. revisada). Basic Books.

Secretaría de Educación Pública y Secretaría de Salud. (2024, 30 de septiembre). Acuerdo mediante el cual se establecen los lineamientos generales a los que deberán sujetarse la preparación, la distribución y el expendio de los alimentos y bebidas preparados, procesados y a granel, así como el fomento de los estilos de vida saludable en alimentación, dentro de toda escuela del Sistema Educativo Nacional. Diario Oficial de la Federación.

Taha, H. A. (2012). Investigación de operaciones (9.ª ed.). Pearson Educación.

Yakman, G. (2008). STEAM education: An overview of creating a model of integrative education. En Pupils' Attitudes Towards Technology (PATT-19) Conference: Research on Technology, Innovation, Design & Engineering Teaching. Salt Lake City.

## 13. Anexos

### Anexo A. Hoja de cronometraje de la fila

Anotar la hora en que el alumno se forma y la hora en que recibe su pedido; la espera es la diferencia en minutos.

| # | Fecha | Hora en que se forma | Hora en que recibe | Espera (min) | Observaciones |
| 1 |  |  |  |  |  |
| 2 |  |  |  |  |  |
| 3 |  |  |  |  |  |
| 4 |  |  |  |  |  |
| 5 |  |  |  |  |  |
| 6 |  |  |  |  |  |
| 7 |  |  |  |  |  |
| 8 |  |  |  |  |  |
| 9 |  |  |  |  |  |
| 10 |  |  |  |  |  |

### Anexo B. Encuesta de satisfacción

Escala: 1 = totalmente en desacuerdo, 5 = totalmente de acuerdo.

| Afirmación | 1 | 2 | 3 | 4 | 5 |
| Con Fadori espero menos tiempo para recibir mi comida. |  |  |  |  |  |
| Me resulta fácil hacer mi pedido en la aplicación. |  |  |  |  |  |
| El número de turno y el aviso me dicen claramente cuándo pasar. |  |  |  |  |  |
| Me alcanza más el recreo para comer y descansar. |  |  |  |  |  |
| Recomendaría a mis compañeros usar Fadori. |  |  |  |  |  |

### Anexo C. Funciones de la aplicación

- **Alumno:** menú con fotos, buscador, asistente «¿cuánto traes?», pedido, turno con tiempo estimado, aviso de «listo», cancelar en los primeros cinco minutos e historial de lo que pidió.
- **Mostrador:** fila de pedidos, pedido de a pie para quien no trae teléfono, cobro con calculadora, fiados, estado de cuenta, menú del día, agotados y corte del día.
- **Pantalla:** turnos en grande, voz que anuncia cada turno, anuncios de la escuela y modo tableta para pedir ahí mismo.
- **Medidor:** cifras del día, conteo a mano de la fila física, gráfica de la fila y comparación de antes y después.
