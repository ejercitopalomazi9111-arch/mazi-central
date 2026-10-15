#!/usr/bin/env python3
"""TIRAJE · ver muchos cuadros de una animación en una sola hoja.

Pedido por Carlos el 15 de octubre: «haz que donde estás haciendo la animación
te dé un archivo con cada frame separado y puestos todos en un tiraje, como lo
que haces para las presentaciones, y así puedes ver bonches de frames en una
sola imagen».

Toma una carpeta de cuadros (00000.jpg, 00001.jpg…) o un video, y arma hojas
con un cuadro cada N, con su segundo escrito encima. Así se revisa una
animación entera mirando cuatro o cinco imágenes en vez de reproducirla.

    python3 herramientas/tiraje.py CUADROS_O_VIDEO SALIDA [--cada 6] [--fps 30]
                                   [--por-hoja 48] [--columnas 8] [--ancho 300]
                                   [--desde 0] [--hasta 999]

  --cada      un cuadro de cada N (6 a 30 fps = 5 por segundo)
  --por-hoja  cuántos cuadros por hoja; salen hoja-01.jpg, hoja-02.jpg…
  --desde/--hasta  sólo un tramo, en segundos

De un video, primero saca TODOS los cuadros a SALIDA/cuadros/ (cada uno
separado, como pidió Carlos) y luego arma las hojas.
"""
import argparse, glob, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

def letra(tam):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf']:
        if os.path.exists(f): return ImageFont.truetype(f, tam)
    return ImageFont.load_default()

def main():
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument('origen'); a.add_argument('salida')
    a.add_argument('--cada', type=int, default=6); a.add_argument('--fps', type=float, default=30)
    a.add_argument('--por-hoja', type=int, default=48); a.add_argument('--columnas', type=int, default=8)
    a.add_argument('--ancho', type=int, default=300)
    a.add_argument('--desde', type=float, default=0); a.add_argument('--hasta', type=float, default=1e9)
    o = a.parse_args()
    os.makedirs(o.salida, exist_ok=True)
    if os.path.isdir(o.origen):
        cuadros = sorted(glob.glob(os.path.join(o.origen, '*.jpg')) + glob.glob(os.path.join(o.origen, '*.png')))
    else:
        dst = os.path.join(o.salida, 'cuadros'); os.makedirs(dst, exist_ok=True)
        try:
            import imageio_ffmpeg; ff = imageio_ffmpeg.get_ffmpeg_exe()
        except Exception: ff = 'ffmpeg'
        subprocess.run([ff, '-y', '-v', 'error', '-i', o.origen, '-vf', f'fps={o.fps}', '-q:v', '3', os.path.join(dst, '%05d.jpg')], check=True)
        cuadros = sorted(glob.glob(os.path.join(dst, '*.jpg')))
    if not cuadros: sys.exit('no hay cuadros en ' + o.origen)
    elegidos = [(i, f) for i, f in enumerate(cuadros) if i % o.cada == 0 and o.desde <= i / o.fps <= o.hasta]
    f0 = Image.open(elegidos[0][1]); W = o.ancho; H = round(W * f0.height / f0.width)
    fuente = letra(max(12, W // 16))
    hojas = []
    for h in range(0, len(elegidos), o.por_hoja):
        lote = elegidos[h:h + o.por_hoja]; filas = (len(lote) + o.columnas - 1) // o.columnas
        hoja = Image.new('RGB', (o.columnas * (W + 6) + 6, filas * (H + 6) + 6), '#202020')
        for k, (i, f) in enumerate(lote):
            im = Image.open(f).convert('RGB').resize((W, H))
            d = ImageDraw.Draw(im); txt = f'{i / o.fps:.2f}s'
            d.rectangle([0, 0, d.textlength(txt, font=fuente) + 10, fuente.size + 8], fill=(0, 0, 0))
            d.text((5, 3), txt, font=fuente, fill=(255, 220, 120))
            hoja.paste(im, (6 + (k % o.columnas) * (W + 6), 6 + (k // o.columnas) * (H + 6)))
        p = os.path.join(o.salida, f'hoja-{len(hojas) + 1:02d}.jpg'); hoja.save(p, quality=82); hojas.append(p)
    print(f'{len(cuadros)} cuadros · {len(elegidos)} en {len(hojas)} hojas → {o.salida}')

if __name__ == '__main__':
    main()
