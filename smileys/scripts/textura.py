# -*- coding: utf-8 -*-
"""Baldosa de ingredientes esparcidos al azar.

Cada pieza que cruza un borde se vuelve a pintar en el borde opuesto, así la
baldosa empalma consigo misma sin espejo y sin costura: el ojo lee reparto
aleatorio, no patrón.
"""
from PIL import Image, ImageDraw, ImageFilter
import random, math, os

S = 1800           # se dibuja al doble y se reduce: bordes limpios
FINAL = 900
rnd = random.Random(20261003)

def anillo(d, color, grosor):
    """Aro: se construye por máscara para que el hueco sea transparente."""
    cap = Image.new('RGBA', (d, d), (0,0,0,0))
    m = Image.new('L', (d, d), 0)
    md = ImageDraw.Draw(m)
    md.ellipse((0,0,d-1,d-1), fill=255)
    md.ellipse((grosor,grosor,d-1-grosor,d-1-grosor), fill=0)
    cap.paste(Image.new('RGBA',(d,d),color), (0,0), m)
    return cap

def pepperoni(d):
    c = Image.new('RGBA',(d,d),(0,0,0,0)); g = ImageDraw.Draw(c)
    g.ellipse((0,0,d-1,d-1), fill=(181,51,31,255), outline=(126,30,14,255), width=max(1,d//16))
    for _ in range(rnd.randint(4,7)):
        r = rnd.uniform(.05,.11)*d
        a, dd = rnd.uniform(0,6.28), rnd.uniform(0,.3)*d
        x, y = d/2+math.cos(a)*dd, d/2+math.sin(a)*dd
        g.ellipse((x-r,y-r,x+r,y+r), fill=(128,32,16,255))
    return c

def aceituna(d):
    return anillo(d, (46,42,48,255), max(2,int(d*0.28)))

def jalapeno(d):
    c = anillo(d, (76,140,54,255), max(2,int(d*0.22)))
    g = ImageDraw.Draw(c); k = int(d*0.30)
    g.ellipse((k,k,d-1-k,d-1-k), fill=(222,232,196,230))
    return c

def albahaca(d):
    c = Image.new('RGBA',(d,d),(0,0,0,0)); g = ImageDraw.Draw(c)
    g.polygon([(d*0.5,0),(d*0.92,d*0.42),(d*0.5,d),(d*0.08,d*0.42)], fill=(63,124,52,255))
    g.line([(d*0.5,d*0.08),(d*0.5,d*0.92)], fill=(44,92,36,255), width=max(1,d//18))
    for i in range(3):
        y = d*(0.3+i*0.2)
        g.line([(d*0.5,y),(d*0.78,y+d*0.12)], fill=(44,92,36,210), width=max(1,d//26))
        g.line([(d*0.5,y),(d*0.22,y+d*0.12)], fill=(44,92,36,210), width=max(1,d//26))
    return c

def champinon(d):
    c = Image.new('RGBA',(d,d),(0,0,0,0)); g = ImageDraw.Draw(c)
    g.pieslice((0,0,d-1,d*1.15), 180, 360, fill=(216,196,160,255))
    g.rectangle((d*0.36,d*0.52,d*0.64,d*0.95), fill=(190,170,134,255))
    g.arc((0,0,d-1,d*1.15), 180, 360, fill=(166,146,112,255), width=max(1,d//20))
    return c

def jitomate(d):
    c = Image.new('RGBA',(d,d),(0,0,0,0)); g = ImageDraw.Draw(c)
    g.ellipse((0,0,d-1,d-1), fill=(200,64,44,255))
    g.ellipse((d*.2,d*.2,d*.8,d*.8), fill=(232,137,116,255))
    for i in range(5):
        a = i*1.256+rnd.uniform(-.2,.2); rr=d*0.26
        x,y = d/2+math.cos(a)*rr, d/2+math.sin(a)*rr
        g.ellipse((x-d*.05,y-d*.07,x+d*.05,y+d*.07), fill=(245,205,150,255))
    return c

def queso(d):
    c = Image.new('RGBA',(d,d),(0,0,0,0)); g = ImageDraw.Draw(c)
    g.rounded_rectangle((d*.08,d*.22,d*.92,d*.78), radius=d*0.12, fill=(242,221,154,255))
    g.line([(d*.2,d*.42),(d*.8,d*.42)], fill=(221,196,121,255), width=max(1,d//22))
    return c

def cebolla(d):
    c = Image.new('RGBA',(d,d),(0,0,0,0)); g = ImageDraw.Draw(c)
    w = max(2,int(d*0.12)); a0 = rnd.uniform(0,360)
    g.arc((0,0,d-1,d-1), a0, a0+210, fill=(237,229,216,255), width=w)
    k = int(d*0.22)
    g.arc((k,k,d-1-k,d-1-k), a0+20, a0+170, fill=(224,214,198,230), width=max(1,w-1))
    return c

def pina(d):
    c = Image.new('RGBA',(d,d),(0,0,0,0)); g = ImageDraw.Draw(c)
    g.rounded_rectangle((d*.1,d*.1,d*.9,d*.9), radius=d*0.22, fill=(240,195,62,255))
    g.line([(d*.1,d*.5),(d*.9,d*.5)], fill=(212,163,24,255), width=max(1,d//12))
    g.line([(d*.5,d*.1),(d*.5,d*.9)], fill=(212,163,24,200), width=max(1,d//16))
    return c

def oregano(d):
    c = Image.new('RGBA',(d,d),(0,0,0,0)); g = ImageDraw.Draw(c)
    for _ in range(rnd.randint(5,8)):
        x,y = rnd.uniform(0,d), rnd.uniform(0,d); r = d*rnd.uniform(.07,.13)
        g.ellipse((x-r,y-r,x+r,y+r), fill=(74,95,46,255))
    return c

def pimiento(d):
    c = Image.new('RGBA',(d,d),(0,0,0,0)); g = ImageDraw.Draw(c)
    a0 = rnd.uniform(0,360)
    g.arc((0,0,d-1,d-1), a0, a0+140, fill=(63,140,80,255), width=max(3,int(d*0.26)))
    return c

PIEZAS = [(pepperoni,14),(albahaca,9),(aceituna,9),(champinon,9),(jalapeno,8),
          (jitomate,8),(queso,8),(cebolla,7),(pina,6),(oregano,7),(pimiento,6)]
bolsa = []
for fn, peso in PIEZAS: bolsa += [fn]*peso

capa    = Image.new('RGBA',(S,S),(0,0,0,0))
sombras = Image.new('RGBA',(S,S),(0,0,0,0))

N = 190
for _ in range(N):
    fn = rnd.choice(bolsa)
    d = int(rnd.uniform(0.042, 0.095) * S)
    pieza = fn(d).rotate(rnd.uniform(0,360), resample=Image.BICUBIC, expand=True)
    silueta = Image.new('RGBA', pieza.size, (0,0,0,255))
    silueta.putalpha(pieza.getchannel('A'))
    x, y = rnd.randrange(S), rnd.randrange(S)
    # envoltura: las nueve posiciones cierran los bordes de la baldosa
    for dx in (-S,0,S):
        for dy in (-S,0,S):
            sombras.alpha_composite(silueta, dest=(0,0), source=(0,0)) if False else None
            px, py = x+dx, y+dy
            if px < -pieza.width or px > S or py < -pieza.height or py > S: continue
            sombras.paste(silueta, (px+int(d*0.10), py+int(d*0.13)), silueta)
            capa.paste(pieza, (px, py), pieza)

sombras = sombras.filter(ImageFilter.GaussianBlur(S*0.006))
sombras.putalpha(sombras.getchannel('A').point(lambda v: int(v*0.42)))

final = Image.alpha_composite(sombras, capa).resize((FINAL,FINAL), Image.LANCZOS)
final.save('img/textura.png','PNG',optimize=True)
print('textura.png', final.size, os.path.getsize('img/textura.png')//1024, 'KB ·', N, 'piezas esparcidas')

# vista sobre el negro de la página, para juzgarla como se verá
fondo = Image.new('RGBA',(FINAL,FINAL),(9,9,11,255))
Image.alpha_composite(fondo, final).convert('RGB').save('ojo-textura.jpg', quality=90)
