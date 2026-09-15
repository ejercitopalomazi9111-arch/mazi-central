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

# ⚠ ESTA LISTA ERA A MANO Y YA MINTIO UNA VEZ.
# Decia `FIJO = ['estilo.css', 'motor.js']`, asi que el dia que el sitio gano
# `idioma.js` —el conmutador de idioma— el ZIP salio SIN el. Las tres paginas
# lo pedian y el cliente se habria encontrado un boton EN muerto, con un 404
# que solo se ve abriendo la consola. El generador estaba bien, el sitio
# publicado estaba bien, y el paquete que se entrega estaba roto: el defecto
# vivia justo en el unico sitio que nadie vuelve a mirar.
#
# Ahora la lista NO se escribe: se lee de lo que las propias paginas piden en
# sus `<script src>` y `<link href>`. Un archivo nuevo entra solo en cuanto
# alguna pagina lo cargue, que es exactamente cuando hace falta.
PAGS = sorted(RAIZ.glob('*.html'))
DIRS = ['marca', 'fotos']

def _pide(pagina):
    t = pagina.read_text(encoding='utf-8')
    return re.findall(r'(?:src|href)="([^":]+\.(?:js|css))"', t)

RECURSOS = sorted({r for p in PAGS for r in _pide(p)})
faltan = [r for r in RECURSOS if not (RAIZ / r).is_file()]
if faltan:
    raise SystemExit(f'las paginas piden archivos que no existen: {faltan}')

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

