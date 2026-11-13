# Relevo para Luna · 12 nov, noche (Sylcred se quedó sin uso)

Carlos: «Pásale a Luna YA todo lo que llevas porque casi no tienes uso».
Rama: `claude/juego-oregon-3kmicc` (al día con `main`, todo fusionado hasta el #327).

## 1. Ya está hecho y fusionado (#320–#327)

- **Explica** (`sala/explica.html` + `explica.js`, pestaña «Explica» de La Sala). La IA da una clase en voz alta y la va dibujando en un pizarrón, con un lápiz que se mueve, línea del tiempo, listas, diagramas, fórmulas, tablas, referencias y repaso. Negro va de fábrica (rápido); Paulina lee fotos pero tarda unos 2 min. Ya está publicado y contesta 200.
- **Pizarrón de pendientes** (`sala/pizarron.html` + `pizarron.js`, servidor `sala/servidor/pizarron.js`, pestaña «Pizarrón»):
  - tableros por proyecto;
  - notas con estado, quién y fecha;
  - fases o apartados con su % hecho;
  - texto, fotos, líneas de tiempo, listas y flechas.
  
  Abre al instante con lo que guardó el teléfono. Pruebas: `node sala/pruebas-pizarron.mjs`, 36 de 36. **El servidor de La Sala ya está desplegado** y `/pizarron` contesta.
- **Red del Cerebro sin lag** (`cerebro/index.html`, `cerebro/acomodo.js`):
  - abrirla pasó de 2.7 s a 0.3 s;
  - encendida va a 60 cuadros por segundo;
  - arrastrar cuesta 1 ms.
  
  También se arregló que una neurona salía disparada y por eso la red se veía vacía.
- El Cerebro y CLAUDE.md ya tienen lo aprendido.

## 2. ⚠ Revisar primero

A las 21:24 UTC, `https://mazi-central.palomazi9111.workers.dev/sala/pizarron` y `/cerebro/acomodo.js` todavía daban **404**, unos 3 minutos después de fusionar el #327. Lo más probable es que Workers Builds siguiera construyendo. Si siguen en 404:
- revisa que el commit de `main` traiga sus cinco «Workers Builds»;
- si no, aplica la receta de CLAUDE.md («si Cloudflare no publica una fusión…»).

## 3. Lo NUEVO que pidió Carlos · prioridad

> «Quiero que hagas una app tipo Duolingo tipo Knowunity y la conectes a la sala para poder tener ambas cosas.»
> «Hazlo con nuestro estilo pero enfócate más en el color **vino**, usa **morado oscuro para detalles** y el **claro para resaltar**, como algo más profesional.»
> «No olvides asegurarte de que lo de estudio quede al 100.»

Colores de la casa: vino `#7E1735` (protagonista), morado oscuro `#170A26` (fondos y detalles), morado claro `#AC27FF` (resaltar). Acento de texto sobre oscuro: `#C77DFF` o `#B44BFF`. **Nada de rosa, nada de emojis.** Íconos de Lucide o Kenney. **La mascota no se copia**: Knowie es de ellos. Si hace falta un personaje, Carlos lo pide y se compone; no se inventa.

### Las referencias: 113 capturas de Knowunity

**Dónde están:** en el **banco de La Sala**, carpeta **«Referencias Knowunity»** (`knowunity-001.jpg` … `knowunity-113.jpg`, en el orden en que las mandó). Se leen con `GET /api/sala/GRUPAZ/banco` y la llave.

**NO van al repo**, porque es público: varias traen nombres reales de alumnos (los rankings, la notificación de WhatsApp del grupo y el match con otro usuario).

Resumen de lo que traen:

**Navegación**: barra de abajo con 5 secciones:
1. Chat IA (burbuja con chispa)
2. Calendario / horario
3. Plan de estudio (diana): la principal
4. Buscar apuntes
5. Ranking (trofeo)

**Plan de examen** (el corazón, estilo Duolingo):
- Flujo de alta: «¿Tienes un examen pronto? Aquí estamos para ayudarte».
  1. «¿Para qué materia es tu examen?» (lista de sus materias con ícono de color).
  2. Fecha: tarjeta de calendario «13 · viernes», «Guardamos tu examen», etiquetas Materia · Mañana · Grado 10.
  3. «Personalicemos tu plan»: subir material (foto, PDF, notas) en cuadros punteados, o elegir temas en chips (+ «Agregar el tuyo»).
  4. «Déjame preparar tu plan»: círculos del camino que se arman, con el texto «Organizándolo en el orden correcto».
  5. «Preparando tu cuestionario… 12%»: barra y tres pasos con palomita.
- **Camino serpenteante**:
  - círculos grandes 3D: quiz, tarjetas, lectura, simulacro, voz/micrófono y trofeo al final;
  - el camino va agrupado en unidades con una barra de título de color y una burbuja de chat («Bases del cuerpo y cuidado», «Fundamentos», «Avanzado», «Dominio»);
  - cada unidad trae su color: verde → azul → morado → rosa (aquí usar **vino** y tonos de la casa);
  - el nodo hecho se vuelve moneda dorada con palomita;
  - la mascota se asoma junto al nodo actual;
  - tarjeta de abajo con «Sistema circulatorio» y el botón «Comenzar tu plan / Empezar / Revisar»;
  - arriba, el progreso «10 %», «El examen es mañana», «Meta de grado: 10».
- **Grados 6 → 10**: barra «Grado 7» que se llena. Avisos que se deslizan: «¡Subiste de grado!», «¡Repaso logrado!», «¡Tarjetas dominadas!», «¡Cuestionario completado!». Pantalla grande «Grado 10 · Ahora es tu turno · ¡Vamos!» con confeti.
- **Lección antes del quiz**:
  - título grande («El sistema circulatorio y sus componentes»);
  - párrafo con **negritas** y viñetas que se van iluminando una por una;
  - una imagen con etiquetas (corazón con aurículas y ventrículos);
  - 👍 👎 copiar (como íconos, no emojis);
  - botón «Empezar cuestionario».
- **Cuestionario**:
  - barra de progreso arriba;
  - «COMBO x2 … x5» que crece y cambia de morado a dorado;
  - la mascota pregunta en una burbuja;
  - opción múltiple;
  - completar el hueco: la palabra salta de la ficha al hueco subrayado;
  - botones «Pista» y «Verificar»;
  - hoja de abajo verde «¡Genial! / ¡Correcto! / ¡Increíble!» con «¿Por qué?» (explicación) y «Continuar».
- **Resultado**: «¡La rompiste! Todo correcto. Estás volando.» Tres tarjetas: XP +15, PERFECTO 100%, TIEMPO 0:38. Guardar y Continuar. Luego «¿Qué te pareció este cuestionario?» con 5 estrellas.
- **Ranking de la semana**: «¡Solo 8 lugares para llegar a la zona de ascenso!». Al acabar, tu fila sube animada entre los demás (rank, avatar, nombre, ⚡XP).
- **Racha**: «🔥 2» en el perfil y «Ganaste una racha congelada» (cubo de hielo en pantalla azul que se expande en círculo).
- **Menú del plan** (⋮): Crear nuevo plan, Editar, Añadir material, Compartir, Dar feedback, Eliminar. «Planes de Carlos» como hoja de abajo.

**Buscar**: «Busca tema…» y «Términos de búsqueda populares» (Ciclo de Krebs, Sistema endocrino…). Intro «Los mejores apuntes de los mejores estudiantes…» con «Empezar a buscar».

**Horario**: «Agrega tu horario · tarda 30 segundos», con cuadrícula semanal de colores por materia y «Escanea tu horario» con la cámara.
- **Ya existe en el repo**: `avisos/datos.js` es la verdad del horario del 3.1, y Sociedad pega horarios desde Excel. Hay que reusarlo, no inventarlo.

**Perfil**: avatar, nombre con insignia, @usuario, seguidores, racha, escuela (Instituto Rembrandt de Querétaro), Agregar amigos. Pestañas Clases / Creado. «Está vacío por aquí · + Crear» abre la hoja Crear: Subir material, Quiz, Flashcards, Simulacros, Carpeta.

**Ajustes**: secciones TÚ, APP, SUSCRIPCIÓN, CUENTA Y PRIVACIDAD, AYUDA, CERRAR SESIÓN, en tarjetas con chevron.
- TÚ: Editar perfil, Me gustas, Configuración de cuenta.
- APP: interruptores de vibración, sonidos y «agitar para reportar».
- Abajo, la versión y la mascota.

**Compañero de estudio**: «¡Es un match!» sobre un globo terráqueo, la línea Tú ↔ Udine, Italia, «15:00» y «Empezar ahora». Es para estudiar juntos con temporizador. *Sugerencia: aquí sería con compañeros del 3.1 por La Sala, no con desconocidos.*

**Calificar la lección en la pizarra** (★ ×5): es la pantalla final de la lección con voz. **Eso ya es Explica**: hay que engancharlo como nodo «lección en pizarra» dentro del camino.

### Cómo conectarlo a La Sala (propuesta, no lo decidió Carlos)

- Una página nueva, por ejemplo `sala/estudio.html`, como pestaña «Estudio» de la mesa, igual que Explica y Pizarrón: iframe perezoso y la llave de `presentaciones/ia.js`.
- La IA arma el plan, las preguntas, las tarjetas y las lecciones con `/ia-texto`:
  - **ojo, `de:'tu'` es la persona**;
  - Negro de fábrica;
  - `espera` 150000 y `pensarPoco`.
- Fotos o PDF del material: Paulina, con `imagenes`.
- El nodo «lección» abre Explica con el tema (reusar, no duplicar).
- Progreso, XP, racha y ranking guardados en el Durable Object de La Sala (como `pizarron.js`: claves por elemento), para que Carlos y Luis compitan. Un módulo nuevo en `sala/servidor/`, con sus pruebas en `sala/servidor/pruebas.mjs`. **Sin `cloudflare:workers`** (las pruebas corren en Node).
- Pruebas en navegador a 390×844 como `sala/pruebas-pizarron.mjs`.

### «Lo de estudio al 100»

Explica ya funciona, pero hay que dejarla redonda:
- probarla publicada con Negro y con Paulina contra la sala real (receta en el resumen: ruta por Node con el proxy y origen de la Central);
- revisar la voz en el iPhone;
- engancharla al camino como nodo.

## 4. Al cerrar
- `node sala/servidor/pruebas.mjs` (451) y las del pizarrón.
- Commit, PR, fusionar y desplegar La Sala a mano: `cd sala/servidor && CLOUDFLARE_API_TOKEN=$(cat /tmp/claude-0/llave-cloudflare) CLOUDFLARE_ACCOUNT_ID=$(cat /tmp/claude-0/cuenta-cloudflare) npx wrangler deploy`. Las llaves están en `/tmp/claude-0/` sólo en la sesión de Sylcred; Luna usa las suyas o `MAZI_LLAVE`.
- A Carlos se le entrega pegado al mensaje, corto y sin tecnicismos. Nada de artefactos.
