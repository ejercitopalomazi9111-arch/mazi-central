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
