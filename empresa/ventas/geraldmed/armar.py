"""GERALDMED · prospectos para vender cobertura médica de eventos (Carlos, 14 nov: «ármame prospectos pero para GERALDMED»).

   python3.13 empresa/ventas/geraldmed/armar.py [/tmp/claude-0/gm/geraldmed.jsonl]

De dónde salen: lo que bajó buscar.mjs de Google Maps (salones, organizadores, foros, deporte, escuelas, empresas y
turismo en Querétaro, Corregidora y El Marqués). Aquí se quitan repetidos y los que no tienen teléfono, se ordenan
por quién hace más eventos, y a cada uno se le pone qué ofrecerle y un WhatsApp con el mensaje ya escrito.

Sólo dice lo que Carlos dijo de GERALDMED (secre/conocimiento/geraldmed.md): paramédicos a pie entre la gente,
ambulancia de urgencias básicas en el lugar, cursos, y elementos elegidos con cuidado. NADA de precios (se cotizan
por evento) ni certificaciones.
El Excel sale en clientes/ (no se sube al repo: nombres y teléfonos de negocios).
"""
import json, math, re, sys, pathlib, urllib.parse
from collections import Counter
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.table import Table, TableStyleInfo

RAIZ = pathlib.Path(__file__).resolve().parents[3]
ENTRADA = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/gm/geraldmed.jsonl')
SALIDA = RAIZ / 'clientes/Prospectos-GERALDMED.xlsx'
CONTACTO = '442 394 2306'

COBERTURA = 'Cobertura del evento: paramédicos a pie entre la gente + ambulancia de urgencias básicas en el lugar'
CURSOS = 'Curso para su personal (p. ej. «Extracción vehicular y manejo del paciente prensado») + cobertura de sus eventos'
# giro → (peso para ordenar, qué ofrecer, gancho, para qué lo usan en el mensaje)
GIROS = {
  'Organizadores':        (10, COBERTURA, 'Arman eventos cada semana: un aliado médico fijo les quita un pendiente a cada cliente.', 'los eventos que organizan'),
  'Salones y jardines':   (9, COBERTURA, 'Lo pueden ofrecer como servicio extra en cada paquete: bodas, XV años y graduaciones.', 'los eventos de su salón'),
  'Foros y espectáculos': (9, COBERTURA, 'Conciertos y funciones con mucha gente: el público se siente cuidado y el foro, protegido.', 'sus conciertos y funciones'),
  'Deporte':              (8, COBERTURA, 'Torneos, carreras y partidos: las lesiones pasan; mejor tener a alguien ahí mismo.', 'sus torneos y partidos'),
  'Turismo y recreación': (7, COBERTURA, 'Lugares con mucha gente en temporada: atención en el momento, sin esperar.', 'sus temporadas y eventos'),
  'Escuelas':             (6, CURSOS, 'Kermeses, graduaciones y torneos escolares, y cursos para su personal.', 'sus eventos escolares'),
  'Empresas (cursos)':    (6, CURSOS, 'Capacitación para su gente y cobertura en sus eventos de empresa.', 'sus eventos y su personal'),
}
OTRO = (5, COBERTURA, 'Cualquier evento con gente se ve más serio con atención médica en el lugar.', 'sus eventos')

def numero(t):
  d = re.sub(r'\D', '', t or '')
  if d.startswith('52') and len(d) == 12: d = d[2:]
  return d if len(d) == 10 else ''

def zona(d):
  d = d or ''
  if re.search(r'Corregidora|El Pueblito|769\d\d', d): return 'Corregidora'
  if re.search(r'Marqu[eé]s|762[4-6]\d', d): return 'El Marqués'
  if re.search(r'Juriquilla|7623\d', d): return 'Juriquilla'
  if re.search(r'San Juan del R[ií]o|768\d\d', d): return 'San Juan del Río'
  if re.search(r'Quer[eé]taro|76\d\d\d', d): return 'Querétaro'
  return 'Fuera de la zona'

