#!/usr/bin/env python3
"""Arma el escaparate de Toydarians en un solo archivo autocontenido.

Por que un generador y no un HTML a mano: el catalogo son 47 piezas reales
sacadas del WooCommerce del cliente y las imagenes van embebidas como data URI
(el visor bloquea imagenes externas). Editar eso a mano seria imposible.
Los datos entran por activos/, el diseno vive aqui.
"""
import base64, json, re, pathlib

# ⚠ ESTE `parent.parent` DEJA EL GENERADOR MUERTO, Y YA VOLVIÓ UNA VEZ.
# Cuando el taller vivía en `scripts/`, subir dos niveles caía en la carpeta del
# proyecto y `activos/` estaba ahí. Al mudarlo a `taller/` los activos se
# mudaron CON él, pero el cálculo se quedó igual: apunta a `toydarians/activos`,
# que no existe.
#     python3 toydarians/taller/armar.py
#     FileNotFoundError: .../toydarians/activos/catalogo-limpio.json
# O sea que el sitio commiteado NO SE PUEDE REGENERAR — y no se nota, porque el
# index.html ya generado se sirve perfecto. Lo roto es la única forma de volver
# a hacerlo.
#
# Se arregló el 9 de septiembre y volvió el mismo día, al empujarse una copia de
# `armar.py` escrita antes de ese arreglo. Si vuelve a aparecer: no es un
# despiste nuevo, es que alguien trabajó sobre una base vieja.
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent
ACT  = AQUI / 'activos'
cat  = json.loads((ACT / 'catalogo-limpio.json').read_text(encoding='utf-8'))
img  = json.loads((ACT / 'assets.json').read_text(encoding='utf-8'))

def esc(s):
    return (str(s).replace('&','&amp;').replace('<','&lt;')
                  .replace('>','&gt;').replace('"','&quot;'))

def num(vc):
    m = re.match(r'(\d+)([A-Z]?)', vc)
    return int(m.group(1))

# --- Las celdas de la vitrina -------------------------------------------------
# El color de cada celda NO es decorativo: es la mediana medida del fondo del
# render de Hasbro correspondiente. Cada figura trae su propia luz.
CELDAS = [
    ('p1', None,  'Multipack',              'Tres figuras, un solo carton'),
    ('p2', None,  'Darth Maul',             'Sable doble, manto de malla'),
    ('p3', None,  'Trio',                   'Dark trooper, Kenobi, Jawa'),
    ('p4', '357', 'Obi-Wan Kenobi',         'Jedi Legend'),
    ('p5', '301', 'Darth Revan',            'Knights of the Old Republic'),
]

# --- Hoja de estilo ----------------------------------------------------------
# Cuarta vuelta, y la dirección la puso Carlos con 69 referencias: hasbropulse,
# lego.com y shop.mattel — tienda oscura de coleccionista con fichas de
# producto — más carteles de Star Wars. Y una orden: usar el logo del cliente.
#
# El logo lo cambió todo. Es AMARILLO #FAF700 sobre negro, con el nombre
# repetido abajo en AUREBESH, el alfabeto de Star Wars. O sea: el tema no hay
# que inventarlo, ya estaba en su marca. El ámbar de las vueltas anteriores era
# un color que me gustaba a mí; éste está medido de su propio logotipo
# (mediana de 321 242 píxeles opacos).
CSS = r"""
:root{
  --negro:#0A0A0B; --panel:#141416; --panel2:#1D1D21; --linea:#2B2B31;
  --amarillo:#FAF700;            /* medido del logotipo del cliente */
  --amarillo-hondo:#B8B500;
  --hueso:#F2F2F0; --gris:#9A9AA2; --gris-tenue:#8A8A92;
  --rojo:#D1232A; --rojo-hondo:#8E1319; --verde:#4FAE5C;
  --display:'Bungee','Arial Black',system-ui,sans-serif;
  --texto:'Familjen Grotesk',system-ui,-apple-system,'Segoe UI',sans-serif;
  --dato:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;
  --ancho:1240px; --aire:clamp(18px,4.2vw,44px);
  --px:.5; --py:.5;
  --aurebesh:url('AUREBESH_URI');
}
*{box-sizing:border-box}
/* ⚠ EL NEGRO SE MUDA DE `body` A `html`, Y NO ES COSMETICO.
   `index.html` ya trae `html{background:#0A0A0B}` en el estilo en linea que
   evita el destello blanco al cargar. Con `html` pintado, el fondo de `body`
   YA NO se propaga al lienzo de la ventana: `body` pinta su propia caja, y esa
   caja tapaba entero el lienzo de la nebulosa, que va en `z-index:-1`.
   Sintoma: el fondo animado estaba dibujando —medido, pixeles y todo— y la
   pagina se veia negra igual que antes.
   Con `body` transparente el suelo lo pone `html`: sin JS queda el mismo negro
   de siempre, y con JS la nebulosa se ve. */
html{background:var(--negro)}
body{margin:0;background:transparent;color:var(--hueso);
  font:400 16px/1.6 var(--texto);-webkit-font-smoothing:antialiased;overflow-x:hidden}
/* ══ G · EL FONDO VIVO ═════════════════════════════════════════════════════
   Un lienzo fijo detras de todo: nebulosa que se mueve, tres capas de
   estrellas con paralaje al scrollear y, de vez en cuando, una raya de salto
   al hiperespacio.

   Tres decisiones que no son de gusto:

   · `z-index:-1` y NO un `z-index:0` con el contenido encima. El fondo de
     `body` se propaga al lienzo de la ventana —`html` no tiene ninguno—, asi
     que la caja de `body` no pinta nada y el -1 se ve. Con 0 habria que
     ponerle posicion y capa a CADA seccion, y la que se olvidara quedaria
     debajo del fondo.
   · `pointer-events:none`: si no, se come los clics de toda la pagina.
   · Sin JS no existe y no pasa nada: queda el negro de siempre. El lienzo es
     aniadido, nunca el suelo sobre el que se lee.

   Y el limite que lo hace seguro: la nebulosa va a ALFA MUY BAJA a proposito.
   El contraste de la pagina se mide contra `--negro`, asi que si el fondo
   aclarara de verdad ese numero seria mentira. Hay una comprobacion en
   revisar.mjs que mide el pixel mas claro que este lienzo llega a pintar. */
.g-fondo{position:fixed;inset:0;z-index:-1;pointer-events:none;
  width:100%;height:100%;display:block}
@media (prefers-reduced-motion:reduce){.g-fondo{opacity:.7}}
/* ⚠ EL `height:auto` NO ES ADORNO: SIN EL EL LOGO SE DEFORMA.
   Lo reporto Carlos — «el logo cuando carga se ve demasiado recortado en la
   parte de abajo». No estaba recortado: estaba ESTIRADO a lo alto.

   Los `<img>` llevan `width="760" height="128"` en el atributo, y eso esta BIEN
   puesto: reserva el hueco y evita que el contenido salte al cargar. Pero
   cuando el CSS toca SOLO un eje (`.cabecera img{width:62%}`), el navegador se
   queda con el alto del atributo: pintaba 219 x 128 cuando le tocaban 219 x 37.
   El aurebesh de abajo, aplastado contra el borde, se leia como un recorte.

   Proporcion natural 760/128 = 5.94; pintada 219/128 = 1.71. La barra usa
   `height` + `width:auto` y por eso ESA siempre estuvo bien: el mismo logo,
   correcto en un sitio y roto en otro.

   Va en la regla general y no en `.cabecera` a proposito: asi muere la clase
   entera de defecto para cualquier imagen a la que alguien toque un solo eje. */
img{display:block;max-width:100%;height:auto}
a{color:inherit}
::selection{background:var(--amarillo);color:#0A0A0B}
:focus-visible{outline:2px solid var(--amarillo);outline-offset:3px}
.caso{max-width:var(--ancho);margin-inline:auto;padding-inline:var(--aire);
  container-type:inline-size}
h1,h2,h3{font-family:var(--display);font-weight:400;text-transform:uppercase;
  letter-spacing:-.045em;margin:0;text-wrap:balance;line-height:1.02}
/* ⚠ EL MINIMO ERA 34 px Y ESO ES LO QUE CARLOS LLAMO «SE VE CHIQUITO».
   En un telefono de 390 el `7.6vw` da 29.6, asi que ganaba el suelo de 34 —
   tamano de subtitulo para el titular de una portada, y el telefono es donde
   se mira esto. Sube a 44 de suelo y 12vw de pendiente: 46.8 px reales en 390.
   El `min(...,16cqw)` se queda: es el freno que impide que Bungee, que es muy
   ancha, se salga de su columna. */
h1{font-size:clamp(44px,12vw,106px)}
h1{font-size:min(clamp(44px,12vw,106px),16cqw)}
h2{font-size:clamp(21px,3.4vw,44px)}
h2{font-size:min(clamp(21px,3.4vw,44px),10cqw)}
h3{font-size:clamp(14px,1.6vw,18px);letter-spacing:-.035em}
p{margin:0 0 1em;color:var(--gris);max-width:60ch}
p strong{color:var(--hueso);font-weight:500}
.ceja{font:700 10.5px/1 var(--dato);letter-spacing:.28em;text-transform:uppercase;
  color:var(--amarillo);margin:0 0 16px}
"""

CSS += r"""

/* ══════════════════════════════════════════════════════════════════════════
   G · LA INTRO · 5 s
   Pedida asi: «que construya el logo letra por letra estilo star wars como si
   fuese un sable laser». Las letras NO son de una tipografia parecida: son las
   del logotipo real del cliente, recortadas del archivo por los valles del
   perfil de tinta (las letras se tocan, asi que no valen las columnas vacias).
   Cada una la traza una hoja de luz que baja, la revela y se apaga.
   ══════════════════════════════════════════════════════════════════════════ */
.g-intro{position:fixed;inset:0;z-index:100;background:#000;display:grid;
  place-items:center;overflow:hidden}
.g-intro[hidden]{display:none}
.g-intro .cielo{position:absolute;inset:0;opacity:.55}
.g-intro .marca{position:relative;width:min(88vw,900px)}
.g-intro .fila{position:relative;width:100%;aspect-ratio:1884/174}
.g-intro .let{position:absolute;top:0;height:100%;
  -webkit-mask-image:linear-gradient(#000,#000);mask-image:linear-gradient(#000,#000);
  -webkit-mask-size:100% 0%;mask-size:100% 0%;
  -webkit-mask-position:50% 0;mask-position:50% 0;
  -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
.g-intro .let img{width:100%;height:100%;object-fit:fill;display:block}
/* la hoja: una linea de luz que cruza la letra mientras la revela */
.g-intro .hoja{position:absolute;top:0;height:0%;width:100%;pointer-events:none;
  background:linear-gradient(180deg,transparent,#FFF 60%,#FFF);
  box-shadow:0 0 18px 5px rgba(250,247,0,.85),0 0 46px 14px rgba(250,247,0,.35);
  opacity:0}
.g-intro .au{display:block;width:52%;margin:18px auto 0;opacity:0;
  filter:drop-shadow(0 0 12px rgba(250,247,0,.5))}
.g-intro .saltar{position:absolute;right:16px;bottom:16px;z-index:3;
  background:transparent;border:1px solid #3A3A40;color:#8A8A92;cursor:pointer;
  font:700 10px/1 var(--dato);letter-spacing:.2em;text-transform:uppercase;
  padding:10px 14px}
.g-intro .saltar:hover{border-color:var(--amarillo);color:var(--amarillo)}
/* La pagina no se ve hasta que la intro termina, pero EXISTE: si el guion no
   corre, `hidden` nunca se pone y el sitio se ve igual sin intro. */
@media (prefers-reduced-motion: reduce){ .g-intro{display:none} }

/* ---- Barra ---------------------------------------------------------------- */
.barra{position:sticky;top:0;z-index:20;background:#000;
  border-bottom:1px solid var(--linea)}
.barra .caso{display:flex;align-items:center;gap:clamp(12px,2.4vw,28px);
  padding-block:13px}
.barra .logo{flex:0 0 auto}
.barra .logo img{height:clamp(20px,2.6vw,27px);width:auto}
.barra .caso{flex-wrap:nowrap}
.barra nav{display:flex;gap:clamp(12px,2vw,24px);margin-left:auto;flex-wrap:nowrap;
  font:700 10.5px/1 var(--dato);letter-spacing:.16em;text-transform:uppercase}
/* En telefono no caben logo + enlaces + boton: mandan el logo y el boton, y
   los enlaces viven dentro del menu. Antes se partia en dos renglones y el
   boton quedaba encimado -- de ahi el «el boton menu no sirve». */
@media (max-width:720px){
  .barra nav{display:none}
  .g-abrir{margin-left:auto}
}
.barra nav a{color:var(--gris);text-decoration:none;transition:color .2s}
.barra nav a:hover{color:var(--amarillo)}


/* ---- Cartel de portada ---------------------------------------------------- */
/* Un cartel, no una portada de plantilla: el titular en el amarillo de la
   marca, la cuña roja cruzando y las figuras dentro de la cuña. */
/* ⚠ `background:#000` AQUI TAPABA EL FONDO VIVO. El lienzo de la nebulosa va
   en `z-index:-1`, o sea detras del contenido pero delante del fondo de la
   ventana; cualquier seccion con fondo opaco lo borra en su trozo. El cartel
   y el pie son justamente los dos sitios donde hay aire para que se vea, asi
   que se quedan transparentes y el negro lo pone `body`, como siempre. */
.cartel{position:relative;overflow:hidden;background:transparent;
  padding-block:clamp(30px,5vw,58px) 0}
.cuna{position:absolute;inset:auto -12% -14% -12%;height:62%;z-index:0;
  background:linear-gradient(101deg,var(--rojo-hondo) 0%,var(--rojo) 46%,#6E0F14 100%);
  transform:skewY(-4.5deg);opacity:.92}
.trama{position:absolute;inset:0;z-index:1;pointer-events:none;opacity:.16;
  background-image:repeating-linear-gradient(0deg,#000 0 1px,transparent 1px 3px)}
.cartel>.caso{position:relative;z-index:2}
.cartel-red{display:grid;gap:clamp(14px,2.4vw,30px);align-items:end;
  grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);
  grid-template-areas:'ceja ceja' 'tit tit' 'txt fig'}
@media (max-width:800px){.cartel-red{grid-template-columns:minmax(0,1fr);
  grid-template-areas:'ceja' 'tit' 'fig' 'txt'}}
.cartel-red>*{min-width:0}
.cartel-red .ceja{grid-area:ceja;margin:0}
.cartel-red h1{grid-area:tit;color:var(--amarillo);
  text-shadow:0 3px 0 rgba(0,0,0,.5)}
.cartel-red h1 em{font-style:normal;color:var(--hueso)}
.cartel-red .dicho{grid-area:txt;padding-bottom:clamp(24px,4vw,54px)}
.cartel-red .dicho p{color:#F0E4E4;max-width:38ch;font-size:clamp(15px,1.4vw,17px)}
.cartel-red .peana{grid-area:fig;position:relative}
.figura img{margin-inline:auto;width:auto;max-width:100%;
  height:clamp(260px,38vw,520px);object-fit:contain;object-position:bottom;
  filter:drop-shadow(0 24px 30px rgba(0,0,0,.75))}
.figura{transform:translate3d(calc((var(--px) - .5) * -20px),calc((var(--py) - .5) * -9px),0)}
.acciones{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
.b{display:inline-flex;align-items:center;gap:9px;text-decoration:none;
  font:700 11.5px/1 var(--dato);letter-spacing:.16em;text-transform:uppercase;
  padding:15px 22px;border:2px solid var(--amarillo);color:#0A0A0B;white-space:nowrap;
  background:var(--amarillo);position:relative;
  transition:background-color .22s,color .22s}
.b:hover{background:#0A0A0B;color:var(--amarillo)}
.b.hueco{background:transparent;color:var(--hueso);border-color:var(--hueso)}
.b.hueco:hover{background:var(--hueso);color:#0A0A0B}

/* ---- Banda de categoría --------------------------------------------------- */
/* Sacada de hasbropulse: banda a sangre que anuncia la línea. */
.banda-cat{background:var(--rojo);position:relative;overflow:hidden}
.banda-cat::after{content:'';position:absolute;inset:0;pointer-events:none;opacity:.2;
  background-image:repeating-linear-gradient(90deg,#000 0 2px,transparent 2px 9px)}
.banda-cat .caso{position:relative;z-index:1;display:flex;flex-wrap:wrap;
  align-items:center;gap:14px 26px;padding-block:clamp(16px,2.4vw,26px)}
.banda-cat h2{color:#FFF;flex:1 1 auto}
.banda-cat .apunte{font:700 11px/1.5 var(--dato);letter-spacing:.16em;
  text-transform:uppercase;color:#FFF}
"""

