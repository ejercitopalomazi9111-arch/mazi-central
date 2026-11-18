# El logo oficial de Urban Pest Control

Lo subió Carlos a La Sala el 17 de noviembre (e1321): «Aquí tienes los logos». Son los archivos del cliente,
tal cual llegaron (JPG de 1280 px):

- `logo-fondo-oscuro.jpg`: sobre negro, con la estela blanca. Es el mismo dibujo que usa su página urbanpest.mx
  y del que salen las piezas de la apertura (`web/marca/`).
- `logo-fondo-claro.jpg`: sobre blanco, **sin** la estela blanca. Para papelería e impresos sobre blanco.

**Por qué no se rehicieron las piezas animadas con estos archivos.** Vienen con fondo sólido, no transparente.
Al quitarle el blanco a la versión clara, el señor (que es blanco) se vuelve transparente y la estela no existe;
y la oscura no se puede recortar limpia porque el azul del globo es casi negro. Las piezas de `web/marca/`
(512 px, transparentes, de su sitio) se ven mejor. Si el cliente manda el logo en PNG o en vector (AI, SVG, PDF),
con eso sí se rehacen en alta: `python3 urban-pest/web/marca/cortar.py` sobre el original nuevo.

## El vector (18 de noviembre)

Carlos mandó el logo en vector: `logo-vector.pdf` (Illustrator, 2015). Es la versión para fondo claro, **sin** la
estela blanca. De ahí salen, con `python3 -I urban-pest/marca-oficial/armar.py`:

- `logo.svg`: el logo entero en vector, recortado a su caja. Para imprenta, lonas, uniformes y lo que haga falta grande.
- `../web/img/logo.webp`: el horizontal (símbolo y letras) a 2240×480. Lo usan el pie de la página, la cotización y la
  carpeta de cumplimiento, todos sobre blanco. Antes salía de la imagen de 512 px y se veía borroso.

Las piezas animadas de la apertura (`web/marca/`) **siguen** saliendo de la versión de su sitio: llevan la estela blanca
(la capa «chorro») y el vector no la tiene. Si algún día manda también el vector de fondo oscuro, se rehacen con él.
