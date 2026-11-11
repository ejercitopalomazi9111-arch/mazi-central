/* Pruebas de la Comunidad de INKWELL (comunidad.js), con SQLite de verdad (node:sqlite) en lugar del
   Durable Object: es el mismo código y la misma base.  node sala/servidor/pruebas-comunidad.mjs */
import { DatabaseSync } from 'node:sqlite';
import { manejar, ESQUEMA } from './comunidad.js';

let bien = 0, mal = 0; const ok = (c, t) => { if (c) { bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t); } };
const db = new DatabaseSync(':memory:'); db.exec(ESQUEMA);
const q = (sql, ...v) => db.prepare(sql).all(...v);
let reloj = Date.UTC(2026, 10, 10, 20);
async function pide(accion, { datos, token, metodo, params = '', llaveOk = false, salto = 1000 } = {}){
  reloj += salto;
  const h = { 'content-type': 'application/json' }; if (token) h['x-token'] = token;
  const r = await manejar(q, new Request(`https://x/api/sala/comunidad/${accion}${params}`, { method: metodo || (datos ? 'POST' : 'GET'), headers: h, body: datos ? JSON.stringify(datos) : undefined }), { ahora: reloj, llaveOk });
  const t = r.headers.get('content-type') || '';
  return { status: r.status, ...(t.includes('json') ? await r.json() : { bytes: (await r.arrayBuffer()).byteLength, tipo: t }) };
}

console.log('cuentas');
let r = await pide('registro', { datos: { usuario: 'Carlos', clave: 'corta' } });
ok(r.status === 400 && /8 caracteres/.test(r.error), 'una contraseña corta no se acepta');
r = await pide('registro', { datos: { usuario: 'ca rlos!', clave: 'muybuena123' } });
ok(r.status === 400, 'un usuario con espacios o símbolos no se acepta');
const carlos = await pide('registro', { datos: { usuario: 'Palomazi', nombre: 'Carlos', clave: 'muybuena123' } });
ok(carlos.bien && carlos.token && /^[A-Z2-9]{12}$/.test(carlos.recuperacion) && carlos.yo.usuario === 'palomazi', 'se crea la cuenta, con token y código de recuperación de 12 letras');
r = await pide('registro', { datos: { usuario: 'palomazi', clave: 'otra12345' } });
ok(r.status === 409, 'no se repite un usuario');
const luis = await pide('registro', { datos: { usuario: 'luis_g', nombre: 'Luis', clave: 'clave-de-luis' } });
const ana = await pide('registro', { datos: { usuario: 'ana', nombre: 'Ana', clave: 'clave-de-ana' } });
const guardada = q('SELECT clave, sal FROM cuentas WHERE usuario = ?', 'palomazi')[0];
ok(guardada.clave.length === 64 && !guardada.clave.includes('muybuena') && guardada.sal.length === 32, 'la contraseña se guarda derivada (PBKDF2) con su sal, nunca tal cual');
ok(q('SELECT huella FROM sesiones').every((s) => s.huella.length === 64 && s.huella !== carlos.token), 'de la sesión sólo se guarda la huella del token');
r = await pide('yo', { token: carlos.token });
ok(r.yo && r.yo.usuario === 'palomazi' && r.yo.nombre === 'Carlos', '«yo» dice quién eres con tu token');
r = await pide('yo', { token: 'inventado' });
ok(r.yo === null, 'un token inventado no es nadie');
r = await pide('entrar', { datos: { usuario: 'palomazi', clave: 'mala' } });
ok(r.status === 401 && /equivocados/.test(r.error), 'con la contraseña mala no entra (y no dice cuál de los dos falló)');
for (let i = 0; i < 4; i++) await pide('entrar', { datos: { usuario: 'palomazi', clave: 'mala' } });
r = await pide('entrar', { datos: { usuario: 'palomazi', clave: 'muybuena123' } });
ok(r.status === 429, 'a los 5 intentos malos se bloquea 15 minutos, aunque luego pongas la buena');
r = await pide('entrar', { datos: { usuario: 'palomazi', clave: 'muybuena123' }, salto: 16 * 60_000 });
ok(r.bien && r.token, 'pasados los 15 minutos, entra');
r = await pide('recuperar', { datos: { usuario: 'palomazi', codigo: 'AAAAAAAAAAAA', clave: 'nueva-clave-1' } });
ok(r.status === 401, 'recuperar con un código ajeno no sirve');
r = await pide('recuperar', { datos: { usuario: 'palomazi', codigo: carlos.recuperacion.toLowerCase().replace(/(.{4})/g, '$1-'), clave: 'nueva-clave-1' } });
ok(r.bien && r.recuperacion && r.recuperacion !== carlos.recuperacion, 'con su código (aunque lo escribas con guiones o minúsculas) pone otra contraseña y da un código nuevo');
const tokCarlos = r.token;
ok((await pide('yo', { token: carlos.token })).yo === null, 'y cierra las sesiones viejas');
ok((await pide('recuperar', { datos: { usuario: 'palomazi', codigo: carlos.recuperacion, clave: 'otra-mas-123' } })).status === 401, 'el código viejo ya no sirve otra vez');

