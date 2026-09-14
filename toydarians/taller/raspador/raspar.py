#!/usr/bin/env python3
"""Trae de la tienda las categorias que el escaparate todavia no tiene.

Por que raspar y no pedir el JSON: la tienda es WooCommerce pero tiene la
Store API apagada (/wp-json/wc/store/v1 devuelve 404), asi que el unico
sitio donde el precio, las existencias y la galeria estan juntos y bien es
el JSON-LD que el propio WooCommerce imprime en cada ficha. Eso es dato
estructurado del comercio, no HTML adivinado.

Ojo con el parametro: la categoria es ?product_cat=, no ?product-category=.
Con el guion la tienda devuelve 200 y la portada, asi que una categoria
inexistente parece tener 8 productos que son de otra.
"""
import json, re, html, sys, pathlib, urllib.request, time

BASE = 'https://www.toydarians.com/'
SAL  = pathlib.Path(__file__).resolve().parent
CATS = sys.argv[1:] or ['funko', '3d-print']

def traer(url, reintentos=4):
    for i in range(reintentos):
        try:
            pet = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(pet, timeout=60) as r:
                return r.read().decode('utf-8', 'replace')
        except Exception as e:
            if i == reintentos - 1: raise
            time.sleep(2 ** i)

def fichas_de(cat):
    s = traer(f'{BASE}?product_cat={cat}')
    vistos, out = set(), []
    for u, n in re.findall(r'class="name product-title[^"]*"><a href="([^"]+)">(.*?)</a>', s):
        if u in vistos: continue
        vistos.add(u); out.append((u, html.unescape(re.sub('<[^>]+>', '', n))))
    return out

def producto(url):
    s = traer(url)
    prod = None
    for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
        try: d = json.loads(m)
        except Exception: continue
        for nodo in d.get('@graph', [d]):
            if nodo.get('@type') == 'Product': prod = nodo
    if not prod: return None
    of = prod.get('offers') or [{}]
    of = of[0] if isinstance(of, list) else of
    disp = str(of.get('availability', ''))
    # LA GALERIA SALE DE data-thumb, Y ESO NO ES UN DETALLE.
    # Primero la busque recortando entre «woocommerce-product-gallery» y el
    # primer </figure>. Esa cadena aparece antes en un <noscript> del <head>,
    # asi que el recorte empezaba arriba del todo y se tragaba la cabecera y
    # el carrusel de «productos relacionados»: los 15 productos salian con el
    # logo de la tienda, el grafico aurebesh del pie y fotos de OTROS
    # productos. Parecia bien —seis fotos cada uno— y era falso.
    # `data-thumb` lo pone WooCommerce una vez por diapositiva de la galeria
    # de ESTE producto, en orden, y no existe en ningun otro sitio de la
    # pagina. Se le quita el sufijo -100x100 para pedir el original.
    fotos, vistos = [], set()
    for t in re.findall(r'data-thumb="([^"]+)"', s):
        base = re.sub(r'-\d+x\d+(\.\w+)$', r'\1', t)
        if base not in vistos: vistos.add(base); fotos.append(base)
    desc = html.unescape(re.sub('<[^>]+>', ' ', str(prod.get('description') or '')))
    return {
        # doble unescape: WooCommerce mete el nombre ya escapado DENTRO del
        # JSON-LD, asi que «&» llega como «&amp;amp;» y una sola pasada deja
        # «Mandalorian &amp; The Child» a la vista del cliente.
        'nombre': html.unescape(html.unescape(str(prod.get('name') or ''))),
        'url': url,
        'sku': prod.get('sku'),
        'descripcion': re.sub(r'\s+', ' ', desc).strip()[:1400],
        'precio': float(of.get('price')) if of.get('price') else None,
        'moneda': of.get('priceCurrency') or 'MXN',
        'stock': 'disponible' if 'InStock' in disp else ('agotado' if 'OutOfStock' in disp else None),
        'fotos': fotos[:6],
    }

todo = {}
for c in CATS:
    fichas = fichas_de(c)
    print(f'{c}: {len(fichas)} fichas', flush=True)
    piezas = []
    for u, n in fichas:
        p = producto(u)
        if not p:
            print('   SIN JSON-LD:', u, flush=True); continue
        p['slug'] = u.split('product=')[-1]
        piezas.append(p)
        print(f'   {p["nombre"][:52]:<52} {p["precio"]} {p["stock"]} {len(p["fotos"])} fotos', flush=True)
    todo[c] = piezas

(SAL / 'crudo.json').write_text(json.dumps(todo, ensure_ascii=False, indent=1), encoding='utf-8')
print('\nescrito crudo.json')
