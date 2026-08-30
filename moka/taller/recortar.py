# -*- coding: utf-8 -*-
"""
QUITARLE EL FONDO A LA VISTA DESPIEZADA

    python3 moka/taller/recortar.py <origen.png> <carpeta de salida>

⚠ CUATRO MÉTODOS QUE NO FUNCIONARON, ANTES DEL QUE SÍ. Se dejan escritos porque
son los cuatro que uno prueba primero y los cuatro parecen razonables. Cada uno
se probó, se miró en pantalla y se descartó por lo que dice aquí — no por
intuición.

1 · UMBRAL DE COLOR. El fondo no es blanco: es un degradado gris, y la cafetera
    es de aluminio, o sea gris también. Cualquier umbral global que borre el
    fondo se lleva medio cuerpo, y cualquiera que salve el cuerpo deja media
    esquina de fondo.
2 · INUNDACIÓN DESDE LOS BORDES CON TOLERANCIA LOCAL. La idea es buena —un
    píxel es fondo si se parece a su vecino, así la inundación sube por el
    degradado sin enterarse— pero el canto de la cafetera es SUAVE: hay una
    rampa de varios píxeles entre fondo y metal y, entre dos vecinos de esa
    rampa, la diferencia sigue siendo pequeña. Medido: 99 % de la imagen
    marcado como fondo. La inundación entra por el canto y se come la pieza.
3 · RESIDUO CONTRA UN PLANO DE FONDO. Se ajusta un plano RGB por mínimos
    cuadrados al anillo del borde y se mira quién se aparta. Funciona para la
    silueta, pero la SOMBRA sobre la mesa también se aparta y queda pegada a la
    base como una mancha. Se arregla exigiendo TEXTURA: la sombra es lisa
    —desviación local 1.2, la misma que el fondo— y el metal no.
4 · Y aun así queda el problema de fondo: buena parte del costado de la jarra
    tiene EXACTAMENTE el mismo color, brillo y textura que el fondo. Ahí no hay
    señal que valga; ningún método automático puede saberlo, porque no hay nada
    que saber. Cerrar el hueco con morfología grande funde las tres piezas en
    una y arrastra la sombra.

LO QUE SE HACE, QUE ES LO QUE HACE UN DISEÑADOR CON LA PLUMA:
 · La silueta la da el mapa de BORDES —el gradiente de Sobel— con una
   inundación desde el marco que se para en los cantos. Eso acierta el
   contorno incluso donde el interior es idéntico al fondo.
 · El interior con textura lo da el residuo del plano.
 · Y el trozo donde no hay ninguna señal se marca A MANO, con un rectángulo.
   Uno. Está escrito abajo, en fracciones de la imagen, y se ve en el código
   igual que se vería un trazo de pluma en un archivo de Photoshop. Fingir que
   salió solo sería mentir sobre cómo se hizo.

Y tres remates que separan un recorte de un recorte publicable:
 · APERTURA de 17 px, que se lleva los filamentos de sombra sin tocar la pieza.
 · MEDIO PÍXEL DE DIFUMINADO en el alfa: un borde binario se ve recortado con
   tijeras.
 · MATAR LA AUREOLA. Los píxeles del canto llevan gris del fondo mezclado y
   sobre fondo oscuro eso es un halo claro; se des-mezcla con el fondo medio.
"""
import sys, os, json
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ORIGEN = sys.argv[1] if len(sys.argv) > 1 else '/tmp/moka/flotando.png'
SALIDA = sys.argv[2] if len(sys.argv) > 2 else 'moka/img'
os.makedirs(SALIDA, exist_ok=True)

im  = Image.open(ORIGEN).convert('RGB')
rgb = np.asarray(im).astype(np.float32)
h, w, _ = rgb.shape
print(f'origen · {w}×{h}')

# ── 1 · el plano del fondo, por mínimos cuadrados sobre el anillo del borde ──
ANILLO = 30
m = np.zeros((h, w), bool); m[:ANILLO] = 1; m[-ANILLO:] = 1; m[:, :ANILLO] = 1; m[:, -ANILLO:] = 1
ys, xs = np.where(m)
A = np.stack([xs/w, ys/h, np.ones_like(xs)], 1).astype(np.float32)
Y, X = np.mgrid[0:h, 0:w]
B = np.stack([X/w, Y/h, np.ones_like(X)], -1).astype(np.float32)
pred = np.zeros_like(rgb)
for c in range(3):
    coef, *_ = np.linalg.lstsq(A, rgb[ys, xs, c], rcond=None)
    pred[:, :, c] = B @ coef
firma = (rgb - pred).mean(2)

