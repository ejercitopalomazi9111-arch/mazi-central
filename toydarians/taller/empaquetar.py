#!/usr/bin/env python3
"""Arma el ZIP que se le manda al cliente, y su instructivo.

Por que un script y no un `zip -r` a mano: el instructivo lleva numeros —
cuantas paginas, cuantas piezas, cuantas fotos— y esos numeros cambian cada
vez que entra una categoria. Escritos a mano duran hasta el siguiente cambio y
despues mienten, que es peor que no ponerlos: el cliente comprueba la lista y
encuentra otra cosa.

Aqui se cuentan de los archivos QUE SE VAN A EMPAQUETAR, no de una variable.

    python3 taller/armar.py && python3 taller/empaquetar.py
"""
import json, pathlib, re, shutil, zipfile

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent
SALE = pathlib.Path('/home/user/entrega')
CARP = SALE / 'toydarians-sitio'

# Lo que se publica: todo menos el taller, las notas internas y la propia
# descarga. Si manana se añade otra pagina, entra sola.
PAGS = sorted(RAIZ.glob('*.html'))
DATS = sorted(RAIZ.glob('datos-*.js'))
FIJO = ['estilo.css', 'motor.js']
DIRS = ['marca', 'fotos']

def piezas_de(dato):
    d = json.loads(re.search(r'TOY\.g\.piezas=(\{.*?\});', dato, re.S).group(1))
    return len(d)

cuentas = []
for p in PAGS:
    # De que archivo de datos come cada pagina se lee DE LA PAGINA. Adivinarlo
    # por el nombre falla en la primera: index.html carga
    # datos-vintage-collection.js, que no se parece en nada.
    m = re.search(r'<script src="(datos-[^"]+)"', p.read_text(encoding='utf-8'))
    dato = RAIZ / m.group(1) if m else None
    n = piezas_de(dato.read_text(encoding='utf-8')) if dato else 0
    cuentas.append((p.name, n))

fotos = sorted((RAIZ / 'fotos').rglob('*.webp'))
TOTAL = sum(n for _, n in cuentas)
lista_pags = '\n'.join(f'  {n:<16}{c} piezas' for n, c in cuentas)

