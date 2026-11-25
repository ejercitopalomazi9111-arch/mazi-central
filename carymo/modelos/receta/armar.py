# armar.py — de BodyParts3D (CC BY-SA 2.1 JP, DBCLS) a un GLB con una pieza por parte, para tocarla en CARYMO.
# Corre dentro de Blender:  blender -b -P armar.py -- receta.json CARPETA_BP3D salida.glb
# La receta dice qué conceptos del atlas van en cada pieza; un elemento sólo entra a la primera pieza que lo pide.
import bpy, json, sys, os, collections, re
args = sys.argv[sys.argv.index('--') + 1:]
receta = json.load(open(args[0])); base = args[1]; salida = args[2]
mapa = collections.defaultdict(list)
for linea in open(os.path.join(base, 'partof_element_parts.txt')).read().splitlines()[1:]:
    c = linea.split('\t')
    if len(c) >= 3: mapa[c[1]].append(c[2])
objs = os.path.join(base, 'partof_BP3D_4.0_obj_99')
bpy.ops.wm.read_factory_settings(use_empty=True)
usados = set()
for parte in receta['partes']:
    ids = []
    dentro = set(e for c in parte.get('dentro', []) for e in mapa.get(c, [])) if parte.get('dentro') else None
    conceptos = list(parte.get('conceptos', []))
    if parte.get('patron'): conceptos += [c for c in mapa if re.search(parte['patron'], c.lower())]
    for con in conceptos:
        for e in mapa.get(con, []):
            if e not in usados and (dentro is None or e in dentro): usados.add(e); ids.append(e)
    if not ids: print('SIN ELEMENTOS', parte['id']); continue
    antes = set(bpy.data.objects)
    for e in ids:
        bpy.ops.wm.obj_import(filepath=os.path.join(objs, e + '.obj'))
    nuevos = [o for o in bpy.data.objects if o not in antes and o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in nuevos: o.select_set(True)
    bpy.context.view_layer.objects.active = nuevos[0]
    if len(nuevos) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = parte['id']; o.data.name = parte['id']
    caras = len(o.data.polygons); meta = parte.get('caras', receta.get('caras', 6000))
    if caras > meta:
        m = o.modifiers.new('d', 'DECIMATE'); m.ratio = meta / caras
        bpy.ops.object.modifier_apply(modifier='d')
    bpy.ops.object.shade_smooth()
    mat = bpy.data.materials.new(parte['id']); mat.use_nodes = True
    r, g, b = [int(parte['color'][i:i + 2], 16) / 255 for i in (1, 3, 5)]
    bsdf = mat.node_tree.nodes['Principled BSDF']; bsdf.inputs['Base Color'].default_value = (r ** 2.2, g ** 2.2, b ** 2.2, 1); bsdf.inputs['Roughness'].default_value = .55
    o.data.materials.clear(); o.data.materials.append(mat)
    print('PARTE', parte['id'], len(ids), 'elementos', caras, '->', len(o.data.polygons), 'caras')
bpy.ops.export_scene.gltf(filepath=salida, export_format='GLB', use_selection=False, export_apply=True, export_normals=True, export_draco_mesh_compression_enable=False)
print('LISTO', salida, os.path.getsize(salida))
