#!/usr/bin/env python3
"""Baja las fotos de las categorias nuevas y las deja como las que ya hay.

Todas las fotos del escaparate son WebP de 680x680. El cuadrado no es
estetica: la relacion de aspecto esta fijada en el CSS, asi que una foto que
no sea cuadrada descuadra la rejilla o se recorta sola. Como las de la tienda
vienen en cualquier proporcion, se encajan enteras y se rellena el sobrante
con el color del borde de la propia foto —no con blanco—: sobre fondo tinta,
un marco blanco se ve como un error.
"""
import json, pathlib, urllib.request, io, time, collections
from PIL import Image

AQUI  = pathlib.Path(__file__).resolve().parent
DESTI = pathlib.Path('/home/user/mazi-central/toydarians/fotos')
LADO  = 680
CLAVE = {'funko': 'fk', '3d-print': '3d'}

def traer(url, reintentos=4):
    for i in range(reintentos):
        try:
            pet = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(pet, timeout=90) as r: return r.read()
        except Exception:
            if i == reintentos - 1: raise
            time.sleep(2 ** i)

def borde(im):
    """El color mas repetido del marco de 6px. La mediana del fondo, vamos."""
    m = im.convert('RGB').resize((64, 64))
    px = list(m.getdata()); w = 64
    marco = [px[y*w + x] for y in range(w) for x in range(w)
             if x < 3 or y < 3 or x > w-4 or y > w-4]
    return collections.Counter(marco).most_common(1)[0][0]

def cuadrar(datos):
    im = Image.open(io.BytesIO(datos))
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        fondo = Image.new('RGB', im.size, borde(im))
        fondo.paste(im, mask=im.split()[-1]); im = fondo
    else:
        im = im.convert('RGB')
    im.thumbnail((LADO, LADO), Image.LANCZOS)
    lienzo = Image.new('RGB', (LADO, LADO), borde(im))
    lienzo.paste(im, ((LADO - im.width) // 2, (LADO - im.height) // 2))
    return lienzo

crudo = json.loads((AQUI / 'crudo.json').read_text(encoding='utf-8'))
salida = {}
for cat, piezas in crudo.items():
    pre = CLAVE[cat]
    for i, p in enumerate(piezas, 1):
        clave = f'{pre}{i}'
        nombres = []
        for j, u in enumerate(p['fotos']):
            destino = DESTI / f'{clave}-{j}.webp'
            try:
                cuadrar(traer(u)).save(destino, 'WEBP', quality=82, method=6)
            except Exception as e:
                print(f'   ✗ {clave}-{j}  {u.split("/")[-1]}  {e}', flush=True); continue
            nombres.append(destino.name)
        p['clave'] = clave; p['archivos'] = nombres
        kb = sum((DESTI / n).stat().st_size for n in nombres) // 1024
        print(f'{clave:<5} {p["nombre"][:46]:<46} {len(nombres)} fotos  {kb} KB', flush=True)
    salida[cat] = piezas

(AQUI / 'listo.json').write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding='utf-8')
print('\nescrito listo.json')
