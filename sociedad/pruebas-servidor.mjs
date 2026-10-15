/* LA SOCIEDAD · pruebas del servidor (permisos y ataques), sin navegador.
   Contra `wrangler dev` (API=http://127.0.0.1:8791, lo de siempre) o contra
   producción (API=https://fadori.palomazi9111.workers.dev), en una escuela de
   prueba aparte que nadie más ve.

   node sociedad/pruebas-servidor.mjs                                       */
const API = process.env.API || 'http://127.0.0.1:8791';
const CASA = 'prueba-soc-' + Date.now();
const fallas = [];
const ok = (q, c, extra) => { console.log((c ? '  ✓ ' : '  ✗ ') + q + (!c && extra ? ' · ' + JSON.stringify(extra).slice(0, 200) : '')); if(!c) fallas.push(q); };
const hex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
const COD = () => Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

async function llamar(ruta, cuerpo, { ap, admin, metodo = 'POST', binario, crudo } = {}){
  const h = { 'content-type': binario ? 'application/octet-stream' : 'application/json' };
  if(ap) h['x-fadori-aparato'] = ap; if(admin) h['x-fadori-admin'] = admin;
  const r = await fetch(API + '/api' + ruta + (ruta.includes('?') ? '&' : '?') + 'casa=' + CASA,
    { method: metodo, headers: h, body: metodo === 'GET' ? undefined : binario || crudo || JSON.stringify(cuerpo || {}) });
  const t = r.headers.get('content-type') || '';
  return { st: r.status, j: t.includes('json') ? await r.json() : null, b: t.includes('json') ? null : await r.arrayBuffer() };
}
const soc = (que, cuerpo, op) => llamar('/soc/' + que, cuerpo, op);

/* un alumno de verdad: alta por sync, credencial y correo */
async function alumno(nombre, grupo, { cuenta = true } = {}){
  const ap = hex(16), cod = COD(), t = Date.now();
  const s = await llamar('/sync', { desde: 0, cambios: { alumnos: [{ id: cod, codigo: cod, nombre, grupo, terminos: t, t }] } }, { ap });
  if(s.st !== 200) throw new Error('alta: ' + JSON.stringify(s.j));
  if(cuenta){
    const gris = 'data:image/jpeg;base64,' + Buffer.from('gris'.repeat(30)).toString('base64');
    const c = await llamar('/cuenta/credencial', { codigo: cod, foto: gris }, { ap });
    const p = await llamar('/cuenta/proteger', { codigo: cod, correo: 'p' + hex(4) + '@prueba.mx', clave: 'prueba123' }, { ap });
    if(c.st !== 200 || p.st !== 200) throw new Error('cuenta: ' + JSON.stringify([c.j, p.j]));
  }
  return { ap, cod, nombre, grupo };
}

console.log('· la sociedad contra ' + API + ' · casa ' + CASA);
const llave = (await llamar('/entrar', { pasador: '121026' }, { ap: hex(16) })).j.token;
ok('el mostrador entra con su pasador', /^[a-f0-9]{64}$/.test(llave || ''));
const [pres, ana, beto, ciro, sin] = [await alumno('Carlos Palomares', '3.1'), await alumno('Ana Pérez', '3.1'), await alumno('Beto Ruiz', '2B'),
  await alumno('Ciro Díaz', '3.1'), await alumno('Sin Cuenta', '3.1', { cuenta: false })];
const yo = (a) => ({ yo: a.cod });

console.log('\n· quién es quién');
let r = await soc('todo', {});
ok('sin cuenta se puede mirar', r.st === 200 && Array.isArray(r.j.avisos) && r.j.yo === null);
r = await soc('todo', yo(ana));
ok('decir que eres Ana desde otro teléfono no te hace Ana', r.st === 200 && r.j.yo === null);
r = await soc('todo', yo(ana), { ap: ana.ap });
ok('Ana desde su teléfono es Ana, alumna', r.j.yo && r.j.yo.cod === ana.cod && r.j.yo.rol === '' && r.j.yo.cuenta);
ok('un alumno no ve el panel interno', Array.isArray(r.j.temas) && r.j.temas.length === 0 && r.j.miembros.length === 0);
r = await soc('miembros', Object.assign(yo(ana), { cod: ana.cod, rol: 'presidencia' }), { ap: ana.ap });
ok('un alumno NO se puede hacer de la presidencia', r.st === 403);
r = await soc('miembros', { cod: pres.cod, rol: 'presidencia' }, { admin: llave });
ok('la cooperativa (pasador) nombra a la presidencia', r.st === 200);
r = await soc('miembros', Object.assign(yo(pres), { cod: ciro.cod, rol: 'sociedad' }), { ap: pres.ap });
ok('la presidencia da de alta a alguien de la sociedad', r.st === 200);
r = await soc('miembros', Object.assign(yo(ciro), { cod: ana.cod, rol: 'presidencia' }), { ap: ciro.ap });
ok('alguien de la sociedad NO puede nombrar presidencia', r.st === 403);
r = await soc('miembros', Object.assign(yo(pres), { cod: 'ZZZZ', rol: 'sociedad' }), { ap: pres.ap });
ok('un código que no existe se rechaza', r.st === 404);
r = await soc('todo', yo(ciro), { ap: ciro.ap });
ok('Ciro ya es de la sociedad y ve a los miembros', r.j.yo.rol === 'sociedad' && r.j.miembros.length === 2);

