#!/usr/bin/env python3
"""Arma el escaparate de Toydarians en un solo archivo autocontenido.

Por que un generador y no un HTML a mano: el catalogo son 47 piezas reales
sacadas del WooCommerce del cliente y las imagenes van embebidas como data URI
(el visor bloquea imagenes externas). Editar eso a mano seria imposible.
Los datos entran por activos/, el diseno vive aqui.
"""
import base64, json, re, pathlib

# ⚠ AQUÍ HABÍA UN `parent.parent` QUE DEJABA EL GENERADOR MUERTO EN MAIN.
# Cuando el taller vivía en `scripts/`, subir dos niveles caía en la carpeta del
# proyecto y `activos/` estaba ahí. Al mudarlo a `taller/` los activos se
# mudaron CON él —viven en `taller/activos/`— pero el `parent.parent` se quedó
# igual, así que apuntaba a `toydarians/activos`, que no existe.
#
# Resultado: `python3 taller/armar.py` reventaba con
#     FileNotFoundError: .../toydarians/activos/catalogo-limpio.json
# O sea que el sitio commiteado NO SE PODÍA REGENERAR. No se ve leyendo, porque
# el `index.html` que ya está generado se sirve perfecto: lo que estaba roto era
# la única manera de volver a hacerlo.
#
# `AQUI` y no `RAIZ`: el nombre dice dónde está parado el archivo, que es la
# pregunta que se contestó mal. RAIZ se queda para lo que sí es la raíz.
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
body{margin:0;background:var(--negro);color:var(--hueso);
  font:400 16px/1.6 var(--texto);-webkit-font-smoothing:antialiased;overflow-x:hidden}
