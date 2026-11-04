# LAS FOTOS DE GERALDMED, LISTAS PARA LOS ANUNCIOS: las de Carlos (4 nov) con los logos ajenos borrados
# (patrocinadores del torneo, la gorra, el letrero del club, el coche del fondo: «no muestres otros logos»),
# y el logo de Geraldmed con fondo transparente (venía menta sobre negro: se des-premultiplica).
#   python3 marca/anuncios/geraldmed/preparar.py <carpeta de las fotos originales>
import sys, os
from PIL import Image, ImageFilter, ImageDraw
SRC, AQUI = sys.argv[1], os.path.dirname(os.path.abspath(__file__))
def abre(n): return Image.open(next(os.path.join(SRC, f) for f in os.listdir(SRC) if f.startswith(n))).convert('RGB')
def borra(im, cajas, r=28):
    for (x0, y0, x1, y1) in cajas:
        m = Image.new('L', im.size, 0); ImageDraw.Draw(m).rounded_rectangle((x0, y0, x1, y1), radius=18, fill=255)
        m = m.filter(ImageFilter.GaussianBlur(10)); im = Image.composite(im.filter(ImageFilter.GaussianBlur(r)), im, m)
    return im
FOTOS = {
  'espaldas-cancha': ('0d7ddb4c', [(150, 925, 560, 1050), (1100, 935, 1512, 1045), (0, 1020, 150, 1670), (140, 1180, 530, 1430)]),
  'flores':          ('edfd8ed2', []),
  'pulgares':        ('786719e3', [(325, 255, 480, 300), (1275, 180, 1330, 225), (190, 320, 430, 540)]),
  'espaldas-1':      ('9ecce862', [(0, 1040, 60, 1160)]),
  'espaldas-2':      ('1df613b4', [(280, 325, 400, 370), (190, 350, 430, 530)]),
  'saludo':          ('c6db8437', [(320, 465, 475, 505), (1085, 345, 1140, 395), (170, 560, 420, 730)]),
  'de-frente':       ('1679c115', [(0, 575, 90, 610), (805, 780, 1010, 860), (0, 600, 210, 800)]),
  # las del curso que dan (mandadas el mismo día, «más imágenes viejitas»): la playera y el cartel, sin marcas ajenas
  'curso-playera':   ('b74bedf7', []),
  'curso-cartel':    ('45f57a86', []),
}
for nombre, (f, cajas) in FOTOS.items():
    borra(abre(f), cajas).save(os.path.join(AQUI, 'fotos', nombre + '.jpg'), quality=88)
# el logo y la línea del pulso: menta sobre negro → transparente con su mismo color
def transparente(im):
    im = im.convert('RGB'); px = im.load(); out = Image.new('RGBA', im.size); po = out.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            r, g, b = px[x, y]; a = max(r, g, b)
            po[x, y] = (0, 0, 0, 0) if a < 14 else (min(255, r * 255 // a), min(255, g * 255 // a), min(255, b * 255 // a), a)
    return out
transparente(abre('1485fc53')).save(os.path.join(AQUI, 'marca', 'estrella.png'))
transparente(abre('b07616a4')).save(os.path.join(AQUI, 'marca', 'pulso.png'))
abre('dba2f4ed').save(os.path.join(AQUI, 'marca', 'ambulancia.jpg'), quality=92)
print('✓ fotos y logo')