console.log('\n· el tablón, los eventos y las votaciones');
r = await soc('guardar', Object.assign(yo(ana), { cajon: 'avisos', rec: { titulo: 'Hackeado', texto: 'x' } }), { ap: ana.ap });
ok('un alumno no publica avisos', r.st === 403);
r = await soc('guardar', Object.assign(yo(ciro), { cajon: 'avisos', rec: { titulo: 'Torneo de fut el viernes <script>', texto: 'Inscríbanse\n\nen la página', cat: 'deportes', fijo: true } }), { ap: ciro.ap });
ok('la sociedad publica un aviso', r.st === 200 && r.j.rec.id);
ok('el aviso no guarda < ni > y respeta los renglones', !/[<>]/.test(r.j.rec.titulo) && r.j.rec.texto.includes('\n'));
r = await soc('guardar', Object.assign(yo(ciro), { cajon: 'eventos', rec: { titulo: 'Concurso de dibujo', tipo: 'competencia', categoria: 'Dibujo', fecha: '2026-11-20', cierre: '2099-11-15', cupo: 2, requisitos: 'Hoja tamaño carta', estado: 'inscripciones' } }), { ap: ciro.ap });
const ev = r.j.rec; ok('la sociedad crea una competencia con requisitos y cupo', r.st === 200 && ev.cupo === 2 && ev.requisitos);
r = await soc('inscribir', Object.assign(yo(sin), { id: ev.id }), { ap: sin.ap });
ok('sin cuenta (correo y credencial) no se inscribe', r.st === 403 && r.j.cuenta);
for(const a of [ana, beto]) await soc('inscribir', Object.assign(yo(a), { id: ev.id, equipo: '' }), { ap: a.ap });
r = await soc('inscribir', Object.assign(yo(pres), { id: ev.id }), { ap: pres.ap });
ok('con el cupo lleno ya no entra nadie', r.st === 409);
r = await soc('todo', yo(ana), { ap: ana.ap });
let e = r.j.eventos.find(x => x.id === ev.id);
ok('Ana sabe que está inscrita y ve cuántos van, NO la lista', e.inscrito && e.nInscritos === 2 && e.lista === undefined);
r = await soc('todo', yo(ciro), { ap: ciro.ap });
ok('la sociedad SÍ ve la lista de inscritos', r.j.eventos.find(x => x.id === ev.id).lista.length === 2);
r = await soc('inscribir', Object.assign(yo(ana), { id: ev.id }), { ap: ana.ap });
ok('volver a tocar «inscribirme» te da de baja', r.st === 200 && r.j.inscrito === false);