img{display:block;max-width:100%}
a{color:inherit}
::selection{background:var(--amarillo);color:#0A0A0B}
:focus-visible{outline:2px solid var(--amarillo);outline-offset:3px}
.caso{max-width:var(--ancho);margin-inline:auto;padding-inline:var(--aire);
  container-type:inline-size}
h1,h2,h3{font-family:var(--display);font-weight:400;text-transform:uppercase;
  letter-spacing:-.045em;margin:0;text-wrap:balance;line-height:1.02}
/* ⚠ EL MÍNIMO ERA 34 px Y ESO ES LO QUE CARLOS LLAMÓ «SE VE CHIQUITO».
   En un teléfono de 390 el `7.6vw` da 29.6, así que ganaba el suelo de 34 —
   tamaño de subtítulo para el titular de una portada. En escritorio subía a
   106. Un cartel que se desinfla 3× al pasar al teléfono no es el mismo cartel,
   y el teléfono es donde se ve esto.
   Sube a 44 de suelo y 12vw de pendiente: en 390 da 46.8. El `min(…,16cqw)`
   de abajo sigue siendo el freno que impide que Bungee —que es ancha— se salga
   de su columna; con él, 390 px se resuelve en ~46 px y no desborda. Medido con
   `revisar.mjs`, que da desborde 0 en 390, 768 y 1440. */
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
/* ---- Barra ---------------------------------------------------------------- */
.barra{position:sticky;top:0;z-index:20;background:#000;
  border-bottom:1px solid var(--linea)}
.barra .caso{display:flex;align-items:center;gap:clamp(12px,2.4vw,28px);
  padding-block:13px}
.barra .logo{flex:0 0 auto}
.barra .logo img{height:clamp(20px,2.6vw,27px);width:auto}
.barra nav{display:flex;gap:clamp(12px,2vw,24px);margin-left:auto;flex-wrap:wrap;
  font:700 10.5px/1 var(--dato);letter-spacing:.16em;text-transform:uppercase}
.barra nav a{color:var(--gris);text-decoration:none;transition:color .2s}
.barra nav a:hover{color:var(--amarillo)}
@media (max-width:620px){.barra nav a.opc{display:none}}
/* ⚠ EN 390 px LA BARRA SE PARTÍA EN DOS RENGLONES Y SE ENCIMABA CON EL LOGO.
   Escondiendo sólo `.opc` quedaban tres enlaces, y con `letter-spacing:.16em`
   más el gap de 12 px medían ~300 px al lado de un logo de ~110: no caben en
   los 354 px útiles de un teléfono, así que `flex-wrap` los mandaba abajo
   pegados. No es que envuelva —envolver está bien—: es que envolvía SIN AIRE y
   parecía un defecto.
   Apretar la letra en el móvil los deja en una sola línea. El letter-spacing
   ancho es un lujo de escritorio; a 9.5 px sólo separa. */
@media (max-width:620px){
  .barra .caso{gap:10px}
  .barra nav{gap:13px;font-size:9.5px;letter-spacing:.05em}
  .barra .logo img{height:19px}
}

/* ---- Cartel de portada ---------------------------------------------------- */
/* Un cartel, no una portada de plantilla: el titular en el amarillo de la
   marca, la cuña roja cruzando y las figuras dentro de la cuña. */
.cartel{position:relative;overflow:hidden;background:#000;
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
footer{background:#000;border-top:1px solid var(--linea);
  padding-block:clamp(32px,4.4vw,52px)}
.fila-pie{display:flex;flex-wrap:wrap;gap:22px 34px;justify-content:space-between;
  align-items:flex-start;font:400 11.5px/1.65 var(--dato);color:var(--gris-tenue)}
.fila-pie a{color:var(--gris)}
.fila-pie img{height:26px;width:auto;margin-bottom:12px}
.nota{max-width:52ch;font-size:11px;line-height:1.7}
#medida{color:var(--amarillo);font-variant-numeric:tabular-nums}

/* ---- Movimiento ------------------------------------------------------------- */
@media (scripting: enabled){
  .revelar{transform:translate3d(0,18px,0);transition:transform .7s cubic-bezier(.2,.7,.25,1)}
  .revelar.dentro{transform:none}
  .pieza-eje{transform:translateX(-1px) scaleY(0);transform-origin:bottom}
  .dibujado .pieza-eje{transform:translateX(-1px) scaleY(1);
    transition:transform 420ms cubic-bezier(.34,1.25,.44,1);
    transition-delay:calc(var(--d) * 22ms)}
}
/* ══════════════════ S · Sylcred ══════════════════
   Carlos: «mejora el scroll para que las cosas aparezcan de modo más aestetic
   y como si fuesen enérgicas las apariciones».

   Lo que había era correcto y tímido: 18 px de recorrido con una curva que
   sólo desacelera (.2,.7,.25,1). Eso se lee como «apareció», no como «entró».
   Y sólo lo llevaban TRES elementos de toda la página, así que el resto del
   scroll estaba muerto.

   Tres cosas dan la energía, y ninguna es hacerlo más rápido:

   1 · RECORRIDO. 18 px no se ven; 34 sí. Lo que se percibe como fuerza es la
       distancia recorrida, no la duración.
   2 · SOBREPASO. La curva pasa de largo y regresa (el 1.3 del tercer punto).
       Un movimiento que se pasa y se acomoda se lee como que traía inercia —
       tiene peso. El que sólo frena parece que lo empujaron.
   3 · ESCALONADO. Los hermanos entran uno tras otro, no en bloque. Es lo que
       hace que se vea compuesto en vez de hecho por un script — y es
       exactamente lo que ya hacía `.pieza-eje` con su `--d`; aquí se
       generaliza.

   ⚠ NADA DE OPACITY SOBRE TEXTO, que es regla de la casa y él ya la tenía
   escrita: un texto a media opacidad es un texto con el contraste roto
   mientras dura. El texto entra sólo con `transform`. La opacidad se reserva
   para lo que no se lee — imágenes y cajas.

   ⚠ EL TOPE DEL ESCALONADO ES A PROPÓSITO. Sin él, una rejilla de 47 fichas
   pondría la última a 47 × 70 ms = tres segundos y pico después de entrar en
   pantalla: el visitante ya hizo scroll y se perdió la mitad. Se corta en 8. */
@media (scripting: enabled){
  .s-rev{transform:translate3d(0,34px,0);
    transition:transform 640ms cubic-bezier(.2,1.3,.32,1);
    transition-delay:calc(var(--s-i,0) * 70ms)}
  .s-rev.s-dentro{transform:none}
  /* Las cajas —no el texto— además se asientan con un pelo de escala y de
     opacidad. En una tarjeta con foto eso se lee como que aterriza. */
  .s-rev.s-caja{opacity:.001;transform:translate3d(0,34px,0) scale(.975);
    transition:transform 640ms cubic-bezier(.2,1.3,.32,1),
               opacity 400ms ease-out;
    transition-delay:calc(var(--s-i,0) * 70ms)}
  .s-rev.s-caja.s-dentro{opacity:1;transform:none}
  /* El revelado que ya existía también se estira: era el más visible y el que
     peor contaba la historia. */
  .revelar{transform:translate3d(0,34px,0);
    transition:transform 640ms cubic-bezier(.2,1.3,.32,1)}
}
/* ══════════════════ /S ══════════════════ */
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation:none!important;transition:none!important}
  .revelar,.figura,.carton,.burbuja img,.lustre{transform:none!important}
  .pieza-eje{transform:translateX(-1px)!important}
  /* ══════ S ══════ */
  .s-rev,.s-rev.s-caja{transform:none!important;opacity:1!important}
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

TIENDA = 'https://www.toydarians.com/'
LOGO = img['logo']

CSS = CSS.replace('AUREBESH_URI', img['aurebesh']['uri'])


# ── LA TIPOGRAFÍA DE LA IDENTIDAD VA EMPOTRADA, NO PEDIDA ────────────────────
# Antes Bungee entraba por `<link>` a fonts.googleapis.com junto con las otras
# dos. Se midió en un navegador de verdad y NO CARGABA: el titular salía en la
# sans del sistema, porque el repuesto `'Arial Black'` tampoco existe en todos
# lados y la pila caía hasta `system-ui`.
#
# El defecto se ve de un golpe en la sección del cartón: el logo del blíster
# está en la letra correcta —es imagen— y el titular de al lado se ve de
# plantilla. La identidad del cliente vive en esa letra; pedírsela a un tercero
# es apostarla contra su red.
#
# ⚠ SÓLO BUNGEE, y es a propósito. Es la que carga la identidad. Familjen
# Grotesk y JetBrains Mono siguen por link: empotrarlas también sumaría ~200 KB
# a un archivo que ya pesa 345, y en teléfono eso se paga. O sea que la
# dependencia externa BAJA pero no desaparece — decirlo así es más útil que
# presumir un «cero dependencias» que no sería cierto.
#
# Licencia OFL, que permite empotrar: activos/fuentes/LICENCIA-BUNGEE.md
def _fuente(nombre, rango):
    datos = base64.b64encode((ACT / "fuentes" / nombre).read_bytes()).decode()
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

<div class="barra"><div class="caso">
  <a class="logo" href="{TIENDA}" target="_blank" rel="noopener">
    <img src="{LOGO['uri']}" width="{LOGO['w']}" height="{LOGO['h']}"
         alt="Toydarians" fetchpriority="high"></a>
  <nav>
    <a href="#vitrina">La vitrina</a>
    <a href="#carton" class="opc">El cartón</a>
    <a href="#indice">Índice VC</a>
    <a href="{TIENDA}" target="_blank" rel="noopener">Tienda ↗</a>
  </nav>
</div></div>

<header class="cartel">
  <div class="cuna" aria-hidden="true"></div>
  <div class="trama" aria-hidden="true"></div>
  <div class="caso cartel-red">
    <p class="ceja">The Vintage Collection · Escala 3.75&Prime;</p>
    <h1>Cada pieza<br>tiene <em>número</em></h1>
    <div class="dicho">
      <p>El número <strong>VC</strong> es la pieza. Toydarians tiene
        <strong>{len(cat)}</strong> de las 381 de la línea, y este escaparate está
        construido alrededor de ese número.</p>
      <div class="acciones">
        <a class="b" href="#vitrina"><span>Ver la vitrina</span></a>
        <a class="b hueco" href="#indice"><span>El índice</span></a>
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
  <span class="apunte">{len(cat)} piezas · VC {rango}</span>
</div></div>

<section id="vitrina"><div class="caso">
  <p class="ceja">La vitrina</p>
  <h2 class="revelar" style="max-width:18ch">Lo que hay<br>ahora mismo</h2>
  <p style="margin:18px 0 clamp(24px,3vw,36px)">Cada cajón lleva <strong>el color medido
    de su propia foto</strong>. Y donde todavía no hay foto propia se dice: nunca una
    imagen que pretenda ser la pieza.</p>
  <div class="rejilla">{REJILLA}</div>
</div></section>
"""

DOC += f"""
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

{cinta()}

<section id="indice"><div class="caso">
  <p class="ceja">Índice VC</p>
  <h2 class="revelar" style="max-width:16ch">El catálogo<br>tiene huecos</h2>
  <p style="margin:18px 0 clamp(22px,2.8vw,32px)">Hasbro numera cada figura y la
    numeración <strong>salta</strong>: del 01A al 57, del 73 al 231. Cada raya es una
    pieza que sí está; los claros son las que no. <strong>Este dibujo es de este
    cliente y de nadie más.</strong></p>
  {EJE}
  <ul class="cifras">
    <li><b>{len(cat)}</b><span>En vitrina</span></li>
    <li><b>{ausentes}</b><span>Números ausentes</span></li>
    <li><b>{len(filas) - len(cat)}</b><span>Tramos sin cubrir</span></li>
    <li><b>{rango}</b><span>Rango</span></li>
  </ul>
  <div class="indice" style="margin-top:clamp(28px,3.6vw,44px)">{INDICE}</div>
</div></section>

<div class="cierre"><div class="caso">
  <div>
    <h2>Precios y existencias,<br>en la tienda</h2>
    <p>Este escaparate no cobra ni guarda datos. El carrito, el pago y el envío
      siguen donde siempre.</p>
  </div>
  <a class="b" href="{TIENDA}" target="_blank" rel="noopener"><span>Abrir toydarians.com ↗</span></a>
</div></div>

<footer><div class="caso fila-pie">
  <div>
    <img src="{LOGO['uri']}" width="{LOGO['w']}" height="{LOGO['h']}" alt="Toydarians">
    <div><a href="{TIENDA}" target="_blank" rel="noopener">toydarians.com ↗</a></div>
    <div style="margin-top:12px">Fluidez: <span id="medida">midiendo…</span></div>
  </div>
  <p class="nota" style="margin:0">
    Propuesta de escaparate. El logotipo es el del cliente. Las fotos de producto son
    los renders de fábrica de Hasbro, puestos como provisionales: donde no hay foto
    propia se marca el hueco en vez de rellenarlo. <strong>No se publican precios ni
    existencias</strong> porque no los tenemos confirmados — viven en la tienda.
    Star Wars y The Vintage Collection son marcas de sus titulares; este sitio no está
    afiliado a ellos.
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
     El scroll enérgico que pidió Carlos. Se engancha desde AQUÍ y no desde el
     HTML a propósito: así no toco una sola etiqueta del generador de Godines.
     Sin JavaScript no pasa nada de esto y la página se ve entera — el CSS de
     arriba vive dentro de `@media (scripting: enabled)`.

     ⚠ EL ÍNDICE ES POR GRUPO, NO GLOBAL. Numerar de corrido toda la página
     haría que la última sección esperara el escalonado de todas las
     anteriores. El contador se reinicia en cada padre, que es lo que hace que
     cada rejilla se sienta como una tanda propia. */
  if ('IntersectionObserver' in window) {
    var TOY = window.TOY = window.TOY || {};
    TOY.s = TOY.s || {};

    // Lo que merece entrar: las fichas de la vitrina y los renglones del
    // índice. Nunca la portada — lo que ya se ve al llegar no se «revela», se
    // estropea si parpadea.
    //
    // ⚠ ESTOS NOMBRES ESTÁN SACADOS DEL HTML, NO SUPUESTOS. La primera versión
    // decía `.celda, .ficha, .tarjeta, .sobre` — cuatro nombres razonables y
    // ninguno existe aquí. El selector no falla cuando no encuentra nada:
    // devuelve una lista vacía y sigue. Resultado: se revelaba el índice y la
    // vitrina entera —lo que más se ve— se quedaba quieta, con la compuerta en
    // verde y sin un solo error en consola.
    // Se cazó contando los revelados por grupo, no leyendo. Las de verdad son
    // `.pieza` (8 fichas) y `.reng` (47 renglones).
    var grupos = ['.pieza', '.reng'];
    var vistos = new Set();
    grupos.forEach(function(sel){
      var nodos = document.querySelectorAll(sel);
      var porPadre = new Map();
      nodos.forEach(function(n){
        if (vistos.has(n) || n.closest('.cartel')) return;   // la portada no
        vistos.add(n);
        var p = n.parentElement;
        var i = porPadre.get(p) || 0;
        porPadre.set(p, i + 1);
        n.style.setProperty('--s-i', Math.min(i, 8));        // tope: ver el CSS
        n.classList.add('s-rev');
        // Con foto dentro es caja; si es sólo texto, nada de opacidad.
        if (n.querySelector('img, picture, canvas')) n.classList.add('s-caja');
      });
    });

    var ojoS = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if (!e.isIntersecting) return;
        e.target.classList.add('s-dentro');
        ojoS.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    document.querySelectorAll('.s-rev').forEach(function(n){ ojoS.observe(n); });
    TOY.s.revelados = vistos.size;
  }
  /* ══════════════════ /S ══════════════════ */

  if (quieto) return;

  // ---- Puntero ------------------------------------------------------------
  var vitrina = document.querySelector('.vitrina'),
      carton  = document.getElementById('carton'),
      banda   = document.getElementById('banda'),
      medida  = document.getElementById('medida');
  var mx = .5, my = .5, sx = .5, sy = .5;      // objetivo y suavizado
  var cx = .5, cy = .5, kx = .5, ky = .5;
  var agarre = null, tocada = false;

  addEventListener('pointermove', function(e){
    mx = e.clientX / innerWidth; my = e.clientY / innerHeight;
    if (agarre === null && carton) {
      var r = carton.getBoundingClientRect();
      var dentro = e.clientX > r.left - 220 && e.clientX < r.right + 220 &&
                   e.clientY > r.top - 160 && e.clientY < r.bottom + 160;
      if (dentro) { cx = (e.clientX - r.left) / r.width; cy = (e.clientY - r.top) / r.height; }
      else { cx = .5; cy = .5; }
    }
  }, { passive: true });

  if (carton) {
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
  // ---- Polvo en el cono de luz (WebGL) ------------------------------------
  // Se crea tarde y solo si la portada esta a la vista, y se apaga al salir.
  // Un contexto WebGL corriendo fuera de pantalla es una estufa por nada.
  var lienzo = document.getElementById('polvo'), gl = null, prog = null, uni = {}, N = 900;
  function encender(){
    if (gl || !lienzo) return;
    gl = lienzo.getContext('webgl', { alpha:true, antialias:false, depth:false, premultipliedAlpha:false });
    if (!gl) return;
    var vs = 'attribute vec3 s;uniform float t;uniform vec2 luz;uniform float razon;varying float b;' +
      'void main(){float x=fract(s.x+t*(0.0055+s.z*0.009));' +
      'float y=fract(s.y+t*0.0035+sin(t*0.4+s.x*21.0)*0.010);' +
      'vec2 p=vec2(x,y)*2.0-1.0;' +
      'float d=distance(vec2(p.x*razon,p.y),vec2(luz.x*razon,luz.y));' +
      'b=smoothstep(1.25,0.05,d)*(0.22+s.z*0.78);' +
      'gl_Position=vec4(p,0.0,1.0);gl_PointSize=(1.0+s.z*2.4)*(0.6+b*1.6);}';
    var fs = 'precision mediump float;varying float b;' +
      'void main(){vec2 c=gl_PointCoord-0.5;' +
      'float a=smoothstep(0.5,0.03,length(c))*b;gl_FragColor=vec4(0.94,0.73,0.43,a);}';
    function comp(tipo, src){ var s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    prog = gl.createProgram();
    gl.attachShader(prog, comp(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, comp(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl = null; return; }
    gl.useProgram(prog);
    var d = new Float32Array(N * 3);
    for (var i = 0; i < N; i++){ d[i*3] = Math.random(); d[i*3+1] = Math.random(); d[i*3+2] = Math.random(); }
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, d, gl.STATIC_DRAW);
    var a = gl.getAttribLocation(prog, 's');
    gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 3, gl.FLOAT, false, 0, 0);
    uni.t = gl.getUniformLocation(prog, 't');
    uni.luz = gl.getUniformLocation(prog, 'luz');
    uni.razon = gl.getUniformLocation(prog, 'razon');
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.clearColor(0, 0, 0, 0);
    tallar(); lienzo.classList.add('vivo');
  }
  function tallar(){
    if (!gl) return;
    var r = Math.min(devicePixelRatio || 1, 1.5);   // topado: mas no se nota y cuesta
    var w = Math.round(lienzo.clientWidth * r), h = Math.round(lienzo.clientHeight * r);
    if (w && h && (lienzo.width !== w || lienzo.height !== h)) {
      lienzo.width = w; lienzo.height = h; gl.viewport(0, 0, w, h);
    }
  }
  var aLaVista = true;
  if (lienzo && 'IntersectionObserver' in window) {
    new IntersectionObserver(function(es){
      aLaVista = es[0].isIntersecting;
      if (aLaVista) encender();
    }, { rootMargin: '120px' }).observe(lienzo);
  } else { encender(); }
  addEventListener('resize', tallar, { passive: true });
"""

JS += r"""
  // ---- Un solo bucle -------------------------------------------------------
  var t0 = performance.now(), ultimo = t0, cuadros = 0, ventana = t0,
      peor = 0, listo = false, pintado = 0;

  function paso(ahora){
    requestAnimationFrame(paso);
    var dt = Math.min(ahora - ultimo, 64); ultimo = ahora;
    var k = 1 - Math.pow(0.0016, dt / 1000);      // suavizado independiente del cuadro

    sx += (mx - sx) * k; sy += (my - sy) * k;
    kx += (cx - kx) * k; ky += (cy - ky) * k;
    if (vitrina) { vitrina.style.setProperty('--px', sx.toFixed(4));
                   vitrina.style.setProperty('--py', sy.toFixed(4)); }
    if (carton)  { carton.style.setProperty('--cx', kx.toFixed(4));
                   carton.style.setProperty('--cy', ky.toFixed(4)); }

    if (banda && !tocada) {
      var r = banda.getBoundingClientRect();
      var p = (innerHeight - r.top) / (innerHeight + r.height);
      p = Math.max(0, Math.min(1, (p - .18) / .58));
      var meta = p * (banda.scrollWidth - banda.clientWidth);
      if (Math.abs(meta - banda.scrollLeft) > .5) banda.scrollLeft = meta;
    }

    // El fondo tiene presupuesto propio: ~30 fps. No compite con el scroll.
    if (gl && aLaVista && ahora - pintado > 32) {
      pintado = ahora;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uni.t, (ahora - t0) / 1000);
      gl.uniform2f(uni.luz, (sx - .5) * 1.5, (.5 - sy) * 1.2 + .35);
      gl.uniform1f(uni.razon, lienzo.width / Math.max(1, lienzo.height));
      gl.drawArrays(gl.POINTS, 0, N);
    }

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

cierre = "  requestAnimationFrame(paso);\n})();"
if cierre not in JS:
    raise SystemExit('no se encontro el cierre del motor base')
JS = JS.replace(cierre, "  requestAnimationFrame(paso);", 1)
if JS.count("})();") != 1:
    raise SystemExit(f'el motor quedo con {JS.count("})();")} cierres, debe tener 1')

DOC += f"<script>{JS}</script>\n"
salida = AQUI / 'sitio.html'   # intermedio de trabajo: vive en taller/, que no se publica
salida.write_text(DOC, encoding='utf-8')

cabeza, cuerpo = DOC.split('\n<div class="barra">', 1)
# ⚠ ESTO ESCRIBÍA EN `publico/index.html` Y LO QUE SE PUBLICA ES `index.html`.
# Entre los dos había un copiado A MANO, y ése es el hueco por el que el
# generador y el archivo servido se separan: se regenera, sale verde, y la
# página publicada sigue siendo la de antes. Es el mismo defecto que nos costó
# el `todo.json` del Cerebro —lo escrito contra lo servido— con otro disfraz.
#
# Ahora escribe DIRECTO donde `build.mjs` lo va a recoger. Un paso manual menos
# es un estado menos que puede quedarse viejo.
(RAIZ / 'index.html').write_text(
    '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
    '<meta name="description" content="Toydarians — Star Wars The Vintage '
    'Collection. El catalogo por numero VC.">\n'
    '<meta name="color-scheme" content="dark">\n' + cabeza +
    '\n<style>*{box-sizing:border-box}html{background:#0A0A0B}body{margin:0}'
    'img{display:block;max-width:100%}</style>\n</head>\n<body>\n'
    '<div class="barra">' + cuerpo + '\n</body>\n</html>\n', encoding='utf-8')
print(f"sitio.html  {len(DOC.encode()):,} bytes")
