[hoja]

## Examen 1 · Fundamentos, ciclo de vida y pruebas estáticas

Veinte preguntas. Cubre los capítulos I, II y III. **Las respuestas están al
final del documento**, en la hoja de respuestas 1, para que no las veas de
reojo. Anota las tuyas en una hoja aparte antes de ir a comprobar.

**1.** ¿Cuál de las siguientes es la definición correcta de un defecto?
- a) La imperfección en un producto de trabajo que puede provocar un fallo.
- b) La equivocación que comete una persona al escribir código.
- c) La manifestación visible de un problema durante la ejecución.
- d) La razón de fondo por la que alguien se equivocó.

**2.** Un sistema falla en producción por una tormenta solar que altera la
memoria del servidor. ¿Qué afirmación es correcta?
- a) Todo fallo tiene un defecto detrás.
- b) Es un defecto de diseño, por no prever la radiación.
- c) Un fallo puede tener causas ambientales y no un defecto.
- d) No es un fallo, porque el software estaba bien escrito.

**3.** El equipo ejecuta las mismas 200 pruebas automatizadas desde hace un año
y hace meses que no encuentran nada. ¿Qué principio explica esto?
- a) Las pruebas exhaustivas son imposibles.
- b) Los defectos se agrupan.
- c) La ausencia de defectos es una falacia.
- d) La paradoja del pesticida.

**4.** ¿Cuál de estas actividades pertenece al **análisis** de pruebas?
- a) Derivar casos de prueba a partir de las condiciones.
- b) Identificar las condiciones de prueba evaluando la base de prueba.
- c) Preparar los datos de prueba y el entorno.
- d) Comparar el resultado real con el esperado.

**5.** ¿Qué diferencia hay entre verificación y validación?
- a) Verificar es contra la especificación; validar es contra la necesidad real.
- b) Son sinónimos dentro del temario.
- c) Verificar lo hace el equipo; validar lo hace una herramienta.
- d) Verificar es siempre estático; validar es siempre dinámico.

**6.** Una organización entrega un sistema sin defectos conocidos y el cliente
lo rechaza porque no resuelve su problema. ¿Qué principio ilustra?
- a) Las pruebas muestran la presencia de defectos.
- b) Las pruebas tempranas ahorran tiempo y dinero.
- c) Las pruebas dependen del contexto.
- d) La ausencia de defectos es una falacia.

**7.** ¿Cuál de estas es una actividad de **depuración** y no de prueba?
- a) Ejecutar un caso y registrar que falló.
- b) Diseñar casos con valores límite.
- c) Localizar en el código la línea que causa el fallo y corregirla.
- d) Reportar el defecto con pasos para reproducirlo.

**8.** El sesgo de confirmación explica principalmente por qué:
- a) Las pruebas exhaustivas son imposibles.
- b) A quien escribió el código le cuesta ver sus propios defectos.
- c) Los defectos se agrupan en pocos módulos.
- d) Hay que renovar los casos de prueba cada cierto tiempo.

**9.** ¿En qué nivel de prueba se comprueba que el sistema intercambia datos
correctamente con un servicio externo de facturación?
- a) Prueba de integración de sistemas.
- b) Prueba de componente.
- c) Prueba de integración de componentes.
- d) Prueba de aceptación de usuario.

**10.** Las pruebas **beta** se caracterizan porque:
- a) Se hacen en las instalaciones de quien desarrolla, con usuarios invitados.
- b) Las hace el equipo de desarrollo antes de liberar.
- c) Son obligatorias por contrato.
- d) Las hacen personas usuarias reales en su propio entorno.

**11.** Se corrigió un defecto y se ejecuta de nuevo el caso que fallaba. Eso es:
- a) Prueba de regresión.
- b) Prueba de humo.
- c) Prueba de confirmación.
- d) Prueba de aceptación operativa.

**12.** ¿Cuál de estas es una prueba **no funcional**?
- a) Comprobar que el descuento se calcula correctamente.
- b) Comprobar que el sistema responde en menos de dos segundos con 500
  usuarios simultáneos.
- c) Comprobar que el botón «guardar» guarda.
- d) Comprobar que el flujo de compra se completa de principio a fin.

**13.** ¿Qué es *shift left*?
- a) Llevar las actividades de prueba lo más temprano posible en el ciclo.
- b) Mover el equipo de pruebas a otra área de la empresa.
- c) Ejecutar las pruebas de regresión antes que las funcionales.
- d) Automatizar todo lo que se pueda.

**14.** El análisis de impacto en pruebas de mantenimiento sirve para:
- a) Estimar el costo del proyecto completo.
- b) Decidir si el defecto es de severidad alta.
- c) Escoger la herramienta de automatización.
- d) Determinar qué partes del sistema afecta un cambio y cuánta regresión hace
  falta.

**15.** ¿Cuál de estas NO es una prueba estática?
- a) Una inspección del documento de requisitos.
- b) Ejecutar los casos de prueba de humo tras el despliegue.
- c) Un análisis estático del código con una herramienta.
- d) Una revisión técnica del diseño de arquitectura.

**16.** En una **inspección**, ¿quién NO debe liderar la reunión?
- a) El moderador.
- b) El líder de revisión.
- c) El autor del producto de trabajo.
- d) Un revisor experto en el dominio.

**17.** El beneficio principal de las pruebas estáticas frente a las dinámicas es:
- a) Encuentran defectos directamente, antes de que puedan producir un fallo.
- b) Son más rápidas de ejecutar.
- c) No necesitan personas.
- d) Sustituyen a las pruebas dinámicas.

**18.** Ordena correctamente las etapas de una revisión formal:
- a) Inicio → planificación → revisión individual → corrección → comunicación.
- b) Revisión individual → planificación → inicio → comunicación → corrección.
- c) Planificación → revisión individual → inicio → corrección → comunicación.
- d) Planificación → inicio → revisión individual → comunicación y análisis →
  corrección y reporte.

**19.** Una revisión **guiada** (walkthrough) se caracteriza porque:
- a) La lidera un moderador formado y produce métricas formales.
- b) No tiene proceso definido ni deja documentación.
- c) La lidera el autor y sirve para evaluar calidad, formar y consensuar.
- d) Sólo la usan los equipos de seguridad.

**20.** ¿Cuál de estos es un factor de éxito de las revisiones?
- a) Revisar documentos lo más grandes posible para aprovechar la reunión.
- b) Revisar en trozos pequeños y dar retroalimentación rápida.
- c) Que el autor defienda su trabajo de las críticas.
- d) Que no haya criterios de entrada, para no frenar el proceso.

---
