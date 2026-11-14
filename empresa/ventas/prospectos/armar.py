"""Grupo Mazi · 500 prospectos para los vendedores (Carlos, 14 nov: «dame una lista de 500 clientes
potenciales para nosotros, voy a poner a mis vendedores a chambear»).

   python3.13 empresa/ventas/prospectos/armar.py

De dónde salen: clientes/prospectos.csv (536 negocios de Querétaro sacados de Google Maps: con teléfono, con
reseñas y SIN página propia, o sólo con Facebook/Instagram). Aquí se ordenan, se quitan repetidos, se les pone
qué ofrecer, cuánto cuesta, qué ejemplo enseñar y un WhatsApp con el mensaje ya escrito, y se dejan columnas
para que el vendedor lleve su seguimiento. Precios de empresa/servicios/PRECIOS.md.
"""
import csv, math, re, pathlib, urllib.parse
from collections import Counter
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.table import Table, TableStyleInfo

RAIZ = pathlib.Path(__file__).resolve().parents[3]
SALIDA = RAIZ / 'empresa/ventas/Prospectos-Grupo-Mazi.xlsx'
WEB = 'https://mazi-central.palomazi9111.workers.dev'

# giro → (qué ofrecer, precio, gancho, ejemplo, beneficio para el mensaje)
COMIDA = ('Menú digital con QR + pedidos por WhatsApp (Página Completa)', '$900 el menú · $6,500 la Completa',
          'Que le pidan desde el celular sin llamar y sin que se le pierdan pedidos en WhatsApp.', f'{WEB}/district-roll/', 'ven el menú con fotos y piden por WhatsApp en un toque')
CITAS = ('Página Completa con citas por WhatsApp', '$6,500 (Esencial desde $2,000)',
         'Que le aparten cita solos, a cualquier hora, sin estar contestando mensajes.', f'{WEB}/barberias/', 'ven sus servicios y precios y apartan cita solos')
SALUD = ('Página con citas y servicios (Esencial o Completa)', '$2,000 Esencial · $6,500 Completa',
         'Que lo encuentren en Google con su especialidad y le agenden por WhatsApp.', f'{WEB}/barberias/', 'lo encuentran en Google y le agendan por WhatsApp')
SERVICIO = ('Página Esencial: quién es, qué hace, ubicación y WhatsApp', '$2,000 (3 a 5 días)',
            'Dar confianza: un negocio con página propia se ve serio y aparece en Google.', f'{WEB}/barberias/sencilla/', 'ven sus servicios y le escriben directo')
TIENDA = ('Página Completa con catálogo (o tienda en línea)', '$6,500 · tienda desde $12,000',
          'Que vean su catálogo con precios y le compren o pregunten por WhatsApp.', f'{WEB}/smileys/', 'ven su catálogo y le piden por WhatsApp')
EVENTOS = ('Página Completa con galería y cotización por WhatsApp + 2 videos', '$6,500 (trae 2 videos de regalo)',
           'Los eventos se venden por las fotos: galería que enamora y cotización en un toque.', f'{WEB}/smileys/', 'ven sus fotos y le piden cotización en un toque')
GIROS = {
  'taquería': COMIDA, 'pizzería': COMIDA, 'hamburguesas': COMIDA, 'cafetería': COMIDA, 'mariscos': COMIDA, 'restaurante': COMIDA,
  'pastelería': TIENDA, 'banquetes': EVENTOS, 'salón de eventos': EVENTOS, 'fotógrafo': EVENTOS,
  'estética salón de belleza': CITAS, 'uñas manicure': CITAS, 'barbería': CITAS, 'spa masajes': CITAS, 'tatuajes': CITAS,
  'dentista': SALUD, 'psicólogo': SALUD, 'fisioterapia': SALUD, 'nutriólogo': SALUD, 'consultorio médico': SALUD, 'veterinaria': SALUD, 'óptica': SALUD,
  'gimnasio': CITAS, 'escuela de idiomas': EVENTOS, 'guardería': EVENTOS,
  'abogado': SERVICIO, 'contador': SERVICIO, 'inmobiliaria': TIENDA, 'taller de motos': SERVICIO, 'taller mecánico': SERVICIO,
  'autolavado': SERVICIO, 'lavandería': SERVICIO, 'ferretería': TIENDA, 'mueblería': TIENDA, 'florería': TIENDA,
}
PLURAL = {'taquería': 'taquerías', 'pizzería': 'pizzerías', 'hamburguesas': 'hamburgueserías', 'cafetería': 'cafeterías', 'mariscos': 'marisquerías',
  'restaurante': 'restaurantes', 'pastelería': 'pastelerías', 'banquetes': 'banquetes', 'salón de eventos': 'salones de eventos', 'fotógrafo': 'fotógrafos',
  'estética salón de belleza': 'estéticas', 'uñas manicure': 'salones de uñas', 'barbería': 'barberías', 'spa masajes': 'spas', 'tatuajes': 'estudios de tatuaje',
  'dentista': 'consultorios dentales', 'psicólogo': 'psicólogos', 'fisioterapia': 'fisioterapeutas', 'nutriólogo': 'nutriólogos', 'consultorio médico': 'consultorios',
  'veterinaria': 'veterinarias', 'óptica': 'ópticas', 'gimnasio': 'gimnasios', 'escuela de idiomas': 'escuelas de idiomas', 'guardería': 'guarderías',
  'abogado': 'despachos', 'contador': 'despachos contables', 'inmobiliaria': 'inmobiliarias', 'taller de motos': 'talleres de motos', 'taller mecánico': 'talleres',
  'autolavado': 'autolavados', 'lavandería': 'lavanderías', 'ferretería': 'ferreterías', 'mueblería': 'mueblerías', 'florería': 'florerías'}

