---
name: editar-contenido
description: Cómo cambiar textos, datos, fotos o rutas del sitio del Instituto Rembrandt sin tocar JSX y sin inventar información que la escuela no ha confirmado. Úsala en cuanto alguien pida cambiar una frase, un teléfono, una dirección, un horario, precios, el nombre de un nivel, añadir una fotografía o crear una página nueva — aunque suene a «cámbiale este texto» y parezca trivial: casi siempre el archivo correcto está en src/content/, no en el componente que muestra el texto.
---

# Editar contenido

Regla base: **todo texto institucional vive en `src/content/`**. Si te encuentras
editando una cadena dentro de un `.tsx`, casi seguro estás en el archivo
equivocado. Busca la cadena en `src/content/` antes de tocar nada.

| Archivo | Qué contiene |
|---|---|
| `institucion.ts` | nombre, lema, valores, misión, visión, sedes, contacto |
| `niveles.ts` | los cuatro niveles: descripciones, datos clave, ejes, materias |
| `especialidad.ts` | Bachillerato Tecnológico en Programación |
| `admisiones.ts` | pasos, requisitos, preguntas frecuentes |
| `vida-escolar.ts` | ejes de vida escolar y galería |
| `legal.ts` | aviso de privacidad y términos |
| `seo.ts` | título y descripción de cada ruta (y de aquí sale el sitemap) |
| `navegacion.ts` | menús de cabecera y pie |
| `pendientes.ts` | lo que la escuela aún debe confirmar |

## La regla que explica el diseño de los tipos

**Lo que la escuela no ha confirmado, no se inventa.** Por eso casi todo lo no
verificado es opcional en `content/types.ts`: si el dato falta, la sección
simplemente no se renderiza. Es una decisión deliberada, no un descuido.

Si te piden un dato que no está —colegiaturas, horarios, CCT, año de fundación—
no lo rellenes con algo plausible. Añádelo a `pendientes.ts` como pregunta para
la escuela y déjalo fuera. La lista se consulta en `/pendientes` durante el
desarrollo.

Un dato inventado en un sitio escolar es un problema real: alguien decide dónde
inscribir a su hijo con esa información.

## Fotografías

Las fotos entran por `MediaSlot` (`content/types.ts`) y se pintan con
`<FotoSlot>`. Sin `src`, el componente dibuja un marcador honesto — **nunca una
imagen que pretenda ser el plantel**.

Para publicar una foto real:

1. Guarda el archivo en `public/fotos/` con el nombre del hueco.
2. Añade `src: '/fotos/<nombre>.jpg'` a ese slot en `niveles.ts` o
   `vida-escolar.ts`.

La relación de aspecto está fijada en ambos casos, así que sustituir el marcador
por la foto no mueve nada de la página (CLS 0).

**Menores de edad:** publicar fotos de alumnas y alumnos identificables exige
consentimiento por escrito del padre, madre o tutor. Sin él, encuadres sin
rostros reconocibles. Si nadie ha dicho que existe ese consentimiento,
pregúntalo antes de subir la foto.

## Añadir una ruta

Cuatro registros, y olvidar uno deja el sitio a medias:

1. Carpeta en `src/app/<ruta>/page.tsx` con
   `export const metadata = seoDe('/<ruta>')`.
2. Entrada en `content/seo.ts` — de ahí salen el sitemap y `RUTAS_PUBLICAS`.
3. Enlace en `content/navegacion.ts`, si debe verse en el menú.
4. Ruta en el array `RUTAS` de `scripts/empaquetar-una-pagina.mjs`, si debe
   aparecer en `sitio.html`.

Cualquier archivo de `public/` que referencies va con `estatico()` de
`@/lib/ruta`: el `basePath` de Next no prefija `public/` y en GitHub Pages
saldría 404.

Al terminar, corre la skill `verificar` — el conteo de rutas del build debe
subir a 24.
