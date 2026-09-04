# Hornea el grado de color EN LOS ARCHIVOS, no en filtros CSS.
# Dos motivos, y el segundo es el que de verdad importa:
#  1) un `filter:` de CSS obliga a Chromium a rasterizar la capa entera al
#     factor de escala del PDF: 5977 x 8340 px sin pérdida = 228 MB de PDF.
#  2) el hueco de la X salia CIAN. La nebulosa es azul-teal y una veladura
#     verde al 20% encima no la mueve: la marca de Xbox tiene que ser VERDE
#     o no es la marca. Aqui el nucleo se mapea por LUMINANCIA a una rampa
#     de verdes (degradado de mapa), que conserva la textura de la nebulosa
#     y garantiza el tono.
from PIL import Image, ImageEnhance, ImageOps

SRC = Image.open('pilares.jpg').convert('RGB')
print('origen', SRC.size)

# ── 1 · EL MUNDO ─────────────────────────────────────────────────────────
# 4200 px de ancho sobre 696 mm de lamina = 153 dpi. Un cartel de 50x70 se
# mira desde mas de un metro; por debajo de 150 dpi si se nota.
ANCHO = 4200
ALTO  = round(ANCHO * 2746 / 2632)          # la caja del patron del SVG
fondo = SRC.resize((ANCHO, ALTO), Image.LANCZOS)
fondo = ImageEnhance.Color(fondo).enhance(0.70)      # croma comprimido
fondo = ImageEnhance.Brightness(fondo).enhance(0.60)
fondo = ImageEnhance.Contrast(fondo).enhance(1.08)
fondo.save('fondo.jpg', quality=88, optimize=True, progressive=True)
print('fondo.jpg', fondo.size)

# ── 2 · LO QUE SE VE POR EL HUECO ────────────────────────────────────────
# Recorte del cuadrado que ocupa la marca, en coordenadas del patron:
# el SVG pone la imagen en x=-360 con 2632 de ancho, asi que el centro
# (956,800) del dibujo cae en (1316,800) del patron. Medio lado 340.
K = SRC.size[0] / 2632.0                    # patron -> pixeles del original
caja = tuple(round(v * K) for v in (1316-340, 800-340, 1316+340, 800+340))
nucleo = SRC.crop(caja).resize((1400, 1400), Image.LANCZOS)

# Luminancia normalizada: que el recorte use el rango entero, si no la rampa
# se queda en tres verdes y se pierde la textura.
luz = ImageOps.autocontrast(nucleo.convert('L'), cutoff=(1, 1))

# Caida de luz horneada: arriba-izquierda entra la luz, abajo-derecha se
# apaga. Sin esto la marca queda de un verde plano y se lee como un sticker;
# con esto tiene volumen y coincide con el halo que la puerta derrama fuera.
import math
px = luz.load(); W, H = luz.size
for y in range(H):
    for x in range(W):
        d = (x/W + y/H) / 2                 # 0 arriba-izq -> 1 abajo-der
        px[x, y] = min(255, round(px[x, y] * (1.10 - 0.28*d)))

# Degradado de mapa. El punto mas oscuro NO baja a negro: una marca con un
# cuadrante apagado se lee rota. El suelo es verde, ya oscuro pero verde.
PARADAS = [(0.00,(0x0E,0x6B,0x33)), (0.35,(0x16,0xA0,0x49)),
           (0.60,(0x1D,0xB9,0x54)), (0.82,(0x6F,0xE7,0xA6)),
           (1.00,(0xEA,0xFF,0xF2))]
rampa = []
for i in range(256):
    t = i / 255
    for j in range(len(PARADAS)-1):
        a, ca = PARADAS[j]; b, cb = PARADAS[j+1]
        if t <= b or j == len(PARADAS)-2:
            f = 0 if b == a else (t-a)/(b-a)
            f = min(max(f, 0), 1)
            rampa.append(tuple(round(ca[k] + (cb[k]-ca[k])*f) for k in range(3)))
            break
tabla = [c[0] for c in rampa] + [c[1] for c in rampa] + [c[2] for c in rampa]
verde = Image.merge('RGB', (luz, luz, luz)).point(tabla)
verde.save('nucleo.jpg', quality=94, optimize=True, progressive=True)

# ── 3 · LA MATERIA QUE SE INTERPONE ──────────────────────────────────────
# El defecto de la version anterior no era el color: era que la marca estaba
# PEGADA ENCIMA de la foto. Un hueco no se pega, se interpone.
# La foto misma da la solucion sin inventar nada: los pilares son POLVO, y la
# luz de una nebulosa los atraviesa a medias. Asi que donde hay pilar la
# marca se apaga hasta un 32% —no a cero: una mascara sucia con agujeros
# negros se lee como un error, una veladura se lee como materia— y donde hay
# cielo abierto va entera. Eso es lo que la mete DENTRO de la lamina.
from PIL import ImageFilter
import numpy as np

crop_f = tuple(round(v) for v in (976*ANCHO/2632, 460*ANCHO/2632,
                                  1656*ANCHO/2632, 1140*ANCHO/2632))
den = fondo.crop(crop_f).resize((1400, 1400), Image.LANCZOS).convert('L')
den = den.filter(ImageFilter.GaussianBlur(9))       # sin esto las estrellas
a = np.asarray(den, dtype=np.float32)               # perforan la marca
lo, hi = np.percentile(a, 12), np.percentile(a, 62)
t = np.clip((a - lo) / max(hi - lo, 1e-6), 0, 1)
t = t*t*(3 - 2*t)                                   # smoothstep: sin cantos
alfa = (0.32 + 0.68*t) * 255
Image.fromarray(alfa.astype('uint8'), 'L').save('polvo.png', optimize=True)
print('polvo.png  lo/hi', round(float(lo),1), round(float(hi),1))
print('nucleo.jpg', verde.size, 'recorte', caja)
