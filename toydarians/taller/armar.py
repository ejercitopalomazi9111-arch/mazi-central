#!/usr/bin/env python3
"""Arma el escaparate de Toydarians en un solo archivo autocontenido.

Por que un generador y no un HTML a mano: el catalogo son 47 piezas reales
sacadas del WooCommerce del cliente y las imagenes van embebidas como data URI
(el visor bloquea imagenes externas). Editar eso a mano seria imposible.
Los datos entran por activos/, el diseno vive aqui.
"""
import json, re, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ACT  = RAIZ / 'activos'
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
h1{font-size:clamp(34px,7.6vw,106px)}
h1{font-size:min(clamp(34px,7.6vw,106px),16cqw)}
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
.barra nav{display:flex;gap:clamp(12px,2vw,24px);margin-left:auto;flex-wrap:wrap;
  font:700 10.5px/1 var(--dato);letter-spacing:.16em;text-transform:uppercase}
.barra nav a{color:var(--gris);text-decoration:none;transition:color .2s}
.barra nav a:hover{color:var(--amarillo)}
@media (max-width:620px){.barra nav a.opc{display:none}}

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

/* ══ G · PUERTAS · la ficha se abre como una compuerta de nave ══ */
.g-ficha{position:fixed;inset:0;z-index:90;display:grid;place-items:center;
  background:rgba(4,4,6,.86);padding:clamp(12px,3vw,34px)}
.g-ficha[hidden]{display:none}
.g-puerta{position:absolute;top:0;bottom:0;width:50%;background:#111114;z-index:2;
  border-inline:1px solid var(--linea);transition:transform .82s cubic-bezier(.72,0,.2,1)}
.g-puerta.izq{left:0}
.g-puerta.der{right:0}
.g-ficha.abierta .g-puerta.izq{transform:translate3d(-101%,0,0)}
.g-ficha.abierta .g-puerta.der{transform:translate3d(101%,0,0)}
.g-puerta::after{content:'';position:absolute;top:0;bottom:0;width:3px;
  background:linear-gradient(180deg,transparent,var(--amarillo),transparent);opacity:.6}
.g-puerta.izq::after{right:0} .g-puerta.der::after{left:0}
.g-caja{position:relative;z-index:1;width:min(100%,940px);max-height:100%;
  overflow-y:auto;background:var(--panel);border:1px solid var(--linea);
  display:grid;gap:0;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);
  opacity:0;transition:opacity .5s ease .5s}
.g-ficha.abierta .g-caja{opacity:1}
@media (max-width:760px){.g-caja{grid-template-columns:minmax(0,1fr)}}
.g-galeria{background:#0C0C0E;display:grid;gap:8px;padding:14px;align-content:start}
.g-galeria .grande{aspect-ratio:1/1;background:#111;position:relative;overflow:hidden}
.g-galeria .grande img{width:100%;height:100%;object-fit:contain}
.g-tiras{display:flex;gap:7px;flex-wrap:wrap}
.g-tiras button{width:54px;height:54px;padding:0;background:#141416;cursor:pointer;
  border:1px solid var(--linea);transition:border-color .2s}
.g-tiras button[aria-current="true"]{border-color:var(--amarillo)}
.g-tiras img{width:100%;height:100%;object-fit:contain}
.g-datos{padding:clamp(16px,2.4vw,26px);display:grid;gap:12px;align-content:start}
.g-datos .vc{font:700 11px/1 var(--dato);letter-spacing:.22em;color:var(--amarillo)}
.g-datos h3{font-size:clamp(19px,2.6vw,28px)}
.g-datos dl{margin:6px 0 0;display:grid;grid-template-columns:auto minmax(0,1fr);
  gap:8px 16px;font:400 12.5px/1.5 var(--dato)}
.g-datos dt{color:var(--gris-tenue);text-transform:uppercase;letter-spacing:.12em;
  font-size:10px;padding-top:3px}
.g-datos dd{margin:0;color:var(--hueso)}
.g-cerrar{position:absolute;top:10px;right:10px;z-index:3;background:var(--panel2);
  border:1px solid var(--linea);color:var(--hueso);cursor:pointer;width:38px;height:38px;
  font:400 18px/1 var(--texto)}
.g-cerrar:hover{border-color:var(--amarillo);color:var(--amarillo)}


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
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation:none!important;transition:none!important}
  .revelar,.figura,.carton,.burbuja img,.lustre{transform:none!important}
  .pieza-eje{transform:translateX(-1px)!important}
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
    fichas = []
    for nom, slug, subs in MENU:
        info = CATFOTOS.get(slug, {})
        fotos = info.get('fotos') or []
        n = info.get('productos')
        # los banners que se cruzan solos; si no hay fotos, manda el rotulo
        caps = ''.join(f'<span data-b="fotos/cat/{f}"></span>' for f in fotos[:3])
        sub = ' · '.join(t for t, _ in subs) if subs else 'Ver la categoría'
        ancha = ' ancha' if slug == 'hasbro' else ''
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
            f'<span class="ir">Ver a detalle</span></span></button>')
    return '<div class="rejilla" id="g-rejilla">' + '\n'.join(t) + '</div>'

