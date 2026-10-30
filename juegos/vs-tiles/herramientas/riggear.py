# EL ESQUELETO DE LAS CANTANTES. Los modelos de fans vienen sin huesos (en T o en A) y «bailaban» girando
# vértices en la tarjeta de video. Esto les mete un esqueleto de verdad y les pasa bailes capturados de
# bailarines reales (CMU Graphics Lab Motion Capture Database, mocap.cs.cmu.edu: libre para cualquier uso; en
# BVH por Bruce Hahne). Nada se dibuja: el modelo es el del autor y el movimiento es el de una persona.
#
#   blender -b -P herramientas/riggear.py -- modelo.glb salida.glb baile1.bvh [baile2.bvh …]
#
# 1. el esqueleto del primer baile se escala al alto del modelo y se planta en sus pies;
# 2. los brazos del esqueleto se acomodan a donde están los brazos del modelo (en T o en A);
# 3. cada vértice se pega a los huesos más cercanos (el pelo y los listones, a la cabeza: si no, una coleta
#    larga se iría con la pierna);
# 4. cada baile se pasa al esqueleto nuevo como «cuánto giró cada hueso desde su pose de reposo», en el
#    espacio del mundo; así no importa que el reposo del modelo sea distinto del de la captura;
# 5. el bailarín se queda en su lugar (sin caminar por el escenario), pero conserva el rebote;
# 6. (Carlos, 30 oct: «la animación no revisa que nada se toque mal al animar o se deforme») los pesos salen por
#    DIFUSIÓN (el «bone heat» de Blender: la piel sigue al hueso que la alcanza por dentro del cuerpo, no al más
#    cercano en línea recta) y, cuadro por cuadro, si un antebrazo o una mano se mete en el torso o en un muslo, o
#    si las piernas se atraviesan, el brazo o la pierna entera se abre lo justo para que no; el giro se suaviza en
#    el tiempo para que no tiemble. herramientas/revisar-bailes.py mide cuántos cuadros quedan mal.
import bpy, sys, math, re, os
from mathutils import Vector, Matrix, Quaternion

args = sys.argv[sys.argv.index('--') + 1:]
MODELO, SALIDA, BAILES = args[0], args[1], args[2:]
FPS = 30
PELO = re.compile(r'hair|tail|kami|髪|ribbon|ribon|band|hat|horn|ear|bow|twin|ponytail|pony|ahoge|hood', re.I)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.fps = FPS

# ── el modelo ──
bpy.ops.import_scene.gltf(filepath=MODELO)
mallas = [o for o in sc.objects if o.type == 'MESH']
for o in sc.objects: o.select_set(o.type == 'MESH')
bpy.context.view_layer.objects.active = mallas[0]
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in [o for o in sc.objects if o.type == 'EMPTY']: bpy.data.objects.remove(o)
pts = [v.co.copy() for o in mallas for v in o.data.vertices]
z0 = min(p.z for p in pts); z1 = max(p.z for p in pts); H = z1 - z0
cx = sum(p.x for p in pts) / len(pts); cy = sum(p.y for p in pts) / len(pts)
print('modelo', MODELO, 'alto', round(H, 3), 'mallas', len(mallas))

# ── el esqueleto (el del primer baile) ──
def importar(bvh):
    antes = set(sc.objects)
    bpy.ops.import_anim.bvh(filepath=bvh, axis_forward='-Z', axis_up='Y', rotate_mode='NATIVE', update_scene_fps=False, update_scene_duration=False)
    o = [o for o in sc.objects if o not in antes][0]; o['baile'] = o.animation_data.action.name; o.animation_data.action = None
    return o
fuente = importar(BAILES[0])
bpy.context.view_layer.update()
def mundo(arm, nombre, cola=False):
    b = arm.data.bones[nombre]; return arm.matrix_world @ (b.tail_local if cola else b.head_local)
pie = min(mundo(fuente, n).z for n in ('LeftToeBase', 'RightToeBase'))
cabeza = mundo(fuente, 'Head', True).z
k = (H * .9) / (cabeza - pie)          # la cabeza del esqueleto llega al 90 % (arriba va el pelo)
fuente.scale = (fuente.scale.x * k,) * 3
bpy.context.view_layer.update()
cad = mundo(fuente, 'Hips'); pie = min(mundo(fuente, n).z for n in ('LeftToeBase', 'RightToeBase'))
fuente.location += Vector((cx - cad.x, cy - cad.y, z0 - pie))
bpy.context.view_layer.update()