CSS += r"""
/* ---- Rejilla de producto --------------------------------------------------- */
/* Dos por fila en teléfono, como hasbropulse y lego. Es la forma que la gente
   que compra figuras ya tiene aprendida; pelearse con ella no aporta nada.
   OJO: aquí no hay precios ni existencias inventadas. No los tenemos, y ésta
   es una tienda real: la píldora dice el número VC, que sí es verdad. */
.rejilla{display:grid;gap:clamp(10px,1.4vw,18px);
  grid-template-columns:repeat(auto-fill,minmax(min(100%,232px),1fr))}
.pieza{position:relative;background:var(--panel);border:1px solid var(--linea);
  overflow:hidden;text-decoration:none;color:inherit;display:flex;
  flex-direction:column;transition:border-color .25s,transform .3s cubic-bezier(.2,.7,.3,1)}
.pieza:hover{border-color:var(--amarillo);transform:translate3d(0,-4px,0)}
/* ══════════════════ S · Sylcred ══════════════════
   ⚠ EN UN TELEFONO NO HAY `:hover`. Todo el trabajo de la ficha estaba en el
   unico estado que el visitante de Carlos —que mira desde el iPhone— nunca va
   a ver. El que importa ahi es `:active`, y no existia: al tocar, la tarjeta no
   respondia, y una tarjeta que no responde se toca dos veces porque nadie sabe
   si registro. El hundido es deliberadamente pequeno y rapido: es acuse de
   recibo, no una animacion. */
.pieza{transition:border-color .25s,transform .3s cubic-bezier(.2,.7,.3,1),box-shadow .3s ease}
.pieza:active{transform:translate3d(0,-1px,0) scale(.985);transition-duration:.09s}
.pieza:focus-visible{outline:none;border-color:var(--amarillo);
  box-shadow:0 0 0 2px var(--amarillo),0 0 0 6px rgba(250,247,0,.22)}
/* La foto se acerca dentro de su marco: se mueve el CONTENIDO, no la caja, que
   es lo que hace que la tarjeta se sienta una ventana. Solo `transform` — el
   `drop-shadow` que ya tiene NO se anima, que es de lo mas caro por fotograma. */
.foto img{transition:transform .45s cubic-bezier(.2,.7,.3,1)}
.pieza:hover .foto img{transform:scale(1.05)}
/* El «+4» decia que hay galeria y era una etiqueta muerta. */
.foto .mas{transition:transform .28s cubic-bezier(.2,1.3,.32,1),
                     background-color .28s,color .28s,border-color .28s}
.pieza:hover .mas,.pieza:focus-visible .mas{transform:translateY(-3px);
  background:var(--amarillo);color:#0A0A0B;border-color:var(--amarillo)}
.b:active{transform:scale(.972);transition-duration:.09s}
/* ══════════════════ /S ══════════════════ */
.foto{display:block;position:relative;aspect-ratio:1/1;background-color:var(--luz);
  background-image:radial-gradient(72% 60% at 50% 42%,
    color-mix(in srgb,var(--luz) 88%,#FFF) 0%,var(--luz) 44%,
    color-mix(in srgb,var(--luz) 26%,#000) 100%)}
.foto img{position:absolute;left:6%;top:4%;width:88%;height:88%;
  object-fit:contain;object-position:bottom;
  filter:drop-shadow(0 12px 14px rgba(0,0,0,.55))}
.pildora{position:absolute;top:9px;left:9px;z-index:2;
  font:700 9.5px/1 var(--dato);letter-spacing:.14em;text-transform:uppercase;
  background:var(--amarillo);color:#0A0A0B;padding:6px 8px}
.pildora.serie{background:#0A0A0B;color:var(--amarillo);
  border:1px solid var(--amarillo-hondo);left:auto;right:9px}
.ficha-p{padding:13px 13px 15px;display:grid;gap:7px;flex:1}
.ficha-p .nom{font:700 clamp(13.5px,1.4vw,15.5px)/1.2 var(--texto);
  text-transform:uppercase;letter-spacing:.005em}
.ficha-p .met{font:400 11px/1.4 var(--dato);color:var(--gris-tenue)}
.ficha-p .ir{margin-top:auto;font:700 10px/1 var(--dato);letter-spacing:.16em;
  text-transform:uppercase;color:var(--amarillo);display:flex;
  align-items:center;gap:6px}

/* Marcador honesto: si la foto no está, se dice. Jamás una imagen que
   pretenda ser el producto — es la tienda de alguien de verdad. */
.foto.vacia{background-color:var(--panel2);background-image:
  repeating-linear-gradient(45deg,rgba(250,247,0,.045) 0 8px,transparent 8px 16px);
  display:grid;place-items:center}
.marcador{display:grid;gap:8px;justify-items:center;text-align:center}
.marcador b{font:400 clamp(30px,5vw,46px)/1 var(--display);color:var(--amarillo);
  font-variant-numeric:tabular-nums;opacity:.85}
.marcador i{font:700 9px/1 var(--dato);letter-spacing:.22em;text-transform:uppercase;
  color:var(--gris-tenue);font-style:normal}

/* ---- El catálogo dibujado -------------------------------------------------- */
/* La idea propia del proyecto: el índice VC es disperso y ese dibujo es de
   este cliente y de nadie más. Sobrevive de las vueltas anteriores porque es
   lo único que no se puede copiar. */
.eje-h{position:relative;height:74px;margin:0 0 8px}
.eje-h .base{position:absolute;left:0;right:0;bottom:26px;height:1px;background:var(--linea)}
.pieza-eje{position:absolute;bottom:26px;width:2px;height:32px;
  background:var(--amarillo);transform:translateX(-1px)}
.pieza-eje:nth-child(even){height:40px}
.decena{position:absolute;bottom:26px;width:1px;height:7px;background:var(--linea)}
.rot-eje{position:absolute;bottom:0;font:700 10px/1 var(--dato);letter-spacing:.14em;
  color:var(--gris-tenue);transform:translateX(-50%);white-space:nowrap}
.rot-eje:first-of-type{transform:none}
.cifras{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));
  margin:22px 0 0;padding:0;list-style:none}
.cifras li{border-left:3px solid var(--amarillo);padding-left:13px}
.cifras b{display:block;font:400 clamp(26px,3.6vw,40px)/1 var(--display);
  font-variant-numeric:tabular-nums}
.cifras span{font:400 10px/1.35 var(--dato);letter-spacing:.14em;
  text-transform:uppercase;color:var(--gris-tenue)}

/* ---- Índice ---------------------------------------------------------------- */
.indice{columns:2;column-gap:clamp(20px,3vw,48px);column-rule:1px solid var(--linea);
  border-top:1px solid var(--linea)}
@media (max-width:760px){.indice{columns:1}}
.reng{display:grid;grid-template-columns:58px minmax(0,1fr);gap:2px 12px;
  break-inside:avoid;padding:10px 7px;border-bottom:1px solid var(--linea);
  text-decoration:none;color:inherit;position:relative;isolation:isolate}
.reng::before{content:'';position:absolute;inset:0;z-index:-1;background:var(--panel);
  transform:scaleX(0);transform-origin:left;transition:transform .3s cubic-bezier(.2,.7,.3,1)}
.reng:hover::before{transform:scaleX(1)}
.reng .n{grid-row:span 2;align-self:center;text-align:right;
  font:700 clamp(15px,1.6vw,19px)/1 var(--dato);color:var(--amarillo);
  font-variant-numeric:tabular-nums}
.reng .t{font:700 clamp(13.5px,1.4vw,15px)/1.2 var(--texto);text-transform:uppercase;
  overflow-wrap:anywhere}
.reng .s{font:400 11px/1.3 var(--dato);color:var(--gris-tenue);overflow-wrap:anywhere}
.hueco{display:grid;grid-template-columns:58px minmax(0,1fr) auto;gap:12px;
  align-items:center;break-inside:avoid;padding:8px 7px;
  border-bottom:1px solid var(--linea);font:400 9.5px/1 var(--dato);
  letter-spacing:.2em;text-transform:uppercase;color:var(--gris-tenue)}
.hueco .raya{height:1px;opacity:.55;
  background:repeating-linear-gradient(90deg,var(--amarillo-hondo) 0 4px,transparent 4px 10px)}
"""