def zona(dir_):
  d = dir_ or ''
  if re.search(r'Juriquilla|7623\d', d): return 'Juriquilla'
  if re.search(r'Corregidora|El Pueblito|769\d\d', d): return 'Corregidora'
  if re.search(r'Marqu[eé]s|762[4-6]\d', d): return 'El Marqués'
  if re.search(r'San Juan del R[ií]o|7680\d|768\d\d', d): return 'San Juan del Río'
  if re.search(r'7600\d|Centro', d): return 'Centro'
  if re.search(r'Quer[eé]taro|76\d\d\d', d): return 'Querétaro (resto de la ciudad)'
  return 'Fuera de la zona'

def cp(dir_):
  m = re.search(r'\b(7\d{4})\b', dir_ or ''); return m.group(1) if m else ''

def colonia(dir_):
  partes = [p.strip() for p in (dir_ or '').split(',')]
  return partes[1] if len(partes) > 2 else ''

def hoy_tiene(t):
  if t.startswith('sólo redes'):
    u = t[t.find('(') + 1:-1].lower()
    for k, n in [('facebook', 'Sólo Facebook'), ('instagram', 'Sólo Instagram'), ('tiktok', 'Sólo TikTok'), ('wa.me', 'Sólo WhatsApp'), ('whatsapp', 'Sólo WhatsApp'),
                 ('linktr', 'Sólo Linktree'), ('doctoralia', 'Sólo Doctoralia'), ('agendapro', 'Sólo app de citas'), ('fresha', 'Sólo app de citas'), ('calendly', 'Sólo app de citas'),
                 ('wixsite', 'Página gratis (Wix)'), ('canva.site', 'Página gratis (Canva)'), ('ueniweb', 'Página gratis (Ueni)')]:
      if k in u: return n
    return 'Sólo redes'
  return 'Sin página'

def numero(t):
  d = re.sub(r'\D', '', t or '')
  if d.startswith('52') and len(d) == 12: d = d[2:]
  return d if len(d) == 10 else ''

filas, vistos = [], set()
for r in csv.DictReader(open(RAIZ / 'clientes/prospectos.csv', encoding='utf-8')):
  tel = numero(r['Teléfono'])
  if not tel or tel in vistos: continue
  vistos.add(tel)
  giro = r['Giro'].strip()
  of = GIROS.get(giro, SERVICIO)
  res = int(re.sub(r'\D', '', r['Reseñas'] or '0') or 0)
  est = float((r['Estrellas'] or '0').replace(',', '.') or 0)
  ht = hoy_tiene(r['Qué tiene hoy'])
  z = zona(r['Dirección'])
  # prioridad: un negocio con muchas reseñas ya vende (puede pagar) y sin página es más fácil de convencer
  pts = math.log10(res + 1) * 10 + (est - 3.5) * 4 + (6 if ht == 'Sin página' else 3 if ht.startswith('Página gratis') else 1) - (8 if z == 'Fuera de la zona' else 0)
  nombre = r['Negocio'].strip()
  msg = (f'Hola, ¿qué tal? Soy [tu nombre], de Grupo Mazi, aquí en Querétaro. Vi {nombre} en Google Maps'
         + (f' con {res:,} reseñas' if res >= 30 else '') + f' y no encontré su página. Hacemos páginas para {PLURAL.get(giro, "negocios")} donde sus clientes {of[4]}. '
         'Se entrega en días, no en meses. ¿Le mando un ejemplo de un minuto?')
  filas.append({'pts': pts, 'negocio': nombre, 'giro': giro.capitalize(), 'tel': f'{tel[:3]} {tel[3:6]} {tel[6:]}', 'wa': f'https://wa.me/52{tel}?text=' + urllib.parse.quote(msg),
    'zona': z, 'colonia': colonia(r['Dirección']) + (f" · CP {cp(r['Dirección'])}" if cp(r['Dirección']) else ''), 'dir': r['Dirección'].replace(', México', ''), 'res': res, 'est': est, 'hoy': ht,
    'ofrecer': of[0], 'precio': of[1], 'gancho': of[2], 'ejemplo': of[3], 'mapa': r['Mapa'], 'msg': msg})