# ¿hacia dónde ve cada uno? el esqueleto ve hacia donde apuntan sus dedos de los pies; el modelo, hacia donde
# está su cara (la nariz y el flequillo salen al frente: el lado con más vértices adelante a la altura de la cabeza)
fr = (mundo(fuente, 'LeftToeBase', True) + mundo(fuente, 'RightToeBase', True)) / 2 - (mundo(fuente, 'LeftFoot') + mundo(fuente, 'RightFoot')) / 2
cab = [p for p in pts if p.z > z0 + H * .82]
ccy = sum(p.y for p in cab) / max(1, len(cab))
frente_modelo = -1 if sum(1 for p in cab if p.y < ccy - H * .03) > sum(1 for p in cab if p.y > ccy + H * .03) else 1
if (fr.y > 0) != (frente_modelo > 0):
    fuente.rotation_euler.z += math.pi; bpy.context.view_layer.update()
    cad = mundo(fuente, 'Hips'); fuente.location += Vector((cx - cad.x, cy - cad.y, 0)); bpy.context.view_layer.update()

# ── el esqueleto del modelo: copia del de la captura, en reposo, con los brazos donde están los del modelo ──
bpy.ops.object.select_all(action='DESELECT'); fuente.select_set(True); bpy.context.view_layer.objects.active = fuente
bpy.ops.object.duplicate(); dest = bpy.context.active_object; dest.name = 'Esqueleto'
dest.animation_data_clear(); fuente.select_set(False)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
cuerpo = [p for o in mallas if not PELO.search(o.name + ' ' + ' '.join(m.name for m in o.data.materials if m)) for p in (v.co for v in o.data.vertices)] or pts
bpy.ops.object.mode_set(mode='EDIT'); eb = dest.data.edit_bones
for lado, s in (('Left', 1), ('Right', -1)):
    hombro = eb[lado + 'Arm'].head.copy()
    # la mano del modelo: lo más lejos del centro hacia ese lado, entre la cadera y el hombro
    cand = [p for p in cuerpo if (p.x - cx) * s * (1 if eb[lado + 'Arm'].tail.x > eb[lado + 'Arm'].head.x else -1) * s > 0 and z0 + H * .35 < p.z < hombro.z + H * .06]
    if not cand: continue
    mano = max(cand, key=lambda p: (p - hombro).length if abs(p.x - cx) > abs(hombro.x - cx) else 0)
    cadena = [eb[lado + n] for n in ('Arm', 'ForeArm', 'Hand')]
    largo = sum(b.length for b in cadena); d = (mano - hombro); dl = d.length
    if dl < largo * .5: continue
    u = d.normalized(); base = hombro.copy(); esc = dl / largo
    for b in cadena:
        l = b.length * esc; b.head = base; b.tail = base + u * l; base = b.tail.copy()
    for n in ('FingerBase', 'HandIndex', 'Thumb'):
        nn = (lado + n) if (lado + n) in eb else (('L' if lado == 'Left' else 'R') + n)
        if nn in eb: v = eb[nn].tail - eb[nn].head; eb[nn].head = base; eb[nn].tail = base + u * max(.02, v.length)
# las piernas del esqueleto, encima de las del modelo: si la cadera de la captura es más ancha o más angosta, la
# rodilla de un lado se acerca a la pierna del otro y se la lleva (salía un «ala» negra al abrir las piernas)
for lado in ('Left', 'Right'):
    up = eb[lado + 'UpLeg']; lad = 1 if up.head.x > cx else -1; zk = eb[lado + 'Leg'].head.z
    banda = [p for p in cuerpo if (p.x - cx) * lad > H * .01 and abs(p.z - zk) < H * .05]
    if len(banda) < 20: continue
    mx = sum(p.x for p in banda) / len(banda); my = sum(p.y for p in banda) / len(banda)
    d = Vector((mx - eb[lado + 'Leg'].head.x, my - eb[lado + 'Leg'].head.y, 0))
    up.head += d * .5
    for n in ('UpLeg', 'Leg', 'Foot', 'ToeBase'):
        b = eb[lado + n]; b.tail += d
        if n != 'UpLeg': b.head += d
bpy.ops.object.mode_set(mode='OBJECT')