CSS += r"""

/* ══════════════════════════════════════════════════════════════════════════
   G · CATEGORIAS Y BANNERS
   La lista de 47 filas se va: la sustituye la rejilla de categorias con la
   marca de cada apartado, sacada del menu REAL de su web. Y los banners se
   cambian solos, poco a poco y a destiempo -- cada uno con su propio reloj,
   que es lo que hace que no parezca un carrusel.
   ══════════════════════════════════════════════════════════════════════════ */
.g-cats{display:grid;gap:clamp(10px,1.4vw,16px);
  grid-template-columns:repeat(auto-fill,minmax(min(100%,268px),1fr))}
.g-cat{position:relative;display:block;overflow:hidden;text-decoration:none;
  color:inherit;background:var(--panel);border:1px solid var(--linea);
  aspect-ratio:16/10;transition:border-color .25s,transform .4s cubic-bezier(.2,.7,.3,1)}
.g-cat:hover{border-color:var(--amarillo);transform:translate3d(0,-4px,0)}
.g-cat.ancha{grid-column:span 2;aspect-ratio:16/6}
@media (max-width:620px){.g-cat.ancha{grid-column:span 1;aspect-ratio:16/9}}
/* los banners viven apilados y se cruzan por opacidad: es una capa decorativa,
   nunca el texto */
.g-cat .banners{position:absolute;inset:0}
.g-cat .banners span{position:absolute;inset:0;background-size:cover;
  background-position:50% 42%;opacity:0;transition:opacity 1.6s ease-in-out}
.g-cat .banners span.viva{opacity:1}
.g-cat .velo{position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(8,8,10,.30) 0%,rgba(8,8,10,.62) 52%,rgba(8,8,10,.92) 100%)}
.g-cat .marca-cat{position:absolute;left:0;right:0;bottom:0;padding:16px 17px 17px;
  display:grid;gap:6px}
.g-cat .marca-cat b{font:400 clamp(17px,2vw,26px)/1 var(--display);
  letter-spacing:-.045em;text-transform:uppercase;color:var(--hueso)}
.g-cat:hover .marca-cat b{color:var(--amarillo)}
.g-cat .marca-cat i{font:700 9.5px/1.5 var(--dato);letter-spacing:.18em;
  text-transform:uppercase;color:var(--gris);font-style:normal}
.g-cat .cuenta{position:absolute;top:11px;right:11px;background:rgba(8,8,10,.72);
  border:1px solid var(--linea);color:var(--amarillo);padding:5px 8px;
  font:700 9.5px/1 var(--dato);letter-spacing:.14em}
/* la marca del apartado, dibujada con su nombre en la letra del logo: no me
   descargo logotipos ajenos, uso el rotulo */
.g-cat .rotulo{position:absolute;inset:0;display:grid;place-items:center;
  font:400 clamp(22px,3.4vw,44px)/1 var(--display);letter-spacing:-.05em;
  color:rgba(255,255,255,.09);text-transform:uppercase;pointer-events:none;
  padding:0 14px;text-align:center}
/* La tarjeta SIN foto real. No es un estado de error: es la mitad del catalogo
   —lineas que la tienda si vende y de las que no tenemos una imagen suya— y
   tiene que verse tan a proposito como las otras. Se dibuja con lo que ya es
   de la casa: la cuna diagonal y la trama de rayas del pie. Tres variantes por
   posicion, para que ocho tarjetas seguidas no sean la misma lamina. */
.g-cat.sin-foto{background:
  repeating-linear-gradient(90deg,rgba(255,255,255,.028) 0 2px,transparent 2px 9px),
  linear-gradient(148deg,#141416 0%,#141416 54%,var(--rojo) 54%,#7E0E17 100%),
  var(--panel)}
.g-cat.sin-foto.t1{background:
  repeating-linear-gradient(90deg,rgba(255,255,255,.028) 0 2px,transparent 2px 9px),
  linear-gradient(32deg,#141416 0%,#141416 62%,var(--rojo) 62%,#7E0E17 100%),
  var(--panel)}
.g-cat.sin-foto.t2{background:
  repeating-linear-gradient(90deg,rgba(255,255,255,.028) 0 2px,transparent 2px 9px),
  linear-gradient(205deg,#141416 0%,#141416 46%,#22222A 46%,#0C0C0E 100%),
  var(--panel)}
/* sobre la trama el rotulo si se lee, asi que sube de tinta y baja de peso */
.g-cat.sin-foto .rotulo{color:rgba(255,255,255,.16)}
/* y el velo negro de las fotos aqui taparia la trama: se aclara */
.g-cat.sin-foto .velo{background:linear-gradient(180deg,rgba(8,8,10,0) 0%,
  rgba(8,8,10,.35) 55%,rgba(8,8,10,.86) 100%)}

/* ══════════════════════════════════════════════════════════════════════════
   G · EL EXPEDIENTE · la ficha de cada pieza
   ──────────────────────────────────────────────────────────────────────────
   Carlos lo dijo sin rodeos: «el apartado de cada figura ni se parece en nada
   al de la tienda original y de hecho se ve peor». Tenia razon. Copiar la suya
   tampoco era la respuesta: lo que se pidio es que fuera MEJOR.

   El layout: pantalla partida en dos, y NO por la mitad. A la izquierda la
   ESCENA —la figura, con su numero VC de fondo a tamano de cartel—; a la
   derecha la LECTURA, una columna estrecha de ficha tecnica. La asimetria es
   el punto: una tienda pone foto y datos del mismo tamano; un expediente da
   casi todo el espacio a la pieza y aprieta los datos en una columna que se
   lee de un tiron. Debajo, el riel: la coleccion sigue.

   Las reglas del movimiento, que aqui no son negociables:

   · NUNCA se anima `opacity` sobre texto. Un texto a media transicion no
     cumple contraste. Todo lo que es texto se destapa con MASCARA —caja con
     overflow oculto y el texto subiendo dentro— a opacidad plena. La opacidad
     se usa en lo decorativo: el velo, el numero de fondo, el anillo, el
     barrido.
   · Solo `transform` y `opacity`: las resuelve el compositor sin recalcular
     el diseno.
   · Nada de `backdrop-filter`. Obliga a Chrome a recomponer en cada cuadro de
     scroll y ya nos costo una vez que el sitio fuera a tirones.
   · Todo el movimiento vive dentro de `@media (scripting: enabled)`: sin JS la
     ficha no se abre, y lo que no se ve no debe quedarse a medio destapar.
   ══════════════════════════════════════════════════════════════════════════ */
.g-ficha{position:fixed;inset:0;z-index:90;display:grid;place-items:center;
  padding:clamp(0px,2.2vw,30px)}
.g-ficha[hidden]{display:none}
/* el velo es decorativo: este SI puede animar opacidad */
.ex-velo{position:absolute;inset:0;background:rgba(4,4,6,.90)}
@media (scripting: enabled){
  .g-ficha .ex-velo{opacity:0;transition:opacity .3s ease}
  .g-ficha.abierta .ex-velo{opacity:1}
}
.g-caja{position:relative;z-index:1;width:min(100%,1180px);max-height:100%;
  overflow-y:auto;overflow-x:hidden;background:var(--panel);
  border:1px solid var(--linea);display:grid;
  grid-template-columns:minmax(0,1.32fr) minmax(0,1fr);
  grid-template-areas:'escena leer' 'riel riel'}
@media (scripting: enabled){
  .g-ficha .g-caja{opacity:0;transform:translate3d(0,26px,0) scale(.982);
    transition:opacity .3s ease,transform .46s cubic-bezier(.2,.9,.28,1)}
  .g-ficha.abierta .g-caja{opacity:1;transform:none}
}
@media (max-width:860px){
  .g-caja{grid-template-columns:minmax(0,1fr);
    grid-template-areas:'escena' 'leer' 'riel'}}

/* ── las esquinas se dibujan solas: encuadre de instrumento ─────────────── */
.ex-marco{position:absolute;inset:8px;z-index:4;pointer-events:none}
.ex-marco i{position:absolute;width:26px;height:26px;
  border:2px solid var(--amarillo);opacity:.85}
.ex-marco .e1{top:0;left:0;border-right:0;border-bottom:0;transform-origin:top left}
.ex-marco .e2{top:0;right:0;border-left:0;border-bottom:0;transform-origin:top right}
.ex-marco .e3{bottom:0;left:0;border-right:0;border-top:0;transform-origin:bottom left}
.ex-marco .e4{bottom:0;right:0;border-left:0;border-top:0;transform-origin:bottom right}
@media (scripting: enabled){
  .g-ficha .ex-marco i{transform:scale(.2)}
  .g-ficha.abierta .ex-marco i{transform:scale(1);
    transition:transform .5s cubic-bezier(.2,.9,.28,1) .12s}
}

/* ── LA ESCENA ─────────────────────────────────────────────────────────── */
.ex-escena{grid-area:escena;position:relative;overflow:hidden;background:#0B0B0D;
  display:grid;gap:10px;padding:clamp(14px,2vw,24px);align-content:start;
  container-type:inline-size}
/* ⚠ ESTO ESTABA DETRAS DE LA FOTO Y NO SE VEIA NADA. Las fotos de producto
   de Hasbro son cuadrados OPACOS con su propio fondo de color —verde, rojo,
   azul—, asi que tapaban entera la marca de agua. Un adorno que existe en el
   marcado y no se ve en la pantalla es peor que no tenerlo: cuesta lo mismo y
   no hace nada.
   Se muda a la columna de lectura, anclada abajo, que es justo donde sobraba
   sitio cuando la pieza no lleva boton de pago. */
.ex-slab{position:absolute;left:0;right:0;bottom:-.14em;z-index:0;text-align:center;
  font:400 clamp(120px,26cqw,260px)/.8 var(--display);letter-spacing:-.06em;
  color:rgba(255,255,255,.055);pointer-events:none;user-select:none;overflow:hidden;
  transform:translate3d(calc((var(--px) - .5) * -22px),calc((var(--py) - .5) * -10px),0)}
/* el anillo de aurebesh gira despacio: es la letra de la casa, no un adorno
   generico sacado de ningun lado */
.ex-anillo{position:absolute;left:50%;top:52%;width:min(90%,440px);aspect-ratio:1;
  translate:-50% -50%;z-index:0;pointer-events:none;opacity:.10;
  background:var(--aurebesh) center/contain no-repeat}
/* y lo que se lee va por encima de las dos marcas de agua */
.ex-leer>*:not(.ex-slab):not(.ex-anillo){position:relative;z-index:1}
@media (scripting: enabled){
  .g-ficha.abierta .ex-anillo{animation:ex-gira 64s linear infinite}
}
@keyframes ex-gira{to{rotate:360deg}}

.ex-escena .grande{position:relative;z-index:1;aspect-ratio:1/1;overflow:hidden;
  touch-action:pan-y;cursor:grab;background:transparent}
.ex-escena .grande:active{cursor:grabbing}
/* La tira: todas las fotos una junto a otra. Lo que se mueve es la tira, no se
   sustituye la imagen — por eso no hay parpadeo ni cambio notorio. */
.g-tira{display:flex;height:100%;will-change:transform}
.g-hoja{flex:0 0 auto;height:100%;display:grid;place-items:center}
.g-hoja img{width:100%;height:100%;object-fit:contain;pointer-events:none;
  -webkit-user-drag:none;user-select:none;
  filter:drop-shadow(0 18px 26px rgba(0,0,0,.6))}
/* la figura sigue al puntero, al reves que el numero de fondo: es lo que da
   la sensacion de que hay hondura entre los dos planos. Poca cantidad a
   proposito —12 px—: mas que eso se nota como un truco y marea. */
@media (hover:hover) and (scripting: enabled){
  .g-hoja img{transform:translate3d(calc((var(--px) - .5) * 12px),
                                    calc((var(--py) - .5) * 7px),0)}
}
/* la foto entra con un empujon al cambiar de pieza */
@media (scripting: enabled){
  .ex-escena .grande.entra{animation:ex-entra .44s cubic-bezier(.2,.9,.28,1)}
}
@keyframes ex-entra{from{transform:scale(.965)}to{transform:none}}
/* Abajo a la derecha caia justo encima del sello VINTAGE COLLECTION que traen
   impresas casi todas las fotos de Hasbro, y el contador no se leia. Arriba a
   la izquierda esa esquina siempre esta limpia. Fondo opaco, no translucido:
   sobre foto clara el .74 dejaba pasar el fondo. */
.g-cuenta{position:absolute;left:10px;top:10px;z-index:2;background:#0A0A0C;
  border:1px solid var(--linea);color:var(--hueso);padding:5px 9px;
  font:700 10px/1 var(--dato);letter-spacing:.12em;pointer-events:none}
/* el barrido: una raya de luz que cruza la foto al cambiar de pieza. Capa
   decorativa SOBRE LA IMAGEN, nunca sobre texto. */
.ex-barrido{position:absolute;inset:0;z-index:2;pointer-events:none;opacity:0;
  background:linear-gradient(100deg,transparent 38%,rgba(250,247,0,.30) 50%,transparent 62%)}
@media (scripting: enabled){.ex-barrido.pasa{animation:ex-barre .62s ease-out}}
@keyframes ex-barre{
  from{opacity:1;transform:translate3d(-100%,0,0)}
  to{opacity:0;transform:translate3d(100%,0,0)}}

.g-tiras{position:relative;z-index:1;display:flex;gap:7px;flex-wrap:wrap}
.g-tiras button{width:54px;height:54px;padding:0;background:#141416;cursor:pointer;
  border:1px solid var(--linea);
  transition:border-color .2s,transform .25s cubic-bezier(.2,.9,.28,1)}
.g-tiras button:hover{transform:translate3d(0,-3px,0)}
.g-tiras button[aria-current="true"]{border-color:var(--amarillo)}
.g-tiras img{width:100%;height:100%;object-fit:contain}

/* ── LA LECTURA ────────────────────────────────────────────────────────── */
.ex-leer{grid-area:leer;position:relative;overflow:hidden;
  padding:clamp(18px,2.4vw,30px);display:grid;gap:13px;
  align-content:start;background:var(--panel);container-type:inline-size}
.ex-ceja{display:flex;align-items:baseline;gap:10px;margin:0;
  font:700 10.5px/1 var(--dato);letter-spacing:.24em;text-transform:uppercase;
  color:var(--amarillo)}
.ex-ceja i{font-style:normal;color:var(--gris-tenue);letter-spacing:.2em}
.ex-ceja.chica{font-size:9.5px;margin:0 0 11px}
/* LA MASCARA. El titulo entra subiendo DENTRO de una caja con overflow oculto,
   a opacidad plena en todo momento: cumple contraste en cada cuadro de la
   transicion. Es exactamente la razon por la que no se anima opacidad sobre
   texto, y aqui esta la alternativa. */
.ex-mask{overflow:hidden}
.ex-leer h3{font-size:clamp(22px,3vw,38px);line-height:1.04}
.ex-regla{display:block;height:2px;background:var(--amarillo);transform-origin:left center}
@media (scripting: enabled){
  .g-ficha .ex-leer h3{transform:translate3d(0,110%,0)}
  .g-ficha .ex-regla{transform:scaleX(0)}
  .g-ficha .ex-fila>*{transform:translate3d(0,115%,0)}
  .g-ficha.abierta .ex-leer h3{transform:none;
    transition:transform .52s cubic-bezier(.2,.9,.28,1) .10s}
  .g-ficha.abierta .ex-regla{transform:scaleX(1);
    transition:transform .5s cubic-bezier(.2,.9,.28,1) .22s}
  /* escalonado: cada fila entra 60 ms despues de la anterior */
  .g-ficha.abierta .ex-fila>*{transform:none;
    transition:transform .46s cubic-bezier(.2,.9,.28,1)}
  .g-ficha.abierta .ex-fila:nth-child(1)>*{transition-delay:.26s}
  .g-ficha.abierta .ex-fila:nth-child(2)>*{transition-delay:.32s}
  .g-ficha.abierta .ex-fila:nth-child(3)>*{transition-delay:.38s}
  .g-ficha.abierta .ex-fila:nth-child(4)>*{transition-delay:.44s}
}
.ex-datos{margin:4px 0 0;display:grid;gap:0;font:400 12.5px/1.5 var(--dato)}
/* ⚠ `overflow:hidden` va en la FILA y lo que se mueve son sus hijos. Si se
   moviera la fila entera, la mascara se moveria con el texto y no taparia
   nada: se veria el texto deslizandose por encima de lo de al lado. */
.ex-fila{overflow:hidden;display:grid;
  grid-template-columns:minmax(84px,auto) minmax(0,1fr);gap:8px 16px;
  padding:9px 0;border-bottom:1px solid var(--linea)}
.ex-fila dt{color:var(--gris-tenue);text-transform:uppercase;letter-spacing:.12em;
  font-size:10px;padding-top:3px}
.ex-fila dd{margin:0;color:var(--hueso)}

/* ── EL RIEL del final: la coleccion sigue ─────────────────────────────── */
.ex-riel{grid-area:riel;padding:clamp(14px,2vw,20px);
  border-top:1px solid var(--linea);background:#101012}
.ex-vagones{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}
.ex-vagones button{flex:0 0 auto;width:78px;padding:0;background:#141416;
  border:1px solid var(--linea);cursor:pointer;display:grid;gap:0;
  transition:border-color .2s,transform .25s cubic-bezier(.2,.9,.28,1)}
.ex-vagones button:hover{border-color:var(--amarillo);transform:translate3d(0,-3px,0)}
.ex-vagones button img{width:100%;aspect-ratio:1;object-fit:contain}
.ex-vagones button b{font:700 8.5px/1 var(--dato);letter-spacing:.1em;
  color:var(--gris);padding:5px 4px 6px}

/* ── botones flotantes ─────────────────────────────────────────────────── */
.g-cerrar,.ex-paso{position:absolute;z-index:5;background:var(--panel2);
  border:1px solid var(--linea);color:var(--hueso);cursor:pointer;
  display:grid;place-items:center}
.g-cerrar{top:10px;right:10px;width:40px;height:40px;font:400 18px/1 var(--texto)}
/* ⚠ ESTABAN ANCLADAS A `.g-caja` Y LA DE «SIGUIENTE» CAIA ENCIMA DEL AVISO DE
   PAGO, en la otra columna. Van dentro de la escena, que es lo que gobiernan. */
.ex-paso{top:46%;translate:0 -50%;width:38px;height:56px;font:400 24px/1 var(--texto)}
.ex-paso.ant{left:clamp(14px,2vw,24px)} .ex-paso.sig{right:clamp(14px,2vw,24px)}
.g-cerrar:hover,.ex-paso:hover{border-color:var(--amarillo);color:var(--amarillo)}
.ex-paso[disabled]{opacity:.3;cursor:default}
/* en telefono estorban encima de la foto: el gesto y el riel ya llevan a la
   pieza de al lado */
@media (max-width:860px){.ex-paso{display:none}}


.ficha-p .precio{font:400 clamp(15px,1.7vw,19px)/1 var(--display);
  letter-spacing:-.03em;color:var(--amarillo);display:flex;align-items:baseline;gap:5px}
.ficha-p .precio i{font:700 8.5px/1 var(--dato);letter-spacing:.16em;
  color:var(--gris-tenue);font-style:normal}

/* ══ G · PAGO ══════════════════════════════════════════════════════════════
   El boton de PayPal sólo se dibuja si hay identificador del cliente. Sin él
   NO se finge un pago: se dice qué falta y se manda a la tienda, que sí cobra.
   Un botón de pago que no cobra es peor que no tener botón. */
.g-compra{display:grid;gap:10px;margin-top:6px}
.g-precio-g{font:400 clamp(24px,3.4vw,34px)/1 var(--display);letter-spacing:-.04em;
  color:var(--amarillo);display:flex;align-items:baseline;gap:7px}
.g-precio-g i{font:700 10px/1 var(--dato);letter-spacing:.18em;color:var(--gris-tenue);
  font-style:normal}
.g-stock{display:inline-flex;align-items:center;gap:7px;font:700 10px/1 var(--dato);
  letter-spacing:.16em;text-transform:uppercase;color:var(--verde)}
.g-stock::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--verde)}
.g-stock.no{color:var(--rojo)} .g-stock.no::before{background:var(--rojo)}
#g-paypal{min-height:0}
.g-aviso-pago{border:1px dashed var(--amarillo-hondo);padding:12px 13px;
  font:400 11.5px/1.55 var(--dato);color:var(--gris)}
.g-aviso-pago b{color:var(--amarillo);display:block;margin-bottom:5px;
  letter-spacing:.14em;text-transform:uppercase;font-size:10px}

/* ══ G · menu desplegable con la jerarquia real de su web ══ */
.g-menu{border-bottom:1px solid var(--linea);background:#0C0C0E;
  padding-block:clamp(20px,3vw,34px)}
.g-menu[hidden]{display:none}
.g-menu-red{display:grid;gap:clamp(20px,3vw,44px);
  grid-template-columns:minmax(0,2.2fr) minmax(0,1fr)}
@media (max-width:760px){.g-menu-red{grid-template-columns:minmax(0,1fr)}}
.g-marcas{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
.g-marca .raiz{display:block;font:400 clamp(15px,1.7vw,19px)/1 var(--display);
  letter-spacing:-.045em;text-transform:uppercase;text-decoration:none;
  color:var(--hueso);transition:color .2s}
.g-marca .raiz:hover{color:var(--amarillo)}
.g-marca .hijos{display:grid;gap:4px;margin-top:8px;padding-left:10px;
  border-left:1px solid var(--linea)}
.g-marca .hijos a{font:400 12px/1.45 var(--dato);color:var(--gris);text-decoration:none}
.g-marca .hijos a:hover{color:var(--amarillo)}
.g-pags{display:grid;gap:7px}
.g-pags a{font:400 12.5px/1.5 var(--dato);color:var(--gris);text-decoration:none}
.g-pags a:hover{color:var(--amarillo)}
.g-abrir{appearance:none;background:transparent;border:1px solid var(--linea);
  color:var(--hueso);cursor:pointer;padding:9px 13px;
  font:700 10.5px/1 var(--dato);letter-spacing:.16em;text-transform:uppercase;
  transition:border-color .2s,color .2s}
.g-abrir:hover,.g-abrir[aria-expanded="true"]{border-color:var(--amarillo);color:var(--amarillo)}

/* la ficha de producto ahora es un boton: se abre al detalle, no se va fuera */
.pieza{appearance:none;text-align:left;font:inherit;cursor:pointer;padding:0}
.foto .mas{position:absolute;right:9px;bottom:9px;background:rgba(8,8,10,.78);
  border:1px solid var(--linea);color:var(--amarillo);padding:5px 8px;
  font:700 9.5px/1 var(--dato);letter-spacing:.1em}
.foto{background:#101013}
.foto img{position:absolute;inset:5%;width:90%;height:90%;object-fit:contain}

/* ---- El cartón -------------------------------------------------------------- */
.carton-zona{display:grid;gap:clamp(26px,4vw,60px);align-items:center;
  grid-template-columns:minmax(0,1fr) minmax(240px,380px)}
@media (max-width:820px){.carton-zona{grid-template-columns:minmax(0,1fr)}}
.carton-zona>*{min-width:0}
.carton-zona>div:first-child{container-type:inline-size}
.escenario{perspective:1300px;display:flex;justify-content:center}
.carton{position:relative;width:min(100%,380px);aspect-ratio:5/7.5;
  transform-style:preserve-3d;will-change:transform;cursor:grab;
  transform:rotateY(calc((var(--cx) - .5) * 22deg)) rotateX(calc((var(--cy) - .5) * -15deg));
  transition:transform .5s cubic-bezier(.2,.7,.3,1)}
.carton.agarrado{transition:none;cursor:grabbing}
.tarjeta{position:absolute;inset:0;overflow:hidden;background-color:#111;
  background-image:linear-gradient(168deg,#26262B 0%,#141417 46%,#0A0A0C 100%);
  box-shadow:0 40px 60px -22px rgba(0,0,0,.9),0 0 0 1px rgba(250,247,0,.16) inset}
.pestana{position:absolute;top:0;left:50%;transform:translateX(-50%);width:36%;
  height:8.5%;background:var(--amarillo)}
.perfora{position:absolute;top:2.2%;left:50%;width:27px;height:27px;z-index:2;
  transform:translateX(-50%);background:var(--negro);
  border-radius:50% 50% 46% 46%/58% 58% 42% 42%}
.cabecera{position:absolute;top:10%;left:0;right:0;text-align:center;z-index:2}
.cabecera img{width:62%;margin-inline:auto}
.cabecera i{display:block;font:700 8px/1 var(--dato);letter-spacing:.36em;
  color:var(--gris);font-style:normal;margin-top:8px}
.burbuja{position:absolute;left:8%;right:8%;top:26%;bottom:14%;
  border-radius:14px/18px;overflow:hidden;transform:translateZ(28px);
  background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(0,0,0,.28));
  box-shadow:0 0 0 1px rgba(255,255,255,.24) inset}
.burbuja img{position:absolute;left:8%;top:4%;width:84%;height:90%;
  object-fit:contain;object-position:bottom;
  transform:translateZ(15px) translate3d(calc((var(--cx) - .5) * 16px),calc((var(--cy) - .5) * 9px),0)}
.lustre{position:absolute;inset:-34%;pointer-events:none;
  background:linear-gradient(112deg,transparent 30%,rgba(255,255,255,.30) 45%,
             rgba(255,255,255,.06) 53%,transparent 64%);
  transform:translate3d(calc((var(--cx) - .5) * -160px),calc((var(--cy) - .5) * -74px),0)}
.placa{position:absolute;left:8%;right:8%;bottom:4%;height:8%;
  background:var(--amarillo);display:grid;place-content:center;gap:2px;
  text-align:center;transform:translateZ(13px)}
.placa b{font:700 clamp(12px,1.7vw,15px)/1 var(--texto);text-transform:uppercase;
  color:#0A0A0B}
.placa i{font:700 8px/1 var(--dato);letter-spacing:.22em;color:#3D3B00;font-style:normal}

/* La cinta de aurebesh sale del PROPIO logotipo del cliente: su nombre escrito
   en el alfabeto de Star Wars. Firma la página sin repetir el logo entero y sin
   inventarse un motivo. */
.cinta{position:relative;overflow:hidden;background:#000;
  border-block:1px solid var(--linea);padding-block:15px}
.cinta .rodillo{width:200%;height:18px;opacity:.34;
  background-image:var(--aurebesh);background-repeat:repeat-x;
  background-size:auto 18px;background-position:0 50%}
@media (scripting: enabled){
  .cinta .rodillo{animation:correr 42s linear infinite}
  @keyframes correr{to{transform:translate3d(-50%,0,0)}}
}
@media (prefers-reduced-motion: reduce){.cinta .rodillo{animation:none}}

/* Tarjeta de salida al índice: en una tienda de verdad siempre hay un «ver
   todo» al final de la fila, y aquí además es lo que lleva al dato propio. */
.pieza.todo{background:var(--amarillo);border-color:var(--amarillo);
  justify-content:center;align-items:center;text-align:center;padding:26px 18px;
  min-height:180px}
.pieza.todo b{display:block;font:400 clamp(28px,3.6vw,42px)/1 var(--display);
  letter-spacing:-.045em;color:#0A0A0B}
.pieza.todo span{display:block;font:700 10px/1.5 var(--dato);letter-spacing:.2em;
  text-transform:uppercase;color:#3A3900;margin-top:9px}
.pieza.todo:hover{background:#0A0A0B}
.pieza.todo:hover b{color:var(--amarillo)}
.pieza.todo:hover span{color:var(--gris)}

/* ---- Cierre y pie ----------------------------------------------------------- */
.cierre{background:var(--amarillo);color:#0A0A0B}
.cierre .caso{display:grid;gap:22px;align-items:center;
  grid-template-columns:minmax(0,1fr) auto;padding-block:clamp(30px,4.4vw,52px)}
@media (max-width:740px){.cierre .caso{grid-template-columns:minmax(0,1fr)}}
.cierre>*{min-width:0}
.cierre h2{color:#0A0A0B}
.cierre p{color:#3A3900;margin:10px 0 0;font-weight:500}
.cierre .b{background:#0A0A0B;color:var(--amarillo);border-color:#0A0A0B}
.cierre .b:hover{background:transparent;color:#0A0A0B}
section{padding-block:clamp(40px,5.6vw,80px)}
.sep{height:1px;background:var(--linea)}
footer{background:transparent;border-top:1px solid var(--linea);
  padding-block:clamp(32px,4.4vw,52px)}
.fila-pie{display:flex;flex-wrap:wrap;gap:22px 34px;justify-content:space-between;
  align-items:flex-start;font:400 11.5px/1.65 var(--dato);color:var(--gris-tenue)}
.fila-pie a{color:var(--gris)}
.fila-pie img{height:26px;width:auto;margin-bottom:12px}
.nota{max-width:52ch;font-size:11px;line-height:1.7}
#medida{color:var(--amarillo);font-variant-numeric:tabular-nums}

/* ---- Movimiento ------------------------------------------------------------- */
@media (scripting: enabled){
  .revelar{transform:translate3d(0,34px,0);
    transition:transform 640ms cubic-bezier(.2,1.3,.32,1)}
  /* ══════════════════ S · Sylcred ══════════════════
     Carlos: «que las cosas aparezcan de modo mas aestetic y como si fuesen
     energicas las apariciones». Lo que habia era correcto y timido: 18 px con
     una curva que solo desacelera, y solo TRES elementos lo llevaban.
     La energia no sale de acelerarlo, sale de tres cosas:
       1 RECORRIDO — 18 px no se ven, 34 si. Lo que se percibe como fuerza es la
         distancia, no la duracion.
       2 SOBREPASO — la curva pasa de largo y regresa (el 1.3). Un movimiento
         que se acomoda se lee como que traia inercia; el que solo frena parece
         empujado.
       3 ESCALONADO — los hermanos entran uno tras otro, no en bloque.
     ⚠ NADA DE OPACITY SOBRE TEXTO: un texto a media opacidad es un texto con el
     contraste roto mientras dura. La opacidad se reserva para cajas con foto.
     ⚠ EL TOPE DEL ESCALONADO ES A PROPOSITO: sin el, 47 fichas pondrian la
     ultima tres segundos despues de entrar en pantalla. Se corta en 8. */
  .s-rev{transform:translate3d(0,34px,0);
    transition:transform 640ms cubic-bezier(.2,1.3,.32,1);
    transition-delay:calc(var(--s-i,0) * 70ms)}
  .s-rev.s-dentro{transform:none}
  .s-rev.s-caja{opacity:.001;transform:translate3d(0,34px,0) scale(.975);
    transition:transform 640ms cubic-bezier(.2,1.3,.32,1),opacity 400ms ease-out;
    transition-delay:calc(var(--s-i,0) * 70ms)}
  .s-rev.s-caja.s-dentro{opacity:1;transform:none}
  /* ══════════════════ /S ══════════════════ */
  .revelar.dentro{transform:none}
  .pieza-eje{transform:translateX(-1px) scaleY(0);transform-origin:bottom}
  .dibujado .pieza-eje{transform:translateX(-1px) scaleY(1);
    transition:transform 420ms cubic-bezier(.34,1.25,.44,1);
    transition-delay:calc(var(--d) * 22ms)}
}
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation:none!important;transition:none!important}
  .revelar,.figura,.carton,.burbuja img,.lustre{transform:none!important}
  .pieza-eje{transform:translateX(-1px)!important}
  /* EL EXPEDIENTE. Sin esto dependeria de que la clase `.abierta` llegue
     siempre para deshacer los estados de partida —titulo a 110%, regla a
     scaleX(0), esquinas a scale(.2)—. Con las transiciones apagadas, un
     estado de partida que nadie deshace no es una animacion suave: es texto
     que NO SE VE. El estado final se afirma aqui y no se hereda de nadie. */
  .g-caja,.ex-marco i,.ex-leer h3,.ex-regla,.ex-fila>*,.ex-slab,
  .g-hoja img,.ex-anillo{transform:none!important}
  .ex-regla{transform:scaleX(1)!important}
  .g-caja,.ex-velo{opacity:1!important}
  /* ══════ S ══════ */
  .s-rev,.s-rev.s-caja{transform:none!important;opacity:1!important}
  /* Los estados siguen EXISTIENDO: se quita el movimiento, no la respuesta.
     Un boton que no acusa el toque no es accesible, es mudo. */
  .pieza:active,.b:active,.pieza:hover .foto img,
  .pieza:hover .mas,.pieza:focus-visible .mas{transform:none!important}
  /* ══════ /S ══════ */
}
"""