console.log('\nadmins');
r = await pide('admin', { datos: { usuario: 'palomazi' } });
ok(r.status === 403, 'sin la llave de La Sala nadie se hace admin');
r = await pide('admin', { datos: { usuario: 'palomazi' }, llaveOk: true });
ok(r.bien && (await pide('yo', { token: tokCarlos })).yo.admin, 'con la llave, Carlos queda de admin');

console.log('\ncomentarios');
r = await pide('comentar', { datos: { obra: 'webtoon:777', texto: 'hola' } });
ok(r.status === 401, 'sin cuenta no se comenta');
const c1 = await pide('comentar', { token: luis.token, datos: { obra: 'webtoon:777', texto: 'Qué capítulo, @Palomazi tienes que leerlo' } });
const c2 = await pide('comentar', { token: ana.token, datos: { obra: 'webtoon:777', cap: '3', texto: 'El final del 3 <script>alert(1)</script>', spoiler: true } });
ok(c1.bien && c2.bien, 'Luis comenta la serie y Ana un capítulo');
r = await pide('hilo', { params: '?obra=webtoon:777' });
ok(r.comentarios.length === 1 && r.comentarios[0].usuario === 'luis_g', 'el hilo de la serie no mezcla los del capítulo');
r = await pide('hilo', { params: '?obra=webtoon:777&cap=3' });
ok(r.comentarios.length === 1 && r.comentarios[0].spoiler && r.comentarios[0].texto.includes('<script>'), 'el del capítulo 3 sale aparte, marcado como spoiler (el texto va tal cual: la pantalla lo pinta como texto)');
const resp = await pide('comentar', { token: tokCarlos, datos: { obra: 'webtoon:777', texto: 'Ya voy', padre: c1.id } });
const resp2 = await pide('comentar', { token: ana.token, datos: { obra: 'webtoon:777', texto: 'yo también', padre: resp.id } });
r = await pide('hilo', { params: '?obra=webtoon:777' });
ok(r.comentarios.filter((c) => c.padre === c1.id).length === 2, 'las respuestas quedan bajo el comentario original (aunque respondas a una respuesta)');
await pide('reaccionar', { token: tokCarlos, datos: { id: c1.id, tipo: 'encanta' } });
await pide('reaccionar', { token: ana.token, datos: { id: c1.id, tipo: 'encanta' } });
await pide('reaccionar', { token: ana.token, datos: { id: c1.id, tipo: 'risa' } });
r = await pide('hilo', { token: ana.token, params: '?obra=webtoon:777' });
const h1 = r.comentarios.find((c) => c.id === c1.id);
ok(h1.reacciones.encanta === 1 && h1.reacciones.risa === 1 && h1.mia === 'risa', 'cada quien tiene UNA reacción por comentario, y la puede cambiar');
await pide('reaccionar', { token: ana.token, datos: { id: c1.id, tipo: 'risa' } });
r = await pide('hilo', { token: ana.token, params: '?obra=webtoon:777' });
ok(!r.comentarios.find((c) => c.id === c1.id).reacciones.risa, 'tocar la misma otra vez la quita');
r = await pide('borrar', { token: ana.token, datos: { id: c1.id } });
ok(r.status === 403, 'no puedes borrar lo de otro');
r = await pide('editar', { token: luis.token, datos: { id: c1.id, texto: 'Qué capítulo (editado)' } });
r = await pide('hilo', { params: '?obra=webtoon:777' });
ok(r.comentarios.find((c) => c.id === c1.id).editado > 0, 'el tuyo lo puedes editar y queda marcado');
r = await pide('cuantos', { params: '?obra=webtoon:777' });
ok(r.caps[''] === 3 && r.caps['3'] === 1, 'cuántos comentarios tiene cada capítulo');