# ── los pesos ──
huesos = [b for b in dest.data.bones if not re.search(r'Finger|Index|Thumb|Toe|HipJoint|LowerBack|Hand', b.name) or b.name in ('LeftToeBase', 'RightToeBase')]
for b in dest.data.bones: b.use_deform = b in huesos
segs = [(b.name, dest.matrix_world @ b.head_local, dest.matrix_world @ b.tail_local) for b in huesos]
# de qué lado está cada hueso de brazo o pierna: un vértice de la pierna izquierda nunca se pega a la derecha
ladoH = {n: (1 if ((a + b) / 2).x > cx else -1) for n, a, b in segs if re.match(r'(Left|Right)(UpLeg|Leg|Foot|ToeBase|Arm|ForeArm|Hand|Shoulder)', n)}
def dseg(p, a, b):
    ab = b - a; t = max(0, min(1, (p - a).dot(ab) / max(1e-9, ab.length_squared))); return (a + ab * t - p).length
cuello = mundo(dest, 'Neck').z
for o in mallas:
    o.vertex_groups.clear(); g = {n: o.vertex_groups.new(name=n) for n, _, _ in segs}
    es_pelo = bool(PELO.search(o.name + ' ' + ' '.join(m.name for m in o.data.materials if m)))
    for v in o.data.vertices:
        p = v.co
        if es_pelo and p.z > cuello - H * .02: g['Head'].add([v.index], 1.0, 'REPLACE'); continue
        if es_pelo:  # lo largo del pelo, a la cabeza y un poco al pecho: se mueve con el cuerpo, no con las piernas
            g['Head'].add([v.index], .7, 'REPLACE'); g['Spine1' if 'Spine1' in g else 'Spine'].add([v.index], .3, 'REPLACE'); continue
        lv = 1 if p.x > cx else -1; cerca_centro = abs(p.x - cx) < H * .012
        ds = sorted((dseg(p, a, b), n) for n, a, b in segs if cerca_centro or ladoH.get(n, lv) == lv)[:3]
        w = [1 / max(1e-4, d) ** 4 for d, _ in ds]; t = sum(w)
        for (d, n), wi in zip(ds, w): g[n].add([v.index], wi / t, 'REPLACE')
    mod = o.modifiers.new('Esqueleto', 'ARMATURE'); mod.object = dest; o.parent = dest
cercanos = {o.name: {v.index: [(o.vertex_groups[g.group].name, g.weight) for g in v.groups] for v in o.data.vertices} for o in mallas}

# por difusión (bone heat), malla por malla; el pelo sigue pegado a la cabeza y lo que la difusión no alcanzó
# (mallas abiertas o sueltas: Blender avisa «failed to find solution») se queda con los pesos por cercanía
if os.environ.get('PESOS', 'calor') == 'calor':
    for o in mallas:
        es_pelo = bool(PELO.search(o.name + ' ' + ' '.join(m.name for m in o.data.materials if m)))
        if es_pelo: continue
        for m in list(o.modifiers): o.modifiers.remove(m)
        o.vertex_groups.clear(); o.parent = None
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); dest.select_set(True); bpy.context.view_layer.objects.active = dest
        try: bpy.ops.object.parent_set(type='ARMATURE_AUTO')
        except Exception as e: print('difusión falló en', o.name, e)
        if not any(m.type == 'ARMATURE' for m in o.modifiers):
            mod = o.modifiers.new('Esqueleto', 'ARMATURE'); mod.object = dest; o.parent = dest
        g = {vg.name: vg for vg in o.vertex_groups}; vacios = 0
        for v in o.data.vertices:
            if sum(x.weight for x in v.groups if o.vertex_groups[x.group].name in g) > .05: continue
            vacios += 1
            for n, w in cercanos[o.name][v.index]:
                (g.get(n) or g.setdefault(n, o.vertex_groups.new(name=n))).add([v.index], w, 'REPLACE')
        print('difusión', o.name, len(o.data.vertices), 'vértices,', vacios, 'por cercanía')