LEEME = f"""TOYDARIANS · ESCAPARATE WEB
Cómo ponerlo en línea, cómo dejarlo privado y cómo encender el cobro
===================================================================

QUÉ ES ESTO
-----------
Un sitio web completo y terminado. No necesita servidor especial, ni base de
datos, ni instalar nada: son archivos sueltos que cualquier hosting sirve tal
cual.

Son {len(PAGS)} páginas, con {TOTAL} piezas en total:

{lista_pags}

Lo que hay en esta carpeta:

  index.html       la portada, y la vitrina de Vintage Collection
  funko.html       la página de Funko Pop!
  3d-print.html    la página de impresión 3D
  estilo.css       los estilos, los mismos para las tres
  motor.js         el movimiento, el buscador y el carrito
  datos-*.js       el catálogo de cada página (uno por página)
  marca/           el logotipo, las tipografías y las ilustraciones
  fotos/           las {len(fotos)} fotos de producto y las de categoría

No sobra nada. Todo lo que está aquí, la página lo usa.


1 · SUBIRLO
-----------
Se sube LA CARPETA ENTERA, con esa misma estructura. `index.html` tiene que
quedar en la raíz, y `marca/` y `fotos/` como subcarpetas al lado.

Sirve cualquier hosting de sitios estáticos. Tres que funcionan arrastrando la
carpeta, sin configurar nada:

  · Cloudflare Pages   dash.cloudflare.com → Workers & Pages → Create → Pages
  · Netlify            app.netlify.com/drop
  · Vercel             vercel.com/new

También funciona en un hosting normal con FTP (cPanel, Hostinger, GoDaddy…):
se copia todo dentro de `public_html` y listo.

Para verlo antes de subirlo, también puedes dar doble clic a `index.html` en tu
computadora: funciona completo —tipografías, fotos, buscador y fichas—. Lo
comprobamos. Eso sí, el sitio de verdad va subido.


2 · DEJARLO PRIVADO
-------------------
Esto NO se configura en los archivos: es una opción del hosting. Se busca en el
panel del proveedor, y el nombre cambia según cuál sea:

  · Cloudflare Pages → el proyecto → Settings → "Access policy"
  · Netlify          → Site settings → "Password protection"
  · Vercel           → Project Settings → "Deployment Protection"
  · Hosting con cPanel → "Directory Privacy" sobre la carpeta

En la mayoría de proveedores la protección con contraseña es una función de
pago; conviene revisarlo antes de elegir dónde subirlo.


3 · ENCENDER EL COBRO CON PAYPAL
--------------------------------
El botón de PayPal ya está programado y probado. Sólo le falta UN dato: el
identificador de la cuenta de negocio de Toydarians. Sin ese dato el sitio no
finge que cobra: el carrito enseña un aviso que dice que falta configurarlo.
Con el dato puesto, cobra.

Dónde se saca el dato:

  1. Entrar a developer.paypal.com con la cuenta de PayPal de Toydarians.
  2. Apps & Credentials → pestaña LIVE (no Sandbox).
  3. Crear una app si no hay ninguna, y copiar el "Client ID".
     Es una cadena larga de letras y números.

Dónde se pone:

  1. Abrir `motor.js` con cualquier editor de texto (Bloc de notas sirve).
  2. Buscar esta línea, cerca del principio:

         TOY.g.paypal = "";

  3. Pegar el Client ID entre las comillas:

         TOY.g.paypal = "AQUI_VA_EL_CLIENT_ID_LARGO";

  4. Guardar y volver a subir `motor.js`.

Se pone UNA vez: las tres páginas usan el mismo `motor.js`.

La moneda está en la línea de abajo (`TOY.g.moneda = "MXN"`). Si algún día se
cobra en otra, se cambia ahí.

El Client ID es un dato PÚBLICO —viaja en la página, cualquiera puede verlo— y
no sirve para sacar dinero de la cuenta. Lo que NUNCA se pone aquí es el
"Secret": ése no va en una página web nunca.

Las piezas de impresión 3D NO tienen precio en la tienda, así que no se pueden
cobrar con el botón: su ficha dice "Precio a consultar" y no deja agregarlas al
carrito. El día que tengan precio, se pasa el dato y aparecen como las demás.


4 · COMPROBAR QUE QUEDÓ BIEN
----------------------------
Con el sitio ya subido, abrirlo en el teléfono y revisar estas siete cosas:

  [ ] Al abrir sale una animación de 5 segundos que dibuja el logo letra por
      letra. Debe verse fluida, no a tirones.
  [ ] Bajando aparecen las {cuentas[0][1]} figuras con su foto y su precio.
  [ ] Escribiendo "kenobi" en el buscador quedan 2 figuras.
      Escribiendo "357" queda una sola.
  [ ] Tocando cualquier figura se abre su ficha, con el número grande de fondo.
      Deslizando la foto de lado se ven las demás fotos de esa figura.
  [ ] En "Categorías", tocando FUNKO o 3D PRINT se abre SU página, aquí dentro.
      Ninguna categoría manda a toydarians.com.
  [ ] Abajo del todo, el pie dice "toydarians.com" y NO muestra ningún número
      de velocidad ni texto raro.
  [ ] Poniendo  #vc-357  al final de la dirección, abre esa figura sola.
      Sirve para mandar una figura concreta por WhatsApp.


5 · LO QUE NO HAY QUE TOCAR
---------------------------
· No renombrar ni mover `marca/` ni `fotos/`: la página las busca por su nombre.
· No editar los `.html`, `estilo.css` ni los `datos-*.js` a mano. Se generan
  desde el proyecto; un cambio a mano se pierde la próxima vez que se regenere.
· De `motor.js`, sólo las dos líneas del punto 3.


DE DÓNDE SALE EL CONTENIDO
--------------------------
El logotipo, las fotos, las categorías, los precios y las existencias salen de
toydarians.com. Los precios y el inventario pueden cambiar: la tienda manda
siempre, y el sitio lo dice en el pie.

Star Wars, The Vintage Collection y las demás marcas son de sus titulares. Este
sitio no está afiliado a ellos.
"""

(RAIZ / 'LEEME-entrega.txt').write_text(LEEME, encoding='utf-8')

# ── la carpeta y el zip ───────────────────────────────────────────────────
if CARP.exists(): shutil.rmtree(CARP)
CARP.mkdir(parents=True)
(CARP / 'LEEME.txt').write_text(LEEME, encoding='utf-8')
for f in PAGS + DATS + [RAIZ / n for n in FIJO]:
    shutil.copy2(f, CARP / f.name)
for d in DIRS:
    shutil.copytree(RAIZ / d, CARP / d)

zip_ruta = SALE / 'toydarians-sitio.zip'
if zip_ruta.exists(): zip_ruta.unlink()
n = 0
with zipfile.ZipFile(zip_ruta, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for f in sorted(CARP.rglob('*')):
        if f.is_file():
            z.write(f, f.relative_to(CARP.parent)); n += 1

(RAIZ / 'descarga').mkdir(exist_ok=True)
shutil.copy2(zip_ruta, RAIZ / 'descarga' / zip_ruta.name)

print(f'{zip_ruta}  {zip_ruta.stat().st_size/1e6:.2f} MB  {n} archivos')
for nom, c in cuentas: print(f'   {nom:<16}{c:>3} piezas')
print(f'   fotos          {len(fotos):>3}')
