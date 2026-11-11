"""Urban Pest · el Excel de prospectos para entregarle al cliente.

   python3.13 urban-pest/prospectos/excel.py   (después de denue.mjs y de poner las distancias)

Carlos, 11 nov: «esa información también se le va a incluir al cliente: te
conseguimos todos estos contactos; tú te acercas con ellas y depende de ti».
Sale Empresas-Queretaro-Urban-Pest.xlsx: una hoja de presentación, la lista
ordenada por prioridad (giro, tamaño, cercanía a su bodega y si hay cómo
contactarla) con columnas para que él lleve su seguimiento, y un resumen.
"""
import json, pathlib
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

AQUI = pathlib.Path(__file__).parent
d = json.loads((AQUI / 'industria.json').read_text(encoding='utf-8'))
E = d['empresas']

PESO_GIRO = {'Industria alimentaria': 10, 'Bebidas': 9, 'Farmacéutica': 9, 'Hospitales': 8,
             'Bodegas y almacenes': 7, 'Mayoreo de alimentos': 7, 'Comedores industriales y banquetes': 6}
# las medianas primero: las gigantes casi siempre ya tienen contrato con una fumigadora grande
PESO_TAM = {'11 a 30 personas': 2, '31 a 50 personas': 4, '51 a 100 personas': 5, '101 a 250 personas': 5, '251 y más personas': 3}
def cerca(km):
    return 6 if km is not None and km < 15 else 4 if km is not None and km < 30 else 2 if km is not None and km < 50 else 0

for e in E:
    e['puntos'] = PESO_GIRO.get(e['giro'], 5) * 3 + PESO_TAM.get(e['personal'], 2) * 2 + cerca(e.get('km')) * 2 \
        + (2 if e.get('telefono') else 0) + (2 if e.get('correo') else 0)
E.sort(key=lambda e: -e['puntos'])
n = len(E)
for i, e in enumerate(E):
    e['nivel'] = 'Alta' if i < n * 0.25 else 'Media' if i < n * 0.6 else 'Baja'

VERDE = '0F7A57'; VERDE_SUAVE = 'E2F2EA'; GRIS = 'F5F7F6'; TINTA = '13201B'
fino = Side(style='thin', color='DFE5E2')
wb = Workbook()

# ── hoja 1: presentación ─────────────────────────────────────────────────────
h = wb.active; h.title = 'Léeme'
h.sheet_view.showGridLines = False
h.column_dimensions['A'].width = 4; h.column_dimensions['B'].width = 100
renglones = [
    ('Empresas de Querétaro que pueden contratarte', Font(size=20, bold=True, color=TINTA)),
    ('Investigación de Grupo Mazi para Urban Pest · noviembre de 2026', Font(size=12, color='5A6A63')),
    ('', None),
    (f'Te juntamos {n} empresas de Querétaro que necesitan control de plagas en regla: fábricas de alimentos y bebidas, '
     'farmacéuticas, hospitales, bodegas, distribuidores de comida y comedores industriales. Todas tienen más de 10 empleados.', None),
    ('', None),
    ('Cómo está ordenada', Font(size=13, bold=True, color=VERDE)),
    ('Arriba van las que más te conviene buscar primero: las del giro que más necesita fumigación, las de tamaño mediano '
     '(las muy grandes casi siempre ya tienen contrato con una fumigadora grande), las más cerca de tu bodega en Ciudad del Sol '
     'y las que traen teléfono o correo. La columna «Prioridad» te dice Alta, Media o Baja.', None),
    ('', None),
    ('Cómo usarla', Font(size=13, bold=True, color=VERDE)),
    ('1. Empieza por las de prioridad Alta. Toca el teléfono o el correo y se abre solo.', None),
    ('2. Pregunta por el encargado de calidad, de inocuidad o de mantenimiento: ellos deciden la fumigación.', None),
    ('3. Anota en «Contactado» y «Notas» cómo te fue, para no repetir llamadas.', None),
    ('4. Lo que más les importa a estas empresas es pasar sus auditorías: ofrece tus reportes de cada servicio.', None),
    ('', None),
    ('Nosotros te conseguimos los contactos; cerrar la venta ya depende de ti. ¡Éxito!', Font(size=12, bold=True, color=TINTA)),
    ('', None),
    ('Fuente: Directorio Estadístico Nacional de Unidades Económicas (DENUE), INEGI. Los datos son los que cada empresa registró; '
     'algunos teléfonos o correos pueden haber cambiado. La distancia es aproximada, por carretera, desde tu bodega.', Font(size=9, italic=True, color='5A6A63')),
]
for i, (t, f) in enumerate(renglones, start=2):
    c = h.cell(row=i, column=2, value=t); c.alignment = Alignment(wrap_text=True, vertical='top')
    if f: c.font = f
    h.row_dimensions[i].height = 18 if len(t) < 100 else 18 * (len(t) // 100 + 1)

# ── hoja 2: las empresas ─────────────────────────────────────────────────────
s = wb.create_sheet('Empresas')
cols = [('#', 5), ('Prioridad', 10), ('Empresa', 34), ('Razón social', 30), ('Giro', 22), ('Qué hace', 40),
        ('Empleados', 17), ('Km de tu bodega', 11), ('Teléfono', 15), ('Correo', 32), ('Página web', 26),
        ('Dirección', 44), ('Municipio', 16), ('Por qué te conviene', 50), ('Contactado', 12), ('Notas', 36)]
for j, (t, w) in enumerate(cols, start=1):
    c = s.cell(row=1, column=j, value=t)
    c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor=VERDE)
    c.alignment = Alignment(vertical='center', wrap_text=True); s.column_dimensions[get_column_letter(j)].width = w
