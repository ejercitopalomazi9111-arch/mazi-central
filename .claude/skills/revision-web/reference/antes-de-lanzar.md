# Antes de lanzar

Casi sesenta cosas que hay que tener puestas antes de publicar un sitio.

**No es para tacharla completa en todo proyecto.** Una landing de una página no necesita
historial de versiones ni comparativa. Lo que sí es obligatorio siempre es el **grupo 2**: ahí
no hay proyecto chiquito.

Salió de tres listas que trajo Carlos (de `ivanvibecodes`), ordenadas por lo que de verdad
contestan.

---

## 1 · Que no se vea hecho por IA

El síntoma es que todo funciona, no hay errores, y aun así se ve genérico. Nadie sabe señalar
UNA cosa mal — y esa es justo la señal.

**Lo que responde al dedo** *(lo más barato y lo que más se nota)*
- [ ] Estados de **presionado** en todo lo que se toca. Un botón que no se hunde se siente muerto
- [ ] Estados de **`hover`** — pero encerrados en `@media (hover:hover) and (pointer:fine)`, o se quedan pegados en pantalla táctil
- [ ] Microinteracciones en los botones
- [ ] Transiciones entre estados y entre secciones

**Lo que pasa mientras se espera**
- [ ] Pantalla de carga o esqueleto, no un salto en blanco
- [ ] Barra de progreso donde algo tarde
- [ ] Estados de **error** y de **vacío**, no sólo el estado feliz

**Lo que se ve al llegar**
- [ ] Animación de entrada del encabezado
- [ ] Animaciones suaves al hacer scroll — **guiadas**, nunca secuestrando el scroll
- [ ] Favicon propio *(puede ir en línea como `data:` SVG, ver la neurona)*

**Lo que se olvida siempre**
- [ ] Botón de volver arriba
- [ ] Navegación pensada para el pulgar, no la del escritorio encogida
- [ ] Modo oscuro, si el resto de la marca lo pide
- [ ] Selector de idioma, si aplica

> **La prueba del dedo:** recorrer el sitio en el teléfono y contar cuántas veces algo
> **responde** al toque. Si la respuesta es cero, se ve de IA por bonita que esté la paleta.

---

## 2 · Que no lo tumben · **esto no es opcional nunca**

- [ ] **Ninguna llave de API en el código** — ni en el cliente, ni en el repo
- [ ] **Ningún secreto en el historial de Git.** Una llave commiteada está quemada aunque se borre después
- [ ] En la base de datos, la clave **pública** en el cliente; la de servicio jamás
- [ ] Seguridad por fila (row-level), no confiar en que el cliente pida bien
- [ ] Datos sensibles cifrados
- [ ] Autenticación **forzada** en el servidor, no escondiendo el botón
- [ ] Acceso a los registros restringido
- [ ] Campos que el usuario no debe tocar, bloqueados **en el servidor**
- [ ] Cookies protegidas (`HttpOnly`, `Secure`, `SameSite`)
- [ ] Contraseñas con hash — nunca guardadas ni en texto ni cifradas de ida y vuelta
- [ ] Tope de intentos de acceso
- [ ] Protección contra bots donde haya formulario
- [ ] Consultas parametrizadas, nunca armadas pegando texto
- [ ] Validación de entradas **en el servidor**; la del cliente es comodidad, no seguridad
- [ ] Escapar todo contenido que escriba el usuario antes de pintarlo
- [ ] Restricción de qué archivos se pueden subir, y de cuánto pesan
- [ ] Tope de llamadas al API
- [ ] Cabeceras de seguridad (`CSP`, `X-Content-Type-Options`, `Referrer-Policy`)
- [ ] HTTPS forzado

> **Lo que más nos toca a nosotros:** los repos de Grupo Mazi son **públicos y con escaneo**.
> Los dos primeros renglones no son consejo, son la línea que no se cruza.

---

## 3 · Que la gente confíe y te encuentre