def g_datos_js():
    """Lo que el guion necesita para armar la ficha al vuelo, sin repetir el
    HTML de 47 fichas en el documento."""
    d = {}
    for pz in cat:
        f = FOTOS.get(pz['vc'], {})
        if not f.get('fotos'): continue
        d[pz['vc']] = {'n': pz['nombre'], 's': pz['serie'] or 'The Vintage Collection',
                       'u': pz['url'], 'f': f['fotos']}
    return json.dumps(d, ensure_ascii=False, separators=(',', ':'))

def g_ficha():
    """El cuadro que se abre como compuerta. Vacio: lo llena el guion."""
    return ('<div class="g-ficha" id="g-ficha" hidden role="dialog" aria-modal="true" '
            'aria-label="Ficha de la figura">'
            '<div class="g-puerta izq" aria-hidden="true"></div>'
            '<div class="g-puerta der" aria-hidden="true"></div>'
            '<div class="g-caja">'
            '<button class="g-cerrar" id="g-cerrar" type="button" aria-label="Cerrar">✕</button>'
            '<div class="g-galeria"><div class="grande"><img id="g-grande" alt=""></div>'
            '<div class="g-tiras" id="g-tiras"></div></div>'
            '<div class="g-datos"><span class="vc" id="g-vc"></span>'
            '<h3 id="g-nom"></h3>'
            '<dl><dt>Línea</dt><dd id="g-serie"></dd>'
            '<dt>Escala</dt><dd>3.75&Prime; · 9.5 cm</dd>'
            '<dt>Estado</dt><dd>En su cartón original, sin abrir</dd>'
            '<dt>Precio</dt><dd>En la tienda</dd></dl>'
            '<a class="b" id="g-ir" href="#" target="_blank" rel="noopener">'
            '<span>Ver en la tienda ↗</span></a></div>'
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

DOC = f"""<title>Toydarians · The Vintage Collection</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bungee&family=Familjen+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap">
<style>{CSS}</style>

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
"""

JS += r"""
  var cuadro = document.getElementById('g-ficha');
  if (cuadro) {
    var gGrande = document.getElementById('g-grande'),
        gTiras  = document.getElementById('g-tiras'),
        gVc = document.getElementById('g-vc'), gNom = document.getElementById('g-nom'),
        gSerie = document.getElementById('g-serie'), gIr = document.getElementById('g-ir'),
        devolver = null;

    function pintarTiras(fotos, activa){
      gTiras.innerHTML = '';
      fotos.forEach(function(f, i){
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-current', String(i === activa));
        b.setAttribute('aria-label', 'Foto ' + (i + 1));
        var im = document.createElement('img');
        im.src = 'fotos/' + f; im.alt = ''; im.loading = 'lazy';
        b.appendChild(im);
        b.addEventListener('click', function(){
          gGrande.src = 'fotos/' + f;
          pintarTiras(fotos, i);
        });
        gTiras.appendChild(b);
      });
    }

    function abrir(vc, origen){
      var d = TOY.g.piezas[vc]; if (!d) return;
      devolver = origen || null;
      gVc.textContent = 'VC ' + vc;
      gNom.textContent = d.n; gSerie.textContent = d.s; gIr.href = d.u;
      gGrande.src = 'fotos/' + d.f[0]; gGrande.alt = d.n;
      pintarTiras(d.f, 0);
      cuadro.hidden = false;
      document.body.style.overflow = 'hidden';
      // las puertas arrancan cerradas y se abren al cuadro siguiente
      cuadro.classList.remove('abierta');
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){ cuadro.classList.add('abierta'); });
      });
      document.getElementById('g-cerrar').focus();
    }
    function cerrar(){
      cuadro.classList.remove('abierta');
      setTimeout(function(){
        cuadro.hidden = true;
        document.body.style.overflow = '';
        if (devolver && devolver.focus) devolver.focus();
      }, quieto ? 0 : 380);
    }
    document.getElementById('g-cerrar').addEventListener('click', cerrar);
    cuadro.addEventListener('click', function(e){ if (e.target === cuadro) cerrar(); });
    addEventListener('keydown', function(e){
      if (e.key === 'Escape' && !cuadro.hidden) cerrar();
    });
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
salida = RAIZ / 'sitio.html'
salida.write_text(DOC, encoding='utf-8')

cabeza, cuerpo = DOC.split('\n<div class="barra">', 1)
publico = RAIZ / 'publico'
publico.mkdir(exist_ok=True)
(publico / 'index.html').write_text(
    '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
    '<meta name="description" content="Toydarians — Star Wars The Vintage '
    'Collection. El catalogo por numero VC.">\n'
    '<meta name="color-scheme" content="dark">\n' + cabeza +
    '\n<style>*{box-sizing:border-box}html{background:#0A0A0B}body{margin:0}'
    'img{display:block;max-width:100%}</style>\n</head>\n<body>\n'
    '<div class="barra">' + cuerpo + '\n</body>\n</html>\n', encoding='utf-8')
print(f"sitio.html  {len(DOC.encode()):,} bytes")
