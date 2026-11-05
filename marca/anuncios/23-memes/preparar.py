"""LO QUE NO VA AL REPO DE LOS MEMES 23: el fuego (clips de Mixkit sobre negro, en cuadros de 512 px a 30 por
segundo, para pintarlos con mezcla aditiva) y los efectos de sonido (Mixkit). Licencia Mixkit: uso comercial
libre, sin crédito obligatorio, pero no se reparte el archivo suelto; por eso se bajan aquí y no se suben.
    python3 marca/anuncios/23-memes/preparar.py"""
import os, subprocess, urllib.request, json
AQUI = os.path.dirname(os.path.abspath(__file__)); CL = '/tmp/claude-0/fuego/hd'; os.makedirs(CL, exist_ok=True)
H = {'User-Agent': 'Mozilla/5.0', 'Referer': 'https://mixkit.co/'}
def bajar(url, dst):
  if os.path.exists(dst) and os.path.getsize(dst) > 5000: return dst
  with urllib.request.urlopen(urllib.request.Request(url, headers=H)) as r, open(dst, 'wb') as o: o.write(r.read())
  return dst
FUEGO = {  # nombre: (clip, calidad, desde, dura, recorte)
  'llamas': ('52312', '1080', 1.0, 4.0, 'crop=ih:ih:(iw-ih)/2:0'),
  'fogata': ('45676', '720', 2.0, 4.0, 'crop=ih:ih:(iw-ih)/2:0'),
  'bola':   ('48288', '720', 0.0, 2.6, 'crop=ih:ih:(iw-ih)/2:0'),
  'brasas': ('4426',  '1080', 0.5, 4.0, 'crop=ih:ih:(iw-ih)/2:0'),
}
idx = {}
for n, (c, q, d, du, cr) in FUEGO.items():
  src = bajar(f'https://assets.mixkit.co/videos/{c}/{c}-{q}.mp4', f'{CL}/{c}.mp4'); out = f'{AQUI}/fx/{n}'; os.makedirs(out, exist_ok=True)
  for f in os.listdir(out): os.remove(f'{out}/{f}')
  subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(d), '-t', str(du), '-i', src, '-vf', f'{cr},scale=512:512,fps=30', '-q:v', '3', f'{out}/%05d.jpg'], check=True)
  idx[n] = len(os.listdir(out)); print('✓', n, idx[n])
json.dump(idx, open(f'{AQUI}/fx/indice.json', 'w'))
SFX = {'explota': 2782, 'explota2': 1687, 'boom': 490, 'grito': 391, 'grito2': 1966, 'grito3': 1770, 'fuego': 1330, 'rayo': 1287, 'rayo2': 1681, 'golpe': 2155, 'golpe2': 2047, 'tirar': 1694}
os.makedirs(f'{AQUI}/sfx', exist_ok=True)
for n, i in SFX.items(): bajar(f'https://assets.mixkit.co/active_storage/sfx/{i}/{i}-preview.mp3', f'{AQUI}/sfx/{n}.mp3'); print('✓', n)
