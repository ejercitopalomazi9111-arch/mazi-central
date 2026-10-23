/* El respaldo de «Mis pingüinos»: que guarde, liste, devuelva la foto, borre,
   y que nadie entre sin el código.
     node sala/servidor/pruebas-pinguinos.mjs                                   */
import { manejar, TOPE, LETRAS_COL, LARGO_COL } from './pinguinos.js';
import trabajador from './index.js';
let bien = 0, mal = 0;
const ok = (c, t, extra = '') => { if(c){ bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t, extra); } };

/* Un almacén de mentiras con lo mismo que usa el de Cloudflare. */
function almacen(){
  const m = new Map();
  return {
    m,
    async get(k){ return m.get(k); },
    async put(k, v){ m.set(k, v); },
    async delete(k){ for(const x of [].concat(k)) m.delete(x); },
    async list({ prefix = '', limit = Infinity } = {}){
      const r = new Map();
      for(const [k, v] of [...m].sort()) if(k.startsWith(prefix) && r.size < limit) r.set(k, v);
      return r;
    },
  };
}
const objetos = new Map();
const env = {
  ORIGENES: 'https://mazi-central.palomazi9111.workers.dev',
  PINGUINOS: {
    idFromName: (n) => n,
    get: (id) => ({ fetch: (p) => { if(!objetos.has(id)) objetos.set(id, almacen()); return manejar(objetos.get(id), p); } }),
  },
};
const COL = 'ABCDEFGHJK23456789MN';
const base = 'https://sala.x/api/pinguinos/' + COL + '/';
const foto = 'data:image/jpeg;base64,' + Buffer.from('foto-de-pingu').toString('base64');
const pide = (accion, cuerpo, extra = {}) => trabajador.fetch(new Request(base + accion, cuerpo === undefined
  ? { headers: extra } : { method: 'POST', body: JSON.stringify(cuerpo), headers: { 'content-type': 'application/json', ...extra } }), env);

ok(LARGO_COL === 20 && COL.length === 20 && [...COL].every((x) => LETRAS_COL.includes(x)), 'el código de prueba tiene la forma de verdad');

let r = await pide('poner', { id: 'p1', nombre: 'Pingu', nota: 'De la abuela', creado: 5, foto });
ok(r.status === 200 && (await r.json()).bien, 'guarda un pingüino con su foto');
r = await pide('lista');
let d = await r.json();
ok(d.peluches.length === 1 && d.peluches[0].nombre === 'Pingu' && d.peluches[0].nota === 'De la abuela', 'la lista lo trae');
ok(!('foto' in d.peluches[0]), 'y sin la foto: la lista no carga imágenes');
r = await pide('foto?id=p1');
ok(r.status === 200 && r.headers.get('content-type') === 'image/jpeg' && Buffer.from(await r.arrayBuffer()).toString() === 'foto-de-pingu', 'la foto sale tal cual, como imagen');

r = await pide('poner', { id: 'p1', nombre: 'Pingu II', creado: 5 });
ok(r.status === 200, 'cambiar sólo el nombre no exige volver a subir la foto');
d = await (await pide('lista')).json();
ok(d.peluches[0].nombre === 'Pingu II', 'y el nombre cambió');
r = await pide('foto?id=p1');
ok(r.status === 200, 'y la foto sigue');

r = await pide('poner', { id: 'p2', nombre: 'Sin foto' });
ok(r.status === 400, 'uno nuevo sin foto no se guarda');
r = await pide('poner', { id: 'p3', nombre: 'x', foto: 'data:text/html;base64,PHNjcmlwdD4=' });
ok(r.status === 400, 'una «foto» que no es imagen no entra');
r = await pide('poner', { id: 'p4', nombre: 'x', foto: 'data:image/jpeg;base64,' + 'A'.repeat(TOPE.foto) });
ok(r.status === 413, 'una foto demasiado pesada no entra');
r = await pide('poner', { id: '../../x', nombre: 'x', foto });
ok(r.status === 400, 'un id raro no entra');
r = await pide('poner', { id: 'p5', nombre: '<b>' + 'n'.repeat(80), foto });
d = await (await pide('lista')).json();
ok(d.peluches.find((p) => p.id === 'p5').nombre.length === TOPE.nombre, 'el nombre se recorta a su tope');

r = await pide('quitar', { id: 'p1' });
d = await (await pide('lista')).json();
ok(r.status === 200 && !d.peluches.some((p) => p.id === 'p1'), 'quitar lo borra de la lista');
ok((await pide('foto?id=p1')).status === 404, 'y borra su foto también');

/* sin el código no se llega */
r = await trabajador.fetch(new Request('https://sala.x/api/pinguinos/CORTO/lista'), env);
ok(r.status === 400, 'un código que no tiene la forma se rechaza');
r = await trabajador.fetch(new Request('https://sala.x/api/pinguinos/ZZZZZZZZZZZZZZZZZZZZ/lista'), env);
d = await r.json();
ok(r.status === 200 && d.peluches.length === 0, 'otro código es otra colección: no ve nada de ésta');

/* desde una página ajena, no */
r = await pide('lista', undefined, { Origin: 'https://otra-pagina.com' });
ok(r.status === 403, 'una página de otro sitio no puede leer la colección');
r = await pide('lista', undefined, { Origin: 'https://mazi-central.palomazi9111.workers.dev' });
ok(r.status === 200 && r.headers.get('Access-Control-Allow-Origin') === 'https://mazi-central.palomazi9111.workers.dev', 'la app sí, con su permiso de CORS');

/* el tope de la colección */
const llena = almacen();
for(let i = 0; i < TOPE.peluches; i++) llena.m.set('p:x' + i, { id: 'x' + i });
r = await manejar(llena, new Request(base + 'poner', { method: 'POST', body: JSON.stringify({ id: 'nuevo', nombre: 'n', foto }) }));
ok(r.status === 409, 'con ' + TOPE.peluches + ' ya no caben más');

/* sin el objeto puesto (antes de desplegar) dice qué pasa en vez de tronar */
r = await trabajador.fetch(new Request(base + 'lista'), { ...env, PINGUINOS: undefined });
ok(r.status === 503 && /encendido/.test((await r.json()).error), 'si el respaldo no está encendido, lo dice');

console.log(`\n${bien} bien · ${mal} mal`);
process.exit(mal ? 1 : 0);