filas, vistos = [], set()
for l in ENTRADA.open(encoding='utf-8'):
  try: r = json.loads(l)
  except Exception: continue
  tel = numero(r.get('telefono'))
  if not tel or tel in vistos: continue
  vistos.add(tel)
  giro = r.get('giro') or ''
  peso, of, gancho, para = GIROS.get(giro, OTRO)
  res = int(r.get('resenas') or 0)
  try: est = float(str(r.get('estrellas') or '0').replace(',', '.'))
  except ValueError: est = 0
  z = zona(r.get('direccion'))
  # quién hace más eventos: el giro pesa, y un lugar con muchas reseñas recibe mucha gente
  pts = peso * 3 + math.log10(res + 1) * 8 + (est - 3.5) * 2 - (15 if z == 'Fuera de la zona' else 0)
  nombre = (r.get('nombre') or '').strip()
  msg = (f'Hola, ¿qué tal? Soy [tu nombre], de GERALDMED, paramédicos para eventos aquí en Querétaro. Vi {nombre} en Google Maps. '
         f'Cubrimos {para} con paramédicos a pie entre la gente y ambulancia de urgencias básicas en el lugar'
         + (', y damos cursos para su personal' if of == CURSOS else '') +
         '. Todos nuestros elementos se eligen con especial cuidado. ¿Le comparto la información para su próximo evento?')
  filas.append({'pts': pts, 'negocio': nombre, 'giro': giro, 'busqueda': r.get('busqueda') or '', 'cat': r.get('categoria') or '',
    'tel': f'{tel[:3]} {tel[3:6]} {tel[6:]}', 'wa': f'https://wa.me/52{tel}?text=' + urllib.parse.quote(msg), 'zona': z,
    'dir': (r.get('direccion') or '').replace(', México', '').strip(), 'res': res, 'est': est, 'web': r.get('web') or '',
    'ofrecer': of, 'gancho': gancho, 'mapa': r.get('mapa') or ''})

filas.sort(key=lambda f: -f['pts'])
n = len(filas)
for i, f in enumerate(filas): f['prio'] = 'A' if i < n * .3 else 'B' if i < n * .7 else 'C'

MORADO, VINO, ROJO = '170A26', '7E1735', 'B3261E'
fino = Side(style='thin', color='D9CCE6'); borde = Border(left=fino, right=fino, top=fino, bottom=fino)
wb = Workbook()
h = wb.active; h.title = 'Cómo usarla'; h.sheet_view.showGridLines = False
h.column_dimensions['A'].width = 3; h.column_dimensions['B'].width = 110
lineas = [
  (f'GERALDMED · {n} lugares que hacen eventos', 'tit'),
  ('Querétaro, Corregidora y El Marqués · sacados de Google Maps (noviembre 2026) · todos con teléfono', 'sub'),
  ('', ''),
  ('Cómo se trabaja', 'h'),
  ('1. Escribe tu nombre en la columna Vendedor del lugar que tomes (así nadie le habla dos veces al mismo).', ''),
  ('2. Empieza por prioridad A: organizadores, salones y foros con muchas reseñas (hacen más eventos).', ''),
  ('3. Toca «Abrir WhatsApp»: el mensaje ya va escrito. Cambia [tu nombre] y mándalo.', ''),
  ('4. Si contesta, pregúntale fecha, tipo de evento, cuántas personas y cuántas horas: con eso se cotiza.', ''),
  (f'5. La cotización la da GERALDMED: WhatsApp {CONTACTO} (o 427 108 0226). Apunta en Estado y Notas cómo te fue.', ''),
  ('', ''),
  ('Reglas que no se rompen', 'h'),
  ('• No se dan precios inventados: cada evento se cotiza aparte.', ''),
  ('• Sólo se ofrece lo que hacemos: paramédicos a pie entre la gente, ambulancia de urgencias básicas y cursos.', ''),
  ('• No se prometen tiempos de llegada ni certificaciones que no tengamos por escrito.', ''),
  ('• Si alguien pide que no le escriban, se marca «No volver a escribir» y no se le insiste.', ''),
]
for i, (t, k) in enumerate(lineas, start=2):
  c = h.cell(row=i, column=2, value=t); c.alignment = Alignment(wrap_text=True, vertical='center')
  if k == 'tit': c.font = Font(size=24, bold=True, color=ROJO); h.row_dimensions[i].height = 36
  elif k == 'sub': c.font = Font(size=12, color=VINO)
  elif k == 'h': c.font = Font(size=14, bold=True, color=ROJO); h.row_dimensions[i].height = 24
  else: c.font = Font(size=12, color='222222'); h.row_dimensions[i].height = 20