console.log('\navisos');
r = await pide('avisos', { token: tokCarlos });
const tipos = r.avisos.map((a) => a.tipo);
ok(tipos.includes('mencion'), 'a Carlos le llega aviso cuando lo mencionan con @');
r = await pide('avisos', { token: luis.token });
ok(r.avisos.some((a) => a.tipo === 'respuesta' && a.de === 'palomazi') && r.avisos.some((a) => a.tipo === 'reaccion'), 'a Luis le avisan cuando le responden y cuando reaccionan');
ok((await pide('yo', { token: luis.token })).yo.avisos >= 2, '«yo» cuenta los avisos sin leer');
await pide('avisos', { token: luis.token, datos: {} });
ok((await pide('yo', { token: luis.token })).yo.avisos === 0, 'y se marcan leídos');
r = await pide('avisos', { token: ana.token });
ok(r.avisos.some((a) => a.tipo === 'reaccion' && a.de === 'palomazi') === false, 'no te avisan de tus propias cosas');

console.log('\nperfiles y seguir');
r = await pide('perfil', { token: ana.token, datos: { nombre: 'Ana Sofía', bio: 'Leo de noche', foto: 'data:image/png;base64,iVBORw0KGgo=', estante: [{ id: 'webtoon:777', titulo: 'Mi serie', lista: 'leyendo', nota: 5 }], publico: true } });
ok(r.bien, 'Ana arma su perfil con foto, bio y estante');
r = await pide('perfil', { token: ana.token, datos: { foto: 'javascript:alert(1)' } });
ok(r.status === 400, 'una «foto» que no es imagen se rechaza');
await pide('seguir', { token: luis.token, datos: { usuario: 'ana' } });
await pide('seguir', { token: luis.token, datos: { usuario: 'ana' } });
r = await pide('perfil', { token: luis.token, params: '?u=ana' });
ok(r.perfil.nombre === 'Ana Sofía' && r.perfil.seguidores === 1 && r.perfil.loSigo && r.perfil.estante.length === 1, 'su perfil enseña nombre, estante y seguidores (seguir dos veces cuenta una)');
r = await pide('foto', { params: '?u=ana' });
ok(r.tipo === 'image/png' && r.bytes > 0, 'la foto se sirve como imagen');
await pide('perfil', { token: ana.token, datos: { publico: false } });
ok((await pide('perfil', { params: '?u=ana' })).perfil.estante === null, 'con el estante privado, no se ve');
ok((await pide('avisos', { token: ana.token })).avisos.some((a) => a.tipo === 'seguidor'), 'a Ana le avisan que alguien la sigue');
ok((await pide('seguir', { token: ana.token, datos: { usuario: 'ana' } })).status === 400, 'no te puedes seguir a ti mismo');

