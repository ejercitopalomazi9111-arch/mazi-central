# INKWELL · Fase 1: auditoría y plan

Encargo de Carlos en GRUPAZ (e862, 9 de noviembre de 2026): convertir INKWELL en la plataforma de
lectura y creación de Grupo Mazi. El propio encargo pide esta fase primero: revisar lo que hay,
diagnosticar y proponer el plan **antes** de cambios grandes. No se movió nada todavía.

## Lo que hay hoy

| Pieza | Qué es | Cómo está hecha |
|---|---|---|
| `index.html` (859 líneas) | El «lector infinito»: 5 series con capítulos que se arman con plantillas, temas oscuro, sepia y claro, ajustes de letra | HTML + CSS + JS sueltos, sin framework ni build. Guarda el avance en `localStorage` |
| `arte/` | 112 cuadros de dominio público con su ficha (`arte.json`: título, artista, licencia) | Se usan de portada y fondo por estado de ánimo |
| `tiras.html` + `tiras.js` | Lector de Webtoon y Wattpad para Carlos: baja capítulos, «leer seguido», exporta PDF y EPUB | IndexedDB en el teléfono; Webtoon pasa por el recadero de La Sala |
| `archivos.js`, `fuentes.js`, `compartir.js` | El PDF y el EPUB hechos a mano, la limpieza del texto ajeno y «compartir» | Módulos sin dependencias |
| `sw.js` + `manifest.webmanifest` | Se instala como app y abre sin internet | Trabajador de fondo «primero la red» |
| `sala/servidor/inkwell.js` | El recadero: sólo GET y sólo hosts de Webtoon, con el Referer que piden sus imágenes | Cloudflare Worker (Durable Object de La Sala) |
| `pruebas-tiras.mjs` | 68 pruebas de las Tiras | 3 salen rojas sólo si el contenedor no trae `LANG=C.UTF-8` (el nombre de la descarga) |

**Tecnología real:** web estática, JavaScript sin framework, PWA. **No hay** base de datos, cuentas,
almacenamiento de archivos ni servidor propio de INKWELL: todo vive en el teléfono de quien lee.

## Lo que sirve y se queda

- El lector: temas, tipografía, interlineado y guardado de avance (es la base del Lector de libros, §7).
- El PDF y el EPUB hechos a mano (sirven para «descargas autorizadas», §7 y §10).
- El arte de dominio público con su ficha: ya cumple la regla de arte real con crédito.
- La PWA (instalable, sin internet) y el trabajador de fondo «primero la red».

## Problemas que hay que resolver antes de abrirlo a gente

1. **Derechos de autor.** Las 5 series son *fan-inspired* («inspirado en Omniscient Reader's Viewpoint»,
   etc.) y las Tiras bajan obras de Webtoon y Wattpad. Para Carlos solo está bien; **en una plataforma
   pública de Grupo Mazi no**, y el propio encargo lo prohíbe (§11). Propuesta: las Tiras se quedan
   como herramienta personal de Carlos, fuera de INKWELL público, y el catálogo público arranca con obras
   propias, de dominio público o subidas por sus autores.
2. **Todo vive en el teléfono.** Sin base de datos no hay cuentas, comunidad, Studio ni sincronización
   (§9, §10, §12). Es el hueco más grande y el que decide todo lo demás.
3. **Un solo archivo de 859 líneas** con el lector, la biblioteca y las series juntas: hay que partirlo
   en pantallas antes de crecer.
4. **Identidad:** hoy es acento rosa sobre negro y «INKWELL» con letra serif. El encargo pide logo,
   isotipo, morado o índigo y modo claro y oscuro.

## La decisión que falta: dónde vive la base de datos

| | Cloudflare (D1 + R2 + Workers) | Supabase |
|---|---|---|
| Ya lo usamos | Sí: el sitio, La Sala, Fadori, Puercos | Sí: Ligas Mazi y la tienda |
| Imágenes de cómic | **R2: 10 GB gratis y sin cobro por descarga**, ideal para páginas de cómic | 1 GB gratis y cobra la salida |
| Cuentas | Las hacemos nosotros (correo y contraseña, sesiones) | Ya vienen hechas |
| Se duerme si no se usa | No | **Sí**: la pausa a los días sin uso (ya nos pasó con Ligas Mazi) |

**Recomendación: Cloudflare.** Un cómic es puro peso en imágenes y R2 no cobra por servirlas; además
no se duerme y es donde ya publicamos todo. Las cuentas propias cuestan más trabajo, pero cumplen la
regla de la casa: la plataforma es nuestra.

## Plan por fases

| Fase | Qué sale | Depende de |
|---|---|---|
| 2 · Identidad | Logo, isotipo, portada de bienvenida, navegación de 6 secciones (barra abajo en teléfono, lateral en escritorio), claro y oscuro configurables | Nada: se arranca ya |
| 3 · Inicio y Explorar | Banner, «continuar leyendo», tendencias, categorías, buscador, filtros | Fase 2 |
| 4 · Lectores | Lector de cómic (vertical y por páginas, zoom, brillo, precarga, sin internet) y de libros (EPUB, PDF, TXT) | Fase 2 |
| 5 · Base y cuentas | D1 + R2, registro, sesiones, roles (admin, moderador, creador, lector) | **La decisión de arriba** |
| 6 · Studio | Crear obra, temporadas, capítulos, subir y ordenar páginas, borradores, programar | Fase 5 |
| 7 · Comunidad | Perfiles, seguir, comentarios, reacciones, valoraciones, reportes | Fase 5 |
| 8 · Biblioteca y avisos | Favoritos, colecciones, historial sincronizado, notificaciones | Fase 5 |
| 9 · Panel de Grupo Mazi | Usuarios, publicaciones, reportes, destacados, estadísticas | Fases 6 y 7 |
| 10 · Seguridad y pruebas | Límites de carga, archivos validados, enlaces privados que caducan, pruebas de todo | Todas |

Las fases 2 a 4 no necesitan la base de datos y se pueden hacer ya; de la 5 en adelante hace falta
la decisión de Carlos.