ws = wb.create_sheet('Prospectos')
cols = [('#', 5), ('Prioridad', 9), ('Lugar', 34), ('Giro', 20), ('Qué es', 24), ('Teléfono', 14), ('WhatsApp', 17), ('Zona', 16),
        ('Reseñas', 9), ('Estrellas', 9), ('Qué ofrecerle', 46), ('Gancho', 52), ('Web', 10), ('Mapa', 10), ('Dirección', 50),
        ('Vendedor', 16), ('Estado', 20), ('Próximo contacto', 16), ('Notas', 40)]
for j, (t, w) in enumerate(cols, start=1):
  c = ws.cell(row=1, column=j, value=t); c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor=ROJO)
  c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True); c.border = borde; ws.column_dimensions[get_column_letter(j)].width = w
ws.row_dimensions[1].height = 30
color = {'A': 'E8B54A', 'B': 'F2A0A0', 'C': 'E5DDE9'}
for i, f in enumerate(filas, start=2):
  vals = [i - 1, f['prio'], f['negocio'], f['giro'], f['cat'], f['tel'], 'Abrir WhatsApp', f['zona'], f['res'], f['est'], f['ofrecer'], f['gancho'],
          'Ver' if f['web'] else '', 'Ver mapa', f['dir'], '', 'Por escribir', '', '']
  for j, v in enumerate(vals, start=1):
    c = ws.cell(row=i, column=j, value=v); c.border = borde; c.alignment = Alignment(vertical='center', wrap_text=j in (11, 12, 15, 19))
  ws.cell(row=i, column=7).hyperlink = f['wa']; ws.cell(row=i, column=7).font = Font(color='1D7A3E', underline='single', bold=True)
  if f['web']: ws.cell(row=i, column=13).hyperlink = f['web']; ws.cell(row=i, column=13).font = Font(color='6A1BB0', underline='single')
  if f['mapa']: ws.cell(row=i, column=14).hyperlink = f['mapa']; ws.cell(row=i, column=14).font = Font(color='6A1BB0', underline='single')
  p = ws.cell(row=i, column=2); p.fill = PatternFill('solid', fgColor=color[f['prio']]); p.alignment = Alignment(horizontal='center', vertical='center'); p.font = Font(bold=True)
  ws.cell(row=i, column=10).number_format = '0.0'; ws.cell(row=i, column=9).number_format = '#,##0'; ws.row_dimensions[i].height = 48
dv = DataValidation(type='list', formula1='"Por escribir,Escrito,Contestó,Pidió cotización,Cotizado,Vendido,No por ahora,No volver a escribir"', allow_blank=True)
ws.add_data_validation(dv); dv.add(f'Q2:Q{n + 1}')
ws.freeze_panes = 'D2'
t = Table(displayName='Prospectos', ref=f'A1:{get_column_letter(len(cols))}{n + 1}'); t.tableStyleInfo = TableStyleInfo(name='TableStyleLight1', showRowStripes=True); ws.add_table(t)

g = wb.create_sheet('Por giro')
g.append(['Giro', 'Lugares', 'Prioridad A', 'Qué ofrecerle', 'Gancho'])
for giro, k in Counter(f['giro'] for f in filas).most_common():
  pe, of, ga, _ = GIROS.get(giro, OTRO); g.append([giro, k, sum(1 for f in filas if f['giro'] == giro and f['prio'] == 'A'), of, ga])
for j, w in enumerate([24, 10, 12, 60, 70], start=1): g.column_dimensions[get_column_letter(j)].width = w
for c in g[1]: c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor=ROJO)
for row in g.iter_rows(min_row=2):
  for c in row: c.alignment = Alignment(wrap_text=True, vertical='center')
z = wb.create_sheet('Por zona')
z.append(['Zona', 'Lugares', 'A', 'B', 'C'])
for zz, k in Counter(f['zona'] for f in filas).most_common(): z.append([zz, k] + [sum(1 for f in filas if f['zona'] == zz and f['prio'] == p) for p in 'ABC'])
for c in z[1]: c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor=ROJO)
z.column_dimensions['A'].width = 22

SALIDA.parent.mkdir(parents=True, exist_ok=True)
wb.save(SALIDA)
print(f'✓ {n} prospectos → {SALIDA.relative_to(RAIZ)}')
print('  por giro:', dict(Counter(f['giro'] for f in filas).most_common()))