# --- Datos --------------------------------------------------------------------
filas, ausentes, previo = [], 0, None
for p in cat:
    n = num(p['vc'])
    if previo is not None and n - previo > 1:
        falta = n - previo - 1
        ausentes += falta
        filas.append(('hueco', falta))
    filas.append(('pieza', p))
    previo = n
rango = f"{cat[0]['vc']} – {cat[-1]['vc']}"
TOPE  = num(cat[-1]['vc'])
def frac(vc): return (num(vc) - 1) / (TOPE - 1)
def ancla(vc): return 'vc-' + ''.join(c for c in vc if c.isalnum())

EJE = ('<div class="eje-h" id="eje">'
  + ''.join(f'<span class="decena" style="left:{(k-1)/(TOPE-1)*100:.3f}%"></span>'
            for k in range(1, TOPE + 1, 20))
  + '<span class="base"></span>'
  + ''.join(f'<span class="pieza-eje" style="left:{frac(p["vc"])*100:.3f}%;--d:{i}" '
            f'title="VC {esc(p["vc"])} · {esc(p["nombre"])}"></span>'
            for i, p in enumerate(cat))
  + ''.join(f'<span class="rot-eje" style="left:{(v-1)/(TOPE-1)*100:.3f}%">{v:03d}</span>'
            for v in (1, 100, 200, 300, TOPE))
  + '</div>')

def reng(p):
    s = f'<span class="s">{esc(p["serie"])}</span>' if p['serie'] else '<span class="s"></span>'
    return (f'<a class="reng" id="{ancla(p["vc"])}" href="{esc(p["url"])}" target="_blank" '
            f'rel="noopener"><span class="n">{esc(p["vc"])}</span>'
            f'<span class="t">{esc(p["nombre"])}</span>{s}</a>')

INDICE = '\n'.join(
    reng(v) if k == 'pieza' else
    (f'<div class="hueco"><span>·····</span><span class="raya" aria-hidden="true"></span>'
     f'<span>{v} ausentes</span></div>')
    for k, v in filas)

# Las cinco con foto de verdad, y siete con MARCADOR HONESTO. Nunca una imagen
# que pretenda ser el producto: si la foto no está, se dice que no está.
CON_FOTO = [
    ('p1', 'Multipack de tres', 'Tres figuras, un solo cartón', None),
    ('p2', 'Darth Maul',        'Sable doble, manto de malla',  None),
    ('p3', 'Trío de la Alta República', 'Dark trooper · Kenobi · Jawa', None),
    ('p4', 'Obi-Wan Kenobi',    'Jedi Legend',                  '357'),
    ('p5', 'Darth Revan',       'Knights of the Old Republic',  '301'),
]
def tarjeta_foto(k, nom, sub, vc):
    pil = (f'<span class="pildora">VC {vc}</span>' if vc
           else '<span class="pildora">En vitrina</span>')
    return (f'<a class="pieza" href="https://www.toydarians.com/" target="_blank" '
            f'rel="noopener" style="--luz:{img[k]["luz"]}">'
            f'<span class="foto">{pil}'
            f'<img src="{img[k]["uri"]}" alt="{esc(nom)}" loading="lazy" '
            f'decoding="async" width="560" height="500"></span>'
            f'<span class="ficha-p"><span class="nom">{esc(nom)}</span>'
            f'<span class="met">{esc(sub)}</span>'
            f'<span class="ir">Ver en la tienda ↗</span></span></a>')

def tarjeta_hueca(p):
    return (f'<a class="pieza sin-foto" href="{esc(p["url"])}" target="_blank" rel="noopener">'
            f'<span class="foto vacia"><span class="pildora">VC {esc(p["vc"])}</span>'
            f'<span class="marcador"><b>{esc(p["vc"])}</b><i>Foto pendiente</i></span></span>'
            f'<span class="ficha-p"><span class="nom">{esc(p["nombre"])}</span>'
            f'<span class="met">{esc(p["serie"] or "The Vintage Collection")}</span>'
            f'<span class="ir">Ver en la tienda ↗</span></span></a>')

sin_foto = [p for p in cat if p['vc'] in ('381','355')]
REJILLA = '\n'.join([tarjeta_foto(*c) for c in CON_FOTO] +
                    [tarjeta_hueca(p) for p in sin_foto] +
                    [f'<a class="pieza todo" href="#indice">'
                     f'<b>{len(cat)}</b><span>Ver el índice completo</span></a>'])

def cinta():
    return '<div class="cinta" aria-hidden="true"><div class="rodillo"></div></div>'


# ══ G · El menu REAL del cliente, sacado de su propia web ══════════════════
# Nada de esto se invento: sale de los <li class="menu-item"> de toydarians.com.
# La jerarquia es la suya, no una que me pareciera mas bonita.
MENU = [
    ('HASBRO', 'hasbro', [
        ('Vintage Collection', 'vintage-collection'),
        ('Black Series', 'black-series'),
        ('Retro Collection', 'retro-collection')]),
    ('GI JOE', 'gi-joe', [('Classified Series', 'classified-series')]),
    ('MATTEL', 'mattel', []),
    ('DISNEY', 'disney', [('Droids Factory', 'droids-factory')]),
    ('NECA', 'neca', [('Figuras', 'figuras-neca'), ('Packs', 'packs-neca')]),
    ('FUNKO', 'funko', [('Figuras', 'figuras-funko')]),
    ('SUPER 7', 'super-7', [('Reaction', 'reaction'), ('Ultimates', 'ultimates')]),
    ('3D PRINT', '3d-print', []),
    ('MERCH', 'merch', []),
]
PAGINAS = [('¿Quiénes somos?', '?page_id=832'), ('Envíos', '?page_id=840'),
           ('Tipos de embalaje', '?page_id=979'), ('Garantía', '?page_id=1554'),
           ('Aviso de privacidad', '?page_id=842')]

# Las subcategorias de Vintage Collection, que es la linea que si conocemos
VC_SUB = [('Exclusivas', 'exclusivas-vintage-collection'),
          ('Figuras', 'figuras-vintage-collection'),
          ('Packs', 'packs-vintage-collection'),
          ('Play Sets', 'play-sets-vintage-collecton'),
          ('Vehículos', 'vehiculos-vintage-collection')]

try:
    CATFOTOS = json.loads((ACT / 'categorias.json').read_text(encoding='utf-8'))
except Exception:
    CATFOTOS = {}
try:
    FOTOS = json.loads((ACT / 'fotos.json').read_text(encoding='utf-8'))
