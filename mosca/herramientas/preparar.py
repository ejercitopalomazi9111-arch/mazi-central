"""Arma los datos del cerebro de la mosca para el navegador.

   python3 -P mosca/herramientas/preparar.py <carpeta Drosophila_brain_model> <tsv de anotaciones> mosca/datos

Fuentes (públicas, se bajan aparte; no viven en el repo):
  · Conectividad FlyWire v783 en el formato del modelo de Shiu et al. 2024 (Nature,
    github.com/philshiu/Drosophila_brain_model, MIT): Connectivity_783.parquet + Completeness_783.csv
  · Tipos de célula de Schlegel et al. 2024 (Nature, github.com/flyconnectome/flywire_annotations)
  · El conectoma FlyWire es CC-BY 4.0 (Dorkenwald et al. 2024).

Salida (mosca/datos/):
  conectoma-N.bin   comprimido (gzip): por neurona de origen, sus destinos en delta-varint y el peso
                    (sinapsis × signo del neurotransmisor) en zigzag-varint. Partido en piezas < 20 MB
                    porque Cloudflare no sirve archivos de más de 25 MiB.
  neuronas.bin      comprimido: por neurona, posición del soma en µm (int16 ×3), superclase, lado y tipo
  indice.json       tablas de nombres, cuántas neuronas y aristas, y los GRUPOS de entrada y salida
"""
import sys, os, json, gzip
import numpy as np, pandas as pd

D, TSV, SAL = sys.argv[1:4]
os.makedirs(SAL, exist_ok=True)

comp = pd.read_csv(os.path.join(D, 'Completeness_783.csv'), index_col=0)
ids = comp.index.values.astype(np.int64); N = len(ids)
pos = {r: i for i, r in enumerate(ids)}
con = pd.read_parquet(os.path.join(D, 'Connectivity_783.parquet'),
                      columns=['Presynaptic_Index', 'Postsynaptic_Index', 'Connectivity', 'Excitatory'])
con = con.sort_values(['Presynaptic_Index', 'Postsynaptic_Index'])
pre = con.Presynaptic_Index.values.astype(np.int64); post = con.Postsynaptic_Index.values.astype(np.int64)
E = len(pre)

# ── el signo de cada neurona ──
# 8 oct · con el signo del parquet (el neurotransmisor que predice la red de Eckstein para CADA neurona)
# la red se encendía entera sin parar con cualquier olor o con calor: neuronas de un mismo tipo salían
# unas «excitadoras» y otras «dopamina», y los Kenyon (que son de acetilcolina) salían «dopamina».
# Arreglo: el neurotransmisor se decide POR TIPO de célula — el de la literatura (known_nt) si existe;
# si no, el voto de todas las neuronas del tipo pesado por la confianza — y los moduladores (dopamina,
# serotonina, octopamina) no dan corriente rápida: actúan lento, por receptores acoplados a proteína G.
a0 = pd.read_csv(TSV, sep='\t', low_memory=False).drop_duplicates('root_id')
PRIM = ['acetylcholine', 'gaba', 'glutamate', 'histamine', 'dopamine', 'serotonin', 'octopamine', 'tyramine']
def primero_conocido(txt):
    if not isinstance(txt, str): return None
    for parte in txt.replace(';', ',').split(','):
        parte = parte.strip()
        if parte in PRIM: return parte
    return None
a0['tipo'] = a0.cell_type.fillna(a0.hemibrain_type)
conocido = a0.groupby('tipo').known_nt.agg(lambda x: next((primero_conocido(v) for v in x if primero_conocido(v)), None))
voto = a0.dropna(subset=['tipo', 'top_nt']).groupby(['tipo', 'top_nt']).top_nt_conf.sum().reset_index()
voto = voto.sort_values('top_nt_conf').groupby('tipo').tail(1).set_index('tipo').top_nt
nt_tipo = voto.copy(); nt_tipo.update(conocido.dropna())
a0['nt'] = a0.tipo.map(nt_tipo).fillna(a0.top_nt)
SIGNO = {'acetylcholine': 1, 'gaba': -1, 'glutamate': -1, 'histamine': -1,
         'dopamine': 0, 'serotonin': 0, 'octopamine': 0, 'tyramine': 0}
