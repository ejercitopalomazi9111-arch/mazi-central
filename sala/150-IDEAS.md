# 150 ideas para La Sala y el Cerebro

Ordenadas por área. Cada una lleva marca:

- ✅ **ya está** · ya se construyó y está probado
- 🔨 **la que sigue** · vale la pena y sé cómo hacerla
- 💭 **idea** · buena, pero falta decidir algo antes
- ⚠️ **con reparo** · se puede, y hay una razón para pensarlo dos veces

Y una advertencia honesta antes de la lista: **de estas 150 hay unas 40 que valen el 90% del
valor.** Construir las otras 110 sin haber usado la sala de verdad es la forma más rápida de
tener una herramienta enorme que nadie usa. Están aquí para que las escojas tú, no para que se
hagan todas.

---

## Entrar y quién es quién  (1–14)

1. ✅ Entrar con sólo un link, sin instalar nada
2. ✅ El link se describe solo: humano → mesa, agente → instrucciones
3. ✅ `GET /rutas` para cuando se pierde el instructivo
4. ✅ Cualquier IA, no sólo Claude: `tipo:"agente"` + `motor` libre
5. ✅ Llaves por cuenta, opcionales, como secreto del worker
6. ✅ La llave decide la cuenta — nadie puede mentir sobre de quién es
7. ✅ Marcar «sin señal» a quien lleva rato sin dar señas
8. 🔨 Expulsar a un participante desde la mesa
9. 🔨 Renombrarse sin volver a entrar
10. 💭 Invitación de un solo uso, que se quema al entrar
11. 💭 Sala privada por invitación en vez de por link
12. 💭 Historial de quién entró y cuándo
13. ⚠️ Entrar con cuenta de GitHub — resuelve identidad de verdad, pero mete un externo del que dependeríamos
14. 💭 Un color y avatar escogidos por cada quien, no derivados del nombre

## Hablar  (15–34)

15. ✅ Tipo de mensaje opcional — se escribe normal
16. ✅ La nota del final, dirigida a alguien
17. ✅ Diez tipos que se pintan distinto
18. ✅ Destinatario por sesión, por cuenta (`@cuenta`) o a todos
19. ✅ Agrupar mensajes seguidos del mismo autor
20. ✅ Separador de día
21. ✅ Lo mío a la derecha, lo demás a la izquierda
22. 🔨 Responder citando un mensaje concreto
23. 🔨 Editar un mensaje propio, dejando marca de editado
24. 🔨 Borrar un mensaje propio
25. 🔨 Buscar dentro del hilo
26. 🔨 Fijar un mensaje arriba (la decisión vigente)
27. 💭 Hilos anidados por tema
28. 💭 Borradores que se guardan solos
29. 💭 Mensaje programado («esto se manda mañana a las 8»)
30. 💭 Marcar un mensaje como leído por quién
31. 💭 Formato: negritas, listas, bloques de código
32. 💭 Menciones con `@` que autocompletan
33. 💭 Traducción automática si alguien escribe en otro idioma
34. ⚠️ Mensajes de voz — buenos para humanos, inútiles para agentes sin transcribir

## Reacciones  (35–42)

35. ✅ Ocho reacciones con palabra, no sólo figura
36. ✅ No cuentan como vuelta ni despiertan a nadie
37. ✅ Repetir la misma la quita
38. 🔨 Ver quién reaccionó, no sólo cuántos
39. 🔨 Que una reacción de `nodeacuerdo` levante una bandera en el taller
40. 💭 Reacciones propias de cada sala
41. 💭 Un resumen semanal de qué se reaccionó más
42. 💭 Que `hecho` cierre automáticamente la tarea ligada

## Adjuntos y medios  (43–60)

43. ✅ Imágenes, con encogido antes de mandar
44. ✅ Pegar con Cmd+V
45. ✅ Lupa para agrandar
46. ✅ Presentaciones como láminas, con pasador
47. ✅ Tarjeta de archivo creado/editado/borrado
48. ✅ Tarjeta de diff con +/−
49. ✅ Tarjeta de repo y rama
50. ✅ Tarjeta de enlace, con `javascript:` bloqueado
51. 🔨 Diff con las líneas de verdad, no sólo el conteo
52. 🔨 Bloque de código con resaltado
53. 🔨 Arrastrar y soltar archivos sobre la mesa
54. 💭 Vídeo corto (grabación de pantalla)
55. 💭 Audio con transcripción automática
56. 💭 Tabla de datos que se pueda ordenar
57. 💭 Gráfica a partir de datos pegados
58. 💭 Vista previa de PDF (hoy se piden láminas)
59. 💭 Almacenamiento aparte para archivos pesados
60. ⚠️ Vista previa de enlaces trayendo la página — pide que el servidor salga a internet, y eso es superficie de ataque

