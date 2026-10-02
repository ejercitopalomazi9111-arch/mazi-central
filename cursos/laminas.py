# Saca las láminas de cada «para celular» en orden, como JPG de 1600 px, para
# el visor (cursos/ver.html). Se corre desde la raíz: python3 cursos/laminas.py
import zipfile, re, io, os, sys
from PIL import Image
for c in ['principal','brigada','acuatica']:
    z = zipfile.ZipFile(f'cursos/archivos/{c}-celular.pptx')
    pres = z.read('ppt/presentation.xml').decode()
    prels = z.read('ppt/_rels/presentation.xml.rels').decode()
    ids = re.findall(r'<p:sldId [^>]*r:id="([^"]+)"', pres)
    tgt = dict(re.findall(r'Id="([^"]+)"[^>]*Target="([^"]+)"', prels)) | {a:b for b,a in re.findall(r'Target="([^"]+)"[^>]*Id="([^"]+)"', prels)}
    dest = f'cursos/archivos/{c}'; os.makedirs(dest, exist_ok=True)
    for f in os.listdir(dest): os.remove(os.path.join(dest,f))
    n=0; total=0
    for i, rid in enumerate(ids, 1):
        s = tgt[rid].split('/')[-1]
        rels = z.read(f'ppt/slides/_rels/{s}.rels').decode()
        imgs = [t for t in re.findall(r'Target="\.\./media/([^"]+)"', rels)]
        assert len(imgs)==1, (c, s, imgs)
        im = Image.open(io.BytesIO(z.read('ppt/media/'+imgs[0]))).convert('RGB')
        im = im.resize((1600, round(im.height*1600/im.width)), Image.LANCZOS)
        p = f'{dest}/{i:02d}.jpg'; im.save(p, 'JPEG', quality=80, optimize=True, progressive=True)
        n+=1; total+=os.path.getsize(p)
    print(c, n, 'láminas', round(total/1e6,1), 'MB', im.size)