# El instructivo. Se escribe para MAURICIO, que no es programador y va a
# hacer esto una vez: primero QUE HAY QUE HACER, en tres acciones con su
# tiempo, y el detalle debajo. La version anterior empezaba explicando lo que
# era el sitio y dejaba las acciones en la pagina dos.
LEEME = f"""TOYDARIANS · SITIO WEB
Instrucciones para ponerlo en línea
=====================================================================


LO QUE HAY QUE HACER — 3 COSAS
------------------------------

  1. SUBIR la carpeta a un hosting               10 min
  2. PONERLE CONTRASEÑA (si lo quieren privado)   5 min
  3. PEGAR UN DATO DE PAYPAL para que cobre       5 min

Sin el paso 3 el sitio se ve completo y funciona todo, pero no cobra:
el carrito avisa que falta configurarlo. Con el paso 3, cobra.

Abajo está cada paso explicado. No hace falta saber programar.


=====================================================================
PASO 1 · SUBIRLO                                              10 min
=====================================================================

Descomprime el ZIP. Te queda una carpeta con esto dentro:

    index.html       la portada
    funko.html       la página de Funko
    3d-print.html    la página de impresión 3D
    estilo.css       los estilos
    motor.js         el movimiento, el buscador y el carrito
    idioma.js        el botón EN, que traduce el sitio al inglés
    datos-*.js       el catálogo de cada página
    marca/           logotipo y tipografías
    fotos/           las {len(fotos)} fotos

SE SUBE TODO, TAL CUAL, SIN CAMBIAR NADA DE SITIO. `index.html` tiene que
quedar arriba del todo, y `marca/` y `fotos/` como carpetas a su lado.

Elige UNO de estos. Los tres son gratis para empezar y funcionan
arrastrando la carpeta con el ratón:

    NETLIFY   — el más fácil de los tres
      1. Entra a  app.netlify.com/drop
      2. Arrastra la carpeta a la página
      3. Ya está. Te da una dirección al momento.

    CLOUDFLARE PAGES
      1. Entra a  dash.cloudflare.com
      2. Workers & Pages  ->  Create  ->  Pages  ->  Upload assets
      3. Arrastra la carpeta

    VERCEL
      1. Entra a  vercel.com/new
      2. Arrastra la carpeta

¿Ya tienes hosting con cPanel (Hostinger, GoDaddy…)? Entonces se copia
todo dentro de `public_html` por FTP y listo.

COMPROBAR: abre la dirección en el teléfono. Tiene que salir una
animación de 5 segundos que dibuja el logo, y más abajo las figuras con
su precio.


=====================================================================
PASO 2 · PONERLE CONTRASEÑA                                    5 min
=====================================================================

Sólo si lo quieren privado. Esto NO está en los archivos: es un botón
del hosting. Se llama distinto en cada uno:

    Netlify           Site settings  ->  "Password protection"
    Cloudflare Pages  el proyecto -> Settings -> "Access policy"
    Vercel            Project Settings -> "Deployment Protection"
    cPanel            "Directory Privacy" sobre la carpeta

AVISO: en casi todos es función de pago. Si lo van a querer privado,
revísalo ANTES de elegir dónde subirlo.


=====================================================================
PASO 3 · QUE COBRE (PAYPAL)                                    5 min
=====================================================================

El botón de pago ya está programado y probado. Le falta UN dato.

A) SACAR EL DATO

   1. Entra a  developer.paypal.com  con la cuenta de PayPal de
      Toydarians (la de negocio, no una personal).
   2. Arriba: "Apps & Credentials".
   3. IMPORTANTE: cambia a la pestaña  LIVE.  Si te quedas en Sandbox,
      el sitio cobrará con dinero de mentira.
   4. Si no hay ninguna app, dale a "Create App" y ponle cualquier
      nombre (por ejemplo: Toydarians Web).
   5. Copia el  "Client ID".  Es una cadena larga de letras y números.

B) PEGARLO

   1. Abre  motor.js  con el Bloc de notas (o TextEdit en Mac).
      Es un archivo de texto normal, no pasa nada por abrirlo.
   2. Busca esta línea, está cerca del principio:

          TOY.g.paypal = "";

   3. Pega el Client ID ENTRE LAS COMILLAS, sin borrarlas:

          TOY.g.paypal = "AZxXk9...el_tuyo_largo...7Qw";

   4. Guarda el archivo.
   5. Vuelve a subir SÓLO ese archivo, `motor.js`, al mismo sitio.
      (En Netlify y Vercel: vuelve a arrastrar la carpeta entera, es
      más rápido que buscar el archivo.)

   Se hace UNA sola vez. Las tres páginas usan el mismo `motor.js`.

C) COMPROBAR

   Abre el sitio, mete una figura al carrito y ábrelo. Tiene que salir
   el botón amarillo de PayPal. Si sale un aviso que dice que falta
   configurarlo, el dato no quedó bien pegado — revisa que esté entre
   las comillas.

¿ES PELIGROSO PONER ESO AHÍ?
No. El "Client ID" es un dato PÚBLICO: viaja dentro de la página y
cualquiera puede verlo. No sirve para sacar dinero de la cuenta.
Lo que NUNCA se pone en una página web es el "Secret". Ése no se toca.

LA MONEDA
Está en la línea de abajo:  TOY.g.moneda = "MXN".  Sólo se cambia si
algún día se cobra en otra moneda.


=====================================================================
LO QUE NO HAY QUE TOCAR
=====================================================================

  · No cambies de nombre ni muevas `marca/` ni `fotos/`. La página las
    busca por su nombre y se quedaría sin fotos.
  · No edites los `.html`, ni `estilo.css`, ni `idioma.js`, ni los
    `datos-*.js`. Se generan desde el proyecto: un cambio a mano se
    pierde la próxima vez que se regenere el sitio.
  · De `motor.js`, sólo las dos líneas del paso 3.

Si hay que cambiar un precio, una foto o un texto, se avisa y se
regenera. No se edita a mano.


=====================================================================
LO QUE HAY DENTRO
=====================================================================

Tres páginas, {TOTAL} piezas:

{lista_pags}

Todo se compra dentro del sitio: buscador, filtros por serie, ficha de
cada pieza con su galería, y carrito que cobra el pedido completo de una
vez (no una figura por una).

Arriba a la derecha hay un botón EN: al tocarlo, TODA la página queda en
inglés, y vuelve a español tocándolo otra vez.

Truco: si le pones  #vc-357  al final de la dirección, abre esa figura
sola. Sirve para mandar una pieza concreta por WhatsApp.

LAS PIEZAS DE IMPRESIÓN 3D NO TIENEN PRECIO. No es un error: la tienda
las cotiza por encargo. Su ficha dice "Precio a consultar" y no deja
agregarlas al carrito. En cuanto tengan precio, se pasan y funcionan
como las demás.


=====================================================================

El logotipo, las fotos, los precios y las existencias salen de
toydarians.com. Los precios y el inventario pueden cambiar: la tienda
manda siempre, y el sitio lo dice en el pie.

Star Wars, The Vintage Collection y las demás marcas son de sus
titulares. Este sitio no está afiliado a ellos.
"""

(RAIZ / 'LEEME-entrega.txt').write_text(LEEME, encoding='utf-8')

# ── la carpeta y el zip ───────────────────────────────────────────────────
if CARP.exists(): shutil.rmtree(CARP)
CARP.mkdir(parents=True)
(CARP / 'LEEME.txt').write_text(LEEME, encoding='utf-8')
for f in PAGS + [RAIZ / n for n in RECURSOS]:
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

# La comprobacion que faltaba: se abre el ZIP YA ESCRITO y se exige que todo
# lo que piden las paginas este dentro. Mirar la lista de copiados no habria
# servido —la lista era justo la que estaba mal—; hay que mirar el paquete.
with zipfile.ZipFile(zip_ruta) as z:
    dentro = {x.split('/', 1)[1] for x in z.namelist() if '/' in x}
    huecos = [r for r in RECURSOS if r not in dentro]
    if huecos:
        raise SystemExit(f'el ZIP sale sin archivos que las paginas piden: {huecos}')

print(f'{zip_ruta}  {zip_ruta.stat().st_size/1e6:.2f} MB  {n} archivos')
print(f'   recursos     {len(RECURSOS)} ({", ".join(RECURSOS)})')
for nom, c in cuentas: print(f'   {nom:<16}{c:>3} piezas')
print(f'   fotos          {len(fotos):>3}')