except Exception:
    FOTOS = {}
try:
    PRECIOS = json.loads((ACT / 'precios.json').read_text(encoding='utf-8'))
except Exception:
    PRECIOS = {}

# ══ PAGO ══════════════════════════════════════════════════════════════════
# El identificador de PayPal es del CLIENTE y no me lo puedo inventar: sin el
# de verdad, un boton de pago o no cobra o cobra a la cuenta equivocada. Se
# deja declarado y VACIO a proposito. Con el vacio, el sitio no finge: enseña
# que falta configurarlo y manda a la tienda, que si cobra.
#
# Para encenderlo: pegar aqui el «Client ID» de la cuenta de negocio del
# cliente (PayPal → Developer → Apps & Credentials → Live). Es un dato
# publico —viaja en el <script> del navegador—, pero es SUYO.
PAYPAL_ID = ''
MONEDA = 'MXN'

# ══ LOS BANNERS DE CATEGORIA, COMPROBADOS AQUI Y NO EN LA COMPUERTA ═══════
# Que se rompio: el raspador, cuando no sabia que imagen dar a una categoria,
# servia el LOGO de la tienda. Salieron 32 archivos con nombres distintos
# —hasbro-0.webp, gi-joe-0.webp…— y los MISMOS BYTES, asi que las 16 tarjetas
# ensenaron el mismo logo ampliado y nadie lo vio hasta mirar la pantalla.
#
# Por que se comprueba aqui y no en revisar.mjs: la compuerta mide el DOM, y en
# el DOM son 16 rutas DISTINTAS. La igualdad esta en los bytes, y los bytes
# solo se tienen aqui. Una comprobacion en el sitio equivocado no es media
# comprobacion: es cero, con la confianza de una.
def _comprobar_banners(cats, fotos_dir):
    import hashlib, collections
    de_quien = collections.defaultdict(list)
    for slug, info in cats.items():
        for f in (info.get('fotos') or [])[:3]:
            ruta = fotos_dir / f
            if not ruta.exists():
                raise SystemExit(f'banner que no existe: {f} (categoria {slug})')
            de_quien[hashlib.md5(ruta.read_bytes()).hexdigest()].append(f'{slug}:{f}')
    repetidos = {d: v for d, v in de_quien.items() if len(v) > 2}
    if repetidos:
        detalle = ' · '.join(', '.join(v) for v in repetidos.values())
        raise SystemExit('la misma imagen de banner en mas de dos categorias: ' + detalle)
    return len(de_quien)

def g_menu():
    """El menu de su web, con la jerarquia real."""
    marcas = ''
    for nom, slug, subs in MENU:
        hijos = ''.join(
            f'<a href="{TIENDA}?product_cat={h}" target="_blank" rel="noopener">{esc(t)}</a>'
            for t, h in subs)
        marcas += (f'<div class="g-marca"><a class="raiz" href="{TIENDA}?product_cat={slug}" '
                   f'target="_blank" rel="noopener">{esc(nom)}</a>'
                   f'{f"<div class=hijos>{hijos}</div>" if hijos else ""}</div>')
    pgs = ''.join(f'<a href="{TIENDA}{u}" target="_blank" rel="noopener">{esc(t)}</a>'
                  for t, u in PAGINAS)
    return (f'<div class="g-menu" id="g-menu" hidden>'
            f'<div class="caso"><div class="g-menu-red">'
            f'<div><p class="ceja">Marcas</p><div class="g-marcas">{marcas}</div></div>'
            f'<div><p class="ceja">La tienda</p><div class="g-pags">{pgs}</div></div>'
            f'</div></div></div>')

def g_categorias():
    """La rejilla que sustituye a la lista de 47 filas."""
    _comprobar_banners(CATFOTOS, RAIZ / "fotos")
    fichas = []
    for nom, slug, subs in MENU:
        info = CATFOTOS.get(slug, {})
        fotos = info.get('fotos') or []
        n = info.get('productos')
        # los banners que se cruzan solos; si no hay fotos, manda el rotulo
        caps = ''.join(f'<span data-b="fotos/{f}"></span>' for f in fotos[:3])
        sub = ' · '.join(t for t, _ in subs) if subs else 'Ver la categoría'
        ancha = ' ancha' if slug == 'hasbro' else ''
        # Sin foto REAL no se inventa una: se dibuja con la trama de la casa.
        # Antes se colaba aqui el logo de la tienda que el raspador servia
        # cuando no sabia que dar, y 16 tarjetas ensenaban el mismo logo
        # ampliado. Un hueco honesto se ve mejor que una imagen equivocada.
        if not fotos: ancha += f' sin-foto t{len(fichas) % 3}'
        fichas.append(
            f'<a class="g-cat{ancha}" href="{TIENDA}?product_cat={slug}" target="_blank" '
            f'rel="noopener" data-cat="{slug}">'
            f'<span class="rotulo" aria-hidden="true">{esc(nom)}</span>'
            f'<span class="banners">{caps}</span>'
            f'<span class="velo"></span>'
            + (f'<span class="cuenta">{n} piezas</span>' if n else '')
            + f'<span class="marca-cat"><b>{esc(nom)}</b><i>{esc(sub)}</i></span></a>')
    return '<div class="g-cats">' + ''.join(fichas) + '</div>'

def g_rejilla():
    """Las 47 fichas con su foto REAL, no cinco renders de fabrica."""
    t = []
    for pz in cat:
        f = FOTOS.get(pz['vc'], {})
        fotos = f.get('fotos') or []
        if not fotos: continue
        pr = g_precio(pz['vc'])
        slug = 'vc' + ''.join(c for c in pz['vc'] if c.isalnum())
        t.append(
            f'<button class="pieza" data-vc="{esc(pz["vc"])}" type="button" '
            f'aria-haspopup="dialog">'
            f'<span class="foto"><span class="pildora">VC {esc(pz["vc"])}</span>'
            f'<img src="fotos/{fotos[0]}" alt="{esc(pz["nombre"])}" loading="lazy" '
            f'decoding="async" width="680" height="680">'
            + (f'<span class="mas">+{len(fotos)-1}</span>' if len(fotos) > 1 else '')
            + f'</span><span class="ficha-p"><span class="nom">{esc(pz["nombre"])}</span>'
            f'<span class="met">{esc(pz["serie"] or "The Vintage Collection")}</span>'
            + (f'<span class="precio">$ {pr["precio"]:,.0f}'
               f'<i>{MONEDA}</i></span>' if pr else '')
            + f'<span class="ir">Ver a detalle</span></span></button>')
    return '<div class="rejilla" id="g-rejilla">' + '\n'.join(t) + '</div>'

def g_precio(vc):
    d = PRECIOS.get(vc)
    if not d: return None
    return d

def g_datos_js():
    """Lo que el guion necesita para armar la ficha al vuelo, sin repetir el
    HTML de 47 fichas en el documento."""
    d = {}
    for pz in cat:
        f = FOTOS.get(pz['vc'], {})
        if not f.get('fotos'): continue
        pr = g_precio(pz['vc']) or {}
        d[pz['vc']] = {'n': pz['nombre'], 's': pz['serie'] or 'The Vintage Collection',
                       'u': pz['url'], 'f': f['fotos'],
                       'p': pr.get('precio'), 'st': pr.get('stock', 'disponible')}
    return json.dumps(d, ensure_ascii=False, separators=(',', ':'))

def g_orden_js():
    """El orden del catalogo. La ficha lo necesita para la pieza anterior y la
    siguiente y para el riel del final; sin el habria que recorrer un objeto,
    cuyo orden de claves no es contrato."""
    return json.dumps([pz['vc'] for pz in cat
                       if (FOTOS.get(pz['vc']) or {}).get('fotos')],
                      ensure_ascii=False, separators=(',', ':'))

def g_ficha():
    """EL EXPEDIENTE · la ficha de cada pieza.

    Carlos lo dijo sin rodeos: «el apartado de cada figura ni se parece en nada
    al de la tienda original y de hecho se ve peor». Tenia razon, y copiar la
    suya tampoco era la respuesta —lo que pidieron es que fuera MEJOR—.

    Asi que no es un cuadrito de tienda: es un expediente. La pieza no se
    presenta como un articulo en una lista, se presenta como una ficha tecnica
    —numero, linea, escala, estado— que es exactamente como habla de sus
    figuras quien colecciona. El numero VC gigante detras no es adorno: es EL
    dato, el que da nombre a la pieza y el que la seccion entera defiende.

    Va vacio a proposito: lo llena el guion. Repetir aqui el marcado de las 47
    fichas serian ~180 KB de HTML que casi nadie llega a abrir.
    """
    filas = (
        '<div class="ex-fila"><dt>Línea</dt><dd id="g-serie"></dd></div>'
        '<div class="ex-fila"><dt>Escala</dt><dd>3.75&Prime; · 9.5 cm</dd></div>'
        '<div class="ex-fila"><dt>Estado</dt><dd>En su cartón original, sin abrir</dd></div>'
        '<div class="ex-fila"><dt>Nº de pieza</dt><dd id="g-npieza"></dd></div>')
    return ('<div class="g-ficha" id="g-ficha" hidden role="dialog" aria-modal="true" '
            'aria-labelledby="g-nom">'
            '<div class="ex-velo" aria-hidden="true"></div>'
            '<div class="g-caja" id="g-caja">'

            '<div class="ex-marco" aria-hidden="true">'
            '<i class="e1"></i><i class="e2"></i><i class="e3"></i><i class="e4"></i></div>'

            '<button class="g-cerrar" id="g-cerrar" type="button" aria-label="Cerrar">✕</button>'

            '<div class="ex-escena">'
            '<button class="ex-paso ant" id="g-ant" type="button" aria-label="Pieza anterior">‹</button>'
            '<button class="ex-paso sig" id="g-sig" type="button" aria-label="Pieza siguiente">›</button>'
            '<div class="grande"><div class="g-tira" id="g-tira"></div>'
            '<span class="g-cuenta" id="g-cuenta"></span>'
            '<span class="ex-barrido" id="g-barrido" aria-hidden="true"></span></div>'
            '<div class="g-tiras" id="g-tiras"></div>'
            '</div>'

            '<div class="ex-leer">'
            '<span class="ex-slab" id="g-slab" aria-hidden="true"></span>'
            '<span class="ex-anillo" aria-hidden="true"></span>'
            '<p class="ex-ceja"><span id="g-vc"></span><i>Expediente</i></p>'
            '<div class="ex-mask"><h3 id="g-nom"></h3></div>'
            '<span class="ex-regla" aria-hidden="true"></span>'
            f'<dl class="ex-datos">{filas}</dl>'
            '<div class="g-compra">'
            '<span class="g-precio-g" id="g-precio"></span>'
            '<span class="g-stock" id="g-stock"></span>'
            '<div id="g-paypal"></div>'
            '<a class="b" id="g-ir" href="#" target="_blank" rel="noopener">'
            '<span>Ver en la tienda ↗</span></a></div>'
            '</div>'

            '<div class="ex-riel"><p class="ex-ceja chica">Más de la colección</p>'
            '<div class="ex-vagones" id="g-riel"></div></div>'
            '</div></div>')

def g_intro():
    ls = ''.join(
        f'<span class="let" style="left:{l["x"]*100:.3f}%;width:{l["ancho"]*100:.3f}%">'
        f'<img src="{l["uri"]}" alt="" width="{l["w"]}" height="{l["h"]}">'
        f'<span class="hoja" aria-hidden="true"></span></span>'
        for l in img['letras'])
    a = img['aurebesh']
    return (f'<div class="g-intro" id="g-intro" aria-hidden="true">'
            f'<canvas class="cielo" id="g-cielo"></canvas>'
            f'<div class="marca"><div class="fila">{ls}</div>'
            f'<img class="au" id="g-au" src="{a["uri"]}" width="{a["w"]}" height="{a["h"]}" alt=""></div>'
            f'<button class="saltar" id="g-saltar" type="button">Saltar</button></div>')

VC_TOTAL     = (CATFOTOS.get('vintage-collection') or {}).get('productos') or len(cat)
HASBRO_TOTAL = (CATFOTOS.get('hasbro') or {}).get('productos') or VC_TOTAL

TIENDA = 'https://www.toydarians.com/'
LOGO = img['logo']

CSS = CSS.replace('AUREBESH_URI', img['aurebesh']['uri'])


# ── LA TIPOGRAFIA DE LA IDENTIDAD VA EMPOTRADA, NO PEDIDA ────────────────────
# Bungee entraba por `<link>` a fonts.googleapis.com. Se midio en un navegador
# de verdad y NO CARGABA: el titular salia en la sans del sistema, porque el
# repuesto `'Arial Black'` tampoco existe en todos lados y la pila caia hasta
# `system-ui`.
#
# Se ve de un golpe en la seccion del carton: el logo del blister esta en la
# letra correcta —es imagen— y el titular de al lado se veia de plantilla. La
# identidad del cliente vive en esa letra; pedirsela a un tercero es apostarla
# contra su red.
#
# ⚠ SOLO BUNGEE, y es a proposito. Familjen Grotesk y JetBrains Mono siguen por
# link: empotrarlas sumaria ~200 KB a un archivo que ya pesa 340, y en telefono
# eso se paga. La dependencia BAJA pero no desaparece, y decirlo asi es mas util
# que presumir un «cero dependencias» que no seria cierto.
#
# Licencia OFL, que permite empotrar: activos/fuentes/LICENCIA-BUNGEE.md
def _fuente(nombre, rango):
    datos = base64.b64encode((ACT / 'fuentes' / nombre).read_bytes()).decode()
    return ("@font-face{font-family:'Bungee';font-style:normal;font-weight:400;"
            "font-display:swap;"
            f"src:url(data:font/woff2;base64,{datos}) format('woff2');"
            f"unicode-range:{rango}}}")

BUNGEE_EMPOTRADA = (
    _fuente('bungee-ext.woff2',
            'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,'
            'U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,'
            'U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF')
    + _fuente('bungee-latin.woff2',
              'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,'
              'U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,'
              'U+2212,U+2215,U+FEFF,U+FFFD')
)