filas.sort(key=lambda f: -f['pts'])
filas = filas[:500]
for i, f in enumerate(filas): f['prio'] = 'A' if i < 150 else 'B' if i < 350 else 'C'

# ═══════════════ el Excel ═══════════════
MORADO, VINO, OSC, LILA = '170A26', '7E1735', '2A1640', 'F1E6FB'
fino = Side(style='thin', color='D9CCE6'); borde = Border(left=fino, right=fino, top=fino, bottom=fino)
wb = Workbook()

# 1 · portada / cómo usarla
h = wb.active; h.title = 'Cómo usarla'
h.sheet_view.showGridLines = False
h.column_dimensions['A'].width = 3; h.column_dimensions['B'].width = 110
lineas = [
  ('Grupo Mazi · 500 negocios para llamar', 'tit'),
  ('Querétaro y alrededores · sacados de Google Maps (noviembre 2026) · todos con teléfono y SIN página propia', 'sub'),
  ('', ''),
  ('Cómo se trabaja', 'h'),
  ('1. Toma tu zona en la hoja «Prospectos» y escribe tu nombre en la columna Vendedor (así nadie le habla dos veces al mismo).', ''),
  ('2. Empieza por los de prioridad A: tienen muchas reseñas (ya venden, pueden pagar) y no tienen página.', ''),
  ('3. Toca «Abrir WhatsApp»: el mensaje ya va escrito. Sólo cambia [tu nombre] y mándalo.', ''),
  ('4. Si contesta, enséñale el ejemplo de su giro (columna Ejemplo) en tu celular. Propón UN paquete, el de la columna Qué ofrecerle.', ''),
  ('5. Cierra con el 50 % para empezar y 50 % al entregar. Apunta en Estado y Notas cómo te fue y cuándo volver a escribir.', ''),
  ('', ''),
  ('Reglas que no se rompen', 'h'),
  ('• Los precios son los de la columna Precio. Descuentos, pagos en partes o etapas: los autoriza Carlos.', ''),
  ('• Lo presencial (fotos, videos, citas) sólo en Querétaro; fuera, con viáticos del cliente.', ''),
  ('• No se promete lo que no hacemos ni se nombra como cliente a quien no lo es.', ''),
  ('• Si alguien dice que no le escriban, se marca «No volver a escribir» y no se le insiste.', ''),
  ('• Dudas: WhatsApp de la empresa 442 883 3786.', ''),
  ('', ''),
  ('Qué significa cada columna', 'h'),
  ('Prioridad A, B, C · Hoy tiene (sin página, sólo Facebook, página gratis de Wix…) · Reseñas y estrellas de Google · Ejemplo: link a una página nuestra para enseñarle.', ''),
]
for i, (t, k) in enumerate(lineas, start=2):
  c = h.cell(row=i, column=2, value=t)
  c.alignment = Alignment(wrap_text=True, vertical='center')
  if k == 'tit': c.font = Font(name='Calibri', size=24, bold=True, color=MORADO); h.row_dimensions[i].height = 36
  elif k == 'sub': c.font = Font(name='Calibri', size=12, color=VINO)
  elif k == 'h': c.font = Font(name='Calibri', size=14, bold=True, color=VINO); h.row_dimensions[i].height = 24
  else: c.font = Font(name='Calibri', size=12, color='222222'); h.row_dimensions[i].height = 20

# 2 · la lista
ws = wb.create_sheet('Prospectos')
cols = [('#', 5), ('Prioridad', 9), ('Negocio', 34), ('Giro', 20), ('Teléfono', 14), ('WhatsApp', 17), ('Zona', 20), ('Colonia', 24),
        ('Reseñas', 9), ('Estrellas', 9), ('Hoy tiene', 18), ('Qué ofrecerle', 44), ('Precio', 28), ('Gancho', 50), ('Ejemplo', 18),
        ('Mapa', 10), ('Dirección', 50), ('Vendedor', 16), ('Estado', 20), ('Próximo contacto', 16), ('Notas', 40)]