r = await soc('guardar', Object.assign(yo(ciro), { cajon: 'votos', rec: { pregunta: '¿Qué evento hacemos en noviembre?', opciones: [{ texto: 'Torneo de fut' }, { texto: 'Concurso de canto' }, { texto: '' }], cierra: '2099-01-01' } }), { ap: ciro.ap });
const vt = r.j.rec; ok('la sociedad abre una votación (las opciones vacías se quitan)', r.st === 200 && vt.opciones.length === 2);
r = await soc('votar', Object.assign(yo(ana), { id: vt.id, opcion: vt.opciones[0].id }), { ap: ana.ap });
ok('Ana vota', r.st === 200);
await soc('votar', Object.assign(yo(ana), { id: vt.id, opcion: vt.opciones[1].id }), { ap: ana.ap });
await soc('votar', Object.assign(yo(ana), { id: vt.id, opcion: vt.opciones[1].id }), { ap: ana.ap });
await soc('votar', Object.assign(yo(beto), { id: vt.id, opcion: vt.opciones[1].id }), { ap: beto.ap });
r = await soc('votar', Object.assign(yo(ana), { id: vt.id, opcion: vt.opciones[0].id }), { ap: hex(16) });
ok('votar a nombre de Ana desde otro teléfono no cuenta', r.st === 403);
r = await soc('votar', Object.assign(yo(beto), { id: vt.id, opcion: 'inventada' }), { ap: beto.ap });
ok('una opción inventada se rechaza', r.st === 400);
r = await soc('todo', yo(ana), { ap: ana.ap });
let v = r.j.votos.find(x => x.id === vt.id);
ok('un voto por persona: votó dos veces y cuentan 2 personas', v.total === 2 && v.miVoto === vt.opciones[1].id);
ok('mientras está abierta, el alumno NO ve cómo va (no influye)', v.cuenta === null && v.votos === undefined);
r = await soc('todo', yo(ciro), { ap: ciro.ap });
v = r.j.votos.find(x => x.id === vt.id);
ok('la sociedad sí ve cómo va', v.cuenta && v.cuenta[vt.opciones[1].id] === 2);
r = await soc('guardar', Object.assign(yo(ciro), { cajon: 'votos', rec: Object.assign({}, vt, { cierra: '2020-01-01', votos: { [ciro.cod]: vt.opciones[0].id } }) }), { ap: ciro.ap });
ok('editar la votación no deja inventar votos', r.j.rec && Object.keys(r.j.rec.votos).length === 2);
r = await soc('votar', Object.assign(yo(pres), { id: vt.id, opcion: vt.opciones[0].id }), { ap: pres.ap });
ok('ya cerrada, nadie vota', r.st === 409);
r = await soc('todo', yo(ana), { ap: ana.ap });
ok('ya cerrada, todos ven el resultado', r.j.votos.find(x => x.id === vt.id).cuenta[vt.opciones[1].id] === 2);

console.log('\n· el buzón');
r = await soc('buzon', Object.assign(yo(ana), { tipo: 'queja', titulo: 'Los baños', texto: 'No hay papel en los baños de arriba, pinche desastre', anonimo: true }), { ap: ana.ap });
const bz = r.j.id; ok('Ana manda una queja anónima', r.st === 200);
r = await soc('todo', yo(beto), { ap: beto.ap });
ok('otro alumno NO ve la queja de Ana (no es pública)', !r.j.buzon.some(b => b.id === bz));
r = await soc('todo', yo(ciro), { ap: ciro.ap });
let b = r.j.buzon.find(x => x.id === bz);
ok('la sociedad la ve, SIN saber quién fue', b && b.autor === undefined && b.alias === 'Anónimo');
ok('la grosería sale tapada', b && !/pinche/i.test(b.texto) && /p•+/.test(b.texto));
r = await soc('contestar', Object.assign(yo(ana), { id: bz, estado: 'resuelta' }), { ap: ana.ap });
ok('un alumno no se contesta solo', r.st === 403);
r = await soc('contestar', Object.assign(yo(ciro), { id: bz, estado: 'en proceso', respuesta: 'Ya hablamos con dirección', publico: true }), { ap: ciro.ap });
ok('la sociedad contesta y la hace pública', r.st === 200);
r = await soc('todo', yo(beto), { ap: beto.ap });
b = r.j.buzon.find(x => x.id === bz);
ok('ya pública, Beto la ve con la respuesta y la puede apoyar', b && b.respuesta && b.estado === 'en proceso' && b.alias === 'Anónimo' && b.autor === undefined);
await soc('apoyar', Object.assign(yo(beto), { id: bz }), { ap: beto.ap });
r = await soc('todo', yo(beto), { ap: beto.ap });
ok('el apoyo cuenta uno por persona', r.j.buzon.find(x => x.id === bz).apoyos === 1 && r.j.buzon.find(x => x.id === bz).apoye);