DOC = f"""<title>Toydarians · The Vintage Collection</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap">
<style>{BUNGEE_EMPOTRADA}</style>
<style>{CSS}</style>

<canvas class="g-fondo" id="g-fondo" aria-hidden="true"></canvas>

{g_intro()}

<div class="barra"><div class="caso">
  <a class="logo" href="{TIENDA}" target="_blank" rel="noopener">
    <img src="{LOGO['uri']}" width="{LOGO['w']}" height="{LOGO['h']}"
         alt="Toydarians" fetchpriority="high"></a>
  <nav>
    <a href="#vitrina" class="opc">La vitrina</a>
    <a href="#categorias">Categorías</a>
    <a href="#carton" class="opc">El cartón</a>
    <a href="{TIENDA}" target="_blank" rel="noopener">Tienda ↗</a>
  </nav>
  <button class="g-abrir" id="g-abrir" type="button" aria-expanded="false"
          aria-controls="g-menu">Menú</button>
</div></div>
{g_menu()}

<header class="cartel">
  <div class="cuna" aria-hidden="true"></div>
  <div class="trama" aria-hidden="true"></div>
  <div class="caso cartel-red">
    <p class="ceja">The Vintage Collection · Escala 3.75&Prime;</p>
    <h1>Cada pieza<br>tiene <em>número</em></h1>
    <div class="dicho">
      <p>El número <strong>VC</strong> es la pieza. Toydarians tiene
        <strong>{VC_TOTAL}</strong> de The Vintage Collection y
        <strong>{HASBRO_TOTAL}</strong> de Hasbro en total.</p>
      <div class="acciones">
        <a class="b" href="#vitrina"><span>Ver la vitrina</span></a>
        <a class="b hueco" href="#categorias"><span>Categorías</span></a>
      </div>
    </div>
    <div class="peana">
      <div class="figura">
        <img src="{img['heroe']['uri']}" width="900" height="897" fetchpriority="high"
             decoding="async" alt="Tres figuras de The Vintage Collection">
      </div>
    </div>
  </div>
</header>

<div class="banda-cat"><div class="caso">
  <h2>Descubre la Vintage Collection</h2>
  <span class="apunte">{VC_TOTAL} piezas · {len(cat)} en esta vitrina</span>
</div></div>

<section id="vitrina"><div class="caso">
  <p class="ceja">La vitrina</p>
  <h2 class="revelar" style="max-width:18ch">{len(cat)} piezas,<br>una por una</h2>
  <p style="margin:18px 0 clamp(24px,3vw,36px)">Cada una con sus fotos de la tienda.
    Toca cualquiera para <strong>verla a detalle</strong>.</p>
  {g_rejilla()}
</div></section>

{cinta()}

<section id="categorias"><div class="caso">
  <p class="ceja">Categorías</p>
  <h2 class="revelar" style="max-width:16ch">Todo lo que<br>hay en la tienda</h2>
  <p style="margin:18px 0 clamp(24px,3vw,36px)">Las marcas y líneas del catálogo,
    con el número de piezas que tiene cada una <strong>ahora mismo</strong>.</p>
  {g_categorias()}
</div></section>

{cinta()}

<section id="carton"><div class="caso carton-zona">
  <div class="revelar">
    <p class="ceja">El cartón</p>
    <h2>Se compra<br>cerrado</h2>
    <p style="margin-top:18px">Quien colecciona no compra la figura: compra el cartón
      <strong>sin abrir</strong>. La curva del blíster, el troquel del colgadero, el
      brillo que se corre al girarlo.</p>
    <p>Aquí el brillo se mueve <strong>al revés</strong> que la tarjeta — es lo que
      convence de que hay plástico y no un dibujo de plástico. Arrástrala.</p>
  </div>
  <div class="escenario">
    <div class="carton" id="carton-3d">
      <div class="tarjeta">
        <div class="pestana" aria-hidden="true"></div>
        <div class="perfora" aria-hidden="true"></div>
        <div class="cabecera">
          <img src="{LOGO['uri']}" width="{LOGO['w']}" height="{LOGO['h']}" alt="Toydarians">
          <i>The Vintage Collection</i>
        </div>
        <div class="burbuja">
          <img src="{img['p4']['uri']}" width="560" height="500" loading="lazy"
               decoding="async" alt="Obi-Wan Kenobi, VC 357">
          <div class="lustre" aria-hidden="true"></div>
        </div>
        <div class="placa"><b>Obi-Wan Kenobi</b><i>VC 357 · Jedi Legend</i></div>
      </div>
    </div>
  </div>
</div></section>

<div class="cierre"><div class="caso">
  <div>
    <h2>Precios y existencias,<br>en la tienda</h2>
    <p>Este escaparate no cobra ni guarda datos. El carrito, el pago y el envío
      siguen donde siempre.</p>
  </div>
  <a class="b" href="{TIENDA}" target="_blank" rel="noopener"><span>Abrir toydarians.com ↗</span></a>
</div></div>

{g_ficha()}

<footer><div class="caso fila-pie">
  <div>
    <img src="{LOGO['uri']}" width="{LOGO['w']}" height="{LOGO['h']}" alt="Toydarians">
    <div><a href="{TIENDA}" target="_blank" rel="noopener">toydarians.com ↗</a></div>
    <div style="margin-top:12px">Fluidez: <span id="medida">midiendo…</span></div>
  </div>
  <p class="nota" style="margin:0">
    Propuesta de escaparate. El logotipo, las fotos de producto, las categorías y sus
    conteos salen de toydarians.com. <strong>No se publican precios</strong> porque
    cambian: viven en la tienda. Star Wars, The Vintage Collection y las marcas
    nombradas son de sus titulares; este sitio no está afiliado a ellos.
  </p>
</div></footer>
"""

# --- Motor -------------------------------------------------------------------
# Un solo requestAnimationFrame para todo, como en lienzo.js: puntero, banda,
# polvo y medicion. Varios rAF compitiendo es la forma mas rapida de que una
# pagina vaya a tirones. Nada de librerias y nada de backdrop-filter.
JS = r"""
(function(){
  var quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raiz = document.documentElement;
  var TOY = window.TOY = window.TOY || {}; TOY.g = TOY.g || {};
  requestAnimationFrame(function(){ raiz.classList.add('cargado'); });

  // El reflejo se clona en vez de repetir el data URI en el HTML.
  var heroe = document.querySelector('.figura img'),
      espejo = document.querySelector('.reflejo');
  if (heroe && espejo) {
    var c = heroe.cloneNode(); c.className = ''; c.alt = ''; c.setAttribute('aria-hidden','true');
    espejo.appendChild(c);
  }

  // ---- Revelado: solo transform, nunca opacity sobre texto ----------------
  if ('IntersectionObserver' in window) {
    var ojo = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('dentro'); ojo.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    document.querySelectorAll('.revelar').forEach(function(n){ ojo.observe(n); });
  } else {
    document.querySelectorAll('.revelar').forEach(function(n){ n.classList.add('dentro'); });
  }

  /* ══════════════════ S · Sylcred ══════════════════
     El scroll energico que pidio Carlos. Se engancha desde AQUI y no desde el
     HTML a proposito: asi no toco una sola etiqueta del generador. Sin
     JavaScript no pasa nada de esto y la pagina se ve entera — el CSS vive
     dentro de `@media (scripting: enabled)`.

     ⚠ LOS NOMBRES ESTAN SACADOS DEL HTML, NO SUPUESTOS. Una version anterior
     buscaba `.celda, .ficha, .tarjeta, .sobre`: cuatro nombres razonables y
     ninguno existe aqui. Un selector que no encuentra nada NO FALLA — devuelve
     lista vacia y sigue. Se revelaba el indice y la vitrina entera se quedaba
     quieta, con la compuerta en verde y sin un error en consola.

     ⚠ Y EL REVELADO SE APARTA AL TERMINAR. Si las fichas se quedan con
     `s-rev s-dentro` para siempre, `.s-rev.s-dentro{transform:none}` empata en
     especificidad con `.pieza:hover{transform:...}` y gana por ir despues: la
     animacion de entrada MATA el hover de la ficha. Paso, y no se ve de ninguna
     forma que no sea leer el `transform` computado con el raton encima. */
  if ('IntersectionObserver' in window) {
    var TOY = window.TOY = window.TOY || {};
    TOY.s = TOY.s || {};
    var vistos = new Set();
    ['.pieza', '.reng'].forEach(function(sel){
      var porPadre = new Map();
      document.querySelectorAll(sel).forEach(function(n){
        if (vistos.has(n) || n.closest('.cartel')) return;   // la portada no
        vistos.add(n);
        var pa = n.parentElement, i = porPadre.get(pa) || 0;
        porPadre.set(pa, i + 1);
        n.style.setProperty('--s-i', Math.min(i, 8));        // tope: ver el CSS
        n.classList.add('s-rev');
        if (n.querySelector('img, picture, canvas')) n.classList.add('s-caja');
      });
    });

    var soltar = function(n){
      n.classList.remove('s-rev', 's-caja', 's-dentro');
      n.style.removeProperty('--s-i');
    };
    var ojoS = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if (!e.isIntersecting) return;
        var n = e.target;
        n.classList.add('s-dentro');
        ojoS.unobserve(n);
        var listo = false;
        var fin = function(ev){
          if (listo || (ev && ev.target !== n)) return;
          listo = true;
          n.removeEventListener('transitionend', fin);
          soltar(n);
        };
        n.addEventListener('transitionend', fin);
        /* El plazo existe porque `transitionend` NO dispara si el elemento ya
           entro en su posicion final. Sin el, justo esos quedarian clavados. */
        setTimeout(fin, 1400);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    document.querySelectorAll('.s-rev').forEach(function(n){ ojoS.observe(n); });
    TOY.s.revelados = vistos.size;
  }
  /* ══════════════════ /S ══════════════════ */

  /* ⚠ AQUI HABIA UN `if (quieto) return;` Y SE LLEVABA MEDIA PAGINA POR DELANTE.
     Todo el guion del sitio vive dentro de UNA SOLA funcion auto-invocada —un
     rAF compartido, como manda el motor—, asi que ese `return` no apagaba el
     movimiento: apagaba TODO LO QUE VENIA DESPUES. Y despues venian el puntero,
     la rotacion de banners, la intro, el fondo vivo y el EXPEDIENTE ENTERO.
     O sea: a quien tiene «Reducir movimiento» encendido —en iPhone son dos
     toques en Accesibilidad— pulsar una figura NO HACIA ABSOLUTAMENTE NADA.
     Ni se abria, ni avisaba, ni fallaba: nada.

     Comprobado en la version que YA ESTABA PUBLICADA, o sea que no es de hoy:
     `TOY.g.abrir` salia `undefined` y la ficha no se abria.

     `quieto` significa «sin movimiento», NUNCA «sin JavaScript». Lo que de
     verdad se mueve se frena donde se mueve —abajo, marcado uno por uno—, y
     lo demas sigue funcionando, que es justo lo que pide la regla: sin
     movimiento la pagina queda COMPLETA, nunca a medias. */

  // ---- Puntero ------------------------------------------------------------
  var vitrina = document.querySelector('.vitrina'),
      ficha   = document.getElementById('g-ficha'),
      carton  = document.getElementById('carton'),
      banda   = document.getElementById('banda'),
      medida  = document.getElementById('medida');
  var mx = .5, my = .5, sx = .5, sy = .5;      // objetivo y suavizado
  var cx = .5, cy = .5, kx = .5, ky = .5;
  var agarre = null, tocada = false;

  if (!quieto) addEventListener('pointermove', function(e){
    mx = e.clientX / innerWidth; my = e.clientY / innerHeight;
    if (agarre === null && carton) {
      var r = carton.getBoundingClientRect();
      var dentro = e.clientX > r.left - 220 && e.clientX < r.right + 220 &&
                   e.clientY > r.top - 160 && e.clientY < r.bottom + 160;
      if (dentro) { cx = (e.clientX - r.left) / r.width; cy = (e.clientY - r.top) / r.height; }
      else { cx = .5; cy = .5; }
    }
  }, { passive: true });

  if (carton && !quieto) {
    carton.addEventListener('pointerdown', function(e){
      agarre = { x: e.clientX, y: e.clientY, cx: cx, cy: cy };
      carton.classList.add('agarrado'); carton.setPointerCapture(e.pointerId);
    });
    carton.addEventListener('pointermove', function(e){
      if (!agarre) return;
      cx = Math.max(-.35, Math.min(1.35, agarre.cx + (e.clientX - agarre.x) / 240));
      cy = Math.max(-.35, Math.min(1.35, agarre.cy + (e.clientY - agarre.y) / 300));
    });
    ['pointerup','pointercancel'].forEach(function(t){
      carton.addEventListener(t, function(){ agarre = null; carton.classList.remove('agarrado'); });
    });
  }

  // La banda se sigue pudiendo arrastrar y teclear; el scroll solo la empuja
  // mientras nadie la haya tocado. Secuestrarla del todo se siente roto.
  if (banda) {
    ['pointerdown','wheel','keydown','touchstart'].forEach(function(t){
      banda.addEventListener(t, function(){ tocada = true; }, { passive: true });
    });
  }
"""

JS += r"""
  // (El motor de polvo en WebGL se quito: colgaba de un canvas #polvo que ya
  //  no existe en el marcado. Lo cazo Sylcred y lo comprobe. El campo de
  //  estrellas de la intro cubre esa funcion y ese si esta enchufado.)

  // ---- Un solo bucle -------------------------------------------------------
  var t0 = performance.now(), ultimo = t0, cuadros = 0, ventana = t0,
      peor = 0, listo = false, pintado = 0;

  var tareas = TOY.g.tareas = [];      // cualquiera cuelga aqui; un solo bucle

  function paso(ahora){
    requestAnimationFrame(paso);
    for (var q = 0; q < tareas.length; q++) tareas[q](ahora);
    var dt = Math.min(ahora - ultimo, 64); ultimo = ahora;
    var k = 1 - Math.pow(0.0016, dt / 1000);      // suavizado independiente del cuadro

    sx += (mx - sx) * k; sy += (my - sy) * k;
    kx += (cx - kx) * k; ky += (cy - ky) * k;
    if (vitrina) { vitrina.style.setProperty('--px', sx.toFixed(4));
                   vitrina.style.setProperty('--py', sy.toFixed(4)); }
    /* ⚠ EL EXPEDIENTE VIVE FUERA DE `.vitrina`, asi que heredaba el `--px:.5`
       de `:root` — o sea, el centro fijo— y su numero de fondo y su figura
       NO SE MOVIAN NUNCA. El efecto estaba escrito y no existia. Se le pasan
       aqui las mismas dos variables, y solo mientras esta abierto. */
    if (ficha && !ficha.hidden) { ficha.style.setProperty('--px', sx.toFixed(4));
                                  ficha.style.setProperty('--py', sy.toFixed(4)); }
    if (carton)  { carton.style.setProperty('--cx', kx.toFixed(4));
                   carton.style.setProperty('--cy', ky.toFixed(4)); }

    if (banda && !tocada && !quieto) {
      var r = banda.getBoundingClientRect();
      var p = (innerHeight - r.top) / (innerHeight + r.height);
      p = Math.max(0, Math.min(1, (p - .18) / .58));
      var meta = p * (banda.scrollWidth - banda.clientWidth);
      if (Math.abs(meta - banda.scrollLeft) > .5) banda.scrollLeft = meta;
    }

    // El fondo tiene presupuesto propio: ~30 fps. No compite con el scroll.
    cuadros++;
    if (ahora - ventana >= 600) {
      var fps = Math.round(cuadros * 1000 / (ahora - ventana));
      cuadros = 0; ventana = ahora;
      if (!listo && ahora - t0 > 1600) listo = true;      // se ignora el arranque
      if (listo) {
        if (!peor || fps < peor) peor = fps;
        if (medida) medida.textContent = fps + ' fps · mínimo ' + peor;
      }
    }
  }
  requestAnimationFrame(paso);
})();
"""



JS += r"""
  // ---- El eje del catalogo se dibuja --------------------------------------
  // 47 rayas escalonadas 22 ms. Va aqui y no en CSS puro porque tiene que
  // empezar cuando el eje entra en pantalla, no al cargar.
  var eje = document.getElementById('eje');
  if (eje && 'IntersectionObserver' in window) {
    new IntersectionObserver(function(es, o){
      if (es[0].isIntersecting) { eje.classList.add('dibujado'); o.disconnect(); }
    }, { threshold:.3 }).observe(eje);
  } else if (eje) { eje.classList.add('dibujado'); }
})();
"""