s.row_dimensions[1].height = 30
COLOR_NIVEL = {'Alta': VERDE_SUAVE, 'Media': 'FBF0DC', 'Baja': GRIS}
for i, e in enumerate(E, start=2):
    tel = ''.join(ch for ch in (e.get('telefono') or '') if ch.isdigit())
    fila = [i - 1, e['nivel'], e['empresa'], e.get('razon_social', ''), e['giro'], e.get('actividad', ''), e['personal'],
            e.get('km'), e.get('telefono', ''), e.get('correo', ''), e.get('web', ''), e.get('direccion', ''),
            e.get('municipio', ''), e.get('porque', ''), '', '']
    for j, v in enumerate(fila, start=1):
        c = s.cell(row=i, column=j, value=v)
        c.alignment = Alignment(vertical='top', wrap_text=j in (6, 12, 14, 16)); c.border = Border(bottom=fino)
    s.cell(row=i, column=2).fill = PatternFill('solid', fgColor=COLOR_NIVEL[e['nivel']])
    s.cell(row=i, column=2).font = Font(bold=True)
    if tel:
        s.cell(row=i, column=9).hyperlink = 'tel:' + (tel if len(tel) > 10 else '52' + tel)
        s.cell(row=i, column=9).font = Font(color=VERDE, underline='single')
    if e.get('correo'):
        s.cell(row=i, column=10).hyperlink = 'mailto:' + e['correo']
        s.cell(row=i, column=10).font = Font(color=VERDE, underline='single')
    if e.get('web'):
        w = e['web'] if e['web'].startswith('http') else 'https://' + e['web']
        s.cell(row=i, column=11).hyperlink = w; s.cell(row=i, column=11).font = Font(color=VERDE, underline='single')
s.freeze_panes = 'D2'
s.auto_filter.ref = f'A1:{get_column_letter(len(cols))}{len(E) + 1}'

# ── hoja 3: resumen ──────────────────────────────────────────────────────────
r = wb.create_sheet('Resumen')
r.column_dimensions['A'].width = 36
for j in 'BCDE': r.column_dimensions[j].width = 14
enc = ['Giro', 'Empresas', 'Prioridad alta', 'Con teléfono', 'Con correo']
for j, t in enumerate(enc, start=1):
    c = r.cell(row=1, column=j, value=t); c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor=VERDE)
giros = sorted({e['giro'] for e in E}, key=lambda g: -sum(1 for e in E if e['giro'] == g))
for i, g in enumerate(giros + ['Total'], start=2):
    sub = E if g == 'Total' else [e for e in E if e['giro'] == g]
    vals = [g, len(sub), sum(e['nivel'] == 'Alta' for e in sub), sum(bool(e.get('telefono')) for e in sub), sum(bool(e.get('correo')) for e in sub)]
    for j, v in enumerate(vals, start=1):
        c = r.cell(row=i, column=j, value=v)
        if g == 'Total': c.font = Font(bold=True)

wb.active = 0
salida = AQUI / 'Empresas-Queretaro-Urban-Pest.xlsx'
wb.save(salida)
(AQUI / 'industria.json').write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding='utf-8')
print(f'{salida.name}: {n} empresas · alta {sum(e["nivel"] == "Alta" for e in E)} · '
      f'a menos de 30 km {sum(1 for e in E if (e.get("km") or 999) < 30)}')
print('primeras 8:'); [print(' ', e['nivel'], e['km'], 'km ·', e['empresa'][:38], '·', e['giro'], '·', e['personal']) for e in E[:8]]