console.log('\n· los chats');
r = await soc('decir', Object.assign(yo(ana), { canal: 'general', texto: 'Hola a todos' }), { ap: ana.ap });
ok('Ana escribe en el general', r.st === 200);
r = await soc('decir', Object.assign(yo(ana), { canal: 'general', texto: 'otra vez' }), { ap: ana.ap });
ok('dos mensajes en el mismo segundo: frena', r.st === 429);
r = await soc('decir', Object.assign(yo(ana), { canal: 'g:2B', texto: 'me meto a su grupo' }), { ap: ana.ap });
ok('Ana (3.1) no escribe en el chat del 2B', r.st === 403);
r = await soc('chat', Object.assign(yo(beto), { canal: 'g:31' }), { ap: beto.ap });
ok('Beto (2B) no lee el chat del 3.1', r.st === 403);
r = await soc('chat', { canal: 'general' });
ok('sin cuenta no se lee el general', r.st === 403);
r = await soc('chat', Object.assign(yo(ana), { canal: 'soc' }), { ap: ana.ap });
ok('un alumno no lee el chat de la sociedad', r.st === 403);
await new Promise(s => setTimeout(s, 1300));
r = await soc('decir', Object.assign(yo(ana), { canal: 'g:31', texto: 'Mañana hay examen de física' }), { ap: ana.ap });
ok('Ana escribe en el chat de su grupo', r.st === 200);
const msg = r.j.msg;
r = await soc('chat', Object.assign(yo(ciro), { canal: 'g:31' }), { ap: ciro.ap });
ok('Ciro (3.1) lo lee, con nombre y grupo', r.j.mensajes.some(m => m.id === msg.id && m.alias === 'Ana P' && m.grupo === '31'));
r = await soc('quitarMsg', Object.assign(yo(beto), { canal: 'g:31', id: msg.id }), { ap: beto.ap });
ok('otro no borra mensajes ajenos', r.st === 403);
r = await soc('quitarMsg', Object.assign(yo(ana), { canal: 'g:31', id: msg.id }), { ap: ana.ap });
r = await soc('chat', Object.assign(yo(beto), { canal: 'general' }), { ap: beto.ap });
ok('Beto lee el general', r.st === 200 && r.j.mensajes.length >= 1);
r = await soc('chat', Object.assign(yo(ana), { canal: 'g:31' }), { ap: ana.ap });
ok('el borrado ya no se ve', !r.j.mensajes.some(m => m.id === msg.id));
r = await soc('decir', Object.assign(yo(sin), { canal: 'general', texto: 'hola' }), { ap: sin.ap });
ok('sin cuenta no se escribe', r.st === 403);

console.log('\n· el muro y el material (revisados antes de salir)');
const foto = Buffer.from('foto de prueba '.repeat(100));
const fid = 'f' + hex(6);
r = await llamar('/soc/archivo?id=' + fid + '&k=0&n=1&tam=' + foto.length + '&mime=image/jpeg&yo=' + ana.cod, null, { ap: ana.ap, binario: foto });
ok('Ana sube una foto', r.st === 200 && r.j.listo);
r = await llamar('/soc/archivo?id=' + 'x' + hex(6) + '&k=0&n=1&tam=10&mime=text/html&yo=' + ana.cod, null, { ap: ana.ap, binario: Buffer.from('<script>x') });
ok('un HTML no se puede subir', r.st === 415);
r = await soc('publicar', Object.assign(yo(ana), { clase: 'foto', titulo: 'Graduación', archivos: [{ id: fid, nombre: 'grad.jpg' }] }), { ap: ana.ap });
const pub = r.j.id; ok('la publicación de Ana queda PENDIENTE', r.st === 200 && r.j.estado === 'pendiente');
r = await soc('publicar', Object.assign(yo(beto), { clase: 'foto', archivos: [{ id: fid }] }), { ap: beto.ap });
ok('Beto no puede publicar el archivo que subió Ana', r.st === 400);
r = await soc('todo', yo(beto), { ap: beto.ap });
ok('Beto no ve la foto pendiente', !r.j.pubs.some(p => p.id === pub));
r = await llamar('/soc/archivo?id=' + fid + '&k=0&yo=' + beto.cod, null, { ap: beto.ap, metodo: 'GET' });
ok('ni bajándola directo', r.st === 404);
r = await llamar('/soc/archivo?id=' + fid + '&k=0&yo=' + ana.cod, null, { ap: ana.ap, metodo: 'GET' });
ok('Ana sí ve la suya mientras la revisan', r.st === 200 && r.b.byteLength === foto.length);
r = await soc('revisar', Object.assign(yo(ana), { id: pub, estado: 'aprobada' }), { ap: ana.ap });
ok('Ana no se aprueba sola', r.st === 403);
r = await soc('revisar', Object.assign(yo(ciro), { id: pub, estado: 'aprobada' }), { ap: ciro.ap });
ok('la sociedad la aprueba', r.st === 200);
r = await llamar('/soc/archivo?id=' + fid + '&k=0', null, { metodo: 'GET' });
ok('aprobada, cualquiera la ve', r.st === 200 && r.b.byteLength === foto.length);
r = await soc('borrar', Object.assign(yo(ana), { cajon: 'pubs', id: pub }), { ap: ana.ap });
ok('ya aprobada, Ana no la borra sola (la pide a la sociedad)', r.st === 403);