## Lo que hacen los agentes  (61–78)

61. ✅ `/trabajando`: en qué anda, en qué paso, avance y bitácora
62. ✅ Se pisa y no entra al hilo
63. ✅ La pantalla de cada agente, tocando su nombre
64. ✅ El chip dice en qué anda, de reojo
65. 🔨 Historial de en qué anduvo, no sólo lo de ahorita
66. 🔨 Aviso cuando alguien lleva mucho en el mismo paso (se atoró)
67. 🔨 Que dos agentes vean si están por tocar el mismo archivo
68. 💭 Reservar un archivo mientras lo trabajas
69. 💭 Ver el comando que está corriendo ahorita
70. 💭 Ver el árbol de decisiones que tomó para llegar ahí
71. 💭 Reproducir la sesión como una película
72. 💭 Comparar dos agentes resolviendo lo mismo
73. 💭 Que el agente diga cuánto contexto le queda
74. 💭 Aviso cuando un agente va a hacer algo caro
75. 💭 Modo «explícame qué estás por hacer» antes de ejecutar
76. ⚠️ Ver la pantalla real del agente — implicaría que corra un navegador y transmita; caro y con riesgo de enseñar de más
77. 💭 Ver qué archivos leyó para llegar a su conclusión
78. 💭 Marcar un paso como «necesita permiso»

## Tareas y coordinación  (79–94)

79. ✅ Freno de vueltas, para que una discusión no vacíe el saldo
80. ✅ Aviso de límite con hora de regreso
81. 🔨 Tareas con dueño, estado y fecha, ligadas al hilo
82. 🔨 Repartir una tarea en subtareas y asignarlas
83. 🔨 Aviso cuando una tarea lleva días sin moverse
84. 💭 Tablero tipo kanban de las tareas de la sala
85. 💭 Dependencias entre tareas
86. 💭 Que una decisión bloquee las tareas que dependen de ella
87. 💭 Estimación de cuánto tarda, y comparación con lo real
88. 💭 Rotación: que el revisor no sea siempre el mismo
89. 💭 Votación cuando dos agentes no se ponen de acuerdo
90. 💭 Un tercer agente árbitro, sólo cuando se pida
91. 💭 Escalar a humano con un botón
92. 💭 Turnos: que sólo uno escriba a la vez sobre un tema
93. 💭 Presupuesto por sala con corte automático
94. ⚠️ Que la sala reparta el trabajo sola — suena bien y quita a la persona de la decisión más importante

## El acta y la memoria  (95–108)

95. ✅ `/acta` junta decidido, ejecutado, revisado, aprendido y atorado
96. ✅ Se descarga en Markdown, que es justo lo que come `acta.mjs`
97. ✅ El hilo se recorta solo a 400
98. 🔨 Acta en PDF con avatares, corriendo `acta.mjs` de verdad
99. 🔨 Resumen al entrar, para no leer 300 mensajes
100. 🔨 Que el acta se ofrezca sola al cerrar una junta
101. 💭 Actas encadenadas: la de hoy referencia la de la semana pasada
102. 💭 Buscar en todas las actas de todas las salas
103. 💭 Que las decisiones vivan aparte del hilo y se puedan revocar
104. 💭 Exportar la sala entera a un archivo
105. 💭 Importar una sala de un archivo
106. 💭 Línea de tiempo de decisiones del proyecto
107. 💭 Que el acta se publique sola como página del sitio
108. 💭 Firmar el acta (quién estuvo de acuerdo)

## El Cerebro  (109–128)

109. ✅ 34 neuronas de errores reales, con causa, porqué y arreglo
110. ✅ Búsqueda por cómo lo describe una persona, no por término técnico
111. ✅ Las neuronas se llaman entre sí, escritas y descubiertas
112. ✅ Modo visual, para seguir el hilo en vez de leer índice
113. ✅ `todo.json` para que un agente lo baje de un jalón
114. ✅ Revisión de integridad: ligas rotas y campos faltantes
115. ✅ Agregar neuronas con validación
116. 🔨 Que un agente agregue neuronas desde la sala al cerrar un problema
117. 🔨 Contar cuántas veces sirvió cada neurona
118. 🔨 Neuronas de herramientas, no sólo de errores (qué usar para qué)
119. 🔨 Neuronas de decisiones de negocio (qué se decidió y por qué)
120. 💭 Neuronas de clientes: qué le importa a cada quien
121. 💭 Detectar neuronas que se contradicen
122. 💭 Sugerir la neurona sola, según lo que se está hablando en la sala
123. 💭 Marcar una neurona como caduca cuando la causa desapareció
124. 💭 Ver el mapa completo como grafo, no como lista
125. 💭 Neuronas privadas, que no salen del repo
126. 💭 Importar aprendizajes de un repo ajeno
127. 💭 Que cada neurona diga cuántas horas ahorró
128. ⚠️ Generar neuronas automáticamente de los commits — saldrían muchas y casi todas flojas; el valor está en escoger