**Que te encuentren**
- [ ] `sitemap.xml`
- [ ] `robots.txt`
- [ ] Certificado SSL válido
- [ ] **Título único en cada página.** Cinco páginas con el mismo título es el error de SEO más común y el más fácil de arreglar
- [ ] Metadescripción por página
- [ ] **`og:image`** — la imagen que sale al compartir el link. Sin ella, en WhatsApp aparece un rectángulo gris y el link se ve a basura
- [ ] Texto alternativo en las imágenes *(sirve para buscadores **y** para quien no ve)*
- [ ] Marcado de esquema (`schema.org`) donde aplique
- [ ] Enlaces internos entre páginas
- [ ] Migas de pan, si hay más de dos niveles
- [ ] Mapa y cómo llegar, si hay dirección física
- [ ] Velocidad de carga atendida — de verdad, medida, no supuesta
- [ ] Responsividad de teléfono probada **en un teléfono**

**Que no se rompa la primera impresión**
- [ ] **Página 404 propia.** El 404 de fábrica es de lo que más barato se arregla y peor se ve
- [ ] Página de gracias después de enviar un formulario, no un mensajito gris
- [ ] Llamada a la acción **antes de bajar** — visible sin arrastrar
- [ ] Llamada a la acción **fija** en teléfono

**Que confíen**
- [ ] Un "quiénes somos" **de verdad**, con gente y no con frases de relleno
- [ ] **Foto del equipo.** Cara de persona vence a icono de persona, siempre
- [ ] Casos de estudio: qué problema resolvimos, no qué tecnología usamos
- [ ] Reseñas **reales**. Ver la advertencia de abajo
- [ ] Compromiso de tiempo de respuesta *(«contestamos en menos de 24 h»)*
- [ ] Política de privacidad
- [ ] Datos de contacto visibles
- [ ] Formulario de contacto simple — cada campo de más cuesta gente
- [ ] Redes enlazadas y **vivas**. Una red muerta resta más de lo que suma
- [ ] Términos claros
- [ ] Sellos o certificaciones, **si existen**

> **La advertencia que estas listas no traen, y es la que más caro sale.** Reseñas, testimonios,
> sellos y logos de clientes inventados o "de relleno mientras" son lo que más rápido quema la
> reputación de una empresa nueva. Es la misma regla que ya nos aplicamos con ICAMP: **no
> presumimos clientes que no son clientes.** Si todavía no hay reseñas, la sección no va — un
> hueco honesto se ve mejor que un elogio falso, y no te puede reventar después.

**Que decidan**
- [ ] La llamada a la acción repetida, no una sola vez hasta abajo
- [ ] Comparativa, cuando haya con qué compararse
- [ ] Sección de preguntas frecuentes
- [ ] Botón de chat o de WhatsApp
- [ ] Video de presentación, si lo hay
- [ ] Boletín con algo a cambio, no un "suscríbete" pelón
- [ ] Historial de versiones, en producto

---

## 4 · Que no se vea de juego · *el que agregó Carlos*

Un sitio de empresa que parece pantalla de videojuego se ve **menos** profesional, no más.
Se confunde «que se vea impresionante» con «que se vea caro», y a veces son opuestos.

- [ ] **Un** acento de color, no cinco
- [ ] Nada que rebote, gire o palpite sin razón
- [ ] Tipografía con personalidad **y** legible — no de ciencia ficción
- [ ] Espacio en blanco de verdad. La densidad de arcade es lo que más rápido delata
- [ ] Movimiento que **acompaña**, no que llama la atención

> **La prueba:** enseña una captura sin contexto y pregunta *«¿de qué es esto?»*. Si la primera
> respuesta menciona un juego, una app de cripto o una discoteca — y vendemos servicios — ahí
> está la respuesta.

---

## 5 · Lo nuestro, que estas listas no traen

- [ ] `<meta charset>` en los primeros 1024 bytes. **Nuestro worker manda `text/html` SIN charset y con `nosniff`**: sin esto los acentos salen rotos
- [ ] `<meta name="viewport">`. Sin él la página abre a 980px y se ve de lejos
- [ ] `prefers-reduced-motion` respetado **donde se anima**, no en un solo archivo
- [ ] Objetivos táctiles de 44px mínimo
- [ ] `100dvh` detrás de `@supports`, y escuchar al `visualViewport` en iOS
- [ ] Verificar **lo publicado**, no lo local. Es otra neurona y ya costó una vez