console.log('\n· el panel de la sociedad, los torneos y los horarios');
r = await soc('guardar', Object.assign(yo(ciro), { cajon: 'temas', rec: { titulo: 'Bebederos', categoria: 'Instalaciones', tareas: [{ texto: 'Hablar con dirección' }], bitacora: [{ texto: 'Se propuso en junta', por: 'Ciro' }] } }), { ap: ciro.ap });
const tm = r.j.rec; ok('la sociedad abre un tema con tareas y bitácora', r.st === 200 && tm.tareas.length === 1 && tm.estado === 'por discutir');
r = await soc('guardar', Object.assign(yo(ciro), { cajon: 'temas', rec: Object.assign({}, tm, { estado: 'resuelto', tareas: [{ id: tm.tareas[0].id, texto: tm.tareas[0].texto, hecho: true }] }) }), { ap: ciro.ap });
ok('y lo mueve a resuelto con la tarea hecha', r.j.rec.estado === 'resuelto' && r.j.rec.tareas[0].hecho && r.j.rec.creado === tm.creado);
r = await soc('chat', Object.assign(yo(ciro), { canal: 't:' + tm.id }), { ap: ciro.ap });
ok('cada tema tiene su propia plática', r.st === 200);
r = await soc('guardar', Object.assign(yo(ciro), { cajon: 'torneos', rec: { nombre: 'Copa Rembrandt', deporte: 'Fútbol', rondas: [[{ a: '3.1', b: '2B', pa: '2', pb: '1' }]] } }), { ap: ciro.ap });
ok('la sociedad arma un torneo con su marcador', r.st === 200 && r.j.rec.rondas[0][0].pa === '2');
r = await soc('guardar', Object.assign(yo(ciro), { cajon: 'horarios', rec: { grupo: '3.1', dias: { 1: [{ ini: '7:00', fin: '7:50', materia: 'Física', salon: 'B3' }, { ini: '25:00', fin: '26:00', materia: 'Mal' }] } } }), { ap: ciro.ap });
ok('el horario del 3.1 se guarda y se tira la hora imposible', r.st === 200 && r.j.rec.dias['1'].length === 1 && r.j.rec.dias['1'][0].ini === '07:00');
r = await soc('guardar', Object.assign(yo(ciro), { cajon: 'horarios', rec: { grupo: '31', dias: { 2: [{ ini: '08:00', fin: '08:50', materia: 'Química' }] } } }), { ap: ciro.ap });
r = await soc('todo', {});
ok('un grupo = un horario (se reemplaza, no se duplica) y lo ve cualquiera', r.j.horarios.length === 1 && r.j.horarios[0].dias['2'].length === 1);
ok('cualquiera ve el torneo', r.j.torneos.length === 1);

console.log('\n· lo enorme y lo raro');
r = await llamar('/soc/decir', null, { ap: ana.ap, crudo: JSON.stringify({ yo: ana.cod, canal: 'general', texto: 'x'.repeat(300 * 1024) }) });
ok('un mensaje de 300 KB se rechaza entero', r.st === 413);
r = await llamar('/soc/todo', null, { crudo: '[1,2,3]' });
ok('un cuerpo que no es objeto no truena', r.st === 200);
r = await soc('guardar', Object.assign(yo(ciro), { cajon: '__proto__', rec: {} }), { ap: ciro.ap });
ok('un cajón inventado no existe', r.st === 404);
r = await soc('fila', yo(ana), { ap: ana.ap });
ok('la fila de Fadori contesta sin nombres', r.st === 200 && typeof r.j.enCola === 'number' && Array.isArray(r.j.mios));
r = await soc('radio', {});
ok('Radio Divergentes contesta su lista', r.st === 200 && Array.isArray(r.j.episodios));

console.log(fallas.length ? '\n✗ ' + fallas.length + ' fallas' : '\n✓ todo bien');
process.exit(fallas.length ? 1 : 0);
