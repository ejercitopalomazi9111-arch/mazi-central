# LA REVISIÓN DE LOS BAILES (Carlos, 30 oct: «tu riggeo está mal, o el rig está bien pero la animación no revisa
# que nada se toque mal al animar o se deforme»). Reproduce cada baile de una cantante y cuenta, cuadro por cuadro:
#   · BRAZO ADENTRO: el antebrazo o la mano se mete en el torso (más hondo que el 80 % de su grosor);
#   · MANO EN PIERNA: la mano se mete en el muslo;
#   · PIERNAS CRUZADAS: las rodillas o los tobillos se atraviesan entre sí;
#   · ESTIRADO: aristas de la malla que crecen más de 1.7 veces o se encogen a menos de la mitad (piel de chicle).
# Un cuadro «malo» es el que tiene cualquiera de las cuatro. Sale un renglón por baile y el total.
#
#   blender -b -P herramientas/revisar-bailes.py -- modelo.glb [modelo2.glb …]
import bpy, sys, re, statistics
from mathutils import Vector

def dseg(p, a, b):
    ab = b - a; t = max(0, min(1, (p - a).dot(ab) / max(1e-9, ab.length_squared))); return (a + ab * t - p).length
def dsegseg(a, b, c, d, n=6):
    return min(dseg(a + (b - a) * (i / n), c, d) for i in range(n + 1))

def revisar(ruta):
    bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=ruta)
    arm = next(o for o in sc.objects if o.type == 'ARMATURE'); mallas = [o for o in sc.objects if o.type == 'MESH' and o.find_armature() == arm]
    arm.animation_data_create(); arm.animation_data.action = None
    for pb in arm.pose.bones: pb.matrix_basis.identity()
    bpy.context.view_layer.update()
    B = lambda n, cola=False: arm.matrix_world @ (arm.pose.bones[n].tail if cola else arm.pose.bones[n].head)
    # grosores en reposo: la distancia típica de la piel de cada parte a su hueso
    dg = bpy.context.evaluated_depsgraph_get()
    def piel(nombres, a, b):
        ds = []
        for o in mallas:
            idx = {g.index for g in o.vertex_groups if g.name in nombres}
            if not idx: continue
            me = o.evaluated_get(dg).to_mesh()
            for v, v0 in zip(me.vertices, o.data.vertices):
                if v0.groups and max(v0.groups, key=lambda g: g.weight).group in idx: ds.append(dseg(o.matrix_world @ v.co, a, b))
            o.evaluated_get(dg).to_mesh_clear()
        return statistics.median(ds) if ds else .05
    rT = piel({'Hips', 'LowerBack', 'Spine', 'Spine1'}, B('Hips'), B('Neck'))
    rP = piel({'LeftUpLeg', 'RightUpLeg'}, B('LeftUpLeg'), B('LeftUpLeg', True))
    alto = B('Head', True).z - min(B('LeftFoot').z, B('RightFoot').z)
    # las aristas en reposo, para medir el estiramiento
    reposo = []
    for o in mallas:
        me = o.evaluated_get(dg).to_mesh(); P = [o.matrix_world @ v.co for v in me.vertices]
        reposo.append([(e.vertices[0], e.vertices[1], (P[e.vertices[0]] - P[e.vertices[1]]).length) for e in me.edges][::7]); o.evaluated_get(dg).to_mesh_clear()
    print(f'\n== {ruta.split("/")[-1]}  torso {rT / alto:.3f} · muslo {rP / alto:.3f} (en altos)')
    total = [0, 0]
    for act in [a for a in bpy.data.actions if a.name and not a.name.startswith('_')]:
        arm.animation_data.action = act; f0, f1 = [int(x) for x in act.frame_range]
        cuenta = {'brazo': 0, 'mano-pierna': 0, 'piernas': 0, 'estirado': 0}; malos = 0; n = 0
        for f in range(f0, f1 + 1, 3):
            sc.frame_set(f); n += 1; mal = False
            torso = (B('Hips'), B('Neck'))
            for L in ('Left', 'Right'):
                for p in (B(L + 'ForeArm'), (B(L + 'ForeArm') + B(L + 'ForeArm', True)) / 2, B(L + 'ForeArm', True), B(L + 'Hand', True)):
                    if dseg(p, *torso) < rT * .8: cuenta['brazo'] += 1; mal = True; break
                mano = B(L + 'Hand', True)
                if min(dseg(mano, B(x + 'UpLeg'), B(x + 'UpLeg', True)) for x in ('Left', 'Right')) < rP * .7: cuenta['mano-pierna'] += 1; mal = True
            if dsegseg(B('LeftLeg'), B('LeftLeg', True), B('RightLeg'), B('RightLeg', True)) < rP * 1.1: cuenta['piernas'] += 1; mal = True
            if f % 9 == 0:
                dg = bpy.context.evaluated_depsgraph_get(); mal_e = 0; tot_e = 0
                for o, R in zip(mallas, reposo):
                    me = o.evaluated_get(dg).to_mesh(); P = [o.matrix_world @ v.co for v in me.vertices]
                    for i, j, l0 in R:
                        if l0 < 1e-5: continue
                        q = (P[i] - P[j]).length / l0; tot_e += 1; mal_e += q > 1.7 or q < .5
                    o.evaluated_get(dg).to_mesh_clear()
                if tot_e and mal_e / tot_e > .004: cuenta['estirado'] += 1; mal = True
            malos += mal
        total[0] += malos; total[1] += n
        print(f'  {act.name:10s} {malos:4d}/{n:<4d} cuadros malos ({100 * malos / max(1, n):4.1f} %)  ' + '  '.join(f'{k} {v}' for k, v in cuenta.items()))
    print(f'  TOTAL {total[0]}/{total[1]} ({100 * total[0] / max(1, total[1]):.1f} %)')
    return total

for r in sys.argv[sys.argv.index('--') + 1:]: revisar(r)
