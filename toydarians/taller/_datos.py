#!/usr/bin/env python3
"""Arma el escaparate de Toydarians en un solo archivo autocontenido.

Por que un generador y no un HTML a mano: el catalogo son 47 piezas reales
sacadas del WooCommerce del cliente y las imagenes van embebidas como data URI
(el visor bloquea imagenes externas). Editar eso a mano seria imposible.
Los datos entran por activos/, el diseno vive aqui.
"""
import json, re, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ACT  = RAIZ / 'activos'
cat  = json.loads((ACT / 'catalogo-limpio.json').read_text(encoding='utf-8'))
img  = json.loads((ACT / 'assets.json').read_text(encoding='utf-8'))

def esc(s):
    return (str(s).replace('&','&amp;').replace('<','&lt;')
                  .replace('>','&gt;').replace('"','&quot;'))

def num(vc):
    m = re.match(r'(\d+)([A-Z]?)', vc)
    return int(m.group(1))

# --- Las celdas de la vitrina -------------------------------------------------
# El color de cada celda NO es decorativo: es la mediana medida del fondo del
# render de Hasbro correspondiente. Cada figura trae su propia luz.
CELDAS = [
    ('p1', None,  'Multipack',              'Tres figuras, un solo carton'),
    ('p2', None,  'Darth Maul',             'Sable doble, manto de malla'),
    ('p3', None,  'Trio',                   'Dark trooper, Kenobi, Jawa'),
    ('p4', '357', 'Obi-Wan Kenobi',         'Jedi Legend'),
    ('p5', '301', 'Darth Revan',            'Knights of the Old Republic'),
]

