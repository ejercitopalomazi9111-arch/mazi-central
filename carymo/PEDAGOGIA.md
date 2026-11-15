# CARYMO · cómo se aprende de verdad

Carlos, 14 de noviembre: *«estudia libros de pedagogía para hacer todo el sistema de esta madre pedagógico y que sea más eficaz»*.

Este documento junta lo que la investigación sí respalda, lo que ya hace CARYMO y lo que falta, en ese orden. La regla es la misma de siempre: **nada sin fuente**. Si algo es moda y no tiene pruebas, va en la lista de lo que NO hacemos.

## Las fuentes

| Libro o estudio | Qué aporta |
|---|---|
| Dunlosky, Rawson, Marsh, Nathan y Willingham (2013). *Improving Students' Learning With Effective Learning Techniques*. Psychological Science in the Public Interest, 14(1) | Revisa 10 técnicas de estudio. Utilidad **alta**: autoevaluarse (práctica de recuperación) y repasar en días separados. **Moderada**: preguntarse «¿por qué?», explicárselo a uno mismo e intercalar temas. **Baja**: subrayar, releer y resumir |
| Brown, Roediger y McDaniel (2014). *Make It Stick* | El libro de divulgación de la ciencia de recuperar, espaciar e intercalar. Explica las «dificultades deseables»: lo que se siente más difícil al estudiar suele ser lo que más se queda |
| Weinstein, Sumeracki y Caviglioli (2018). *Understanding How We Learn* | Seis estrategias: repaso espaciado, intercalado, práctica de recuperación, elaboración, ejemplos concretos y doble codificación (palabra + imagen) |
| Roediger y Karpicke (2006). *Test-Enhanced Learning*. Psychological Science | Quien se evalúa recuerda mucho más a la semana que quien relee el mismo tiempo, aunque al salir del estudio crea que aprendió menos |
| Cepeda, Vul, Rohrer, Wixted y Pashler (2008). *Spacing Effects in Learning: A Temporal Ridgeline of Optimal Retention*. Psychological Science | El hueco ideal entre repasos depende de cuándo es la prueba: con examen cerca, huecos cortos; lejos, más largos (aprox. 10–20 % del tiempo que falta) |
| Rohrer y Taylor (2007). *The shuffling of mathematics problems improves learning*. Instructional Science | Mezclar tipos de problemas cuesta más al practicar y rinde más en el examen |
| Sweller (1988), teoría de la carga cognitiva; Sweller, van Merriënboer y Paas (2019) | La memoria de trabajo es chiquita: pocas ideas a la vez, ejemplos resueltos antes que problemas sueltos para el que va empezando |
| Mayer (2020). *Multimedia Learning* (3.ª ed.) | Principios para pantallas: quitar lo que distrae (coherencia), resaltar lo importante (señalización), en pedazos (segmentación), voz + imagen mejor que texto + imagen (modalidad) |
| Hattie y Timperley (2007). *The Power of Feedback*. Review of Educational Research | La retroalimentación sirve cuando dice dónde estás, a dónde vas y qué sigue; la que sólo dice «bien» o «mal» sirve poco |
| Bloom (1984). *The 2 Sigma Problem*. Educational Researcher | Con tutoría uno a uno y aprendizaje por dominio (no se avanza hasta dominar), el alumno promedio rinde como el mejor del salón. Es lo que una app puede imitar |
| Pashler, McDaniel, Rohrer y Bjork (2008). *Learning Styles: Concepts and Evidence* | **No** hay pruebas de que enseñar según el «estilo de aprendizaje» (visual, auditivo…) ayude. Por eso CARYMO no lo hace |

## Lo que ya hace CARYMO, y dónde

| Principio | Cómo está en la app | Archivo |
|---|---|---|
| **Práctica de recuperación** | Cada lección termina en cuestionario; hay tarjetas, simulacro y examen. Escribir la respuesta (no sólo escoger) pide sacarla de la memoria | `carymo.js` (`cuestionario`, `EJ`) |
| **Repaso espaciado** ✱ nuevo | Cada pregunta entra a cajas tipo Leitner: la fallada vuelve mañana y la acertada se aleja 1-2-4-8-16 días. Con examen, el hueco nunca pasa de ~15 % de lo que falta (Cepeda 2008) y la última semana todo vuelve cada 1-2 días | `repaso.js` |
| **Intercalado** ✱ nuevo | El «Repaso de hoy» alterna temas y planes, no trae tres seguidas del mismo | `repaso.js` (`pendientes`) |
| **Lo que más fallas** ✱ nuevo | El repaso trae primero lo más fallado | `repaso.js` |
| **Ejemplos concretos y resueltos** ✱ nuevo | La IA escribe en cada lección un ejemplo concreto o resuelto paso a paso y una analogía con la vida diaria | `carymo.js` (`sistemaLeccion`) |
| **Elaboración** ✱ nuevo | Al menos 2 preguntas por lección piden aplicar o explicar («¿por qué…?», «¿qué pasaría si…?») | `carymo.js` (`sistemaLeccion`) |
| **Retroalimentación útil** | Al fallar se ve la respuesta y «¿Por qué?»; los distractores salen de errores típicos y el «porque» explica por qué tentaban ✱ | `carymo.js` |
| **Carga cognitiva** | Una idea por pantalla, máximo dos o tres renglones, con dibujo que se traza solo | `carymo.js` (`abrirLeccion`) |
| **Doble codificación** | Dibujo en cada idea; diagramas que se tocan; modelos 3D; el pizarrón dibuja mientras habla | `diagrama.js`, `modelos/`, `sala/explica.html` |
| **Modalidad (voz + imagen)** | La cátedra en el pizarrón va con voz | `sala/explica.html` |
| **Dominio** | La que fallas vuelve al final del cuestionario hasta que sale; el camino avanza tema por tema hacia el examen | `carymo.js` |
| **Motivación** | Racha, XP, ligas, mascota y amigos. Ojo: está para que regreses al día siguiente, que es justo lo que el repaso espaciado necesita | varios |

## Lo que sigue (en orden de cuánto rinde)

1. **Pregunta antes de la lección.** Contestar algo antes de ver el tema mejora lo que se aprende después, aunque se falle (efecto de pre-evaluación; Richland, Kornell y Kao, 2009). Una pregunta corta al abrir cada nivel.
2. **¿Qué tan seguro estás?** Pedir la seguridad antes de ver si estuvo bien ayuda a calibrar lo que uno cree que sabe. Las respuestas «segurísimo pero mal» van primero al repaso.
3. **Explícalo con tus palabras.** Una pregunta abierta por unidad que la IA califica contra la lección (autoexplicación).
4. **Desvanecer la ayuda.** Primero ejemplo resuelto completo, luego medio resuelto, luego el problema solo (ejemplos desvanecidos, Renkl y Atkinson 2003). Sobre todo en matemáticas y física.
5. **Nivel por alumno.** Si acierta todo, la lección siguiente sube de dificultad; si falla mucho, baja y repite con otro ejemplo.

## Lo que NO hacemos, y por qué

- **Estilos de aprendizaje** («eres visual»): sin pruebas (Pashler 2008).
- **Releer o subrayar como estudio**: sensación de saber sin saber (Dunlosky 2013).
- **Premiar sólo el tiempo en la app**: el XP sale de contestar, no de estar.