JS += r"""
  // ══════════════════════════════════════════════════════════════════════
  // G · TODO LO NUEVO cuelga de TOY.g, como quedo acordado con Sylcred para
  // que los dos podamos escribir aqui sin pisarnos.
  // ══════════════════════════════════════════════════════════════════════
  // ---- 1 · LA INTRO · 5 s -----------------------------------------------
  // El logo se construye letra por letra: una hoja de luz baja por cada una y
  // la va revelando con mascara. Son las letras REALES del logotipo, no una
  // tipografia parecida.
  var intro = document.getElementById('g-intro');
  function cerrarIntro(){
    if (!intro || intro.hidden) return;
    intro.style.transition = 'opacity .5s ease';
    intro.style.opacity = '0';
    setTimeout(function(){ intro.hidden = true; document.body.style.overflow = ''; }, 520);
  }
  if (intro && !quieto) {
    document.body.style.overflow = 'hidden';
    var lets = [].slice.call(intro.querySelectorAll('.let'));
    var au = document.getElementById('g-au');
    var T0 = 380, PASO = 300, DUR = 520;        // 380 + 10*300 + 520 ≈ 3.9 s
    function trazar(){
    lets.forEach(function(L, i){
      var hoja = L.querySelector('.hoja');
      var t = T0 + i * PASO;
      setTimeout(function(){
        hoja.style.opacity = '1';
        hoja.style.transition = 'height ' + DUR + 'ms cubic-bezier(.5,0,.3,1)';
        L.style.transition = '-webkit-mask-size ' + DUR + 'ms cubic-bezier(.5,0,.3,1),'
                           + 'mask-size ' + DUR + 'ms cubic-bezier(.5,0,.3,1)';
        hoja.style.height = '100%';
        L.style.webkitMaskSize = '100% 100%'; L.style.maskSize = '100% 100%';
        setTimeout(function(){
          hoja.style.transition = 'opacity .32s ease';
          hoja.style.opacity = '0';
        }, DUR - 40);
      }, t);
    });
    setTimeout(function(){ if (au){ au.style.transition = 'opacity .9s ease'; au.style.opacity = '.9'; } },
               T0 + lets.length * PASO + 200);
    setTimeout(cerrarIntro, 5000);
    }
    // No se traza hasta que las diez letras esten DECODIFICADAS. Si no, en un
    // telefono lento la animacion corre mientras las imagenes siguen llegando
    // y el logo sale a medias -- que es justo lo que reporto Carlos.
    var imgs = lets.map(function(L){ return L.querySelector('img'); });
    var espera = Promise.all(imgs.map(function(im){
      return (im.decode ? im.decode() : Promise.resolve()).catch(function(){});
    }));
    // pero no se espera para siempre: a los 2.5 s se arranca igual
    Promise.race([espera, new Promise(function(r){ setTimeout(r, 2500); })]).then(trazar);
    var bs = document.getElementById('g-saltar');
    if (bs) bs.addEventListener('click', cerrarIntro);
    addEventListener('keydown', function(e){ if (e.key === 'Escape') cerrarIntro(); });

    // el campo de estrellas del fondo, con el mismo bucle de siempre
    var ci = document.getElementById('g-cielo'), cx = ci && ci.getContext('2d');
    if (cx) {
      var estrellas = [], R = Math.min(devicePixelRatio || 1, 1.5);
      function medirCielo(){
        ci.width = Math.round(ci.clientWidth * R);
        ci.height = Math.round(ci.clientHeight * R);
        if (!ci.width || !ci.height) return;
        estrellas = [];
        for (var i = 0; i < 170; i++)
          estrellas.push({ x: Math.random(), y: Math.random(),
                           z: Math.random() * .8 + .2, f: Math.random() * 6.28 });
      }
      tareas.push(function(t){
        if (intro.hidden) return;
        if (ci.width !== Math.round(ci.clientWidth * R) ||
            ci.height !== Math.round(ci.clientHeight * R)) medirCielo();
        if (!estrellas.length) return;
        cx.clearRect(0, 0, ci.width, ci.height);
        for (var i = 0; i < estrellas.length; i++) {
          var e = estrellas[i];
          var a = (.35 + .65 * Math.abs(Math.sin(t / 900 + e.f))) * e.z;
          cx.fillStyle = 'rgba(250,247,220,' + a.toFixed(3) + ')';
          cx.fillRect(e.x * ci.width, e.y * ci.height, e.z * 2 * R, e.z * 2 * R);
        }
      });
    }
  } else if (intro) { intro.hidden = true; }

  // ---- 2 · LOS BANNERS que se cambian solos ------------------------------
  // Cada tarjeta lleva SU PROPIO reloj y un intervalo distinto: si todas
  // cambiaran a la vez seria un carrusel, y lo que se pidio es que se cambien
  // «paulatina y esporadicamente». Las de fuera de pantalla no gastan nada.
  document.querySelectorAll('.g-cat .banners').forEach(function(caja, k){
    var caps = [].slice.call(caja.children);
    if (!caps.length) return;
    caps.forEach(function(c){ c.style.backgroundImage = 'url("' + c.dataset.b + '")'; });
    caps[0].classList.add('viva');
    if (caps.length < 2 || quieto) return;
    var i = 0, aLaVista = true;
    if ('IntersectionObserver' in window)
      new IntersectionObserver(function(es){ aLaVista = es[0].isIntersecting; },
        { rootMargin:'80px' }).observe(caja);
    (function siguiente(){
      // 5 a 11 s, distinto por tarjeta y distinto cada vuelta
      var espera = 5000 + Math.random() * 6000 + k * 400;
      setTimeout(function(){
        if (aLaVista) {
          caps[i].classList.remove('viva');
          i = (i + 1) % caps.length;
          caps[i].classList.add('viva');
        }
        siguiente();
      }, espera);
    })();
  });

  // ---- 3 · EL MENU de su web ---------------------------------------------
  var bAbrir = document.getElementById('g-abrir'), menu = document.getElementById('g-menu');
  if (bAbrir && menu) bAbrir.addEventListener('click', function(){
    var abierto = bAbrir.getAttribute('aria-expanded') === 'true';
    bAbrir.setAttribute('aria-expanded', String(!abierto));
    menu.hidden = abierto;
  });
"""

JS += """
  // ---- 4 · LA FICHA AL DETALLE, con puertas de nave ---------------------
  // Las 47 fichas no viven en el documento: se arman al vuelo desde este dato.
  // Meter 47 galerias en el HTML lo habria hecho enorme para algo que casi
  // nadie abre entero.
  TOY.g.piezas = """ + g_datos_js() + """;
  TOY.g.orden = """ + g_orden_js() + """;
  TOY.g.paypal = """ + json.dumps(PAYPAL_ID) + """;
  TOY.g.moneda = """ + json.dumps(MONEDA) + """;
"""

JS += r"""
  // ══════════════════════════════════════════════════════════════════════
  // G · EL FONDO VIVO · nebulosa + estrellas con paralaje + hiperespacio
  // ══════════════════════════════════════════════════════════════════════
  // Se pide un fondo "mas entretenido, animado con colores, sin desentonar".
  // Lo que NO desentona aqui es la paleta que ya es del cliente: el amarillo
  // medido de su logo y el rojo de la casa, sobre negro. Nada de morados ni
  // de degradados de moda.
  //
  // Las tres cosas que lo hacen barato, que es lo que permite que este
  // encendido TODO el rato sin que el scroll se sienta:
  //
  // 1 · La nebulosa se pinta en un lienzo de 192x108 y se estira al tamano de
  //     la ventana. Una nube difusa no necesita pixeles: a tamano real serian
  //     ~2 millones de pixeles por cuadro, aqui son 20 mil. Es la misma idea
  //     de siempre —no pagar resolucion donde no se ve—.
  // 2 · La nebulosa se repinta a 12 cuadros por segundo y las estrellas a 30.
  //     A una nube que tarda 40 segundos en cruzar nadie le nota los 12.
  // 3 · Fuera de la pestana no dibuja nada.
  //
  // Y el limite duro: la nebulosa va a alfa bajisima. El contraste del texto
  // se mide contra --negro, asi que un fondo que aclarara de verdad volveria
  // mentira ese numero. Hay una comprobacion en revisar.mjs que mide el pixel
  // mas claro que esto llega a pintar.
  var lienzoF = document.getElementById('g-fondo'),
      fx = lienzoF && lienzoF.getContext && lienzoF.getContext('2d');
  if (fx) {
    var RF = Math.min(devicePixelRatio || 1, 1.5);

    // --- la nebulosa, en chiquito ---------------------------------------
    var neb = document.createElement('canvas');
    neb.width = 192; neb.height = 108;
    var nx = neb.getContext('2d');
    // rojo de la casa, amarillo del logo y un azul frio que da hondura.
    // El azul NO es una marca nueva: es el suelo, igual que en el membrete.
    // Las alfas NO son al gusto: son el techo que deja el contraste. El texto
    // mas flojo de la pagina es --gris (#9A9AA2, luminancia .313) y para
    // cumplir 4.5:1 el fondo no puede pasar de .0307 de luminancia. Estas
    // dejan el bloque mas claro en ~.022, o sea ~5:1 en el peor sitio, y se
    // ven. La primera version se quedo en .0075 —cumplia de sobra y NO SE
    // VEIA: un fondo invisible no es un fondo, es negro con costo de CPU—.
    var manchas = [
      { c:'209,35,42',   x:.18, y:.24, r:.62, a:.225, vx: .0000110, vy: .0000062, f:0 },
      { c:'250,247,0',   x:.82, y:.18, r:.48, a:.130, vx:-.0000086, vy: .0000091, f:2 },
      { c:'142,19,25',   x:.62, y:.74, r:.70, a:.200, vx: .0000067, vy:-.0000078, f:4 },
      { c:'27,47,107',   x:.30, y:.86, r:.66, a:.260, vx:-.0000094, vy:-.0000054, f:1 },
      { c:'250,247,0',   x:.06, y:.62, r:.34, a:.095, vx: .0000122, vy: .0000041, f:3 }
    ];
    function pintarNebulosa(t){
      nx.clearRect(0, 0, 192, 108);
      for (var i = 0; i < manchas.length; i++) {
        var m = manchas[i];
        // van y vienen: seno lento, no un desplazamiento que se salga
        var px = (m.x + Math.sin(t * m.vx + m.f) * .17) * 192;
        var py = (m.y + Math.cos(t * m.vy + m.f) * .15) * 108;
        var pr = m.r * 108 * (1 + Math.sin(t * .000047 + m.f) * .12);
        var g = nx.createRadialGradient(px, py, 0, px, py, pr);
        g.addColorStop(0,   'rgba(' + m.c + ',' + m.a + ')');
        g.addColorStop(.55, 'rgba(' + m.c + ',' + (m.a * .38).toFixed(4) + ')');
        g.addColorStop(1,   'rgba(' + m.c + ',0)');
        nx.fillStyle = g;
        nx.fillRect(0, 0, 192, 108);
      }
    }

    // --- tres capas de estrellas, con paralaje al scrollear --------------
    // La de atras casi no se mueve y la de adelante se mueve el doble que la
    // pagina: es lo que da la sensacion de hondura sin dibujar nada en 3D.
    // Las estrellas son lo que de verdad se VE que se mueve, y ademas son
    // gratis para el contraste: un punto de 3 px promediado en un bloque de
    // 32x32 no levanta el fondo. Por eso el presupuesto se gasta aqui y no
    // en subirle mas tinta a la nebulosa, que si lo levantaria.
    var capas = [
      { n:190, prof:.05, tam:1.4, br:.42, halo:0 },
      { n:110, prof:.16, tam:2.1, br:.70, halo:0 },
      { n: 48, prof:.33, tam:3.0, br:1,   halo:1 }
    ];
    var cielo = [];
    function sembrar(){
      cielo = [];
      for (var c = 0; c < capas.length; c++)
        for (var i = 0; i < capas[c].n; i++)
          cielo.push({ x:Math.random(), y:Math.random(), c:c,
                       f:Math.random() * 6.283, w:.6 + Math.random() * .9 });
    }
    sembrar();

    // --- el salto al hiperespacio, de vez en cuando ----------------------
    // Una raya que cruza cada 9-22 s. Es el guino de Star Wars que pidieron,
    // y es UNA raya: si fueran muchas seria un protector de pantalla.
    var raya = null, proxima = 4200;
    function lanzarRaya(t){
      var borde = Math.random() < .5;
      raya = { t0:t, dur:520 + Math.random() * 380,
               x0: borde ? -.08 : Math.random(), y0: borde ? Math.random() * .8 : -.08,
               dx: borde ? 1.16 : (Math.random() - .5) * .5,
               dy: borde ? (Math.random() - .5) * .45 : 1.16,
               g: Math.random() < .34 };      // una de cada tres es amarilla
      proxima = t + 6000 + Math.random() * 9000;
    }

    var anchoF = 0, altoF = 0, ultNeb = 0, ultFondo = 0;
    function medirFondo(){
      var w = Math.round(lienzoF.clientWidth * RF), h = Math.round(lienzoF.clientHeight * RF);
      if (!w || !h) return false;
      if (w !== lienzoF.width || h !== lienzoF.height) {
        lienzoF.width = w; lienzoF.height = h; anchoF = w; altoF = h;
      }
      return true;
    }

    function dibujarFondo(t){
      if (!medirFondo()) return;
      fx.clearRect(0, 0, anchoF, altoF);
      fx.imageSmoothingEnabled = true;
      fx.drawImage(neb, 0, 0, anchoF, altoF);

      var sc = (window.pageYOffset || 0) * RF;
      for (var i = 0; i < cielo.length; i++) {
        var e = cielo[i], cp = capas[e.c];
        var y = (e.y * altoF - sc * cp.prof) % altoF;
        if (y < 0) y += altoF;
        // el titileo es de las estrellas, no del texto: aqui si se puede
        var a = cp.br * (.55 + .45 * Math.sin(t / 1100 * e.w + e.f));
        var px = e.x * anchoF, tam = cp.tam * RF;
        if (cp.halo) {                       // las de delante llevan resplandor
          fx.fillStyle = 'rgba(250,247,210,' + (a * .16).toFixed(3) + ')';
          fx.fillRect(px - tam, y - tam, tam * 3, tam * 3);
        }
        fx.fillStyle = 'rgba(244,242,226,' + a.toFixed(3) + ')';
        fx.fillRect(px, y, tam, tam);
      }

      if (raya) {
        var u = (t - raya.t0) / raya.dur;
        if (u >= 1) raya = null;
        else {
          var lx = (raya.x0 + raya.dx * u) * anchoF,
              ly = (raya.y0 + raya.dy * u) * altoF,
              cola = .13;
          var tx = (raya.x0 + raya.dx * Math.max(0, u - cola)) * anchoF,
              ty = (raya.y0 + raya.dy * Math.max(0, u - cola)) * altoF;
          var g = fx.createLinearGradient(tx, ty, lx, ly);
          var col = raya.g ? '250,247,0' : '236,240,255';
          var vida = Math.sin(u * Math.PI);           // entra y sale, no aparece
          g.addColorStop(0, 'rgba(' + col + ',0)');
          g.addColorStop(1, 'rgba(' + col + ',' + (.62 * vida).toFixed(3) + ')');
          fx.strokeStyle = g;
          fx.lineWidth = 1.6 * RF;
          fx.beginPath(); fx.moveTo(tx, ty); fx.lineTo(lx, ly); fx.stroke();
        }
      }
    }

    if (quieto) {
      // Sin movimiento: UN cuadro, y ya. No queda a medias ni en negro.
      pintarNebulosa(0);
      requestAnimationFrame(function(){ dibujarFondo(0); });
      addEventListener('resize', function(){ dibujarFondo(0); });
    } else {
      pintarNebulosa(0);
      tareas.push(function(t){
        if (document.hidden) return;
        if (t - ultNeb > 83) { pintarNebulosa(t); ultNeb = t; }   // ~12 fps
        if (t - ultFondo < 33) return;                            // ~30 fps
        ultFondo = t;
        if (t > proxima) lanzarRaya(t);
        dibujarFondo(t);
      });
    }
  }
})();
"""