sig_id = a0.set_index('root_id').nt.map(SIGNO)
signo = pd.Series(ids).map(sig_id).values
signo_pq = con.groupby('Presynaptic_Index').Excitatory.first().reindex(range(N)).fillna(1).values
signo = np.where(pd.isna(signo), signo_pq, signo).astype(np.int64)
w = con.Connectivity.values.astype(np.int64) * signo[pre]
# Las interneuronas locales EXCITADORAS del lóbulo antenal (lLN1_bc y compañía) se mandan entre ellas
# 40 mil sinapsis: con eso, cualquier olor (o el calor, que también entra ahí) las dejaba disparando a
# 440 Hz para siempre — en el modelo de Shiu igual; ellos no probaron olores. En la mosca esas neuronas
# actúan sobre todo por uniones eléctricas con las neuronas de proyección, que este modelo no tiene.
# Se quita la salida QUÍMICA EXCITADORA de las interneuronas locales del lóbulo antenal; las
# inhibidoras (GABA, glutamato), que son la mayoría y hacen el contraste entre olores, se quedan.
alln = pd.Series(ids).map(a0.set_index('root_id').cell_class).eq('ALLN').values
lazo = alln[pre] & (w > 0)   # 8 oct · también a las proyecciones: el lazo seguía por ahí (PN → lLN1_bc → PN)
# Lo mismo pasaba con las células de Kenyon (cuerpo pedunculado): 270 mil sinapsis de Kenyon a Kenyon
# del mismo tipo. Son contactos entre axones en el mismo haz; en la mosca la actividad de Kenyon es
# escasa porque la APL las frena, y en un modelo sin eso se encienden entre sí. Se quita la excitación
# ENTRE NEURONAS DEL MISMO TIPO (homotípica) en todo el cerebro.
tipo_id = pd.Series(ids).map(a0.set_index('root_id').tipo).fillna('').values
homo = (tipo_id[pre] == tipo_id[post]) & (tipo_id[pre] != '') & (w > 0)
w = np.where(lazo | homo, 0, w)
print(f'en cero: {lazo.sum()} entre interneuronas locales del lóbulo antenal · {homo.sum()} entre neuronas del mismo tipo')
NT_FINAL = pd.Series(ids).map(a0.set_index('root_id').nt).fillna('?').values

def varint(a):
    a = np.asarray(a, dtype=np.uint64); out = []
    while True:
        b = (a & 127).astype(np.uint8); a = a >> np.uint64(7); mas = a > 0
        out.append((b | (mas.astype(np.uint8) << 7), mas))
        if not mas.any(): break
    # intercalar: cada número aporta 1..k bytes, en orden
    k = len(out); n = len(out[0][0])
    largo = np.ones(n, dtype=np.int64)
    for j in range(1, k): largo += out[j - 1][1]
    res = np.zeros(int(largo.sum()), dtype=np.uint8); ini = np.r_[0, np.cumsum(largo)[:-1]]
    for j in range(k):
        sel = largo > j; res[ini[sel] + j] = out[j][0][sel]
    return res.tobytes()

grado = np.bincount(pre, minlength=N).astype(np.uint32)
primero = np.r_[True, pre[1:] != pre[:-1]]
delta = np.where(primero, post, post - np.r_[0, post[:-1]])
zz = np.where(w < 0, -2 * w - 1, 2 * w)
cuerpo = grado.tobytes() + varint(delta) + varint(zz)
gz = gzip.compress(cuerpo, 9, mtime=0)
PIEZA = 19 * 1024 * 1024
piezas = [gz[i:i + PIEZA] for i in range(0, len(gz), PIEZA)]
for f in os.listdir(SAL):
    if f.startswith('conectoma-'): os.remove(os.path.join(SAL, f))
for k, p in enumerate(piezas):
    open(os.path.join(SAL, f'conectoma-{k}.bin'), 'wb').write(p)
largos = {'grado': len(grado.tobytes()), 'destinos': len(varint(delta)), 'pesos': len(varint(zz))}

# ── las neuronas ──
a = pd.read_csv(TSV, sep='\t', low_memory=False)
a = a[a.root_id.isin(pos)].drop_duplicates('root_id')
a['i'] = a.root_id.map(pos)
a = a.set_index('i').reindex(range(N))
sx = a.soma_x.fillna(a.pos_x).fillna(0).values * 4 / 1000
sy = a.soma_y.fillna(a.pos_y).fillna(0).values * 4 / 1000
sz = a.soma_z.fillna(a.pos_z).fillna(0).values * 40 / 1000
SUPER = ['?'] + sorted(a.super_class.dropna().unique().tolist())
LADO = ['?', 'left', 'right', 'center']
NT = ['?'] + PRIM
TIPOS = ['?'] + sorted(set(a.cell_type.dropna().tolist()) | set(a.hemibrain_type.dropna().tolist()))
ti = {t: k for k, t in enumerate(TIPOS)}
tipo = a.cell_type.fillna(a.hemibrain_type).map(ti).fillna(0).astype(np.uint16).values
sup = a.super_class.map({s: k for k, s in enumerate(SUPER)}).fillna(0).astype(np.uint8).values
lado = a.side.map({s: k for k, s in enumerate(LADO)}).fillna(0).astype(np.uint8).values
nt = pd.Series(NT_FINAL).map({s: k for k, s in enumerate(NT)}).fillna(0).astype(np.uint8).values
reg = np.zeros(N, dtype=[('x', '<i2'), ('y', '<i2'), ('z', '<i2'), ('tipo', '<u2'), ('sup', 'u1'), ('lado', 'u1'), ('nt', 'u1'), ('_', 'u1')])
reg['x'] = np.round(sx); reg['y'] = np.round(sy); reg['z'] = np.round(sz)
reg['tipo'] = tipo; reg['sup'] = sup; reg['lado'] = lado; reg['nt'] = nt
open(os.path.join(SAL, 'neuronas.bin'), 'wb').write(gzip.compress(reg.tobytes(), 9, mtime=0))

