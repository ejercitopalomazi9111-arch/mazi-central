#!/usr/bin/env python3
"""Deja lo raspado en la forma que consume el generador, y NADA MAS.

El generador no debe saber como es el HTML de WooCommerce. Aqui se parte el
nombre largo de la tienda —«Funko Pop! Movies: Back to the Future - Marty
1955»— en lo que la ficha necesita: el nombre de la pieza y su linea.
"""
import json, re, pathlib

AQUI = pathlib.Path(__file__).resolve().parent
DEST = pathlib.Path('/home/user/mazi-central/toydarians/taller/activos')
d = json.loads((AQUI / 'listo.json').read_text(encoding='utf-8'))

PREFIJOS = re.compile(r'^\s*(funko|pop!?)\s*(pop!?)?\s*(movies|television|tv)?\s*[:–\-]?\s*', re.I)
COLA3D   = re.compile(r'\s*[–\-]\s*3d\s*print\s*$', re.I)

def partes(t):
    """Separa por guiones largos o cortos, respetando los que van pegados."""
    return [x.strip() for x in re.split(r'\s+[–\-]\s+', t) if x.strip()]

# Los nombres de la tienda no siguen una sola plantilla, asi que el corte
# automatico acierta en siete de ocho. El octavo se corrige a mano en vez de
# inventar una regla que lo cuadre: son quince productos, no quinientos, y una
# regla retorcida para un caso se rompe con el proximo que suban.
A_MANO = {
    'fk3': ('The Mandalorian & The Child', 'The Mandalorian'),
    # La tienda lo titula «Trono Boba Fett – Jabba's Palace – The Book Of Boba
    # Fett». Con las dos mitades como linea, la chapa medía 38 caracteres y se
    # salia de la pantalla del telefono, ademas de partir en dos una serie que
    # solo tiene dos piezas. La pelicula es la linea; el palacio, el nombre.
    '3d6': ("Trono de Boba Fett · Jabba's Palace", 'The Book of Boba Fett'),
}

def funko(nombre):
    t = nombre
    for _ in range(3):                      # «Funko – Pop! Movies: …» lleva dos
        t2 = PREFIJOS.sub('', t).strip()
        if t2 == t: break
        t = t2
    p = partes(t)
    if len(p) >= 2:
        # el ultimo trozo es la pieza; lo de delante, la linea
        return p[-1], ' · '.join(p[:-1])
    return t, 'Funko Pop!'

def tresd(nombre):
    p = partes(COLA3D.sub('', nombre))
    if len(p) >= 2: return p[0], ' · '.join(p[1:])
    return p[0] if p else nombre, 'Impresión 3D'

def nota(desc):
    """Lo que la TIENDA dice de la pieza y el comprador necesita saber.

    Nada de esto se redacta: se recorta de la descripcion del cliente. Dos
    cosas importan y ninguna se puede suponer:

    · «NO INCLUYE FIGURA» — lo dicen TRES de las siete, no las siete. Ponerlo
      en las siete seria inventar una condicion de venta; quitarlo de las tres
      seria esconder la que hay. Va pieza por pieza, como esta escrito.
    · El plazo — ese si lo dicen todas, y es la razon por la que estas piezas
      no tienen precio fijo: se imprimen por encargo.
    """
    trozos = []
    if re.search(r'NO\s+INCLUYE\s+FIGURA', desc, re.I):
        trozos.append('No incluye la figura.')
    # La lista de «Incluye:» NO se copia. En la tienda va en renglones y al
    # quitar las etiquetas se queda en una tira sin separar —«Trono Boba Fett
    # Dos pedestales frontales Mesa para holograma»—, y ademas alguna llega
    # cortada a mitad de palabra. Mejor no decirlo que decirlo mal: es la
    # descripcion de venta de un cliente, no texto de relleno.
    if re.search(r'reservar y entregar', desc):
        trozos.append('Si no hay existencia se reserva: unos 4 días sin pintar, '
                      '5 pintado.')
    return ' '.join(trozos)

sal = {}
for cat, piezas in d.items():
    out = []
    for p in piezas:
        nom, serie = (funko if cat == 'funko' else tresd)(p['nombre'])
        nom, serie = A_MANO.get(p['clave'], (nom, serie))
        # la tienda escribe «Back to The Future» y «Back to the Future»: dos
        # chapas distintas para la misma linea, y el filtro las separaria
        serie = re.sub(r'\bThe Future\b', 'the Future', serie)
        serie = re.sub(r'\bOf\b', 'of', serie)
        out.append({
            'clave': p['clave'], 'nombre': nom, 'serie': serie,
            'url': p['url'], 'fotos': p['archivos'],
            'precio': p['precio'], 'stock': p['stock'] or 'disponible',
            'nota': nota(p['descripcion']) if cat == '3d-print' else '',
        })
    out.sort(key=lambda x: (x['serie'], x['nombre']))
    sal[cat] = out
    print('==', cat)
    for o in out:
        print(f'   {o["clave"]:<4} {o["nombre"][:34]:<34} · {o["serie"][:34]:<34} '
              f'{("$"+format(o["precio"],",.0f")) if o["precio"] else "a consultar":>12}  {len(o["fotos"])}f')

# un archivo por categoria: dos personas añadiendo dos categorias distintas
# no tocan el mismo archivo y no chocan al empujar
for cat, piezas in sal.items():
    f = DEST / f'cat-{cat}.json'
    f.write_text(json.dumps(piezas, ensure_ascii=False, indent=1), encoding='utf-8')
    print('escrito', f.name)
