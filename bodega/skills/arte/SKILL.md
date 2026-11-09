---
name: arte
description: Cómo se genera y regenera el arte del sitio — los SVG deterministas de public/arte/ por código y las ilustraciones WebP de public/img/ hechas con IA en GitHub Actions. Úsala cuando pidan cambiar, regenerar o «variar» el arte, los fondos, las viñetas de nivel o la escena de la portada, cuando alguien intente correr el generador de IA en local (no funciona, y conviene saber por qué antes de perder media hora), o cuando vayan a meter una imagen nueva en public/.
---

# Arte del sitio

Dos orígenes distintos, con reglas distintas.

## `public/arte/` — generativo por código

Seis SVG dibujados por `scripts/generar-arte.mjs`: cuñas diagonales, trazos
ortogonales, retícula de plano y marcas de registro, en la paleta institucional.
Pesan ~16 KB **entre los seis**.

```bash
node scripts/generar-arte.mjs   # regenera las 6 piezas
```

Usa un PRNG con semilla fija: misma semilla, mismo dibujo. Para explorar
variantes, cambia la semilla de la pieza en el array `PIEZAS` al final del
script y vuelve a correrlo. Corre en local sin problema.

Entran como `background-image`, van `aria-hidden`, por debajo del texto y
ocultas en móvil: **la página se sostiene igual si no cargan**.

## `public/img/` — ilustración con IA

Diez WebP (la escena del hero, cuatro viñetas de nivel, cuatro fondos, la banda
de vida escolar). La receta —prompts, semillas fijas, post-proceso a WebP— vive
en `scripts/generar-arte-ia.mjs`.

**No se regeneran en local, y no es un problema de configuración:** la salida a
internet del entorno pasa por un proxy con lista blanca que no alcanza los CDN
de imagen. No intentes sortearlo.

El camino es CI: cambia la semilla o el prompt de la pieza en
`scripts/generar-arte-ia.mjs` y haz push. El push de ese archivo dispara
`.github/workflows/generar-arte.yml`, que genera las piezas y **committea el
resultado** en la misma rama. Las semillas están fijas a propósito: dos
ejecuciones dan lo mismo y el commit es reproducible.

El workflow escucha `push` sobre ramas `claude/**` limitado a la propia receta,
y `workflow_dispatch` sólo queda disponible cuando el archivo existe en la rama
por defecto.

## Lo que el arte no es

Ni el generativo ni la ilustración representan el plantel, y ninguno imita la
obra de ningún pintor —el vínculo con el nombre del instituto se expresa con
geometría, no copiando cuadros—. Las fotos reales entran **únicamente** por
`FotoSlot` (ver la skill `editar-contenido`).

Si alguien pide «una foto de la escuela» y no hay foto real, la respuesta es el
marcador de `FotoSlot`, no una imagen generada: una ilustración presentada como
el plantel sería engañosa para una familia que está decidiendo dónde inscribir a
su hijo.

## Si añades una imagen a `public/`

Va referenciada con `estatico()` de `@/lib/ruta`, y si es una `url()` de CSS,
hay que inyectarla como estilo en línea desde `layout.tsx` (así se hacen
`--grano` y `--escena`): el `basePath` de Next no prefija `public/` y en GitHub
Pages saldría 404.