# ── grupos de entrada (sentidos) y salida (conducta) ──
def donde(**f):
    m = np.ones(N, bool)
    for col, val in f.items():
        v = a[col].fillna('')
        m &= v.str.match(val).values if isinstance(val, str) else v.isin(val).values
    return m
def por_lado(m):
    return {'izq': np.where(m & (a.side == 'left').values)[0].tolist(),
            'der': np.where(m & (a.side == 'right').values)[0].tolist(),
            'todos': np.where(m)[0].tolist()}
G = {}
ENTRADAS = {
  # gusto (patas y trompa tocando la comida)
  'azucar':   dict(cell_class='gustatory', cell_sub_class=['sugar', 'sugar/low_salt']),
  'amargo':   dict(cell_class='gustatory', cell_sub_class=['bitter']),
  'agua':     dict(cell_class='gustatory', cell_sub_class=['water']),
  'sal':      dict(cell_class='gustatory', cell_sub_class=['high_salt/heavy_metal']),
  # olfato (glomérulos con olor conocido)
  'vinagre':  dict(cell_type=['ORN_DM1', 'ORN_DM2', 'ORN_DM4', 'ORN_DM3']),   # ésteres y ácido de la fruta
  'moho':     dict(cell_type=['ORN_DA2']),                                    # geosmina: comida podrida
  'co2':      dict(cell_type=['ORN_V']),                                      # señal de estrés de otras moscas
  'feromona': dict(cell_type=['ORN_DA1', 'ORN_VA1v', 'ORN_VA1d']),            # cVA
  # mecánico
  'viento':   dict(cell_class='mechanosensory', cell_sub_class=['wind_gravity']),
  'sonido':   dict(cell_class='mechanosensory', cell_sub_class=['auditory']),
  'tacto':    dict(cell_class='mechanosensory', cell_sub_class=['grooming', 'head bristle']),
  'polvo_ojos': dict(cell_class='mechanosensory', cell_sub_class=['eye bristle']),
  # temperatura y humedad
  'calor':    dict(cell_class='thermosensory', cell_sub_class=['heating']),
  'frio':     dict(cell_class='thermosensory', cell_sub_class=['cold']),
  'seco':     dict(cell_class='hygrosensory', cell_sub_class=['dry']),
  'humedo':   dict(cell_class='hygrosensory', cell_sub_class=['moist']),
  # vista: la luz la sienten los ocelos; lo que se acerca y lo que se mueve, las neuronas de proyección
  'luz':      dict(cell_class='visual', cell_sub_class=['ocellar']),
  'acercamiento': dict(cell_type=['LC4', 'LPLC2']),                           # algo que crece en el ojo
  'objeto_chico': dict(cell_type=['LC11', 'LC18']),                           # algo chico que se mueve
  'movimiento':   dict(cell_type=['LPLC1', 'LC15', 'LC12']),
}
SALIDAS = {
  'escape':   dict(cell_type=['DNp01', 'DNp02', 'DNp04', 'DNp06', 'DNp11']),   # fibra gigante y despegue
  'atras':    dict(cell_type=['MDN']),                                         # «moonwalker»: reversa
  'adelante': dict(cell_type=['DNp09']),                                       # P9: caminar adelante
  'giro':     dict(cell_type=['DNa02', 'DNa01']),
  'acicalar': dict(cell_type=['DNg12_a', 'DNg12_b', 'DNg12_c', 'DNg12_d', 'DNg12_e']),
  'comer':    dict(cell_type=['CB0701']),                                      # MN9: saca la trompa
  'volar':    dict(cell_type=['DNg02_a', 'DNg02_b']),                          # potencia de las alas
}
for nombre, f in {**ENTRADAS, **SALIDAS}.items():
    G[nombre] = por_lado(donde(**f))
indice = {
  'fuente': 'FlyWire v783 (Dorkenwald et al. 2024, CC-BY 4.0) · tipos de Schlegel et al. 2024 · modelo LIF de Shiu et al. 2024',
  'neuronas': N, 'aristas': int(E), 'largos': largos, 'piezas': len(piezas),
  'superclases': SUPER, 'lados': LADO, 'neurotransmisores': NT, 'tipos': TIPOS,
  'entradas': list(ENTRADAS), 'salidas': list(SALIDAS), 'grupos': G,
  'ids': {'mn9': [int(pos[r]) for r in (720575940660219265, 720575940618238523) if r in pos]},
}
json.dump(indice, open(os.path.join(SAL, 'indice.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print(f'signo: {(signo>0).sum()} excitan · {(signo<0).sum()} inhiben · {(signo==0).sum()} moduladoras')
print(f'{N} neuronas · {E} conexiones · conectoma {len(gz)/1e6:.1f} MB en {len(piezas)} piezas')
for k, v in G.items(): print(f'  {k:14s} {len(v["todos"]):5d}  (izq {len(v["izq"])}, der {len(v["der"])})')
