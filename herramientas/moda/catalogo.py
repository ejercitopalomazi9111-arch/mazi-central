import json, os
os.chdir(os.environ.get('TRABAJO') or os.path.join(os.path.dirname(os.path.abspath(__file__)),'trabajo'))
d=json.load(open('alls.json'))
G={
 'bodega':[0,1,4,5,6,7,8,18,19,20,21,22],
 'bolsas_grupo':[2,3,26,30], 'bolsa':[31,32,125,126,127],
 'playeras_grupo':[9,10,11,13,14,15,25,52,53], 'playera':[12], 'polos_grupo':[51],
 'tenis_grupo':[16,17,35], 'tenis':[36,37,40,43,44,45,46,47,48,49,50,120,121],
 'botas':[23,38,41,42], 'termo':[33,39], 'locion':[56,57], 'locion_grupo':[29], 'cosmeticos':[34],
 'pantalon':[54,55,58,59,60], 'sudadera':[i for i in range(78,117) if i not in (89,94)], 'chamarra':[89,94],
 'camisa':[117,118], 'camisas_grupo':[122,123,124,128], 'cinturones':[119],
}
out=[]
for cat,ids in G.items():
    for i in ids:
        x=d[i]; out.append({'i':i,'id':x['id'],'cat':cat,'arch':x['id']+('.png' if x['mime']=='image/png' else '.jpg'),'w':x['ancho'],'h':x['alto'],'titulo':x.get('titulo') or ''})
json.dump(out,open('catalogo.json','w'),ensure_ascii=False,indent=0)
print(len(out))