JS += r"""
  var cuadro = document.getElementById('g-ficha');
  if (cuadro) {
    var gTira   = document.getElementById('g-tira'),
        gTiras  = document.getElementById('g-tiras'),
        gCuenta = document.getElementById('g-cuenta'),
        gVc = document.getElementById('g-vc'), gNom = document.getElementById('g-nom'),
        gSerie = document.getElementById('g-serie'), gIr = document.getElementById('g-ir'),
        gNPieza = document.getElementById('g-npieza'),
        gSlab = document.getElementById('g-slab'),
        gBarrido = document.getElementById('g-barrido'),
        gRiel = document.getElementById('g-riel'),
        gAnt = document.getElementById('g-ant'), gSig = document.getElementById('g-sig'),
        devolver = null;

    function armarGaleria(fotos, alt){
      gTira.innerHTML = ''; gTiras.innerHTML = '';
      fotos.forEach(function(f, i){
        // la tira: todas las fotos una junto a otra, no una que se sustituye
        var hueco = document.createElement('div');
        hueco.className = 'g-hoja';
        var im = document.createElement('img');
        im.src = 'fotos/' + f; im.alt = i === 0 ? alt : '';
        // las dos primeras llegan ya; el resto en cuanto haya hueco
        im.loading = i < 2 ? 'eager' : 'lazy';
        im.decoding = 'async';
        hueco.appendChild(im); gTira.appendChild(hueco);

        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Foto ' + (i + 1));
        var mini = document.createElement('img');
        mini.src = 'fotos/' + f; mini.alt = ''; mini.loading = 'lazy';
        b.appendChild(mini);
        b.addEventListener('click', function(){ colocar(i, true); });
        gTiras.appendChild(b);
      });
      gTira.style.width = (fotos.length * 100) + '%';
      [].forEach.call(gTira.children, function(h){
        h.style.width = (100 / fotos.length) + '%';
      });
    }

    // ---- EL EXPEDIENTE se llena ------------------------------------------
    // `abrir` hace dos cosas distintas y conviene no confundirlas: PINTAR los
    // datos de la pieza (que tambien pasa al cambiar de pieza sin cerrar) y
    // ABRIR el cuadro (que solo pasa la primera vez). Por eso estan separadas.
    var vcAct = null;

    function pintar(vc, animar){
      var d = TOY.g.piezas[vc]; if (!d) return false;
      vcAct = vc;
      gVc.textContent = 'VC ' + vc;
      gNom.textContent = d.n; gSerie.textContent = d.s; gIr.href = d.u;
      if (gNPieza) gNPieza.textContent = vc;
      // el numero a tamano de cartel. Se pone ENTERO: el sufijo de las
      // reediciones —01A, 312A— es parte del nombre de la pieza, y recortarlo
      // a los digitos hacia que dos piezas distintas se rotularan igual.
      if (gSlab) gSlab.textContent = vc;

      var eP = document.getElementById('g-precio'),
          eS = document.getElementById('g-stock'),
          eB = document.getElementById('g-paypal');
      if (d.p) { contarPrecio(eP, d.p, animar); eP.hidden = false; }
      else { eP.hidden = true; }
      eS.textContent = d.st === 'agotado' ? 'Agotado' : 'Disponible';
      eS.className = 'g-stock' + (d.st === 'agotado' ? ' no' : '');
      pintarPago(vc, d, eB);

      fotosAct = d.f;
      armarGaleria(d.f, d.n);
      colocar(0, false);
      armarRiel(vc);
      pasos(vc);
      if (animar && !quieto) {                      // raya de luz y empujon
        var caja = gTira.parentNode;
        if (gBarrido) {
          gBarrido.classList.remove('pasa');
          void gBarrido.offsetWidth;                // reinicia la animacion
          gBarrido.classList.add('pasa');
        }
        if (caja) { caja.classList.remove('entra'); void caja.offsetWidth;
                    caja.classList.add('entra'); }
      }
      try { history.replaceState(null, '', '#' + 'vc-' + vc.toLowerCase()); } catch (_) {}
      return true;
    }

    // El precio SUBE hasta su valor. Es un numero, no un texto que haya que
    // leer mientras se mueve, asi que aqui el movimiento no estorba — y dura
    // medio segundo, no tres.
    function contarPrecio(nodo, fin, animar){
      var moneda = '<i>' + TOY.g.moneda + '</i>';
      if (!animar || quieto) {
        nodo.innerHTML = '$ ' + fin.toLocaleString('es-MX') + moneda; return;
      }
      var t0 = 0;
      function marco(t){
        if (!t0) t0 = t;
        var u = Math.min(1, (t - t0) / 520);
        var v = Math.round(fin * (1 - Math.pow(1 - u, 3)));
        nodo.innerHTML = '$ ' + v.toLocaleString('es-MX') + moneda;
        if (u < 1) requestAnimationFrame(marco);
      }
      requestAnimationFrame(marco);
    }

    // El riel: la coleccion sigue. Diez piezas alrededor de esta, no diez al
    // azar — el catalogo esta ordenado por numero VC y esa vecindad significa
    // algo para quien colecciona.
    function armarRiel(vc){
      if (!gRiel) return;
      var orden = TOY.g.orden || [], k = orden.indexOf(vc);
      if (k < 0) return;
      var desde = Math.max(0, Math.min(k - 5, orden.length - 11));
      gRiel.innerHTML = '';
      for (var i = desde; i < Math.min(desde + 11, orden.length); i++) {
        if (orden[i] === vc) continue;
        (function(otro){
          var d = TOY.g.piezas[otro]; if (!d) return;
          var b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('aria-label', d.n + ', VC ' + otro);
          var im = document.createElement('img');
          im.src = 'fotos/' + d.f[0]; im.alt = ''; im.loading = 'lazy';
          var et = document.createElement('b'); et.textContent = 'VC ' + otro;
          b.appendChild(im); b.appendChild(et);
          b.addEventListener('click', function(){ pintar(otro, true); });
          gRiel.appendChild(b);
        })(orden[i]);
      }
      gRiel.scrollLeft = 0;
    }

    function pasos(vc){
      var orden = TOY.g.orden || [], k = orden.indexOf(vc);
      if (gAnt) gAnt.disabled = k <= 0;
      if (gSig) gSig.disabled = k < 0 || k >= orden.length - 1;
    }
    function saltar(paso){
      var orden = TOY.g.orden || [], k = orden.indexOf(vcAct);
      if (k < 0) return;
      var j = k + paso;
      if (j < 0 || j >= orden.length) return;
      pintar(orden[j], true);
    }

    function abrir(vc, origen){
      if (!pintar(vc, false)) return;
      devolver = origen || null;
      cuadro.hidden = false;
      document.body.style.overflow = 'hidden';
      // arranca cerrado y se destapa al cuadro siguiente: si se pusiera la
      // clase en el mismo cuadro, el navegador no tendria estado "antes" del
      // que transicionar y todo apareceria de golpe
      cuadro.classList.remove('abierta');
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){ cuadro.classList.add('abierta'); });
      });
      document.getElementById('g-cerrar').focus();
    }
    function cerrar(){
      cuadro.classList.remove('abierta');
      try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
      setTimeout(function(){
        cuadro.hidden = true;
        document.body.style.overflow = '';
        if (devolver && devolver.focus) devolver.focus();
      }, quieto ? 0 : 380);
    }
    document.getElementById('g-cerrar').addEventListener('click', cerrar);
    cuadro.addEventListener('click', function(e){
      if (e.target === cuadro || (e.target.className || '') === 'ex-velo') cerrar();
    });
    if (gAnt) gAnt.addEventListener('click', function(){ saltar(-1); });
    if (gSig) gSig.addEventListener('click', function(){ saltar(1); });
    addEventListener('keydown', function(e){
      if (cuadro.hidden) return;
      if (e.key === 'Escape') cerrar();
      // las flechas mueven la FOTO, que es lo que uno espera con la figura
      // delante; la pieza de al lado se cambia con los botones o el riel
      else if (e.key === 'ArrowRight') colocar(iAct + 1, true);
      else if (e.key === 'ArrowLeft')  colocar(iAct - 1, true);
    });
    // Enlace directo: toydarians/#vc-357 abre esa pieza. Es lo que convierte
    // la ficha en algo que se puede MANDAR por WhatsApp, que es como el cliente
    // ensena una figura.
    function porElAncla(){
      var m = (location.hash || '').match(/^#vc-([a-z0-9]+)$/i);
      if (!m) return;
      var busca = m[1].toUpperCase();
      var orden = TOY.g.orden || [];
      for (var i = 0; i < orden.length; i++)
        if (orden[i].replace(/[^A-Za-z0-9]/g, '').toUpperCase() === busca) {
          abrir(orden[i], null); return;
        }
    }
    addEventListener('hashchange', function(){
      if (!(location.hash || '').indexOf('#vc-')) porElAncla();
      else if (!cuadro.hidden) cerrar();
    });
    porElAncla();
    // Deslizar sobre la foto grande, con dedo o con raton. Antes solo se podia
    // cambiar pulsando una miniatura.
    // ---- LA TIRA HORIZONTAL ---------------------------------------------
    // Carlos: «que al deslizar a los lados se cambie como si fuesen una tira
    // horizontal, sin que se note un cambio de imagen tan notorio, y que
    // parezca que estan unidas a los lados».
    // Asi que ya no se cambia el src: las fotos estan puestas UNA JUNTO A OTRA
    // y lo que se mueve es la tira. No hay parpadeo porque no hay cambio.
    //
    // Y el otro fallo suyo: «el scroll hacia arriba y abajo tambien cambia la
    // imagen». Pasaba porque el eje del gesto se decidia AL SOLTAR, asi que un
    // dedo en diagonal contaba como deslizar. Ahora se decide en los primeros
    // pixeles y, si el gesto es vertical, se suelta la captura y la pagina
    // scrollea normal.
    var fotosAct = [], iAct = 0;
    var gx0 = null, gy0 = null, eje = null, idPuntero = null, anchoTira = 0;

    function colocar(k, animado){
      if (!fotosAct.length) return;
      iAct = Math.max(0, Math.min(fotosAct.length - 1, k));
      gTira.style.transition = animado
        ? 'transform .34s cubic-bezier(.22,.9,.28,1)' : 'none';
      gTira.style.transform = 'translate3d(' + (-iAct * 100) + '%,0,0)';
      marcarTiras(iAct);
    }
    function marcarTiras(k){
      [].forEach.call(gTiras.children, function(b, i){
        b.setAttribute('aria-current', String(i === k));
      });
      if (gCuenta) gCuenta.textContent = (k + 1) + ' / ' + fotosAct.length;
    }

    gTira.addEventListener('pointerdown', function(e){
      if (fotosAct.length < 2) return;
      gx0 = e.clientX; gy0 = e.clientY; eje = null; idPuntero = e.pointerId;
      anchoTira = gTira.parentElement.getBoundingClientRect().width || 1;
      gTira.style.transition = 'none';
    });
    gTira.addEventListener('pointermove', function(e){
      if (gx0 === null) return;
      var dx = e.clientX - gx0, dy = e.clientY - gy0;
      if (eje === null) {
        // hacen falta unos pocos pixeles para saber que quiere el dedo
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        eje = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (eje === 'x') { try { gTira.setPointerCapture(idPuntero); } catch (_) {} }
        else { gx0 = gy0 = null; return; }   // vertical: la pagina manda
      }
      // resistencia en los extremos, para que se sienta el tope
      var pos = -iAct * anchoTira + dx;
      var min = -(fotosAct.length - 1) * anchoTira;
      if (pos > 0) pos *= .32;
      else if (pos < min) pos = min + (pos - min) * .32;
      gTira.style.transform = 'translate3d(' + pos.toFixed(1) + 'px,0,0)';
    });
    ['pointerup','pointercancel'].forEach(function(t){
      gTira.addEventListener(t, function(e){
        if (gx0 === null || eje !== 'x') { gx0 = gy0 = null; eje = null; return; }
        var dx = e.clientX - gx0;
        gx0 = gy0 = null; eje = null;
        // un quinto del ancho basta para pasar de foto
        var salto = Math.abs(dx) > anchoTira * .2 ? (dx < 0 ? 1 : -1) : 0;
        colocar(iAct + salto, true);
      });
    });
    addEventListener('keydown', function(e){
      if (cuadro.hidden) return;
      if (e.key === 'ArrowRight') colocar(iAct + 1, true);
      if (e.key === 'ArrowLeft')  colocar(iAct - 1, true);
    });
    addEventListener('resize', function(){ if (!cuadro.hidden) colocar(iAct, false); },
                     { passive: true });

    // ---- PAGO -----------------------------------------------------------
    // Con identificador: botones de PayPal de verdad. Sin el: se dice que
    // falta y se manda a la tienda. Nunca un boton que aparenta cobrar.
    // (Esta definicion se perdio en la fusion del #114/#115 y la llamada se
    //  quedo: la ficha reventaba con «pintarPago is not defined» y no abria.)
    var sdkPedido = false;
    function cargarSDK(cb){
      if (window.paypal) return cb();
      if (sdkPedido) return;
      sdkPedido = true;
      var sc = document.createElement('script');
      sc.src = 'https://www.paypal.com/sdk/js?client-id=' +
               encodeURIComponent(TOY.g.paypal) + '&currency=' + TOY.g.moneda;
      sc.onload = cb;
      sc.onerror = function(){ sdkPedido = false; };
      document.head.appendChild(sc);
    }
    function pintarPago(vc, d, caja){
      if (!caja) return;
      caja.innerHTML = '';
      if (!d.p || d.st === 'agotado') return;
      if (!TOY.g.paypal) {
        var av = document.createElement('div');
        av.className = 'g-aviso-pago';
        av.innerHTML = '<b>Pago no configurado</b>El botón de PayPal está cableado y ' +
          'listo: sólo falta el identificador de la cuenta de Toydarians. ' +
          'Mientras tanto, la compra se cierra en la tienda.';
        caja.appendChild(av);
        return;
      }
      cargarSDK(function(){
        if (!window.paypal || caja.dataset.vc === vc) return;
        caja.dataset.vc = vc;
        window.paypal.Buttons({
          style: { color:'gold', shape:'rect', label:'pay', height:44 },
          createOrder: function(_, actions){
            return actions.order.create({ purchase_units: [{
              description: 'VC ' + vc + ' · ' + d.n,
              amount: { value: d.p.toFixed(2), currency_code: TOY.g.moneda } }] });
          },
          onApprove: function(_, actions){
            return actions.order.capture().then(function(o){
              caja.innerHTML = '<div class="g-aviso-pago"><b>Pago recibido</b>' +
                'Folio ' + (o.id || '') + '. Toydarians se pone en contacto para el envío.</div>';
            });
          },
          onError: function(){
            caja.innerHTML = '<div class="g-aviso-pago"><b>No se pudo cobrar</b>' +
              'Intenta de nuevo o termina la compra en la tienda.</div>';
          }
        }).render(caja);
      });
    }

    var rej = document.getElementById('g-rejilla');
    if (rej) rej.addEventListener('click', function(e){
      var b = e.target.closest('.pieza[data-vc]');
      if (b) abrir(b.dataset.vc, b);
    });
    TOY.g.abrir = abrir;
  }
"""

# Solo los cierres SIN SANGRAR cierran bloque; los sangrados son funciones
# auto-invocadas legitimas dentro del codigo (el reloj de los banners, por
# ejemplo) y quitarlos parte el guion -- ya paso.
antes = JS.count("\n})();")
JS = JS.replace("\n})();", "")
if antes < 2:
    raise SystemExit(f'se esperaban 2 cierres de bloque y habia {antes}')
JS += "\n})();\n"                       # y se cierra una sola vez, al final
# Se cuentan solo los sin sangrar: los sangrados son funciones legitimas.
n = JS.count("\n})();")
if n != 1:
    raise SystemExit(f'el motor quedo con {n} cierres de bloque, debe tener 1')

DOC += f"<script>{JS}</script>\n"
salida = AQUI / 'sitio.html'   # intermedio de trabajo: vive en taller/, que no se publica
salida.write_text(DOC, encoding='utf-8')

cabeza, cuerpo = DOC.split('\n<div class="barra">', 1)
# ⚠ ESTO ESCRIBIA EN `publico/index.html` Y LO QUE SE PUBLICA ES `index.html`.
# Entre los dos habia un copiado A MANO, y ese es el hueco por el que el
# generador y el archivo servido se separan: se regenera, sale verde, y la
# pagina publicada sigue siendo la de antes. Es el mismo defecto que nos costo
# el `todo.json` del Cerebro —lo escrito contra lo servido— con otro disfraz.
#
# Se arreglo el 9 de septiembre y volvio el mismo dia con una copia vieja del
# generador. Si `publico/` reaparece, es la senal de que alguien trabajo sobre
# una base anterior a este comentario.
(RAIZ / 'index.html').write_text(
    '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
    '<meta name="description" content="Toydarians — Star Wars The Vintage '
    'Collection. El catalogo por numero VC.">\n'
    '<meta name="color-scheme" content="dark">\n' + cabeza +
    '\n<style>*{box-sizing:border-box}html{background:#0A0A0B}body{margin:0}'
    'img{display:block;max-width:100%;height:auto}</style>\n</head>\n<body>\n'
    '<div class="barra">' + cuerpo + '\n</body>\n</html>\n', encoding='utf-8')
print(f"sitio.html  {len(DOC.encode()):,} bytes")
