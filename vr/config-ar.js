/* EL IPHONE Y EL 6DoF DE VERDAD (Carlos, 26 nov: «en teléfono iPhone no jala… encuentra alguna manera»).
   Safari del iPhone NO trae WebXR. La salida sin hacer una app es Variant Launch: en el iPhone abre la experiencia dentro de
   un App Clip con ARKit y le da a la página el mismo `navigator.xr` que Chrome da con ARCore; así vr/arcore.js funciona igual.
   La etiqueta va hasta arriba del <head> de vr/index.html (así lo pide su panel); esta constante es la misma llave para
   quien la necesite desde un módulo. Llave de CLIENTE: sólo jala en los dominios autorizados en el panel de Carlos
   (proyecto «VR», plan Developer, 3 mil lanzamientos al mes). Si se cambia la llave, se cambia en los dos lados. */
export const VARIANT_LAUNCH_KEY = 'drXFAEN5IOtiAcoYmqWCWl987YF6t5M0';
