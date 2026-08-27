# Créditos del Taller

## El modelo 3D

**RobotExpressive.glb** — de [Tomás Laulhé](https://www.patreon.com/quaternius) (Quaternius),
**CC0 1.0**. Modificaciones de [Don McCurdy](https://donmccurdy.com/): tres morphs de expresión
facial, conversión con FBX2GLTF y limpieza de materiales duplicados.

CC0 no obliga a dar crédito. Se da igual: la regla de la casa dice que el arte real se baja al
repo **con crédito**, y un autor que regala su trabajo merece que se sepa que es suyo. Si el
proyecto le sirve a alguien, su Patreon está arriba.

## El motor

**three.js** r185 — MIT. Vendorizado en `vendor/`, con su licencia al lado. Sin CDN: el día que
se caiga un CDN ajeno, el taller sigue abriendo.

Piezas usadas: `three.module.min.js` + `three.core.min.js` (las versiones nuevas vienen
partidas en dos), `loaders/GLTFLoader.js`, `controls/OrbitControls.js`,
`utils/BufferGeometryUtils.js` y `utils/SkeletonUtils.js`.

## Lo que es nuestro

Los muebles, la luz, la paleta, el monitor y todo el código de la escena. Una mesa no es arte:
es geometría. El personaje sí lo es, y por eso ése se buscó en vez de dibujarse.