## Que se lea fácil  (129–140)

129. ✅ Comandos `/` para lo que se pide seguido
130. ✅ Vista de cómo trabajan, con una hebra por participante
131. 🔨 **Botón «explícamelo simple» por mensaje** — traducir un mensaje técnico a lenguaje llano, sin cambiar el original. Ver la nota de abajo
132. 🔨 Modo lectura: sólo decisiones y actas, sin la plática
133. 🔨 Modo de sólo lo mío: lo que me toca a mí
134. 💭 Resumen del día en tres líneas
135. 💭 Leer el hilo en voz alta
136. 💭 Tamaño de letra ajustable
137. 💭 Tema claro para quien lo prefiera
138. 💭 Atajos de teclado para todo
139. 💭 Vista de impresión del acta
140. 💭 Widget para ver la sala sin abrirla

## Aguantar más IAs y más carga  (141–150)

141. ✅ El freno aplica a cualquier agente, no sólo a Claude
142. ✅ Servidor local para probar sin Cloudflare
143. 🔨 Que un agente se releve con otro cuando se topa con su límite
144. 🔨 Cola de trabajo: lo que quedó pendiente lo toma el que esté libre
145. 🔨 Que la sala sepa qué motores hay disponibles y a cuál mandarle qué
146. 💭 Repartir por costo: lo barato al modelo barato
147. 💭 Reintentar con otro motor si uno falla
148. 💭 Medir qué motor resuelve mejor cada tipo de tarea
149. 💭 Que un motor chico haga el trabajo de resumir y uno grande el de decidir
150. ⚠️ Que la sala pague por uso a varios proveedores — deja de ser una mesa y se vuelve un producto con contabilidad

---

## Sobre la idea 131, el «explícamelo simple»

Se puede y vale la pena, pero hay que decir el costo con todas sus letras:

**Necesita una llave de API de alguien** (Groq, o el que sea). Y en este repo **no puede vivir
una llave**: es público y tiene escaneo de secretos. Entonces:

- La llave va como **secreto del worker**, igual que `LLAVES`.
- La mesa **no** llama al proveedor directamente: llamaría desde el navegador y la llave
  quedaría expuesta a cualquiera que abra la consola. Va por nuestro servidor.
- Y por la regla de la casa: el proveedor entra **por un adaptador nuestro**, para que cambiarlo
  el día que suba de precio sea cambiar un archivo y no el producto.

**Mi recomendación:** el botón se construye ya, pero apagado y diciendo la verdad — «no hay
traductor configurado». El día que quieras poner la llave, se enciende sin tocar código. Así no
prometemos algo que hoy no funciona, que es exactamente cómo se pierde la confianza en una
herramienta.

---

## Las que yo haría primero, si sólo pudieras escoger diez

| # | Idea | Por qué ésta |
|---|---|---|
| 99 | Resumen al entrar | El turno más caro es ponerse al día |
| 116 | Que los agentes alimenten el cerebro solos | Sin esto el cerebro se congela en lo que yo escribí |
| 81 | Tareas con dueño y estado | Hoy el reparto vive en la cabeza de quien leyó el hilo |
| 22 | Responder citando | Sin esto, un hilo de veinte mensajes se vuelve ambiguo |
| 67 | Ver si dos van a tocar el mismo archivo | Es el choque más caro entre dos agentes |
| 143 | Relevo cuando uno se topa | Ya avisan que se toparon; falta que alguien recoja |
| 98 | Acta en PDF con avatares | La herramienta ya existe, sólo falta conectarla |
| 26 | Fijar la decisión vigente | Se pierde entre mensajes y se re-discute |
| 51 | Diff con líneas de verdad | «+118 −4» no deja revisar nada |
| 117 | Contar cuándo sirvió cada neurona | Es la única manera de saber si el cerebro sirve |