# los grosores (para no meter un brazo en el torso): la distancia típica de la piel a su hueso, en reposo
def grosor(nombres, a, b):
    ds = []
    for o in mallas:
        idx = {vg.index for vg in o.vertex_groups if vg.name in nombres}
        for v in o.data.vertices:
            if v.groups and max(v.groups, key=lambda x: x.weight).group in idx: ds.append(dseg(o.matrix_world @ v.co, a, b))
    ds.sort(); return ds[len(ds) // 2] if ds else H * .06
rT = grosor({'Hips', 'LowerBack', 'Spine', 'Spine1'}, mundo(dest, 'Hips'), mundo(dest, 'Neck'))
rP = grosor({'LeftUpLeg', 'RightUpLeg'}, mundo(dest, 'LeftUpLeg'), mundo(dest, 'LeftUpLeg', True))
print('grosores: torso', round(rT / H, 3), 'muslo', round(rP / H, 3))

# ── que nada se atraviese: para cada cuadro, cuánto hay que abrir cada brazo y cada pierna ──
def corregir(N):
    P = lambda n, cola=False: dest.matrix_world @ (dest.pose.bones[n].tail if cola else dest.pose.bones[n].head)
    def gira(p, c, eje, a): return c + Quaternion(eje, a) @ (p - c)
    def ejes():
        arriba = (P('Neck') - P('Hips')).normalized(); lado = P('LeftUpLeg') - P('RightUpLeg'); lado = (lado - arriba * lado.dot(arriba)).normalized()
        return arriba, lado, lado.cross(arriba)
    def brazo_libre(L, q):   # q: el giro que se prueba en el hombro
        S = P(L + 'Arm'); pts = [P(L + 'ForeArm'), (P(L + 'ForeArm') + P(L + 'ForeArm', True)) / 2, P(L + 'ForeArm', True), P(L + 'Hand', True)]
        pts = [S + q @ (p - S) for p in pts]; a, b = P('Hips'), P('Neck')
        if min(dseg(p, a, b) for p in pts) < rT * 1.05: return False
        return min(dseg(pts[-1], P(x + 'UpLeg'), P(x + 'UpLeg', True)) for x in ('Left', 'Right')) >= rP * .95
    def piernas_libres(a):
        _, _, fr = ejes(); pts = {}
        for L, s in (('Left', 1), ('Right', -1)):
            c = P(L + 'UpLeg'); q = Quaternion(fr, -s * a)
            pts[L] = [c + q @ (P(L + 'Leg') - c), c + q @ (P(L + 'Leg', True) - c)]
        A, B = pts['Left'], pts['Right']; n = 6
        return min(dseg(A[0] + (A[1] - A[0]) * (i / n), B[0], B[1]) for i in range(n + 1)) >= rP * 1.35
    abre = {'Left': [], 'Right': [], 'piernas': []}
    for f in range(1, N + 1):
        sc.frame_set(f); bpy.context.view_layer.update(); arriba, lado, fr = ejes()
        for L, s in (('Left', 1), ('Right', -1)):
            mejor = (0, 0)
            if not brazo_libre(L, Quaternion()):
                mejor = None
                for paso in range(1, 13):                                   # hasta 60°: hacia afuera, luego también al frente
                    for ab, fl in ((paso * 5, 0), (paso * 5, paso * 3), (paso * 3, paso * 5)):
                        q = Quaternion(fr, s * math.radians(ab)) @ Quaternion(lado, -math.radians(fl))
                        if brazo_libre(L, q): mejor = (ab, fl); break
                    if mejor: break
                mejor = mejor or (60, 36)
            abre[L].append(mejor)
        a = 0
        while a < 18 and not piernas_libres(math.radians(a)): a += 2
        abre['piernas'].append(a)
    # suavizado: el máximo de los vecinos (que no se meta ni un cuadro) y luego un promedio (que no brinque)
    def suave(xs, r=4, m=3):
        mx = [max(xs[max(0, i - r):i + r + 1]) for i in range(len(xs))]
        return [sum(mx[max(0, i - m):i + m + 1]) / len(mx[max(0, i - m):i + m + 1]) for i in range(len(mx))]
    serie = {L: list(zip(suave([x[0] for x in abre[L]]), suave([x[1] for x in abre[L]]))) for L in ('Left', 'Right')}
    pier = suave(abre['piernas'])
    tocados = 0
    for f in range(1, N + 1):
        sc.frame_set(f); bpy.context.view_layer.update(); arriba, lado, fr = ejes(); i = f - 1
        cambios = []
        for L, s in (('Left', 1), ('Right', -1)):
            ab, fl = serie[L][i]
            if ab > .5 or fl > .5: cambios.append((L + 'Arm', Quaternion(fr, s * math.radians(ab)) @ Quaternion(lado, -math.radians(fl))))
            if pier[i] > .5: cambios.append((L + 'UpLeg', Quaternion(fr, -s * math.radians(pier[i]))))
        for n, q in cambios:
            db = dest.pose.bones[n]; c = db.matrix.translation.copy()
            db.matrix = Matrix.Translation(c) @ q.to_matrix().to_4x4() @ Matrix.Translation(-c) @ db.matrix
            bpy.context.view_layer.update(); db.keyframe_insert('rotation_quaternion', frame=f)
        tocados += bool(cambios)
    print('  corregidos', tocados, 'de', N, 'cuadros')

# ── los bailes ──
rq = lambda M: M.to_3x3().normalized().to_quaternion()
def reposo(arm): return {b.name: rq(arm.matrix_world @ b.matrix_local) for b in arm.data.bones}
R_dest = reposo(dest); C_dest = (dest.matrix_world @ dest.data.bones['Hips'].head_local).copy()
orden = [b.name for b in dest.data.bones]          # padres antes que hijos
for pb in dest.pose.bones: pb.rotation_mode = 'QUATERNION'
dest.animation_data_create()
for i, bvh in enumerate(BAILES):
    src = fuente if i == 0 else importar(bvh)
    if i > 0:
        src.scale = fuente.scale; src.rotation_euler = fuente.rotation_euler; bpy.context.view_layer.update()
        c = mundo(src, 'Hips'); p0 = min(mundo(src, n).z for n in ('LeftToeBase', 'RightToeBase')); src.location += Vector((cx - c.x, cy - c.y, z0 - p0)); bpy.context.view_layer.update()
    R_src = reposo(src); act = bpy.data.actions[src['baile']]; src.animation_data.action = act
    f0, f1 = [int(x) for x in act.frame_range]
    paso = max(1, round(120 / FPS))                  # las capturas de CMU van a 120 cuadros por segundo
    nombre = re.sub(r'\.bvh$', '', bvh.split('/')[-1])
    nueva = bpy.data.actions.new(nombre); nueva.use_fake_user = True; dest.animation_data.action = nueva
    largo = min(f1 - f0, 120 * 20)                   # 20 s de baile como mucho
    sc.frame_set(f0); bpy.context.view_layer.update(); base = (src.matrix_world @ src.pose.bones['Hips'].head).copy()
    for j, f in enumerate(range(f0, f0 + largo, paso)):
        sc.frame_set(f); bpy.context.view_layer.update()
        # de frente al público: el giro del cuerpo entero alrededor del eje vertical se quita a TODOS los huesos
        # (la macarena da cuartos de vuelta y la cantante quedaba de espaldas); se deja una pizca para que no se vea tiesa
        gH = rq(src.matrix_world @ src.pose.bones['Hips'].matrix) @ R_src['Hips'].inverted()
        tw = Quaternion((gH.w, 0, 0, gH.z)); tw.normalize(); quita = Quaternion().slerp(tw, .88).inverted()
        for n in orden:
            pb = src.pose.bones.get(n); db = dest.pose.bones.get(n)
            if not pb or not db: continue
            W = src.matrix_world @ pb.matrix                     # el hueso de la captura, en el mundo
            giro = quita @ rq(W) @ R_src[n].inverted()           # cuánto giró desde su reposo, en el mundo
            R = (giro @ R_dest[n]).to_matrix().to_4x4()
            if n == 'Hips':                                      # en su lugar: el rebote y un poco del vaivén
                c = W.translation; pos = C_dest + Vector(((c.x - base.x) * .15, (c.y - base.y) * .15, c.z - base.z))
            else: pos = db.matrix.translation.copy()             # la cabeza del hueso la pone su padre
            db.matrix = Matrix.Translation(pos) @ R
            bpy.context.view_layer.update()
            db.keyframe_insert('rotation_quaternion', frame=j + 1)
            if n == 'Hips': db.keyframe_insert('location', frame=j + 1)
    print('baile', nombre, j + 1, 'cuadros')
    corregir(j + 1)
    src.animation_data.action = None
    if src is not fuente: bpy.data.objects.remove(src)
bpy.data.objects.remove(fuente)

# ── a GLB, con cada baile como una animación ──
for o in sc.objects: o.select_set(o == dest or o in mallas)
dest.animation_data.action = None
for a in bpy.data.actions:
    if a.users == 0 and not a.use_fake_user: bpy.data.actions.remove(a)
bpy.ops.export_scene.gltf(filepath=SALIDA, export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='ACTIONS',
    export_skins=True, export_force_sampling=True, export_frame_step=1, export_yup=True, export_image_format='AUTO', export_draco_mesh_compression_enable=False)
print('listo', SALIDA)