for j, (n, w) in enumerate(cols, start=1):
  c = ws.cell(row=1, column=j, value=n)
  c.font = Font(bold=True, color='FFFFFF', name='Calibri', size=11); c.fill = PatternFill('solid', fgColor=MORADO)
  c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True); c.border = borde
  ws.column_dimensions[get_column_letter(j)].width = w
ws.row_dimensions[1].height = 30
colorPrio = {'A': 'E8B54A', 'B': 'C77DFF', 'C': 'D9CCE6'}
for i, f in enumerate(filas, start=2):
  vals = [i - 1, f['prio'], f['negocio'], f['giro'], f['tel'], 'Abrir WhatsApp', f['zona'], f['colonia'], f['res'], f['est'], f['hoy'],
          f['ofrecer'], f['precio'], f['gancho'], 'Ver ejemplo', 'Ver mapa', f['dir'], '', 'Por escribir', '', '']
  for j, v in enumerate(vals, start=1):
    c = ws.cell(row=i, column=j, value=v); c.border = borde
    c.alignment = Alignment(vertical='center', wrap_text=j in (12, 14, 17, 21))
    c.font = Font(name='Calibri', size=11)
  ws.cell(row=i, column=6).hyperlink = f['wa']; ws.cell(row=i, column=6).font = Font(color='1D7A3E', underline='single', bold=True)
  ws.cell(row=i, column=15).hyperlink = f['ejemplo']; ws.cell(row=i, column=15).font = Font(color='6A1BB0', underline='single')
  ws.cell(row=i, column=16).hyperlink = f['mapa']; ws.cell(row=i, column=16).font = Font(color='6A1BB0', underline='single')
  p = ws.cell(row=i, column=2); p.fill = PatternFill('solid', fgColor=colorPrio[f['prio']]); p.alignment = Alignment(horizontal='center', vertical='center'); p.font = Font(bold=True)
  ws.cell(row=i, column=10).number_format = '0.0'; ws.cell(row=i, column=9).number_format = '#,##0'
  ws.row_dimensions[i].height = 48
dv = DataValidation(type='list', formula1='"Por escribir,Escrito,Contestó,Interesado,Cita agendada,Vendido,No por ahora,No volver a escribir"', allow_blank=True)
ws.add_data_validation(dv); dv.add(f'S2:S{len(filas) + 1}')
ws.freeze_panes = 'D2'
tabla = Table(displayName='Prospectos', ref=f'A1:{get_column_letter(len(cols))}{len(filas) + 1}')
tabla.tableStyleInfo = TableStyleInfo(name='TableStyleLight1', showRowStripes=True)
ws.add_table(tabla)

# 3 · qué decir por giro
g = wb.create_sheet('Qué ofrecer por giro')
g.append(['Giro', 'Cuántos', 'Qué ofrecerle', 'Precio', 'Gancho', 'Ejemplo'])
cuenta = Counter(f['giro'] for f in filas)
for giro, n in cuenta.most_common():
  of = GIROS.get(giro.lower(), SERVICIO)
  g.append([giro, n, of[0], of[1], of[2], of[3]])
for j, w in enumerate([24, 9, 46, 30, 60, 46], start=1): g.column_dimensions[get_column_letter(j)].width = w
for c in g[1]: c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor=VINO)
for row in g.iter_rows(min_row=2):
  for c in row: c.alignment = Alignment(wrap_text=True, vertical='center')

# 4 · resumen por zona (para repartir)
z = wb.create_sheet('Por zona')
z.append(['Zona', 'Negocios', 'Prioridad A', 'Prioridad B', 'Prioridad C'])
for zz, n in Counter(f['zona'] for f in filas).most_common():
  z.append([zz, n] + [sum(1 for f in filas if f['zona'] == zz and f['prio'] == p) for p in 'ABC'])
z.append(['Total', len(filas)] + [sum(1 for f in filas if f['prio'] == p) for p in 'ABC'])
for j, w in enumerate([26, 12, 12, 12, 12], start=1): z.column_dimensions[get_column_letter(j)].width = w
for c in z[1]: c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor=VINO)
for c in z[z.max_row]: c.font = Font(bold=True)

wb.save(SALIDA)
print(SALIDA, len(filas), 'prospectos')
print(Counter(f['zona'] for f in filas).most_common())
print(Counter(f['hoy'] for f in filas).most_common())