# ── 2 · textura local: lo que separa la sombra del metal ───────────────────
gris   = np.asarray(im.convert('L')).astype(np.float32)
media  = ndimage.uniform_filter(gris, 9)
media2 = ndimage.uniform_filter(gris*gris, 9)
desv   = np.sqrt(np.maximum(media2 - media*media, 0))
print(f'textura · fondo {desv[:60,:60].mean():.2f} · mediana {np.median(desv):.2f}')
conTextura = (np.abs(firma) > 14) & ((desv > 3) | (np.abs(firma) > 110))

# ── 3 · la silueta, por bordes ─────────────────────────────────────────────
suave = ndimage.gaussian_filter(gris, 1.2)
grad  = np.hypot(ndimage.sobel(suave, 1), ndimage.sobel(suave, 0))
muro  = ndimage.binary_dilation(grad > 20, np.ones((5, 5)))
libre = ~muro
libre[0,:] = libre[-1,:] = libre[:,0] = libre[:,-1] = True
sem = np.zeros_like(libre); sem[0,:] = sem[-1,:] = sem[:,0] = sem[:,-1] = True
porBordes = ndimage.binary_fill_holes(~ndimage.binary_propagation(sem, mask=libre))
print(f'bordes · silueta {100*porBordes.mean():.1f} % · textura {100*conTextura.mean():.1f} %')

# ── 4 · el trozo sin señal, a mano ─────────────────────────────────────────
#   x0, y0, x1, y1 en fracciones de la imagen. Uno solo, y es el costado de la
#   jarra: ahí el metal y el fondo son el mismo píxel.
A_MANO = [(0.395, 0.345, 0.665, 0.478)]
objeto = porBordes | conTextura
for x0, y0, x1, y1 in A_MANO:
    objeto[int(y0*h):int(y1*h), int(x0*w):int(x1*w)] = True
print(f'a mano · {len(A_MANO)} rectángulo')

# ── 5 · limpieza ───────────────────────────────────────────────────────────
objeto = ndimage.binary_fill_holes(ndimage.binary_closing(objeto, np.ones((9, 9))))
objeto = ndimage.binary_opening(objeto, np.ones((17, 17)))   # fuera los filamentos
objeto = ndimage.binary_fill_holes(ndimage.binary_closing(objeto, np.ones((7, 7))))
etiq, n = ndimage.label(objeto)
tam = ndimage.sum(objeto, etiq, range(1, n+1))
CORTE = 20000
for k, t in enumerate(tam, start=1):
    if t < CORTE: objeto[etiq == k] = False
etiq, n = ndimage.label(objeto)
print(f'objeto · {100*objeto.mean():.1f} % · {n} piezas de más de {CORTE//1000} mil px')
if n != 3:
    raise SystemExit(f'esperaba 3 piezas y salieron {n}: la vista despiezada tiene tres cuerpos')

# ── 6 · alfa con medio píxel de aire, y sin aureola ────────────────────────
alfa = np.asarray(Image.fromarray((objeto*255).astype(np.uint8))
                       .filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32) / 255.0
fondoMedio = np.median(rgb[~objeto], axis=0)
k = np.clip(alfa, 0.2, 1.0)[..., None]
limpio = np.clip((rgb - fondoMedio*(1-k)) / k, 0, 255).astype(np.uint8)
print(f'aureola · fondo estimado RGB {fondoMedio.astype(int).tolist()}')
salida = np.dstack([limpio, (alfa*255).astype(np.uint8)])

def recortar(mascara):
    ys, xs = np.where(mascara)
    y0, y1, x0, x1 = ys.min(), ys.max()+1, xs.min(), xs.max()+1
    t = salida[y0:y1, x0:x1].copy()
    t[..., 3] = (t[..., 3] * mascara[y0:y1, x0:x1]).astype(np.uint8)
    return Image.fromarray(t, 'RGBA'), (int(x0), int(y0), int(x1), int(y1))

entera, caja = recortar(objeto)
entera.save(os.path.join(SALIDA, 'despiece.png'))
print(f'  despiece.png     {entera.width}×{entera.height}')

NOMBRES = ['jarra', 'embudo', 'caldera']
centros = sorted((ndimage.center_of_mass(objeto, etiq, k)[0], k) for k in range(1, n+1))
piezas = []
for i, (cy, k) in enumerate(centros):
    img, cj = recortar(etiq == k)
    nom = NOMBRES[i] + '.png'
    img.save(os.path.join(SALIDA, nom))
    piezas.append({ 'archivo':nom, 'ancho':img.width, 'alto':img.height, 'caja':cj })
    print(f'  {nom:16} {img.width}×{img.height}')

json.dump({ 'origen':os.path.basename(ORIGEN), 'lienzo':[w, h], 'caja':caja,
            'aMano':A_MANO, 'piezas':piezas },
          open(os.path.join(SALIDA, 'piezas.json'), 'w'), ensure_ascii=False, indent=1)
print('listo ·', SALIDA)
