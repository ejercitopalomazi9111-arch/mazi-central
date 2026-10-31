/* ──────────────────────────────────────────────────────────────────────────
   revision.js · la red de seguridad del despliegue

   POR QUE EXISTE
   Todas las rutas de este sitio son RELATIVAS a propósito: 'fotos/x.webp',
   'marca/logo.webp'. Eso es lo que permite abrirlo con doble clic desde una
   carpeta, subirlo a la raíz de un dominio o meterlo en una subcarpeta sin
   tocar una línea. El precio de esa libertad es que depende de DOS cosas que
   las pone el servidor, no los archivos:

     1. que la dirección de la página termine en «/» cuando es una carpeta;
     2. que las carpetas fotos/ y marca/ se hayan subido completas.

   Si una de las dos falla, el navegador pide las imágenes un nivel más
   arriba (o no las encuentra) y la página se ve entera PERO SIN FOTOS, sin
   un solo error a la vista. Pasó en producción: se desplegó el sitio y «se
   perdieron todas las fotos». El servidor respondía 200 al HTML y 404 a cada
   .webp, en silencio.

   Lo que hace este archivo:
     · reintenta la foto en minúsculas una vez  (un FTP o un ZIP descuidado
       convierte vc01A-0.webp en vc01a-0.webp y en Linux eso ya es otro
       archivo: 404);
     · si aun así falla, deja un hueco con una leyenda honesta en lugar de un
       icono roto con el texto alternativo encimado;
     · y, SOLO si fallan varias, levanta un aviso que dice qué carpeta falta y
       qué hay que hacer. En un despliegue correcto este aviso no aparece
       nunca, porque nunca hay un error que contar.

   El ancla de las rutas NO está aquí: va EN LINEA en el <head> de cada
   página, antes del primer <link>. Tiene que ser así — si estuviera en este
   archivo, este archivo sería el primero en no cargar.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var fallos = 0, carpetas = Object.create(null), avisado = false;

  // El hueco se dibuja con CSS propio y no toca estilo.css: estilo.css se
  // regenera desde el proyecto y un cambio a mano ahí se perdería.
  var hoja = document.createElement('style');
  hoja.textContent =
    'img.ty-hueco{font-size:0;color:transparent;background:#141417 ' +
    'url("data:image/svg+xml;charset=utf8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'220\' height=\'34\'%3E%3Ctext x=\'110\' y=\'22\' text-anchor=\'middle\' font-family=\'ui-monospace,monospace\' font-size=\'12\' letter-spacing=\'1.5\' fill=\'%235b5b66\'%3EFOTO NO DISPONIBLE%3C/text%3E%3C/svg%3E") ' +
    'center/auto no-repeat;outline:1px solid #26262c;outline-offset:-1px}' +
    '.ty-aviso{position:fixed;left:0;right:0;top:0;z-index:99999;' +
    'background:#1d1206;border-bottom:2px solid #f2b705;color:#f6e6c4;' +
    'font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;' +
    'padding:12px 56px 12px 16px;text-align:left}' +
    '.ty-aviso b{color:#f2b705}' +
    '.ty-aviso a{color:#f2b705}' +
    '.ty-aviso button{position:absolute;right:10px;top:8px;background:none;' +
    'border:1px solid #6b5a2a;color:#f6e6c4;font:inherit;cursor:pointer;' +
    'padding:3px 10px;line-height:1.4}';
  (document.head || document.documentElement).appendChild(hoja);

  function carpetaDe(s) {
    var i = s.indexOf('/');
    return i > 0 ? s.slice(0, i) : '(raíz)';
  }

  function avisar() {
    if (avisado) return;
    avisado = true;
    var cuales = Object.keys(carpetas).sort();
    var d = document.createElement('div');
    d.className = 'ty-aviso';
    d.setAttribute('role', 'status');
    d.innerHTML =
      '<b>Faltan las imágenes de la página.</b> El servidor contesta ' +
      '«no existe» a ' + (cuales.length === 1
        ? 'la carpeta <b>' + cuales[0] + '/</b>'
        : 'las carpetas <b>' + cuales.join('/</b> y <b>') + '/</b>') +
      '. Hay que subirla completa, al lado de <b>index.html</b>, sin ' +
      'cambiarle el nombre. Detalle y comprobación en ' +
      '<a href="revisar.html">revisar.html</a>.' +
      '<button type="button">cerrar</button>';
    d.querySelector('button').addEventListener('click', function () { d.remove(); });
    document.body.appendChild(d);
  }

  // Los errores de carga de <img> no burbujean: hay que escucharlos en
  // captura sobre document, no en body con el modelo normal.
  document.addEventListener('error', function (e) {
    var im = e.target;
    if (!im || im.tagName !== 'IMG') return;
    var s = im.getAttribute('src') || '';
    if (!s || s.slice(0, 5) === 'data:') return;

    if (!im.hasAttribute('data-ty-min') && s !== s.toLowerCase()) {
      im.setAttribute('data-ty-min', '1');
      im.src = s.toLowerCase();
      return;
    }
    if (im.classList.contains('ty-hueco')) return;

    im.classList.add('ty-hueco');
    carpetas[carpetaDe(s)] = 1;
    if (++fallos >= 3) avisar();
  }, true);
})();