console.log('\nforos');
r = await pide('tema', { token: ana.token, datos: { titulo: 'Te', texto: 'x' } });
ok(r.status === 400, 'un tema necesita título');
const t1 = await pide('tema', { token: ana.token, datos: { categoria: 'teorias', titulo: '¿Quién es el villano de verdad?', texto: 'Yo creo que el hermano' } });
const t2 = await pide('tema', { token: luis.token, datos: { categoria: 'recomendaciones', titulo: 'Manhwas como Solo Leveling', texto: 'Pásenme' } });
ok(t1.bien && t2.bien, 'se abren temas en el foro');
await pide('comentar', { token: luis.token, datos: { obra: 'tema:' + t1.id, texto: 'No, es la reina' } });
r = await pide('temas');
ok(r.temas[0].id === t1.id && r.temas[0].respuestas === 1, 'el tema con la respuesta más reciente sube');
ok((await pide('temas', { params: '?categoria=recomendaciones' })).temas.length === 1, 'se filtran por categoría');
ok((await pide('avisos', { token: ana.token })).avisos.some((a) => a.tipo === 'tema'), 'a quien abrió el tema le avisan las respuestas');
r = await pide('hilo', { params: '?obra=tema:' + t1.id });
ok(r.comentarios.length === 2 && r.comentarios[0].texto === 'Yo creo que el hermano', 'el tema guarda su primer mensaje y las respuestas');

ok((await pide('comentar', { token: luis.token, datos: { obra: 'tema:oscuro', texto: 'hola' } })).status === 404, 'no se puede comentar en un tema que no existe');
console.log('\nmoderar');
await pide('reportar', { token: ana.token, datos: { id: c1.id, motivo: 'spoiler sin marcar' } });
await pide('reportar', { token: ana.token, datos: { id: c1.id, motivo: 'otra vez' } });
ok((await pide('reportes', { token: luis.token })).status === 403, 'los reportes sólo los ve un admin');
r = await pide('reportes', { token: tokCarlos });
ok(r.reportes.length === 1 && r.reportes[0].motivo === 'spoiler sin marcar', 'Carlos ve el reporte (uno por persona)');
await pide('moderar', { token: tokCarlos, datos: { comentario: c1.id, ocultar: true, reporte: r.reportes[0].id } });
ok(!(await pide('hilo', { params: '?obra=webtoon:777' })).comentarios.some((c) => c.id === c1.id), 'el comentario oculto ya no sale');
ok((await pide('hilo', { token: tokCarlos, params: '?obra=webtoon:777' })).comentarios.some((c) => c.id === c1.id && c.oculto), 'el admin sí lo ve, marcado');
await pide('moderar', { token: tokCarlos, datos: { suspender: { usuario: 'luis_g', si: true } } });
ok((await pide('entrar', { datos: { usuario: 'luis_g', clave: 'clave-de-luis' } })).status === 403, 'una cuenta suspendida no entra');
await pide('moderar', { token: tokCarlos, datos: { suspender: { usuario: 'palomazi', si: true } } });
ok((await pide('yo', { token: tokCarlos })).yo !== null && !q('SELECT suspendido FROM cuentas WHERE usuario = ?', 'palomazi')[0].suspendido, 'a un admin no se le suspende');

console.log('\nspam');
let frenado = false;
for (let i = 0; i < 14; i++) { const x = await pide('comentar', { token: ana.token, datos: { obra: 'webtoon:888', texto: 'spam ' + i }, salto: 100 }); if (x.status === 429) frenado = true; }
ok(frenado, 'más de 12 comentarios en un minuto se frenan');
r = await pide('comentar', { token: ana.token, datos: { obra: 'webtoon:888', texto: 'ya calmada' }, salto: 70_000 });
ok(r.bien, 'pasado el minuto, se puede otra vez');
ok((await pide('comentar', { token: ana.token, datos: { obra: 'webtoon:888', texto: 'x'.repeat(5000) } })).bien && q("SELECT length(texto) n FROM comentarios ORDER BY id DESC LIMIT 1")[0].n === 2000, 'un comentario larguísimo se recorta a 2,000');
r = await manejar(q, new Request('https://x/api/sala/comunidad/comentar', { method: 'POST', headers: { 'x-token': ana.token }, body: 'x'.repeat(300_000) }), { ahora: reloj });
ok(r.status === 413, 'un envío gigante se rechaza antes de leerlo');
ok((await pide('reciente')).comentarios.length > 0, '«reciente» trae lo último de toda la comunidad');
await pide('salir', { token: ana.token, datos: {} });
ok((await pide('yo', { token: ana.token })).yo === null, 'salir cierra la sesión');

console.log(`\n${bien} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
