/* EL IPHONE Y EL 6DoF DE VERDAD (Carlos, 26 nov: «en teléfono iPhone no jala… encuentra alguna manera»).
   Safari del iPhone NO trae WebXR (ni immersive-ar ni ARKit desde una página; revisado el 26 nov 2026). La salida sin hacer
   una app es Variant Launch: un script que, en el iPhone, abre la experiencia dentro de un App Clip con ARKit y le da a la
   página el mismo `navigator.xr` que Chrome da con ARCore; así vr/arcore.js funciona igual. Plan de desarrollador gratis
   (5 mil vistas al mes, con su marca de agua; a confirmar en su página).
   Para prenderlo: Carlos crea su cuenta en launch.variant3d.com, saca su «SDK key» para la dirección de la Central y la
   pega aquí. Es una llave de CLIENTE (va en la página y se limita por dominio), no un secreto. Vacía = apagado. */
export const VARIANT_LAUNCH_KEY = '';
